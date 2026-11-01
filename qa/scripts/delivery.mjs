// qa-delivery — browser-side performance, weak-network and mobile-meta probe.
//
//   node qa/scripts/delivery.mjs        (cwd = repo root)
//
// Live:  https://studynote.chosenecho.dpdns.org  (Cloudflare Worker -> Pages)
// Local: http://127.0.0.1:8123                   (站点/dist, python http.server)
//
// Outputs: qa/artifacts/delivery/perf.json
//          qa/artifacts/delivery/weaknet.json
//          qa/artifacts/delivery/meta.json
//          qa/artifacts/delivery/*.png
// stdout stays ASCII-only (PowerShell mangles CJK).

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LIVE, LOCAL } from '../lib/audit.mjs';

const OUT = path.resolve('qa', 'artifacts', 'delivery');
const PATHS = { home: '/', os2: '/chapters/chapter-2/', lab: '/lab/scheduling/' };

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

async function ensureDir() {
  await fs.mkdir(OUT, { recursive: true });
}

async function saveJSON(name, data) {
  await fs.writeFile(path.join(OUT, name), JSON.stringify(data, null, 2), 'utf8');
}

const median = (xs) => {
  const a = [...xs].sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round(((a[m - 1] + a[m]) / 2) * 10) / 10;
};

/** Collect vitals + resource breakdown for one cold navigation. */
async function measureOnce(browser, base, pathName, label) {
  const context = await browser.newContext({
    userAgent: CHROME_UA,
    viewport: { width: 1366, height: 900 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
    bypassCSP: false,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)));

  // Install observers before any navigation so nothing is missed.
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, lcpEl: null, cls: 0, fcp: 0, shifts: [] };
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__vitals.lcp = e.startTime;
          window.__vitals.lcpEl = e.element
            ? `${e.element.tagName}.${(e.element.className || '').toString().split(' ')[0]}`
            : e.url || null;
          window.__vitals.lcpSize = e.size;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__vitals.fcp = e.startTime;
      }).observe({ type: 'paint', buffered: true });
    } catch {}
  });

  const t0 = Date.now();
  const resp = await page.goto(base + pathName, { waitUntil: 'load', timeout: 90000 });
  const loadWallMs = Date.now() - t0;
  const status = resp ? resp.status() : null;
  const respHeaders = resp ? await resp.allHeaders() : {};
  await page.waitForTimeout(1200); // let LCP/CLS settle

  const data = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const res = performance.getEntriesByType('resource').map((r) => ({
      name: r.name,
      initiatorType: r.initiatorType,
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize,
      decodedBodySize: r.decodedBodySize,
      duration: Math.round(r.duration),
      protocol: r.nextHopProtocol,
    }));
    const byType = {};
    for (const r of res) {
      const k = r.initiatorType || 'other';
      byType[k] = byType[k] || { count: 0, transferSize: 0, decodedBodySize: 0 };
      byType[k].count += 1;
      byType[k].transferSize += r.transferSize || 0;
      byType[k].decodedBodySize += r.decodedBodySize || 0;
    }
    const sorted = [...res].sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0));
    const imgs = [...document.images];
    return {
      url: location.href,
      title: document.title,
      nav: {
        ttfb: Math.round(nav.responseStart ?? 0),
        requestStart: Math.round(nav.requestStart ?? 0),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd ?? 0),
        load: Math.round(nav.loadEventEnd ?? 0),
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
        protocol: nav.nextHopProtocol,
      },
      vitals: window.__vitals,
      resourceCount: res.length,
      byType,
      totalTransfer: res.reduce((s, r) => s + (r.transferSize || 0), 0) + (nav.transferSize || 0),
      totalDecoded: res.reduce((s, r) => s + (r.decodedBodySize || 0), 0) + (nav.decodedBodySize || 0),
      largest: sorted.slice(0, 5),
      protocols: [...new Set(res.map((r) => r.protocol))],
      thirdParty: res.filter((r) => !r.name.startsWith(location.origin)).map((r) => r.name),
      fonts: [...document.fonts].map((f) => `${f.family}/${f.status}`),
      webfontRequests: res.filter((r) => /\.(woff2?|ttf|otf)(\?|$)/.test(r.name)).map((r) => r.name),
      images: {
        total: imgs.length,
        loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        lazy: imgs.filter((i) => i.loading === 'lazy').length,
        broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
        bytes: imgs.reduce((s, i) => s + (i.currentSrc ? 1 : 0), 0),
      },
      scrollHeight: document.documentElement.scrollHeight,
      h1: (document.querySelector('.md-content h1') || document.querySelector('h1') || {}).textContent || null,
    };
  });

  await context.close();
  return {
    label,
    base,
    path: pathName,
    status,
    loadWallMs,
    headers: {
      'cache-control': respHeaders['cache-control'] ?? null,
      'content-encoding': respHeaders['content-encoding'] ?? null,
      'content-length': respHeaders['content-length'] ?? null,
      'cf-cache-status': respHeaders['cf-cache-status'] ?? null,
      server: respHeaders['server'] ?? null,
      'x-served-by': respHeaders['x-served-by'] ?? null,
      'alt-svc': respHeaders['alt-svc'] ?? null,
      'strict-transport-security': respHeaders['strict-transport-security'] ?? null,
      'content-security-policy': respHeaders['content-security-policy'] ?? null,
      'x-frame-options': respHeaders['x-frame-options'] ?? null,
      'referrer-policy': respHeaders['referrer-policy'] ?? null,
      'permissions-policy': respHeaders['permissions-policy'] ?? null,
      'content-type': respHeaders['content-type'] ?? null,
    },
    consoleErrors,
    ...data,
  };
}

