// Lead：复核 mobile 的三条关键结论（P0 表格裁列 / P1 放大无效果 / P2 工具条跳动 / placeholder 对比度）
import { session, PAGES, goto, warm, shot, saveJSON } from '../lib/audit.mjs';

const out = {};

// A. 375 宽 lab 结果表
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.lab);
  await p.waitForTimeout(800);
  out.labTable = await p.evaluate(() => {
    const tables = [...document.querySelectorAll('.lab-results table, .md-content table')];
    const t = tables[tables.length - 1];
    if (!t) return null;
    const wrap = t.parentElement;
    const cs = getComputedStyle(t);
    const wr = wrap.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const headers = [...t.querySelectorAll('th')].map((th) => {
      const r = th.getBoundingClientRect();
      return { text: th.textContent, x: Math.round(r.x), right: Math.round(r.right), visible: r.left >= 0 && r.right <= window.innerWidth + 1 };
    });
    return {
      tableW: Math.round(tr.width),
      wrapTag: wrap.tagName + '.' + (wrap.className || ''),
      wrapW: Math.round(wr.width),
      wrapOverflowX: getComputedStyle(wrap).overflowX,
      tableScrollW: t.scrollWidth,
      tableDisplay: cs.display,
      headers,
      viewportW: window.innerWidth,
      htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
      lastColVisible: headers[headers.length - 1]?.visible,
    };
  });
  await shot(p, 'artifacts/lead/verify-lab-table-375.png', { fullPage: false });
  // 滚到结果表截图
  await p.locator('.lab-results table').scrollIntoViewIfNeeded().catch(() => null);
  await shot(p, 'artifacts/lead/verify-lab-results-375.png');
  await s.close();
}

// B. 375 宽插图放大倍数
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.os3);
  await warm(p);
  const inline = await p.evaluate(() => {
    const img = document.querySelector('.figure-zoom img');
    const r = img.getBoundingClientRect();
    return { w: Math.round(r.width), natural: img.naturalWidth, src: img.currentSrc.split('/').pop() };
  });
  await p.locator('.figure-zoom').first().click();
  await p.waitForTimeout(500);
  const dlg = await p.evaluate(() => {
    const d = document.querySelector('.image-dialog');
    const img = d.querySelector('img');
    const r = img.getBoundingClientRect();
    const dr = d.getBoundingClientRect();
    return { dialogW: Math.round(dr.width), dialogH: Math.round(dr.height), imgW: Math.round(r.width), imgH: Math.round(r.height), maxH: getComputedStyle(img).maxHeight, hasZoomUI: !!d.querySelector('button.close-dialog'), txt: d.querySelector('p').textContent.slice(0, 30) };
  });
  await shot(p, 'artifacts/lead/verify-dialog-375.png');
  out.dialogMobile = { inline, dlg, enlargePct: Math.round(((dlg.imgW - inline.w) / inline.w) * 100) };
  // C. 背景是否滚动
  const before = await p.evaluate(() => scrollY);
  await p.mouse.move(180, 400);
  await p.mouse.wheel(0, 700);
  await p.waitForTimeout(500);
  const after = await p.evaluate(() => scrollY);
  out.dialogScroll = { before, after, moved: after - before };
  await p.keyboard.press('Escape');
  await s.close();
}

// D. 工具条勾选前后高度
{
  const s = await session('iphone-se');
  const p = s.page;
  await goto(p, PAGES.os2);
  const h0 = await p.evaluate(() => Math.round(document.querySelector('.study-toolbar').getBoundingClientRect().height));
  const y0 = await p.evaluate(() => Math.round(document.querySelector('.md-content h2').getBoundingClientRect().top));
  await p.locator('[data-complete]').check();
  await p.waitForTimeout(400);
  const h1 = await p.evaluate(() => Math.round(document.querySelector('.study-toolbar').getBoundingClientRect().height));
  const y1 = await p.evaluate(() => Math.round(document.querySelector('.md-content h2').getBoundingClientRect().top));
  const status = await p.evaluate(() => document.querySelector('.save-status').textContent);
  out.toolbarJump = { before: h0, after: h1, h2TopBefore: y0, h2TopAfter: y1, shift: y1 - y0, status };
  await shot(p, 'artifacts/lead/verify-toolbar-after-375.png');
  await s.close();
}

// E. placeholder 计算色（light / dark）
{
  for (const scheme of ['light', 'dark']) {
    const s = await session('desktop-1440', { colorScheme: scheme });
    const p = s.page;
    await goto(p, PAGES.home);
    if (scheme === 'dark') {
      await p.click('label[for="__palette_1"]');
      await p.waitForTimeout(300);
    }
    out[`placeholder-${scheme}`] = await p.evaluate(() => {
      const input = document.querySelector('.md-search__input');
      const cs = getComputedStyle(input);
      const ph = getComputedStyle(input, '::placeholder');
      const form = getComputedStyle(document.querySelector('.md-search__form'));
      return { inputColor: cs.color, placeholderColor: ph.color, formBg: form.backgroundColor, scheme: document.body.getAttribute('data-md-color-scheme') };
    });
    await s.close();
  }
}

console.log(await saveJSON('artifacts/lead/verify-mobile.json', out));
console.log(JSON.stringify(out, null, 1));
