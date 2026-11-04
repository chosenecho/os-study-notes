// Shared Playwright harness for the 课程笔记 site audit.
// Import from any file under C:\Users\ChosenEcho (node_modules/playwright resolves upward).
//
//   import { session, PAGES, DEVICES, layout, tapTargets, contrast, a11y, shot, saveJSON } from './lib/audit.mjs'
//
// Every helper returns plain JSON so it can be written to disk and quoted in a report.

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

export const LIVE = 'https://studynote.chosenecho.dpdns.org';
export const LOCAL = 'http://127.0.0.1:8123';

export const PAGES = {
  home: '/',
  os1: '/chapters/chapter-1/',
  os2: '/chapters/chapter-2/',
  os3: '/chapters/chapter-3/',
  os4: '/chapters/chapter-4/',
  os6: '/chapters/chapter-6/',
  co1: '/computer-organization/chapter-1/',
  co2: '/computer-organization/chapter-2/',
  lab: '/lab/scheduling/',
  missing: '/no-such-page/',
};

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

export const DEVICES = {
  'android-360': {
    viewport: { width: 360, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    label: 'Android 360x800 (Pixel 7 缩放)',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  },
  'iphone-se': {
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    label: 'iPhone SE 375x667',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
  },
  'iphone-14': {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    label: 'iPhone 14 390x844',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  'ipad-portrait': {
    viewport: { width: 768, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    label: 'iPad 768x1024 竖屏',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  'ipad-air': {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    label: 'iPad Air 820x1180 竖屏',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  'ipad-landscape': {
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    label: 'iPad 1024x768 横屏',
    userAgent:
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  'surface-pro': {
    viewport: { width: 912, height: 1368 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    label: 'Surface Pro 912x1368 竖屏（触屏）',
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  },
  'desktop-1280': { viewport: { width: 1280, height: 800 }, label: '笔记本 1280x800', userAgent: CHROME_UA },
  'desktop-1366': { viewport: { width: 1366, height: 768 }, label: '笔记本 1366x768', userAgent: CHROME_UA },
  'desktop-1440': { viewport: { width: 1440, height: 900 }, label: '桌面 1440x900', userAgent: CHROME_UA },
  'desktop-1920': { viewport: { width: 1920, height: 1080 }, label: '桌面 1920x1080', userAgent: CHROME_UA },
};

/** Custom viewport that is not in DEVICES. */
export function custom(viewport, extra = {}) {
  return { viewport, userAgent: CHROME_UA, label: `${viewport.width}x${viewport.height}`, ...extra };
}

/**
 * Open a browser + context for one device profile.
 * @returns {{ browser, context, page, diag, close(): Promise<void> }}
 */
export async function session(device, { base = LOCAL, colorScheme = 'light', locale = 'zh-CN' } = {}) {
  const profile = typeof device === 'string' ? DEVICES[device] : device;
  if (!profile) throw new Error(`unknown device: ${device}`);
  const { label, ...ctxOptions } = profile;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: base,
    locale,
    timezoneId: 'Asia/Shanghai',
    colorScheme,
    reducedMotion: 'no-preference',
    ...ctxOptions,
  });
  const page = await context.newPage();
  const diag = { console: [], pageerror: [], requestfailed: [], responses: [] };
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      diag.console.push({ type: m.type(), text: m.text().slice(0, 500), url: page.url() });
    }
  });
  page.on('pageerror', (e) => diag.pageerror.push({ message: String(e).slice(0, 500), url: page.url() }));
  page.on('requestfailed', (r) =>
    diag.requestfailed.push({ url: r.url(), failure: r.failure()?.errorText, kind: r.resourceType() }),
  );
  page.on('response', (r) => {
    if (r.status() >= 400) diag.responses.push({ status: r.status(), url: r.url(), kind: r.request().resourceType() });
  });
  return { browser, context, page, diag, label: label ?? `${ctxOptions.viewport.width}x${ctxOptions.viewport.height}`, close: () => browser.close() };
}

export function diagnostics(s) {
  const uniq = (rows) => [...new Map(rows.map((r) => [JSON.stringify(r), r])).values()];
  return {
    console: uniq(s.diag.console),
    pageerror: uniq(s.diag.pageerror),
    requestfailed: uniq(s.diag.requestfailed),
    http4xx: uniq(s.diag.responses),
  };
}

/** Load a path and wait until layout/fonts settle. */
export async function goto(page, pathName, { wait = 'networkidle' } = {}) {
  await page.goto(pathName, { waitUntil: wait, timeout: 45000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
}

/** Scroll the whole page so lazy images load, then return to the top. */
export async function warm(page, { step = 600, settle = 180 } = {}) {
  await page.evaluate(async ({ step, settle }) => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, settle / 10));
    }
    window.scrollTo(0, total);
    await new Promise((r) => setTimeout(r, settle));
    window.scrollTo(0, 0);
  }, { step, settle });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null)))));
  await page.waitForTimeout(150);
}

