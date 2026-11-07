// The sound editor: tracks as a step grid per channel (notes placed with a finger), sounds as short note lists,
// both played by the engine's synth. Data: docs/engine-format.md (tracks and sounds).
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const WAVES = ['square', 'triangle', 'sawtooth', 'sine', 'noise'];
  const D = { kind: 'tracks', id: null, ch: 0, tool: 'note', oct: 3, playing: null, rows: 24 };
  let game = null, dirty = null;
  window.STUDIO_SND = D;
  const tokens = (c) => String(c.notes || '').trim().split(/\s+/).filter(Boolean);
  const noteName = (i) => NAMES[i % 12] + Math.floor(i / 12);        // i = semitones from C0
  const noteIndex = (n) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(n); if (!m) return -1; const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return base + (+m[3]) * 12; };
  function view(g, mark) {
    game = g; dirty = mark; game.tracks = game.tracks || {}; game.sounds = game.sounds || {};
    const v = $('view');
    v.innerHTML = '<div class="tools" id="sd-kind"><button type="button" data-k="tracks">Music</button><button type="button" data-k="sounds">Sounds</button></div><div id="sd-body"></div>';
    v.querySelectorAll('#sd-kind button').forEach((b) => { b.classList.toggle('on', b.dataset.k === D.kind); b.onclick = () => { stop(); D.kind = b.dataset.k; D.id = null; view(game, dirty); }; });
    if (D.kind === 'tracks') viewTracks(); else viewSounds();
  }
  function stop() { if (D.playing) { ENGINE.audio.play(null); D.playing = null; const b = $('sd-play'); if (b) b.textContent = 'Play'; } }
  // ---------- tracks ----------
  function viewTracks() {
    const ids = Object.keys(game.tracks); if (!D.id || !game.tracks[D.id]) D.id = ids[0] || null; const body = $('sd-body');
    body.innerHTML = '<div class="row"><select id="sd-sel" aria-label="track">' + ids.map((id) => '<option' + (id === D.id ? ' selected' : '') + '>' + esc(id) + '</option>').join('') + '</select><button type="button" id="sd-new" style="flex:0">New</button></div>' + (D.id ? trackHtml() : '<p class="muted">No music yet. New makes a placeholder tune to start from, or an empty one.</p>');
    $('sd-sel').onchange = (e) => { stop(); D.id = e.target.value; D.ch = 0; viewTracks(); };
    $('sd-new').onclick = () => STUDIO.sheet('New track', [{ k: 'name', l: 'Name' }, { k: 'start', l: 'Start from a placeholder tune', t: 'bool' }, { k: 'bpm', l: 'Tempo (beats per minute)', t: 'num' }], { name: '', start: true, bpm: 100 }, (o) => { const id = slug(o.name); if (!id || game.tracks[id]) return; game.tracks[id] = o.start ? ENGINE.placeholder.track(id.length * 977 + 13) : { bpm: 100, stepsPerBeat: 2, channels: [{ wave: 'square', vol: 0.2, notes: Array(32).fill('.').join(' ') }] }; game.tracks[id].bpm = o.bpm || 100; game.tracks[id].stepsPerBeat = game.tracks[id].stepsPerBeat || 2; D.id = id; D.ch = 0; dirty(); viewTracks(); });
    if (D.id) wireTrack();
  }
  function trackHtml() {
    const t = game.tracks[D.id]; const ch = t.channels[D.ch] || t.channels[0]; D.ch = t.channels.indexOf(ch);
    return '<div class="row"><label style="flex:1;margin:0">bpm <input id="sd-bpm" type="number" min="40" max="240" value="' + esc(t.bpm) + '" style="width:80px;display:inline-block"></label><label style="flex:1;margin:0">steps per beat <select id="sd-spb" style="width:70px;display:inline-block"><option' + (t.stepsPerBeat == 1 ? ' selected' : '') + '>1</option><option' + (t.stepsPerBeat == 2 ? ' selected' : '') + '>2</option><option' + (t.stepsPerBeat == 4 ? ' selected' : '') + '>4</option></select></label><button type="button" id="sd-play" class="pri" style="flex:0">Play</button><button type="button" id="sd-del" class="danger" style="flex:0">Delete</button></div>' +
      '<div class="tools" id="sd-chs">' + t.channels.map((c, i) => '<button type="button" data-i="' + i + '"' + (i === D.ch ? ' class="on"' : '') + '>' + esc(c.wave) + ' ' + (i + 1) + '</button>').join('') + '<button type="button" id="sd-chadd">+ channel</button></div>' +
      '<div class="row"><label style="flex:1;margin:0">wave <select id="sd-wave">' + WAVES.map((w) => '<option' + (w === ch.wave ? ' selected' : '') + '>' + w + '</option>').join('') + '</select></label><label style="flex:1;margin:0">volume <input id="sd-vol" type="range" min="0" max="0.5" step="0.02" value="' + esc(ch.vol === undefined ? 0.2 : ch.vol) + '"></label><label style="flex:1;margin:0">steps <select id="sd-len"><option' + (tokens(ch).length === 16 ? ' selected' : '') + '>16</option><option' + (tokens(ch).length === 32 ? ' selected' : '') + '>32</option><option' + (tokens(ch).length === 64 ? ' selected' : '') + '>64</option></select></label><button type="button" id="sd-chdel" class="danger" style="flex:0">Remove</button></div>' +
      '<div class="tools"><button type="button" data-t="note"' + (D.tool === 'note' ? ' class="on"' : '') + '>Note</button><button type="button" data-t="hold"' + (D.tool === 'hold' ? ' class="on"' : '') + '>Hold</button><button type="button" data-t="rest"' + (D.tool === 'rest' ? ' class="on"' : '') + '>Rest</button><button type="button" id="sd-octdn">Octave −</button><button type="button" id="sd-octup">Octave +</button></div>' +
      '<div style="overflow:auto"><canvas id="sd-grid" style="touch-action:none;image-rendering:pixelated;border:1px solid var(--line)"></canvas></div><p class="muted">Rows are notes (' + noteName(D.oct * 12) + ' at the bottom), columns are steps. Note places, Hold stretches the note before it, Rest clears. A noise channel hits on any row.</p>';
  }
  function wireTrack() {
    const t = game.tracks[D.id], ch = t.channels[D.ch];
    $('sd-bpm').oninput = (e) => { t.bpm = +e.target.value || 100; dirty(); restart(); }; $('sd-spb').onchange = (e) => { t.stepsPerBeat = +e.target.value; dirty(); restart(); };
    $('sd-play').onclick = () => { if (D.playing) { stop(); return; } ENGINE.audio.unlock(); ENGINE.audio.preview(t); D.playing = D.id; $('sd-play').textContent = 'Stop'; };
    $('sd-del').onclick = () => { if (!confirm('Delete this track?')) return; stop(); delete game.tracks[D.id]; D.id = null; dirty(); viewTracks(); };
    document.querySelectorAll('#sd-chs button[data-i]').forEach((b) => { b.onclick = () => { D.ch = +b.dataset.i; viewTracks(); }; });
    $('sd-chadd').onclick = () => { t.channels.push({ wave: 'triangle', vol: 0.2, notes: Array(tokens(ch).length || 32).fill('.').join(' ') }); D.ch = t.channels.length - 1; dirty(); viewTracks(); };
    $('sd-chdel').onclick = () => { if (t.channels.length < 2) return; t.channels.splice(D.ch, 1); D.ch = 0; dirty(); viewTracks(); };
    $('sd-wave').onchange = (e) => { ch.wave = e.target.value; dirty(); restart(); viewTracks(); }; $('sd-vol').oninput = (e) => { ch.vol = +e.target.value; dirty(); restart(); };
    $('sd-len').onchange = (e) => { const n = +e.target.value; const tk = tokens(ch); while (tk.length < n) tk.push('.'); ch.notes = tk.slice(0, n).join(' '); dirty(); restart(); drawGrid(); };
    document.querySelectorAll('#sd-body .tools button[data-t]').forEach((b) => { b.onclick = () => { D.tool = b.dataset.t; document.querySelectorAll('#sd-body .tools button[data-t]').forEach((x) => x.classList.toggle('on', x === b)); }; });
    $('sd-octdn').onclick = () => { D.oct = Math.max(0, D.oct - 1); drawGrid(); }; $('sd-octup').onclick = () => { D.oct = Math.min(7, D.oct + 1); drawGrid(); };
    const cv = $('sd-grid'); const CW = 14, RH = 12; cv.width = tokens(ch).length * CW + 30; cv.height = D.rows * RH; cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
    const cell = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left - 30) / CW), D.rows - 1 - Math.floor((e.clientY - r.top) / RH)]; };
    let down = false, lastK = '';
    const apply = (step, row) => { const tk = tokens(ch); if (step < 0 || step >= tk.length || row < 0 || row >= D.rows) return; const k = step + ',' + row; if (k === lastK) return; lastK = k;
      if (D.tool === 'rest') tk[step] = '.'; else if (D.tool === 'hold') tk[step] = '-'; else { const name = noteName(D.oct * 12 + row); tk[step] = (ch.wave === 'noise' ? 'C4' : name) === tk[step] ? '.' : (ch.wave === 'noise' ? 'C4' : name); }
      ch.notes = tk.join(' '); dirty(); restart(); drawGrid(); };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); down = true; lastK = ''; const [s, r] = cell(e); apply(s, r); e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => { if (!down || D.tool === 'note') return; const [s, r] = cell(e); apply(s, r); });
    const up = () => { down = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    drawGrid(); tickPlayhead();
    function drawGrid() {
      const g = cv.getContext('2d'); const tk = tokens(ch); g.fillStyle = '#0f0e14'; g.fillRect(0, 0, cv.width, cv.height);
      for (let r = 0; r < D.rows; r++) { const y = (D.rows - 1 - r) * RH; const semi = (D.oct * 12 + r) % 12; g.fillStyle = [1, 3, 6, 8, 10].indexOf(semi) >= 0 ? '#16151d' : '#1c1b25'; g.fillRect(30, y, cv.width - 30, RH); g.fillStyle = '#8a86a0'; g.font = '9px monospace'; g.fillText(noteName(D.oct * 12 + r), 2, y + 9); }
      for (let s = 0; s < tk.length; s++) { if (s % (t.stepsPerBeat || 2) === 0) { g.fillStyle = s % ((t.stepsPerBeat || 2) * 4) === 0 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)'; g.fillRect(30 + s * CW, 0, 1, cv.height); } }
      let lastRow = -1;
      for (let s = 0; s < tk.length; s++) { const tok = tk[s]; if (tok === '.') { lastRow = -1; continue; } if (tok === '-') { if (lastRow >= 0) { g.fillStyle = '#3e8e8a'; g.fillRect(30 + s * CW, (D.rows - 1 - lastRow) * RH + 3, CW, RH - 6); } continue; } const ni = ch.wave === 'noise' ? D.oct * 12 : noteIndex(tok); const row = ni - D.oct * 12; lastRow = row; if (row < 0 || row >= D.rows) { g.fillStyle = '#f0c050'; g.fillRect(30 + s * CW + 2, row < 0 ? cv.height - 3 : 0, CW - 4, 3); continue; } g.fillStyle = '#5bb8b2'; g.fillRect(30 + s * CW + 1, (D.rows - 1 - row) * RH + 1, CW - 2, RH - 2); }
      if (D.playing === D.id) { const st = ENGINE.audio.step % tk.length; g.fillStyle = 'rgba(240,74,216,.35)'; g.fillRect(30 + st * CW, 0, CW, cv.height); }
    }
    function tickPlayhead() { if (!document.getElementById('sd-grid')) return; if (D.playing === D.id) drawGrid(); requestAnimationFrame(tickPlayhead); }
    function restart() { if (D.playing === D.id) ENGINE.audio.preview(t); }
    window.STUDIO_SND.drawGrid = drawGrid;
  }
  // ---------- sounds ----------
  const PRESETS = { tap: { wave: 'square', notes: [[880, 0.05], [1320, 0.08]] }, blip: { wave: 'square', notes: [[660, 0.06]] }, bump: { wave: 'triangle', notes: [[160, 0.08], [110, 0.12]] }, rise: { wave: 'square', notes: [[330, 0.06], [440, 0.06], [550, 0.06], [660, 0.1]] }, fall: { wave: 'triangle', notes: [[660, 0.06], [550, 0.06], [440, 0.06], [330, 0.12]] }, hit: { wave: 'noise', notes: [[0, 0.08]] } };
  function viewSounds() {
    const ids = Object.keys(game.sounds); if (!D.id || !game.sounds[D.id]) D.id = ids[0] || null; const body = $('sd-body');
    body.innerHTML = '<div class="row"><select id="sd-sel" aria-label="sound">' + ids.map((id) => '<option' + (id === D.id ? ' selected' : '') + '>' + esc(id) + '</option>').join('') + '</select><button type="button" id="sd-new" style="flex:0">New</button></div>' + (D.id ? soundHtml() : '<p class="muted">No sounds yet. New starts from a preset.</p>');
    $('sd-sel').onchange = (e) => { D.id = e.target.value; viewSounds(); };
    $('sd-new').onclick = () => STUDIO.sheet('New sound', [{ k: 'name', l: 'Name' }, { k: 'preset', l: 'Start from', t: 'select', opts: Object.keys(PRESETS) }], { name: '', preset: 'tap' }, (o) => { const id = slug(o.name); if (!id || game.sounds[id]) return; game.sounds[id] = JSON.parse(JSON.stringify(PRESETS[o.preset] || PRESETS.tap)); D.id = id; dirty(); viewSounds(); });
    if (D.id) wireSound();
  }
  function soundHtml() {
    const s = game.sounds[D.id];
    return '<div class="row"><label style="flex:1;margin:0">wave <select id="sn-wave">' + WAVES.map((w) => '<option' + (w === s.wave ? ' selected' : '') + '>' + w + '</option>').join('') + '</select></label><label style="flex:1;margin:0">volume <input id="sn-vol" type="range" min="0" max="0.6" step="0.02" value="' + esc(s.vol === undefined ? 0.25 : s.vol) + '"></label><button type="button" id="sn-play" class="pri" style="flex:0">Play</button><button type="button" id="sn-del" class="danger" style="flex:0">Delete</button></div>' +
      '<div id="sn-notes">' + (s.notes || []).map((n, i) => '<div class="row"><label style="flex:1;margin:0">hz <input type="number" data-i="' + i + '" data-k="0" value="' + esc(n[0]) + '" min="0" max="8000"></label><label style="flex:1;margin:0">seconds <input type="number" data-i="' + i + '" data-k="1" value="' + esc(n[1]) + '" min="0.02" max="2" step="0.01"></label><button type="button" data-del="' + i + '" style="flex:0">✕</button></div>').join('') + '</div><button type="button" id="sn-add">+ note</button>';
  }
  function wireSound() {
    const s = game.sounds[D.id];
    $('sn-wave').onchange = (e) => { s.wave = e.target.value; dirty(); }; $('sn-vol').oninput = (e) => { s.vol = +e.target.value; dirty(); };
    $('sn-play').onclick = () => { ENGINE.audio.unlock(); ENGINE.audio.previewSound(s); };
    $('sn-del').onclick = () => { if (!confirm('Delete this sound?')) return; delete game.sounds[D.id]; D.id = null; dirty(); viewSounds(); };
    document.querySelectorAll('#sn-notes input').forEach((inp) => { inp.oninput = () => { s.notes[+inp.dataset.i][+inp.dataset.k] = +inp.value; dirty(); }; });
    document.querySelectorAll('#sn-notes button[data-del]').forEach((b) => { b.onclick = () => { s.notes.splice(+b.dataset.del, 1); dirty(); viewSounds(); }; });
    $('sn-add').onclick = () => { s.notes.push([440, 0.08]); dirty(); viewSounds(); };
  }
  window.STUDIO_SOUND = view;
})();
