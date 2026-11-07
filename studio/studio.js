// The studio: where the games on the shelf are made. One account (the owner) signs in; drafts live in this browser and in
// the cloud; the engine draws the maps and plays the drafts; publish hands a game to the repo through a server function.
(function () {
  'use strict';
  const OWNER = 'patrav0412@gmail.com';
  const SB_URL = 'https://xuawpknnmozcfzgnflel.supabase.co', SB_KEY = 'sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'game';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let sb = null, user = null, game = null, gameId = null, tab = 'road', saveTimer = null, cloudTimer = null;
  const S = { map: null, tool: 'tile', tile: 0, zoom: 2, px: 0, py: 0, undo: [], sel: null, playing: false };
  window.STUDIO = { get game() { return game; }, S: S };

  // ---------- storage ----------
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const listIds = () => LS.get('studio:list') || [];
  function markDirty() { $('s-save').textContent = 'Saving…'; if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(saveLocal, 400); }
  function saveLocal() {
    saveTimer = null; if (!game) return; game.updated = Date.now(); LS.set('studio:draft:' + gameId, game);
    const ids = listIds(); if (ids.indexOf(gameId) < 0) { ids.push(gameId); LS.set('studio:list', ids); }
    $('s-save').textContent = 'Saved here'; if (sb && user) { if (cloudTimer) clearTimeout(cloudTimer); cloudTimer = setTimeout(pushCloud, 2500); }
  }
  async function pushCloud() {
    cloudTimer = null; if (!sb || !user || !game) return; $('s-cloud').textContent = 'Cloud: sending…';
    try { const r = await sb.from('studio_games').upsert({ id: gameId, owner: user.id, body: game, updated_at: new Date(game.updated).toISOString() }); $('s-cloud').textContent = r.error ? 'Cloud: ' + r.error.message : 'Cloud: saved'; } catch (e) { $('s-cloud').textContent = 'Cloud: offline'; }
  }
  async function pullCloud(id) {
    if (!sb || !user) return null;
    try { const r = await sb.from('studio_games').select('body,updated_at').eq('id', id).maybeSingle(); if (r.error || !r.data) return null; return r.data.body; } catch (e) { return null; }
  }
  async function cloudList() { if (!sb || !user) return []; try { const r = await sb.from('studio_games').select('id,updated_at'); return r.error ? [] : r.data; } catch (e) { return []; } }

  // ---------- gate ----------
  async function boot() {
    if (window.supabase && !window.__supaFailed) { try { sb = window.supabase.createClient(SB_URL, SB_KEY); } catch (e) { sb = null; } }
    if (window.__studioTest) { user = { id: 'test', email: OWNER }; sb = null; enter(); return; }
    if (!sb) { $('g-msg').textContent = 'The sign-in library did not load. Check the connection and reload.'; }
    else { const s = await sb.auth.getSession(); if (s.data && s.data.session) { user = s.data.session.user; if (user.email !== OWNER) { await sb.auth.signOut(); user = null; $('g-msg').textContent = 'This studio is not yours.'; } else { enter(); return; } } }
    $('gate-form').onsubmit = async (e) => {
      e.preventDefault(); if (!sb) return; $('g-msg').textContent = 'Signing in…';
      const r = await sb.auth.signInWithPassword({ email: $('g-email').value.trim(), password: $('g-pw').value });
      if (r.error) { $('g-msg').textContent = r.error.message; return; }
      user = r.data.user; if (user.email !== OWNER) { await sb.auth.signOut(); user = null; $('g-msg').textContent = 'This studio is not yours.'; return; }
      enter();
    };
  }
  function enter() { $('gate').hidden = true; $('app').hidden = false; $('s-cloud').textContent = sb ? 'Cloud: on' : 'Cloud: off'; showList(); }
  $('b-out').onclick = async () => { if (sb) await sb.auth.signOut(); location.reload(); };

  // ---------- the list of games ----------
  async function showList() {
    stopPlay(); game = null; gameId = null; $('b-title').textContent = 'Games'; $('tabs').hidden = true; $('b-check').hidden = true; $('b-publish').hidden = true; $('b-back').onclick = () => { location.href = '../'; };
    const ids = listIds(); const cl = await cloudList(); cl.forEach((r) => { if (ids.indexOf(r.id) < 0) ids.push(r.id); });
    const v = $('view'); v.innerHTML = '<div class="card"><div class="row"><input id="n-name" placeholder="Name of the new game"><input id="n-tile" type="number" min="8" max="64" value="16" style="max-width:90px" aria-label="tile size"><button class="pri" id="n-go" type="button">New</button></div><p class="muted">A game is data: its maps, pixels, sounds, events and road, in one file. Nothing of it is built before its sentence and its last act exist.</p></div><div class="list" id="glist"></div><div class="card"><div class="row"><button id="imp" type="button">Import a game file</button><input id="imp-file" type="file" accept="application/json" hidden></div></div>';
    const gl = $('glist');
    if (!ids.length) gl.innerHTML = '<p class="muted">No games yet.</p>';
    ids.forEach((id) => { const d = LS.get('studio:draft:' + id); const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<b>' + esc(d ? d.name : id) + '</b> <span class="muted">' + esc(id) + (d && d.updated ? ' · ' + new Date(d.updated).toLocaleString() : ' · in the cloud') + '</span>'; b.onclick = () => openGame(id); gl.appendChild(b); });
    $('n-go').onclick = () => { const name = $('n-name').value.trim(); if (!name) return; const id = slug(name); if (listIds().indexOf(id) >= 0) { alert('A game with that id exists: ' + id); return; } newGame(id, name, +$('n-tile').value || 16); };
    $('imp').onclick = () => $('imp-file').click();
    $('imp-file').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const g = JSON.parse(rd.result); if (!g.maps) throw new Error('not a game'); g.id = slug(g.id || g.name || 'game'); game = g; gameId = g.id; saveLocal(); openGame(gameId); } catch (err) { alert('Could not read that file: ' + err.message); } }; rd.readAsText(f); };
  }
  function newGame(id, name, tile) {
    const t = tile || 16;
    game = { v: 1, id: id, name: name, year: new Date().getFullYear(), tile: t, view: 11, start: 'first', player: { sprite: 'hero', speed: 4 },
      palette: ['#1b1b24', '#3a5f3a', '#6aa84f', '#b8c48a', '#8a6a4a', '#d9b26f', '#ffffff', '#e04a4a', '#4a7fe0', '#2e2e3e', '#7a7a8a', '#f0d070'],
      tiles: { ground: { solid: false, frames: [], fps: 0 }, wall: { solid: true, frames: [], fps: 0 } }, sprites: {}, sounds: {}, tracks: {}, scripts: {},
      maps: { first: ENGINE.placeholder.map('first', 16, 12) }, road: { sentence: '', act: '', stations: [] }, updated: Date.now() };
    gameId = id; saveLocal(); openGame(id);
  }
  async function openGame(id) {
    let d = LS.get('studio:draft:' + id); const c = await pullCloud(id);
    if (c && (!d || (c.updated || 0) > (d.updated || 0))) { d = c; LS.set('studio:draft:' + id, d); }
    if (!d) { alert('That game could not be loaded.'); return; }
    game = d; gameId = id; S.map = game.start && game.maps[game.start] ? game.start : Object.keys(game.maps)[0]; S.undo = [];
    $('b-title').textContent = game.name; $('tabs').hidden = false; $('b-check').hidden = false; $('b-publish').hidden = false; $('b-back').onclick = showList;
    $('tabs').innerHTML = ['road', 'maps', 'pixels', 'sound', 'events', 'play', 'file'].map((t) => '<button type="button" data-t="' + t + '"' + (t === tab ? ' class="on"' : '') + '>' + t[0].toUpperCase() + t.slice(1) + '</button>').join('');
    $('tabs').querySelectorAll('button').forEach((b) => { b.onclick = () => showTab(b.dataset.t); });
    $('b-check').onclick = showCheck; $('b-publish').onclick = showPublish;
    showTab(tab);
  }
  function showTab(t) { stopPlay(); tab = t; $('tabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); closeSheet(); ({ road: viewRoad, maps: viewMaps, pixels: viewPixels, sound: viewSound, events: viewEvents, play: viewPlay, file: viewFile }[t] || viewRoad)(); }
  window.STUDIO.showTab = showTab; window.STUDIO.openGame = openGame;

  // ---------- the bottom sheet (a form from a field list) ----------
  function sheet(title, fields, obj, onSave, extra) {
    const sh = $('sheet'); sh.hidden = false;
    sh.innerHTML = '<div class="row"><b style="flex:1">' + esc(title) + '</b><button type="button" id="sh-x" style="flex:0">✕</button></div>' + fields.map((f) => {
      const v = obj[f.k]; const id = 'f-' + f.k;
      if (f.t === 'select') return '<label for="' + id + '">' + esc(f.l) + '</label><select id="' + id + '">' + f.opts.map((o) => '<option value="' + esc(o) + '"' + (o == v ? ' selected' : '') + '>' + esc(o === '' ? '(none)' : o) + '</option>').join('') + '</select>';
      if (f.t === 'bool') return '<label><input type="checkbox" id="' + id + '" style="width:auto;min-height:0;margin-right:8px"' + (v ? ' checked' : '') + '>' + esc(f.l) + '</label>';
      if (f.t === 'text') return '<label for="' + id + '">' + esc(f.l) + '</label><textarea id="' + id + '">' + esc(Array.isArray(v) ? v.join('\n') : v) + '</textarea>';
      return '<label for="' + id + '">' + esc(f.l) + '</label><input id="' + id + '" type="' + (f.t === 'num' ? 'number' : 'text') + '" value="' + esc(v) + '"' + (f.step ? ' step="' + f.step + '"' : '') + '>';
    }).join('') + '<div class="row" style="margin-top:12px"><button type="button" class="pri" id="sh-ok">Save</button>' + (extra || '') + '</div>';
    $('sh-x').onclick = closeSheet;
    $('sh-ok').onclick = () => { const out = {}; fields.forEach((f) => { const el = $('f-' + f.k); if (f.t === 'bool') out[f.k] = el.checked; else if (f.t === 'num') out[f.k] = el.value === '' ? undefined : +el.value; else if (f.t === 'text' && f.lines) out[f.k] = el.value.split('\n').map((s) => s.trim()).filter(Boolean); else out[f.k] = el.value; }); closeSheet(); onSave(out); };   // close first: a save may open the next sheet
    return sh;
  }
  function closeSheet() { $('sheet').hidden = true; $('sheet').innerHTML = ''; }
  window.STUDIO.closeSheet = closeSheet; window.STUDIO.sheet = sheet; window.STUDIO.markDirty = markDirty;

  // ---------- road ----------
  function viewRoad() {
    const r = game.road = game.road || { sentence: '', act: '', stations: [] };
    const v = $('view');
    v.innerHTML = '<div class="card"><label for="r-s">The sentence (a truth about people)</label><textarea id="r-s">' + esc(r.sentence) + '</textarea><label for="r-a">The last act (what the player does at the end, unasked)</label><textarea id="r-a">' + esc(r.act) + '</textarea></div>' +
      '<div class="card"><div class="row"><b style="flex:1">Stations</b><button type="button" id="r-add">Add</button></div><div id="r-list"></div><p class="muted">A station is one piece of the sentence: its meaning, its hint (the earlier, quieter encounter), and its act (what the player does). Maps hang off a station in the Maps tab. The road is a view here, not a gate.</p></div>';
    $('r-s').oninput = (e) => { r.sentence = e.target.value; markDirty(); }; $('r-a').oninput = (e) => { r.act = e.target.value; markDirty(); };
    const list = $('r-list');
    const draw = () => { list.innerHTML = r.stations.map((s, i) => '<div class="card"><div class="row"><b style="flex:1">' + esc(s.name || s.id) + '</b><button type="button" data-i="' + i + '" class="st-ed">Edit</button></div><div class="muted">Meaning: ' + esc(s.meaning) + '<br>Hint: ' + esc(s.hint) + '<br>Act: ' + esc(s.act) + '<br>Maps: ' + esc(Object.keys(game.maps).filter((m) => game.maps[m].station === s.id).join(', ') || 'none yet') + '</div></div>').join('') || '<p class="muted">No stations yet.</p>';
      list.querySelectorAll('.st-ed').forEach((b) => { b.onclick = () => editStation(+b.dataset.i); }); };
    const editStation = (i) => { const s = i >= 0 ? r.stations[i] : { id: '', name: '', meaning: '', hint: '', act: '' };
      sheet(i >= 0 ? 'Station' : 'New station', [{ k: 'name', l: 'Name' }, { k: 'meaning', l: 'Meaning (what it says inside the sentence)', t: 'text' }, { k: 'hint', l: 'Hint (where it is first glimpsed, earlier and quieter)', t: 'text' }, { k: 'act', l: 'Act (what the player does that carries it)', t: 'text' }], s,
        (o) => { o.id = s.id || slug(o.name); if (i >= 0) Object.assign(s, o); else r.stations.push(o); markDirty(); draw(); }, i >= 0 ? '<button type="button" class="danger" id="sh-del">Remove</button>' : '');
      if (i >= 0) $('sh-del').onclick = () => { r.stations.splice(i, 1); markDirty(); closeSheet(); draw(); }; };
    $('r-add').onclick = () => editStation(-1); draw();
  }

  // ---------- maps ----------
  const TOOLS = [['tile', 'Tile'], ['person', 'Person'], ['prop', 'Prop'], ['exit', 'Exit'], ['trigger', 'Trigger'], ['spawn', 'Spawn'], ['pick', 'Pick']];
  function viewMaps() {
    const v = $('view'); const ids = Object.keys(game.maps); if (!game.maps[S.map]) S.map = ids[0];
    v.innerHTML = '<div class="row"><select id="m-sel" aria-label="map">' + ids.map((id) => '<option value="' + esc(id) + '"' + (id === S.map ? ' selected' : '') + '>' + esc(game.maps[id].name || id) + '</option>').join('') + '</select><button type="button" id="m-new" style="flex:0">New map</button><button type="button" id="m-edit" style="flex:0">Settings</button></div>' +
      '<div class="tools" id="m-tools">' + TOOLS.map((t) => '<button type="button" data-t="' + t[0] + '"' + (t[0] === S.tool ? ' class="on"' : '') + '>' + t[1] + '</button>').join('') + '<button type="button" id="m-undo">Undo</button><button type="button" id="m-fit">Fit</button></div>' +
      '<div class="tiles" id="m-tiles"></div>' +
      '<div id="mapwrap"><canvas id="mapcv"></canvas><canvas id="mapov"></canvas></div>' +
      '<p class="muted" id="m-hint">One finger paints or places; two fingers pan and zoom. Tap a placed thing with Pick to edit it. Grey letters are tiles with no art yet.</p>' +
      '<div class="card"><label for="m-intent">Intent of this place (your words: what it is for, what happens)</label><textarea id="m-intent">' + esc(game.maps[S.map].intent) + '</textarea></div>';
    $('m-sel').onchange = (e) => { S.map = e.target.value; S.undo = []; viewMaps(); };
    $('m-new').onclick = () => sheet('New map', [{ k: 'name', l: 'Name' }, { k: 'w', l: 'Width in tiles', t: 'num' }, { k: 'h', l: 'Height in tiles', t: 'num' }], { name: '', w: 16, h: 12 }, (o) => { const id = slug(o.name); if (game.maps[id]) { alert('A map with that id exists'); return; } game.maps[id] = ENGINE.placeholder.map(id, Math.max(4, o.w | 0), Math.max(4, o.h | 0)); game.maps[id].name = o.name; game.maps[id].tileset = Object.keys(game.tiles).slice(0, 2); if (!game.tiles[game.maps[id].tileset[1]]) game.maps[id].tileset = [Object.keys(game.tiles)[0] || 'ground']; S.map = id; markDirty(); viewMaps(); });
    $('m-edit').onclick = () => { const m = game.maps[S.map]; sheet('Map settings', [{ k: 'name', l: 'Name' }, { k: 'w', l: 'Width in tiles', t: 'num' }, { k: 'h', l: 'Height in tiles', t: 'num' }, { k: 'station', l: 'Station', t: 'select', opts: [''].concat((game.road.stations || []).map((s) => s.id)) }, { k: 'music', l: 'Music', t: 'select', opts: [''].concat(Object.keys(game.tracks || {})) }, { k: 'start', l: 'The game starts here', t: 'bool' }], Object.assign({ start: game.start === S.map }, m),
      (o) => { pushUndo(); m.name = o.name; m.station = o.station; m.music = o.music; if (o.start) game.start = S.map; resizeMap(m, Math.max(4, o.w | 0), Math.max(4, o.h | 0)); markDirty(); viewMaps(); }, '<button type="button" class="danger" id="sh-del">Delete map</button>');
      $('sh-del').onclick = () => { if (Object.keys(game.maps).length < 2) { alert('A game needs one map.'); return; } if (!confirm('Delete this map?')) return; delete game.maps[S.map]; S.map = Object.keys(game.maps)[0]; if (!game.maps[game.start]) game.start = S.map; markDirty(); closeSheet(); viewMaps(); }; };
    $('m-tools').querySelectorAll('button[data-t]').forEach((b) => { b.onclick = () => { S.tool = b.dataset.t; $('m-tools').querySelectorAll('button[data-t]').forEach((x) => x.classList.toggle('on', x === b)); drawTiles(); }; });
    $('m-undo').onclick = () => { if (!S.undo.length) return; game.maps[S.map] = S.undo.pop(); markDirty(); renderMap(); };
    $('m-fit').onclick = () => { fitMap(); };
    $('m-intent').oninput = (e) => { game.maps[S.map].intent = e.target.value; markDirty(); };
    drawTiles(); installMapInput(); fitMap();
  }
  function resizeMap(m, w, h) { const g = []; for (let y = 0; y < h; y++) { const row = (m.ground[y] || '').slice(0, w); g.push(row + '0'.repeat(Math.max(0, w - row.length))); } m.ground = g; m.w = w; m.h = h; }
  function pushUndo() { S.undo.push(clone(game.maps[S.map])); if (S.undo.length > 40) S.undo.shift(); }
  function drawTiles() {
    const el = $('m-tiles'); if (!el) return; el.innerHTML = ''; const m = game.maps[S.map];
    if (S.tool === 'tile') {
      m.tileset.forEach((id, i) => { const b = document.createElement('button'); b.type = 'button'; b.title = id; b.setAttribute('aria-label', id); if (i === S.tile) b.className = 'on'; const c = ENGINE.tileCanvas(game, id, 0); c.setAttribute('aria-hidden', 'true'); b.appendChild(c); b.onclick = () => { S.tile = i; drawTiles(); }; el.appendChild(b); });
      const add = document.createElement('button'); add.type = 'button'; add.textContent = '+'; add.setAttribute('aria-label', 'add a tile to this map'); add.onclick = () => { const all = Object.keys(game.tiles).filter((t) => m.tileset.indexOf(t) < 0); sheet('Add a tile to this map', [{ k: 'id', l: 'Tile', t: 'select', opts: all.concat(['(new)']) }, { k: 'nid', l: 'Name of the new tile' }, { k: 'solid', l: 'Solid', t: 'bool' }], { id: all[0] || '(new)', nid: '', solid: false }, (o) => { let id = o.id; if (id === '(new)' || !id) { id = slug(o.nid); if (!id || id === 'game') return; if (!game.tiles[id]) game.tiles[id] = { solid: !!o.solid, frames: [], fps: 0 }; } if (m.tileset.length >= 36) { alert('A map can use 36 tiles.'); return; } m.tileset.push(id); S.tile = m.tileset.length - 1; markDirty(); drawTiles(); }); }; el.appendChild(add);
    } else if (S.tool === 'person' || S.tool === 'prop') {
      const p = document.createElement('span'); p.className = 'muted'; p.textContent = S.tool === 'person' ? 'Tap a tile to place a person.' : 'Tap a tile to place a prop (a sprite, solid or not).'; el.appendChild(p);
    } else if (S.tool === 'exit' || S.tool === 'trigger') { const p = document.createElement('span'); p.className = 'muted'; p.textContent = 'Tap a tile to place one cell of it; edit it with Pick to change its size and target.'; el.appendChild(p); }
    else if (S.tool === 'spawn') { const p = document.createElement('span'); p.className = 'muted'; p.textContent = 'Tap where the player starts on this map.'; el.appendChild(p); }
    else { const p = document.createElement('span'); p.className = 'muted'; p.textContent = 'Tap a person, prop, exit or trigger to edit it.'; el.appendChild(p); }
  }
  function fitMap() { const wrap = $('mapwrap'); if (!wrap) return; const m = game.maps[S.map], t = game.tile; const r = wrap.getBoundingClientRect(); S.zoom = Math.max(0.5, Math.min(4, Math.floor(Math.min(r.width / (m.w * t), r.height / (m.h * t)) * 4) / 4)); S.px = Math.max(0, (r.width - m.w * t * S.zoom) / 2); S.py = Math.max(0, (r.height - m.h * t * S.zoom) / 2); renderMap(); }
  function renderMap() {
    const cv = $('mapcv'), ov = $('mapov'); if (!cv) return; const m = game.maps[S.map], t = game.tile;
    ENGINE.renderMap(game, S.map, cv); ov.width = m.w * t; ov.height = m.h * t;
    const g = ov.getContext('2d'); g.clearRect(0, 0, ov.width, ov.height); g.lineWidth = 1; g.font = Math.max(6, Math.floor(t * 0.45)) + 'px monospace'; g.textBaseline = 'top';
    const box = (x, y, w, h, col, label) => { g.strokeStyle = col; g.fillStyle = col.replace(')', ',0.22)').replace('rgb', 'rgba'); g.fillRect(x * t + 0.5, y * t + 0.5, w * t - 1, h * t - 1); g.strokeRect(x * t + 0.5, y * t + 0.5, w * t - 1, h * t - 1); if (label) { g.fillStyle = '#fff'; g.fillText(label, x * t + 2, y * t + 2); } };
    (m.exits || []).forEach((e, i) => box(e.x, e.y, e.w || 1, e.h || 1, 'rgb(91,184,178)', 'E' + i));
    (m.triggers || []).forEach((tr, i) => box(tr.x, tr.y, tr.w || 1, tr.h || 1, 'rgb(240,74,216)', 'T' + i));
    (m.people || []).forEach((n) => box(n.x, n.y, 1, 1, 'rgb(240,192,80)', ''));
    (m.props || []).forEach((p) => box(p.x, p.y, 1, 1, 'rgb(160,160,200)', ''));
    if (m.spawn) { g.strokeStyle = '#fff'; g.beginPath(); g.arc(m.spawn[0] * t, m.spawn[1] * t, t * 0.35, 0, Math.PI * 2); g.stroke(); }
    const tf = 'translate(' + S.px + 'px,' + S.py + 'px) scale(' + S.zoom + ')'; cv.style.transform = tf; ov.style.transform = tf;
  }
  window.STUDIO.renderMap = renderMap;
  function installMapInput() {
    const wrap = $('mapwrap'); const pts = new Map(); let painting = false, last = null, pinch = null;
    const toTile = (e) => { const r = wrap.getBoundingClientRect(); const x = (e.clientX - r.left - S.px) / S.zoom / game.tile, y = (e.clientY - r.top - S.py) / S.zoom / game.tile; return [Math.floor(x), Math.floor(y)]; };
    wrap.addEventListener('pointerdown', (e) => { wrap.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { painting = false; const a = Array.from(pts.values()); pinch = { d: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), mx: (a[0][0] + a[1][0]) / 2, my: (a[0][1] + a[1][1]) / 2, zoom: S.zoom, px: S.px, py: S.py }; return; }
      if (pts.size === 1) { const [x, y] = toTile(e); if (S.tool === 'tile') { pushUndo(); painting = true; last = null; paint(x, y); } else tapTool(x, y); } });
    wrap.addEventListener('pointermove', (e) => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) { const a = Array.from(pts.values()); const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), mx = (a[0][0] + a[1][0]) / 2, my = (a[0][1] + a[1][1]) / 2; const z = Math.max(0.5, Math.min(6, pinch.zoom * d / Math.max(1, pinch.d))); const r = wrap.getBoundingClientRect(); const ox = pinch.mx - r.left, oy = pinch.my - r.top; S.px = ox - (ox - pinch.px) * (z / pinch.zoom) + (mx - pinch.mx); S.py = oy - (oy - pinch.py) * (z / pinch.zoom) + (my - pinch.my); S.zoom = z; renderMap(); return; }
      if (painting && pts.size === 1) { const [x, y] = toTile(e); if (!last || last[0] !== x || last[1] !== y) paint(x, y); } });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) painting = false; };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); const z = Math.max(0.5, Math.min(6, S.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); S.zoom = z; renderMap(); }, { passive: false });
    function paint(x, y) { const m = game.maps[S.map]; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return; last = [x, y]; const row = m.ground[y]; const c = '0123456789abcdefghijklmnopqrstuvwxyz'[S.tile]; if (row[x] === c) return; m.ground[y] = row.slice(0, x) + c + row.slice(x + 1); markDirty(); renderMap(); }
  }
  window.STUDIO.paint = (x, y) => { const m = game.maps[S.map]; pushUndo(); const c = '0123456789abcdefghijklmnopqrstuvwxyz'[S.tile]; m.ground[y] = m.ground[y].slice(0, x) + c + m.ground[y].slice(x + 1); markDirty(); renderMap(); };
  function tapTool(x, y) {
    const m = game.maps[S.map]; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return;
    const at = (list) => (list || []).findIndex((o) => x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1));
    if (S.tool === 'spawn') { pushUndo(); m.spawn = [x + 0.5, y + 0.5]; markDirty(); renderMap(); return; }
    if (S.tool === 'pick') { let i; if ((i = at(m.people)) >= 0) return editPerson(i); if ((i = at(m.props)) >= 0) return editProp(i); if ((i = at(m.exits)) >= 0) return editExit(i); if ((i = at(m.triggers)) >= 0) return editTrigger(i); return; }
    pushUndo();
    if (S.tool === 'person') { m.people = m.people || []; m.people.push({ id: 'person' + (m.people.length + 1), name: '', x: x, y: y, sprite: '', facing: 'down', lines: [], script: '', when: '' }); markDirty(); renderMap(); editPerson(m.people.length - 1); }
    else if (S.tool === 'prop') { m.props = m.props || []; m.props.push({ id: 'prop' + (m.props.length + 1), sprite: '', x: x, y: y, solid: true }); markDirty(); renderMap(); editProp(m.props.length - 1); }
    else if (S.tool === 'exit') { m.exits = m.exits || []; const other = Object.keys(game.maps).find((k) => k !== S.map) || S.map; m.exits.push({ x: x, y: y, w: 1, h: 1, to: other, tx: Math.floor(game.maps[other].spawn[0]), ty: Math.floor(game.maps[other].spawn[1]), facing: 'down' }); markDirty(); renderMap(); editExit(m.exits.length - 1); }
    else if (S.tool === 'trigger') { m.triggers = m.triggers || []; m.triggers.push({ x: x, y: y, w: 1, h: 1, script: Object.keys(game.scripts)[0] || '', once: false, each: 0, when: '' }); markDirty(); renderMap(); editTrigger(m.triggers.length - 1); }
  }
  const dirs = ['down', 'up', 'left', 'right'];
  function editPerson(i) { const m = game.maps[S.map], n = m.people[i];
    sheet('Person', [{ k: 'id', l: 'Id (used by events)' }, { k: 'name', l: 'Name shown' }, { k: 'sprite', l: 'Sprite', t: 'select', opts: [''].concat(Object.keys(game.sprites)) }, { k: 'facing', l: 'Facing', t: 'select', opts: dirs }, { k: 'lines', l: 'Lines, one per line (said when talked to)', t: 'text', lines: true }, { k: 'script', l: 'Script instead of lines', t: 'select', opts: [''].concat(Object.keys(game.scripts)) }, { k: 'when', l: 'Only while (a condition on flags, e.g. met == true)' }, { k: 'x', l: 'x', t: 'num' }, { k: 'y', l: 'y', t: 'num' }], n, (o) => { Object.assign(n, o); markDirty(); renderMap(); }, '<button type="button" class="danger" id="sh-del">Remove</button>');
    $('sh-del').onclick = () => { m.people.splice(i, 1); markDirty(); closeSheet(); renderMap(); }; }
  function editProp(i) { const m = game.maps[S.map], p = m.props[i];
    sheet('Prop', [{ k: 'id', l: 'Id (used by show/hide)' }, { k: 'sprite', l: 'Sprite', t: 'select', opts: [''].concat(Object.keys(game.sprites)) }, { k: 'solid', l: 'Solid', t: 'bool' }, { k: 'x', l: 'x', t: 'num' }, { k: 'y', l: 'y', t: 'num' }], p, (o) => { Object.assign(p, o); markDirty(); renderMap(); }, '<button type="button" class="danger" id="sh-del">Remove</button>');
    $('sh-del').onclick = () => { m.props.splice(i, 1); markDirty(); closeSheet(); renderMap(); }; }
  function editExit(i) { const m = game.maps[S.map], e = m.exits[i];
    sheet('Exit', [{ k: 'to', l: 'Leads to', t: 'select', opts: Object.keys(game.maps) }, { k: 'tx', l: 'Arrive at x', t: 'num' }, { k: 'ty', l: 'Arrive at y', t: 'num' }, { k: 'facing', l: 'Arrive facing', t: 'select', opts: dirs }, { k: 'x', l: 'x', t: 'num' }, { k: 'y', l: 'y', t: 'num' }, { k: 'w', l: 'Width', t: 'num' }, { k: 'h', l: 'Height', t: 'num' }], e, (o) => { Object.assign(e, o); markDirty(); renderMap(); }, '<button type="button" class="danger" id="sh-del">Remove</button>');
    $('sh-del').onclick = () => { m.exits.splice(i, 1); markDirty(); closeSheet(); renderMap(); }; }
  function editTrigger(i) { const m = game.maps[S.map], tr = m.triggers[i];
    sheet('Trigger', [{ k: 'script', l: 'Runs the script', t: 'select', opts: [''].concat(Object.keys(game.scripts)) }, { k: 'once', l: 'Only once (remembered in the save)', t: 'bool' }, { k: 'each', l: 'While the player stays, every … seconds (0 = on entering)', t: 'num', step: '0.1' }, { k: 'when', l: 'Only while (a condition on flags)' }, { k: 'x', l: 'x', t: 'num' }, { k: 'y', l: 'y', t: 'num' }, { k: 'w', l: 'Width', t: 'num' }, { k: 'h', l: 'Height', t: 'num' }], tr, (o) => { Object.assign(tr, o); markDirty(); renderMap(); }, '<button type="button" class="danger" id="sh-del">Remove</button>');
    $('sh-del').onclick = () => { m.triggers.splice(i, 1); markDirty(); closeSheet(); renderMap(); }; }

  // ---------- walkability: every exit, person and trigger reachable from the spawn ----------
  function walkable(g, mid) {
    const m = g.maps[mid]; if (!m || !m.spawn) return ['no spawn']; const solid = (x, y) => { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true; const row = m.ground[y]; const td = g.tiles[m.tileset['0123456789abcdefghijklmnopqrstuvwxyz'.indexOf(row[x] || '')]]; if (td && td.solid) return true; if ((m.props || []).some((p) => p.solid && p.x === x && p.y === y)) return true; return false; };
    const seen = new Set(); const q = [[Math.floor(m.spawn[0]), Math.floor(m.spawn[1])]]; seen.add(q[0].join(','));
    while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || solid(nx, ny)) return; seen.add(k); q.push([nx, ny]); }); }
    const out = []; const near = (x, y) => seen.has(x + ',' + y) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)));
    (m.exits || []).forEach((e, i) => { let ok = false; for (let yy = e.y; yy < e.y + (e.h || 1); yy++) for (let xx = e.x; xx < e.x + (e.w || 1); xx++) if (seen.has(xx + ',' + yy)) ok = true; if (!ok) out.push('exit ' + i + ' (to ' + e.to + ') cannot be reached from the spawn'); });
    (m.people || []).forEach((n) => { if (!near(n.x, n.y)) out.push('person ' + (n.name || n.id) + ' cannot be reached'); });
    (m.triggers || []).forEach((tr, i) => { let ok = false; for (let yy = tr.y; yy < tr.y + (tr.h || 1); yy++) for (let xx = tr.x; xx < tr.x + (tr.w || 1); xx++) if (seen.has(xx + ',' + yy)) ok = true; if (!ok) out.push('trigger ' + i + ' cannot be reached'); });
    return out;
  }
  window.STUDIO.walkable = walkable;
  function allIssues() { const out = ENGINE.check(game).map((i) => i.where + ': ' + i.msg); Object.keys(game.maps).forEach((id) => walkable(game, id).forEach((w) => out.push('map ' + id + ': ' + w))); if (!game.road.sentence) out.push('road: the sentence is not written'); if (!game.road.act) out.push('road: the last act is not written'); return out; }
  window.STUDIO.allIssues = allIssues;
  function showCheck() { const is = allIssues(); const sh = $('sheet'); sh.hidden = false; sh.innerHTML = '<div class="row"><b style="flex:1">Check</b><button type="button" id="sh-x">✕</button></div>' + (is.length ? '<ul class="issues">' + is.map((i) => '<li class="issue">' + esc(i) + '</li>').join('') + '</ul>' : '<p>Nothing to report: every reference resolves, every exit, person and trigger can be reached, no line tells.</p>'); $('sh-x').onclick = closeSheet; }

  // ---------- stubs filled by the other studio files ----------
  function viewPixels() { if (window.STUDIO_PIXELS) return window.STUDIO_PIXELS(game, markDirty); $('view').innerHTML = '<p class="muted">The pixel editor comes with the next milestone.</p>'; }
  function viewSound() { if (window.STUDIO_SOUND) return window.STUDIO_SOUND(game, markDirty); $('view').innerHTML = '<p class="muted">The sound editor comes with a later milestone.</p>'; }
  function viewEvents() { if (window.STUDIO_EVENTS) return window.STUDIO_EVENTS(game, markDirty); $('view').innerHTML = '<p class="muted">The event cards come with a later milestone.</p>'; }

  // ---------- play ----------
  function viewPlay() {
    const v = $('view'); v.innerHTML = '<div class="row"><select id="p-map" aria-label="start on map">' + Object.keys(game.maps).map((id) => '<option value="' + esc(id) + '"' + (id === S.map ? ' selected' : '') + '>' + esc(game.maps[id].name || id) + '</option>').join('') + '</select><button type="button" class="pri" id="p-go" style="flex:0">Play</button><button type="button" id="p-reset" style="flex:0">Forget save</button></div><div id="stage"></div><p class="muted">Drag on the left to walk, tap on the right to act. The play save is kept apart from the published game\'s saves.</p>';
    const KEY = 'studio:play:' + gameId;
    $('p-go').onclick = () => { stopPlay(); const g = clone(game); g.start = $('p-map').value; S.playing = true; ENGINE.load(g, { container: $('stage'), save: { get: () => LS.get(KEY), set: (s) => LS.set(KEY, s) } }); ENGINE.start(); };
    $('p-reset').onclick = () => { LS.del(KEY); stopPlay(); $('stage').innerHTML = ''; };
  }
  function stopPlay() { if (S.playing) { try { ENGINE.stop(); } catch (e) {} S.playing = false; } }

  // ---------- file: export, import, publish ----------
  function viewFile() {
    const v = $('view'); v.innerHTML = '<div class="card"><label for="f-name">Name</label><input id="f-name" value="' + esc(game.name) + '"><label for="f-year">Year</label><input id="f-year" type="number" value="' + esc(game.year) + '"><label for="f-view">Tiles across the shorter side of the screen</label><input id="f-view" type="number" min="6" max="24" value="' + esc(game.view || 11) + '"><p class="muted">Tile size: ' + esc(game.tile) + ' px (set when the game was made). Id: ' + esc(gameId) + '</p></div><div class="card"><div class="row"><button type="button" id="f-dl">Download game.json</button><button type="button" class="danger" id="f-del">Delete this draft</button></div></div>';
    $('f-name').oninput = (e) => { game.name = e.target.value; $('b-title').textContent = game.name; markDirty(); }; $('f-year').oninput = (e) => { game.year = +e.target.value; markDirty(); }; $('f-view').oninput = (e) => { game.view = +e.target.value || 11; markDirty(); };
    $('f-dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(game)], { type: 'application/json' })); a.download = gameId + '.game.json'; a.click(); };
    $('f-del').onclick = async () => { if (!confirm('Delete this draft here and in the cloud?')) return; LS.del('studio:draft:' + gameId); LS.set('studio:list', listIds().filter((x) => x !== gameId)); if (sb && user) { try { await sb.from('studio_games').delete().eq('id', gameId); } catch (e) {} } showList(); };
  }
  async function callPublish(mode) {
    if (!sb || !user) return { error: 'Sign in to publish.' };
    try { const s = await sb.auth.getSession(); const tok = s.data && s.data.session ? s.data.session.access_token : null; if (!tok) return { error: 'No session.' };
      const r = await fetch(SB_URL + '/functions/v1/publish', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok, 'apikey': SB_KEY }, body: JSON.stringify({ mode: mode, game: mode === 'publish' ? game : null }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) return { error: j.error || ('HTTP ' + r.status) }; return j; } catch (e) { return { error: e.message }; }
  }
  function showPublish() {
    const is = allIssues(); const sh = $('sheet'); sh.hidden = false;
    sh.innerHTML = '<div class="row"><b style="flex:1">Publish to the shelf</b><button type="button" id="sh-x">✕</button></div><p class="muted">Publishing writes games/' + esc(gameId) + '/game.json and the shelf list to the repository; the site rebuilds in a minute. A game is finished when it is shown.</p>' + (is.length ? '<p class="issue">The check reports ' + is.length + ' thing' + (is.length > 1 ? 's' : '') + ' (see Check). You can still publish.</p>' : '') + '<div class="row"><button type="button" id="pb-check">Check GitHub</button><button type="button" class="pri" id="pb-go">Publish</button></div><p id="pb-msg" class="muted" aria-live="polite"></p>';
    $('sh-x').onclick = closeSheet;
    $('pb-check').onclick = async () => { $('pb-msg').textContent = 'Checking…'; const r = await callPublish('check'); $('pb-msg').textContent = r.error ? 'Not ready: ' + r.error : ('Ready: ' + (r.repo || '') + (r.branch ? ' on ' + r.branch : '')); };
    $('pb-go').onclick = async () => { $('pb-msg').textContent = 'Publishing…'; const r = await callPublish('publish'); $('pb-msg').innerHTML = r.error ? 'Failed: ' + esc(r.error) : ('Published. Commit: <a href="' + esc(r.url || '#') + '" style="color:var(--acc)">' + esc((r.sha || '').slice(0, 7)) + '</a>. The shelf updates when the deploy finishes.'); };
  }
  boot();
})();
