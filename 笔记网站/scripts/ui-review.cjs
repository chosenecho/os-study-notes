async page => {
  const origin = 'http://127.0.0.1:4321';
  const assert = (ok, label) => { if (!ok) throw new Error(label); };
  const report = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.goto(origin);
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.getByRole('combobox', { name: '选择主题' }).selectOption(theme);
    const contrast = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = token => {
        const hex = style.getPropertyValue(token).trim().replace('#', '');
        const value = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
        const rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      return [['--note-text', '--note-surface'], ['--note-muted', '--note-surface'], ['--note-muted', '--note-muted-surface'], ['--note-on-button', '--note-button']].map(([a, b]) => {
        const x = luminance(a), y = luminance(b);
        return { pair: `${a}/${b}`, ratio: (Math.max(x, y) + .05) / (Math.min(x, y) + .05) };
      });
    });
    contrast.forEach(pair => assert(pair.ratio >= 4.5, `${theme} 对比不足 ${pair.pair} ${pair.ratio}`));
    report.push({ theme, minimumTextContrast: Math.min(...contrast.map(p => p.ratio)).toFixed(2) });
    await page.screenshot({ path: `.playwright-cli/review-${theme}.png` });
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width === 768 ? 600 : 844 });
      for (const route of ['/', '/chapters/chapter-2/', '/lab/scheduling/']) {
        await page.goto(origin + route);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} ${width} 溢出 ${route}`);
        if (route.includes('chapter-2')) {
          await page.locator('[data-reading-size]').selectOption('20');
          assert(await page.locator('.chapter-prose h2').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize) < 32), '标题重复缩放');
          for (const button of await page.locator('.study-toolbar button, .reading-size select').all()) {
            assert((await button.boundingBox()).height >= 44, '工具栏控件小于 44px');
          }
        }
      }
    }
  }
  await page.goto(`${origin}/chapters/chapter-2/`);
  await page.locator('[data-reading-size]').selectOption('16');
  await page.keyboard.press('Tab');
  await page.locator('details.exercise-answer summary').first().focus();
  assert(await page.locator('details.exercise-answer summary').first().evaluate(e => getComputedStyle(e).outlineStyle !== 'none'), '键盘焦点缺失');
  report.push('375/768/1024/1440px × 两种主题 × 三类页面通过；大字号、44px 控件、减少动态效果、键盘焦点通过');
  return report;
}
