"""Validate editorial review records; this is not a copyright determination."""
from pathlib import Path
from datetime import date
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
TEXT = {'.md', '.svg', '.txt', '.mjs', '.js', '.css', '.json', '.py', '.yml'}
QUOTE = re.compile(r'<!-- quote:([a-zA-Z0-9-]+) -->([\s\S]*?)<!-- /quote:\1 -->')


def content_paths(root):
    paths = set()
    for folder in ('docs', 'handbook', 'archive'):
        for path in (root / folder).rglob('*'):
            if path.is_file():
                rel = path.relative_to(root).as_posix()
                paths.add(rel)
    for rel in ('README.md', 'LICENSING.md', 'THIRD_PARTY_NOTICES.md', 'NOTICE',
                'config/syllabus.json', 'config/quotations.json'):
        if (root / rel).is_file():
            paths.add(rel)
    return paths


def digest(path):
    data = path.read_bytes()
    if path.suffix.lower() in TEXT:
        data = data.replace(bytes([13, 10]), bytes([10]))
    return hashlib.sha256(data).hexdigest()


def safe_path(path):
    return (isinstance(path, str) and bool(path) and chr(92) not in path
            and ':' not in path and not path.startswith('/')
            and '..' not in path.split('/'))


def audit(root, manifest):
    if manifest.get('version') != 1 or not isinstance(manifest.get('files'), list):
        raise ValueError('Expected version 1 with a files array')
    actual = content_paths(root)
    entries, errors = {}, []
    for entry in manifest['files']:
        if not isinstance(entry, dict):
            raise ValueError('Every rights entry must be an object')
        path = entry.get('path', '')
        if not safe_path(path):
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
            errors.append(f'{path}: {entry.get("status", "unreviewed")} — {entry.get("basis", "review required")}')
        elif not all(isinstance(entry.get(k), str) and entry[k].strip() for k in ('license', 'basis', 'reviewed_on')):
            errors.append(f'{path}: clearance requires license, basis and reviewed_on')
        else:
            try:
                date.fromisoformat(entry['reviewed_on'])
            except ValueError:
                errors.append(f'{path}: reviewed_on must be an ISO date')
            if entry['license'] not in {'CC-BY-4.0', 'Apache-2.0', 'MIT'}:
                errors.append(f'{path}: review requires an explicit supported license')
            if entry['license'] == 'MIT' and (entry.get('source_kind') != 'third-party' or not entry.get('source_url')):
                errors.append(f'{path}: third-party license requires its source record')
            if entry.get('sha256') != digest(root / path):
                errors.append(f'{path}: changed since rights review')
    return errors


def audit_quotations(root, ledger):
    if ledger.get('version') != 1 or not isinstance(ledger.get('items'), list):
        raise ValueError('Expected quotation version 1 with an items array')
    errors, found, entries = [], {}, {}
    for path in sorted(content_paths(root)):
        if Path(path).suffix.lower() not in TEXT:
            continue
        text = (root / path).read_text(encoding='utf-8')
        matches = list(QUOTE.finditer(text))
        if text.count('<!-- quote:') != len(matches) or text.count('<!-- /quote:') != len(matches):
            errors.append(f'{path}: malformed quotation boundaries')
        for match in matches:
            ident, body = match.groups()
            if ident in found:
                errors.append(f'{path}: duplicate quotation id {ident}')
            if '<!-- quote:' in body:
                errors.append(f'{path}: nested quotations are not supported')
            found[ident] = (path, body.strip())
    required = ('author', 'work', 'locator', 'source_url', 'necessity', 'publication_basis', 'reviewed_on')
    for entry in ledger['items']:
        if not isinstance(entry, dict):
            raise ValueError('Every quotation entry must be an object')
        ident, path = entry.get('id'), entry.get('path')
        if not isinstance(ident, str) or not re.fullmatch('[a-zA-Z0-9-]+', ident) or not safe_path(path):
            raise ValueError('Quotation requires a safe id and repository-relative path')
        if ident in entries:
            errors.append(f'{path}: duplicate quotation ledger id {ident}')
        entries[ident] = entry
        if ident not in found or found[ident][0] != path:
            errors.append(f'{path}: stale quotation record {ident}')
        elif not all(isinstance(entry.get(k), str) and entry[k].strip() for k in required):
            errors.append(f'{path}: quotation {ident} lacks source or necessity review')
        else:
            if entry.get('status') != 'reviewed' or entry.get('license') != 'EXCLUDED':
                errors.append(f'{path}: quotation {ident} must be reviewed and excluded from project licenses')
            if not entry['source_url'].startswith(('https://', 'http://')):
                errors.append(f'{path}: quotation {ident} requires a source URL')
            try:
                date.fromisoformat(entry['reviewed_on'])
            except ValueError:
                errors.append(f'{path}: quotation {ident} requires an ISO review date')
            expected = hashlib.sha256(found[ident][1].encode('utf-8')).hexdigest()
            if entry.get('sha256') != expected:
                errors.append(f'{path}: quotation {ident} changed since review')
            # Attribution must travel with the excerpt, not only in a JSON file.
            body = (root / path).read_text(encoding='utf-8')
            if any(entry[k] not in body for k in ('author', 'work', 'locator')):
                errors.append(f'{path}: quotation {ident} needs visible attribution')
    for ident, (path, _) in found.items():
        if ident not in entries:
            errors.append(f'{path}: unregistered quotation {ident}')
    return errors


def main():
    try:
        manifest = json.loads((ROOT / 'config/content-rights.json').read_text(encoding='utf-8'))
        ledger = json.loads((ROOT / 'config/quotations.json').read_text(encoding='utf-8'))
        errors = audit(ROOT, manifest) + audit_quotations(ROOT, ledger)
    except (OSError, ValueError, TypeError, AttributeError) as exc:
        print(f'Rights check failed: {exc}', file=sys.stderr)
        return 1
    if errors:
        print('Publication blocked: unresolved content rights. See LICENSING.md.', file=sys.stderr)
        print(chr(10).join(errors), file=sys.stderr)
        return 1
    print(f'Editorial rights records passed: {len(manifest["files"])} files; {len(ledger["items"])} quotations. This is not legal clearance.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
