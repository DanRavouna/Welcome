import json, time
from playwright.sync_api import sync_playwright
SERVER = {}; CALLS = {'set': 0, 'get': 0, 'acquire': 0}; LEASES = {}; MODE = {'down': False, 'uid': 'u_dan'}
DOWNLOADS = []
MOCK = """
(() => {
  const ns = {
    db: { doc: (path) => ({ path,
      get: async () => { const r = await window.__srv('get', path, null); if (r.err) throw { code: r.err, message: r.err }; return { exists: r.exists, data: () => r.data, metadata: {} }; },
      set: async (body) => { const r = await window.__srv('set', path, JSON.stringify(body)); if (r.err) throw { code: r.err, message: r.err }; },
      acquire: async (o) => { const r = await window.__srv('acquire', path, JSON.stringify(o)); if (r.err) throw { code: r.err, message: r.err }; return r; } }) },
    user: { id: async () => window.__uid(), isOwner: async () => true },
    downloads: { save: async (req) => { const r = await window.__dl(req.filename, String(req.data)); if (r) throw { code: r }; return {}; } }
  };
  window.claude = { use: (name) => new Promise((res) => setTimeout(() => res(ns[name] || null), 30)) };
})();
"""
def device(b, name):
    ctx = b.new_context(viewport={'width':390,'height':844}, has_touch=True)
    ctx.expose_function('__srv', lambda op, path, body: srv(op, path, body))
    ctx.expose_function('__uid', lambda: MODE['uid'])
    ctx.expose_function('__dl', lambda fn, data: (DOWNLOADS.append((fn, data)), MODE.get('dl'))[1])
    ctx.add_init_script(MOCK)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(name + ': ' + str(e)))
    pg.on('console', lambda m: errs.append(name + ': ' + m.text) if m.type == 'error' and 'ERR_NAME' not in m.text else None)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    return ctx, pg, errs
def srv(op, path, body):
    if MODE['down']: return {'err': 'unavailable'}
    CALLS[op] += 1
    if op == 'get': return {'exists': path in SERVER, 'data': SERVER.get(path)}
    if op == 'acquire':
        o = json.loads(body); now = time.time(); cur = LEASES.get(path)
        if cur and cur[1] > now and cur[0] != o['holder']: return {'acquired': False}
        LEASES[path] = (o['holder'], now + o.get('ttlMs', 30000) / 1000); return {'acquired': True}
    SERVER[path] = json.loads(body); return {}
