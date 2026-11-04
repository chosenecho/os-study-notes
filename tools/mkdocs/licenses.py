"""Expose repository license files using MkDocs virtual files, without copies."""
from pathlib import Path
from mkdocs.structure.files import File

REPO = Path(__file__).resolve().parents[2]


def on_files(files, config):
    for source in sorted((REPO / 'LICENSES').rglob('*')):
        if source.is_file():
            uri = 'licenses/' + source.relative_to(REPO / 'LICENSES').as_posix()
            files.append(File.generated(config, uri, abs_src_path=str(source)))
    for source, target in [('LICENSE', 'Apache-2.0.txt'), ('NOTICE', 'NOTICE.txt'),
                           ('config/content-rights.json', 'content-rights.json')]:
        files.append(File.generated(config, 'licenses/' + target, abs_src_path=str(REPO / source)))
    for source, target in [('LICENSING.md', 'licensing.md'),
                           ('THIRD_PARTY_NOTICES.md', 'third-party-notices.md')]:
        text = (REPO / source).read_text(encoding='utf-8')
        text = (text.replace('](LICENSE)', '](licenses/Apache-2.0.txt)')
                .replace('](LICENSES/', '](licenses/')
                .replace('](THIRD_PARTY_NOTICES.md)', '](third-party-notices.md)')
                .replace('](config/content-rights.json)', '](licenses/content-rights.json)'))
        files.append(File.generated(config, target, content=text))
    return files
