"""Build pages from the original notes; no Node.js dependency."""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent


def exercise(match):
    question, rest = match.group(1), match.group(2)
    start = re.search(r'^(?:\*\*答案|答案：|\*\*（1）计算 Need)', rest, re.M)
    prompt, answer = (rest[:start.start()], rest[start.start():].strip()) if start else (rest, '')
    answer = re.sub(r'^\*\*答案：([^*]+)\*\*\s*', r'**参考答案：\1**\n\n', answer)
    answer = re.sub(r'^(?:\*\*答案：\*\*|答案：)\s*', '', answer)
    def options(m):
        choices = re.split(r'[\s　]+(?=[A-D][.．])', m.group().strip())
        return '<div class="exercise-options" markdown="1">\n\n' + '\n\n'.join('- ' + c.strip() for c in choices) + '\n\n</div>'
    prompt = re.sub(r'^[A-D][.．][\s\S]*?(?=\n\n(?![A-D][.．])|\Z)', options, prompt, flags=re.M)
    result = '<section class="exercise-item" markdown="1">\n\n' + question + '\n' + prompt.strip()
    if answer:
        result += '\n\n<details class="exercise-answer" markdown="1">\n<summary>答案与解析</summary>\n\n' + answer + '\n\n</details>'
    return result + '\n\n</section>\n\n'


def format_exercises(text):
    def section(m):
        parts = re.split(r'(?=^### )', m.group(2), flags=re.M)
        return m.group(1) + ''.join(re.sub(
            r'(^\*\*\d+\.[^\n]*|^\*\*题目：[^\n]*)([\s\S]*?)(?=^\*\*\d+\.|\Z)', exercise, p, flags=re.M
        ) for p in parts)
    return re.sub(r'(^## .*教材.*习题[^\n]*\n)([\s\S]*?)(?=^## |\Z)', section, text, flags=re.M)


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
        toolbar = f'<div class="study-toolbar" data-chapter="{n}"><label><input type="checkbox" data-complete> 本章已复习</label><label class="reading-size">字号<select data-reading-size aria-label="正文字号"><option value="16">标准</option><option value="18">较大</option><option value="20">大号</option></select></label><span class="save-status" role="status"></span></div>'
        title, body = text.split('\n', 1)
        dialog = '<dialog class="image-dialog" aria-label="插图预览"><button type="button" class="close-dialog" autofocus>关闭 · Esc</button><img alt=""><p></p></dialog>'
        (docs / f'chapters/chapter-{n}.md').write_text(title + '\n\n' + toolbar + '\n\n' + format_exercises(body) + '\n\n' + dialog, encoding='utf-8')

    composition_source = SOURCE.parent / '计算机组成原理'
    composition_docs = docs / 'computer-organization'
    composition_docs.mkdir(parents=True, exist_ok=True)
    for n in range(1, 7):
        file = next(composition_source.glob(f'第{n}章*_笔记.md'))
        text = file.read_text(encoding='utf-8')
        text = re.sub(r'\[([^\]]+)\]\(教材/chapters/[^)]+\)', r'\1', text)
        title, body = text.split('\n', 1)
        toolbar = f'<div class="study-toolbar" data-chapter="co-{n}"><label><input type="checkbox" data-complete> 本章已复习</label><label class="reading-size">字号<select data-reading-size aria-label="正文字号"><option value="16">标准</option><option value="18">较大</option><option value="20">大号</option></select></label><span class="save-status" role="status"></span></div>'
        dialog = '<dialog class="image-dialog" aria-label="插图预览"><button type="button" class="close-dialog" autofocus>关闭 · Esc</button><img alt=""><p></p></dialog>'
        (composition_docs / f'chapter-{n}.md').write_text(title + '\n\n' + toolbar + '\n\n' + format_exercises(body.strip()) + '\n\n' + dialog, encoding='utf-8')
