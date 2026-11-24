#!/usr/bin/env python3
"""Builds Space Cube's one catalogue (catalog.json) from:
  nasa-snapshot.json  the NASA Exoplanet Archive download (made by fetch_sky.py on GitHub)
  catalog-hand.json   everything written by hand (our solar system, landmarks, star categories)
Every star system has the same shape, ours included. Every planet has an orbit size (au) and a place on it (ph).
  aue = 1: orbit size not in the archive, estimated from the planet's year (assuming a Sun-like star mass)
  ph for other stars' planets: INVENTED (fixed, from the planet's name): the archive does not say where a planet is on its orbit.
"""
import json, hashlib, pathlib
D = pathlib.Path(__file__).resolve().parent
raw, hand = json.load(open(D / 'nasa-snapshot.json')), json.load(open(D / 'catalog-hand.json'))
I = {c: i for i, c in enumerate(raw['cols'])}
LY_PER_PC = 3.26156
def r3(v): return None if v is None else round(v, 3)
SYS_COLS = ['name', 'ra', 'dec', 'ly', 'teff', 'strad', 'spec', 'x']
PL_COLS = ['sys', 'name', 'au', 'aue', 'per', 're', 'me', 'eqt', 'year', 'how', 'ph', 'x']
systems, planets = [], []
# our own system first, same shape as the others
sol = hand['sol']
systems.append([sol['name'], None, None, 0, sol['teff'], sol['strad'], sol['spec'], {'id': sol['id'], 'ecliptic': True}])
for p in sol['planets']:
    x = {k: p[k] for k in ('diamKm', 'rgb', 'look', 'tag', 'moon', 'major', 'home') if k in p}
    planets.append([0, p['name'], p['au'], 0, None, round(p['diamKm'] / 12756, 3), None, None, None, None, p['ph'], x])
hosts = {}
for r in raw['planets']:
    h = r[I['hostname']]
    if h not in hosts:
        hosts[h] = len(systems)
        systems.append([h, r[I['ra']], r[I['dec']], r3(r[I['sy_dist']] * LY_PER_PC), r[I['st_teff']], r[I['st_rad']], r[I['st_spectype']], 0])
    au, per, aue = r[I['pl_orbsmax']], r[I['pl_orbper']], 0
    if not au: au, aue = round((per / 365.25) ** (2 / 3), 4) if per else 0.05, 1
    ph = int(hashlib.md5(r[I['pl_name']].encode()).hexdigest()[:8], 16) % 360
    planets.append([hosts[h], r[I['pl_name']], au, aue, per, r[I['pl_rade']], r[I['pl_bmasse']], r[I['pl_eqt']], r[I['disc_year']], r[I['discoverymethod']], ph, 0])
pos = {l['id']: l for l in raw.get('landmarks', [])}
landmarks = []
for l in hand['landmarks']:
    o = {k: v for k, v in l.items() if k not in ('query',)}
    if l['id'] in pos: o['ra'], o['dec'] = pos[l['id']]['ra'], pos[l['id']]['dec']       # positions: CDS Sesame
    landmarks.append(o)
cat = {'v': 2, 'fetched': raw['fetched'], 'sources': {'exoplanets': 'NASA Exoplanet Archive, pscomppars', 'positions': 'CDS Sesame', 'sol': 'JPL approximate positions (au), NASA fact sheets (diameters)'},
       'warpLy': hand['warpLy'], 'starCats': {k: v for k, v in hand['starCats'].items() if not k.startswith('_')},
       'sysCols': SYS_COLS, 'systems': systems, 'plCols': PL_COLS, 'planets': planets, 'landmarks': landmarks}
out = D / 'catalog.json'
out.write_text(json.dumps(cat, separators=(',', ':')))
print('systems', len(systems), 'planets', len(planets), 'landmarks', len(landmarks), 'bytes', out.stat().st_size, '| estimated orbits', sum(p[3] for p in planets))
