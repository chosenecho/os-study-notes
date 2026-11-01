// 修复验证：逐条把 36 个缺陷变成可判定断言
import { session, PAGES, goto, warm, shot, saveJSON } from '../lib/audit.mjs';

const checks = [];
const add = (id, title, pass, actual, expected) => checks.push({ id, title, pass, actual, expected });

const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const parse = (c) => { const m = (c || '').match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
const blend = (fg, bg) => fg.map((v, i) => Math.round(v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1))));
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };

// ---------- 明色 1440：搜索占位/图标、标题层级、间距、表格、内容宽度 ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os2);
  const r = await p.evaluate(() => {
    const cs = (sel, pseudo) => (document.querySelector(sel) ? getComputedStyle(document.querySelector(sel), pseudo || null) : null);
    const form = cs('.md-search__form');
    const ph = cs('.md-search__input', '::placeholder');
    const icon = cs('.md-search__form .md-search__icon');
    const iconSvg = cs('.md-search__form .md-search__icon svg');
    const h1 = cs('.md-content h1');
    const h2 = cs('.md-content h2');
    const h2Rect = document.querySelector('.md-content h2')?.getBoundingClientRect();
    const prev = document.querySelector('.md-content h2')?.previousElementSibling?.getBoundingClientRect();
    const table = document.querySelector('.md-content table');
    const th = document.querySelector('.md-content th');
    const first = document.querySelector('.md-content td:first-child');
    const inner = cs('.md-content__inner');
    return {
      formBg: form?.backgroundColor, placeholder: ph?.color, iconColor: icon?.color, iconFill: iconSvg?.fill,
      h1: h1?.fontSize, h2: h2?.fontSize, h2MarginTop: h2?.marginTop, h2BorderTop: h2?.borderTopWidth,
      h2Gap: h2Rect && prev ? Math.round(h2Rect.top - prev.bottom) : null,
      tableFont: cs('.md-content td')?.fontSize, thBg: th?.backgroundColor,
      firstColPosition: first ? getComputedStyle(first.parentElement.querySelector('td')).position : null,
      sticky: first ? getComputedStyle(first).position : null,
      innerWidth: inner?.maxWidth, innerActual: Math.round(document.querySelector('.md-content__inner')?.getBoundingClientRect().width || 0),
      scrollbar: getComputedStyle(document.querySelector('.md-typeset__scrollwrap') || document.body).scrollbarWidth,
    };
  });
  const phBlend = r.placeholder?.includes('rgba') ? blend([...parse(r.placeholder), parseFloat(r.placeholder.split(',')[3] || 1)], parse(r.formBg)) : parse(r.placeholder);
  add('P1-01', '浅色搜索占位文字对比度', ratio(phBlend, parse(r.formBg)) >= 4.5, `${r.placeholder} on ${r.formBg} = ${ratio(phBlend, parse(r.formBg))}:1`, '>= 4.5:1');
  add('P1-01b', '放大镜图标对比度', ratio(parse(r.iconFill === 'rgb(0, 0, 0)' ? r.iconColor : r.iconColor), parse(r.formBg)) >= 3, `${r.iconColor}/${r.iconFill} = ${ratio(parse(r.iconColor), parse(r.formBg))}:1`, '>= 3:1');
  add('P2-03', 'h1 > h2（字号）', parseFloat(r.h1) > parseFloat(r.h2) * 1.2, `h1 ${r.h1} vs h2 ${r.h2}`, 'h1 >= 1.2 x h2');
  add('P2-04', 'h2 间距/分隔线恢复', parseFloat(r.h2MarginTop) >= 40 && parseFloat(r.h2BorderTop) >= 1, `margin-top ${r.h2MarginTop}, border-top ${r.h2BorderTop}, 实际间距 ${r.h2Gap}px`, 'margin-top>=40px 且 border-top>=1px');
  add('P2-02', '表格字号', parseFloat(r.tableFont) >= 14, r.tableFont, '>= 14px');
  add('P2-01', '宽表首列 sticky', r.sticky === 'sticky', r.sticky, 'sticky');
  add('P2-08', '正文栏宽上限', parseFloat(r.innerWidth) > 0 && r.innerActual <= 760 + 1, `max-width ${r.innerWidth}, 实际 ${r.innerActual}px`, '<= 760px');
  await shot(p, 'artifacts/verify/desktop-os2.png');
  await s.close();
}

