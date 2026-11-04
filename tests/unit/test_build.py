"""Check generated-source lifecycle in an isolated temporary directory."""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('study_hooks', ROOT / 'website/hooks.py')
hooks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hooks)

class BuildTests(unittest.TestCase):
    def test_missing_chapter_is_an_explicit_failure(self):
        with TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(SystemExit, 'Missing chapter'):
                hooks.chapter_note(Path(tmp), 1)

    def test_rebuild_cleans_stale_files_and_supports_course_figures(self):
        with TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            docs, src = tmp / 'generated', tmp / 'src'
            docs.mkdir()
            src.mkdir()
            (docs / '.gitkeep').touch()
            (docs / 'stale.md').write_text('stale', encoding='utf-8')
            (src / 'index.md').write_text('# Home', encoding='utf-8')
            course = dict(id='demo', slug='demo', title='Demo', chapters=1, output='demo', progress_prefix='demo-')
            notes = tmp / 'content/courses/demo'
            (notes / 'figures').mkdir(parents=True)
            (notes / 'figures/a.svg').write_text('<svg width="20" height="10"/>', encoding='utf-8')
            (notes / 'chapter-01.md').write_text('# 第 1 章\n\n![A](figures/a.svg)', encoding='utf-8')
            refs = tmp / 'content/reference'
            refs.mkdir()
            for slug in ('pitfalls', 'glossary'):
                (refs / f'{slug}.md').write_text('# Reference\n\n[Chapter](../courses/demo/chapter-01.md)', encoding='utf-8')
            with patch.multiple(hooks, DOCS=docs, SRC=src, CONTENT=tmp / 'content', COURSES=[course]):
                hooks.on_pre_build({})
                self.assertFalse((docs / 'stale.md').exists())
                self.assertTrue((docs / '.gitkeep').exists())
                page = (docs / 'demo/chapter-1.md').read_text(encoding='utf-8')
                self.assertIn('width="20" height="10"', page)
                self.assertNotIn('chapter-2/', page)
                self.assertTrue((docs / 'assets/figures/demo/a.svg').is_file())
                self.assertIn('../demo/chapter-1.md', (docs / 'reference/pitfalls.md').read_text(encoding='utf-8'))
                before = {p.relative_to(docs): p.read_bytes() for p in docs.rglob('*') if p.is_file()}
                hooks.on_pre_build({})
                after = {p.relative_to(docs): p.read_bytes() for p in docs.rglob('*') if p.is_file()}
                self.assertEqual(before, after)

if __name__ == '__main__':
    unittest.main()
