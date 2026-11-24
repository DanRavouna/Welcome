"""Old saves must keep loading (standing rule). Every form the app has ever written is planted and checked."""
from sc import Game, check, done
with Game() as g:
    # 1) before the single state: the game's place (spaceCubeDeep.v1, several shapes) and the map's lists (spaceCubeMap.v1)
    for name, deep, want in [
        ("old 'sp:' planet of ours", {'limit': 50, 'at': 'sp:MARS', 'planet': None, 'dir': [0, 0, -1], 'q': [0, 0, 0, 1]}, ('sol', 'MARS')),
        ('old exoplanet', {'limit': 50, 'at': 'sys:Proxima Cen', 'planet': 'Proxima Cen d', 'dir': [0, 0, -1], 'q': [0, 0, 0, 1]}, ('sys:Proxima Cen', 'Proxima Cen d')),
        ('old landmark', {'limit': 50, 'at': 'm42', 'planet': None, 'dir': [0, 0, -1], 'q': [0, 0, 0, 1]}, ('m42', None)),
        ('old home', {'limit': 30, 'at': None}, ('sol', 'SATURN')),
        ('screen-47 form', {'limit': 50, 'sys': 'sol', 'planet': 'EARTH', 'dir': [0, 0, -1], 'q': [0, 0, 0, 1]}, ('sol', 'EARTH'))]:
        g.fresh({'spaceCubeDeep.v1': deep}); check(name + ' loads where you were', g.where() == want, g.where())
    g.fresh({'spaceCubeDeep.v1': {'limit': 35, 'at': 'sys:Proxima Cen', 'planet': 'Proxima Cen d', 'dir': [0, 0, -1], 'q': [0, 0, 0, 1]},
             'spaceCubeMap.v1': {'visited': ['sol', 'sys:Proxima Cen', 'm42'], 'here': 'pl:Proxima Cen d', 'planets': ['pl:Proxima Cen b', 'pl:MARS'], 'seen2': ['sys:eps Eri', 'sgra']}})
    s = g.state()
    check('map lists carried over', set(s['visited']) == {'sol', 'sys:Proxima Cen', 'm42'} and 'pl:MARS' in s['scanned'] and set(s['seen']) == {'sys:eps Eri', 'sgra'}, s)
    check('range setting carried over', s['limit'] == 35)
    check('the single save is written', g.js("!!localStorage.getItem('spaceCube.state.v1')"))
    # 2) flights saved before the single state (spaceCubeNav.v1): parked at Titan at home
    g.fresh({'spaceCubeNav.v1': {'target': 'TITAN', 'offset': [3, 1, 9], 'q': [0, 0, 0, 1]}, 'spaceCubeDeep.v1': {'limit': 50, 'at': None}})
    check('old flight save: still parked at Titan', g.js('window.__navDebug()')['target'] == 'TITAN')
    # 3) a single-state save from before flights were in it, with the old flight key beside it
    st = {'sys': 'sol', 'planet': 'SATURN', 'dir': None, 'q': None, 'limit': 50, 'visited': ['sol'], 'scanned': ['pl:SATURN'], 'seen': []}
    g.fresh({'spaceCube.state.v1': st, 'spaceCubeNav.v1': {'target': 'MIMAS', 'offset': [1, 0.5, 2], 'q': [0, 0, 0, 1]}})
    check('screen-49 save: flight taken from the old key', g.js('window.__navDebug()')['target'] == 'MIMAS')
    g.fresh({'spaceCube.state.v1': dict(st, planet='MARS', dir=[0, 0, -1], q=[0, 0, 0, 1]), 'spaceCubeNav.v1': {'target': 'MIMAS', 'offset': [1, 0.5, 2]}})
    check('...but not when you are somewhere else', g.where() == ('sol', 'MARS') and g.js('window.__navDebug()')['target'] is None)
    # 4) the Deep Sky setting never goes below the warp range
    g.fresh({'spaceCube.state.v1': dict(st, limit=10)}); check('range setting clamped to the warp range', g.state()['limit'] == g.js('CAT.warpLy'))
done()
