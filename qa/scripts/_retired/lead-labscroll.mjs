// Lead：实验室结果表在 375 宽下到底能不能滚
import { session, PAGES, goto } from '../lib/audit.mjs';

const s = await session('iphone-se');
const p = s.page;
await goto(p, PAGES.lab);
await p.waitForTimeout(900);
const info = await p.evaluate(() => {
  const t = document.querySelector('.lab-results table');
  const chain = [];
  let el = t;
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    chain.push({
      tag: el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).join('.') : ''),
      overflowX: cs.overflowX,
      clientW: el.clientWidth,
      scrollW: el.scrollWidth,
      scrollable: el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(cs.overflowX),
    });
    el = el.parentElement;
  }
  const before = t.scrollLeft;
  t.scrollLeft = 200;
  const afterTable = t.scrollLeft;
  t.scrollLeft = 0;
  // try scrolling each ancestor
  const results = [];
  el = t.parentElement;
  while (el && el !== document.documentElement) {
    const prev = el.scrollLeft;
    el.scrollLeft = 200;
    results.push({ tag: el.tagName + '.' + (el.className || '').toString().split(/\s+/)[0], moved: el.scrollLeft - prev });
    el.scrollLeft = prev;
    el = el.parentElement;
  }
  return { tableClientW: t.clientWidth, tableScrollW: t.scrollWidth, before, afterTable, chain, ancestorScroll: results };
});
console.log(JSON.stringify(info, null, 1));
await s.close();
