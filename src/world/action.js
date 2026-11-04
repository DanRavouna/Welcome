// ---- ACT: action mode (prototype). Your lead critter fights live in the overworld: tap Attack = slash with the chosen move, hold = pick the move on a wheel ----
// Setting `settings.arpg` (off by default; the turn-based and real-time battles stay as they are). Everything here is memory only: nothing is saved.
// Reuses Game.hit() (types, abilities, statuses) and Game.endRound() (burn / drain ticks), so damage rules are the same as in the old battles.
// Enemies are visible wild critters on maps with tall grass; they replace the random grass encounters while the mode is on.
// world.js calls: ACT.step(env) every frame, ACT.items(env) (y-sorted drawables), ACT.drawFx(env) (slashes, numbers, bars) and ACT.active() (grass encounters off).
const ACT = (() => {
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const CD = [0.45, 1.1, 1.4, 3.0];            // seconds: quick slash, heavy slash, guard, special
  let GH = [], H = null, hero = null, team = {}, OFF = [], orbId = 1, duel = null, armed = false, E = [], FX = [], mapId = '', spawnT = 0, lastEnv = null, on = false;
  const st = { sel: 0, cd: 0, cdTot: 1, atk: null, down: 0, calm: 0, guard: 0, quiet: 0, swapIn: null };
  const rand = Math.random;
  function bind(h) { H = h; if (typeof VFX !== 'undefined') VFX.bind(h); }
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
  function mkHero() { const k = lead(); hero = k ? sideFor(k) : null; if (k) VFX.warm(k.element.name, k.element.color); }
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
  function reset(e) { if (duel) abortDuel('You left the duel.'); VFX.clear(); GH = []; E = []; FX = []; PR = []; OFF = []; mapId = e.M.id; spawnT = 3; st.atk = null; st.cd = 0; if (wildOk(e)) for (let i = 0; i < 4; i++) spawnOne(e, 7); }
  const wildOk = (e) => e.M.rate > 0 && !e.M.cave && !e.M.interior;
  const num = (x, y, text, col) => FX.push({ k: 'num', x: x, y: y, text: text, col: col, t: 0 });
  function heroPos() { const f = lastEnv.FOL; return { x: f.x + (f.ox || 0), y: f.y + (f.oy || 0) }; }
  function faceVec(e) { return DIRS[(e.lead ? e.FOL.dir : e.P.dir)] || DIRS.down; }   // in critter-lead mode the critter (e.FOL) is the one you steer
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
    const ex = o.x + a.dir[0] * a.dash * 0.9, ey = o.y + a.dir[1] * a.dash * 0.9;   // the critter lunges to its target first: the blow lands where the lunge ends
    const cx = ex + a.dir[0] * 0.85 * e.TS, cy = ey + a.dir[1] * 0.85 * e.TS, g = H.game();
    const EL = hero.k.element.name, HEX = hero.k.element.color, bigFx = heavy || a.kind === 'status', Rs = bigFx ? 60 : 44;
    VFX.slash(EL, HEX, cx - a.dir[0] * Rs, cy - a.dir[1] * Rs - 8, Math.atan2(a.dir[1], a.dir[0]), bigFx);   // the crescent sits where the blow lands
    if (a.kind === 'guard') return;
    E.slice().forEach((m) => {
      if (Math.hypot(m.x - cx, m.y - cy) > rad + 8) return;
      if (a.kind === 'attack' && rand() * 100 >= mv.acc) { num(m.x, m.y - 26, 'Miss', '#FFFFFF'); return; }
      const before = m.s.hp, power = a.kind === 'status' ? Math.round(hero.k.kit[0].power * 0.6) : mv.power;
      g.hit(hero, m.s, power, rand); const mult = ((m.s.fxHits || [])[0] || {}).m || 1; delete m.s.fxHits;
      if (a.kind === 'status') { const key = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' }[mv.effect]; if (key) m.s[key] = mv.effect === 'daze' ? 2 : 3; else if (mv.effect === 'heal') { hero.hp = Math.min(hero.max, hero.hp + Math.round(hero.max * 0.28)); } else if (mv.effect === 'fortify') hero.fort = 4; }
      const dmg = before - m.s.hp; num(m.x, m.y - 26, String(dmg), dmg >= 40 ? '#FFD86B' : '#FFFFFF'); if (H.sfx && dmg > 0) H.sfx('hit');
      if (dmg > 0) { const big = heavy || mult > 1; VFX.impact(EL, HEX, m.x, m.y - 14, big); VFX.burst(EL, HEX, m.x, m.y - 14, big ? 14 : 8, a.dir[0], a.dir[1], big ? 1.3 : 1); VFX.shake(a.dir[0], a.dir[1], heavy ? 7 : (mult > 1 ? 5 : 3)); VFX.hitStop(heavy ? 0.09 : 0.05); if (mult > 1) num(m.x, m.y - 42, 'Strong!', '#FFD86B'); else if (mult < 1) num(m.x, m.y - 42, 'Weak', '#9FB0D0'); }
      m.flash = 0.16; m.mode = 'chase'; m.t = 0; const d = Math.hypot(m.x - o.x, m.y - o.y) || 1, kb = (heavy ? 1.3 : 0.7) * e.TS; m.kx = (m.x - o.x) / d * kb * 6; m.ky = (m.y - o.y) / d * kb * 6;
      if (m.s.hp <= 0) kill(m, e);
    });
  }
  function kill(m, e) {
    VFX.impact(m.k.element.name, m.k.element.color, m.x, m.y - 14, true); VFX.burst(m.k.element.name, m.k.element.color, m.x, m.y - 14, 16, 0, 0, 1.2);
    E.splice(E.indexOf(m), 1); for (let i = 0; i < 8; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 80, vy: -20 - rand() * 50, t: 0, col: m.k.element.color });
    if (m.duel) {   // a trainer's critter: its XP is paid when the duel ends, there is nothing to keep
      duel.down += 1; duel.koXp[hero.k.seed] = (duel.koXp[hero.k.seed] || 0) + 8 + 2 * (m.k.lv || 1) + 5 * (m.k.stage || 1); if (H.sfx) H.sfx('claim');
      if (duel.down >= duel.queue.length) endDuel(true); else duel.next = 1.3;
      return;
    }
    spawnT = Math.min(spawnT, 8);
    if (H.worthy && H.worthy(m.k) && !OFF.some((o) => o.k.seed === m.k.seed)) OFF.push({ id: orbId++, k: m.k, x: m.x, y: m.y, t: 0, life: 30 });   // a catch orb: walk over it to put it in the pouch
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
  const duelK = () => { const o = (typeof window !== 'undefined' && window.__duel) || { hp: DUEL_HP, dmg: DUEL_DMG, pace: DUEL_PACE }, t = (duel && DUEL_TUNE[duel.tr.id]) || {}; return { hp: o.hp * (t.hp || 1), dmg: o.dmg * (t.dmg || 1), pace: o.pace * (t.pace || 1) }; };   // window.__duel is the simulator's override
  function koHero() {
    hero.hp = 0; st.atk = null; hero.guard = false; st.guard = 0; if (H.sfx) H.sfx('lose');
    const alt = benchSides().filter((b) => b.hp > 0).sort((a, b) => b.hp / b.max - a.hp / a.max)[0];
    if (alt) { st.swapIn = { seed: alt.k.seed, t: 0.9 }; st.calm = 1.6; if (H.toast) H.toast(hero.k.name + ' was knocked out. Go, ' + alt.k.name + '!'); }
    else { st.down = 4; st.calm = 4; if (duel) endDuel(false); else if (H.toast) H.toast('Your party is knocked out. They recover in a moment.'); }
  }
  function hurtHero(m, mul) {
    if (m.duel) mul *= duelK().dmg;
    const before = hero.hp, guarded = hero.guard; H.game().hit(m.s, hero, Math.max(1, Math.round(m.k.kit[0].power * mul)), rand); delete hero.fxHits;
    const o = heroPos(), me = m.k.element, bx = o.x - m.x, by = o.y - m.y;
    if (guarded) { VFX.impact('Frost', '#9CC8FF', o.x, o.y - 14, false); VFX.burst('Frost', '#9CC8FF', o.x, o.y - 14, 8, bx, by, 1); VFX.shake(bx, by, 2); } else { VFX.impact(me.name, me.color, o.x, o.y - 14, false); VFX.burst(me.name, me.color, o.x, o.y - 14, 7, bx, by, 0.9); VFX.shake(bx, by, 3.5); } num(o.x, o.y - 30, String(Math.round(before - hero.hp)), '#FF8A7A'); st.quiet = 0; hero.__hurt = 0.2; if (H.sfx) H.sfx('hit'); if (hero.hp <= 0) koHero();
  }
  const closest = (m, p, h) => Math.min(Math.hypot(p.x - m.x, p.y - m.y), Math.hypot(h.x - m.x, h.y - m.y));
  function allyToHeal(m, e) { let best = null, br = 0.9; E.forEach((o) => { if (o === m || o.s.hp <= 0) return; const r = o.s.hp / o.s.max; if (r < br && Math.hypot(o.x - m.x, o.y - m.y) < 6 * e.TS) { br = r; best = o; } }); return best; }
  function think(m, e, dt, p, hp0, dp, dh) {
    const B = BEH[m.k.element.name] || BDEF, TS = e.TS;
    if (m.dash > 0) { m.dash -= dt; walk(m, e, m.dvx, m.dvy, dt); VFX.trail(m.k.element.name, m.k.element.color, m.x, m.y - 10); VFX.trail(m.k.element.name, m.k.element.color, m.x, m.y - 14); const hpos = heroPos(); if (!m.dashHit && closest(m, p, hpos) < 0.95 * TS) { m.dashHit = true; hurtHero(m, B.mul); } return; }
    if (m.tele > 0) {
      m.tele -= dt; if (m.tele > 0) return;
      const hpos = heroPos(), aim = m.aim || { x: hpos.x, y: hpos.y }, ax = aim.x, ay = aim.y; if (!m.kind) m.kind = 'melee';
      if (m.s.daze > 0 && rand() < 0.45) return;
      if (m.kind === 'melee') { { const q = Math.hypot(hpos.x - m.x, hpos.y - m.y) || 1, ux = (hpos.x - m.x) / q, uy = (hpos.y - m.y) / q, me = m.k.element; VFX.slash(me.name, me.color, m.x + ux * 0.9 * TS - ux * 44, m.y + uy * 0.9 * TS - uy * 44 - 8, Math.atan2(uy, ux), false); } if (closest(m, p, hpos) < 1.35 * TS) { hurtHero(m, B.mul); if (B.runAway) m.retreat = B.runAway; } }
      else if (m.kind === 'dash') { const L = Math.hypot(ax - m.x, ay - m.y) || 1; m.dvx = (ax - m.x) / L * 300; m.dvy = (ay - m.y) / L * 300; m.dash = 0.3; m.dashHit = false; }
      else if (m.kind === 'shoot') { const L = Math.hypot(ax - m.x, ay - m.y) || 1; PR.push({ x: m.x, y: m.y - 12, vx: (ax - m.x) / L * (B.ps || 100), vy: (ay - m.y) / L * (B.ps || 100), t: 0, m: m, mul: B.mul, col: m.k.element.color }); }
      else if (m.kind === 'aoe') { FX.push({ k: 'ring', x: m.x, y: m.y - 4, r: B.rad * TS, t: 0, col: m.k.element.color }); VFX.impact(m.k.element.name, m.k.element.color, m.x, m.y - 6, true); VFX.burst(m.k.element.name, m.k.element.color, m.x, m.y - 6, 14, 0, 0, 1.2); if (closest(m, p, hpos) < B.rad * TS) hurtHero(m, B.mul); }
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
    else if (B.atk === 'shoot' && d <= 7 * TS) kind = 'shoot';   // also point-blank: hugging a shooter must not switch it off
    else if (B.atk === 'blink') kind = d > 2.5 * TS ? 'blink' : (d <= 0.95 * TS ? 'melee' : null);
    else if (B.atk === 'heal') kind = allyToHeal(m, e) ? 'heal' : (d <= 7 * TS ? 'shoot' : null);
    if (!kind) return;
    m.kind = kind; m.tele = B.tele; m.cd = (B.cd + rand() * 0.4) * (m.duel ? duelK().pace : 1); m.aim = { x: tx, y: ty };
    if (kind === 'blink') m.aim = { x: tx + ux * 0.9 * TS, y: ty + uy * 0.9 * TS };   // behind you
    if (kind === 'heal') m.aim = { x: m.x, y: m.y };
  }
  // ---- trainer duels (the old battle screen, played live): the trainer's critters come out one at a time next to the trainer ----
  function spawnDuelFoe(e) {
    const d = duel, g = H.game(), k = g.make(d.queue[d.idx], d.tr.stage, d.tr.lv || 1); d.idx += 1;
    const s = g.newBattle(lead(), k, 0).s[1]; s.label = d.tr.name + "'s " + k.name; d.lastFoe = s; s.max = Math.round(s.max * duelK().hp); s.hp = s.max;
    const p = e.P, n = d.npc, bx = n ? (n.x + 0.5) * e.TS : p.x, by = n ? (n.y + 0.9) * e.TS : p.y, a0 = Math.atan2(p.y - by, p.x - bx); let best = null;
    for (const r of [2.2, 1.6, 3, 1]) for (let i = 0; i < 8 && !best; i++) { const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5, x = bx + Math.cos(a) * r * e.TS, y = by + Math.sin(a) * r * e.TS; if (tileFree(e, x, y)) best = { x: x, y: y }; }
    if (!best) best = { x: bx, y: by };
    E.push({ k: k, s: s, x: best.x, y: best.y, hx: best.x, hy: best.y, mode: 'chase', t: 0, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0, tele: 0, cd: 1.2, tick: 1, img: H.img(k), duel: true });
    num(best.x, best.y - 36, d.tr.name + ' sent out ' + k.name + '!', '#FFFFFF'); if (H.sfx) H.sfx('claim');
  }
  // o = { tr (the same object the battle screen uses), npc, party (Tower: the run's critters), hp (Tower: their HP), surge (Tower twist type) }
  function startDuel(o) {
    if (!armed || !hero || duel || !lastEnv) return false;
    const e = lastEnv; duel = { tr: o.tr, npc: o.npc || null, queue: o.tr.team.slice(), idx: 0, down: 0, part: {}, koXp: {}, next: 0.9, party: o.party || null, surge: o.surge || null, lastFoe: null };
    mapId = e.M.id; E = []; PR = []; OFF = []; FX = []; st.calm = 0; st.swapIn = null;
    if (o.party) {
      o.party.forEach((sd) => { const k = H.kOf(sd); if (k) { const side = sideFor(k); if (o.hp && o.hp[sd] !== undefined) side.hp = Math.max(0, Math.min(side.max, o.hp[sd])); } });
      const lk = lead(); if (!lk || o.party.indexOf(lk.seed) === -1 || team[lk.seed].side.hp <= 0) { const alive = o.party.find((sd) => team[sd] && team[sd].side.hp > 0); if (alive) H.setLead(alive); }
    }
    return true;
  }
  function endDuel(win) {
    const d = duel; duel = null; const g = H.game(); g._surge = null; E = E.filter((m) => !m.duel); PR = []; st.calm = 3; spawnT = 6;
    const lines = g.actDuelEnd(d.tr, win, { lead: hero, foe: d.lastFoe || hero, bench: benchSides(), part: d.part, koXp: d.koXp });
    if (H.duelDone) H.duelDone(d.tr, d.npc, win, lines);
  }
  function abortDuel(why) {
    const d = duel; if (!d) return; duel = null; H.game()._surge = null; E = E.filter((m) => !m.duel); PR = [];
    if (d.tr.tower && hero) H.game().actTowerHold([hero].concat(benchSides()));
    if (why && H.toast) H.toast(why + (d.tr.tower ? ' Your HP is kept; the floor starts over.' : ' No reward.'));
  }
  function step(e) {
    on = false; lastEnv = e;
    armed = false;
    if (!enabled() || !e.fol || e.M.interior) { if (duel) abortDuel(''); if (E.length) { E = []; FX = []; PR = []; OFF = []; mapId = ''; VFX.clear(); } if (e.FOL) { e.FOL.ox = 0; e.FOL.oy = 0; } return; }
    mkHero(); if (!hero) return; armed = true;
    if (!wildOk(e) && !duel) { if (E.length) { E = []; FX = []; PR = []; OFF = []; } mapId = ''; if (e.FOL) { e.FOL.ox = 0; e.FOL.oy = 0; } return; }   // a quiet place (city, cave): nothing roams here
    on = true; const dt = e.dt, g = H.game();
    if (mapId !== e.M.id) reset(e);
    if (VFX.freeze(dt)) return;   // hit-stop: a blow freezes the fight for a few frames
    VFX.step(dt); GH.forEach((q) => { q.t += dt; }); GH = GH.filter((q) => q.t < 0.2);
    st.cd = Math.max(0, st.cd - dt); st.calm = Math.max(0, st.calm - dt); st.quiet += dt;
    if (st.guard > 0) { st.guard -= dt; if (st.guard <= 0) hero.guard = false; }
    if (st.down > 0) { st.down -= dt; if (st.down <= 0) Object.keys(team).forEach((k) => { const sd = team[k].side; sd.hp = Math.max(sd.hp, Math.round(sd.max * 0.5)); }); }
    if (!duel && st.quiet > 4 && hero.hp > 0 && st.down <= 0) hero.hp = Math.min(hero.max, hero.hp + hero.max * 0.03 * dt);
    if (!duel) benchSides().forEach((b) => { const c = team[b.k.seed]; if (b.hp > 0) b.hp = Math.min(b.max, b.hp + b.max * 0.015 * dt); else { c.rev += dt; if (c.rev >= 40) { c.rev = 0; b.hp = Math.round(b.max * 0.25); } } });
    if (st.swapIn) { st.swapIn.t -= dt; if (st.swapIn.t <= 0) { const sw = st.swapIn.seed; st.swapIn = null; H.setLead(sw); st.cd = st.cdTot = 0.5; if (H.sfx) H.sfx('claim'); } }
    if (duel) {   // a trainer duel: the trainer's critters come out one at a time
      duel.part[hero.k.seed] = true; g._surge = duel.surge || null;
      if (!E.some((m) => m.duel) && duel.idx < duel.queue.length) { duel.next -= dt; if (duel.next <= 0) spawnDuelFoe(e); }
    }
    // the swing
    const f = e.FOL, a = st.atk; f.ox = 0; f.oy = 0;
    if (a) {
      a.t += dt; const W = 0.09, S = 0.12, R = 0.2; let k = 0;
      if (a.t < W) k = -0.25 * (a.t / W); else if (a.t < W + S) { k = -0.25 + 1.25 * ((a.t - W) / S); if (!a.done) { a.done = true; strike(e); } } else if (a.t < W + S + R) k = 1 - (a.t - W - S) / R; else st.atk = null;
      const L = a.kind === 'guard' ? 0 : (k < 0 ? k * e.TS * 0.6 : k * a.dash); f.ox = a.dir[0] * L; f.oy = a.dir[1] * L;
      if (a.kind !== 'guard' && a.t > 0.09 && L > 6) GH.push({ x: f.x + f.ox, y: f.y + f.oy, t: 0 });   // afterimages of the lunge
    }
    const hp0 = heroPos(), p = e.P;
    // enemies
    E.slice().forEach((m) => {
      m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt); m.t += dt;
      if (Math.abs(m.kx) + Math.abs(m.ky) > 1) { walk(m, e, m.kx, m.ky, dt); m.kx *= 0.82; m.ky *= 0.82; } else { m.kx = 0; m.ky = 0; }
      m.tick -= dt; if (m.tick <= 0) { m.tick = 1; if (m.s.burn || m.s.sap || m.s.weak || m.s.daze) { const b = { s: [m.s, dummy()], log: [], round: 1, over: false }, h = m.s.hp; g.endRound(b); if (m.s.hp < h) num(m.x, m.y - 26, String(h - m.s.hp), '#FF9A5A'); if (m.s.hp <= 0) { kill(m, e); return; } } }
      const dp = Math.hypot(p.x - m.x, p.y - m.y), dh = Math.hypot(hp0.x - m.x, hp0.y - m.y), near = Math.min(dp, dh);
      if (m.mode === 'idle') { if ((near < 5 * e.TS || m.duel) && st.calm <= 0 && st.down <= 0) { m.mode = 'chase'; m.t = 0; m.s.__alert = 0.5; } else { if (m.t > 1.5) { m.t = 0; const r = rand(); m.dx = r < 0.4 ? 0 : (rand() - 0.5) * 2; m.dy = r < 0.4 ? 0 : (rand() - 0.5) * 2; } if (Math.hypot(m.x - m.hx, m.y - m.hy) > 4 * e.TS) { m.dx = Math.sign(m.hx - m.x); m.dy = Math.sign(m.hy - m.y); } walk(m, e, m.dx * 26, m.dy * 26, dt); } }
      else { if ((!m.duel && near > 9 * e.TS) || st.calm > 0 || st.down > 0) { m.mode = 'idle'; m.tele = 0; m.dash = 0; return; } think(m, e, dt, p, hp0, dp, dh); }
    });
    if (hero.__hurt) hero.__hurt = Math.max(0, hero.__hurt - dt);
    { const hp2 = heroPos(); OFF.slice().forEach((o) => { o.t += dt;
      if (o.t > 0.4 && (Math.hypot(hp2.x - o.x, hp2.y - o.y) < 1.2 * e.TS || Math.hypot(e.P.x - o.x, e.P.y - o.y) < 1.2 * e.TS)) {
        const r = H.pouchAdd ? H.pouchAdd(o.k.seed) : false;
        if (r === true) { OFF.splice(OFF.indexOf(o), 1); VFX.burst(o.k.element.name, o.k.element.color, o.x, o.y - 10, 10, 0, 0, 0.8); num(o.x, o.y - 26, '+ ' + o.k.name, '#FFE9A0'); if (H.sfx) H.sfx('claim'); return; }
        if (r === 'full' && !o.warned) { o.warned = true; num(o.x, o.y - 26, 'Pouch full', '#FF9A8A'); }
      }
      if (o.t > o.life) OFF.splice(OFF.indexOf(o), 1); }); }
    PR.slice().forEach((q) => { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; const hp1 = heroPos(); if (rand() < 0.7) VFX.trail(q.m.k.element.name, q.col, q.x, q.y);
      if (q.t > 2.4 || !tileFree(e, q.x, q.y + 12)) { PR.splice(PR.indexOf(q), 1); return; }
      if (Math.min(Math.hypot(hp1.x - q.x, hp1.y - 12 - q.y), Math.hypot(e.P.x - q.x, e.P.y - 12 - q.y)) < 0.6 * e.TS && hero.hp > 0 && st.down <= 0) { PR.splice(PR.indexOf(q), 1); if (q.m && q.m.s.hp > 0) hurtHero(q.m, q.mul); } });
    // respawns
    spawnT -= dt; if (spawnT <= 0) { spawnT = 6; if (!duel && E.length < 4 && wildOk(e)) spawnOne(e, 8); }
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
      VFX.status(c, x + 16, y - 44, m.s, e.t);
    } }));
    return out;
  }
  function drawFx(e) {
    if (!on) return; const c = e.ctx;
    // your critter: health bar and guard bubble
    const o = heroPos(), x = e.snap(o.x - e.cx), y = e.snap(o.y - e.cy);
    c.fillStyle = '#1E2A4A'; c.fillRect(x - 15, y - 44, 30, 6); c.fillStyle = st.down > 0 ? '#9FB0D0' : (hero.hp / hero.max > 0.5 ? '#A7F04A' : (hero.hp / hero.max > 0.25 ? '#FFD86B' : '#FF6B6B')); c.fillRect(x - 14, y - 43, Math.max(0, Math.round(28 * hero.hp / hero.max)), 4);
    if (e.fol && e.fol.img && e.fol.img.complete && GH.length) { const hh = Math.round(30 * e.fol.img.height / Math.max(1, e.fol.img.width)); GH.forEach((q) => { c.globalAlpha = 0.4 * (1 - q.t / 0.2); c.drawImage(e.fol.img, e.snap(q.x - e.cx - 15), e.snap(q.y - e.cy - hh), 30, hh); }); c.globalAlpha = 1; }
    if (hero.guard) VFX.shield(c, x, y, e.t, hero.k.element.color);
    if (st.down > 0) { c.fillStyle = '#FFFFFF'; c.font = '800 11px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('KO', x, y - 50); }
    E.forEach((m) => { if (!(m.tele > 0) || !m.aim) return; const B = BEH[m.k.element.name] || BDEF, mx = e.snap(m.x - e.cx), my = e.snap(m.y - e.cy), u = 1 - m.tele / B.tele; c.save(); c.strokeStyle = 'rgba(255,80,60,' + (0.35 + 0.4 * u) + ')'; c.lineWidth = 3;
      if (m.kind === 'aoe') { c.beginPath(); c.arc(mx, my - 4, B.rad * e.TS * (0.55 + 0.45 * u), 0, 6.3); c.stroke(); }
      else if (m.kind === 'dash') { c.beginPath(); c.moveTo(mx, my - 8); c.lineTo(e.snap(m.aim.x - e.cx), e.snap(m.aim.y - e.cy) - 8); c.stroke(); }
      else if (m.kind === 'blink') { const bx = e.snap(m.aim.x - e.cx), by = e.snap(m.aim.y - e.cy); c.beginPath(); c.arc(bx, by - 4, 10, 0, 6.3); c.stroke(); }
      c.restore(); });
    OFF.forEach((o) => {
      const ox = e.snap(o.x - e.cx), drop = o.t < 0.4 ? Math.sin(o.t / 0.4 * Math.PI) * 14 : 0, oy = e.snap(o.y - e.cy - 8 - drop + Math.sin(e.t * 3 + o.id) * 2);
      if (ox < -30 || ox > e.vw + 30 || oy < -30 || oy > e.vh + 30) return; if (o.life - o.t < 5 && Math.floor(e.t * 6) % 2) return;   // blinks when about to fade
      const k = o.k, col = k.element.color, rare = k.rarity === 'Rare' || k.rarity === 'Mythic' || k.shiny, tw = 0.5 + 0.5 * Math.sin(e.t * 5 + o.id);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(ox - 9, oy + 14, 18, 4);
      c.save(); c.globalAlpha = 0.38 + 0.14 * tw; c.fillStyle = col; c.beginPath(); c.arc(ox, oy, 21, 0, 6.3); c.fill(); c.globalAlpha = 0.55; c.strokeStyle = '#FFFFFF'; c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, 18, 0, 6.3); c.stroke(); c.restore();
      c.imageSmoothingEnabled = false; c.drawImage(VFX.orb(k.element.name, col), ox - 18, oy - 18, 36, 36);
      if (rare) { c.strokeStyle = k.rarity === 'Mythic' || k.shiny ? '#FFD86B' : '#BFD8FF'; c.lineWidth = 2; c.globalAlpha = 0.6 + 0.4 * tw; c.beginPath(); c.arc(ox, oy, 24 + tw * 2, 0, 6.3); c.stroke(); c.globalAlpha = 1; if (k.shiny || k.rarity === 'Mythic') { c.fillStyle = '#FFF3B0'; c.fillRect(ox + 12, oy - 18 - Math.round(tw * 2), 3, 7); c.fillRect(ox + 10, oy - 16 - Math.round(tw * 2), 7, 3); } }
    });
    PR.forEach((q) => { const qx = e.snap(q.x - e.cx), qy = e.snap(q.y - e.cy); c.imageSmoothingEnabled = false; c.drawImage(VFX.orb(q.m.k.element.name, q.col), qx - 14, qy - 14, 28, 28); });
    VFX.draw(c, e.cx, e.cy, e.snap);
    FX.forEach((f) => {
      const fx = e.snap(f.x - e.cx), fy = e.snap(f.y - e.cy);
      if (f.k === 'ring') { c.save(); c.globalAlpha = 1 - f.t / 0.5; c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.arc(fx, fy, f.r * (0.5 + f.t), 0, 6.3); c.stroke(); c.restore(); return; }
      if (f.k === 'slash') { const u = f.t / 0.22, w = (f.big ? 7 : 5); c.save(); c.globalAlpha = 1 - u * 0.8; c.strokeStyle = f.col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); const a0 = f.ang - 1.15 + u * 0.5, a1 = f.ang + 1.15 + u * 0.5; c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0, a1); c.stroke(); c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(2, w - 3); c.beginPath(); c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0 + 0.2, a1 - 0.2); c.stroke(); c.restore(); }
      else if (f.k === 'num') { c.save(); c.globalAlpha = 1 - f.t / 0.8; c.font = '900 13px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#1E2A4A'; const ty = fy - f.t * 26; c.strokeText(f.text, fx, ty); c.fillStyle = f.col; c.fillText(f.text, fx, ty); c.restore(); }
      else if (f.k === 'puff') { c.globalAlpha = 1 - f.t / 0.5; c.fillStyle = f.col; c.fillRect(fx - 2, fy - 2, 5, 5); c.globalAlpha = 1; }
    });
  }
  return {
    bind, step, items, drawFx, active, attack, swapTo, startDuel, giveUp: () => abortDuel('You gave up.'), dueling: () => !!duel, canDuel: () => armed && !duel,
    duelParty: () => (duel ? duel.party : null), duelInfo: () => (duel ? { name: duel.tr.name, total: duel.queue.length, defeated: duel.down, boss: !!(duel.tr.boss || duel.tr.leader || duel.tr.warden), tower: !!duel.tr.tower, floor: duel.tr.floor } : null), spawn: (n, elem, rare) => { for (let i = 0; i < (n || 1) && lastEnv; i++) spawnOne(lastEnv, 7, elem, rare); }, orbs: () => OFF, get shots() { return PR; }, BEH,
    get sel() { return st.sel; }, setSel: (i) => { st.sel = Math.max(0, Math.min(3, i)); },
    cdFrac: () => (st.cdTot ? st.cd / st.cdTot : 0), get hero() { return hero; }, get down() { return st.down > 0; },
    get enemies() { return E; }, moves: () => (hero ? hero.k.kit.map((m, i) => ({ name: m.name, kind: m.kind, sub: m.sub, i: i })) : []),
    ready: () => on, enabled, benchList: () => (on ? benchSides().map((b) => ({ seed: b.k.seed, name: b.k.name, pct: Math.round(100 * b.hp / b.max), ok: b.hp > 0 })) : []),
  };
})();
