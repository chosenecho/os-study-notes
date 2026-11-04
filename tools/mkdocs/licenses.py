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
                           ('config/content-rights.json', 'content-rights.json'),
                           ('config/syllabus.json', 'syllabus.json'),
                           ('config/quotations.json', 'quotations.json')]:
        files.append(File.generated(config, 'licenses/' + target, abs_src_path=str(REPO / source)))
    for source, target in [('LICENSING.md', 'licensing.md'),
                           ('THIRD_PARTY_NOTICES.md', 'third-party-notices.md')]:
        text = (REPO / source).read_text(encoding='utf-8')
        text = (text.replace('](LICENSE)', '](licenses/Apache-2.0.txt)')
                .replace('](LICENSES/', '](licenses/')
                .replace('](THIRD_PARTY_NOTICES.md)', '](third-party-notices.md)')
                .replace('](config/content-rights.json)', '](licenses/content-rights.json)')
                .replace('](config/syllabus.json)', '](licenses/syllabus.json)')
                .replace('](config/quotations.json)', '](licenses/quotations.json)')
                .replace('](handbook/', '](https://github.com/chosenecho/studynote/blob/main/handbook/')
                .replace('](archive/', '](https://github.com/chosenecho/studynote/blob/main/archive/'))
        files.append(File.generated(config, target, content=text))
    return files


def on_page_markdown(markdown, page, **kwargs):
    descriptions = {
        'licensing.md': 'studynote 的软件与学习内容许可、署名要求、教材引用边界和权利通知处理规则。',
        'third-party-notices.md': 'studynote 使用的第三方主题、公式与搜索组件，以及对应许可证和分发文件。',
    }
    if page.file.src_uri in descriptions:
        page.meta['description'] = descriptions[page.file.src_uri]
    return markdown
