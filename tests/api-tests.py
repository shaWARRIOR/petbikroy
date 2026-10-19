#!/usr/bin/env python3
"""Integration tests for the PetBikroy Pages Functions API.

These run against a *live* server, so they exercise the real runtime: real
D1 queries, real PBKDF2 hashing, real cookies, real R2 uploads.

    # terminal 1
    npm run dev            # wrangler pages dev on :8788

    # terminal 2
    python3 tests/api-tests.py
    python3 tests/api-tests.py https://petbikroy.pages.dev

The suite signs in as an admin, so that account must exist:

    node tools/create-admin.mjs --email admin@petbikroy.test --password 'correct-horse-battery'
"""

import http.cookiejar
import json
import os
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib

BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8788'
ADMIN_EMAIL = os.environ.get('PB_ADMIN_EMAIL', 'admin@petbikroy.test')
ADMIN_PASSWORD = os.environ.get('PB_ADMIN_PASSWORD', 'correct-horse-battery')

C_GREEN, C_RED, C_DIM, C_BOLD, C_OFF = (
    '\033[32m', '\033[31m', '\033[2m', '\033[1m', '\033[0m')
if not sys.stdout.isatty():
    C_GREEN = C_RED = C_DIM = C_BOLD = C_OFF = ''


# --------------------------------------------------------------------- harness

class Suite:
    def __init__(self):
        self.passed = 0
        self.failures = []
        self.section_name = ''
        self.section_start = 0

    def section(self, name):
        self._close_section()
        self.section_name = name
        self.section_start = self.passed
        print(f'\n{C_BOLD}{name}{C_OFF}')

    def _close_section(self):
        if self.section_name:
            n = self.passed - self.section_start
            print(f'  {C_DIM}{n} assertion{"s" if n != 1 else ""} passed{C_OFF}')
            self.section_name = ''

    def ok(self, condition, label, detail=''):
        if condition:
            self.passed += 1
        else:
            self.failures.append((self.section_name, label, detail))
            print(f'  {C_RED}FAIL{C_OFF}  {label}')
            if detail:
                print(f'        {C_DIM}{detail}{C_OFF}')

    def eq(self, actual, expected, label):
        self.ok(actual == expected, label, f'expected {expected!r}, got {actual!r}')

    def truthy(self, value, label):
        self.ok(bool(value), label, f'got {value!r}')

    def report(self):
        self._close_section()
        print()
        print('-' * 68)
        if self.failures:
            print(f'{C_RED}{C_BOLD}{len(self.failures)} FAILED{C_OFF}, '
                  f'{C_GREEN}{self.passed} passed{C_OFF}')
            for section, label, detail in self.failures:
                print(f'  {C_RED}✗{C_OFF} [{section}] {label}')
                if detail:
                    print(f'      {detail}')
            return 1
        print(f'{C_GREEN}{C_BOLD}all {self.passed} assertions passed{C_OFF}')
        return 0


class LocalhostSecurePolicy(http.cookiejar.DefaultCookiePolicy):
    """Browsers treat localhost as a secure context; http.cookiejar does not.

    Without this, the HttpOnly+Secure session cookie would be dropped over
    plain http and every admin test would fail for the wrong reason.
    """

    def return_ok_secure(self, cookie, request):
        if cookie.secure and request.type != 'https':
            host = request.host or ''
            if 'localhost' not in host and '127.0.0.1' not in host and '[::1]' not in host:
                return False
        return True


class Api:
    def __init__(self, base):
        self.base = base
        jar = http.cookiejar.CookieJar(LocalhostSecurePolicy())
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(jar),
            NoRedirect(),
        )

    def request(self, method, path, body=None, headers=None, raw=None,
                content_type=None):
        # Tolerate spaces in query strings so the tests stay readable;
        # everything else is left alone.
        path = urllib.parse.quote(path, safe='/?&=:%#+,')
        url = path if path.startswith('http') else self.base + path
        hdrs = dict(headers or {})
        data = None

        if raw is not None:
            data = raw
            if content_type:
                hdrs['content-type'] = content_type
        elif body is not None:
            data = json.dumps(body).encode()
            hdrs['content-type'] = 'application/json'

        req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
        try:
            with self.opener.open(req) as resp:
                return self._parse(resp.status, resp.headers, resp.read())
        except urllib.error.HTTPError as e:
            return self._parse(e.code, e.headers, e.read())

    @staticmethod
    def _parse(status, headers, payload):
        parsed = None
        if payload:
            try:
                parsed = json.loads(payload)
            except (ValueError, UnicodeDecodeError):
                parsed = payload.decode('utf-8', 'replace')
        return Response(status, dict(headers.items()), parsed)

    def get(self, p, **kw):
        return self.request('GET', p, **kw)

    def post(self, p, body=None, **kw):
        return self.request('POST', p, body=body, **kw)

    def put(self, p, body=None, **kw):
        return self.request('PUT', p, body=body, **kw)

    def patch(self, p, body=None, **kw):
        return self.request('PATCH', p, body=body, **kw)

    def delete(self, p, **kw):
        return self.request('DELETE', p, **kw)


