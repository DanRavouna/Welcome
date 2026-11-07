# The pixel editor (studio/pixels.js): tiles, pen, fill, mirror, undo, frames and fps, the preview animating over
# real time, a sprite body started from the placeholder, the palette, and the drawn tile reaching the map and the game.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = 8796
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = 'http://127.0.0.1:%d/studio/index.html' % PORT
def px(pg, x, y, drag_to=None):
    r = pg.evaluate("(() => { const r = document.getElementById('px-cv').getBoundingClientRect(); return [r.left, r.top, STUDIO_PX.z]; })()")
    pg.mouse.move(r[0] + (x + 0.5) * r[2], r[1] + (y + 0.5) * r[2]); pg.mouse.down()
    if drag_to: pg.mouse.move(r[0] + (drag_to[0] + 0.5) * r[2], r[1] + (drag_to[1] + 0.5) * r[2], steps=6)
    pg.mouse.up()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); c = b.new_context(viewport={'width': 390, 'height': 760}); c.add_init_script('window.__studioTest = true;'); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_selector('#n-go', timeout=5000); pg.fill('#n-name', 'Pixel Game'); pg.click('#n-go'); pg.wait_for_selector('#r-s')
        pg.click('#tabs button[data-t="pixels"]'); pg.wait_for_selector('#px-cv', timeout=5000)
        check('the tiles list shows the two starting tiles and the first is open', pg.evaluate("document.querySelectorAll('#px-list button[data-id]').length") == 2 and pg.evaluate('STUDIO_PX.id') == 'ground')
        check('a tile with no art gets one blank frame to draw on', pg.evaluate("STUDIO.game.tiles.ground.frames.length === 1 && STUDIO.game.tiles.ground.frames[0].length === 16"))
        pg.click('#px-pal button[data-c="2"]'); px(pg, 3, 4)
        check('the pen writes the chosen colour at the pixel', pg.evaluate("STUDIO.game.tiles.ground.frames[0][4][3]") == '2')
        px(pg, 0, 0, drag_to=(15, 0))
        check('a drag draws a line of pixels', pg.evaluate("STUDIO.game.tiles.ground.frames[0][0]") == '2' * 16)
        pg.click('#px-mirror'); px(pg, 1, 8)
        check('mirror writes the opposite pixel too', pg.evaluate("STUDIO.game.tiles.ground.frames[0][8][1] === '2' && STUDIO.game.tiles.ground.frames[0][8][14] === '2'"))
        pg.click('#px-mirror'); pg.click('#px-undo')
        check('undo takes the last stroke back', pg.evaluate("STUDIO.game.tiles.ground.frames[0][8][1]") == '.')
        pg.click('#px-tools button[data-t="fill"]'); pg.click('#px-pal button[data-c="1"]'); px(pg, 8, 8)
        check('fill floods the empty area and stops at the drawn line', pg.evaluate("STUDIO.game.tiles.ground.frames[0][8][8] === '1' && STUDIO.game.tiles.ground.frames[0][0][0] === '2' && STUDIO.game.tiles.ground.frames[0][4][3] === '2'"))
        pg.click('#px-tools button[data-t="pick"]'); px(pg, 3, 4)
        check('pick takes the colour under the finger', pg.evaluate('STUDIO_PX.col') == 2)
        # frames and the preview over real time
        pg.click('#px-fdup'); pg.wait_for_selector('#px-cv'); pg.fill('#px-fps', '8'); pg.evaluate("document.getElementById('px-fps').dispatchEvent(new Event('input'))")
        check('duplicate adds a second frame and fps is kept', pg.evaluate("STUDIO.game.tiles.ground.frames.length === 2 && STUDIO.game.tiles.ground.fps === 8"))
        pg.click('#px-play'); log = pg.evaluate('''new Promise(r => { const out = []; const t0 = performance.now(); const f = () => { out.push([Math.round(performance.now() - t0), STUDIO_PX.frameIndex()]); if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(out); }; requestAnimationFrame(f); })''')
        pg.click('#px-play')
        idx = [i for _, i in log]; steps = sum(1 for k in range(1, len(idx)) if idx[k] != idx[k - 1])
        check('the preview advances about eight frames a second over real time', 6 <= steps <= 10, 'steps=%d in %d ms' % (steps, log[-1][0] if log else 0))
        # a sprite body from the placeholder
        pg.click('#px-kind button[data-k="sprites"]'); pg.wait_for_selector('#px-new'); pg.click('#px-new'); pg.wait_for_selector('#f-name'); pg.fill('#f-name', 'hero'); pg.click('#sh-ok'); pg.wait_for_selector('#px-cv')
        s = pg.evaluate('STUDIO.game.sprites.hero')
        check('the body sprite has idle and walk for four facings, three walk frames each', sorted(s['anims']) == sorted(['idle-down', 'idle-up', 'idle-left', 'idle-right', 'walk-down', 'walk-up', 'walk-left', 'walk-right']) and len(s['anims']['walk-down']['frames']) == 3, sorted(s['anims']))
        filled = sum(1 for row in s['anims']['walk-down']['frames'][0] for ch in row if ch != '.')
        check('starting from the placeholder fills pixels, matched to the palette', filled > 60 and all(ch == '.' or ch in '0123456789abcdefghijklmnopqrstuvwxyz' for row in s['anims']['walk-down']['frames'][0] for ch in row), filled)
        check('the palette grew with the placeholder colours but stays within 36', 12 < len(pg.evaluate('STUDIO.game.palette')) <= 36, len(pg.evaluate('STUDIO.game.palette')))
        pg.select_option('#px-anim', 'walk-left'); pg.wait_for_selector('#px-cv')
        check('choosing an animation opens its frames', pg.evaluate("STUDIO_PX.anim === 'walk-left' && STUDIO_PX.frame === 0"))
        # the palette tab
        pg.click('#px-kind button[data-k="palette"]'); pg.wait_for_selector('#pal-list'); pg.click('#pal-list button[data-c="2"]'); pg.wait_for_selector('#f-hex'); pg.fill('#f-hex', '#ff00ff'); pg.click('#sh-ok'); pg.wait_for_timeout(100)
        check('a palette colour can be changed', pg.evaluate('STUDIO.game.palette[2]') == '#ff00ff')
        # the drawn tile reaches the map view and the engine
        pg.click('#tabs button[data-t="maps"]'); pg.wait_for_selector('#mapcv'); pg.wait_for_timeout(200)
        pix = pg.evaluate("(() => { const g = document.getElementById('mapcv').getContext('2d'); const d = g.getImageData(16 + 3, 16 + 4, 1, 1).data; return [d[0], d[1], d[2]]; })()")
        check('the map shows the drawn pixel in the changed palette colour', pix == [255, 0, 255], pix)
        pg.click('#tabs button[data-t="play"]'); pg.wait_for_selector('#p-go'); pg.click('#p-go'); pg.wait_for_function('window.ENGINE && ENGINE.map()', timeout=5000); pg.wait_for_timeout(200)
        check('the game draws the hero sprite that was made (no placeholder body)', pg.evaluate("(() => { const c = ENGINE.spriteCanvas(ENGINE.game(), 'hero', 'walk-down', 0, 'down'); return c.width === 16 && c.height === 24; })()"))
        check('no page errors through the run', not errs, errs)
        b.close()
finally:
    srv.terminate()
done()
