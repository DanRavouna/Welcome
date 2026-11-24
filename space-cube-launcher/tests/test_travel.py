"""Warps (taps and hooks), the one planet scene, flights to moons, landmarks, and coming back after a reload."""
from sc import Game, check, done
with Game() as g:
    g.fresh()
    check('a first start is at the home planet', g.where() == ('sol', 'SATURN'))
    L = {b['id'][3:]: b for b in g.js('window.__localDebug()')['bodies'] if 'px' in b}
    check('albedo from the data', g.js("CAT.byId.get('pl:VENUS').albedo") == 0.689)
    check('Jupiter from Saturn is about 74 px (Dan\'s mark)', 70 < L['JUPITER']['px'] < 78, round(L['JUPITER']['px'], 1))
    check('sky dots of our planets: 6 to 84 px', all(6 <= b['px'] <= 84 for b in L.values()), {k: round(b['px'], 1) for k, b in L.items()})
    check('...bigger where bigger in the real sky (Jupiter > Uranus > Neptune > Earth > Mercury)', L['JUPITER']['px'] > L['URANUS']['px'] > L['NEPTUNE']['px'] > L['EARTH']['px'] > L['MERCURY']['px'])
    check('...brighter where more light reaches you (Jupiter and Venus bright, Neptune faint)', min(L['JUPITER']['bright'], L['VENUS']['bright']) > L['MARS']['bright'] > L['NEPTUNE']['bright'], {k: round(b['bright'], 2) for k, b in L.items()})
    nav = [n['name'] for n in g.js('window.__navList()')]
    check('home planet scene: the planet and its 7 moons are flight targets', nav[0] == 'SATURN' and len(nav) == 8 and 'TITAN' in nav, nav)
    # tap a sibling planet twice: lock, then warp
    g.js("window.__deepFace('pl:JUPITER')"); g.wait(600)
    x, y, *_ = g.js("window.__deepScr('pl:JUPITER')"); g.pg.mouse.click(x, y); g.wait(400)
    check('first tap locks on', 'JUPITER' in g.lock() and 'TAP AGAIN TO JUMP' in g.lock(), g.lock())
    g.pg.mouse.click(x, y); g.wait_warp()
    check('second tap warps there', g.where() == ('sol', 'JUPITER'))
    check('arrival facts name the planet', g.facts()[:1] == ['JUPITER'], g.facts())
    nav = [n['name'] for n in g.js('window.__navList()')]
    check('same scene at Jupiter: planet + 4 moons', nav[0] == 'JUPITER' and set(nav[1:]) == {'IO', 'EUROPA', 'GANYMEDE', 'CALLISTO'}, nav)
    check('the scene has finished growing', g.js('window.__deepDebug()')['scale'] == 1)
    # flights
    g.fly('GANYMEDE'); check('fly to a moon', g.js('window.__navDebug()')['target'] == 'GANYMEDE')
    check('moon facts', any('FROM JUPITER' in f for f in g.facts()), g.facts())
    g.reload(); check('reload: still parked at that moon', g.where() == ('sol', 'JUPITER') and g.js('window.__navDebug()')['target'] == 'GANYMEDE')
    # Earth and the Moon
    g.warp('sol', 'EARTH'); check('warp from a parked spot', g.where() == ('sol', 'EARTH') and g.js('window.__navDebug()')['target'] is None)
    check('Earth has the Moon', [n['name'] for n in g.js('window.__navList()')] == ['EARTH', 'MOON'])
    # a planet with no moons, another star, a hop between its planets
    g.warp('sol', 'MERCURY'); check('a planet without moons still has its scene', [n['name'] for n in g.js('window.__navList()')] == ['MERCURY'])
    for pl, moons in [('MARS', ['PHOBOS', 'DEIMOS']), ('URANUS', ['TITANIA', 'MIRANDA', 'ARIEL', 'UMBRIEL', 'OBERON']), ('NEPTUNE', ['TRITON', 'PROTEUS'])]:
        g.warp('sol', pl); nl = [n['name'] for n in g.js('window.__navList()')]
        check(f'{pl}: its moons from NASA, the main one first', nl[0] == pl and nl[1] == moons[0] and set(nl[1:]) == set(moons), nl)
    g.fly('TRITON'); check('fly to Triton', g.js('window.__navDebug()')['target'] == 'TRITON')
    g.warp('sol', 'MARS')
    # the arrival grows smoothly: sample the scene's scale through a whole warp (finite, never shrinking once it grows)
    g.js("window.__deepGo('sys:Proxima Cen')"); sc = []
    for i in range(90):
        g.wait(60); d = g.js('window.__deepDebug()'); sc.append(d['scale'])
        if i > 8 and not d['jumping']: break
    g.wait_warp(); after = [v for v in sc[next((i for i, v in enumerate(sc) if v is not None and v < 1), len(sc)):] if v is not None]
    check('a jump to a star lands at the star', g.where() == ('sys:Proxima Cen', None))
    check('the arrival at a star grows smoothly', len(after) > 5 and all(v == v and 0 < v <= 1 for v in after) and all(b >= a - 1e-9 for a, b in zip(after, after[1:])), sc)
    check('at a star: the star is the body you are at', [n['name'] for n in g.js('window.__navList()')] == ['PROXIMA CEN'], g.js('window.__navList()'))
    check('at a star: arrival facts name the star', g.facts()[:1] == ['PROXIMA CEN'], g.facts())
    check('at a star: every planet is a body to jump to', set(g.js('window.__deepDebug()')['local']) == {'pl:Proxima Cen b', 'pl:Proxima Cen d'}, g.js('window.__deepDebug()')['local'])
    def tap2(id):
        g.pg.evaluate('i => window.__deepFace(i)', id); g.wait(600)
        x, y, *_ = g.pg.evaluate('i => window.__deepScr(i)', id); g.pg.mouse.click(x, y); g.wait(300); g.pg.mouse.click(x, y); g.wait_warp()
    tap2('pl:Proxima Cen b'); check('from the star, tap a planet to go there', g.where() == ('sys:Proxima Cen', 'Proxima Cen b'))
    tap2('pl:Proxima Cen d'); check('hop to the sibling planet by tapping it', g.where() == ('sys:Proxima Cen', 'Proxima Cen d'))
    check('the star is a body you can jump back to', 'star:sys:Proxima Cen' in g.js('window.__deepDebug()')['local'])
    tap2('star:sys:Proxima Cen'); check('tap the star twice: back at the star', g.where() == ('sys:Proxima Cen', None))
    g.reload(); check('reload at a star', g.where() == ('sys:Proxima Cen', None) and [n['name'] for n in g.js('window.__navList()')] == ['PROXIMA CEN'])
    g.fly('PROXIMA CEN'); check('fly closer to the star you are at', g.js('window.__navDebug()')['target'] == 'PROXIMA CEN')
    g.reload(); check('reload: still parked close to the star', g.where() == ('sys:Proxima Cen', None) and g.js('window.__navDebug()')['target'] == 'PROXIMA CEN')
    g.js("window.__deepFace('sol')"); g.wait(600); check('home is tagged from there', any(t.startswith('SOL') for t in g.tags()), g.tags())
    # out of range, landmarks, home
    far = g.js("CAT.systems.find(s => !s.always && CAT.dist(s, CAT.byId.get(CAT.state.sys)) > CAT.warpLy + 5).id")
    g.pg.evaluate('i => window.__deepGo(i)', far); g.wait(300); check('a star beyond the warp range cannot be jumped to', not g.js('window.__deepDebug()')['jumping'], far)
    # from outside the galaxy home shows as the Milky Way; arriving, the Sun is still named SOL
    g.js("window.__deepGo('m31')"); g.wait_warp(); g.warp('sol', 'EARTH')
    g.js("window.__deepFace('star:sol')"); g.wait(600); check('from far away to a planet: the star is tagged SOL', any(t.startswith('SOL ') for t in g.tags()) and not any('MILKY' in t for t in g.tags()), g.tags())
    g.js("window.__deepGo('m31')"); g.wait_warp(); g.js("window.__deepGo('sol')"); g.wait_warp()
    check('from far away to the Sun: the body is named SOL', [n['name'] for n in g.js('window.__navList()')] == ['SOL'], g.js('window.__navList()'))
    # a far jump holds in hyperspace: dark, with bright streaks (no white light)
    import io; from PIL import Image
    g.js("window.__deepGo('m42')")
    for i in range(80):
        g.wait(50)
        if g.js('window.__deepDebug()')['hyper'] >= 1: break
    im = Image.open(io.BytesIO(g.pg.screenshot())).convert('L'); px = list(im.getdata()); mean = sum(px) / len(px)
    check('far jump: in hyperspace', g.js('window.__deepDebug()')['hyper'] >= 1)
    check('hyperspace is dark, not white', mean < 70, round(mean, 1))
    check('hyperspace has bright streaks', sum(1 for v in px if v > 150) > 2000, sum(1 for v in px if v > 150))
    g.wait_warp(); check('...and arrives', g.where() == ('m42', None) and g.js('window.__deepDebug()')['veil'] == 0)
    for lm in ['m42', 'sgra']:
        g.js(f"window.__deepGo('{lm}')"); g.wait_warp(); check(f'warp to landmark {lm}', g.where() == (lm, None))
    check('no flight targets at a landmark', g.js('window.__navList()') == [])
    g.js("window.__deepGo('sol')"); g.wait_warp(); check('SOL brings you to the Sun', g.where() == ('sol', None))
    check('at the Sun: all 8 planets around you', len(g.js('window.__deepDebug()')['local']) == 8)
    tap2('pl:SATURN'); check('from the Sun, tap Saturn: home', g.where() == ('sol', 'SATURN') and g.js('CAT.atHome()'))
    g.js("window.__deepFace('star:sol')"); g.wait(600)
    check('at a planet, the star is tagged', any(t.startswith('SOL') for t in g.tags()), g.tags())
    x, y, *_ = g.js("window.__deepScr('star:sol')"); g.pg.mouse.click(x, y); g.wait(400)
    check('the star can be locked on', 'SOL' in g.lock() and 'TAP AGAIN TO JUMP' in g.lock(), g.lock())
    g.pg.mouse.click(x, y); g.wait_warp(); check('...and jumped to', g.where() == ('sol', None))
    tap2('pl:SATURN'); g.reload(); check('reload at home', g.where() == ('sol', 'SATURN'))
    s = g.state(); check('visited and scanned recorded', {'sol', 'sys:Proxima Cen', 'm42', 'sgra'} <= set(s['visited']) and {'pl:JUPITER', 'pl:EARTH', 'pl:MARS'} <= set(s['scanned']), s)