class Response:
    def __init__(self, status, headers, data):
        self.status = status
        self.headers = headers
        self.data = data

    def __repr__(self):
        return f'<{self.status} {str(self.data)[:120]}>'

    @property
    def json(self):
        return self.data if isinstance(self.data, (dict, list)) else {}

    def header(self, name):
        for k, v in self.headers.items():
            if k.lower() == name.lower():
                return v
        return None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """Keep 3xx visible instead of silently following it."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


# ------------------------------------------------------------------- fixtures

def make_png(rgb=(255, 0, 0)):
    """A real 1x1 PNG, so the upload endpoint's magic-byte sniffing is exercised."""
    def chunk(tag, data):
        return (struct.pack('>I', len(data)) + tag + data
                + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))

    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    idat = zlib.compress(b'\x00' + bytes(rgb))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', idat) + chunk(b'IEND', b''))


def multipart(files, field='photos'):
    boundary = '----petbikroy' + uuid.uuid4().hex
    body = b''
    for filename, ctype, data in files:
        body += (f'--{boundary}\r\n'
                 f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'
                 f'Content-Type: {ctype}\r\n\r\n').encode()
        body += data + b'\r\n'
    body += f'--{boundary}--\r\n'.encode()
    return body, f'multipart/form-data; boundary={boundary}'


def valid_ad(**overrides):
    ad = {
        'categoryId': 'dogs',
        'subcategory': 'Labrador',
        'kind': 'sale',
        'title': 'Playful Labrador puppies, vaccinated and ready',
        'description': 'Healthy, home-raised Labrador puppies with full '
                       'vaccination records and a vet check before pickup.',
        'price': 25000,
        'negotiable': True,
        'locationId': 'dhaka',
        'area': 'Dhanmondi',
        'age': '2 months',
        'gender': 'Male',
        'vaccinated': True,
        'condition': 'New',
        'contactName': 'Test Seller',
        'contactPhone': '01712345678',
        'contactEmail': 'seller@example.com',
        'photos': [],
    }
    ad.update(overrides)
    return ad


# ----------------------------------------------------------------------- tests

