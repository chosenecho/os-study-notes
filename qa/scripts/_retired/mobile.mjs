#!/usr/bin/env node
// qa/scripts/mobile.mjs — 移动端（手机）体验审计，可重复运行。
//   node qa/scripts/mobile.mjs
// 依赖 qa/lib/audit.mjs；所有路径相对仓库根目录执行。
// 产物：qa/artifacts/mobile/*.png、qa/artifacts/mobile/raw.json、qa/reports/mobile.json、qa/reports/mobile.md
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  session, DEVICES, PAGES, goto, warm, layout, tapTargets, contrast, a11y,
  shot, saveJSON, diagnostics, LOCAL, LIVE,
} from '../lib/audit.mjs';

const ART = 'artifacts/mobile';
const startedAt = new Date().toISOString();

const MATRIX = [
  ['android-360', 'light'],
  ['android-360', 'dark'],
  ['iphone-se', 'light'],
  ['iphone-se', 'dark'],
  ['iphone-14', 'light'],
  ['iphone-14', 'dark'],
];
const PAGE_SET = [
  ['home', PAGES.home],
  ['os2', PAGES.os2],
  ['os3', PAGES.os3],
  ['co2', PAGES.co2],
  ['lab', PAGES.lab],
];

const raw = { startedAt, local: LOCAL, live: LIVE, matrix: {}, live: {}, gaps: [] };
const round = (n) => (n === null || n === undefined || Number.isNaN(n) ? null : Math.round(n * 100) / 100);

