"""Build pages from the original notes; no Node.js dependency."""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
COURSES = REPO / '课程'
SOURCE = COURSES / '操作系统概论'
COMPOSITION = COURSES / '计算机组成原理'

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

EXERCISE_SECTION = re.compile(r'(^## .*(?:教材.*习题|自测题)[^\n]*\n)([\s\S]*?)(?=^## |\Z)', re.M)
NUMBERED = re.compile(r'^\*\*\d+\.', re.M)
TABLE_RULE = re.compile(r'^\s*\|[\s:|\-]+\|\s*$')


def _answer_block(answer):
    answer = re.sub(r'^\*\*答案：([^*]+)\*\*\s*', r'**参考答案：\1**\n\n', answer)
    return re.sub(r'^(?:\*\*答案：\*\*|答案：)\s*', '', answer)


def _options_block(prompt):
    def options(m):
        choices = re.split(r'[\s　]+(?=[A-D][.．])', m.group().strip())
        return (
            '<div class="exercise-options" markdown="1">\n\n'
            + '\n\n'.join('- ' + c.strip() for c in choices)
            + '\n\n</div>'
        )

    return re.sub(r'^[A-D][.．][\s\S]*?(?=\n\n(?![A-D][.．])|\Z)', options, prompt, flags=re.M)


def exercise(match):
    question, rest = match.group(1), match.group(2)
    start = re.search(r'^(?:\*\*答案|答案：|\*\*（1）计算 Need)', rest, re.M)
    prompt, answer = (rest[: start.start()], rest[start.start():].strip()) if start else (rest, '')
    result = '<section class="exercise-item" markdown="1">\n\n' + question + '\n\n' + _options_block(prompt).strip()
    if answer:
        result += (
            '\n\n<details class="exercise-answer" markdown="1">\n<summary>答案与解析</summary>\n\n'
            + _answer_block(answer)
            + '\n\n</details>'
        )
    return result + '\n\n</section>\n\n'


def table_exercises(body):
    """Fold every row of a two-column question/answer table into its own <details>.

    Only used for exercise sections that contain no ``**N.`` questions, so the
    table form used by 《计算机组成原理》 gets the same behaviour as the
    numbered form used by 《操作系统概论》.
    """
    lines = body.splitlines()
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith('|') and i + 1 < len(lines) and TABLE_RULE.match(lines[i + 1]):
            rows, j = [], i + 2
            while j < len(lines) and lines[j].strip().startswith('|'):
                rows.append([cell.strip() for cell in lines[j].strip().strip('|').split('|')])
                j += 1
            for cells in rows:
                if not any(cells):
                    continue
                question = cells[0] if cells else ''
                answer = cells[1] if len(cells) > 1 else ''
                block = ['<section class="exercise-item" markdown="1">', '', '**题目：** ' + question, '']
                if answer:
                    block += [
                        '<details class="exercise-answer" markdown="1">',
                        '<summary>答案与解析</summary>',
                        '',
                        answer,
                        '',
                        '</details>',
                        '',
                    ]
                block += ['</section>', '']
                out.extend(block)
            i = j
            continue
        out.append(line)
        i += 1
    return '\n'.join(out)


def format_exercises(text):
    def section(m):
        head, body = m.group(1), m.group(2)
        if not NUMBERED.search(body):
            body = table_exercises(body)
        parts = re.split(r'(?=^### )', body, flags=re.M)
        body = ''.join(
            re.sub(r'(^\*\*\d+\.[^\n]*|^\*\*题目：[^\n]*)([\s\S]*?)(?=^\*\*\d+\.|\Z)', exercise, part, flags=re.M)
            for part in parts
        )
        return head + body

    return EXERCISE_SECTION.sub(section, text)


def link_chapters(text):
    """Turn "见第 N 章" into a real cross-chapter link (the notes are plain text).

    The generated pages of a course all live in the same folder, so a sibling
    ``chapter-N.md`` link is what MkDocs needs in order to rewrite the URL.
    """

    def repl(m):
        n = m.group(1)
        if not 1 <= int(n) <= 6:
            return m.group(0)
        return m.group(0).replace(f'第{n}章', f'[第{n}章](chapter-{n}.md)')

    return re.sub(r'见第([1-6])章', repl, text)


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
    return (
        f'<nav class="chapter-nav" aria-label="章节导航">{prev_link}'
        f'<a class="chapter-nav__link" href="{home}">课程首页</a>{next_link}</nav>'
    )


def on_pre_build(config):
    docs = ROOT / 'docs'
    (docs / 'chapters').mkdir(parents=True, exist_ok=True)
    images = docs / 'assets/figures'
    images.mkdir(parents=True, exist_ok=True)
    for n in range(1, 7):
        file = next(SOURCE.glob(f'第{n}章*_笔记.md'))
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
            title
            + '\n\n'
            + TOOLBAR.format(id=n)
            + '\n\n'
            + body
            + '\n\n'
            + chapter_nav(n, '../', '../../')
            + '\n\n'
            + DIALOG
        )
        (docs / f'chapters/chapter-{n}.md').write_text(page, encoding='utf-8')

    composition_docs = docs / 'computer-organization'
    composition_docs.mkdir(parents=True, exist_ok=True)
    for n in range(1, 7):
        file = next(COMPOSITION.glob(f'第{n}章*_笔记.md'))
        text = file.read_text(encoding='utf-8')
        text = re.sub(r'\[([^\]]+)\]\(教材/chapters/[^)]+\)', r'\1', text)
        title, body = text.split('\n', 1)
        body = link_chapters(format_exercises(body.strip()))
        page = (
            title
            + '\n\n'
            + TOOLBAR.format(id=f'co-{n}')
            + '\n\n'
            + body
            + '\n\n'
            + chapter_nav(n, '../', '../../')
            + '\n\n'
            + DIALOG
        )
        (composition_docs / f'chapter-{n}.md').write_text(page, encoding='utf-8')


def on_post_build(config):
    """Inline the reader stylesheet so it is no longer an extra blocking request."""
    css = (ROOT / 'docs/assets/notes.css').read_text(encoding='utf-8')
    style = '<style>\n' + css + '\n</style>'
    site = Path(config['site_dir'])
    for html in site.rglob('*.html'):
        text = html.read_text(encoding='utf-8')
        if 'assets/notes.css' not in text:
            continue
        text = re.sub(r'<link[^>]+href="[^"]*assets/notes\.css"[^>]*>\s*', style + '\n', text, count=1)
        html.write_text(text, encoding='utf-8')
