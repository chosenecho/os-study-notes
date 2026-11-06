"""Describe the existing site and its visible navigation, without invented dates."""
from pathlib import PurePosixPath
from urllib.parse import urljoin
from mkdocs.utils import get_relative_url


def _nav_leaf(node):
    """Return the first public path below a nav node."""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        for child in node:
            path = _nav_leaf(child)
            if path:
                return path
        return None
    if isinstance(node, dict):
        for child in node.values():
            path = _nav_leaf(child)
            if path:
                return path
    return None


def _nav_parent_chain(nodes, target, parents=()):
    """Find the nav titles containing target, with a representative URL."""
    if isinstance(nodes, str):
        return list(parents) if nodes == target else None
    if isinstance(nodes, list):
        for child in nodes:
            found = _nav_parent_chain(child, target, parents)
            if found is not None:
                return found
        return None
    if isinstance(nodes, dict):
        for title, child in nodes.items():
            if isinstance(child, str) and child == target:
                return list(parents)
            found = _nav_parent_chain(child, target, parents + ((title, _nav_leaf(child)),))
            if found is not None:
                return found
    return None


def _nav_url(path):
    """Turn a nav source path into the directory URL used by MkDocs."""
    path = path.removesuffix('.md')
    if path.endswith('/index'):
        path = path[:-len('/index')]
    return path + '/'


def on_page_context(context, page, config, **kwargs):
    title = page.meta.get('title') or page.title or config['site_name']
    context['seo_title'] = (title + ' - ' + config['site_name']
                            if page.meta.get('title') or not page.is_homepage
                            else config['site_name'])
    uri = PurePosixPath(page.file.src_uri)
    course = next((c for c in config['extra']['study_courses']
                   if uri.parent.as_posix() == 'courses/' + c['slug']), None)
    image = course['slug'] if course else 'home'
    context['study_social_image'] = urljoin(config['site_url'], 'assets/images/social/' + image + '.png')
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
    nav_chain = _nav_parent_chain(config.get('nav', []), page.file.src_uri)
    if nav_chain is None:
        nav_chain = []
    for name, path in nav_chain:
        if path:
            crumbs.append({'name': name, 'url': urljoin(config['site_url'], _nav_url(path))})
    crumbs.append({'name': page.title, 'url': page.canonical_url})
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
