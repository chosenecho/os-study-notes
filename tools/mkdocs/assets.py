"""Process built assets without an intermediate documentation tree."""
from pathlib import Path
from html import unescape
import json
import re
import subprocess


def render_math(site):
    """Ship readable HTML/MathML, with parse failures blocking the build."""
    pattern = re.compile(r'<(span|div) class="arithmatex">(.*?)</\1>', re.S)
    pages, expressions = [], []
    for path in sorted(site.rglob('*.html')):
        text = path.read_text(encoding='utf-8')
        matches = list(pattern.finditer(text))
        if not matches:
            text = re.sub(r'<link[^>]+href="[^"]*assets/vendor/katex/katex.min.css"[^>]*>\s*', '', text)
            path.write_text(text, encoding='utf-8')
            continue
        pages.append((path,text,len(matches)))
        for match in matches:
            tex = unescape(match[2]).strip()
            if not ((tex.startswith(r'\(') and tex.endswith(r'\)'))
                    or (tex.startswith(r'\[') and tex.endswith(r'\]'))):
                raise ValueError(f'Unexpected math delimiters: {path}')
            expressions.append({'tex':tex[2:-2], 'display':match[1] == 'div'})
    if not expressions:
        return
    result = subprocess.run(['node',str(Path(__file__).with_name('render-math.cjs'))],
                            input=json.dumps(expressions),text=True,encoding='utf-8',
                            capture_output=True)
    if result.returncode:
        raise ValueError(result.stderr.strip())
    rendered = iter(json.loads(result.stdout))
    for path,text,_count in pages:
        text = pattern.sub(lambda m: '<'+m[1]+' class="arithmatex">'+next(rendered)+'</'+m[1]+'>',text)
        if re.search(r'\$(?=<(?:span|div) class="arithmatex">)', text) or re.search(
                r'</(?:span|div)>\$', text):
            raise ValueError(f'Literal dollar adjacent to rendered math: {path}')
        path.write_text(text,encoding='utf-8')


def patch_browser_lunr_zh(site):
    """Give the browser bundle a deterministic tokenizer when jieba is unavailable."""
    path = site / 'assets/javascripts/lunr/min/lunr.zh.min.js'
    if not path.exists():
        raise ValueError(f'Missing browser Chinese tokenizer: {path}')
    text = path.read_text(encoding='utf-8')
    broken = 'r()(e.lunr)'
    fixed = ('r({cut:function(e){return Array.from(new Intl.Segmenter("zh",'
             '{granularity:"word"}).segment(e),function(t){return t.segment})}})(e.lunr)')
    if broken not in text:
        if 'new Intl.Segmenter("zh"' in text:
            return
        raise ValueError(f'Unexpected browser Chinese tokenizer bundle: {path}')
    path.write_text(text.replace(broken, fixed, 1), encoding='utf-8')


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
    render_math(site)
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
        patch_browser_lunr_zh(site)

    # 3) notes.css is inlined above; the standalone copy is dead weight.
    standalone = site / 'assets/stylesheets/notes.css'
    if standalone.exists():
        standalone.unlink()

    # 3b) Material ships its default favicon even though the theme sets favicon.svg.
    for leftover in (site / 'assets/images').glob('favicon.png'):
        leftover.unlink()

    # Brand origin 403s while retaining their HTTP status in nginx.
    missing = site / '404.html'
    if missing.exists():
        text = missing.read_text(encoding='utf-8')
        text = text.replace('页面未找到', '无法访问').replace('页面没有找到', '此请求无法访问')
        (site / '403.html').write_text(text,encoding='utf-8')
