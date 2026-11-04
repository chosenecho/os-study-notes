"""Enrich authored Markdown through native MkDocs page events."""
from pathlib import Path
import json
import logging
import re
from html import escape
from mkdocs.utils import get_relative_url

REPO = Path(__file__).resolve().parents[2]
COURSES = json.loads((REPO / 'config/courses.json').read_text(encoding='utf-8'))

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
    '<button type="button" class="md-button close-dialog" autofocus>关闭 · Esc</button>'
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
    def section(m):
        head, body = m.group(1), m.group(2)
        parts = re.split(r'(?=^### )', body, flags=re.M)
        body = ''.join(
            re.sub(r'(^\*\*\d+\.[^\n]*|^\*\*(?:题目|教材原题)：[^\n]*)([\s\S]*?)(?=^\*\*\d+\.|\Z)', exercise, part, flags=re.M)
            for part in parts
        )
        return head + body

    return EXERCISE_SECTION.sub(section, text)


CROSS_BOOKS = {course['title']: '../' + course['slug'] + '/chapter-{n:02}.md' for course in COURSES}


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
        return '见[' + m.group(1) + f'](chapter-{n:02}.md)'

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


def course_index(markdown, course):
    """Add progress markers and omit repository-only provenance sections."""
    private = {'资料与核对规则', '资料依据与使用边界', '原有笔记处理'}
    sections = re.split(r'(?=^## )', markdown, flags=re.M)
    text = ''.join(section for section in sections
                   if section.split('\n', 1)[0].removeprefix('## ').strip() not in private)
    text = re.sub(r'^# [^\n]+', '# ' + course['title'], text, count=1)
    for number in range(1, course['chapters'] + 1):
        text = text.replace(
            f'](chapter-{number:02}.md)',
            f'](chapter-{number:02}.md) <span class="progress-badge" '
            f'data-progress-chapter="{course["id"]}-{number}">待复习</span>',
        )
    return text


def chapter_images(markdown, page):
    source = Path(page.file.abs_src_path).parent.resolve()

    def image(match):
        relative = match.group(2) or match.group(3)
        asset = (source / relative).resolve()
        if not asset.is_relative_to(source) or asset.suffix != '.svg' or not asset.is_file():
            raise ValueError(f'Expected an existing course-local SVG: {relative}')
        svg = asset.read_text(encoding='utf-8-sig')
        width = re.search(r'\bwidth="([\d.]+)"', svg)
        height = re.search(r'\bheight="([\d.]+)"', svg)
        size = f' width="{width[1]}" height="{height[1]}"' if width and height else ''
        uri = (Path(page.file.src_uri).parent / relative).as_posix()
        url = get_relative_url(uri, page.url)
        alt = escape(match.group(1) or asset.stem, quote=True)
        return f'<img src="{escape(url, quote=True)}" alt="{alt}"{size} loading="lazy">'

    return re.sub(r'!\[([^\]]*)\]\(([^)]+)\)|<img\s+src="([^"]+)"[^>]*>', image, markdown)


def on_page_markdown(markdown, page, config, files):
    """Transform pages in place; source paths are the public paths."""
    uri = Path(page.file.src_uri)
    course = next((course for course in COURSES
                   if uri.parent.as_posix() == f'courses/{course["slug"]}'), None)
    if course:
        if uri.name == 'index.md':
            page.meta['description'] = f'{course["title"]}课程目录与复习指南。'
            return course_index(markdown, course)
        chapter = re.fullmatch(r'chapter-(\d{2})\.md', uri.name)
        if chapter:
            number = int(chapter[1])
            title, body = markdown.split('\n', 1)
            page.meta['description'] = (
                f'{course["title"]}复习笔记：{title.lstrip("# ")}。'
                '含大纲要求、重点讲解与教材习题（部分附答案）。'
            )
            body = chapter_images(link_chapters(format_exercises(body.strip())), page)
            toolbar = TOOLBAR.format(id=f'{course["id"]}-{number}')
            # Python-Markdown needs a block wrapper around the dialog element.
            dialog = '<div class="image-dialog-holder">\n\n' + DIALOG + '\n\n</div>\n'
            return title + '\n\n' + toolbar + '\n\n' + body + ('\n\n' + dialog if '<img' in body else '')
    if uri.parent.as_posix() == 'reference':
        title = markdown.split('\n', 1)[0].lstrip('# ').strip()
        page.meta['description'] = f'两门课程的{title}，含概念辨析、计算条件与章节回查链接。'
    return markdown
