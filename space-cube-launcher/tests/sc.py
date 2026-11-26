"""Shared by Space Cube's tests: opens the BUILT page (app/src/main/assets/index.html, the file the phone loads)
in a headless browser and offers small helpers. Tests use the page's own test hooks (see docs/architecture.md):
  __deepDebug()  where you are, whether a warp is running      __deepGo(id)       warp to a place or planet
  __deepFace(id) turn to face a place     __deepScr(id) -> [x, y, ...] its spot on screen
  __navList() / __navGo(NAME) / __navDebug()  flights inside the planet's system      __face('body'|'star')
  SpaceJump(id, planetName)  the map's jump      SpaceMap.debug() / selectId(id) / card() / groups()
"""
import os, pathlib, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / 'app/src/main/assets/index.html').as_uri()
ARGS = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
_failed = []
def check(name, cond, detail=''):
    print(('ok   ' if cond else 'FAIL ') + name + (' | ' + str(detail) if detail != '' else ''))
    if not cond: _failed.append(name)
    return cond
def done():
    if _failed: print('FAILED:', _failed); sys.exit(1)
    print('all ok')

class Game:
    """with Game() as g: ...   g.pg is the Playwright page; g.errors collects page errors."""
    def __init__(self, touch=False, init=None): self.touch = touch; self.init = init   # init: JavaScript run before the page loads (e.g. a stand-in calendar)
    def __enter__(self):
        self.pw = sync_playwright().start()
        exe = os.environ.get('SC_CHROME') or ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)
        self.b = self.pw.chromium.launch(executable_path=exe, args=ARGS) if exe else self.pw.chromium.launch(args=ARGS)
        self.ctx = self.b.new_context(viewport={'width': 390, 'height': 800}, has_touch=self.touch)
        if self.init: self.ctx.add_init_script(self.init)
        self.pg = self.ctx.new_page(); self.errors = []
        self.pg.on('pageerror', lambda e: self.errors.append(str(e)))
        self.pg.goto(PAGE); self.pg.wait_for_timeout(1500)
        return self
    def __exit__(self, *a):
        check('no page errors', not self.errors, self.errors if self.errors else '')
        self.b.close(); self.pw.stop()
    def js(self, code): return self.pg.evaluate(code)
    def wait(self, ms): self.pg.wait_for_timeout(ms)
    def fresh(self, saves=None):
        """Clear everything saved, optionally plant saves ({key: object}), reload and wait for the scene."""
        self.js('localStorage.clear()')
        for k, v in (saves or {}).items(): self.pg.evaluate('([k, v]) => localStorage.setItem(k, JSON.stringify(v))', [k, v])
        self.pg.reload(); self.wait(4500)
    def reload(self): self.pg.reload(); self.wait(4500)
    def where(self): d = self.js('window.__deepDebug()'); return (d['sys'], d['planet'])
    def wait_warp(self):
        for i in range(160):
            self.wait(100)
            if i > 8 and not self.js('window.__deepDebug()')['jumping']: break
        self.wait(500)
    def warp(self, place, planet=None):
        self.pg.evaluate('([a, b]) => window.SpaceJump(a, b)', [place, planet]); self.wait_warp()
    def fly(self, name):
        ok = self.pg.evaluate('n => window.__navGo(n)', name)
        for i in range(220):
            self.wait(150)
            if i > 6 and not self.js('window.__navDebug()')['travel']: break
        return ok
    def tags(self): return self.js("[...document.querySelectorAll('#hud g text')].filter(t => t.closest('g').style.display !== 'none' && !t.closest('.facts') && !t.closest('.lock')).map(t => t.textContent).filter(Boolean)")
    def facts(self): return self.js("[...document.querySelectorAll('#hud .facts text')].map(t => t.textContent).filter(Boolean)")
    def lock(self): return self.js("[...document.querySelectorAll('#hud .lock text')].map(t => t.textContent).join(' | ')")
    def state(self): return self.js("(() => { const s = CAT.state; return { sys: s.sys, planet: s.planet, nav: s.nav, limit: s.limit, visited: s.visited, scanned: [...s.scanned], seen: [...s.seen] }; })()")
    def card(self, id): self.pg.evaluate('i => SpaceMap.selectId(i)', id); self.wait(200); return [l for l in self.js('SpaceMap.card()').split('\n') if l.strip()]
