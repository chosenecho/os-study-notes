// Lead：线上首页空闲期是否会拉 search_index.json
import { session, saveJSON } from '../lib/audit.mjs';

const s = await session('desktop-1366', { base: 'https://studynote.chosenecho.dpdns.org' });
const p = s.page;
const reqs = [];
p.on('request', (r) => reqs.push({ t: Date.now(), url: r.url().replace('https://studynote.chosenecho.dpdns.org', ''), type: r.resourceType() }));
p.on('response', async (r) => {
  if (/search_index|bundle|notes\.css/.test(r.url())) {
    let size = null;
    try {
      size = (await r.body()).length;
    } catch {}
    reqs.push({ t: Date.now(), url: r.url().replace('https://studynote.chosenecho.dpdns.org', ''), type: 'res:' + r.status(), size });
  }
});
const t0 = Date.now();
await p.goto('/', { waitUntil: 'load' });
const tLoad = Date.now() - t0;
await p.waitForTimeout(9000);
const idle = reqs.filter((r) => /search_index/.test(r.url));
const before = reqs.filter((r) => r.type !== 'res:200' || true).length;
const perf = await p.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource').map((r) => ({ n: r.name.split('/').pop(), transfer: r.transferSize, decoded: r.decodedBodySize, dur: Math.round(r.duration) }));
  return {
    fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime,
    lcp: null,
    dcl: nav?.domContentLoadedEventEnd,
    load: nav?.loadEventEnd,
    ttfb: nav?.responseStart,
    resources: res,
    resourceCount: res.length,
    totalTransfer: res.reduce((a, r) => a + (r.transfer || 0), 0),
  };
});
// 现在聚焦搜索框
await p.locator('.md-search__input').click();
await p.waitForTimeout(3000);
const after = reqs.filter((r) => /search_index/.test(r.url));
await saveJSON('artifacts/lead/live-idle.json', { tLoad, idleBefore: idle.length, idleRequests: idle, after, perf });
console.log(JSON.stringify({ tLoad, idleBefore: idle.length, idleRequests: idle, afterFocus: after, perf: { fcp: perf.fcp, ttfb: perf.ttfb, dcl: perf.dcl, load: perf.load, count: perf.resourceCount, transfer: perf.totalTransfer, big: perf.resources.sort((a, b) => (b.transfer || 0) - (a.transfer || 0)).slice(0, 6) } }, null, 1));
await s.close();