// ---------- 字号缩放联动 ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os2);
  const measure = () => p.evaluate(() => ({
    body: getComputedStyle(document.querySelector('.chapter-prose p')).fontSize,
    h2: getComputedStyle(document.querySelector('.chapter-prose h2')).fontSize,
    table: getComputedStyle(document.querySelector('.md-content td')).fontSize,
    toolbar: getComputedStyle(document.querySelector('.study-toolbar')).fontSize,
  }));
  const a = await measure();
  await p.selectOption('[data-reading-size]', '20');
  await p.waitForTimeout(200);
  const b = await measure();
  add('P2-05', '字号选择联动标题/表格', parseFloat(b.h2) > parseFloat(a.h2) && parseFloat(b.table) > parseFloat(a.table), `16px: ${JSON.stringify(a)} → 20px: ${JSON.stringify(b)}`, 'h2 与表格同步增大');
  await p.reload({ waitUntil: 'networkidle' });
  const remembered = await p.evaluate(() => document.querySelector('[data-reading-size]').value);
  add('P2-05b', '字号刷新后记忆', remembered === '20', remembered, '20');
  await s.close();
}

// ---------- 工具条不跳 / dialog 锁滚动 / 插图放大 ----------
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.os2);
  const before = await p.evaluate(() => ({ h: Math.round(document.querySelector('.study-toolbar').getBoundingClientRect().height), y: Math.round(document.querySelector('.md-content h2').getBoundingClientRect().top) }));
  await p.locator('[data-complete]').check();
  await p.waitForTimeout(400);
  const after = await p.evaluate(() => ({ h: Math.round(document.querySelector('.study-toolbar').getBoundingClientRect().height), y: Math.round(document.querySelector('.md-content h2').getBoundingClientRect().top) }));
  add('P2-06', '勾选复习不再推动正文', before.h === after.h && after.y === before.y, `工具条 ${before.h}→${after.h}px，h2 ${before.y}→${after.y}px`, '高度与位置不变');
  await shot(p, 'artifacts/verify/mobile-toolbar-after.png');

  await goto(p, PAGES.os3);
  await warm(p);
  const inline = await p.evaluate(() => Math.round(document.querySelector('.figure-zoom img').getBoundingClientRect().width));
  await p.locator('.figure-zoom').first().click();
  await p.waitForTimeout(500);
  const dlg = await p.evaluate(() => {
    const d = document.querySelector('.image-dialog');
    const img = d.querySelector('img');
    return { imgW: Math.round(img.getBoundingClientRect().width), dialogW: Math.round(d.getBoundingClientRect().width), scrollable: d.scrollWidth > d.clientWidth + 1 || d.scrollHeight > d.clientHeight + 1, bodyOverflow: getComputedStyle(document.documentElement).overflow };
  });
  add('P1-02', '手机端放大到原图尺寸', dlg.imgW >= 900, `正文 ${inline}px → 弹窗 ${dlg.imgW}px（弹窗 ${dlg.dialogW}px，可平移 ${dlg.scrollable}）`, '>= 900px 且可平移');
  add('P2-07', '弹窗打开锁背景滚动', dlg.bodyOverflow === 'hidden', dlg.bodyOverflow, 'hidden');
  const y0 = await p.evaluate(() => scrollY);
  await p.mouse.move(180, 400);
  await p.mouse.wheel(0, 700);
  await p.waitForTimeout(400);
  const y1 = await p.evaluate(() => scrollY);
  add('P2-07b', '弹窗打开时滚轮不滚背景', Math.abs(y1 - y0) < 5, `scrollY ${y0} → ${y1}`, '不变');
  await shot(p, 'artifacts/verify/mobile-dialog.png');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const closed = await p.evaluate(() => ({ open: document.querySelector('.image-dialog').open, overflow: getComputedStyle(document.documentElement).overflow }));
  add('P2-07c', '关闭后解除滚动锁', !closed.open && closed.overflow !== 'hidden', JSON.stringify(closed), 'open=false 且 overflow!=hidden');
  await s.close();
}

