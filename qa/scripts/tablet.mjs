// qa-tablet · 平板 / 中等宽度（768–1220px）体验审计
//
// 用法（仓库根目录）：
//   node qa/scripts/tablet.mjs            # = all，跑完所有测量并写 artifacts + raw
//   node qa/scripts/tablet.mjs matrix     # 断点矩阵：正文列宽 / 行字数 / 侧栏 / 页头
//   node qa/scripts/tablet.mjs tables     # 表格列宽与中文孤字
//   node qa/scripts/tablet.mjs gantt      # 甘特图溢出
//   node qa/scripts/tablet.mjs state      # 断点来回 + 抽屉状态
//   node qa/scripts/tablet.mjs dark       # 深色：figure-zoom 白卡 / 放大对话框
//   node qa/scripts/tablet.mjs extra      # 目录滚动 / 搜索面板 / 触控目标 / 线上抽查
//   node qa/scripts/tablet.mjs a11y       # 4 档 × light/dark 的 layout/tap/contrast/a11y
//
// 背景：Material 的断点是 44.984375em(719.75px) / 59.984375em(959.75px) /
// 76.234375em(1219.75px) / 76.25em(1220px)，而 notes.css 只有 40rem(=640px) 一个断点，
// 中间 641–1219px 是空档。所有数值都来自 getBoundingClientRect / getComputedStyle 实测。

import { session, custom, DEVICES, PAGES, goto, warm, layout, tapTargets, contrast, a11y, shot, saveJSON, diagnostics, LIVE } from '../lib/audit.mjs';

const A = 'artifacts/tablet/';
const RAW = 'artifacts/tablet/raw/';

const TABLETS = ['ipad-portrait', 'ipad-air', 'surface-pro', 'ipad-landscape'];
const SMART = [
  { id: 'ipad-portrait', width: 768, height: 1024 },
  { id: 'ipad-air', width: 820, height: 1180 },
  { id: 'surface-pro', width: 912, height: 1368 },
  { id: 'ipad-landscape', width: 1024, height: 768 },
  { id: 'w960', width: 960, height: 800 },
  { id: 'w1219', width: 1219, height: 800 },
  { id: 'w1220', width: 1220, height: 800 },
];

/** 页面骨架：正文列、行字数、侧栏、页头、排版层级。 */
const SKELETON = () => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      display: cs.display,
      pos: cs.position,
      w: Math.round(r.width),
      h: Math.round(r.height),
      left: Math.round(r.left),
      visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1 && r.right > 1 && r.left < window.innerWidth - 1,
    };
  };
  const fs = (sel) => {
    const el = document.querySelector(sel);
    return el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100 : null;
  };
  const inner = document.querySelector('.md-content__inner');
  const innerCs = inner ? getComputedStyle(inner) : null;
  const p = document.querySelector('.md-content__inner p');
  const paraFs = p ? parseFloat(getComputedStyle(p).fontSize) : 16;
  const innerW = inner ? Math.round(inner.getBoundingClientRect().width) : null;
  const search = document.querySelector('.md-search__form');
  const sr = search ? search.getBoundingClientRect() : null;
  return {
    vw: window.innerWidth,
    docOverflow: document.documentElement.scrollWidth - window.innerWidth,
    content: box('.md-content'),
    contentInner: box('.md-content__inner'),
    innerW,
    gutterL: innerW === null ? null : Math.round(inner.getBoundingClientRect().left),
    gutterR: innerW === null ? null : Math.round(window.innerWidth - inner.getBoundingClientRect().right),
    padL: innerCs?.paddingLeft,
    chars: innerW === null ? null : Math.round(innerW / paraFs),
    paraFs,
    h1: fs('.md-typeset h1'),
    h2: fs('.md-typeset.chapter-prose h2') ?? fs('.md-typeset h2'),
    h3: fs('.md-typeset.chapter-prose h3') ?? fs('.md-typeset h3'),
    blockquote: fs('.md-typeset blockquote p'),
    toolbar: fs('.study-toolbar'),
    saveStatus: fs('.save-status'),
    table: fs('.md-typeset table'),
    ganttBlock: fs('.gantt-block'),
    zoomHint: fs('.zoom-hint'),
    tocVisible: (() => {
      const s = document.querySelector('.md-sidebar--secondary');
      if (!s) return false;
      const r = s.getBoundingClientRect();
      return getComputedStyle(s).display !== 'none' && r.width > 1;
    })(),
    primaryInFlow: (() => {
      const s = document.querySelector('.md-sidebar--primary');
      return s ? getComputedStyle(s).position !== 'fixed' : false;
    })(),
    drawerBtn: (() => {
      const l = document.querySelector('.md-header__button[for="__drawer"]');
      if (!l) return null;
      const r = l.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    })(),
    paletteBtn: (() => {
      const l = document.querySelector('label[for="__palette_1"]');
      if (!l) return null;
      const r = l.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) };
    })(),
    search: sr ? { w: Math.round(sr.width), left: Math.round(sr.left), right: Math.round(sr.right), over: Math.round(sr.right - window.innerWidth) } : null,
    headerH: box('.md-header')?.h,
  };
};

