// Repeatable lab diagnostics, not field Core Web Vitals or an INP measurement.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';

const root = path.resolve(process.argv[2] || 'dist');
const output = path.resolve(process.argv[3] || 'artifacts/seo/performance.json');
const pages = ['/', '/courses/operating-systems/chapter-02/',
  '/courses/computer-organization/chapter-05/', '/labs/paging/'];
const devices = [
  {name: 'desktop', viewport: {width: 1280, height: 900}, latency: 40, download: 10_000_000 / 8, cpu: 1},
  {name: 'mobile', viewport: {width: 390, height: 844}, latency: 150, download: 1_600_000 / 8, cpu: 4},
];
const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json'};
const server = http.createServer((req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true});
const report = {measured_at: new Date().toISOString(), browser: browser.version(), runs_per_page: 3,
  scope: 'Local cold-context lab navigation, CDP network/CPU emulation; no field data or INP.',
  devices, samples: []};
try {
  for (const device of devices) for (const url of pages) for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({viewport: device.viewport});
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: device.latency,
      downloadThroughput: device.download, uploadThroughput: 750_000 / 8});
    await cdp.send('Emulation.setCPUThrottlingRate', {rate: device.cpu});
    await page.addInitScript(() => {
      window.labVitals = {lcp: null, cls: 0, shifts: [], long_tasks: [], math_ready: null, raw_math_window: 0};
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.labVitals.long_tasks.push({start: e.startTime, duration: e.duration});
      }).observe({type: 'longtask', buffered: true});
      document.addEventListener('DOMContentLoaded', () => {
        const start = performance.now();
        const ready = () => [...document.querySelectorAll('.arithmatex')].every(el => el.querySelector('.katex'));
        if (ready()) { window.labVitals.math_ready = start; return; }
        const observer = new MutationObserver(() => {
          if (!ready()) return;
          window.labVitals.math_ready = performance.now();
          window.labVitals.raw_math_window = performance.now() - start;
          observer.disconnect();
        });
        observer.observe(document.body, {childList: true, subtree: true});
      }, {once: true});
      let sessionStart = 0, lastShift = 0, sessionValue = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.labVitals.lcp = entry.startTime;
      }).observe({type: 'largest-contentful-paint', buffered: true});
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          if (entry.startTime - lastShift > 1000 || entry.startTime - sessionStart > 5000) {
            sessionStart = entry.startTime; sessionValue = 0;
          }
          lastShift = entry.startTime;
          sessionValue += entry.value;
          window.labVitals.cls = Math.max(window.labVitals.cls, sessionValue);
          window.labVitals.shifts.push({value: entry.value,
            nodes: entry.sources.map(s => s.node?.className || s.node?.nodeName || '')});
        }
      }).observe({type: 'layout-shift', buffered: true});
    });
    await page.goto('http://127.0.0.1:' + server.address().port + url, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => !document.querySelector('.arithmatex') ||
      [...document.querySelectorAll('.arithmatex')].every(el => el.querySelector('.katex')));
    const sample = await page.evaluate(() => ({...window.labVitals,
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      transfer_bytes: performance.getEntriesByType('resource').reduce((sum, r) => sum + r.transferSize, 0),
      jsonld_count: document.querySelectorAll('script[type="application/ld+json"]').length,
      overflow: document.documentElement.scrollWidth > innerWidth + 1}));
    report.samples.push({device: device.name, url, run, ...sample});
    await context.close();
  }
  fs.mkdirSync(path.dirname(output), {recursive: true});
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({output, samples: report.samples.length,
    max_cls: Math.max(...report.samples.map(s => s.cls)), jsonld_counts: [...new Set(report.samples.map(s => s.jsonld_count))]}));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
