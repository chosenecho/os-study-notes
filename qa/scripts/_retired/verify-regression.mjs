// 修复后整体回归：15 个页面 × 375/1440，控制台错误、横向溢出、溢出元素
import { session, LOCAL } from '../lib/audit.mjs';
import { saveJSON } from '../lib/audit.mjs';

const pages = [
  '/', '/chapters/chapter-1/', '/chapters/chapter-2/', '/chapters/chapter-3/', '/chapters/chapter-4/',
  '/chapters/chapter-5/', '/chapters/chapter-6/', '/computer-organization/chapter-1/', '/computer-organization/chapter-2/',
  '/computer-organization/chapter-3/', '/computer-organization/chapter-4/', '/computer-organization/chapter-5/',
  '/computer-organization/chapter-6/', '/lab/scheduling/', '/404.html',
];

const results = [];
for (const [dev, w] of [['iphone-se', 375], ['desktop-1440', 1440]]) {
  const s = await session(dev);
  for (const path of pages) {
    const errs = [];
    const onErr = (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); };
    s.page.on('console', onErr);
    const resp = await s.page.goto(LOCAL + path, { waitUntil: 'networkidle' });
    await s.page.waitForTimeout(200);
    const r = await s.page.evaluate(() => {
      const offenders = [];
      const vw = window.innerWidth;
      for (const el of document.querySelectorAll('.md-content *')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        let p = el.parentElement, scroller = false;
        while (p) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflowX)) { scroller = true; break; } p = p.parentElement; }
        if (scroller) continue;
        const b = el.getBoundingClientRect();
        if (b.right > vw + 2) offenders.push(el.tagName + '.' + (el.className || '').toString().slice(0, 30));
      }
      return { docSw: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 5) };
    });
    s.page.off('console', onErr);
    results.push({ device: dev, path, status: resp?.status(), consoleErrors: errs.length, errs: errs.slice(0, 2), horizontalOverflow: r.docSw > r.vw + 1, docSw: r.docSw, vw: r.vw, offenders: r.offenders });
  }
  await s.close();
}

const bad = results.filter((r) => r.consoleErrors || r.horizontalOverflow || r.status >= 400);
console.log(await saveJSON('artifacts/verify/regression.json', { total: results.length, bad }));
console.log(`pages checked: ${results.length}, problems: ${bad.length}`);
for (const b of bad) console.log(JSON.stringify(b));
