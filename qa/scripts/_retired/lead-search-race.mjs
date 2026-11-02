// Lead：搜索时序竞态 + 移动端入口
import { session, PAGES, goto, shot, saveJSON } from '../lib/audit.mjs';

const out = { runs: [] };
const s = await session('desktop-1440');
const p = s.page;

const probe = () =>
  p.evaluate(() => ({
    items: document.querySelectorAll('.md-search-result__item').length,
    meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
    val: document.querySelector('.md-search__input')?.value,
    outputH: Math.round(document.querySelector('.md-search__output')?.getBoundingClientRect().height || 0),
  }));

// A. 点开后立即输入
await goto(p, PAGES.home);
await p.locator('.md-search__input').click();
const t0 = Date.now();
await p.keyboard.type('进程', { delay: 30 });
await p.waitForTimeout(4000);
out.runs.push({ name: 'A 点开立即输入', ms: Date.now() - t0, state: await probe() });
await shot(p, 'artifacts/lead/search-race-A.png');

// A2. 再敲一个字
await p.keyboard.type('调', { delay: 30 });
await p.waitForTimeout(1500);
out.runs.push({ name: 'A2 再敲一个字', state: await probe() });
await shot(p, 'artifacts/lead/search-race-A2.png');

// B. 刷新后先等 6 秒再输入
await goto(p, PAGES.home);
await p.locator('.md-search__input').click();
await p.waitForTimeout(6000);
await p.keyboard.type('死锁', { delay: 80 });
await p.waitForTimeout(1500);
out.runs.push({ name: 'B 等 6 秒再输入', state: await probe() });
await shot(p, 'artifacts/lead/search-race-B.png');

// C. 清空后重输（组件已初始化）
await p.locator('.md-search__input').fill('');
await p.waitForTimeout(600);
await p.keyboard.type('内存', { delay: 80 });
await p.waitForTimeout(1500);
out.runs.push({ name: 'C 清空后重输', state: await probe() });
await shot(p, 'artifacts/lead/search-race-C.png');

await s.close();

// D. 移动端：点页头右侧搜索图标
{
  const m = await session('iphone-se');
  const mp = m.page;
  await goto(mp, PAGES.home);
  const icons = await mp.evaluate(() =>
    [...document.querySelectorAll('label.md-search__icon')].map((el, i) => {
      const r = el.getBoundingClientRect();
      return { i, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 1 && r.height > 1 };
    }),
  );
  out.mobileIcons = icons;
  const visible = icons.find((i) => i.visible);
  if (visible) {
    await mp.mouse.click(visible.x + visible.w / 2, visible.y + visible.h / 2);
    await mp.waitForTimeout(800);
    out.mobileOpen = await mp.evaluate(() => ({
      formW: Math.round(document.querySelector('.md-search__form').getBoundingClientRect().width),
      focused: document.activeElement === document.querySelector('.md-search__input'),
      bodyOverflow: getComputedStyle(document.body).overflow,
      searchState: document.querySelector('[data-md-component=search]')?.getAttribute('data-md-state'),
    }));
    await shot(mp, 'artifacts/lead/mobile-search-open.png');
    await mp.keyboard.type('进程', { delay: 120 });
    await mp.waitForTimeout(2500);
    out.mobileResults = await mp.evaluate(() => ({
      items: document.querySelectorAll('.md-search-result__item').length,
      meta: document.querySelector('.md-search-result__meta')?.textContent?.trim(),
      val: document.querySelector('.md-search__input')?.value,
    }));
    await shot(mp, 'artifacts/lead/mobile-search-results.png');
  }
  await m.close();
}

console.log(await saveJSON('artifacts/lead/search-race.json', out));
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
