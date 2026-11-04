"""Describe the existing site and its visible navigation, without invented dates."""
from pathlib import PurePosixPath
from urllib.parse import urljoin
from mkdocs.utils import get_relative_url


def on_page_context(context, page, config, **kwargs):
    title = page.meta.get('title') or page.title or config['site_name']
    context['seo_title'] = (title + ' - ' + config['site_name']
                            if page.meta.get('title') or not page.is_homepage
                            else config['site_name'])
    if page.is_homepage:
        context['study_schema'] = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': config['site_name'],
            'url': config['site_url'],
            'description': page.meta['description'],
            'inLanguage': 'zh-CN',
        }
        return context

    crumbs = [{'name': '首页', 'url': config['site_url']}]
    uri = PurePosixPath(page.file.src_uri)
    courses = config['extra']['study_courses']
    course = next((c for c in courses if uri.parent.as_posix() == 'courses/' + c['slug']), None)
    if course and uri.name != 'index.md':
        crumbs.append({'name': course['title'],
                       'url': urljoin(config['site_url'], 'courses/' + course['slug'] + '/')})
    elif uri.parent.as_posix() == 'labs' and uri.name != 'index.md':
        crumbs.append({'name': '交互练习', 'url': urljoin(config['site_url'], 'labs/')})
    crumbs.append({'name': course['title'] if course and uri.name == 'index.md' else page.title,
                   'url': page.canonical_url})
    for crumb in crumbs:
        crumb['href'] = get_relative_url(crumb['url'][len(config['site_url']):] or '.', page.url)
    context['study_breadcrumbs'] = crumbs
    context['study_schema'] = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': i, 'name': crumb['name'], 'item': crumb['url']}
            for i, crumb in enumerate(crumbs, start=1)
        ],
    }
    return context