/** Weak network: Chrome DevTools presets, applied via CDP. */
const NET_PROFILES = {
  'slow-3g': { latency: 2000, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 },
  'fast-3g': { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
};

async function measureWeak(browser, base, pathName, profile, label) {
  const context = await browser.newContext({
    userAgent: CHROME_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NET_PROFILES[profile] });

  await page.addInitScript(() => {
    window.__v = { fcp: 0, lcp: 0, cls: 0 };
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__v.fcp = e.startTime;
      }).observe({ type: 'paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__v.lcp = e.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
  });

  const t0 = Date.now();
  let navError = null;
  try {
    await page.goto(base + pathName, { waitUntil: 'load', timeout: 120000 });
  } catch (e) {
    navError = String(e).slice(0, 200);
  }
  const loadWallMs = Date.now() - t0;

  // "first readable": poll until the article's first heading has text and is painted
  const readableMs = await page
    .evaluate(async (startedAt) => {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        const h = document.querySelector('.md-content h1, .md-content h2, .md-content p');
        if (h && (h.textContent || '').trim().length > 3 && h.getBoundingClientRect().top < window.innerHeight) {
          return Math.round(performance.now());
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return null;
    }, t0)
    .catch(() => null);

  const before = await page.evaluate(() => {
    const imgs = [...document.images];
    return {
      vitals: window.__v,
      nav: (() => {
        const n = performance.getEntriesByType('navigation')[0] || {};
        return {
          ttfb: Math.round(n.responseStart ?? 0),
          domContentLoaded: Math.round(n.domContentLoadedEventEnd ?? 0),
          load: Math.round(n.loadEventEnd ?? 0),
        };
      })(),
      resourceCount: performance.getEntriesByType('resource').length,
      transfer: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0),
      images: { total: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length },
      scrollHeight: document.documentElement.scrollHeight,
    };
  });

  // now warm-scroll: how many images load only after scrolling (lazy proof)
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  const after = await page.evaluate(() => {
    const imgs = [...document.images];
    return {
      images: { total: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length },
      resourceCount: performance.getEntriesByType('resource').length,
      transfer: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0),
    };
  });

  const shotPath = path.join(OUT, `weaknet-${label}-${profile}.png`);
  await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
  await context.close();
  return {
    label,
    base,
    path: pathName,
    profile,
    cdp: NET_PROFILES[profile],
    navError,
    loadWallMs,
    readableMs,
    before,
    after,
    lazyImagesLoadedOnlyAfterScroll: after.images.loaded - before.images.loaded,
    screenshot: path.relative(process.cwd(), shotPath).replace(/\\/g, '/'),
  };
}

