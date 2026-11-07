# The shelf page (root index.html): the cartridges, the bar, the keyboard, the record this device holds, and the link into Critter Roll.
# Runs WITHOUT the seed hook (run-tests.sh lists it): the shelf reads the game's local save to show a record, so it starts from a clean device.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
SHELF = 'file:///mnt/user-data/outputs/shelf.html'
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, want in [(1280, 800, 10), (390, 844, 3)]:
        pg = b.new_page(viewport={'width': w, 'height': h}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(SHELF); pg.wait_for_timeout(400)
        cols = pg.evaluate("getComputedStyle(document.getElementById('shelf')).gridTemplateColumns.split(' ').length")
        check('%dx%d: no page errors' % (w, h), not errs, errs)
        check('%dx%d: %d columns' % (w, h, want), cols == want, cols)
        check('%dx%d: no horizontal scroll' % (w, h), pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
        n = pg.evaluate('window.__shelf.games'); slots = pg.evaluate("document.querySelectorAll('.cart').length")
        check('%dx%d: one game on the shelf' % (w, h), n == 1, n)
        check('%dx%d: shelf filled to %d slots' % (w, h, pg.evaluate('window.__shelf.slots')), slots == pg.evaluate('window.__shelf.slots'), slots)
        bar = pg.inner_text('#bar').split('\n')
        check('%dx%d: the bar names the first cartridge' % (w, h), bar[0].strip().upper() == '01 CRITTER ROLL', bar)
        check('%dx%d: no record on a clean device' % (w, h), pg.evaluate('window.__shelf.record()') == '-No record-', pg.evaluate('window.__shelf.record()'))
        pg.close()
    pg = b.new_page(viewport={'width': 1280, 'height': 800}); pg.goto(SHELF); pg.wait_for_timeout(300)
    # the record comes from the game's own local save
    pg.evaluate("localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:1},{seed:2},{seed:3}],essence:0}))"); pg.reload(); pg.wait_for_timeout(300)
    check('a save with three critters shows as a record', pg.evaluate('window.__shelf.record()') == '3 kept', pg.evaluate('window.__shelf.record()'))
    pg.evaluate("localStorage.removeItem('critter-roll:v2')")
    # keyboard: the arrows select, Enter opens
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(100)
    check('ArrowRight focuses the cartridge', pg.evaluate("document.activeElement && document.activeElement.id") == 'g1', pg.evaluate("document.activeElement && document.activeElement.id"))
    # accessibility: axe finds nothing to report
    pg.add_script_tag(path='/tmp/node_modules/axe-core/axe.min.js'); pg.wait_for_timeout(200)
    v = pg.evaluate("axe.run(document, {runOnly: ['wcag2a', 'wcag2aa']}).then(r => r.violations.map(x => x.id + ':' + x.nodes.length))")
    check('axe: no violations', not v, v)
    # the cartridge opens the game at its new path, and the game shows its title screen (the lit window) with the vendored library beside it
    pg.keyboard.press('Enter'); pg.wait_for_url('**/games/critter-roll/index.html', timeout=5000); pg.wait_for_timeout(1500)
    check('Enter opens Critter Roll', pg.url.endswith('/games/critter-roll/index.html'), pg.url)
    check('the title screen shows the lit window', pg.evaluate("!document.getElementById('title').hidden && !!document.getElementById('title-light')"))
    check('the vendored Supabase library loads beside the game', pg.evaluate("!window.__supaFailed && typeof window.supabase !== 'undefined'"))
    b.close()
done()
