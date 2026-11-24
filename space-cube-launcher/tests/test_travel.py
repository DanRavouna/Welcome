"""Warps (taps and hooks), the one planet scene, flights to moons, landmarks, and coming back after a reload."""
from sc import Game, check, done
with Game() as g:
    g.fresh()
    check('a first start is at the home planet', g.where() == ('sol', 'SATURN'))
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
    g.warp('sol', 'MARS'); check('a planet without moons still has its scene', [n['name'] for n in g.js('window.__navList()')] == ['MARS'])
    g.js("window.__deepGo('sys:Proxima Cen')"); g.wait_warp(); check('warp to a star within range', g.where()[0] == 'sys:Proxima Cen')
    other = 'Proxima Cen d' if g.where()[1] == 'Proxima Cen b' else 'Proxima Cen b'
    g.js(f"window.__deepFace('pl:{other}')"); g.wait(600)
    x, y, *_ = g.js(f"window.__deepScr('pl:{other}')"); g.pg.mouse.click(x, y); g.wait(300); g.pg.mouse.click(x, y); g.wait_warp()
    check('hop to the sibling planet by tapping it', g.where() == ('sys:Proxima Cen', other))
    g.js("window.__deepFace('sol')"); g.wait(600); check('home is tagged from there', any(t.startswith('SOL') for t in g.tags()), g.tags())
    # out of range, landmarks, home
    far = g.js("CAT.systems.find(s => !s.always && CAT.dist(s, CAT.byId.get(CAT.state.sys)) > CAT.warpLy + 5).id")
    g.pg.evaluate('i => window.__deepGo(i)', far); g.wait(300); check('a star beyond the warp range cannot be jumped to', not g.js('window.__deepDebug()')['jumping'], far)
    for lm in ['m42', 'sgra']:
        g.js(f"window.__deepGo('{lm}')"); g.wait_warp(); check(f'warp to landmark {lm}', g.where() == (lm, None))
    check('no flight targets at a landmark', g.js('window.__navList()') == [])
    g.js("window.__deepGo('sol')"); g.wait_warp(); check('SOL brings you home', g.where() == ('sol', 'SATURN'))
    g.reload(); check('reload at home', g.where() == ('sol', 'SATURN'))
    s = g.state(); check('visited and scanned recorded', {'sol', 'sys:Proxima Cen', 'm42', 'sgra'} <= set(s['visited']) and {'pl:JUPITER', 'pl:EARTH', 'pl:MARS'} <= set(s['scanned']), s)
done()
