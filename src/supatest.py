# Real Supabase cloud-save test (GitHub Pages build). Needs SB_SECRET (the project's secret key) in the
# environment ONLY to create and delete two throwaway test accounts; the key is never printed or stored.
# Run: SB_SECRET=... python3 src/supatest.py   (after src/test-setup.sh and a build)
import os, json, time, random, string, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

URL = 'https://xuawpknnmozcfzgnflel.supabase.co'
PUB = 'sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z'
SECRET = os.environ['SB_SECRET']
# served over http like GitHub Pages (start: python3 -m http.server 8766 -d <repo root>); PAGE env overrides
PAGE = os.environ.get('PAGE', 'http://127.0.0.1:8766/')

def http(method, path, key, body=None, token=None, extra=None):
    h = {'apikey': key, 'Authorization': 'Bearer ' + (token or key), 'Content-Type': 'application/json'}
    if extra: h.update(extra)
    req = urllib.request.Request(URL + path, method=method, headers=h, data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req) as r: txt = r.read().decode(); return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode(); return e.code, (json.loads(txt) if txt.startswith(('{', '[')) else txt)

def rnd(n=8): return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(n))
def mkuser():
    email, pw = 'crtest-' + rnd() + '@example.com', 'pw-' + rnd(12)
    st, u = http('POST', '/auth/v1/admin/users', SECRET, {'email': email, 'password': pw, 'email_confirm': True})
    assert st == 200, (st, u)
    return {'id': u['id'], 'email': email, 'pw': pw}
def token(u):
    st, r = http('POST', '/auth/v1/token?grant_type=password', PUB, {'email': u['email'], 'password': u['pw']}); assert st == 200, (st, r); return r['access_token']
def cloud_row(uid):
    st, r = http('GET', '/rest/v1/saves?select=user_id,body&user_id=eq.' + uid, SECRET); return r[0] if r else None
def cloud_ess(uid):
    r = cloud_row(uid); return json.loads(r['body']['data']['critter-roll:v2'])['essence'] if r else None

# seed once per browser profile (a localStorage marker the game never touches), so reloads can never re-seed
SEED = """(() => { try { if (localStorage.getItem('test:seeded')) return; localStorage.setItem('test:seeded', '1');
  localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:12,stage:1},{seed:30,stage:1},{seed:77,stage:2}],essence:41,wins:2,xp:260,intro:true,
  settings:{sound:false,vibrate:false,calm:true,test:false,daynight:true}})); } catch (e) {} })();"""

errors = []
TRACE = """(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) {
  try { if (this === window.localStorage && k === 'critter-roll:v2') { const e = JSON.parse(v).essence; const L = JSON.parse(sessionStorage.getItem('trace') || '[]');
    L.push([Date.now() % 100000, e, (new Error().stack || '').split('\\n').slice(2, 5).map(x => x.trim().slice(0, 60)).join(' < ')]); sessionStorage.setItem('trace', JSON.stringify(L.slice(-40))); } } catch (err) {}
  return o.call(this, k, v); }; })();"""
def device(b, name, seed=False):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True)
    if os.environ.get('TRACE'): ctx.add_init_script(TRACE)
    if seed: ctx.add_init_script(SEED)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(name + ': ' + str(e)))
    pg.on('console', lambda m: errors.append(name + ': ' + m.text + ' @ ' + str(m.location.get('url', ''))) if m.type == 'error' and 'fonts' not in m.text else None)
    pg.goto(PAGE); pg.wait_for_timeout(1500)
    return ctx, pg
