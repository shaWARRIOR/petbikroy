#!/usr/bin/env python3
"""Verify every local href/src in the HTML resolves, and that each page loads
the scripts it actually needs (in the right order)."""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'public')
ADMIN = os.path.join(SITE, 'admin')

PAGES = ['index.html', 'listings.html', 'ad.html', 'post.html',
         'my-ads.html', 'favorites.html', 'login.html', 'register.html',
         'account.html', 'seller.html', '404.html']

# The scripts each page must load, in order. api.js is the data layer that
# every page now goes through, so it sits between the shared chrome and the
# page's own driver.
NEEDS = {
    'index.html':     ['data.js', 'app.js', 'api.js', 'home.js'],
    'listings.html':  ['data.js', 'app.js', 'api.js', 'listings.js'],
    'ad.html':        ['data.js', 'app.js', 'api.js', 'ad.js'],
    'post.html':      ['data.js', 'app.js', 'api.js', 'wizard.js', 'post.js'],
    'my-ads.html':    ['data.js', 'app.js', 'api.js', 'wizard.js', 'my-ads.js'],
    'favorites.html': ['data.js', 'app.js', 'api.js', 'favorites.js'],
    'login.html':     ['data.js', 'app.js', 'api.js', 'login.js'],
    'register.html':  ['data.js', 'app.js', 'api.js', 'register.js'],
    'account.html':   ['data.js', 'app.js', 'api.js', 'account.js'],
    'seller.html':    ['data.js', 'app.js', 'api.js', 'seller.js'],
    '404.html':       ['data.js', 'app.js', 'api.js', 'not-found.js'],
}

# Pages that need something other than <main> + the public stylesheet.
EXEMPT_MAIN = {'404.html'}

problems = []


def read(path):
    with open(path, encoding='utf-8') as handle:
        return handle.read()


def all_js(directory):
    """Concatenation of every script in `directory` (used to resolve ids that
    are only ever produced by generated markup, which is legitimate)."""
    blob = ''
    for name in sorted(os.listdir(directory)):
        if name.endswith('.js'):
            blob += read(os.path.join(directory, name))
    return blob


PUBLIC_JS = all_js(os.path.join(SITE, 'assets', 'js'))

for page in PAGES:
    src = read(os.path.join(SITE, page))

    # --- asset links ---
    for attr, url in re.findall(r'\b(href|src)="([^"]+)"', src):
        if url.startswith(('http://', 'https://', 'data:', 'mailto:', 'tel:', '#', 'javascript:')):
            continue
        target = url.split('?')[0].split('#')[0]
        if not target:
            continue
        if not os.path.exists(os.path.join(SITE, target)):
            problems.append(f'{page}: broken {attr} -> {url}')

    # --- script order ---
    scripts = re.findall(r'<script src="([^"]+)"', src)
    loaded = [s.split('/')[-1] for s in scripts]
    expected = NEEDS[page]
    if loaded != expected:
        problems.append(f'{page}: scripts {loaded} != expected {expected}')
    if loaded[:2] != ['data.js', 'app.js']:
        problems.append(f'{page}: data.js/app.js must load first, got {loaded[:2]}')
    if 'api.js' not in loaded:
        problems.append(f'{page}: api.js is missing, so the page cannot reach the backend')
    elif loaded.index('api.js') > loaded.index(expected[-1]):
        problems.append(f'{page}: api.js must load before {expected[-1]}')

    # --- page furniture ---
    if src.count('<main') != 1:
        problems.append(f'{page}: expected 1 <main>, found {src.count("<main")}')
    if src.count('assets/css/styles.css') != 1:
        problems.append(f'{page}: stylesheet link count {src.count("assets/css/styles.css")}')

    # --- no inline scripts: the CSP is script-src 'self' ---
    inline = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', src, re.S)
    if any(body.strip() for body in inline):
        problems.append(f'{page}: contains an inline <script>, which the CSP blocks')

    # --- required element ids the page's driver queries ---
    driver = read(os.path.join(SITE, 'assets', 'js', expected[-1]))
    for el_id in re.findall(r"\$\('#([A-Za-z0-9_-]+)'\)", driver):
        if f'id="{el_id}"' in src or f'id="{el_id}"' in PUBLIC_JS:
            continue
        problems.append(f'{page}: JS queries #{el_id} but nothing defines it')


# ----- cross-page links point at real pages ---------------------------------
for page in PAGES:
    src = read(os.path.join(SITE, page))
    for url in re.findall(r'href="([a-z0-9-]+\.html)(?:\?[^"]*)?"', src):
        if url not in PAGES:
            problems.append(f'{page}: link to unknown page {url}')


# ----- the admin panel ------------------------------------------------------
admin_html = read(os.path.join(ADMIN, 'index.html'))
ADMIN_JS = all_js(os.path.join(ADMIN, 'assets'))

for attr, url in re.findall(r'\b(href|src)="([^"]+)"', admin_html):
    if url.startswith(('http://', 'https://', 'data:', 'mailto:', 'tel:', '#', 'javascript:', '../')):
        continue
    if not os.path.exists(os.path.join(ADMIN, url.split('?')[0])):
        problems.append(f'admin/index.html: broken {attr} -> {url}')

if 'assets/admin.css' not in admin_html:
    problems.append('admin/index.html: stylesheet is missing')
if '<script src="assets/admin.js"></script>' not in admin_html:
    problems.append('admin/index.html: the admin script is missing or has the wrong path')
if 'noindex' not in admin_html:
    problems.append('admin/index.html: the panel must be marked noindex')

inline = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', admin_html, re.S)
if any(body.strip() for body in inline):
    problems.append("admin/index.html: contains an inline <script>, which the CSP blocks")

for el_id in re.findall(r"\$\('#([A-Za-z0-9_-]+)'\)", ADMIN_JS):
    if f'id="{el_id}"' in admin_html or f'id="{el_id}"' in ADMIN_JS:
        continue
    problems.append(f'admin/index.html: admin.js queries #{el_id} but nothing defines it')

# Every view the router can show should have a nav entry, and vice versa.
views = set(re.findall(r'^\s{4}(\w+):\s*\{ title:', ADMIN_JS, re.M))
navs = set(re.findall(r'data-view="(\w+)"', admin_html))
for missing in sorted(views - navs):
    problems.append(f'admin: view "{missing}" has no sidebar link')
for extra in sorted(navs - views):
    problems.append(f'admin: sidebar links to "{extra}", which is not a view')


print(f'checked {len(PAGES)} site pages + the admin panel')
if problems:
    print('\n'.join('  ! ' + p for p in problems))
    sys.exit(1)
print('All links, assets, script orders and element ids check out')
