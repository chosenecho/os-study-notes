// Lead 交叉核对：只测少数关键点，用于校准与仲裁。
import { session, PAGES, goto, warm, layout, shot, shotElement, saveJSON } from '../lib/audit.mjs';

const out = {};

const lum = ([r, g, b]) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
};

// ---------- 1. 主题切换与深色一致性 ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os2);
  const read = () =>
    p.evaluate(() => {
      const cs = (sel) => (document.querySelector(sel) ? getComputedStyle(document.querySelector(sel)) : null);
      const parse = (c) => (c || '').match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? null;
      const form = cs('.md-search__form');
      const input = cs('.md-search__input');
      const fill = (el) => el && el.value;
      return {
        scheme: document.body.getAttribute('data-md-color-scheme'),
        bodyBg: cs('body')?.backgroundColor,
        searchFormBg: form?.backgroundColor,
        searchInputColor: input?.color,
        placeholder: (() => {
          const el = document.querySelector('.md-search__input');
          return el ? getComputedStyle(el, '::placeholder').color : null;
        })(),
        navTitleBg: cs('.md-nav--primary .md-nav__title')?.backgroundColor,
        navTitleColor: cs('.md-nav--primary .md-nav__title')?.color,
        figureBg: cs('.figure-zoom')?.backgroundColor,
        toolbarBg: cs('.study-toolbar')?.backgroundColor,
        tableHeadBg: cs('.md-typeset th')?.backgroundColor,
        codeBg: cs('.md-typeset code')?.backgroundColor,
        h2Color: cs('.md-content h2')?.color,
        pColor: cs('.md-content p')?.color,
        parsed: { body: parse(cs('body')?.backgroundColor), form: parse(form?.backgroundColor), input: parse(input?.color) },
      };
    });
  const before = await read();
  await shotElement(p, '.md-search', 'artifacts/lead/search-light.png').catch(() => null);
  await shot(p, 'artifacts/lead/theme-light.png');
  await p.click('label[for="__palette_1"]');
  await p.waitForTimeout(400);
  const after = await read();
  await shot(p, 'artifacts/lead/theme-dark.png');
  await shotElement(p, '.md-search', 'artifacts/lead/search-dark.png').catch(() => null);
  // 深色下插图
  await goto(p, PAGES.os3);
  await warm(p);
  const darkFig = await p.evaluate(() => {
    const f = document.querySelector('.figure-zoom');
    if (!f) return null;
    return { figureBg: getComputedStyle(f).backgroundColor, pageBg: getComputedStyle(document.body).backgroundColor, hasFigure: true, imgs: document.querySelectorAll('.figure-zoom').length };
  });
  await shot(p, 'artifacts/lead/dark-chapter3.png');
  await shotElement(p, '.figure-zoom', 'artifacts/lead/dark-figure.png').catch(() => null);
  out.theme = { before, after, darkFigure: darkFig, toggleWorks: before.scheme !== after.scheme };
  out.theme.placeholderContrast = after.parsed.form && after.parsed.input
    ? { light: ratio(JSON.parse(JSON.stringify(before.parsed.input)), before.parsed.form), dark: ratio(after.parsed.input, after.parsed.form) }
    : null;
  await s.close();
}

// ---------- 2. 窄屏（360）表格/代码/甘特 ----------
{
  const s = await session('android-360');
  const p = s.page;
  for (const key of ['os2', 'co2', 'lab']) {
    await goto(p, PAGES[key]);
    await warm(p);
    const l = await layout(p);
    out[`narrow-${key}`] = {
      horizontalOverflow: l.horizontalOverflow,
      docScrollWidth: l.docScrollWidth,
      offenders: l.overflowOffenders,
      tablesOverflowing: l.tablesOverflowing,
      clipped: l.clipped,
    };
    await shot(p, `artifacts/lead/narrow-${key}.png`);
  }
  await s.close();
}

// ---------- 3. 字号选择是否真的改变正文 ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os1);
  const measure = () =>
    p.evaluate(() => ({
      prose: getComputedStyle(document.querySelector('.md-content__inner')).fontSize,
      p: getComputedStyle(document.querySelector('.md-typeset.chapter-prose p')).fontSize,
      toolbar: getComputedStyle(document.querySelector('.study-toolbar')).fontSize,
      root: getComputedStyle(document.documentElement).fontSize,
      select: document.querySelector('[data-reading-size]')?.value,
    }));
  const steps = [await measure()];
  for (const v of ['18', '20']) {
    await p.selectOption('[data-reading-size]', v);
    await p.waitForTimeout(120);
    steps.push(await measure());
  }
  await p.reload({ waitUntil: 'networkidle' });
  steps.push(await measure());
  out.fontSize = steps;
  await s.close();
}

// ---------- 4. 章节标题间距 & 锚点落点 ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.os2);
  const spacing = await p.evaluate(() => {
    const h2s = [...document.querySelectorAll('.md-content h2')];
    return h2s.slice(0, 6).map((h) => {
      const cs = getComputedStyle(h);
      const prev = h.previousElementSibling;
      return {
        text: h.textContent.trim().slice(0, 20),
        marginTop: cs.marginTop,
        paddingTop: cs.paddingTop,
        borderTop: cs.borderTopWidth,
        fontSize: cs.fontSize,
        gapFromPrev: prev ? Math.round(h.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : null,
        prevTag: prev?.tagName,
      };
    });
  });
  // 点击目录锚点，看落点是否被页头遮挡
  const visibleToc = p.locator('.md-nav--secondary a.md-nav__link:visible');
  const tocCount = await visibleToc.count();
  const tocLink = visibleToc.nth(Math.min(2, Math.max(0, tocCount - 1)));
  const href = await tocLink.getAttribute('href');
  await tocLink.click();
  await p.waitForTimeout(600);
  const anchor = await p.evaluate(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = document.getElementById(id);
    const header = document.querySelector('.md-header');
    const h = el?.getBoundingClientRect();
    return {
      hash: location.hash,
      targetTop: h ? Math.round(h.top) : null,
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
      hiddenUnderHeader: h ? h.top < (header?.getBoundingClientRect().height ?? 0) : null,
      scrollY: Math.round(scrollY),
    };
  });
  await shot(p, 'artifacts/lead/anchor.png');
  out.headingSpacing = spacing;
  out.anchor = { href, ...anchor };
  await s.close();
}

// ---------- 5. 首页自身问题（导航顺序、进度、CTA） ----------
{
  const s = await session('desktop-1440');
  const p = s.page;
  await goto(p, PAGES.home);
  out.home = await p.evaluate(() => {
    const sectionOrder = [...document.querySelectorAll('.md-content > h2')].map((h) => h.textContent.replace('¶', '').trim());
    return {
      sectionOrder,
      progressCounts: [...document.querySelectorAll('[data-progress-count]')].map((e) => e.textContent),
      progressBars: [...document.querySelectorAll('progress')].map((e) => e.value + '/' + e.max),
      nextChapterEl: !!document.querySelector('[data-next-chapter]'),
      progressBadges: document.querySelectorAll('[data-progress-chapter]').length,
      cards: document.querySelectorAll('.grid.cards > ul > li').length,
      internalLinks: [...document.querySelectorAll('.md-content a[href]')].length,
    };
  });
  await shot(p, 'artifacts/lead/home.png', { fullPage: false });
  await s.close();
}

console.log(await saveJSON('artifacts/lead/lead-check.json', out));
console.log(JSON.stringify(out).slice(0, 3000));
