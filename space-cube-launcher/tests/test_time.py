"""The time model (catalogue): where things are today. Checked against JPL Horizons for one fixed date."""
from sc import Game, check, done
with Game() as g:
    g.fresh()
    # JPL Horizons, Jupiter seen from the Sun, 2026-Nov-24 00:00 UT: ecliptic longitude 135.42 deg (looked up 2026-11-23)
    lon = g.js("(() => { const q = CAT.byId.get('pl:JUPITER'), d = Date.UTC(2026, 10, 24) / 86400000 + 2440587.5 - 2451545; return ((CAT.helio(q.orbit, d).lon * 180 / Math.PI) % 360 + 360) % 360; })()")
    check('Jupiter on 2026-11-24 is within 0.5 deg of JPL Horizons', abs(lon - 135.42) < 0.5, round(lon, 2))
    sol = g.js("CAT.sol.planets.map(q => [q.name, q.ph, q.auNow, !!q.phReal])")
    check('all 8 of our planets are placed from real elements', len(sol) == 8 and all(p[3] and p[2] for p in sol), sol)
    check('the home planet is the reference line (angle 0)', [p[1] for p in sol if p[0] == 'SATURN'] == [0])
    check('real distances are near the orbit sizes', all(abs(p[2] / a - 1) < 0.25 for p, a in zip(sol, g.js('CAT.sol.planets.map(q => q.au)'))))
    m1 = g.js("CAT.sol.planets.filter(q => q.moons).flatMap(q => q.moons.map(m => [m.name, m.ph]))")
    g.reload(); m2 = g.js("CAT.sol.planets.filter(q => q.moons).flatMap(q => q.moons.map(m => [m.name, m.ph]))")
    check('moons are placed by the date, not at random', len(m1) == 12 and all(abs(a[1] - b[1]) < 5 or abs(abs(a[1] - b[1]) - 360) < 5 for a, b in zip(m1, m2)), (m1[:3], m2[:3]))
    check('other stars\' planets are marked as not real positions', g.js("!CAT.byId.get('pl:Proxima Cen b').phReal"))
done()
