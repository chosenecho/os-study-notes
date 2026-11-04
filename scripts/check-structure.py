"""Validate course manifests, authored links and canonical source paths."""
from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
courses = json.loads((ROOT / 'website/courses.json').read_text(encoding='utf-8'))
errors = []
for field in ('id', 'slug', 'title', 'output', 'progress_prefix'):
    values = [c[field] for c in courses]
    if len(values) != len(set(values)):
        errors.append(f'Duplicate course {field}')
for course in courses:
    folder = ROOT / 'content/courses' / course['slug']
    expected = {f'chapter-{n:02}.md' for n in range(1, course['chapters'] + 1)}
    actual = {p.name for p in folder.glob('chapter-*.md')}
    if actual != expected:
        errors.append(f'{folder.name}: chapter files differ: {actual ^ expected}')
    if not (folder / 'README.md').is_file():
        errors.append(f'{folder.name}: missing course index')
for p in (ROOT / 'content').rglob('*.md'):
    text = p.read_text(encoding='utf-8')
    for href in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', text):
        parts = urlsplit(href)
        if parts.scheme or parts.netloc or not parts.path:
            continue
        target = (p.parent / unquote(parts.path)).resolve()
        if not target.is_relative_to(ROOT) or not target.exists():
            errors.append(f'{p.relative_to(ROOT)}: missing link {href}')
for name in ('课程', '站点', 'qa', '资料', '归档'):
    if (ROOT / name).exists():
        errors.append(f'Retired root path exists: {name}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print(f'Structure passed: {len(courses)} courses, source links, canonical paths')
