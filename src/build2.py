import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
# Default output: index.html at the repository root (served by GitHub Pages).
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'index.html')
W = os.path.join(HERE, 'world') + os.sep
# Map edits made in the map editor (kept on its own branch, never on main) live in mapedits.json; wrapped here so the game reads them as MAPEDITS.
mapedits = '// generated from mapedits.json by build2.py\nconst MAPEDITS = ' + open(W + 'mapedits.json').read().strip() + ';\n'
h = open(W + 'shell.html').read()
js = '\n'.join(mapedits if p == 'mapedits' else open(f'{W}{p}.js').read() for p in ['runtime', 'pixel', 'landmarks', 'adventure', 'pxworld', 'weather', 'ambient', 'mapedits', 'world', 'vfx', 'action', 'cloud', 'music', 'flavor', 'base', 'data', 'game', 'app']) + '\n'
h = h.replace('/*@@JS@@*/', js, 1).replace('<!--@@SCREEN@@-->', open(W + 'screen.html').read(), 1)
open(OUT, 'w').write(h); print('built', os.path.normpath(OUT), len(h) // 1024, 'KB')
