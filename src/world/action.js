// ---- ACT: action mode (prototype). Your lead critter fights live in the overworld: tap Attack = slash with the chosen move, hold = pick the move on a wheel ----
// Setting `settings.arpg` (off by default; the turn-based and real-time battles stay as they are). Everything here is memory only: nothing is saved.
// Reuses Game.hit() (types, abilities, statuses) and Game.endRound() (burn / drain ticks), so damage rules are the same as in the old battles.
// Enemies are visible wild critters on maps with tall grass; they replace the random grass encounters while the mode is on.
// world.js calls: ACT.step(env) every frame, ACT.items(env) (y-sorted drawables), ACT.drawFx(env) (slashes, numbers, bars) and ACT.active() (grass encounters off).
const ACT = (() => {
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const CD = [0.45, 1.1, 1.4, 3.0];            // seconds: quick slash, heavy slash, guard, special
  let H = null, hero = null, team = {}, OFF = [], offId = 1, E = [], FX = [], mapId = '', spawnT = 0, lastEnv = null, on = false;
  const st = { sel: 0, cd: 0, cdTot: 1, atk: null, down: 0, calm: 0, guard: 0, quiet: 0, swapIn: null };
  const rand = Math.random;
  function bind(h) { H = h; }
  const enabled = () => !!(H && H.enabled && H.enabled());
  const active = () => on;
  function lead() { return H && H.lead ? H.lead() : null; }
  // one battler per party critter, kept while you play (hit points carry over between lead changes and level-ups)
  function sideFor(k) {
    const key = k.seed + ':' + k.stage + ':' + (k.lv || 1), c = team[k.seed];
    if (c && c.key === key) return c.side;
    const side = H.game().newBattle(k, k, 0).s[0]; side.label = k.name; side.hp = c ? Math.max(0, Math.round(side.max * c.side.hp / c.side.max)) : side.max;
    team[k.seed] = { key: key, side: side, rev: c ? c.rev : 0 }; return side;
  }
  function mkHero() { const k = lead(); hero = k ? sideFor(k) : null; }
  function benchSides() { return (H.bench ? H.bench() : []).map((k) => sideFor(k)); }
  // tap-free swap from the wheel: only to a critter that can still fight
  function swapTo(seed) {
    if (!on || !hero || st.atk || hero.k.seed === seed) return false;
    const b = benchSides().find((x) => x.k.seed === seed); if (!b || b.hp <= 0) return false;
    hero.guard = false; st.guard = 0; st.swapIn = null; H.setLead(seed); st.cd = st.cdTot = 0.8; if (H.sfx) H.sfx('claim'); num(heroPos().x, heroPos().y - 30, 'Go, ' + b.k.name + '!', '#FFFFFF'); return true;
  }
  function dummy() { return { k: hero.k, hp: 9999, max: 9999, burn: 0, weak: 0, daze: 0, sap: 0, fort: 0, guard: false, uses: 9, abUsed: false }; }
  function tileFree(e, x, y) { return !e.solidAt(Math.floor((x - 7) / e.TS), Math.floor(y / e.TS)) && !e.solidAt(Math.floor((x + 7) / e.TS), Math.floor(y / e.TS)) && !e.solidAt(Math.floor(x / e.TS), Math.floor((y - 5) / e.TS)); }
  function spawnOne(e, far, elem, rare) {
    const cells = [], M = e.M, px = e.P.x / e.TS, py = e.P.y / e.TS;
    for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) { const t = M.grid[y][x]; if ((t === 'W' || t === 'Z') && Math.hypot(x - px, y - py) >= far) cells.push([x, y]); }
    if (!cells.length) return false;
    const c = cells[Math.floor(rand() * cells.length)], isRare = rare !== undefined ? rare : M.grid[c[1]][c[0]] === 'Z', k = H.foe(elem ? [elem] : (M.types || []), lead(), isRare);
    if (!k) return false;
    const s = H.game().newBattle(lead(), k, 0).s[1]; s.label = 'Wild ' + k.name;
    E.push({ k: k, s: s, x: (c[0] + 0.5) * e.TS, y: (c[1] + 0.8) * e.TS, hx: (c[0] + 0.5) * e.TS, hy: (c[1] + 0.8) * e.TS, mode: 'idle', t: rand() * 2, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0, tele: 0, cd: 1 + rand(), tick: 1, img: H.img(k) });
    return true;
  }
  function reset(e) { E = []; FX = []; PR = []; OFF = []; mapId = e.M.id; spawnT = 3; st.atk = null; st.cd = 0; for (let i = 0; i < 4; i++) spawnOne(e, 7); }
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
    if (!on || !lastEnv || !hero || hero.hp <= 0 || st.down > 0 || st.swapIn || st.cd > 0 || st.atk) return false;
    const mi = st.sel, mv = hero.k.kit[mi], e = lastEnv; if (!mv) return false;
    let dir = faceVec(e), tg = mv.kind === 'guard' ? null : target(e, dir);
    if (tg) { const o = heroPos(), d = Math.hypot(tg.x - o.x, tg.y - o.y) || 1; dir = [(tg.x - o.x) / d, (tg.y - o.y) / d]; }
    const o = heroPos(), reach = tg ? Math.min(Math.hypot(tg.x - o.x, tg.y - o.y) - 0.7 * e.TS, 2.1 * e.TS) : 0.5 * e.TS;
    st.atk = { mi: mi, kind: mv.kind, t: 0, dir: dir, dash: Math.max(0, reach), done: false };
    st.cd = st.cdTot = CD[mi] || 1; st.quiet = 0;
    if (mv.kind === 'guard') { hero.guard = true; st.guard = 1.3; }
    if (H.sfx) H.sfx(mv.kind === 'guard' ? 'tap' : 'slash');
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
      const dmg = before - m.s.hp; num(m.x, m.y - 26, String(dmg), dmg >= 40 ? '#FFD86B' : '#FFFFFF'); if (H.sfx && dmg > 0) H.sfx('hit');
      m.flash = 0.16; m.mode = 'chase'; m.t = 0; const d = Math.hypot(m.x - o.x, m.y - o.y) || 1, kb = (heavy ? 1.3 : 0.7) * e.TS; m.kx = (m.x - o.x) / d * kb * 6; m.ky = (m.y - o.y) / d * kb * 6;
      if (m.s.hp <= 0) kill(m, e);
    });
  }
  function kill(m, e) {
    E.splice(E.indexOf(m), 1); for (let i = 0; i < 8; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 80, vy: -20 - rand() * 50, t: 0, col: m.k.element.color });
    spawnT = Math.min(spawnT, 8); OFF.push({ id: offId++, k: m.k, t: 9, tot: 9 }); if (OFF.length > 2) OFF.shift();
    const r = H.onKill ? H.onKill(m.k, hero.k) : null;
    if (r) { const o = heroPos(); num(m.x, m.y - 34, '+' + r.xp + ' XP', '#A7F04A'); if (r.ess) num(o.x, o.y - 34, '+' + r.ess + ' essence', '#C9A8FF'); if (r.lv) { num(o.x, o.y - 48, 'Level ' + r.lv + '!', '#FFD86B'); if (H.toast) H.toast(hero.k.name + ' grew to level ' + r.lv + '!'); } if (H.sfx) H.sfx('claim'); }
  }
  function walk(m, e, vx, vy, dt) { const nx = m.x + vx * dt, ny = m.y + vy * dt; if (tileFree(e, nx, m.y)) m.x = nx; if (tileFree(e, m.x, ny)) m.y = ny; }
  // ---- enemy behaviours: one per element (the old single melee swing is the fallback) ----
  const BEH = {
    Ember: { atk: 'dash', spd: 50, cd: 2.4, mul: 1.1, tele: 0.5, rng: 4.2 },              // winds up, then charges in a straight line
    Tide:  { atk: 'shoot', spd: 40, cd: 2.2, mul: 0.8, tele: 0.4, keep: 3.2, ps: 105 },    // keeps its distance and spits bubbles
    Moss:  { atk: 'aoe', spd: 36, cd: 2.6, mul: 1.15, tele: 0.6, rad: 1.6 },               // slow; a ring of thorns around itself
    Volt:  { atk: 'melee', spd: 92, cd: 1.0, mul: 0.7, tele: 0.2, runAway: 0.9 },          // fast, light hits, darts away after each
    Frost: { atk: 'shoot', spd: 44, cd: 2.4, mul: 0.9, tele: 0.45, keep: 3.8, ps: 150 },   // fast ice shards from far away
    Dusk:  { atk: 'blink', spd: 56, cd: 2.4, mul: 1.0, tele: 0.5 },                        // vanishes and reappears behind you
    Stone: { atk: 'aoe', spd: 30, cd: 3.0, mul: 1.3, tele: 0.75, rad: 1.9 },               // very slow, a huge slam
    Bloom: { atk: 'heal', spd: 42, cd: 2.6, mul: 0.6, tele: 0.4, keep: 3.6, ps: 90 }         // heals hurt friends, otherwise throws petals
  };
  const BDEF = { atk: 'melee', spd: 58, cd: 1.7, mul: 1, tele: 0.32 };
  let PR = [];
  function koHero() {
    hero.hp = 0; st.atk = null; hero.guard = false; st.guard = 0; if (H.sfx) H.sfx('lose');
    const alt = benchSides().filter((b) => b.hp > 0).sort((a, b) => b.hp / b.max - a.hp / a.max)[0];
    if (alt) { st.swapIn = { seed: alt.k.seed, t: 0.9 }; st.calm = 1.6; if (H.toast) H.toast(hero.k.name + ' was knocked out. Go, ' + alt.k.name + '!'); }
    else { st.down = 4; st.calm = 4; if (H.toast) H.toast('Your party is knocked out. They recover in a moment.'); }
  }
  function hurtHero(m, mul) {
    const before = hero.hp; H.game().hit(m.s, hero, Math.max(1, Math.round(m.k.kit[0].power * mul)), rand); delete hero.fxHits;
    const o = heroPos(); num(o.x, o.y - 30, String(Math.round(before - hero.hp)), '#FF8A7A'); st.quiet = 0; hero.__hurt = 0.2; if (H.sfx) H.sfx('hit'); if (hero.hp <= 0) koHero();
  }
  const closest = (m, p, h) => Math.min(Math.hypot(p.x - m.x, p.y - m.y), Math.hypot(h.x - m.x, h.y - m.y));
  function allyToHeal(m, e) { let best = null, br = 0.9; E.forEach((o) => { if (o === m || o.s.hp <= 0) return; const r = o.s.hp / o.s.max; if (r < br && Math.hypot(o.x - m.x, o.y - m.y) < 6 * e.TS) { br = r; best = o; } }); return best; }
  function think(m, e, dt, p, hp0, dp, dh) {
    const B = BEH[m.k.element.name] || BDEF, TS = e.TS;
    if (m.dash > 0) { m.dash -= dt; walk(m, e, m.dvx, m.dvy, dt); const hpos = heroPos(); if (!m.dashHit && closest(m, p, hpos) < 0.95 * TS) { m.dashHit = true; hurtHero(m, B.mul); } return; }
    if (m.tele > 0) {
      m.tele -= dt; if (m.tele > 0) return;
      const hpos = heroPos(), aim = m.aim || { x: hpos.x, y: hpos.y }, ax = aim.x, ay = aim.y; if (!m.kind) m.kind = 'melee';
      if (m.s.daze > 0 && rand() < 0.45) return;
      if (m.kind === 'melee') { if (closest(m, p, hpos) < 1.35 * TS) { hurtHero(m, B.mul); if (B.runAway) m.retreat = B.runAway; } }
      else if (m.kind === 'dash') { const L = Math.hypot(ax - m.x, ay - m.y) || 1; m.dvx = (ax - m.x) / L * 300; m.dvy = (ay - m.y) / L * 300; m.dash = 0.3; m.dashHit = false; }
      else if (m.kind === 'shoot') { const L = Math.hypot(ax - m.x, ay - m.y) || 1; PR.push({ x: m.x, y: m.y - 12, vx: (ax - m.x) / L * (B.ps || 100), vy: (ay - m.y) / L * (B.ps || 100), t: 0, m: m, mul: B.mul, col: m.k.element.color }); }
      else if (m.kind === 'aoe') { FX.push({ k: 'ring', x: m.x, y: m.y - 4, r: B.rad * TS, t: 0, col: m.k.element.color }); if (closest(m, p, hpos) < B.rad * TS) hurtHero(m, B.mul); }
      else if (m.kind === 'blink') { for (let i = 0; i < 6; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 60, vy: -10 - rand() * 30, t: 0, col: m.k.element.color }); if (tileFree(e, ax, ay)) { m.x = ax; m.y = ay; } m.kind = 'melee'; m.tele = 0.28; m.aim = { x: ax, y: ay }; }
      else if (m.kind === 'heal') { const al = allyToHeal(m, e); if (al) { const h = Math.round(al.s.max * 0.14); al.s.hp = Math.min(al.s.max, al.s.hp + h); num(al.x, al.y - 30, '+' + h, '#7BE07B'); FX.push({ k: 'ring', x: al.x, y: al.y - 4, r: 0.7 * TS, t: 0, col: '#7BE07B' }); } }
      return;
    }
    if (m.retreat > 0) { m.retreat -= dt; const d0 = Math.hypot(p.x - m.x, p.y - m.y) || 1; walk(m, e, (m.x - p.x) / d0 * B.spd * 1.3, (m.y - p.y) / d0 * B.spd * 1.3, dt); return; }
    const tx = dh < dp ? hp0.x : p.x, ty = dh < dp ? hp0.y : p.y, d = Math.hypot(tx - m.x, ty - m.y) || 1, ux = (tx - m.x) / d, uy = (ty - m.y) / d, keep = (B.keep || 0) * TS;
    // moving
    if (keep) { if (d < keep - 1.2 * TS) walk(m, e, -ux * B.spd * 0.8, -uy * B.spd * 0.8, dt); else if (d > keep + 1.2 * TS) walk(m, e, ux * B.spd, uy * B.spd, dt); else { m.sd = m.sd || (rand() < 0.5 ? 1 : -1); walk(m, e, -uy * m.sd * B.spd * 0.5, ux * m.sd * B.spd * 0.5, dt); } }
    else if (B.atk === 'aoe') { if (d > B.rad * TS * 0.8) walk(m, e, ux * B.spd, uy * B.spd, dt); }
    else if (B.atk === 'dash') { if (d > 3.2 * TS) walk(m, e, ux * B.spd, uy * B.spd, dt); }
    else if (B.atk === 'blink') { if (d > 3.5 * TS) walk(m, e, ux * B.spd, uy * B.spd, dt); else if (d > 0.95 * TS) walk(m, e, ux * B.spd * 0.6, uy * B.spd * 0.6, dt); }
    else if (d > 0.95 * TS) walk(m, e, ux * B.spd, uy * B.spd, dt);
    // starting an attack
    if (m.cd > 0) return;
    let kind = null;
    if (B.atk === 'melee' && d <= 0.95 * TS) kind = 'melee';
    else if (B.atk === 'dash' && d >= 1.6 * TS && d <= B.rng * TS) kind = 'dash';
    else if (B.atk === 'dash' && d < 1.6 * TS) kind = 'melee';
    else if (B.atk === 'aoe' && d <= B.rad * TS * 0.9) kind = 'aoe';
    else if (B.atk === 'shoot' && d >= 1.5 * TS && d <= 7 * TS) kind = 'shoot';
    else if (B.atk === 'blink') kind = d > 2.5 * TS ? 'blink' : (d <= 0.95 * TS ? 'melee' : null);
    else if (B.atk === 'heal') kind = allyToHeal(m, e) ? 'heal' : (d >= 1.5 * TS && d <= 7 * TS ? 'shoot' : null);
    if (!kind) return;
    m.kind = kind; m.tele = B.tele; m.cd = B.cd + rand() * 0.4; m.aim = { x: tx, y: ty };
    if (kind === 'blink') m.aim = { x: tx + ux * 0.9 * TS, y: ty + uy * 0.9 * TS };   // behind you
    if (kind === 'heal') m.aim = { x: m.x, y: m.y };
  }
  function step(e) {
    on = false; lastEnv = e;
    if (!enabled() || !e.fol || e.M.interior || e.M.cave || !(e.M.rate > 0)) { if (E.length) { E = []; FX = []; PR = []; OFF = []; mapId = ''; } if (e.FOL) { e.FOL.ox = 0; e.FOL.oy = 0; } return; }
    mkHero(); if (!hero) return; on = true; const dt = e.dt, g = H.game();
    if (mapId !== e.M.id) reset(e);
    st.cd = Math.max(0, st.cd - dt); st.calm = Math.max(0, st.calm - dt); st.quiet += dt;
    if (st.guard > 0) { st.guard -= dt; if (st.guard <= 0) hero.guard = false; }
    if (st.down > 0) { st.down -= dt; if (st.down <= 0) Object.keys(team).forEach((k) => { const sd = team[k].side; sd.hp = Math.max(sd.hp, Math.round(sd.max * 0.5)); }); }
    if (st.quiet > 4 && hero.hp > 0 && st.down <= 0) hero.hp = Math.min(hero.max, hero.hp + hero.max * 0.03 * dt);
    benchSides().forEach((b) => { const c = team[b.k.seed]; if (b.hp > 0) b.hp = Math.min(b.max, b.hp + b.max * 0.015 * dt); else { c.rev += dt; if (c.rev >= 40) { c.rev = 0; b.hp = Math.round(b.max * 0.25); } } });
    if (st.swapIn) { st.swapIn.t -= dt; if (st.swapIn.t <= 0) { const sw = st.swapIn.seed; st.swapIn = null; H.setLead(sw); st.cd = st.cdTot = 0.5; if (H.sfx) H.sfx('claim'); } }
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
      else { if (near > 9 * e.TS || st.calm > 0 || st.down > 0) { m.mode = 'idle'; m.tele = 0; m.dash = 0; return; } think(m, e, dt, p, hp0, dp, dh); }
    });
    if (hero.__hurt) hero.__hurt = Math.max(0, hero.__hurt - dt);
    OFF.forEach((o) => { o.t -= dt; }); OFF = OFF.filter((o) => o.t > 0);
    PR.slice().forEach((q) => { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; const hp1 = heroPos();
      if (q.t > 2.4 || !tileFree(e, q.x, q.y + 12)) { PR.splice(PR.indexOf(q), 1); return; }
      if (Math.min(Math.hypot(hp1.x - q.x, hp1.y - 12 - q.y), Math.hypot(e.P.x - q.x, e.P.y - 12 - q.y)) < 0.6 * e.TS && hero.hp > 0 && st.down <= 0) { PR.splice(PR.indexOf(q), 1); if (q.m && q.m.s.hp > 0) hurtHero(q.m, q.mul); } });
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
      c.fillStyle = m.k.element.color; c.fillRect(x - 13, y - 44, 5, 5);
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
    E.forEach((m) => { if (!(m.tele > 0) || !m.aim) return; const B = BEH[m.k.element.name] || BDEF, mx = e.snap(m.x - e.cx), my = e.snap(m.y - e.cy), u = 1 - m.tele / B.tele; c.save(); c.strokeStyle = 'rgba(255,80,60,' + (0.35 + 0.4 * u) + ')'; c.lineWidth = 3;
      if (m.kind === 'aoe') { c.beginPath(); c.arc(mx, my - 4, B.rad * e.TS * (0.55 + 0.45 * u), 0, 6.3); c.stroke(); }
      else if (m.kind === 'dash') { c.beginPath(); c.moveTo(mx, my - 8); c.lineTo(e.snap(m.aim.x - e.cx), e.snap(m.aim.y - e.cy) - 8); c.stroke(); }
      else if (m.kind === 'blink') { const bx = e.snap(m.aim.x - e.cx), by = e.snap(m.aim.y - e.cy); c.beginPath(); c.arc(bx, by - 4, 10, 0, 6.3); c.stroke(); }
      c.restore(); });
    PR.forEach((q) => { const qx = e.snap(q.x - e.cx), qy = e.snap(q.y - e.cy); c.fillStyle = q.col; c.beginPath(); c.arc(qx, qy, 5, 0, 6.3); c.fill(); c.fillStyle = '#FFFFFF'; c.fillRect(qx - 1, qy - 1, 3, 3); });
    FX.forEach((f) => {
      const fx = e.snap(f.x - e.cx), fy = e.snap(f.y - e.cy);
      if (f.k === 'ring') { c.save(); c.globalAlpha = 1 - f.t / 0.5; c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.arc(fx, fy, f.r * (0.5 + f.t), 0, 6.3); c.stroke(); c.restore(); return; }
      if (f.k === 'slash') { const u = f.t / 0.22, w = (f.big ? 7 : 5); c.save(); c.globalAlpha = 1 - u * 0.8; c.strokeStyle = f.col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); const a0 = f.ang - 1.15 + u * 0.5, a1 = f.ang + 1.15 + u * 0.5; c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0, a1); c.stroke(); c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(2, w - 3); c.beginPath(); c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0 + 0.2, a1 - 0.2); c.stroke(); c.restore(); }
      else if (f.k === 'num') { c.save(); c.globalAlpha = 1 - f.t / 0.8; c.font = '900 13px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#1E2A4A'; const ty = fy - f.t * 26; c.strokeText(f.text, fx, ty); c.fillStyle = f.col; c.fillText(f.text, fx, ty); c.restore(); }
      else if (f.k === 'puff') { c.globalAlpha = 1 - f.t / 0.5; c.fillStyle = f.col; c.fillRect(fx - 2, fy - 2, 5, 5); c.globalAlpha = 1; }
    });
  }
  return {
    bind, step, items, drawFx, active, attack, swapTo, spawn: (n, elem, rare) => { for (let i = 0; i < (n || 1) && lastEnv; i++) spawnOne(lastEnv, 7, elem, rare); }, offers: () => OFF, keep: (id) => { const o = OFF.find((x) => x.id === id); if (!o) return { ok: false, why: 'gone' }; const r = H.keep(o.k); if (r.ok) OFF.splice(OFF.indexOf(o), 1); return r; }, get shots() { return PR; }, BEH,
    get sel() { return st.sel; }, setSel: (i) => { st.sel = Math.max(0, Math.min(3, i)); },
    cdFrac: () => (st.cdTot ? st.cd / st.cdTot : 0), get hero() { return hero; }, get down() { return st.down > 0; },
    get enemies() { return E; }, moves: () => (hero ? hero.k.kit.map((m, i) => ({ name: m.name, kind: m.kind, sub: m.sub, i: i })) : []),
    ready: () => on, enabled, benchList: () => (on ? benchSides().map((b) => ({ seed: b.k.seed, name: b.k.name, pct: Math.round(100 * b.hp / b.max), ok: b.hp > 0 })) : []),
  };
})();
