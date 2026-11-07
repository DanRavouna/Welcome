// The event editor: scripts as lists of step cards with fixed fields and no syntax (docs/engine-format.md, "Step cards").
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  const E = { id: null };
  let game = null, dirty = null;
  window.STUDIO_EV = E;
  const TYPES = {
    say: { l: 'Say', sum: (s) => (s.who ? s.who + ': ' : '') + '“' + (s.text || '') + '”' },
    choice: { l: 'Choice', sum: (s) => '“' + (s.prompt || '') + '” → ' + (s.options || []).map((o) => o.text + ' (step ' + (o.to + 1) + ')').join(' / ') },
    set: { l: 'Set flag', sum: (s) => s.flag + ' = ' + JSON.stringify(s.value) },
    add: { l: 'Add to flag', sum: (s) => s.flag + ' + ' + (s.n === undefined ? 1 : s.n) },
    if: { l: 'If', sum: (s) => 'if ' + (typeof s.when === 'string' ? s.when : JSON.stringify(s.when)) + ' → step ' + (+s.then + 1) + (s.else !== undefined && s.else !== '' ? ', else step ' + (+s.else + 1) : '') },
    jump: { l: 'Jump', sum: (s) => '→ step ' + (+s.to + 1) },
    teleport: { l: 'Teleport', sum: (s) => 'to ' + s.map + ' at ' + s.x + ',' + s.y + (s.facing ? ' facing ' + s.facing : '') },
    move: { l: 'Move person', sum: (s) => s.who + ' walks to ' + s.x + ',' + s.y },
    face: { l: 'Face', sum: (s) => s.who + ' faces ' + s.dir },
    wait: { l: 'Wait', sum: (s) => s.s + ' s' },
    show: { l: 'Show', sum: (s) => s.id }, hide: { l: 'Hide', sum: (s) => s.id },
    tile: { l: 'Set tile', sum: (s) => s.map + ' ' + s.x + ',' + s.y + ' = ' + s.tile },
    music: { l: 'Music', sum: (s) => s.track || 'stop' }, sound: { l: 'Sound', sum: (s) => s.id },
    end: { l: 'End', sum: () => '' }
  };
  const dirs = ['down', 'up', 'left', 'right'];
  const people = () => { const out = ['player']; Object.keys(game.maps).forEach((m) => (game.maps[m].people || []).forEach((n) => { if (n.id && out.indexOf(n.id) < 0) out.push(n.id); })); return out; };
  const things = () => { const out = []; Object.keys(game.maps).forEach((m) => { (game.maps[m].people || []).forEach((n) => { if (n.id) out.push(n.id); }); (game.maps[m].props || []).forEach((p) => { if (p.id) out.push(p.id); }); }); return out; };
  const stepOpts = (steps) => steps.map((s, i) => String(i + 1));   // shown one-based, stored zero-based
  const parseVal = (s) => { if (s === 'true') return true; if (s === 'false') return false; if (s !== '' && !isNaN(+s)) return +s; return s; };
  function fields(t, steps) {
    switch (t) {
      case 'say': return [{ k: 'who', l: 'Who (a name, or empty for no one)' }, { k: 'text', l: 'Text', t: 'text' }];
      case 'choice': return [{ k: 'who', l: 'Who' }, { k: 'prompt', l: 'Prompt', t: 'text' }].concat([0, 1, 2, 3].flatMap((i) => [{ k: 'o' + i, l: 'Option ' + (i + 1) + ' text' }, { k: 'o' + i + 'to', l: 'Option ' + (i + 1) + ' goes to step (number)', t: 'num' }]));
      case 'set': return [{ k: 'flag', l: 'Flag' }, { k: 'value', l: 'Value (true, false, a number or a word)' }];
      case 'add': return [{ k: 'flag', l: 'Flag' }, { k: 'n', l: 'Add', t: 'num' }];
      case 'if': return [{ k: 'when', l: 'When (e.g. stayed >= 4, or met == true)' }, { k: 'then', l: 'Then go to step (number)', t: 'num' }, { k: 'else', l: 'Else go to step (empty: the next one)', t: 'num' }];
      case 'jump': return [{ k: 'to', l: 'Go to step (number)', t: 'num' }];
      case 'teleport': return [{ k: 'map', l: 'Map', t: 'select', opts: Object.keys(game.maps) }, { k: 'x', l: 'x', t: 'num' }, { k: 'y', l: 'y', t: 'num' }, { k: 'facing', l: 'Facing', t: 'select', opts: [''].concat(dirs) }];
      case 'move': return [{ k: 'who', l: 'Who', t: 'select', opts: people() }, { k: 'x', l: 'to x', t: 'num' }, { k: 'y', l: 'to y', t: 'num' }, { k: 'speed', l: 'Tiles per second', t: 'num' }];
      case 'face': return [{ k: 'who', l: 'Who', t: 'select', opts: people() }, { k: 'dir', l: 'Direction', t: 'select', opts: dirs }];
      case 'wait': return [{ k: 's', l: 'Seconds', t: 'num', step: '0.1' }];
      case 'show': case 'hide': return [{ k: 'id', l: 'Person or prop', t: 'select', opts: things() }];
      case 'tile': return [{ k: 'map', l: 'Map', t: 'select', opts: Object.keys(game.maps) }, { k: 'x', l: 'x', t: 'num' }, { k: 'y', l: 'y', t: 'num' }, { k: 'tile', l: 'Tile', t: 'select', opts: Object.keys(game.tiles) }];
      case 'music': return [{ k: 'track', l: 'Track (none stops the music)', t: 'select', opts: [''].concat(Object.keys(game.tracks || {})) }];
      case 'sound': return [{ k: 'id', l: 'Sound', t: 'select', opts: Object.keys(game.sounds || {}) }];
      default: return [];
    }
  }
  const toForm = (s) => { const o = Object.assign({}, s); ['then', 'else', 'to'].forEach((k) => { o[k] = o[k] === undefined || o[k] === '' ? '' : String(+o[k] + 1); }); if (s.t === 'choice') (s.options || []).forEach((op, i) => { o['o' + i] = op.text; o['o' + i + 'to'] = op.to === undefined || op.to === '' ? '' : String(+op.to + 1); }); if (s.t === 'set') o.value = s.value === undefined ? 'true' : String(s.value); if (s.t === 'if' && typeof s.when !== 'string') o.when = JSON.stringify(s.when || ''); return o; };
  const fromForm = (t, o) => { const s = { t: t }; Object.keys(o).forEach((k) => { if (!/^o\d/.test(k)) s[k] = o[k]; }); ['then', 'else', 'to'].forEach((k) => { if (s[k] === '' || s[k] === undefined) { if (k === 'else') delete s[k]; else if (k === 'to') s[k] = 0; else delete s[k]; } else s[k] = +s[k] - 1; }); if (t === 'choice') { s.options = []; for (let i = 0; i < 4; i++) if (o['o' + i]) s.options.push({ text: o['o' + i], to: (o['o' + i + 'to'] === '' || o['o' + i + 'to'] === undefined) ? undefined : +o['o' + i + 'to'] - 1 }); } if (t === 'set') s.value = parseVal(String(o.value)); if (t === 'if' && typeof s.when === 'string' && /^\s*\{/.test(s.when)) { try { s.when = JSON.parse(s.when); } catch (e) {} } return s; };
  function view(g, mark) {
    game = g; dirty = mark; game.scripts = game.scripts || {};
    const ids = Object.keys(game.scripts); if (!E.id || !game.scripts[E.id]) E.id = ids[0] || null; const v = $('view');
    v.innerHTML = '<div class="row"><select id="ev-sel" aria-label="script">' + ids.map((id) => '<option' + (id === E.id ? ' selected' : '') + '>' + esc(id) + '</option>').join('') + '</select><button type="button" id="ev-new" style="flex:0">New</button>' + (E.id ? '<button type="button" id="ev-del" class="danger" style="flex:0">Delete</button>' : '') + '</div><div id="ev-steps"></div>' + (E.id ? '<button type="button" id="ev-add" class="pri">+ step</button>' : '<p class="muted">A script is a list of step cards. A person runs one when talked to; a trigger runs one when the player enters its cells. Make one with New.</p>');
    $('ev-sel').onchange = (e) => { E.id = e.target.value; view(game, dirty); };
    $('ev-new').onclick = () => STUDIO.sheet('New script', [{ k: 'name', l: 'Name (used by people and triggers)' }], { name: '' }, (o) => { const id = slug(o.name); if (!id || game.scripts[id]) return; game.scripts[id] = { steps: [] }; E.id = id; dirty(); view(game, dirty); });
    if (!E.id) return;
    $('ev-del').onclick = () => { if (!confirm('Delete this script?')) return; delete game.scripts[E.id]; E.id = null; dirty(); view(game, dirty); };
    $('ev-add').onclick = () => STUDIO.sheet('Add a step', [{ k: 't', l: 'Kind', t: 'select', opts: Object.keys(TYPES) }], { t: 'say' }, (o) => { const steps = game.scripts[E.id].steps; const s = { t: o.t }; if (o.t === 'end') { steps.push(s); dirty(); view(game, dirty); return; } editStep(steps.length, s, true); });
    drawSteps();
  }
  function drawSteps() {
    const steps = game.scripts[E.id].steps; const el = $('ev-steps');
    el.innerHTML = steps.map((s, i) => '<div class="card"><div class="row"><b style="flex:0 0 auto">' + (i + 1) + '. ' + esc((TYPES[s.t] || { l: s.t }).l) + '</b><span class="muted" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + esc((TYPES[s.t] || { sum: () => '' }).sum(s)) + '</span></div><div class="row" style="margin-top:6px"><button type="button" data-ed="' + i + '">Edit</button><button type="button" data-up="' + i + '" aria-label="move up">↑</button><button type="button" data-dn="' + i + '" aria-label="move down">↓</button><button type="button" data-rm="' + i + '" class="danger" aria-label="remove">✕</button></div></div>').join('') || '<p class="muted">No steps yet.</p>';
    el.querySelectorAll('button[data-ed]').forEach((b) => { b.onclick = () => editStep(+b.dataset.ed, steps[+b.dataset.ed], false); });
    el.querySelectorAll('button[data-up]').forEach((b) => { b.onclick = () => { const i = +b.dataset.up; if (i === 0) return; [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]]; dirty(); drawSteps(); }; });
    el.querySelectorAll('button[data-dn]').forEach((b) => { b.onclick = () => { const i = +b.dataset.dn; if (i >= steps.length - 1) return; [steps[i + 1], steps[i]] = [steps[i], steps[i + 1]]; dirty(); drawSteps(); }; });
    el.querySelectorAll('button[data-rm]').forEach((b) => { b.onclick = () => { steps.splice(+b.dataset.rm, 1); dirty(); drawSteps(); }; });
  }
  function editStep(i, s, isNew) {
    const steps = game.scripts[E.id].steps; const f = fields(s.t, isNew ? steps.concat([s]) : steps);
    STUDIO.sheet((isNew ? 'New step: ' : 'Step ' + (i + 1) + ': ') + TYPES[s.t].l, f, toForm(s), (o) => { const ns = fromForm(s.t, o); if (isNew) steps.push(ns); else steps[i] = ns; dirty(); drawSteps(); });
  }
  window.STUDIO_EVENTS = view;
})();
