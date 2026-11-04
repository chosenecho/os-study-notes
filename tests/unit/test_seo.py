"""Failures that should block publication, including negative HTML fixtures."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[2]


def load(relative, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


seo = load('tools/checks/seo.py', 'seo_check')
hook = load('tools/mkdocs/seo.py', 'seo_hook')
SITE = 'https://studynote.chosenecho.top/'


def html(url, title, description):
    schema = ({'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'studynote', 'url': SITE}
              if url == SITE else
              {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
                  {'@type': 'ListItem', 'position': 1, 'name': '首页', 'item': SITE},
                  {'@type': 'ListItem', 'position': 2, 'name': title, 'item': url}]})
    return (f'<html><head><title>{title}</title><meta name="description" content="{description}">'
            f'<link rel="canonical" href="{url}">'
            f'<meta property="og:title" content="{title}"><meta name="twitter:title" content="{title}">'
            f'<meta property="og:description" content="{description}">'
            f'<meta name="twitter:description" content="{description}">'
            f'<meta property="og:url" content="{url}">'
            f'<script type="application/ld+json">{json.dumps(schema)}</script></head>'
            '<body><h1>Heading<a class="headerlink">¶</a></h1></body></html>')


class SeoTests(unittest.TestCase):
    def fixture(self, root, second=None):
        (root / 'guide').mkdir()
        (root / 'sitemap.xml').write_text(
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f'<url><loc>{SITE}</loc></url><url><loc>{SITE}guide/</loc></url></urlset>', encoding='utf-8')
        (root / 'index.html').write_text(html(SITE, 'Home', 'Home description'), encoding='utf-8')
        (root / 'guide/index.html').write_text(second or html(SITE + 'guide/', 'Guide', 'Guide description'),
                                              encoding='utf-8')
        (root / '404.html').write_text('<meta name="robots" content="noindex, follow">', encoding='utf-8')

    def test_good_build_and_anchor_inside_h1(self):
        with TemporaryDirectory() as tmp:
            self.fixture(Path(tmp))
            report = seo.audit(Path(tmp), SITE)
            self.assertTrue(report['passed'], report['errors'])
            self.assertEqual([p['h1_count'] for p in report['pages']], [1, 1])

    def test_bad_metadata_canonical_indexing_and_schema_fail(self):
        mutations = {
            'description': lambda s: s.replace('name="description"', 'name="missing"'),
            'title': lambda s: s.replace('<title>Guide</title>', '<title></title>'),
            'duplicate canonical': lambda s: s.replace('</head>', f'<link rel="canonical" href="{SITE}"></head>'),
            'wrong canonical': lambda s: s.replace(f'rel="canonical" href="{SITE}guide/"',
                                                   f'rel="canonical" href="{SITE}"'),
            'noindex': lambda s: s.replace('</head>', '<meta name="robots" content="NOINDEX, follow"></head>'),
            'none': lambda s: s.replace('</head>', '<meta name="googlebot" content="none"></head>'),
            'json': lambda s: s.replace('"@context":', '"@context"'),
            'duplicate title': lambda s: s.replace('Guide', 'Home'),
            'social': lambda s: s.replace('property="og:title"', 'property="wrong"'),
        }
        for name, mutate in mutations.items():
            with self.subTest(name=name), TemporaryDirectory() as tmp:
                self.fixture(Path(tmp), mutate(html(SITE + 'guide/', 'Guide', 'Guide description')))
                self.assertFalse(seo.audit(Path(tmp), SITE)['passed'])

    def test_sitemap_cannot_hide_pages_or_use_other_hosts_or_error_urls(self):
        for url in ('https://staging.example/guide/', SITE + '404/', SITE + '../guide/'):
            with self.subTest(url=url), TemporaryDirectory() as tmp:
                root = Path(tmp)
                self.fixture(root)
                file = root / 'sitemap.xml'
                file.write_text(file.read_text().replace(SITE + 'guide/', url), encoding='utf-8')
                self.assertFalse(seo.audit(root, SITE)['passed'])
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.fixture(root)
            (root / 'orphan.html').write_text('<h1>Forgotten page</h1>', encoding='utf-8')
            self.assertFalse(seo.audit(root, SITE)['passed'])

    def test_duplicate_description_is_a_review_warning(self):
        with TemporaryDirectory() as tmp:
            self.fixture(Path(tmp), html(SITE + 'guide/', 'Guide', 'Home description'))
            report = seo.audit(Path(tmp), SITE)
            self.assertTrue(report['passed'])
            self.assertEqual(len(report['warnings']), 1)

    def test_breadcrumbs_follow_registered_course_and_labs(self):
        config = {'site_name': 'studynote', 'site_url': SITE,
                  'extra': {'study_courses': [{'slug': 'demo', 'title': '演示课程'}]}}
        for uri, parent in [('courses/demo/chapter-01.md', '演示课程'), ('labs/cache.md', '交互练习')]:
            page = SimpleNamespace(meta={}, title='A < B & C', is_homepage=False,
                                   url=uri.removesuffix('.md') + '/',
                                   canonical_url=SITE + uri.removesuffix('.md') + '/',
                                   file=SimpleNamespace(src_uri=uri))
            context = hook.on_page_context({}, page, config)
            self.assertEqual(context['study_breadcrumbs'][1]['name'], parent)
            self.assertEqual(context['study_schema']['itemListElement'][-1]['name'], page.title)
            self.assertEqual(context['seo_title'], 'A < B & C - studynote')


if __name__ == '__main__':
    unittest.main()