/** 中文孤字：遍历单元格文字，按 Range 逐字分组行，统计末行只有 1 个字的单元格。 */
const ORPHANS = () => {
  const cells = [...document.querySelectorAll('.md-typeset table td, .md-typeset table th')];
  let orphan = 0;
  const samples = [];
  for (const cell of cells) {
    const text = (cell.textContent || '').trim();
    if (text.length < 3) continue;
    const node = [...cell.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!node) continue;
    const range = document.createRange();
    const lines = new Map();
    for (let i = 0; i < node.textContent.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const key = Math.round(r.top);
      lines.set(key, (lines.get(key) || 0) + 1);
    }
    const keys = [...lines.keys()].sort((x, y) => x - y);
    if (keys.length < 2) continue;
    const last = lines.get(keys[keys.length - 1]);
    if (last <= 1) {
      orphan++;
      if (samples.length < 8) samples.push({ text: text.slice(0, 20), lines: keys.length, lastLineChars: last, cellW: Math.round(cell.getBoundingClientRect().width) });
    }
  }
  const tables = [...document.querySelectorAll('.md-typeset table')].map((t, i) => {
    const head = t.rows[0] ? [...t.rows[0].cells] : [];
    return {
      i,
      rows: t.rows.length,
      cols: head.length,
      w: Math.round(t.getBoundingClientRect().width),
      h: Math.round(t.getBoundingClientRect().height),
      colWidths: head.map((c) => Math.round(c.getBoundingClientRect().width)),
      display: getComputedStyle(t).display,
      fontSize: getComputedStyle(t).fontSize,
      head: head.map((c) => (c.textContent || '').trim().slice(0, 10)),
    };
  });
  let widest = null;
  for (const t of tables) if (!widest || t.cols > widest.cols) widest = t;
  return { cellCount: cells.length, orphanCells: orphan, samples, tableCount: tables.length, widest, tables };
};

const evalFn = (page, fn, arg) =>
  page.evaluate(({ src, arg }) => new Function('return (' + src + ')()')(arg), { src: fn.toString(), arg });

const round = (v) => (v === null || v === undefined ? null : Math.round(v * 100) / 100);

