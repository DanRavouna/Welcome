"""The battery test (Settings > Battery test), against a stand-in for the app's battery log (tests/batsource.js)."""
import pathlib
from sc import Game, check, done
SRC = (pathlib.Path(__file__).parent / 'batsource.js').read_text()
H = 3600000
def card(g): return g.js("(document.getElementById('batCard') || {}).innerText || ''")
def settings(g): g.js("document.getElementById('cfgBtn').click()"); g.wait(600)
with Game(init=SRC) as g:
    g.fresh(); settings(g)
    check('Settings has the battery test, ready to start', 'BATTERY TEST' in card(g) and 'Start' in card(g), card(g))
    g.js("document.getElementById('batBtn').click()"); g.wait(2500)
    check('Start: it records', 'RECORDING' in card(g) and g.js('window.__batState.running'), card(g))
    g.js("document.getElementById('cfgDone').click()"); g.wait(2500)            # the screen draws: frames are measured
    fr = g.js("(() => { const d = JSON.parse(localStorage.getItem('spaceCubeBattery.v1') || '{}'); return Object.values(d.frames || {}).reduce((a, b) => a + b[0], 0); })()")
    settings(g); g.wait(5600)
    fr2 = g.js("(() => { const d = JSON.parse(localStorage.getItem('spaceCubeBattery.v1') || '{}'); return Object.values(d.frames || {}).reduce((a, b) => a + b[0], 0); })()")
    check("the screen's own work is measured frame by frame while it records", max(fr, fr2) > 20 or 'FRAME WORK' in card(g) and 'ms' in card(g), (fr, fr2, card(g)))
    g.js("document.getElementById('batBtn').click()"); g.wait(600)
    check('Stop: the results show', 'ON SCREEN' in card(g) and 'Start again' in card(g), card(g))
    # the sums, on known readings: 1 h on screen (85 -> 78 %, 420 mAh), 30 min plugged in (left out), 1 h off screen (78 -> 76 %, 95 mAh)
    t0 = 1795000000000
    plant = [dict(t=t0, level=85, charge=4000000, now=0, plugged=False, on=True), dict(t=t0 + H // 2, level=81.5, charge=3790000, now=0, plugged=False, on=True),
             dict(t=t0 + H, level=78, charge=3580000, now=0, plugged=False, on=False), dict(t=t0 + int(1.5 * H), level=90, charge=4200000, now=0, plugged=True, on=False),
             dict(t=t0 + 2 * H, level=90, charge=4200000, now=0, plugged=False, on=False), dict(t=t0 + 3 * H, level=88, charge=4105000, now=0, plugged=False, on=False)]
    r = g.pg.evaluate('p => window.__batSummary({ samples: p }, { 1: [100, 800, 30, 1650] })', plant)
    check('on screen: 1 h, 7 % an hour, 420 mA', abs(r['on']['hours'] - 1) < 1e-9 and abs(r['on']['perHour'] - 7) < 1e-9 and abs(r['on']['mA'] - 420) < 1e-6, r['on'])
    check('off screen: 1 h, 2 % an hour, 95 mA (charging left out)', abs(r['off']['hours'] - 1) < 1e-9 and abs(r['off']['perHour'] - 2) < 1e-9 and abs(r['off']['mA'] - 95) < 1e-6, r['off'])
    check('the plugged-in hour is counted apart', abs(r['plugged'] - 1) < 1e-9, r['plugged'])
    check('frame work: 8 ms average, 30 ms worst, about 61 frames a second', abs(r['work'] - 8) < 1e-9 and r['worst'] == 30 and abs(r['fps'] - 100 / 1.65) < 1e-6, r)
    g.pg.evaluate('p => window.__batPlant(p)', plant); g.js("document.getElementById('cfgDone').click()"); g.wait(500); settings(g)
    c = card(g)
    check('the results card shows those numbers', '7.0%' in c and '2.0%' in c and '420 mA' in c and '95 mA' in c and 'plugged in, left out' in c, c)
    check('...and the graph', g.js("!!document.querySelector('#batCard svg polyline')"))
with Game() as g:
    g.fresh(); settings(g)
    check('no battery log here: it says where the test runs', 'runs on the phone' in card(g), card(g))
done()
