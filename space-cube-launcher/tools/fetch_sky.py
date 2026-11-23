#!/usr/bin/env python3
"""Downloads the real sky data Space Cube draws (run on GitHub's servers by sky-data.yml).

- Exoplanets: the 1000 nearest confirmed planets with a known distance, NASA Exoplanet Archive (pscomppars).
- Landmarks: sky positions from the CDS Sesame name resolver; distances below, each with its source.
Output: app/src/main/assets/sky-data.json
"""
import json, re, sys, time, urllib.parse, urllib.request, datetime, pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / 'app' / 'src' / 'main' / 'assets' / 'sky-data.json'

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'SpaceCube/1.0'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8')
        except Exception as e:
            print('retry', i + 1, url[:90], e, file=sys.stderr); time.sleep(3 * (i + 1))
    raise SystemExit('failed: ' + url)

COLS = ['pl_name', 'hostname', 'ra', 'dec', 'sy_dist', 'pl_rade', 'pl_bmasse', 'pl_eqt', 'pl_orbper',
        'pl_orbsmax', 'st_teff', 'st_rad', 'st_spectype', 'disc_year', 'discoverymethod', 'sy_pnum']
# The archive ignores 'order by' together with 'top', so fetch every planet with a distance and sort here.
adql = 'select ' + ','.join(COLS) + ' from pscomppars where sy_dist is not null'
rows = json.loads(get('https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=' + urllib.parse.quote(adql) + '&format=json'))
def rnd(v, n):
    return round(v, n) if isinstance(v, float) else v
rows.sort(key=lambda p: p['sy_dist'])
print('archive planets with a distance:', len(rows))
planets = [[rnd(p.get(c), 5 if c in ('ra', 'dec') else 3) for c in COLS] for p in rows[:1000]]
print('exoplanets:', len(planets), 'nearest', planets[0][0], planets[0][4], 'pc; farthest', planets[-1][0], planets[-1][4], 'pc')

# id, name, kind, Sesame query, fallback RA, Dec (deg), distance (ly), distance source
LANDMARKS = [
  ('sgra',   'SAGITTARIUS A*',  'blackhole', 'Sgr A*',   266.41684, -29.00782, 26670,    'GRAVITY Collaboration 2019, A&A 625 L10: 8178 pc'),
  ('m87',    'M87* BLACK HOLE', 'blackhole', 'M87',      187.70593,  12.39112, 55000000, 'NASA Chandra: about 55 million ly'),
  ('cygx1',  'CYGNUS X-1',      'blackhole', 'Cyg X-1',  299.59032,  35.20161, 7240,     'Miller-Jones et al. 2021, Science 371:1046: 2.22 kpc'),
  ('m42',    'ORION NEBULA',    'nebula',    'M42',       83.82208,  -5.39111, 1344,     '1,344 +/- 20 ly (412 pc)'),
  ('m1',     'CRAB NEBULA',     'nebula',    'M1',        83.63308,  22.01450, 6500,     'NASA Hubble Messier catalog: 6,500 ly'),
  ('m16',    'EAGLE NEBULA',    'nebula',    'M16',      274.70000, -13.80694, 6500,     'NASA Webb: 6,500 ly'),
  ('m57',    'RING NEBULA',     'nebula',    'M57',      283.39616,  33.02918, 2570,     'parallax: 2,567 +/- 115 ly'),
  ('ngc7293','HELIX NEBULA',    'nebula',    'NGC 7293', 337.41066, -20.83711, 655,      'Gaia: 655 +/- 13 ly'),
  ('carina', 'CARINA NEBULA',   'nebula',    'NGC 3372', 161.26500, -59.86778, 7500,     'NASA Hubble: 7,500 ly'),
  ('m31',    'ANDROMEDA',       'galaxy',    'M31',       10.68471,  41.26875, 2500000,  'NASA Hubble: 2.5 million ly'),
  ('lmc',    'LARGE MAGELLANIC CLOUD', 'galaxy', 'LMC',   80.89417, -69.75611, 163000,   '163,000 ly (49.97 kpc)'),
  ('m45',    'PLEIADES',        'cluster',   'M45',       56.75000,  24.11667, 444,      '444 ly (136.2 pc)'),
]
landmarks = []
for lid, name, kind, q, ra0, de0, dist, src in LANDMARKS:
    ra, de, how = ra0, de0, 'fallback'
    try:
        x = get('https://cds.unistra.fr/cgi-bin/nph-sesame/-ox/SNV?' + urllib.parse.quote(q))
        mr, md = re.search(r'<jradeg>([-\d.]+)</jradeg>', x), re.search(r'<jdedeg>([-\d.]+)</jdedeg>', x)
        if mr and md:
            ra, de, how = float(mr.group(1)), float(md.group(1)), 'CDS Sesame'
    except SystemExit:
        pass
    landmarks.append({'id': lid, 'name': name, 'kind': kind, 'ra': round(ra, 5), 'dec': round(de, 5),
                      'ly': dist, 'distSource': src, 'posSource': how})
    print(name, ra, de, how)

data = {
  'fetched': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'),
  'sources': {'exoplanets': 'NASA Exoplanet Archive, pscomppars', 'positions': 'CDS Sesame'},
  'cols': COLS, 'planets': planets, 'landmarks': landmarks,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, separators=(',', ':')))
print('wrote', OUT, OUT.stat().st_size, 'bytes')

# The sandbox that builds the screen cannot download artifacts, so the data is also printed (gzip + base64).
import base64, gzip
print('SKYDATA-BEGIN'); b = base64.b64encode(gzip.compress(OUT.read_bytes())).decode()
for i in range(0, len(b), 3000): print('SKY:' + b[i:i + 3000])
print('SKYDATA-END')