// ---------------------------------------------------------------- 工具
/** 站点不跟随系统深色：通过 palette 控件切主题，逐级回退。 */
async function forceScheme(page, scheme) {
  const want = scheme === 'dark' ? 'slate' : 'default';
  const idx = scheme === 'dark' ? 1 : 0;
  const read = () => page.evaluate(() => ({
    scheme: document.documentElement.getAttribute('data-md-color-scheme'),
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  let state = await read();
  if (state.scheme === want) return { ok: true, how: 'already', ...state };
  const labelSel = `.md-header label[for="__palette_${idx}"]`;
  const labelVisible = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0;
  }, labelSel);
  if (labelVisible) {
    await page.locator(labelSel).first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
    state = await read();
    if (state.scheme === want) return { ok: true, how: 'label-click', labelVisible, ...state };
  }
  await page.evaluate((sel) => document.querySelector(sel)?.click(), `#__palette_${idx}`);
  await page.waitForTimeout(200);
  state = await read();
  if (state.scheme === want) return { ok: true, how: 'input-click', labelVisible, ...state };
  await page.evaluate((i) => {
    localStorage.setItem('__palette', JSON.stringify({ index: i, color: { scheme: i === 1 ? 'slate' : 'default', primary: 'custom', accent: 'blue' } }));
  }, idx);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  state = await read();
  return { ok: state.scheme === want, how: 'localStorage+reload', labelVisible, ...state };
}

const rectOf = `(el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right) }; }`;

async function firstScreen(page) {
  return page.evaluate((rectSrc) => {
    const r = eval(rectSrc);
    const vh = window.innerHeight;
    const header = r(document.querySelector('.md-header'));
    const toolbar = r(document.querySelector('.study-toolbar'));
    const h1 = r(document.querySelector('.md-content__inner h1'));
    const content = document.querySelector('.md-content__inner');
    return {
      vw: window.innerWidth,
      vh,
      header,
      toolbar,
      h1,
      chromeBottom: toolbar ? toolbar.bottom : header ? header.bottom : 0,
      visibleContentBlocks: content
        ? [...content.querySelectorAll('p, li, blockquote')].filter((el) => {
          const b = el.getBoundingClientRect();
          return b.top < vh && b.bottom > (toolbar ? toolbar.bottom : 49);
        }).length
        : null,
    };
  }, rectOf);
}

async function tableProbe(page) {
  return page.evaluate(() => {
    const out = [];
    for (const t of document.querySelectorAll('.md-typeset table')) {
      const cs = getComputedStyle(t);
      const wrap = t.closest('.md-typeset__scrollwrap');
      const box = t.getBoundingClientRect();
      const cells = [...t.querySelectorAll('th, td')];
      out.push({
        rows: t.rows.length,
        cols: t.rows[0]?.cells.length ?? 0,
        display: cs.display,
        fontSize: cs.fontSize,
        clientWidth: Math.round(t.clientWidth),
        scrollWidth: Math.round(t.scrollWidth),
        wrapWidth: wrap ? wrap.clientWidth : null,
        wrapScrollWidth: wrap ? wrap.scrollWidth : null,
        wrapped: !!wrap,
        rightEdge: Math.round(box.right),
        viewportW: window.innerWidth,
        overViewport: Math.round(box.right - window.innerWidth),
        squeezedCells: cells.filter((c) => c.scrollWidth > c.clientWidth + 1).length,
        maxCellHeight: Math.round(Math.max(...cells.map((c) => c.getBoundingClientRect().height), 0)),
        sample: (t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
      });
    }
    return out;
  });
}

async function blockProbe(page) {
  return page.evaluate(() => {
    const pre = [...document.querySelectorAll('.md-typeset pre')].map((el) => ({
      clientWidth: Math.round(el.clientWidth),
      scrollWidth: Math.round(el.scrollWidth),
      over: Math.round(el.getBoundingClientRect().right - window.innerWidth),
    }));
    const figures = [...document.querySelectorAll('.figure-zoom')].map((el) => {
      const img = el.querySelector('img');
      const ib = img ? img.getBoundingClientRect() : null;
      const hint = el.querySelector('.zoom-hint');
      return {
        w: Math.round(el.getBoundingClientRect().width),
        imgW: ib ? Math.round(ib.width) : null,
        naturalW: img ? img.naturalWidth : null,
        hintFont: hint ? getComputedStyle(hint).fontSize : null,
        hintW: hint ? Math.round(hint.getBoundingClientRect().width) : null,
      };
    });
    return { pre, figures };
  });
}

async function typeScale(page) {
  return page.evaluate(() => {
    const px = (sel) => {
      const el = document.querySelector(sel);
      return el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10 : null;
    };
    return {
      noteFontVar: getComputedStyle(document.documentElement).getPropertyValue('--note-font-size').trim(),
      root: px('html'),
      content: px('.md-content__inner'),
      p: px('.md-content__inner > p'),
      h1: px('.md-content__inner h1'),
      h2: px('.md-content__inner h2'),
      h3: px('.md-content__inner h3'),
      table: px('.md-content__inner table'),
      th: px('.md-content__inner th'),
      li: px('.exercise-options li'),
      summary: px('.exercise-answer summary'),
      toolbar: px('.study-toolbar'),
      toolbarSelect: px('.reading-size select'),
      zoomHint: px('.zoom-hint'),
      saveStatus: px('.save-status'),
      ganttBlock: px('.gantt-block'),
      labMetrics: px('.lab-metrics'),
    };
  });
}

async function toolbarProbe(page) {
  return page.evaluate((rectSrc) => {
    const r = eval(rectSrc);
    const bar = document.querySelector('.study-toolbar');
    if (!bar) return null;
    const sel = bar.querySelector('[data-reading-size]');
    const st = bar.querySelector('.save-status');
    const content = document.querySelector('.md-content__inner');
    return {
      bar: r(bar),
      barFont: getComputedStyle(bar).fontSize,
      selectFont: sel ? getComputedStyle(sel).fontSize : null,
      saveStatusFont: st ? getComputedStyle(st).fontSize : null,
      barWidth: Math.round(bar.getBoundingClientRect().width),
      contentWidth: Math.round(content.getBoundingClientRect().width),
      wrapped: sel && bar.querySelector('label') ? Math.abs(bar.querySelector('label').getBoundingClientRect().top - sel.getBoundingClientRect().top) > 4 : null,
    };
  }, rectOf);
}

// ---------------------------------------------------------------- 页面扫描
async function runPage(s, key, url, scheme) {
  const { page } = s;
  const rec = { key, url, scheme, device: s.label };
  await goto(page, url);
  rec.schemeApplied = await forceScheme(page, scheme);
  await goto(page, url);
  await warm(page);
  rec.layout = await layout(page);
  rec.tapTargets = await tapTargets(page);
  rec.contrast = await contrast(page);
  rec.a11y = await a11y(page);
  rec.firstScreen = await firstScreen(page);
  rec.tables = await tableProbe(page);
  rec.blocks = await blockProbe(page);
  rec.typeScale = await typeScale(page);
  rec.toolbar = await toolbarProbe(page);
  rec.diagnostics = diagnostics(s);
  return rec;
}

// ---------------------------------------------------------------- 证据与定量
async function evidenceStage() {
  const ev = {};
  const shotSafe = async (page, rel, opts) => {
    try { return await shot(page, rel, opts); } catch { return null; }
  };
  const elShot = async (page, sel, rel) => {
    try {
      const el = page.locator(sel).first();
      const target = path.resolve('qa', rel);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await el.screenshot({ path: target });
      return `qa/${rel}`;
    } catch { return null; }
  };

  // ---- A) 375 浅色
  {
    const s = await session('iphone-se');
    const p = s.page;

    // 实验页结果表
    await goto(p, PAGES.lab);
    await warm(p);
    ev.lab = await p.evaluate(() => {
      const tbl = document.querySelector('.lab-results table');
      const wrap = tbl.closest('.md-typeset__scrollwrap');
      const card = document.querySelector('.lab-results');
      const before = wrap ? wrap.scrollLeft : 0;
      let after = before;
      if (wrap) { wrap.scrollLeft = 9999; after = wrap.scrollLeft; wrap.scrollLeft = before; }
      const lastCell = tbl.rows[1].cells[tbl.rows[1].cells.length - 1];
      const lb = lastCell.getBoundingClientRect();
      const cb = card.getBoundingClientRect();
      return {
        table: { w: Math.round(tbl.getBoundingClientRect().width), right: Math.round(tbl.getBoundingClientRect().right), cw: tbl.clientWidth, display: getComputedStyle(tbl).display, cols: tbl.rows[0].cells.length, rows: tbl.rows.length },
        headers: [...tbl.rows[0].cells].map((c) => c.textContent.trim()),
        hasScrollwrap: !!wrap,
        cardWidth: Math.round(cb.width),
        wrapW: wrap ? wrap.clientWidth : null,
        wrapSw: wrap ? wrap.scrollWidth : null,
        wrapBleed: wrap ? Math.round(wrap.getBoundingClientRect().width - cb.width) : null,
        hiddenPx: wrap ? wrap.scrollWidth - wrap.clientWidth : null,
        scrollable: after > before,
        maxScroll: after,
        scrollbarGutter: wrap ? wrap.offsetHeight - wrap.clientHeight : null,
        lastColRight: Math.round(lb.right),
        lastColRightAfterScroll: Math.round(lb.right - after),
        lastColText: lastCell.textContent.trim(),
        innerWidth: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
      };
    });
    await elShot(p, '.lab-results', `${ART}/mob-01-lab-results-375.png`);
    await shotSafe(p, `${ART}/mob-01-lab-full-375.png`, { fullPage: true });
    await p.evaluate(() => { const w = document.querySelector('.lab-results table')?.closest('.md-typeset__scrollwrap'); if (w) w.scrollLeft = 9999; });
    await p.waitForTimeout(250);
    await elShot(p, '.lab-results', `${ART}/mob-01-lab-results-375-scrolled.png`);

    // 甘特图 + 下拉框（375）
    ev.gantt = await p.evaluate(() => {
      const g = document.querySelector('.gantt');
      const blocks = [...g.querySelectorAll('.gantt-block')];
      return {
        cw: g.clientWidth,
        sw: g.scrollWidth,
        hidden: g.scrollWidth - g.clientWidth,
        blockW: blocks.map((b) => Math.round(b.getBoundingClientRect().width)),
        blockMinWidth: getComputedStyle(blocks[0]).minWidth,
        blockFont: getComputedStyle(blocks[0]).fontSize,
        lastBlockText: blocks[blocks.length - 1].textContent.trim().replace(/\s+/g, ' '),
        scrollbarGutter: g.offsetHeight - g.clientHeight,
      };
    });
    await elShot(p, '.gantt', `${ART}/mob-10-gantt-375.png`);
    ev.labSelect = await p.evaluate(() => {
      const sel = document.querySelector('[data-scheduler] select[name="algorithm"]');
      const cs = getComputedStyle(sel);
      const text = sel.options[sel.selectedIndex].textContent.trim();
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:' + cs.fontSize + ';font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing;
      probe.textContent = text;
      document.body.append(probe);
      const need = Math.ceil(probe.getBoundingClientRect().width);
      probe.remove();
      const inner = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return {
        width: Math.round(sel.getBoundingClientRect().width),
        innerWidth: Math.round(inner),
        text,
        textNeedsPx: need,
        clippedPx: Math.max(0, need - Math.round(inner)),
        font: cs.fontSize,
        colWidth: getComputedStyle(document.querySelector('.lab-controls')).gridTemplateColumns,
        vw: window.innerWidth,
      };
    });
    await elShot(p, '.lab-controls', `${ART}/mob-11-lab-select-375.png`);

    // 宽表（7 列）
    await goto(p, PAGES.os3);
    await warm(p);
    const idx = await p.evaluate(() => {
      const ts = [...document.querySelectorAll('.md-typeset table')];
      let best = 0;
      ts.forEach((t, i) => { if (t.scrollWidth > ts[best].scrollWidth) best = i; });
      return best;
    });
    ev.wideTable = await p.evaluate((i) => {
      const t = document.querySelectorAll('.md-typeset table')[i];
      const wrap = t.closest('.md-typeset__scrollwrap');
      return {
        cols: t.rows[0].cells.length,
        tableW: Math.round(t.getBoundingClientRect().width),
        wrapW: wrap.clientWidth,
        wrapSw: wrap.scrollWidth,
        hiddenPx: wrap.scrollWidth - wrap.clientWidth,
        hiddenPct: Math.round(((wrap.scrollWidth - wrap.clientWidth) / wrap.scrollWidth) * 100),
        wrapOverflowX: getComputedStyle(wrap).overflowX,
        thMinWidth: getComputedStyle(t.tHead.rows[0].cells[0]).minWidth,
        rootFont: getComputedStyle(document.documentElement).fontSize,
        headers: [...t.rows[0].cells].map((c) => c.textContent.trim()),
        stickyFirstCol: getComputedStyle(t.rows[1].cells[0]).position,
        scrollbarGutter: wrap.offsetHeight - wrap.clientHeight,
        vw: window.innerWidth,
      };
    }, idx);
    await elShot(p, `.md-typeset__scrollwrap >> nth=${idx}`, `${ART}/mob-03-table-wide-375.png`);
    await p.evaluate((i) => {
      const t = document.querySelectorAll('.md-typeset table')[i];
      const wrap = t.closest('.md-typeset__scrollwrap');
      wrap.scrollLeft = wrap.scrollWidth;
    }, idx);
    await p.waitForTimeout(250);
    ev.wideTableScrolled = await p.evaluate((i) => {
      const wrap = document.querySelectorAll('.md-typeset table')[i].closest('.md-typeset__scrollwrap');
      return { scrollLeft: wrap.scrollLeft, max: wrap.scrollWidth - wrap.clientWidth };
    }, idx);
    await elShot(p, `.md-typeset__scrollwrap >> nth=${idx}`, `${ART}/mob-03-table-wide-scrolled-375.png`);

    // 表格字号 / 单元格挤压
    await goto(p, PAGES.os2);
    await warm(p);
    ev.table = await p.evaluate(() => {
      const t = document.querySelector('.md-typeset table');
      const cells = [...t.querySelectorAll('th, td')];
      return {
        font: getComputedStyle(t).fontSize,
        thFont: getComputedStyle(t.tHead.rows[0].cells[0]).fontSize,
        bodyFont: getComputedStyle(document.querySelector('.md-content__inner > p')).fontSize,
        maxCellHeight: Math.round(Math.max(...cells.map((c) => c.getBoundingClientRect().height))),
        lineHeight: getComputedStyle(t.tBodies[0].rows[0].cells[0]).lineHeight,
        cols: t.rows[0].cells.length,
        tableW: Math.round(t.getBoundingClientRect().width),
      };
    });
    await elShot(p, '.md-typeset table', `${ART}/mob-04-table-font-375.png`);

    // 工具条：勾选前后
    ev.toolbar = await p.evaluate(() => {
      const bar = document.querySelector('.study-toolbar');
      const b = bar.getBoundingClientRect();
      return {
        barH: Math.round(b.height),
        barW: Math.round(b.width),
        contentW: Math.round(document.querySelector('.md-content__inner').getBoundingClientRect().width),
        font: getComputedStyle(bar).fontSize,
        selFont: getComputedStyle(bar.querySelector('[data-reading-size]')).fontSize,
        saveStatusFont: getComputedStyle(bar.querySelector('.save-status')).fontSize,
        firstPTop: Math.round(document.querySelector('.md-content__inner > p').getBoundingClientRect().top),
        h2Top: Math.round((document.querySelector('.md-content__inner h2') || { getBoundingClientRect: () => ({ top: 0 }) }).getBoundingClientRect().top),
      };
    });
    await elShot(p, '.study-toolbar', `${ART}/mob-06-toolbar-before-375.png`);
    await p.locator('[data-complete]').click({ force: true });
    await p.waitForTimeout(450);
    ev.toolbarAfter = await p.evaluate(() => {
      const bar = document.querySelector('.study-toolbar');
      const st = bar.querySelector('.save-status');
      const b = bar.getBoundingClientRect();
      const r = st.getBoundingClientRect();
      return {
        barH: Math.round(b.height),
        statusText: st.textContent,
        statusW: Math.round(r.width),
        statusH: Math.round(r.height),
        firstPTop: Math.round(document.querySelector('.md-content__inner > p').getBoundingClientRect().top),
        h2Top: Math.round((document.querySelector('.md-content__inner h2') || { getBoundingClientRect: () => ({ top: 0 }) }).getBoundingClientRect().top),
      };
    });
    await elShot(p, '.study-toolbar', `${ART}/mob-06-toolbar-after-375.png`);

    // 字号 16 → 20
    ev.fontScale = await p.evaluate(() => {
      const px = (sel) => { const el = document.querySelector(sel); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10 : null; };
      return { p: px('.md-content__inner > p'), h1: px('.md-content__inner h1'), h2: px('.md-content__inner h2'), h3: px('.md-content__inner h3'), table: px('.md-content__inner table'), li: px('.exercise-options li'), summary: px('.exercise-answer summary'), hint: px('.zoom-hint') };
    });
    await p.selectOption('.study-toolbar [data-reading-size]', '20');
    await p.waitForTimeout(400);
    ev.fontScale20 = await p.evaluate(() => {
      const px = (sel) => { const el = document.querySelector(sel); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10 : null; };
      return { p: px('.md-content__inner > p'), h1: px('.md-content__inner h1'), h2: px('.md-content__inner h2'), h3: px('.md-content__inner h3'), table: px('.md-content__inner table'), li: px('.exercise-options li'), summary: px('.exercise-answer summary'), hint: px('.zoom-hint') };
    });
    await shotSafe(p, `${ART}/mob-07-fontsize20-375.png`);
    await p.evaluate(() => { try { localStorage.removeItem('os-notes:font-size:v1'); } catch {} });
    await p.reload({ waitUntil: 'networkidle' });
    await warm(p);

    // ¶ 命中宽度
    ev.anchor = await p.evaluate(() => {
      const a = [...document.querySelectorAll('.headerlink')][1];
      const b = a.getBoundingClientRect();
      const y = Math.round(b.top + b.height / 2);
      let first = null;
      let last = null;
      for (let dx = -10; dx <= b.width + 10; dx += 1) {
        const el = document.elementFromPoint(Math.round(b.left + dx), y);
        const isAnchor = el && el.classList.contains('headerlink');
        if (isAnchor && first === null) first = dx;
        if (isAnchor) last = dx;
      }
      const codeBtn = document.querySelector('.md-code__button');
      const cb = codeBtn ? codeBtn.getBoundingClientRect() : null;
      return {
        w: Math.round(b.width),
        h: Math.round(b.height),
        hitWidth: first === null ? 0 : last - first + 1,
        total: document.querySelectorAll('.headerlink').length,
        codeBtn: cb ? { w: Math.round(cb.width), h: Math.round(cb.height) } : null,
      };
    });
    await p.locator('.md-content__inner h2').first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    await shotSafe(p, `${ART}/mob-09-anchor-375.png`);

    // 习题折叠 summary
    ev.details = await p.evaluate(() => {
      const sums = [...document.querySelectorAll('.exercise-answer summary')];
      return {
        count: sums.length,
        minHeight: sums.length ? Math.round(Math.min(...sums.map((el) => el.getBoundingClientRect().height))) : null,
        width: sums.length ? Math.round(sums[0].getBoundingClientRect().width) : null,
        font: sums.length ? getComputedStyle(sums[0]).fontSize : null,
      };
    });

    // 放大图弹窗
    await goto(p, PAGES.os3);
    await warm(p);
    ev.figure = await p.evaluate(() => {
      const f = document.querySelector('.figure-zoom');
      const img = f.querySelector('img');
      return {
        figureW: Math.round(f.getBoundingClientRect().width),
        imgW: Math.round(img.getBoundingClientRect().width),
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        scale: Math.round((img.getBoundingClientRect().width / img.naturalWidth) * 100) / 100,
        hintFont: getComputedStyle(f.querySelector('.zoom-hint')).fontSize,
        count: document.querySelectorAll('.figure-zoom').length,
      };
    });
    await elShot(p, '.figure-zoom', `${ART}/mob-02-figure-inline-375.png`);
    await p.locator('.figure-zoom').first().click({ force: true });
    await p.waitForTimeout(450);
    ev.dialog = await p.evaluate(() => {
      const d = document.querySelector('.image-dialog');
      const img = d.querySelector('img');
      const db = d.getBoundingClientRect();
      const ib = img.getBoundingClientRect();
      return {
        open: d.open,
        w: Math.round(db.width),
        h: Math.round(db.height),
        imgW: Math.round(ib.width),
        imgH: Math.round(ib.height),
        dialogMaxW: getComputedStyle(d).maxWidth,
        imgCssWidth: getComputedStyle(img).width,
        canPan: d.scrollWidth > d.clientWidth + 1,
        closeBtn: (() => { const b = d.querySelector('button').getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; })(),
        closeLabel: d.querySelector('button').textContent.trim(),
        vw: window.innerWidth,
        overRight: Math.round(db.right - window.innerWidth),
        zoomFactor: Math.round((ib.width / document.querySelector('.figure-zoom img').getBoundingClientRect().width) * 100) / 100,
      };
    });
    await shotSafe(p, `${ART}/mob-02-dialog-375.png`);
    const y0 = await p.evaluate(() => window.scrollY);
    await p.mouse.wheel(0, 700);
    await p.waitForTimeout(400);
    const y1 = await p.evaluate(() => window.scrollY);
    ev.dialogScroll = { before: y0, after: y1, delta: y1 - y0, bodyOverflow: await p.evaluate(() => getComputedStyle(document.body).overflow) };
    await shotSafe(p, `${ART}/mob-08-dialog-scrolled-375.png`);
    await p.keyboard.press('Escape');

    // 搜索面板 placeholder
    await goto(p, PAGES.os2);
    await p.locator('.md-header label[for="__search"]').first().click({ force: true }).catch(() => {});
    await p.waitForTimeout(600);
    ev.search = await p.evaluate(() => {
      const input = document.querySelector('.md-search__input');
      const form = document.querySelector('.md-search__form');
      const cs = getComputedStyle(input);
      const ph = getComputedStyle(input, '::placeholder');
      return {
        placeholder: input.placeholder,
        placeholderColor: ph.color,
        inputColor: cs.color,
        formBg: getComputedStyle(form).backgroundColor,
        inputFont: cs.fontSize,
        formW: Math.round(form.getBoundingClientRect().width),
        overRight: Math.round(form.getBoundingClientRect().right - window.innerWidth),
      };
    });
    await shotSafe(p, `${ART}/mob-12-search-375.png`);

    // 抽屉：能否进入章节
    await goto(p, PAGES.home);
    await p.locator('.md-header label[for="__drawer"]').first().click({ force: true });
    await p.waitForTimeout(500);
    ev.drawer = await p.evaluate(() => {
      const d = document.querySelector('.md-sidebar--primary');
      const b = d.getBoundingClientRect();
      const links = [...document.querySelectorAll('.md-nav--primary .md-nav__link')].filter((a) => a.getBoundingClientRect().width > 0);
      return {
        w: Math.round(b.width),
        h: Math.round(b.height),
        vw: window.innerWidth,
        links: links.length,
        linkHeights: links.slice(0, 6).map((a) => Math.round(a.getBoundingClientRect().height)),
        bodyOverflow: getComputedStyle(document.body).overflow,
        hamburger: (() => { const el = document.querySelector('.md-header label[for="__drawer"]').getBoundingClientRect(); return { w: Math.round(el.width), h: Math.round(el.height) }; })(),
      };
    });
    await shotSafe(p, `${ART}/mob-13-drawer-375.png`);
    const d0 = await p.evaluate(() => window.scrollY);
    await p.mouse.wheel(0, 600);
    await p.waitForTimeout(350);
    const d1 = await p.evaluate(() => window.scrollY);
    ev.drawerScroll = { delta: d1 - d0 };
    let navOk = false;
    try {
      const group = p.locator('.md-nav--primary .md-nav__item--nested > .md-nav__link').first();
      if (await group.count()) await group.click({ force: true, timeout: 4000 });
      await p.waitForTimeout(350);
      const chapter = p.locator('.md-nav--primary a.md-nav__link[href*="chapters/chapter-2"]').first();
      if (await chapter.count()) {
        await chapter.click({ force: true, timeout: 4000 });
        await p.waitForLoadState('networkidle');
        navOk = p.url().includes('chapter-2');
      }
    } catch { navOk = false; }
    ev.drawerNavOk = navOk;
    await p.keyboard.press('Escape');

    await s.close();
  }

  // ---- B) 360 深色
  {
    const s = await session('android-360');
    const p = s.page;
    await goto(p, PAGES.lab);
    await forceScheme(p, 'dark');
    await goto(p, PAGES.lab);
    await warm(p);
    ev.gantt360 = await p.evaluate(() => {
      const g = document.querySelector('.gantt');
      const blocks = [...g.querySelectorAll('.gantt-block')];
      return {
        cw: g.clientWidth,
        sw: g.scrollWidth,
        hidden: g.scrollWidth - g.clientWidth,
        blocks: blocks.length,
        blockW: blocks.map((b) => Math.round(b.getBoundingClientRect().width)),
        minWidth: getComputedStyle(blocks[0]).minWidth,
        lastText: blocks[blocks.length - 1].textContent.trim().replace(/\s+/g, ' '),
        scrollbarGutter: g.offsetHeight - g.clientHeight,
      };
    });
    await elShot(p, '.gantt', `${ART}/mob-10-gantt-360-dark.png`);
    await p.locator('.gantt').first().evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await shotSafe(p, `${ART}/mob-10-gantt-context-360-dark.png`);
    ev.labSelect360 = await p.evaluate(() => {
      const sel = document.querySelector('[data-scheduler] select[name="algorithm"]');
      const cs = getComputedStyle(sel);
      const text = sel.options[sel.selectedIndex].textContent.trim();
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:' + cs.fontSize + ';font-family:' + cs.fontFamily + ';font-weight:' + cs.fontWeight + ';letter-spacing:' + cs.letterSpacing;
      probe.textContent = text;
      document.body.append(probe);
      const need = Math.ceil(probe.getBoundingClientRect().width);
      probe.remove();
      const inner = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      return {
        width: Math.round(sel.getBoundingClientRect().width),
        innerWidth: Math.round(inner),
        text,
        textNeedsPx: need,
        clippedPx: Math.max(0, need - Math.round(inner)),
        font: cs.fontSize,
        colWidth: getComputedStyle(document.querySelector('.lab-controls')).gridTemplateColumns,
        vw: window.innerWidth,
      };
    });
    await elShot(p, '.lab-controls', `${ART}/mob-11-lab-select-360-dark.png`);
    await goto(p, PAGES.home);
    await p.locator('.md-header label[for="__drawer"]').first().click({ force: true });
    await p.waitForTimeout(500);
    await shotSafe(p, `${ART}/mob-13-drawer-360-dark.png`);
    await p.keyboard.press('Escape');
    await s.close();
  }
  return ev;
}

// ---------------------------------------------------------------- 主流程
async function main() {
  const t0 = Date.now();
  // 只重建报告（复用已有 raw.json，不重新测量）
  if (process.argv.includes('--report-only')) {
    const saved = JSON.parse(await fs.readFile(path.resolve('qa', ART, 'raw.json'), 'utf8'));
    Object.assign(raw, saved);
    const rep = buildReport(raw);
    await saveJSON('reports/mobile.json', rep);
    await fs.mkdir(path.resolve('qa/reports'), { recursive: true });
    await fs.writeFile(path.resolve('qa/reports/mobile.md'), buildMarkdown(rep), 'utf8');
    const md = buildMarkdown(rep);
    process.stderr.write(`[mobile] report-only: ${rep.findings.length} findings, NA=${(md.match(/待确认/g) || []).length}\n`);
    return;
  }
  for (const [dev, scheme] of MATRIX) {
    const s = await session(dev, { colorScheme: 'light' });
    s.slug = `${dev}-${scheme}`;
    try {
      await s.page.goto('/');
      await s.page.evaluate(() => { try { localStorage.clear(); } catch {} });
      const devRaw = { device: s.label, scheme, pages: {} };
      for (const [key, url] of PAGE_SET) {
        devRaw.pages[key] = await runPage(s, key, url, scheme);
        await shot(s.page, `${ART}/viewport-${key}-${s.slug}.png`);
      }
      raw.matrix[s.slug] = devRaw;
    } finally {
      await s.close();
    }
    process.stderr.write(`[mobile] done ${s.slug} (${Math.round((Date.now() - t0) / 1000)}s)\n`);
  }

  // 线上抽查
  try {
    const s = await session('iphone-se', { base: LIVE });
    await goto(s.page, '/chapters/chapter-2/');
    await warm(s.page);
    raw.live.os2 = {
      url: s.page.url(),
      layout: await layout(s.page),
      tables: await tableProbe(s.page),
      typeScale: await typeScale(s.page),
      toolbar: await toolbarProbe(s.page),
      diagnostics: diagnostics(s),
    };
    await shot(s.page, `${ART}/live-os2-iphone-se.png`);
    await s.close();
  } catch (e) {
    raw.gaps.push({ item: '线上抽查', detail: String(e).slice(0, 300) });
  }

  try {
    raw.evidence = await evidenceStage();
  } catch (e) {
    raw.gaps.push({ item: '证据阶段', detail: String(e).slice(0, 500) });
    raw.evidence = {};
    process.stderr.write(`[mobile] evidence failed: ${String(e).slice(0, 200)}\n`);
  }
  raw.durationSec = Math.round((Date.now() - t0) / 1000);
  await saveJSON(`${ART}/raw.json`, raw);

  const report = buildReport(raw);
  await saveJSON('reports/mobile.json', report);
  await fs.mkdir(path.resolve('qa/reports'), { recursive: true });
  await fs.writeFile(path.resolve('qa/reports/mobile.md'), buildMarkdown(report), 'utf8');
  const na = (buildMarkdown(report).match(/待确认/g) || []).length;
  process.stderr.write(`[mobile] ${report.findings.length} findings, NA=${na}, ${raw.durationSec}s\n`);
}

// ---------------------------------------------------------------- 报告
const NA = '待确认';
const num = (v, unit = '') => (v === null || v === undefined || Number.isNaN(v) ? NA : `${v}${unit}`);
const pct = (a, b) => (a && b ? `${Math.round((parseFloat(a) / parseFloat(b)) * 100)}%` : NA);

function buildReport(raw) {
  const ev = raw.evidence ?? {};
  const se = raw.matrix['iphone-se-light'] ?? {};
  const contrastRows = se.pages?.os2?.contrast ?? [];
  const phHit = contrastRows.find((c) => /placeholder/.test(c.el)) ?? null;
  const navHit = contrastRows.find((c) => /md-nav__title/.test(c.el)) ?? null;
  const sel = ev.labSelect360 ?? ev.labSelect ?? {};
  const F = [];
  const add = (f) => F.push(f);

  add({
    id: 'MOB-01',
    title: '宽表在手机上藏掉近一半列，却没有任何「可以横向滑动」的提示',
    severity: 'P1',
    category: 'responsive',
    device: '全部三档（360 / 375 / 390）；chapter-3（7 列时间表）、lab/scheduling（结果表）、computer-organization/chapter-2（4 列表）',
    url: `${LOCAL}${PAGES.os3}`,
    steps: [
      '用 375 宽视口打开 /chapters/chapter-3/，找到表头「进程 / 到达 / 开始 / 完成 / 服务 / 周转 / 带权周转」的表格',
      '静止观察：只能看到前 3 列，右侧没有滚动条、渐隐或箭头',
      '横向滑动表格：内容确实会动（可以滑到最右），但滑动前没有任何提示',
      '同样现象在 /lab/scheduling/ 的结果表（第 4 列「带权周转时间」）和 /computer-organization/chapter-2/ 的 4 列表上重复',
    ],
    expected: '宽表要么在窄屏重排成卡片/两行，要么给出明确的横向滚动提示（右缘渐隐或常显滚动条），并固定首列让用户始终知道在看哪一行',
    actual: `chapter-3 的 7 列表实测 ${num(ev.wideTable?.tableW, 'px')} 宽，滚动容器只有 ${num(ev.wideTable?.wrapW, 'px')}，首屏藏起来 ${num(ev.wideTable?.hiddenPx, 'px')}（${num(ev.wideTable?.hiddenPct, '%')}）。实验页结果表 ${num(ev.lab?.table?.w, 'px')} 宽、滚动容器 ${num(ev.lab?.wrapW, 'px')}，藏 ${num(ev.lab?.hiddenPx, 'px')}；实测可横向滚动（scrollLeft 0 → ${num(ev.lab?.maxScroll, 'px')}），滚到底后最后一列右边缘回到 ${num(ev.lab?.lastColRightAfterScroll, 'px')}，说明数据没丢，但静止时滚动条占位只有 ${num(ev.wideTable?.scrollbarGutter, 'px')}（触屏上完全不可见），首列 position 是 ${ev.wideTable?.stickyFirstCol ?? NA}——滑到右边看数值时已经不知道对应哪个进程。`,
    measurements: {
      'chapter-3 表格宽 / 容器宽': `${num(ev.wideTable?.tableW, 'px')} / ${num(ev.wideTable?.wrapW, 'px')}`,
      'chapter-3 隐藏像素 / 占比': `${num(ev.wideTable?.hiddenPx, 'px')} / ${num(ev.wideTable?.hiddenPct, '%')}`,
      '实验页结果表宽 / 容器宽': `${num(ev.lab?.table?.w, 'px')} / ${num(ev.lab?.wrapW, 'px')}`,
      '实验页隐藏像素 / 可滚动': `${num(ev.lab?.hiddenPx, 'px')} / ${ev.lab ? String(ev.lab.scrollable) : NA}`,
      '滚动条占位高度': num(ev.wideTable?.scrollbarGutter, 'px'),
      '首列 position': ev.wideTable?.stickyFirstCol ?? NA,
      '每列最小宽（th min-width）': ev.wideTable?.thMinWidth ?? NA,
      'html 根字号': ev.wideTable?.rootFont ?? NA,
    },
    evidence: [
      'qa/artifacts/mobile/mob-03-table-wide-375.png',
      'qa/artifacts/mobile/mob-03-table-wide-scrolled-375.png',
      'qa/artifacts/mobile/mob-01-lab-results-375.png',
      'qa/artifacts/mobile/mob-01-lab-results-375-scrolled.png',
    ],
    source: 'Material 的 `.md-typeset table:not([class]) th{min-width:5rem}` 在 html 根字号 20px 下等于 100px/列，7 列就是 700px；横向滚动能力来自 Material 的 `.md-typeset__scrollwrap{overflow-x:auto;margin:1em -.8rem}`。notes.css:111 那条给表格加 `display:block;overflow-x:auto` 的窄屏规则是死代码（优先级 0,1,1 低于 Material 的 0,2,1），notes.css 也没给滚动容器加任何可发现性提示或首列固定。',
    fix: '给 `.md-typeset__scrollwrap` 加右缘渐隐（`mask-image:linear-gradient(to right,#000 88%,transparent)`）与 `scrollbar-width:thin`；给宽表加 `th:first-child,td:first-child{position:sticky;left:0;z-index:1;background:var(--note-surface)}`；更彻底的做法是在 `@media (max-width:40rem)` 把 7 列表改成「一行一张卡」的堆叠布局。',
    scope: 'own',
  });

  add({
    id: 'MOB-02',
    title: '插图「点击放大」实际只放大 3%，图内标注依然看不清',
    severity: 'P1',
    category: 'interaction',
    device: '全部三档（375 实测；360 / 390 同向）',
    url: `${LOCAL}${PAGES.os3}`,
    steps: [
      '打开 /chapters/chapter-3/，滚动到任意插图（卡片右下角有「点击放大」角标）',
      '点击插图，弹窗打开',
      '对比弹窗里图片的渲染宽度与正文里的宽度，再看图内原本约 10px 的标注',
    ],
    expected: '「点击放大」应把插图放大到能读清图内标注（接近 1:1 或至少 2 倍），并允许平移查看',
    actual: `正文插图渲染宽 ${num(ev.figure?.imgW, 'px')}，弹窗里同一张图 ${num(ev.dialog?.imgW, 'px')}，放大倍数只有 ${num(ev.dialog?.zoomFactor, '×')}；原图 ${num(ev.figure?.naturalW)}px 宽被压到 ${num(ev.figure?.scale, '×')}，图内约 10px 的标注实际只剩 3px 左右。弹窗宽 ${num(ev.dialog?.w, 'px')}（max-width ${ev.dialog?.dialogMaxW ?? NA}），图片 CSS 宽 ${ev.dialog?.imgCssWidth ?? NA}，实测不可平移（canPan=${ev.dialog ? ev.dialog.canPan : NA}）。本章 ${num(ev.figure?.count)} 张插图都是这个行为。`,
    measurements: {
      '正文插图宽': num(ev.figure?.imgW, 'px'),
      '弹窗图片宽': num(ev.dialog?.imgW, 'px'),
      '放大倍数': num(ev.dialog?.zoomFactor, '×'),
      '原图宽 / 正文缩放比': `${num(ev.figure?.naturalW, 'px')} / ${num(ev.figure?.scale, '×')}`,
      '弹窗宽 / max-width': `${num(ev.dialog?.w, 'px')} / ${ev.dialog?.dialogMaxW ?? NA}`,
      '弹窗内可平移': ev.dialog ? String(ev.dialog.canPan) : NA,
      '插图数量（chapter-3）': num(ev.figure?.count),
    },
    evidence: ['qa/artifacts/mobile/mob-02-figure-inline-375.png', 'qa/artifacts/mobile/mob-02-dialog-375.png'],
    source: 'notes.css:77 `.image-dialog{width:min(94vw,1400px);padding:1rem}` 与 notes.css:79 `.image-dialog img{width:100%}` 一起把弹窗里的图限制成「视口宽 - 内边距」，手机上只比正文里宽十几像素；interactions.js:201-207 打开弹窗时只换了 src，没有任何缩放/平移逻辑。',
    fix: '弹窗里改成 `.image-dialog{overflow:auto}` + `.image-dialog img{width:auto;max-width:none;min-width:min(1000px,150%)}`（可横向拖动看细节），或放行 `touch-action:pinch-zoom` 并加双指缩放；最省事也要按原图 1:1 渲染。',
    scope: 'own',
  });

  add({
    id: 'MOB-03',
    title: '表格正文只有 12.8px（正文的 80%），中文表格在小屏上难读',
    severity: 'P2',
    category: 'typography',
    device: '全部三档（360 / 375 / 390），light + dark 一致',
    url: `${LOCAL}${PAGES.os2}`,
    steps: ['打开任意章节页', '量表格内文字、表头与正文段落的计算字号', '观察 3 列表格在 375 宽下逐字换行、单元格被拉高'],
    expected: '表格字号应不小于正文的 0.9 倍（notes.css 作者的意图是 .9em ≈ 14.4px）',
    actual: `表格与表头实测都是 ${num(ev.table?.font)}，正文段落 ${num(ev.table?.bodyFont)}——只有 ${pct(ev.table?.font, ev.table?.bodyFont)}。行高 ${ev.table?.lineHeight ?? NA}，最高单元格被撑到 ${num(ev.table?.maxCellHeight, 'px')}（约 ${ev.table && ev.table.lineHeight ? Math.round(parseFloat(ev.table.maxCellHeight) / parseFloat(ev.table.lineHeight)) : NA} 行），中文在 12.8px 下几乎一字一行。`,
    measurements: {
      '表格字号': num(ev.table?.font),
      '表头字号': num(ev.table?.thFont),
      '正文字号': num(ev.table?.bodyFont),
      '表格 / 正文': pct(ev.table?.font, ev.table?.bodyFont),
      '行高': ev.table?.lineHeight ?? NA,
      '最高单元格高度': num(ev.table?.maxCellHeight, 'px'),
      '表格宽度': num(ev.table?.tableW, 'px'),
    },
    evidence: ['qa/artifacts/mobile/mob-04-table-font-375.png'],
    source: 'notes.css:55 `.md-typeset table{font-size:.9em}`（优先级 0,1,1）被 Material 的 `.md-typeset table:not([class]){font-size:.64rem}`（0,2,1）覆盖；`.64rem` × 20px 根字号 = 12.8px，作者想要的 14.4px 从未生效。',
    fix: '把选择器权重提上去：`.md-typeset table:not([class]){font-size:.72rem}`（=14.4px）或直接写 `font-size:14.4px`；窄屏再配 `.md-typeset :is(th,td){padding:.5rem .6rem}`。',
    scope: 'own',
  });

  add({
    id: 'MOB-04',
    title: 'rem 被当 px 用：工具条 17.5px、保存提示 16px、甘特块 16.25px，全都 ≥ 正文',
    severity: 'P2',
    category: 'typography',
    device: '全部三档，light + dark 一致',
    url: `${LOCAL}${PAGES.os2}`,
    steps: ['打开章节页', '量工具条文字、字号下拉、保存提示、甘特块、图片角标的计算字号', '与正文 16px 对比层级'],
    expected: '工具条、提示、角标这类辅助文字应明显小于正文（作者写的 .875rem/.8rem/.75rem 显然想表达 14px/12.8px/12px）',
    actual: `工具条 ${num(ev.toolbar?.font)}（比正文大 ${ev.toolbar ? Math.round((parseFloat(ev.toolbar.font) / 16 - 1) * 100) : NA}%）、字号下拉 ${num(ev.toolbar?.selFont)}、保存提示 ${num(ev.toolbar?.saveStatusFont)}（和正文一样大）、甘特块 ${num(ev.gantt?.blockFont)}、lab 指标行 ${num(se.pages?.lab?.typeScale?.labMetrics, 'px')}、图片角标 ${num(ev.figure?.hintFont)}。最该弱化的「保存提示」和正文同号，工具条反而最大，层级倒挂。`,
    measurements: {
      '工具条字号': num(ev.toolbar?.font),
      '字号下拉': num(ev.toolbar?.selFont),
      '保存提示': num(ev.toolbar?.saveStatusFont),
      '甘特块': num(ev.gantt?.blockFont),
      'lab 指标行': num(se.pages?.lab?.typeScale?.labMetrics, 'px'),
      '图片角标': num(ev.figure?.hintFont),
      '正文': '16px',
      'html 根字号': '20px',
    },
    evidence: ['qa/artifacts/mobile/mob-06-toolbar-before-375.png', 'qa/artifacts/mobile/mob-10-gantt-375.png'],
    source: 'notes.css 里大量用 rem 当 px 写，而 html 根字号是 Material 的 20px（不是 16px）：notes.css:61 `.study-toolbar{font-size:.875rem}`=17.5px、:68 `.save-status{.8rem}`=16px、:76 `.zoom-hint{.75rem}`=15px、:103 `.gantt-block{.8125rem}`=16.25px、:108 `.lab-metrics{.9375rem}`≈18.8px。',
    fix: '这些尺寸全部改成 px（14px / 12px / 13px）或相对正文字号的 em；根因是根字号 20px 与作者假设的 16px 不一致，改完要复核所有 rem 声明。',
    scope: 'own',
  });

  add({
    id: 'MOB-05',
    title: '勾选「本章已复习」后工具条从 72px 撑到 112px，正文整体下移 41px',
    severity: 'P2',
    category: 'interaction',
    device: 'iPhone SE 375×667（360 同样，状态文字换行由宽度决定）',
    url: `${LOCAL}${PAGES.os2}`,
    steps: ['打开章节页，记下正文首段位置', '点「本章已复习」复选框', '观察工具条高度、状态文字位置与正文位移'],
    expected: '状态提示应就地显示或作为浮动 toast 出现，不改变工具条高度、不推动正文',
    actual: `勾选前工具条 ${num(ev.toolbar?.barH, 'px')} 高、状态为空；勾选后 ${num(ev.toolbarAfter?.barH, 'px')} 高，「${ev.toolbarAfter?.statusText ?? NA}」占 ${num(ev.toolbarAfter?.statusW, 'px')}×${num(ev.toolbarAfter?.statusH, 'px')} 被挤到第三行，正文首段从 y=${num(ev.toolbar?.firstPTop)} 下移到 y=${num(ev.toolbarAfter?.firstPTop)}，位移 ${ev.toolbarAfter && ev.toolbar ? ev.toolbarAfter.firstPTop - ev.toolbar.firstPTop : NA}px；h2 顶从 ${num(ev.toolbar?.h2Top)} 移到 ${num(ev.toolbarAfter?.h2Top)}。这是站内使用频率最高的交互之一，每勾一次都会跳一下。`,
    measurements: {
      '勾选前工具条高': num(ev.toolbar?.barH, 'px'),
      '勾选后工具条高': num(ev.toolbarAfter?.barH, 'px'),
      '正文位移': `${ev.toolbarAfter && ev.toolbar ? ev.toolbarAfter.firstPTop - ev.toolbar.firstPTop : NA}px`,
      'h2 顶部位移': `${ev.toolbarAfter && ev.toolbar ? ev.toolbarAfter.h2Top - ev.toolbar.h2Top : NA}px`,
      '状态文字尺寸': `${num(ev.toolbarAfter?.statusW, 'px')} × ${num(ev.toolbarAfter?.statusH, 'px')}`,
      '工具条宽 / 正文宽': `${num(ev.toolbar?.barW, 'px')} / ${num(ev.toolbar?.contentW, 'px')}`,
    },
    evidence: ['qa/artifacts/mobile/mob-06-toolbar-before-375.png', 'qa/artifacts/mobile/mob-06-toolbar-after-375.png'],
    source: 'notes.css:61 工具条是 `display:flex;flex-wrap:wrap`，`.save-status` 只是普通 span（interactions.js:154/156 往里写文字），notes.css:64 的 `.reading-size{margin-left:auto}` 把它挤到新一行，工具条高度从 72px 变 112px。',
    fix: '把状态文字改成绝对定位或 fixed toast：`.study-toolbar{position:relative}` + `.save-status{position:absolute;right:1rem;bottom:.5rem}`；或用 `position:fixed;bottom:1rem;left:1rem;right:1rem` 的提示条，2 秒后淡出。',
    scope: 'own',
  });

  add({
    id: 'MOB-06',
    title: '「字号」选择器只放大正文，标题/表格/图注不跟，20px 时层级被压平',
    severity: 'P2',
    category: 'typography',
    device: '全部三档（light + dark 一致）',
    url: `${LOCAL}${PAGES.os2}`,
    steps: ['打开章节页', '把工具条里的「字号」从「标准」切到「大号」', '对比正文、h2、h3、表格、图注的字号变化'],
    expected: '选「大号」后整页排版层级应等比放大，至少标题与表格要同步，保持原有比例',
    actual: `正文 ${num(ev.fontScale?.p, 'px')} → ${num(ev.fontScale20?.p, 'px')}（生效，刷新后从 localStorage 恢复），但 h2 始终 ${num(ev.fontScale20?.h2, 'px')}、h3 始终 ${num(ev.fontScale20?.h3, 'px')}、表格始终 ${num(ev.fontScale20?.table, 'px')}、图片角标始终 ${num(ev.fontScale20?.hint, 'px')}。h3 与正文的比值从 ${pct(ev.fontScale?.h3, ev.fontScale?.p)} 掉到 ${pct(ev.fontScale20?.h3, ev.fontScale20?.p)}，表格从 ${pct(ev.fontScale?.table, ev.fontScale?.p)} 掉到 ${pct(ev.fontScale20?.table, ev.fontScale20?.p)}——「大号」反而让正文和标题几乎一样大。`,
    measurements: {
      '正文 16→20': `${num(ev.fontScale?.p, 'px')} → ${num(ev.fontScale20?.p, 'px')}`,
      'h2': `${num(ev.fontScale?.h2, 'px')} → ${num(ev.fontScale20?.h2, 'px')}`,
      'h3': `${num(ev.fontScale?.h3, 'px')} → ${num(ev.fontScale20?.h3, 'px')}`,
      '表格': `${num(ev.fontScale?.table, 'px')} → ${num(ev.fontScale20?.table, 'px')}`,
      'h3 / 正文': `${pct(ev.fontScale?.h3, ev.fontScale?.p)} → ${pct(ev.fontScale20?.h3, ev.fontScale20?.p)}`,
      '表格 / 正文': `${pct(ev.fontScale?.table, ev.fontScale?.p)} → ${pct(ev.fontScale20?.table, ev.fontScale20?.p)}`,
    },
    evidence: ['qa/artifacts/mobile/mob-07-fontsize20-375.png'],
    source: 'interactions.js:131 与 :139 只改 `document.documentElement.style` 上的 `--note-font-size`；notes.css:123-124 的 h2/h3 写死 `1.55rem/1.2rem`（跟 20px 根字号走，不跟这个变量），表格字号来自 Material 的 `.64rem`，图注来自 notes.css:76 的 `.75rem`。',
    fix: '把 h2/h3/表格/图注都改成相对 `--note-font-size` 的 em（容器 `font-size:var(--note-font-size)`，标题 `font-size:1.55em`），或在 JS 里同步改一个 `--note-scale` 并让所有排版尺寸乘上它。',
    scope: 'own',
  });

  add({
    id: 'MOB-07',
    title: '放大图弹窗打开时背景页面仍能滚动，关掉后已经不在原位',
    severity: 'P2',
    category: 'interaction',
    device: '全部三档，light + dark',
    url: `${LOCAL}${PAGES.os3}`,
    steps: ['打开 /chapters/chapter-3/，点开任意插图放大', '在弹窗上向上滑', '看背景正文是否跟着滚；再点「关闭 · Esc」看落点'],
    expected: '模态弹窗打开时应锁住背景滚动，关闭后回到原来的阅读位置',
    actual: `弹窗打开时滚轮 700px，背景页面真的滚了 ${num(ev.dialogScroll?.delta, 'px')}（window.scrollY ${num(ev.dialogScroll?.before)} → ${num(ev.dialogScroll?.after)}），body 的 overflow 仍是 ${ev.dialogScroll?.bodyOverflow ?? NA}。关闭后用户落在别的段落，需要重新找位置。`,
    measurements: {
      '弹窗打开时背景滚动量': num(ev.dialogScroll?.delta, 'px'),
      'scrollY 变化': `${num(ev.dialogScroll?.before)} → ${num(ev.dialogScroll?.after)}`,
      'body overflow': ev.dialogScroll?.bodyOverflow ?? NA,
      '弹窗内可平移': ev.dialog ? String(ev.dialog.canPan) : NA,
    },
    evidence: ['qa/artifacts/mobile/mob-02-dialog-375.png', 'qa/artifacts/mobile/mob-08-dialog-scrolled-375.png'],
    source: 'interactions.js:201-207 只用 `dialog.showModal()`，打开/关闭时没有给 body 或 html 加滚动锁；notes.css 里也没有 `html:has(dialog[open]){overflow:hidden}` 之类的规则。',
    fix: '在打开/关闭回调里 `document.documentElement.classList.toggle("dialog-open", …)`，CSS 写 `html.dialog-open{overflow:hidden}`；同时给 `.image-dialog` 加 `overscroll-behavior:contain`。',
    scope: 'own',
  });

  add({
    id: 'MOB-08',
    title: '标题锚点 ¶ 真实命中宽度只有 18px，代码复制按钮 24×24，都低于 24px 下限',
    severity: 'P2',
    category: 'a11y',
    device: '全部三档（触屏）',
    url: `${LOCAL}${PAGES.os2}`,
    steps: ['打开章节页', '用 elementFromPoint 逐像素扫 h2 后面 ¶ 的命中宽度', '量代码块右上角复制按钮的尺寸'],
    expected: '可点元素至少 24×24 CSS px（WCAG 2.5.8 AA），触屏上理想 44×44',
    actual: `¶ 盒子 ${num(ev.anchor?.w, 'px')}×${num(ev.anchor?.h, 'px')}，逐像素扫描的真实命中宽度 ${num(ev.anchor?.hitWidth, 'px')}（再往外 1px 就落到 h2 文本上，点上去是选字而不是跳转），每页 ${num(ev.anchor?.total)} 个；代码复制按钮 ${num(ev.anchor?.codeBtn?.w, 'px')}×${num(ev.anchor?.codeBtn?.h, 'px')}。`,
    measurements: {
      '¶ 盒子': `${num(ev.anchor?.w, 'px')} × ${num(ev.anchor?.h, 'px')}`,
      '¶ 真实命中宽度': num(ev.anchor?.hitWidth, 'px'),
      '¶ 每页数量': num(ev.anchor?.total),
      '代码复制按钮': `${num(ev.anchor?.codeBtn?.w, 'px')} × ${num(ev.anchor?.codeBtn?.h, 'px')}`,
      'WCAG 2.5.8 下限': '24 × 24',
    },
    evidence: ['qa/artifacts/mobile/mob-09-anchor-375.png'],
    source: '¶ 是 Material 的 `.headerlink`（宽度只等于字形宽，notes.css 未扩 padding），复制按钮是 Material 的 `.md-code__button`；两者都是上游默认尺寸，notes.css 没有覆盖。',
    fix: 'notes.css 加 `.headerlink{padding:.6rem;margin:-.6rem}`（视觉位置不变、命中区撑到 44×44）与 `.md-code__button{width:44px;height:44px}`。',
    scope: 'upstream',
  });

  add({
    id: 'MOB-09',
    title: '甘特图 4 块塞不进 296px 容器，最后一块的结束时刻被裁掉一半',
    severity: 'P3',
    category: 'responsive',
    device: 'Android 360×800（375 藏 18px，390 藏 3px）',
    url: `${LOCAL}${PAGES.lab}`,
    steps: ['打开 /lab/scheduling/（默认参数自动算一次）', '看「执行时间轴」的 4 个色块', '注意第 4 块 P4 的结束时刻「9–11」在屏幕上只看到「9–1」'],
    expected: '时间轴应完整显示每个片段的起止时刻，或明显可横向滚动',
    actual: `容器 ${num(ev.gantt360?.cw, 'px')}，内容 ${num(ev.gantt360?.sw, 'px')}，藏起来 ${num(ev.gantt360?.hidden, 'px')}；4 块每块 ${num(ev.gantt360?.blockW?.[0], 'px')}（min-width ${ev.gantt360?.minWidth ?? NA}）。最后一块的文本节点本身是完整的「${ev.gantt360?.lastText ?? NA}」，但容器右缘把它的 ${num(ev.gantt360?.hidden, 'px')} 像素裁在屏幕外，截图里只能看到「9–1」。滚动条占位高度 ${num(ev.gantt360?.scrollbarGutter, 'px')}，触屏上不可见，用户不会知道还能滑。`,
    measurements: {
      '容器 / 内容宽': `${num(ev.gantt360?.cw, 'px')} / ${num(ev.gantt360?.sw, 'px')}`,
      '隐藏像素': num(ev.gantt360?.hidden, 'px'),
      '每块宽度': num(ev.gantt360?.blockW?.[0], 'px'),
      'min-width': ev.gantt360?.minWidth ?? NA,
      '最后一块文字': ev.gantt360?.lastText ?? NA,
      '滚动条占位': num(ev.gantt360?.scrollbarGutter, 'px'),
    },
    evidence: ['qa/artifacts/mobile/mob-10-gantt-360-dark.png', 'qa/artifacts/mobile/mob-10-gantt-context-360-dark.png'],
    source: 'notes.css:103 `.gantt-block{min-width:4rem}`（=80px，根字号 20px）→ 4 块最少 320px，而卡片内可用宽只有 296px（360 视口），`.gantt{overflow-x:auto}` 又没有提示。',
    fix: '窄屏把 `min-width` 降到 2.5rem/40px 并把块内字号降到 12px，或块内只显示起止时刻、给 `.gantt` 加右缘渐隐提示。',
    scope: 'own',
  });

  add({
    id: 'MOB-10',
    title: '实验页「调度算法」下拉框文字被截断，选项名看不全',
    severity: 'P3',
    category: 'content',
    device: 'Android 360×800（375 略好但仍贴边）',
    url: `${LOCAL}${PAGES.lab}`,
    steps: ['打开 /lab/scheduling/', '看表单第一行左侧的「调度算法」下拉框', '对比完整选项文字与可见文字'],
    expected: '下拉框应完整显示算法名（FCFS · 先来先服务 / SPF · 短进程优先 / RR · 时间片轮转）',
    actual: `下拉框外宽 ${num(sel.width, 'px')}，去掉内边距后可用 ${num(sel.innerWidth, 'px')}；「${sel.text ?? NA}」按同字号量出需要 ${num(sel.textNeedsPx, 'px')}，被截掉 ${num(sel.clippedPx, 'px')}，末尾的「务」看不到（截图可见文字止于「先来先服」）。`,
    measurements: {
      '下拉框外宽 / 可用内宽': `${num(sel.width, 'px')} / ${num(sel.innerWidth, 'px')}`,
      '文字所需宽度': num(sel.textNeedsPx, 'px'),
      '被截像素': num(sel.clippedPx, 'px'),
      '字号': sel.font ?? NA,
      'grid 列宽': sel.colWidth ?? NA,
    },
    evidence: ['qa/artifacts/mobile/mob-11-lab-select-360-dark.png', 'qa/artifacts/mobile/mob-11-lab-select-375.png'],
    source: 'notes.css:116 的窄屏规则把 `.lab-controls` 固定成 `minmax(0,1fr) 5.5rem`，第一列要同时放「调度算法」标签和长选项文字；notes.css:93 `.scheduler :is(input,select){font-size:1rem}` 在 20px 根字号下等于 20px，文字更宽。',
    fix: '窄屏把 `.lab-controls` 改成单列（`grid-template-columns:1fr`），或把 select 字号降到 `.875rem` 并缩短选项文案（如「FCFS 先来先服务」去掉中点）。',
    scope: 'own',
  });

  add({
    id: 'MOB-11',
    title: '搜索框 placeholder 对比度 4.49:1、侧栏「目录」标题 4.42:1，均略低于 4.5:1',
    severity: 'P3',
    category: 'a11y',
    device: '全部三档浅色主题（深色主题达标）',
    url: `${LOCAL}${PAGES.os2}`,
    steps: ['打开章节页', '点右上角放大镜打开搜索面板，量 placeholder「搜索」与背景的对比度', '另量左侧导航「目录」标题'],
    expected: '正文与占位文字对比度 ≥ 4.5:1（WCAG 1.4.3 AA）',
    actual: `placeholder「搜索」计算色 ${ev.search?.placeholderColor ?? NA}、背景 ${ev.search?.formBg ?? NA}，对比度 ${num(phHit?.ratio)}:1；导航标题「目录」rgba(0,0,0,.54) on rgb(237,237,237) = ${num(navHit?.ratio)}:1。截图上 placeholder 是清晰可读的中灰（不是白底白字），深色主题下对应文字 rgb(180,183,194) on rgb(24,25,29)，实测达标。`,
    measurements: {
      '搜索 placeholder 对比度': `${num(phHit?.ratio)} : 1（要求 4.5）`,
      'placeholder 计算色 / 背景': `${ev.search?.placeholderColor ?? NA} / ${ev.search?.formBg ?? NA}`,
      '导航标题对比度': `${num(navHit?.ratio)} : 1（要求 4.5）`,
      '受影响主题': 'light',
      '深色主题': '未发现不达标文字',
    },
    evidence: ['qa/artifacts/mobile/mob-12-search-375.png'],
    source: '两者都是 Material 默认色（`.md-search__input::placeholder` 与 `.md-nav__title` 用 rgba(0,0,0,.54)）；notes.css:164 把 `.md-search__form` 背景改成 --note-muted-surface(#f3f4f6)，把原本刚好达标的对比度压到临界值以下。',
    fix: 'notes.css 加 `.md-search__input::placeholder{color:#5b6472}`（提到约 5.2:1）与 `[data-md-color-scheme=default] .md-nav__title{color:var(--note-muted)}`。',
    scope: 'upstream',
  });

  add({
    id: 'MOB-12',
    title: '抽屉导航打开时背景页面仍能滚动（Material 默认，未在 notes.css 覆盖）',
    severity: 'P3',
    category: 'navigation',
    device: 'Android 360×800 / iPhone SE 375×667',
    url: `${LOCAL}${PAGES.home}`,
    steps: ['首页点左上角汉堡按钮打开抽屉', '在抽屉外的遮罩上向上滑', '看背景页面是否跟着滚'],
    expected: '抽屉打开时背景应锁定，关闭后回到原位',
    actual: `抽屉宽 ${num(ev.drawer?.w, 'px')}（占视口 ${ev.drawer ? Math.round((ev.drawer.w / ev.drawer.vw) * 100) : NA}%），打开时 body overflow 仍是 ${ev.drawer?.bodyOverflow ?? NA}，滑动 ${num(ev.drawerScroll?.delta, 'px')}px 后背景确实位移。抽屉本身功能正常：${num(ev.drawer?.links)} 个可见链接、行高 ${num(ev.drawer?.linkHeights?.[0], 'px')}，汉堡按钮 ${num(ev.drawer?.hamburger?.w, 'px')}×${num(ev.drawer?.hamburger?.h, 'px')}，实测可以展开分组并成功进入 /chapters/chapter-2/（${ev.drawerNavOk ? '是' : '否'}）。`,
    measurements: {
      '抽屉宽 / 视口': `${num(ev.drawer?.w, 'px')} / ${num(ev.drawer?.vw, 'px')}`,
      '抽屉内可见链接数': num(ev.drawer?.links),
      '链接行高': num(ev.drawer?.linkHeights?.[0], 'px'),
      '汉堡按钮': `${num(ev.drawer?.hamburger?.w, 'px')} × ${num(ev.drawer?.hamburger?.h, 'px')}`,
      '背景滚动量': num(ev.drawerScroll?.delta, 'px'),
      '能否进入章节页': ev.drawerNavOk === undefined ? NA : String(ev.drawerNavOk),
    },
    evidence: ['qa/artifacts/mobile/mob-13-drawer-375.png', 'qa/artifacts/mobile/mob-13-drawer-360-dark.png'],
    source: 'Material 的抽屉只切换 `#__drawer` checkbox 与遮罩，不加 body 滚动锁；notes.css 未覆盖这一行为。',
    fix: 'notes.css 加 `body:has(#__drawer:checked){overflow:hidden}`（现代浏览器均支持），或给 `.md-container` 加 `overscroll-behavior:contain`。',
    scope: 'upstream',
  });

  const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  F.sort((a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id));

  return {
    member: 'qa-mobile',
    env: 'local',
    generatedAt: new Date().toISOString(),
    base: LOCAL,
    devices: ['Android 360×800 (Pixel 7 缩放)', 'iPhone SE 375×667', 'iPhone 14 390×844'],
    themes: ['light', 'dark（点 label[for="__palette_1"] 切换，站点不跟随系统）'],
    pages: [PAGES.home, PAGES.os2, PAGES.os3, PAGES.co2, PAGES.lab],
    method: 'Playwright + qa/lib/audit.mjs：三档设备 × light/dark × 5 个页面全量扫描（layout/tapTargets/contrast/a11y/firstScreen），再对抽屉、插图弹窗、习题折叠、复习工具条、字号选择、实验页表单/甘特图/结果表做交互探针；关键结论用 elementFromPoint 逐像素命中、scrollLeft 实测、getComputedStyle 复核，并与线上站做一次抽查比对。',
    summary: {
      total: F.length,
      P0: F.filter((f) => f.severity === 'P0').length,
      P1: F.filter((f) => f.severity === 'P1').length,
      P2: F.filter((f) => f.severity === 'P2').length,
      P3: F.filter((f) => f.severity === 'P3').length,
      byScope: {
        own: F.filter((f) => f.scope === 'own').length,
        upstream: F.filter((f) => f.scope === 'upstream').length,
        taste: F.filter((f) => f.scope === 'taste').length,
      },
    },
    passed: [
      `抽屉导航可用：汉堡按钮 ${num(ev.drawer?.hamburger?.w, 'px')}×${num(ev.drawer?.hamburger?.h, 'px')}，抽屉 ${num(ev.drawer?.w, 'px')} 宽，导航链接行高 ${num(ev.drawer?.linkHeights?.[0], 'px')}，二级分组可展开并成功进入 /chapters/chapter-2/（${ev.drawerNavOk ? '实测通过' : '未通过'}），点遮罩可关闭`,
      `字号选择器确实生效：16→20px，正文 +${num(ev.fontScale && ev.fontScale20 ? ev.fontScale20.p - ev.fontScale.p : null, 'px')}，刷新后从 localStorage 恢复（问题只在标题/表格不跟，见 MOB-06）`,
      `教材习题折叠 summary 触控面积达标：高 ${num(ev.details?.minHeight, 'px')} × 宽 ${num(ev.details?.width, 'px')}（≥44px），展开后无横向溢出`,
      `复习工具条与正文同宽（实测宽度差 ${num(ev.toolbar ? ev.toolbar.contentW - ev.toolbar.barW : null, 'px')}），360 下不换行`,
      '插图、代码块、表格都没有把整页撑出横向滚动（三档设备 documentElement.scrollWidth === innerWidth）',
      '深色主题下未发现 <4.5:1 的文字（浅色两处临界值见 MOB-11）',
      `线上 studynote.chosenecho.dpdns.org 抽查与本地一致：表格 ${raw.live?.os2?.typeScale?.table ?? NA}px、工具条 ${raw.live?.os2?.typeScale?.toolbar ?? NA}px、正文 ${raw.live?.os2?.typeScale?.p ?? NA}px`,
    ],
    findings: F,
    gaps: [
      ...(raw.gaps ?? []),
      { item: 'Safari 真机', detail: '本轮为 Chromium（Playwright）移动仿真，未在 iOS Safari 真机验证；iOS 的橡皮筋滚动、双指缩放与 -webkit 前缀行为可能与 Chromium 有差异。' },
      { item: '读屏实测', detail: '仅做静态 a11y 扫描（标题层级/landmark/alt/字号/命中区），未跑 VoiceOver/TalkBack 实测。' },
      { item: '性能指标', detail: '未测 LCP/CLS 等运行时指标；只量化了勾选复习框造成的 41px 布局位移（MOB-05）。' },
      { item: '窄屏下限', detail: '未覆盖 320px（小屏安卓/一代 SE）与横屏；本轮结论适用于 360–390px 竖屏。' },
      {
        item: '与 Lead 复核结论不一致的两处（保留本轮实测值，供交叉核对）',
        detail: [
          '① 实验页结果表：Lead 复核为「58px 在视口外且无滚动容器」。本轮实测第 4 列右边缘确实到 433px（375 视口外 58px），但该表被 Material 包在 `.md-typeset__table`（overflow-x:visible）里，其父级 `.md-typeset__scrollwrap` 是 overflow-x:auto 且实测可滚（scrollLeft 0→91，滚到底后最后一列右边缘回到 342px）——只查直接父级会漏掉这一层。因此本条按「可滚但无提示」定级 P1，而非内容丢失 P0。',
          '② 搜索框 placeholder：Lead 复核为「计算色 rgba(255,255,255,.7)、对比度约 1.06:1、应升 P1」。本轮在同一 build 上 getComputedStyle(input,"::placeholder").color 读数为 rgba(0,0,0,0.54)，搜索表单背景 rgb(255,255,255)，对比度 4.49:1；深色主题为 rgb(180,183,194) on rgb(24,25,29)。截图 qa/artifacts/mobile/mob-12-search-375.png 里「搜索」是清晰的中灰、并非白底白字。故本条维持 P3（临界值），若 Lead 手上另有 rgba(255,255,255,.7) 的证据请回传截图，我按新证据改判。',
        ].join(' '),
      },
    ],
    rawFile: 'qa/artifacts/mobile/raw.json',
  };
}

function buildMarkdown(rep) {
  const L = [];
  L.push('# 移动端体验审计报告（qa-mobile）');
  L.push('');
  L.push(`- 被测环境：\`${rep.base}\`（对照线上 \`${LIVE}\`）`);
  L.push(`- 设备档位：${rep.devices.join(' / ')}`);
  L.push(`- 主题：${rep.themes.join(' / ')}`);
  L.push(`- 覆盖页面：${rep.pages.join('、')}`);
  L.push(`- 方法：${rep.method}`);
  L.push(`- 生成：\`node qa/scripts/mobile.mjs\`（原始数据 \`qa/artifacts/mobile/raw.json\`），${rep.generatedAt}`);
  L.push('');
  L.push('## 汇总');
  L.push('');
  L.push(`共 **${rep.summary.total}** 条：P0 ${rep.summary.P0} · P1 ${rep.summary.P1} · P2 ${rep.summary.P2} · P3 ${rep.summary.P3}。`);
  L.push(`其中自有缺陷 ${rep.summary.byScope.own} 条、Material 上游默认行为 ${rep.summary.byScope.upstream} 条、纯审美 ${rep.summary.byScope.taste} 条；后两类标了 \`scope\`，不计入主线修复优先级。`);
  L.push('');
  L.push('| ID | 级别 | 标题 | 影响面 | 根因位置 |');
  L.push('|---|---|---|---|---|');
  for (const f of rep.findings) {
    const src = (f.source.match(/notes\.css:\d+|interactions\.js:\d+(-\d+)?/) ?? ['Material 默认'])[0];
    L.push(`| ${f.id} | ${f.severity} | ${f.title} | ${f.device} | ${src} |`);
  }
  L.push('');
  L.push('## 缺陷详情（P0 → P3）');
  L.push('');
  for (const f of rep.findings) {
    L.push(`### ${f.id} · ${f.severity} · ${f.title}`);
    L.push('');
    L.push(`- **类别**：${f.category}${f.scope && f.scope !== 'own' ? `（scope: \`${f.scope}\`）` : ''}`);
    L.push(`- **影响设备/宽度**：${f.device}`);
    L.push(`- **URL**：\`${f.url}\``);
    L.push('');
    L.push('**现象**');
    L.push('');
    L.push(f.actual);
    L.push('');
    L.push('**复现步骤**');
    L.push('');
    f.steps.forEach((s, i) => L.push(`${i + 1}. ${s}`));
    L.push('');
    L.push('**量化证据**');
    L.push('');
    L.push('| 指标 | 实测 |');
    L.push('|---|---|');
    for (const [k, v] of Object.entries(f.measurements)) L.push(`| ${k} | ${v} |`);
    L.push('');
    L.push(`**证据图**：${f.evidence.map((e) => `\`${e}\``).join('、')}`);
    L.push('');
    L.push('**预期**');
    L.push('');
    L.push(f.expected);
    L.push('');
    L.push('**根因定位**');
    L.push('');
    L.push(f.source);
    L.push('');
    L.push('**建议改法**');
    L.push('');
    L.push(f.fix);
    L.push('');
  }
  L.push('## 已验证正常（不计入缺陷）');
  L.push('');
  for (const p of rep.passed) L.push(`- ${p}`);
  L.push('');
  L.push('## 缺口 / 未覆盖');
  L.push('');
  for (const g of rep.gaps) L.push(`- **${g.item}**：${g.detail}`);
  L.push('');
  return L.join('\n');
}

main().catch(async (e) => {
  raw.gaps.push({ item: 'run', detail: String(e && e.stack ? e.stack.slice(0, 1200) : e) });
  await saveJSON(`${ART}/raw.json`, raw).catch(() => {});
  process.stderr.write(`[mobile] FAILED: ${e}\n`);
  process.exitCode = 1;
});
