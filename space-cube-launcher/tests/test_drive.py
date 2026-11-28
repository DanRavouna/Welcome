"""Driving the ship: the pedal (hold to fly forward), the fire button and its reticle, gyro steering while driving. Sampled over real time."""
import math
from sc import Game, check, done
DD = lambda g: g.js('window.__driveDebug()')
def press(g, sel):
    b = g.js(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }})()")
    g.pg.mouse.move(*b); g.pg.mouse.down(); return b
def gyro(g, alpha=0, beta=0, gamma=0, ms=500):    # devicemotion events every 16 ms, as a phone sends them
    g.pg.evaluate("""([a, b, c, ms]) => new Promise(res => { const t0 = performance.now(); const iv = setInterval(() => {
      window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: a, beta: b, gamma: c }, interval: 16 }));
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 16); })""", [alpha, beta, gamma, ms])
with Game() as g:
    g.fresh(); g.wait(1500)
    d = DD(g); check('home: the pedal and fire buttons show, nothing is driving', not d['hidden'] and not d['driving'] and not d['listening'], d)
    q0 = DD(g)['q']; gyro(g, beta=90, ms=400); q1 = DD(g)['q']
    check('untouched: turning the phone does nothing (the gyro is not even listened to)', max(abs(a - b) for a, b in zip(q0, q1)) < 0.01 and not DD(g)['listening'], (q0, q1))
    # the pedal, over real time, facing the planet
    g.js("window.__face('body')"); g.wait(300)
    d0 = DD(g)['bodyDist']; press(g, '#drivePedal'); samples = []
    for i in range(15): g.wait(200); samples.append(DD(g)['bodyDist'])
    check('hold the pedal: the ship flies forward, closer and closer, smoothly', samples[-1] < d0 * 0.9 and all(b <= a + 1e-6 for a, b in zip(samples, samples[1:])), [round(s, 2) for s in [d0] + samples])
    check('...the dots speed up and the gyro listens', DD(g)['navWarp'] > 2 and DD(g)['listening'], DD(g))
    for i in range(25): g.wait(1000)            # 30 s in all, straight at the planet
    dmin = DD(g)['bodyDist']; g.pg.mouse.up()
    check('held for 30 s straight at the planet: it never gets inside it', dmin > 0, dmin)
    g.wait(1500); d = DD(g)
    check('let go: the ship stops, the dots calm down', d['thr'] == 0 and d['navWarp'] == 1 and not d['owning'], d)
    # gyro while driving: a turn in the camera's frame; and a yaw while looking 80 deg up stays a yaw
    dot = lambda a, b: sum(x * y for x, y in zip(a, b))
    cross = lambda a, b: [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
    f0, u0 = DD(g)['fwd'], DD(g)['up']; right0 = cross(f0, u0); gyro(g, beta=90, ms=500); f1 = DD(g)['fwd']
    check('turning the phone right (positive beta, as Dan\'s phone sends it) turns the view right', dot(f1, right0) > 0.3, dot(f1, right0))
    f2, u2 = DD(g)['fwd'], DD(g)['up']; gyro(g, alpha=-60, ms=300); f3 = DD(g)['fwd']
    check('tilting up comes in as alpha (as on Dan\'s phone) and turns the view up, not round', dot(f3, u2) > 0.2 and abs(dot(DD(g)['up'], cross(f2, u2))) < 0.05, (dot(f3, u2), dot(DD(g)['up'], cross(f2, u2))))
    gyro(g, alpha=60, ms=300)
    ang = math.degrees(math.acos(max(-1, min(1, sum(a * b for a, b in zip(f0, f1))))))
    check('driving: turning the phone turns the view (about 45 deg for 90 deg/s over half a second)', 30 < ang < 60, ang)
    gyro(g, alpha=-160, ms=500); up = DD(g)['up']
    fa = DD(g)['fwd']; gyro(g, beta=90, ms=500); fb = DD(g)['fwd']
    elev = lambda f: math.degrees(math.asin(max(-1, min(1, sum(a * b for a, b in zip(f, up))))))
    check('...a turn while looking up stays a turn around your own up (no swirl)', abs(elev(fa)) < 3 and abs(elev(fb)) < 3, (elev(fa), elev(fb)))
    # fire and reticle
    check('no reticle before shooting', not DD(g)['reticle'])
    b0 = DD(g)['bolts']; press(g, '#driveFire'); g.wait(80); g.pg.mouse.up(); g.wait(100)
    check('tap FIRE: twin lasers fly and the reticle shows', DD(g)['shots'] == 1 and DD(g)['bolts'] >= b0 + 2 and DD(g)['reticle'], DD(g))
    press(g, '#driveFire'); g.wait(700); g.pg.mouse.up()
    check('hold FIRE: it keeps firing', DD(g)['shots'] >= 4, DD(g)['shots'])
    g.wait(6000); press(g, '#driveFire'); g.wait(60); g.pg.mouse.up(); g.wait(6000)
    check('another shot restarts the 10 s', DD(g)['reticle'])
    g.wait(4600); check('10 s after the last shot the reticle is gone', not DD(g)['reticle'])
    g.wait(500); check('...and driving ends: the gyro is no longer listened to', not DD(g)['listening'] and not DD(g)['driving'], DD(g))
    # everything else still works after driving
    g.fly('TITAN'); check('after driving: a flight to a moon still works', g.js('window.__navDebug()')['target'] == 'TITAN')
    g.js("window.__deepGo('pl:JUPITER')"); g.wait_warp(); check('...a warp still works', g.where() == ('sol', 'JUPITER'))
    g.reload(); check('...and a reload', g.where() == ('sol', 'JUPITER'))
    # no gyro events at all (as here): after 2 s of driving a note says so
    press(g, '#drivePedal'); g.wait(2600); n = DD(g)['gyroNote']; g.pg.mouse.up()
    check('no gyro signal: after 2 s of driving a note says so', n)
done()
