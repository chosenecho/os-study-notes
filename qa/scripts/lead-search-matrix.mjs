// Lead：用 ?q= 稳定地测搜索命中（避开 keyup 时序问题）
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', baseURL: 'http://127.0.0.1:8123' });
const p = await ctx.newPage();

const queries = [
  '进程调度', '死锁', '内存管理', '文件系统', '中断', '周转时间',
  'PCB', 'pcb', 'FCFS', 'fcfs', 'SPF', 'CPI', 'cpi', 'I/O', 'lunr', 'Linux',
  '操作系统', '计算机组成原理', '缓存', '流水线', '信号量', '管程', '的', 'zzz',
];

const rows = [];
for (const q of queries) {
  await p.goto(`/?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({
    meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
    items: [...document.querySelectorAll('.md-search-result__item')].map((it) => ({
      title: (it.querySelector('.md-search-result__title')?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
      href: it.querySelector('a')?.getAttribute('href')?.replace('http://127.0.0.1:8123', ''),
      marks: it.querySelectorAll('mark').length,
    })),
  }));
  rows.push({ q, meta: r.meta, n: r.items.length, top: r.items.slice(0, 3) });
}

await browser.close();
await fs.mkdir('qa/artifacts/lead', { recursive: true });
await fs.writeFile('qa/artifacts/lead/search-matrix.json', JSON.stringify(rows, null, 2), 'utf8');
console.log(JSON.stringify(rows, null, 1));