st = lambda pg: pg.evaluate("({status: CLOUD.status, text: CLOUD.text(), kept: APP.game.state.caught.length, xp: APP.game.state.xp, ess: APP.game.state.essence})")
with sync_playwright() as p:
    b = p.chromium.launch()
    # 1. existing player (pre-Phase 16 local save) migrates on first connect
    A, a, ea = device(b, 'A')
    print('A first load (fresh, empty cloud):', st(a))
    a.evaluate("APP.game.update({caught:[{seed:12,stage:2},{seed:30,stage:1}], essence:25, xp:300})")
    a.wait_for_timeout(3600)
    doc = SERVER.get('data/users/u_dan/save')
    print('A after progress + 3.6s: cloud has save:', bool(doc), '| cloud critters:', len(json.loads(doc['data']['critter-roll:v2'])['caught']) if doc else None, '|', st(a)['status'])
    # 2. debounce: rapid changes -> few writes
    before = CALLS['set']
    for i in range(6): a.evaluate(f"APP.game.update({{essence: APP.game.state.essence + 1}})"); a.wait_for_timeout(200)
    a.wait_for_timeout(3600)
    print('6 rapid changes ->', CALLS['set'] - before, 'cloud write(s) | cloud essence:', json.loads(SERVER['data/users/u_dan/save']['data']['critter-roll:v2'])['essence'])
    # 3. new device: adopts account save automatically
    B, bb, eb = device(b, 'B'); bb.wait_for_timeout(1500)
    print('B new phone ->', st(bb))
    # 4. B progresses, A comes back to the foreground -> A adopts
    bb.evaluate("APP.game.update({caught: APP.game.state.caught.concat([{seed:99,stage:1}])})"); bb.wait_for_timeout(3600)
    a.evaluate("CLOUD.reconcile()"); a.wait_for_timeout(1500)
    print('A after B played (A refreshed) ->', st(a))
    # 5. both play while the server is unreachable -> conflict
    MODE['down'] = True
    a.evaluate("APP.game.update({essence: 500})"); bb.evaluate("APP.game.update({essence: 7})")
    a.wait_for_timeout(3600); print('while offline A status:', st(a)['text'])
    bb.wait_for_timeout(3600)
    MODE['down'] = False; a.wait_for_timeout(3500)
    a.evaluate("CLOUD.reconcile()"); a.wait_for_timeout(800)
    print('A reconnect with only A changed ->', st(a)['status'], '| cloud essence', json.loads(SERVER['data/users/u_dan/save']['data']['critter-roll:v2'])['essence'])
    bb.evaluate("CLOUD.reconcile()"); bb.wait_for_timeout(600)
    print('B reconnect (both changed) ->', st(bb)['status'], '| dialog shown:', not bb.evaluate("document.getElementById('cf').hidden"))
    print('   B sees:', bb.inner_text('#cf-cloud'), '/', bb.inner_text('#cf-local'))
    bb.screenshot(path='/tmp/c_conflict.png')
    bb.add_script_tag(content=open('/tmp/node_modules/axe-core/axe.min.js').read())
    print('   axe on open conflict dialog:', bb.evaluate("async()=>(await axe.run(document,{runOnly:['wcag2a','wcag2aa','best-practice']})).violations.map(v=>v.id)") or 'none', '| focus on:', bb.evaluate("document.activeElement.id"))
    bb.click('#cf-keep-local'); bb.wait_for_timeout(5500)
    print('B keeps its own ->', st(bb)['status'], '| cloud essence now', json.loads(SERVER['data/users/u_dan/save']['data']['critter-roll:v2'])['essence'])
    a.evaluate("CLOUD.reconcile()"); a.wait_for_timeout(1800)
    print('A (no unsynced changes) loads B\'s chosen save ->', st(a))
    # a conflict resolved the other way: both change again, A keeps the account save
    MODE['down'] = True; a.evaluate("APP.game.update({essence: 111})"); bb.evaluate("APP.game.update({essence: 222})"); a.wait_for_timeout(3600); bb.wait_for_timeout(500)
    MODE['down'] = False; bb.wait_for_timeout(3500); bb.evaluate("CLOUD.reconcile()"); bb.wait_for_timeout(5000)
    a.evaluate("CLOUD.reconcile()"); a.wait_for_timeout(800); print('A sees conflict:', st(a)['status'])
    a.click('#cf-keep-cloud'); a.wait_for_timeout(1800)
    print('A keeps account save ->', st(a))
    # 6. signed out
    MODE['uid'] = None; C, cc, ec = device(b, 'C'); cc.wait_for_timeout(800)
    print('signed out ->', st(cc)['text'], '| game works:', cc.evaluate("APP.game.renderVals() && true"))
    MODE['uid'] = 'u_dan'
    # 7. downloads + load file
    a.click('#b-menu'); a.wait_for_timeout(150); a.click('[data-tile="backup"]'); a.wait_for_timeout(200)
    print('backup panel status:', a.inner_text('#bk-sync'), '| download visible:', a.is_visible('#bk-download'))
    a.screenshot(path='/tmp/c_backup.png')
    a.click('#bk-download'); a.wait_for_timeout(300); print('download ->', DOWNLOADS[-1][0] if DOWNLOADS else None, '| msg:', a.inner_text('#bk-msg'))
    MODE['dl'] = 'declined'; a.click('#bk-download'); a.wait_for_timeout(300); print('declined ->', a.inner_text('#bk-msg')); MODE['dl'] = None
    open('/tmp/save.txt','w').write(DOWNLOADS[0][1])
    a.set_input_files('#bk-file', '/tmp/save.txt'); a.wait_for_timeout(300); print('load file ->', a.inner_text('#bk-msg')[:90])
    print('errors:', ea + eb + ec if (ea + eb + ec) else 'none')
    # 8. no window.claude at all (saved file opened directly)
    ctx = b.new_context(); pg = ctx.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    print('no viewer ->', pg.evaluate("CLOUD.text()"), '| download button hidden:', not pg.evaluate("!document.getElementById('bk-download').hidden"))
    b.close()
