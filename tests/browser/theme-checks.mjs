import assert from 'node:assert/strict';
import path from 'node:path';
import {readFileSync} from 'node:fs';
const courses=JSON.parse(readFileSync(new URL('../../config/courses.json',import.meta.url),'utf8'));

export async function runThemeChecks(page, {base, out, report}) {
  const open = async url => {
    const response = await page.goto(base + url, {waitUntil: 'networkidle'});
    assert.equal(response.status(), 200, url);
    const icp = page.locator('footer a[href="https://beian.miit.gov.cn/"]');
    assert.equal(await icp.textContent(), '苏ICP备2026085504号-1');
    assert.equal(await icp.getAttribute('target'), '_blank');
    assert.equal(await icp.getAttribute('rel'), 'noopener noreferrer');
    const contact = page.locator('footer a[href="mailto:chosenecho@163.com"]');
    assert.equal(await contact.textContent(), '联系方式：chosenecho@163.com');
  };
  const screenshot = async name => {
    await page.screenshot({path: path.join(out, name), animations: 'disabled'});
    report.screenshots.push(name);
  };
  const footerPath = async direction => new URL(
    await page.locator('.md-footer__link--' + direction).getAttribute('href'), page.url()).pathname;

  await open('/');
  assert.match(await page.title(), /studynote/);
  assert.equal(await page.locator('article a[href="mailto:chosenecho@163.com"]').count(), 0);
  assert.match(await page.locator('article').innerText(), /许可与版权/);
  assert.equal(await page.locator('.md-tabs__item').count(), courses.length+3);
  assert.equal(await page.locator('.grid.cards > ul > li').count(), courses.length);
  await page.evaluate(ids => {
    localStorage.setItem('studynote:completed:v1', JSON.stringify(ids.map(id => id+'-1')));
    localStorage.setItem('studynote:font-size:v1', '18');
  }, courses.map(course => course.id));
  await page.reload({waitUntil: 'networkidle'});
  for (const {id: course} of courses) {
    assert.equal(await page.locator('[data-progress-count="' + course + '"]').innerText(), '1');
    const next = page.locator('[data-next-chapter="' + (course + '-') + '"]');
    assert.match(await next.getAttribute('href'), /chapter-02[/]$/);
  }
  await screenshot('home-desktop.png');

  await open('/licensing/');
  assert.match(await page.locator('article').innerText(), /教材、大纲与第三方引用/);
  const licenseResponse = await page.request.get(base + '/licenses/Apache-2.0.txt');
  assert.equal(licenseResponse.status(), 200);
  assert.match(await licenseResponse.text(), /Apache License/);
  await page.locator('article a[href="../third-party-notices/"]').click();
  await page.waitForURL(base + '/third-party-notices/');
  assert.match(await page.locator('article').innerText(), /MPL-1.1/);
  const searchSource = await page.request.get(base + '/licenses/third-party/lunr-languages/lunr.zh.js');
  assert.equal(searchSource.status(), 200);
  assert.match(await searchSource.text(), /Felix Lian/);
  report.checks.push('studynote branding, rights exclusions and distributed license/search-source notices');
  await open('/');

  await page.locator('.md-tabs a[href="courses/operating-systems/"]').click();
  await page.waitForURL(base + '/courses/operating-systems/');
  assert.match(await page.locator('h1').innerText(), /^操作系统概论/);
  assert.equal(await page.locator('[data-progress-chapter]').count(), 6);
  assert.equal(await page.locator('[data-progress-chapter="os-1"]').innerText(), '已复习');
  assert.equal(await footerPath('next'), '/courses/operating-systems/chapter-01/');
  assert(!(await page.locator('article').innerText()).includes('local/materials/'));
  await screenshot('course-desktop.png');

  await open('/courses/operating-systems/chapter-01/');
  assert.equal(await page.locator('[data-complete]').isChecked(), true);
  assert.equal(await page.locator('[data-reading-size]').inputValue(), '18');
  assert.equal(await page.locator('.chapter-prose').evaluate(el => getComputedStyle(el).fontSize), '18px');
  await page.locator('[data-reading-size]').selectOption('20');
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('[data-reading-size]').inputValue(), '20');
  await page.locator('[data-reading-size]').selectOption('16');
  assert.equal(await footerPath('prev'), '/courses/operating-systems/');
  assert.equal(await footerPath('next'), '/courses/operating-systems/chapter-02/');
  assert.equal(await page.locator('.chapter-nav').count(), 0);
  await screenshot('chapter-desktop.png');

  const answer = page.locator('details.exercise-answer').first();
  assert.equal(await answer.getAttribute('open'), null);
  await answer.locator('summary').focus();
  await page.keyboard.press('Enter');
  assert.match(await answer.innerText(), /参考答案/);
  await page.keyboard.press('Enter');
  assert.equal(await answer.getAttribute('open'), null);
  await page.locator('.figure-zoom').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.image-dialog').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.image-dialog').isVisible(), false);

  await page.locator('label[for="__palette_1"]').click();
  await page.waitForFunction(() => document.body.dataset.mdColorScheme === 'slate');
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('body').getAttribute('data-md-color-scheme'), 'slate');
  await page.evaluate(() => scrollTo(0, 0));
  await screenshot('chapter-dark.png');
  await page.locator('label[for="__palette_0"]').click();
  await page.waitForFunction(() => document.body.dataset.mdColorScheme === 'default');

  await page.evaluate(() => scrollTo(0, innerHeight * 4));
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollBy(0, -400));
  await page.waitForFunction(() => {
    const button = document.querySelector('.md-top');
    return button && !button.hidden;
  });
  await page.locator('.md-top').click();
  await page.waitForFunction(() => scrollY < 10);

  await page.locator('.md-search__input').fill('进程');
  await page.waitForFunction(() => document.querySelectorAll('.md-search-result__link').length > 0);
  const share = page.locator('[data-md-component="search-share"]');
  await page.waitForFunction(() => new URL(document.querySelector('[data-md-component="search-share"]').href)
    .searchParams.get('q') === '进程');
  assert.equal(await share.isVisible(), true);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await share.click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await share.getAttribute('href'));
  await page.locator('.md-search__input').fill('内存');
  await page.waitForFunction(() => new URL(document.querySelector('[data-md-component="search-share"]').href)
    .searchParams.get('q') === '内存');
  await share.click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await share.getAttribute('href'));
  await screenshot('search-chinese.png');
  await page.keyboard.press('Escape');
  report.checks.push('Native tabs, indexes, footer, theme persistence, Chinese search/share, reading controls and keyboard disclosures');

  await open('/courses/operating-systems/chapter-06/');
  assert.equal(await footerPath('next'), '/courses/computer-organization/');
  await open('/courses/computer-organization/');
  assert.equal(await page.locator('[data-progress-chapter="co-1"]').innerText(), '已复习');
  await open('/courses/computer-organization/chapter-02/');
  await page.waitForSelector('.katex');
  assert.equal(await page.locator('.katex-error').count(), 0);
  await page.emulateMedia({media: 'print'});
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('details.exercise-answer:not([open])').count(), 0);
  assert.equal(await page.locator('.study-toolbar').isVisible(), false);
  await page.emulateMedia({media: 'screen'});
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.locator('details.exercise-answer[open]').count(), 0);
  report.checks.push('Course boundary footer, course progress, local math and print answer expansion');

  await open('/courses/computer-organization/chapter-06/');
  assert.equal(await footerPath('next'), '/courses/computer-networks/');
  await open('/courses/computer-networks/');
  assert.equal(await page.locator('[data-progress-chapter]').count(), 9);
  await page.evaluate(() => localStorage.setItem('studynote:completed:v1', JSON.stringify(Array.from({length:8}, (_,i)=>'cn-'+(i+1)))));
  await open('/');
  assert.equal(await page.locator('[data-progress-count="cn"]').innerText(), '8');
  assert.match(await page.locator('[data-next-chapter="cn-"]').getAttribute('href'), /chapter-09[/]$/);
  await open('/courses/computer-networks/chapter-09/');
  await page.locator('[data-complete]').check();
  assert.equal(await footerPath('next'), '/courses/multimedia-technology/');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-complete]').isChecked(), true);
  await open('/');
  assert.equal(await page.locator('[data-progress-count="cn"]').innerText(), '9');
  assert.equal(await page.locator('[data-study-progress="cn"]').getAttribute('max'), '9');
  assert.match(await page.locator('[data-next-chapter="cn-"]').innerText(), /回顾第一章/);
  await open('/courses/computer-networks/chapter-05/');
  await page.locator('.figure-zoom').first().click();
  assert.equal(await page.locator('.image-dialog').isVisible(), true);
  await screenshot('network-figure-desktop.png');
  await page.keyboard.press('Escape');
  await page.locator('.md-search__input').fill('子网');
  await page.waitForFunction(()=> [...document.querySelectorAll('.md-search-result__link')].some(a=>a.href.includes('/computer-networks/')));
  await page.keyboard.press('Escape');
  report.checks.push('Nine-chapter progress, chapter 9 persistence, course boundaries, network search and figure zoom');

  await open('/courses/multimedia-technology/');
  assert.equal(await page.locator('[data-progress-chapter]').count(), 9);
  assert.match(await page.locator('article').innerText(), /OCR 尚未终校/);
  await open('/courses/multimedia-technology/chapter-04/');
  assert.equal(await page.locator('.exercise-answer').count(), 4);
  assert.match(await page.locator('article').innerText(), /OCR 尚未终校/);
  await screenshot('multimedia-desktop.png');
  await open('/courses/multimedia-technology/chapter-09/');
  assert.equal(await footerPath('next'), '/reference/');
  await page.locator('[data-complete]').check();
  await page.reload({waitUntil: 'networkidle'});
  assert.equal(await page.locator('[data-complete]').isChecked(), true);
  await open('/');
  assert.equal(await page.locator('[data-progress-count="mm"]').innerText(), '1');
  report.checks.push('Multimedia draft warning, nine-chapter index, progress persistence and footer');

  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({width, height: 900});
    for (const url of ['/', '/courses/operating-systems/', '/courses/computer-organization/', '/courses/operating-systems/chapter-02/',
      '/courses/computer-organization/chapter-05/', '/courses/computer-networks/', '/courses/computer-networks/chapter-02/', '/courses/computer-networks/chapter-05/', '/courses/computer-networks/chapter-09/', '/courses/multimedia-technology/', '/courses/multimedia-technology/chapter-04/', '/courses/multimedia-technology/chapter-08/', '/labs/scheduling/']) {
      await open(url);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false, url + ' at ' + width + 'px');
    }
    if (width === 390) {
      await open('/');
      await screenshot('home-mobile.png');
      await open('/courses/operating-systems/chapter-02/');
      await screenshot('chapter-mobile.png');
      await open('/courses/computer-networks/chapter-05/');
      await screenshot('network-mobile.png');
      await open('/courses/multimedia-technology/chapter-08/');
      await screenshot('multimedia-mobile.png');
      await open('/courses/operating-systems/chapter-02/');
      await page.locator('[data-drawer-toggle]').click();
      assert.equal(await page.locator('#__drawer').isChecked(), true);
      await screenshot('navigation-mobile.png');
      await page.locator('.md-nav__title[for="__nav_2"]').click();
      const course = page.locator('.md-sidebar--primary a[href$="/computer-organization/"]').first();
      await course.click();
      await page.waitForURL(base + '/courses/computer-organization/');
    }
  }
  report.checks.push('Home, all course indexes, long chapters/tables and scheduler at 320/390/768/1280px; mobile course navigation');
  await page.setViewportSize({width: 1280, height: 900});
  await page.evaluate(() => {
    localStorage.removeItem('studynote:completed:v1');
    localStorage.removeItem('studynote:font-size:v1');
  });
}
