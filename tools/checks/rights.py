"""Block uploads until all publishable learning content has a recorded review.

This is a review-record check, not a determination of copyright ownership.
Local builds remain available so pending material can be inspected and corrected.
"""
from pathlib import Path
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[2]


def content_paths(root):
    paths = set()
    for p in (root / 'docs').rglob('*'):
        if not p.is_file():
            continue
        relative = p.relative_to(root).as_posix()
        # Software and the separately documented KaTeX distribution retain
        # their software licenses. New non-code assets need a content review.
        if not relative.startswith('docs/assets/vendor/katex/') and p.suffix.lower() not in {'.js', '.mjs', '.css'}:
            paths.add(relative)
    return paths


def digest(path):
    # Git may check text out as CRLF on Windows. A line-ending conversion alone
    # does not change the reviewed content; every other byte change does.
    data = path.read_bytes()
    if path.suffix.lower() in {'.md', '.svg', '.txt'}:
        data = data.replace(b'\r\n', b'\n')
    return hashlib.sha256(data).hexdigest()


def audit(root, manifest):
    if manifest.get('version') != 1 or not isinstance(manifest.get('files'), list):
        raise ValueError('Expected version 1 with a files array')
    actual = content_paths(root)
    entries, errors = {}, []
    for entry in manifest['files']:
        if not isinstance(entry, dict):
            raise ValueError('Every rights entry must be an object')
        path = entry.get('path', '')
        if not isinstance(path, str) or not path or '\\' in path or ':' in path or path.startswith('/') or '..' in path.split('/'):
            raise ValueError('Rights paths must be repository-relative POSIX paths')
        if path in entries:
            errors.append(f'{path}: duplicate rights entry')
        entries[path] = entry
        if path not in actual:
            errors.append(f'{path}: stale entry or outside audited content scope')
    for path in sorted(actual):
        entry = entries.get(path)
        if entry is None:
            errors.append(f'{path}: unreviewed (no rights entry)')
        elif entry.get('status') != 'cleared':
            errors.append(f'{path}: {entry.get("status", "unreviewed")} — {entry.get("basis", "rights review required")}')
        elif not all(isinstance(entry.get(k), str) and entry[k].strip() for k in ('license', 'basis', 'reviewed_on')):
            errors.append(f'{path}: clearance requires license, basis and reviewed_on')
        elif entry.get('sha256') != digest(root / path):
            errors.append(f'{path}: changed since rights review')
    return errors


def main():
    try:
        manifest = json.loads((ROOT / 'config/content-rights.json').read_text(encoding='utf-8'))
        errors = audit(ROOT, manifest)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        print(f'Rights check failed: {exc}', file=sys.stderr)
        return 1
    if errors:
        print('Publication blocked: unresolved content rights. See LICENSING.md.', file=sys.stderr)
        print('\n'.join(errors), file=sys.stderr)
        return 1
    print(f'Rights records passed: {len(manifest["files"])} files. Keep the underlying permission evidence.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
