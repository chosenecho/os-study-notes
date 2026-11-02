"""Build pages from the original notes; no Node.js dependency."""
from pathlib import Path
import json
import logging
import re
import shutil

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
COURSES = REPO / '课程'
SOURCE = COURSES / '操作系统概论'
COMPOSITION = COURSES / '计算机组成原理'
# 手写源全在 src/；docs/ 是纯派生产物，每次构建先清空再从 src/ 整目录复制。
# KEEP 是唯一允许留在 docs/ 的文件：MkDocs 在 hooks 运行之前就要求 docs_dir 存在，
# 所以仓库里保留一个空哨兵（mkdocs 默认排除点文件，不会进产物）。
SRC = ROOT / 'src'
DOCS = ROOT / 'docs'
KEEP = '.gitkeep'

TOOLBAR = (
    '<div class="study-toolbar" data-chapter="{id}">'
    '<label><input type="checkbox" data-complete> 本章已复习</label>'
    '<label class="reading-size">字号<select data-reading-size aria-label="正文字号">'
    '<option value="16">标准</option><option value="18">较大</option><option value="20">大号</option>'
    '</select></label>'
    '<span class="save-status" role="status"></span></div>'
)
DIALOG = (
    '<dialog class="image-dialog" aria-label="插图预览">'
    '<button type="button" class="close-dialog" autofocus>关闭 · Esc</button>'
    '<img alt=""><p></p></dialog>'
)

EXERCISE_SECTION = re.compile(r'(^## .*(?:教材.*习题|自测题|自编客观题)[^\n]*\n)([\s\S]*?)(?=^## |\Z)', re.M)


def _answer_block(answer):
    """Normalize every answer-label variant to one rendered form.

    The two books used four source forms: ``**答案：X**``, ``**答案：**``,
    ``答案：X`` and ``答案：**X**``.  Rendering used to strip the label from
    three of them, so 117 of 138 answers opened to a bare sentence.  Keep one
    label, ``参考答案：``, in front of every answer body.

    ``**参考答案：**`` / ``**参考答案**`` / ``参考答案：`` are accepted too and
    stripped the same way, so an author who copies the rendered label back into
    a note does not end up with a doubled ``参考答案：参考答案：``.
    """
    answer = answer.strip()
    # **参考答案：** body / **参考答案** body  ->  body
    m = re.match(r'^\*\*参考答案[：:]?\*\*\s*', answer)
    if m:
        answer = answer[m.end():]
    # 参考答案：body  ->  body
    m = re.match(r'^参考答案[：:]\s*', answer)
    if m:
        answer = answer[m.end():]
    # **答案：D。** body  ->  D。 body
    m = re.match(r'^\*\*答案：([^*\n]+)\*\*\s*', answer)
    if m:
        answer = m.group(1).strip() + answer[m.end():]
    # 答案：**一**。  ->  **一**。
    m = re.match(r'^答案：\s*', answer)
    if m:
        answer = answer[m.end():]
    # **答案：** body  ->  body
    m = re.match(r'^\*\*答案：\*\*\s*', answer)
    if m:
        answer = answer[m.end():]
    label = '**参考答案：**'
    # Block-level bodies (table/list/quote/code/HTML) must start a new paragraph.
    if re.match(r'^(?:\||-{2,}|\d+\.\s|[-*+]\s|>|#{1,6}\s|```|<)', answer):
        return label + '\n\n' + answer
    return label + ' ' + answer


def _options_block(prompt):
    def options(m):
        choices = re.split(r'[\s　]+(?=[A-D][.．])', m.group().strip())
        return (
            '<div class="exercise-options" markdown="1">\n\n'
            + '\n\n'.join('- ' + c.strip() for c in choices)
            + '\n\n</div>'
        )

    return re.sub(r'^[A-D][.．][\s\S]*?(?=\n\n(?![A-D][.．])|\Z)', options, prompt, flags=re.M)


def _escape_blanks(text):
    """Keep runs of ASCII underscores from turning into emphasis.

    The 操作系统概论 fill-in-the-blank questions use ``___`` as a blank. Markdown
    reads ``___x___`` as bold+italic, which silently deletes the blank and bolds
    the word in between. Escaping keeps the blank visible.
    """
    return re.sub(r'(?<!\\)_{3,}', lambda m: '&#95;' * len(m.group(0)), text)


