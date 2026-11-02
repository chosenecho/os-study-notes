// Lead：搜索功能与线上抽查（独立于功能组）
import { session, PAGES, goto, shot, saveJSON } from '../lib/audit.mjs';

const out = {};

// 1) 桌面搜索
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.home);
  const queries = ['进程调度', '死锁', '内存管理', 'CPI', 'zzzqqq'];
  out.search = [];
  for (const q of queries) {
    await p.evaluate(() => {
      const input = document.querySelector('.md-search__input');
      input.value = '';
    });
    await p.locator('.md-search__input').fill(q);
    await p.waitForTimeout(700);
    const res = await p.evaluate(() => {
      const items = [...document.querySelectorAll('.md-search-result__item')];
      return {
        count: items.length,
        first: items.slice(0, 3).map((it) => {
          const a = it.querySelector('a');
          const td = it.querySelector('.md-search-result__title, .md-search-result__article--document a');
          return { text: (td?.textContent || a?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60), href: a?.getAttribute('href') };
        }),
        empty: document.querySelector('.md-search-result__meta')?.textContent?.trim().slice(0, 40),
      };
    });
    out.search.push({ q, ...res });
  }
  await shot(p, 'artifacts/lead/search-results.png');
  // 搜索面板结构
  out.searchPanel = await p.evaluate(() => {
    const panel = document.querySelector('.md-search__output');
    const r = panel?.getBoundingClientRect();
    return {
      exists: !!panel,
      optsOpen: document.querySelector('.md-search')?.hasAttribute('data-md-state'),
      width: r ? Math.round(r.width) : null,
      height: r ? Math.round(r.height) : null,
      inputLabel: document.querySelector('.md-search__input')?.getAttribute('aria-label'),
      keyboardHint: document.querySelector('.md-search__options .md-search__icon')?.getAttribute('aria-label'),
    };
  });
  await s.close();
}

// 2) 移动端搜索入口
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.home);
  const before = await p.evaluate(() => {
    const form = document.querySelector('.md-search__form');
    const r = form?.getBoundingClientRect();
    return { visible: !!r && r.width > 1 && r.height > 1, w: r ? Math.round(r.width) : 0 };
  });
  await p.locator('label[for="__search"]').click({ force: true }).catch(() => null);
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => {
    const form = document.querySelector('.md-search__form');
    const r = form?.getBoundingClientRect();
    const input = document.querySelector('.md-search__input');
    return {
      open: !!r && r.width > 1,
      w: r ? Math.round(r.width) : 0,
      focused: document.activeElement === input,
      bodyScrollLocked: getComputedStyle(document.body).overflow,
    };
  });
  await shot(p, 'artifacts/lead/mobile-search.png');
  out.mobileSearch = { before, after };
  await s.close();
}

// 3) 线上抽查：搜索索引、关键资源、404
{
  const s = await session('desktop-1280', { base: 'https://studynote.chosenecho.dpdns.org' });
  const p = s.page;
  await goto(p, PAGES.home, { wait: 'load' });
  const urls = ['/search/search_index.json', '/assets/notes.css', '/assets/interactions.js', '/sitemap.xml', '/robots.txt', '/assets/favicon.svg', '/404.html', '/no-such-page-xyz/'];
  out.live = [];
  for (const u of urls) {
    try {
      const r = await p.request.get(u, { timeout: 20000 });
      out.live.push({ u, status: r.status(), type: r.headers()['content-type']?.slice(0, 40), len: (await r.body()).length });
    } catch (e) {
      out.live.push({ u, error: String(e).slice(0, 120) });
    }
  }
  await s.close();
}

console.log(await saveJSON('artifacts/lead/search-check.json', out));
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
