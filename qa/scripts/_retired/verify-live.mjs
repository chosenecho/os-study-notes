// 生产环境验证：修复后的关键断言（线上）
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const LIVE = 'https://studynote.chosenecho.dpdns.org';
const results = [];
const add = (id, title, pass, actual) => results.push({ id, title, pass, actual });

const browser = await chromium.launch();
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const parse = (c) => { const m = (c || '').match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };

// 桌面
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const p = await ctx.newPage();
  await p.goto(LIVE + '/?v=verify1', { waitUntil: 'networkidle' });
  const home = await p.evaluate(() => ({
    badges: document.querySelectorAll('[data-progress-chapter]').length,
    next: !!document.querySelector('[data-next-chapter]'),
    cta: (() => { const a = document.querySelector('.grid.cards .primary-link'); if (!a) return null; const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
    ph: (() => { const i = document.querySelector('.md-search__input'); return i ? getComputedStyle(i, '::placeholder').color : null; })(),
    formBg: getComputedStyle(document.querySelector('.md-search__form')).backgroundColor,
    body: getComputedStyle(document.body).backgroundColor,
  }));
  const ph = home.ph?.includes('rgba') ? null : parse(home.ph);
  add('P1-01', '浅色搜索占位可见', ph && ratio(ph, parse(home.formBg)) >= 4.5, `${home.ph} on ${home.formBg}`);
  add('P2-09', '首页徽标/继续复习/C A', home.badges === 12 && home.next && home.cta?.h >= 44, JSON.stringify(home));
  await p.goto(LIVE + '/chapters/chapter-2/?v=verify1', { waitUntil: 'networkidle' });
  const page = await p.evaluate(() => ({
    h1: getComputedStyle(document.querySelector('.md-content h1')).fontSize,
    h2: getComputedStyle(document.querySelector('.md-content h2')).fontSize,
    h2margin: getComputedStyle(document.querySelector('.md-content h2')).marginTop,
    table: getComputedStyle(document.querySelector('.md-content td')).fontSize,
    inner: Math.round(document.querySelector('.md-content__inner').getBoundingClientRect().width),
    nav: document.querySelectorAll('.chapter-nav a').length,
  }));
  add('P2-03/P2-04', '标题层级与章节间距', parseFloat(page.h1) > parseFloat(page.h2) * 1.2 && parseFloat(page.h2margin) >= 40, JSON.stringify(page));
  add('P2-02', '表格字号', parseFloat(page.table) >= 14, page.table);
  add('P2-10', '章节导航', page.nav >= 3, String(page.nav));
  // 404
  const resp404 = await p.goto(LIVE + '/no-such-page-live/?v=verify1', { waitUntil: 'domcontentloaded' });
  const nf = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, links: document.querySelectorAll('.md-content a').length }));
  add('P3-07', '404 中文 + 入口', resp404?.status() === 404 && /没有找到/.test(nf.h1 || '') && nf.links >= 3, `${resp404?.status()} ${JSON.stringify(nf)}`);
  // 安全头
  const hdr = (await p.request.get(LIVE + '/assets/notes.css')).headers();
  add('P3-04', '安全头/缓存头', !!hdr['x-frame-options'] && !!hdr['content-security-policy'], `xfo=${hdr['x-frame-options']} csp=${(hdr['content-security-policy'] || '').slice(0, 20)} cc=${hdr['cache-control']}`);
  await ctx.close();
}

// 手机
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'zh-CN' });
  const p = await ctx.newPage();
  await p.goto(LIVE + '/chapters/chapter-3/?v=verify1', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  const inline = await p.evaluate(() => Math.round(document.querySelector('.figure-zoom img').getBoundingClientRect().width));
  await p.locator('.figure-zoom').first().click();
  await p.waitForTimeout(500);
  const dlg = await p.evaluate(() => {
    const d = document.querySelector('.image-dialog');
    return { w: Math.round(d.querySelector('img').getBoundingClientRect().width), scroll: d.scrollWidth > d.clientWidth + 1, bodyLock: getComputedStyle(document.documentElement).overflow };
  });
  add('P1-02/P2-07', '手机弹窗原尺寸+锁滚动', dlg.w >= 900 && dlg.scroll && dlg.bodyLock === 'hidden', `inline ${inline} → dialog ${dlg.w}, lock=${dlg.bodyLock}`);
  await p.keyboard.press('Escape');
  await p.goto(LIVE + '/chapters/chapter-2/?v=verify1', { waitUntil: 'networkidle' });
  const tap = await p.evaluate(() => {
    const b = document.querySelector('.md-header label[for="__drawer"]').getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height) };
  });
  add('P3-05', '触屏页头按钮', tap.h >= 44, JSON.stringify(tap));
  await ctx.close();
}

await browser.close();
const pass = results.filter((r) => r.pass).length;
await fs.writeFile('qa/artifacts/verify/live-checks.json', JSON.stringify({ pass, total: results.length, results }, null, 2), 'utf8');
console.log(`LIVE PASS ${pass}/${results.length}`);
for (const r of results) console.log(`${r.pass ? 'OK  ' : 'FAIL'} ${r.id} ${r.title} :: ${r.actual}`);
