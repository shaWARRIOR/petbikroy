#!/usr/bin/env python3
"""Validate generated SVG artwork and the static HTML page structure."""
import os
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr'}
# Tags that may legally be left open in HTML.
OPTIONAL_CLOSE = {'li', 'tr', 'td', 'th', 'tbody', 'thead', 'option', 'p'}


def check_svgs(path):
    raw = open(path, encoding='utf-8').read()
    chunks = re.split(r'^=====([^:]+):([^\n]*)\n', raw, flags=re.M)
    # chunks: [pre, id, adid, body, id, adid, body, ...]
    bad = 0
    total = 0
    for i in range(1, len(chunks), 3):
        body = chunks[i + 2].strip()
        if not body:
            continue
        total += 1
        try:
            ET.fromstring(body)
        except ET.ParseError as e:
            bad += 1
            print(f'  SVG not well-formed ({chunks[i]} / {chunks[i+1]}): {e}')
    print(f'SVGs: {total - bad}/{total} well-formed XML')
    return bad


class Structure(HTMLParser):
    """Reports unclosed / mismatched element nesting in a page."""

    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f'{self.path}:{self.getpos()[0]}: </{tag}> with nothing open')
            return
        # Unwind optional-close tags that were never explicitly closed.
        while self.stack and self.stack[-1][0] != tag and self.stack[-1][0] in OPTIONAL_CLOSE:
            t, ln = self.stack.pop()
            self.errors.append(f'{self.path}:{ln}: <{t}> implicitly closed by </{tag}>')
        if not self.stack:
            self.errors.append(f'{self.path}:{self.getpos()[0]}: </{tag}> unmatched')
            return
        top, ln = self.stack.pop()
        if top != tag:
            self.errors.append(f'{self.path}:{self.getpos()[0]}: </{tag}> closes <{top}> opened line {ln}')

    def finish(self):
        for tag, ln in self.stack:
            self.errors.append(f'{self.path}:{ln}: <{tag}> never closed')
        return self.errors


def check_html(files):
    bad = 0
    for f in files:
        src = open(f, encoding='utf-8').read()
        # Strip <script>/<style> bodies so their contents aren't parsed as HTML.
        src = re.sub(r'<script\b[^>]*>.*?</script>', '<script></script>', src, flags=re.S | re.I)
        src = re.sub(r'<style\b[^>]*>.*?</style>', '<style></style>', src, flags=re.S | re.I)
        p = Structure(f)
        p.feed(src)
        errs = p.finish()
        if errs:
            bad += len(errs)
            for e in errs:
                print('  ' + e)
        else:
            print(f'  ok  {f}')
    return bad


def _constant(text, name):
    """Reads a numeric JS constant, tolerating `5 * 1024 * 1024` and `100_000`."""
    m = re.search(rf'\b{name}\b\s*[:=]\s*([^,;\n]+)', text)
    if not m:
        return None
    expr = m.group(1).replace('_', '').strip()
    if not re.fullmatch(r'[0-9\s*]+', expr):
        return None
    product = 1
    for part in re.split(r'\s*\*\s*', expr):
        product *= int(part)
    return product


def check_limits(root):
    """The browser's limits and the server's must agree.

    These drifted apart once: the posting wizard refused photos over 2.5 MB
    while the API accepted 5 MB, so ordinary phone photos were rejected in the
    browser with a message the user could do nothing about. The server is
    always the authority — the client copy exists only to give instant
    feedback, so it must match.
    """
    def read(rel):
        return open(os.path.join(root, rel), encoding='utf-8').read()

    server = read('functions/_lib/validate.js')
    wizard = read('public/assets/js/wizard.js')
    upload = read('functions/api/upload.js')

    S, W, U = 'functions/_lib/validate.js', 'public/assets/js/wizard.js', \
              'functions/api/upload.js'

    pairs = [
        ('photos per ad', S, server, 'MAX_PHOTOS', W, wizard, 'MAX_PHOTOS'),
        ('photo size cap', U, upload, 'MAX_BYTES', W, wizard, 'MAX_BYTES'),
        ('title minimum', S, server, 'TITLE_MIN', W, wizard, 'TITLE_MIN'),
        ('title maximum', S, server, 'TITLE_MAX', W, wizard, 'TITLE_MAX'),
        ('description minimum', S, server, 'DESC_MIN', W, wizard, 'DESC_MIN'),
        ('description maximum', S, server, 'DESC_MAX', W, wizard, 'DESC_MAX'),
    ]

    bad = 0
    for label, src_a, text_a, key_a, src_b, text_b, key_b in pairs:
        a, b = _constant(text_a, key_a), _constant(text_b, key_b)
        if a is None or b is None:
            print(f'  ! {label}: constant not found ({key_a} in {src_a}, {key_b} in {src_b})')
            bad += 1
        elif a != b:
            print(f'  ! {label}: {src_a} allows {a} but {src_b} allows {b}')
            bad += 1
        else:
            print(f'  ok  {label} = {a}')

    # MAX_FILES caps one upload request the way MAX_PHOTOS caps one ad.
    files = _constant(upload, 'MAX_FILES')
    per_ad = _constant(server, 'MAX_PHOTOS')
    if files is not None and per_ad is not None and files < per_ad:
        print(f'  ! {U} accepts {files} files per request but an ad may hold {per_ad}')
        bad += 1
    elif files is not None:
        print(f'  ok  upload request holds {files} files')

    # The markup's maxlength attributes are the no-JS fallback for the same
    # limits, so they must agree too.
    html = read('public/post.html')
    for field_id, key in [('fTitle', 'TITLE_MAX'), ('fDesc', 'DESC_MAX'),
                          ('fAge', 'AGE_MAX')]:
        limit = _constant(server, key)
        m = re.search(rf'id="{field_id}"[^>]*\bmaxlength="(\d+)"', html)
        if not m:
            print(f'  ! {field_id} in public/post.html has no maxlength attribute')
            bad += 1
        elif int(m.group(1)) != limit:
            print(f'  ! {field_id} allows {m.group(1)} characters in the markup '
                  f'but the API allows {limit}')
            bad += 1
        else:
            print(f'  ok  {field_id} maxlength = {limit}')

    return bad


if __name__ == '__main__':
    print('--- SVG artwork ---')
    bad = check_svgs('tests/.svgs.txt')
    print('\n--- static HTML structure ---')
    bad += check_html(sys.argv[1:])
    print('\n--- client/server limit agreement ---')
    bad += check_limits(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    print()
    if bad:
        print(f'{bad} problem(s) found')
        sys.exit(1)
    print('All checks passed')
