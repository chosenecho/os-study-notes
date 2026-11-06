import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {questions} from '../../docs/assets/javascripts/labs/quiz-bank.mjs';

const root = path.resolve('dist'), out = path.resolve('artifacts/browser/issues');
fs.mkdirSync(out, {recursive: true});
const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.mjs': 'application/javascript', '.svg': 'image/svg+xml', '.json': 'application/json'};
const server = http.createServer((req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) {res.writeHead(403).end(); return;}
    res.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(fs.readFileSync(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless: true});
const report = {checks: [], errors: [], expectedFaults: []};
const ok = name => report.checks.push(name);
let page;
let injectingLanguageFailure = false;
try {
  page = await browser.newPage({viewport: {width: 1280, height: 900}});
  page.on('pageerror', e => {
    const message = String(e);
    if (injectingLanguageFailure && /importScripts.*lunr\.zh\.min\.js/.test(message)) report.expectedFaults.push(message);
    else report.errors.push(message);
  });
  page.on('console', message => {
    if (/Invalid query:/.test(message.text())) report.errors.push(message.text());
  });
  let indexRequests = 0, blockIndex = true;
  await page.route('**/search/search_index.json', route => {
    indexRequests++;
    return blockIndex ? route.abort() : route.continue();
  });
  await page.goto(base + '/courses/operating-systems/chapter-04/', {waitUntil: 'networkidle'});
  assert.equal(indexRequests, 0, 'Search must not fetch its index before interaction');
  const query = page.locator('.md-search__input');
  await query.fill('抖动');
  await page.getByRole('button', {name: '重新加载搜索', exact: true}).waitFor({state: 'visible'});
  assert.match(await page.locator('.md-search-result__meta').innerText(), /加载失败/);
  blockIndex = false;
  const beforeRetry = page.url();
  await page.getByRole('button', {name: '重新加载搜索', exact: true}).click();
  await page.waitForSelector('.md-search-result__link');
  assert.equal(page.url(), beforeRetry);
  assert.equal(indexRequests, 2);
  ok('Search index is lazy; network failure recovers in the same page by retry');
  for (const term of ['分片', '溢出', '抖动', '饥饿', '补码溢出', 'PV 操作', '子网']) {
    await query.fill(term);
    await page.waitForFunction(term => [...document.querySelectorAll('.md-search-result__link')].some(a => new URL(a.href).searchParams.get('h') === term), term);
    assert.match(await page.locator('.md-search-result__meta').innerText(), /\d+ 个/);
  }
  await query.fill('死锁');
  await page.waitForFunction(() => [...document.querySelectorAll('.md-search-result__link')].some(a => new URL(a.href).searchParams.get('h') === '死锁'));
  assert.match(await page.locator('.md-search-result__link').first().innerText(), /死锁与必要条件/);
  ok('Chinese search keeps the Lunr-ranked chapter result instead of replacing it wholesale with fallback ordering');
  assert.equal((await page.locator('.md-search-result__list').innerText()).includes('<p>'), false, 'Fallback snippets omit HTML tags');
  await page.screenshot({path: path.join(out, 'search-desktop.png'), animations: 'disabled'});
  assert.equal(await page.locator('[aria-live] .md-search-result__list').count(), 0, 'Only the status message is a live region');
  await query.fill('qzxvnonexistent');
  await page.waitForFunction(() => document.querySelector('.md-search-result__meta').textContent.includes('没有找到'));
  assert(await page.getByRole('link', {name: '查看术语与缩写表'}).isVisible());
  assert.equal(await page.getByRole('button', {name: '重新加载搜索', exact: true}).isVisible(), false);
  await page.getByRole('button', {name: '清空搜索'}).click();
  await page.waitForFunction(() => document.querySelectorAll('.md-search-result__link').length === 0);
  ok('Chinese input events, zero-result alternatives and reset update the result panel');

  for (const width of [1280, 1024]) {
    await page.setViewportSize({width, height: 900});
    await query.fill('抖动');
    await page.waitForSelector('.md-search-result__link');
    await query.focus();
    let reachedMain = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => !!document.activeElement.closest('.md-main'))) reachedMain = true;
    }
    assert.equal(reachedMain, true, 'Tab must reach the page content at ' + width);
    assert.equal(await page.locator('#__search').isChecked(), false);
  }
  ok('Thirty consecutive Tab presses escape search and reach navigation/content at 1280 and 1024px');
  await page.setViewportSize({width: 390, height: 844});
  const searchButton = page.getByRole('button', {name: '打开搜索', exact: true});
  assert.equal(await page.locator('#' + await searchButton.getAttribute('aria-controls')).getAttribute('role'), 'search');
  await searchButton.click();
  await page.screenshot({path: path.join(out, 'search-mobile.png'), animations: 'disabled'});
  const clearSize = await page.getByRole('button', {name: '清空搜索'}).evaluate(el => ({width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height}));
  assert(clearSize.width >= 44 && clearSize.height >= 44, JSON.stringify(clearSize));
  await page.keyboard.press('Escape');
  assert.equal(await searchButton.evaluate(el => el === document.activeElement), true);
  assert(await searchButton.isVisible());
  assert.equal(await searchButton.getAttribute('aria-expanded'), 'false');
  ok('Mobile search Escape restores focus to the visible trigger');

  const drawer = page.locator('[data-drawer-toggle]');
  await drawer.focus(); await page.keyboard.press('Space');
  assert.equal(await drawer.getAttribute('aria-expanded'), 'true');
  const controlled = await drawer.getAttribute('aria-controls');
  assert.equal(await page.locator('#' + controlled).getAttribute('inert'), null);
  assert.equal(await page.locator('.md-content').evaluate(el => el.inert), true);
  await page.screenshot({path: path.join(out, 'drawer-mobile.png'), animations: 'disabled'});
  for (let i = 0; i < 35; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('.md-sidebar--primary, [data-drawer-toggle]')), true);
  }
  await page.keyboard.press('Escape');
  assert.equal(await drawer.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('.md-content').evaluate(el => el.inert), false);
  assert.equal(await drawer.evaluate(el => el === document.activeElement), true);
  await drawer.click(); assert.equal(await drawer.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('s');
  assert.equal(await drawer.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#__search').isChecked(), true);
  assert.equal(await page.locator('.md-content').evaluate(el => el.inert), false);
  await page.keyboard.press('Escape');
  await drawer.click();
  await page.locator('.md-overlay[for="__drawer"]').click({position: {x: 380, y: 400}});
  assert.equal(await drawer.getAttribute('aria-expanded'), 'false');
  assert.equal(await drawer.evaluate(el => el === document.activeElement), true);
  await drawer.click();
  await page.setViewportSize({width: 1280, height: 900});
  assert.equal(await page.locator('.md-content').evaluate(el => el.inert), false);
  assert.equal(await page.locator('.md-sidebar--primary').evaluate(el => el.inert), false);
  ok('Drawer has an actual controlled region, keyboard containment and reversible background inert state');

  await page.goto(base + '/labs/quiz/', {waitUntil: 'networkidle'});
  await page.locator('[data-clear]').click();
  const os = questions.find(q => q.course === 'os');
  await page.locator('#quiz-course').selectOption('os');
  await page.locator('input[value="' + ((os.answer + 1) % os.options.length) + '"]').check();
  await page.getByRole('button', {name: '提交答案', exact: true}).click();
  await page.locator('#quiz-course').selectOption('cn');
  await page.locator('#quiz-course').selectOption('os');
  assert.equal(await page.locator('[data-next]').isEnabled(), true);
  assert.match(await page.locator('[data-quiz-feedback]').innerText(), /本题答错/);
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('#quiz-course').inputValue(), 'os');
  assert.match(await page.locator('[data-missed]').innerText(), /1 题/);
  await page.locator('[data-new]').click();
  assert.match(await page.locator('[data-missed]').innerText(), /1 题/);
  await page.locator('[data-missed]').click();
  assert.match(await page.locator('.study-caption').innerText(), /1 \/ 1 题/);
  await page.locator('input[value="' + os.answer + '"]').check();
  await page.getByRole('button', {name: '提交答案', exact: true}).click();
  await page.locator('[data-next]').click();
  await page.reload({waitUntil: 'networkidle'});
  assert.match(await page.locator('[data-quiz-body]').innerText(), /答对 1 \/ 1 题/);
  assert.equal(await page.locator('[data-missed]').isDisabled(), true);
  assert.match(await page.locator('[data-quiz-history]').innerText(), /累计作答 2 次/);
  await page.locator('[data-clear]').click();
  assert.match(await page.locator('[data-quiz-history]').innerText(), /尚无作答记录/);
  ok('Quiz course state, persisted scores and wrong-answer notebook survive navigation and reload; clearing removes history');

  let blockLab = true;
  await page.route('**/assets/javascripts/labs/labs.mjs*', route => blockLab ? route.abort() : route.continue());
  await page.goto(base + '/labs/paging/', {waitUntil: 'networkidle'});
  await page.getByRole('button', {name: '重新加载练习', exact: true}).waitFor();
  blockLab = false;
  await page.getByRole('button', {name: '重新加载练习', exact: true}).click();
  await page.getByRole('button', {name: '运行并核对', exact: true}).waitFor();
  ok('Exercise entry module failure can be retried without reloading the page');
  for (const dependency of ['labs-core', 'quiz-bank', 'quiz-state']) {
    let blockedDependency = true;
    await page.route('**/assets/javascripts/labs/' + dependency + '.mjs*', route => blockedDependency ? route.abort() : route.continue());
    await page.goto(base + '/labs/quiz/', {waitUntil: 'networkidle'});
    await page.getByRole('button', {name: '重新加载练习', exact: true}).waitFor();
    blockedDependency = false;
    await page.getByRole('button', {name: '重新加载练习', exact: true}).click();
    await page.getByRole('button', {name: '提交答案', exact: true}).waitFor();
  }
  ok('Retries refresh failed nested exercise models and question-bank dependencies');

  let slow = true;
  await page.route('**/search/search_index.json', async route => {
    if (slow) await new Promise(resolve => setTimeout(resolve, 5000));
    await route.continue().catch(() => {});
  });
  await page.goto(base + '/courses/operating-systems/chapter-04/', {waitUntil: 'networkidle'});
  await page.locator('.md-search__input').fill('抖动');
  await page.waitForFunction(() => document.querySelector('.md-search-result__meta').textContent.includes('加载超时'));
  slow = false;
  await page.getByRole('button', {name: '重新加载搜索', exact: true}).click();
  await page.waitForSelector('.md-search-result__link');
  await page.unroute('**/search/search_index.json');
  ok('A stalled index reaches a bounded timeout and can recover by retry');

  let blockLanguage = true;
  injectingLanguageFailure = true;
  await page.route('**/lunr.zh.min.js', route => blockLanguage ? route.abort() : route.continue());
  await page.goto(base + '/courses/operating-systems/chapter-04/', {waitUntil: 'networkidle'});
  await page.locator('.md-search__input').fill('抖动');
  await page.getByRole('button', {name: '重新加载搜索', exact: true}).waitFor();
  blockLanguage = false;
  injectingLanguageFailure = false;
  await page.getByRole('button', {name: '重新加载搜索', exact: true}).click();
  await page.waitForSelector('.md-search-result__link');
  ok('Search worker language-file failure is recoverable with a new worker');
  await page.goto(base + '/courses/operating-systems/chapter-04/?h=' + encodeURIComponent('抖动'), {waitUntil: 'networkidle'});
  assert(await page.locator('.md-content__inner mark').count() > 0, 'Search destination highlights the matching text');
  ok('Search destination highlighting is preserved without eagerly loading the index');

  const blocked = await browser.newPage();
  blocked.on('pageerror', e => report.errors.push(String(e)));
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', {configurable: true, get() {throw Error('blocked');}}));
  await blocked.goto(base + '/labs/quiz/', {waitUntil: 'networkidle'});
  assert.match(await blocked.locator('[data-quiz-storage]').innerText(), /浏览器未允许保存/);
  await blocked.locator('input[value="0"]').check();
  await blocked.getByRole('button', {name: '提交答案', exact: true}).click();
  assert.equal(await blocked.locator('[data-next]').isEnabled(), true);
  ok('Storage denial leaves a working quiz and an explicit temporary-session message');
  await blocked.close();
  const index = JSON.parse(fs.readFileSync(path.join(root, 'search/search_index.json')));
  assert.equal(index.docs.some(d => /正在载入练习|需要 JavaScript|本章已复习\s*字号/.test(d.text)), false);
  ok('Search index omits controls and JavaScript fallback notices');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base + '/labs/quiz/', {waitUntil: 'networkidle'});
  await page.screenshot({path: path.join(out, 'quiz-mobile.png'), fullPage: true});
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack;
  if (page) {
    report.state = await page.evaluate(() => ({query: document.querySelector('.md-search__input')?.value, search: document.querySelector('.md-search__output')?.innerText, focus: document.activeElement.outerHTML.slice(0, 500)}));
    await page.screenshot({path: path.join(out, 'failure.png'), fullPage: true});
  }
  throw error;
} finally {
  fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
