"""Structural regression checks for the 12 course notes.

Run from the repo root:
    python qa/scripts/check-notes.py

Exit code 0 means every note still satisfies what 站点/hooks.py depends on,
plus the house style rules agreed in qa/修订规范与勘误清单.md.
"""
from pathlib import Path
import re
import sys

REPO = Path(__file__).resolve().parents[2]
COURSES = {
    'os': REPO / '课程' / '操作系统概论',
    'co': REPO / '课程' / '计算机组成原理',
}
EXERCISE_HEAD = re.compile(r'^## .*(?:教材.*习题|自测题)[^\n]*$', re.M)
NUMBERED = re.compile(r'^\*\*\d+\.', re.M)
ANSWER_START = re.compile(r'^\*\*答案', re.M)
BANNED = [
    '由此可见', '综上所述', '值得注意的是', '不难看出', '显而易见',
    '深入探讨', '不可磨灭', '不断演变的格局',
]
IMG_MD = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
IMG_HTML = re.compile(r'<img\s+src="([^"]+)"')

failures = []
notes = []


def fail(note, message):
    failures.append(f'{note.name}: {message}')


for key, folder in COURSES.items():
    files = sorted(folder.glob('第*章*_笔记.md'))
    if len(files) != 6:
        failures.append(f'{folder.name}: 找到 {len(files)} 篇章节笔记，应为 6 篇')
    for path in files:
        notes.append((key, folder, path))

if len(notes) != 12:
    failures.append(f'章节笔记总数 {len(notes)}，应为 12')

for key, folder, path in notes:
    text = path.read_text(encoding='utf-8')
    lines = text.splitlines()

    # 1. hooks.py does text.split('\n', 1) and keeps the first line as the H1.
    if not lines or not lines[0].startswith('# 第'):
        fail(path, '首行不是 `# 第 N 章` 标题，构建会丢标题')

    # 2. The exercise folding regex needs this exact section heading.
    heads = EXERCISE_HEAD.findall(text)
    if not heads:
        fail(path, '缺少 `## N 教材本章习题` 节，习题不会被折叠')
    elif len(heads) > 1:
        fail(path, f'有 {len(heads)} 个习题节标题，折叠逻辑只会用第一个')

    if not NUMBERED.search(text):
        fail(path, '没有 `**N.` 形式的题号，习题会退化成表格模式')
    if not ANSWER_START.search(text):
        fail(path, '没有 `**答案：` 开头的答案，答案不会折叠')

    # 3. Both the citation block and the syllabus table must survive.
    if '> 依据' not in text and '> 校订依据' not in text:
        fail(path, '缺少 `> 依据：…` 引用块')
    if '## 复习导航' not in text:
        fail(path, '缺少 `## 复习导航` 节')

    # 4. Composition notes have no figure pipeline: any image is a broken image.
    if key == 'co':
        if IMG_MD.search(text) or IMG_HTML.search(text):
            fail(path, '《计算机组成原理》没有搬图管道，不允许出现图片引用')

    # 5. OS figures must point at a file that exists next to the note.
    for ref in IMG_MD.findall(text) and [m[1] for m in IMG_MD.findall(text)]:
        if not (folder / ref).exists():
            fail(path, f'图片引用不存在：{ref}')
    for ref in IMG_HTML.findall(text):
        if not (folder / ref).exists():
            fail(path, f'图片引用不存在：{ref}')

    # 6. House style: the filler phrases we agreed to remove.
    for word in BANNED:
        if word in text:
            fail(path, f'残留套话「{word}」')

    # 7. A retired generated question set must not creep back in.
    if '自测题（自编）' in text:
        fail(path, '出现已退役的「自测题（自编）」')


# 8. The migrated 周转时间 exercise must live in chapter 3, not chapter 1.
os_dir = COURSES['os']
ch1 = next(os_dir.glob('第1章*_笔记.md')).read_text(encoding='utf-8')
ch3 = next(os_dir.glob('第3章*_笔记.md')).read_text(encoding='utf-8')
if '平均周转时间' in ch1 and 'SJF' in ch1:
    failures.append('第1章仍留有 SJF 周转时间真题，应已迁入第3章')
if '平均周转时间' not in ch3:
    failures.append('第3章没有接过周转时间真题')

# 9. Every intra-course figure file should be referenced somewhere, and the
#    figure folder should not have grown without a matching note reference.
figures = {p.name for p in (os_dir / '图').glob('*.svg')}
referenced = set()
for path in os_dir.glob('第*章*_笔记.md'):
    text = path.read_text(encoding='utf-8')
    referenced |= {Path(r).name for r in IMG_HTML.findall(text)}
    referenced |= {Path(m[1]).name for m in IMG_MD.findall(text)}
orphan = figures - referenced
if orphan:
    failures.append('图/ 下没有笔记引用的 SVG：' + '、'.join(sorted(orphan)))

total_lines = sum(len(p.read_text(encoding='utf-8').splitlines()) for _, _, p in notes)
print(f'检查 {len(notes)} 篇章节笔记，共 {total_lines} 行，图 {len(figures)} 张（引用 {len(referenced)} 张）')

if failures:
    print(f'\n{len(failures)} 处不符合：')
    for item in failures:
        print('  -', item)
    sys.exit(1)

print('全部通过')
