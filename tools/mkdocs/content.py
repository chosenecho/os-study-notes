"""Enrich independently authored Markdown through native MkDocs events."""
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
    '</select></label><span class="save-status" role="status"></span></div>'
)
DIALOG = (
    '<dialog class="image-dialog" aria-label="插图预览">'
    '<button type="button" class="md-button close-dialog" autofocus>关闭 · Esc</button>'
    '<img alt=""><p></p></dialog>'
)
EXERCISE_SECTION = re.compile(r'(^## 自编练习[^\n]*\n)([\s\S]*?)(?=^## |\Z)', re.M)


def exercise(match):
    question, rest = match.group(1), match.group(2)
    prompt, marker, answer = rest.partition('**答案：**')
    if not marker or not answer.strip():
        raise ValueError('Every independent exercise requires an authored answer: ' + question)
    return (
        '<section class="exercise-item" markdown="1">\n\n' + question + '\n\n' + prompt.strip()
        + '\n\n<details class="exercise-answer" markdown="1">\n<summary>答案与解析</summary>\n\n'
        + '**参考答案：** ' + answer.strip()
        + '\n\n</details>\n\n</section>\n\n'
    )


def format_exercises(text):
    def section(match):
        body = re.sub(r'(^\*\*[0-9]+\.[^\n]*)([\s\S]*?)(?=^\*\*[0-9]+\.|\Z)', exercise, match.group(2), flags=re.M)
        return match.group(1) + body
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
                '含大纲索引、独立讲解与附解析的自编练习。'
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
