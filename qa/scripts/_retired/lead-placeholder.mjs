// Lead：搜索「未展开」与「展开后」两种状态的 placeholder 颜色
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:8123/', { waitUntil: 'networkidle' });
const read = () =>
  p.evaluate(() => {
    const input = document.querySelector('.md-search__input');
    const form = document.querySelector('.md-search__form');
    const cs = getComputedStyle(input);
    const ph = getComputedStyle(input, '::placeholder');
    return {
      formBg: getComputedStyle(form).backgroundColor,
      inputBg: cs.backgroundColor,
      inputColor: cs.color,
      placeholderColor: ph.color,
      searchState: document.querySelector('[data-md-component=search]')?.getAttribute('data-md-state'),
      formRect: (() => { const r = form.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
    };
  });
const idle = await read();
// 打开搜索：点页头搜索 label
await p.evaluate(() => document.querySelector('.md-header label[for="__search"]')?.click());
await p.waitForTimeout(700);
const open = await read();
console.log(JSON.stringify({ idle, open }, null, 1));
await b.close();
