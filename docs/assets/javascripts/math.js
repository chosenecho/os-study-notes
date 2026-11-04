// Math rendering for the notes site.
//
// `pymdownx.arithmatex: generic` emits `\(...\)` / `\[...\]` inside
// `.arithmatex` spans and divs. KaTeX is self-hosted under assets/vendor/katex/, so the
// existing CSP (`script-src 'self'`, `font-src 'self'`) keeps working.
//
// KaTeX is 275 KB of JavaScript; only the pages that actually contain formulas
// get it, so the two scripts are injected on demand instead of being loaded
// everywhere.
(() => {
  const SELF = document.currentScript && document.currentScript.src;
  const OPTIONS = {
    delimiters: [
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
    ],
    throwOnError: false,
    // Do not touch the search results, navigation labels or the header title.
    ignoredClasses: ['md-search-result', 'md-nav', 'md-header', 'md-footer'],
  };

  function resolve(name) {
    if (SELF) return new URL(`../vendor/katex/${name}`, SELF).href;
    return `assets/vendor/katex/${name}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.append(script);
    });
  }

  async function boot() {
    if (!document.querySelector('.arithmatex')) return;
    if (typeof window.renderMathInElement === 'function') {
      render();
      return;
    }
    try {
      await loadScript(resolve('katex.min.js'));
      await loadScript(resolve('contrib/auto-render.min.js'));
      render();
    } catch (error) {
      // Keep the page readable even if the CDN-less assets cannot be fetched.
      console.warn('[math] assets failed', error);
    }
  }

  function render() {
    try {
      window.renderMathInElement(document.body, OPTIONS);
      document.documentElement.classList.add('math-rendered');
    } catch (error) {
      // Never break the page because of one bad formula.
      console.warn('[math] render failed', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
