"""Check internal links and anchors in the built site (no browser needed).

Absolute hrefs carry the deployment base path from ``site_url`` (for example
``/os-study-notes/chapters/chapter-1/``), so the base segment has to be stripped
before resolving against ``站点/dist``. Without that every link on the 404 page
looks broken.

Run from the repo root after a build:
    python qa/scripts/check-links-dist.py
"""
from pathlib import Path
import os
import re
import sys
import urllib.parse

REPO = Path(__file__).resolve().parents[2]
ROOT = REPO / '站点' / 'dist'
CONFIG = REPO / '站点' / 'mkdocs.yml'
HREF = re.compile(r'href="([^"]+)"')
ID = re.compile(r'id="([^"]+)"')


def base_segment():
    """The path prefix every absolute link carries, e.g. '/os-study-notes'."""
    override = os.environ.get('SITE_URL')
    if override:
        return urllib.parse.urlsplit(override).path.rstrip('/')
    text = CONFIG.read_text(encoding='utf-8')
    match = re.search(r"site_url:\s*!ENV\s*\[[^,\]]+,\s*'([^']+)'\]", text)
    if not match:
        return ''
    return urllib.parse.urlsplit(match.group(1)).path.rstrip('/')


BASE = base_segment()
pages = sorted(ROOT.rglob('*.html'))
broken = []
total = 0

for page in pages:
    html = page.read_text(encoding='utf-8', errors='replace')
    ids = set(ID.findall(html))
    for href in HREF.findall(html):
        if href.startswith(('http://', 'https://', 'mailto:', 'javascript:')):
            continue
        if href.startswith('#'):
            if href[1:] and href[1:] not in ids:
                broken.append((page.relative_to(ROOT), href, '同页锚点不存在'))
            continue
        total += 1
        parts = urllib.parse.urlsplit(href)
        path = parts.path
        if path.startswith('/'):
            if BASE and (path == BASE or path.startswith(BASE + '/')):
                path = path[len(BASE):] or '/'
            target = (ROOT / path.lstrip('/')).resolve()
        else:
            target = (page.parent / path).resolve()
        if path.endswith('/') or target.is_dir():
            target = target / 'index.html'
        if not target.exists():
            broken.append((page.relative_to(ROOT), href, '目标文件不存在'))
            continue
        if parts.fragment and target.suffix == '.html':
            other = target.read_text(encoding='utf-8', errors='replace')
            if parts.fragment not in set(ID.findall(other)):
                broken.append((page.relative_to(ROOT), href, '目标锚点不存在'))

print(f'基准路径 {BASE or "(无)"}；检查 {len(pages)} 个页面、{total} 条站内链接，断链 {len(broken)} 条')
for item in broken[:20]:
    print('  -', item)

if broken:
    sys.exit(1)
print('站内链接与锚点全部可达')