def exercise(match):
    question, rest = match.group(1), match.group(2)
    start = re.search(r'^(?:\*\*答案|\*\*参考答案[：:]|答案：|\*\*（1）计算 Need)', rest, re.M)
    prompt, answer = (rest[: start.start()], rest[start.start():].strip()) if start else (rest, '')
    result = '<section class="exercise-item" markdown="1">\n\n' + _escape_blanks(question) + '\n\n' + _escape_blanks(_options_block(prompt)).strip()
    if answer:
        body = _answer_block(answer)
    else:
        # 计算机组成原理的附录只收部分习题；没有答案的题也要有同一个折叠壳，
        # 否则读者会以为页面坏了，或滚回节首才知道本来就没答案。
        body = '<p class="exercise-answer--missing">教材附录未收本题解答，请对照教材自行完成。</p>'
    result += (
        '\n\n<details class="exercise-answer" markdown="1">\n<summary>答案与解析</summary>\n\n'
        + body
        + '\n\n</details>'
    )
    return result + '\n\n</section>\n\n'


def format_exercises(text):
    # 原 table_exercises()/TABLE_RULE 已删：它只在「习题节里没有 **N. 题号」时
    # 才能触发，而 12 章习题节全部用 **N. 题号（2026-11 实测每节 9–19 题），
    # 自编客观题节（## N 自编客观题（补充））同样用 **N. 题号。留着是死代码。
    def section(m):
        head, body = m.group(1), m.group(2)
        parts = re.split(r'(?=^### )', body, flags=re.M)
        body = ''.join(
            re.sub(r'(^\*\*\d+\.[^\n]*|^\*\*(?:题目|教材原题)：[^\n]*)([\s\S]*?)(?=^\*\*\d+\.|\Z)', exercise, part, flags=re.M)
            for part in parts
        )
        return head + body

    return EXERCISE_SECTION.sub(section, text)


CROSS_BOOKS = {
    '计算机组成原理': '../computer-organization/chapter-{n}.md',
    '操作系统概论': '../chapters/chapter-{n}.md',
}


def link_chapters(text):
    """Turn "见第 N 章" into a real cross-chapter link (the notes are plain text).

    The notes write both ``见第3章`` and ``见第 3 章``; the original pattern
    only matched the tight form, so most references stayed plain text.  This
    also links cross-book references of the form
    ``见《计算机组成原理》第 5 章`` and warns about out-of-range chapter
    numbers (the books only have chapters 1–6).
    """

    def repl(m):
        n = int(m.group(2))
        if not 1 <= n <= 6:
            return m.group(0)
        return '见[' + m.group(1) + f'](chapter-{n}.md)'

    text = re.sub(r'见(第\s*([1-6])\s*章)', repl, text)

    for book, target in CROSS_BOOKS.items():
        pattern = r'见《' + re.escape(book) + r'》\s*第\s*([1-6])\s*章'

        def cross(match, book=book, target=target):
            n = int(match.group(1))
            return f'见[《{book}》第 {n} 章]({target.format(n=n)})'

        text = re.sub(pattern, cross, text)

    # Never let a dangling chapter number reach the built page (CO2 used to
    # point at a non-existent "第 7 章" while the site only has 1–6).
    # 用 logging 而不是 print：mkdocs --strict 会把 warning 升级成构建失败，
    # print 只会打在控制台（Windows 控制台还是 GBK，中文直接变乱码）。
    log = logging.getLogger('mkdocs')
    for match in re.finditer(r'第\s*(\d+)\s*章', text):
        n = int(match.group(1))
        if n > 6:
            before = text[max(0, match.start() - 2):match.start()]
            if before not in ('教材', '本章'):
                log.warning(
                    '[link_chapters] 越界章号引用 "第 %d 章"，附近：...%s...',
                    n,
                    text[max(0, match.start() - 24):match.end() + 24],
                )
    return text


