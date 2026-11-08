// ---- ACT: action mode (prototype). Your lead critter fights live in the overworld: tap Attack = slash with the chosen move, hold = pick the move on a wheel ----
// Active whenever your critter is visible outside interiors; nothing here is saved (the pouch and kept critters live in the game state).
// Reuses Game.hit() (types, abilities, statuses) and Game.endRound() (burn / drain ticks), so damage rules are the same as in the old battles.
// Enemies are visible wild critters on maps with tall grass; they replace the random grass encounters while the mode is on.
// world.js calls: ACT.step(env) every frame, ACT.items(env) (y-sorted drawables), ACT.drawFx(env) (slashes, numbers, bars) and ACT.active() (grass encounters off).
const ACT = (() => {
  const dir8 = (vx, vy) => ['right', 'downright', 'down', 'downleft', 'left', 'upleft', 'up', 'upright'][((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8];
  const D7 = Math.SQRT1_2, DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0], upright: [D7, -D7], upleft: [-D7, -D7], downright: [D7, D7], downleft: [-D7, D7] };
  const CD = [0.45, 1.1, 1.4, 3.0];            // seconds: quick slash, heavy slash, guard, special
  let GH = [], H = null, hero = null, team = {}, OFF = [], orbId = 1, duel = null, armed = false, E = [], FX = [], mapId = '', spawnT = 0, lastEnv = null, on = false;
  const st = { sel: 0, cd: 0, cdTot: 1, vcd: 0, vcdTot: 1, atk: null, down: 0, calm: 0, guard: 0, quiet: 0, swapIn: null, veil: 0, stanceOn: false, stance: 0 };
  // the verbs have their own cooldown (st.vcd): playing the metaphor never takes the quick slash away (st.cd is set only by the slashes and the guard)
  const vset = (s) => { st.vcd = st.vcdTot = s; };
  const OPEN_S = 1.5, OPEN_MUL = 1.5;   // a held enemy (frozen, rooted, pulled, dazed, calmed) is open for OPEN_S: the slash lands OPEN_MUL times harder
  const live = () => E.filter((m) => m.mode !== 'down' && m.mode !== 'leave');   // the critters still in the fight (a down one is being kept, a leaving one is going)
  const heroBase = () => { const f = lastEnv.FOL; return { x: f.x, y: f.y }; };   // the body without the lunge offset: a slash from inside a standing ring must not shatter it
  // ---- type verbs (Meaning: each type's special is the thing its place plays). Frost: stand still and a ring of ice forms and widens; the first step shatters it. Ember: hold to feed the flame, release a cone that burns. ----
  let verb = null;   // { kind: 'frost', t, r, tick } or { kind: 'ember', t }
  const VERBS = { Frost: 'frost', Ember: 'ember', Tide: 'tide', Moss: 'moss', Volt: 'volt', Dusk: 'dusk', Stone: 'stone', Bloom: 'bloom' };
  let walls = [];   // Stone's walls: { tx, ty, hp, t, life }
  const wallAt = (x, y) => walls.find((w) => w.tx === Math.floor(x / 32) && w.ty === Math.floor(y / 32)) || null;
  const verbOf = () => (hero ? VERBS[hero.k.element.name] || null : null);
  const canVerb = () => on && lastEnv && hero && hero.hp > 0 && st.down <= 0 && !st.swapIn && st.cd <= 0 && !st.atk && !verb && st.sel === 3 && !!verbOf();
  function startFrost() { const o = heroBase(); verb = { kind: 'frost', t: 0, r: 0.6, tick: 0.25, ox: o.x, oy: o.y }; st.quiet = 0; if (H.sfx) H.sfx('tap'); }
  // Tide, Undertow (Meaning: what comes back): a wave goes out ahead and drags what it touched to your feet, soaked (weakened)
  function startTide() {
    const e = lastEnv, o = heroPos(), dir = faceVec(e), len = 2.6 * e.TS, g = H.game(), HEX = hero.k.element.color; let hit = 0;
    FX.push({ k: 'wave', x: o.x, y: o.y - 6, dx: dir[0], dy: dir[1], len: len, t: 0 });
    live().forEach((m) => { const vx = m.x - o.x, vy = m.y - o.y, along = vx * dir[0] + vy * dir[1], across = Math.abs(vx * dir[1] - vy * dir[0]); if (along < 0.3 * e.TS || along > len || across > 0.8 * e.TS) return;
      const before = m.s.hp; g.hit(hero, m.s, Math.max(1, Math.round(hero.k.kit[0].power * 0.5)), rand); delete m.s.fxHits; m.s.weak = 3; hit++;
      const d = Math.hypot(vx, vy) || 1, pull = Math.max(0, d - 1.0 * e.TS); m.kx = -vx / d * pull * 11; m.ky = -vy / d * pull * 11; m.pull = 0.45; m.open = OPEN_S; m.tele = 0; m.dash = 0; m.mode = 'chase';   // dragged back to a tile from you, no further, and open
      const dmg = before - m.s.hp; if (dmg > 0) { num(m.x, m.y - 26, String(dmg), '#DCEBFF'); VFX.impact('Tide', HEX, m.x, m.y - 14, false); } if (m.s.hp <= 0) kill(m, e); });
    VFX.burst('Tide', HEX, o.x + dir[0] * len * 0.6, o.y - 10 + dir[1] * len * 0.6, 10, -dir[0], -dir[1], 1.1); if (H.sfx) H.sfx(hit ? 'hit' : 'slash'); vset(hit ? 2.0 : 1.2);
  }
  // Moss, Root Bind (Meaning: tending): roots take the nearest critter where it stands; it cannot step while they hold, it is drained, and while you stay beside it the roots feed you back
  function startMoss() {
    const e = lastEnv, o = heroPos(), g = H.game(); let best = null, bd = 3.2 * e.TS;
    live().forEach((m) => { const d = Math.hypot(m.x - o.x, m.y - o.y); if (d < bd) { bd = d; best = m; } });
    if (!best) { const dir = faceVec(e); FX.push({ k: 'roots', x: o.x + dir[0] * 1.3 * e.TS, y: o.y + dir[1] * 1.3 * e.TS, t: 0, life: 0.5 }); vset(1.2); if (H.sfx) H.sfx('tap'); return; }
    const before = best.s.hp; g.hit(hero, best.s, Math.max(1, Math.round(hero.k.kit[0].power * 0.5)), rand); delete best.s.fxHits; best.s.sap = 3; best.rooted = 2.4; best.open = OPEN_S; best.kx = 0; best.ky = 0; best.dash = 0;
    const dmg = before - best.s.hp; if (dmg > 0) num(best.x, best.y - 26, String(dmg), '#A7F04A'); VFX.impact('Moss', hero.k.element.color, best.x, best.y - 8, false); if (H.sfx) H.sfx('hit'); if (best.s.hp <= 0) kill(best, e);
    vset(2.0);
  }
  // Volt, Arc Dash (Meaning: the wind that passes through): a line of light across three tiles through whatever stands there, dazing it
  function startVolt() { const e = lastEnv, o = heroPos(), dir = faceVec(e); verb = { kind: 'volt', t: 0, dir: dir, hit: [], x: o.x, y: o.y }; if (H.sfx) H.sfx('slash'); }
  function stepVolt(e, dt) {
    const g = H.game(), v = verb, spd = 10 * e.TS, o = heroPos(); v.t += dt;
    const nx = o.x + v.dir[0] * spd * dt, ny = o.y + v.dir[1] * spd * dt, free = tileFree(e, nx, ny) && (!e.solidAt || !e.solidAt(Math.floor(nx / e.TS), Math.floor(ny / e.TS)));
    if (free) { e.FOL.x = nx; e.FOL.y = ny; }   // the steered body is the world's own object, so this moves the player (and the sim's critter)
    const p2 = heroPos(); GH.push({ x: p2.x, y: p2.y, t: 0 }); VFX.trail('Volt', hero.k.element.color, p2.x, p2.y - 12);
    live().forEach((m) => { if (v.hit.indexOf(m) !== -1 || Math.hypot(m.x - p2.x, m.y - p2.y) > 0.95 * e.TS) return; v.hit.push(m); const before = m.s.hp; g.hit(hero, m.s, Math.max(1, Math.round(hero.k.kit[0].power * 0.6)), rand); delete m.s.fxHits; m.s.daze = 2; m.open = OPEN_S;
      const sx = -v.dir[1], sy = v.dir[0], side = ((m.x - p2.x) * sx + (m.y - p2.y) * sy) >= 0 ? 1 : -1; m.kx = sx * side * 5 * e.TS; m.ky = sy * side * 5 * e.TS; m.tele = 0; m.dash = 0;
      const dmg = before - m.s.hp; num(m.x, m.y - 26, String(dmg), '#FFF4C7'); if (dmg > 0) { VFX.impact('Volt', hero.k.element.color, m.x, m.y - 14, false); if (H.sfx) H.sfx('hit'); } if (m.s.hp <= 0) kill(m, e); });
    if (!free || v.t >= 0.3) { verb = null; vset(1.4); }
  }
  // Dusk, Veil (Meaning: the dark you step into): the critter fades, what hunts it loses it, and the first blow out of the dark lands hard and ends the veil
  function startDusk() { st.veil = 1.6; const o = heroPos(); for (let i = 0; i < 8; i++) FX.push({ k: 'puff', x: o.x, y: o.y - 10, vx: (rand() - 0.5) * 70, vy: -10 - rand() * 40, t: 0, col: '#5B45B8' }); vset(0.5); if (H.sfx) H.sfx('tap'); }
  // Stone, Bulwark (Meaning: what is kept): a wall of stone where you face; it takes the blows and the charges meant for you until it has taken enough, and nothing passes it
  function startStone() {
    const e = lastEnv, o = heroPos(), dir = faceVec(e), tx = Math.floor((o.x + dir[0] * 1.2 * e.TS) / e.TS), ty = Math.floor((o.y + dir[1] * 1.2 * e.TS) / e.TS);
    if (e.solidAt(tx, ty) || wallAt(tx * e.TS + 16, ty * e.TS + 16) || E.some((m) => Math.floor(m.x / e.TS) === tx && Math.floor(m.y / e.TS) === ty)) { vset(0.8); if (H.sfx) H.sfx('tap'); return; }
    walls.push({ tx: tx, ty: ty, hp: 3, t: 0, life: 7 }); VFX.impact('Stone', '#A8A29E', tx * e.TS + 16, ty * e.TS + 8, true); VFX.shake(dir[0], dir[1], 4); if (H.sfx) H.sfx('hit'); vset(3.0);
  }
  // Bloom, Soothing Scent (Meaning: gives without being asked): petals bloom around you; you and yours heal while you stand in them, and what comes near forgets the fight for a moment
  function startBloom() { verb = { kind: 'bloom', t: 0, r: 2.0, tick: 0 }; if (H.sfx) H.sfx('tap'); }
  function stepBloom(e, dt) {
    const v = verb, o = heroPos(); v.t += dt; v.tick -= dt;
    if (v.tick <= 0) { v.tick = 0.5; const h = Math.max(1, Math.round(hero.max * 0.06)); if (hero.hp > 0 && hero.hp < hero.max) { hero.hp = Math.min(hero.max, hero.hp + h); num(o.x, o.y - 34, '+' + h, '#F9A8D4'); }
      benchSides().forEach((b) => { if (b.hp > 0 && b.hp < b.max) b.hp = Math.min(b.max, b.hp + Math.max(1, Math.round(b.max * 0.06))); });
      live().forEach((m) => { if (Math.hypot(m.x - o.x, m.y - o.y) <= v.r * e.TS + 8) { m.calmT = 1.2; m.open = OPEN_S; m.mode = 'idle'; m.tele = 0; m.dash = 0; } }); }
    if (v.t >= 2.4) { verb = null; vset(3.5); }
  }
  // the heavy blow (slot 1) is fed the same way for every type: hold, then let go; a tap is the light version and it never misses
  const canFeed = () => on && lastEnv && hero && hero.hp > 0 && st.down <= 0 && !st.swapIn && !st.atk && !verb && ((st.sel === 1 || st.sel === 2) ? st.cd <= 0 : (st.sel === 3 && verbOf() === 'ember' && st.vcd <= 0));   // the flame (Ember's verb) waits for the verb cooldown, the heavy and the guard for the slash's
  function chargeStart() { if (!canFeed()) return false; if (st.sel === 2) { hero.guard = true; st.stanceOn = true; st.guard = 0; st.stance = 0; if (H.sfx) H.sfx('tap'); return true; } verb = { kind: st.sel === 1 ? 'heavy' : 'ember', t: 0 }; if (H.sfx) H.sfx('tap'); return true; }
  function chargeCancel() { if (verb && (verb.kind === 'ember' || verb.kind === 'heavy')) verb = null; if (st.stanceOn) { st.stanceOn = false; hero.guard = false; st.guard = 0; } }
  function chargeEnd() {
    if (st.stanceOn) { st.stanceOn = false; if (st.stance < 0.25) { st.guard = 1.3; st.cd = st.cdTot = CD[2]; } else { hero.guard = false; st.guard = 0; st.cd = st.cdTot = 0.4; } st.stance = 0; return true; }   // let go: a quick tap leaves the short guard up, a held stance drops
    if (!verb || (verb.kind !== 'ember' && verb.kind !== 'heavy')) return false; const kind = verb.kind, ch = Math.max(0, Math.min(1, (verb.t - 0.12) / (kind === 'heavy' ? 0.8 : 1.2))); verb = null;   // the heavy gathers in 0.8 s, the flame in 1.2
    if (kind === 'ember') { fireCone(ch); return true; }
    swing(1, 0.6 + 1.4 * ch); return true;   // the heavy: 0.6x when tapped, 2x when fed 1.3 s, and it never misses
  }
  function fireCone(ch) {
    const e = lastEnv, o = heroPos(), dir = faceVec(e), len = (1.3 + 1.6 * ch) * e.TS, half = 0.62, g = H.game(), EL = 'Ember', HEX = hero.k.element.color;
    FX.push({ k: 'cone', x: o.x, y: o.y - 8, dx: dir[0], dy: dir[1], len: len, t: 0, ch: ch });
    live().forEach((m) => { const vx = m.x - o.x, vy = m.y - o.y, d = Math.hypot(vx, vy) || 1; if (d > len + 10) return; const ang = Math.acos(Math.max(-1, Math.min(1, (vx * dir[0] + vy * dir[1]) / d))); if (ang > half && d > 0.6 * e.TS) return;
      const before = m.s.hp; g.hit(hero, m.s, Math.max(1, Math.round(hero.k.kit[0].power * (0.5 + 1.3 * ch))), rand); delete m.s.fxHits; m.s.burn = 3;
      const dmg = before - m.s.hp; num(m.x, m.y - 26, String(dmg), ch > 0.6 ? '#FFD86B' : '#FFFFFF'); if (dmg > 0) { VFX.impact(EL, HEX, m.x, m.y - 14, ch > 0.6); VFX.burst(EL, HEX, m.x, m.y - 14, 6 + Math.round(10 * ch), dir[0], dir[1], 1); m.flash = 0.16; m.mode = 'chase'; m.kx = dir[0] * (0.4 + ch) * e.TS * 6; m.ky = dir[1] * (0.4 + ch) * e.TS * 6; if (H.sfx) H.sfx('hit'); }
      if (m.s.hp <= 0) kill(m, e); });
    VFX.shake(dir[0], dir[1], 2 + 5 * ch); if (H.sfx) H.sfx('slash'); vset(0.8 + 0.8 * ch);
  }
  function stepVerb(e, dt) {
    walls.forEach((w) => { w.t += dt; }); walls = walls.filter((w) => w.hp > 0 && w.t < w.life);
    if (st.stanceOn) { st.stance = (st.stance || 0) + dt; if (st.stance > 2.5 || hero.hp <= 0) { st.stanceOn = false; hero.guard = false; st.guard = 0; st.stance = 0; st.cd = st.cdTot = 1.5; if (H.sfx) H.sfx('tap'); } }   // the stance cannot be held forever: it breaks at 2.5 s
    if (st.veil > 0) { st.veil -= dt; if (st.veil <= 0) { st.veil = 0; vset(2.5); } }   // the veil fades on its own, and then needs a while to gather again
    if (!verb) return; const g = H.game();
    if (verb.kind === 'volt') { stepVolt(e, dt); return; }
    if (verb.kind === 'bloom') { stepBloom(e, dt); return; }
    if (verb.kind === 'ember' || verb.kind === 'heavy') { verb.t = Math.min(1.6, verb.t + dt); if (hero.hp <= 0) verb = null; return; }
    const hp = heroBase(); if (Math.hypot(hp.x - verb.ox, hp.y - verb.oy) > 3 || hero.hp <= 0) { FX.push({ k: 'shatter', x: heroPos().x, y: heroPos().y - 8, r: verb.r * e.TS, t: 0 }); verb = null; vset(1.2); if (H.sfx) H.sfx('tap'); return; }   // the first step shatters it (a slash from inside it does not)
    verb.t += dt; verb.r = Math.min(2.6, 0.6 + verb.t * 1.0); verb.tick -= dt;
    if (verb.tick <= 0) { verb.tick = 0.5; const o = heroBase(); live().forEach((m) => { if (Math.hypot(m.x - o.x, m.y - o.y) > verb.r * e.TS + 8) return; const before = m.s.hp; g.hit(hero, m.s, Math.max(1, Math.round(hero.k.kit[0].power * 0.55)), rand); delete m.s.fxHits; m.frozen = 1.1; m.open = OPEN_S; m.kx = 0; m.ky = 0; m.tele = 0; m.dash = 0;
      const dmg = before - m.s.hp; if (dmg > 0) { num(m.x, m.y - 26, String(dmg), '#DCEFF8'); VFX.impact('Frost', '#9CC8FF', m.x, m.y - 14, false); } if (m.s.hp <= 0) kill(m, e); }); }
    if (verb.t >= 3.2) { FX.push({ k: 'shatter', x: heroPos().x, y: heroPos().y - 8, r: verb.r * e.TS, t: 0 }); verb = null; vset(1.5); }
  }
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
  function tileFree(e, x, y) { if (wallAt(x, y)) return false; return !e.solidAt(Math.floor((x - 7) / e.TS), Math.floor(y / e.TS)) && !e.solidAt(Math.floor((x + 7) / e.TS), Math.floor(y / e.TS)) && !e.solidAt(Math.floor(x / e.TS), Math.floor((y - 5) / e.TS)); }
  function spawnOne(e, far, elem, rare, at) {
    const cells = [], M = e.M, px = e.P.x / e.TS, py = e.P.y / e.TS;
    if (at) cells.push(at); else for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) { const t = M.grid[y][x]; if ((t === 'W' || t === 'Z') && Math.hypot(x - px, y - py) >= far) cells.push([x, y]); }
    if (!cells.length) return false;
    const c = cells[Math.floor(rand() * cells.length)], isRare = rare !== undefined ? rare : M.grid[c[1]][c[0]] === 'Z', k = H.foe(elem ? [elem] : (M.types || []), lead(), isRare);
    if (!k) return false;
    const s = H.game().newBattle(lead(), k, 0).s[1]; s.label = 'Wild ' + k.name;
    E.push({ k: k, s: s, x: (c[0] + 0.5) * e.TS, y: (c[1] + 0.8) * e.TS, hx: (c[0] + 0.5) * e.TS, hy: (c[1] + 0.8) * e.TS, mode: 'idle', t: rand() * 2, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0, tele: 0, cd: 1 + rand(), tick: 1, img: H.img(k) });
    if (H.see) H.see(M.id, k.speciesNo);   // a sighting: the first of a species on this map today counts for a city favour
    return true;
  }
  let stir = 0, stirSpent = false;   // rare grass: stand in a sparkling patch and something stirs; it comes out once per visit
  function reset(e) { if (duel) abortDuel('You left the duel.'); VFX.clear(); GH = []; E = []; FX = []; PR = []; OFF = []; mapId = e.M.id; spawnT = 3; stir = 0; stirSpent = false; st.atk = null; st.cd = 0; st.vcd = 0; verb = null; st.veil = 0; walls = []; if (wildOk(e)) for (let i = 0; i < 4; i++) spawnOne(e, 7);
    if (wildOk(e) && e.M.id === 'town' && H.game().state.caught.length <= 1) spawnOne(e, 0, null, false, [6, 10]); }   // a new game: one wild critter waits in the grass by your door (Meaning: the first thing kept is at home)
  const wildOk = (e) => e.M.rate > 0 && !e.M.cave && !e.M.interior;
  const num = (x, y, text, col) => FX.push({ k: 'num', x: x, y: y, text: text, col: col, t: 0 });
  function heroPos() { const f = lastEnv.FOL; return { x: f.x + (f.ox || 0), y: f.y + (f.oy || 0) }; }
  function faceVec(e) { return DIRS[(e.lead ? e.FOL.dir : e.P.dir)] || DIRS.down; }   // in critter-lead mode the critter (e.FOL) is the one you steer
  function target(e, dir) {
    const o = heroPos(); let best = null, bd = 3.2 * e.TS;
    live().forEach((m) => { const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy); if (d < bd && d > 1 && (dx * dir[0] + dy * dir[1]) / d > 0.17) { bd = d; best = m; } });
    return best;
  }
  // tap: use the chosen move. Returns false when it is not ready.
  function attack() {
    if (!on || !lastEnv || !hero || hero.hp <= 0 || st.down > 0 || st.swapIn || st.atk) return false;
    const mi = st.sel, mv = hero.k.kit[mi], e = lastEnv; if (!mv) return false;
    if (mi === 3 && verbOf()) { if (st.vcd > 0 || verb) return false; }   // the verb waits only for its own cooldown, and for its own last act to end
    else { if (st.cd > 0) return false; if (verb && verb.kind !== 'frost' && verb.kind !== 'bloom') return false; }   // a slash from inside a standing ring or petals is allowed; not during a dash or a charge
    if (mi === 3 && verbOf() === 'frost') { startFrost(); return true; }
    if (mi === 3 && verbOf() === 'ember') { if (chargeStart()) chargeEnd(); return true; }   // a tap is a puff
    if (mi === 3 && verbOf() === 'tide') { startTide(); return true; }
    if (mi === 3 && verbOf() === 'volt') { startVolt(); return true; }
    if (mi === 3 && verbOf() === 'stone') { startStone(); return true; }
    if (mi === 3 && verbOf() === 'bloom') { startBloom(); return true; }
    if (mi === 3 && verbOf() === 'dusk') { if (st.veil > 0) return false; startDusk(); return true; }
    if (mi === 3 && verbOf() === 'moss') { startMoss(); return true; }
    if (mi === 1) { if (chargeStart()) chargeEnd(); return true; }   // a tap on the heavy is its light version
    if (mi === 2) { if (chargeStart()) { st.stanceOn = false; st.guard = 1.3; st.cd = st.cdTot = CD[2]; } return true; }   // a tap on guard is the old short guard
    return swing(mi, 1);
  }
  function swing(mi, mul) {
    const mv = hero.k.kit[mi], e = lastEnv;
    let dir = faceVec(e), tg = mv.kind === 'guard' ? null : target(e, dir);
    if (tg) { const o = heroPos(), d = Math.hypot(tg.x - o.x, tg.y - o.y) || 1; dir = [(tg.x - o.x) / d, (tg.y - o.y) / d]; }
    const o = heroPos(), reach = tg ? Math.min(Math.hypot(tg.x - o.x, tg.y - o.y) - 0.7 * e.TS, 2.1 * e.TS) : 0.5 * e.TS;
    st.atk = { mi: mi, kind: mv.kind, t: 0, dir: dir, dash: Math.max(0, reach) * (mul > 1 ? 1.2 : 1), done: false, mul: mul };
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
    live().forEach((m) => {
      if (Math.hypot(m.x - cx, m.y - cy) > rad + 8) return;
      if (a.kind === 'attack' && a.mi !== 1 && rand() * 100 >= mv.acc) { num(m.x, m.y - 26, 'Miss', '#FFFFFF'); return; }   // the heavy never misses: it is fed, not rolled
      const fromDark = st.veil > 0 ? 1.8 : 1, opened = m.open > 0 ? OPEN_MUL : 1, before = m.s.hp, power = Math.round((a.kind === 'status' ? Math.round(hero.k.kit[0].power * 0.6) : mv.power) * fromDark * opened * (a.mul || 1));   // the first blow out of the dark lands hard; a held enemy takes more
      if (fromDark > 1) { st.veil = 0; st.vcd = st.vcdTot = Math.max(st.vcd, 2.5); num(m.x, m.y - 42, 'From the dark', '#C9A8FF'); }
      if (opened > 1) num(m.x, m.y - 56, 'Open!', '#DCEFF8');
      g.hit(hero, m.s, power, rand); const mult = ((m.s.fxHits || [])[0] || {}).m || 1; delete m.s.fxHits;
      if (a.kind === 'status') { const key = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' }[mv.effect]; if (key) { m.s[key] = mv.effect === 'daze' ? 2 : 3; if (key === 'daze') m.open = OPEN_S; } else if (mv.effect === 'heal') { hero.hp = Math.min(hero.max, hero.hp + Math.round(hero.max * 0.28)); } else if (mv.effect === 'fortify') hero.fort = 4; }
      const dmg = before - m.s.hp; num(m.x, m.y - 26, String(dmg), dmg >= 40 ? '#FFD86B' : '#FFFFFF'); if (H.sfx && dmg > 0) H.sfx('hit');
      if (dmg > 0) { const big = heavy || mult > 1; VFX.impact(EL, HEX, m.x, m.y - 14, big); VFX.burst(EL, HEX, m.x, m.y - 14, big ? 14 : 8, a.dir[0], a.dir[1], big ? 1.3 : 1); VFX.shake(a.dir[0], a.dir[1], heavy ? 7 : (mult > 1 ? 5 : 3)); VFX.hitStop(heavy ? 0.09 : 0.05); if (mult > 1) num(m.x, m.y - 42, 'Strong!', '#FFD86B'); else if (mult < 1) num(m.x, m.y - 42, 'Weak', '#9FB0D0'); }
      m.flash = 0.16; m.mode = 'chase'; m.t = 0; const d = Math.hypot(m.x - o.x, m.y - o.y) || 1, kb = (heavy ? 1.3 : 0.7) * e.TS * ((BEH[m.k.element.name] || BDEF).kb || 1); m.kx = (m.x - o.x) / d * kb * 6; m.ky = (m.y - o.y) / d * kb * 6;
      if (m.s.hp <= 0) kill(m, e);
    });
  }
  function kill(m, e) {
    const stays = !m.duel && !!(H.worthy && H.worthy(m.k));   // a wild critter you do not keep yet sits down instead of bursting
    VFX.impact(m.k.element.name, m.k.element.color, m.x, m.y - 14, !stays); if (!stays) VFX.burst(m.k.element.name, m.k.element.color, m.x, m.y - 14, 16, 0, 0, 1.2);
    if (!stays) { E.splice(E.indexOf(m), 1); for (let i = 0; i < 8; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 80, vy: -20 - rand() * 50, t: 0, col: m.k.element.color }); }
    if (m.duel) {   // a trainer's critter: its XP is paid when the duel ends, there is nothing to keep
      duel.down += 1; duel.koXp[hero.k.seed] = (duel.koXp[hero.k.seed] || 0) + 8 + 2 * (m.k.lv || 1) + 5 * (m.k.stage || 1); if (H.sfx) H.sfx('claim');
      if (duel.down >= duel.queue.length) endDuel(true); else duel.next = 1.3;
      return;
    }
    spawnT = Math.min(spawnT, 8); if (H.see) H.see(mapId, null);   // a kill counts as a sighting for a city favour
    // Keep by staying (Meaning: the loop's verb is the trials' verb): a wild critter you do not keep yet is not removed at 0 HP. It sits down where it is for DOWN_S;
    // stay beside it and a ring fills over KEEP_S, and it is kept (the same price as any keep). Walk away and it gets up and wanders off. No orb, no pouch for it.
    if (stays) { m.mode = 'down'; m.downT = DOWN_S; m.ring = 0; m.tele = 0; m.dash = 0; m.kx = 0; m.ky = 0; m.frozen = 0; m.rooted = 0; m.calmT = 0; m.open = 0; m.kind = null; m.aim = null; }
    const r = H.onKill ? H.onKill(m.k, hero.k) : null;
    if (r) { const o = heroPos(); num(m.x, m.y - 34, '+' + r.xp + ' XP', '#A7F04A'); if (r.ess) num(o.x, o.y - 34, '+' + r.ess + ' essence', '#C9A8FF'); else if (r.txp) num(o.x, o.y - 34, '+' + r.txp + ' trainer XP', '#C9A8FF'); if (r.lv) { num(o.x, o.y - 48, 'Level ' + r.lv + '!', '#FFD86B'); if (H.toast) H.toast(hero.k.name + ' grew to level ' + r.lv + '!'); } if (H.sfx) H.sfx('claim'); }
  }
  const DOWN_S = 8, KEEP_S = 1.5, KEEP_REACH = 1.2, KEEP_CALM_R = 5;   // a down critter waits DOWN_S; a ring fills over KEEP_S while you or your critter stand within KEEP_REACH tiles; the others within KEEP_CALM_R tiles let you be
  let spentAt = 0;
  function stepDown(m, e, dt) {
    m.downT -= dt; const o = heroPos(), near = Math.min(Math.hypot(m.x - o.x, m.y - o.y), Math.hypot(m.x - e.P.x, m.y - e.P.y)) <= KEEP_REACH * e.TS;
    if (near) { m.ring = Math.min(1, (m.ring || 0) + dt / KEEP_S); E.forEach((f) => { if (f !== m && !f.duel && f.mode !== 'down' && f.mode !== 'leave' && Math.hypot(f.x - o.x, f.y - o.y) <= KEEP_CALM_R * e.TS) { f.calmT = Math.max(f.calmT || 0, 2); f.mode = 'idle'; f.tele = 0; f.dash = 0; f.kind = null; } }); }
    else m.ring = Math.max(0, (m.ring || 0) - dt / KEEP_S);
    if (m.ring >= 1) {
      const r = H.keep ? H.keep(m.k, !!m.woke) : { ok: false };
      if (r && r.ok) { E.splice(E.indexOf(m), 1); VFX.burst(m.k.element.name, m.k.element.color, m.x, m.y - 10, 12, 0, 0, 0.9); num(m.x, m.y - 26, '+ ' + m.k.name, '#FFE9A0'); if (H.sfx) H.sfx('keep'); return; }
      // refused: the day's light is spent (one line, not every time), or the price is more than what is left
      if (r && r.why === 'rolls') { if (!(r.left > 0)) { if (Date.now() - spentAt > 20000) { spentAt = Date.now(); if (H.toast) H.toast('The grass rustles. The day\u2019s light is spent.'); } } else num(m.x, m.y - 26, 'Needs ' + r.cost + (r.cost === 1 ? ' roll' : ' rolls'), '#FF9A8A'); }
      m.mode = 'leave'; m.leaveT = 1.5; m.ring = 0; return;
    }
    if (m.downT <= 0) { m.mode = 'leave'; m.leaveT = 1.5; m.ring = 0; }   // nobody stayed: it gets up and wanders off
  }
  // help that works, then leaves (item 14): in a duel a Potion (Super first) is used for you under 30% HP, a Remedy when burn / sap / weak sits on you; a number, no toast, no button
  function lookAfter(o) {
    if (!H.bag || !H.useBag) return; const b = H.bag() || {}; let healed = 0;
    if (hero.hp < hero.max * 0.3) { if (b.super > 0 && H.useBag('super')) healed = hero.max - hero.hp; else if (b.potion > 0 && H.useBag('potion')) healed = Math.round(hero.max * 0.4); }
    else if ((hero.burn > 0 || hero.sap > 0 || hero.weak > 0) && b.herb > 0 && H.useBag('herb')) { hero.burn = 0; hero.sap = 0; hero.weak = 0; healed = Math.round(hero.max * ITEM_FX.herb.heal); }
    if (healed > 0) { hero.hp = Math.min(hero.max, hero.hp + healed); num(o.x, o.y - 46, '+' + healed, '#A7F04A'); VFX.impact('Bloom', '#F9A8D4', o.x, o.y - 14, false); if (H.sfx) H.sfx('claim'); }
  }
  function unward() { Object.keys(team).forEach((k) => { const sd = team[k].side; sd.ward = 0; sd.boost = 1; }); }   // a Ward or a Whetstone lasts the one duel
  function walk(m, e, vx, vy, dt) { if (m.rooted > 0) return; { const w = wallAt(m.x + vx * dt, m.y + vy * dt); if (w && m.dash > 0) { w.hp -= 1; m.dash = 0; m.kx = -vx * 0.6; m.ky = -vy * 0.6; VFX.impact('Stone', '#A8A29E', w.tx * 32 + 16, w.ty * 32 + 8, true); if (H.sfx) H.sfx('hit'); } } const nx = m.x + vx * dt, ny = m.y + vy * dt; if (tileFree(e, nx, m.y)) m.x = nx; if (tileFree(e, m.x, ny)) m.y = ny; }
  // ---- enemy behaviours: one per element (the old single melee swing is the fallback) ----
  const BEH = {
    Ember: { atk: 'dash', spd: 50, cd: 2.4, mul: 1.1, tele: 0.5, rng: 4.2 },              // winds up, then charges in a straight line
    Tide:  { atk: 'shoot', spd: 40, cd: 2.2, mul: 0.8, tele: 0.4, keep: 3.2, ps: 105 },    // keeps its distance and spits bubbles
    Moss:  { atk: 'aoe', spd: 36, cd: 2.6, mul: 1.15, tele: 0.6, rad: 1.6 },               // slow; a ring of thorns around itself
    Volt:  { atk: 'melee', spd: 92, cd: 1.0, mul: 0.7, tele: 0.2, runAway: 0.9 },          // fast, light hits, darts away after each
    Frost: { atk: 'aoe', spd: 40, cd: 2.6, mul: 0.9, tele: 0.6, rad: 1.6, still: 2.0, cold: 2.0 },   // the cold is still: it does not move while you are more than 2 tiles away (you go to it); its ring of cold stays 2 s, so you wait for it to pass and step in
    Dusk:  { atk: 'blink', spd: 56, cd: 2.4, mul: 1.0, tele: 0.5 },                        // vanishes and reappears behind you
    Stone: { atk: 'aoe', spd: 12, cd: 3.0, mul: 1.3, tele: 1.0, rad: 1.9, leash: 3, kb: 0.5 },   // a wall that stays: barely moves, never past 3 tiles from where it stood, half the knockback, a slow huge slam
    Bloom: { atk: 'heal', spd: 42, cd: 2.6, mul: 0.6, tele: 0.4, keep: 3.6, ps: 90 }         // heals hurt friends, otherwise throws petals
  };
  const BDEF = { atk: 'melee', spd: 58, cd: 1.7, mul: 1, tele: 0.32 };
  let PR = [];
  const duelK = () => { const o = (typeof window !== 'undefined' && window.__duel) || { hp: DUEL_HP, dmg: DUEL_DMG, pace: DUEL_PACE }, t = (duel && DUEL_TUNE[duel.tr.id]) || {}; return { hp: o.hp * (t.hp || 1), dmg: o.dmg * (t.dmg || 1), pace: o.pace * (t.pace || 1) }; };   // window.__duel is the simulator's override
  function koHero() {
    hero.hp = 0; st.atk = null; hero.guard = false; st.guard = 0; st.stanceOn = false; if (H.sfx) H.sfx('lose');
    const alt = benchSides().filter((b) => b.hp > 0).sort((a, b) => b.hp / b.max - a.hp / a.max)[0];
    if (alt) { st.swapIn = { seed: alt.k.seed, t: 0.9 }; st.calm = 1.6; if (H.toast) H.toast(hero.k.name + ' was knocked out. Go, ' + alt.k.name + '!'); }
    else { st.down = 4; st.calm = 4; if (duel) endDuel(false); else if (H.toast) H.toast('Your party is knocked out. They recover in a moment.'); }
  }
  function hurtHero(m, mul) {
    if (st.veil > 0) { const o = heroPos(); num(o.x, o.y - 30, 'lost', '#C9A8FF'); VFX.trail('Dusk', '#5B45B8', o.x, o.y - 12); return; }   // veiled: what hunts you has lost you
    if (m.duel) mul *= duelK().dmg;
    const before = hero.hp, guarded = hero.guard; H.game().hit(m.s, hero, Math.max(1, Math.round(m.k.kit[0].power * mul)), rand); delete hero.fxHits;
    const o = heroPos(), me = m.k.element, bx = o.x - m.x, by = o.y - m.y;
    if (duel && hero.hp > 0) lookAfter(o);   // help that works, then leaves: a Potion in the bag is used for you under 30% HP in a duel; a Remedy when a status lands
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
      else if (m.kind === 'aoe') { FX.push({ k: 'ring', x: m.x, y: m.y - 4, r: B.rad * TS, t: 0, col: m.k.element.color }); VFX.impact(m.k.element.name, m.k.element.color, m.x, m.y - 6, true); VFX.burst(m.k.element.name, m.k.element.color, m.x, m.y - 6, 14, 0, 0, 1.2); if (closest(m, p, hpos) < B.rad * TS) hurtHero(m, B.mul); if (B.cold) { m.coldT = B.cold; m.coldTick = 0.7; FX.push({ k: 'cold', x: m.x, y: m.y - 4, r: B.rad * TS, t: 0, life: B.cold }); } }
      else if (m.kind === 'blink') { for (let i = 0; i < 6; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 60, vy: -10 - rand() * 30, t: 0, col: m.k.element.color }); if (tileFree(e, ax, ay)) { m.x = ax; m.y = ay; } m.kind = 'melee'; m.tele = 0.28; m.aim = { x: ax, y: ay }; }
      else if (m.kind === 'heal') { const al = allyToHeal(m, e); if (al) { const h = Math.round(al.s.max * 0.14); al.s.hp = Math.min(al.s.max, al.s.hp + h); num(al.x, al.y - 30, '+' + h, '#7BE07B'); FX.push({ k: 'ring', x: al.x, y: al.y - 4, r: 0.7 * TS, t: 0, col: '#7BE07B' }); } }
      return;
    }
    if (m.retreat > 0) { m.retreat -= dt; const d0 = Math.hypot(p.x - m.x, p.y - m.y) || 1; walk(m, e, (m.x - p.x) / d0 * B.spd * 1.3, (m.y - p.y) / d0 * B.spd * 1.3, dt); return; }
    const tx = dh < dp ? hp0.x : p.x, ty = dh < dp ? hp0.y : p.y, d = Math.hypot(tx - m.x, ty - m.y) || 1, ux = (tx - m.x) / d, uy = (ty - m.y) / d, keep = (B.keep || 0) * TS;
    if (B.cold && m.coldT > 0) { m.coldT -= dt; m.coldTick -= dt; if (m.coldTick <= 0 && closest(m, p, heroPos()) < B.rad * TS) { m.coldTick = 0.7; hurtHero(m, B.mul * 0.5); } }   // the cold stays where it fell: step in before it passes and it bites
    // moving
    if (B.still && d > B.still * TS) { /* the cold does not come to you: it waits, still, until you are near */ }
    else if (B.leash && Math.hypot(m.x + ux * B.spd * dt - m.hx, m.y + uy * B.spd * dt - m.hy) > B.leash * TS && Math.hypot(m.x + ux * B.spd * dt - m.hx, m.y + uy * B.spd * dt - m.hy) >= Math.hypot(m.x - m.hx, m.y - m.hy)) { /* a wall stays: it will not follow past its leash */ }
    else if (keep) { if (d < keep - 1.2 * TS) walk(m, e, -ux * B.spd * 0.8, -uy * B.spd * 0.8, dt); else if (d > keep + 1.2 * TS) walk(m, e, ux * B.spd, uy * B.spd, dt); else { m.sd = m.sd || (rand() < 0.5 ? 1 : -1); walk(m, e, -uy * m.sd * B.spd * 0.5, ux * m.sd * B.spd * 0.5, dt); } }
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
    const p = e.P, n = d.npc, ex = d.tr.tower && e.M.exits && e.M.exits[0], door = ex && (ex.edge === 's' || ex.edge === 'n') ? { x: ((ex.a + ex.b) / 2 + 0.5) * e.TS, y: (ex.edge === 's' ? e.M.H - 1.6 : 1.6) * e.TS } : null;   // a visitor comes in at the door
    const bx = door ? door.x : (n ? (n.x + 0.5) * e.TS : p.x), by = door ? door.y : (n ? (n.y + 0.9) * e.TS : p.y), a0 = Math.atan2(p.y - by, p.x - bx); let best = null;
    for (const r of [2.2, 1.6, 3, 1]) for (let i = 0; i < 8 && !best; i++) { const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.5, x = bx + Math.cos(a) * r * e.TS, y = by + Math.sin(a) * r * e.TS; if (tileFree(e, x, y)) best = { x: x, y: y }; }
    if (!best) best = { x: bx, y: by };
    E.push({ k: k, s: s, x: best.x, y: best.y, hx: best.x, hy: best.y, mode: 'chase', t: 0, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0, tele: 0, cd: 1.2, tick: 1, img: H.img(k), duel: true });
    num(best.x, best.y - 36, d.tr.name + ' sent out ' + k.name + '!', '#FFFFFF'); if (H.sfx) H.sfx('claim');
  }
  // o = { tr (the same object the battle screen uses), npc, party (Tower: the run's critters), hp (Tower: their HP), surge (Tower twist type) }
  function startDuel(o) {
    if (!armed || !hero || duel || !lastEnv) return false;
    const e = lastEnv; duel = { tr: o.tr, npc: o.npc || null, queue: o.tr.team.slice(), idx: 0, down: 0, part: {}, koXp: {}, next: 0.9, party: o.party || null, surge: o.surge || null, lastFoe: null,
      night: o.tr.tower ? { len: window.__nightS || (28 + 1.6 * (o.tr.floor || 1) + (o.tr.warden ? 10 : 0)), t: 0 } : null };   // a night of the Watch is kept by lasting it: at dawn the visitors go
    mapId = e.M.id; E = []; PR = []; OFF = []; FX = []; st.calm = 0; st.swapIn = null;
    if (H.bag) { const b = H.bag() || {}; if (b.ward > 0 && H.useBag && H.useBag('ward')) { hero.ward = ITEM_FX.ward.hits; num(heroPos().x, heroPos().y - 34, 'Warded', '#DCEFF8'); } if (b.whet > 0 && H.useBag && H.useBag('whet')) { hero.boost = ITEM_FX.whet.mult; num(heroPos().x, heroPos().y - 48, 'Sharpened', '#FFD86B'); } }   // a Frost Ward or a Whetstone in the bag is used for you at the start (no button)
    if (o.party) {
      o.party.forEach((sd) => { const k = H.kOf(sd); if (k) { const side = sideFor(k); if (o.hp && o.hp[sd] !== undefined) side.hp = Math.max(0, Math.min(side.max, o.hp[sd])); } });
      const lk = lead(); if (!lk || o.party.indexOf(lk.seed) === -1 || team[lk.seed].side.hp <= 0) { const alive = o.party.find((sd) => team[sd] && team[sd].side.hp > 0); if (alive) H.setLead(alive); }
    }
    return true;
  }
  function endDuel(win) {
    const d = duel; duel = null; const g = H.game(); g._surge = null; E = E.filter((m) => !m.duel); PR = []; st.calm = 3; spawnT = 6; unward();
    const lines = g.actDuelEnd(d.tr, win, { lead: hero, foe: d.lastFoe || hero, bench: benchSides(), part: d.part, koXp: d.koXp });
    if (H.duelDone) H.duelDone(d.tr, d.npc, win, lines);
  }
  function abortDuel(why) {
    const d = duel; if (!d) return; duel = null; H.game()._surge = null; E = E.filter((m) => !m.duel); PR = []; unward();
    if (d.tr.tower && hero) H.game().actTowerHold([hero].concat(benchSides()));
    if (why && H.toast) H.toast(why + (d.tr.tower ? ' Your HP is kept; the night starts over.' : ' No reward.'));
  }
  function step(e) {
    on = false; lastEnv = e;
    armed = false;
    if (!enabled() || !e.fol || (e.M.interior && !e.M.duelHall)) { /* the Watch's lobby is the one room a duel runs in */ VFX.clear(); if (duel) abortDuel(''); if (E.length) { E = []; FX = []; PR = []; OFF = []; mapId = ''; VFX.clear(); } if (e.FOL) { e.FOL.ox = 0; e.FOL.oy = 0; } return; }
    mkHero(); if (!hero) return; armed = true;
    if (!wildOk(e) && !duel) { VFX.clear(); if (E.length) { E = []; FX = []; PR = []; OFF = []; } mapId = ''; if (e.FOL) { e.FOL.ox = 0; e.FOL.oy = 0; } return; }   // a quiet place (city, cave): nothing roams here
    on = true; const dt = e.dt, g = H.game();
    if (mapId !== e.M.id) reset(e);
    if (VFX.freeze(dt)) return;   // hit-stop: a blow freezes the fight for a few frames
    VFX.step(dt); GH.forEach((q) => { q.t += dt; }); GH = GH.filter((q) => q.t < 0.2);
    st.cd = Math.max(0, st.cd - dt); st.vcd = Math.max(0, st.vcd - dt); st.calm = Math.max(0, st.calm - dt); st.quiet += dt;
    if (st.guard > 0) { st.guard -= dt; if (st.guard <= 0) hero.guard = false; }
    if (st.down > 0) { st.down -= dt; if (st.down <= 0) { Object.keys(team).forEach((k) => { const sd = team[k].side; sd.hp = Math.max(sd.hp, Math.round(sd.max * 0.5)); });
      const o = heroPos(); E.forEach((m) => { if (!m.duel && m.mode !== 'down' && Math.min(Math.hypot(m.x - o.x, m.y - o.y), Math.hypot(m.x - e.P.x, m.y - e.P.y)) <= 6 * e.TS) { m.mode = 'idle'; m.calmT = 6; m.tele = 0; m.dash = 0; m.kind = null; } }); } }   // knocked out among the same foes: on recovery the ones within 6 tiles let you be for 6 s
    if (!duel && st.quiet > 4 && hero.hp > 0 && st.down <= 0) hero.hp = Math.min(hero.max, hero.hp + hero.max * 0.03 * dt);
    if (!duel) benchSides().forEach((b) => { const c = team[b.k.seed]; if (b.hp > 0) b.hp = Math.min(b.max, b.hp + b.max * 0.015 * dt); else { c.rev += dt; if (c.rev >= 40) { c.rev = 0; b.hp = Math.round(b.max * 0.25); } } });
    if (st.swapIn) { st.swapIn.t -= dt; if (st.swapIn.t <= 0) { const sw = st.swapIn.seed; st.swapIn = null; H.setLead(sw); st.cd = st.cdTot = 0.5; if (H.sfx) H.sfx('claim'); } }
    if (duel) {   // a trainer duel: the trainer's critters come out one at a time
      duel.part[hero.k.seed] = true; g._surge = duel.surge || null;
      if (!E.some((m) => m.duel) && duel.idx < duel.queue.length) { duel.next -= dt; if (duel.next <= 0) spawnDuelFoe(e); }
      if (duel && duel.night) { duel.night.t += dt; if (duel.night.t >= duel.night.len) { duel.dawn = true; endDuel(true); } }
    }
    // the swing
    const f = e.FOL, a = st.atk; f.ox = 0; f.oy = 0;
    if (a) {
      a.t += dt; const W = 0.09, S = 0.12, R = 0.2; let k = 0;
      if (a.t < W) k = -0.25 * (a.t / W); else if (a.t < W + S) { k = -0.25 + 1.25 * ((a.t - W) / S); if (!a.done) { a.done = true; strike(e); } } else if (a.t < W + S + R) k = 1 - (a.t - W - S) / R; else st.atk = null;
      const L = a.kind === 'guard' ? 0 : (k < 0 ? k * e.TS * 0.6 : k * a.dash); f.ox = a.dir[0] * L; f.oy = a.dir[1] * L;
      if (a.kind !== 'guard' && a.t > 0.09 && L > 6) GH.push({ x: f.x + f.ox, y: f.y + f.oy, t: 0 });   // afterimages of the lunge
    }
    stepVerb(e, dt);
    const hp0 = heroPos(), p = e.P;
    // enemies
    E.slice().forEach((m) => {
      m.flash = Math.max(0, m.flash - dt); m.cd = Math.max(0, m.cd - dt); m.t += dt; if (m.open > 0) m.open -= dt;
      if (m.mode === 'down') { stepDown(m, e, dt); return; }   // sitting where it fell: kept if you stay, gone if you do not
      if (m.mode === 'leave') { m.leaveT -= dt; const o = heroPos(), d = Math.hypot(m.x - o.x, m.y - o.y) || 1; m.dx = (m.x - o.x) / d; m.dy = (m.y - o.y) / d; walk(m, e, m.dx * 46, m.dy * 46, dt); if (m.leaveT <= 0) { E.splice(E.indexOf(m), 1); for (let i = 0; i < 5; i++) FX.push({ k: 'puff', x: m.x, y: m.y - 10, vx: (rand() - 0.5) * 50, vy: -10 - rand() * 30, t: 0, col: m.k.element.color }); } return; }   // it got up and wandered off
      if (m.frozen > 0) { m.frozen -= dt; return; }   // held in the ice: no step, no attack
      if (m.calmT > 0) { m.calmT -= dt; m.mode = 'idle'; return; }   // in the petals: it has forgotten the fight for a moment
      if (m.pull > 0) m.pull -= dt;
      if (m.rooted > 0) { m.rooted -= dt; const o0 = heroPos(); if (hero.hp > 0 && hero.hp < hero.max && Math.hypot(m.x - o0.x, m.y - o0.y) < 1.6 * e.TS) { m.feed = (m.feed || 0) + dt; if (m.feed >= 0.5) { m.feed = 0; const h = Math.max(1, Math.round(hero.max * 0.02)); hero.hp = Math.min(hero.max, hero.hp + h); num(o0.x, o0.y - 34, '+' + h, '#A7F04A'); } } }   // the roots feed you back while you stay beside what they hold
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
      if (q.t > 2.4 || !tileFree(e, q.x, q.y + 12)) { const w = wallAt(q.x, q.y + 12); if (w) { w.hp -= 1; VFX.impact('Stone', '#A8A29E', q.x, q.y, false); } PR.splice(PR.indexOf(q), 1); return; }   // a wall takes the shot
      if (Math.min(Math.hypot(hp1.x - q.x, hp1.y - 12 - q.y), Math.hypot(e.P.x - q.x, e.P.y - 12 - q.y)) < 0.6 * e.TS && hero.hp > 0 && st.down <= 0) { PR.splice(PR.indexOf(q), 1); if (q.m && q.m.s.hp > 0) hurtHero(q.m, q.mul); } });
    // rare grass (Meaning: the rare thing comes to the one who stays): while your critter stands in sparkling grass and no wild critter is near, the patch stirs for about 2.2 s, then a rare one comes out of it; once per visit
    if (!duel && wildOk(e) && !stirSpent) { const o = heroPos(), inZ = (q) => { const x = Math.floor(q.x / e.TS), y = Math.floor(q.y / e.TS), rr = e.M.rare; return (e.M.grid[y] && e.M.grid[y][x] === 'Z') || !!(rr && x >= rr.x && x < rr.x + rr.w && y >= rr.y && y < rr.y + rr.h); }, hz = inZ(o), pz = inZ(e.P), src = hz ? o : e.P, tx = Math.floor(src.x / e.TS), ty = Math.floor(src.y / e.TS), onZ = hz || pz, near = live().some((m) => Math.hypot(m.x - src.x, m.y - src.y) < 4 * e.TS);   // you or your critter in the patch
      if (onZ && !near) { stir = Math.min(1, stir + dt / 2.2); if (stir >= 1) { stir = 0; stirSpent = true; const cells = []; for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) if (e.M.grid[y] && e.M.grid[y][x] === 'Z' && (x !== tx || y !== ty)) cells.push([x, y]);
          const c = cells.length ? cells[Math.floor(rand() * cells.length)] : [tx, ty], k = H.foe(e.M.types || [], lead(), true);
          if (k) { const sd = H.game().newBattle(lead(), k, 0).s[1]; sd.label = 'Wild ' + k.name; E.push({ k: k, s: sd, x: (c[0] + 0.5) * e.TS, y: (c[1] + 0.8) * e.TS, hx: (c[0] + 0.5) * e.TS, hy: (c[1] + 0.8) * e.TS, mode: 'idle', t: 0, dx: 0, dy: 0, kx: 0, ky: 0, flash: 0.6, tele: 0, cd: 1.5, tick: 1, img: H.img ? H.img(k) : null, id: Date.now() % 100000, rare: true, woke: true }); FX.push({ k: 'wake', x: (c[0] + 0.5) * e.TS, y: (c[1] + 0.5) * e.TS, t: 0 }); if (H.sfx) H.sfx('claim'); } } }
      else stir = Math.max(0, stir - dt * 1.5); }
    // respawns
    spawnT -= dt; if (spawnT <= 0) { spawnT = 6; if (!duel && live().length < 4 && wildOk(e)) spawnOne(e, 8); }
    FX.forEach((x) => { x.t += dt; if (x.k === 'puff') { x.x += x.vx * dt; x.y += x.vy * dt; x.vy += 90 * dt; } });
    FX = FX.filter((x) => x.t < (x.life || (x.k === 'slash' ? 0.22 : (x.k === 'num' ? 0.8 : (x.k === 'wake' ? 0.7 : 0.5)))));
  }
  function items(e) {
    if (!on) return [];
    const out = E.map((m) => ({ y: m.y, fn: (c) => {
      const x = e.snap(m.x - e.cx), y = e.snap(m.y - e.cy); if (x < -40 || x > e.vw + 40 || y < -40 || y > e.vh + 60) return;
      c.fillStyle = 'rgba(10,30,10,0.28)'; c.fillRect(x - 8, y - 2, 16, 3); c.fillRect(x - 6, y - 3, 12, 5);
      const sh = m.tele > 0 ? Math.round(Math.sin(e.t * 60) * 1.5) : 0;
      if (Math.hypot(m.dx || 0, m.dy || 0) > 0.05) m.fdir = dir8(m.dx, m.dy); const fim = H.img(m.k, m.fdir || 'down'), mim = fim && fim.complete && fim.naturalWidth ? fim : m.img;   // it faces where it moves
      const down = m.mode === 'down';
      if (!(m.flash > 0 && Math.floor(m.flash * 40) % 2) && mim && mim.complete) { const w = 30, h = Math.round(30 * mim.height / Math.max(1, mim.width)) - (down ? 6 : 0); c.imageSmoothingEnabled = false; if (down) c.globalAlpha = 0.85; c.drawImage(mim, Math.round(x - w / 2 + sh), Math.round(y - h), w, h); c.globalAlpha = 1; }
      if (down) return;   // sitting where it fell: no type mark, no bar; the ring in drawFx says what is happening
      c.fillStyle = m.k.element.color; c.fillRect(x - 13, y - 44, 5, 5);
      if (m.s.hp < m.s.max) { c.fillStyle = '#1E2A4A'; c.fillRect(x - 13, y - 38, 26, 5); c.fillStyle = '#FF6B6B'; c.fillRect(x - 12, y - 37, Math.max(0, Math.round(24 * m.s.hp / m.s.max)), 3); }
      if (m.tele > 0) { c.fillStyle = '#D8574A'; c.fillRect(x - 2, y - 52, 4, 9); c.fillRect(x - 2, y - 41, 4, 3); }
      VFX.status(c, x + 16, y - 44, m.s, e.t);
    } }));
    return out;
  }
  function drawStir(e) {
    const c = e.ctx; if (stir > 0 && !stirSpent && lastEnv) { const o = heroPos(); for (let i = 0; i < 8; i++) { const ph = (e.t * 0.9 + i * 0.29) % 1, a = i * 0.785 + e.t * 0.6, r = 14 + stir * 12; const x = e.snap(o.x - e.cx + Math.cos(a) * r), y = e.snap(o.y - e.cy + 6 - ph * (16 + stir * 20)); c.fillStyle = 'rgba(255,248,200,' + (0.9 * stir * (1 - ph)).toFixed(2) + ')'; c.fillRect(x - 1, y - 1, 2, 2); if (stir > 0.6 && i % 2 === 0) c.fillRect(x - 2, y, 4, 1); } }
    FX.forEach((f) => { if (f.k !== 'wake') return; const k = f.t / 0.7; c.strokeStyle = 'rgba(255,230,140,' + (1 - k).toFixed(2) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(e.snap(f.x - e.cx), e.snap(f.y - e.cy), 6 + k * 40, 0, 6.3); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * 0.785; c.fillStyle = 'rgba(255,248,200,' + (1 - k).toFixed(2) + ')'; c.fillRect(e.snap(f.x - e.cx + Math.cos(a) * (10 + k * 30)) - 1, e.snap(f.y - e.cy + Math.sin(a) * (8 + k * 24)) - 1, 2, 2); } });
  }
  function drawVerb(e) {
    const c = e.ctx, o = heroPos(), x = e.snap(o.x - e.cx), y = e.snap(o.y - e.cy);
    walls.forEach((w) => { const wx = e.snap(w.tx * 32 - e.cx), wy = e.snap(w.ty * 32 - e.cy), k = Math.min(1, w.t / 0.15), hgt = Math.round(26 * k); c.fillStyle = '#4A4A5A'; c.fillRect(wx + 2, wy + 28 - hgt, 28, hgt); c.fillStyle = '#A8A29E'; c.fillRect(wx + 3, wy + 29 - hgt, 26, Math.max(0, hgt - 2));
      for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { const bx = wx + 4 + q * 9 + (r % 2) * 4, by = wy + 30 - hgt + r * 6; if (by > wy + 2 && bx < wx + 28) { c.fillStyle = '#8E8A86'; c.fillRect(bx, by, 7, 1); c.fillRect(bx, by, 1, 5); } }
      c.fillStyle = '#2B2235'; if (w.hp <= 2) { c.fillRect(wx + 12, wy + 8, 1, 10); c.fillRect(wx + 13, wy + 12, 3, 1); } if (w.hp <= 1) { c.fillRect(wx + 22, wy + 14, 1, 10); c.fillRect(wx + 19, wy + 20, 3, 1); c.fillRect(wx + 6, wy + 18, 4, 1); } });
    if (verb && verb.kind === 'bloom') { const R = verb.r * e.TS; for (let i = 0; i < 18; i++) { const a = i * 0.349 + verb.t * 1.1, rr = R * (0.55 + 0.45 * ((i * 5) % 7) / 6), px = e.snap(x + Math.cos(a) * rr), py = e.snap(y - 8 + Math.sin(a) * rr * 0.75 - Math.sin(verb.t * 3 + i) * 3); c.fillStyle = i % 3 === 0 ? '#FFFFFF' : (i % 3 === 1 ? '#F9A8D4' : '#E07AB0'); c.fillRect(px - 1, py - 1, 3, 2); } }
    if (verb && verb.kind === 'frost') { const R = verb.r * e.TS; c.fillStyle = 'rgba(200,232,255,0.14)'; c.beginPath(); c.arc(x, y - 6, R, 0, 6.3); c.fill();
      for (let i = 0; i < 28; i++) { const a = i * 0.224 + verb.t * 0.3, px = e.snap(x + Math.cos(a) * R), py = e.snap(y - 6 + Math.sin(a) * R * 0.75); c.fillStyle = i % 3 === 0 ? '#FFFFFF' : '#DCEFF8'; c.fillRect(px - 1, py - 1, 2, 2); if (i % 4 === 0) c.fillRect(px - 1, py - 3, 2, 2); } }
    if (verb && verb.kind === 'ember') { const ch = Math.max(0, Math.min(1, (verb.t - 0.12) / 1.2)), d = faceVec(e), fx = e.snap(x + d[0] * 12), fy = e.snap(y - 12 + d[1] * 8), n = 2 + Math.round(ch * 6);
      for (let i = 0; i < n; i++) { const ph = (e.t * 9 + i * 1.7) % 1, hgt = 4 + ch * 10; c.fillStyle = i % 2 ? '#FFB03A' : '#FF6A2B'; c.fillRect(fx - 3 + (i % 3) * 3, fy - ph * hgt, 2, 3); } if (ch > 0.95) { c.fillStyle = '#FFF0A0'; c.fillRect(fx - 1, fy - 14, 2, 2); } }
    E.forEach((m) => { if (m.rooted > 0) { const mx = e.snap(m.x - e.cx), my = e.snap(m.y - e.cy), k = Math.min(1, (2.4 - m.rooted) * 4); c.fillStyle = '#5E3C22'; [[-10, 0], [8, -2], [-4, 3], [3, 2], [-7, -4], [10, 3]].forEach(([a, b2], i) => { if (i / 6 < k) { c.fillRect(mx + a, my + b2, 3, 2); c.fillRect(mx + a + 1, my + b2 - 2, 1, 2); } }); c.fillStyle = '#4FB06D'; [[-9, -6], [9, -5], [0, -3]].forEach(([a, b2], i) => { if (i / 3 < k) c.fillRect(mx + a, my + b2, 2, 2); }); }
      if (m.pull > 0) { VFX.trail('Tide', '#3E8EF7', m.x, m.y - 10); } });
    E.forEach((m) => { if (!(m.frozen > 0)) return; const mx = e.snap(m.x - e.cx), my = e.snap(m.y - e.cy); c.fillStyle = 'rgba(190,225,255,0.45)'; c.fillRect(mx - 13, my - 30, 26, 28); c.fillStyle = '#FFFFFF'; [[-9, -24], [6, -12], [-2, -4]].forEach(([a, b]) => c.fillRect(mx + a, my + b, 2, 2)); });
    // keep by staying: a ring fills around the one sitting down while you stay beside it (the rare grass's sparkles, gathered)
    E.forEach((m) => { if (m.mode !== 'down') return; const mx = e.snap(m.x - e.cx), my = e.snap(m.y - e.cy), k = m.ring || 0; c.save(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.ellipse(mx, my + 2, 17, 9, 0, 0, 6.3); c.stroke();
      if (k > 0) { c.strokeStyle = '#FFE9A0'; c.lineWidth = 3; c.beginPath(); c.ellipse(mx, my + 2, 17, 9, 0, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); c.stroke(); for (let i = 0; i < 6; i++) { const ph = (e.t * 0.9 + i * 0.37) % 1, a = i * 1.05 + e.t * 0.6, r = 12 + k * 8; c.fillStyle = 'rgba(255,248,200,' + (0.9 * k * (1 - ph)).toFixed(2) + ')'; c.fillRect(e.snap(mx + Math.cos(a) * r) - 1, e.snap(my - 4 - ph * (12 + k * 16)) - 1, 2, 2); } }
      c.restore(); });
    FX.forEach((f) => { if (f.k !== 'cold') return; const k = f.t / f.life, fx = e.snap(f.x - e.cx), fy = e.snap(f.y - e.cy); c.save(); c.globalAlpha = 0.5 * (1 - k); c.fillStyle = '#DCEFF8'; c.beginPath(); c.ellipse(fx, fy, f.r, f.r * 0.75, 0, 0, 6.3); c.fill(); c.globalAlpha = 0.8 * (1 - k); for (let i = 0; i < 16; i++) { const a = i * 0.39 + 0.2; c.fillStyle = i % 2 ? '#FFFFFF' : '#9CC8FF'; c.fillRect(e.snap(fx + Math.cos(a) * f.r) - 1, e.snap(fy + Math.sin(a) * f.r * 0.75) - 1, 2, 2); } c.restore(); });   // the cold that stays after a Frost critter's slam
  }
  function drawFx(e) {
    drawStir(e);
    if (!on) return; const c = e.ctx;
    drawVerb(e);
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
      if (f.k === 'wave') { const k = f.t / 0.5, out = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2, L = f.len * out; for (let i = -2; i <= 2; i++) { const px = e.snap(f.x + f.dx * L - f.dy * i * 7 - e.cx), py = e.snap(f.y + f.dy * L * 0.8 + f.dx * i * 5 - e.cy); c.fillStyle = i % 2 ? '#3E8EF7' : '#DCEBFF'; c.globalAlpha = 0.9; c.fillRect(px - 2, py - 2, 4, 3); c.fillStyle = '#FFFFFF'; c.fillRect(px - 1, py - 4, 2, 2); } c.globalAlpha = 1; }
      else if (f.k === 'roots') { for (let i = 0; i < 5; i++) { const px = e.snap(f.x + (i - 2) * 6 - e.cx), py = e.snap(f.y - (i % 2) * 3 - e.cx * 0 - e.cy); c.fillStyle = '#5E3C22'; c.globalAlpha = Math.max(0, 1 - f.t / 0.5); c.fillRect(px - 1, py, 3, 2); } c.globalAlpha = 1; }
      else if (f.k === 'cone') { const n = 6 + Math.round(f.ch * 8), L = f.len * Math.min(1, f.t / 0.12), a0 = Math.atan2(f.dy, f.dx); for (let i = 0; i < n; i++) { const a = a0 + (i / (n - 1) - 0.5) * 1.1, r = L * (0.3 + 0.7 * ((i * 7) % 5) / 4), px = e.snap(f.x + Math.cos(a) * r - e.cx), py = e.snap(f.y + Math.sin(a) * r - e.cy); c.fillStyle = (i % 2 ? '#FFB03A' : '#FF6A2B'); c.globalAlpha = Math.max(0, 1 - f.t / 0.35); c.fillRect(px - 2, py - 2, 4, 4); } c.globalAlpha = 1; }
      else if (f.k === 'shatter') { for (let i = 0; i < 16; i++) { const a = i * 0.39, r = f.r + f.t * 60; const px = e.snap(f.x + Math.cos(a) * r - e.cx), py = e.snap(f.y + Math.sin(a) * r * 0.75 - e.cy); c.fillStyle = '#DCEFF8'; c.globalAlpha = Math.max(0, 1 - f.t / 0.4); c.fillRect(px - 1, py - 1, 2, 2); } c.globalAlpha = 1; }
      else if (f.k === 'ring') { c.save(); c.globalAlpha = 1 - f.t / 0.5; c.strokeStyle = f.col; c.lineWidth = 4; c.beginPath(); c.arc(fx, fy, f.r * (0.5 + f.t), 0, 6.3); c.stroke(); c.restore(); return; }
      if (f.k === 'slash') { const u = f.t / 0.22, w = (f.big ? 7 : 5); c.save(); c.globalAlpha = 1 - u * 0.8; c.strokeStyle = f.col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); const a0 = f.ang - 1.15 + u * 0.5, a1 = f.ang + 1.15 + u * 0.5; c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0, a1); c.stroke(); c.strokeStyle = '#FFFFFF'; c.lineWidth = Math.max(2, w - 3); c.beginPath(); c.arc(fx, fy, f.r * (0.75 + u * 0.25), a0 + 0.2, a1 - 0.2); c.stroke(); c.restore(); }
      else if (f.k === 'num') { c.save(); c.globalAlpha = 1 - f.t / 0.8; c.font = '900 13px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#1E2A4A'; const ty = fy - f.t * 26; c.strokeText(f.text, fx, ty); c.fillStyle = f.col; c.fillText(f.text, fx, ty); c.restore(); }
      else if (f.k === 'puff') { c.globalAlpha = 1 - f.t / 0.5; c.fillStyle = f.col; c.fillRect(fx - 2, fy - 2, 5, 5); c.globalAlpha = 1; }
    });
  }
  return {
    bind, step, items, drawFx, active, attack, swapTo, startDuel, giveUp: () => abortDuel('You gave up.'), dueling: () => !!duel, canDuel: () => armed && !duel, walls: () => walls.map((w) => ({ tx: w.tx, ty: w.ty, hp: w.hp, t: w.t })), veiled: () => st.veil > 0, veilAlpha: () => (st.veil > 0 ? 0.35 : 1), verb: () => (verb ? { kind: verb.kind, t: verb.t, r: verb.r || 0, charge: verb.kind === 'ember' || verb.kind === 'heavy' ? Math.max(0, Math.min(1, (verb.t - 0.12) / (verb.kind === 'heavy' ? 0.8 : 1.2))) : 0 } : null), chargeable: () => canFeed(), stance: () => !!st.stanceOn, chargeStart, chargeEnd, chargeCancel, dawn: () => (duel && duel.night ? Math.min(1, duel.night.t / duel.night.len) : null),
    duelParty: () => (duel ? duel.party : null), duelInfo: () => (duel ? { name: duel.tr.name, total: duel.queue.length, defeated: duel.down, dawn: duel.night ? Math.min(1, duel.night.t / duel.night.len) : null, boss: !!(duel.tr.boss || duel.tr.leader || duel.tr.warden), tower: !!duel.tr.tower, floor: duel.tr.floor } : null), clear: () => { E = []; }, foes: () => E.map((m) => ({ x: m.x, y: m.y, rare: !!m.rare, woke: !!m.woke, name: m.k.name, rarity: m.k.rarity, hp: m.s.hp, max: m.s.max, frozen: m.frozen > 0, burn: m.s.burn || 0, weak: m.s.weak || 0, sap: m.s.sap || 0, daze: m.s.daze || 0, calm: m.calmT > 0, mode: m.mode, rooted: m.rooted > 0, pull: m.pull > 0, open: m.open > 0, ring: m.ring || 0, downT: m.downT || 0, home: { x: m.hx, y: m.hy } })), stir: () => stir, stirSpent: () => stirSpent, spawn: (n, elem, rare) => { for (let i = 0; i < (n || 1) && lastEnv; i++) spawnOne(lastEnv, 7, elem, rare); }, orbs: () => OFF, get shots() { return PR; }, BEH,
    get sel() { return st.sel; }, setSel: (i) => { st.sel = Math.max(0, Math.min(3, i)); },
    cdFrac: () => (st.sel === 3 && verbOf() ? (st.vcdTot ? st.vcd / st.vcdTot : 0) : (st.cdTot ? st.cd / st.cdTot : 0)), vcd: () => st.vcd, cd: () => st.cd, get hero() { return hero; }, get down() { return st.down > 0; },
    get enemies() { return E; }, moves: () => (hero ? hero.k.kit.map((m, i) => ({ name: m.name, kind: m.kind, sub: m.sub, i: i })) : []),
    ready: () => on, enabled, benchList: () => (on ? benchSides().map((b) => ({ seed: b.k.seed, name: b.k.name, pct: Math.round(100 * b.hp / b.max), ok: b.hp > 0 })) : []),
  };
})();
