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

# the landmark list lives in catalog-hand.json (one place)
HAND = json.load(open(pathlib.Path(__file__).resolve().parent / 'catalog-hand.json'))
LANDMARKS = [(l['id'], l['name'], l['kind'], l['query'], l['ra'], l['dec'], l['ly'], l['distSource']) for l in HAND['landmarks']]
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

# NASA NSSDC fact sheets (the Sun, planets, their moons), saved as the pages themselves: the numbers are read from them by hand
# into catalog-hand.json, with the page named as the source. A page that fails is reported and skipped.
FACT_PAGES = ['sunfact', 'mercuryfact', 'venusfact', 'earthfact', 'marsfact', 'jupiterfact', 'saturnfact', 'uranusfact', 'neptunefact',
              'moonfact', 'joviansatfact', 'saturniansatfact', 'uraniansatfact', 'neptuniansatfact']
facts = {}
for name in FACT_PAGES:
    url = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' + name + '.html'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'SpaceCube/1.0'})
        with urllib.request.urlopen(req, timeout=60) as r: facts[name] = r.read().decode('utf-8', 'replace')
        print('fact sheet', name, len(facts[name]), 'chars')
    except Exception as e:
        print('fact sheet FAILED', name, e)
FACTS = OUT.parent / 'fact-sheets.json'
FACTS.write_text(json.dumps({'fetched': data['fetched'], 'source': 'NASA NSSDC planetary fact sheets', 'pages': facts}))
import base64, gzip
print('FACTS-BEGIN'); b = base64.b64encode(gzip.compress(FACTS.read_bytes())).decode()
for i in range(0, len(b), 3000): print('FACT:' + b[i:i + 3000])
print('FACTS-END')

# The sandbox that builds the screen cannot download artifacts, so the data is also printed (gzip + base64).
import base64, gzip
print('SKYDATA-BEGIN'); b = base64.b64encode(gzip.compress(OUT.read_bytes())).decode()
for i in range(0, len(b), 3000): print('SKY:' + b[i:i + 3000])
print('SKYDATA-END')
