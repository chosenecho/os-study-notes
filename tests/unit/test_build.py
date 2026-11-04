"""Test native MkDocs page events and byte-preserving license distribution."""
import hashlib
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from mkdocs.structure.files import Files

ROOT = Path(__file__).resolve().parents[2]


def module(name):
    spec = importlib.util.spec_from_file_location('study_' + name, ROOT / f'tools/mkdocs/{name}.py')
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


content = module('content')
licenses = module('licenses')


class BuildTests(unittest.TestCase):
    def test_independent_practice_has_visible_scope_and_folded_answer(self):
        source = '## 自编练习' + chr(10)*2 + '**1. Explain a mechanism.**' + chr(10)*2
        source += '考点：第 1 节；层次：领会。' + chr(10)*2 + '**答案：** A reasoned explanation.'
        result = content.format_exercises(source)
        self.assertIn('class="exercise-item"', result)
        self.assertIn('考点：第 1 节', result)
        self.assertIn('参考答案：', result)
        self.assertIn('A reasoned explanation.', result)
        with self.assertRaises(ValueError):
            content.format_exercises(source.split('**答案：**')[0])

    def test_license_snapshots_and_virtual_downloads_preserve_bytes(self):
        snapshots = json.loads((ROOT / 'LICENSES/third-party/SOURCES.json').read_text(encoding='utf-8'))
        with TemporaryDirectory() as tmp:
            config = SimpleNamespace(site_dir=tmp, use_directory_urls=True,
                                     plugins=SimpleNamespace(_current_plugin=None))
            files = licenses.on_files(Files([]), config)
            for relative, expected in snapshots['distributed_files'].items():
                with self.subTest(file=relative):
                    data = (ROOT / 'LICENSES' / relative).read_bytes()
                    self.assertEqual(hashlib.sha256(data).hexdigest(), expected)
                    self.assertEqual(files.get_file_from_path('licenses/' + relative).content_bytes, data)
            self.assertEqual(files.get_file_from_path('licenses/Apache-2.0.txt').content_bytes,
                             (ROOT / 'LICENSE').read_bytes())
            self.assertEqual(files.get_file_from_path('licenses/content-rights.json').content_bytes,
                             (ROOT / 'config/content-rights.json').read_bytes())
            self.assertIn('](licenses/CC-BY-4.0.txt)', files.get_file_from_path('licensing.md').content_string)
            self.assertNotIn('](LICENSES/', files.get_file_from_path('third-party-notices.md').content_string)

    def test_course_indexes_keep_source_links_and_omit_private_provenance(self):
        course = dict(id='demo', slug='demo', title='Demo', chapters=1)
        source = ('# Demo guide\n\n[Chapter](chapter-01.md) [Section](chapter-01.md#section)\n\n'
                  '[Reference](../../reference/glossary.md)\n\n'
                  '## 资料依据与使用边界\n\nPrivate textbook path.\n\n'
                  '## 建议用法\n\nRead in order.\n\n'
                  '## 原有笔记处理\n\nPrivate backup.\n')
        page = SimpleNamespace(file=SimpleNamespace(src_uri='courses/demo/index.md'), meta={})
        with patch.object(content, 'COURSES', [course]):
            result = content.on_page_markdown(source, page, {}, [])
        self.assertIn('# Demo\n', result)
        self.assertIn('](chapter-01.md)', result)
        self.assertIn('](chapter-01.md#section)', result)
        self.assertIn('data-progress-chapter="demo-1"', result)
        self.assertIn('](../../reference/glossary.md)', result)
        self.assertIn('Read in order.', result)
        self.assertNotIn('Private', result)
        self.assertEqual(page.meta['description'], 'Demo课程目录与复习指南。')

    def test_chapter_enrichment_uses_source_paths_without_writing_copies(self):
        with TemporaryDirectory() as tmp:
            folder = Path(tmp) / 'courses/demo'
            (folder / 'figures').mkdir(parents=True)
            (folder / 'figures/a.svg').write_text('<svg width="20" height="10"/>', encoding='utf-8')
            note = folder / 'chapter-01.md'
            source = '# 第 1 章\n\n![A](figures/a.svg)\n\n见第 2 章\n'
            note.write_text(source, encoding='utf-8')
            page = SimpleNamespace(file=SimpleNamespace(src_uri='courses/demo/chapter-01.md',
                                                       abs_src_path=str(note)),
                                   url='courses/demo/chapter-01/', meta={})
            course = dict(id='demo', slug='demo', title='Demo', chapters=2)
            with patch.object(content, 'COURSES', [course]):
                rendered = content.on_page_markdown(source, page, {}, [])
                self.assertEqual(rendered, content.on_page_markdown(source, page, {}, []))
            self.assertIn('src="../figures/a.svg"', rendered)
            self.assertIn('width="20" height="10"', rendered)
            self.assertIn('data-chapter="demo-1"', rendered)
            self.assertIn('](chapter-02.md)', rendered)
            self.assertIn('image-dialog-holder', rendered)
            self.assertEqual(note.read_text(encoding='utf-8'), source)
            self.assertEqual(len(list(Path(tmp).rglob('*.md'))), 1)
            for invalid in ('../outside.svg', 'figures/a.png', 'figures/missing.svg'):
                with self.subTest(path=invalid), self.assertRaises(ValueError):
                    content.chapter_images(f'![Bad]({invalid})', page)


if __name__ == '__main__':
    unittest.main()