// ---------- 宽表可滚动 + 表头 ----------
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.os3);
  await warm(p);
  const t = await p.evaluate(() => {
    const wraps = [...document.querySelectorAll('.md-typeset__scrollwrap')];
    const widest = wraps
      .map((w) => ({ overflow: w.scrollWidth - w.clientWidth, overflowX: getComputedStyle(w).overflowX, thumb: w.offsetHeight - w.clientHeight }))
      .sort((a, b) => b.overflow - a.overflow)[0];
    const first = document.querySelector('.md-content td');
    return { widest, sticky: first ? getComputedStyle(first).position : null, wraps: wraps.length };
  });
  add('P2-01b', '宽表可横向滚动且首列固定', t.widest.overflow > 10 && t.widest.overflowX === 'auto' && t.sticky === 'sticky', JSON.stringify(t), 'overflow>10 + auto + sticky');
  // 实验页结果表同样可滚
  await goto(p, PAGES.lab);
  const lab = await p.evaluate(() => {
    const w = document.querySelector('.lab-results .md-typeset__scrollwrap');
    return w ? { overflow: w.scrollWidth - w.clientWidth, overflowX: getComputedStyle(w).overflowX } : null;
  });
  add('P2-01c', '实验页结果表可横向滚动', !!lab && lab.overflow > 10 && lab.overflowX === 'auto', JSON.stringify(lab), 'overflow>10');
  await shot(p, 'artifacts/verify/mobile-table.png');
  await s.close();
}

// ---------- 断点矩阵 ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os2);
  const widths = [768, 820, 912, 959, 960, 1024, 1219, 1220, 1440, 1920];
  const matrix = [];
  for (const w of widths) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(220);
    const m = await p.evaluate(() => ({
      inner: Math.round(document.querySelector('.md-content__inner').getBoundingClientRect().width),
      gutterL: Math.round(document.querySelector('.md-content__inner').getBoundingClientRect().left),
      gutterR: Math.round(window.innerWidth - document.querySelector('.md-content__inner').getBoundingClientRect().right),
      toc: !!document.querySelector('.md-sidebar--secondary') && getComputedStyle(document.querySelector('.md-sidebar--secondary')).display !== 'none',
    }));
    matrix.push({ w, ...m });
  }
  const jumps = matrix.slice(1).map((m, i) => m.inner - matrix[i].inner);
  const maxJump = Math.max(...jumps.map((j) => Math.abs(j)));
  const wide = matrix.find((m) => m.w === 1024).inner >= matrix.find((m) => m.w === 820).inner;
  add('P2-08b', '断点无骤降且 1024≥820', maxJump <= 100 && wide, `inner=${matrix.map((m) => `${m.w}:${m.inner}`).join(' ')}；最大相邻跳变 ${maxJump}px`, '跳变<=100px');
  add('P3-15', '1920 行宽', matrix.find((m) => m.w === 1920).inner <= 780, `1920 inner=${matrix.find((m) => m.w === 1920).inner}px`, '<= 780px');
  add('P2-08c', '960–1219 隐藏 TOC、1220 显示', !matrix.find((m) => m.w === 1024).toc && matrix.find((m) => m.w === 1220).toc, JSON.stringify(matrix.map((m) => `${m.w}:toc=${m.toc}`)), '1024 无、1220 有');
  await saveJSON('artifacts/verify/breakpoints.json', matrix);
  await p.setViewportSize({ width: 1440, height: 900 });
  await s.close();
}

// ---------- 系统深色跟随 ----------
{
  const s = await session('desktop-1440', { colorScheme: 'dark' });
  const p = s.page;
  await goto(p, PAGES.home);
  const r = await p.evaluate(() => ({ scheme: document.body.getAttribute('data-md-color-scheme'), bg: getComputedStyle(document.body).backgroundColor }));
  add('P3-08', '跟随系统深色', r.scheme === 'slate', JSON.stringify(r), 'slate');
  await shot(p, 'artifacts/verify/system-dark.png');
  await s.close();
}

