// qa-desktop audit: desktop widths / dark theme / keyboard & a11y

import {
  session, DEVICES, PAGES, custom, goto, warm, layout, tapTargets, contrast, a11y,
  shot, shotElement, saveJSON, diagnostics, LOCAL, LIVE,
} from '../lib/audit.mjs';

const OUT = 'artifacts/desktop';
const MODE = process.argv[2] || 'all';
const DESKTOPS = ['desktop-1280', 'desktop-1366', 'desktop-1440', 'desktop-1920'];
const only = (m) => MODE === 'all' || MODE === m;

// ---------------------------------------------------------------- helpers

/** Click the moon label to enter dark. Records which mechanism actually worked. */
async function setDark(page) {
  const before = await page.evaluate(() => {
    const lbl = document.querySelector('label[for="__palette_1"]');
    const inp = document.querySelector('#__palette_1');
    const r = lbl ? lbl.getBoundingClientRect() : null;
    return {
      labelExists: !!lbl,
      labelHasHiddenAttr: lbl ? lbl.hasAttribute('hidden') : null,
      labelDisplay: lbl ? getComputedStyle(lbl).display : null,
      labelRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      radioExists: !!inp,
      radioChecked: inp ? inp.checked : null,
      schemeAttr: document.documentElement.getAttribute('data-md-color-scheme'),
    };
  });
  let method = 'label-click';
  try {
    await page.locator('label[for="__palette_1"]').click({ timeout: 4000 });
  } catch {
    method = 'radio-input-click-fallback';
    await page.evaluate(() => document.querySelector('#__palette_1')?.click());
  }
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => ({
    schemeAttr: document.documentElement.getAttribute('data-md-color-scheme'),
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  }));
  return { before, method, after };
}

/** Computed-style matrix for a list of selectors (first match each). */
async function stylesOf(page, selectors) {
  return page.evaluate((sels) => {
    const pick = ['backgroundColor', 'color', 'borderTopColor', 'borderBottomColor', 'borderColor',
      'fontSize', 'lineHeight', 'fontWeight', 'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
      'marginTop', 'marginBottom', 'paddingTop', 'paddingLeft', 'borderTopWidth', 'overflow', 'display',
      'maxHeight', 'borderRadius', 'boxShadow', 'opacity', 'textDecorationLine', 'transitionDuration', 'animationName'];
    const out = {};
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const rec = { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } };
      for (const p of pick) rec[p] = cs[p];
      rec.text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 48);
      out[sel] = rec;
    }
    return out;
  }, selectors);
}

/** Effective background stack + contrast for one element. */
async function bgChain(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const parse = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const chain = [];
    let p = el, acc = null;
    while (p) {
      const c = parse(getComputedStyle(p).backgroundColor);
      if (c && c.a > 0.02) {
        chain.push({ el: p.tagName.toLowerCase() + (p.className && typeof p.className === 'string' ? '.' + p.className.trim().split(/\s+/)[0] : ''), bg: `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${c.a})` });
        acc = acc ? blend(acc, c) : c;
        if (c.a >= 0.999) break;
      }
      p = p.parentElement;
    }
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const finalBg = acc ? (acc.a >= 0.999 ? acc : blend(acc, bodyBg)) : bodyBg;
    const fg = parse(getComputedStyle(el).color);
    const rgb = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
    return {
      sel,
      ownBg: getComputedStyle(el).backgroundColor,
      resolvedBg: rgb(finalBg),
      fg: rgb(fg),
      textOnOwnBg: ratio(fg.a < 1 ? blend(fg, finalBg) : fg, finalBg),
      chain,
      surroundBg: (() => { const par = el.parentElement; const c = par ? parse(getComputedStyle(par).backgroundColor) : null; return c && c.a > 0.02 ? rgb(c) : null; })(),
      surfaceVsSurround: (() => {
        const own = parse(getComputedStyle(el).backgroundColor);
        const par = el.parentElement;
        const pc = par ? parse(getComputedStyle(par).backgroundColor) : null;
        if (!own || own.a < 0.99) return null;
        if (!pc || pc.a < 0.99) return null;
        return ratio(own, pc);
      })(),
    };
  }, sel);
}

/** Root/typography facts + line length. */
async function typeFacts(page) {
  return page.evaluate(() => {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const px = (v) => Math.round(parseFloat(v) * 100) / 100;
    const body = document.querySelector('.md-content__inner');
    const p = document.querySelector('.md-content__inner p');
    const inner = document.querySelector('.md-typeset');
    const content = document.querySelector('.md-content');
    const r = (el) => { const b = el?.getBoundingClientRect(); return b ? { w: Math.round(b.width), x: Math.round(b.x) } : null; };
    const sample = [...document.querySelectorAll('.md-typeset p')].map((el) => {
      const cs = getComputedStyle(el);
      return { fs: px(cs.fontSize), lh: cs.lineHeight, w: Math.round(el.getBoundingClientRect().width), text: el.textContent.trim().slice(0, 24) };
    }).filter((s) => s.w > 0).slice(0, 5);
    return {
      rootFontSize: root,
      remExamples: { '0.8rem': px(0.8 * root), '0.875rem': px(0.875 * root), '1rem': px(root), '1.55rem': px(1.55 * root), '1.2rem': px(1.2 * root), '0.75rem': px(0.75 * root), '0.9375rem': px(0.9375 * root), '1.1rem': px(1.1 * root), '56rem': px(56 * root) },
      innerFontSize: body ? px(getComputedStyle(body).fontSize) : null,
      typesetFontSize: inner ? px(getComputedStyle(inner).fontSize) : null,
      paragraphFontSize: p ? px(getComputedStyle(p).fontSize) : null,
      bodyLineHeight: getComputedStyle(document.body).lineHeight,
      contentWidth: r(content),
      innerWidth: r(body),
      paragraphWidths: sample,
      cjkCharsPerLine: body ? Math.round(body.getBoundingClientRect().width / (p ? parseFloat(getComputedStyle(p).fontSize) : 16)) : null,
      h1: [...document.querySelectorAll('h1')].map((h) => ({ fs: px(getComputedStyle(h).fontSize), text: h.textContent.trim().slice(0, 30) })),
      h2: [...document.querySelectorAll('.md-typeset h2')].slice(0, 12).map((h) => ({ fs: px(getComputedStyle(h).fontSize), mt: getComputedStyle(h).marginTop, mb: getComputedStyle(h).marginBottom, pt: getComputedStyle(h).paddingTop, bt: getComputedStyle(h).borderTopWidth, text: h.textContent.trim().slice(0, 30) })),
      h3: [...document.querySelectorAll('.md-typeset h3')].slice(0, 6).map((h) => ({ fs: px(getComputedStyle(h).fontSize), mt: getComputedStyle(h).marginTop, text: h.textContent.trim().slice(0, 30) })),
      blockquote: [...document.querySelectorAll('.md-typeset blockquote')].slice(0, 3).map((b) => ({ fs: px(getComputedStyle(b).fontSize), text: b.textContent.trim().slice(0, 24) })),
      counts: {
        figureZoom: document.querySelectorAll('.figure-zoom').length,
        figureZoomWithWhiteBg: [...document.querySelectorAll('.figure-zoom')].filter((e) => getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)').length,
        tables: document.querySelectorAll('.md-typeset table').length,
        details: document.querySelectorAll('.md-typeset details').length,
        h2: document.querySelectorAll('.md-typeset h2').length,
        h3: document.querySelectorAll('.md-typeset h3').length,
        codes: document.querySelectorAll('.md-typeset :not(pre) > code').length,
        pre: document.querySelectorAll('.md-typeset pre').length,
        ganttBlocks: document.querySelectorAll('.gantt-block').length,
      },
    };
  });
}

/** Gap between an h2 and the previous sibling's bottom edge (visual spacing). */
async function headingSpacing(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('.md-typeset h2')].slice(0, 6).map((h) => {
      const r = h.getBoundingClientRect();
      let prev = h.previousElementSibling;
      while (prev && prev.getBoundingClientRect().height < 1) prev = prev.previousElementSibling;
      const pr = prev ? prev.getBoundingClientRect() : null;
      const cs = getComputedStyle(h);
      const pcs = prev ? getComputedStyle(prev) : null;
      return {
        h2: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 34),
        h2MarginTop: cs.marginTop,
        h2PaddingTop: cs.paddingTop,
        h2BorderTop: cs.borderTopWidth,
        prevTag: prev ? prev.tagName.toLowerCase().split('')[0] : null,
        prevMarginBottom: pcs ? pcs.marginBottom : null,
        visualGapPx: pr ? Math.round((r.top - pr.bottom) * 10) / 10 : null,
        h2FontPx: Math.round(parseFloat(cs.fontSize) * 100) / 100,
      };
    });
  });
}

// ---------------------------------------------------------------- recon
async function recon() {
  const out = { env: LOCAL, generatedAt: new Date().toISOString(), devices: {}, dark: {}, structure: {} };

  for (const d of DESKTOPS) {
    const s = await session(d);
    const row = {};
    for (const [name, pathName] of [['home', PAGES.home], ['os2', PAGES.os2], ['lab', PAGES.lab]]) {
      await goto(s.page, pathName);
      await warm(s.page);
      row[name] = {
        layout: await layout(s.page),
        type: await typeFacts(s.page),
        a11y: await a11y(s.page),
      };
    }
    // dark switch probe on the chapter page
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    const lightBg = await s.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    row.darkSwitch = await setDark(s.page);
    row.darkSwitch.lightBodyBg = lightBg;
    row.darkType = await typeFacts(s.page);
    row.darkContrast = await contrast(s.page);
    out.devices[d] = row;
    await s.close();
    console.log(`recon ${d} done`);
  }

  // does the site follow prefers-color-scheme?
  for (const scheme of ['dark', 'light']) {
    const s = await session('desktop-1440', { colorScheme: scheme });
    await goto(s.page, PAGES.os2);
    out.dark[`system-${scheme}`] = await s.page.evaluate((scheme) => ({
      requested: scheme,
      mediaMatches: window.matchMedia('(prefers-color-scheme: dark)').matches,
      schemeAttr: document.documentElement.getAttribute('data-md-color-scheme'),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      headerBg: getComputedStyle(document.querySelector('.md-header')).backgroundColor,
    }), scheme);
    await s.close();
  }

  // selector inventory for later modules
  const s = await session('desktop-1440');
  await goto(s.page, PAGES.os2);
  await warm(s.page);
  out.structure.os2 = await s.page.evaluate(() => {
    const q = (sel) => [...document.querySelectorAll(sel)].map((e) => {
      const r = e.getBoundingClientRect();
      return { sel, tag: e.tagName.toLowerCase(), cls: typeof e.className === 'string' ? e.className.slice(0, 60) : '', w: Math.round(r.width), h: Math.round(r.height), text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) };
    });
    return {
      skips: q('.md-skip'),
      tops: q('.md-top'),
      toolbars: q('.study-toolbar'),
      figures: q('.figure-zoom').slice(0, 3),
      dialog: q('.image-dialog'),
      closeBtn: q('.image-dialog button'),
      h2: q('.md-typeset h2').slice(0, 4),
      navLink: q('.md-nav__link').slice(0, 3),
      sidebarScrollwrap: q('.md-sidebar__scrollwrap'),
      contentInner: q('.md-content__inner'),
      mainInner: q('.md-main__inner'),
      codeInline: q('.md-typeset :not(pre) > code').slice(0, 2),
      blockquote: q('.md-typeset blockquote').slice(0, 2),
      navTitle: q('.md-nav__title').slice(0, 2),
    };
  });
  out.structure.os2Styles = await stylesOf(s.page, [
    '.md-skip', '.md-header', '.md-search__form', '.md-search__input', '.md-nav__title',
    '.md-typeset h2', '.md-typeset h3', '.md-typeset p', '.md-typeset blockquote',
    '.md-typeset :not(pre) > code', '.md-typeset th', '.md-typeset tr:nth-child(2) td',
    '.figure-zoom', '.zoom-hint', '.image-dialog', '.image-dialog img', '.image-dialog p',
    '.study-toolbar', '.study-toolbar .save-status', '.study-toolbar label',
    'details.exercise-answer', 'details.exercise-answer > summary', '.exercise-item',
    '.md-footer', '.md-content__inner', '.md-sidebar__scrollwrap',
  ]);
  out.structure.os2Bg = {};
  for (const sel of ['.figure-zoom', '.zoom-hint', '.study-toolbar', '.exercise-answer', '.md-typeset th', '.md-typeset blockquote']) {
    out.structure.os2Bg[sel] = await bgChain(s.page, sel);
  }

  await goto(s.page, PAGES.lab);
  await warm(s.page);
  out.structure.labStyles = await stylesOf(s.page, [
    '.scheduler', '.lab-controls label', '.scheduler input', '.primary-link', '.lab-buttons button[type=reset]',
    '.lab-results', '.gantt', '.gantt-block', '.process-1', '.process--1', '.lab-metrics', '.lab-results table th', '.lab-results table td',
  ]);
  out.structure.labBg = {};
  for (const sel of ['.scheduler', '.gantt-block', '.lab-metrics', '.lab-results table th']) {
    out.structure.labBg[sel] = await bgChain(s.page, sel);
  }
  out.structure.labAria = await s.page.evaluate(() => ({
    labResultsLive: (() => { const el = document.querySelector('.lab-results'); return el ? { ariaLive: el.getAttribute('aria-live'), role: el.getAttribute('role'), atomic: el.getAttribute('aria-atomic') } : null; })(),
    saveStatusLive: (() => { const el = document.querySelector('.save-status'); return { exists: !!el, ariaLive: el?.getAttribute('aria-live') ?? null, role: el?.getAttribute('role') ?? null }; })(),
    labelsForAttr: [...document.querySelectorAll('.lab-controls label')].map((l) => ({ for: l.getAttribute('for'), text: l.textContent.trim().slice(0, 20), childControls: l.querySelectorAll('input,select').length })),
    dialogAria: (() => { const d = document.querySelector('.image-dialog'); return d ? { ariaLabel: d.getAttribute('aria-label'), ariaLabelledby: d.getAttribute('aria-labelledby'), ariaDescribedby: d.getAttribute('aria-describedby'), role: d.getAttribute('role'), closeBtnName: d.querySelector('button')?.textContent.trim() } : null; })(),
  }));
  out.diagnostics = diagnostics(s);
  await s.close();

  await saveJSON(`${OUT}/recon.json`, out);
  console.log('wrote', `${OUT}/recon.json`);
}

// ---------------------------------------------------------------- extra probes

