// Lead：英文缩写命中矩阵（?q= 稳定路径）
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', baseURL: 'http://127.0.0.1:8123' });
const p = await ctx.newPage();
const qs = ['FCFS', 'fcfs', 'FCF', 'CFS', 'FIFO', 'fifo', 'LRU', 'lru', 'DMA', 'dma', 'ISA', 'isa', 'CPU', 'cpu', 'RR', 'rr', 'HTTP', 'HTTPS', 'FCFSx', '先来先服务', '时间片轮转', 'FCFS 调度', 'RR 时间片'];
const rows = [];
for (const q of qs) {
  await p.goto(`/?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => ({
    meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
    n: document.querySelectorAll('.md-search-result__item').length,
  }));
  rows.push({ q, ...r });
}
await browser.close();
await fs.writeFile('qa/artifacts/lead/search-acronyms.json', JSON.stringify(rows, null, 2), 'utf8');
for (const r of rows) console.log(`${r.q}\t${r.n}\t${r.meta}`);