/** Mobile delivery meta + icon/manifest presence + 404 behaviour in the browser. */
async function measureMeta(browser) {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  const reqs = [];
  page.on('response', (r) => reqs.push({ url: r.url(), status: r.status(), type: r.request().resourceType() }));
  await page.goto(LIVE + '/', { waitUntil: 'networkidle', timeout: 60000 });
  const meta = await page.evaluate(() => {
    const q = (sel) => [...document.querySelectorAll(sel)].map((e) => e.outerHTML.slice(0, 300));
    const vp = document.querySelector('meta[name="viewport"]');
    return {
      viewport: vp ? vp.getAttribute('content') : null,
      viewportWidth: window.innerWidth,
      docWidth: document.documentElement.scrollWidth,
      themeColor: q('meta[name="theme-color"]'),
      appleCapable: q('meta[name="apple-mobile-web-app-capable"]'),
      appleStatusBar: q('meta[name="apple-mobile-web-app-status-bar-style"]'),
      appleTitle: q('meta[name="apple-mobile-web-app-title"]'),
      msTile: q('meta[name="msapplication-TileColor"]'),
      maskIcon: q('link[rel="mask-icon"]'),
      appleTouchIcon: q('link[rel="apple-touch-icon"]'),
      manifest: q('link[rel="manifest"]'),
      icons: q('link[rel="icon"]'),
      og: q('meta[property^="og:"]'),
      twitter: q('meta[name^="twitter:"]'),
      canonical: q('link[rel="canonical"]'),
      robotsMeta: q('meta[name="robots"]'),
      lang: document.documentElement.lang,
      beacon: q('script[src*="cloudflareinsights"]'),
      mobileNavToggle: !!document.querySelector('label[for="__drawer"]'),
      drawerVisible: (() => {
        const d = document.querySelector('.md-drawer, #__drawer');
        return d ? getComputedStyle(d).visibility !== 'hidden' : null;
      })(),
      tapHighlight: getComputedStyle(document.body).webkitTapHighlightColor,
      textSizeAdjust: getComputedStyle(document.documentElement).webkitTextSizeAdjust,
    };
  });
  const faviconStatus = reqs.filter((r) => /favicon|\.ico|\.svg|\.png/.test(r.url)).map((r) => `${r.status} ${r.url}`);
  const shotPath = path.join(OUT, 'meta-mobile-home.png');
  await page.screenshot({ path: shotPath, fullPage: false });

  // 404 in the browser: what does the user see, does anything break?
  const notFound = await page.goto(LIVE + '/no-such-page/', { waitUntil: 'load', timeout: 60000 });
  const nf = {
    status: notFound.status(),
    title: await page.title(),
    h1: await page.evaluate(() => (document.querySelector('h1') || {}).textContent || null),
    bodyChars: await page.evaluate(() => document.querySelector('.md-content')?.textContent.trim().length ?? 0),
    brokenAssets: await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length),
    hasNav: await page.evaluate(() => document.querySelectorAll('.md-nav a').length),
    canonical: await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null),
  };
  const nfShot = path.join(OUT, 'live-404-page.png');
  await page.screenshot({ path: nfShot, fullPage: false });

  // duplicate-slash variant in the browser: does it render with working relative assets?
  const dup = await page.goto(LIVE + '//chapters//chapter-1//', { waitUntil: 'load', timeout: 60000 });
  const dupInfo = {
    status: dup.status(),
    finalUrl: page.url(),
    cssLoaded: await page.evaluate(
      () => [...document.styleSheets].length,
    ),
    sheetHrefs: await page.evaluate(() => [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'))),
    canonical: await page.evaluate(() => document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null),
    title: await page.title(),
  };
  const dupShot = path.join(OUT, 'live-duplicate-slash.png');
  await page.screenshot({ path: dupShot, fullPage: false });

  await context.close();
  return {
    meta,
    faviconStatus,
    notFound: nf,
    duplicateSlash: dupInfo,
    screenshots: [shotPath, nfShot, dupShot].map((p) => path.relative(process.cwd(), p).replace(/\\/g, '/')),
  };
}

/** Per-image truth for a chapter page: which figure is broken and why. */
async function measureImages(browser) {
  const context = await browser.newContext({
    userAgent: CHROME_UA,
    viewport: { width: 1366, height: 900 },
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  const responses = [];
  page.on('response', (r) => {
    if (r.request().resourceType() === 'image') responses.push({ status: r.status(), url: r.url() });
  });
  const failed = [];
  page.on('requestfailed', (r) => failed.push({ url: r.url(), err: r.failure()?.errorText }));
  await page.goto(LIVE + PATHS.os2, { waitUntil: 'load', timeout: 60000 });
  const atLoad = await page.evaluate(() =>
    [...document.images].map((i) => ({
      src: i.getAttribute('src'),
      currentSrc: i.currentSrc,
      loading: i.loading,
      complete: i.complete,
      naturalWidth: i.naturalWidth,
      top: Math.round(i.getBoundingClientRect().top + window.scrollY),
      alt: i.getAttribute('alt'),
    })),
  );
  // warm scroll then re-read
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(600);
  const afterWarm = await page.evaluate(() =>
    [...document.images].map((i) => ({
      src: i.getAttribute('src'),
      complete: i.complete,
      naturalWidth: i.naturalWidth,
      top: Math.round(i.getBoundingClientRect().top + window.scrollY),
    })),
  );
  await context.close();
  return {
    atLoad,
    afterWarm,
    imageResponses: responses,
    requestFailed: failed,
    brokenAtLoad: atLoad.filter((i) => i.complete && i.naturalWidth === 0),
    brokenAfterWarm: afterWarm.filter((i) => i.complete && i.naturalWidth === 0),
    notLoadedAfterWarm: afterWarm.filter((i) => !i.complete || i.naturalWidth === 0),
  };
}

/** Evidence screenshots for the routing / 404 findings. */
async function captureShots(browser) {
  const context = await browser.newContext({
    userAgent: CHROME_UA,
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const out = {};
  const grab = async (name, url) => {
    const bad = [];
    const onResp = (r) => {
      if (r.status() >= 400) bad.push({ status: r.status(), url: r.url().replace(LIVE, '') });
    };
    page.on('response', onResp);
    const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(700);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    const probe = await page.evaluate(() => {
      const h1 = document.querySelector('.md-content h1, h1');
      const cs = h1 ? getComputedStyle(h1) : null;
      return {
        title: document.title,
        stylesheets: document.styleSheets.length,
        h1Font: cs ? cs.fontFamily : null,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        hasForm: !!document.querySelector('form'),
      };
    });
    page.off('response', onResp);
    out[name] = {
      url,
      status: resp ? resp.status() : null,
      finalUrl: page.url(),
      failedResources: bad,
      ...probe,
      screenshot: path.relative(process.cwd(), file).replace(/\\/g, '/'),
    };
  };

  await grab('lab-styled', LIVE + '/lab/scheduling/');
  await grab('lab-double-slash', LIVE + '/lab/scheduling//');
  await grab('chapter1-double-slash', LIVE + '/chapters/chapter-1//');
  await grab('chapter1-canonical', LIVE + '/chapters/chapter-1/');
  await grab('live-404', LIVE + '/no-such-page/');
  await grab('live-lab-dir-404', LIVE + '/lab/');
  await context.close();
  return out;
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const startedAt = new Date().toISOString();

  if (process.argv.includes('shots')) {
    const shots = await captureShots(browser);
    await saveJSON('shots.json', shots);
    console.log(JSON.stringify(shots, null, 1));
    await browser.close();
    return;
  }

  if (process.argv.includes('images')) {
    const imgs = await measureImages(browser);
    await saveJSON('images.json', imgs);
    console.log('IMAGES atLoad broken=', imgs.brokenAtLoad.length, 'afterWarm broken=', imgs.brokenAfterWarm.length);
    console.log('IMAGES responses=', JSON.stringify(imgs.imageResponses));
    console.log('IMAGES failed=', JSON.stringify(imgs.requestFailed));
    console.log('IMAGES atLoad=', JSON.stringify(imgs.atLoad, null, 1));
    console.log('IMAGES afterWarm=', JSON.stringify(imgs.afterWarm, null, 1));
    await browser.close();
    return;
  }

  // ---- 1. cold-load performance: live x3, local x1 (median reported)
  const perf = { startedAt, runs: [], medians: {} };
  for (const [key, base] of [['live', LIVE], ['local', LOCAL]]) {
    const reps = key === 'live' ? 3 : 1;
    for (const [pname, p] of Object.entries({ home: PATHS.home, os2: PATHS.os2 })) {
      for (let i = 0; i < reps; i += 1) {
        const r = await measureOnce(browser, base, p, `${key}-${pname}-${i + 1}`);
        perf.runs.push(r);
        console.log(
          `PERF ${r.label.padEnd(18)} status=${r.status} ttfb=${r.nav.ttfb} dcl=${r.nav.domContentLoaded} ` +
            `load=${r.nav.load} lcp=${Math.round(r.vitals.lcp)} cls=${r.vitals.cls.toFixed(4)} ` +
            `reqs=${r.resourceCount} transfer=${r.totalTransfer} proto=${r.nav.protocol}`,
        );
      }
    }
  }
  for (const key of ['live-home', 'live-os2', 'local-home', 'local-os2']) {
    const rows = perf.runs.filter((r) => r.label.startsWith(key + '-'));
    perf.medians[key] = {
      runs: rows.length,
      ttfb: median(rows.map((r) => r.nav.ttfb)),
      dcl: median(rows.map((r) => r.nav.domContentLoaded)),
      load: median(rows.map((r) => r.nav.load)),
      lcp: median(rows.map((r) => Math.round(r.vitals.lcp))),
      fcp: median(rows.map((r) => Math.round(r.vitals.fcp))),
      cls: median(rows.map((r) => Math.round(r.vitals.cls * 10000) / 10000)),
      requests: median(rows.map((r) => r.resourceCount)),
      transfer: median(rows.map((r) => r.totalTransfer)),
      decoded: median(rows.map((r) => r.totalDecoded)),
      protocols: [...new Set(rows.flatMap((r) => [r.nav.protocol, ...r.protocols]))],
    };
  }
  await saveJSON('perf.json', perf);
  console.log('MEDIANS', JSON.stringify(perf.medians, null, 1));

  // ---- 2. weak network (live only; local http.server has no TLS/edge)
  const weak = { startedAt, runs: [] };
  for (const profile of ['slow-3g', 'fast-3g']) {
    for (const [pname, p] of Object.entries({ home: PATHS.home, os2: PATHS.os2 })) {
      const r = await measureWeak(browser, LIVE, p, profile, pname);
      weak.runs.push(r);
      console.log(
        `WEAK ${profile.padEnd(8)} ${pname.padEnd(5)} status/err=${r.navError ? 'ERR' : 'ok'} ` +
          `fcp=${Math.round(r.before.vitals.fcp)} lcp=${Math.round(r.before.vitals.lcp)} ` +
          `dcl=${r.before.nav.domContentLoaded} load=${r.before.nav.load} readable=${r.readableMs} ` +
          `imgs@load=${r.before.images.loaded}/${r.before.images.total} lazyAfter=${r.lazyImagesLoadedOnlyAfterScroll}`,
      );
    }
  }
  await saveJSON('weaknet.json', weak);

  // ---- 3. mobile delivery meta + 404 + duplicate-slash rendering
  const meta = await measureMeta(browser);
  await saveJSON('meta.json', meta);
  console.log('META viewport=', meta.meta.viewport, 'themeColor=', meta.meta.themeColor.length,
    'appleTouchIcon=', meta.meta.appleTouchIcon.length, 'manifest=', meta.meta.manifest.length,
    'og=', meta.meta.og.length, 'twitter=', meta.meta.twitter.length);
  console.log('404 status=', meta.notFound.status, 'title=', JSON.stringify(meta.notFound.title),
    'h1=', JSON.stringify(meta.notFound.h1), 'chars=', meta.notFound.bodyChars);
  console.log('DUPSLASH status=', meta.duplicateSlash.status, 'sheets=', meta.duplicateSlash.cssLoaded,
    'canonical=', meta.duplicateSlash.canonical);

  await browser.close();
  console.log('wrote', path.join(OUT, 'perf.json'), path.join(OUT, 'weaknet.json'), path.join(OUT, 'meta.json'));
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