def wait_status(pg, want, ms=15000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        try:
            if pg.evaluate('CLOUD.status') == want: return True
        except Exception: pass
        pg.wait_for_timeout(250)
    return False
st = lambda pg: pg.evaluate("({status: CLOUD.status, text: CLOUD.text(), acct: CLOUD.account.email, kept: APP.game.state.caught.length, ess: APP.game.state.essence, xp: APP.game.state.xp})")
def sign_in(pg, u):
    pg.evaluate('APP.openBackup()'); pg.wait_for_timeout(200)
    pg.fill('#acct-email', u['email']); pg.fill('#acct-pw', u['pw']); pg.click('#acct-in')

u1, u2 = mkuser(), mkuser()
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # 1. existing player on phone A: signed out, local save works, account form visible
        A, a = device(b, 'A', seed=True)
        print('A signed out:', st(a))
        a.evaluate('APP.openBackup()'); a.wait_for_timeout(200)
        print('A panel: form visible', a.is_visible('#acct-email'), '| signed-in block hidden', not a.is_visible('#acct-off'))
        # 2. wrong password, then too-short password (client side)
        a.fill('#acct-email', u1['email']); a.fill('#acct-pw', 'wrong-password'); a.click('#acct-in'); a.wait_for_timeout(2500)
        print('wrong password ->', a.inner_text('#acct-msg'), '| still signed out:', a.evaluate('CLOUD.account.email') is None)
        a.fill('#acct-pw', '123'); a.click('#acct-in'); a.wait_for_timeout(200); print('short password ->', a.inner_text('#acct-msg'))
        # 3. sign in: the existing local save goes up to the new account
        sign_in(a, u1); ok = wait_status(a, 'synced')
        print('A signed in -> synced:', ok, '| msg:', a.inner_text('#acct-msg'), '|', st(a))
        print('cloud row for u1: essence', cloud_ess(u1['id']), '| A panel shows', a.inner_text('#acct-who'))
        # 4. phone B, brand new: sign in -> adopts account save -> same progress after its reload
        B, bb = device(b, 'B')
        print('B fresh:', st(bb)['kept'], 'critters')
        sign_in(bb, u1); bb.wait_for_timeout(4000); wait_status(bb, 'synced')
        print('B after sign-in:', st(bb))
        # 5. A plays -> cloud updates within the debounce -> B picks it up when it comes back to the game
        a.evaluate('APP.close && 0'); a.keyboard.press('Escape')
        a.evaluate('APP.game.update({essence: APP.game.state.essence + 5})'); a.wait_for_timeout(5000)
        print('A +5 essence -> cloud essence', cloud_ess(u1['id']), '| A', st(a)['status'])
        bb.evaluate('CLOUD.reconcile()'); bb.wait_for_timeout(4000); wait_status(bb, 'synced')
        print('B after returning:', st(bb))
        # 6. both change while apart -> conflict dialog, keep account save
        a.evaluate('APP.game.update({essence: 300})'); a.wait_for_timeout(4500)
        bb.evaluate("(() => { window.__saveFrozen = false; APP.game.update({essence: 7}); })()"); bb.wait_for_timeout(300)
        bb.evaluate("(() => { const m = JSON.parse(localStorage.getItem('critter-roll:meta')); m.savedAt = Date.now(); localStorage.setItem('critter-roll:meta', JSON.stringify(m)); })()")
        bb.evaluate('CLOUD.reconcile()'); bb.wait_for_timeout(3000)
        print('B both changed ->', bb.evaluate('CLOUD.status'), '| dialog shown:', bb.is_visible('#cf'))
        if bb.is_visible('#cf-keep-cloud'): bb.click('#cf-keep-cloud'); bb.wait_for_timeout(4000); wait_status(bb, 'synced')
        print('B kept account save:', st(bb))
        # 7. security: other accounts and anonymous visitors cannot read or change u1's save
        t2 = token(u2)
        s_, r = http('GET', '/rest/v1/saves?select=user_id', PUB, token=t2); print('u2 reads saves ->', s_, r)
        s_, r = http('POST', '/rest/v1/saves', PUB, {'user_id': u1['id'], 'body': {'hack': 1}}, token=t2, extra={'Prefer': 'resolution=merge-duplicates'}); print('u2 overwrites u1 ->', s_, (r or {}).get('code') if isinstance(r, dict) else r)
        s_, r = http('PATCH', '/rest/v1/saves?user_id=eq.' + u1['id'], PUB, {'body': {'hack': 1}}, token=t2, extra={'Prefer': 'return=representation'}); print('u2 patches u1 ->', s_, r)
        s_, r = http('GET', '/rest/v1/saves?select=user_id', PUB); print('anonymous reads ->', s_, r if not isinstance(r, dict) else r.get('code'))
        s_, r = http('POST', '/rest/v1/rpc/acquire_save_lease', PUB, {'holder': 'x', 'ttl_ms': 4000}); print('anonymous lease ->', s_, r if not isinstance(r, dict) else r.get('code'))
        print('u1 save intact after attacks: essence', cloud_ess(u1['id']), '| has hack key:', 'hack' in (cloud_row(u1['id']) or {}).get('body', {}))
        # 8. write lease: one device at a time
        t1 = token(u1)
        l = [http('POST', '/rest/v1/rpc/acquire_save_lease', PUB, {'holder': h, 'ttl_ms': 4000}, token=t1)[1] for h in ['dev-x', 'dev-y', 'dev-x']]
        print('lease x, then y (blocked), then x again:', l)
        time.sleep(4.5)
        print('lease y after 4.5 s expiry:', http('POST', '/rest/v1/rpc/acquire_save_lease', PUB, {'holder': 'dev-y', 'ttl_ms': 4000}, token=t1)[1])
        # 9. sign out on A: progress is online first, then this device starts fresh; the account keeps the save
        before = cloud_ess(u1['id'])
        print('A before sign out:', st(a), '| meta', a.evaluate("localStorage.getItem('critter-roll:meta')"))
        a.evaluate('APP.openBackup()'); a.wait_for_timeout(200)
        a.click('#acct-off'); a.wait_for_timeout(4000)
        print('A sign-out message:', a.evaluate("document.getElementById('acct-msg') && document.getElementById('acct-msg').textContent"))
        a.wait_for_timeout(2500)
        print('A after sign out:', st(a), '| local v2 kept?', a.evaluate("localStorage.getItem('critter-roll:v2') !== null && JSON.parse(localStorage.getItem('critter-roll:v2')).essence"), '| cloud essence still', cloud_ess(u1['id']), '(was', before, ')')
        # 10. sign back in on A -> progress returns
        print('A storage before signing in again:', a.evaluate("JSON.stringify({s: Object.assign({}, sessionStorage), v2: (JSON.parse(localStorage.getItem('critter-roll:v2')||'{}')).essence, meta: localStorage.getItem('critter-roll:meta')})"))
        sign_in(a, u1)
        for i in range(16):
            a.wait_for_timeout(250)
            try: print('  t+%.2fs' % ((i+1)*0.25), a.evaluate("CLOUD.status + ' ess=' + APP.game.state.essence + ' v2=' + (JSON.parse(localStorage.getItem('critter-roll:v2')||'{}')).essence"), '| cloud', cloud_ess(u1['id']))
            except Exception as e: print('  (reloading)')
        wait_status(a, 'synced'); print('A signs in again:', st(a), '| cloud', cloud_ess(u1['id']))
        # 11. hint for signed-out players with 3+ critters exists in the queue logic
        print('menu tile label:', a.evaluate("(() => { APP.openMenu(); const t=[...document.querySelectorAll('#m-grid button')].map(x=>x.innerText.split('\\n')[0]); APP.closeMenu(); return t.filter(x=>/Save/.test(x)); })()"))
        b.close()
finally:
    for u in (u1, u2):
        s_, _ = http('DELETE', '/auth/v1/admin/users/' + u['id'], SECRET)
        print('deleted test account', u['email'], '->', s_, '| its save row gone:', cloud_row(u['id']) is None)
# the deliberate wrong-password sign-in makes the browser log one 400 from the token endpoint; anything else is a real error
expected = [e for e in errors if '400' in e and 'grant_type=password' in e]
print('expected 400 from wrong password:', len(expected))
print('errors:', [e for e in errors if e not in expected] or 'none')