// ─────────────────────────── 1. 断点矩阵 ───────────────────────────
async function matrix(out) {
  out.matrix = { pages: {}, notes: {} };
  const s = await session(custom({ width: 1220, height: 900 }), { colorScheme: 'light' });
  const widths = [719, 720, 768, 820, 912, 959, 960, 1024, 1219, 1220];
  for (const [name, path] of Object.entries({ os2: PAGES.os2, co2: PAGES.co2, home: PAGES.home, lab: PAGES.lab })) {
    await goto(s.page, path);
    await warm(s.page);
    out.matrix.pages[name] = { path, rows: [] };
    for (const w of widths) {
      await s.page.setViewportSize({ width: w, height: 900 });
      await s.page.waitForTimeout(200);
      out.matrix.pages[name].rows.push({ w, ...(await evalFn(s.page, SKELETON)) });
    }
  }
  // 证据图：820 竖屏 / 912 竖屏 / 1024 横屏 / 768 竖屏（chapter-2）
  for (const [id, w, h, file] of [
    ['ipad-portrait', 768, 1024, 'tbl-ipad-portrait-light-os2.png'],
    ['ipad-air', 820, 1180, 'tbl-content-820-os2.png'],
    ['surface-pro', 912, 1368, 'tbl-content-912-os2.png'],
    ['ipad-landscape', 1024, 768, 'tbl-ipad-landscape-light-os2.png'],
  ]) {
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    await s.page.setViewportSize({ width: w, height: h });
    await s.page.waitForTimeout(250);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    out.matrix.notes[file] = await shot(s.page, A + file);
  }
  // 页头 768 / 1024
  for (const [w, file] of [[768, 'tbl-header-768.png'], [1024, 'tbl-header-1024.png']]) {
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    await s.page.setViewportSize({ width: w, height: w === 768 ? 1024 : 768 });
    await s.page.waitForTimeout(200);
    out.matrix.notes[file] = await shot(s.page, A + file, { clip: { x: 0, y: 0, width: w, height: 56 } });
  }
  // 工具条字号证据
  await goto(s.page, PAGES.os2);
  await warm(s.page);
  await s.page.setViewportSize({ width: 768, height: 1024 });
  await s.page.waitForTimeout(200);
  out.matrix.notes['tbl-toolbar-768.png'] = await shot(s.page, A + 'tbl-toolbar-768.png', { selector: '.study-toolbar' });
  await s.close();
  console.log('· matrix: 4 页 × 10 个宽度 + 6 张证据图');
}

// ─────────────────────────── 2. 表格 ───────────────────────────
async function tables(out) {
  out.tables = {};
  const s = await session(custom({ width: 1220, height: 900 }), { colorScheme: 'light' });
  for (const [name, path] of Object.entries({ co2: PAGES.co2, os2: PAGES.os2, os3: PAGES.os3 })) {
    await goto(s.page, path);
    await warm(s.page);
    out.tables[name] = {};
    for (const w of [768, 820, 912, 960, 1024, 1219, 1220]) {
      await s.page.setViewportSize({ width: w, height: 1000 });
      await s.page.waitForTimeout(220);
      out.tables[name][w] = await evalFn(s.page, ORPHANS);
    }
  }
  // 证据图：co2 的「复习导航」表在 768 / 1024 / 1219
  for (const w of [768, 1024, 1219]) {
    await goto(s.page, PAGES.co2);
    await warm(s.page);
    await s.page.setViewportSize({ width: w, height: 1024 });
    await s.page.waitForTimeout(250);
    await s.page.locator('.md-typeset table').first().scrollIntoViewIfNeeded();
    await s.page.waitForTimeout(250);
    await shot(s.page, A + `tbl-table-co2-${w}.png`);
  }
  await s.close();
  console.log('· tables: co2/os2/os3 × 7 个宽度 + 3 张证据图');
}

