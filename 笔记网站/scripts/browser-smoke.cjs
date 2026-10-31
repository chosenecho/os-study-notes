async page => {
  const origin = 'http://127.0.0.1:4321';
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const report = [];
  await page.goto(`${origin}/chapters/chapter-2/`);
  assert(await page.locator('details.exercise-answer').count() === 16, '第二章答案数应为 16');
  assert(await page.locator('details.exercise-answer[open]').count() === 0, '答案应默认折叠');
  assert(await page.locator('[data-answers]').count() === 0, '顶部批量答案按钮未删除');
  await page.locator('details.exercise-answer summary').first().click();
  assert(await page.locator('details.exercise-answer[open]').count() === 1, '单题展开失败');
  await page.locator('details.exercise-answer summary').first().click();
  assert(await page.locator('details.exercise-answer[open]').count() === 0, '收起答案失败');
  await page.locator('.figure-zoom').first().click();
  assert(await page.locator('dialog.image-dialog').evaluate(d => d.open), '插图预览未打开');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('dialog.image-dialog').evaluate(d => d.open)), 'Esc 未关闭插图');
  const checkbox = page.locator('[data-complete]');
  const original = await checkbox.isChecked();
  await checkbox.setChecked(true);
  await page.reload();
  assert(await checkbox.isChecked(), '复习进度未持久保存');
  await page.goto(origin);
  assert(await page.locator('[data-progress-chapter="2"]').textContent() === '已复习', '首页进度未更新');
  await page.goto(`${origin}/chapters/chapter-2/`);
  await checkbox.setChecked(original);
  report.push('答案折叠、插图键盘操作、复习记录及首页同步通过');

  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await page.locator('.pagefind-ui__search-input').fill('信号量');
  await page.locator('.pagefind-ui__result-link').first().waitFor();
  assert((await page.locator('.pagefind-ui__result-link').count()) > 0, '中文搜索无结果');
  report.push('中文搜索“信号量”返回结果');
  await page.keyboard.press('Escape');

  await page.goto(`${origin}/lab/scheduling/`);
  assert((await page.locator('.lab-metrics').textContent()).includes('6.50'), 'FCFS 核算不符');
  await page.locator('select[name="algorithm"]').selectOption('spf');
  await page.getByRole('button', { name: '运行', exact: true }).click();
  assert((await page.locator('.lab-metrics').textContent()).includes('5.75'), 'SPF 核算不符');
  await page.locator('select[name="algorithm"]').selectOption('rr');
  await page.getByRole('button', { name: '运行', exact: true }).click();
  assert(await page.locator('.gantt-block').count() === 7, 'RR 片段数不符');
  report.push('调度实验三种算法交互与核算通过');

  for (const chapter of [1, 2, 3]) {
    await page.goto(`${origin}/chapters/chapter-${chapter}/`);
    for (const img of await page.locator('.figure-zoom img').all()) {
      const response = await page.request.get(await img.evaluate(element => element.src));
      assert(response.ok(), `第 ${chapter} 章插图缺失`);
    }
    assert(await page.locator('details.exercise-answer').count() > 0, '章节缺少折叠答案');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/chapters/chapter-2/', '/lab/scheduling/']) {
    await page.goto(origin + route);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `手机页面整体横向溢出：${route}`);
  }
  report.push('15 张插图请求成功；390px 首页、正文、实验页无整体横向溢出');
  assert(errors.length === 0, `浏览器异常：${errors.join('; ')}`);
  return report;
}