def chapter_nav(number, prefix, home):
    """Previous / next chapter links inside the page body."""
    prev_link = (
        f'<a class="chapter-nav__link" href="{prefix}chapter-{number - 1}/" rel="prev">← 上一章</a>'
        if number > 1
        else f'<a class="chapter-nav__link" href="{home}" rel="prev">← 课程列表</a>'
    )
    next_link = (
        f'<a class="chapter-nav__link" href="{prefix}chapter-{number + 1}/" rel="next">下一章 →</a>'
        if number < 6
        else f'<a class="chapter-nav__link" href="{home}" rel="next">回到课程列表 →</a>'
    )
    # There is no per-course landing page, so the middle link must say "学习首页".
    return (
        f'<nav class="chapter-nav" aria-label="章节导航">{prev_link}'
        f'<a class="chapter-nav__link" href="{home}">学习首页</a>{next_link}</nav>'
    )


def chapter_note(course_dir, number):
    """Return the single note file for chapter *number*, or abort the build.

    ``next(course_dir.glob(...))`` silently took the first filesystem hit when a
    chapter had two matching files (so a stray copy could ship instead of the
    real draft) and raised an opaque ``StopIteration`` when none existed.  Both
    failure modes are worse than a loud error, so collect the matches and
    require exactly one.
    """
    matches = sorted(course_dir.glob(f'第{number}章*_笔记.md'))
    if len(matches) != 1:
        found = '、'.join(p.name for p in matches) if matches else '（没有匹配文件）'
        raise SystemExit(
            f'[hooks] {course_dir.name} 第{number}章 需要恰好 1 个「第{number}章*_笔记.md」，'
            f'实际 {len(matches)} 个：{found}'
        )
    return matches[0]


def on_pre_build(config):
    # docs/ 100% 派生：先清空（保留哨兵），再把 src/ 的手写源整目录复制过来，
    # 这样旧的派生残留不会存活到下一次构建。
    DOCS.mkdir(parents=True, exist_ok=True)
    for entry in DOCS.iterdir():
        if entry.name == KEEP:
            continue
        if entry.is_dir():
            shutil.rmtree(entry)
        else:
            entry.unlink()
    shutil.copytree(SRC, DOCS, dirs_exist_ok=True)
    (DOCS / 'chapters').mkdir(parents=True, exist_ok=True)
    images = DOCS / 'assets/figures'
    images.mkdir(parents=True, exist_ok=True)
    for n in range(1, 7):
        file = chapter_note(SOURCE, n)
        text = file.read_text(encoding='utf-8')

        def image(m):
            relative = m.group(2) or m.group(3)
            asset = SOURCE / relative
            if asset.suffix == '.png' and asset.with_suffix('.svg').exists():
                asset = asset.with_suffix('.svg')
            shutil.copyfile(asset, images / asset.name)
            alt = m.group(1) or asset.stem
            svg = asset.read_text(encoding='utf-8-sig')
            width = re.search(r'\bwidth="([\d.]+)"', svg)
            height = re.search(r'\bheight="([\d.]+)"', svg)
            size = f' width="{width[1]}" height="{height[1]}"' if width and height else ''
            return f'<img src="../../assets/figures/{asset.name}" alt="{alt}"{size} loading="lazy">'

        text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)|<img\s+src="([^"]+)"[^>]*>', image, text)
        title, body = text.split('\n', 1)
        body = link_chapters(format_exercises(body))
        page = (
            front_matter('操作系统概论', title)
            + title
            + '\n\n'
            + TOOLBAR.format(id=n)
            + '\n\n'
            + body
            + '\n\n'
            + chapter_nav(n, '../', '../../')
            + '\n\n'
            + (dialog_block() if '<img' in body else '')
        )
        (DOCS / f'chapters/chapter-{n}.md').write_text(page, encoding='utf-8')

    composition_docs = DOCS / 'computer-organization'
    composition_docs.mkdir(parents=True, exist_ok=True)
    for n in range(1, 7):
        file = chapter_note(COMPOSITION, n)
        text = file.read_text(encoding='utf-8')
        text = re.sub(r'\[([^\]]+)\]\(教材/chapters/[^)]+\)', r'\1', text)
        title, body = text.split('\n', 1)
        body = link_chapters(format_exercises(body.strip()))
        page = (
            front_matter('计算机组成原理', title)
            + title
            + '\n\n'
            + TOOLBAR.format(id=f'co-{n}')
            + '\n\n'
            + body
            + '\n\n'
            + chapter_nav(n, '../', '../../')
            + '\n\n'
            + (dialog_block() if '<img' in body else '')
        )
        (composition_docs / f'chapter-{n}.md').write_text(page, encoding='utf-8')