def test_public_read(api, t):
    t.section('public read: stats and taxonomy')

    r = api.get('/api/stats')
    t.eq(r.status, 200, 'GET /api/stats returns 200')
    t.truthy(r.json.get('ads', 0) > 0, 'stats reports a non-zero active ad count')
    t.eq(r.json.get('categories'), 10, 'stats reports 10 categories')

    r = api.get('/api/taxonomy')
    t.eq(r.status, 200, 'GET /api/taxonomy returns 200')
    cats = r.json.get('categories', [])
    locs = r.json.get('locations', [])
    t.eq(len(cats), 10, 'taxonomy has 10 categories')
    t.eq(len(locs), 8, 'taxonomy has 8 divisions')
    t.truthy(all(c.get('subs') for c in cats), 'every category has at least one breed')
    t.truthy(all(l.get('areas') for l in locs), 'every division has at least one area')

    t.section('public read: sidebar counts')

    r = api.get('/api/facets')
    t.eq(r.status, 200, 'GET /api/facets returns 200')
    facets = r.json
    t.truthy(facets.get('total', 0) > 0, 'facets report a total')
    t.truthy(len(facets.get('categories', {})) > 0, 'facets count ads per category')
    t.truthy(all(isinstance(v, int) for v in facets['categories'].values()),
             'category counts are whole numbers')
    t.truthy('undefined' not in facets.get('subs', {}),
             'breed counts are keyed by real category ids')
    t.truthy('undefined' not in facets.get('areas', {}),
             'area counts are keyed by real division ids')
    t.eq(sum(facets['categories'].values()), facets['total'],
         'category counts add up to the live-ad total')
    t.eq(sum(sum(v.values()) for v in facets['subs'].values()), facets['total'],
         'breed counts add up to the live-ad total')

    t.section('public read: listing, filtering, sorting')

    r = api.get('/api/ads')
    t.eq(r.status, 200, 'GET /api/ads returns 200')
    ads = r.json.get('ads', [])
    t.truthy(len(ads) > 0, 'the default listing is not empty')
    t.truthy(all(a['status'] == 'active' for a in ads), 'the default listing hides sold ads')
    t.eq(r.json.get('page'), 1, 'default page is 1')
    t.truthy(r.json.get('total', 0) > 0, 'total is reported')
    first = ads[0]
    for field in ('id', 'cat', 'sub', 'title', 'price', 'loc', 'area',
                  'seller', 'photos', 'created', 'desc'):
        t.truthy(field in first, f'ad objects expose "{field}"')
    t.truthy(all('phone' not in a for a in ads),
             'listing responses do not ship phone numbers with every result')

    r = api.get('/api/ads?cat=dogs')
    ads = r.json.get('ads', [])
    t.truthy(len(ads) > 0, 'filtering by category returns results')
    t.truthy(all(a['cat'] == 'dogs' for a in ads), 'category filter is honoured')

    r = api.get('/api/ads?cat=cats&sub=Persian')
    ads = r.json.get('ads', [])
    t.truthy(all(a['cat'] == 'cats' and a['sub'] == 'Persian' for a in ads),
             'category + breed filters combine')

    r = api.get('/api/ads?loc=dhaka&area=Dhanmondi')
    ads = r.json.get('ads', [])
    t.truthy(len(ads) > 0, 'filtering by division and area returns results')
    t.truthy(all(a['loc'] == 'dhaka' and a['area'] == 'Dhanmondi' for a in ads),
             'division + area filters combine')

    r = api.get('/api/ads?min=20000&max=30000')
    ads = r.json.get('ads', [])
    t.truthy(len(ads) > 0, 'price range returns results')
    t.truthy(all(20000 <= a['price'] <= 30000 for a in ads), 'price bounds are honoured')

    r = api.get('/api/ads?sort=price-asc')
    prices = [a['price'] for a in r.json.get('ads', []) if not a['featured']]
    t.eq(prices, sorted(prices), 'price-asc sorts ascending')

    r = api.get('/api/ads?sort=price-desc')
    prices = [a['price'] for a in r.json.get('ads', []) if not a['featured']]
    t.eq(prices, sorted(prices, reverse=True), 'price-desc sorts descending')

    r = api.get('/api/ads?q=labrador')
    ads = r.json.get('ads', [])
    t.truthy(len(ads) > 0, 'free-text search finds matches')
    t.truthy(all('labrador' in (a['title'] + a['desc'] + a['sub']).lower() for a in ads),
             'every search result actually contains the term')

    r = api.get('/api/ads?q=zzzznotathing')
    t.eq(r.json.get('ads'), [], 'a nonsense search returns nothing')

    r = api.get('/api/ads?perPage=5&page=2')
    t.eq(len(r.json.get('ads', [])), 5, 'perPage is respected')
    t.eq(r.json.get('page'), 2, 'page number is echoed back')
    t.truthy(r.json.get('pages', 0) > 1, 'pagination reports multiple pages')

    r = api.get('/api/ads?sold=1&perPage=48')
    t.truthy(any(a['status'] == 'sold' for a in r.json.get('ads', [])),
             'the sold flag reveals sold ads')
    t.truthy(all(a['status'] in ('active', 'sold') for a in r.json.get('ads', [])),
             'the sold flag never reveals pending or rejected ads')

    sid = next(a['id'] for a in api.get('/api/ads').json['ads'] if a['featured'])
    t.section('public read: single ad')
    r = api.get(f'/api/ads/{sid}')
    t.eq(r.status, 200, 'GET /api/ads/:id returns 200')
    t.eq(r.json['ad']['id'], sid, 'the requested ad is returned')
    t.truthy(r.json['ad'].get('phone'),
             'the detail response carries the contact number a buyer needs')
    t.eq(r.json['ad'].get('canManage'), False,
         'an anonymous visitor is not told they own the ad')

    r = api.get('/api/ads/ad-doesnotexist')
    t.eq(r.status, 404, 'an unknown ad id returns 404')


