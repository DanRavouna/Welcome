// The shelf engine (v1). One shared file; a game is data (docs/engine-format.md). Fresh code, old ideas:
// everything the tests and bots need is a function on ENGINE (input vector, step, position, solidity, nearest,
// a pose number per animated thing, dialogue advance), content never holds code, saves merge field by field.
(function () {
  'use strict';
  const ENGINE = {};
  const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  const CH = '0123456789abcdefghijklmnopqrstuvwxyz';
  const idx = (c) => CH.indexOf(c);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- state ----------
  let game = null, opts = {}, root = null, canvas = null, ctx = null, scale = 2, view = 11;
  let mapId = null, map = null, player = null, people = [], props = [], hidden = {}, tileOverrides = {};
  let flags = {}, stations = [], played = 0, input = { x: 0, y: 0 }, running = false, last = 0, time = 0;
  let script = null, dialog = null, transition = null, saveTimer = null, dirty = false, lastTrigger = {};
  const tileCache = new Map(), spriteCache = new Map();

  // ---------- helpers for pixel data ----------
  function paintRows(rows, pal, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    for (let y = 0; y < Math.min(h, rows.length); y++) { const row = rows[y] || ''; for (let x = 0; x < Math.min(w, row.length); x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; const col = pal[idx(ch)]; if (!col) continue; g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
    return c;
  }
  function hue(i) { return 'hsl(' + ((i * 47) % 360) + ',12%,' + (28 + (i % 3) * 8) + '%)'; }
  // ---------- placeholders: the only generated art, replaced by Dan in the studio ----------
  const placeholder = {
    tile(id, i, T) {
      const c = document.createElement('canvas'); c.width = T; c.height = T; const g = c.getContext('2d');
      g.fillStyle = hue(i); g.fillRect(0, 0, T, T); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(T - 1, 0, 1, T); g.fillRect(0, T - 1, T, 1);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = Math.floor(T * 0.5) + 'px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((id || '?')[0], T / 2, T / 2 + 1);
      return c;
    },
    body(facing, frame, T) {
      const w = T, h = Math.round(T * 1.5), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
      const bob = frame % 2 === 1 ? 1 : 0, bw = Math.round(w * 0.6), bx = Math.round((w - bw) / 2);
      g.fillStyle = '#5a5f73'; g.fillRect(bx, Math.round(h * 0.35) + bob, bw, Math.round(h * 0.5));
      g.fillStyle = '#8a90a8'; g.fillRect(bx, Math.round(h * 0.1) + bob, bw, Math.round(h * 0.3));
      g.fillStyle = '#1a1c26';
      if (facing !== 'up') { const ey = Math.round(h * 0.2) + bob; if (facing !== 'right') g.fillRect(bx + 1, ey, 2, 2); if (facing !== 'left') g.fillRect(bx + bw - 3, ey, 2, 2); }
      const fy = h - 2 - bob; g.fillRect(bx, fy, Math.round(bw / 2) - 1, 2); g.fillRect(bx + Math.round(bw / 2) + 1, fy + (frame === 2 ? -1 : 0), Math.round(bw / 2) - 1, 2);
      return c;
    },
    track(seed) {
      let s = seed >>> 0 || 7; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
      const scale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'], lead = [], bass = [];
      for (let i = 0; i < 32; i++) { lead.push(rnd() < 0.35 ? '-' : scale[Math.floor(rnd() * scale.length)]); bass.push(i % 4 === 0 ? ['C2', 'A1', 'F2', 'G2'][Math.floor(i / 8) % 4] : '-'); }
      return { bpm: 96, channels: [{ wave: 'square', vol: 0.18, notes: lead.join(' ') }, { wave: 'triangle', vol: 0.25, notes: bass.join(' ') }] };
    },
    map(id, w, h) {
      const rows = []; for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? '1' : '0'; rows.push(r); }
      return { name: id, w: w, h: h, tileset: ['ground', 'wall'], ground: rows, props: [], people: [], exits: [], triggers: [], spawn: [Math.floor(w / 2) + 0.5, Math.floor(h / 2) + 0.5], music: '', intent: '', station: '' };
    }
  };
  ENGINE.placeholder = placeholder;

  // ---------- data access ----------
  const T = () => (game && game.tile) || 16;
  function tileDef(id) { return (game.tiles && game.tiles[id]) || null; }
  function tileCanvas(id, frame) {
    const key = id + ':' + frame; if (tileCache.has(key)) return tileCache.get(key);
    const d = tileDef(id), t = T(); let c;
    if (d && d.frames && d.frames.length) c = paintRows(d.frames[frame % d.frames.length], game.palette || [], t, t);
    else c = placeholder.tile(id, Object.keys(game.tiles || {}).indexOf(id) + 1 + (id ? id.length : 0), t);
    tileCache.set(key, c); return c;
  }
  function spriteDef(id) { return (game.sprites && game.sprites[id]) || null; }
  function spriteCanvas(id, anim, frame, facing) {
    const d = spriteDef(id), key = id + ':' + anim + ':' + frame + ':' + facing; if (spriteCache.has(key)) return spriteCache.get(key);
    let c = null;
    if (d && d.anims) { const a = d.anims[anim] || d.anims['idle-' + facing] || d.anims['idle-down'] || d.anims[Object.keys(d.anims)[0]]; if (a && a.frames && a.frames.length) c = paintRows(a.frames[frame % a.frames.length], game.palette || [], d.w, d.h); }
    if (!c) c = placeholder.body(facing, frame, T());
    spriteCache.set(key, c); return c;
  }
  function animOf(id, name) { const d = spriteDef(id); return d && d.anims && d.anims[name] ? d.anims[name] : null; }
  function tileAt(x, y) { if (!map) return null; const ov = tileOverrides[mapId]; if (ov && ov[x + ',' + y] !== undefined) return ov[x + ',' + y]; const row = map.ground[y]; if (!row) return null; const i = idx(row[x] || ''); return i < 0 ? null : (map.tileset[i] || null); }
  function solidAt(x, y) {
    if (!map) return true; const tx = Math.floor(x), ty = Math.floor(y);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return true;
    const id = tileAt(tx, ty); const d = tileDef(id); if (d && d.solid) return true; if (!d && !id) return true;
    for (const p of props) if (p.solid && !hidden[p.id] && tx >= Math.floor(p.x) && tx < Math.floor(p.x) + (p.w || 1) && ty >= Math.floor(p.y) && ty < Math.floor(p.y) + (p.h || 1)) return true;
    for (const n of people) if (!hidden[n.id] && n.on && Math.floor(n.x) === tx && Math.floor(n.y) === ty && !(player && Math.floor(player.x) === tx && Math.floor(player.y) === ty)) return true;
    return false;
  }
  function boxFree(x, y) { return !solidAt(x - 0.3, y - 0.2) && !solidAt(x + 0.3, y - 0.2) && !solidAt(x - 0.3, y + 0.2) && !solidAt(x + 0.3, y + 0.2); }
  // conditions on flags: "name op value", {flag,op,value}, {all:[...]}, {any:[...]}
  function cond(c) {
    if (c === undefined || c === null || c === '' || c === true) return true; if (c === false) return false;
    if (typeof c === 'string') { const m = c.match(/^\s*([\w.-]+)\s*(==|!=|>=|<=|>|<)\s*(.*?)\s*$/); if (!m) return !!flags[c.trim()]; return cond({ flag: m[1], op: m[2], value: parseVal(m[3]) }); }
    if (c.all) return c.all.every(cond); if (c.any) return c.any.some(cond);
    const a = flags[c.flag], b = c.value, op = c.op || '==';
    const av = a === undefined ? (typeof b === 'number' ? 0 : (typeof b === 'boolean' ? false : '')) : a;
    switch (op) { case '==': return av == b; case '!=': return av != b; case '>': return av > b; case '<': return av < b; case '>=': return av >= b; case '<=': return av <= b; } return false;
  }
  function parseVal(s) { if (s === 'true') return true; if (s === 'false') return false; if (s !== '' && !isNaN(+s)) return +s; return String(s).replace(/^["']|["']$/g, ''); }

  // ---------- maps ----------
  function enterMap(id, x, y, facing) {
    const m = game.maps[id]; if (!m) { console.warn('no map', id); return; }
    mapId = id; map = m; tileCache.clear();
    props = (m.props || []).map((p, i) => Object.assign({ id: id + ':prop' + i, w: 1, h: 1 }, p));
    people = (m.people || []).map((n, i) => Object.assign({ id: n.id || (id + ':person' + i), facing: 'down', anim: 'idle', frame: 0, ft: 0, mv: null, on: true }, n, { x: n.x + 0.5, y: n.y + 0.5 }));
    for (const n of people) { n.on = cond(n.when); n.ox = n.x; n.oy = n.y; }
    player.x = x !== undefined ? x : (m.spawn ? m.spawn[0] : 1.5); player.y = y !== undefined ? y : (m.spawn ? m.spawn[1] : 1.5); if (facing) player.facing = facing;
    lastTrigger = {};
    if (m.station && stations.indexOf(m.station) < 0) { stations.push(m.station); dirty = true; }
    if (m.music !== undefined) audio.play(m.music || null);
    dirty = true; if (opts.onMap) opts.onMap(id);
  }
  function go(id, x, y, facing) {
    if (window.__noTransition || !running) { enterMap(id, x, y, facing); return; }
    transition = { t: 0, mid: () => enterMap(id, x, y, facing), done: false };
  }
  ENGINE.teleport = go;

  // ---------- scripts (step cards) ----------
  function runScript(id, who) {
    const s = game.scripts && game.scripts[id]; if (!s || !s.steps) return false;
    script = { id: id, steps: s.steps, i: 0, wait: null, who: who || null }; return true;
  }
  function personById(id) { return people.find((n) => n.id === id) || null; }
  function sayLines(who, lines) { script = { id: '_say', steps: lines.map((t) => ({ t: 'say', who: who, text: t })), i: 0, wait: null }; }
  function stepScript(dt) {
    if (!script) return;
    if (script.wait) {
      const w = script.wait;
      if (w.type === 'wait') { w.left -= dt; if (w.left <= 0) script.wait = null; else return; }
      else if (w.type === 'move') { const n = w.who; if (!n) { script.wait = null; } else { const dx = w.tx - n.x, dy = w.ty - n.y, d = Math.hypot(dx, dy), sp = (w.speed || 3) * dt; if (d <= sp) { n.x = w.tx; n.y = w.ty; n.anim = 'idle'; script.wait = null; } else { n.x += dx / d * sp; n.y += dy / d * sp; n.anim = 'walk'; n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); return; } } }
      else return;   // say / choice wait for advance()
    }
    let guard = 0;
    while (script && !script.wait && guard++ < 200) {
      const st = script.steps[script.i]; if (!st) { script = null; break; }
      script.i++;
      switch (st.t) {
        case 'say': dialog = { who: st.who || '', text: st.text || '', options: null }; script.wait = { type: 'say' }; break;
        case 'choice': dialog = { who: st.who || '', text: st.prompt || '', options: (st.options || []).map((o) => o.text), to: (st.options || []).map((o) => o.to) }; script.wait = { type: 'choice' }; break;
        case 'set': flags[st.flag] = st.value === undefined ? true : st.value; dirty = true; break;
        case 'add': flags[st.flag] = (+flags[st.flag] || 0) + (st.n === undefined ? 1 : +st.n); dirty = true; break;
        case 'if': { const ok = cond(st.when || { flag: st.flag, op: st.op, value: st.value }); const to = ok ? st.then : st.else; if (to !== undefined && to !== null && to !== '') script.i = +to; break; }
        case 'jump': script.i = +st.to; break;
        case 'teleport': go(st.map || mapId, st.x !== undefined ? st.x + 0.5 : undefined, st.y !== undefined ? st.y + 0.5 : undefined, st.facing); break;
        case 'move': { const n = personById(st.who) || (st.who === 'player' ? player : null); if (n) script.wait = { type: 'move', who: n, tx: st.x + 0.5, ty: st.y + 0.5, speed: st.speed }; break; }
        case 'face': { const n = personById(st.who) || (st.who === 'player' ? player : null); if (n && DIRS[st.dir]) n.facing = st.dir; break; }
        case 'wait': script.wait = { type: 'wait', left: +st.s || 0 }; break;
        case 'show': delete hidden[st.id]; dirty = true; break;
        case 'hide': hidden[st.id] = true; dirty = true; break;
        case 'tile': { const mid = st.map || mapId; tileOverrides[mid] = tileOverrides[mid] || {}; tileOverrides[mid][st.x + ',' + st.y] = st.tile; if (mid === mapId) tileCache.clear(); dirty = true; break; }
        case 'music': audio.play(st.track || null); break;
        case 'sound': audio.sfx(st.id); break;
        case 'end': script = null; break;
        default: break;
      }
    }
  }
  function advance(choice) {
    if (!script || !script.wait) return false;
    if (script.wait.type === 'say') { dialog = null; script.wait = null; return true; }
    if (script.wait.type === 'choice') { const i = choice === undefined ? 0 : +choice; const to = dialog && dialog.to ? dialog.to[i] : undefined; dialog = null; script.wait = null; if (to !== undefined && to !== null && to !== '') script.i = +to; return true; }
    return false;
  }
  ENGINE.advance = advance;

  // ---------- the action button ----------
  function nearest() {
    const d = DIRS[player.facing], fx = Math.floor(player.x) + d[0], fy = Math.floor(player.y) + d[1]; let best = null;
    for (const n of people) { if (hidden[n.id] || !n.on) continue; if (Math.floor(n.x) === fx && Math.floor(n.y) === fy) return n; }
    let bd = 1.3; for (const n of people) { if (hidden[n.id] || !n.on) continue; const dd = Math.hypot(n.x - player.x, n.y - player.y); if (dd < bd) { bd = dd; best = n; } }
    return best;
  }
  function act() {
    if (dialog) { if (!dialog.options) advance(); return; }
    if (script) return;
    const n = nearest(); if (!n) return;
    if (n.turns !== false) { const dx = player.x - n.x, dy = player.y - n.y; n.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
    if (n.script && runScript(n.script, n)) return;
    if (n.lines && n.lines.length) sayLines(n.name || '', n.lines);
  }
  ENGINE.act = act;

  // ---------- update ----------
  function update(dt) {
    time += dt; played += dt;
    if (transition) { transition.t += dt; if (transition.t >= 0.25 && !transition.done) { transition.done = true; transition.mid(); } if (transition.t >= 0.5) transition = null; return; }
    for (const n of people) { n.on = cond(n.when); n.ft += dt; }
    stepScript(dt);
    const busy = !!script || !!dialog;
    let mx = busy ? 0 : input.x, my = busy ? 0 : input.y; const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (len > 0.1) {
      player.facing = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up');
      const sp = (game.player && game.player.speed) || 4, nx = player.x + mx * sp * dt, ny = player.y + my * sp * dt;
      if (boxFree(nx, player.y)) player.x = nx; if (boxFree(player.x, ny)) player.y = ny;
      player.anim = 'walk'; player.ft += dt;
    } else { player.anim = 'idle'; player.ft = 0; }
    if (!busy) {
      const px = Math.floor(player.x), py = Math.floor(player.y);
      for (const e of (map.exits || [])) if (px >= e.x && px < e.x + (e.w || 1) && py >= e.y && py < e.y + (e.h || 1)) { go(e.to, e.tx + 0.5, e.ty + 0.5, e.facing || player.facing); return; }
      (map.triggers || []).forEach((tr, i) => {
        const inside = px >= tr.x && px < tr.x + (tr.w || 1) && py >= tr.y && py < tr.y + (tr.h || 1); const key = 'i' + i;
        if (!inside) { delete lastTrigger[key]; return; }
        const onceKey = '_t:' + mapId + ':' + i; if (tr.once && flags[onceKey]) return; if (!cond(tr.when)) return;
        if (tr.each) { const t0 = lastTrigger[key]; if (t0 === undefined) { lastTrigger[key] = time; return; } if (time - t0 < +tr.each) return; lastTrigger[key] = time; }
        else { if (lastTrigger[key]) return; lastTrigger[key] = true; }
        if (tr.once) { flags[onceKey] = true; dirty = true; }
        runScript(tr.script);
      });
    }
    if (dirty && !saveTimer) saveTimer = setTimeout(flush, 800);
  }
  function flush() { saveTimer = null; if (!dirty) return; dirty = false; const s = ENGINE.save(); if (opts.save && opts.save.set) opts.save.set(s); }
  ENGINE.save = () => ({ v: 1, game: game.id, map: mapId, x: +player.x.toFixed(2), y: +player.y.toFixed(2), facing: player.facing, flags: flags, tiles: tileOverrides, hidden: hidden, stations: stations.slice(), played: Math.round(played), t: Date.now() });
  ENGINE.flushSave = () => { dirty = true; flush(); };

  // ---------- draw ----------
  function fit() {
    const r = root.getBoundingClientRect(), t = T(); const w = Math.max(64, Math.floor(r.width)), h = Math.max(64, Math.floor(r.height));
    scale = Math.max(1, Math.floor(Math.min(w, h) / (t * view)));
    canvas.width = Math.ceil(w / scale); canvas.height = Math.ceil(h / scale); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  }
  function draw() {
    if (!map) return; const t = T(), W = canvas.width, H = canvas.height; ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
    const mw = map.w * t, mh = map.h * t;
    let cx = Math.round(player.x * t - W / 2), cy = Math.round(player.y * t - H / 2);
    cx = mw <= W ? Math.round((mw - W) / 2) : clamp(cx, 0, mw - W); cy = mh <= H ? Math.round((mh - H) / 2) : clamp(cy, 0, mh - H);
    const x0 = Math.max(0, Math.floor(cx / t)), y0 = Math.max(0, Math.floor(cy / t)), x1 = Math.min(map.w, Math.ceil((cx + W) / t)), y1 = Math.min(map.h, Math.ceil((cy + H) / t));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const id = tileAt(x, y); if (!id) continue; const d = tileDef(id); const f = d && d.fps && d.frames && d.frames.length > 1 ? Math.floor(time * d.fps) % d.frames.length : 0; ctx.drawImage(tileCanvas(id, f), x * t - cx, y * t - cy); }
    const ents = [];
    for (const p of props) if (!hidden[p.id]) ents.push({ y: p.y + (p.h || 1), draw: () => { const sd = spriteDef(p.sprite); const a = sd && sd.anims ? (sd.anims.idle || sd.anims[Object.keys(sd.anims)[0]]) : null; const f = a && a.fps && a.frames.length > 1 ? Math.floor(time * a.fps) % a.frames.length : 0; const c = sd ? spriteCanvas(p.sprite, a ? Object.keys(sd.anims).find((k) => sd.anims[k] === a) : 'idle', f, 'down') : tileCanvas(p.sprite || 'prop', 0); ctx.drawImage(c, Math.round(p.x * t - cx), Math.round((p.y + (p.h || 1)) * t - c.height - cy)); } });
    const drawBody = (n, sid) => { const an = (n.anim === 'walk' ? 'walk-' : 'idle-') + n.facing; const a = animOf(sid, an) || animOf(sid, 'walk-' + n.facing); const fps = a && a.fps ? a.fps : 6, nf = a && a.frames ? a.frames.length : 3; const f = n.anim === 'walk' ? Math.floor(n.ft * fps) % nf : 0; const c = spriteCanvas(sid, an, f, n.facing); const sd = spriteDef(sid); const ax = sd && sd.anchor ? sd.anchor[0] : c.width / 2, ay = sd && sd.anchor ? sd.anchor[1] : c.height; ctx.drawImage(c, Math.round(n.x * t - ax - cx), Math.round((n.y + 0.5) * t - ay - cy)); };
    for (const n of people) if (!hidden[n.id] && n.on) ents.push({ y: n.y, draw: () => drawBody(n, n.sprite || 'person') });
    ents.push({ y: player.y, draw: () => drawBody(player, (game.player && game.player.sprite) || 'hero') });
    ents.sort((a, b) => a.y - b.y); for (const e of ents) e.draw();
    if (transition) { const a = transition.t < 0.25 ? transition.t / 0.25 : 1 - (transition.t - 0.25) / 0.25; ctx.fillStyle = 'rgba(0,0,0,' + clamp(a, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
    drawDialog();
  }
  let dlgEl = null, dlgKey = '';
  function drawDialog() {
    if (!dlgEl) return;
    const key = dialog ? JSON.stringify(dialog) : '';
    if (key === dlgKey) return; dlgKey = key;
    if (!dialog) { dlgEl.hidden = true; dlgEl.innerHTML = ''; return; }
    dlgEl.hidden = false;
    dlgEl.innerHTML = (dialog.who ? '<b>' + esc(dialog.who) + '</b>' : '') + '<p>' + esc(dialog.text) + '</p>' + (dialog.options ? '<div class="eng-opts">' + dialog.options.map((o, i) => '<button data-i="' + i + '">' + esc(o) + '</button>').join('') + '</div>' : '<span class="eng-more">▼</span>');
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- loop ----------
  function frame(ts) {
    if (!running) return; const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016); last = ts;
    update(dt); draw(); requestAnimationFrame(frame);
  }
  ENGINE.start = () => { if (running) return; running = true; last = 0; requestAnimationFrame(frame); };
  ENGINE.stop = () => { running = false; flush(); audio.play(null); };

  // ---------- audio: a small synth; tracks and sounds are data ----------
  const audio = (() => {
    let ac = null, master = null, cur = null, timer = null, nextT = 0, stepI = 0, compiled = null, curId = null, unlocked = false, muted = false;
    const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function freq(n) { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return 0; let s = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (s + (+m[3] - 4) * 12 - 9) / 12); }
    function ctxOk() { if (ac) return true; try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination); return true; } catch (e) { return false; } }
    let noiseBuf = null;
    function noise() { if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate / 4, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
    function voice(wave, f, t0, dur, vol) {
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur)); g.connect(master);
      let o; if (wave === 'noise') { o = noise(); } else { o = ac.createOscillator(); o.type = ['square', 'triangle', 'sawtooth', 'sine'].indexOf(wave) >= 0 ? wave : 'square'; o.frequency.setValueAtTime(f || 220, t0); }
      o.connect(g); o.start(t0); o.stop(t0 + Math.max(0.03, dur) + 0.02);
    }
    function compile(tr) { const spb = tr.stepsPerBeat || 2, stepLen = 60 / (tr.bpm || 100) / spb; const ch = (tr.channels || []).map((c) => ({ wave: c.wave || 'square', vol: c.vol === undefined ? 0.2 : c.vol, notes: String(c.notes || '').trim().split(/\s+/) })); const len = Math.max(1, ...ch.map((c) => c.notes.length)); return { stepLen: stepLen, len: len, ch: ch }; }
    function tick() {
      if (!compiled || !ac) return; const ahead = 0.2;
      while (nextT < ac.currentTime + ahead) {
        for (const c of compiled.ch) { const n = c.notes[stepI % c.notes.length]; if (!n || n === '-' || n === '.') continue; let d = compiled.stepLen; for (let k = 1; k < 32 && c.notes[(stepI + k) % c.notes.length] === '-'; k++) d += compiled.stepLen; voice(c.wave, c.wave === 'noise' ? 0 : freq(n), nextT, d * 0.9, c.vol); }
        nextT += compiled.stepLen; stepI++;
      }
    }
    return {
      unlock() { if (!ctxOk()) return; unlocked = true; if (ac.state === 'suspended') ac.resume(); if (curId && !timer) { nextT = ac.currentTime + 0.05; stepI = 0; timer = setInterval(tick, 100); tick(); } },
      play(id) {
        curId = id || null; if (timer) { clearInterval(timer); timer = null; } compiled = null; if (!id) return;
        const tr = (game.tracks && game.tracks[id]) || null; if (!tr) return; compiled = compile(tr);
        if (!unlocked || !ac) return; nextT = ac.currentTime + 0.05; stepI = 0; timer = setInterval(tick, 100); tick();
      },
      sfx(id) { const s = game.sounds && game.sounds[id]; if (!s || !unlocked || !ac) return; let t0 = ac.currentTime + 0.01; for (const n of (s.notes || [])) { voice(s.wave || 'square', n[0], t0, n[1] || 0.08, s.vol === undefined ? 0.25 : s.vol); t0 += (n[1] || 0.08); } },
      preview(tr) { curId = '_preview'; if (timer) { clearInterval(timer); timer = null; } compiled = compile(tr); if (!unlocked || !ac) return; nextT = ac.currentTime + 0.05; stepI = 0; timer = setInterval(tick, 100); tick(); },
      previewSound(s) { if (!unlocked || !ac) return; let t0 = ac.currentTime + 0.01; for (const n of (s.notes || [])) { voice(s.wave || 'square', n[0], t0, n[1] || 0.08, s.vol === undefined ? 0.25 : s.vol); t0 += (n[1] || 0.08); } },
      mute(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.5; },
      get current() { return curId; }, get step() { return stepI; }, get stepLen() { return compiled ? compiled.stepLen : 0; }, freq: freq
    };
  })();
  ENGINE.audio = audio;

  // ---------- input UI (touch joystick + action; keyboard) ----------
  function installInput() {
    const keys = {}; const upd = () => { let x = 0, y = 0; if (keys.ArrowLeft || keys.a) x -= 1; if (keys.ArrowRight || keys.d) x += 1; if (keys.ArrowUp || keys.w) y -= 1; if (keys.ArrowDown || keys.s) y += 1; if (!touch.on) input = { x: x, y: y }; };
    window.addEventListener('keydown', (e) => { if (e.repeat) return; keys[e.key] = true; if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') { audio.unlock(); act(); e.preventDefault(); } upd(); });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; upd(); });
    const touch = { on: false, id: null, x0: 0, y0: 0 };
    root.addEventListener('pointerdown', (e) => { audio.unlock(); if (e.target.closest && e.target.closest('.eng-dlg')) return; const r = root.getBoundingClientRect(); if (e.clientX - r.left > r.width * 0.6) { act(); return; } touch.on = true; touch.id = e.pointerId; touch.x0 = e.clientX; touch.y0 = e.clientY; root.setPointerCapture && root.setPointerCapture(e.pointerId); });
    root.addEventListener('pointermove', (e) => { if (!touch.on || e.pointerId !== touch.id) return; const dx = e.clientX - touch.x0, dy = e.clientY - touch.y0, d = Math.hypot(dx, dy); if (d < 8) { input = { x: 0, y: 0 }; return; } const k = Math.min(1, d / 40); input = { x: dx / d * k, y: dy / d * k }; });
    const end = (e) => { if (!touch.on || (e.pointerId !== undefined && e.pointerId !== touch.id)) return; touch.on = false; input = { x: 0, y: 0 }; };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    dlgEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) advance(+b.dataset.i); else if (dialog && !dialog.options) advance(); });
  }

  // ---------- public: load ----------
  ENGINE.load = function (g, o) {
    game = g; opts = o || {}; root = opts.container; view = g.view || 11;
    root.innerHTML = ''; root.classList.add('eng-root'); canvas = document.createElement('canvas'); ctx = canvas.getContext('2d'); root.appendChild(canvas);
    dlgEl = document.createElement('div'); dlgEl.className = 'eng-dlg'; dlgEl.hidden = true; root.appendChild(dlgEl); dlgKey = '';
    if (!document.getElementById('eng-style')) { const st = document.createElement('style'); st.id = 'eng-style'; st.textContent = '.eng-root{position:relative;overflow:hidden;background:#0b0b10;touch-action:none;user-select:none;-webkit-user-select:none}.eng-root canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}.eng-dlg{position:absolute;left:8px;right:8px;bottom:8px;background:rgba(10,10,16,.92);color:#fff;border:2px solid #fff;padding:10px 12px;font:16px/1.35 system-ui,sans-serif;border-radius:4px}.eng-dlg b{display:block;font-size:13px;opacity:.8;margin-bottom:4px}.eng-dlg p{margin:0}.eng-more{position:absolute;right:10px;bottom:4px;font-size:11px;opacity:.7}.eng-opts{display:flex;flex-direction:column;gap:6px;margin-top:8px}.eng-opts button{font:inherit;text-align:left;background:#22243a;color:#fff;border:1px solid #666;border-radius:4px;padding:8px}'; document.head.appendChild(st); }
    tileCache.clear(); spriteCache.clear(); flags = {}; stations = []; hidden = {}; tileOverrides = {}; played = 0; script = null; dialog = null; transition = null; time = 0;
    player = { x: 1.5, y: 1.5, facing: 'down', anim: 'idle', ft: 0, id: 'player' };
    const sv = opts.save && opts.save.get ? opts.save.get() : null;
    if (sv && sv.map && game.maps[sv.map]) { flags = Object.assign({}, sv.flags || {}); tileOverrides = Object.assign({}, sv.tiles || {}); hidden = Object.assign({}, sv.hidden || {}); stations = (sv.stations || []).slice(); played = +sv.played || 0; enterMap(sv.map, sv.x, sv.y, sv.facing); }
    else enterMap(g.start || Object.keys(g.maps)[0]);
    dirty = false; fit(); window.addEventListener('resize', fit); installInput(); draw();
    return ENGINE;
  };
  // ---------- test and studio API ----------
  ENGINE.input = (x, y) => { input = { x: +x || 0, y: +y || 0 }; };
  ENGINE.pos = () => ({ x: player.x, y: player.y, facing: player.facing, map: mapId });
  ENGINE.map = () => mapId;
  ENGINE.solidAt = solidAt;
  ENGINE.nearest = () => { const n = nearest(); return n ? { id: n.id, name: n.name, x: n.x, y: n.y } : null; };
  ENGINE.flags = () => Object.assign({}, flags);
  ENGINE.stations = () => stations.slice();
  ENGINE.dialog = () => (dialog ? Object.assign({}, dialog) : null);
  ENGINE.script = () => (script ? { id: script.id, i: script.i, wait: script.wait ? script.wait.type : null } : null);
  ENGINE.pose = () => { const a = animOf((game.player && game.player.sprite) || 'hero', 'walk-' + player.facing); const fps = a && a.fps ? a.fps : 6, nf = a && a.frames ? a.frames.length : 3; return player.anim === 'walk' ? Math.floor(player.ft * fps) % nf : 0; };
  ENGINE.people = () => people.map((n) => ({ id: n.id, name: n.name, x: n.x, y: n.y, facing: n.facing, on: n.on && !hidden[n.id] }));
  ENGINE.time = () => time;
  ENGINE.scale = () => scale;
  ENGINE.game = () => game;
  ENGINE.fit = () => fit();
  ENGINE.tileCanvas = (g, id, frame) => { const keep = game; game = g; tileCache.clear(); const c = tileCanvas(id, frame || 0); tileCache.clear(); game = keep; return c; };
  ENGINE.spriteCanvas = (g, id, anim, frame, facing) => { const keep = game; game = g; spriteCache.clear(); const c = spriteCanvas(id, anim, frame || 0, facing || 'down'); spriteCache.clear(); game = keep; return c; };
  // Draw a whole map into a canvas (the studio's map view). No entities beyond people and props.
  ENGINE.renderMap = function (g, mid, target, sc) {
    const keep = { game: game, map: map, mapId: mapId, props: props, people: people, hidden: hidden, ov: tileOverrides }; game = g; const m = g.maps[mid]; if (!m) return null;
    map = m; mapId = mid; hidden = {}; tileOverrides = {}; tileCache.clear(); spriteCache.clear(); const t = g.tile || 16; sc = sc || 1;
    const c = target || document.createElement('canvas'); c.width = m.w * t; c.height = m.h * t; const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false; g2.fillStyle = '#0b0b10'; g2.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const id = tileAt(x, y); if (!id) continue; g2.drawImage(tileCanvas(id, 0), x * t, y * t); }
    for (const p of (m.props || [])) { const sd = spriteDef(p.sprite); const cc = sd ? spriteCanvas(p.sprite, 'idle', 0, 'down') : tileCanvas(p.sprite || 'prop', 0); g2.drawImage(cc, p.x * t, (p.y + 1) * t - cc.height); }
    for (const n of (m.people || [])) { const cc = spriteCanvas(n.sprite || 'person', 'idle-' + (n.facing || 'down'), 0, n.facing || 'down'); const sd = spriteDef(n.sprite || 'person'); const ax = sd && sd.anchor ? sd.anchor[0] : cc.width / 2, ay = sd && sd.anchor ? sd.anchor[1] : cc.height; g2.drawImage(cc, Math.round((n.x + 0.5) * t - ax), Math.round((n.y + 1) * t - ay)); }
    game = keep.game; map = keep.map; mapId = keep.mapId; props = keep.props; people = keep.people; hidden = keep.hidden; tileOverrides = keep.ov; tileCache.clear(); spriteCache.clear();
    return c;
  };
  // Checks a game's data: references that point nowhere, steps that jump out of range, words that tell.
  ENGINE.check = function (g) {
    const out = []; const err = (where, msg) => out.push({ where: where, msg: msg });
    if (!g || !g.maps) return [{ where: 'game', msg: 'no maps' }];
    const TELL = /\b(press|tap|click|button|you (must|need to|have to|should)|to (open|unlock|continue)|the (rule|objective) is|tip:)\b/i;
    for (const id in g.maps) {
      const m = g.maps[id];
      (m.tileset || []).forEach((t) => { if (!g.tiles || !g.tiles[t]) err('map ' + id, 'tile "' + t + '" has no art yet (placeholder shows)'); });
      (m.exits || []).forEach((e, i) => { if (!g.maps[e.to]) err('map ' + id + ' exit ' + i, 'leads to a map that does not exist: ' + e.to); for (let yy = e.y; yy < e.y + (e.h || 1); yy++) for (let xx = e.x; xx < e.x + (e.w || 1); xx++) { const row = m.ground[yy] || ''; const td = g.tiles && g.tiles[m.tileset[idx(row[xx] || '')]]; if (td && td.solid) err('map ' + id + ' exit ' + i, 'sits on a solid tile at ' + xx + ',' + yy + ' so nobody can reach it'); } });
      (m.triggers || []).forEach((tr, i) => { if (!g.scripts || !g.scripts[tr.script]) err('map ' + id + ' trigger ' + i, 'runs a script that does not exist: ' + tr.script); });
      (m.people || []).forEach((n, i) => { if (n.script && (!g.scripts || !g.scripts[n.script])) err('map ' + id + ' person ' + (n.id || i), 'runs a script that does not exist: ' + n.script); (n.lines || []).forEach((l) => { if (TELL.test(l)) err('map ' + id + ' person ' + (n.id || i), 'tells instead of hinting: "' + l + '"'); }); });
      if (m.station && !(g.road && g.road.stations || []).some((s) => s.id === m.station)) err('map ' + id, 'names a station that is not on the road: ' + m.station);
    }
    for (const sid in (g.scripts || {})) { const st = g.scripts[sid].steps || []; st.forEach((s, i) => { const refs = [s.to, s.then, s.else].concat((s.options || []).map((o) => o.to)); refs.forEach((r) => { if (r !== undefined && r !== null && r !== '' && (+r < 0 || +r > st.length)) err('script ' + sid + ' step ' + i, 'jumps to step ' + r + ' which does not exist'); }); if (s.t === 'say' && TELL.test(s.text || '')) err('script ' + sid + ' step ' + i, 'tells instead of hinting: "' + s.text + '"'); if (s.t === 'teleport' && s.map && !g.maps[s.map]) err('script ' + sid + ' step ' + i, 'teleports to a map that does not exist: ' + s.map); }); }
    if (g.road && g.road.stations) g.road.stations.forEach((s) => { if (!Object.keys(g.maps).some((id) => g.maps[id].station === s.id)) err('station ' + s.id, 'no map plays it yet'); if (!s.act) err('station ' + s.id, 'has no act written'); });
    return out;
  };
  ENGINE.roundTrip = (g) => { try { const j = JSON.stringify(g); const back = JSON.parse(j); return JSON.stringify(back) === j && !/"__proto__"/.test(j); } catch (e) { return false; } };
  ENGINE.version = 1;
  window.ENGINE = ENGINE;
})();