def front_matter(course, title):
    """Give every generated page its own meta description."""
    clean = title.lstrip('# ').strip()
    return (
        '---\n'
        f'description: {course}复习笔记：{clean}。含大纲要求、重点讲解与教材习题（部分附答案）。\n'
        '---\n\n'
    )


def dialog_block():
    """Wrap the preview dialog in a block element.

    ``<dialog>`` is not in Python-Markdown's block-level set, so a bare dialog at
    the end of the page gets inlined into a paragraph; the browser then closes
    that paragraph early and leaves empty <p> elements behind.
    """
    return '<div class="image-dialog-holder">\n\n' + DIALOG + '\n\n</div>\n'


def on_post_build(config):
    """Inline the reader stylesheet so it is no longer an extra blocking request,
    then prune files the site never ships to a visitor.

    Material copies the full lunr language pack and source maps into the build;
    this site only ever loads the zh pack plus the multi-language/stemmer helpers
    (see the network traces in qa/r2/delivery/raw/03-perf.json). Dropping them
    keeps the Cloudflare Pages upload small without touching the theme.
    """
    css = (DOCS / 'assets/notes.css').read_text(encoding='utf-8')
    style = '<style>\n' + css + '\n</style>'
    site = Path(config['site_dir'])
    for html in site.rglob('*.html'):
        text = html.read_text(encoding='utf-8')
        if 'assets/notes.css' not in text:
            continue
        # Use a lambda: the replacement must be literal (CSS now contains \2190 etc.).
        text = re.sub(
            r'<link[^>]+href="[^"]*assets/notes\.css"[^>]*>\s*',
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
    standalone = site / 'assets/notes.css'
    if standalone.exists():
        standalone.unlink()

    # 3b) Material ships its default favicon even though the theme sets favicon.svg.
    for leftover in (site / 'assets/images').glob('favicon.png'):
        leftover.unlink()

    # 3c) KaTeX 的 JS 只在真的含公式的页面注入：判据是渲染后的
    #     ``class="arithmatex"`` 标记，不是目录名，所以哪门课先把公式迁过来，
    #     哪门课就自动生效。注意这只是 JS 按需：katex.min.css 走 mkdocs.yml 的
    #     extra_css，CSS 与 assets/katex/fonts/ 下的 20 个 woff2 仍然全站加载，
    #     但字体只有用到对应字形时浏览器才真正下载。
    #     用 rglob 而不是写死两门课的目录名：加第三门课时不会再漏掉它。
    chapter_pages = sorted(site.rglob('chapter-*/index.html'))
    for html in chapter_pages:
        text = html.read_text(encoding='utf-8')
        if 'class="arithmatex"' not in text:
            continue
        marker = '<script src="../../assets/math.js"></script>'
        if marker in text and 'assets/katex/katex.min.js' not in text:
            tags = (
                '<script src="../../assets/katex/katex.min.js"></script>'
                '<script src="../../assets/katex/contrib/auto-render.min.js"></script>'
            )
            html.write_text(text.replace(marker, tags + marker, 1), encoding='utf-8')

    # 4) The chapter toolbar is page text, so the search index indexes its control
    #    labels ("本章已复习 字号 标准 较大 大号") into every chapter snippet.
    index = site / 'search' / 'search_index.json'
    if index.exists():
        data = json.loads(index.read_text(encoding='utf-8'))
        changed = False
        for doc in data.get('docs', []):
            text = doc.get('text', '')
            cleaned = re.sub(r'\s*本章已复习\s*字号\s*标准\s*较大\s*大号\s*', ' ', text)
            if cleaned != text:
                doc['text'] = cleaned.strip()
                changed = True
        if changed:
            index.write_text(
                json.dumps(data, ensure_ascii=False, separators=(',', ':')),
                encoding='utf-8',
            )