// ─────────────────────────── 3. 甘特图 ───────────────────────────
async function gantt(out) {
  out.gantt = {};
  const s = await session('ipad-portrait', { colorScheme: 'light' });
  await goto(s.page, PAGES.lab);
  await warm(s.page);
  const snap = (tag) =>
    s.page.evaluate((tag) => {
      const g = document.querySelector('.gantt');
      if (!g) return { tag, missing: true };
      const blocks = [...g.querySelectorAll('.gantt-block')];
      return {
        tag,
        containerW: Math.round(g.clientWidth),
        scrollW: Math.round(g.scrollWidth),
        hidden: Math.round(g.scrollWidth - g.clientWidth),
        blocks: blocks.length,
        blockWidths: blocks.slice(0, 12).map((b) => Math.round(b.getBoundingClientRect().width)),
        blockMinWidth: blocks[0] ? getComputedStyle(blocks[0]).minWidth : null,
        blockFontSize: blocks[0] ? getComputedStyle(blocks[0]).fontSize : null,
        scrollbarVisible: g.offsetHeight - g.clientHeight > 1,
        labels: blocks.slice(0, 12).map((b) => b.textContent.replace(/\n/g, '|')),
      };
    }, tag);
  out.gantt.fcfs768 = await snap('fcfs-768');
  await shot(s.page, A + 'tbl-gantt-fcfs-768.png', { selector: '.lab-results' });
  await s.page.selectOption('select[name="algorithm"]', 'rr');
  await s.page.waitForTimeout(200);
  const q = await s.page.$('input[name="quantum"]');
  if (q) await q.fill('1');
  await s.page.click('.lab-buttons button[type="submit"]');
  await s.page.waitForTimeout(400);
  out.gantt.rr1_768 = await snap('rr1-768');
  await shot(s.page, A + 'tbl-gantt-rr1-768.png', { selector: '.lab-results' });
  for (const [w, h, tag] of [[1024, 768, 'rr1-1024'], [1220, 900, 'rr1-1220']]) {
    await s.page.setViewportSize({ width: w, height: h });
    await s.page.waitForTimeout(450);
    out.gantt[tag] = await snap(tag);
  }
  await shot(s.page, A + 'tbl-gantt-rr1-1220.png', { selector: '.lab-results' });
  await s.close();
  console.log('· gantt: FCFS@768 + RR(q=1)@768/1024/1220 + 3 张证据图');
}

// ─────────────────────────── 4. 断点来回 / 抽屉 ───────────────────────────
async function state(out) {
  out.state = { ladder: [], drawer: [] };
  const s = await session(custom({ width: 1220, height: 900 }), { colorScheme: 'light' });
  await goto(s.page, PAGES.os2);
  await warm(s.page);
  const snap = async (tag) => {
    const r = await evalFn(s.page, SKELETON);
    const extra = await s.page.evaluate(() => {
      const ov = document.querySelector('.md-overlay');
      const ovCs = ov ? getComputedStyle(ov) : null;
      const side = document.querySelector('.md-sidebar--primary');
      const sideR = side.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
      return {
        overlay: ovCs ? { display: ovCs.display, opacity: ovCs.opacity, pointerEvents: ovCs.pointerEvents, w: Math.round(ov.getBoundingClientRect().width) } : null,
        sidebarLeft: Math.round(sideR.left),
        drawerChecked: document.getElementById('__drawer')?.checked ?? null,
        centerHit: hit ? hit.tagName.toLowerCase() + '.' + String(hit.className || '').split(/\s+/)[0] : null,
      };
    });
    return { tag, ...r, ...extra };
  };
  for (const w of [719, 720, 959, 960, 1219, 1220, 1219, 960, 720]) {
    await s.page.setViewportSize({ width: w, height: 900 });
    await s.page.waitForTimeout(650);
    out.state.ladder.push(await snap(`resize-${w}`));
  }
  // 真实场景：768 竖屏开抽屉 → 旋转 1024 → 回 768 → 1220
  await s.page.setViewportSize({ width: 768, height: 1024 });
  await s.page.waitForTimeout(500);
  await s.page.evaluate(() => window.scrollTo(0, 0));
  out.state.drawer.push(await snap('0-768-closed'));
  await s.page.click('.md-header__button[for="__drawer"]');
  await s.page.waitForTimeout(800);
  out.state.drawer.push(await snap('1-768-open'));
  await shot(s.page, A + 'tbl-drawer-open-768.png');
  for (const [tag, w, h, file] of [
    ['2-rotate-1024', 1024, 768, 'tbl-drawer-rotate-1024.png'],
    ['3-back-768', 768, 1024, 'tbl-drawer-back-768.png'],
    ['4-1220', 1220, 800, 'tbl-drawer-1220.png'],
  ]) {
    await s.page.setViewportSize({ width: w, height: h });
    await s.page.waitForTimeout(900);
    out.state.drawer.push(await snap(tag));
    await shot(s.page, A + file);
  }
  await s.close();
  console.log('· state: 9 步宽度阶梯 + 抽屉 4 步 + 4 张证据图');
}

