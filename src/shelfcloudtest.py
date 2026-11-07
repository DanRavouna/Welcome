# Cloud saves for engine games and the publish function's gate, against the LIVE Supabase project with throwaway
# accounts (made and deleted by the test). Not part of run-tests.sh; run it by hand like supatest.py:
#   python3 -m http.server 8766 --bind 127.0.0.1 -d . &
#   SB_SECRET="$(curl -s 'https://api.supabase.com/v1/projects/xuawpknnmozcfzgnflel/api-keys?reveal=true' | python3 -c "import json,sys; print([k['api_key'] for k in json.load(sys.stdin) if k.get('type')=='secret'][0])")" python3 src/shelfcloudtest.py
# The secret is read from the environment into memory only. What it cannot test: a publish by the owner (the gate is his account).
import os, sys, json, time, urllib.request, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
URL = 'https://xuawpknnmozcfzgnflel.supabase.co'; KEY = 'sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z'; SECRET = os.environ.get('SB_SECRET')
if not SECRET: print('FAIL SB_SECRET is not set'); sys.exit(1)
def admin(method, path, body=None):
    req = urllib.request.Request(URL + path, data=json.dumps(body).encode() if body is not None else None, method=method, headers={'apikey': SECRET, 'Authorization': 'Bearer ' + SECRET, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'null')
def token(email, pw):
    req = urllib.request.Request(URL + '/auth/v1/token?grant_type=password', data=json.dumps({'email': email, 'password': pw}).encode(), method='POST', headers={'apikey': KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read())['access_token']
def fn(tok, body):
    req = urllib.request.Request(URL + '/functions/v1/publish', data=json.dumps(body).encode(), method='POST', headers={'apikey': KEY, 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r: return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'null')
email = 'shelf-test-%s@example.com' % uuid.uuid4().hex[:10]; pw = 'Shelf-' + uuid.uuid4().hex[:12]
st, u = admin('POST', '/auth/v1/admin/users', {'email': email, 'password': pw, 'email_confirm': True})
check('a throwaway account was made', st in (200, 201) and u.get('id'), st)
uid = u.get('id')
try:
    tok = token(email, pw)
    st, r = fn(tok, {'mode': 'check'})
    check('the publish function refuses a signed-in account that is not the owner (403)', st == 403 and 'not yours' in json.dumps(r), (st, r))
    st, r = fn('', {'mode': 'check'})
    check('the publish function refuses a call with no account', st in (401, 403), st)
    # cloud saves through the player page: sign in on the shelf, play, the save reaches the table, a fresh device pulls it
    with sync_playwright() as p:
        b = p.chromium.launch()
        c1 = b.new_context(viewport={'width': 390, 'height': 760}); pg = c1.new_page(); pg.goto('http://127.0.0.1:8766/index.html'); pg.wait_for_selector('#acct-btn'); pg.wait_for_timeout(800)
        pg.click('#acct-btn'); pg.wait_for_selector('#acct-email'); pg.fill('#acct-email', email); pg.fill('#acct-pw', pw); pg.click('#acct-form button[type=submit]'); pg.wait_for_function("document.getElementById('acct-btn').textContent.indexOf('✓') >= 0", timeout=10000)
        check('the shelf signs the account in', True)
        pg.goto('http://127.0.0.1:8766/play/?g=demo'); pg.wait_for_function('window.ENGINE && ENGINE.map()', timeout=8000); pg.wait_for_timeout(300)
        pg.evaluate('ENGINE.input(1,0)'); pg.wait_for_timeout(800); pg.evaluate('ENGINE.input(0,0)'); pg.evaluate('ENGINE.flushSave()'); pg.wait_for_timeout(2200)
        x1 = pg.evaluate('ENGINE.pos()')['x']
        st, rows = admin('GET', '/rest/v1/shelf_saves?select=game_id,body&user_id=eq.' + uid)
        check('the save reached the cloud table for this account and game', st == 200 and len(rows) == 1 and rows[0]['game_id'] == 'demo' and abs(rows[0]['body']['x'] - x1) < 0.2, (st, rows and rows[0].get('body', {}).get('x'), x1))
        c2 = b.new_context(viewport={'width': 390, 'height': 760}); pg2 = c2.new_page(); pg2.goto('http://127.0.0.1:8766/index.html'); pg2.wait_for_selector('#acct-btn'); pg2.wait_for_timeout(800)
        pg2.click('#acct-btn'); pg2.wait_for_selector('#acct-email'); pg2.fill('#acct-email', email); pg2.fill('#acct-pw', pw); pg2.click('#acct-form button[type=submit]'); pg2.wait_for_function("document.getElementById('acct-btn').textContent.indexOf('✓') >= 0", timeout=10000)
        pg2.goto('http://127.0.0.1:8766/play/?g=demo'); pg2.wait_for_function('window.ENGINE && ENGINE.map()', timeout=8000); pg2.wait_for_timeout(300)
        x2 = pg2.evaluate('ENGINE.pos()')['x']
        check('a second device, signed in, starts where the first left off', abs(x2 - x1) < 0.2, (x1, x2))
        b.close()
finally:
    st, _ = admin('DELETE', '/auth/v1/admin/users/' + uid) if uid else (0, None)
    check('the throwaway account was deleted (its rows go with it)', st in (200, 204), st)
done()
