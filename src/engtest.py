# The engine (engine/engine.js) through the player page with the demo game, over a local http server:
# the data round-trips, a bot walks with real time to the exit and back, talks, triggers once and while staying,
# answers a choice, the walk pose is logged against the clock, the save is written and restores, check() is clean.
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = 8791
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = 'http://127.0.0.1:%d/play/?g=demo' % PORT
def walk_to(pg, tx, ty, timeout=8.0):
    """Drive the input vector toward (tx, ty) in tiles until the feet point is within 0.25, over real time."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        p = pg.evaluate('ENGINE.pos()'); dx = tx - p['x']; dy = ty - p['y']
        if abs(dx) < 0.25 and abs(dy) < 0.25: pg.evaluate('ENGINE.input(0,0)'); return True
        if abs(dx) > 0.25: pg.evaluate('ENGINE.input(%f,0)' % (1 if dx > 0 else -1))
        else: pg.evaluate('ENGINE.input(0,%f)' % (1 if dy > 0 else -1))
        pg.wait_for_timeout(40)
    pg.evaluate('ENGINE.input(0,0)'); return False
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 760}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function('window.ENGINE && ENGINE.map()', timeout=5000); pg.wait_for_timeout(300)
        check('no page errors on load', not errs, errs)
        check('data round-trips as JSON with no code', pg.evaluate('ENGINE.roundTrip(ENGINE.game())'))
        issues = pg.evaluate('ENGINE.check(ENGINE.game())')
        check('check() reports only the tiles that have no art', all('no art' in i['msg'] for i in issues), issues)
        pos = pg.evaluate('ENGINE.pos()'); check('starts on the field at the spawn', pos['map'] == 'field' and abs(pos['x'] - 3.5) < 0.01 and abs(pos['y'] - 7.5) < 0.01, pos)
        check('scale fits about eleven tiles across the short side', 1 <= pg.evaluate('ENGINE.scale()') <= 3, pg.evaluate('ENGINE.scale()'))
        check('water is solid, grass is not', pg.evaluate('ENGINE.solidAt(3.5, 2.5)') and not pg.evaluate('ENGINE.solidAt(8.5, 9.5)'))
        # the walk pose over real time: 1.2 s of walking east along the path, log the frame against the clock
        pg.evaluate('ENGINE.input(1,0)'); log = pg.evaluate('''new Promise(r => { const out = []; const t0 = performance.now(); const f = () => { out.push([Math.round(performance.now() - t0), ENGINE.pose()]); if (performance.now() - t0 < 1200) requestAnimationFrame(f); else r(out); }; requestAnimationFrame(f); })''')
        pg.evaluate('ENGINE.input(0,0)')
        poses = [p_ for _, p_ in log]; changes = sum(1 for i in range(1, len(poses)) if poses[i] != poses[i - 1])
        check('the walk cycle advances over real time (about 6 frames a second)', 4 <= changes <= 10, 'changes=%d over %d ms' % (changes, log[-1][0] if log else 0))
        p1 = pg.evaluate('ENGINE.pos()'); check('walking east moved the player about four tiles a second', 3.5 < p1['x'] - 3.5 < 6.5, p1)
        # the once trigger at (3,4): walk there, it says a line, sets met, and the second person appears
        ok = walk_to(pg, 3.5, 4.5); pg.wait_for_timeout(100)
        d = pg.evaluate('ENGINE.dialog()'); check('the once trigger speaks as the feet enter its cell', bool(d and 'Water' in d['text']), d)
        pg.evaluate('ENGINE.advance()'); pg.wait_for_timeout(150)
        check('the trigger set its flag', pg.evaluate('ENGINE.flags()').get('met') is True, pg.evaluate('ENGINE.flags()'))
        check('a person with a condition appears once it holds', any(n['id'] == 'other' and n['on'] for n in pg.evaluate('ENGINE.people()')), pg.evaluate('ENGINE.people()'))
        pg.evaluate('ENGINE.input(0,1)'); pg.wait_for_timeout(300); pg.evaluate('ENGINE.input(0,-1)'); pg.wait_for_timeout(300); pg.evaluate('ENGINE.input(0,0)'); pg.wait_for_timeout(100)
        check('the once trigger does not fire again', pg.evaluate('ENGINE.dialog()') is None, (pg.evaluate('ENGINE.pos()'), pg.evaluate('ENGINE.people()')))
        # the choice: talk to the second person, pick Yes, they walk away and the script ends
        walk_to(pg, 5.5, 8.5); pg.evaluate("ENGINE.input(0,1)"); pg.wait_for_timeout(60); pg.evaluate('ENGINE.input(0,0)')
        near = pg.evaluate('ENGINE.nearest()'); check('the person below is the nearest in the facing direction', near and near['id'] == 'other', near)
        pg.evaluate('ENGINE.act()'); pg.wait_for_timeout(100); d = pg.evaluate('ENGINE.dialog()')
        check('the choice card shows two options', d and d['options'] == ['Yes', 'No'], d)
        pg.evaluate('ENGINE.advance(0)'); pg.wait_for_timeout(100); d = pg.evaluate('ENGINE.dialog()'); check('Yes jumps to the say step', d and d['text'] == 'Then stay.', d)
        pg.evaluate('ENGINE.advance()'); t0 = time.time(); pg.wait_for_function("!ENGINE.script()", timeout=4000); dt = time.time() - t0
        other = [n for n in pg.evaluate('ENGINE.people()') if n['id'] == 'other'][0]
        check('move walks the person to the tile over real time, then face turns them', abs(other['y'] - 11.5) < 0.05 and other['facing'] == 'up' and 0.4 < dt < 2.5, (other, round(dt, 2)))
        # the stay trigger: stand in the patch; every half second it counts; at four the tile changes and the post hides
        walk_to(pg, 14.5, 10.5); t0 = time.time(); pg.wait_for_function("ENGINE.flags().stayed >= 4", timeout=5000); dt = time.time() - t0
        check('staying counts over real time (four counts in about 1.5 to 2.5 s)', 1.2 < dt < 3.2, round(dt, 2))
        pg.wait_for_timeout(150)
        check('the tile step changed a tile and remembered it', pg.evaluate("ENGINE.save().tiles.field['9,4']") == 'path')
        check('the hide step hid the post, which is no longer solid', not pg.evaluate('ENGINE.solidAt(9.5, 4.5)'))
        # the exit east into the house, talk inside, and back
        walk_to(pg, 18.5, 6.5); pg.evaluate('ENGINE.input(1,0)'); pg.wait_for_function("ENGINE.map() === 'house'", timeout=4000); pg.evaluate('ENGINE.input(0,0)'); pg.wait_for_timeout(600)
        pos = pg.evaluate('ENGINE.pos()'); check('the exit leads into the house at its arrival tile', pos['map'] == 'house' and abs(pos['x'] - 1.5) < 0.3, pos)
        walk_to(pg, 5.5, 3.5); pg.evaluate('ENGINE.input(0,-1)'); pg.wait_for_timeout(60); pg.evaluate('ENGINE.input(0,0)'); pg.evaluate('ENGINE.act()'); pg.wait_for_timeout(100)
        d = pg.evaluate('ENGINE.dialog()'); check('talking inside shows the line', d and 'quiet' in d['text'], d); pg.evaluate('ENGINE.advance()')
        walk_to(pg, 1.5, 4.5); pg.evaluate('ENGINE.input(-1,0)'); pg.wait_for_function("ENGINE.map() === 'field'", timeout=4000); pg.evaluate('ENGINE.input(0,0)'); pg.wait_for_timeout(600)
        check('the way back lands on the field by the door', pg.evaluate('ENGINE.pos()')['map'] == 'field')
        # the save: written to localStorage, and a reload restores map, flags and the changed tile
        pg.evaluate('ENGINE.flushSave()'); pg.wait_for_timeout(100)
        sv = json.loads(pg.evaluate("localStorage.getItem('shelf:demo:save')") or 'null')
        check('the save holds map, flags, tiles and hidden', sv and sv['map'] == 'field' and sv['flags'].get('met') is True and sv['tiles']['field']['9,4'] == 'path' and sv['hidden'].get('post') is True, sv and list(sv))
        pg.reload(); pg.wait_for_function('window.ENGINE && ENGINE.map()', timeout=5000); pg.wait_for_timeout(300)
        check('a reload restores the flags and the hidden post', pg.evaluate('ENGINE.flags()').get('stayed', 0) >= 4 and not pg.evaluate('ENGINE.solidAt(9.5, 4.5)'))
        check('no page errors through the run', not errs, errs)
        b.close()
finally:
    srv.terminate()
done()
