// 搜索修复验证：FCFS 命中 + insertText 后自动出结果
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' });
const out = {};

for (const q of ['FCFS', 'FCF', 'CFS', '进程调度', 'PCB']) {
  await p.goto(`http://127.0.0.1:8123/?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  out[q] = await p.evaluate(() => ({
    n: document.querySelectorAll('.md-search-result__item').length,
    meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
  }));
}

// 中文 insertText（模拟 IME 提交，无逐键 keyup）：应自动出结果
await p.goto('http://127.0.0.1:8123/', { waitUntil: 'networkidle' });
await p.locator('.md-search__input').click();
await p.waitForTimeout(1200);
await p.keyboard.insertText('内存管理');
await p.waitForTimeout(1500);
out.insertText = await p.evaluate(() => ({
  val: document.querySelector('.md-search__input')?.value,
  n: document.querySelectorAll('.md-search-result__item').length,
  meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
}));

await b.close();
await fs.writeFile('qa/artifacts/verify/search-fixed.json', JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify(out, null, 1));