/** Horizontal overflow + clipped text + per-table overflow. */
export async function layout(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const insideScroller = (el) => {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden') return true;
        p = p.parentElement;
      }
      return false;
    };
    const name = (el) =>
      el.tagName.toLowerCase() +
      (el.id ? `#${el.id}` : '') +
      (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '');
    const offenders = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('dialog') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right > vw + 1 && !insideScroller(el)) {
        offenders.push({
          el: name(el),
          right: Math.round(r.right),
          width: Math.round(r.width),
          over: Math.round(r.right - vw),
          text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70),
        });
      }
    }
    // keep outermost only
    const outermost = offenders.filter(
      (o, i) => !offenders.some((p, j) => j !== i && p.el !== o.el && p.over >= o.over && p.text.startsWith(o.text) && p.text.length >= o.text.length),
    );
    const tables = [...document.querySelectorAll('.md-content table')].map((t) => ({
      rows: t.rows.length,
      clientWidth: Math.round(t.clientWidth),
      scrollWidth: Math.round(t.scrollWidth),
      overflows: t.scrollWidth > t.clientWidth + 1,
      wrapped: t.parentElement ? getComputedStyle(t.parentElement).overflowX : null,
      display: getComputedStyle(t).display,
      firstCells: [...(t.rows[0]?.cells ?? [])].slice(0, 3).map((c) => (c.textContent || '').trim().slice(0, 18)),
    }));
    const clipped = [...document.querySelectorAll('.md-content *')]
      .filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.overflow === 'visible') return false;
        return el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !['TABLE', 'PRE'].includes(el.tagName);
      })
      .slice(0, 10)
      .map((el) => ({ el: name(el), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth }));
    return {
      viewport: { width: vw, height: window.innerHeight },
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
      overflowOffenders: outermost.slice(0, 15),
      tables: tables.filter((t) => t.overflows || t.rows > 4).slice(0, 12),
      tablesOverflowing: tables.filter((t) => t.overflows).length,
      clipped,
    };
  });
}

/** Interactive elements smaller than WCAG/材料标准 sizes. */
export async function tapTargets(page, { min = 44 } = {}) {
  return page.evaluate((min) => {
    const out = [];
    const sel = 'a[href], button, select, input, summary, [role="button"], label.md-search__icon';
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.type === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (el.closest('[hidden], .md-header__topic')) continue;
      if (r.width < min || r.height < min) {
        out.push({
          el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''),
          text: (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
        });
      }
    }
    const seen = new Set();
    return out.filter((o) => {
      const k = o.el + o.text + o.w + o.h;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 40);
  }, min);
}

