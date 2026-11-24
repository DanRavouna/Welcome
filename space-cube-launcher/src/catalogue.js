
// =========================================================
//  THE CATALOGUE: every place Space Cube knows, read once, used by the game and by the star map.
//  Built from the data block above (tools/build_catalog.py: NASA snapshot + catalog-hand.json).
//  One shape for every star system, ours included:
//    system { id, name, ra, dec, ly, teff, strad, spec, cat, ecliptic, always, home, planets[] }
//    planet { id, sys, name, cls, au, aue, ph, per, re, me, eqt, year, how, diamKm, + rgb, look, tag, major, home, side, eqRKm, polRKm, tiltDeg, rings, moons[] }
//    landmark { id, name, kind, ra, dec, ly, diamLy, type, note, mass, pal, always, look{} }
//  always: can be seen and reached from anywhere. look: what its close-up shows (see catalog-hand.json).
//  Units: ly between stars, AU inside a system, km for planet sizes. Views add their own positions; nothing here is changed by them.
// =========================================================
window.CAT = (() => {
  const raw = JSON.parse(document.getElementById('skyData').textContent);
  const KM_AU = 1.496e8, EARTH_R_KM = 6371;
  // Star categories: from the catalogued spectral type, else from temperature
  // (HyperPhysics: A and hotter >7,500 K, F 6,000-7,500, G 5,000-6,000, K 3,500-5,000, M <3,500; L, T, Y: brown dwarfs). Giants: luminosity class III, II or I.
  function starCat(spec, teff) {
    const sp = String(spec || '').trim();
    if (/^D/.test(sp)) return 'wd';
    if (/^[LTY]/.test(sp)) return 'brown';
    if (/(^|[^I])(III|II|Ia|Ib)([^I]|$)/.test(sp.replace(/IV/g, ''))) return 'giant';
    const L = sp.charAt(0).toUpperCase();
    if (L && 'OBA'.includes(L)) return 'hot';
    if (L === 'F') return 'white'; if (L === 'G') return 'sun'; if (L === 'K') return 'orange'; if (L === 'M') return 'red';
    const T = teff || 0;
    if (!T) return 'sun';
    return T >= 7500 ? 'hot' : T >= 6000 ? 'white' : T >= 5000 ? 'sun' : T >= 3500 ? 'orange' : T >= 2000 ? 'red' : 'brown';
  }
  function starRGB(teff) {                             // star temperature -> colour, 0..1 each (blackbody approximation)
    const T = (teff || 5800) / 100;
    const r = T <= 66 ? 255 : 329.698727446 * Math.pow(T - 60, -0.1332047592);
    const g = T <= 66 ? 99.4708025861 * Math.log(T) - 161.1195681661 : 288.1221695283 * Math.pow(T - 60, -0.0755148492);
    const b = T >= 66 ? 255 : T <= 19 ? 0 : 138.5177312231 * Math.log(T - 10) - 305.0447927307;
    return [r, g, b].map(v => Math.max(0, Math.min(255, v)) / 255);
  }
  const fmtLy = d => (d < 10 ? d.toFixed(2) : d < 1000 ? d.toFixed(1) : d < 1e6 ? Math.round(d).toLocaleString('en-US') : (d / 1e6).toFixed(1) + ' MILLION') + ' LY';
  const planetClass = re => !re || re < 1.6 ? 'rocky' : re < 4 ? 'subneptune' : re < 10 ? 'neptune' : 'giant';
  const CLASS_NAME = { rocky: 'ROCKY', subneptune: 'SUB-NEPTUNE', neptune: 'NEPTUNE-LIKE', giant: 'GAS GIANT' };
  const CLASS_LONG = { rocky: 'ROCKY PLANET', subneptune: 'SUB-NEPTUNE', neptune: 'NEPTUNE-LIKE PLANET', giant: 'GAS GIANT' };

  const sc = {}, pc = {}; raw.sysCols.forEach((c, i) => sc[c] = i); raw.plCols.forEach((c, i) => pc[c] = i);
  const byId = new Map();
  const systems = raw.systems.map(r => {
    const x = r[sc.x] || {};
    const s = { id: x.id || 'sys:' + r[sc.name], name: r[sc.name].toUpperCase(), ra: r[sc.ra], dec: r[sc.dec], ly: r[sc.ly],
      teff: r[sc.teff], strad: r[sc.strad], spec: r[sc.spec], cat: starCat(r[sc.spec], r[sc.teff]), ecliptic: !!x.ecliptic, always: !!x.always, home: !!x.home, planets: [] };
    byId.set(s.id, s); return s;
  });
  raw.planets.forEach(r => {
    const q = Object.assign({ id: 'pl:' + r[pc.name], name: r[pc.name], au: r[pc.au], aue: !!r[pc.aue], ph: r[pc.ph], per: r[pc.per], re: r[pc.re], me: r[pc.me],
      eqt: r[pc.eqt], year: r[pc.year], how: r[pc.how] }, r[pc.x] || {});
    if (!q.diamKm) q.diamKm = 2 * (q.re || 1) * EARTH_R_KM;
    if (!q.cls) q.cls = planetClass(q.re);         // rocky, subneptune, neptune or giant: from its size, unless the data says
    q.sys = systems[r[pc.sys]].id; systems[r[pc.sys]].planets.push(q); byId.set(q.id, q);
  });
  raw.landmarks.forEach(l => byId.set(l.id, l));
  const sol = systems.find(s => s.home);
  // ---- THE TIME MODEL: where every orbiting body is today. One rule, used by the game and by the map. ----
  //   Our planets: real. Kepler's equation on the JPL elements in the data (`orbit`), for today's date.
  //   Everything else (moons, other stars' planets): its real period where known, from an INVENTED starting point
  //   (nobody publishes where an exoplanet is on its orbit today; moon starting points are not in the data yet).
  //   ph: the body's angle on its orbit (deg), counted the way it moves, from the system's reference line
  //   (ours: the line from the Sun to the home planet). auNow: its real distance from its star today, where known.
  const NOW = new Date(), DAYS = NOW.getTime() / 86400000 + 2440587.5 - 2451545;      // days since J2000
  function helio(el, days) {                           // -> { lon: heliocentric ecliptic longitude (rad), r: distance (au) }
    const T = days / 36525, R = Math.PI / 180, v = i => el[i] + el[i + 6] * T;
    const a = v(0), e = v(1), I = v(2) * R, L = v(3), wb = v(4), Om = v(5), w = (wb - Om) * R, O = Om * R;
    const M = ((((L - wb) % 360) + 540) % 360 - 180) * R;
    let E = M + e * Math.sin(M); for (let i = 0; i < 10; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I);
    const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp, y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
    return { lon: Math.atan2(y, x), r: Math.hypot(xp, yp) };
  }
  const startDeg = name => { let h = 2166136261; for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 360; };
  const turn = (start, perDays) => (((start + (perDays ? 360 * DAYS / perDays : 0)) % 360) + 360) % 360;
  const homeEl = sol.planets.find(p => p.home).orbit, homeLon = helio(homeEl, DAYS).lon;   // the home planet's real longitude: also fixes how the sky is turned
  systems.forEach(s => s.planets.forEach(q => {
    if (q.orbit) { const h = helio(q.orbit, DAYS); q.ph = (((h.lon - homeLon) * 180 / Math.PI) % 360 + 360) % 360; q.auNow = h.r; q.phReal = true; }
    else q.ph = turn(q.ph, q.per);
    (q.moons || []).forEach(m => { m.ph = turn(startDeg(m.name), m.retro ? -m.perDays : m.perDays); });   // retro: it orbits backwards (Triton)
  }));
  systems.forEach(s => s.planets.sort((a, b) => a.au - b.au));
  const homePlanet = sol.planets.find(p => p.home).name;

  // ---- distances between places (ly), whatever way a view is turned ----
  const D2R = Math.PI / 180;
  const p3 = o => o._p || (o._p = [o.ly * Math.cos((o.dec || 0) * D2R) * Math.cos((o.ra || 0) * D2R), o.ly * Math.cos((o.dec || 0) * D2R) * Math.sin((o.ra || 0) * D2R), o.ly * Math.sin((o.dec || 0) * D2R)]);
  const dist = (a, b) => { const p = p3(a), q = p3(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

  // ---- THE STATE: where you are and what you know. One save, used by the game and by the map. ----
  //   sys + planet: the place you're in (a star system or a landmark) and, in a system, the planet you're at (null: at the star itself).
//   Home = our system's home planet. A jump to a star lands at the star; its planets are reached from there.
  //   visited: places you've been.  scanned: planets you've been to.  seen: places whose name tag you've seen but not visited.
  //   nav: the body you flew to inside the planet's system ({target, offset}), or null.
  //   dir, q: which way you arrived and were facing.  limit: how far out star dots are drawn (Settings).
  const KEY = 'spaceCube.state.v1';
  const state = { sys: sol.id, planet: homePlanet, dir: null, q: null, nav: null, limit: 50, visited: [sol.id], scanned: new Set(), seen: new Set() };
  const isPlace = id => { const o = byId.get(id); return !!o && !o.sys; };
  function load() {
    const get = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
    let d = get(KEY); const v1 = !!d;
    if (!d) {                                          // saves from before the single state: the game's place and the map's lists
      const g = get('spaceCubeDeep.v1') || {}, m = get('spaceCubeMap.v1') || {};
      let sys = g.sys, planet = g.planet;
      if (!sys && g.at) { if (String(g.at).startsWith('sp:')) { sys = sol.id; planet = g.at.slice(3); } else sys = g.at; }
      d = { sys, planet, dir: g.dir, q: g.q, limit: g.limit, visited: m.visited, scanned: m.planets, seen: m.seen2 };
    }
    if (isPlace(d.sys)) {
      const o = byId.get(d.sys); state.sys = o.id;
      const q = planetOf(o, d.planet);                 // a planet; in this save's form null means the star; older forms were always at a planet
      state.planet = q ? q.name : o.planets && !(v1 && d.planet === null) ? defaultPlanet(o).name : null;
      state.dir = d.dir || null; state.q = d.q || null; state.nav = d.nav || null;
    }
    if (d.nav === undefined && state.sys === sol.id && state.planet === homePlanet) {   // flights saved before the single state
      const n = get('spaceCubeNav.v1'); if (n && n.target && n.offset) { state.nav = { target: n.target, offset: n.offset }; if (n.q) state.q = n.q; }
    }
    if (d.limit) state.limit = d.limit;
    (d.visited || []).forEach(id => { if (isPlace(id) && !state.visited.includes(id)) state.visited.push(id); });
    (d.scanned || []).forEach(id => { if (byId.has(id)) state.scanned.add(id); });
    (d.seen || []).forEach(id => { if (isPlace(id)) state.seen.add(id); });
    arrive(state.sys, state.planet, true);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ sys: state.sys, planet: state.planet, dir: state.dir, q: state.q, nav: state.nav, limit: state.limit,
      visited: state.visited, scanned: [...state.scanned], seen: [...state.seen] })); } catch (e) {}
  }
  const mainPlanet = o => o.planets.reduce((a, p) => ((p.re || 0) > (a.re || 0) ? p : a), o.planets[0]);
  const defaultPlanet = o => o.planets.find(p => p.home) || mainPlanet(o);              // only for saves from before you could be at a star
  const planetOf = (o, name) => (name && o.planets && o.planets.find(p => p.name === name)) || null;   // the named planet of a place, or null: the star itself
  const hereId = () => state.planet ? 'pl:' + state.planet : state.sys;
  const atHome = () => state.sys === sol.id && state.planet === homePlanet;
  function arrive(sysId, planetName, quiet) {          // you are now at this place (and planet): it counts as visited (and scanned)
    const o = byId.get(sysId); if (!o) return;
    const q = planetOf(o, planetName); state.sys = o.id; state.planet = q ? q.name : null;
    if (!state.visited.includes(o.id)) state.visited.push(o.id);
    state.seen.delete(o.id);
    if (state.planet) state.scanned.add('pl:' + state.planet);
    if (!quiet) save();
  }
  function saw(id) { if (!isPlace(id) || state.seen.has(id) || state.visited.includes(id)) return; state.seen.add(id); save(); }   // its name tag was on your screen
  // ---- THE RULES, the same for the game and the map ----
  // Reach: anything marked `always`, the system you're in, and stars within warp range of where you are.
  const inReach = (o, from = byId.get(state.sys)) => !!o.always || o === from || dist(o, from) <= raw.warpLy;
  // Known (name and details): our own system; places you've visited; planets you've been to.
  const known = o => o.sys ? (byId.get(o.sys).home || state.scanned.has(o.id) || o.id === hereId()) : (!!o.home || state.visited.includes(o.id));
  // What there is to say about a place, and about a planet.
  function placeFacts(o) {
    if (!o.planets) return [fmtLy(o.ly) + ' FROM THE SUN', [o.type, o.note].filter(Boolean).join(' · '), o.mass ? 'MASS ' + o.mass : ''].filter(Boolean);
    const n = o.planets.length, c = raw.starCats[o.cat];
    return [(o.ly ? fmtLy(o.ly) + ' FROM THE SUN' : 'OUR SOLAR SYSTEM') + ' · ' + n + ' PLANET' + (n > 1 ? 'S' : ''),
      c.name + (o.spec ? ' · ' + String(o.spec).toUpperCase() : '') + (o.teff ? ' · ' + Math.round(o.teff).toLocaleString('en-US') + ' K' : '')];
  }
  function planetFacts(q) {
    const L = [(q.tag ? q.tag + ' · ' : '') + CLASS_LONG[q.cls] + (q.re ? ' · ' + (+q.re.toFixed(2)) + ' × EARTH' : '')];
    L.push('ORBIT ' + (q.aue ? 'ABOUT ' : '') + q.au + ' AU FROM ITS STAR' + (q.per ? ' · YEAR ' + (q.per < 1000 ? (+q.per.toFixed(1)) + ' DAYS' : (q.per / 365.25).toFixed(1) + ' EARTH YEARS') : ''));
    if (q.eqt) L.push('ABOUT ' + Math.round(q.eqt).toLocaleString('en-US') + ' K (' + Math.round(q.eqt - 273).toLocaleString('en-US') + ' °C)');
    if (q.year) L.push('FOUND ' + q.year + (q.how ? ' · ' + String(q.how).toUpperCase() : ''));
    return L;
  }
  // ---- THE PICTURES: what a place looks like from far away. One picture per place, used by the sky and by the map. ----
  const pics = new Map();
  const hash32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const blob = (x, cx, cy, r, rgb, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
  function picture(o) {                               // -> a canvas (its glow fills about 60% of the square, fading out before the edge)
    if (pics.has(o.id)) return pics.get(o.id);
    const S2 = 256, cv = document.createElement('canvas'); cv.width = cv.height = S2; const x = cv.getContext('2d'), c = S2 / 2, R = rng(hash32(o.id));

    if (o.kind === 'blackhole') {
      blob(x, c, c, c, '255,140,60', 0.35);
      x.lineWidth = 14; x.strokeStyle = 'rgba(255,200,130,0.9)'; x.shadowColor = 'rgba(255,150,60,1)'; x.shadowBlur = 30;
      x.beginPath(); x.ellipse(c, c, c * 0.42, c * 0.42, 0, 0, Math.PI * 2); x.stroke();
      x.shadowBlur = 0; x.fillStyle = '#000'; x.beginPath(); x.arc(c, c, c * 0.33, 0, Math.PI * 2); x.fill();
    } else if (o.kind === 'galaxy') {
      blob(x, c, c, c * 0.95, '170,180,255', 0.35); x.save(); x.translate(c, c); x.scale(1, (o.look && o.look.squash) || 0.6);
      for (let i = 0; i < 900; i++) { const a = R() * Math.PI * 2, r = Math.pow(R(), 0.7) * c * 0.9; x.fillStyle = `rgba(${R() < 0.2 ? '255,170,200' : '200,215,255'},${0.25 * (1 - r / c)})`; x.fillRect(Math.cos(a) * r, Math.sin(a) * r, 3, 3); }
      x.restore(); blob(x, c, c, c * 0.22, '255,235,200', 0.95);
    } else if (o.look && o.look.ring) {
      x.lineWidth = 26; x.strokeStyle = 'rgba(235,90,70,0.6)'; x.shadowColor = 'rgba(235,90,70,1)'; x.shadowBlur = 24;
      x.beginPath(); x.ellipse(c, c, c * 0.55, c * 0.45, 0.4, 0, Math.PI * 2); x.stroke(); x.shadowBlur = 0;
      blob(x, c, c, c * 0.5, '90,220,210', 0.55); blob(x, c, c, 8, '255,255,255', 1);
    } else if (o.kind === 'cluster') {
      blob(x, c, c, c, '120,160,255', 0.3);
      for (let i = 0; i < 9; i++) blob(x, c + (R() - 0.5) * c * 1.1, c + (R() - 0.5) * c * 0.8, 14 + R() * 10, '210,225,255', 1);
    } else if (o.planets) {
      blob(x, c, c, c, '255,220,150', 0.5); blob(x, c, c, c * 0.25, '255,250,235', 1);
    } else {
      const pal = o.pal || ['200,120,255'];
      for (let i = 0; i < 26; i++) blob(x, c + (R() - 0.5) * c, c + (R() - 0.5) * c, c * (0.25 + R() * 0.45), pal[i % pal.length], 0.28);
      for (let i = 0; i < 8; i++) blob(x, c + (R() - 0.5) * c * 0.8, c + (R() - 0.5) * c * 0.8, 3 + R() * 4, '255,255,255', 1);
    }
    const g = x.createRadialGradient(c, c, S2 * 0.3, c, c, c);     // fade to nothing before the edge, so a glow is never cut off in a straight line
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, S2, S2); x.globalCompositeOperation = 'source-over';
    pics.set(o.id, cv); return cv;
  }
  load();
  return { v: raw.v, fetched: raw.fetched, sources: raw.sources, systems, sol, landmarks: raw.landmarks, byId, starCats: raw.starCats, warpLy: raw.warpLy,
    planetCount: raw.planets.length - sol.planets.length, KM_AU, fmtLy, starRGB, starCat, planetClass, CLASS_NAME, CLASS_LONG,
    now: NOW, homeLon, helio, picture,
    state, save, arrive, saw, hereId, atHome, homePlanet, dist, inReach, known, placeFacts, planetFacts, mainPlanet, defaultPlanet, planetOf };
})();