// ─────────────────────────── 5. 深色主题 ───────────────────────────
async function dark(out) {
  out.dark = {};
  const s = await session('ipad-portrait', { colorScheme: 'dark' });
  await goto(s.page, PAGES.os1);
  await s.page.click('label[for="__palette_1"]');
  await s.page.waitForTimeout(500);
  await warm(s.page);
  out.dark.schemeOn = await s.page.evaluate(() => document.body.getAttribute('data-md-color-scheme'));
  out.dark.figure = await s.page.evaluate(() => {
    const fz = [...document.querySelectorAll('.figure-zoom')];
    const first = fz[0];
    if (!first) return { count: 0 };
    const cs = getComputedStyle(first);
    const hint = first.querySelector('.zoom-hint');
    const r = first.getBoundingClientRect();
    const img = first.querySelector('img');
    return {
      count: fz.length,
      bg: cs.backgroundColor,
      borderColor: cs.borderColor,
      w: Math.round(r.width),
      h: Math.round(r.height),
      screenRatio: Math.round((r.width / window.innerWidth) * 100),
      imgW: img ? Math.round(img.getBoundingClientRect().width) : null,
      imgH: img ? Math.round(img.getBoundingClientRect().height) : null,
      hintBg: hint ? getComputedStyle(hint).backgroundColor : null,
      hintColor: hint ? getComputedStyle(hint).color : null,
      hintFontSize: hint ? getComputedStyle(hint).fontSize : null,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
  const fz = s.page.locator('.figure-zoom').first();
  if (await fz.count()) {
    await fz.scrollIntoViewIfNeeded();
    await s.page.waitForTimeout(300);
    await shot(s.page, A + 'tbl-figure-zoom-dark-768.png', { selector: '.figure-zoom' });
    await fz.click();
    await s.page.waitForTimeout(500);
    out.dark.dialog = await s.page.evaluate(() => {
      const d = document.querySelector('.image-dialog');
      if (!d || !d.open) return { open: false };
      const img = d.querySelector('img');
      return { open: true, bg: getComputedStyle(d).backgroundColor, imgBg: img ? getComputedStyle(img).backgroundColor : null, w: Math.round(d.getBoundingClientRect().width), vw: window.innerWidth };
    });
    await shot(s.page, A + 'tbl-image-dialog-dark-768.png');
    await s.page.keyboard.press('Escape');
  }
  // 深色下的章节页整屏，作为对照
  await goto(s.page, PAGES.os2);
  await warm(s.page);
  await s.page.evaluate(() => window.scrollTo(0, 0));
  await s.page.waitForTimeout(200);
  await shot(s.page, A + 'tbl-ipad-portrait-dark-os2.png');
  await s.close();
  console.log('· dark: figure-zoom / 放大对话框 / 整屏对照');
}

// ─────────────────────────── 6. 补充探针 ───────────────────────────
async function extra(out) {
  out.extra = {};

  // 目录在 1024×768 是否可滚、末项是否可达
  {
    const s = await session('ipad-landscape', { colorScheme: 'light' });
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    out.extra.toc = await s.page.evaluate(() => {
      const wrap = document.querySelector('.md-sidebar--secondary .md-sidebar__scrollwrap');
      const items = [...document.querySelectorAll('.md-nav--secondary .md-nav__item')];
      const last = items[items.length - 1];
      const r = last ? last.getBoundingClientRect() : null;
      return {
        items: items.length,
        wrapScrollH: wrap ? wrap.scrollHeight : null,
        wrapClientH: wrap ? wrap.clientHeight : null,
        overflowY: wrap ? getComputedStyle(wrap).overflowY : null,
        lastBottom: r ? Math.round(r.bottom) : null,
        vh: window.innerHeight,
      };
    });
    await shot(s.page, A + 'tbl-toc-1024.png', { clip: { x: 760, y: 48, width: 264, height: 720 } });
    await s.page.evaluate(() => {
      const wrap = document.querySelector('.md-sidebar--secondary .md-sidebar__scrollwrap');
      if (wrap) wrap.scrollTop = wrap.scrollHeight;
    });
    await s.page.waitForTimeout(300);
    out.extra.tocAfterScroll = await s.page.evaluate(() => {
      const items = [...document.querySelectorAll('.md-nav--secondary .md-nav__item')];
      const last = items[items.length - 1];
      const r = last.getBoundingClientRect();
      return { label: last.textContent.trim().slice(0, 30), bottom: Math.round(r.bottom), vh: window.innerHeight, visible: r.bottom <= window.innerHeight && r.top >= 0 };
    });
    await shot(s.page, A + 'tbl-toc-1024x768-scrolled.png', { clip: { x: 760, y: 48, width: 264, height: 720 } });
    // 滚动页面验证 sticky
    await s.page.evaluate(() => window.scrollTo(0, 2200));
    await s.page.waitForTimeout(500);
    out.extra.tocSticky = await s.page.evaluate(() => {
      const side = document.querySelector('.md-sidebar--secondary');
      const r = side.getBoundingClientRect();
      return { scrollY: Math.round(window.scrollY), top: Math.round(r.top), pos: getComputedStyle(side).position, visible: r.top < window.innerHeight && r.bottom > 0 };
    });
    await shot(s.page, A + 'tbl-toc-sticky-1024.png', { clip: { x: 760, y: 0, width: 264, height: 768 } });
    await s.close();
  }

  // 搜索：内联搜索面板在 960–1220 的宽度与越界（能否打开记入结果）
  {
    out.extra.search = {};
    for (const w of [960, 1024, 1219, 1220]) {
      const s = await session(custom({ width: w, height: 800 }), { colorScheme: 'light' });
      await goto(s.page, PAGES.os2);
      await warm(s.page);
      await s.page.click('label[for="__search"]').catch(() => {});
      await s.page.waitForTimeout(400);
      await s.page.keyboard.type('进程', { delay: 40 }).catch(() => {});
      await s.page.waitForTimeout(900);
      out.extra.search[w] = await s.page.evaluate(() => {
        const g = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return { w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), opacity: cs.opacity, display: cs.display, overflowX: cs.overflowX };
        };
        const result = document.querySelector('.md-search-result');
        return {
          vw: window.innerWidth,
          searchChecked: document.getElementById('__search')?.checked ?? null,
          form: g('.md-search__form'),
          output: g('.md-search__output'),
          result: g('.md-search-result'),
          resultOver: result ? Math.round(result.getBoundingClientRect().right - window.innerWidth) : null,
          hits: document.querySelectorAll('.md-search-result__item').length,
        };
      });
      await shot(s.page, A + `tbl-search-${w}.png`, { clip: { x: Math.max(0, w - 640), y: 0, width: Math.min(640, w), height: 520 } });
      await s.close();
    }
  }

  // 触控目标明细（站点自有控件 vs Material 默认）
  {
    const s = await session('ipad-portrait', { colorScheme: 'light' });
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    out.extra.touch = await s.page.evaluate(() => {
      const q = (sel) => [...document.querySelectorAll(sel)].map((el) => {
        const r = el.getBoundingClientRect();
        return { label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) };
      });
      return {
        hamburger: q('.md-header__button[for="__drawer"]'),
        palette: q('label[for="__palette_1"]'),
        searchToggle: q('label[for="__search"]'),
        mdTop: q('.md-top'),
        headerlink: q('.headerlink').slice(0, 4),
        toolbarLabel: q('.study-toolbar label'),
        toolbarCheckbox: q('.study-toolbar input[type="checkbox"]'),
        exerciseSummary: q('.exercise-item summary').slice(0, 2),
        footerLink: q('.md-footer__link').slice(0, 2),
        primaryLink: q('.primary-link'),
      };
    });
    // 首页 CTA
    await goto(s.page, PAGES.home);
    await warm(s.page);
    out.extra.homeCta = await s.page.evaluate(() =>
      [...document.querySelectorAll('.grid.cards a, .md-content__inner > p a')].slice(0, 6).map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent.trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) };
      }),
    );
    await s.page.evaluate(() => document.querySelector('.grid.cards')?.scrollIntoView({ block: 'center' }));
    await s.page.waitForTimeout(250);
    await shot(s.page, A + 'tbl-home-cta-768.png', { selector: '.grid.cards' });
    await s.close();
  }

  // 线上抽查
  {
    const s = await session('ipad-landscape', { base: LIVE, colorScheme: 'light' });
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    out.extra.live = await s.page.evaluate(() => ({
      vw: window.innerWidth,
      contentInnerW: Math.round(document.querySelector('.md-content__inner').getBoundingClientRect().width),
      h1: getComputedStyle(document.querySelector('.md-typeset h1')).fontSize,
      h2: getComputedStyle(document.querySelector('.md-typeset h2')).fontSize,
      toolbarFontSize: getComputedStyle(document.querySelector('.study-toolbar')).fontSize,
      tocDisplay: getComputedStyle(document.querySelector('.md-sidebar--secondary')).display,
    }));
    out.extra.liveDiag = diagnostics(s);
    await shot(s.page, A + 'tbl-live-1024-os2.png');
    await s.close();
  }
  console.log('· extra: 目录滚动/sticky + 搜索面板 ×4 + 触控明细 + 首页 CTA + 线上抽查');
}

