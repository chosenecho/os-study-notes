import { session, PAGES, goto } from './lib/audit.mjs';

const probes = ['light', 'dark'];
for (const scheme of probes) {
  const s = await session('desktop-1440', { colorScheme: scheme });
  await goto(s.page, PAGES.os2);
  const info = await s.page.evaluate(() => {
    const g = (sel, props) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
      return out;
    };
    const h2 = document.querySelector('.md-content h2');
    const h2cs = h2 && getComputedStyle(h2);
    const prev = h2?.previousElementSibling;
    return {
      htmlScheme: document.documentElement.getAttribute('data-md-color-scheme'),
      bodyScheme: document.body.getAttribute('data-md-color-scheme'),
      htmlColorScheme: getComputedStyle(document.documentElement).colorScheme,
      storedPalette: localStorage.getItem('__palette'),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      htmlBg: getComputedStyle(document.documentElement).backgroundColor,
      vars: ['--md-default-bg-color', '--md-default-fg-color', '--note-bg', '--note-muted-surface', '--md-default-fg-color--lightest'].map((v) => [v, getComputedStyle(document.documentElement).getPropertyValue(v)]),
      searchForm: g('.md-search__form', ['background-color', 'box-shadow', 'color']),
      searchInput: g('.md-search__input', ['color', 'background-color']),
      navTitle: g('.md-nav--primary .md-nav__title', ['background-color', 'color', 'font-size']),
      toolbar: g('.study-toolbar', ['background-color', 'color', 'font-size']),
      figureZoom: g('.figure-zoom', ['background-color', 'color']),
      h2: h2cs && {
        marginTop: h2cs.marginTop,
        marginBottom: h2cs.marginBottom,
        paddingTop: h2cs.paddingTop,
        borderTop: h2cs.borderTopWidth + ' ' + h2cs.borderTopStyle,
        fontSize: h2cs.fontSize,
        fontWeight: h2cs.fontWeight,
        fontFamily: h2cs.fontFamily.slice(0, 40),
        prevTag: prev?.tagName + '.' + (prev?.className || ''),
        gapToPrev: prev ? Math.round(h2.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : null,
      },
      firstP: g('.md-content p', ['font-size', 'color', 'line-height']),
    };
  });
  console.log(scheme, JSON.stringify(info, null, 1));
  await s.close();
}
