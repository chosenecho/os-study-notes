"""Mutation checks prove note regressions catch wrong results and assumptions."""
from pathlib import Path
import importlib.util
import json
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('multimedia_check', ROOT / 'tools/checks/multimedia.py')
multimedia = importlib.util.module_from_spec(spec)
spec.loader.exec_module(multimedia)


class MultimediaNotesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.addCleanup(self.temp.cleanup)
        data = json.loads((ROOT/'config/syllabus.json').read_text(encoding='utf-8'))
        data['chapters'] = [c for c in data['chapters'] if c['id'].startswith('mm-')]
        (self.root/'config').mkdir()
        (self.root/'config/syllabus.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        for c in data['chapters']:
            target = self.root / c['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text((ROOT/c['path']).read_text(encoding='utf-8'), encoding='utf-8')

    def mutate(self, chapter, before, after):
        path = self.root / f'docs/courses/multimedia-technology/chapter-{chapter:02}.md'
        text = path.read_text(encoding='utf-8')
        self.assertIn(before, text)
        path.write_text(text.replace(before, after, 1), encoding='utf-8')

    def test_current_notes_recompute(self):
        checks, errors = multimedia.audit(self.root)
        self.assertGreater(checks, 75)
        self.assertEqual(errors, [])

    def test_wrong_image_result_and_lost_condition_are_caught(self):
        self.mutate(4, '=6220800字节', '=6220801字节')
        self.mutate(4, '不计文件头、调色板和行填充', '计入全部结构开销')
        _, errors = multimedia.audit(self.root)
        self.assertTrue(any('image bytes disagree' in e for e in errors))
        self.assertTrue(any('storage-overhead conditions' in e for e in errors))

    def test_pcm_bit_byte_error_is_caught(self):
        self.mutate(5, '得到 48000 B/s', '得到 384000 B/s')
        _, errors = multimedia.audit(self.root)
        self.assertTrue(any('B/s must convert' in e for e in errors))

    def test_frame_counting_and_moved_path_errors_are_caught(self):
        self.mutate(7, '时长为36÷12=3秒', '时长为36÷12=2.92秒')
        self.mutate(8, '按新位置应写../../assets/logo.png', '按新位置应写../assets/logo.png')
        _, errors = multimedia.audit(self.root)
        self.assertTrue(any('animation duration disagrees' in e for e in errors))
        self.assertTrue(any('moved document-relative path' in e for e in errors))

    def test_learning_level_gap_is_caught(self):
        path = self.root/'config/syllabus.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        chapter = next(c for c in data['chapters'] if c['id'] == 'mm-2')
        chapter['practice'][-1]['levels'].remove('简单应用')
        path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        _, errors = multimedia.audit(self.root)
        self.assertTrue(any('mm-2 s2' in e for e in errors))