/** WCAG contrast scan for text that has its own visible background chain. */
export async function contrast(page) {
  return page.evaluate(() => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const blend = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    });
    const bgOf = (el) => {
      let p = el;
      let acc = null;
      while (p) {
        const cs = getComputedStyle(p);
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0.02) {
          acc = acc ? blend(acc, c) : c;
          if (c.a >= 0.999) return acc;
        }
        p = p.parentElement;
      }
      const body = parse(getComputedStyle(document.body).backgroundColor);
      return acc ? blend(acc, body && body.a ? body : { r: 255, g: 255, b: 255, a: 1 }) : body && body.a ? body : { r: 255, g: 255, b: 255, a: 1 };
    };
    const out = [];
    for (const el of document.querySelectorAll('.md-content *, .md-header *, .md-nav *, footer *')) {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const c = ratio(fg.a < 1 ? blend(fg, bg) : fg, bg);
      const px = parseFloat(cs.fontSize);
      const bold = +cs.fontWeight >= 600;
      const large = px >= 24 || (bold && px >= 18.66);
      const need = large ? 3 : 4.5;
      if (c < need) {
        out.push({
          el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : ''),
          text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
          color: cs.color,
          bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          px: Math.round(px),
          ratio: Math.round(c * 100) / 100,
          need,
        });
      }
    }
    // placeholder text of search / number inputs
    for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
      const cs = getComputedStyle(el);
      const ph = getComputedStyle(el, '::placeholder');
      if (cs.display === 'none' || el.getBoundingClientRect().width < 2) continue;
      const fg = parse(ph.color || cs.color);
      if (!fg) continue;
      const bg = bgOf(el);
      const c = ratio(fg.a < 1 ? blend(fg, bg) : fg, bg);
      const px = parseFloat(ph.fontSize || cs.fontSize);
      if (c < 4.5) {
        out.push({
          el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '') + '(placeholder)',
          text: el.placeholder.slice(0, 40),
          color: ph.color,
          bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          px: Math.round(px),
          ratio: Math.round(c * 100) / 100,
          need: 4.5,
        });
      }
    }
    const seen = new Set();
    return out.filter((o) => {
      const k = o.el + o.color + o.bg + o.px;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 30);
  });
}

/** Structure + accessibility basics. */
export async function a11y(page) {
  return page.evaluate(() => {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      level: +h.tagName[1],
      text: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
    }));
    const jumps = [];
    headings.forEach((h, i) => {
      if (i && h.level - headings[i - 1].level > 1) jumps.push(`${headings[i - 1].level}->${h.level} @ ${h.text}`);
    });
    const imgs = [...document.images].map((i) => ({
      src: i.currentSrc.split('/').pop(),
      alt: i.getAttribute('alt'),
      w: i.naturalWidth,
      h: i.naturalHeight,
      rendered: { w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height) },
      complete: i.complete,
    }));
    const focusables = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => el.tagName.toLowerCase());
    const iconOnly = [...document.querySelectorAll('button, a')].filter(
      (el) => !el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title'),
    ).length;
    return {
      lang: document.documentElement.lang,
      title: document.title,
      h1count: document.querySelectorAll('h1').length,
      headings: headings.slice(0, 40),
      headingJumps: jumps,
      landmarks: [...document.querySelectorAll('header,nav,main,footer,[role]')].map((e) => e.tagName.toLowerCase() + (e.getAttribute('role') ? `[${e.getAttribute('role')}]` : '')),
      imagesMissingAlt: imgs.filter((i) => i.alt === null || i.alt === '').length,
      images: imgs.slice(0, 20),
      brokenImages: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
      focusableCount: focusables.length,
      iconOnlyControls: iconOnly,
      dialogOpen: !!document.querySelector('dialog[open]'),
      skipLink: !!document.querySelector('.md-skip, a[href="#_1"], a[href^="#"]'),
      fontSizes: {
        root: getComputedStyle(document.documentElement).fontSize,
        body: getComputedStyle(document.querySelector('.md-content__inner') || document.body).fontSize,
        paragraph: getComputedStyle(document.querySelector('.md-content p') || document.body).fontSize,
      },
    };
  });
}

/** Screenshot helpers; paths are relative to the qa/ directory. */
export async function shot(page, relPath, { fullPage = false, clip, selector } = {}) {
  const target = path.resolve('qa', relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  if (selector) {
    await page.locator(selector).first().screenshot({ path: target });
  } else {
    await page.screenshot({ path: target, fullPage, clip });
  }
  return path.relative(process.cwd(), target).replace(/\\/g, '/');
}

export async function shotElement(page, selector, relPath) {
  const el = page.locator(selector).first();
  const target = path.resolve('qa', relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await el.screenshot({ path: target });
  return path.relative(process.cwd(), target).replace(/\\/g, '/');
}

export async function saveJSON(relPath, data) {
  const target = path.resolve('qa', relPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf8');
  return path.relative(process.cwd(), target).replace(/\\/g, '/');
}

/** Everything in one call, for a single page on a single device. */
export async function auditPage(page, pathName, { prewarm = true } = {}) {
  await goto(page, pathName);
  if (prewarm) await warm(page);
  const result = {
    url: page.url(),
    layout: await layout(page),
    tapTargets: await tapTargets(page),
    contrast: await contrast(page),
    a11y: await a11y(page),
  };
  return result;
}