def test_create_and_own(api, t):
    t.section('publishing an ad')

    r = api.post('/api/ads', valid_ad())
    if r.status == 429:
        t.ok(False, 'the posting quota is exhausted',
             'Run ./tests/run-api-tests.sh, which resets it, or wait an hour.')
        return
    t.eq(r.status, 201, 'POST /api/ads returns 201')
    created = r.json.get('ad', {})
    ad_id = created.get('id')
    token = r.json.get('ownerToken')
    t.truthy(ad_id, 'the created ad has an id')
    t.truthy(token and len(token) >= 32, 'a strong owner token is returned')
    t.eq(created.get('price'), 25000, 'the price round-trips')
    t.eq(created.get('loc'), 'dhaka', 'the division round-trips')
    t.truthy(r.header('x-ratelimit-remaining') is not None,
             'the response reports the remaining posting quota')

    r = api.get(f'/api/ads/{ad_id}')
    t.eq(r.status, 200, 'the new ad is immediately readable')
    t.eq(r.json['ad']['title'], valid_ad()['title'], 'the title round-trips')

    r = api.get('/api/ads?q=Playful Labrador puppies')
    t.truthy(any(a['id'] == ad_id for a in r.json.get('ads', [])),
             'the new ad appears in search results')

    t.section('publishing: server-side validation')

    r = api.post('/api/ads', valid_ad(title='short'))
    t.eq(r.status, 400, 'a too-short title is rejected')
    t.truthy('title' in r.json.get('details', {}), 'the error names the title field')

    r = api.post('/api/ads', valid_ad(contactPhone='12345'))
    t.eq(r.status, 400, 'a bad phone number is rejected')
    t.truthy('contactPhone' in r.json.get('details', {}), 'the error names the phone field')

    r = api.post('/api/ads', valid_ad(subcategory='Persian'))
    t.eq(r.status, 400, 'a breed from the wrong category is rejected')
    t.truthy('subcategory' in r.json.get('details', {}), 'the error names the breed field')

    r = api.post('/api/ads', valid_ad(area='Nowhere-at-all'))
    t.eq(r.status, 400, 'an area outside the division is rejected')
    t.truthy('area' in r.json.get('details', {}), 'the error names the area field')

    r = api.post('/api/ads', valid_ad(description='too short'))
    t.eq(r.status, 400, 'a too-short description is rejected')

    r = api.post('/api/ads', valid_ad(categoryId='dinosaurs'))
    t.eq(r.status, 400, 'an unknown category is rejected')

    r = api.post('/api/ads', valid_ad(gender='Robot'))
    t.eq(r.status, 400, 'an unexpected gender value is rejected')

    r = api.post('/api/ads', valid_ad(price=-100))
    t.eq(r.status, 400, 'a negative price is rejected')

    r = api.request('POST', '/api/ads', raw=b'not json at all',
                    content_type='application/json')
    t.eq(r.status, 400, 'malformed JSON is rejected')

    t.section('publishing: adoption listings are always free')

    r = api.post('/api/ads', valid_ad(
        kind='adoption', price=99999,
        title='Free rescue kitten looking for a loving home'))
    if r.status != 201:
        t.ok(False, 'could not publish an adoption', f'got {r.status}: {r.data}')
        return
    t.eq(r.status, 201, 'an adoption can be published')
    t.eq(r.json['ad']['price'], 0, 'the adoption price is forced to zero')
    adopt_id = r.json['ad']['id']
    adopt_token = r.json['ownerToken']

    t.section('owner control: editing without an account')

    r = api.put(f'/api/ads/{ad_id}', valid_ad())
    t.eq(r.status, 401, 'editing with no owner token is rejected')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(),
                headers={'x-owner-token': 'f' * 64})
    t.eq(r.status, 401, 'editing with a wrong owner token is rejected')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(title='Updated Labrador puppies, ready now'),
                headers={'x-owner-token': token})
    t.eq(r.status, 200, 'editing with the correct owner token succeeds')
    t.eq(r.json['ad']['title'], 'Updated Labrador puppies, ready now', 'the edit is applied')

    r = api.get(f'/api/ads/{ad_id}')
    t.eq(r.json['ad']['title'], 'Updated Labrador puppies, ready now',
         'the edit persisted')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(title='nope'),
                headers={'x-owner-token': token})
    t.eq(r.status, 400, 'an invalid edit is still rejected')

    t.section('owner control: sold and available')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(status='sold'),
                headers={'x-owner-token': token})
    t.eq(r.status, 200, 'an owner can mark their own ad sold')
    t.eq(r.json['ad']['status'], 'sold', 'the ad is now sold')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(status='active'),
                headers={'x-owner-token': token})
    t.eq(r.json['ad']['status'], 'active', 'an owner can put it back up for sale')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(status='pending'),
                headers={'x-owner-token': token})
    t.eq(r.json['ad']['status'], 'active',
         'an owner cannot push their own ad into the review queue')

    r = api.put(f'/api/ads/{ad_id}', valid_ad(status='rejected'),
                headers={'x-owner-token': token})
    t.eq(r.json['ad']['status'], 'active', 'an owner cannot approve their own ad')

    r = api.get(f'/api/ads/{ad_id}')
    t.eq(r.json['ad'].get('canManage'), False,
         'a stranger holding the link is not given owner controls')

    r = api.get(f'/api/ads/{ad_id}', headers={'x-owner-token': token})
    t.eq(r.json['ad'].get('canManage'), True,
         'the owner is told they can manage their own ad')

    t.section('view counter')

    r = api.post(f'/api/ads/{ad_id}/view')
    t.eq(r.status, 200, 'POST /api/ads/:id/view returns 200')
    t.eq(r.json.get('counted'), True, 'the first view is counted')
    first_views = r.json.get('views')
    t.truthy(first_views >= 1, 'the view count is at least 1')

    r = api.post(f'/api/ads/{ad_id}/view')
    t.eq(r.json.get('counted'), False, 'a repeat view from the same visitor is not counted')
    t.eq(r.json.get('views'), first_views, 'the view count did not move')

    r = api.post('/api/ads/ad-nope/view')
    t.eq(r.status, 404, 'viewing an unknown ad returns 404')

    t.section('reports')

    r = api.get('/api/reports')
    t.eq(r.status, 200, 'GET /api/reports lists the reasons')
    t.truthy(len(r.json.get('reasons', [])) >= 5, 'there is a usable set of reasons')

    r = api.post('/api/reports', {'adId': ad_id, 'reason': 'Already sold'})
    t.eq(r.status, 201, 'reporting an ad works')

    r = api.post('/api/reports', {'adId': ad_id, 'reason': 'Already sold'})
    t.eq(r.status, 409, 'reporting the same ad twice is refused')

    r = api.post('/api/reports', {'adId': ad_id, 'reason': 'Because I said so'})
    t.eq(r.status, 400, 'an unknown reason is rejected')

    r = api.post('/api/reports', {'adId': 'ad-nope', 'reason': 'Already sold'})
    t.eq(r.status, 400, 'reporting an unknown ad is rejected')

    t.section('deleting an ad')

    r = api.delete(f'/api/ads/{ad_id}')
    t.eq(r.status, 401, 'deleting with no owner token is rejected')

    r = api.delete(f'/api/ads/{ad_id}', headers={'x-owner-token': 'f' * 64})
    t.eq(r.status, 401, 'deleting with a wrong owner token is rejected')

    r = api.delete(f'/api/ads/{ad_id}', headers={'x-owner-token': token})
    t.eq(r.status, 200, 'deleting with the correct owner token succeeds')

    r = api.get(f'/api/ads/{ad_id}')
    t.eq(r.status, 404, 'the deleted ad is gone')

    r = api.delete(f'/api/ads/{adopt_id}', headers={'x-owner-token': adopt_token})
    t.eq(r.status, 200, 'the adoption listing was cleaned up')