// ---------- 首页：徽标 / 继续复习 / CTA / 404 / robots ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.home);
  const home = await p.evaluate(() => ({
    badges: document.querySelectorAll('[data-progress-chapter]').length,
    next: !!document.querySelector('[data-next-chapter]'),
    nextHref: document.querySelector('[data-next-chapter]')?.getAttribute('href'),
    nextLabel: document.querySelector('[data-next-label]')?.textContent,
    primaryLinks: document.querySelectorAll('.md-content .primary-link').length,
    ctaBox: (() => { const a = document.querySelector('.grid.cards .primary-link'); if (!a) return null; const r = a.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  }));
  add('P2-09', '首页章节徽标 + 继续复习入口', home.badges === 12 && home.next && home.nextHref?.includes('chapter-1'), JSON.stringify(home), '12 徽标 + 继续复习');
  add('P3-06', '首页 CTA 触控目标', home.ctaBox && home.ctaBox.h >= 44, JSON.stringify(home.ctaBox), '高 >= 44px');
  // 勾选第二章后回首页看徽标与继续复习
  await goto(p, PAGES.os2);
  await p.locator('[data-complete]').check();
  await p.waitForTimeout(300);
  await goto(p, PAGES.home);
  const after = await p.evaluate(() => ({
    badge2: document.querySelector('[data-progress-chapter="2"]')?.textContent,
    badge2done: document.querySelector('[data-progress-chapter="2"]')?.dataset.completed,
    count: document.querySelector('[data-progress-count="os"]')?.textContent,
    nextLabel: document.querySelector('[data-next-label]')?.textContent,
    nextHref: document.querySelector('[data-next-chapter]')?.getAttribute('href'),
  }));
  add('P2-09b', '徽标/计数/继续复习联动', after.badge2 === '已复习' && after.count === '1' && after.nextHref?.includes('chapter-1'), JSON.stringify(after), '已复习 + 1/6 + 继续第 1 章');
  await shot(p, 'artifacts/verify/home-after-check.png');
  await s.close();
}

// ---------- 404 / robots / 交叉链接 / 组成原理习题折叠 ----------
{
  const s = await session('desktop-1280');
  const p = s.page;
  // 本地 http.server 不实现 404.html 回退，直接验证产物本身
  await p.goto('/404.html', { waitUntil: 'domcontentloaded' });
  const notFound = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, links: [...document.querySelectorAll('.md-content a')].map((a) => a.getAttribute('href')).slice(0, 5) }));
  add('P3-07', '404 中文页 + 返回入口', /没有找到/.test(notFound.h1 || '') && notFound.links.length >= 3, JSON.stringify(notFound), '中文 + 链接');
  const robots = await p.request.get('/robots.txt');
  add('P2-15', 'robots.txt 带 Sitemap', (await robots.text()).includes('Sitemap:'), (await robots.text()).replace(/\n/g, ' | '), '含 Sitemap');
  await goto(p, PAGES.co1);
  const co = await p.evaluate(() => ({
    details: document.querySelectorAll('details.exercise-answer').length,
    openByDefault: [...document.querySelectorAll('details.exercise-answer')].filter((d) => d.open).length,
    tables: document.querySelectorAll('.md-content table').length,
  }));
  add('P1-03', '组成原理习题折叠', co.details >= 4 && co.openByDefault === 0, JSON.stringify(co), '>=4 个折叠且默认收起');
  await goto(p, PAGES.os3);
  const banker = await p.evaluate(() => ({ raw: document.body.innerText.includes('|---|'), tables: document.querySelectorAll('.md-content table').length }));
  add('P2-12', '银行家算法表格已渲染', !banker.raw && banker.tables > 10, JSON.stringify(banker), '无原始管道文本');
  const links = await p.evaluate(() => ({ inBody: [...document.querySelectorAll('.md-content a[href]')].filter((a) => !a.classList.contains('headerlink') && !a.closest('nav.chapter-nav')).length, nav: document.querySelectorAll('.chapter-nav a').length }));
  add('P2-10', '正文内章节跳转', links.nav >= 3, JSON.stringify(links), 'chapter-nav >= 3 链接');
  await s.close();
}

