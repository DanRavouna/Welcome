// The pixel editor: palette, tiles and sprites with frames and animation, drawn with a finger on the phone.
// Pixels are rows of palette characters (docs/engine-format.md); a frame is edited in place.
(function () {
  'use strict';
  const CH = '0123456789abcdefghijklmnopqrstuvwxyz';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const P = { kind: 'tiles', id: null, anim: null, frame: 0, tool: 'pen', col: 1, onion: true, playing: false, undo: [], mirror: false };
  let game = null, dirty = null, previewTimer = null;
  window.STUDIO_PX = P;
  const blank = (w, h) => { const r = []; for (let y = 0; y < h; y++) r.push('.'.repeat(w)); return r; };
  const FACINGS = ['down', 'up', 'left', 'right'];

  function cur() {   // the frame rows being edited, with width and height
    if (P.kind === 'tiles') { const t = game.tiles[P.id]; if (!t) return null; if (!t.frames.length) t.frames.push(blank(game.tile, game.tile)); P.frame = Math.min(P.frame, t.frames.length - 1); return { rows: t.frames[P.frame], w: game.tile, h: game.tile, frames: t.frames, holder: t }; }
    const s = game.sprites[P.id]; if (!s) return null; const names = Object.keys(s.anims); if (!names.length) s.anims.idle = { frames: [], fps: 6 }; if (!s.anims[P.anim]) P.anim = Object.keys(s.anims)[0]; const a = s.anims[P.anim]; if (!a.frames.length) a.frames.push(blank(s.w, s.h)); P.frame = Math.min(P.frame, a.frames.length - 1); return { rows: a.frames[P.frame], w: s.w, h: s.h, frames: a.frames, holder: a };
  }
  function setPx(rows, x, y, c) { if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return; rows[y] = rows[y].slice(0, x) + c + rows[y].slice(x + 1); }
  function getPx(rows, x, y) { return (rows[y] || '')[x] || '.'; }
  function pushUndo(c) { P.undo.push({ frames: c.frames, i: P.frame, rows: c.rows.slice() }); if (P.undo.length > 60) P.undo.shift(); }
  function fill(rows, x, y, c) { const from = getPx(rows, x, y); if (from === c) return; const w = rows[0].length, h = rows.length; const st = [[x, y]]; while (st.length) { const [px, py] = st.pop(); if (px < 0 || py < 0 || px >= w || py >= h || getPx(rows, px, py) !== from) continue; setPx(rows, px, py, c); st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]); } }

  function view(g, mark) {
    game = g; dirty = mark; if (!game.palette) game.palette = ['#000000', '#ffffff']; if (!game.sprites) game.sprites = {};
    const v = $('view');
    v.innerHTML = '<div class="tools" id="px-kind"><button type="button" data-k="tiles">Tiles</button><button type="button" data-k="sprites">Sprites</button><button type="button" data-k="palette">Palette</button></div><div id="px-body"></div>';
    v.querySelectorAll('#px-kind button').forEach((b) => { b.classList.toggle('on', b.dataset.k === P.kind); b.onclick = () => { stopPreview(); P.kind = b.dataset.k; P.id = null; P.undo = []; view(game, dirty); }; });
    if (P.kind === 'palette') return viewPalette();
    const list = P.kind === 'tiles' ? Object.keys(game.tiles) : Object.keys(game.sprites); if (!P.id || list.indexOf(P.id) < 0) P.id = list[0] || null;
    const body = $('px-body');
    const thumbs = '<div class="tiles" id="px-list">' + list.map((id) => '<button type="button" data-id="' + esc(id) + '"' + (id === P.id ? ' class="on"' : '') + ' aria-label="' + esc(id) + '"></button>').join('') + '<button type="button" id="px-new" aria-label="new">+</button></div>';
    body.innerHTML = thumbs + (P.id ? editorHtml() : '<p class="muted">No ' + P.kind + ' yet. Tap + to make one.</p>');
    body.querySelectorAll('#px-list button[data-id]').forEach((b) => { const c = P.kind === 'tiles' ? ENGINE.tileCanvas(game, b.dataset.id, 0) : ENGINE.spriteCanvas(game, b.dataset.id, 'idle-down', 0, 'down'); c.setAttribute('aria-hidden', 'true'); b.appendChild(c); b.onclick = () => { stopPreview(); P.id = b.dataset.id; P.frame = 0; P.undo = []; view(game, dirty); }; });
    $('px-new').onclick = newThing;
    if (P.id) wireEditor();
  }
  function newThing() {
    if (P.kind === 'tiles') STUDIO_SHEET('New tile', [{ k: 'name', l: 'Name' }, { k: 'solid', l: 'Solid (cannot be walked on)', t: 'bool' }], { name: '', solid: false }, (o) => { const id = slug(o.name); if (!id || game.tiles[id]) return; game.tiles[id] = { solid: !!o.solid, frames: [blank(game.tile, game.tile)], fps: 0 }; P.id = id; P.frame = 0; dirty(); view(game, dirty); });
    else STUDIO_SHEET('New sprite', [{ k: 'name', l: 'Name (the player is "hero")' }, { k: 'kind', l: 'Kind', t: 'select', opts: ['body (walks, four facings)', 'prop (one picture, can animate)'] }, { k: 'w', l: 'Width in pixels', t: 'num' }, { k: 'h', l: 'Height in pixels', t: 'num' }, { k: 'start', l: 'Start from the placeholder body', t: 'bool' }], { name: '', kind: 'body (walks, four facings)', w: game.tile, h: Math.round(game.tile * 1.5), start: true }, (o) => {
      const id = slug(o.name); if (!id || game.sprites[id]) return; const w = Math.max(1, Math.min(64, o.w | 0)), h = Math.max(1, Math.min(64, o.h | 0));
      const s = { w: w, h: h, anchor: [Math.floor(w / 2), h - 1], anims: {} };
      if (o.kind.startsWith('body')) { FACINGS.forEach((f) => { s.anims['idle-' + f] = { frames: [o.start ? fromCanvas(ENGINE.placeholder.body(f, 0, game.tile), w, h) : blank(w, h)], fps: 1 }; s.anims['walk-' + f] = { frames: [0, 1, 2].map((i) => o.start ? fromCanvas(ENGINE.placeholder.body(f, i, game.tile), w, h) : blank(w, h)), fps: 6 }; }); }
      else s.anims.idle = { frames: [blank(w, h)], fps: 4 };
      game.sprites[id] = s; P.id = id; P.anim = Object.keys(s.anims)[0]; P.frame = 0; dirty(); view(game, dirty); });
  }
  // turns a canvas into palette rows, matching each pixel to the nearest palette colour (adds colours when there is room)
  function fromCanvas(c, w, h) {
    const g = c.getContext('2d'); const d = g.getImageData(0, 0, Math.min(w, c.width), Math.min(h, c.height)).data; const rows = blank(w, h);
    const pal = game.palette.map(hex2rgb); const key = {};
    for (let y = 0; y < Math.min(h, c.height); y++) for (let x = 0; x < Math.min(w, c.width); x++) { const i = (y * Math.min(w, c.width) + x) * 4; if (d[i + 3] < 128) continue; const rgb = [d[i], d[i + 1], d[i + 2]]; const hx = rgb2hex(rgb); let ci = key[hx]; if (ci === undefined) { let best = 0, bd = 1e9; pal.forEach((p, j) => { const dd = (p[0] - rgb[0]) ** 2 + (p[1] - rgb[1]) ** 2 + (p[2] - rgb[2]) ** 2; if (dd < bd) { bd = dd; best = j; } }); if (bd > 900 && game.palette.length < 36) { game.palette.push(hx); pal.push(rgb); best = game.palette.length - 1; } key[hx] = ci = best; } setPx(rows, x, y, CH[ci]); }
    return rows;
  }
  const hex2rgb = (h) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ''); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]; };
  const rgb2hex = (c) => '#' + c.map((v) => ('0' + v.toString(16)).slice(-2)).join('');

  function editorHtml() {
    const c = cur(); if (!c) return '';
    const isS = P.kind === 'sprites'; const s = isS ? game.sprites[P.id] : game.tiles[P.id];
    return '<div class="row" style="margin:6px 0"><b style="flex:1">' + esc(P.id) + '</b>' + (isS ? '<select id="px-anim" aria-label="animation" style="flex:1">' + Object.keys(s.anims).map((a) => '<option' + (a === P.anim ? ' selected' : '') + '>' + esc(a) + '</option>').join('') + '</select>' : '') + '<button type="button" id="px-set" style="flex:0">Settings</button></div>' +
      '<div class="tools" id="px-tools">' + [['pen', 'Pen'], ['fill', 'Fill'], ['erase', 'Erase'], ['pick', 'Pick']].map((t) => '<button type="button" data-t="' + t[0] + '"' + (t[0] === P.tool ? ' class="on"' : '') + '>' + t[1] + '</button>').join('') + '<button type="button" id="px-mirror"' + (P.mirror ? ' class="on"' : '') + '>Mirror</button><button type="button" id="px-undo">Undo</button></div>' +
      '<div class="tiles" id="px-pal">' + game.palette.map((col, i) => '<button type="button" data-c="' + i + '" style="background:' + esc(col) + '"' + (i === P.col ? ' class="on"' : '') + ' aria-label="colour ' + i + '"></button>').join('') + '</div>' +
      '<div class="row" style="align-items:flex-start"><canvas id="px-cv" style="touch-action:none;image-rendering:pixelated;border:1px solid var(--line);background:repeating-conic-gradient(#2a2834 0 25%,#1e1c27 0 50%) 0 0/16px 16px"></canvas><div style="flex:0 0 auto;text-align:center"><canvas id="px-prev" style="image-rendering:pixelated;border:1px solid var(--line)"></canvas><div class="muted" id="px-fi"></div></div></div>' +
      '<div class="tiles" id="px-frames">' + c.frames.map((f, i) => '<button type="button" data-f="' + i + '"' + (i === P.frame ? ' class="on"' : '') + ' aria-label="frame ' + (i + 1) + '"></button>').join('') + '<button type="button" id="px-fadd" aria-label="add frame">+</button></div>' +
      '<div class="row"><label style="flex:1;margin:0">fps <input id="px-fps" type="number" min="0" max="30" value="' + esc(c.holder.fps || 0) + '" style="width:80px;display:inline-block"></label><button type="button" id="px-onion"' + (P.onion ? ' class="on"' : '') + '>Onion</button><button type="button" id="px-play">Play</button><button type="button" id="px-fdup">Duplicate</button><button type="button" id="px-fdel" class="danger">Delete frame</button></div>';
  }
  function wireEditor() {
    const body = $('px-body'); const c = cur(); if (!c) return;
    if ($('px-anim')) $('px-anim').onchange = (e) => { stopPreview(); P.anim = e.target.value; P.frame = 0; P.undo = []; view(game, dirty); };
    body.querySelectorAll('#px-tools button[data-t]').forEach((b) => { b.onclick = () => { P.tool = b.dataset.t; body.querySelectorAll('#px-tools button[data-t]').forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('px-mirror').onclick = () => { P.mirror = !P.mirror; $('px-mirror').classList.toggle('on', P.mirror); };
    $('px-undo').onclick = () => { const u = P.undo.pop(); if (!u) return; const f = u.frames[u.i]; f.splice(0, f.length, ...u.rows); P.frame = u.i; dirty(); drawAll(); };   // in place: the editor keeps a reference to the frame
    body.querySelectorAll('#px-pal button').forEach((b) => { b.onclick = () => { P.col = +b.dataset.c; body.querySelectorAll('#px-pal button').forEach((x) => x.classList.toggle('on', x === b)); if (P.tool === 'erase') { P.tool = 'pen'; body.querySelectorAll('#px-tools button[data-t]').forEach((x) => x.classList.toggle('on', x.dataset.t === 'pen')); } }; });
    body.querySelectorAll('#px-frames button[data-f]').forEach((b) => { b.onclick = () => { stopPreview(); P.frame = +b.dataset.f; view(game, dirty); }; });
    $('px-fadd').onclick = () => { c.frames.push(blank(c.w, c.h)); P.frame = c.frames.length - 1; dirty(); view(game, dirty); };
    $('px-fdup').onclick = () => { c.frames.splice(P.frame + 1, 0, c.rows.slice()); P.frame++; dirty(); view(game, dirty); };
    $('px-fdel').onclick = () => { if (c.frames.length < 2) { c.frames[0] = blank(c.w, c.h); } else { c.frames.splice(P.frame, 1); P.frame = Math.max(0, P.frame - 1); } dirty(); view(game, dirty); };
    $('px-fps').oninput = (e) => { c.holder.fps = +e.target.value || 0; dirty(); };
    $('px-onion').onclick = () => { P.onion = !P.onion; $('px-onion').classList.toggle('on', P.onion); drawAll(); };
    $('px-play').onclick = () => { if (P.playing) stopPreview(); else startPreview(); };
    $('px-set').onclick = settings;
    const cv = $('px-cv'); const z = Math.max(4, Math.floor(Math.min(300, window.innerWidth - 120) / c.w)); cv.width = c.w * z; cv.height = c.h * z; cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px'; P.z = z;
    let down = false, lastK = '';
    const at = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / z), Math.floor((e.clientY - r.top) / z)]; };
    const apply = (x, y) => { const k = x + ',' + y; if (k === lastK) return; lastK = k; const col = P.tool === 'erase' ? '.' : CH[P.col];
      if (P.tool === 'pick') { const ch = getPx(c.rows, x, y); if (ch !== '.') { P.col = CH.indexOf(ch); body.querySelectorAll('#px-pal button').forEach((b) => b.classList.toggle('on', +b.dataset.c === P.col)); } return; }
      if (P.tool === 'fill') { fill(c.rows, x, y, col); } else { setPx(c.rows, x, y, col); if (P.mirror) setPx(c.rows, c.w - 1 - x, y, col); }
      dirty(); drawAll(); };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); down = true; lastK = ''; pushUndo(c); const [x, y] = at(e); lastPt = [x, y]; apply(x, y); e.preventDefault(); });
    let lastPt = null;
    const line = (x0, y0, x1, y1) => { const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, x = x0, y = y0; for (let k = 0; k < 4096; k++) { if (x >= 0 && y >= 0 && x < c.w && y < c.h) apply(x, y); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } } };
    cv.addEventListener('pointermove', (e) => { if (!down) return; const [x, y] = at(e); if (lastPt && P.tool !== 'fill') line(lastPt[0], lastPt[1], x, y); else if (x >= 0 && y >= 0 && x < c.w && y < c.h) apply(x, y); lastPt = [x, y]; });
    const up = () => { down = false; lastPt = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    drawAll();
  }
  function drawAll() {
    const c = cur(); if (!c) return; const cv = $('px-cv'); if (!cv) return; const g = cv.getContext('2d'); const z = P.z; g.clearRect(0, 0, cv.width, cv.height);
    if (P.onion && P.frame > 0) { const prev = c.frames[P.frame - 1]; g.globalAlpha = 0.3; paintRows(g, prev, z); g.globalAlpha = 1; }
    paintRows(g, c.rows, z);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; for (let x = 0; x <= c.w; x++) { g.beginPath(); g.moveTo(x * z + 0.5, 0); g.lineTo(x * z + 0.5, cv.height); g.stroke(); } for (let y = 0; y <= c.h; y++) { g.beginPath(); g.moveTo(0, y * z + 0.5); g.lineTo(cv.width, y * z + 0.5); g.stroke(); }
    if (P.kind === 'sprites') { const s = game.sprites[P.id]; g.fillStyle = '#f04ad8'; g.fillRect(s.anchor[0] * z + z / 2 - 2, s.anchor[1] * z + z / 2 - 2, 4, 4); }
    const pv = $('px-prev'); const pz = 3; pv.width = c.w * pz; pv.height = c.h * pz; pv.style.width = pv.width + 'px'; pv.style.height = pv.height + 'px'; const pg = pv.getContext('2d'); pg.imageSmoothingEnabled = false; pg.clearRect(0, 0, pv.width, pv.height); paintRows(pg, P.playing ? c.frames[P.pf % c.frames.length] : c.rows, pz);
    $('px-fi').textContent = 'frame ' + (P.frame + 1) + ' of ' + c.frames.length;
    const list = $('px-frames'); if (list) list.querySelectorAll('button[data-f]').forEach((b) => { b.innerHTML = ''; const t = document.createElement('canvas'); t.width = c.w; t.height = c.h; paintRows(t.getContext('2d'), c.frames[+b.dataset.f], 1); t.style.width = '32px'; t.style.height = Math.round(32 * c.h / c.w) + 'px'; t.style.imageRendering = 'pixelated'; t.setAttribute('aria-hidden', 'true'); b.appendChild(t); });
    const lb = document.querySelector('#px-list button.on'); if (lb) { lb.innerHTML = ''; const t = P.kind === 'tiles' ? ENGINE.tileCanvas(game, P.id, 0) : ENGINE.spriteCanvas(game, P.id, 'idle-down', 0, 'down'); t.setAttribute('aria-hidden', 'true'); lb.appendChild(t); }
  }
  function paintRows(g, rows, z) { for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) { const ch = rows[y][x]; if (ch === '.') continue; const col = game.palette[CH.indexOf(ch)]; if (!col) continue; g.fillStyle = col; g.fillRect(x * z, y * z, z, z); } }
  function startPreview() { const c = cur(); if (!c) return; P.playing = true; P.pf = 0; $('px-play').textContent = 'Stop'; const fps = Math.max(1, c.holder.fps || 6); let t0 = performance.now(); const tick = () => { if (!P.playing) return; const now = performance.now(); P.pf = Math.floor((now - t0) / 1000 * fps); drawAll(); previewTimer = requestAnimationFrame(tick); }; tick(); }
  function stopPreview() { P.playing = false; if (previewTimer) cancelAnimationFrame(previewTimer); previewTimer = null; const b = $('px-play'); if (b) b.textContent = 'Play'; }
  window.STUDIO_PX.frameIndex = () => P.playing ? P.pf : P.frame;
  function settings() {
    if (P.kind === 'tiles') { const t = game.tiles[P.id]; STUDIO_SHEET('Tile', [{ k: 'solid', l: 'Solid (cannot be walked on)', t: 'bool' }], t, (o) => { t.solid = !!o.solid; dirty(); }, '<button type="button" class="danger" id="sh-del">Delete tile</button>'); $('sh-del').onclick = () => { if (!confirm('Delete this tile? Maps that use it will show a placeholder.')) return; delete game.tiles[P.id]; P.id = null; dirty(); STUDIO.closeSheet(); view(game, dirty); }; return; }
    const s = game.sprites[P.id];
    STUDIO_SHEET('Sprite', [{ k: 'ax', l: 'Anchor x (the feet, in pixels)', t: 'num' }, { k: 'ay', l: 'Anchor y', t: 'num' }, { k: 'newanim', l: 'Add an animation named' }], { ax: s.anchor[0], ay: s.anchor[1], newanim: '' }, (o) => { s.anchor = [o.ax | 0, o.ay | 0]; const n = slug(o.newanim); if (n && !s.anims[n]) { s.anims[n] = { frames: [blank(s.w, s.h)], fps: 6 }; P.anim = n; P.frame = 0; } dirty(); view(game, dirty); }, '<button type="button" id="sh-ren">Rename</button><button type="button" class="danger" id="sh-del">Delete sprite</button>');
    $('sh-del').onclick = () => { if (!confirm('Delete this sprite?')) return; delete game.sprites[P.id]; P.id = null; dirty(); STUDIO.closeSheet(); view(game, dirty); };
    $('sh-ren').onclick = () => { const n = slug(prompt('New name', P.id) || ''); if (!n || game.sprites[n]) return; game.sprites[n] = s; delete game.sprites[P.id]; P.id = n; dirty(); STUDIO.closeSheet(); view(game, dirty); };
  }
  function viewPalette() {
    const body = $('px-body');
    body.innerHTML = '<div class="tiles" id="pal-list">' + game.palette.map((col, i) => '<button type="button" data-c="' + i + '" style="background:' + esc(col) + '" aria-label="colour ' + i + ' ' + esc(col) + '"></button>').join('') + (game.palette.length < 36 ? '<button type="button" id="pal-add" aria-label="add colour">+</button>' : '') + '</div><p class="muted">Up to 36 colours per game. Tap one to change it; every tile and sprite that uses it changes with it.</p>';
    body.querySelectorAll('#pal-list button[data-c]').forEach((b) => { b.onclick = () => { const i = +b.dataset.c; STUDIO_SHEET('Colour ' + i, [{ k: 'hex', l: 'Hex' }], { hex: game.palette[i] }, (o) => { if (/^#[0-9a-f]{6}$/i.test(o.hex)) { game.palette[i] = o.hex.toLowerCase(); dirty(); viewPalette(); } }, '<input type="color" id="pal-pick" value="' + esc(game.palette[i]) + '" style="width:48px;flex:0;padding:0;min-height:40px">'); $('pal-pick').oninput = (e) => { $('f-hex').value = e.target.value; }; }; });
    const add = $('pal-add'); if (add) add.onclick = () => { game.palette.push('#888888'); dirty(); viewPalette(); };
  }
  // the studio's sheet helper, shared
  function STUDIO_SHEET(title, fields, obj, onSave, extra) { return window.STUDIO.sheet(title, fields, obj, onSave, extra); }
  window.STUDIO_PIXELS = view;
})();
