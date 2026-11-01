// Lead：UI 关键交互抽查（插图放大、抽屉导航、工具条位置、主题记忆、404）
import { session, PAGES, goto, warm, shot, saveJSON } from '../lib/audit.mjs';

const out = {};

// A. 插图放大 dialog
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os3);
  await warm(p);
  const before = await p.evaluate(() => ({
    figures: document.querySelectorAll('.figure-zoom').length,
    firstAlt: document.querySelector('.figure-zoom img')?.alt,
    firstSrc: document.querySelector('.figure-zoom img')?.currentSrc?.split('/').pop(),
    firstNatural: (() => {
      const i = document.querySelector('.figure-zoom img');
      return i ? { w: i.naturalWidth, h: i.naturalHeight } : null;
    })(),
    displayW: Math.round(document.querySelector('.figure-zoom img')?.getBoundingClientRect().width || 0),
  }));
  await p.locator('.figure-zoom').first().click();
  await p.waitForTimeout(500);
  const opened = await p.evaluate(() => {
    const d = document.querySelector('.image-dialog');
    const r = d.getBoundingClientRect();
    const img = d.querySelector('img');
    return {
      open: d.open,
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      imgSrc: img.getAttribute('src')?.split('/').pop(),
      imgNatural: { w: img.naturalWidth, h: img.naturalHeight },
      imgShown: { w: Math.round(img.getBoundingClientRect().width), h: Math.round(img.getBoundingClientRect().height) },
      caption: d.querySelector('p')?.textContent?.slice(0, 40),
      focusInside: d.contains(document.activeElement),
      activeEl: document.activeElement?.tagName + '.' + (document.activeElement?.className || '').toString().slice(0, 30),
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  await shot(p, 'artifacts/lead/dialog-open.png');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  const afterEsc = await p.evaluate(() => ({
    open: document.querySelector('.image-dialog').open,
    focusAfter: document.activeElement?.tagName + '.' + (document.activeElement?.className || '').toString().slice(0, 40),
  }));
  // 点背景关闭
  await p.locator('.figure-zoom').first().click();
  await p.waitForTimeout(300);
  await p.mouse.click(20, 500);
  await p.waitForTimeout(400);
  const afterBackdrop = await p.evaluate(() => document.querySelector('.image-dialog').open);
  out.dialog = { before, opened, afterEsc, afterBackdrop };
  await s.close();
}

// B. 移动端抽屉导航
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.os2);
  const closed = await p.evaluate(() => {
    const nav = document.querySelector('.md-nav--primary');
    const r = nav.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width), drawerChecked: document.querySelector('#__drawer')?.checked };
  });
  const ham = await p.locator('label[for="__drawer"]').first().boundingBox();
  await p.mouse.click(ham.x + ham.width / 2, ham.y + ham.height / 2);
  await p.waitForTimeout(600);
  const open = await p.evaluate(() => {
    const nav = document.querySelector('.md-nav--primary');
    const r = nav.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      w: Math.round(r.width),
      drawerChecked: document.querySelector('#__drawer')?.checked,
      navLinks: [...document.querySelectorAll('.md-nav--primary a.md-nav__link')].filter((a) => a.getBoundingClientRect().width > 1).length,
      bodyOverflow: getComputedStyle(document.body).overflow,
      closeBtn: !!document.querySelector('label[for="__drawer"].md-nav__title'),
    };
  });
  await shot(p, 'artifacts/lead/mobile-drawer.png');
  // 打开后能否点到第二章
  await p.locator('.md-nav--primary a.md-nav__link').filter({ hasText: '第二章 进程管理' }).first().click({ timeout: 5000 }).catch(() => null);
  await p.waitForTimeout(800);
  const navigated = { url: p.url() };
  out.drawer = { closed, open, navigated };
  await s.close();
}

// C. 工具条位置（README 说"每章末尾"）
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os2);
  out.toolbar = await p.evaluate(() => {
    const tb = document.querySelector('.study-toolbar');
    const inner = document.querySelector('.md-content__inner');
    const h1 = inner.querySelector('h1');
    const h2s = [...inner.querySelectorAll('h2')];
    const r = tb.getBoundingClientRect();
    const ir = inner.getBoundingClientRect();
    return {
      offsetTopRelContent: Math.round(r.top - ir.top),
      contentHeight: Math.round(ir.height),
      positionRatio: Math.round(((r.top - ir.top) / ir.height) * 100),
      beforeFirstH2: h2s.length ? r.top < h2s[0].getBoundingClientRect().top : null,
      h1Top: Math.round(h1.getBoundingClientRect().top),
    };
  });
  // 主题记忆
  await p.click('label[for="__palette_1"]');
  await p.waitForTimeout(400);
  await p.reload({ waitUntil: 'networkidle' });
  out.themePersist = await p.evaluate(() => ({
    scheme: document.body.getAttribute('data-md-color-scheme'),
    stored: localStorage.getItem('__palette')?.slice(0, 80),
  }));
  await s.close();
}

// D. 404 页
{
  const s = await session('desktop-1280');
  const p = s.page;
  const resp = await p.goto('/no-such-page/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(300);
  out.notFound = {
    status: resp?.status(),
    title: await p.title(),
    h1: await p.locator('h1').first().textContent().catch(() => null),
    homeLink: await p.locator('a[href="/"]').count(),
    navLinks: await p.locator('.md-nav a').count(),
    textSnippet: (await p.locator('main').innerText().catch(() => '')).slice(0, 120),
  };
  await shot(p, 'artifacts/lead/404.png');
  await s.close();
}

console.log(await saveJSON('artifacts/lead/ui-check.json', out));
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