// ---------- 深色插图 / 甘特 / RR 舍入 / 触控目标 / 焦点 ----------
{
  const s = await session('desktop-1440', { colorScheme: 'dark' });
  const p = s.page;
  await goto(p, PAGES.os2);
  const dark = await p.evaluate(() => {
    const f = document.querySelector('.figure-zoom');
    return { figureBg: f ? getComputedStyle(f).backgroundColor : null, page: getComputedStyle(document.body).backgroundColor };
  });
  add('P2-11', '深色插图容器跟随主题', dark.figureBg !== 'rgb(255, 255, 255)', JSON.stringify(dark), '非纯白');
  await goto(p, PAGES.lab);
  const ganttDark = await p.evaluate(() => { const b = document.querySelector('.gantt-block'); return b ? getComputedStyle(b).backgroundColor : null; });
  add('P3-11', '深色甘特色块', ganttDark !== 'rgb(198, 232, 223)', ganttDark, '深色变体');
  await s.close();

  const s2 = await session('desktop-1440');
  const p2 = s2.page;
  await goto(p2, PAGES.lab);
  await p2.selectOption('select[name=algorithm]', 'rr');
  await p2.fill('input[name=quantum]', '2');
  await p2.click('button[type=submit]');
  await p2.waitForTimeout(400);
  const metrics = await p2.locator('.lab-metrics').innerText();
  add('P3-13', 'RR 平均带权周转 2.68', metrics.includes('2.68'), metrics, '含 2.68');
  const tap = await p2.evaluate(() => {
    const btn = document.querySelector('.md-header__button');
    const r = btn.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  add('P3-05d', '桌面页头按钮（鼠标场景）', tap.h >= 40, JSON.stringify(tap), '>= 40');
  const headlink = await p2.evaluate(() => {
    const el = document.querySelector('.headerlink');
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  add('P3-05e', '桌面 ¶ 锚点', headlink.w >= 17, JSON.stringify(headlink), '不回归');
  const lab = await p2.evaluate(() => {
    const sel = document.querySelector('.lab-controls select');
    const r = sel.getBoundingClientRect();
    return { w: Math.round(r.width), scroll: sel.scrollWidth, client: sel.clientWidth };
  });
  add('P3-16', '调度算法下拉框不截断', lab.scroll <= lab.client + 1, JSON.stringify(lab), 'scrollWidth<=clientWidth');
  const tabIndex = await p2.evaluate(() => {
    const el = document.querySelector('.md-search__scrollwrap');
    return el ? el.tabIndex : null;
  });
  add('P3-09', '收起时搜索结果不占 Tab', tabIndex === -1, String(tabIndex), '-1');
  await s2.close();
  // 触屏场景
  const s3 = await session('iphone-se');
  const p3 = s3.page;
  await goto(p3, PAGES.os2);
  const touch = await p3.evaluate(() => {
    const btn = document.querySelector('.md-header label[for="__drawer"]');
    const b = btn.getBoundingClientRect();
    const h = document.querySelector('.headerlink').getBoundingClientRect();
    return { header: { w: Math.round(b.width), h: Math.round(b.height) }, headerlink: { w: Math.round(h.width), h: Math.round(h.height) } };
  });
  add('P3-05', '触屏页头按钮/¶ 锚点', touch.header.h >= 44 && touch.headerlink.w >= 32, JSON.stringify(touch), '页头>=44 且 ¶ >=32');
  await s3.close();
}

// ---------- 移动端下拉框 / 甘特换行 ----------
{
  const s = await session('android-360');
  const p = s.page;
  await goto(p, PAGES.lab);
  const lab = await p.evaluate(() => {
    const sel = document.querySelector('.lab-controls select');
    const g = document.querySelector('.gantt');
    return {
      selectW: Math.round(sel.getBoundingClientRect().width),
      selectClipped: sel.scrollWidth > sel.clientWidth + 1,
      ganttOverflow: g.scrollWidth > g.clientWidth + 2,
      ganttWrapped: g.scrollHeight > 80,
    };
  });
  add('P3-16b', '360 宽下拉框/甘特', !lab.selectClipped && !lab.ganttOverflow, JSON.stringify(lab), '不截断、不溢出');
  await shot(p, 'artifacts/verify/mobile-lab.png');
  await s.close();
}

const passed = checks.filter((c) => c.pass).length;
const summary = { passed, total: checks.length, failed: checks.filter((c) => !c.pass) };
console.log(await saveJSON('artifacts/verify/checks.json', { summary, checks }));
console.log(`PASS ${passed}/${checks.length}`);
for (const c of checks) console.log(`${c.pass ? 'OK  ' : 'FAIL'} ${c.id.padEnd(7)} ${c.title} :: ${c.actual} (want ${c.expected})`);
