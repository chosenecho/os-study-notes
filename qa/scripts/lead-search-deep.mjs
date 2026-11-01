// Lead：把「搜索到底能不能用」查清楚
import { session, PAGES, goto, shot, saveJSON } from '../lib/audit.mjs';

const out = { steps: [] };
const s = await session('desktop-1440');
const p = s.page;
const net = [];
p.on('request', (r) => {
  if (/search_index|search\/|bundle|worker/i.test(r.url())) net.push({ phase: 'req', url: r.url().split('/').slice(-2).join('/'), type: r.resourceType() });
});
p.on('response', (r) => {
  if (/search_index|bundle/i.test(r.url())) net.push({ phase: 'res', url: r.url().split('/').slice(-2).join('/'), status: r.status() });
});
p.on('console', (m) => out.steps.push({ console: m.type(), text: m.text().slice(0, 200) }));
p.on('pageerror', (e) => out.steps.push({ pageerror: String(e).slice(0, 300) }));

await goto(p, PAGES.home);

const state = async (label) =>
  out.steps.push({
    label,
    val: await p.evaluate(() => document.querySelector('.md-search__input')?.value),
    active: await p.evaluate(() => {
      const c = document.querySelector('.md-search');
      const out = document.querySelector('.md-search__output');
      return {
        searchDataset: JSON.stringify(c?.dataset || {}),
        formDataset: JSON.stringify(document.querySelector('.md-search__form')?.dataset || {}),
        outputH: out ? Math.round(out.getBoundingClientRect().height) : null,
        meta: document.querySelector('.md-search-result__meta')?.textContent?.trim().slice(0, 30),
        results: document.querySelectorAll('.md-search-result__item').length,
        bodyState: document.body.getAttribute('data-md-state'),
        activeEl: document.activeElement?.className?.toString?.().slice(0, 40),
      };
    }),
  });

await state('before');
await p.locator('.md-search__input').click();
await p.waitForTimeout(800);
await state('after-click');
await p.keyboard.type('进程', { delay: 120 });
await p.waitForTimeout(1200);
await state('after-type');
await shot(p, 'artifacts/lead/search-deep-1.png');

// 再试 fill
await p.locator('.md-search__input').fill('死锁');
await p.waitForTimeout(1200);
await state('after-fill');
await shot(p, 'artifacts/lead/search-deep-2.png');

// 直接看 search_index 是否可取、内容结构
out.index = await p.evaluate(async () => {
  const r = await fetch('/search/search_index.json');
  const j = await r.json();
  const docs = j.docs || [];
  return { status: r.status, docs: docs.length, sampleKeys: Object.keys(docs[0] || {}), firstTitle: docs[0]?.title, location: docs[0]?.location };
});
// 手工在页面里跑一次 lunr 查询（Material 用 lunr）
out.lunr = await p.evaluate(async () => {
  const j = await (await fetch('/search/search_index.json')).json();
  const hasLunr = typeof window.lunr === 'function' || typeof window.lunr === 'object';
  return { config: j.config?.lang, hasLunr, docs: j.docs?.length, sampleText: (j.docs?.[0]?.text || '').slice(0, 40) };
});

// 移动端：真实点击搜索图标
const m = await session('iphone-se');
const mp = m.page;
await goto(mp, PAGES.home);
const box = await mp.locator('label.md-search__icon').boundingBox();
out.mobileIconBox = box;
await mp.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await mp.waitForTimeout(900);
out.mobileAfter = await mp.evaluate(() => {
  const form = document.querySelector('.md-search__form');
  const r = form?.getBoundingClientRect();
  return {
    formW: r ? Math.round(r.width) : 0,
    formH: r ? Math.round(r.height) : 0,
    focused: document.activeElement === document.querySelector('.md-search__input'),
    searchDataset: JSON.stringify(document.querySelector('.md-search')?.dataset || {}),
  };
});
await shot(mp, 'artifacts/lead/mobile-search-deep.png');
await mp.keyboard.type('内存', { delay: 120 });
await mp.waitForTimeout(1000);
out.mobileTyped = await mp.evaluate(() => ({
  val: document.querySelector('.md-search__input')?.value,
  results: document.querySelectorAll('.md-search-result__item').length,
  meta: document.querySelector('.md-search-result__meta')?.textContent?.trim().slice(0, 40),
}));
await shot(mp, 'artifacts/lead/mobile-search-results.png');
await m.close();

out.net = net;
await s.close();
console.log(await saveJSON('artifacts/lead/search-deep.json', out));
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
