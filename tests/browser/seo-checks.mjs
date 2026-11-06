import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';

export async function runSeoChecks(page, {base, out, report}) {
  const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
  assert.equal(gunzipSync(fs.readFileSync('dist/sitemap.xml.gz')).toString(), sitemap);
  assert(!sitemap.includes('<lastmod>'), 'build time must not become an editorial update date');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  for (const canonical of locations) {
    const url = new URL(canonical);
    await page.goto(base + url.pathname, {waitUntil: 'networkidle'});
    const schema = await page.locator('script[type="application/ld+json"]').evaluateAll(
      els => els.map(el => JSON.parse(el.textContent)));
    assert.equal(schema.length, 1, url.pathname);
    assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'),
      await page.title(), url.pathname);
    if (url.pathname === '/') {
      assert.equal(schema[0]['@type'], 'WebSite');
      const heading = await page.locator('h1').evaluate(el => {
        const copy = el.cloneNode(true);
        copy.querySelectorAll('.headerlink').forEach(anchor => anchor.remove());
        return copy.textContent.trim();
      });
      assert.equal(schema[0].name, 'studynote');
      assert.match(heading, /自考计算机/);
    } else {
      assert.equal(schema[0]['@type'], 'BreadcrumbList');
      const visible = await page.locator('.study-breadcrumbs li').evaluateAll(els =>
        els.map(el => ({name: el.textContent.trim(), href: el.querySelector('a')?.href})));
      assert.equal(visible.length, schema[0].itemListElement.length);
      for (let i = 0; i < visible.length; i++) {
        const item = schema[0].itemListElement[i];
        assert.equal(visible[i].name, item.name);
        if (visible[i].href) {
          assert.equal(new URL(visible[i].href).origin, new URL(base).origin,
            'preview breadcrumb must remain in the current site');
          assert.equal(new URL(visible[i].href).pathname, new URL(item.item).pathname);
        }
      }
      assert.equal(await page.locator('.study-breadcrumbs [aria-current="page"]').count(), 1);
    }
  }
  await page.goto(base + '/404.html', {waitUntil: 'networkidle'});
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  report.checks.push('All sitemap pages: rendered JSON-LD, visible breadcrumbs, local preview links, matching social titles; 404 noindex; sitemap gzip without build-date lastmod');

  const context = await page.context().browser().newContext({javaScriptEnabled: false,
    viewport: {width: 390, height: 844}});
  try {
    const nojs = await context.newPage();
    for (const [lab, text] of [['scheduling', '6.5 ms'], ['banker', 'P0 → P1 → P2'],
      ['paging', 'FIFO 共缺页 5 次'], ['address', '7620'], ['cache', '4 次不命中、2 次命中'],
      ['complement', '−116，发生有符号溢出']]) {
      await nojs.goto(base + '/labs/' + lab + '/');
      assert((await nojs.locator('.md-content').innerText()).includes(text), lab + ' static answer');
      assert.equal(await nojs.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false, lab + ' no-JS mobile overflow');
    }
    await nojs.goto(base + '/labs/paging/');
    await nojs.locator('h2').filter({hasText: '自编算例'}).scrollIntoViewIfNeeded();
    const name = 'seo-static-example-mobile.png';
    await nojs.screenshot({path: path.join(out, name), animations: 'disabled'});
    report.screenshots.push(name);
    report.checks.push('Six worked examples readable with JavaScript disabled at 390px');
  } finally {
    await context.close();
  }

  // Hold the lazy module until after first paint; the following section must
  // not jump when the default paging form replaces its placeholder.
  for (const width of [390, 1280]) {
    await page.setViewportSize({width, height: 900});
    let release;
    const ready = new Promise(resolve => { release = resolve; });
    const pattern = '**/labs/labs.mjs';
    await page.route(pattern, async route => { await ready; await route.continue(); });
    await page.goto(base + '/labs/paging/', {waitUntil: 'domcontentloaded'});
    const section = page.locator('h2').filter({hasText: '模型约定'});
    const before = await section.evaluate(el => el.getBoundingClientRect().top);
    release();
    await page.waitForSelector('.study-lab form');
    assert(Math.abs(await section.evaluate(el => el.getBoundingClientRect().top) - before) < 1,
      width + 'px lazy form moves the following content');
    await page.unroute(pattern);
  }
  await page.setViewportSize({width: 1280, height: 900});
  report.checks.push('Delayed exercise module leaves following content in place on mobile and desktop');
}
