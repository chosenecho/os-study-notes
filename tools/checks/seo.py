"""Audit built HTML and sitemap consistency. This does not prove indexation."""
import argparse
from collections import defaultdict
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

import yaml

ROOT = Path(__file__).resolve().parents[2]
NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}


class PageHTML(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.titles, self.canonicals, self.schemas, self.headings = [], [], [], []
        self.meta = defaultdict(list)
        self.capture = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[(attrs.get('name') or attrs.get('property') or '').lower()].append(
                attrs.get('content', '').strip())
        elif tag == 'link' and 'canonical' in attrs.get('rel', '').lower().split():
            self.canonicals.append(attrs.get('href', ''))
        if tag in ('title', 'h1') or (tag == 'script' and attrs.get('type') == 'application/ld+json'):
            self.capture = (tag, [])

    def handle_data(self, data):
        if self.capture:
            self.capture[1].append(data)

    def handle_endtag(self, tag):
        if self.capture and self.capture[0] == tag:
            text = ''.join(self.capture[1]).strip()
            {'title': self.titles, 'h1': self.headings, 'script': self.schemas}[tag].append(text)
            self.capture = None


def noindex(page):
    return any(re.search(r'(?:^|[\s,;])(noindex|none)(?:$|[\s,;])', value, re.I)
               for name in ('robots', 'googlebot', 'bingbot') for value in page.meta[name])


def local_file(url, site_url, folder):
    target, site = urlsplit(url), urlsplit(site_url)
    if (target.scheme != 'https' or target.netloc != site.netloc or target.query or target.fragment
            or not target.path.startswith(site.path)):
        raise ValueError('sitemap URL must use the canonical HTTPS site root')
    relative = unquote(target.path[len(site.path):])
    if any(p in ('.', '..') for p in relative.split('/')) or chr(92) in relative:
        raise ValueError('unsafe sitemap path')
    if relative and not relative.endswith('/'):
        raise ValueError('expected a directory URL')
    path = (folder / relative / 'index.html').resolve()
    if not path.is_relative_to(folder.resolve()):
        raise ValueError('path escapes the build directory')
    return path


def audit(folder, site_url):
    folder = Path(folder)
    errors, warnings, pages = [], [], []
    titles, descriptions = defaultdict(list), defaultdict(list)
    sitemap = ET.parse(folder / 'sitemap.xml')
    urls = [el.text or '' for el in sitemap.findall('s:url/s:loc', NS)]
    if not urls:
        errors.append('sitemap has no URLs')
    if len(urls) != len(set(urls)):
        errors.append('sitemap has duplicate URLs')
    expected_files = set()
    for url in urls:
        try:
            path = local_file(url, site_url, folder)
            if '404' in urlsplit(url).path.split('/'):
                raise ValueError('error page must not be in sitemap')
            expected_files.add(path)
            page = PageHTML(path.read_text(encoding='utf-8'))
        except (OSError, ValueError) as exc:
            errors.append(f'{url}: {exc}')
            continue
        title = page.titles[0] if len(page.titles) == 1 else ''
        description = page.meta['description'][0] if len(page.meta['description']) == 1 else ''
        if not title:
            errors.append(f'{url}: expected one nonempty title')
        if not description:
            errors.append(f'{url}: expected one nonempty description')
        if page.canonicals != [url]:
            errors.append(f'{url}: expected one self canonical, got {page.canonicals}')
        if noindex(page):
            errors.append(f'{url}: unexpected noindex/none')
        if not page.headings or not any(h.strip('¶ ') for h in page.headings):
            errors.append(f'{url}: missing visible H1')
        elif len(page.headings) > 1:
            warnings.append(f'{url}: review multiple H1 elements ({len(page.headings)})')
        for key, expected in [('og:title', title), ('twitter:title', title),
                              ('og:description', description), ('twitter:description', description),
                              ('og:url', url)]:
            if page.meta[key] != [expected]:
                errors.append(f'{url}: {key} differs from page metadata')
        try:
            images = page.meta['og:image']
            if len(images) != 1 or page.meta['twitter:image'] != images:
                raise ValueError('expected one matching OG/Twitter image')
            image, site = urlsplit(images[0]), urlsplit(site_url)
            if (image.scheme != 'https' or image.netloc != site.netloc or image.query
                    or image.fragment or not image.path.startswith(site.path)):
                raise ValueError('image must use this build\'s canonical HTTPS root')
            relative = unquote(image.path[len(site.path):])
            asset = (folder / relative).resolve()
            if not asset.is_relative_to(folder.resolve()) or asset.suffix != '.png':
                raise ValueError('invalid share image path')
            png = asset.read_bytes()
            if (png[:16] != b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
                    or int.from_bytes(png[16:20], 'big') != 1200
                    or int.from_bytes(png[20:24], 'big') != 630):
                raise ValueError('share image must be a 1200 by 630 PNG')
            if page.meta['twitter:card'] != ['summary_large_image']:
                raise ValueError('large image card is missing')
        except (OSError, ValueError) as exc:
            errors.append(f'{url}: invalid share image: {exc}')
        try:
            if len(page.schemas) != 1:
                raise ValueError('expected one JSON-LD object')
            schema = json.loads(page.schemas[0])
            if schema.get('@context') != 'https://schema.org':
                raise ValueError('unexpected schema context')
            if url == site_url:
                if schema.get('@type') != 'WebSite' or schema.get('url') != url or not schema.get('name'):
                    raise ValueError('homepage WebSite identity differs from canonical')
            else:
                crumbs = schema.get('itemListElement', [])
                if (schema.get('@type') != 'BreadcrumbList' or len(crumbs) < 2
                        or crumbs[0].get('item') != site_url or crumbs[-1].get('item') != url):
                    raise ValueError('breadcrumb endpoints differ from canonical hierarchy')
                for i, crumb in enumerate(crumbs, start=1):
                    if crumb.get('@type') != 'ListItem' or crumb.get('position') != i or not crumb.get('name'):
                        raise ValueError('invalid breadcrumb name, type or position')
                    local_file(crumb.get('item', ''), site_url, folder)
                    if crumb.get('item') not in urls:
                        raise ValueError('breadcrumb destination is outside sitemap')
        except (ValueError, TypeError, AttributeError, KeyError) as exc:
            errors.append(f'{url}: invalid structured data: {exc}')
        titles[title].append(url)
        descriptions[description].append(url)
        pages.append({'url': url, 'title': title, 'description': description,
                      'canonical': page.canonicals, 'h1_count': len(page.headings)})
    for title, locations in titles.items():
        if title and len(locations) > 1:
            errors.append(f'duplicate title {title!r}: {locations}')
    for description, locations in descriptions.items():
        if description and len(locations) > 1:
            warnings.append(f'duplicate description {description!r}: {locations}')
    for path in folder.rglob('*.html'):
        excluded = path in (folder / '404.html', folder / '403.html', folder / 'search/index.html')
        if excluded and not noindex(PageHTML(path.read_text(encoding='utf-8'))):
            errors.append(f'{path.relative_to(folder)}: excluded page requires noindex')
        if path.resolve() not in expected_files and not excluded:
            errors.append(f'{path.relative_to(folder)}: HTML page missing from sitemap')
    error_file = folder / '404.html'
    if not error_file.is_file() or not noindex(PageHTML(error_file.read_text(encoding='utf-8'))):
        errors.append('404.html must exist with noindex')
    return {'site_url': site_url, 'page_count': len(pages), 'pages': pages,
            'errors': errors, 'warnings': warnings, 'passed': not errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-dir', type=Path, default=ROOT / 'dist')
    parser.add_argument('--report', type=Path, default=ROOT / 'artifacts/seo/check.json')
    args = parser.parse_args()
    site_url = yaml.safe_load((ROOT / 'mkdocs.yml').read_text(encoding='utf-8'))['site_url']
    try:
        report = audit(args.site_dir, site_url)
    except (OSError, ValueError, ET.ParseError) as exc:
        report = {'passed': False, 'errors': [str(exc)], 'warnings': [], 'page_count': 0}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'SEO build audit: {report["page_count"]} pages; '
          f'{len(report["errors"])} errors; {len(report["warnings"])} warnings.')
    for label in ('errors', 'warnings'):
        for message in report[label]:
            print(f'{label}: {message}')
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
