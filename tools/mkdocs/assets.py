"""Process built assets without an intermediate documentation tree."""
from pathlib import Path
import re


def on_post_build(config):
    """Inline the reader stylesheet so it is no longer an extra blocking request,
    then prune files the site never ships to a visitor.

    Material copies the full lunr language pack and source maps into the build;
    this site only ever loads the zh pack plus the multi-language/stemmer helpers
    (see the network traces in archive/qa/rounds/r2/站点缺陷报告.md). Dropping them
    keeps the static deployment small without touching the theme.
    """
    css = (Path(config['docs_dir']) / 'assets/stylesheets/notes.css').read_text(encoding='utf-8')
    style = '<style>\n' + css + '\n</style>'
    site = Path(config['site_dir'])
    for html in site.rglob('*.html'):
        text = html.read_text(encoding='utf-8')
        if 'assets/stylesheets/notes.css' not in text:
            continue
        # Use a lambda: the replacement must be literal (CSS now contains \2190 etc.).
        text = re.sub(
            r'<link[^>]+href="[^"]*assets/stylesheets/notes\.css"[^>]*>\s*',
            lambda _match: style + '\n',
            text,
            count=1,
        )
        html.write_text(text, encoding='utf-8')

    # 1) Source maps are only useful in DevTools; they were never requested.
    for map_file in site.rglob('*.map'):
        map_file.unlink()

    # 2) Never-requested search assets: wordcut/tinyseg and the unused language packs.
    lunr = site / 'assets/javascripts/lunr'
    if lunr.exists():
        for name in ('wordcut.js', 'tinyseg.js'):
            candidate = lunr / name
            if candidate.exists():
                candidate.unlink()
        keep = {'lunr.zh.min.js', 'lunr.multi.min.js', 'lunr.stemmer.support.min.js'}
        for pack in (lunr / 'min').glob('lunr.*.min.js'):
            if pack.name not in keep:
                pack.unlink()

    # 3) notes.css is inlined above; the standalone copy is dead weight.
    standalone = site / 'assets/stylesheets/notes.css'
    if standalone.exists():
        standalone.unlink()

    # 3b) Material ships its default favicon even though the theme sets favicon.svg.
    for leftover in (site / 'assets/images').glob('favicon.png'):
        leftover.unlink()

    # 3c) KaTeX 的 JS 只在真的含公式的页面注入：判据是渲染后的
    #     ``class="arithmatex"`` 标记，不是目录名，所以哪门课先把公式迁过来，
    #     哪门课就自动生效。注意这只是 JS 按需：katex.min.css 走 mkdocs.yml 的
    #     extra_css，CSS 与 assets/vendor/katex/fonts/ 下的 20 个 woff2 仍然全站加载，
    #     但字体只有用到对应字形时浏览器才真正下载。
    #     扫描全部页面，章节与共用速查页都可按需加载。
    for html in sorted(site.rglob('*.html')):
        text = html.read_text(encoding='utf-8')
        if 'class="arithmatex"' not in text:
            continue
        math_script = re.search(r'<script src="([^"]*assets/)javascripts/math\.js"></script>', text)
        if math_script and 'assets/vendor/katex/katex.min.js' not in text:
            asset_prefix = math_script.group(1)
            tags = (
                f'<script src="{asset_prefix}vendor/katex/katex.min.js"></script>'
                f'<script src="{asset_prefix}vendor/katex/contrib/auto-render.min.js"></script>'
            )
            marker = math_script.group(0)
            html.write_text(text.replace(marker, tags + marker, 1), encoding='utf-8')
