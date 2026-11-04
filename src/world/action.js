// ---- ACT: action mode (prototype). Your lead critter fights live in the overworld: tap Attack = slash with the chosen move, hold = pick the move on a wheel ----
// Setting `settings.arpg` (off by default; the turn-based and real-time battles stay as they are). Everything here is memory only: nothing is saved.
// Reuses Game.hit() (types, abilities, statuses) and Game.endRound() (burn / drain ticks), so damage rules are the same as in the old battles.
// Enemies are visible wild critters on maps with tall grass; they replace the random grass encounters while the mode is on.
// world.js calls: ACT.step(env) every frame, ACT.items(env) (y-sorted drawables), ACT.drawFx(env) (slashes, numbers, bars) and ACT.active() (grass encounters off).
const ACT = (() => {
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const CD = [0.45, 1.1, 1.4, 3.0];            // seconds: quick slash, heavy slash, guard, special
  let H = null, hero = null, heroKey = '', E = [], FX = [], mapId = '', spawnT = 0, lastEnv = null, on = false;
  const st = { sel: 0, cd: 0, cdTot: 1, atk: null, down: 0, calm: 0, guard: 0, quiet: 0 };
  const rand = Math.random;
  function bind(h) { H = h; }
  const enabled = () => !!(H && H.enabled && H.enabled());
  const active = () => on;
  function lead() { return H && H.lead ? H.lead() : null; }
  function mkHero() {
    const k = lead(); if (!k) { hero = null; heroKey = ''; return; }
    const key = k.seed + ':' + k.stage + ':' + (k.lv || 1); if (key === heroKey && hero) return;
    const keep = hero && heroKey.split(':')[0] === String(k.seed) ? hero.hp / hero.max : 1;
    hero = H.game().newBattle(k, k, 0).s[0]; hero.label = k.name; hero.hp = Math.max(1, Math.round(hero.max * keep)); heroKey = key;
  }
  function dummy() { return { k: hero.k, hp: 9999, max: 9999, burn: 0, weak: 0, daze: 0, sap: 0, fort: 0, guard: false, uses: 9, abUsed: false }; }
  function tileFree(e, x, y) { return !e.solidAt(Math.floor((x - 7) / e.TS), Math.floor(y / e.TS)) && !e.solidAt(Math.floor((x + 7) / e.TS), Math.floor(y / e.TS)) && !e.solidAt(Math.floor(x / e.TS), Math.floor((y - 5) / e.TS)); }
  function spawnOne(e, far) {
    const cells = [], M = e.M, px = e.P.x / e.TS, py = e.P.y / e.TS;
    for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) { const t = M.grid[y][x]; if ((t === 'W' || t === 'Z') && Math.hypot(x - px, y - py) >= far) cells.push([x, y]); }
    if (!cells.length) return false;
    const c = cells[Math.floor(rand() * cells.length)], k = H.foe(M.types || [], lead());
    if (!k) return false;
    const s = H.game().newBattle(lead(), k, 0).s[1]; s.label = 'Wild ' + k.name;
    E.push({ k: k, s: s, x: (c[0] + 0.5) * e.TS, y: (c[1] + 0.8) * e.TS, hx: (c[0] + 0.5) * e.TS, hy: (c[1] + 0.8) * e.TS, mode: 'idle', t: rand() * 2, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0, tele: 0, cd: 1 + rand(), tick: 1, img: H.img(k) });
    return true;
  }
  function reset(e) { E = []; FX = []; mapId = e.M.id; spawnT = 3; st.atk = null; st.cd = 0; for (let i = 0; i < 4; i++) spawnOne(e, 7); }
  const num = (x, y, text, col) => FX.push({ k: 'num', x: x, y: y, text: text, col: col, t: 0 });
  function heroPos() { const f = lastEnv.FOL; return { x: f.x + (f.ox || 0), y: f.y + (f.oy || 0) }; }
  function faceVec(e) { return DIRS[e.P.dir] || DIRS.down; }
  function target(e, dir) {
    const o = heroPos(); let best = null, bd = 3.2 * e.TS;
    E.forEach((m) => { const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy); if (d < bd && d > 1 && (dx * dir[0] + dy * dir[1]) / d > 0.17) { bd = d; best = m; } });
    return best;
  }
  // tap: use the chosen move. Returns false when it is not ready.
  function attack() {
    if (!on || !lastEnv || !hero || st.down > 0 || st.cd > 0 || st.atk) return false;
    const mi = st.sel, mv = hero.k.kit[mi], e = lastEnv; if (!mv) return false;
    let dir = faceVec(e), tg = mv.kind === 'guard' ? null : target(e, dir);
    if (tg) { const o = heroPos(), d = Math.hypot(tg.x - o.x, tg.y - o.y) || 1; dir = [(tg.x - o.x) / d, (tg.y - o.y) / d]; }
    const o = heroPos(), reach = tg ? Math.min(Math.hypot(tg.x - o.x, tg.y - o.y) - 0.7 * e.TS, 2.1 * e.TS) : 0.5 * e.TS;
    st.atk = { mi: mi, kind: mv.kind, t: 0, dir: dir, dash: Math.max(0, reach), done: false };
    st.cd = st.cdTot = CD[mi] || 1; st.quiet = 0;
    if (mv.kind === 'guard') { hero.guard = true; st.guard = 1.3; }
    return true;
  }
  function strike(e) {
    const a = st.atk, mv = hero.k.kit[a.mi], o = heroPos(), heavy = a.mi === 1, rad = (heavy ? 1.45 : 1.1) * e.TS;
    const cx = o.x + a.dir[0] * 0.85 * e.TS, cy = o.y + a.dir[1] * 0.85 * e.TS, g = H.game();
    FX.push({ k: 'slash', x: o.x + a.dir[0] * 0.55 * e.TS, y: o.y + a.dir[1] * 0.55 * e.TS - 8, ang: Math.atan2(a.dir[1], a.dir[0]), r: rad, col: hero.k.element.color, t: 0, big: heavy || a.kind === 'status' });
    if (a.kind === 'guard') return;
    E.slice().forEach((m) => {
      if (Math.hypot(m.x - cx, m.y - cy) > rad + 8) return;
      if (a.kind === 'attack' && rand() * 100 >= mv.acc) { num(m.x, m.y - 26, 'Miss', '#FFFFFF'); return; }
      const before = m.s.hp, power = a.kind === 'status' ? Math.round(hero.k.kit[0].power * 0.6) : mv.power;
      g.hit(hero, m.s, power, rand); delete m.s.fxHits;
      if (a.kind === 'status') { const key = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' }[mv.effect]; if (key) m.s[key] = mv.effect === 'daze' ? 2 : 3; else if (mv.effect === 'heal') { hero.hp = Math.min(hero.max, hero.hp + Math.round(hero.max * 0.28)); } else if (mv.effect === 'fortify') hero.fort = 4; }
      const dmg = before - m.s.hp; num(m.x, m.y - 26, String(dmg), dmg >= 40 ? '#FFD86B' : '#FFFFFF');
      m.flash = 0.16; m.mode = 'chase'; m.t = 0; const d = Math.hypot(m.x - o.x, m.y - o.y) || 1, kb = (heavy ? 1.3 : 0.7) * e.TS; m.kx = (m.x - o.x) / d * kb * 6; m.ky = (m.y - o.y) / d * kb * 6;
      if (m.s.hp <= 0) kill(m, e);
    });
  }
  function kill(m, e) {
    E.splice(E.indexOf(m), 1); for (let i = 0; i < 8; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 80, vy: -20 - rand() * 50, t: 0, col: m.k.element.color });
    if (H.onKo) H.onKo(m.k); spawnT = Math.min(spawnT, 8);
  }
  function walk(m, e, vx, vy, dt) { const nx = m.x + vx * dt, ny = m.y + vy * dt; if (tileFree(e, nx, m.y)) m.x = nx; if (tileFree(e, m.x, ny)) m.y = ny; }
  function step(e) {
    on = false; lastEnv = e;
    if (!enabled() || !e.fol || e.M.interior || e.M.cave || !(e.M.rate > 0)) { if (E.length) { E = []; FX = []; mapId = ''; } if (e.FOL) { e.FOL.ox = 0; e.FOL.oy = 0; } return; }
    mkHero(); if (!hero) return; on = true; const dt = e.dt, g = H.game();
    if (mapId !== e.M.id) reset(e);
    st.cd = Math.max(0, st.cd - dt); st.calm = Math.max(0, st.calm - dt); st.quiet += dt;
    if (st.guard > 0) { st.guard -= dt; if (st.guard <= 0) hero.guard = false; }
    if (st.down > 0) { st.down -= dt; if (st.down <= 0) { hero.hp = Math.round(hero.max * 0.6); } }
    if (st.quiet > 4 && hero.hp > 0 && st.down <= 0) hero.hp = Math.min(hero.max, hero.hp + hero.max * 0.03 * dt);
    // the swing
    const f = e.FOL, a = st.atk; f.ox = 0; f.oy = 0;
    if (a) {
      a.t += dt; const W = 0.09, S = 0.12, R = 0.2; let k = 0;
      if (a.t < W) k = -0.25 * (a.t / W); else if (a.t < W + S) { k = -0.25 + 1.25 * ((a.t - W) / S); if (!a.done) { a.done = true; strike(e); } } else if (a.t < W + S + R) k = 1 - (a.t - W - S) / R; else st.atk = null;
      const L = a.kind === 'guard' ? 0 : (k < 0 ? k * e.TS * 0.6 : k * a.dash); f.ox = a.dir[0] * L; f.oy = a.dir[1] * L;
    }
    const hp0 = heroPos(), p = e.P;
    // enemies
    E.slice().forEach((m) => {
      m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt); m.t += dt;
      if (Math.abs(m.kx) + Math.abs(m.ky) > 1) { walk(m, e, m.kx, m.ky, dt); m.kx *= 0.82; m.ky *= 0.82; } else { m.kx = 0; m.ky = 0; }
      m.tick -= dt; if (m.tick <= 0) { m.tick = 1; if (m.s.burn || m.s.sap || m.s.weak || m.s.daze) { const b = { s: [m.s, dummy()], log: [], round: 1, over: false }, h = m.s.hp; g.endRound(b); if (m.s.hp < h) num(m.x, m.y - 26, String(h - m.s.hp), '#FF9A5A'); if (m.s.hp <= 0) { kill(m, e); return; } } }
      const dp = Math.hypot(p.x - m.x, p.y - m.y), dh = Math.hypot(hp0.x - m.x, hp0.y - m.y), near = Math.min(dp, dh);
      if (m.mode === 'idle') { if (near < 5 * e.TS && st.calm <= 0 && st.down <= 0) { m.mode = 'chase'; m.t = 0; m.s.__alert = 0.5; } else { if (m.t > 1.5) { m.t = 0; const r = rand(); m.dx = r < 0.4 ? 0 : (rand() - 0.5) * 2; m.dy = r < 0.4 ? 0 : (rand() - 0.5) * 2; } if (Math.hypot(m.x - m.hx, m.y - m.hy) > 4 * e.TS) { m.dx = Math.sign(m.hx - m.x); m.dy = Math.sign(m.hy - m.y); } walk(m, e, m.dx * 26, m.dy * 26, dt); } }
      else {
        if (near > 9 * e.TS || st.calm > 0 || st.down > 0) { m.mode = 'idle'; return; }
        if (m.tele > 0) { m.tele -= dt; if (m.tele <= 0) { // the swing lands if you are still close
          const d2 = Math.hypot(heroPos().x - m.x, heroPos().y - m.y), d3 = Math.hypot(p.x - m.x, p.y - m.y);
          if (Math.min(d2, d3) < 1.35 * e.TS && !(m.s.daze > 0 && rand() < 0.45)) { const before = hero.hp; g.hit(m.s, hero, m.k.kit[0].power, rand); delete hero.fxHits; const dmg = Math.round(before - hero.hp); num(heroPos().x, heroPos().y - 30, String(dmg), '#FF8A7A'); st.quiet = 0; hero.__hurt = 0.2; if (hero.hp <= 0) { hero.hp = 0; st.down = 4; st.calm = 4; st.atk = null; if (H.toast) H.toast(hero.k.name + ' was knocked out. It recovers in a moment.'); } }
        } return; }
        const tx = dh < dp ? hp0.x : p.x, ty = dh < dp ? hp0.y : p.y, d = Math.hypot(tx - m.x, ty - m.y) || 1;
        if (d > 0.95 * e.TS) walk(m, e, (tx - m.x) / d * 58, (ty - m.y) / d * 58, dt);
        else if (m.cd <= 0) { m.tele = 0.32; m.cd = 1.5 + rand() * 0.5; }
      }
    });
    if (hero.__hurt) hero.__hurt = Math.max(0, hero.__hurt - dt);
    // respawns
    spawnT -= dt; if (spawnT <= 0) { spawnT = 6; if (E.length < 4) spawnOne(e, 8); }
    FX.forEach((x) => { x.t += dt; if (x.k === 'puff') { x.x += x.vx * dt; x.y += x.vy * dt; x.vy += 90 * dt; } });
    FX = FX.filter((x) => x.t < (x.k === 'slash' ? 0.22 : (x.k === 'num' ? 0.8 : 0.5)));
  }
  function items(e) {
    if (!on) return [];
    const out = E.map((m) => ({ y: m.y, fn: (c) => {
      const x = e.snap(m.x - e.cx), y = e.snap(m.y - e.cy); if (x < -40 || x > e.vw + 40 || y < -40 || y > e.vh + 60) return;
      c.fillStyle = 'rgba(10,30,10,0.28)'; c.fillRect(x - 8, y - 2, 16, 3); c.fillRect(x - 6, y - 3, 12, 5);
      const sh = m.tele > 0 ? Math.round(Math.sin(e.t * 60) * 1.5) : 0;
      if (!(m.flash > 0 && Math.floor(m.flash * 40) % 2) && m.img && m.img.complete) { const w = 30, h = Math.round(30 * m.img.height / Math.max(1, m.img.width)); c.imageSmoothingEnabled = false; c.drawImage(m.img, Math.round(x - w / 2 + sh), Math.round(y - h), w, h); }
      if (m.s.hp < m.s.max) { c.fillStyle = '#1E2A4A'; c.fillRect(x - 13, y - 38, 26, 5); c.fillStyle = '#FF6B6B'; c.fillRect(x - 12, y - 37, Math.max(0, Math.round(24 * m.s.hp / m.s.max)), 3); }
      if (m.tele > 0) { c.fillStyle = '#D8574A'; c.fillRect(x - 2, y - 52, 4, 9); c.fillRect(x - 2, y - 41, 4, 3); }
      if (m.s.burn) { c.fillStyle = '#FF9A3A'; c.fillRect(x + 8, y - 30, 4, 4); }
    } }));
    return out;
  }
  function drawFx(e) {
    if (!on) return; const c = e.ctx;
    // your critter: health bar and guard bubble
    const o = heroPos(), x = e.snap(o.x - e.cx), y = e.snap(o.y - e.cy);
    c.fillStyle = '#1E2A4A'; c.fillRect(x - 15, y - 44, 30, 6); c.fillStyle = st.down > 0 ? '#9FB0D0' : (hero.hp / hero.max > 0.5 ? '#A7F04A' : (hero.hp / hero.max > 0.25 ? '#FFD86B' : '#FF6B6B')); c.fillRect(x - 14, y - 43, Math.max(0, Math.round(28 * hero.hp / hero.max)), 4);
    if (hero.guard) { c.strokeStyle = 'rgba(150,200,255,0.9)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 14, 20, 0, 6.3); c.stroke(); }
    if (st.down > 0) { c.fillStyle = '#FFFFFF'; c.font = '800 11px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('KO', x, y - 50); }
    FX.forEach((f) => {
      const fx = e.snap(f.x - e.cx), fy = e.snap(f.y - e.cy);
      if (f.k === 'slash') { const u = f.t / 0.22, w = (f.big ? 7 : 5); c.save(); c.globalAlpha = 1 - u * 0.8; c.strokeStyle = f.col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); const a0 = f.ang - 1.15 + u * 0.5, a1 = f.ang + 1.15 + u * 0.5; c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0, a1); c.stroke(); c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(2, w - 3); c.beginPath(); c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0 + 0.2, a1 - 0.2); c.stroke(); c.restore(); }
      else if (f.k === 'num') { c.save(); c.globalAlpha = 1 - f.t / 0.8; c.font = '900 13px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#1E2A4A'; const ty = fy - f.t * 26; c.strokeText(f.text, fx, ty); c.fillStyle = f.col; c.fillText(f.text, fx, ty); c.restore(); }
      else if (f.k === 'puff') { c.globalAlpha = 1 - f.t / 0.5; c.fillStyle = f.col; c.fillRect(fx - 2, fy - 2, 5, 5); c.globalAlpha = 1; }
    });
  }
  return {
    bind, step, items, drawFx, active, attack,
    get sel() { return st.sel; }, setSel: (i) => { st.sel = Math.max(0, Math.min(3, i)); },
    cdFrac: () => (st.cdTot ? st.cd / st.cdTot : 0), get hero() { return hero; }, get down() { return st.down > 0; },
    get enemies() { return E; }, moves: () => (hero ? hero.k.kit.map((m, i) => ({ name: m.name, kind: m.kind, sub: m.sub, i: i })) : []),
    ready: () => on, enabled,
  };
})();