/** Effective backdrop (resolved through transparent ancestors) + own surface luminance. */
async function surfaces(page, sels) {
  return page.evaluate((sels) => {
    const parse = (c) => {
      const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
    const rgb = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const backdropOf = (el) => {
      let p = el.parentElement, acc = null;
      while (p) {
        const c = parse(getComputedStyle(p).backgroundColor);
        if (c && c.a > 0.02) { acc = acc ? blend(acc, c) : c; if (c.a >= 0.999) break; }
        p = p.parentElement;
      }
      const base = acc ? (acc.a >= 0.999 ? acc : blend(acc, bodyBg)) : bodyBg;
      return base;
    };
    const out = {};
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) { out[sel] = null; continue; }
      const cs = getComputedStyle(el);
      const own = parse(cs.backgroundColor);
      const bd = backdropOf(el);
      const solid = own && own.a >= 0.9 ? own : null;
      const fg = parse(cs.color);
      out[sel] = {
        ownBg: cs.backgroundColor,
        backdrop: rgb(bd),
        surfaceVsBackdrop: solid ? Math.round(ratio(solid, bd) * 100) / 100 : null,
        ownLuminance: solid ? Math.round(lum(solid) * 1000) / 1000 : null,
        isLightSurface: solid ? lum(solid) > 0.5 : null,
        fg: cs.color,
        fgOnBackdrop: fg ? Math.round(ratio(fg.a < 1 ? blend(fg, bd) : fg, bd) * 100) / 100 : null,
        fs: cs.fontSize,
      };
    }
    return out;
  }, sels);
}

/** Every solid background whose luminance > .5 while the page is dark: hardcoded light surfaces. */
async function lightSurfaces(page) {
  return page.evaluate(() => {
    const parse = (c) => {
      const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const rows = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('dialog') || ['SCRIPT', 'STYLE', 'IMG', 'SVG', 'PATH'].includes(el.tagName)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const c = parse(cs.backgroundColor);
      if (!c || c.a < 0.9) continue;
      if (lum(c) <= 0.5) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      const key = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
      const prev = rows.find((x) => x.key === key);
      if (prev) { prev.count += 1; prev.area += Math.round(r.width * r.height); continue; }
      rows.push({ key, count: 1, area: Math.round(r.width * r.height), bg: cs.backgroundColor, lum: Math.round(lum(c) * 1000) / 1000, text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30) });
    }
    return rows.sort((a, b) => b.area - a.area).slice(0, 20);
  });
}

/** Tab walk with focus-ring visibility / clipping analysis. */
async function tabWalk(page, n = 45) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  await page.waitForTimeout(80);
  const steps = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return { none: true, tag: el ? el.tagName.toLowerCase() : 'null' };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const ow = parseFloat(cs.outlineWidth) || 0;
      const oo = parseFloat(cs.outlineOffset) || 0;
      const hasRing = ow > 0 && cs.outlineStyle !== 'none';
      const ring = hasRing ? { left: r.left - oo - ow, top: r.top - oo - ow, right: r.right + oo + ow, bottom: r.bottom + oo + ow } : null;
      let clippedBy = null;
      if (ring) {
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          const pcs = getComputedStyle(p);
          const ox = pcs.overflowX, oy = pcs.overflowY;
          if (ox !== 'visible' || oy !== 'visible') {
            const pr = p.getBoundingClientRect();
            const over = Math.max(0, Math.round((pr.left - ring.left) * 10) / 10) + Math.max(0, Math.round((ring.right - pr.right) * 10) / 10) + Math.max(0, Math.round((pr.top - ring.top) * 10) / 10) + Math.max(0, Math.round((ring.bottom - pr.bottom) * 10) / 10);
            if (over > 1) {
              clippedBy = { ancestor: p.tagName.toLowerCase() + (typeof p.className === 'string' && p.className ? '.' + p.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), overflow: `${ox}/${oy}`, clippedPx: Math.round(over * 10) / 10 };
              break;
            }
          }
          p = p.parentElement;
        }
      }
      return {
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '',
        id: el.id || null,
        type: el.type || null,
        name: (el.getAttribute('aria-label') || el.getAttribute('title') || (el.textContent || '').trim().replace(/\s+/g, ' ')).slice(0, 36),
        rect: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) },
        outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
        hasRing,
        ringVisible: hasRing && r.width > 1 && r.height > 1 && +cs.opacity > 0.1,
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        clippedBy,
        scrollY: Math.round(window.scrollY),
      };
    });
    steps.push({ step: i + 1, ...info });
    if (info.none) break;
  }
  return steps;
}

/** Search panel: open, type, measure placeholder / output / clear button / focus. */
async function searchProbe(page, theme) {
  const placeholder = await page.evaluate(() => {
    const el = document.querySelector('.md-search__input');
    if (!el) return null;
    const ph = getComputedStyle(el, '::placeholder');
    const form = document.querySelector('.md-search__form');
    return { phColor: ph.color, phFs: ph.fontSize, inputColor: getComputedStyle(el).color, formBg: form ? getComputedStyle(form).backgroundColor : null, inputFs: getComputedStyle(el).fontSize, formRect: (() => { const r = form.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) }; })() };
  });
  await page.locator('.md-search__input').click({ timeout: 5000 }).catch(async () => {
    await page.locator('.md-header__button[for="__search"]').first().click();
  });
  await page.waitForTimeout(500);
  await page.locator('.md-search__input').focus();
  await page.keyboard.type('进程', { delay: 60 });
  await page.waitForTimeout(1200);
  const panel = await page.evaluate(() => {
    const out = document.querySelector('.md-search__output');
    const inner = document.querySelector('.md-search__inner');
    const form = document.querySelector('.md-search__form');
    const clear = document.querySelector('.md-search__options button');
    const vw = window.innerWidth;
    const rr = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), overRight: Math.round(r.right - vw) }; };
    const list = document.querySelector('.md-search-result__list');
    const items = list ? [...list.querySelectorAll('a')].length : 0;
    return {
      output: rr(out), inner: rr(inner), form: rr(form),
      clear: clear ? { ...rr(clear), tabindex: clear.getAttribute('tabindex'), ariaLabel: clear.getAttribute('aria-label') } : null,
      resultLinks: items,
      innerOverflow: inner ? `${getComputedStyle(inner).overflowX}/${getComputedStyle(inner).overflowY}` : null,
      outputOverflow: out ? `${getComputedStyle(out).overflowY}` : null,
      focused: document.activeElement?.className,
      focusedOutline: (() => { const a = document.activeElement; if (!a) return null; const c = getComputedStyle(a); return `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor}`; })(),
      vw,
    };
  });
  const shotName = `artifacts/desktop/search-${theme}.png`;
  await shot(page, shotName);
  // close search
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return { placeholder, panel, screenshot: shotName };
}

/** Dialog focus flow + dark surface. */
async function dialogProbe(page, theme) {
  await page.evaluate(() => document.querySelector('.figure-zoom')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(250);
  await page.focus('.figure-zoom');
  const beforeActive = await page.evaluate(() => document.activeElement?.className);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => {
    const d = document.querySelector('dialog[open]');
    if (!d) return { open: false };
    const cs = getComputedStyle(d);
    const img = d.querySelector('img');
    const ir = img?.getBoundingClientRect();
    return {
      open: true,
      ariaLabel: d.getAttribute('aria-label'),
      ariaLabelledby: d.getAttribute('aria-labelledby'),
      ariaDescribedby: d.getAttribute('aria-describedby'),
      activeCls: document.activeElement?.className,
      activeTag: document.activeElement?.tagName.toLowerCase(),
      dialogRect: (() => { const r = d.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
      dialogBg: cs.backgroundColor,
      imgBg: img ? getComputedStyle(img).backgroundColor : null,
      imgRect: ir ? { w: Math.round(ir.width), h: Math.round(ir.height) } : null,
      imgAlt: img?.getAttribute('alt'),
      caption: d.querySelector('p')?.textContent,
      backdrop: (() => { try { return getComputedStyle(d, '::backdrop').backgroundColor; } catch { return null; } })(),
      pFs: getComputedStyle(d.querySelector('p')).fontSize,
    };
  });
  const shotOpen = `artifacts/desktop/dialog-${theme}.png`;
  await shot(page, shotOpen);
  // focus trap: tab a few times and see if focus stays inside
  const trap = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    trap.push(await page.evaluate(() => ({ tag: document.activeElement?.tagName.toLowerCase(), inDialog: !!document.activeElement?.closest('dialog') })));
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => ({
    open: !!document.querySelector('dialog[open]'),
    activeCls: document.activeElement?.className,
    activeTag: document.activeElement?.tagName.toLowerCase(),
    backToTrigger: !!document.activeElement?.classList?.contains('figure-zoom'),
  }));
  return { beforeActive, opened, trap, closed, screenshot: shotOpen };
}

/** Reduced-motion / prefers-reduced-motion behaviour. */
async function motionProbe(browser, { reduced }) {
  const ctx = await browser.newContext({ baseURL: LOCAL, viewport: { width: 1440, height: 900 }, locale: 'zh-CN', timezoneId: 'Asia/Shanghai', colorScheme: 'light', reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await goto(page, PAGES.os2);
  await warm(page);
  const data = await page.evaluate(() => {
    const q = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { fs: cs.fontSize, transition: cs.transitionDuration, animation: cs.animationName, animationDuration: cs.animationDuration, scrollBehavior: cs.scrollBehavior };
    };
    return {
      mediaReduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      htmlScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
      samples: {
        'progress': q('progress[data-study-progress]'),
        'toolbar': q('.study-toolbar'),
        'figure-zoom': q('.figure-zoom'),
        'primary/a in content': q('.md-typeset a'),
        'md-header': q('.md-header'),
        'details summary': q('details.exercise-answer summary'),
        'md-search__form': q('.md-search__form'),
        'md-top': q('.md-top'),
        'md-nav__link': q('.md-nav__link'),
      },
      animated: [...document.querySelectorAll('body *')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.animationName !== 'none' && cs.animationDuration !== '0s';
      }).length,
      moving: [...document.querySelectorAll('body *')].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.transitionDuration !== '0s' && cs.transitionProperty !== 'none';
      }).map((el) => el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '')).slice(0, 12),
    };
  });
  await ctx.close();
  return data;
}

/** CLS / LCP via PerformanceObserver. */
async function perfProbe(deviceKey) {
  const s = await session(deviceKey);
  await s.page.addInitScript(() => {
    window.__perf = { cls: 0, shifts: [], lcp: 0, lcpEl: null, longTasks: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) {
            window.__perf.cls += e.value;
            window.__perf.shifts.push({ v: Math.round(e.value * 10000) / 10000, t: Math.round(e.startTime), src: (e.sources || []).map((s) => (s.node ? s.node.tagName + '.' + (typeof s.node.className === 'string' ? s.node.className.split(/\s+/)[0] : '') : '')).slice(0, 3) });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        const e = list.getEntries().at(-1);
        window.__perf.lcp = Math.round(e.startTime);
        window.__perf.lcpEl = e.element ? e.element.tagName.toLowerCase() + '.' + (typeof e.element.className === 'string' ? e.element.className.split(/\s+/)[0] : '') + ' "' + (e.element.textContent || '').trim().slice(0, 30) + '"' : null;
        window.__perf.lcpSize = e.size;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { window.__perf.longTasks += list.getEntries().length; }).observe({ type: 'longtask', buffered: true });
    } catch (e) { window.__perf.err = String(e); }
  });
  await goto(s.page, PAGES.os2);
  await s.page.waitForTimeout(1200);
  await warm(s.page);
  await s.page.waitForTimeout(600);
  const out = await s.page.evaluate(() => ({
    ...window.__perf,
    cls: Math.round(window.__perf.cls * 10000) / 10000,
    domContentLoaded: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0),
    load: Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd || 0),
    transferKB: Math.round((performance.getEntriesByType('resource').reduce((n, r) => n + (r.transferSize || 0), 0) || 0) / 1024),
    resources: performance.getEntriesByType('resource').length,
  }));
  await s.close();
  return out;
}

