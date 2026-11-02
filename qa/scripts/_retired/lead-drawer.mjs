// Lead：抽屉导航（用 checkbox 状态驱动）+ 线上 404 页
import { session, PAGES, goto, shot, saveJSON } from '../lib/audit.mjs';

const out = {};
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.os2);
  const labels = await p.evaluate(() =>
    [...document.querySelectorAll('label')].map((l, i) => {
      const r = l.getBoundingClientRect();
      return { i, for: l.getAttribute('for'), cls: l.className.toString().slice(0, 40), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  out.labels = labels;
  // 直接置位 checkbox（Material 用 :checked 控制抽屉）
  await p.evaluate(() => {
    const cb = document.querySelector('#__drawer');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(600);
  out.openByCheckbox = await p.evaluate(() => {
    const nav = document.querySelector('.md-nav--primary');
    const r = nav.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      w: Math.round(r.width),
      checked: document.querySelector('#__drawer').checked,
      visibleLinks: [...document.querySelectorAll('.md-nav--primary a.md-nav__link')].filter((a) => a.getBoundingClientRect().width > 1).length,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  await shot(p, 'artifacts/lead/mobile-drawer2.png');
  // 真实鼠标点击 hamburger
  await p.evaluate(() => {
    const cb = document.querySelector('#__drawer');
    cb.checked = false;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  const hamburger = await p.evaluate(() => {
    const el = document.querySelector('.md-header label[for="__drawer"], .md-header [for="__drawer"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width) };
  });
  out.hamburger = hamburger;
  if (hamburger) {
    await p.mouse.click(hamburger.x, hamburger.y);
    await p.waitForTimeout(700);
    out.afterRealClick = await p.evaluate(() => ({
      checked: document.querySelector('#__drawer').checked,
      navX: Math.round(document.querySelector('.md-nav--primary').getBoundingClientRect().x),
    }));
    await shot(p, 'artifacts/lead/mobile-drawer3.png');
  }
  await s.close();
}

// 线上 404
{
  const s = await session('desktop-1280', { base: 'https://studynote.chosenecho.dpdns.org' });
  const p = s.page;
  const resp = await p.goto('/no-such-page-abc/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  out.live404 = {
    status: resp?.status(),
    title: await p.title(),
    h1: await p.locator('h1').first().textContent().catch(() => null),
    hasNav: await p.locator('.md-nav a').count(),
    mainText: (await p.locator('main').innerText().catch(() => '')).slice(0, 200),
  };
  await shot(p, 'artifacts/lead/live-404.png');
  await s.close();
}

console.log(await saveJSON('artifacts/lead/drawer-404.json', out));
console.log(JSON.stringify(out, null, 1).slice(0, 3000));
