# The studio (studio/): the gate without the owner, the list, a new game, the road, the map editor (paint, place a
# person, an exit, the spawn), the check (references and walkability), the file round trip, play inside, and the draft
# surviving a reload. Runs without the seed hook; the owner's sign-in is replaced by the test hook (local drafts only).
import os, sys, subprocess, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = 8794
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = 'http://127.0.0.1:%d/studio/index.html' % PORT
def tap_map(pg, x, y):
    """Tap tile (x, y) of the map canvas through the wrap's pointer events, as a finger would."""
    box = pg.evaluate("(() => { const r = document.getElementById('mapwrap').getBoundingClientRect(); const S = STUDIO.S; return { l: r.left, t: r.top, px: S.px, py: S.py, z: S.zoom, tile: STUDIO.game.tile }; })()")
    cx = box['l'] + box['px'] + (x + 0.5) * box['tile'] * box['z']; cy = box['t'] + box['py'] + (y + 0.5) * box['tile'] * box['z']
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.up()
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        # 1. the gate: without the owner's session the app stays hidden
        c0 = b.new_context(viewport={'width': 390, 'height': 760}); pg0 = c0.new_page(); pg0.goto(URL); pg0.wait_for_timeout(800)
        check('without sign-in the gate shows and the app is hidden', pg0.evaluate("!document.getElementById('gate').hidden && document.getElementById('app').hidden"))
        c0.close()
        # 2. as the owner (test hook): a new game
        c = b.new_context(viewport={'width': 390, 'height': 760}); c.add_init_script('window.__studioTest = true;'); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_selector('#n-go', timeout=5000)
        check('the owner sees the list', pg.evaluate("document.getElementById('gate').hidden && !document.getElementById('app').hidden"))
        pg.fill('#n-name', 'Test Game'); pg.click('#n-go'); pg.wait_for_selector('#r-s', timeout=5000)
        check('a new game opens on the road tab', pg.evaluate("STUDIO.game && STUDIO.game.id === 'test-game' && STUDIO.game.tile === 16"))
        pg.fill('#r-s', 'A truth about people.'); pg.fill('#r-a', 'The last act.'); pg.click('#r-add'); pg.wait_for_selector('#f-name')
        pg.fill('#f-name', 'First station'); pg.fill('#f-meaning', 'What it says'); pg.fill('#f-hint', 'Where it is glimpsed'); pg.fill('#f-act', 'What the player does'); pg.click('#sh-ok'); pg.wait_for_timeout(100)
        st = pg.evaluate('STUDIO.game.road')
        check('the road holds the sentence, the act and one station', st['sentence'] == 'A truth about people.' and st['act'] == 'The last act.' and len(st['stations']) == 1 and st['stations'][0]['id'] == 'first-station', st)
        # 3. the map editor
        pg.click('#tabs button[data-t="maps"]'); pg.wait_for_selector('#mapwrap', timeout=5000); pg.wait_for_timeout(200)
        check('the map canvas shows the placeholder map', pg.evaluate("document.getElementById('mapcv').width === 16 * 16 && document.getElementById('mapcv').height === 12 * 16"))
        pg.evaluate("STUDIO.S.tile = 1"); tap_map(pg, 5, 5); pg.wait_for_timeout(100)
        check('a tap with the tile tool paints the wall tile', pg.evaluate("STUDIO.game.maps.first.ground[5][5]") == '1')
        pg.click('#m-undo'); pg.wait_for_timeout(50)
        check('undo paints it back', pg.evaluate("STUDIO.game.maps.first.ground[5][5]") == '0')
        pg.click('#m-tools button[data-t="person"]'); tap_map(pg, 8, 6); pg.wait_for_selector('#f-name', timeout=3000)
        pg.fill('#f-name', 'Someone'); pg.fill('#f-lines', 'Hello.\nYou must press the button.'); pg.click('#sh-ok'); pg.wait_for_timeout(100)
        ppl = pg.evaluate('STUDIO.game.maps.first.people')
        check('the person tool places a person with two lines', len(ppl) == 1 and ppl[0]['x'] == 8 and ppl[0]['y'] == 6 and len(ppl[0]['lines']) == 2, ppl)
        pg.click('#m-tools button[data-t="spawn"]'); tap_map(pg, 2, 2); pg.wait_for_timeout(50)
        check('the spawn tool moves the start', pg.evaluate('STUDIO.game.maps.first.spawn') == [2.5, 2.5])
        pg.click('#m-new'); pg.wait_for_selector('#f-name'); pg.fill('#f-name', 'Room'); pg.fill('#f-w', '8'); pg.fill('#f-h', '6'); pg.click('#sh-ok'); pg.wait_for_timeout(200)
        check('a second map exists and is selected', pg.evaluate("STUDIO.S.map === 'room' && STUDIO.game.maps.room.w === 8"))
        pg.select_option('#m-sel', 'first'); pg.wait_for_timeout(200)
        pg.click('#m-tools button[data-t="exit"]'); tap_map(pg, 15, 6); pg.wait_for_selector('#f-to', timeout=3000); pg.click('#sh-ok'); pg.wait_for_timeout(100)
        ex = pg.evaluate('STUDIO.game.maps.first.exits')
        check('the exit tool places an exit to the other map', len(ex) == 1 and ex[0]['to'] == 'room', ex)
        # 4. the check: a telling line and an exit in the wall are found; after fixing, nothing is left but the art
        issues = pg.evaluate('STUDIO.allIssues()')
        check('the check finds the line that tells', any('tells' in i for i in issues), issues)
        check('the check finds the exit sitting in the wall and unreachable', any('solid' in i for i in issues) and any('cannot be reached' in i for i in issues), issues)
        pg.evaluate("STUDIO.game.maps.first.people[0].lines = ['Hello.']; STUDIO.game.maps.first.exits[0].x = 14; STUDIO.game.maps.first.exits[0].y = 6")
        issues = pg.evaluate('STUDIO.allIssues()')
        check('after the fixes only the missing art and the empty station remain', all(('no art' in i) or ('no map plays' in i) for i in issues), issues)
        # 5. file round trip
        check('the draft round-trips as JSON', pg.evaluate('ENGINE.roundTrip(STUDIO.game)'))
        # 6. play inside the studio: the draft runs, the bot walks, the person speaks
        pg.click('#tabs button[data-t="play"]'); pg.wait_for_selector('#p-go'); pg.click('#p-go'); pg.wait_for_function('window.ENGINE && ENGINE.map()', timeout=5000); pg.wait_for_timeout(200)
        pos = pg.evaluate('ENGINE.pos()'); check('play starts at the spawn of the first map', pos['map'] == 'first' and abs(pos['x'] - 2.5) < 0.01, pos)
        pg.evaluate('ENGINE.input(1,0)'); pg.wait_for_timeout(600); pg.evaluate('ENGINE.input(0,0)')
        check('the player walks in the draft', pg.evaluate('ENGINE.pos()')['x'] > 3.5, pg.evaluate('ENGINE.pos()'))
        pg.evaluate("ENGINE.teleport('first', 8.5, 7.5, 'up')"); pg.wait_for_timeout(700); pg.evaluate('ENGINE.act()'); pg.wait_for_timeout(100)
        d = pg.evaluate('ENGINE.dialog()'); check('the placed person speaks in play', d and d['text'] == 'Hello.', d)
        # 7. the draft survives a reload and is listed
        pg.wait_for_timeout(600); pg.reload(); pg.wait_for_selector('#glist', timeout=5000)
        check('the draft is listed after a reload', 'Test Game' in pg.inner_text('#glist'))
        check('no page errors through the run', not errs, errs)
        b.close()
finally:
    srv.terminate()
done()
