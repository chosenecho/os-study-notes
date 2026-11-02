// Lead：判断搜索到底是否可用——ASCII 键入（会触发 keyup）vs 中文 insertText
import { session, PAGES, goto, saveJSON } from '../lib/audit.mjs';
import { chromium } from 'playwright';

const out = {};
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', baseURL: 'http://127.0.0.1:8123' });
const p = await ctx.newPage();

const state = () =>
  p.evaluate(() => ({
    val: document.querySelector('.md-search__input')?.value,
    items: document.querySelectorAll('.md-search-result__item').length,
    meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
    first: document.querySelector('.md-search-result__link')?.getAttribute('href'),
  }));

await goto(p, PAGES.home);
await p.locator('.md-search__input').click();
await p.waitForTimeout(1500);

// 1) ASCII 逐键键入（真实 keydown/keyup）
await p.keyboard.type('PCB', { delay: 120 });
await p.waitForTimeout(1200);
out.asciiPCB = await state();

// 2) ASCII 小写
await p.locator('.md-search__input').fill('');
await p.waitForTimeout(200);
await p.keyboard.type('fcfs', { delay: 120 });
await p.waitForTimeout(1200);
out.asciiFcfs = await state();

// 3) 中文用 insertText（无 keyup）——模拟 IME 提交后的状态
await p.locator('.md-search__input').fill('');
await p.waitForTimeout(200);
await p.keyboard.insertText('进程调度');
await p.waitForTimeout(1200);
out.cjkInsertText = await state();

// 4) 中文用 insertText 后补一个普通按键（模拟 IME 提交后按空格/回车）
await p.keyboard.press('Space');
await p.waitForTimeout(1200);
out.cjkInsertTextThenSpace = await state();

// 5) 中文逐键（Playwright 对 CJK 也走 insertText，预期无 keyup）
await p.locator('.md-search__input').fill('');
await p.waitForTimeout(200);
await p.keyboard.type('死锁', { delay: 150 });
await p.waitForTimeout(1200);
out.cjkTyped = await state();

// 6) 直接按 Enter（提交表单带 q= 参数）
await p.locator('.md-search__input').fill('');
await p.waitForTimeout(200);
await p.keyboard.insertText('内存管理');
await p.keyboard.press('Enter');
await p.waitForTimeout(1500);
out.afterEnter = { url: p.url(), ...(await state()) };

// 7) 带 ?q= 直接进入（Material 支持 q 参数）
await p.goto('/?q=进程调度', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
out.qParam = { url: p.url(), ...(await state()) };

// 8) ?q= 后是否自动展开搜索
out.qParamUI = await p.evaluate(() => ({
  formW: Math.round(document.querySelector('.md-search__form')?.getBoundingClientRect().width || 0),
  outputH: Math.round(document.querySelector('.md-search__output')?.getBoundingClientRect().height || 0),
  meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
}));

await browser.close();
console.log(await saveJSON('artifacts/lead/search-ascii.json', out));
console.log(JSON.stringify(out, null, 1));
