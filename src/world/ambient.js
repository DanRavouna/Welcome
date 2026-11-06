// ---- AMBIENT: tiny scenery critters that wander the world (pure visuals, no gameplay, nothing saved) ----
// A def: { layer: 'ground' (under people) | 'air' (over people, under the day/night tint) | 'glow' (over the tint, for lights), tile(ch) -> may spawn on this tile char, when(tod, weather) -> visible?, make(rand) -> extra state, step(a, dt, env), draw(g, a, x, y, t) }
// Which maps get which defs: MAP_LIST[mapId] if present, else the map's climate (WEATHER.region: cities follow their zone), see BY_REGION.
// To add a new kind: write one def below and list it in BY_REGION or MAP_LIST. Everything else (spawning, fading, hiding in bad weather or at the wrong hour, reduced motion) is shared.
const AMBIENT = (() => {
  const px = (v) => Math.round(v / 2) * 2;
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(px(x), px(y), w, h); };
  const free = (env, x, y) => !env.solidAt(Math.floor(x / env.TS), Math.floor(y / env.TS));
  const wander = (a, dt, env, speed, turn) => { // drift in a slowly changing direction; bounce off solid tiles
    a.ang += (Math.random() - 0.5) * turn * dt; const nx = a.x + Math.cos(a.ang) * speed * dt, ny = a.y + Math.sin(a.ang) * speed * dt;
    if (free(env, nx, ny) && nx > 0 && ny > 0) { a.x = nx; a.y = ny; } else a.ang += Math.PI * (0.6 + Math.random() * 0.8);
  };
  const defs = {
    butterfly: { layer: 'air', tile: (c) => c !== 'T' && c !== 'X', when: (tod, w) => tod === 'day' && (!w || w === 'clear' || w === 'sun'),
      make: (r) => ({ ang: r() * 6.28, col: [['#FFD86B', '#FF9A3A'], ['#F9A8D4', '#C455A0'], ['#A8D8FF', '#5B8FE8'], ['#FFFFFF', '#C9D0DE']][Math.floor(r() * 4)], ph: r() * 9 }),
      step(a, dt, env) { wander(a, dt, env, 26, 5); },
      draw(g, a, x, y, t) { const f = Math.floor(t * 9 + a.ph) % 2, bob = Math.sin(t * 3 + a.ph) * 4;
        R(g, x - 1, y - 1 + bob, 2, 6, '#2B2235'); R(g, x - 6, y - 4 + bob, f ? 6 : 4, 6, a.col[0]); R(g, x + 2 - (f ? 0 : 0), y - 4 + bob, f ? 6 : 4, 6, a.col[0]); R(g, x - 4, y - 2 + bob, 2, 2, a.col[1]); R(g, x + 2, y - 2 + bob, 2, 2, a.col[1]); } },
    firefly: { layer: 'glow', tile: (c) => c !== 'T' && c !== 'X', when: (tod, w) => (tod === 'night' || tod === 'dusk') && (!w || w === 'clear' || w === 'fog' || w === 'sun'),
      make: (r) => ({ ang: r() * 6.28, ph: r() * 9 }),
      step(a, dt, env) { wander(a, dt, env, 12, 4); },
      draw(g, a, x, y, t) { const k = 0.5 + 0.5 * Math.sin(t * 2.2 + a.ph), bob = Math.sin(t * 1.4 + a.ph) * 5;
        const base = g.globalAlpha; g.globalAlpha = base * 0.18 * k; R(g, x - 8, y - 8 + bob, 16, 16, '#E8F27A'); g.globalAlpha = base * 0.3 * k; R(g, x - 4, y - 4 + bob, 8, 8, '#E8F27A');
        g.globalAlpha = base * (0.55 + 0.45 * k); R(g, x - 2, y - 2 + bob, 4, 4, '#FFFFCC'); } },
    bird: { layer: 'ground', tile: (c) => c === '.' || c === ',', when: (tod, w) => tod !== 'night' && w !== 'storm' && w !== 'rain',
      make: (r) => ({ ang: r() * 6.28, hop: 0, pause: r() * 3, fly: 0, tint: [['#8A6A4A', '#D8B88A'], ['#6A6A7A', '#C9C9D6'], ['#B05A4A', '#E8C0A0']][Math.floor(r() * 3)], white: false }),
      step(a, dt, env) {
        const dx = env.player.x - a.x, dy = env.player.y - a.y;
        if (!a.fly && dx * dx + dy * dy < 70 * 70) { a.fly = 1.6; a.ang = Math.atan2(-dy, -dx) - 0.4; }
        if (a.fly > 0) { a.fly -= dt; a.x += Math.cos(a.ang) * 130 * dt; a.y += Math.sin(a.ang) * 130 * dt - 40 * dt; a.lift = (a.lift || 0) + 50 * dt; if (a.fly <= 0) { a.respawn = true; } return; }
        a.lift = 0; a.pause -= dt;
        if (a.pause <= 0) { a.hop = 0.25; a.pause = 0.6 + Math.random() * 2.4; a.ang = Math.random() * 6.28; }
        if (a.hop > 0) { a.hop -= dt; const nx = a.x + Math.cos(a.ang) * 40 * dt, ny = a.y + Math.sin(a.ang) * 40 * dt; if (free(env, nx, ny)) { a.x = nx; a.y = ny; } }
      },
      draw(g, a, x, y, t) { const up = a.fly > 0 ? (Math.floor(t * 14) % 2 ? -10 : -6) - (a.lift || 0) : (a.hop > 0 ? -4 : 0), c = a.tint;
        R(g, x - 6, y - 2, 12, 2, 'rgba(0,0,0,0.18)');
        R(g, x - 5, y - 8 + up, 10, 6, c[0]); R(g, x - 3, y - 6 + up, 6, 3, c[1]); R(g, x + 3, y - 11 + up, 5, 5, c[0]); R(g, x + 8, y - 9 + up, 3, 2, '#F2A33A'); R(g, x + 5, y - 10 + up, 2, 2, '#1E1A24');
        if (a.fly > 0) { R(g, x - 8, y - 12 + up, 6, 3, c[0]); R(g, x + 1, y - 12 + up, 6, 3, c[0]); } else R(g, x - 8, y - 6 + up, 3, 2, c[0]); } },
    crab: { layer: 'ground', tile: (c) => c === '.', when: (tod, w) => w !== 'storm',
      make: (r) => ({ ang: r() < 0.5 ? 0 : Math.PI, pause: r() * 3, go: 0 }),
      step(a, dt, env) {
        a.pause -= dt; if (a.pause <= 0) { a.go = 0.5 + Math.random() * 1.2; a.pause = 1.5 + Math.random() * 4; a.ang = Math.random() < 0.5 ? 0 : Math.PI; }
        if (a.go > 0) { a.go -= dt; const nx = a.x + Math.cos(a.ang) * 22 * dt; if (free(env, nx, a.y) && free(env, nx + Math.cos(a.ang) * 10, a.y) && env.tileAt(Math.floor(nx / env.TS), Math.floor(a.y / env.TS)) === '.') a.x = nx; else a.go = 0; }
        const dx = env.player.x - a.x, dy = env.player.y - a.y; a.scared = dx * dx + dy * dy < 40 * 40;
      },
      draw(g, a, x, y, t) { const w = a.go > 0 ? Math.floor(t * 12) % 2 : 0;
        R(g, x - 7, y - 2, 14, 2, 'rgba(0,0,0,0.18)'); R(g, x - 5, y - 7, 10, 5, '#D8574A'); R(g, x - 3, y - 8, 6, 2, '#E8806A');
        R(g, x - 8, y - 9 - (a.scared ? 2 : 0), 4, 4, '#D8574A'); R(g, x + 4, y - 9 - (a.scared ? 2 : 0), 4, 4, '#D8574A'); R(g, x - 3, y - 10, 2, 2, '#1E1A24'); R(g, x + 1, y - 10, 2, 2, '#1E1A24');
        R(g, x - 7, y - 3 + w, 2, 2, '#B03A30'); R(g, x + 5, y - 3 + (1 - w), 2, 2, '#B03A30'); } },
    // things the wind carries (Meaning: wind is change; where the air moves, something passes through). They show only while the map's wind blows (env.wind), drift east with it and come round again. The cold has none.
    leaf: { layer: 'air', tile: (c) => c === '.' || c === ',' || c === 'T', when: (tod, w, env) => (env ? env.wind : 0) > 0.25 && w !== 'storm' && w !== 'rain',
      make: (r) => ({ ph: r() * 9, col: ['#C9A24A', '#D9842A', '#8FBF5A', '#B04A2A'][Math.floor(r() * 4)], spin: 0.6 + r() * 0.8 }),
      step(a, dt, env) { const w = env.wind || 0; a.x += (30 + 70 * w) * dt; a.y += Math.sin(env.t * (1.2 + a.spin) + a.ph) * 14 * dt + 6 * dt; if (a.x > env.M.W * env.TS + 20) { a.x = -20; a.y = (a.home[1] + 0.5) * env.TS + (Math.random() - 0.5) * 160; } },
      draw(g, a, x, y, t) { const f = Math.floor(t * 6 + a.ph) % 4, w = f === 1 || f === 3 ? 2 : 4; R(g, x - w / 2, y - 1, w, 2, a.col); if (f === 0) R(g, x - 1, y - 2, 2, 1, a.col); } },
    ember: { layer: 'glow', tile: (c) => c !== '~', when: (tod, w, env) => (env ? env.wind : 0) > 0.2 || tod === 'night',
      make: (r) => ({ ph: r() * 9, life: 2 + r() * 3 }),
      step(a, dt, env) { const w = env.wind || 0; a.x += (10 + 50 * w) * dt + Math.sin(env.t * 2 + a.ph) * 8 * dt; a.y -= (16 + 10 * w) * dt; if (a.y < (a.home[1] + 0.5) * env.TS - 160 || a.x > env.M.W * env.TS + 20) { a.x = (a.home[0] + 0.5) * env.TS; a.y = (a.home[1] + 0.7) * env.TS; } },
      draw(g, a, x, y, t) { const k = 0.6 + 0.4 * Math.sin(t * 7 + a.ph); R(g, x - 1, y - 1, 2, 2, 'rgba(255,' + Math.round(120 + 60 * k) + ',40,' + (0.5 + 0.5 * k).toFixed(2) + ')'); if (k > 0.8) R(g, x - 2, y - 2, 4, 4, 'rgba(255,170,60,0.25)'); } },
    glint: { layer: 'ground', tile: (c) => c === '.', when: (tod, w) => w !== 'snow' && w !== 'fog',
      make: (r) => ({ ph: r() * 9, per: 2 + r() * 3 }),
      step() {},
      draw(g, a, x, y, t) { const k = ((t + a.ph) % a.per) / a.per; if (k > 0.22) return; const s = k < 0.11 ? 2 : 4;
        R(g, x - 1, y - s, 2, s * 2, 'rgba(255,255,255,0.95)'); R(g, x - s, y - 1, s * 2, 2, 'rgba(255,255,255,0.95)'); } }
  };
  // [def, count] per climate (WEATHER.region) and per-map overrides
  const BY_REGION = {
    town: [['butterfly', 8], ['bird', 4], ['firefly', 12], ['leaf', 6]], moss: [['butterfly', 10], ['bird', 4], ['firefly', 20], ['leaf', 14]],
    frost: [['glint', 12]], peak: [['glint', 8], ['bird', 2]], ember: [['bird', 2], ['ember', 14]], tide: [['crab', 5], ['bird', 4], ['leaf', 4]]
  };
  const MAP_LIST = {
    'route-mf': [['butterfly', 6], ['bird', 3], ['firefly', 12], ['glint', 6], ['leaf', 8]], 'route-cm': [['butterfly', 7], ['bird', 2], ['firefly', 12], ['leaf', 8], ['ember', 6]],
    'route-fc': [['glint', 8], ['crab', 3], ['bird', 2]], 'route-cc': [['crab', 5], ['bird', 3]]
  };
  const SPAWN = {}; let spawnFor = null, list = [];
  const rng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  function listFor(id) { return MAP_LIST[id] || BY_REGION[(typeof WEATHER !== 'undefined' && WEATHER.region(id)) || ''] || []; }
  function spawn(M) {
    list = []; spawnFor = M.id; if (M.interior) return;
    const r = rng(M.W * 131 + M.H * 17 + M.id.length * 7919), TS = 32;
    listFor(M.id).forEach(([kind, n]) => { const d = defs[kind]; if (!d) return;
      for (let i = 0; i < n; i++) for (let tries = 0; tries < 60; tries++) {
        const tx = 2 + Math.floor(r() * (M.W - 4)), ty = 2 + Math.floor(r() * (M.H - 4));
        if (!d.tile(M.grid[ty][tx])) continue;
        const a = Object.assign({ kind: kind, x: (tx + 0.5) * TS, y: (ty + 0.7) * TS, vis: 0, home: [tx, ty] }, d.make(r)); a.ph = a.ph === undefined ? r() * 9 : a.ph; list.push(a); break;
      } });
  }
  // env: { M, TS, solidAt, tileAt, player:{x,y}, cx, cy, vw, vh, t, dt, tod, weather, still }
  function draw(g, layer, env) {
    if (env.still || !env.on) return;
    if (spawnFor !== env.M.id) spawn(env.M);
    list.forEach((a) => {
      const d = defs[a.kind]; if (d.layer !== layer) return;
      const should = d.when(env.tod, env.weather, env) ? 1 : 0;
      a.vis += Math.sign(should - a.vis) * Math.min(Math.abs(should - a.vis), env.dt / 1.2);
      if (a.vis > 0.01 || should) d.step(a, env.dt, env);
      if (a.respawn) { a.respawn = false; a.fly = 0; a.vis = 0; a.x = (a.home[0] + 0.5) * env.TS; a.y = (a.home[1] + 0.7) * env.TS; a.lift = 0; }
      const sx = a.x - env.cx, sy = a.y - env.cy; if (a.vis < 0.02 || sx < -30 || sx > env.vw + 30 || sy < -30 || sy > env.vh + 30) return;
      g.save(); g.globalAlpha = Math.min(1, a.vis) * (a.fly > 0 && a.fly < 0.5 ? a.fly / 0.5 : 1); g.translate(Math.round(sx), Math.round(sy)); d.draw(g, a, 0, 0, env.t); g.restore();   // local origin: the 2 px grid is relative to the critter, so it does not jitter against the ground as the camera moves
    });
  }
  return { defs, draw, listFor, BY_REGION, MAP_LIST, _list: () => list };
})();