// ---------------------------------------------------------------- collect
async function collect() {
  const R = { meta: { member: 'qa-desktop', env: 'local', baseUrl: LOCAL, generatedAt: new Date().toISOString(), playwright: (await import('playwright/package.json', { with: { type: 'json' } }).catch(() => ({ default: { version: 'unknown' } }))).default.version }, matrix: {}, dark: {}, search: {}, keyboard: {}, semantic: {}, zoom200: {}, motion: {}, typography: {}, perf: {}, screenshots: [], gaps: [] };
  const push = (p) => { if (p) R.screenshots.push(p); };

  // ---- matrix: 4 devices x 2 themes x 3 pages
  for (const d of DESKTOPS) {
    for (const theme of ['light', 'dark']) {
      const s = await session(d);
      const key = `${d}/${theme}`;
      R.matrix[key] = {};
      for (const [pname, pathName] of [['home', PAGES.home], ['os2', PAGES.os2], ['lab', PAGES.lab]]) {
        await goto(s.page, pathName);
        await warm(s.page);
        if (theme === 'dark') await setDark(s.page);
        R.matrix[key][pname] = {
          layout: await layout(s.page),
          a11y: await a11y(s.page),
          contrastViolations: await contrast(s.page),
          type: await typeFacts(s.page),
        };
      }
      await s.close();
      console.log(`matrix ${key} done`);
    }
  }

  // ---- typography per device (light)
  for (const d of DESKTOPS) {
    R.typography[d] = R.matrix[`${d}/light`].os2.type;
    R.typography[d].h1detail = await (async () => {
      const s = await session(d);
      await goto(s.page, PAGES.os2);
      const o = await s.page.evaluate(() => {
        const h1 = document.querySelector('.md-typeset h1');
        const cs = getComputedStyle(h1);
        return { id: h1.id, fs: cs.fontSize, clampDeclared: 'clamp(1.85rem, 3vw, 2.65rem)', matches_h1_top: !!document.querySelector('h1#_top'), h1Calculated: h1.getBoundingClientRect().height };
      });
      await s.close();
      return o;
    })();
  }

  // ---- dark surfaces / hardcoded light scan + screenshots at 1440
  {
    const s = await session('desktop-1440');
    // light reference
    await goto(s.page, PAGES.os2); await warm(s.page);
    R.dark.os2Light = await surfaces(s.page, ['.md-header', '.md-search__form', '.md-nav__title', '.figure-zoom', '.zoom-hint', '.study-toolbar', 'details.exercise-answer', '.md-typeset th', '.md-typeset td', '.md-typeset blockquote', '.md-typeset :not(pre) > code', '.md-typeset pre', '.md-typeset p', '.exercise-item']);
    await s.page.evaluate(() => document.querySelector('.figure-zoom')?.scrollIntoView({ block: 'center' }));
    await s.page.waitForTimeout(300);
    push(await shot(s.page, 'artifacts/desktop/figure-light-1440.png'));
    await shotElement(s.page, '.figure-zoom', 'artifacts/desktop/figure-el-light.png');
    push('artifacts/desktop/figure-el-light.png');
    R.dark.h2Spacing = await headingSpacing(s.page);
    R.dark.h1Selector = await s.page.evaluate(() => ({ h1Id: document.querySelector('.md-typeset h1')?.id, hasTopId: !!document.querySelector('h1#_top') }));

    // dark
    await goto(s.page, PAGES.os2); await warm(s.page);
    R.dark.switch1440 = await setDark(s.page);
    R.dark.bodySchemeAttr = await s.page.evaluate(() => ({ html: document.documentElement.getAttribute('data-md-color-scheme'), body: document.body.getAttribute('data-md-color-scheme'), bodyBg: getComputedStyle(document.body).backgroundColor, meta: document.querySelector('meta[name="color-scheme"]')?.content ?? null, themeColor: document.querySelector('meta[name="theme-color"]')?.content ?? null }));
    R.dark.os2Dark = await surfaces(s.page, ['.md-header', '.md-search__form', '.md-nav__title', '.figure-zoom', '.zoom-hint', '.study-toolbar', 'details.exercise-answer', '.md-typeset th', '.md-typeset td', '.md-typeset blockquote', '.md-typeset :not(pre) > code', '.md-typeset pre', '.md-typeset p', '.exercise-item', 'progress[data-study-progress]']);
    R.dark.os2DarkLightSurfaces = await lightSurfaces(s.page);
    R.dark.os2DarkContrast = await contrast(s.page);
    await s.page.evaluate(() => document.querySelector('.figure-zoom')?.scrollIntoView({ block: 'center' }));
    await s.page.waitForTimeout(300);
    push(await shot(s.page, 'artifacts/desktop/figure-dark-1440.png'));
    await shotElement(s.page, '.figure-zoom', 'artifacts/desktop/figure-el-dark.png');
    push('artifacts/desktop/figure-el-dark.png');
    // h2 spacing screenshot (viewport-relative clip)
    const h2clip = await s.page.evaluate(() => {
      const hs = document.querySelectorAll('.md-typeset h2');
      const h = hs[1] || hs[0];
      h.scrollIntoView({ block: 'center' });
      return null;
    });
    await s.page.waitForTimeout(350);
    const h2box = await s.page.evaluate(() => {
      const hs = document.querySelectorAll('.md-typeset h2');
      const h = hs[1] || hs[0];
      const r = h.getBoundingClientRect();
      const vh = window.innerHeight, vw = window.innerWidth;
      const x = Math.max(0, Math.round(r.left - 24));
      const y = Math.max(0, Math.round(r.top - 110));
      const width = Math.max(40, Math.min(760, vw - x - 8));
      const height = Math.max(40, Math.min(260, vh - y - 8));
      return { x, y, width, height };
    });
    push(await shot(s.page, 'artifacts/desktop/h2-spacing-dark.png', { clip: h2box }));
    // toolbar shot
    await s.page.evaluate(() => document.querySelector('.study-toolbar')?.scrollIntoView({ block: 'center' }));
    await s.page.waitForTimeout(250);
    push(await shot(s.page, 'artifacts/desktop/toolbar-dark-1440.png'));
    // dialog dark
    R.dark.dialogDark = await dialogProbe(s.page, 'dark');
    push(R.dark.dialogDark.screenshot);

    // lab dark
    await goto(s.page, PAGES.lab); await warm(s.page);
    R.dark.labDark = await surfaces(s.page, ['.scheduler', '.lab-controls label', '.scheduler input', '.primary-link', '.lab-buttons button[type=reset]', '.lab-metrics', '.gantt-block', '.gantt', '.lab-results table th', '.lab-results table td', '.lab-results']);
    R.dark.labDarkLightSurfaces = await lightSurfaces(s.page);
    await s.page.evaluate(() => document.querySelector('.scheduler')?.scrollIntoView({ block: 'start' }));
    await s.page.waitForTimeout(300);
    push(await shot(s.page, 'artifacts/desktop/lab-dark-1440.png'));
    // home dark
    await goto(s.page, PAGES.home); await warm(s.page);
    R.dark.homeDark = await surfaces(s.page, ['.md-header', '.md-search__form', '.md-nav__title', 'progress[data-study-progress]', '.md-footer', '.md-typeset blockquote', '.md-typeset th']);
    R.dark.homeDarkLightSurfaces = await lightSurfaces(s.page);
    push(await shot(s.page, 'artifacts/desktop/home-dark-1440.png'));
    await s.close();
  }
  // light counterparts for home / lab
  {
    const s = await session('desktop-1440');
    await goto(s.page, PAGES.home); await warm(s.page);
    R.dark.homeLight = await surfaces(s.page, ['.md-header', '.md-search__form', '.md-nav__title', 'progress[data-study-progress]', '.md-footer']);
    push(await shot(s.page, 'artifacts/desktop/home-light-1440.png'));
    await goto(s.page, PAGES.lab); await warm(s.page);
    R.dark.labLight = await surfaces(s.page, ['.scheduler', '.lab-controls label', '.primary-btn', '.lab-metrics', '.gantt-block', '.lab-results table th']);
    await s.page.evaluate(() => document.querySelector('.scheduler')?.scrollIntoView({ block: 'start' }));
    await s.page.waitForTimeout(300);
    push(await shot(s.page, 'artifacts/desktop/lab-light-1440.png'));
    await s.close();
  }

  // ---- search
  for (const [d, theme] of [['desktop-1280', 'light'], ['desktop-1280', 'dark'], ['desktop-1440', 'dark']]) {
    const s = await session(d);
    await goto(s.page, PAGES.os2);
    if (theme === 'dark') await setDark(s.page);
    R.search[`${d}/${theme}`] = await searchProbe(s.page, theme);
    push(R.search[`${d}/${theme}`].screenshot);
    await s.close();
    console.log(`search ${d}/${theme} done`);
  }

  // ---- keyboard (light + dark)
  for (const theme of ['light', 'dark']) {
    const s = await session('desktop-1440');
    await goto(s.page, PAGES.os2); await warm(s.page);
    if (theme === 'dark') await setDark(s.page);
    const walk = await tabWalk(s.page, 45);
    R.keyboard[`${theme}/tabwalk`] = walk;
    // skip link screenshot after focusing it via reload + first tab
    await goto(s.page, PAGES.os2);
    if (theme === 'dark') await setDark(s.page);
    await s.page.keyboard.press('Tab');
    await s.page.waitForTimeout(300);
    R.keyboard[`${theme}/skipLink`] = await s.page.evaluate(() => {
      const el = document.activeElement;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), cls: el.className, href: el.getAttribute('href'), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, opacity: cs.opacity, outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, transform: cs.transform, targetId: (el.getAttribute('href') || '').replace(/^#/, ''), targetExists: (() => { const h = el.getAttribute('href') || ''; return h.startsWith('#') ? !!document.getElementById(h.slice(1)) : false; })(), position: cs.position };
    });
    push(await shot(s.page, `artifacts/desktop/skiplink-${theme}.png`, { clip: { x: 0, y: 0, width: 420, height: 120 } }));
    // dialog + details keyboard
    R.keyboard[`${theme}/dialog`] = await dialogProbe(s.page, theme);
    R.keyboard[`${theme}/details`] = await (async () => {
      await goto(s.page, PAGES.os2);
      const det = await s.page.evaluate(() => { const d = document.querySelector('details.exercise-answer'); d?.scrollIntoView({ block: 'center' }); return { exists: !!d, open: d?.open }; });
      const summarySel = 'details.exercise-answer > summary';
      await s.page.focus(summarySel);
      const before = await s.page.evaluate(() => document.querySelector('details.exercise-answer').open);
      await s.page.keyboard.press('Enter');
      await s.page.waitForTimeout(200);
      const afterEnter = await s.page.evaluate(() => document.querySelector('details.exercise-answer').open);
      await s.page.keyboard.press('Space');
      await s.page.waitForTimeout(200);
      const afterSpace = await s.page.evaluate(() => document.querySelector('details.exercise-answer').open);
      return { ...det, before, afterEnter, afterSpace, keyboardToggles: before !== afterEnter && afterEnter !== afterSpace };
    })();
    await s.close();
    console.log(`keyboard ${theme} done`);
  }

  // ---- semantic
  {
    const s = await session('desktop-1440');
    await goto(s.page, PAGES.os2); await warm(s.page);
    R.semantic.os2 = await s.page.evaluate(() => {
      const imgs = [...document.querySelectorAll('.md-content__inner img')].map((i) => ({ src: (i.currentSrc || i.src).split('/').pop(), alt: i.getAttribute('alt'), inDialog: !!i.closest('dialog'), w: Math.round(i.getBoundingClientRect().width), natural: { w: i.naturalWidth, h: i.naturalHeight }, lazy: i.getAttribute('loading') }));
      const dialog = document.querySelector('.image-dialog');
      const saveStatus = document.querySelector('.save-status');
      const skip = document.querySelector('.md-skip');
      const links = [...document.querySelectorAll('.md-content a')].map((a) => ({ text: (a.textContent || '').trim().slice(0, 30), ariaLabel: a.getAttribute('aria-label'), title: a.getAttribute('title'), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') }));
      const headerlinks = [...document.querySelectorAll('.md-typeset .headerlink')].slice(0, 3).map((a) => ({ text: a.textContent, ariaLabel: a.getAttribute('aria-label'), title: a.getAttribute('title'), textContentTrim: (a.textContent || '').trim() }));
      return {
        imgCount: imgs.length,
        imgsWithAlt: imgs.filter((i) => i.alt && i.alt.trim()).length,
        imgsEmptyAlt: imgs.filter((i) => !i.alt || !i.alt.trim()),
        dialog: { ariaLabel: dialog?.getAttribute('aria-label'), ariaLabelledby: dialog?.getAttribute('aria-labelledby'), ariaDescribedby: dialog?.getAttribute('aria-describedby'), closeText: dialog?.querySelector('button')?.textContent?.trim() },
        saveStatus: { role: saveStatus?.getAttribute('role'), ariaLive: saveStatus?.getAttribute('aria-live'), fs: saveStatus ? getComputedStyle(saveStatus).fontSize : null },
        skip: { href: skip?.getAttribute('href'), text: skip?.textContent?.trim(), target: (() => { const h = skip?.getAttribute('href') || ''; return h.startsWith('#') ? !!document.getElementById(h.slice(1)) : false; })() },
        headerlinks,
        externalLinksNoRel: links.filter((l) => /^https?:/.test(l.href || '') && (!l.rel || !/noopener/.test(l.rel))).slice(0, 5),
        a11y: null,
        lang: document.documentElement.lang,
        progress: [...document.querySelectorAll('progress[data-study-progress]')].map((p) => ({ value: p.value, max: p.max, ariaLabel: p.getAttribute('aria-label'), labelledby: p.getAttribute('aria-labelledby'), text: p.parentElement?.textContent?.trim().slice(0, 40) })),
        landmarks: [...document.querySelectorAll('header,nav,main,footer')].map((e) => e.tagName.toLowerCase() + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : '')),
        h1: [...document.querySelectorAll('h1')].map((h) => ({ id: h.id, text: h.textContent.trim().slice(0, 30) })),
        headingOrder: [...document.querySelectorAll('.md-typeset h1,.md-typeset h2,.md-typeset h3')].slice(0, 25).map((h) => h.tagName),
      };
    });
    // aria snapshot of dialog (playwright >=1.49)
    try {
      await s.page.focus('.figure-zoom');
      await s.page.keyboard.press('Enter');
      await s.page.waitForTimeout(400);
      R.semantic.dialogAriaSnapshot = await s.page.locator('dialog[open]').ariaSnapshot();
      await s.page.keyboard.press('Escape');
    } catch (e) { R.semantic.dialogAriaSnapshot = `unavailable: ${e.message.slice(0, 120)}`; }
    // tab order sanity: native order of header controls
    R.semantic.diagnostics = diagnostics(s);
    await s.close();
  }

  // ---- 200% zoom (640x512 @2x)
  {
    const s = await session(custom({ width: 640, height: 512 }, { deviceScaleFactor: 2, label: '200% zoom 640x512@2x' }));
    await goto(s.page, PAGES.os2); await warm(s.page);
    R.zoom200 = {
      layout: await layout(s.page),
      tapTargets: await tapTargets(s.page),
      a11y: await a11y(s.page),
      facts: await s.page.evaluate(() => ({
        innerWidth: window.innerWidth,
        rootFs: getComputedStyle(document.documentElement).fontSize,
        drawerVisible: getComputedStyle(document.querySelector('input[data-md-toggle="drawer"]')).display,
        toolbarRect: (() => { const el = document.querySelector('.study-toolbar'); const r = el?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; })(),
        toolbarScroll: (() => { const el = document.querySelector('.study-toolbar'); return el ? { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth } : null; })(),
        figureScroll: (() => { const el = document.querySelector('.figure-zoom'); return el ? { clientWidth: el.clientWidth, scrollWidth: el.scrollWidth } : null; })(),
        tableMode: (() => { const t = document.querySelector('.md-typeset table'); if (!t) return null; const cs = getComputedStyle(t); return { display: cs.display, overflowX: cs.overflowX, clientWidth: t.clientWidth, scrollWidth: t.scrollWidth }; })(),
        searchForm: (() => { const el = document.querySelector('.md-search__form'); const r = el?.getBoundingClientRect(); return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null; })(),
      })),
    };
    await s.page.evaluate(() => document.querySelector('.study-toolbar')?.scrollIntoView({ block: 'start' }));
    await s.page.waitForTimeout(250);
    R.zoom200.screenshot = await shot(s.page, 'artifacts/desktop/zoom200-os2.png');
    push(R.zoom200.screenshot);
    await s.close();
  }

  // ---- reduced motion
  {
    const s = await session('desktop-1440');
    R.motion.normal = await motionProbe(s.browser, { reduced: false });
    R.motion.reduced = await motionProbe(s.browser, { reduced: true });
    await s.close();
  }

  // ---- perf
  R.perf['desktop-1440'] = await perfProbe('desktop-1440');
  R.perf['desktop-1280'] = await perfProbe('desktop-1280');

  await saveJSON('artifacts/desktop/raw.json', R);
  console.log('\n== SUMMARY ==');
  for (const k of Object.keys(R.matrix)) {
    const m = R.matrix[k];
    console.log(`${k}: os2 contrast=${m.os2.contrastViolations.length} clipped=${m.os2.a11y.imagesMissingAlt} lab contrast=${m.lab.contrastViolations.length}`);
  }
  console.log('dark light surfaces os2:', JSON.stringify(R.dark.os2DarkLightSurfaces?.slice(0, 8)));
  console.log('dark light surfaces lab:', JSON.stringify(R.dark.labDarkLightSurfaces?.slice(0, 8)));
  console.log('h2 spacing:', JSON.stringify(R.dark.h2Spacing?.slice(0, 3)));
  console.log('search 1280:', JSON.stringify(R.search['desktop-1280/light']?.panel));
  console.log('dialog dark:', JSON.stringify({ ...R.dark.dialogDark?.opened, closed: R.dark.dialogDark?.closed, trap: R.dark.dialogDark?.trap }));
  console.log('motion reduced:', JSON.stringify(R.motion.reduced?.samples));
  console.log('perf:', JSON.stringify(R.perf));
  console.log('wrote artifacts/desktop/raw.json');
}

// ---------------------------------------------------------------- dump
async function dump() {
  const fs = await import('node:fs/promises');
  const j = JSON.parse(await fs.readFile('qa/artifacts/desktop/recon.json', 'utf8'));
  const pad = (v, n) => String(v).padEnd(n);
  console.log('\n== per-device typography ==');
  console.log(pad('device', 14) + pad('root', 6) + pad('body', 6) + pad('contentW', 10) + pad('chars', 7) + pad('.875rem', 9) + pad('1.55rem', 9) + pad('h2fs', 6) + pad('h2mt', 6));
  for (const d of DESKTOPS) {
    const t = j.devices[d]?.os2?.type;
    if (!t) continue;
    console.log(pad(d, 14) + pad(t.rootFontSize, 6) + pad(t.paragraphFontSize, 6) + pad(t.contentWidth?.w, 10) + pad(t.cjkCharsPerLine, 7) + pad(t.remExamples['0.875rem'], 9) + pad(t.remExamples['1.55rem'], 9) + pad(t.h2?.[1]?.fs ?? t.h2?.[0]?.fs, 6) + pad(t.h2?.[1]?.mt ?? t.h2?.[0]?.mt, 6));
  }
  console.log('\n== per-device overflow / clipped ==');
  for (const d of DESKTOPS) {
    const r = j.devices[d];
    for (const k of ['home', 'os2', 'lab']) {
      const l = r?.[k]?.layout;
      if (!l) continue;
      console.log(`${pad(d, 14)}${pad(k, 6)} docW=${pad(l.docScrollWidth, 6)} vw=${pad(l.viewport.width, 6)} hOverflow=${pad(l.horizontalOverflow, 6)} tablesOver=${pad(l.tablesOverflowing, 4)} offenders=${l.overflowOffenders.length} clipped=${l.clipped.length}`);
      if (l.overflowOffenders.length) console.log('    offenders:', JSON.stringify(l.overflowOffenders.slice(0, 4)));
      if (l.clipped.length) console.log('    clipped:', JSON.stringify(l.clipped.slice(0, 4)));
      if (l.tablesOverflowing) console.log('    tables:', JSON.stringify(l.tables.slice(0, 3)));
    }
  }
  console.log('\n== dark switch ==');
  for (const d of DESKTOPS) {
    const ds = j.devices[d]?.darkSwitch;
    if (!ds) continue;
    console.log(`${pad(d, 14)} method=${pad(ds.method, 22)} before=${pad(ds.before.schemeAttr, 8)} labelHidden=${pad(ds.before.labelHasHiddenAttr, 6)} labelRect=${JSON.stringify(ds.before.labelRect)} radioChecked=${ds.before.radioChecked} -> after.scheme=${ds.after.schemeAttr} bodyBg=(${ds.lightBodyBg} -> ${ds.after.bodyBg})`);
  }
  console.log('\n== system prefers-color-scheme ==');
  console.log(JSON.stringify(j.dark, null, 1));
  console.log('\n== typography counts (os2) ==');
  for (const d of DESKTOPS) {
    const c = j.devices[d]?.os2?.type?.counts;
    if (c) console.log(`${pad(d, 14)} ${JSON.stringify(c)}`);
  }
  console.log('\n== a11y (os2 + home) ==');
  for (const d of DESKTOPS) {
    for (const k of ['home', 'os2']) {
      const a = j.devices[d]?.[k]?.a11y;
      if (!a) continue;
      console.log(`${pad(d, 14)}${pad(k, 6)} h1=${a.h1count} jumps=${a.headingJumps.length} imgNoAlt=${a.imagesMissingAlt} broken=${a.brokenImages} focusable=${a.focusableCount} iconOnly=${a.iconOnlyControls} skip=${a.skipLink} root=${a.fontSizes.root} p=${a.fontSizes.paragraph}`);
      if (a.headingJumps.length) console.log('    jumps:', a.headingJumps.slice(0, 4));
    }
  }
  console.log('\n== contrast os2 (light) ==');
  for (const d of DESKTOPS) {
    const c = j.devices[d]?.os2?.contrastMetrics ?? null;
    if (c) console.log(d, JSON.stringify(c));
  }
  console.log('\n== structure: os2Styles key rows ==');
  for (const sel of ['.md-skip', '.md-search__form', '.md-search__input', '.md-nav__title', '.md-typeset th', '.md-typeset p', '.md-typeset blockquote', '.md-typeset :not(pre) > code', '.figure-zoom', '.zoom-hint', '.study-toolbar', '.study-toolbar .save-status', 'details.exercise-answer > summary', '.md-content__inner']) {
    const r = j.structure?.os2Styles?.[sel];
    console.log(pad(sel, 40) + (r ? `fs=${pad(r.fontSize, 9)} color=${pad(r.color, 24)} bg=${pad(r.backgroundColor, 24)} mt=${pad(r.marginTop, 6)} mb=${pad(r.marginBottom, 6)} pt=${pad(r.paddingTop, 6)} bt=${pad(r.borderTopWidth, 5)} overflow=${r.overflow}` : 'null'));
  }
  console.log('\n== structure: labStyles key rows ==');
  for (const [sel, r] of Object.entries(j.structure?.labStyles || {})) {
    console.log(pad(sel, 34) + (r ? `fs=${pad(r.fontSize, 9)} color=${pad(r.color, 22)} bg=${pad(r.backgroundColor, 22)} opacity=${pad(r.opacity, 5)} h=${r.rect?.h}` : 'null'));
  }
  console.log('\n== structure: labAria ==');
  console.log(JSON.stringify(j.structure?.labAria));
  console.log('\n== diagnostics ==');
  console.log(JSON.stringify(j.diagnostics));
}

// ---------------------------------------------------------------- inspect
async function inspect() {
  const fs = await import('node:fs/promises');
  const R = JSON.parse(await fs.readFile('qa/artifacts/desktop/raw.json', 'utf8'));
  const pad = (v, n) => String(v ?? '').padEnd(n);
  const log = (s) => console.log(s);

  log('\n### contrast violations (light) os2 / lab');
  for (const k of Object.keys(R.matrix)) {
    const m = R.matrix[k];
    for (const p of ['home', 'os2', 'lab']) {
      const v = m[p].contrastViolations;
      if (!v.length) continue;
      log(`${k} ${p}: ${JSON.stringify(v.map((x) => ({ el: x.el, text: x.text.slice(0, 18), color: x.color, bg: x.bg, px: x.px, ratio: x.ratio, need: x.need })))}`);
    }
  }

  log('\n### light vs dark surfaces (1440, os2)');
  const L = R.dark.os2Light || {}, D = R.dark.os2Dark || {};
  for (const sel of Object.keys(L)) {
    const l = L[sel], d = D[sel];
    log(pad(sel, 34) + 'L ' + pad(`bg=${l?.ownBg} vsBd=${l?.surfaceVsBackdrop} fg=${l?.fgOnBackdrop}`, 46) + '| D ' + `bg=${d?.ownBg} vsBd=${d?.surfaceVsBackdrop} fg=${d?.fgOnBackdrop} light?=${d?.isLightSurface}`);
  }
  log('\n### lab surfaces light vs dark');
  const LL = R.dark.labLight || {}, LD = R.dark.labDark || {};
  for (const sel of Object.keys(LD)) {
    log(pad(sel, 32) + 'L ' + pad(`${LL[sel]?.ownBg}`, 26) + '| D ' + pad(`${LD[sel]?.ownBg}`, 26) + `vsBd=${LD[sel]?.surfaceVsBackdrop} fg=${LD[sel]?.fgOnBackdrop} light?=${LD[sel]?.isLightSurface}`);
  }
  log('\n### home surfaces light vs dark');
  const HL = R.dark.homeLight || {}, HD = R.dark.homeDark || {};
  for (const sel of Object.keys(HD)) log(pad(sel, 34) + 'L ' + pad(HL[sel]?.ownBg, 26) + '| D ' + pad(HD[sel]?.ownBg, 26) + `vsBd=${HD[sel]?.surfaceVsBackdrop} fg=${HD[sel]?.fgOnBackdrop}`);

  log('\n### dark scheme detection');
  log(JSON.stringify(R.dark.bodySchemeAttr));
  log('switch method: ' + R.dark.switch1440?.method + ' before label hidden=' + R.dark.switch1440?.before?.labelHasHiddenAttr + ' rect=' + JSON.stringify(R.dark.switch1440?.before?.labelRect));

  log('\n### typography per device');
  for (const [d, t] of Object.entries(R.typography)) {
    log(`${pad(d, 14)} root=${pad(t.rootFontSize, 4)} bodyP=${pad(t.paragraphFontSize, 4)} inner=${pad(t.innerFontSize, 4)} .875rem=${pad(t.remExamples['0.875rem'], 6)} 1.55rem=${pad(t.remExamples['1.55rem'], 6)} contentW=${pad(t.contentWidth?.w, 6)} chars=${pad(t.cjkCharsPerLine, 4)} h1=${pad(t.h1?.[0]?.fs, 5)} id=${pad(t.h1detail?.id, 4)} matches#h1_top=${t.h1detail?.matches_h1_top} tables=${t.counts.tables} figs=${t.counts.figureZoom} whiteFigs=${t.counts.figureZoomWithWhiteBg}`);
  }

  log('\n### keyboard tab walk (light)');
  const walk = R.keyboard['light/tabwalk'] || [];
  for (const s of walk) {
    if (s.none) { log(`${pad(s.step, 3)} NO MORE (${s.tag})`); break; }
    const flag = !s.ringVisible ? '  <== RING NOT VISIBLE' : '';
    const clip = s.clippedBy ? `  <== CLIPPED by ${s.clippedBy.ancestor} ${s.clippedBy.overflow} ${s.clippedBy.clippedPx}px` : '';
    log(`${pad(s.step, 3)} ${pad(s.tag, 7)} ${pad(s.cls.slice(0, 22), 23)} ${pad(s.name.slice(0, 20), 21)} ${pad(s.rect.w + 'x' + s.rect.h, 9)} ${pad(s.outline, 26)} vis=${pad(s.ringVisible, 5)} scrollY=${s.scrollY}${flag}${clip}`);
  }
  log('\n### tab walk raw flags (dark)');
  const wd = R.keyboard['dark/tabwalk'] || [];
  log('same order? ' + (JSON.stringify(wd.map((s) => s.cls)) === JSON.stringify(walk.map((s) => s.cls))));
  log('not visible: ' + JSON.stringify(wd.filter((s) => !s.ringVisible && !s.none).map((s) => s.tag + '.' + s.cls + ' ' + s.rect.w + 'x' + s.rect.h + ' op=' + s.opacity)));
  log('clipped: ' + JSON.stringify(wd.filter((s) => s.clippedBy).map((s) => ({ s: s.step, el: s.tag + '.' + s.cls, by: s.clippedBy }))));

  log('\n### skip link');
  log(JSON.stringify(R.keyboard['light/skipLink']));
  log(JSON.stringify(R.keyboard['dark/skipLink']));

  log('\n### dialog keyboard');
  log('light: ' + JSON.stringify({ before: R.keyboard['light/dialog']?.beforeActive, opened: { ...R.keyboard['light/dialog']?.opened, activeCls: R.keyboard['light/dialog']?.opened?.activeCls }, closed: R.keyboard['light/dialog']?.closed }));
  log('details: ' + JSON.stringify(R.keyboard['light/details']));

  log('\n### semantic');
  log(JSON.stringify({ imgCount: R.semantic.os2?.imgCount, withAlt: R.semantic.os2?.imgsWithAlt, emptyAlt: R.semantic.os2?.imgsEmptyAlt, dialog: R.semantic.os2?.dialog, saveStatus: R.semantic.os2?.saveStatus, skip: R.semantic.os2?.skip, headerlinks: R.semantic.os2?.headerlinks, progress: R.semantic.os2?.progress, h1: R.semantic.os2?.h1, headingOrder: R.semantic.os2?.headingOrder?.slice(0, 12), extNoRel: R.semantic.os2?.externalLinksNoRel }, null, 1));
  log('aria snapshot: ' + String(R.semantic.dialogAriaSnapshot).slice(0, 400));

  log('\n### search');
  for (const [k, v] of Object.entries(R.search)) log(k + ' ' + JSON.stringify(v.placeholder) + ' panel=' + JSON.stringify(v.panel));

  log('\n### zoom200');
  log(JSON.stringify({ hOverflow: R.zoom200.layout?.horizontalOverflow, offenders: R.zoom200.layout?.overflowOffenders, clipped: R.zoom200.layout?.clipped, tablesOver: R.zoom200.layout?.tablesOverflowing, tables: R.zoom200.layout?.tables?.slice(0, 3), facts: R.zoom200.facts, tap: R.zoom200.tapTargets?.slice(0, 10), tapCount: R.zoom200.tapTargets?.length }, null, 1));

  log('\n### motion');
  log('normal samples: ' + JSON.stringify(R.motion.normal?.samples));
  log('normal moving count: ' + R.motion.normal?.moving?.length + ' ' + JSON.stringify(R.motion.normal?.moving));
  log('reduced: ' + JSON.stringify(R.motion.reduced?.samples));
  log('reduced moving count: ' + R.motion.reduced?.moving?.length + ' animated=' + R.motion.reduced?.animated);

  log('\n### perf');
  log(JSON.stringify(R.perf, null, 1));

  log('\n### screenshots');
  log(JSON.stringify(R.screenshots, null, 1));
}

// ---------------------------------------------------------------- probe2 (targeted follow-ups)
async function probe2() {
  const out = {};
  const s = await session('desktop-1440');
  const logs = [], reqs = [], fails = [];
  s.page.on('console', (m) => logs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
  s.page.on('pageerror', (e) => logs.push(`pageerror: ${String(e).slice(0, 200)}`));
  s.page.on('response', (r) => { if (/search|worker|json/.test(r.url())) reqs.push({ url: r.url().replace(LOCAL, ''), status: r.status() }); });
  s.page.on('requestfailed', (r) => fails.push({ url: r.url().replace(LOCAL, ''), err: r.failure()?.errorText }));

  await goto(s.page, PAGES.os2); await warm(s.page);

  // A. palette radio geometry + whether the visible label shows a focus ring
  await s.page.keyboard.press('Tab'); // skip link
  await s.page.keyboard.press('Tab'); // logo
  await s.page.keyboard.press('Tab'); // palette radio
  await s.page.waitForTimeout(250);
  out.palette = await s.page.evaluate(() => {
    const act = document.activeElement;
    const cs = act ? getComputedStyle(act) : null;
    const r = act ? act.getBoundingClientRect() : null;
    const labels = [...document.querySelectorAll('.md-header__option label')].map((l) => {
      const lcs = getComputedStyle(l);
      const lr = l.getBoundingClientRect();
      return { for: l.getAttribute('for'), hidden: l.hasAttribute('hidden'), display: lcs.display, outline: `${lcs.outlineWidth} ${lcs.outlineStyle} ${lcs.outlineColor}`, opacity: lcs.opacity, rect: { w: Math.round(lr.width), h: Math.round(lr.height) } };
    });
    const opts = [...document.querySelectorAll('.md-option')].map((i) => {
      const ics = getComputedStyle(i);
      const ir = i.getBoundingClientRect();
      return { id: i.id, checked: i.checked, fs: ics.fontSize, opacity: ics.opacity, position: ics.position, clip: ics.clipPath, rect: { w: Math.round(ir.width), h: Math.round(ir.height) }, outline: `${ics.outlineWidth} ${ics.outlineStyle} ${ics.outlineColor}` };
    });
    return { tag: act?.tagName.toLowerCase(), id: act?.id, cls: act?.className, rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null, outline: cs ? `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor} offset ${cs.outlineOffset}` : null, labels, opts };
  });
  out.paletteScreenshot = await shot(s.page, 'artifacts/desktop/focus-theme-toggle.png', { clip: { x: 1180, y: 0, width: 260, height: 60 } });

  // keyboard activation of the theme toggle actually works?
  const schemeBefore = await s.page.evaluate(() => document.body.getAttribute('data-md-color-scheme'));
  await s.page.keyboard.press('ArrowRight');
  await s.page.waitForTimeout(300);
  const schemeAfter = await s.page.evaluate(() => ({ body: document.body.getAttribute('data-md-color-scheme'), bg: getComputedStyle(document.body).backgroundColor }));
  out.paletteKeyboard = { schemeBefore, schemeAfter };
  await s.page.keyboard.press('ArrowLeft');
  await s.page.waitForTimeout(300);

  // B. code block surfaces
  out.code = await s.page.evaluate(() => {
    const q = (sel) => { const el = document.querySelector(sel); if (!el) return null; const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, fs: cs.fontSize, display: cs.display }; };
    return {
      light: null,
      pre: q('.md-typeset pre'),
      preCode: q('.md-typeset pre > code'),
      highlight: q('.md-typeset .highlight'),
      highlightPre: q('.md-typeset .highlight pre'),
      inlineCode: q('.md-typeset :not(pre) > code'),
      codeButton: q('.md-code__button'),
    };
  });
  await s.page.evaluate(() => { const pre = document.querySelector('.md-typeset pre'); pre?.scrollIntoView({ block: 'center' }); });
  await s.page.waitForTimeout(400);
  out.codeScreenshotLight = await shot(s.page, 'artifacts/desktop/code-light.png', { clip: { x: 240, y: 120, width: 780, height: 300 } });

  // H. headerlink focus visibility
  await s.page.evaluate(() => { document.querySelector('.md-typeset h2')?.scrollIntoView({ block: 'center' }); });
  await s.page.waitForTimeout(250);
  await s.page.focus('.md-typeset h2 .headerlink');
  await s.page.waitForTimeout(350);
  out.headerlink = await s.page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { cls: el.className, opacity: cs.opacity, visibility: cs.visibility, color: cs.color, rect: { w: Math.round(r.width), h: Math.round(r.height) }, outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, title: el.getAttribute('title'), ariaLabel: el.getAttribute('aria-label') };
  });
  out.headerlinkScreenshot = await shot(s.page, 'artifacts/desktop/focus-headerlink.png', { clip: { x: 240, y: 60, width: 780, height: 140 } });

  // I. search scrollwrap tabindex + search functionality
  out.searchWrap = await s.page.evaluate(() => {
    const w = document.querySelector('.md-search__scrollwrap');
    const o = document.querySelector('.md-search__output');
    const r = w?.getBoundingClientRect();
    return { tabindex: w?.getAttribute('tabindex'), role: w?.getAttribute('role'), rect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null, outputOverflow: o ? getComputedStyle(o).overflow : null, outputH: o ? Math.round(o.getBoundingClientRect().height) : null };
  });

  reqs.length = 0; logs.length = 0;
  await s.page.locator('.md-search__input').click();
  await s.page.waitForTimeout(400);
  await s.page.keyboard.type('进程', { delay: 80 });
  await s.page.waitForTimeout(3000);
  out.searchState = await s.page.evaluate(() => {
    const input = document.querySelector('.md-search__input');
    const list = document.querySelector('.md-search-result__list');
    const meta = document.querySelector('.md-search-result__meta');
    const out = document.querySelector('.md-search__output');
    return { value: input?.value, metaText: meta?.textContent?.trim(), metaHtml: meta?.innerHTML?.slice(0, 120), listChildren: list?.children.length, listHtmlLen: list?.innerHTML?.length, outputH: out ? Math.round(out.getBoundingClientRect().height) : null, searchRootState: document.querySelector('.md-search')?.getAttribute('data-md-state'), config: typeof window.__md_search === 'object' };
  });
  // force a native input event to rule out synthetic-typing quirks
  await s.page.evaluate(() => {
    const input = document.querySelector('.md-search__input');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await s.page.waitForTimeout(2500);
  out.searchStateAfterDispatch = await s.page.evaluate(() => {
    const list = document.querySelector('.md-search-result__list');
    const meta = document.querySelector('.md-search-result__meta');
    const out = document.querySelector('.md-search__output');
    return { metaText: meta?.textContent?.trim(), listChildren: list?.children.length, outputH: out ? Math.round(out.getBoundingClientRect().height) : null };
  });
  out.searchNet = reqs.slice(0, 12);
  out.searchFails = fails.slice(0, 12);
  out.searchLogs = logs.slice(0, 12);
  await s.page.keyboard.press('Escape');

  // D. search icon colours (light)
  out.searchIcon = await s.page.evaluate(() => {
    const icon = document.querySelector('.md-search__options label, .md-search__icon');
    const svg = document.querySelector('.md-search__icon svg');
    const cs = icon ? getComputedStyle(icon) : null;
    return { color: cs?.color, fill: svg ? getComputedStyle(svg).fill : null, inputPlaceholder: getComputedStyle(document.querySelector('.md-search__input'), '::placeholder').color, formBg: getComputedStyle(document.querySelector('.md-search__form')).backgroundColor };
  });
  await shot(s.page, 'artifacts/desktop/search-idle-light.png', { clip: { x: 1150, y: 0, width: 290, height: 52 } });

  // F. table cell font size + th/body surface delta at 1920
  await s.close();

  const s2 = await session('desktop-1920');
  await goto(s2.page, PAGES.os2); await warm(s2.page);
  out.type1920 = await s2.page.evaluate(() => {
    const h1 = document.querySelector('.md-typeset h1');
    const h2 = document.querySelector('.md-typeset h2');
    const th = document.querySelector('.md-typeset th');
    const td = document.querySelector('.md-typeset td');
    const table = document.querySelector('.md-typeset table');
    const p = [...document.querySelectorAll('.md-content__inner > p')].find((e) => parseFloat(getComputedStyle(e).fontSize) === 16);
    const cs = (e) => (e ? getComputedStyle(e) : null);
    return {
      root: cs(document.documentElement).fontSize,
      h1: { fs: cs(h1).fontSize, id: h1.id },
      h2: { fs: cs(h2).fontSize },
      th: { fs: cs(th).fontSize },
      td: { fs: cs(td).fontSize },
      table: { fs: cs(table).fontSize, display: cs(table).display },
      bodyP: { fs: p ? cs(p).fontSize : null },
      inner: cs(document.querySelector('.md-typeset')).fontSize,
      toolbar: cs(document.querySelector('.study-toolbar')).fontSize,
      tableRuleDeclared: '0.9em of 16px = 14.4px',
    };
  });
  out.tableScreenshot = await shot(s2.page, 'artifacts/desktop/table-1920.png', { clip: { x: 300, y: 150, width: 900, height: 320 } });
  await s2.close();
  await saveJSON('artifacts/desktop/probe2.json', out);
  console.log(JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- probe3 (idle search, code blocks, live spot-check)
async function probe3() {
  const out = {};
  const s = await session('desktop-1440');
  const ctxReqs = [];
  s.context.on('request', (r) => ctxReqs.push(r.url().replace(LOCAL, '').replace(LIVE, 'LIVE:')));
  s.context.on('requestfailed', (r) => ctxReqs.push('FAILED ' + r.url().slice(0, 120) + ' ' + r.failure()?.errorText));

  const idle = async (theme) => {
    await goto(s.page, PAGES.os2);
    await warm(s.page);
    if (theme === 'dark') { await setDark(s.page); await s.page.waitForTimeout(400); }
    const m = await s.page.evaluate(() => {
      const form = document.querySelector('.md-search__form');
      const input = document.querySelector('.md-search__input');
      const iconLabel = document.querySelector('.md-search__form .md-search__icon');
      const svg = document.querySelector('.md-search__form svg');
      const ph = getComputedStyle(input, '::placeholder');
      const iconCs = iconLabel ? getComputedStyle(iconLabel) : null;
      const svgCs = svg ? getComputedStyle(svg) : null;
      const parse = (c) => { const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m2, n) => n - m2); return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100; };
      const blend = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
      const bg = parse(getComputedStyle(form).backgroundColor);
      const phC = parse(ph.color), iconC = parse(iconCs?.color || 'rgba(0,0,0,1)');
      const r = form.getBoundingClientRect();
      return {
        formBg: getComputedStyle(form).backgroundColor,
        formRect: { w: Math.round(r.width), h: Math.round(r.height) },
        placeholder: { color: ph.color, fs: ph.fontSize, ratio: phC ? ratio(blend(phC, bg), bg) : null },
        icon: { color: iconCs?.color, ratio: iconC ? ratio(blend(iconC, bg), bg) : null, fill: svgCs?.fill, rect: iconLabel ? (() => { const ir = iconLabel.getBoundingClientRect(); return { w: Math.round(ir.width), h: Math.round(ir.height) }; })() : null },
        inputColor: getComputedStyle(input).color,
        inputFs: getComputedStyle(input).fontSize,
        bodyScheme: document.body.getAttribute('data-md-color-scheme'),
      };
    });
    const name = theme === 'dark' ? 'artifacts/desktop/search-idle-dark.png' : 'artifacts/desktop/search-idle-light.png';
    await shot(s.page, name, { clip: { x: 940, y: 0, width: 420, height: 50 } });
    return { ...m, screenshot: name };
  };
  out.searchIdleLight = await idle('light');
  out.searchIdleDark = await idle('dark');

  // code blocks in dark
  out.codeDark = await s.page.evaluate(() => {
    const pre = document.querySelector('.md-typeset pre');
    pre?.scrollIntoView({ block: 'center' });
    const cs = (sel) => { const el = document.querySelector(sel); if (!el) return null; const c = getComputedStyle(el); return { bg: c.backgroundColor, color: c.color, fs: c.fontSize }; };
    return {
      scheme: document.body.getAttribute('data-md-color-scheme'),
      codeBgVar: getComputedStyle(document.body).getPropertyValue('--md-code-bg-color').trim(),
      pre: cs('.md-typeset pre'),
      preCode: cs('.md-typeset pre > code'),
      inline: cs('.md-typeset :not(pre) > code'),
      highlight: cs('.md-typeset .highlight'),
      preColor: cs('.md-typeset pre > code')?.color,
    };
  });
  await s.page.waitForTimeout(400);
  out.codeDarkScreenshot = await shot(s.page, 'artifacts/desktop/code-dark.png', { clip: { x: 240, y: 100, width: 780, height: 340 } });

  // search functionality with context-level network visible
  ctxReqs.length = 0;
  await goto(s.page, PAGES.os2);
  await s.page.locator('.md-search__input').click();
  await s.page.waitForTimeout(500);
  await s.page.keyboard.type('进程', { delay: 100 });
  await s.page.waitForTimeout(6000);
  out.searchLong = await s.page.evaluate(() => {
    const list = document.querySelector('.md-search-result__list');
    const meta = document.querySelector('.md-search-result__meta');
    const out = document.querySelector('.md-search__output');
    const input = document.querySelector('.md-search__input');
    return { value: input?.value, meta: meta?.textContent?.trim(), items: list?.children.length, outputH: out ? Math.round(out.getBoundingClientRect().height) : null, firstItemText: list?.children[0]?.textContent?.trim().slice(0, 60) };
  });
  out.searchNetLong = ctxReqs.filter((u) => /search|worker|lunr|json/i.test(u)).slice(0, 15);
  out.searchNetAll = ctxReqs.slice(0, 25);
  await s.page.keyboard.press('Escape');
  await s.close();

  // live spot check
  try {
    const s2 = await session('desktop-1440', { base: LIVE });
    await goto(s2.page, PAGES.os2, { wait: 'load' });
    await s2.page.waitForTimeout(2500);
    out.live = await s2.page.evaluate(() => {
      const form = document.querySelector('.md-search__form');
      const ph = getComputedStyle(document.querySelector('.md-search__input'), '::placeholder').color;
      const h1 = document.querySelector('.md-typeset h1');
      const h2 = document.querySelector('.md-typeset h2');
      return {
        title: document.title,
        root: getComputedStyle(document.documentElement).fontSize,
        h1: h1 ? { fs: getComputedStyle(h1).fontSize, id: h1.id } : null,
        h2: h2 ? { fs: getComputedStyle(h2).fontSize, mt: getComputedStyle(h2).marginTop, bt: getComputedStyle(h2).borderTopWidth } : null,
        placeholder: ph,
        formBg: form ? getComputedStyle(form).backgroundColor : null,
        figureBg: (() => { const f = document.querySelector('.figure-zoom'); return f ? getComputedStyle(f).backgroundColor : null; })(),
        scheme: document.body.getAttribute('data-md-color-scheme'),
        beacon: !!document.querySelector('script[src*="beacon"], script[src*="cloudflareinsights"]'),
      };
    });
    await s2.page.locator('.md-search__input').click().catch(() => {});
    await s2.page.keyboard.type('进程', { delay: 100 });
    await s2.page.waitForTimeout(5000);
    out.live.search = await s2.page.evaluate(() => {
      const list = document.querySelector('.md-search-result__list');
      const meta = document.querySelector('.md-search-result__meta');
      return { meta: meta?.textContent?.trim(), items: list?.children.length };
    });
    await s2.close();
  } catch (e) { out.live = { error: String(e).slice(0, 300) }; }

  await saveJSON('artifacts/desktop/probe3.json', out);
  console.log(JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- probe4 (dark code census, search variants, h2 gaps)
async function probe4() {
  const out = {};
  const s = await session('desktop-1440');
  await goto(s.page, PAGES.os2); await warm(s.page);
  await setDark(s.page);
  await s.page.waitForTimeout(400);
  out.darkCodeCensus = await s.page.evaluate(() => {
    const parse = (c) => { const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rows = [];
    for (const el of document.querySelectorAll('code')) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const c = parse(cs.backgroundColor);
      rows.push({
        inPre: !!el.closest('pre'),
        parent: el.parentElement ? el.parentElement.tagName.toLowerCase() + (el.parentElement.className && typeof el.parentElement.className === 'string' ? '.' + el.parentElement.className.trim().split(/\s+/)[0] : '') : null,
        bg: cs.backgroundColor,
        lum: c ? Math.round(lum(c) * 1000) / 1000 : null,
        display: cs.display,
        rect: { w: Math.round(r.width), h: Math.round(r.height) },
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
      });
    }
    return { total: rows.length, lightCount: rows.filter((r) => r.lum > 0.5).length, sampleLight: rows.filter((r) => r.lum > 0.5).slice(0, 14), sampleDark: rows.filter((r) => r.lum <= 0.5).slice(0, 3) };
  });
  out.darkSurfacesCensus = await s.page.evaluate(() => {
    const parse = (c) => { const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const rows = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('dialog') || ['SCRIPT', 'STYLE', 'IMG', 'SVG', 'PATH', 'CODE'].includes(el.tagName)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const c = parse(cs.backgroundColor);
      if (!c || c.a < 0.9 || lum(c) <= 0.5) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      rows.push({ tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? el.className : '', bg: cs.backgroundColor, area: Math.round(r.width * r.height), text: (el.textContent || '').trim().slice(0, 20) });
    }
    return rows.sort((a, b) => b.area - a.area).slice(0, 12);
  });

  out.h2Gaps = await s.page.evaluate(() => [...document.querySelectorAll('.md-typeset h2')].map((h) => {
    let prev = h.previousElementSibling;
    while (prev && prev.getBoundingClientRect().height < 1) prev = prev.previousElementSibling;
    const pr = prev ? prev.getBoundingClientRect() : null;
    const r = h.getBoundingClientRect();
    return { text: h.textContent.trim().slice(0, 22), prev: prev ? prev.tagName : null, gap: pr ? Math.round((r.top - pr.bottom) * 10) / 10 : null };
  }));
  out.h3Gaps = await s.page.evaluate(() => [...document.querySelectorAll('.md-typeset h3')].slice(0, 8).map((h) => {
    let prev = h.previousElementSibling;
    while (prev && prev.getBoundingClientRect().height < 1) prev = prev.previousElementSibling;
    const pr = prev ? prev.getBoundingClientRect() : null;
    const r = h.getBoundingClientRect();
    return { text: h.textContent.trim().slice(0, 20), prev: prev ? prev.tagName : null, gap: pr ? Math.round((r.top - pr.bottom) * 10) / 10 : null };
  }));

  const trySearch = async (label, fn) => {
    await goto(s.page, PAGES.os2);
    await s.page.locator('.md-search__input').click();
    await s.page.waitForTimeout(600);
    await fn();
    await s.page.waitForTimeout(4500);
    const r = await s.page.evaluate(() => {
      const list = document.querySelector('.md-search-result__list');
      const meta = document.querySelector('.md-search-result__meta');
      const out = document.querySelector('.md-search__output');
      return { value: document.querySelector('.md-search__input')?.value, meta: meta?.textContent?.trim(), items: list?.children.length, outputH: out ? Math.round(out.getBoundingClientRect().height) : null };
    });
    await s.page.keyboard.press('Escape');
    return { label, ...r };
  };
  out.searchVariants = [];
  out.searchVariants.push(await trySearch('type-fork', async () => { await s.page.keyboard.type('fork', { delay: 90 }); }));
  out.searchVariants.push(await trySearch('type-cjk', async () => { await s.page.keyboard.type('进程', { delay: 90 }); }));
  out.searchVariants.push(await trySearch('fill-cjk', async () => { await s.page.locator('.md-search__input').fill('进程'); }));
  out.workerInfo = await s.page.evaluate(() => ({ inputHasComponent: document.querySelector('.md-search__input')?.getAttribute('data-md-component'), formHasComponent: document.querySelector('.md-search__form')?.getAttribute('data-md-component'), searchRoot: document.querySelector('.md-search')?.getAttribute('data-md-component'), searchMode: document.querySelector('.md-search')?.getAttribute('data-md-mode') }));
  await s.close();
  await saveJSON('artifacts/desktop/probe4.json', out);
  console.log(JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- probe5 (why do some code blocks stay light in dark?)
async function probe5() {
  const s = await session('desktop-1440');
  await goto(s.page, PAGES.os2); await warm(s.page);
  await setDark(s.page);
  await s.page.waitForTimeout(400);
  const out = await s.page.evaluate(() => {
    const parse = (c) => { const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const isLight = (el) => { const c = parse(getComputedStyle(el).backgroundColor); return c && c.a > 0.9 && lum(c) > 0.5; };
    const lightCodes = [...document.querySelectorAll('code')].filter(isLight);
    const chainOf = (el) => {
      const chain = [];
      let p = el;
      while (p && p !== document.documentElement) {
        const cs = getComputedStyle(p);
        chain.push({
          tag: p.tagName.toLowerCase(),
          cls: typeof p.className === 'string' ? p.className.trim().slice(0, 50) : '',
          scheme: p.getAttribute && p.getAttribute('data-md-color-scheme'),
          mdCodeBg: cs.getPropertyValue('--md-code-bg-color').trim(),
          mdDefaultBg: cs.getPropertyValue('--md-default-bg-color').trim(),
          color: cs.color,
          style: (p.getAttribute && p.getAttribute('style') || '').slice(0, 80),
        });
        p = p.parentElement;
      }
      return chain;
    };
    const sample = lightCodes.slice(0, 3).map((el) => ({ text: (el.textContent || '').trim().slice(0, 30), ownBg: getComputedStyle(el).backgroundColor, ownColor: getComputedStyle(el).color, chain: chainOf(el).slice(0, 8) }));
    const darkSample = [...document.querySelectorAll('code')].find((el) => !isLight(el) && el.closest('pre'));
    return {
      lightCount: lightCodes.length,
      lightTextSamples: lightCodes.map((el) => (el.textContent || '').trim().slice(0, 16)),
      sample,
      darkPreSample: darkSample ? { text: (darkSample.textContent || '').trim().slice(0, 30), bg: getComputedStyle(darkSample).backgroundColor, chain: chainOf(darkSample).slice(0, 6) } : null,
      bodyVars: (() => { const cs = getComputedStyle(document.body); return { codeBg: cs.getPropertyValue('--md-code-bg-color').trim(), defaultBg: cs.getPropertyValue('--md-default-bg-color').trim(), fg: cs.getPropertyValue('--md-default-fg-color').trim(), typesetColor: cs.getPropertyValue('--md-typeset-color')?.trim(), scheme: document.body.getAttribute('data-md-color-scheme') }; })(),
    };
  });
  // screenshot one light code block in dark
  const box = await s.page.evaluate(() => {
    const parse = (c) => { const m = (c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/); return m ? { r: +m[1], g: +m[2], b: +m[3] } : null; };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const el = [...document.querySelectorAll('code')].find((e) => { const c = parse(getComputedStyle(e).backgroundColor); return c && lum(c) > 0.5 && e.closest('pre'); });
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    return null;
  });
  await s.page.waitForTimeout(400);
  out.screenshot = await shot(s.page, 'artifacts/desktop/code-lightblock-in-dark.png', { clip: { x: 240, y: 80, width: 900, height: 320 } });
  await s.close();
  await saveJSON('artifacts/desktop/probe5.json', out);
  console.log(JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- probe6 (code inside opened exercise answer)
async function probe6() {
  const s = await session('desktop-1440');
  await goto(s.page, PAGES.os2); await warm(s.page);
  await setDark(s.page);
  await s.page.waitForTimeout(400);
  const found = await s.page.evaluate(() => {
    const d = [...document.querySelectorAll('details.exercise-answer')].find((x) => /mutex\.value/.test(x.textContent || ''));
    if (!d) return null;
    d.open = true;
    return true;
  });
  await s.page.waitForTimeout(500);
  const out = await s.page.evaluate((found) => {
    const d = [...document.querySelectorAll('details.exercise-answer')].find((x) => /mutex\.value/.test(x.textContent || ''));
    if (!d) return { found };
    const code = [...d.querySelectorAll('pre > code, code')].find((c) => /mutex\.value/.test(c.textContent || ''));
    if (!code) return { found, detail: 'no code' };
    code.scrollIntoView({ block: 'center' });
    const cs = getComputedStyle(code);
    const r = code.getBoundingClientRect();
    const pre = code.closest('pre');
    return {
      found,
      open: d.open,
      codeBg: cs.backgroundColor,
      codeColor: cs.color,
      codeVar: cs.getPropertyValue('--md-code-bg-color').trim(),
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      preBg: pre ? getComputedStyle(pre).backgroundColor : null,
      scheme: document.body.getAttribute('data-md-color-scheme'),
    };
  }, found);
  await s.page.waitForTimeout(500);
  out.screenshot = await shot(s.page, 'artifacts/desktop/code-in-answer-dark.png', { clip: { x: 240, y: 100, width: 900, height: 340 } });
  await s.close();
  await saveJSON('artifacts/desktop/probe6.json', out);
  console.log(JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- extra screenshots for keyboard findings
async function extraShots() {
  const s = await session('desktop-1440');
  await goto(s.page, PAGES.os2); await warm(s.page);
  await s.page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  for (let i = 0; i < 5; i++) await s.page.keyboard.press('Tab');
  await s.page.waitForTimeout(350);
  await shot(s.page, 'artifacts/desktop/focus-searchwrap.png', { clip: { x: 560, y: 0, width: 880, height: 70 } });
  // nav ring clipped at scrollwrap bottom (walk until an ancestor clips the ring)
  await goto(s.page, PAGES.os2);
  await s.page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  let hit = null;
  for (let i = 0; i < 80 && !hit; i++) {
    await s.page.keyboard.press('Tab');
    hit = await s.page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.classList || !el.classList.contains('md-nav__link')) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const ow = parseFloat(cs.outlineWidth) || 0;
      const oo = parseFloat(cs.outlineOffset) || 0;
      if (!(ow > 0 && cs.outlineStyle !== 'none')) return null;
      const ring = { left: r.left - oo - ow, top: r.top - oo - ow, right: r.right + oo + ow, bottom: r.bottom + oo + ow };
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const pcs = getComputedStyle(p);
        if (pcs.overflowX !== 'visible' || pcs.overflowY !== 'visible') {
          const pr = p.getBoundingClientRect();
          const over = Math.max(0, pr.left - ring.left) + Math.max(0, ring.right - pr.right) + Math.max(0, pr.top - ring.top) + Math.max(0, ring.bottom - pr.bottom);
          if (over > 1) return { text: (el.textContent || '').trim().slice(0, 24), over: Math.round(over * 10) / 10, ancestor: p.className, side: pr.left > 700 ? 'right' : 'left' };
        }
        p = p.parentElement;
      }
      return null;
    });
    if (hit) hit.step = i + 1;
  }
  console.log('nav clip hit:', JSON.stringify(hit));
  await s.page.waitForTimeout(350);
  await shot(s.page, 'artifacts/desktop/focus-nav-clipped.png', hit && hit.side === 'right'
    ? { clip: { x: 1150, y: 430, width: 290, height: 340 } }
    : { clip: { x: 0, y: 430, width: 300, height: 340 } });
  await saveJSON('artifacts/desktop/focus-nav-clip.json', hit || {});
  await s.close();
  console.log('extra shots ok');
}

// ---------------------------------------------------------------- verify (search: insertText vs keyup)
async function verifySearch() {
  const out = {};
  const s = await session('desktop-1440');
  const count = async () => s.page.evaluate(() => {
    const list = document.querySelector('.md-search-result__list');
    const meta = document.querySelector('.md-search-result__meta');
    const outEl = document.querySelector('.md-search__output');
    return { items: list ? list.children.length : 0, meta: meta ? meta.textContent.trim() : null, outputH: outEl ? Math.round(outEl.getBoundingClientRect().height) : null };
  });
  await goto(s.page, PAGES.os2);
  await s.page.locator('.md-search__input').click();
  await s.page.waitForTimeout(400);
  await s.page.keyboard.insertText('进程调度');
  await s.page.waitForTimeout(3000);
  out.insertTextOnly = await count();
  await s.page.keyboard.press('Space');
  await s.page.waitForTimeout(3000);
  out.afterKeyup = await count();
  await s.page.keyboard.press('Escape');

  // direct query URL
  await goto(s.page, '/?q=进程调度');
  await s.page.waitForTimeout(3500);
  out.directQueryUrl = await count();
  out.queryInputValue = await s.page.evaluate(() => document.querySelector('.md-search__input')?.value || null);
  await s.close();
  await saveJSON('artifacts/desktop/verify-search.json', out);
  console.log(JSON.stringify(out, null, 1));
}

// ---------------------------------------------------------------- render: reports/desktop.json + desktop.md
const DEVICE_LABEL = {
  'desktop-1280': '笔记本 1280x800',
  'desktop-1366': '笔记本 1366x768',
  'desktop-1440': '桌面 1440x900',
  'desktop-1920': '桌面 1920x1080',
};

function findings() {
  return [
    {
      id: 'DSK-01',
      title: '搜索检索由 keyup 驱动：insertText / 部分 IME 提交路径不会即时触发检索（自动化输入陷阱，非站点缺陷）',
      severity: 'P3',
      scope: 'upstream',
      category: 'interaction',
      device: 'desktop-1440（4 档同）',
      url: `${LOCAL}/chapters/chapter-2/ 与 ${LOCAL}/?q=进程调度`,
      steps: [
        '打开 /chapters/chapter-2/，点击搜索框',
        '用 CDP insertText 一次写入「进程调度」（等价于 IME 一次提交，不含逐字 keyup）并等 3 秒',
        '补按一次空格（产生 keyup）再看结果；另直接访问 /?q=进程调度',
      ],
      expected: '中文查询应正常返回结果；检索不应依赖某一个键盘事件类型',
      actual: '仅 insertText：结果 0 条、文案停在「键入以开始搜索」、面板 36px；补一次 keyup 后：8 条结果、面板 675px；直接访问 /?q=进程调度：8 条结果、输入框回填「进程调度」。说明中文搜索**可用**，索引与 lunr.zh 分词均正常；先前把「中文搜不到」判为站点缺陷是自动化输入方式造成的假阳性',
      measurements: {
        insertTextOnlyItems: 0,
        insertTextOnlyPanelPx: 36,
        insertTextOnlyMeta: '键入以开始搜索',
        afterOneKeyupItems: 8,
        afterOneKeyupPanelPx: 675,
        afterOneKeyupMeta: '8 个符合条件的结果',
        directQueryUrlItems: 8,
        queryInputValue: '进程调度',
        searchIndexJsonBytes: 437774,
        realImeNote: '真实中文输入法提交后通常仍会有 keyup（或至少一次按键），因此真实用户路径正常',
      },
      evidence: ['artifacts/desktop/verify-search.json', 'artifacts/desktop/search-light.png'],
      source: 'Material 9.7.7 搜索以 keyup 事件驱动（bundle.d7400e89.min.js）；Playwright 的 keyboard.type 对非 ASCII 走 CDP Input.insertText，不产生 keyup',
      fix: '站点无需修改。若要让检索更稳，可在输入框上再监听 compositionend/input 做一次防抖检索（Material 上游行为，非必须）；QA 侧中文检索应改用 keyboard.type 后补一次按键，或用 /?q= 直达 URL 验证。',
    },
    {
      id: 'DSK-02',
      title: '深色主题下每张插图都套着纯白容器（17.56:1 的亮块）',
      severity: 'P2',
      scope: 'site',
      category: 'interaction',
      device: 'desktop-1440（1280/1366/1920 同）；深色主题',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开 /chapters/chapter-2/', '点右上角月亮图标 label[for="__palette_1"] 进入深色', '滚动到任一插图（进程三态图）'],
      expected: '插图画框与外层深色卡片保持同一表面体系，只在图片内容区域保留白底',
      actual: '插图按钮 .figure-zoom 计算样式 background: rgb(255,255,255)，页面背景 rgb(24,25,29)，表面/背景对比度 17.56:1；章内 4/4 张插图全部如此，单张白块面积 326454–457504 px²。叠加的 .zoom-hint 也是硬编码 rgb(241,244,250)',
      measurements: {
        figureZoomBgDark: 'rgb(255, 255, 255)',
        pageBgDark: 'rgb(24, 25, 29)',
        surfaceVsBackdrop: 17.56,
        figuresPerChapter: 4,
        figuresWithWhiteBg: 4,
        whiteAreasPx2: [457504, 378877, 335180, 326454],
        zoomHintBg: 'rgb(241, 244, 250)（两种主题相同）',
        zoomHintVsFrame: 1.1,
        lightThemeSurfaceVsBackdrop: 1,
      },
      evidence: ['artifacts/desktop/figure-dark-1440.png', 'artifacts/desktop/figure-el-dark.png', 'artifacts/desktop/figure-light-1440.png'],
      source: 'notes.css:74 `.figure-zoom{...background:white}`；notes.css:76 `.zoom-hint{background:#f1f4fa;color:#4c586f}`',
      fix: '容器改用 var(--note-surface) 并在深色下加 1px 边框；白底图片用一个内层 <img> 保留白底（或深色下给图片容器 background:#fff 但容器本身跟随主题）；.zoom-hint 改用 accent/muted token。',
    },
    {
      id: 'DSK-03',
      title: '章节标题间距被清零：16 个 h2 中 15 个与前文只隔 14–16px，且无分隔线',
      severity: 'P2',
      scope: 'site',
      category: 'typography',
      device: 'desktop-1280 / 1366 / 1440 / 1920（light+dark 同）',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开 /chapters/chapter-2/', '观察 h2「1 顺序执行与并发执行（1.1、1.2）」与上方段落的间距', '对比 notes.css:53 声明的 margin-top:2.8rem + border-top:1px'],
      expected: 'notes.css:53 的设计是 h2 前 2.8rem（56px）留白 + 1px 分隔线，形成章节分块',
      actual: 'h2 计算样式 margin-top:0、padding-top:0、border-top-width:0（被后面同选择器覆盖）；实测与前一段落视觉间距 14–16px，h3 最小 0px（h3 紧跟 h2 时）。31px 的大标题前只有 16px 空隙，页面 20823px 高、16 个 h2 全部受影响',
      measurements: {
        h2Count: 16,
        h2GapPx: [14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 30],
        h2GapLe16px: 15,
        h2MarginTop: '0px',
        h2PaddingTop: '0px',
        h2BorderTopWidth: '0px',
        h2FontSizePx: 31,
        h3MarginTop: '0px',
        h3MinGapPx: 0,
        pageHeightPx: 20823,
      },
      evidence: ['artifacts/desktop/h2-spacing-dark.png'],
      source: 'notes.css:123 `.md-typeset.chapter-prose h2{font-size:1.55rem;margin:0;padding:0;border:0}` 与 notes.css:124 h3{margin:0}，覆盖 notes.css:53/54',
      fix: '删掉 notes.css:123-124 的 margin/padding/border 归零（或改成只保留 font-size），让 53/54 行的 2.8rem/2rem 与 1px 分隔线生效；h3 用 margin-top:2rem、h2 用 2.8rem。',
    },
    {
      id: 'DSK-04',
      title: '根字号 20px 下 .875rem=17.5px：工具条等辅助文字比正文 16px 还大',
      severity: 'P2',
      scope: 'site',
      category: 'typography',
      device: 'desktop-1280 / 1366 / 1440（root 20px）、desktop-1920（root 22px）',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开 /chapters/chapter-2/', '量「本章已复习 / 字号」工具条字号与正文段落字号', '对比 1920 档'],
      expected: '辅助 UI 文字应小于或等于正文（阅读层级：标题 > 正文 > 辅助）',
      actual: '.study-toolbar 17.5px（1920 档 19.25px）vs 正文 16px，相对正文 +9.4%（1920 +20.3%）；同类还有 .lab-controls label 17.5px、.image-dialog p 17.5px、.save-status 16px。根字号来自 Material html{font-size:125%}（1920 档 137.5%），而 notes.css 把 rem 当 px 写',
      measurements: {
        rootFontSizePx: { d1280: 20, d1366: 20, d1440: 20, d1920: 22 },
        bodyParagraphPx: 16,
        studyToolbarPx: { d1280: 17.5, d1366: 17.5, d1440: 17.5, d1920: 19.25 },
        deltaVsBodyPct: { d1440: 9.4, d1920: 20.3 },
        labControlsLabelPx: 17.5,
        dialogCaptionPx: 17.5,
        saveStatusPx: 16,
        remExamplesPx: { '0.8rem': 16, '0.875rem': 17.5, '0.75rem': 15, '1.55rem': 31 },
      },
      evidence: ['artifacts/desktop/toolbar-dark-1440.png', 'artifacts/desktop/lab-dark-1440.png'],
      source: 'notes.css:61（.study-toolbar font-size:.875rem）、notes.css:92（.lab-controls label .875rem）、notes.css:80（.image-dialog p .875rem）、notes.css:68（.save-status .8rem）',
      fix: '把这些辅助字号改成 px（13–14px）或相对正文的 em；若坚持 rem，则同时把 html 根字号锁成 16px 并重算全部 rem 值。',
    },
    {
      id: 'DSK-05',
      title: 'h1 的选择器永远不命中，1920 档 h2 反比 h1 大 6.6%',
      severity: 'P2',
      scope: 'site',
      category: 'typography',
      device: 'desktop-1280 / 1366 / 1440 / 1920',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开 /chapters/chapter-2/ 与首页 /', '检查 h1 的 id 与 notes.css:49 的 `h1#_top` 是否匹配', '量 h1 与 h2 的计算字号'],
      expected: '页面主标题字号最大：notes.css:49 声明 clamp(1.85rem, 3vw, 2.65rem)，在 1280–1920 应得 37–53px',
      actual: '章节页 h1 为 `<h1 id="2">`、首页为 `<h1 id="_1">`，`h1#_top` 匹配数 0，声明从未生效；h1 落到 Material 默认 2em=32px（四档宽度都是 32px）。h2 被 notes.css:123 定为 1.55rem → 1440 档 31px（h1 32px，几乎同号），1920 档 34.1px，**大于 h1 的 32px**',
      measurements: {
        h1SelectorMatches: 0,
        h1IdChapter: '2',
        h1IdHome: '_1',
        h1FontSizePx: 32,
        h2FontSizePx: { d1280: 31, d1366: 31, d1440: 31, d1920: 34.1 },
        h2OverH1PctAt1920: 6.6,
        h1OverH2PctAt1440: 3.2,
        declaredClamp: 'clamp(1.85rem, 3vw, 2.65rem) → 37px–53px',
        rootFontSizePxAt1920: 22,
      },
      evidence: ['artifacts/desktop/table-1920.png', 'artifacts/desktop/home-light-1440.png'],
      source: 'notes.css:49 `h1#_top{font-size:clamp(...)}` 与真实 DOM `h1#[页面slug]` 不匹配',
      fix: '改成 `.md-typeset h1` 或 `#_top, .md-typeset h1`（并保留 !important 之外的最低特异性）；同时把 h2 的 1.55rem 降到 ≤1.4rem，保证 h1 > h2。',
    },
    {
      id: 'DSK-06',
      title: '浅色主题搜索框占位文字与放大镜几乎不可见（1.07:1 / 1.10:1）',
      severity: 'P2',
      scope: 'site',
      category: 'a11y',
      device: 'desktop-1280 / 1366 / 1440 / 1920；浅色主题（深色正常）',
      url: `${LOCAL}/`,
      steps: ['打开首页 /（浅色主题）', '看右上角搜索框：placeholder「搜索」与放大镜', '切到深色对比'],
      expected: '占位文字对比度 ≥4.5:1（WCAG 1.4.3），至少肉眼可辨',
      actual: 'placeholder 计算色 rgba(255,255,255,0.7)（Material 的深色页头前景），而 .md-search__form 背景被改成 rgb(243,244,246) → 混合后 1.07:1（Lead 独立量得 1.06:1）；放大镜 svg fill rgb(255,255,255) 对同一背景 1.10:1。深色主题同一元素在 rgb(36,37,43) 上为 8.19:1 / 15.28:1，完全正常',
      measurements: {
        placeholderColor: 'rgba(255, 255, 255, 0.7)',
        formBgLight: 'rgb(243, 244, 246)',
        placeholderRatioLight: 1.07,
        iconFillLight: 'rgb(255, 255, 255)',
        iconRatioLight: 1.1,
        formBgDark: 'rgb(36, 37, 43)',
        placeholderRatioDark: 8.19,
        iconRatioDark: 15.28,
        inputTextColorLight: 'rgb(36, 40, 51)',
        requiredRatio: 4.5,
      },
      evidence: ['artifacts/desktop/search-idle-light.png', 'artifacts/desktop/search-idle-dark.png', 'artifacts/desktop/home-light-1440.png'],
      source: 'notes.css:164 `.md-search__form{background:var(--note-muted-surface)}` 只换了底色，未覆盖 Material 的 `--md-primary-bg-color`（页头前景色）→ placeholder/图标仍是白色',
      fix: '在同一处补 `.md-search__input::placeholder{color:var(--note-muted)}` 和 `.md-search__form .md-search__icon{color:var(--note-muted);fill:currentColor}`，或直接覆盖 --md-primary-bg-color: var(--note-text)。',
    },
    {
      id: 'DSK-07',
      title: '搜索关闭时 Tab 序列里有一个不可见停靠点（688×0，焦点环被裁 458px）',
      severity: 'P2',
      scope: 'upstream',
      category: 'a11y',
      device: 'desktop-1440（其它宽度同）',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开任意章节页，焦点放到页面开头', '连按 5 次 Tab', '观察第 5 站：文档无任何视觉变化'],
      expected: '每一次 Tab 都应落到可见控件上并有可见焦点指示（WCAG 2.4.7）',
      actual: '第 5 站是 div.md-search__scrollwrap（tabindex="0"），尺寸 688×0，父级 .md-search__output overflow:hidden 且高度 0，焦点环按几何算被裁掉 458px。键盘用户在此处"消失"，必须再按一次 Tab 才能继续',
      measurements: {
        tabStopIndex: 5,
        element: 'div.md-search__scrollwrap',
        tabindex: '0',
        rect: '688x0',
        ancestorOverflow: '.md-search__output overflow:hidden',
        clippedPx: 458,
        visibleFocusIndicator: false,
      },
      evidence: ['artifacts/desktop/focus-searchwrap.png'],
      source: 'Material 搜索面板把结果滚动容器设为 tabindex="0"，收起态高度 0（bundle.d7400e89.min.js + main.*.min.css）；站点未做修正',
      fix: '收起态给 `.md-search__scrollwrap{visibility:hidden}` 或在该状态下移除 tabindex（JS 切换 open 状态时同步），或用 `:focus-visible` 兜底给父级 outline。',
    },
    {
      id: 'DSK-08',
      title: '深色主题放大弹窗仍给图片铺纯白底（1312×481 白块）',
      severity: 'P3',
      scope: 'site',
      category: 'interaction',
      device: 'desktop-1440；深色主题；点击插图后',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['深色主题下点击第一张插图（label[for="__palette_1"] 切深色）', '弹窗打开后观察图片区域'],
      expected: '弹窗主体与图片容器共用深色表面，只有图片内容自身是白底',
      actual: 'dialog 背景 rgb(24,25,29)，其中 img 计算背景 rgb(255,255,255)，尺寸 1312×481，与弹窗主体对比 17.56:1；弹窗宽 1354、高 643。弹窗 aria-label「插图预览」、Esc 关闭与焦点回位均正常',
      measurements: {
        dialogBg: 'rgb(24, 25, 29)',
        imgBg: 'rgb(255, 255, 255)',
        imgRect: '1312x481',
        dialogRect: '1354x643',
        imgVsDialogRatio: 17.56,
        dialogFontSizePx: 17.5,
        escapeCloses: true,
        focusReturnsToTrigger: true,
        ariaLabel: '插图预览',
      },
      evidence: ['artifacts/desktop/dialog-dark.png'],
      source: 'notes.css:79 `.image-dialog img{...;background:white}`',
      fix: '去掉 img 的 background:white，改成 var(--note-surface) 或 transparent；图片自身白底由图源决定。',
    },
    {
      id: 'DSK-09',
      title: 'notes.css:55 的表格字号/display 声明被 Material 覆盖，表格文字只有正文的 80%',
      severity: 'P3',
      scope: 'upstream',
      category: 'typography',
      device: 'desktop-1280 / 1366 / 1440 / 1920',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开 /chapters/chapter-2/ 或 /lab/scheduling/', '量表格 th/td 字号并对照 notes.css:55 的 .9em'],
      expected: 'notes.css:55 声明 `.md-typeset table{font-size:.9em}` → 正文 16px × .9 = 14.4px，且 display:table',
      actual: '实际 th/td 字号 12.8px（≤1440）/14.08px（1920），即 Material `.md-typeset table:not([class])` 的 .64rem；display 也是 inline-block 而非声明的 table。表头行与表体仅靠 650 字重区分：表头背景 rgb(243,244,246) 对页面 rgb(255,255,255) 亮度比 1.10:1（深色 1.15:1），几乎没有底色差',
      measurements: {
        tableCellFontPx: { d1440: 12.8, d1920: 14.08 },
        declaredFontPx: 14.4,
        bodyParagraphPx: 16,
        ratioToBodyPct: { d1440: 80, d1920: 88 },
        tableDisplay: 'inline-block',
        declaredDisplay: 'table',
        tableCount: 17,
        thBgLight: 'rgb(243, 244, 246)',
        thVsPageRatioLight: 1.1,
        thVsPageRatioDark: 1.15,
      },
      evidence: ['artifacts/desktop/table-1920.png', 'artifacts/desktop/lab-light-1440.png'],
      source: 'notes.css:55（选择器 `.md-typeset table` 特异性 0,1,1 < Material `.md-typeset table:not([class])` 0,2,1）',
      fix: '把选择器写成 `.md-typeset table:not([class])` 或加 `.md-typeset .chapter-prose table` 提高特异性；表头再用更深一档的 muted surface 或加 1px 下边线。',
    },
    {
      id: 'DSK-10',
      title: '深色主题下甘特图色块仍是浅色硬编码（对卡片 12.25:1）',
      severity: 'P3',
      scope: 'site',
      category: 'interaction',
      device: 'desktop-1280 / 1366 / 1440 / 1920；/lab/scheduling/；深色主题',
      url: `${LOCAL}/lab/scheduling/`,
      steps: ['打开 /lab/scheduling/', '切深色（label[for="__palette_1"]）', '看「执行时间轴」甘特图色块'],
      expected: '深色主题下图表色板应有深色变体，与卡片表面协调',
      actual: '4 个进程块仍是浅色硬编码：rgb(198,232,223) / rgb(216,230,250) / rgb(250,231,186) / rgb(232,217,244)，对卡片背景 rgb(32,33,38) 的对比 12.25:1；块内文字与块底对比 8.93:1（可读，仅突兀）',
      measurements: {
        darkCardBg: 'rgb(32, 33, 38)',
        blockColors: ['rgb(198, 232, 223)', 'rgb(216, 230, 250)', 'rgb(250, 231, 186)', 'rgb(232, 217, 244)'],
        blockVsCardRatio: 12.25,
        textOnBlockRatio: 8.93,
        blocksPerRender: 4,
        lightUnchanged: true,
      },
      evidence: ['artifacts/desktop/lab-dark-1440.png', 'artifacts/desktop/lab-light-1440.png'],
      source: 'notes.css:103-107（.gantt-block / .process-1/2/3 / .process--1 硬编码十六进制底色）',
      fix: '用 `[data-md-color-scheme="slate"] .gantt-block{...}` 提供深色变体，或改用 color-mix()/token 派生；保持每块色相可区分即可。',
    },
    {
      id: 'DSK-11',
      title: '站点不跟随系统深色偏好：系统已深色，页面仍全白',
      severity: 'P3',
      scope: 'config',
      category: 'a11y',
      device: 'desktop-1440（其它宽度同）；colorScheme=dark 上下文',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['用 colorScheme=dark 打开 /chapters/chapter-2/', '检查 matchMedia("(prefers-color-scheme: dark)").matches 与 body 背景'],
      expected: '系统偏好深色时首屏即为深色（MkDocs Material 支持 palette.media 自动切换）',
      actual: 'matchMedia 返回 true，但 body 计算背景仍是 rgb(255,255,255)，body 上没有 data-md-color-scheme，页面需手动点月亮图标才变深色',
      measurements: {
        prefersDarkMatches: true,
        bodyBg: 'rgb(255, 255, 255)',
        schemeAttrOnBody: null,
        schemeAfterManualClick: 'slate',
        bodyBgAfterManualClick: 'rgb(24, 25, 29)',
        metaColorScheme: 'dark',
      },
      evidence: ['artifacts/desktop/home-light-1440.png', 'artifacts/desktop/home-dark-1440.png'],
      source: '站点/mkdocs.yml 的两个 palette 条目均未设置 media:（需 (prefers-color-scheme: light)/(prefers-color-scheme: dark)），notes.css 不处理系统偏好',
      fix: '给 palette 两项分别加 `media: "(prefers-color-scheme: light)"` / `"(prefers-color-scheme: dark)"`，保留手动切换 toggle。',
    },
    {
      id: 'DSK-12',
      title: '焦点环两种颜色两套样式，侧栏滚动容器还会把环裁掉 7.3px',
      severity: 'P3',
      scope: 'upstream',
      category: 'a11y',
      device: 'desktop-1440（tab 走查，light+dark）',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['打开章节页，从页面开头连续 Tab', '看搜索框/侧栏目录/页脚链接的焦点环颜色', '走到侧栏最后一项「14 教材本章习题」'],
      expected: '全站统一一种焦点环（notes.css:46 定义 3px solid var(--note-focus) + 4px offset），且在滚动容器内不被裁切',
      actual: '正文与跳过链接用 rgb(40,89,197)（notes.css 的 --note-focus），页头按钮/侧栏目录/标题锚点却用 Material 的 rgb(66,135,255) 3px auto；侧栏最后一项的环被 .md-sidebar__scrollwrap（overflow:auto）裁掉 7.3px。深色下环色分别 rgb(169,194,255) 与 rgb(66,135,255)',
      measurements: {
        siteRingColorLight: 'rgb(40, 89, 197)',
        materialRingColorLight: 'rgb(66, 135, 255)',
        siteRingDark: 'rgb(169, 194, 255)',
        ringWidthPx: 3,
        ringOffsetPx: 4,
        clippedByAncestor: '.md-sidebar__scrollwrap overflow:auto',
        clippedPx: 7.3,
        navLinksWithMaterialRing: 40,
      },
      evidence: ['artifacts/desktop/focus-nav-clipped.png', 'artifacts/desktop/focus-headerlink.png', 'artifacts/desktop/skiplink-light.png'],
      source: 'notes.css:46 只覆盖 `:where(a,button,input,select,summary):focus-visible`；Material 的 `.md-nav__link:focus-visible`/`.md-option:focus-visible + label` 特异性更高 → 两套环。侧栏裁切来自 .md-sidebar__scrollwrap 的 overflow:auto',
      fix: '用 `a:focus-visible,button:focus-visible,...{outline:3px solid var(--note-focus)!important}` 或提高特异性统一环色；给 `.md-nav__link` 加 4px 内边距/让 scrollwrap 有 8px 内滚动留白，避免环贴边被裁。',
    },
    {
      id: 'DSK-13',
      title: '1920 档正文行宽 895px（约 56 个汉字/行），且 --sl-content-width 是死声明',
      severity: 'P3',
      scope: 'taste',
      category: 'typography',
      device: 'desktop-1920（1440 也已达 895px 上限）',
      url: `${LOCAL}/chapters/chapter-2/`,
      steps: ['在 1920x1080 打开 /chapters/chapter-2/', '量正文段落宽度与每行汉字数', '检索 `--sl-content-width` 的使用处'],
      expected: '中文长文舒适行宽约 30–45 字；notes.css:4 声明了 --sl-content-width:56rem 作为内容宽度上限',
      actual: '正文段落宽 895px、内容列 948px，按 16px 汉字计约 56 字/行（量得的 contentW/字号比 53–65）；`.md-grid{max-width:1480px}` 才是真正生效的约束，`--sl-content-width` 全站无人引用（grep 0 处使用）。1280 档 796px（约 50 字）尚可',
      measurements: {
        contentWidthPx: { d1280: 796, d1366: 882, d1440: 956, d1920: 948 },
        paragraphWidthPx: 895,
        cjkCharsPerLine: 56,
        measuredCharsPerLine: { d1280: 53, d1366: 60, d1440: 65, d1920: 64 },
        declaredVar: '--sl-content-width: 56rem',
        declaredVarUsages: 0,
        realConstraint: '.md-grid max-width 1480px',
        recommendedChars: '30–45',
      },
      evidence: ['artifacts/desktop/table-1920.png'],
      source: 'notes.css:4（声明）与 notes.css:147 `.md-grid{max-width:1480px}`（实际生效）',
      fix: '给 `.md-content__inner`/`.md-typeset` 设 max-width: 42rem（约 672px，42 汉字）或直接启用 --sl-content-width；同时删除或真正使用该变量。',
    },
  ];
}

function passed() {
  return [
    { item: '深色主题切换', result: '通过', detail: '点击 label[for="__palette_1"] 生效：body[data-md-color-scheme] 由 default→slate，body 背景 rgb(255,255,255)→rgb(24,25,29)；键盘 ArrowRight 也可切换' },
    { item: '横向溢出 / 表格溢出', result: '通过', detail: '4 档宽度 × 3 页 × 2 主题共 24 次检测：documentElement.scrollWidth 均等于视口宽（1280/1366/1440/1920），被裁元素 0，表格溢出 0' },
    { item: '200% 缩放（640×512@2x）', result: '通过', detail: '无横向溢出；表格 606px 不滚动；工具条 608×72 不裁切；搜索框收成移动态 0×48（Material 断点行为）' },
    { item: 'prefers-reduced-motion', result: '通过', detail: 'reduced 下 .md-header/.md-nav__link/正文链接等 transition-duration 全部 0s（常规态 0.25s/0.125s），动画元素 0 个（notes.css:120 生效）' },
    { item: '跳过链接', result: '通过', detail: '第一站 Tab 落到 a.md-skip：opacity 0→1、58×36 @ (10,10)、定位 fixed、href="#2" 目标存在、焦点环 3px rgb(40,89,197) 可见' },
    { item: '弹窗键盘流程', result: '通过', detail: 'Enter 打开后焦点落在「关闭 · Esc」按钮，aria-label=插图预览，alt=图2-1 进程状态转换图；Esc 关闭且焦点回到触发按钮（backToTrigger=true）' },
    { item: '折叠答案键盘操作', result: '通过', detail: 'details summary 可用 Enter 展开、Space 收起（before=false → Enter=true → Space=false）' },
    { item: '标题/landmark/图片 alt', result: '通过', detail: 'h1 数量 1，标题层级跳级 0，header/nav/main/footer 齐全；4 张内容图均有中文 alt（第 5 张是弹窗内的空 alt 占位图，不在正文流）' },
    { item: 'aria-live', result: '通过', detail: '.lab-results 有 aria-live="polite" aria-atomic="true"，.save-status 有 role="status"（注意：recon 时曾误判为缺失，实际 HTML 里有 role）' },
    { item: '表单 label 关联', result: '通过', detail: '/lab/scheduling/ 两个 .lab-controls label 采用隐式包裹（label>select/input，隐藏 for 但可访问），输入行用 aria-label 标注「P1 到达时刻」等' },
    { item: 'CLS / LCP（本地，仅参考）', result: '参考值', detail: 'CLS 0.0008（1440）/0.0009（1280），唯一 shift 发生在 308ms 的 H2；LCP 264ms/244ms（元素为正文段落）；首屏传输 759KB / 11 资源 / 1 个 long task' },
    { item: '控制台与网络', result: '通过', detail: '所有检测页 console error 0、pageerror 0、4xx 0、requestfailed 0' },
  ];
}

function gaps() {
  return [
    '深色主题「进度条/代码块/折叠答案/页头导航标题」实测均随主题正确切换：progress 轨道 rgb(223,226,232)→rgb(56,58,67)，pre>code rgb(245,245,245)→rgb(39,42,53)，表头 rgb(243,244,246)→rgb(36,37,43)——未列为缺陷。',
    '折叠 <details> 内的 12 个代码元素在默认收起态会量到 rgb(245,245,245)，展开后实测 rgb(39,42,53)（正确深色）：这是 Chromium 对 content-visibility 收起子树的自定义属性解析假象，非缺陷，已排除。',
    '搜索中文「搜不到」曾是本轮的一条 P1，复核后**判定为假阳性并降级为 DSK-01（P3, upstream）**：Material 9.7.7 检索由 keyup 驱动，Playwright 对非 ASCII 走 CDP Input.insertText 不产生 keyup；补一次按键后同一查询得 8 条结果，/?q=进程调度 直达也得 8 条。站点中文搜索可用，无需修复。',
    '触控目标尺寸（页头图标 40px、搜索清空按钮 24×24、正文锚点 17×42）在桌面鼠标场景下不构成阻断，未单列；如需与 mobile/tablet 对齐可在汇总时并入触控类。',
    '字体渲染/PDF、打印样式（@media print）、Firefox/Safari 未覆盖：本机只有 Chromium 141。',
    'CLS/LCP 为本地无 CDN 环境下的参考值，不代表线上真实网络表现。',
  ];
}

async function render() {
  const fs = await import('node:fs/promises');
  const fnd = findings();
  const sev = (s) => fnd.filter((f) => f.severity === s).length;
  const data = {
    member: 'qa-desktop',
    env: 'local',
    baseUrl: LOCAL,
    devices: DESKTOPS.map((d) => DEVICE_LABEL[d]),
    themes: ['light', 'dark'],
    generatedAt: new Date().toISOString(),
    summary: { total: fnd.length, P0: sev('P0'), P1: sev('P1'), P2: sev('P2'), P3: sev('P3') },
    findings: fnd,
    passed: passed(),
    gaps: gaps(),
    matrix: {
      'desktop-1280': { rootFontSizePx: 20, contentWidthPx: 796, charsPerLine: 53, h1Px: 32, h2Px: 31, tableCellPx: 12.8, toolbarPx: 17.5 },
      'desktop-1366': { rootFontSizePx: 20, contentWidthPx: 882, charsPerLine: 60, h1Px: 32, h2Px: 31, tableCellPx: 12.8, toolbarPx: 17.5 },
      'desktop-1440': { rootFontSizePx: 20, contentWidthPx: 956, charsPerLine: 65, h1Px: 32, h2Px: 31, tableCellPx: 12.8, toolbarPx: 17.5 },
      'desktop-1920': { rootFontSizePx: 22, contentWidthPx: 948, charsPerLine: 64, h1Px: 32, h2Px: 34.1, tableCellPx: 14.08, toolbarPx: 19.25 },
    },
  };
  await saveJSON('reports/desktop.json', data);

  const L = [];
  L.push('# 桌面端 / 深色主题 / 键盘与无障碍审计报告');
  L.push('');
  L.push(`- 成员：**qa-desktop**　被测：\`${LOCAL}\`（对照线上 \`https://studynote.chosenecho.dpdns.org\` 抽查）`);
  L.push(`- 档位：1280×800、1366×768、1440×900、1920×1080，每档 light + dark（深色经 \`label[for="__palette_1"]\` 手动切换，站点不跟随系统偏好，见 DSK-11）`);
  L.push(`- 页面：\`/\`、\`/chapters/chapter-2/\`、\`/lab/scheduling/\`；另对 chapter-2 做键盘/语义深挖`);
  L.push(`- 结论：共 ${fnd.length} 条 —— **P0 ${sev('P0')} / P1 ${sev('P1')} / P2 ${sev('P2')} / P3 ${sev('P3')}**。${sev('P1') === 0 ? '无 P1：主要流程可用，缺陷集中在深色一致性与排版层级。' : ''}`);
  L.push('');
  L.push('## 档位实测矩阵（light）');
  L.push('');
  L.push('| 档位 | 根字号 | 内容列宽 | 每行字数 | h1 | h2 | 表格单元 | 工具条 |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(data.matrix)) {
    L.push(`| ${k} | ${v.rootFontSizePx}px | ${v.contentWidthPx}px | ${v.charsPerLine} | ${v.h1Px}px | ${v.h2Px}px | ${v.tableCellPx}px | ${v.toolbarPx}px |`);
  }
  L.push('');
  L.push('---');
  L.push('');
  for (const s of ['P0', 'P1', 'P2', 'P3']) {
    const list = fnd.filter((f) => f.severity === s);
    if (!list.length) continue;
    L.push(`## ${s}（${list.length} 条）`);
    L.push('');
    for (const f of list) {
      L.push(`### ${f.id} ${f.title}`);
      L.push('');
      L.push(`- **严重度**：${f.severity}　**scope**：${f.scope}　**类别**：${f.category}　**设备/主题**：${f.device}`);
      L.push(`- **现象**：${f.actual}`);
      L.push(`- **复现**：${f.steps.map((x, i) => `${i + 1}) ${x}`).join('　')}`);
      L.push(`- **期望**：${f.expected}`);
      L.push(`- **量化**：${Object.entries(f.measurements).map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : typeof v === 'object' && v ? `{${Object.entries(v).map(([k2, v2]) => `${k2}:${v2}`).join(', ')}}` : v}`).join('；')}`);
      L.push(`- **根因**：${f.source}`);
      L.push(`- **建议**：${f.fix}`);
      L.push(`- **证据**：${f.evidence.map((e) => `\`qa/${e}\``).join('、')}　被测 URL：${f.url}`);
      L.push('');
    }
  }
  L.push('## 通过项（已实测，不计缺陷）');
  L.push('');
  L.push('| 检查项 | 结果 | 实测 |');
  L.push('|---|---|---|');
  for (const p of passed()) L.push(`| ${p.item} | ${p.result} | ${p.detail} |`);
  L.push('');
  L.push('## 缺口与说明');
  L.push('');
  for (const g of gaps()) L.push(`- ${g}`);
  L.push('');
  L.push('## 产物');
  L.push('');
  L.push('- 脚本：`qa/scripts/desktop.mjs`（`node qa/scripts/desktop.mjs collect|shots|render`）');
  L.push('- 原始数据：`qa/artifacts/desktop/raw.json`、`probe2..6.json`、`recon.json`');
  L.push('- 截图：`qa/artifacts/desktop/*.png`');
  L.push('');
  const md = L.join('\n');
  await fs.mkdir('qa/reports', { recursive: true });
  await fs.writeFile('qa/reports/desktop.md', md, 'utf8');
  console.log(`wrote qa/reports/desktop.json (${fnd.length} findings) and qa/reports/desktop.md (${md.length} chars)`);
}

// ---------------------------------------------------------------- main
if (MODE === 'recon') {
  recon().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'dump') {
  dump().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'collect') {
  collect().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'inspect') {
  inspect().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'probe2') {
  probe2().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'probe3') {
  probe3().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'probe4') {
  probe4().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'probe5') {
  probe5().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'probe6') {
  probe6().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'shots') {
  extraShots().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'render') {
  render().catch((e) => { console.error(e); process.exit(1); });
} else if (MODE === 'verify') {
  verifySearch().catch((e) => { console.error(e); process.exit(1); });
}