def test_admin(api, t):
    t.section('admin: access control')

    for path in ('/api/admin/overview', '/api/admin/ads', '/api/admin/settings',
                 '/api/admin/admins', '/api/admin/reports'):
        r = api.get(path)
        t.eq(r.status, 401, f'{path} is locked when signed out')

    r = api.post('/api/admin/session', {'email': ADMIN_EMAIL, 'password': 'wrong-password'})
    t.eq(r.status, 401, 'a wrong password is rejected')

    r = api.get('/api/admin/session')
    t.eq(r.status, 200, 'the session probe answers when signed out')
    t.eq(r.json.get('admin'), None, 'the session probe reports nobody')

    t.section('admin: signing in')

    r = api.post('/api/admin/session',
                 {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    t.eq(r.status, 200, 'a correct password signs in')
    t.eq(r.json['admin']['email'], ADMIN_EMAIL, 'the signed-in admin is returned')
    cookie = r.header('set-cookie') or ''
    t.truthy('pb_admin=' in cookie, 'a session cookie is set')
    t.truthy('HttpOnly' in cookie, 'the session cookie is HttpOnly')
    t.truthy('Secure' in cookie, 'the session cookie is Secure')
    t.truthy('SameSite=Strict' in cookie, 'the session cookie is SameSite=Strict')

    r = api.get('/api/admin/session')
    t.eq(r.json['admin']['email'], ADMIN_EMAIL, 'the session persists across requests')

    r = api.get('/api/admin/overview')
    t.eq(r.status, 200, 'the dashboard loads once signed in')
    t.truthy('counts' in r.json, 'the dashboard reports ad counts')
    t.truthy(isinstance(r.json.get('byCategory'), list), 'the dashboard reports categories')
    t.truthy(isinstance(r.json.get('daily'), list), 'the dashboard reports a daily series')
    t.truthy('openReports' in r.json, 'the dashboard reports open reports')

    t.section('admin: listing every ad, whatever its status')

    r = api.get('/api/admin/ads?status=all')
    t.eq(r.status, 200, 'the admin listing loads')
    t.truthy(r.json.get('total', 0) > 0, 'the admin listing is not empty')
    sample = r.json['ads'][0]
    t.truthy('phone' in sample, 'admin rows include the phone number')
    t.truthy('rejectionReason' in sample, 'admin rows include the rejection reason')

    r = api.get('/api/admin/ads?status=active')
    t.truthy(all(a['status'] == 'active' for a in r.json.get('ads', [])),
             'the status filter narrows the admin listing')

    t.section('admin: moderation actions')

    r = api.post('/api/ads', valid_ad(title='Moderation target puppy for admin testing'))
    if r.status != 201:
        t.ok(False, 'could not create a moderation target', f'got {r.status}: {r.data}')
        return
    mod_id = r.json['ad']['id']
    token = r.json['ownerToken']

    r = api.patch(f'/api/admin/ads/{mod_id}', {'action': 'feature'})
    t.eq(r.status, 200, 'featuring an ad works')
    t.eq(r.json['ad']['featured'], True, 'the ad is now featured')

    r = api.patch(f'/api/admin/ads/{mod_id}', {'action': 'unfeature'})
    t.eq(r.json['ad']['featured'], False, 'unfeaturing an ad works')

    r = api.patch(f'/api/admin/ads/{mod_id}',
                  {'action': 'reject', 'reason': 'Needs a clearer photo.'})
    t.eq(r.status, 200, 'rejecting an ad works')
    t.eq(r.json['ad']['status'], 'rejected', 'the ad is now rejected')
    t.eq(r.json['ad']['rejectionReason'], 'Needs a clearer photo.',
         'the rejection reason is stored')

    r = api.get('/api/ads')
    t.truthy(not any(a['id'] == mod_id for a in r.json.get('ads', [])),
             'a rejected ad disappears from the public listing')

    # Must be a signed-out client: the admin session is allowed to see it.
    anon = Api(BASE)
    r = anon.get(f'/api/ads/{mod_id}')
    t.eq(r.status, 404, 'a rejected ad is invisible to the public')
    t.truthy(mod_id not in str(r.data), 'the hidden ad leaks none of its content')

    r = api.patch(f'/api/admin/ads/{mod_id}', {'action': 'approve'})
    t.eq(r.json['ad']['status'], 'active', 'approving an ad puts it back')

    r = api.get(f'/api/ads/{mod_id}')
    t.eq(r.status, 200, 'the approved ad is public again')

    r = api.patch(f'/api/admin/ads/{mod_id}', {'action': 'sold'})
    t.eq(r.json['ad']['status'], 'sold', 'an ad can be marked sold')

    r = api.patch(f'/api/admin/ads/{mod_id}', {'action': 'explode'})
    t.eq(r.status, 400, 'an unknown moderation action is refused')

    r = api.patch('/api/admin/ads/ad-nope', {'action': 'approve'})
    t.eq(r.status, 404, 'moderating an unknown ad returns 404')

    t.section('admin: editing anyone\'s ad while signed in')

    r = api.put(f'/api/ads/{mod_id}',
                valid_ad(title='Admin corrected title for this listing'))
    t.eq(r.status, 200, 'an admin can edit an ad without the owner token')
    t.eq(r.json['ad']['title'], 'Admin corrected title for this listing',
         'the admin edit is applied')

    r = api.delete(f'/api/ads/{mod_id}', headers={'x-owner-token': token})
    t.eq(r.status, 200, 'the moderation target was cleaned up')

    t.section('admin: reports queue')

    r = api.get('/api/admin/reports?status=all')
    t.eq(r.status, 200, 'the reports queue loads')
    t.truthy('summary' in r.json, 'the queue reports a summary')

    r = api.get('/api/admin/reports')
    open_reports = r.json.get('reports', [])
    if open_reports:
        rid = open_reports[0]['id']
        r = api.patch('/api/admin/reports', {'id': rid, 'status': 'resolved'})
        t.eq(r.status, 200, 'a report can be resolved')
        r = api.patch('/api/admin/reports', {'id': rid, 'status': 'open'})
        t.eq(r.status, 200, 'a report can be reopened')
    else:
        t.ok(True, 'no open reports to resolve (fine)')

    r = api.patch('/api/admin/reports', {'id': 'nope', 'status': 'resolved'})
    t.eq(r.status, 404, 'resolving an unknown report returns 404')
    r = api.patch('/api/admin/reports', {'id': 'nope', 'status': 'sideways'})
    t.eq(r.status, 400, 'an unknown report status is refused')

    t.section('admin: settings')

    r = api.get('/api/admin/settings')
    t.eq(r.status, 200, 'settings load')
    original = dict(r.json.get('settings', {}))
    t.truthy('auto_approve' in original, 'auto_approve is exposed')

    r = api.put('/api/admin/settings', {'site_name': 'PetBikroy Test', 'post_limit': 25})
    t.eq(r.status, 200, 'settings can be updated')
    t.eq(r.json['settings']['site_name'], 'PetBikroy Test', 'the new value is stored')

    r = api.put('/api/admin/settings', {'post_limit': 9999})
    t.eq(r.status, 400, 'an out-of-range number is refused')
    t.truthy('post_limit' in r.json.get('details', {}), 'the error names the bad setting')

    r = api.put('/api/admin/settings', {'nonsense_key': 'x'})
    t.eq(r.status, 400, 'an unknown setting is refused')

    r = api.put('/api/admin/settings', {'contact_email': 'not-an-email'})
    t.eq(r.status, 400, 'a malformed contact email is refused')

    r = api.put('/api/admin/settings',
                {'site_name': original.get('site_name', 'PetBikroy')})
    t.eq(r.status, 200, 'settings were restored')

    t.section('admin: accounts')

    r = api.get('/api/admin/admins')
    t.eq(r.status, 200, 'the admin list loads')
    t.truthy(any(a['email'] == ADMIN_EMAIL for a in r.json.get('admins', [])),
             'the signed-in admin is listed')
    t.truthy(all('password_hash' not in a for a in r.json['admins']),
             'password material never leaves the database')

    mod_email = f'mod-{uuid.uuid4().hex[:8]}@petbikroy.test'
    r = api.post('/api/admin/admins', {
        'email': mod_email, 'name': 'Temp Moderator',
        'password': 'a-long-enough-password', 'role': 'moderator',
    })
    t.eq(r.status, 201, 'a moderator account can be created')
    mod_id = r.json['admin']['id']
    t.eq(r.json['admin']['role'], 'moderator', 'the role is stored')

    r = api.post('/api/admin/admins', {
        'email': mod_email, 'password': 'a-long-enough-password'})
    t.eq(r.status, 409, 'a duplicate email is refused')

    r = api.post('/api/admin/admins', {
        'email': 'shorty@petbikroy.test', 'password': 'tiny'})
    t.eq(r.status, 400, 'a short password is refused')

    r = api.post('/api/admin/admins', {
        'email': 'not-an-email', 'password': 'a-long-enough-password'})
    t.eq(r.status, 400, 'a malformed email is refused')

    r = api.patch(f'/api/admin/admins/{mod_id}', {'password': 'a-brand-new-password'})
    t.eq(r.status, 200, 'another admin\'s password can be reset')

    r = api.patch(f'/api/admin/admins/{mod_id}', {'role': 'superuser'})
    t.eq(r.status, 400, 'an unknown role is refused')

    me = api.get('/api/admin/session').json['admin']
    r = api.patch(f'/api/admin/admins/{me["id"]}', {'role': 'moderator'})
    t.eq(r.status, 400, 'the only admin cannot demote themselves')

    r = api.delete(f'/api/admin/admins/{me["id"]}')
    t.eq(r.status, 400, 'an admin cannot delete their own account')

    r = api.delete(f'/api/admin/admins/{mod_id}')
    t.eq(r.status, 200, 'the temporary moderator was removed')


def test_uploads(api, t):
    t.section('image uploads to R2')

    body, ctype = multipart([('puppy.png', 'image/png', make_png((0, 128, 255)))])
    r = api.request('POST', '/api/upload', raw=body, content_type=ctype)
    t.eq(r.status, 201, 'a PNG uploads successfully')
    keys = r.json.get('keys', [])
    t.eq(len(keys), 1, 'one key is returned')
    key = keys[0] if keys else ''
    t.truthy(key.startswith('ads/'), 'the key is namespaced under ads/')

    r = api.get(f'/img/{key}')
    t.eq(r.status, 200, 'the uploaded image is served back')
    t.truthy('image/png' in (r.header('content-type') or ''), 'it is served as image/png')

    cached = api.get(f'/img/{key}', headers={'if-none-match': r.header('etag') or ''})
    t.eq(cached.status, 304, 'a matching ETag returns 304 Not Modified')

    body, ctype = multipart([('fake.png', 'image/png', b'this is definitely not a PNG')])
    r = api.request('POST', '/api/upload', raw=body, content_type=ctype)
    t.eq(r.status, 400, 'a file that only claims to be a PNG is refused')

    body, ctype = multipart([('a.png', 'image/png', make_png())] * 7)
    r = api.request('POST', '/api/upload', raw=body, content_type=ctype)
    t.eq(r.status, 400, 'more than six photos are refused')

    r = api.get('/img/nothing/here.png')
    t.eq(r.status, 404, 'an unknown image returns 404')

    # Cloudflare normalises `..` in the URL before routing, so the interesting
    # assertion is not the status code but that no real file ever comes back.
    r = api.get('/img/../../wrangler.toml')
    body = r.data if isinstance(r.data, str) else json.dumps(r.data)
    t.truthy(r.status in (400, 404), 'path traversal out of the bucket is refused')
    t.truthy('pages_build_output_dir' not in body,
             'path traversal never returns the project config')
    r = api.get('/img/..%2f..%2fwrangler.toml')
    body = r.data if isinstance(r.data, str) else json.dumps(r.data)
    t.truthy('pages_build_output_dir' not in body,
             'URL-encoded traversal never returns the project config')

    # Attach an uploaded photo to an ad and prove it flows through to the API.
    t.section('photos attached to a listing')

    body, ctype = multipart([('one.png', 'image/png', make_png((10, 200, 10))),
                             ('two.png', 'image/png', make_png((200, 10, 10)))])
    r = api.request('POST', '/api/upload', raw=body, content_type=ctype)
    t.eq(r.status, 201, 'two photos upload at once')
    keys = r.json.get('keys', [])
    t.eq(len(keys), 2, 'two keys come back')

    r = api.post('/api/ads', valid_ad(
        title='Puppy with uploaded photos for testing',
        photos=keys))
    t.eq(r.status, 201, 'an ad can be created with photos')
    ad = r.json['ad']
    ad_id = ad['id']
    token = r.json['ownerToken']
    t.eq(len(ad.get('photos', [])), 2, 'both photos are attached to the ad')
    t.eq(ad['photos'][0], f'/img/{keys[0]}', 'photo order is preserved')

    r = api.get('/api/ads?q=Puppy with uploaded photos')
    found = next((a for a in r.json.get('ads', []) if a['id'] == ad_id), None)
    t.truthy(found is not None, 'the ad with photos is listed')
    t.eq(len(found.get('photos', [])), 2, 'listings carry their photos too')

    r = api.delete(f'/api/ads/{ad_id}', headers={'x-owner-token': token})
    t.eq(r.status, 200, 'cleanup: the photo ad was deleted')


def test_routing(api, t):
    t.section('routing and security headers')

    r = api.get('/')
    t.eq(r.status, 200, 'the home page is served')
    t.eq(r.header('x-content-type-options'), 'nosniff', 'nosniff is set on HTML')
    t.eq(r.header('x-frame-options'), 'DENY', 'clickjacking is blocked')
    t.truthy('content-security-policy' in {k.lower() for k in r.headers},
             'a Content-Security-Policy is present')

    for page in ('/listings.html', '/post.html', '/my-ads.html', '/favorites.html'):
        r = api.get(page)
        # Cloudflare Pages issues a 308 from /page.html to /page (clean URLs).
        t.truthy(r.status in (200, 308), f'{page} is served')
        if r.status == 308:
            target = r.header('location') or ''
            t.eq(api.get(target).status, 200, f'{page} redirects to a real page')

    r = api.get('/admin/')
    t.eq(r.status, 200, 'the admin panel is served')

    r = api.get('/definitely-not-a-real-page')
    t.eq(r.status, 404, 'an unknown page returns 404')
    t.truthy('This trail goes cold' in str(r.data) or 'not found' in str(r.data).lower(),
             'the branded 404 page is served')

    r = api.get('/api/nothing-here')
    t.eq(r.status, 404, 'an unknown API route returns 404')
    t.truthy(isinstance(r.data, dict) and 'error' in r.data,
             'an unknown API route answers with JSON, not HTML')
    t.truthy('available' in r.data.get('details', {}),
             'the API 404 lists the available endpoints')

    r = api.request('PATCH', '/api/ads')
    t.eq(r.status, 404, 'an unsupported method falls through to the JSON 404')
    t.truthy(isinstance(r.data, dict) and 'error' in r.data,
             'an unsupported method answers with JSON, not HTML')

    t.section('crawler and cache policy')

    # Ad detail responses carry a seller's phone number, so JSON is not for
    # search engines. _headers only covers static files, so the header has to
    # come from the Function itself.
    r = api.get('/api/ads')
    t.eq(r.header('x-robots-tag'), 'noindex', 'the ads API is not indexable')
    t.truthy('no-store' not in (r.header('cache-control') or ''),
             'an anonymous listing page is identical for everyone, so it may be cached')
    t.truthy('phone' not in r.json['ads'][0],
             'and it stays cacheable only because it omits private fields')

    oldest = r.json['ads'][0]['id']
    r = api.get(f'/api/ads/{oldest}')
    t.truthy('no-store' in (r.header('cache-control') or ''),
             'ad detail varies by caller, so it is never cached')

    r = api.get('/api/nothing-here')
    t.eq(r.header('x-robots-tag'), 'noindex', 'API errors are not indexable either')
    r = api.get('/admin/')
    t.eq(r.header('x-robots-tag'), 'noindex, nofollow',
         'the admin panel is not indexable')

    r = api.get('/api/stats')
    t.eq(r.header('x-robots-tag'), 'noindex', 'the stats API is not indexable')


# ------------------------------------------------------------------------ main

def main():
    print(f'{C_BOLD}PetBikroy API tests{C_OFF}')
    print(f'  target   {BASE}')
    print(f'  admin    {ADMIN_EMAIL}')

    api = Api(BASE)
    t = Suite()

    # Order matters: the owner-token tests must run before any sign-in,
    # otherwise the admin session would authorise them and hide a regression.
    try:
        api.get('/api/stats')
    except urllib.error.URLError as e:
        print(f'\n{C_RED}Cannot reach {BASE}: {e}{C_OFF}')
        print(f'{C_DIM}Start the server first:  npm run dev{C_OFF}\n')
        return 2

    test_public_read(api, t)
    test_create_and_own(api, t)
    test_admin(api, t)
    test_uploads(api, t)
    test_routing(api, t)

    return t.report()


if __name__ == '__main__':
    sys.exit(main())
