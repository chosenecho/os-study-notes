// Lead：搜索链路逐请求排查
import { session, PAGES, goto, saveJSON } from '../lib/audit.mjs';

const s = await session('desktop-1440');
const p = s.page;
const log = [];
p.on('request', (r) => log.push({ k: 'req', t: r.resourceType(), url: r.url().replace('http://127.0.0.1:8123', '') }));
p.on('response', (r) => log.push({ k: 'res', s: r.status(), url: r.url().replace('http://127.0.0.1:8123', '') }));
p.on('requestfailed', (r) => log.push({ k: 'fail', url: r.url().replace('http://127.0.0.1:8123', ''), err: r.failure()?.errorText }));
p.on('console', (m) => log.push({ k: 'console', type: m.type(), text: m.text().slice(0, 300) }));
p.on('pageerror', (e) => log.push({ k: 'pageerror', text: String(e).slice(0, 400) }));

await goto(p, PAGES.home);
await p.locator('.md-search__input').click();
await p.waitForTimeout(1500);
await p.keyboard.type('进程', { delay: 100 });
await p.waitForTimeout(2500);

const dom = await p.evaluate(() => {
  const out = document.querySelector('.md-search__output');
  const result = document.querySelector('.md-search-result');
  const input = document.querySelector('.md-search__input');
  const form = document.querySelector('.md-search__form');
  return {
    inputValue: input?.value,
    formHTML: form?.outerHTML.slice(0, 600),
    outputHTML: out?.innerHTML.slice(0, 1200),
    resultEls: document.querySelectorAll('.md-search-result').length,
    itemEls: document.querySelectorAll('.md-search-result__item').length,
    meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
    busy: document.querySelector('[data-md-component="search"]')?.getAttribute('data-md-state'),
    headerFormWidth: Math.round(form?.getBoundingClientRect().width || 0),
    scripts: [...document.scripts].map((x) => x.src.split('/').slice(-2).join('/')),
  };
});

// 手工派发 input 事件看看
const manual = await p.evaluate(() => {
  const input = document.querySelector('.md-search__input');
  input.value = '死锁';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'o', bubbles: true }));
  return input.value;
});
await p.waitForTimeout(2000);
const afterManual = await p.evaluate(() => ({
  items: document.querySelectorAll('.md-search-result__item').length,
  meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
  outputHTML: document.querySelector('.md-search__output')?.innerHTML.slice(0, 400),
}));

const workerCheck = await p.evaluate(async () => {
  const urls = [...document.scripts].map((s) => s.src);
  return urls;
});
const statuses = await p.evaluate(async () => {
  const r = await fetch('/assets/javascripts/workers/search.2c215733.min.js');
  return { status: r.status, len: (await r.text()).length };
});

await saveJSON('artifacts/lead/search-net.json', { log, dom, manual, afterManual, workerCheck, statuses });
console.log('statuses', JSON.stringify(statuses));
console.log('afterManual', JSON.stringify(afterManual));
console.log('dom', JSON.stringify(dom).slice(0, 1500));
const interesting = log.filter((l) => !/\.(png|svg|css)$/.test(l.url)).slice(-40);
console.log(JSON.stringify(interesting, null, 1));
await s.close();
