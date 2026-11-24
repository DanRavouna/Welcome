#!/usr/bin/env python3
"""Builds Space Cube's home screen from its sources. One command, no arguments:

    python3 space-cube-launcher/tools/build.py

  src/page.html      the page: markup and styles, with a marker where each part below goes
  src/catalogue.js   the catalogue: every place, the saved state, the rules, the time model, the pictures
  src/game.js        the home screen itself (the sky, the planet you're at, flights, warps, your apps)
  src/map.js         the star map
  tools/catalog.json the data, made here from nasa-snapshot.json + catalog-hand.json (build_catalog.py)

Writes app/src/main/assets/index.html: the page bundled in the app and served on GitHub Pages
(fonts and three.js are local files next to it). With --preview FILE it also writes a stand-alone
copy that loads the font and three.js from the web (for trying it in a browser or a Claude preview).
Every script is syntax-checked with node when node is installed; the build stops if one fails.
"""
import pathlib, runpy, shutil, subprocess, sys, tempfile
T = pathlib.Path(__file__).resolve().parent; ROOT = T.parent; SRC = ROOT / 'src'
FONT_LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap">\n'
THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
LOCAL_FONTS = ("  @font-face{font-family:'Orbitron';font-weight:600;font-display:block;src:url(fonts/orbitron-latin-600-normal.woff2) format('woff2')}\n"
               "  @font-face{font-family:'Orbitron';font-weight:700;font-display:block;src:url(fonts/orbitron-latin-700-normal.woff2) format('woff2')}\n\n")

def assemble():
    runpy.run_path(str(T / 'build_catalog.py'), run_name='__main__')          # tools/catalog.json
    data = (T / 'catalog.json').read_text(); assert '</' not in data
    page = (SRC / 'page.html').read_text()
    parts = {'catalog.json': data}
    for name in ('catalogue.js', 'game.js', 'map.js'):
        parts[name] = (SRC / name).read_text()
        if shutil.which('node'):
            r = subprocess.run(['node', '--check', str(SRC / name)], capture_output=True, text=True)
            if r.returncode: sys.exit(name + ' does not parse:\n' + r.stderr)
    for name, text in parts.items():
        mark = '{{' + name + '}}'; assert page.count(mark) == 1, mark
        page = page.replace(mark, text)
    return page

def bundled(page):                                     # the copy in the app: local font files, local three.js
    assert page.count(FONT_LINK) == 1 and page.count(THREE_CDN) == 1 and page.count('<style>\n') >= 1
    page = page.replace(FONT_LINK, '', 1).replace('<style>\n', '<style>\n' + LOCAL_FONTS, 1)
    return page.replace(THREE_CDN, 'three.min.js')

if __name__ == '__main__':
    page = assemble()
    out = ROOT / 'app/src/main/assets/index.html'; out.write_text(bundled(page)); print('built', out.relative_to(ROOT.parent))
    if '--preview' in sys.argv:
        p = pathlib.Path(sys.argv[sys.argv.index('--preview') + 1]); p.write_text(page); print('preview', p)
