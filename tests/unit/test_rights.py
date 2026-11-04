import importlib.util
import hashlib
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

spec = importlib.util.spec_from_file_location('rights', Path(__file__).resolve().parents[2] / 'tools/checks/rights.py')
rights = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rights)


class RightsTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.path = 'docs/courses/demo/chapter-01.md'
        self.file = self.root / self.path
        self.file.parent.mkdir(parents=True)
        self.file.write_text('# Original\n', encoding='utf-8')
        self.entry = dict(path=self.path, status='cleared', license='CC-BY-4.0',
                          basis='Independently written example, reviewed by maintainer',
                          reviewed_on='2026-11-04', sha256=rights.digest(self.file))

    def audit(self, entries):
        return rights.audit(self.root, dict(version=1, files=entries))

    def test_cleared_file_passes_and_line_endings_do_not_invalidate_review(self):
        self.assertEqual(self.audit([self.entry]), [])
        self.file.write_bytes(b'# Original\r\n')
        self.assertEqual(self.audit([self.entry]), [])

    def test_pending_and_unknown_material_block_publication(self):
        self.entry.update(status='pending', basis='Textbook permission not verified')
        self.assertIn('pending', self.audit([self.entry])[0])
        new_image = self.root / 'docs/third-party.png'
        new_image.parent.mkdir(parents=True, exist_ok=True)
        new_image.write_bytes(b'new image')
        self.assertTrue(any('third-party.png: unreviewed' in error for error in self.audit([self.entry])))
        (new_image.parent / 'new-notes.txt').write_text('Unreviewed material', encoding='utf-8')
        self.assertTrue(any('new-notes.txt: unreviewed' in error for error in self.audit([self.entry])))

    def test_changed_content_and_missing_review_evidence_block_publication(self):
        self.file.write_text('# Copied question\n', encoding='utf-8')
        self.assertIn('changed since rights review', self.audit([self.entry])[0])
        self.entry.pop('basis')
        self.assertIn('clearance requires', self.audit([self.entry])[0])

    def test_duplicate_stale_and_unsafe_entries_fail_closed(self):
        self.assertIn('duplicate', self.audit([self.entry, self.entry])[0])
        self.file.unlink()
        self.assertIn('stale', self.audit([self.entry])[0])
        for path in ('../outside.md', '/absolute.md', 'C:/outside.md', 'content\\outside.md'):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.audit([dict(self.entry, path=path)])

    def test_malformed_manifest_is_rejected(self):
        with self.assertRaises(ValueError):
            rights.audit(self.root, dict(version=2, files=[]))

    def test_frontend_bank_public_archive_and_vendor_assets_are_in_scope(self):
        for name in ('docs/assets/javascripts/labs/quiz-bank.mjs', 'archive/old-answer.txt',
                     'handbook/review.md', 'docs/assets/vendor/katex/unregistered.svg'):
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('new unreviewed content', encoding='utf-8')
            self.assertTrue(any(name + ': unreviewed' in error for error in self.audit([self.entry])))

    def test_quote_boundaries_source_scope_and_digest(self):
        body = 'A short invented fixture.'
        text = ('Author Example, Work Example, section 2' + chr(10)
                + '<!-- quote:fixture -->' + body + '<!-- /quote:fixture -->')
        self.file.write_text(text, encoding='utf-8')
        ledger = dict(version=1, items=[])
        self.assertIn('unregistered quotation', rights.audit_quotations(self.root, ledger)[0])
        item = dict(id='fixture', path=self.path, status='reviewed', license='EXCLUDED',
                    author='Author Example', work='Work Example', locator='section 2',
                    source_url='https://example.org/work', necessity='Test fixture for review boundaries',
                    publication_basis='Synthetic test content created for this test', reviewed_on='2026-11-04',
                    sha256=hashlib.sha256(body.encode('utf-8')).hexdigest())
        ledger['items'] = [item]
        self.assertEqual(rights.audit_quotations(self.root, ledger), [])
        self.file.write_text(text.replace(body, body + ' changed'), encoding='utf-8')
        self.assertIn('changed since review', rights.audit_quotations(self.root, ledger)[0])
        item.pop('necessity')
        self.assertIn('lacks source or necessity', rights.audit_quotations(self.root, ledger)[0])

    def test_malformed_quote_is_rejected(self):
        self.file.write_text('<!-- quote:broken -->Not closed', encoding='utf-8')
        self.assertIn('malformed', rights.audit_quotations(self.root, dict(version=1, items=[]))[0])