// ─────────────────────────── 7. layout/tap/contrast/a11y ───────────────────────────
async function audit(out) {
  out.audit = {};
  for (const scheme of ['light', 'dark']) {
    for (const dev of TABLETS) {
      const s = await session(dev, { colorScheme: scheme });
      const key = `${dev}:${scheme}`;
      out.audit[key] = {};
      if (scheme === 'dark') {
        await goto(s.page, PAGES.home);
        await s.page.click('label[for="__palette_1"]');
        await s.page.waitForTimeout(400);
      }
      await goto(s.page, PAGES.os2);
      await warm(s.page);
      out.audit[key].layout = await layout(s.page);
      out.audit[key].tapTargets = await tapTargets(s.page);
      out.audit[key].contrast = await contrast(s.page);
      out.audit[key].a11y = await a11y(s.page);
      if (scheme === 'dark' && dev === 'ipad-portrait') await shot(s.page, A + 'tbl-dark-768-os2.png');
      await s.close();
    }
  }
  console.log('· a11y: 4 档 × light/dark 的 layout/tap/contrast/a11y');
}

// ─────────────────────────── 入口 ───────────────────────────
const MODES = { matrix, tables, gantt, state, dark, extra, audit };
const mode = process.argv[2] || 'all';
const out = { member: 'qa-tablet', env: 'local', base: 'http://127.0.0.1:8123', generatedAt: new Date().toISOString(), viewports: SMART, breakpoints: 'Material 719.75 / 959.75 / 1219.75 / 1220px；notes.css 40rem=640px' };

if (mode === 'all' || !MODES[mode]) {
  for (const [name, fn] of Object.entries(MODES)) {
    await fn(out);
    await saveJSON(`${RAW}tablet-${name}.json`, out[name] ?? out);
  }
  await saveJSON(`${RAW}tablet-all.json`, out);
  const shots = Object.keys(out.matrix?.notes || {}).length + 3 + 3 + 4 + 3 + 3;
  console.log(`\n完成。原始数据：${RAW}tablet-*.json；截图约 ${shots} 张在 qa/artifacts/tablet/`);
} else {
  await MODES[mode](out);
  await saveJSON(`${RAW}tablet-${mode}.json`, out[mode] ?? out);
  console.log(`\n完成（${mode}）。原始数据：${RAW}tablet-${mode}.json`);
}
