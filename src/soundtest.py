# The sound editor (studio/sound.js): a placeholder track, notes placed, held and cleared on the grid, channels, the
# synth's step counter advancing over real time while the preview plays, and sounds from presets with editable notes.
# Headless Chromium has no speaker: what is checked is the data and the scheduler's clock, not what it sounds like.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = 8798
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = 'http://127.0.0.1:%d/studio/index.html' % PORT
def grid(pg, step, row):
    pg.locator('#sd-grid').scroll_into_view_if_needed()
    r = pg.evaluate("(() => { const r = document.getElementById('sd-grid').getBoundingClientRect(); return [r.left, r.top]; })()")
    pg.mouse.click(r[0] + 30 + step * 14 + 7, r[1] + (24 - 1 - row) * 12 + 6)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); c = b.new_context(viewport={'width': 390, 'height': 760}); c.add_init_script('window.__studioTest = true;'); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_selector('#n-go', timeout=5000); pg.fill('#n-name', 'Sound Game'); pg.click('#n-go'); pg.wait_for_selector('#r-s')
        pg.click('#tabs button[data-t="sound"]'); pg.wait_for_selector('#sd-new', timeout=5000)
        pg.click('#sd-new'); pg.wait_for_selector('#f-name'); pg.fill('#f-name', 'field'); pg.fill('#f-bpm', '120'); pg.click('#sh-ok'); pg.wait_for_selector('#sd-grid')
        t = pg.evaluate('STUDIO.game.tracks.field')
        check('a new track starts from a placeholder tune with two channels at the chosen tempo', t['bpm'] == 120 and len(t['channels']) == 2 and len(t['channels'][0]['notes'].split()) == 32, (t['bpm'], len(t['channels'])))
        pg.click('#sd-body .tools button[data-t="rest"]'); pg.evaluate("(() => { const ch = STUDIO.game.tracks.field.channels[0]; ch.notes = Array(32).fill('.').join(' '); STUDIO_SND.drawGrid(); })()")
        pg.click('#sd-body .tools button[data-t="note"]'); grid(pg, 0, 0); grid(pg, 4, 7)
        tk = pg.evaluate('STUDIO.game.tracks.field.channels[0].notes').split()
        check('tapping the grid places notes: C3 at step 0 and G3 at step 4 (octave 3 at the bottom)', tk[0] == 'C3' and tk[4] == 'G3', tk[:6])
        pg.click('#sd-body .tools button[data-t="hold"]'); grid(pg, 1, 0); grid(pg, 2, 0)
        tk = pg.evaluate('STUDIO.game.tracks.field.channels[0].notes').split()
        check('hold stretches the note over the next steps', tk[1] == '-' and tk[2] == '-', tk[:4])
        pg.click('#sd-body .tools button[data-t="note"]'); grid(pg, 0, 0)
        check('tapping a placed note again clears it', pg.evaluate('STUDIO.game.tracks.field.channels[0].notes').split()[0] == '.')
        pg.click('#sd-octup'); grid(pg, 8, 0)
        check('octave up places the same row an octave higher', pg.evaluate('STUDIO.game.tracks.field.channels[0].notes').split()[8] == 'C4')
        pg.click('#sd-chadd'); pg.wait_for_selector('#sd-grid')
        check('a channel can be added and becomes the one edited', pg.evaluate('STUDIO.game.tracks.field.channels.length') == 3 and pg.evaluate('STUDIO_SND.ch') == 2)
        pg.select_option('#sd-wave', 'noise'); pg.wait_for_selector('#sd-grid'); grid(pg, 0, 5)
        check('a noise channel hits on any row', pg.evaluate('STUDIO.game.tracks.field.channels[2].notes').split()[0] == 'C4' and pg.evaluate('STUDIO.game.tracks.field.channels[2].wave') == 'noise')
        # the preview: the synth's step counter advances over real time at the tempo (120 bpm, 2 steps a beat = 4 steps a second)
        pg.click('#sd-play'); pg.wait_for_timeout(300)
        s0 = pg.evaluate('ENGINE.audio.step'); t0 = time.time(); pg.wait_for_timeout(1500); s1 = pg.evaluate('ENGINE.audio.step'); dt = time.time() - t0
        rate = (s1 - s0) / dt if dt else 0
        check('while playing, the synth schedules about four steps a second over real time', 2.5 <= rate <= 6.5, 'rate=%.1f steps/s (ac may be suspended in headless)' % rate)
        pg.click('#sd-play'); pg.wait_for_timeout(100)
        check('stop clears the playing track', pg.evaluate('ENGINE.audio.current') is None)
        # sounds
        pg.click('#sd-kind button[data-k="sounds"]'); pg.wait_for_selector('#sd-new'); pg.click('#sd-new'); pg.wait_for_selector('#f-name'); pg.fill('#f-name', 'tap'); pg.select_option('#f-preset', 'rise'); pg.click('#sh-ok'); pg.wait_for_selector('#sn-play')
        snd = pg.evaluate('STUDIO.game.sounds.tap')
        check('a new sound starts from the chosen preset', snd['wave'] == 'square' and len(snd['notes']) == 4, snd)
        pg.click('#sn-add'); pg.wait_for_selector('#sn-play'); pg.fill('#sn-notes input[data-i="4"][data-k="0"]', '990'); pg.evaluate("document.querySelector('#sn-notes input[data-i=\"4\"][data-k=\"0\"]').dispatchEvent(new Event('input'))")
        check('a note can be added and its pitch edited', pg.evaluate('STUDIO.game.sounds.tap.notes[4][0]') == 990)
        pg.click('#sn-play'); pg.wait_for_timeout(200)
        check('the data round-trips', pg.evaluate('ENGINE.roundTrip(STUDIO.game)'))
        check('no page errors through the run', not errs, errs)
        b.close()
finally:
    srv.terminate()
done()