# at a star, its planets are seen from where the ship is parked (25 star radii out), not from the star's centre
with Game() as g:
    sid = g.js("(() => { const s = CAT.systems.find(s => s.strad && s.planets.some(q => q.au * CAT.KM_AU < 25 * s.strad * 695700 * 0.5)); return s.id; })()")
    g.fresh({'spaceCube.state.v1': {'sys': sid, 'planet': None, 'dir': [0, 0, -1], 'q': [0, 0, 0, 1], 'nav': None, 'limit': 50, 'visited': ['sol', sid], 'scanned': [], 'seen': []}})
    d = g.js('window.__localDebug()'); R = g.js(f"CAT.byId.get('{sid}').strad") * 695700
    check('parked 25 star radii out', abs(d['shipKm'] - 25 * R) < 1e-6 * R, (d['shipKm'], 25 * R))
    close = [b for b in d['bodies'] if b['centreKm'] < d['shipKm'] / 2]
    check('a planet orbits inside the parking spot', len(close) > 0, sid)
    check('...seen from the ship: its distance is at least the gap to its orbit', all(b['distKm'] >= d['shipKm'] - b['centreKm'] - 1 for b in close), close)
    g.warp(sid, g.js(f"CAT.byId.get('{sid}').planets[0].name")); d = g.js('window.__localDebug()')
    star = [b for b in d['bodies'] if b['id'].startswith('star:')]
    check('at a planet, the star is measured from the ship too', len(star) == 1 and abs(star[0]['distKm'] - d['shipKm']) < 1, (star, d['shipKm']))
done()
