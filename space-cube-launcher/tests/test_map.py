"""The star map: only a map. ??? until visited, invisible until seen, JUMP only to places you know, same facts as the game."""
from sc import Game, check, done
st = {'sys': 'sys:Proxima Cen', 'planet': 'Proxima Cen d', 'dir': [0, 0, -1], 'q': [0, 0, 0, 1], 'nav': None, 'limit': 50,
      'visited': ['sol', 'sys:Proxima Cen', 'm42'], 'scanned': ['pl:Proxima Cen d', 'pl:MARS'], 'seen': ['sys:eps Eri', 'sgra']}
with Game(touch=True) as g:
    g.fresh({'spaceCube.state.v1': st})
    g.pg.click('#mapBtn'); g.wait(1200)
    check('the map knows where the ship is', g.js('SpaceMap.debug()')['here'] == 'pl:Proxima Cen d')
    c = g.card('sys:Proxima Cen'); check('visited star: named, with its facts', c[0] == 'PROXIMA CEN' and 'YOUR SHIP IS IN THIS SYSTEM' in c and 'VISITED' in c, c)
    check('the star of the system you are in can be jumped to', not g.js("document.getElementById('mp-jump').classList.contains('off')") and g.js("getComputedStyle(document.getElementById('mp-jump')).display") != 'none')
    c = g.card('pl:Proxima Cen d'); check('the planet you are at', c[0] == 'PROXIMA CEN D' and 'YOU ARE HERE' in c, c)
    c = g.card('pl:Proxima Cen b'); check('unvisited planet of a visited star: ???, can be jumped to', c[0] == '???' and 'JUMP' in c, c)
    c = g.card('sys:eps Eri'); check('seen star: ??? and no jump', c[0] == '???' and 'SEEN · NOT VISITED' in c and 'JUMP · NOT VISITED' in c, c)
    c = g.card('sgra'); check('seen landmark: ???', c[0] == '???' and 'UNKNOWN OBJECT' in c, c)
    c = g.card('m42'); check('visited landmark: named, can be jumped to from anywhere', c[0] == 'ORION NEBULA' and c[-1] == 'JUMP', c)
    c = g.card('pl:EARTH'); check('our own planets are known', c[0] == 'EARTH', c)
    # the map and the game say the same thing about a planet
    g.card('pl:Proxima Cen b'); g.pg.click('#mp-jump'); g.wait_warp()
    check('JUMP from the map', g.where() == ('sys:Proxima Cen', 'Proxima Cen b'))
    game = g.facts(); g.pg.click('#mapBtn') if not g.js('SpaceMap.isOpen') else None; g.wait(800)
    c = g.card('pl:Proxima Cen b'); check('same fact lines in the game and on the map', all(l in game for l in c[2:-1] if l not in ('VISITED',)), (game, c))
    # JUMP to the star you are in: lands at the star; then the map says you are there and offers no jump
    g.card('sys:Proxima Cen'); g.pg.click('#mp-jump'); g.wait_warp()
    check('JUMP to the star of your own system lands at the star', g.where() == ('sys:Proxima Cen', None))
    g.pg.click('#mapBtn'); g.wait(800)
    c = g.card('sys:Proxima Cen'); check('at the star: YOU ARE HERE, no jump', 'YOU ARE HERE' in c and g.js("getComputedStyle(document.getElementById('mp-jump')).display") == 'none', c)
    check('the map knows the ship is at the star', g.js('SpaceMap.debug()')['here'] == 'sys:Proxima Cen')
done()
