const APP = (() => {
  const $ = (id) => document.getElementById(id);
  let game, renderScreen, open = false, queued = false, lastOpener = null, toastTimer = null;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; paint(); }); }
  let lastLevel = null;
  function paint() {
    if (!game || !game.state) return;
    const st = game.state, lv = game.levelInfo(st.xp || 0), en = game.energy();
    lastLevel = lv.level;   // (gates open by fires kept, not by level: nothing is announced here)
    $('c-rolls').textContent = (game.props.testMode ? 'Test' : String(en.left));   // the day's lamp: the flame and what is left, no '/20'
    { const oil = $('c-oil'); if (oil) { const h = game.props.testMode ? 12 : Math.max(1, Math.round(12 * en.left / 20)); oil.setAttribute('height', h); oil.setAttribute('y', 14 - h); } }   // the day's lamp: its flame goes down as the day is spent
    $('c-rolls').setAttribute('aria-label', game.props.testMode ? 'Test mode: unlimited rolls' : (en.left === 0 ? 'The day\u2019s lamp is spent' : 'The day\u2019s lamp: ' + en.left + ' left'));
    $('c-ess').textContent = st.essence || 0; $('c-ess').setAttribute('aria-label', (st.essence || 0) + ' essence');
    $('c-lv').textContent = 'Lv ' + lv.level;
    const ready = (game.questsFor(st).items || []).filter((q) => !q.claimed && q.progress >= game.questDefs()[q.key].target).length;
    $('b-menu-dot').hidden = ready === 0;
    checkHints();
    if (open) renderScreen();
  }
  function showScreen() {
    open = true; $('screen').hidden = false; $('hud').hidden = true; WORLD.setPaused(true);
    renderScreen();
    const cb = document.getElementById('close-screen'); if (cb) cb.focus();
  }
  let outNotice = 0;
  function encounter(info) {
    if (open || dlg || menuOpen || mapOpen || panel || !$('bk').hidden || !$('cf').hidden || !$('starter').hidden || !$('title').hidden) return;
    if (game.sightingsLeft() <= 0 && game.energy().left === 0) { if (Date.now() - outNotice > 20000) { outNotice = Date.now(); hintQueue.length = 0; hintBusy = true; toast('The grass rustles. The day\u2019s light is spent.'); setTimeout(() => { hintBusy = false; pumpHints(); }, 4600); } return; }
    const calm = game.state.settings && game.state.settings.calm;
    WORLD.setPaused(true); if (!calm) WORLD.flash(); game.sfx('tap');
    lastOpener = document.activeElement;
    if ((game.state.lure || 0) > 0) {
      const seen = game.state.seen || []; let pick = null;
      for (let i = 0; i < 400 && pick === null; i++) { const sd = game.pickSeed(info.types, !!info.rare); if (seen.indexOf(game.make(sd, 1).speciesNo) === -1) pick = sd; }
      if (pick !== null) { info = Object.assign({}, info, { seed: pick }); setTimeout(() => toast('The Tide Lure worked: a species you have not kept yet!'), 900); }
      else setTimeout(() => toast('The Tide Lure stays set: you have kept every species of this area. Try another zone or route.'), 900);
    }
    if ((game.state.charm || 0) > 0 && !info.rare) { info = Object.assign({}, info, { rare: true }); game.update({ charm: game.state.charm - 1 }); }
    const night = timeOfDay() === 'night' && game.state.settings && game.state.settings.daynight !== false;
    if (night && !Number.isInteger(info.seed) && Math.random() < 0.25 && info.types.indexOf('Dusk') === -1) info = Object.assign({}, info, { types: ['Dusk'] });
    else info = WEATHER.tilt(info, weatherAt(WORLD.map.id)); // weather: 20% chance of its type when the area lacks it
    setTimeout(() => {
      if (game.encounter(info)) { game.questTick('see', WORLD.map.id); showScreen(); } else WORLD.setPaused(false); }, calm ? 0 : 280);
  }
  function openScreen(tab) {
    lastOpener = document.activeElement;
    game.setState({ tab: tab, selected: null, armed: false, reveal: 0, encounter: null });
    open = true; $('screen').hidden = false; $('hud').hidden = true; WORLD.setPaused(true);
    renderScreen();
    const cb = document.getElementById('close-screen'); if (cb) cb.focus();
  }
  let menuOpen = false;
  function menuTiles() {
    const st = game.state, v = game.renderVals(), lv = game.levelInfo(st.xp || 0);
    const qs = game.questsFor(st), defs = game.questDefs();
    const ready = qs.items.filter((q) => !q.claimed && q.progress >= defs[q.key].target).length;
    const done = qs.items.filter((q) => q.progress >= defs[q.key].target).length;
    const I = {
      dex: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', species: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
      trainer: 'M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9-4.3-4.1 5.9-.8z', quests: 'M5 21V4M5 4h11l-2 4 2 4H5',
      badges: 'M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 21h8M9 17h6', settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
      lock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3'
    };
    return [
      { id: 'dex', label: 'Dex', sub: st.caught.length + ' critters kept', icon: I.dex, wide: true },
      { id: 'species', label: 'Species', sub: (st.seen || []).length + '/48', icon: I.species },
      { id: 'trainer', label: 'Trainer', sub: 'Level ' + lv.level, icon: I.trainer },
      { id: 'quests', label: 'Quests', sub: done + '/3 today', icon: I.quests, badge: ready ? ready + ' ready' : '' },
      ...(st.dev ? [{ id: 'dev', label: 'Dev tools', sub: 'Skip gates, teleport', icon: 'M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16' }] : []),
      { id: 'journal', label: 'Journal', sub: advOf().clues.length + '/' + ADV.CLUES.length + ' clues', icon: 'M6 3h10a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2zM6 19a2 2 0 0 1 2-2h10M10 8h5M10 12h5' },
      { id: 'badges', label: 'Badges', sub: v.badgeCount + '/9', icon: I.badges },
      { id: 'settings', label: 'Settings', sub: 'Sound, motion', icon: I.settings },
      { id: 'map', label: 'Map', sub: 'Travel anywhere open', icon: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14' },
      { id: 'backup', label: 'Save', sub: 'Online, backup', icon: 'M12 3v12M7 10l5 5 5-5M5 21h14' },
      { id: 'seals', label: 'Fires', sub: ((st.npc && st.npc.seals) || []).length + '/4 kept', icon: 'M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z' },
      { id: 'bag', label: 'Bag', sub: (Object.values(bagOf()).reduce((x, y) => x + y, 0)) + ' items', icon: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2' },
      { id: 'party', label: 'Party', sub: game.partySeeds().length + '/3 critters', icon: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 3-5 6-5s4 1 4 3' }
    ];
  }
  function renderMenu() {
    const st = game.state, lv = game.levelInfo(st.xp || 0);
    $('m-title').textContent = game.titleName(); $('m-lv').textContent = lv.level; $('m-xp').style.width = Math.round(lv.into / lv.need * 100) + '%';
    $('m-sound').setAttribute('aria-pressed', st.settings && st.settings.sound ? 'true' : 'false');
    $('m-sound-off').setAttribute('display', st.settings && st.settings.sound ? 'none' : 'inline');
    const tiles = menuTiles(), byId = {}; tiles.forEach((t) => { byId[t.id] = t; });
    const GROUPS = [['critters', 'My critters', ['dex', 'species', 'party', 'bag'], 'M12 3l3 6 6 1-4.5 4.5 1 6.5L12 17l-5.5 3 1-6.5L3 10l6-1z'], ['journey', 'Journey', ['map', 'quests', 'journal', 'trainer', 'badges', 'seals'], 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14'], ['game', 'Game', ['settings', 'backup', 'dev'], 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z']];
    const open = menuGroupsOpen();
    const tileHtml = (t) => '<button class="tile' + (t.wide ? ' wide' : '') + (t.locked ? ' locked' : '') + '" data-tile="' + t.id + '"' + (t.locked ? ' aria-disabled="true"' : '') + '>' +
      '<span class="ti"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + t.icon + '"></path></svg></span>' +
      '<span class="tl">' + t.label + '</span><span class="ts">' + t.sub + '</span>' + (t.badge ? '<span class="tb">' + t.badge + '</span>' : '') + '</button>';
    $('m-grid').innerHTML = GROUPS.map(([gid, label, ids, icon]) => {
      const ts = ids.map((i) => byId[i]).filter(Boolean), isOpen = open.indexOf(gid) !== -1, ready = ts.reduce((n, x) => n + (x.badge ? 1 : 0), 0);
      return '<section class="mgroup' + (isOpen ? ' open' : '') + '"><button class="mhead" data-group="' + gid + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="mg-' + gid + '">' +
        '<span class="mhi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + icon + '"></path></svg></span>' +
        '<span class="mht"><b>' + label + '</b><span>' + ts.map((x) => x.label).join(' · ') + '</span></span>' + (ready && !isOpen ? '<span class="tb mhb">' + ts.filter((x) => x.badge).map((x) => x.badge).join(', ') + '</span>' : '') +
        '<svg class="mchev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></button>' +
        '<div class="mbody" id="mg-' + gid + '"' + (isOpen ? '' : ' hidden') + '>' + ts.map(tileHtml).join('') + '</div></section>';
    }).join('');
  }
  // which menu sections are open (a UI preference, kept in this browser only; the first section starts open)
  function menuGroupsOpen() { try { const v = JSON.parse(localStorage.getItem('critter-roll:menu') || 'null'); if (Array.isArray(v)) return v; } catch (e) {} return ['critters']; }
  function toggleMenuGroup(gid) { const o = menuGroupsOpen(), i = o.indexOf(gid); if (i === -1) o.push(gid); else o.splice(i, 1); try { localStorage.setItem('critter-roll:menu', JSON.stringify(o)); } catch (e) {} renderMenu(); const h = document.querySelector('[data-group="' + gid + '"]'); if (h) h.focus(); }
  function openMenu() {
    lastOpener = document.activeElement; menuOpen = true; renderMenu(); cloudStatus();
    try { const fr = PXW.frames().down[0], g = $('m-ava').getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 16, 10); g.drawImage(fr, 0, 0, 16, 10, 0, 0, 16, 10); } catch (e) {}
    $('menu').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); $('m-close').focus();
  }
  function closeMenu(keepPaused) {
    menuOpen = false; $('menu').hidden = true;
    if (!keepPaused) { $('hud').hidden = false; WORLD.setPaused(false); if (lastOpener && lastOpener.focus) lastOpener.focus(); }
  }
  function scrollToHeading(text) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = Array.from(document.querySelectorAll('#screen span, #screen h2')).find((n) => n.textContent.trim() === text);
      if (el) el.scrollIntoView({ block: 'start' });
    }));
  }
  function tile(id) {
    if (id === 'map') { openMap(); return; }
    if (id === 'backup') { openBackup(); return; }
    if (id === 'journal') { closeMenu(); journal(); return; }
    if (id === 'dev') { closeMenu(true); openDev(); return; }
    if (id === 'bag' || id === 'party') { openPanel(id); return; }
    closeMenu(true);
    if (id === 'dex') openScreen('dex');
    else if (id === 'species') { openScreen('dex'); game.setState({ dexView: 'species' }); }
    else { openScreen('badges'); scrollToHeading({ quests: 'Daily quests', badges: 'Badges', settings: 'Settings', seals: 'The four fires' }[id] || 'Trainer'); }
  }
  function plank(name) {
    $('loc-name').textContent = name;
    const p = $('plank'); p.classList.remove('drop'); void p.offsetWidth;
    if (!(game && game.state.settings && game.state.settings.calm)) p.classList.add('drop');
  }
  // ---------- time of day ----------
  function timeOfDay(d) { if (typeof window.__tod === 'string') return window.__tod; /* test hook */ const h = (d || new Date()).getHours(); return h >= 21 || h < 5 ? 'night' : (h < 7 ? 'dawn' : (h >= 18 ? 'dusk' : 'day')); }
  // ---------- weather ----------
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function weatherAt(id) { // kind for a map, or null indoors / when the setting is off; window.__weather is a test override
    if (game && game.state.settings && game.state.settings.weather === false) return null;
    if (!WEATHER.region(id)) return null;
    return typeof window.__weather === 'string' ? window.__weather : WEATHER.at(id);
  }
  function stillMotion() { return !!((game && game.state.settings && game.state.settings.calm) || (reduceMQ && reduceMQ.matches)); }
  function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label : ''; }   // the weather is its name; what it brings out is met, not read (02-F25)
  // accessibility: Settings "Larger text" and "High contrast" become classes on <html> (CSS in shell.html)
  function applyA11y() { const s = (game && game.state.settings) || {}, h = document.documentElement; h.classList.toggle('bigtext', s.bigtext === true); h.classList.toggle('hc', s.contrast === true); }
  let wxShown = null;
  function renderWeather() {
    if (!game) return;
    const id = WORLD.map.id, k = weatherAt(id), sig = id + ':' + k, el = $('loc-wx');
    if (!el || sig === wxShown) return; wxShown = sig;
    const show = k && k !== 'clear';
    el.innerHTML = show ? WEATHER.icon(k) : '';
    $('plank').classList.toggle('hasWx', !!show);
    if (show) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Weather: ' + WEATHER.KINDS[k].label); el.title = weatherText(k); }
    else { el.removeAttribute('role'); el.removeAttribute('aria-label'); el.removeAttribute('title'); }
    // the weather is read from the Map (Menu > Map), never announced
  }
  // ---------- world map: one painted overview, with fast travel built in (tap a place, then Travel) ----------
  let mapOpen = false, mapSel = null;
  const ZTYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
  const ZONE_TYPES = { frost: ['Frost', 'Stone'], ember: ['Ember', 'Volt'], moss: ['Moss', 'Bloom'], tide: ['Tide', 'Dusk'] };
  const CITY = { mossbrook: ['Mossbrook', 'past Moss Forest, to the west', 'Wren’s Garden'], frosthold: ['Frosthold', 'past Frost Peaks, to the north', 'Glacia’s Pool'], cinderport: ['Cinderport', 'past Ember Fields, to the south', 'Blaze’s Hearth'], coralbay: ['Coralbay', 'past Tide Shore, to the east', 'Coral’s Lamp Hall'], peak: ["Vigil Peak", 'north of the plaza', 'The Long Watch'], ascent: ['The Cold Ascent', 'through the north gate of Frosthold', 'A climb into the peaks'], descent: ['The Cinder Descent', 'through the south gate of Cinderport', 'A descent to a buried forge'] };
  // what the card under the map says about a place, and whether you can fast travel there
  function placeCard(id) {
    const st = game.state, lv = game.levelInfo(st.xp || 0).level, here = WORLD.map && WORLD.map.id, test = game.props.noGates, vis = st.visited || [];
    const seals = (st.npc && st.npc.seals) || [], seen = st.seen || [], known = knownMaps();
    const c = { id: id, name: '', lines: [], wx: weatherAt(id) ? weatherText(weatherAt(id)) : '', travel: false, status: '' };
    if (id === 'town') { c.name = 'Sproutvale'; c.lines = ['Home and the Lab']; c.travel = true; }
    else if (id === 'arena') { c.name = 'The Arena'; c.lines = ['Five rivals, one a day', 'Off the Ashwood Trail']; if (knownMaps().has('arena')) c.travel = true; else c.status = 'Reach it on foot'; }
    else if (ZONE_NAMES[id]) {
      const L = LEADERS.find((x) => x.zone === id), open = test || game.gateOpen(id);
      const found = ZONE_TYPES[id].reduce((n, t) => { const ti = ZTYPES.indexOf(t); return n + seen.filter((no) => Math.floor((no - 1) / 6) === ti).length; }, 0);
      c.name = ZONE_NAMES[id]; c.lines = [found + '/12 species found', L.name + (seals.indexOf(L.id) !== -1 ? '\u2019s fire: kept' : '\u2019s fire: not yet kept')];
      if (open) c.travel = true; else c.status = 'The gate is shut';
    } else if (CITY[id]) {
      const v = test || vis.indexOf(id) !== -1;
      if (v) { c.name = CITY[id][0]; c.lines = [CITY[id][2]]; c.travel = true; } else { c.name = 'Undiscovered'; c.lines = ['Somewhere ' + CITY[id][1]]; c.status = 'Find it on foot first'; c.wx = ''; }
    } else {
      const M = WORLD.MAPS[id], v = known.has(id);
      if (v) { c.name = M ? M.name : id; c.lines = [MAP_LAYOUT[id] && MAP_LAYOUT[id][3] ? 'A place few people know' : 'A path between places']; c.status = 'Reach it on foot'; } else { c.name = 'Undiscovered'; c.lines = ['A path you have not walked yet']; c.wx = ''; }
    }
    if (here === id) { c.travel = false; c.status = 'You are here'; }
    return c;
  }
  function renderCard() {
    const c = placeCard(mapSel);
    $('wm-info').innerHTML = '<div class="wmi-text"><b>' + c.name + '</b>' + c.lines.map((l) => '<span>' + l + '</span>').join('') + (c.wx ? '<span class="wx">' + c.wx + '</span>' : '') + (c.status && !c.travel ? '<span class="' + (c.status === 'You are here' ? 'you' : 'lk') + '">' + c.status + '</span>' : '') + '</div>' +
      (c.travel ? '<button data-travel="' + mapSel + '">Travel here</button>' : '');
  }
  function mapSelect(id) { mapSel = id; renderLayout(); renderCard(); }
  function renderMap() {
    const here = WORLD.map && WORLD.map.id; if (!mapSel || !MAP_LAYOUT[mapSel]) mapSel = MAP_LAYOUT[here] ? here : 'town';
    renderLayout(); renderCard();
    $('wm-tod').textContent = { night: 'Night.', dawn: 'Dawn.', dusk: 'Dusk.', day: 'Daytime.' }[timeOfDay()] + (weatherAt('town') ? ' The weather changes at ' + String(WEATHER.nextChange().getHours()).padStart(2, '0') + ':00.' : '');
  }
  // ---------- the overview: every regular place greyed out until you have been there; secret places only appear once found ----------
  // which maps count as visited: the ones recorded, plus what the save implies for older saves (Sproutvale, and a zone whose trainer or leader you have beaten)
  function knownMaps() {
    const st = game.state, set = new Set(st.visited || []), npc = st.npc || {}, cleared = npc.cleared || [], seals = npc.seals || [];
    set.add('town'); if (WORLD.map && !WORLD.map.interior && !WORLD.map.hall) set.add(WORLD.map.id);
    [['moss', 'ivy', 'wren'], ['frost', 'bram', 'glacia'], ['ember', 'kiki', 'blaze'], ['tide', 'marlo', 'coral']].forEach((z) => { if (cleared.indexOf(z[1]) !== -1 || seals.indexOf(z[2]) !== -1) set.add(z[0]); });
    return set;
  }
  // the overview as data (also used by tests): nodes with a state, and the links between them
  function layoutInfo() {
    const known = knownMaps(), nodes = [], by = {};
    Object.keys(MAP_LAYOUT).forEach((id) => { const L = MAP_LAYOUT[id], M = WORLD.MAPS[id]; if (!M) return; const lit = known.has(id), secret = !!L[3], state = lit ? 'lit' : (secret ? 'hidden' : 'grey'); const n = { id: id, x: L[0], y: L[1], size: L[2], secret: secret, state: state, name: M.name }; nodes.push(n); by[id] = n; });
    const links = [], seen = {};
    nodes.forEach((n) => { WORLD.MAPS[n.id].exits.forEach((e) => { const o = by[e.to]; if (!o) return; const k = [n.id, o.id].sort().join('|'); if (seen[k]) return; seen[k] = 1; if (n.state === 'hidden' || o.state === 'hidden') return; links.push({ a: n.id, b: o.id, state: n.state === 'lit' && o.state === 'lit' ? 'lit' : 'grey' }); }); });
    return { nodes: nodes, links: links };
  }
  // the painted overview: sea, land, orange routes, coloured places. Visited = colour, not yet = grey, secrets = not drawn.
  const LAND = { town: '#92CF68', moss: '#6DB551', frost: '#D6EAF5', ember: '#DE9A62', tide: '#EBDB9F', route: '#9CD170', mossbrook: '#80C45E', frosthold: '#D6EAF5', cinderport: '#DE9A62', coralbay: '#EBDB9F', peak: '#B9B0C8', arena: '#9CD170', ascent: '#D6EAF5', descent: '#DE9A62', dg: '#A99C86' };
  const ICOL = { town: '#E0524A', moss: '#2F8A3C', frost: '#7DB8E0', ember: '#E0652A', tide: '#2D7FD0', mossbrook: '#3E8E3E', frosthold: '#5AA7D6', cinderport: '#C8502A', coralbay: '#1E9AA8', peak: '#7A6F96', arena: '#C2A06A', ascent: '#5AA7D6', descent: '#C8502A' };
  const kindOf = (id) => id === 'town' ? 'town' : ZONE_NAMES[id] ? 'zone' : id === 'peak' ? 'peak' : id === 'ascent' || id === 'descent' || id === 'arena' ? 'mark' : CITY[id] ? 'city' : id.indexOf('dg-') === 0 ? 'dg' : 'route';
  const landOf = (id) => LAND[id] || (id.indexOf('dg-') === 0 ? LAND.dg : LAND.route);
  function renderLayout() {
    const cv = $('wm-canvas'), info = layoutInfo(), U = 40, CW = 12 * U, CH = 13 * U, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = CW * dpr; cv.height = CH * dpr; cv.style.aspectRatio = CW + ' / ' + CH; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sea = c.createLinearGradient(0, 0, 0, CH); sea.addColorStop(0, '#58B2EA'); sea.addColorStop(1, '#3B8BD0'); c.fillStyle = sea; c.fillRect(0, 0, CW, CH);
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.5; c.lineCap = 'round';
    for (let x = 0; x < 12; x++) for (let y = 0; y < 13; y++) { const px = x * U + 8 + (y % 2) * 14, py = y * U + 22; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 5, py - 4, px + 10, py); c.quadraticCurveTo(px + 15, py + 4, px + 20, py); c.stroke(); }
    const by = {}; info.nodes.forEach((n) => { by[n.id] = n; });
    const vis = info.nodes.filter((n) => n.state !== 'hidden'), rad = (n) => { const k = kindOf(n.id); return (k === 'route' ? 0.9 : k === 'dg' ? 0.7 : k === 'mark' ? 0.8 : 1.2) * U; };
    // land: a wide shallows ring, a sand ring, then the ground itself (grey until visited)
    const paint = (extra, colN, colL) => {
      c.lineCap = 'round'; c.lineJoin = 'round';
      info.links.forEach((l) => { const a = by[l.a], b = by[l.b]; c.beginPath(); c.moveTo(a.x * U, a.y * U); c.lineTo(b.x * U, b.y * U); c.lineWidth = 1.5 * U + extra; c.strokeStyle = colL(l); c.stroke(); });
      vis.forEach((n) => { c.beginPath(); c.arc(n.x * U, n.y * U, rad(n) + extra / 2, 0, 7); c.fillStyle = colN(n); c.fill(); });
    };
    paint(30, () => 'rgba(150,215,245,.55)', () => 'rgba(150,215,245,.55)');
    paint(12, (n) => n.state === 'lit' ? '#F6EBBE' : '#E4E6EB', (l) => l.state === 'lit' ? '#F6EBBE' : '#E4E6EB');
    paint(0, (n) => n.state === 'lit' ? landOf(n.id) : '#BCC2CD', (l) => l.state === 'lit' ? LAND.route : '#BCC2CD');
    // routes: orange where walked, thin grey where not
    info.links.forEach((l) => { const a = by[l.a], b = by[l.b]; c.beginPath(); c.moveTo(a.x * U, a.y * U); c.lineTo(b.x * U, b.y * U); c.lineCap = 'round';
      if (l.state === 'lit') { c.lineWidth = 8; c.strokeStyle = '#A85A14'; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#F7A641'; c.stroke(); } else { c.lineWidth = 4; c.strokeStyle = '#8E95A3'; c.stroke(); } });
    const here = WORLD.map && WORLD.map.id;
    const glyph = (k, id, x, y, lit) => { c.fillStyle = c.strokeStyle = lit ? '#FFFFFF' : '#EEF0F3'; c.lineWidth = 2; c.lineCap = 'round';
      if (k === 'town' || k === 'city') { c.fillRect(x - 6, y - 2, 12, 8); c.beginPath(); c.moveTo(x - 8, y - 2); c.lineTo(x, y - 9); c.lineTo(x + 8, y - 2); c.closePath(); c.fill(); }
      else if (id === 'moss') { c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x - 7, y + 3); c.lineTo(x + 7, y + 3); c.closePath(); c.fill(); c.fillRect(x - 1.5, y + 3, 3, 5); }
      else if (id === 'frost') { for (let a = 0; a < 3; a++) { const t = a * Math.PI / 3; c.beginPath(); c.moveTo(x - Math.cos(t) * 8, y - Math.sin(t) * 8); c.lineTo(x + Math.cos(t) * 8, y + Math.sin(t) * 8); c.stroke(); } }
      else if (id === 'ember') { c.beginPath(); c.moveTo(x, y - 9); c.quadraticCurveTo(x + 9, y + 1, x + 4, y + 7); c.lineTo(x - 4, y + 7); c.quadraticCurveTo(x - 9, y + 1, x, y - 9); c.fill(); }
      else if (id === 'tide') { c.beginPath(); c.moveTo(x - 8, y - 2); c.quadraticCurveTo(x - 4, y - 7, x, y - 2); c.quadraticCurveTo(x + 4, y + 3, x + 8, y - 2); c.stroke(); c.beginPath(); c.moveTo(x - 8, y + 4); c.quadraticCurveTo(x - 4, y - 1, x, y + 4); c.quadraticCurveTo(x + 4, y + 9, x + 8, y + 4); c.stroke(); }
      else if (k === 'peak') { c.beginPath(); c.moveTo(x - 11, y + 8); c.lineTo(x - 2, y - 8); c.lineTo(x + 4, y + 2); c.lineTo(x + 8, y - 4); c.lineTo(x + 13, y + 8); c.closePath(); c.fill(); }
      else if (id === 'arena') { c.beginPath(); c.arc(x, y, 6, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
      else if (k === 'mark') { c.beginPath(); const d = id === 'ascent' ? -1 : 1; c.moveTo(x, y + d * 6); c.lineTo(x - 6, y - d * 5); c.lineTo(x + 6, y - d * 5); c.closePath(); c.fill(); } };
    vis.forEach((n) => {
      const k = kindOf(n.id), lit = n.state === 'lit', x = n.x * U, y = n.y * U, sel = n.id === mapSel;
      let r = k === 'town' ? 17 : k === 'route' || k === 'dg' ? 7.5 : k === 'mark' ? 11 : k === 'peak' ? 16 : 15;
      c.beginPath();
      if (k === 'city' || k === 'town') { const s = r * 2 - 2; if (c.roundRect) c.roundRect(x - s / 2, y - s / 2, s, s, 5); else c.rect(x - s / 2, y - s / 2, s, s); } else c.arc(x, y, r, 0, 7);
      c.fillStyle = lit ? (k === 'route' ? '#F7A641' : k === 'dg' ? '#7C6A52' : ICOL[n.id] || '#F7A641') : '#9AA1AE'; c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 4; c.shadowOffsetY = 2; c.fill(); c.shadowColor = 'transparent';
      c.lineWidth = 3; c.strokeStyle = lit ? '#FFFFFF' : '#D5D9E0'; c.stroke();
      glyph(k, n.id, x, y, lit);
      if (sel) { c.beginPath(); c.arc(x, y, r + 7, 0, 7); c.lineWidth = 3; c.setLineDash([5, 4]); c.strokeStyle = '#1E2A4A'; c.stroke(); c.setLineDash([]); }
      const named = k === 'town' || k === 'zone' || (lit && (k === 'city' || k === 'peak' || k === 'mark'));
      if (named) { c.font = '800 11px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3.5; c.lineJoin = 'round'; c.strokeStyle = lit ? '#1E3A5F' : '#5B6577'; c.fillStyle = '#FFFFFF'; const ty = n.y > 12 ? y - r - 6 : y + r + 14; c.strokeText(n.name, x, ty); c.fillText(n.name, x, ty); }
      if (n.id === here) { c.beginPath(); c.moveTo(x, y - r - 3); c.lineTo(x - 7, y - r - 14); c.lineTo(x + 7, y - r - 14); c.closePath(); c.fillStyle = '#FFD233'; c.lineWidth = 2.5; c.strokeStyle = '#7A4A00'; c.stroke(); c.fill(); }
    });
    const tot = info.nodes.filter((n) => !n.secret).length, got = info.nodes.filter((n) => n.state === 'lit' && !n.secret).length;
    $('wm-count').textContent = 'Explored ' + got + ' of ' + tot + ' places. Tap a place to see it and travel.';
    cv.setAttribute('aria-label', 'World map. ' + $('wm-count').textContent);
    cv._nodes = info.nodes.filter((n) => n.state !== 'hidden');
  }
  function mapPick(x, y) { let best = null, bd = 0.85; (($('wm-canvas')._nodes) || []).forEach((n) => { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } }); return best; }
  $('wm-canvas').addEventListener('click', (ev) => { const r = ev.currentTarget.getBoundingClientRect(), n = mapPick((ev.clientX - r.left) / r.width * 12, (ev.clientY - r.top) / r.height * 13); if (n) mapSelect(n.id); });
  // keyboard: arrows move the selection to the nearest place in that direction, Enter travels
  $('wm-canvas').addEventListener('keydown', (ev) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (ev.key === 'Enter') { const c = placeCard(mapSel); if (c.travel) travel(mapSel); ev.preventDefault(); return; }
    if (!dir) return; ev.preventDefault();
    const cur = ($('wm-canvas')._nodes || []).find((n) => n.id === mapSel); if (!cur) return; let best = null, bs = 1e9;
    $('wm-canvas')._nodes.forEach((n) => { if (n === cur) return; const dx = n.x - cur.x, dy = n.y - cur.y, along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] - dy * dir[0]); if (along <= 0.2) return; const s = along + across * 1.6; if (s < bs) { bs = s; best = n; } });
    if (best) mapSelect(best.id);
  });
  $('wm-info').addEventListener('click', (e) => { const t = e.target.closest('[data-travel]'); if (t) travel(t.dataset.travel); });
  function openMap() { closeMenu(true); mapOpen = true; mapSel = null; renderMap(); $('wmap').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); $('wm-close').focus(); }
  function closeMap() { mapOpen = false; $('wmap').hidden = true; $('hud').hidden = false; WORLD.setPaused(false); }
  function travel(id) {
    closeMap();
    if (WORLD.map.id === id) return;
    WORLD.go(id, ZONE_NAMES[id] && WORLD.map.id !== 'town' ? 'town' : null); toast('You travel to ' + mapName(id) + '.');
  }
  // ---------- save backup ----------
  const SAVE_KEYS = ['critter-roll:v2', 'critter-roll:world', 'critter-roll:id', 'critter-roll:tip'];
  function checksum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function exportCode() {
    const data = {}; SAVE_KEYS.forEach((k) => { try { const v = localStorage.getItem(k); if (v !== null) data[k] = v; } catch (e) {} });
    const body = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    return 'CRITTER1.' + body + '.' + checksum(body);
  }
  function readCode(code) {
    const parts = String(code || '').trim().replace(/\s+/g, '').split('.');
    if (parts.length !== 3 || parts[0] !== 'CRITTER1') return { error: 'That does not look like a Critter Roll save code.' };
    if (checksum(parts[1]) !== parts[2]) return { error: 'This code is incomplete or was changed. Copy the whole code and try again.' };
    let data; try { data = JSON.parse(decodeURIComponent(escape(atob(parts[1])))); } catch (e) { return { error: 'This code could not be read.' }; }
    if (!data['critter-roll:v2']) return { error: 'This code has no game save inside.' };
    let s; try { s = JSON.parse(data['critter-roll:v2']); } catch (e) { return { error: 'The save inside this code is damaged.' }; }
    if (!Array.isArray(s.caught)) return { error: 'The save inside this code is damaged.' };
    return { data, summary: s.caught.length + ' critters, ' + ((s.seen || []).length) + ' species, level ' + game.levelInfo(s.xp || 0).level + ', ' + ((s.npc && s.npc.seals) || []).length + ' seals' };
  }
  function summarize(d) {
    try { const s = JSON.parse(d['critter-roll:v2'] || '{}'); return 'Level ' + game.levelInfo(s.xp || 0).level + ' · ' + (s.caught || []).length + ' critters · ' + (s.seen || []).length + ' species · ' + (s.essence || 0) + ' essence · ' + ((s.npc && s.npc.seals) || []).length + ' seals'; }
    catch (e) { return 'Unreadable save'; }
  }
  const when = (t) => { if (!t) return 'unknown time'; const d = new Date(t); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  function showConflict(c) {
    $('cf-local').textContent = summarize(c.local.data); $('cf-local-t').textContent = 'Last played here ' + when(c.local.savedAt);
    $('cf-cloud').textContent = summarize(c.cloud.data); $('cf-cloud-t').textContent = 'Saved to your account ' + when(c.cloud.savedAt);
    $('cf').hidden = false; WORLD.setPaused(true); $('cf-keep-cloud').focus();
  }
  function cloudStatus() {
    const t = CLOUD.text();
    if ($('m-sync')) $('m-sync').textContent = t;
    if ($('bk-sync')) $('bk-sync').textContent = t;
    if ($('bk-sync-now')) $('bk-sync-now').hidden = !CLOUD.connected;
    renderAccount();
  }
  // ---------- online account (Supabase sign-in; hidden on claude.ai, which uses the Claude account) ----------
  function renderAccount() {
    const box = $('acct'); if (!box) return;
    const a = CLOUD.account;
    box.hidden = a.mode !== 'supa';
    if (box.hidden) return;
    $('acct-rec').hidden = !a.recovering;
    $('acct-out').hidden = !!a.email || a.recovering;
    $('acct-on').hidden = !a.email || a.recovering;
    $('acct-who').textContent = a.email || '';
    if (a.recovering && $('bk').hidden) openBackup();
  }
  let acctBusy = false;
  async function acctRun(btn, fn) {
    if (acctBusy) return; acctBusy = true;
    const msg = $('acct-msg'), btns = ['acct-in', 'acct-new', 'acct-forgot', 'acct-off', 'acct-setpw'].map($);
    btns.forEach((b) => { if (b) b.disabled = true; }); msg.textContent = 'One moment…';
    let out = null; try { out = await fn(); } catch (e) { out = 'Something went wrong. Try again.'; }
    btns.forEach((b) => { if (b) b.disabled = false; }); acctBusy = false;
    msg.textContent = typeof out === 'string' ? out : '';
    cloudStatus();
    return out;
  }
  function acctFields() {
    const email = $('acct-email').value.trim(), pw = $('acct-pw').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { err: 'Type your email address.' };
    if (pw.length < 6) return { err: 'The password needs at least 6 characters.' };
    return { email, pw };
  }
  function wireAccount() {
    $('acct-out').addEventListener('submit', (e) => {
      e.preventDefault(); const f = acctFields(); if (f.err) { $('acct-msg').textContent = f.err; return; }
      acctRun($('acct-in'), async () => { const r = await CLOUD.signIn(f.email, f.pw); if (!r) { $('acct-pw').value = ''; return 'Signed in. Your progress now saves online.'; } return r; });
    });
    $('acct-new').addEventListener('click', () => {
      const f = acctFields(); if (f.err) { $('acct-msg').textContent = f.err; return; }
      acctRun($('acct-new'), async () => {
        const r = await CLOUD.signUp(f.email, f.pw);
        if (r && r.check) return 'Almost done: open the link we just emailed to ' + f.email + ', then sign in here.';
        if (!r) { $('acct-pw').value = ''; return 'Account created. Your progress now saves online.'; }
        return r;
      });
    });
    $('acct-forgot').addEventListener('click', () => {
      const email = $('acct-email').value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $('acct-msg').textContent = 'Type your email above first, then tap Forgot password.'; return; }
      acctRun($('acct-forgot'), async () => { const r = await CLOUD.resetPassword(email); return r || 'If that email has an account, a reset link is on its way. Open it on this device.'; });
    });
    $('acct-off').addEventListener('click', () => {
      acctRun($('acct-off'), async () => { const r = await CLOUD.signOut(); if (!r) { location.reload(); return 'Signed out.'; } return r; });
    });
    $('acct-rec').addEventListener('submit', (e) => {
      e.preventDefault(); const pw = $('acct-newpw').value;
      if (pw.length < 6) { $('acct-msg').textContent = 'The password needs at least 6 characters.'; return; }
      acctRun($('acct-setpw'), async () => { const r = await CLOUD.setPassword(pw); if (!r) { $('acct-newpw').value = ''; return 'Password saved. You are signed in.'; } return r; });
    });
  }
  let pendingImport = null;
  function openBackup() { cloudStatus(); closeMenu(true); $('bk').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); $('bk-out').value = exportCode(); $('bk-in').value = ''; $('bk-msg').textContent = ''; $('bk-restore').textContent = 'Check code'; pendingImport = null; $('bk-close').focus(); }
  function closeBackup() { $('bk').hidden = true; $('hud').hidden = false; WORLD.setPaused(false); }
  // ---------- guidance: next hints, first-time intro ----------
  const npcAt = (map, id) => { const n = (WORLD.allNpcs()[map] || []).find((x) => x.id === id); return n ? { map: map, x: n.x, y: n.y } : null; };
  const hintQueue = []; let hintBusy = false;
  // the help that leaves as you grow (Meaning: you no longer need it kept for you). Each seal you hold retires one kind of help: the first quiets the tips, the second changes Mira's welcome, the third and fourth change what Mom says. Words only; no price, reward or rule changes.
  const sealCount = () => ((game.state.npc && game.state.npc.seals) || []).length;
  // the scripted lines (review words pass): one table, so telltest reads every line a scene says (APP.words())
  const SAY = {
    fern: ['Someone has the lamp on the west gate lit already. They do, most mornings.'], fernGo: ['Go on, then.'],
    archCold: ['Eight critters sit around one fire. A ninth seat is carved empty.', 'The stone stays cold.'], archOpen: ['The stone warms.'],
    door: ['The great door is not locked.', 'The handle is worn bright.'], greatLamp: ['The glass is warm.'],
    seat: ['Something that has been kept here a very long time opens its eyes.', 'It looks at the empty seat, and then it chooses you instead.'],
    window: ['Something small is asleep on the sill, curled against the warm glass.', 'It opens one eye.'],
    forgeDoor: ['A doorway of dry heat, cut into the crater wall.', 'The forge has been quiet for a long time. Something inside is still warm.'],
    furnace: ['You pull the soot-black door open. A single ember glows in the ash.', 'You blow on it. It brightens, then catches, then roars.'], furnaceLit: ['A coal in the ash shifts and looks up.', 'It climbs out, small and heavy and warm, and settles against your boots.'],
    watchLit: 'They come most nights now. You are the one they come to.', watchBack: 'Back again.', watchFirst: 'Someone comes to the door most nights.', watchEnough: 'Enough for today. The bench is yours until morning.',
    watchTop: ['Morning. You kept the whole watch.'], watchTopFirst: 'The lamp was yours all night.', watchTopAgain: 'Kept to morning again.', watchLoss: 'The bench is there. The watch is still yours.',
    cityDone: ['Thank you.', 'That is today\u2019s. Tomorrow there is another.'], cityAgain: 'That was today\u2019s. Tomorrow there is another.',
    socketCold: 'A socket, cold.', socketWarm: 'A socket, warm.', postCold: 'A lantern on a post. Cold.', postAhead: 'Lit before you got here.', postMine: 'It stays lit.'
  };
  // after the great lamp, the four city shops and Rowan say one thing that has changed (02-F30); the LETGO table above them stays as it is
  const LIT_LINES = { juniper: ['The lamp over the stall was on when I opened. I had not lit it.'], tove: ['The lamp over the stall was on when I opened. I had not lit it.'], bea: ['The lamp over the stall was on when I opened. I had not lit it.'], marina: ['The lamp over the stall was on when I opened. I had not lit it.'], rowan: ['I saw a light go over the roofs last night. I did not get up.'] };
  const SCAFFOLD = {
    pip: [[1, ['You know all of this already.', 'I just like standing here.']]],
    mira: [[2, ['Take what you need.']], [4, ['Nothing left on the shelf. There is some at your house.']]],
    fern: [[1, ['You know where to look.']], [3, ['I have been writing about you. Only a little.', 'There is not much left that I can tell you.']]],
    remy: [[1, ['The terminal is where it always was.']], [3, ['Fern is outside less these days.', 'She says she has run out of things to tell the trainers who come through.']]],
    mom: [[2, ['You are home. Good.', 'I stopped tidying the desk. You know where things are.']], [3, ['You did not ask what is for dinner.', 'The lamp in the window is on. I did not light it.']], [4, ['You do not have to tell me where you are going.', 'The door stays open. It always did.']]]
  };
  // the keepers rest once you have carried the light yourself (Meaning: they held it for you until you could). Lines only; [condition, lines].
  const LETGO = {
    maren: [() => advOf().flags.lampLit, ['It is warm up here now.', 'I used to stand here all night. I think I will sit down.']],
    hale: [() => advOf().flags.forgeLit, ['It is warm in here. I had forgotten.', 'I will not need to watch it.']],
    keeper: [() => advOf().flags.secret, ['The seat is empty again, and it is not sad.', 'I held it so long. It is lighter than I expected.']],
    joss: [() => advOf().flags.lampLit, ['I still trim the lamp every dusk. Nobody told me to stop.', 'I saw yours from here last night. I trimmed mine anyway.']],   // the land is not kept more after the lamp: Joss keeps his own
    brandt: [() => advOf().flags.lampLit, ['One cup tonight.']],
    mom: [() => advOf().flags.lampLit, ['There was a light across the ceiling last night. It went the whole way over the roof.', 'I did not worry. Is that not odd?', 'The window was dark when I came down. I left it.']]
  };
  const letGoLines = (n) => { const r = LETGO[n.id]; return r && r[0]() ? r[1] : null; };
  // the keeper who visibly stops is Mom: once, in the night of darkness (four fires kept, the lamp not yet lit)
  const darkLines = (n) => (n.id === 'mom' && keptDark() && !advOf().flags.momDark ? ['I did not light it tonight.'] : null);
  const scaffoldLines = (n) => { const rows = SCAFFOLD[n.id]; if (!rows) return null; const c = sealCount(); let out = null; rows.forEach((r) => { if (c >= r[0]) out = r[1]; }); return out; };
  function hint(id, text) {
    if (sealCount() >= 1 && id !== 'online') return;   // with a seal in hand the tips go quiet
    const hs = game.state.hints || [];
    if (hs.indexOf(id) !== -1 || hintQueue.some((q) => q.id === id)) return;
    game.update({ hints: hs.concat([id]) });
    hintQueue.push({ id, text }); pumpHints();
  }
  function pumpHints() {
    if (hintBusy || !hintQueue.length) return;
    hintBusy = true; const h = hintQueue.shift(); toast(h.text);
    setTimeout(() => { hintBusy = false; pumpHints(); }, 4600);
  }
  function checkHints() {
    const st = game.state;
    if (!st.intro) return;
    if ((st.essence || 0) >= 3 && st.caught.length) hint('shop', 'Mira near your home sells potions and charms for essence.');
    const ac = CLOUD.account;
    if (ac.mode === 'supa' && ac.available && !ac.email && st.caught.length >= 3) hint('online', 'Tip: sign in (Menu, then Save) so your progress is saved online and follows you to other devices.');
  }
  async function intro() {
    if (game.state.intro || game.state.caught.length) return;
    await Promise.race([CLOUD.ready, new Promise((r) => setTimeout(r, 12000))]);
    if (game.state.intro || game.state.caught.length) return;
    showTitle(() => showDialog('Professor Fern', SAY.fern, null, openStarter));
  }
  // the title screen (Meaning: the introduction to everything: one lit window in the dark, kept before you did anything; the game begins when you touch that light)
  function showTitle(then) {
    if (window.__noTitle) { then(); return; }
    $('title').hidden = false; $('hud').hidden = true; WORLD.setPaused(true);
    const btn = $('title-light');
    btn.onclick = () => { btn.onclick = null; game.sfx('light'); $('title').classList.add('out'); WORLD.setPaused(false); WORLD.go('town');   // the same crossing as a zone change, under the fading title
      setTimeout(() => { $('title').hidden = true; $('title').classList.remove('out'); then(); }, window.__noTransition ? 0 : 650); };
  }
  function openStarter() {
    const seeds = game.starters();
    $('st-list').innerHTML = seeds.map((s) => {
      const k = game.make(s, 1);
      return '<div class="scard"><img src="' + PIX.sprite(k, 'big') + '" alt="" width="120" height="105"><b>' + esc(k.name) + '</b><button class="bk-btn gold" data-start="' + s + '">Choose ' + esc(k.name) + '</button></div>';   // name and picture only: a partner is not a purchase
    }).join('');
    $('starter').hidden = false; $('hud').hidden = true; WORLD.setPaused(true);
    const f = $('st-list').querySelector('button'); if (f) f.focus();
  }
  function chooseStarter(s) {
    const k = game.make(s, 1);
    game.update({ caught: [{ seed: s, stage: 1 }], party: [s], fighter: s, intro: true, seen: [k.speciesNo] }, [{ t: 'keep' }, { t: 'species' }]);
    game.sfx('claim');
    $('starter').hidden = true;
    fernHome();
    showDialog('Professor Fern', SAY.fernGo, null);
  }
  // Fern stands beside Home's path for the first minute (while !intro) and goes back to the Lab door once you have a partner
  function fernHome() { const f = (WORLD.allNpcs().town || []).find((n) => n.id === 'fern'); if (f) { f.x = 37; f.y = 11; f.dir = 'down'; } }
  // ---------- party, bag, shop ----------
  const ITEMS = {
    potion: { name: 'Potion', price: 3, desc: 'Heals 40% HP in battle.' },
    super: { name: 'Super Potion', price: 7, desc: 'Fully heals in battle.' },
    charm: { name: 'Rare Charm', price: 10, desc: 'Your next 3 wild encounters get sparkling-grass odds.' },
    ticket: { name: 'Roll Ticket', price: 5, desc: 'Gives back 1 roll today. Up to 3 per day.' },
    herb: { name: 'Mossleaf Remedy', price: 4, desc: 'Heals 40% HP and cures burn, weaken, daze and drain. Sold in Mossbrook.', city: 'mossbrook' },
    ward: { name: 'Frost Ward', price: 5, desc: 'Your critter takes 65% less damage from the next 5 hits. Sold in Frosthold.', city: 'frosthold' },
    whet: { name: 'Whetstone', price: 5, desc: 'Your critter deals 70% more damage for the rest of the battle. Sold in Cinderport.', city: 'cinderport' },
    lure: { name: 'Tide Lure', price: 12, desc: 'Your next wild critter is a species you have not kept yet, if this area has one. Sold in Coralbay.', city: 'coralbay' }
  };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bagOf = () => Object.assign({}, BAG0, game.state.bag);
  let panel = null;
  function openPanel(id) { closeMenu(true); panel = id; $(id).hidden = false; $('hud').hidden = true; WORLD.setPaused(true); renderPanel(); const c = $(id).querySelector('.wm-head button'); if (c) c.focus(); }
  function closePanel() { if (!panel) return; $(panel).hidden = true; panel = null; $('hud').hidden = false; WORLD.setPaused(false); }
  function renderPanel() {
    if (panel === 'party') renderParty(); else if (panel === 'bag') renderBag(); else if (panel === 'shop') renderShop();
  }
  function renderParty() {
    const st = game.state, party = game.partySeeds();
    const power = (k) => k.stats.reduce((x, q) => x + q.value, 0);
    const rows = st.caught.map((e) => ({ e, k: game.make(e.seed, e.stage) })).sort((p, q) => { const ip = party.indexOf(p.e.seed), iq = party.indexOf(q.e.seed); return (ip === -1 ? 9 : ip) - (iq === -1 ? 9 : iq) || power(q.k) - power(p.k); });
    $('pt-count').textContent = party.length + '/3 in party';
    $('pt-list').innerHTML = !rows.length ? '<p class="bk-p">Keep a critter first. Your party is chosen from your Dex.</p>' : rows.map(({ e, k }) => {
      const pos = party.indexOf(e.seed), inP = pos !== -1;
      return '<div class="prow' + (inP ? ' inp' : '') + '"><img src="' + PIX.sprite(k, 'big') + '" alt="" width="60" height="52">' +
        '<span class="pn2"><b>' + esc(k.name) + (pos === 0 ? ' <i class="lead">Lead</i>' : '') + '</b><span>' + k.element.name + ' · St.' + k.stage + ' · Lv ' + k.lv + ' · Power ' + power(k) + '</span></span>' +
        (inP && pos > 0 ? '<button class="pbtn" data-lead="' + e.seed + '" aria-label="Make ' + esc(k.name) + ' the lead">Lead</button>' : '') +
        '<button class="pbtn' + (inP ? ' on' : '') + '" data-toggle="' + e.seed + '" aria-pressed="' + inP + '"' + (!inP && party.length >= 3 ? ' disabled' : '') + '>' + (inP ? 'Remove' : 'Add') + '</button></div>';
    }).join('');
  }
  function setParty(p) { game.update({ party: p, fighter: p[0] !== undefined ? p[0] : game.state.fighter }); renderParty(); }
  function renderBag() {
    const bag = bagOf(), st = game.state;
    $('bg-note').textContent = (st.charm > 0 ? 'Rare Charm active: ' + st.charm + ' encounter' + (st.charm > 1 ? 's' : '') + ' left. ' : '') + (st.lure > 0 ? 'Tide Lure is set for your next wild critter.' : '');
    $('bg-list').innerHTML = Object.keys(ITEMS).map((id) => {
      const it = ITEMS[id], n = bag[id];
      if (ITEMS[id].city && !n) return '';
      const usable = (id === 'charm' || id === 'ticket' || id === 'lure') && n > 0;
      return '<div class="prow"><span class="pn2"><b>' + it.name + ' ×' + n + '</b><span>' + it.desc + '</span></span>' +
        (usable ? '<button class="pbtn on" data-use="' + id + '">Use</button>' : '<span class="pmuted">' + (n ? 'In battle' : 'None') + '</span>') + '</div>';
    }).join('');
  }
  function useItem(id) {
    const bag = bagOf(), st = game.state, today = new Date().toDateString();
    if (!(bag[id] > 0)) return;
    if (id === 'lure') { if (st.lure > 0) { toast('A Tide Lure is already set.'); return; } bag.lure -= 1; game.update({ bag: bag, lure: 1 }); game.sfx('claim'); toast('Tide Lure set. Your next wild critter will be a species you have not kept, if this area has one.'); renderBag(); return; }
    if (id === 'charm') { bag.charm -= 1; game.update({ bag: bag, charm: (st.charm || 0) + 3 }); game.sfx('claim'); toast('Rare Charm active for your next 3 wild encounters.'); }
    if (id === 'ticket') {
      const t = st.tickets && st.tickets.day === today ? st.tickets : { day: today, count: 0 };
      const en = game.energy();
      if (game.props.testMode) { toast('Test mode already gives unlimited rolls. Keep the ticket for later.'); return; }
      if (t.count >= 3) { toast('You can use up to 3 Roll Tickets per day.'); return; }
      if (en.used <= 0) { toast('You have all your rolls already. Save the ticket.'); return; }
      bag.ticket -= 1; game.update({ bag: bag, used: en.used - 1, day: en.today, tickets: { day: today, count: t.count + 1 } }); game.sfx('claim'); toast('+1 roll for today.');
    }
    renderBag();
  }
  // help that leaves (item 14): the five battle items cost nothing from two seals (Mira's 'Take what you need' made true); the Roll Ticket is no longer sold (a day holds what it holds; held tickets still work)
  const HELP_ITEMS = ['potion', 'super', 'herb', 'ward', 'whet'];
  const priceOf = (id) => (HELP_ITEMS.indexOf(id) !== -1 && sealCount() >= 2 ? 0 : ITEMS[id].price);
  function renderShop() {
    const bag = bagOf(), ess = game.state.essence || 0;
    $('sh-ess').textContent = ess + ' essence';
    const here = WORLD.map && WORLD.map.id, local = CITY_ITEM[here];
    $('sh-list').innerHTML = Object.keys(ITEMS).filter((id) => id !== 'ticket' && (!ITEMS[id].city || id === local)).map((id) => {
      const it = ITEMS[id], price = priceOf(id), can = ess >= price;
      return '<div class="prow"><span class="pn2"><b>' + it.name + '</b><span>' + it.desc + ' You have ' + bag[id] + '.</span></span>' +
        '<button class="pbtn' + (can ? ' on' : '') + '" data-buy="' + id + '"' + (can ? '' : ' disabled') + ' aria-label="' + (price ? 'Buy ' + it.name + ' for ' + price + ' essence' : 'Take a ' + it.name) + '">' + (price ? price + ' ◆' : 'Take') + '</button></div>';
    }).join('');
  }
  function buy(id) {
    const it = ITEMS[id], ess = game.state.essence || 0; if (!it || id === 'ticket') return; const price = priceOf(id); if (ess < price) return;
    const bag = bagOf(); bag[id] += 1; game.update({ bag: bag, essence: ess - price }); game.sfx('tap'); renderShop();
  }
  // Home's shelf (item 14): from four seals Mira's stall is bare and the shelf at home holds three Potions each morning (set on the day's first load, never taken away)
  function shelfTick() {
    if (!game || sealCount() < 4) return; const today = new Date().toDateString(), f = advOf().flags; if (f.shelfDay === today) return;
    const bag = bagOf(); bag.potion = Math.max(bag.potion | 0, 3); game.update({ bag: bag }); advSave((a) => { a.flags.shelfDay = today; });
  }
  // ---------- people ----------
  // the Arena's rivals: the one whose step is next waits on the sand (facing the gate); the others sit by their tents in ladder order
  const TENTS = [[5, 6], [8, 6], [5, 9], [8, 9], [5, 13]];
  function placeRivals(list) {
    const step = game ? game.ladderStep() : 0, fought = game ? game.ladderFoughtToday() : false;
    (list || []).forEach((n) => { if (!n.ladder) return; const i = n.ladder - 1; if (n.ladder === step + 1) { if (fought) { n.x = 9; n.y = 13; n.dir = 'left'; } else { n.x = 20; n.y = 7; n.dir = 'down'; } } else { n.x = TENTS[i][0]; n.y = TENTS[i][1]; n.dir = i % 2 ? 'left' : 'right'; } });   // once the day's fight is done the next rival sits by the camp fire (the gesture is the rule)
  }
  function npcList() {
    const M = WORLD.MAPS, out = { town: [
      Object.assign({ id: 'fern', name: 'Professor Fern', x: 37, y: 11, kind: 'request', pal: { h: '#E8E8F0', y: '#F4F7FB', Y: '#C9D3E6', p: '#4A5878' } }, game && game.state && !game.state.intro ? { x: 7, y: 13, dir: 'up' } : {}, {
        need: 'species5', reward: 10,
        ask: ['Ah, a new trainer. I am Professor Fern. I study critters here at the Lab.', 'Five kinds, and I will have a page to write.'],
        progress: (g) => 'The page has ' + (g.state.seen || []).length + ' on it so far.',
        thanks: ['Five already. I will start the page tonight.'],
        after: ['The pages are filling up.'] }),
      { id: 'pip', name: 'Pip', x: 25, y: 14, kind: 'talk', pal: { h: '#8A5A34', y: '#7CD957', Y: '#4FA83A' },
        lines: ['The patch past the gate sparkles in the morning. I have never caught it starting.', 'Rowan has stood in the same spot since breakfast.'] },
      { id: 'mira', name: 'Mira', x: 6, y: 15, kind: 'shop', pal: { h: '#C0392B', y: '#F59ACB', Y: '#D86BA6' },
        lines: ['Potions and charms. Take what you need.'] },
      { lv: 1, id: 'rowan', name: 'Rowan', x: 13, y: 20, dir: 'up', kind: 'trainer', trainer: true, pal: { cap: true, c: '#3C6FE0', y: '#3C6FE0', Y: '#28509E' },
        types: ['Moss', 'Ember'], size: 2, stage: 1,
        intro: ['Hey, you look new around here!', 'Let me see what your critters can do.'], winLine: 'Wow, you are good!', beatenLines: ['That was a great battle. Come back tomorrow for a rematch!'] }
    ], arena: [
      // the ladder: five named rivals in a fixed order (ladder 1..5). The one whose turn it is waits on the sand; the others keep to their tents (placeRivals)
      { lv: 8, id: 'juno', name: 'Juno', ladder: 1, kind: 'trainer', trainer: true, pal: { cap: true, c: '#F5C542', y: '#F5C542', Y: '#C9962A' }, types: ['Volt', 'Ember'], size: 3, stage: 2, pick: 0.5, reward: 14,
        intro: ["Everyone's first fight is against me.", "I'm the only one who remembers them all."], winLine: 'There. Now I remember yours too.', beatenLines: ['Tomorrow. I have four more to watch today.'], afterLines: ['Back for the first step again? It is still mine to give.'],
        notYet: ['Not you. Not yet.'], tomorrow: ['One a day. That is the rule of the sand.'] },
      { lv: 10, id: 'bastian', name: 'Bastian', ladder: 2, kind: 'trainer', trainer: true, pal: { cap: false, c: '#8E98AD', y: '#8E98AD', Y: '#5A6478', h: '#2B2235' }, types: ['Stone', 'Moss'], size: 3, stage: 2, pick: 0.6, reward: 18,
        intro: ['Nobody gets through me.', 'They go around, and I let them think it was their idea.'], winLine: 'Around, then. Fine.', beatenLines: ['Tomorrow. The wall does not move for anyone twice.'], afterLines: ['You already went around me once. Through, this time.'],
        notYet: ['Juno first. That is the order.'], tomorrow: ['One a day. Come back with the sun.'] },
      { lv: 12, id: 'sable', name: 'Sable', ladder: 3, kind: 'trainer', trainer: true, pal: { cap: false, c: '#8B6CF0', y: '#5B3FA8', Y: '#3A2A7A', h: '#1E1A2A' }, types: ['Dusk', 'Tide'], size: 4, stage: 2, pick: 0.6, reward: 22,
        intro: ['You will not see me coming.', 'You will see where I was.'], winLine: 'You looked where I was going. Good.', beatenLines: ['Tomorrow. I am somewhere else today.'], afterLines: ['Again? Watch the sand, not me.'],
        notYet: ['Two before me. Go and find them.'], tomorrow: ['Not today. The sand remembers one fight a day.'] },
      { lv: 14, id: 'halvard', name: 'Halvard', ladder: 4, kind: 'trainer', trainer: true, pal: { cap: false, c: '#DCEFF8', y: '#B9CCE0', Y: '#8FB0C8', h: '#E8E8F0' }, types: ['Frost', 'Stone'], size: 4, stage: 3, pick: 0.65, reward: 26,
        intro: ['I do not move much.', 'I have not needed to.'], winLine: 'I moved. Remember that.', beatenLines: ['Tomorrow. Standing still is also a day’s work.'], afterLines: ['You again. I will not move this time either.'],
        notYet: ['Three stand before me. Stand before them first.'], tomorrow: ['One a day. I can wait. I am good at it.'] },
      { lv: 16, id: 'ash', name: 'Ash', ladder: 5, kind: 'trainer', trainer: true, pal: { cap: true, c: '#FF7A45', y: '#D8574A', Y: '#A83A2E', h: '#2B2235' }, types: ['Ember', 'Bloom', 'Volt'], size: 5, stage: 3, pick: 0.7, reward: 30,
        intro: ['Five of us, and you came for me. Good.', 'The others were practice. So was I.'], winLine: 'The rail has room for one more name.', beatenLines: ['Tomorrow. Even the top of the ladder sleeps.'], afterLines: ['The rail already has your name. Fight me for nothing, then?'],
        notYet: ['Four names before mine. Climb.'], tomorrow: ['One a day. Tomorrow the sand is yours.'] },
      { id: 'tam', name: 'Tam', x: 22, y: 16, dir: 'up', kind: 'talk', pal: { h: '#2B2235', y: '#F5C542', Y: '#C9962A' }, lines: ['I come every day. I have never once gone in.', 'From the gate you can see every step they take.'] },
      { id: 'odo', name: 'Odo', x: 14, y: 17, dir: 'up', kind: 'talk', pal: { h: '#8A5A34', y: '#D8574A', Y: '#A83A2E' }, lines: ['My brother fought in there once. He lost.', 'He talks about it more than anything he ever won.'] },
      { id: 'pell', name: 'Pell', x: 27, y: 17, dir: 'up', kind: 'shop', pal: { h: '#C0392B', y: '#4FB06D', Y: '#2E7D33' }, lines: ['Potions, charms, whetstones. The fighters buy before; the watchers buy after.'] },
      { id: 'vesna', name: 'Vesna', x: 9, y: 21, dir: 'right', kind: 'talk', pal: { h: '#E8E8F0', y: '#8A4A2A', Y: '#5A2A10' }, lines: ['I held the top step for eleven years.', 'Now I hold the window. It is a better seat.'] },
      { id: 'kit', name: 'Kit', x: 16, y: 17, dir: 'up', kind: 'talk', pal: { h: '#F5C542', y: '#3C6FE0', Y: '#28509E' }, lines: ['When I am big enough they will let me in.', 'I already know what I will say to Juno.'] }
    ] };
    placeRivals(out.arena);
    const zone = (id, list) => {
      const m = M[id], cx = Math.floor(m.W / 2), cy = Math.floor(m.H / 2), sx = Math.floor(m.spawn[0]), sy = Math.floor(m.spawn[1]);
      const dx = Math.sign(cx - sx), dy = Math.sign(cy - sy);
      out[id] = list.map((n) => {
        n.zoneId = id;
        if (n.at === 'trainer') return Object.assign(n, { x: cx + 3, y: cy, dir: 'left' });
        if (n.at === 'leader') {
          const ring = [[7, 6], [m.W - 9, 6], [m.W - 9, m.H - 7], [7, m.H - 7]];
          const far = ring.slice().sort((p, q) => Math.hypot(q[0] - sx, q[1] - sy) - Math.hypot(p[0] - sx, p[1] - sy))[0];
          return Object.assign(n, { x: far[0] + Math.sign(far[0] - cx), y: far[1] + Math.sign(far[1] - cy), dir: 'down' });
        }
        if (n.at === 'entrance') return Object.assign(n, { x: sx + dx * 4 + (dy ? 2 : 0), y: sy + dy * 4 + (dx ? 2 : 0) });
        return Object.assign(n, { x: cx - 3, y: cy + 3 });
      });
    };
    zone('frost', [
      { lv: 1, id: 'glacia', name: 'Glacia', at: 'leader', kind: 'leader', leader: true, pal: { h: '#DCEBFF', y: '#8FD8EA', Y: '#5E97AE', p: '#2E4A66' }, types: ['Frost', 'Stone'], size: 4, stage: 2, pick: 0.75, firstReward: 25,
        intro: ['I am Glacia. This is my pool.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'The pool is still. It will stay that way now.', sealLine: 'Nothing up here has moved since you came in.', beatenLines: ['Rest by the fire, trainer. We can battle again tomorrow.'] },
      { lv: 9, id: 'bram', name: 'Hiker Bram', at: 'trainer', kind: 'trainer', trainer: true, pal: { cap: true, c: '#C0392B', y: '#8A5A34', Y: '#6B4626' }, types: ['Frost', 'Stone'], size: 4, stage: 2, pick: 0.5,
        intro: ['These peaks make critters tough.', 'Think yours can handle the cold?'], winLine: 'You climbed right over me! Well earned.', beatenLines: ['My critters need a rest. Tomorrow, then!'] },
      { id: 'sola', name: 'Sola', at: 'entrance', kind: 'request', pal: { h: '#F5D36A', y: '#9CC9D9', Y: '#5E97AE' }, need: 'stone', reward: 6,
        ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'I draw them. The Stone ones never hold still long enough.'],
        progress: () => 'They do not come when called. They come when you stop.', thanks: ['A Stone critter! It is even rockier than I imagined.'], after: ['I will treasure that picture.'] }
    ]);
    zone('ember', [
      { lv: 5, id: 'blaze', name: 'Blaze', at: 'leader', kind: 'leader', leader: true, pal: { cap: true, c: '#1E1A2A', y: '#FF7A45', Y: '#C2410C' }, types: ['Ember', 'Volt'], size: 4, stage: 3, pick: 0.55, firstReward: 30,
        intro: ['I am Blaze. This is my hearth.', 'My team burns at full power. Ready?'], winLine: 'All three at once. The woodpile is lower than it was.', sealLine: 'Someone will stack it again tonight. It is never me.', beatenLines: ['My flames need to rekindle. Come back tomorrow!'] },
      { lv: 10, id: 'kiki', name: 'Kiki', at: 'trainer', kind: 'trainer', trainer: true, pal: { h: '#F28C28', y: '#D8574A', Y: '#A8382E' }, types: ['Ember', 'Volt'], size: 3, stage: 2, pick: 0.55,
        intro: ['It is hot out here, and so are my critters!', 'Ready to feel the heat?'], winLine: 'Okay, okay, you win. That was electric!', beatenLines: ['My team is still cooling down. Come back tomorrow!'] },
      { id: 'dax', name: 'Dax', at: 'entrance', kind: 'request', pal: { cap: true, c: '#F5C542', y: '#4A5878', Y: '#2B3555' }, need: 'evolved', reward: 8,
        ask: ['I heard critters can evolve if you give them essence.', 'I have never seen one! Show me a critter at stage 2 or higher?'],
        progress: () => 'Pip grew a hand\u2019s width over the summer and I did not notice until it had happened.', thanks: ['Whoa, look at the size of it!', 'Thanks for showing me.'], after: ['One day I will evolve mine too.'] }
    ]);
    zone('moss', [
      { lv: 5, id: 'wren', name: 'Elder Wren', at: 'leader', kind: 'leader', leader: true, pal: { h: '#E8E8F0', y: '#4E6B19', Y: '#2E4210', p: '#4A3424' }, types: ['Moss', 'Bloom'], size: 3, stage: 2, pick: 0.6, firstReward: 20,   // leaders' lv simmed in docs/review/16-balance.md (Wren 5, Glacia 1, Blaze 5, Coral 8)
        intro: ['I am Wren. This is my garden.', 'The beds take their time.'], winLine: 'Four in bloom. I did not see you hurry.', sealLine: 'The beds will want you back. They always want someone.', beatenLines: ['The forest needs rest. Visit me again tomorrow.'] },
      { lv: 4, id: 'ivy', name: 'Ivy', at: 'trainer', kind: 'trainer', trainer: true, pal: { h: '#2E7D32', y: '#F5A3D0', Y: '#D86BA6' }, types: ['Moss', 'Bloom'], size: 3, stage: 2, pick: 0.3,
        intro: ['Shh, the forest is listening.', 'Let us give it a battle worth hearing.'], winLine: 'Beautifully done. The forest approves.', beatenLines: ['Let the forest rest today. Tomorrow we can battle again.'] },
      { id: 'oak', name: 'Old Oak', at: 'talk', kind: 'talk', pal: { h: '#BDBDBD', y: '#6B8E23', Y: '#4E6B19' },
        lines: ['The brave ones in this forest come home bruised.', 'They go out again first.'] }
    ]);
    zone('tide', [
      { lv: 8, id: 'coral', name: 'Admiral Coral', at: 'leader', kind: 'leader', leader: true, pal: { cap: true, c: '#F8F8F8', y: '#1E2A4A', Y: '#0E1A38', p: '#1E2A4A' }, types: ['Tide', 'Dusk'], size: 5, stage: 3, pick: 0.75, firstReward: 35,
        intro: ['I am Coral. This is my lamp hall.', 'Five critters, every one of them came back from a storm.'], winLine: 'Every lamp answered. The chain is down.', sealLine: 'The harbour lamp was already lit when I came down this morning. Nobody here will say who.', beatenLines: ['My fleet is in the harbor. Challenge me again tomorrow.'] },
      { lv: 19, id: 'marlo', name: 'Captain Marlo', at: 'trainer', kind: 'trainer', trainer: true, pal: { cap: true, c: '#1E2A4A', y: '#FFFFFF', Y: '#C9D3E6' }, types: ['Tide', 'Dusk'], size: 4, stage: 3, pick: 0.4,
        intro: ['Ahoy! Four critters, one captain.', 'Can your crew weather all of them?'], winLine: 'You sailed through my whole crew! A fine captain you would make.', beatenLines: ['My crew is resting below deck. Tomorrow, sailor!'] },
      { id: 'nell', name: 'Nell', at: 'entrance', kind: 'request', pal: { h: '#6B3E1E', y: '#3C95DC', Y: '#2A6FB0' }, need: 'rare', reward: 8,
        ask: ['The waves sometimes wash up something rare.', 'Have you found a Rare one yet? I would love to see it.'],
        progress: () => 'Nothing rare in the row this morning. The sea takes its time.', thanks: ['A Rare critter! It practically glows.'], after: ['I will keep watching the waves.'] }
    ]);
    // Mossbrook (city): Elder Wren moves into her gym; Moss Forest keeps Ivy and Old Oak
    const wren = out.moss.find((n) => n.id === 'wren');
    out.moss = out.moss.filter((n) => n.id !== 'wren');
    Object.assign(wren, { x: 10, y: 3, dir: 'down', city: 'mossbrook', intro: ['I am Wren. This is my garden.', 'The beds take their time.'] });
    out['gym-wren'] = [wren];   // the leader waits inside the gym, behind the vines
    out.mossbrook = [
      { id: 'juniper', name: 'Herbalist Juniper', x: 8, y: 10, kind: 'shop', pal: { h: '#6B3FA0', y: '#8E5BC8', Y: '#6B3FA0' },
        lines: ['The shelf is full again. It is, every morning.'] },
      { lv: 3, id: 'sorrel', name: 'Forager Sorrel', x: 11, y: 11, dir: 'down', kind: 'trainer', trainer: true, pal: { cap: true, c: '#6B8E23', y: '#C9A26A', Y: '#8A6A44' }, types: ['Bloom', 'Volt'], size: 3, stage: 2, pick: 0.5,
        intro: ['Hold on, traveler! Mossbrook greets newcomers with a battle.', 'My critters grew up on forest berries. Ready?'], winLine: 'Ha! You earned your welcome.', beatenLines: ['Tomorrow. The berries will be ripe again.'] },
      { id: 'fennel', name: 'Fennel', x: 24, y: 15, kind: 'talk', pal: { h: '#E8E8F0', y: '#C0503A', Y: '#8A3A28' },
        lines: ['Mossbrook was built around the old trees, not the other way around.', 'Wren sleeps in the garden some nights. The beds do better for it.', 'Travellers come back from the Pass with the same story and different endings.'] },
      { id: 'bryn', name: 'Bryn', x: 16, y: 16, kind: 'talk', pal: { h: '#8A5A34', y: '#FFD86B', Y: '#E0A830' },
        lines: ['I saw a shiny critter once! It sparkled like the sun on the pond.', 'My dad keeps a jar for when I find one. Not if. When.', 'My uncle walked the Ashwood twice and came out two different ways. He says it was the same way.'] }
    ];
    // Frosthold, Cinderport, Coralbay (cities): leaders move into their gyms
    const city = (zoneId, cityId, leaderId, intro0, people) => {
      const L = out[zoneId].find((n) => n.id === leaderId);
      out[zoneId] = out[zoneId].filter((n) => n.id !== leaderId);
      Object.assign(L, { x: 19, y: 8, dir: 'down', city: cityId, intro: [intro0].concat(L.intro.slice(1)) });
      out[cityId] = [L].concat(people);
    };
    city('frost', 'frosthold', 'glacia', 'I am Glacia. This is my pool.', [
      { id: 'tove', name: 'Quartermaster Tove', x: 8, y: 10, kind: 'shop', pal: { h: '#E8E8F0', y: '#4A6A9A', Y: '#2E4A66' }, lines: ['Packed for the snow. Counted twice.'] },
      { lv: 8, id: 'pike', name: 'Skier Pike', x: 15, y: 19, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#3E8EF7', y: '#DCEBFF', Y: '#8FB0D6' }, types: ['Frost', 'Tide'], size: 4, stage: 2, pick: 0.6,
        intro: ['I have been throwing snowballs at the gate since dawn. You are the first thing that threw back.', 'Well, a critter battle. Same thing up here.'], winLine: 'Brr, you are tough.', beatenLines: ['My critters need to thaw out. Tomorrow, rematch!'] },
      { id: 'hilde', name: 'Hilde', x: 24, y: 15, kind: 'talk', pal: { h: '#E8C07A', y: '#8E5BC8', Y: '#6B3FA0' }, lines: ['The palisade keeps out the wind, not the critters. They come and go as they like.', 'Some nights there is a light in the pass that is nobody\u2019s.', 'Glacia trains on the ice every morning. Her critters do not slip.'] },
      { id: 'olaf', name: 'Old Olaf', x: 16, y: 16, kind: 'talk', pal: { h: '#BDBDBD', y: '#5E97AE', Y: '#3E6E8E' }, lines: ['Every night up on the Peak, they say, someone comes to the door.', 'Before first light the shore gives back things the sea took.'] }
    ]);
    city('ember', 'cinderport', 'blaze', 'I am Blaze. This is my hearth.', [
      { id: 'bea', name: 'Bellows Bea', x: 8, y: 10, kind: 'shop', pal: { h: '#3A2A1A', y: '#8A4A2A', Y: '#6A3A2A' }, lines: ['Nothing on this shelf has ever gone cold.'] },
      { lv: 12, id: 'tamsin', name: 'Smith Tamsin', x: 30, y: 6, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#5A4A4A', y: '#FF7A45', Y: '#B83A10' }, types: ['Ember', 'Stone'], size: 4, stage: 2, pick: 0.5,
        intro: ['You walked down the forge road. That means you face my anvil first!', 'Let us see if your critters are tempered.'], winLine: 'Forged in fire!', beatenLines: ['The forge needs to cool. Come back tomorrow.'] },
      { id: 'cole', name: 'Cole', x: 24, y: 15, kind: 'talk', pal: { h: '#2A1A10', y: '#C0503A', Y: '#8A3A28' }, lines: ['The lava pool has a crust on it some mornings. Not today.', 'Blaze\u2019s hall is the one chimney in town that never smokes. The fire is inside.', 'The woods west of here are never quiet at dusk, and never loud either.'] },
      { id: 'ruby', name: 'Ruby', x: 16, y: 16, kind: 'talk', pal: { h: '#C0392B', y: '#FFD86B', Y: '#E0A830' }, lines: ['The miners found a shiny rock critter last week! Petra has not stopped talking.'] }
    ]);
    city('tide', 'coralbay', 'coral', 'I am Coral. This is my lamp hall.', [
      { id: 'marina', name: 'Marina', x: 8, y: 10, kind: 'shop', pal: { h: '#E8C07A', y: '#3A8A8A', Y: '#2A6A6A' }, lines: ['The crate comes back half full with every tide. It always does.'] },
      { lv: 15, id: 'rafe', name: 'Deckhand Rafe', x: 27, y: 6, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#2A5A9A', y: '#FFFFFF', Y: '#C9D3E6' }, types: ['Tide', 'Volt'], size: 4, stage: 3, pick: 0.55,
        intro: ['Ahoy! I have coiled this rope four times today. It keeps uncoiling.', 'Storm-tested critters, ready to sail.'], winLine: 'Blow me down! A fine battle.', beatenLines: ['My crew needs a rest. Come back with tomorrow\u2019s tide.'] },
      { id: 'finn', name: 'Finn', x: 24, y: 15, kind: 'talk', pal: { h: '#8A5A34', y: '#4A9A8A', Y: '#2A6A6A' }, lines: ['Coral was the youngest admiral the harbor ever had. Her critters never lose their footing.', 'Count the waves on the causeway at night. Everyone gets a different number.', 'Coral trims the harbour lamp herself. She says the one on the Peak is the only lamp she has never seen lit.'] },
      { id: 'pearl', name: 'Pearl', x: 16, y: 16, kind: 'talk', pal: { h: '#F4EAD6', y: '#E0A0B8', Y: '#C07898' }, lines: ['I collect shells. My brother collects critter species. He has all 48!', 'Well, he says he does.'] }
    ]);
    // the three other leaders wait inside their trial halls, like Wren
    [['glacia', 'frosthold'], ['blaze', 'cinderport'], ['coral', 'coralbay']].forEach(([id, cid]) => { const L = out[cid].find((n) => n.id === id); out[cid] = out[cid].filter((n) => n.id !== id); Object.assign(L, { x: 10, y: 3, dir: 'down' }); out['gym-' + id] = [L]; });
    // route trainers (one per route; tuned with lbal5.py against the gate's party model)
    const rt = (id, name, x, y, dir, types, size, stage, lv, pick, intro, winLine, pal) => ({ id, name, x, y, dir, kind: 'trainer', trainer: true, types, size, stage, lv, pick, pal, intro, winLine, beatenLines: ['That was a good battle. Come back tomorrow for another.'] });
    out['route-mf'] = [rt('kai', 'Mountaineer Kai', 16, 7, 'up', ['Moss', 'Frost'], 4, 2, 11, 0.55, ['The pass is steep, and so is my challenge!', 'Highland critters are tough. Prove yours are tougher.'], 'The pass is yours, then.', { cap: true, c: '#4E8A3A', y: '#E8E8F0', Y: '#A8B2C8' })];
    out['route-cm'] = [rt('elm', 'Woodcutter Elm', 16, 7, 'up', ['Ember', 'Moss'], 4, 2, 11, 0.5, ['Careful, the Ashwood still smoulders.', 'My critters grew up between the embers and the moss. Battle!'], 'You chopped right through my team.', { cap: true, c: '#8A4A2A', y: '#C9A26A', Y: '#8A6A44' })];
    out['route-fc'] = [rt('signe', 'Ice Fisher Signe', 16, 7, 'up', ['Frost', 'Tide'], 4, 3, 18, 0.5, ['Shh, you will scare the fish. Unless you want a battle?', 'Of course you do. Everyone on this coast does.'], 'Hooked and landed. You win this one.', { cap: true, c: '#3E8EF7', y: '#DCEBFF', Y: '#8FB0D6' })];
    out['route-cc'] = [rt('mako', 'Diver Mako', 16, 7, 'up', ['Tide', 'Ember'], 4, 3, 18, 0.5, ['I just surfaced from the reef. My critters are warmed up!', 'Steam and spray. Let us battle.'], 'You out-swam me!', { cap: true, c: '#2A6A6A', y: '#FF7A45', Y: '#B83A10' })];
    // new people beside the route landmarks and in town (positions are found at load: the free walkable tile nearest the hint)
    const spot = (mapId, hx, hy, taken) => {
      const Mp = M[mapId], at = (x, y) => Mp.grid[y] && ['.', ','].indexOf(Mp.grid[y][x]) !== -1, busy = (x, y) => (out[mapId] || []).some((o) => o.x === x && o.y === y) || (taken || []).some((t) => t[0] === x && t[1] === y);
      const reserved = (x, y) => mapId.indexOf('route-') === 0 && x >= 13 && x <= 19 && y >= 3 && y <= 11;
      for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = hx + dx, y = hy + dy; if (x > 3 && y > 3 && x < Mp.W - 4 && y < Mp.H - 4 && at(x, y) && !busy(x, y) && !reserved(x, y)) return [x, y]; }
      return [hx, hy];
    };
    const near = (mapId, propId, dx, dy) => { const p = (M[mapId].props || []).find((q) => q.id === propId); return p ? spot(mapId, p.x + dx, p.y + dy) : spot(mapId, 10, 10); };
    const pers = (id, name, mapId, pos, pal, lines) => { (out[mapId] = out[mapId] || []).push({ id, name, x: pos[0], y: pos[1], dir: 'down', kind: 'talk', pal, lines }); };
    pers('edda', 'Scholar Edda', 'route-mf', near('route-mf', 'ruin', 5, 1), { h: '#3A2A1A', y: '#8E5BC8', Y: '#6B3FA0' }, ['These carvings show a critter of each type around one fire. I count eight.', 'The arch is older than both towns. They grew at the two ends of its road.']);
    pers('hob', 'Charcoal Burner Hob', 'route-cm-crossing', spot('route-cm-crossing', 24, 22), { h: '#2A2A2A', y: '#6A5A48', Y: '#4A3A2A' }, ['The fire does what it likes. I only keep it company.', 'People ask whether the wood is dying. I ask whether they are.']);
    pers('isla', 'Net Mender Isla', 'route-fc-skerry', spot('route-fc-skerry', 22, 22), { h: '#C9D0DE', y: '#3A6A9A', Y: '#2A4A7A' }, ['I mend the same net every winter. It has never held a fish. It holds other things.', 'Do not mind the chair. It is not mine.']);
    pers('orrin', 'Tide Reader Orrin', 'route-cc-drowned', spot('route-cc-drowned', 11, 18), { h: '#6A5A3A', y: '#3A8A8A', Y: '#2A6A6A' }, ['I count the waves. Last night I lost count at a number I had not reached.', 'The blossoms are early this year. Or the sea is late.']);
    pers('brandt', 'Hermit Brandt', 'route-mf-cliff', spot('route-mf-cliff', 9, 14), { h: '#BDBDBD', y: '#7A6A52', Y: '#5A4A38' }, ['Oh. You came the long way, or the short one.', 'Sit if you like. The second cup is not for you, but it will not mind.']);
    pers('dell', 'Camper Dell', 'route-cm', near('route-cm', 'camp', 4, 1), { h: '#8A5A34', y: '#4FB06D', Y: '#2E6A2C' }, ['Ha, that is my camp! I only left to fill my flask at the well.', 'Smoke one way down the trail, leaves the other. I like the middle.']);
    pers('joss', 'Lamplighter Joss', 'route-fc', near('route-fc', 'lighthouse', 3, 3), { h: '#BDBDBD', y: '#C0503A', Y: '#8A3A28' }, ['I still trim the lamp every dusk. It guides nobody now, but it feels right.', 'Ice on the one hand, salt on the other. The lamp does not mind which.']);
    pers('neri', 'Beachcomber Neri', 'route-cc', near('route-cc', 'wreck', 5, 2), { h: '#E8C07A', y: '#3A8A8A', Y: '#2A6A6A' }, ['Something nests in the hull. I leave it the hull.', 'The road home is the one with the lamps. I counted them once. Now I count them every time.']);
    pers('mae', 'Gardener Mae', 'town', spot('town', 24, 18), { h: '#F4EAD6', y: '#E0A0B8', Y: '#C07898' }, ['Mind the flowers! Sproutvale is nicest in the morning.', 'There is a patch past the gate that sparkles. My mother used to stand in it and wait. She never said for what.']);
    // the Forge Below: two smiths guard the cores in the side halls (west one faces east, east one faces west), the Forgemaster waits north of the hub
    const fsp = M['dg-forge'].spots;
    out['dg-forge'] = [
      rt('dross', 'Smith Dross', fsp.guard1[0], fsp.guard1[1], 'right', ['Stone', 'Ember'], 5, 3, 16, 0.5, ['The west hall belongs to the forge, and so does the core on that pedestal.', 'Win it from me, if you can.'], 'The core is yours. The forge chose you before I did.', { h: '#3A2A1A', y: '#8A8498', Y: '#5A566A' }),
      rt('ingot', 'Smith Ingot', fsp.guard2[0], fsp.guard2[1], 'left', ['Ember', 'Volt'], 5, 3, 16, 0.5, ['East hall. One core, one smith, one battle.', 'The hammer is warmed up!'], 'A fine strike. The core is yours.', { h: '#C0392B', y: '#F5C518', Y: '#C99A00' }),
      Object.assign(rt('hale', 'Forgemaster Hale', fsp.hale[0], fsp.hale[1], 'down', ['Ember', 'Stone'], 5, 3, 18, 0.6, ['Two cores. I heard them go in.', 'My master left the hammer where it is. I never moved it.'], 'Both sockets are warm. I had not noticed.', { h: '#E8E8F0', y: '#FF8A3D', Y: '#C0503A' }), { boss: true, bonus: 10, afterLines: ['The hammer is where it was.'] })
    ];
    // the Lamp Tower's guards and the Warden (boss)
    const lsp = M['dg-lamp'].spots;
    out['dg-lamp'] = [
      rt('bex', 'Lampkeeper Bex', lsp.guard1[0], lsp.guard1[1], 'down', ['Volt', 'Stone'], 5, 3, 20, 0.5, ['Another climber. The lamp in here went out before I was born.', 'The second chamber has a keeper, and it is me.'], 'Light on your feet and on your critters. Go on.', { h: '#2A1A10', y: '#F5C518', Y: '#C99A00' }),
      rt('odo', 'Lampkeeper Una', lsp.guard2[0], lsp.guard2[1], 'down', ['Frost', 'Tide'], 5, 3, 20, 0.5, ['Cold up here, is it not? I keep the third chamber warm with battles.', 'Ready?'], 'Well fought. It is colder above.', { h: '#E8E8F0', y: '#3E8EF7', Y: '#2A5A9A' }),
      Object.assign(rt('maren', 'Warden Maren', lsp.warden[0], lsp.warden[1], 'down', ['Volt', 'Frost'], 5, 3, 18, 0.5, ['You climbed the whole way.', 'I used to stand here all night.'], 'I think I will sit down.', { h: '#C9A8FF', y: '#FFF3B0', Y: '#E0C060' }), { boss: true, bonus: 10, afterLines: ['I am still here. I find I like sitting.'] })   // she sits beside the stair (spots.warden), facing the wall: she never stands between you and the lamp
    ];
    // the Cinder Descent (the Ascent turned upside down): a cook at the camp, an old smelter by the lava bridge, and three trainers (now facing up toward the trail)
    out.descent = [
      rt('kolb', 'Smelter Kolb', 14, 23, 'up', ['Ember', 'Stone'], 3, 3, 18, 0.5, ['The second ledge is mine, climber. Or should I say descender?', 'The heat sharpens my critters. Let us see yours!'], 'Cool as slag. Go on down.', { h: '#2A1A10', y: '#D8574A', Y: '#8A3A28' }),
      rt('yara', 'Cinder Runner Yara', 17, 39, 'up', ['Ember', 'Volt'], 5, 3, 18, 0.5, ['I run this trail every morning before the vents wake up!', 'Race me, in a battle!'], 'Fast and tough. Mind the lava.', { h: '#C0392B', y: '#FFD86B', Y: '#E0A830' }),
      rt('brec', 'Slag Hauler Brec', 18, 47, 'up', ['Stone', 'Ember'], 5, 3, 18, 0.5, ['The forge is just below. The wagon goes down full and comes up full.', 'I have been hauling slag all day and I need some fun.'], 'Hm. The forge is yours to look at.', { h: '#8A5A34', y: '#6A6A86', Y: '#3E3E58' }),
      { id: 'mirel', name: 'Cook Mirel', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#E8C07A', y: '#FF8A3D', Y: '#C0503A' }, lines: ['The climbers down there sit where they can see the trail. The ash moves when nobody is walking on it.'] },
      { id: 'brand', name: 'Old Brand', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#BDBDBD', y: '#8A5A34', Y: '#5E3C22' }, lines: ['That bridge crosses a river of real lava. It was built before anyone here was born, and it has never burned.', 'Below the crater there is a forge. They say it made every blade in the land, and then it went quiet.'] }
    ];
    out.descent[3].x = near('descent', 'camp', 4, 1)[0]; out.descent[3].y = near('descent', 'camp', 4, 1)[1]; const bs = spot('descent', 11, 27); out.descent[4].x = bs[0]; out.descent[4].y = bs[1];
    // the Cold Ascent: a guide at the base camp, an old hiker by the river, and three climbers whose sight lines cross the trail
    out.ascent = [
      rt('reka', 'Climber Reka', 14, 42, 'down', ['Frost', 'Stone'], 3, 3, 18, 0.5, ['The second ledge is mine. Everybody crosses it, and everybody battles me.', 'Rope up, trainer!'], 'Good footing. Go on up.', { h: '#C0503A', y: '#5E97AE', Y: '#3E6E8E' }),
      rt('joran', 'Skier Joran', 17, 26, 'down', ['Frost', 'Dusk'], 4, 3, 18, 0.5, ['I came down this slope in nine seconds once. Think you can climb it in ten minutes?', 'Show me what you have!'], 'You climb as well as you battle.', { h: '#2A1A10', y: '#E8E8F0', Y: '#9AA3B5' }),
      rt('dag', 'Ice Climber Dag', 18, 18, 'down', ['Stone', 'Volt'], 5, 3, 18, 0.5, ['The summit is right above us. I have not been up it in years.', 'My critters have been waiting in the cold all day.'], 'Fine, fine. The summit is right there.', { h: '#8A5A34', y: '#4A4A7A', Y: '#2E2E58' }),
      { id: 'ansel', name: 'Guide Ansel', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#BDBDBD', y: '#D8574A', Y: '#8A3A28' }, lines: ['The climbers sit where they can see the trail. The snow moves when nobody is walking on it.'] },
      { id: 'marta', name: 'Old Marta', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#E8E8F0', y: '#8E5BC8', Y: '#6B3FA0' }, lines: ['The glacier river does not freeze, whatever the climbers say. The log bridge is older than my grandmother.', 'They say the beacon above once lit every road in the land. My grandmother could see it from her kitchen. She never drew the curtain.'] }
    ];
    out.ascent[3].x = near('ascent', 'camp', 4, 1)[0]; out.ascent[3].y = near('ascent', 'camp', 4, 1)[1]; const ms = spot('ascent', 11, 38); out.ascent[4].x = ms[0]; out.ascent[4].y = ms[1];
    // the Sealed Arch's guards and the Keeper (the Keeper is a boss: bonus essence on the first win, boss music)
    const dsp = M['dg-arch'].spots;
    out['dg-arch'] = [
      rt('pell', 'Delver Rook', dsp.guard1[0], dsp.guard1[1], 'down', ['Dusk', 'Moss'], 4, 2, 14, 0.5, ['The moss glows brighter where someone has walked. It is very bright tonight.', 'The seat is kept. So are its rules.'], 'You are stronger than you look. Go on.', { h: '#3A2A1A', y: '#6A6A86', Y: '#3E3E58' }),
      rt('ione', 'Delver Ione', dsp.guard2[0], dsp.guard2[1], 'down', ['Stone', 'Frost'], 4, 2, 14, 0.5, ['The lamp hall is mine. The Keeper is beyond me.', 'Show me you can hold your own first.'], 'Hm. Fair enough. The Keeper is waiting.', { h: '#BDBDBD', y: '#5E97AE', Y: '#3E6E8E' }),
      Object.assign(rt('keeper', 'Keeper Orlen', dsp.keeper[0], dsp.keeper[1], 'down', ['Dusk', 'Stone'], 5, 3, 17, 0.6, ['You found your way in. Few remember the rhyme.', 'Eight seats are warm. One is not.'], 'The fire has not moved. Everything else has.', { h: '#E8E8F0', y: '#33226E', Y: '#1E1448' }), { boss: true, bonus: 10, afterLines: ['I am still here. So is the seat.'] })
    ];
    // residents of the house interiors
    const RES = {
      'house-fennel': ['Grandma Clover', ['You are not Fennel. Sit anyway. The kettle does not mind who.', 'She said she would be back by supper. She says it every day, and every day I pour two cups.']],
      'house-moss': ['Forager Wil', ['Back before dark, like the note says.', 'Same path every day. A different basket every day.']],
      'house-bryn': ["Bryn's Dad", ['Those on the wall are all Bryn\u2019s. Every one of them is a shiny one.', 'The jar is for when. Not if.']],
      'fh-a': ['Guard Brann', ['Hm? Resting my eyes. The window does the watching.', 'A hundred winters. The marks are on the wall, if you want to count them.']],
      'fh-b': ['Trader Ylva', ['Closed for the season. Everything is folded and counted.', 'Nothing sells in a blizzard. Everything keeps.']],
      'fh-c': ['Old Ingrid', ['Soup? There is always soup.', 'I make it for twelve. There are two of us. It keeps.']],
      'cp-a': ['Smith Hal', ['Mind the anvil.', 'Banked for the night. In the morning it only needs breath.']],
      'cp-b': ['Cinda', ['The walls stay warm all night. The whole town leans on the forge.', 'I sweep every morning. The jar is this week.']],
      'cp-c': ['Miner Petra', ['Back from below. Three lamps on the hooks, four of us.', 'He will be up by supper. His lamp is still lit, down there.']],
      'cb-a': ['Keeper Morgan', ['Two roads from the top, and the sea is the third.', 'The list on the wall. One is not crossed off. The lamp stays on for that one.']],
      'cb-b': ['Old Tam', ['Nets tear. I mend them. They tear again.', 'Same knot ten thousand times. The sea has never once noticed.']],
      'cb-c': ['Pearl\u2019s Mum', ['Pearl is out on the shore again.', 'Every shell on that shelf came back from somewhere. The gap is for the next one.']]
    };
    out['in-home'] = [{ id: 'mom', name: 'Mom', x: 6, y: 4, dir: 'down', kind: 'talk', pal: { h: '#8A5A34', y: '#D8574A', Y: '#A8382E' }, lines: ['Welcome home, sweetie! Did you eat?', 'Your trainer records are on the desk. I keep them tidy for you.'] }];
    out['in-lab'] = [{ id: 'remy', name: 'Lab Aide Remy', x: 3, y: 5, dir: 'down', kind: 'talk', pal: { h: '#3A2A1A', y: '#E8EEF8', Y: '#9AA3B5' }, lines: ['Professor Fern is usually just outside, greeting new trainers.', 'The terminal keeps every name. It has never lost one.'] }];
    const RPAL = [{ h: '#8A5A34', y: '#C0503A', Y: '#8A3A28' }, { h: '#E8E8F0', y: '#4A6A9A', Y: '#2E4A66' }, { h: '#3A2A1A', y: '#4FB06D', Y: '#2E6A2C' }, { h: '#C0392B', y: '#E0A0B8', Y: '#C07898' }];
    Object.keys(RES).forEach((pid, i) => { out['in-' + pid] = [Object.assign({ id: 'res-' + pid, name: RES[pid][0], x: 7, y: 3, dir: 'down', kind: 'talk', pal: RPAL[i % RPAL.length], lines: RES[pid][1] }, pid === 'house-moss' ? { x: 4, y: 5, late: true } : {})]; });   // Wil is home only from dusk (the note on the door): `late` is read by the 500 ms rules
    const RT_BEATEN = { 'route-mf': 'Tomorrow. The wind will have changed by then.', 'route-cm': 'Tomorrow. The embers will still be going.', 'route-fc': 'Tomorrow, with the tide.', 'route-cc': 'Tomorrow. The steam is the same every day; I am not.', ascent: 'Tomorrow. The snow will have filled your tracks.', descent: 'Tomorrow. The vents will still be going.', 'dg-forge': 'Tomorrow. The hammer needs a rest.', 'dg-lamp': 'Tomorrow. I do not go far.', 'dg-arch': 'Tomorrow. The moss will still be glowing.' };   // 02-F19: one voice per place
    Object.keys(RT_BEATEN).forEach((mid) => (out[mid] || []).forEach((n) => { if (n.trainer && n.beatenLines && n.beatenLines[0] === 'That was a good battle. Come back tomorrow for another.') n.beatenLines = [RT_BEATEN[mid]]; }));
    Object.values(out).forEach((list) => list.forEach((n) => { if (n.trainer) n.reward = 3 + 2 * n.size + (n.stage - 1) * 2; if (n.leader) n.reward = 10; }));
    return out;
  }
  const NEEDS = {
    species5: (g) => (g.state.seen || []).length >= 5,
    stone: (g) => g.state.caught.some((e) => g.make(e.seed, 1).element.name === 'Stone'),
    evolved: (g) => g.state.caught.some((e) => e.stage >= 2),
    rare: (g) => g.state.caught.some((e) => { const r = g.make(e.seed, 1).rarity; return r === 'Rare' || r === 'Mythic'; })
  };
  // ---------- dialogue ----------
  let dlg = null;
  function showDialog(name, lines, choices, onEnd) {
    dlg = { name: name, lines: lines, i: 0, shown: 0, choices: choices || null, onEnd: onEnd, timer: null };
    lastOpener = lastOpener || document.activeElement;
    WORLD.setPaused(true); $('hud').hidden = true; $('dlg').hidden = false; $('dlg-name').textContent = name;
    typeLine();
  }
  function typeLine() {
    const text = dlg.lines[dlg.i]; dlg.shown = 0; $('dlg-choices').hidden = true; $('dlg-more').hidden = true;
    $('dlg-text').textContent = ''; $('dlg-live').textContent = text;
    clearInterval(dlg.timer);
    const calm = game.state.settings && game.state.settings.calm;
    if (calm) { dlg.shown = text.length; finishLine(); return; }
    dlg.timer = setInterval(() => { dlg.shown = Math.min(text.length, dlg.shown + 2); $('dlg-text').textContent = text.slice(0, dlg.shown); if (dlg.shown >= text.length) finishLine(); }, 28);
    $('dlg-box').focus();
  }
  function finishLine() {
    clearInterval(dlg.timer); const text = dlg.lines[dlg.i]; dlg.shown = text.length; $('dlg-text').textContent = text;
    const last = dlg.i === dlg.lines.length - 1;
    if (last && dlg.choices) {
      $('dlg-choices').innerHTML = dlg.choices.map((c, i) => '<button data-c="' + i + '">' + c.label + '</button>').join('');
      $('dlg-choices').hidden = false; const first = $('dlg-choices').querySelector('button'); if (first) first.focus();
    } else $('dlg-more').hidden = false;
  }
  function advance() {
    if (!dlg) return;
    if (dlg.shown < dlg.lines[dlg.i].length) { finishLine(); return; }
    if (dlg.i < dlg.lines.length - 1) { dlg.i++; typeLine(); return; }
    if (dlg.choices) return;
    endDialog();
  }
  function endDialog(next) {
    if (!dlg) return; const cb = dlg.onEnd; clearInterval(dlg.timer); dlg = null; $('dlg').hidden = true;
    if (next) { next(); return; }
    $('hud').hidden = false; WORLD.setPaused(false);
    if (cb) cb();
  }
  // ---------- adventure: clues, objects, the Sealed Arch (content in adventure.js) ----------
  const advOf = () => { const a = (game && game.state.adv) || {}; return { clues: a.clues || [], open: a.open || {}, flags: a.flags || {} }; };
  function advSave(mut) { const a = advOf(), n = { clues: a.clues.slice(), open: Object.assign({}, a.open), flags: Object.assign({}, a.flags) }; mut(n); game.update({ adv: n }); try { setNear(WORLD.nearest()); } catch (e) {} }   // refresh the action label (e.g. Examine -> Enter)
  // the lantern road (Meaning: the road is kept open by people you never meet): at dusk and night the post just ahead of you is lit, and when you reach it the next one is; the ones behind go dark. Posts ease in and out, so it looks lit by someone.
  const lampK = {}, DAY_POST = 0.35; let trailDir = {}; let lampStamp = 0, lampDt = 0;   // DAY_POST: how far the post ahead burns by day (0.35 to 0.5, the phone picks; review 11 item 11)
  function lampState(o) {
    const M = WORLD.map, tr = M && M.trail, now = performance.now(); if (now - lampStamp > 5) { lampDt = Math.min(0.1, (now - lampStamp) / 1000); lampStamp = now; } const dt = lampDt; let want = 0;
    const tod = timeOfDay(), dark = tod === 'night' || tod === 'dusk';
    const mine = o.own || (!o.wave && !o.always && !!advOf().flags.lampLit);   // after the beacon no lamp lights itself ahead of you: a post lights when you pass it and stays lit (the roads are kept by you now)
    if (o.day) want = o.id === 'gate-lamp' ? gateLampWant() : 1;   // lit by day as well: the road someone keeps for you (the gate lamp goes out in the night of darkness, and after the lamp burns only on a day you lit the window)
    else if (o.always) want = dark ? 1 : 0;
    else if (mine) {
      const f = advOf().flags, key = 'own:' + o.id;
      if (!f[key] && tr) { const P = WORLD.pos(), px = P.x / 32, py = P.y / 32; let pi = 0, bd = 1e9; tr.cells.forEach((c, i) => { const d = (c[0] - px) * (c[0] - px) + (c[1] - py) * (c[1] - py); if (d < bd) { bd = d; pi = i; } }); if (bd < 36 && pi >= o.trail) { advSave((a) => { a.flags[key] = true; }); game.sfx('post'); } }   // your keeping heard once per post
      want = advOf().flags[key] && (!advOf().flags.lampLit || homeLitNow()) ? 1 : 0;   // after the lamp, the posts you keep burn only on a day the window is lit (the Ascent's own posts still light as you pass before it)
    }
    else if (o.wave) want = (Math.floor(now / 1100) % (o.wave.n + 3) === o.wave.i || Math.floor(now / 1100) % (o.wave.n + 3) === o.wave.i + 1) ? (dark ? 1 : 0.5) : 0;   // the wave runs by day too, at half (review 11 item 11: the road is kept whatever hour you play)
    else if (tr) {
      const P = WORLD.pos(), px = P.x / 32, py = P.y / 32; let pi = 0, bd = 1e9; tr.cells.forEach((c, i) => { const d = (c[0] - px) * (c[0] - px) + (c[1] - py) * (c[1] - py); if (d < bd) { bd = d; pi = i; } });
      if (trailDir[M.id] === undefined) trailDir[M.id] = pi < tr.cells.length / 2 ? 1 : -1;
      const dir = trailDir[M.id]; let next = null; tr.lamps.forEach((li) => { const ahead = (li - pi) * dir; if (ahead > 2 && (next === null || ahead < (next - pi) * dir)) next = li; });
      want = next === o.trail ? (dark ? 1 : DAY_POST) : 0;   // by day the post ahead burns low (review 03-F14): the road is kept whether or not you play at night
    }
    const k = lampK[o.id] === undefined ? want : lampK[o.id]; lampK[o.id] = k + Math.sign(want - k) * Math.min(Math.abs(want - k), dt * 1.6); return { k: lampK[o.id] };
  }
  function APP_FOLLOWER() {
    const st = game.state; if (!st.caught.length || window.__noFollower) return null;   // window.__noFollower is a test hook (the older turn-based suites)
      const seeds = game.partySeeds(), sd = st.caught.some((e) => e.seed === st.fighter) ? st.fighter : (seeds[0] || st.caught[0].seed), e = st.caught.find((c) => c.seed === sd);
      const key = sd + ':' + (e ? e.stage : 1);
      if (!folCache || folCache.key !== key) { const k = game.make(sd, e ? e.stage : 1), img = new Image(); img.src = PIX.sprite(k, 'icon'); const per = { down: img }; folCache = { key: key, img: img, shiny: !!k.shiny, imgFor: (d) => { if (!per[d]) { const im = new Image(); im.src = PIX.sprite(k, 'icon', d); per[d] = im; } return per[d].complete && per[d].naturalWidth ? per[d] : img; } }; }   // one image per facing, made the first time that facing is needed
      return folCache;
  }
  // the window at Home: kept lit for you at the very start and once you tend three fires; dark from the fourth fire until the lamp (the night of darkness); after the lamp, lit only by you, each day
  const today = () => new Date().toDateString();
  const keptDark = () => sealCount() >= 4 && !advOf().flags.lampLit;   // Meaning: the one time help leaves and it hurts, placed where it sends you up (the Ascent is the one road that opens)
  function homeLitNow() { const f = advOf().flags; return f.lampLit ? f.homeLit === today() : (!keptDark() && (sealCount() >= 3 || game.state.caught.length <= 1)); }
  // the gate lamp by day: kept for you until the night of darkness; after the lamp it burns only on a day you lit the window
  const gateLampWant = () => (advOf().flags.lampLit ? (homeLitNow() ? 1 : 0) : (keptDark() ? 0 : 1));
  // the window as the daily act (Meaning: what you keep is kept only while you keep it): after the lamp the sill lamp takes while you stay beside it (the chamber rule, no button, no dialog); lit, it is the land's answer for the day
  let wlK = 0, wlStamp = 0;
  const hasWick = () => game.state.caught.some((e) => e.seed === SECRET2_SEED);
  function windowlampState(o) {
    const f = advOf().flags, t = timeOfDay();
    if (!f.lampLit) return { lit: homeLitNow() || (!keptDark() && (t === 'night' || t === 'dusk')) ? 1 : 0 };   // before the lamp: kept for you (never during the night of darkness)
    if (f.homeLit === today()) return { lit: 1, wick: !hasWick() };   // wick: Wickling asleep on the sill the first morning the window is lit (package W draws it; touching it is the hand-over)
    const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - wlStamp) / 1000)); wlStamp = now;
    const P = WORLD.pos(), d = Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5)), near = d <= CL_REACH && !WORLD.moving();
    wlK = near ? Math.min(1, wlK + dt / CL_S) : Math.max(0, wlK - dt * 0.8);
    if (wlK >= 1) { wlK = 0; advSave((a) => { a.flags.homeLit = today(); }); game.sfx('light'); musicLoop(); }   // `light` and the lead returning to `town` belong to package S
    return { lit: 0, k: wlK };   // k 0..1: the glow forming (package W may draw it)
  }
  function objState(o) { const a = advOf(); if (o.id === 'names') return { n: game.ladderStep() }; /* the rail: one mark per step climbed */ if (o.kind === 'postlamp') return lampState(o); if (o.kind === 'gbed') return bedState(o); if (o.kind === 'gbrazier') return brazierState(o); if (o.kind === 'callamp') return callampState(o); if (o.kind === 'chamberlamp') return chamberlampState(o); if (o.kind === 'sprouts') return { stage: sealCount() }; if (o.kind === 'windowlamp') return windowlampState(o); if (o.kind === 'seat') return seatState(o); if (o.kind === 'statue') return { lit: ADV.TYPES.indexOf(o.type) < seatLit }; /* the statues' braziers come up one by one while someone sits in the ninth seat (package W draws it) */ if (o.kind === 'brazier' && o.id.length === 3 && o.id.indexOf('fr') === 0 && o.id < 'fr6') return { cold: !a.flags.forgeLit }; /* the Forge's braziers fr0..fr5 are cold until the furnace is lit; the two by the door stay lit (package W draws the coals) */ if (o.kind === 'growthpost') return { n: 1 + sealCount() }; if (o.kind === 'critterbasket') { const fl = APP_FOLLOWER(); return { img: fl ? fl.img : null }; } if (o.kind === 'harborlamp') { const t = timeOfDay(); return { lit: t === 'night' || t === 'dusk' }; } if (o.kind === 'hearth') return { logs: 1 + (Math.floor(Date.now() / 86400000) % 3) }; if (o.kind === 'moored') { const t = timeOfDay(); return { lit: t === 'night' || t === 'dusk' }; } if (o.kind === 'camp') { const t = timeOfDay(); return { dark: t === 'night' || t === 'dusk' }; } if (o.id === 'beacon-door') return { open: true, glow: a.flags.lampLit ? 4 : 2, lit: !!a.flags.lampLit }; if (o.kind === 'plaque') return { open: !!a.open.arch, glow: o.id === 'arch' ? a.clues.length : 0 }; if (o.kind === 'chest') return { open: !!a.flags['chest:' + o.id] }; if (o.order !== undefined) return { lit: (a.flags.rite || []).indexOf(o.order) !== -1 }; if (o.kind === 'lever') return { on: !!a.flags['lv:' + o.id] }; if (o.kind === 'greatlamp') return { lit: !!a.flags.lampLit }; if (o.kind === 'socket') return { on: !!a.flags['sock:' + o.core] }; if (o.kind === 'furnace') return { lit: !!a.flags.forgeLit }; return {}; }
  function gainClue(c) {
    if (advOf().clues.indexOf(c.id) !== -1) return;
    advSave((a) => { a.clues.push(c.id); }); game.sfx('claim');
    toast('You will remember this. (Journal)');
  }
  function journal() {
    const have = advOf().clues, lines = ['Clues about the Sealed Arch: ' + have.length + ' of ' + ADV.CLUES.length + '.'];
    ADV.CLUES.forEach((c) => lines.push(have.indexOf(c.id) !== -1 ? c.note : 'Something on ' + c.where + ' you have not looked at closely.'));
    if (advOf().open.arch) { const f = advOf().flags; lines.push('The Sealed Arch: ' + (f.rubble ? 'the way north is clear.' : 'rubble blocks the way north.') + (((game.state.npc && game.state.npc.cleared) || []).indexOf('keeper') !== -1 ? ' You have beaten the Keeper.' : '') + (advOf().flags.secret ? ' The ninth seat has answered.' : '')); }
    if (advOf().open.forge) { const f = advOf().flags; lines.push('The Forge Below: ' + (f.forgeLit ? 'the great furnace is lit.' : 'the north gate is shut.')); } else if ((game.state.visited || []).indexOf('descent') !== -1) lines.push('The Cinder Descent leads down to a buried forge.');
    if (advOf().open.lamp) lines.push('The Lamp Tower: ' + (advOf().flags.lampLit ? 'the great lamp is lit.' : 'dark chambers, a lamp on a stand in each.')); else if ((game.state.visited || []).indexOf('ascent') !== -1) lines.push('The Cold Ascent climbs north from Frosthold.');
    showDialog('Journal', lines);
  }
  function archUse() {
    const a = advOf();
    if (a.open.arch) { game.sfx('tap'); WORLD.go('dg-arch'); return; }
    if (a.clues.length < ADV.CLUES.length) { const ruin = ADV.CLUES.find((c) => c.id === 'ruin'); showDialog('The old arch', SAY.archCold, null, () => gainClue(ruin)); return; }   // looking at the carvings is the first clue
    showDialog('The old arch', SAY.archOpen, null, () => { advSave((x) => { x.open.arch = true; }); game.sfx('claim'); setTimeout(() => { game.sfx('claim'); WORLD.go('dg-arch'); }, 200); });
  }
  function chestUse(o) {
    const key = 'chest:' + o.id; if (advOf().flags[key]) { toast('The chest is empty.'); return; }
    const r = o.reward || {}, bag = Object.assign({}, game.state.bag), parts = [];
    Object.keys(r).forEach((k) => { if (k === 'ticket') return; if (k === 'essence') parts.push(r[k] + ' essence'); else { bag[k] = (bag[k] | 0) + r[k]; parts.push(r[k] + ' ' + ({ potion: 'Potion', super: 'Super Potion', charm: 'Rare Charm', ticket: 'Roll Ticket' }[k] || k) + (r[k] > 1 ? 's' : '')); } });
    advSave((a) => { a.flags[key] = true; }); game.update({ bag: bag, essence: (game.state.essence || 0) + (r.essence | 0) }); game.sfx('claim');
    toast('You open the chest: ' + parts.join(' and ') + '!');
  }
  // the rite: light the fire bowl, the lamp and the hull's lantern in that order (the camp rhyme); a wrong order puts them all out again (nothing is lost)
  function riteUse(o) {
    const a = advOf(); if (a.flags.rubble) { toast('The light burns steady.'); return; }
    const seq = (a.flags.rite || []).slice();
    if (seq.indexOf(o.order) !== -1) { toast('It is already lit.'); return; }
    if (o.order === seq.length) {
      seq.push(o.order); advSave((x) => { x.flags.rite = seq; }); game.sfx('rite', o.order);   // fire bowl D4, lamp F4, hull A4: the Arch's own key
      if (seq.length === 3) { toast('The hull\u2019s lantern catches. The empty seat flares gold, and far to the north stone grinds aside.'); setTimeout(() => { advSave((x) => { x.flags.rubble = true; }); applyDungeon(); game.sfx('seat'); game.sfx('light'); }, 700); }
      else toast(seq.length === 1 ? 'The fire bowl catches. One light burns.' : 'The lamp wakes. Two lights burn.');
    } else {
      advSave((x) => { x.flags.rite = []; }); game.sfx('douse');
      toast('The lights gutter out.');   // the order is the road's own order (fire, lamp, hull); a player who walked it knows
    }
  }
  // clear the rubble once the rite is done (also on load)
  function applyDungeon() { const m = WORLD.MAPS['dg-arch']; if (!m || !advOf().flags.rubble) return; const rb = (m.objects || []).filter((x) => x.rubble); if (rb.length) WORLD.openTiles('dg-arch', m.rubble, rb.map((x) => x.id)); }
  // the ninth seat (Meaning: the one left out is counted by someone sitting there): once the Keeper has let you pass, sit in the seat and STAY (the chamber rule, CL_S);
  // the statues' braziers come up one by one as you stay (seatLit 0..8), the crown is not taken, and Veilcrown joins you as before
  let seatK = 0, seatLit = 0, seatStamp = 0;
  function seatState(o) {
    const a = advOf(), got = game.state.caught.some((e) => e.seed === SECRET_SEED) || a.flags.secret;
    if (got) { seatLit = 8; return { k: 1, lit: 8, done: true }; }
    const beaten = ((game.state.npc && game.state.npc.cleared) || []).indexOf('keeper') !== -1;   // the Keeper stays the guard before the fire
    const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - seatStamp) / 1000)); seatStamp = now;
    const P = WORLD.pos(), d = Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5)), near = beaten && d <= CL_REACH && !WORLD.moving();
    seatK = near ? Math.min(1, seatK + dt / CL_S) : Math.max(0, seatK - dt * 0.8); seatLit = Math.floor(seatK * 8);
    if (seatK >= 1) { seatK = 0; showDialog('The ninth seat', SAY.seat, null, () => grantSecret(SECRET_SEED)); }
    return { k: seatK, lit: seatLit, done: false };
  }
  // a secret critter joins you (level by SECRETS); quiet = nothing said or played (Slagback stays, unannounced; the dev tools)
  function grantSecret(seed, quiet) {
    seed = seed || SECRET_SEED; const S = SECRETS[seed];
    if (!S || game.state.caught.some((e) => e.seed === seed)) return;
    advSave((a) => { a.flags[S.flag] = true; });
    game.update({ caught: game.state.caught.concat([{ seed: seed, stage: 3, lv: S.lv }]) });
    if (quiet) return;
    toast(S.name + ' joined you!');
    game.sfx('mythic'); game.buzz([30, 40, 30, 40, 30, 40, 160]);
    setTimeout(() => { openScreen('dex'); game.setState({ selected: seed, dexView: 'mine', armed: false }); }, 900);   // openScreen clears the selection, so select after opening
  }
  // ---- the Lamp Tower: levers flip gates (open = an odd number of its levers are ON), the beacon door leads in, the great lamp ends the climb ----
  // the Lamp Tower (Meaning: the way home is lit by you): a gate opens once the lamp of its chamber has been kept; a lamp takes while you stay beside it (about CL_S seconds), and a kept lamp is saved. Lighting the beacon counts every lamp as kept (old saves).
  const CL_S = 2.4, CL_REACH = 1.9; let clK = {}, clStamp = 0, clTick = {}, clPeak = {};   // CL_S per lamp: a lamp may carry its own `cl` seconds (the great lamp GL: 6 s). The numbers belong to package M.
  const GL_BELOW = ['L1', 'L2', 'L3'];
  const lampKept = (id) => !!(advOf().flags['cl:' + id] || advOf().flags.lampLit);
  const glReady = () => GL_BELOW.every(lampKept);   // the great lamp lights only from the three kept below it, checked before anything else (no Warden, no button)
  // the last act (Meaning: you no longer need it kept for you): the great lamp takes after the longest stay of the game; nothing is given, one line, the beam, silence, then the lit arrangement (package S)
  let hushUntil = 0;
  function greatLampLit() {
    advSave((a) => { a.flags.lampLit = true; a.flags['cl:GL'] = true; a.flags.litOn = today(); a.flags.dayAt = today(); });   // litOn: the title "The lamp was lit" appears the next morning; dayAt: tomorrow's first load begins at Home
    WORLD.gust(); hushUntil = performance.now() + 2400; if (typeof MUSIC !== 'undefined') MUSIC.play(null); game.sfx('light');   // silence, `light`, then `dg-lamp@lit` from musicTrack: package S
    setTimeout(() => { if (!dlg) showDialog('The great lamp', SAY.greatLamp); }, 700);
  }
  function applyLamp() { const m = WORLD.MAPS['dg-lamp']; if (!m || !m.gates) return; Object.keys(m.gates).forEach((gid) => WORLD.setGate('dg-lamp', gid, m.gates[gid].every(lampKept))); }
  function chamberlampState(o) {
    if (lampKept(o.id)) return { lit: 1 };
    if (o.id === 'GL' && !glReady()) return { lit: 0 };   // a dark glass until the three below burn
    const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - clStamp) / 1000)); clStamp = now;
    const P = WORLD.pos(), d = Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5)), near = d <= CL_REACH && !WORLD.moving();
    const k0 = clK[o.id] || 0; let k = near ? Math.min(1, k0 + dt / (o.cl || CL_S)) : Math.max(0, k0 - dt * 0.8); clK[o.id] = k;
    if (k > k0 && k < 1) { clPeak[o.id] = Math.max(clPeak[o.id] || 0, k); if (now - (clTick[o.id] || 0) >= 600) { clTick[o.id] = now; game.sfx('tick', 392 + 392 * k); } }   // the stay heard growing
    else if (k < k0) { if (k === 0) { if ((clPeak[o.id] || 0) > 0.3) game.sfx('gutter'); clPeak[o.id] = 0; } clTick[o.id] = 0; }   // the withdrawal felt: a lamp that had taken gutters out
    if (k >= 1) { if (o.id === 'GL') greatLampLit(); else { advSave((a) => { a.flags['cl:' + o.id] = true; }); applyLamp(); game.sfx('light'); } }
    return { lit: k };
  }
  // ---- Wren's Gym: the trial of being tended (Meaning: you grew because someone stayed with you). Press Tend by a seedling, then STAY: it grows about one stage per 2.5 s, two stages to bloom.
  // Step away and it stops, keeping what it grew (a stage is saved the moment it is reached, nothing is ever lost). All four in bloom and the vines draw back. Old saves (Wren beaten, or her seal) find the way open. ----
  const BED_STAGE_S = 2.5, BED_REACH = 1.9, BED_WAIT_S = 0.6; let tending = null, tendP = 0, tendStamp = 0, tendTick = 0, bedNear = {};   // BED_WAIT_S: in reach, still, this long, and the bed is being tended (no button)
  function gymOpen(id) { const f = advOf().flags, npc = game.state.npc || {}; return !!f['gym:' + id] || (npc.cleared || []).indexOf(id) !== -1 || (npc.seals || []).indexOf(id) !== -1; }
  function gymWrenOpen() { return gymOpen('wren'); }
  function applyGym() {
    tending = null; carry = false; coralReset();
    ['wren', 'glacia', 'blaze', 'coral'].forEach((id) => { if (WORLD.MAPS['gym-' + id]) WORLD.setGate('gym-' + id, id, gymOpen(id)); });
    const G = WORLD.MAPS['gym-glacia']; if (G && G.pool) { const cells = []; for (let y = G.pool[1]; y <= G.pool[3]; y++) for (let x = G.pool[0]; x <= G.pool[2]; x++) cells.push([x, y]); if (gymOpen('glacia')) WORLD.setTiles('gym-glacia', cells, '.'); else { WORLD.setTiles('gym-glacia', cells, '~'); iceCells = []; stillT = 0; } }   // the whole pool is frozen for good once the trial is done
  }
  function gymDone(id, line) {
    advSave((x) => { x.flags['gym:' + id] = true; }); applyGym(); game.sfx('claim'); if (line) { toast(line); setTimeout(() => toast(line), 900); }
    // the seal (Meaning: the fire you tended is the seal; the leader lets go): granted here, the moment the trial is kept, never by a knockout count
    const npc = Object.assign({ done: [], beaten: {}, cleared: [], seals: [] }, game.state.npc);
    if ((npc.seals || []).indexOf(id) === -1) { npc.seals = (npc.seals || []).concat([id]); game.update({ npc: npc }, [{ t: 'leader' }]); }
  }
  // ---- Glacia's Gym: the trial of stillness. Ice forms on the water around you only while you stand still; what you leave behind melts when you move on; the plate under you never melts. ----
  const STILL_S = 1.2; let iceCells = [], stillT = 0, stillStamp = 0;   // 1.2 s of standing still before the ice takes (review copy; 1.6 if Dan's thumb says it still stutters). APP.stillK() is the forming ratio for the drawing.
  setInterval(() => {
    const M = WORLD.map; if (!M || M.id !== 'gym-glacia' || gymOpen('glacia')) return;
    const now = performance.now(), dt = Math.min(0.3, (now - stillStamp) / 1000); stillStamp = now;
    const P = WORLD.pos(), tx = Math.floor(P.x / 32), ty = Math.floor(P.y / 32), near = (c) => Math.max(Math.abs(c[0] - tx), Math.abs(c[1] - ty)) <= 1;
    if (WORLD.moving()) {
      stillT = 0; const melt = iceCells.filter((c) => !near(c)); if (melt.length) { WORLD.setTiles('gym-glacia', melt, '~'); iceCells = iceCells.filter(near); game.sfx('melt'); }
    } else {
      stillT += dt;
      if (stillT >= STILL_S) { const grow = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, y = ty + dy; if (M.grid[y] && M.grid[y][x] === '~') grow.push([x, y]); } if (grow.length) { WORLD.setTiles('gym-glacia', grow, '.'); iceCells = iceCells.concat(grow); game.sfx('ice'); } }
    }
    if (ty <= 8 && M.pool && ty < M.pool[1]) gymDone('glacia', 'The pool goes still, and stays.');   // the far shore
  }, 100);
  // ---- Blaze's Gym: the fire that has to be fed. Carry one log at a time from the woodpile; a brazier burns down in BURN_S seconds; all three alight at once opens the way. ----
  const BURN_S = 18; let carry = false, burn = {}, burnStamp = 0;   // a brazier burns down in 18 s (review copy: feeding is not hurrying)
  function brazierState(o) {
    const now = performance.now(), dt = Math.min(0.2, Math.max(0, (now - burnStamp) / 1000)); burnStamp = now;
    if (gymOpen('blaze')) return { burn: 1 };
    Object.keys(burn).forEach((k) => { const b0 = burn[k], b = Math.max(0, b0 - dt / BURN_S); burn[k] = b; if (b0 > 0.25 && b <= 0.25) game.sfx('gutter'); else if (b0 > 0 && b === 0) game.sfx('out'); });   // the fire heard dying
    return { burn: burn[o.id] || 0 };
  }
  function woodUse() { if (carry) { toast('You already carry one.'); return; } carry = true; game.sfx('log'); toast('You take a log.'); }
  function brazierUse(o) {
    if (gymOpen('blaze')) { toast('It burns steadily.'); return; }
    if (!carry) { toast((burn[o.id] || 0) > 0 ? 'It is burning down.' : 'It is cold.'); return; }
    carry = false; burn[o.id] = 1; game.sfx('feed'); toast('The fire takes it.');
    const M = WORLD.MAPS['gym-blaze']; if ((M.objects || []).filter((q) => q.kind === 'gbrazier').every((q) => (burn[q.id] || 0) > 0)) gymDone('blaze', 'Three fires. The slag cracks.');
  }
  // ---- Coral's Gym: answering across the dark. The lamps light in an order (the call), go out, and you touch them in that order (the answer); three rounds, one lamp longer each time. ----
  const CORAL_SEQ = [[2, 0, 4], [1, 3, 0, 2], [4, 1, 3, 0, 2]], CALL_STEP = 0.7;
  let coral = { round: 0, phase: 'idle', i: 0, t: 0, lit: {}, answered: [], slow: false }, coralStamp = 0;
  function coralReset() { coral = { round: 0, phase: 'idle', i: 0, t: 0, lit: {}, answered: [], slow: false }; }
  function coralCall() { coral.phase = 'call'; coral.i = -1; coral.t = 0; coral.answered = []; coral.lit = {}; }
  const callStep = () => (coral.slow ? 1.0 : CALL_STEP);   // after a wrong answer the call comes again, slower
  setInterval(() => {
    const M = WORLD.map; if (!M || M.id !== 'gym-coral' || gymOpen('coral')) return;
    const now = performance.now(), dt = Math.min(0.2, (now - coralStamp) / 1000); coralStamp = now; coral.t += dt; const seq = CORAL_SEQ[coral.round];
    if (coral.phase === 'idle' && coral.t > 1.2) coralCall();
    else if (coral.phase === 'call') { const CS = callStep(), k = Math.floor(coral.t / CS); coral.lit = {}; if (k < seq.length) { coral.lit[seq[k]] = (coral.t % CS) < CS * 0.8 ? 1 : 0; if (k !== coral.i) { coral.i = k; game.sfx('lamp', seq[k]); } } else if (coral.t > seq.length * CS + 0.6) { coral.phase = 'listen'; coral.t = 0; coral.lit = {}; } }   // the call is heard: each lamp has its note
    else if (coral.phase === 'listen') { Object.keys(coral.lit).forEach((k) => { coral.lit[k] = Math.max(0, coral.lit[k] - dt * 2.5); }); if (coral.t > 9 && !coral.answered.length) { coral.phase = 'idle'; coral.t = 0; } }
    else if (coral.phase === 'wrong') { const on = Math.floor(coral.t / 0.3) % 2 === 0 && coral.t < 1.2; coral.lit = { 0: on ? 1 : 0, 1: on ? 1 : 0, 2: on ? 1 : 0, 3: on ? 1 : 0, 4: on ? 1 : 0 }; if (coral.t > 1.8) coralCall(); }
    else if (coral.phase === 'right') { coral.lit = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; if (coral.t > 1.4) { coral.round += 1; coral.slow = false; if (coral.round >= CORAL_SEQ.length) { gymDone('coral', 'The lamps stay lit. The chain falls.'); } else coralCall(); } }
  }, 50);
  function lampUse(o) {
    if (gymOpen('coral')) { toast('It stays lit.'); return; }
    if (coral.phase !== 'listen') { if (coral.phase === 'call') toast('It is still speaking.'); return; }
    const seq = CORAL_SEQ[coral.round]; coral.lit[o.n] = 1; game.sfx('lamp', o.n);   // the answer in the lamp's own note
    if (seq[coral.answered.length] === o.n) { coral.answered.push(o.n); coral.t = 0; if (coral.answered.length === seq.length) { coral.phase = 'right'; coral.t = 0; setTimeout(() => game.sfx('right'), 300); } }
    else { coral.phase = 'wrong'; coral.t = 0; coral.slow = true; setTimeout(() => game.sfx('wrong'), 300); }
  }
  function callampState(o2) { return { lit: gymOpen('coral') ? 1 : (coral.lit[o2.n] || 0) }; }
  const bedStage = (o) => (gymWrenOpen() ? 2 : (advOf().flags['wb:' + o.id] | 0));
  function bedState(o) {   // called every frame the bed is drawn: this is where growth happens
    const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - tendStamp) / 1000)); if (tending === o.id) tendStamp = now;
    let stage = bedStage(o), p = 0;
    if (tending === null && stage < 2 && !gymWrenOpen()) {   // the stay begins by itself after BED_WAIT_S beside the bed
      const P = WORLD.pos(), d = Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5)), dt2 = Math.min(0.1, Math.max(0, (now - (bedNear.stamp || now)) / 1000)); bedNear.stamp = now;
      if (d <= BED_REACH && !WORLD.moving()) { bedNear[o.id] = (bedNear[o.id] || 0) + dt2; if (bedNear[o.id] >= BED_WAIT_S) { bedNear[o.id] = 0; tending = o.id; tendP = 0; tendStamp = now; } } else bedNear[o.id] = 0;
    }
    if (tending === o.id && stage < 2) {
      const P = WORLD.pos(), d = Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5));
      if (d > BED_REACH) { tending = null; tendP = 0; }   // you walked away: it stops, quietly
      else {
        tendP += dt / BED_STAGE_S;
        if (now - tendTick >= 800) { tendTick = now; game.sfx('tend', 262 + 130 * tendP); }   // the stay heard growing
        if (tendP >= 1) { tendP = 0; stage += 1; const key = 'wb:' + o.id; advSave((x) => { x.flags[key] = stage; }); game.sfx(stage >= 2 ? 'bloom' : 'sprout');
          if (stage >= 2) { tending = null; const M = WORLD.MAPS['gym-wren'], all = (M.objects || []).filter((q) => q.kind === 'gbed').every((q) => (advOf().flags['wb:' + q.id] | 0) >= 2);
            if (all) gymDone('wren', null); } }   // no toast: the vines drawing back is the statement
        p = tendP;
      }
    }
    return { stage: stage, p: p, tending: tending === o.id };
  }
  // growth happens in bedState (every frame the bed is drawn); walking so far that the bed leaves the screen must end the tending too, so a timer checks the distance as well
  setInterval(() => { if (!tending || !WORLD.map || WORLD.map.id !== 'gym-wren') { tending = null; return; } const o = (WORLD.map.objects || []).find((q) => q.id === tending); if (!o) { tending = null; return; } const P = WORLD.pos(); if (Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5)) > BED_REACH) { tending = null; tendP = 0; } }, 250);
  function gbedUse(o) { if (bedStage(o) >= 2) toast(o.text || 'It is in bloom.'); }   // no press: the bed is tended by staying (bedState)
  function beaconDoorUse() {
    if (advOf().open.lamp) { game.sfx('tap'); WORLD.go('dg-lamp'); return; }
    showDialog('The door', SAY.door, null, () => { advSave((x) => { x.open.lamp = true; }); game.sfx('claim'); setTimeout(() => WORLD.go('dg-lamp'), 200); });
  }
  // ---- the Forge Below: cores from the two halls go into the hub sockets (either order); both sockets open the north gate; the furnace ends the run ----
  const CORE_NAME = { A: 'flame', B: 'stone' };
  function applyForge() { const m = WORLD.MAPS['dg-forge']; if (!m) return; const f = advOf().flags; Object.keys(m.pickups || {}).forEach((g) => WORLD.setGate('dg-forge', g, !!f[m.pickups[g]])); Object.keys(m.rules || {}).forEach((g) => WORLD.setGate('dg-forge', g, m.rules[g].every((k) => f[k]))); }
  function forgeDoorUse() {
    if (advOf().open.forge) { game.sfx('tap'); WORLD.go('dg-forge'); return; }
    showDialog('The forge door', SAY.forgeDoor, null, () => { advSave((x) => { x.open.forge = true; }); game.sfx('claim'); setTimeout(() => WORLD.go('dg-forge'), 200); });
  }
  function coreUse(o) { const f = advOf().flags; if (f['core:' + o.core]) return; advSave((x) => { x.flags['core:' + o.core] = true; }); applyForge(); game.sfx('claim'); toast('You lift the core of ' + CORE_NAME[o.core] + '. It is warm in your hands.'); }
  function socketUse(o) {
    const f = advOf().flags, c = o.core;
    if (f['sock:' + c]) { toast(SAY.socketWarm); return; }
    if (!f['core:' + c]) { toast(SAY.socketCold); return; }
    advSave((x) => { x.flags['sock:' + c] = true; }); applyForge(); game.sfx('claim');
    const both = advOf().flags['sock:A'] && advOf().flags['sock:B'];
    toast(both ? 'Both sockets wake. Far to the north, a slab of black iron grinds aside.' : 'The core of ' + CORE_NAME[c] + ' settles into its socket.');
  }
  function furnaceUse() {
    const beaten = ((game.state.npc && game.state.npc.cleared) || []).indexOf('hale') !== -1;
    if (!beaten) { toast('The furnace door is shut. The Forgemaster is watching it.'); return; }
    const lit = advOf().flags.forgeLit, got = game.state.caught.some((e) => e.seed === SECRET3_SEED);
    if (lit && got) { toast('The furnace roars quietly.'); return; }
    if (lit) { showDialog('The great furnace', SAY.furnaceLit, null, () => grantSecret(SECRET3_SEED, true)); return; }   // lit before Slagback existed, or by the dev tools
    showDialog('The great furnace', SAY.furnace, null, () => {
      advSave((x) => { x.flags.forgeLit = true; }); hushUntil = performance.now() + 2400; hush(1200); game.sfx('forge');   // no essence, no toast, no jingle: silence, then `dg-forge@lit` (package S)
      setTimeout(() => grantSecret(SECRET3_SEED, true), 1800);   // Slagback stays, unannounced
    });
  }
  function objectUse(o) {
    if (o.kind === 'cavemouth') { forgeDoorUse(); return; }
    if (o.kind === 'core') { coreUse(o); return; }
    if (o.kind === 'socket') { socketUse(o); return; }
    if (o.kind === 'furnace') { furnaceUse(); return; }
    if (o.kind === 'plaque') { if (o.id === 'arch') archUse(); else if (o.id === 'beacon-door') beaconDoorUse(); else toast(o.text || 'Nothing happens.'); return; }
    if (o.id === 'names' && game.ladderStep() >= 5) { toast(o.text + ' The newest is yours.'); return; }   // the rail, once you have climbed
    if (o.kind === 'postlamp' && !o.day) { const f = advOf().flags, mine = o.own || (!o.wave && !o.always && !!f.lampLit); toast(mine && f['own:' + o.id] ? SAY.postMine : (lampK[o.id] || 0) > 0.3 ? SAY.postAhead : SAY.postCold); return; }   // the post says what it is now (02-F8): cold, lit before you came, or kept by you
    if (o.kind === 'chamberlamp') { toast(lampKept(o.id) ? (o.id === 'GL' ? 'The glass is warm.' : 'The lamp burns steadily.') : (o.id === 'GL' && !glReady() ? 'The glass is cold.' : o.text)); return; }
    if (o.kind === 'gate') { const gl = WORLD.map.gates && WORLD.map.gates[o.gate]; toast(gl && gl.every(lampKept) ? 'Warm.' : o.text); return; }
    if (o.id === 'wlog') { const t = game.towerState(); toast(t.best ? 'A book of names and floors, one line a night. The last line is yours: night ' + t.best + '.' : o.text); return; }   // the logbook carries your count
    if (o.clue) { const c = ADV.CLUES.find((q) => q.id === o.clue); showDialog('You look closer', [o.text], null, () => { if (c) gainClue(c); }); return; }
    if (o.kind === 'windowlamp') { const f = advOf().flags; if (f.lampLit && f.homeLit === today() && !hasWick()) { showDialog('The window', SAY.window, null, () => grantSecret(SECRET2_SEED)); return; } toast(o.text); return; }   // the window is lit by staying (windowlampState); the first lit morning after the lamp, Wickling is on the sill
    if (o.kind === 'gbed') { gbedUse(o); return; }
    if (o.kind === 'woodpile') { woodUse(); return; }
    if (o.kind === 'gbrazier') { brazierUse(o); return; }
    if (o.kind === 'callamp') { lampUse(o); return; }
    if (o.kind === 'chest') { chestUse(o); return; }
    if (o.order !== undefined) { riteUse(o); return; }
    if (o.kind === 'seat') { const got = game.state.caught.some((e) => e.seed === SECRET_SEED) || advOf().flags.secret; toast(got ? 'The seat is warm.' : o.text); return; }   // the act is sitting (seatState); the crown stays where it is
    toast(o.text || 'Nothing happens.');
  }
  // ---------- developer tools (unlocked by tapping the ID in the menu 5 times; options are browser-only, never saved or synced) ----------
  const DEV_STORE = 'critter-roll:dev';
  try { Object.assign(DEV, JSON.parse(localStorage.getItem(DEV_STORE) || '{}')); } catch (e) {}
  function devSave() { try { localStorage.setItem(DEV_STORE, JSON.stringify(DEV)); } catch (e) {} }
  const xpForLevel = (n) => 80 * (n - 1) + 20 * (n - 1) * (n - 2);   // total xp at which trainer level n starts
  function devAdv(mut) { advSave(mut); applyDungeon(); applyLamp(); applyForge(); }
  function devClear(id) { const npc = Object.assign({ done: [], beaten: {}, cleared: [], seals: [] }, game.state.npc); if (npc.cleared.indexOf(id) === -1) npc.cleared = npc.cleared.concat([id]); game.update({ npc: npc }); }
  let devOpenFlag = false;
  function openDev() { devOpenFlag = true; renderDev(); $('dev').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); $('dev-close').focus(); }
  function closeDev() { devOpenFlag = false; $('dev').hidden = true; $('hud').hidden = false; WORLD.setPaused(false); }
  function renderDev() {
    const st = game.state, lv = game.levelInfo(st.xp || 0).level, a = advOf(), cl = (st.npc && st.npc.cleared) || [], b = (id, label, on) => '<button class="dvb" data-dev="' + id + '"' + (on === undefined ? '' : ' aria-pressed="' + (on ? 'true' : 'false') + '"') + '>' + label + '</button>';
    const maps = Object.keys(WORLD.MAPS).filter((id) => !WORLD.MAPS[id].interior);
    $('dev-body').innerHTML =
      '<div class="dvs">Requirements</div><div class="dvg">' + b('tog:levels', 'Ignore level requirements', DEV.levels) + b('tog:test', 'Test mode (unlimited rolls)', !!(st.settings && st.settings.test)) + b('tog:safe', 'No trainer challenges', DEV.safe) + '</div>' +
      '<p class="dvn">Level requirements cover zones, routes, the Ascent and the Tower. Trainer level now: ' + lv + '.</p>' +
      '<div class="dvs">Teleport</div><div class="dvg">' + maps.map((id) => b('tp:' + id, WORLD.MAPS[id].name + (WORLD.map.id === id ? ' (here)' : ''))).join('') + '</div>' +
      '<div class="dvs">Player</div><div class="dvg">' + [5, 10, 15, 20, 30].map((n) => b('lv:' + n, 'Level ' + n)).join('') + b('ess', '+100 essence') + b('crit', 'Add a Lv 20 stage 3 critter') + '</div>' +
      '<div class="dvs">Adventure</div><div class="dvg">' + b('clues', 'All clues') + b('arch', 'Open the arch') + b('rite', 'Clear the rubble') + b('keeper', 'Beat the Keeper' + (cl.indexOf('keeper') !== -1 ? ' (done)' : '')) + b('veil', 'Get Veilcrown') +
      b('lampdoor', 'Open the beacon door') + b('gates', 'Keep the three tower lamps') + b('maren', 'Beat the Warden' + (cl.indexOf('maren') !== -1 ? ' (done)' : '')) + b('lit', 'Light the great lamp') + b('wick', 'Get Wickling') + b('forgedoor', 'Open the forge door') + b('cores', 'Wake both forge sockets') + b('hale', 'Beat the Forgemaster' + (cl.indexOf('hale') !== -1 ? ' (done)' : '')) + b('forgelit', 'Light the great furnace') + b('slag', 'Get Slagback') + b('resetadv', 'Reset the adventure') + '</div>' +
      '<p class="dvn">Adventure state: ' + a.clues.length + '/4 clues, arch ' + (a.open.arch ? 'open' : 'sealed') + ', rubble ' + (a.flags.rubble ? 'cleared' : 'in place') + ', beacon door ' + (a.open.lamp ? 'open' : 'shut') + ', lamp ' + (a.flags.lampLit ? 'lit' : 'dark') + ', forge ' + (a.flags.forgeLit ? 'lit' : 'cold') + '. After a reset, reload the page so cleared rubble comes back.</p>' +
      '<div class="dvs">Developer mode</div><div class="dvg">' + b('devoff', 'Hide developer tools') + '</div><p class="dvn">Tap the ID in the menu 5 times to bring them back.</p>';
  }
  function devAction(act) {
    const [k, arg] = act.split(':'), st = game.state;
    if (k === 'tog') { if (arg === 'test') game.update({ settings: Object.assign({}, st.settings, { test: !(st.settings && st.settings.test) }) }); else { DEV[arg] = !DEV[arg]; devSave(); } }
    else if (k === 'tp') { closeDev(); WORLD.enter(arg); toast('Teleported to ' + mapName(arg) + '.'); return; }
    else if (k === 'lv') game.update({ xp: Math.max(st.xp || 0, xpForLevel(+arg)) });
    else if (k === 'ess') game.update({ essence: (st.essence || 0) + 100 });
    else if (k === 'crit') { let s = 0; for (let i = 0; i < 400 && !s; i++) { const c = 1 + Math.floor(Math.random() * 999998); if (game.make(c, 1).rarity !== 'Mythic') s = c; } game.update({ caught: st.caught.concat([{ seed: s, stage: 3, lv: 20 }]) }); toast('Added ' + game.make(s, 3, 20).name + '.'); }
    else if (k === 'clues') devAdv((x) => { x.clues = ADV.CLUES.map((c) => c.id); });
    else if (k === 'arch') devAdv((x) => { x.open.arch = true; });
    else if (k === 'rite') devAdv((x) => { x.flags.rite = [0, 1, 2]; x.flags.rubble = true; });
    else if (k === 'keeper') devClear('keeper');
    else if (k === 'veil') grantSecret(SECRET_SEED, true);
    else if (k === 'lampdoor') devAdv((x) => { x.open.lamp = true; });
    else if (k === 'gates') devAdv((x) => { x.flags['cl:L1'] = true; x.flags['cl:L2'] = true; x.flags['cl:L3'] = true; });
    else if (k === 'maren') devClear('maren');
    else if (k === 'lit') devAdv((x) => { x.flags.lampLit = true; });
    else if (k === 'wick') grantSecret(SECRET2_SEED, true);
    else if (k === 'forgedoor') devAdv((x) => { x.open.forge = true; });
    else if (k === 'cores') devAdv((x) => { x.flags['core:A'] = true; x.flags['core:B'] = true; x.flags['sock:A'] = true; x.flags['sock:B'] = true; });
    else if (k === 'hale') devClear('hale');
    else if (k === 'forgelit') devAdv((x) => { x.flags.forgeLit = true; });
    else if (k === 'slag') grantSecret(SECRET3_SEED, true);
    else if (k === 'resetadv') { const npc = Object.assign({ done: [], beaten: {}, cleared: [], seals: [] }, st.npc); npc.cleared = npc.cleared.filter((i) => ['keeper', 'maren', 'hale'].indexOf(i) === -1); game.update({ adv: { clues: [], open: {}, flags: {} }, npc: npc, caught: st.caught.filter((e) => !SECRETS[e.seed]) }); applyLamp(); applyForge(); toast('Adventure reset. Reload the page to restore the cleared rubble.'); }
    else if (k === 'devoff') { game.update({ dev: false }); closeDev(); toast('Developer tools hidden. Tap the ID in the menu 5 times to bring them back.'); return; }
    renderDev();
  }
  // weather / time-of-day remark for ordinary townsfolk (flavor.js); indoors the person hears the weather of the town outside
  function flavorLine(n) {
    const M = WORLD.map, outside = M.interior ? (M.parent || 'town') : M.id, st = game.state.settings || {};
    const tod = st.daynight === false ? 'day' : timeOfDay(), d = new Date();
    const fid = n.id.replace(/^res-/, ''), id = fid === 'mom' && (advOf().flags.lampLit || keptDark()) ? 'mom-quiet' : fid;   // after the lamp (and in the night of darkness) Mom's "the lamp in the window stays on" is not true: she gets the house's plain night line
    return FLAVOR.pick({ id: id, region: (WEATHER.region(outside) || ''), indoor: !!M.interior, weather: weatherAt(outside), tod: tod, salt: d.toDateString() + '#' + Math.floor(d.getHours() / WEATHER.BLOCK_H) + (tod === 'night' ? 'n' : '') });
  }
  function talk(n) {
    WORLD.facePlayer(n);
    const dk = darkLines(n), sc = letGoLines(n) || dk || scaffoldLines(n); if (sc) n = Object.assign({}, n, { lines: sc, afterLines: letGoLines(n) ? sc : n.afterLines, after: n.after ? sc : n.after });
    if (LIT_LINES[n.id] && advOf().flags.lampLit) { const L = LIT_LINES[n.id]; n = Object.assign({}, n, n.trainer ? { intro: L.concat(n.intro.slice(1)), beatenLines: L, afterLines: L } : { lines: L }); }   // after the lamp (02-F30)
    if (dk) advSave((a) => { a.flags.momDark = true; });
    const g = game, done = (g.state.npc && g.state.npc.done) || [];
    const qcity = Object.keys(CITY_QUESTS).find((c) => CITY_QUESTS[c].giver === n.id);
    if (qcity) {
      const Q = game.cityQuest(qcity);
      if (Q.claimed) { showDialog(n.name, n.lines.concat([SAY.cityAgain])); return; }
      if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, SAY.cityDone); return; }   // the essence and the experience are paid; the counters move (02-F18, 04-W13)
      showDialog(n.name, [n.lines[0], 'Today it is this: ' + Q.q.txt + '.']); return;   // the progress is on the Quests card, not in her mouth
    }
    if (n.kind === 'talk') {
      const fl = n.id === 'pip' ? null : flavorLine(n), lines = fl ? [fl].concat(n.lines) : n.lines, clue = ADV.CLUES.find((c) => c.npc === n.id && advOf().clues.indexOf(c.id) === -1);   // once you have looked, they stop pointing
      if (clue) { showDialog(n.name, lines.concat(clue.lines)); return; }   // the four people only point at what is in front of them; looking at it is what teaches you
      showDialog(n.name, lines); return;
    }
    if (n.kind === 'shop') { if (n.id === 'mira' && sealCount() >= 4) { showDialog(n.name, n.lines); return; } showDialog(n.name, n.lines, null, () => openPanel('shop')); return; } // shops stay quick: no weather remark; at four seals Mira's stall is bare (the shelf at home is kept)
    if (n.kind === 'request') {
      if (done.indexOf(n.id) !== -1) { showDialog(n.name, n.after); return; }
      if (NEEDS[n.need](g)) {
        const npc = Object.assign({ done: [], beaten: {} }, g.state.npc); npc.done = done.concat([n.id]);
        g.update({ npc: npc, essence: g.state.essence + n.reward }); g.sfx('claim');
        showDialog(n.name, n.thanks); return;
      }
      showDialog(n.name, n.ask.concat([n.progress(g)])); return;
    }
    if (n.kind === 'trainer' && n.ladder && !game.ladderReady(n)) { if (game.ladderStep() + 1 < n.ladder) showDialog(n.name, n.notYet); n.declined = true; return; }   // the Arena ladder: in order, one a day. The day's rival sits by the fire and says nothing: that is the answer
    if (n.kind === 'trainer') challenge(n);
    if (n.kind === 'leader') challenge(n);   // the trial was the door; the duel is for XP
  }
  function challenge(n) {
    const g = game;
    if (g.beatenToday(n.id)) { showDialog(n.name, n.beatenLines); return; }
    const beaten = !n.leader && ((g.state.npc && g.state.npc.cleared) || []).indexOf(n.id) !== -1;
    if (beaten && g.state.caught.length) {
      showDialog(n.name, n.afterLines || ['Oh, it is you again! You beat me fair and square last time.', 'I have been training since. Up for a rematch?'], [
        { label: 'Rematch!', fn: () => endDialog(() => startTrainer(n)) },
        { label: 'Not now', fn: () => endDialog() }
      ]);
      return;
    }
    if (!g.state.caught.length) { showDialog(n.name, n.intro.slice(0, 1).concat(['Oh, you do not have any critters yet! Find one in the tall grass first.'])); n.declined = true; return; }
    showDialog(n.name, n.intro, [
      { label: 'Battle!', fn: () => endDialog(() => startTrainer(n)) },
      { label: 'Not now', fn: () => { n.declined = true; endDialog(); } }
    ]);
  }
  function resumeWorld() { $('hud').hidden = false; WORLD.setPaused(false); }
  function startTrainer(n) {
    const team = game.teamFor(n);
    const seals = (game.state.npc && game.state.npc.seals) || [];
    const cleared = (game.state.npc && game.state.npc.cleared) || [];
    // trainers: full reward on the first win, half on daily rematches (keeps daily essence close to the pre-city economy)
    const reward = n.leader ? (cleared.indexOf(n.id) === -1 ? n.firstReward : n.reward) : (cleared.indexOf(n.id) === -1 ? n.reward + (n.bonus || 0) : Math.ceil(n.reward / 2));
    const tr = { id: n.id, name: n.name, team: team, stage: n.stage, lv: n.lv || 1, reward: reward, winLine: n.winLine, leader: !!n.leader, boss: !!n.boss, ladder: n.ladder || 0 };
    if (!ACT.canDuel()) { resumeWorld(); toast('Your lead critter is not ready to fight here.'); return; }
    // the ladder's day is stamped on a WON step in settleBattle, so a lost ladder fight can be tried again today
    if (ACT.startDuel({ tr: tr, npc: n })) { n.declined = true; resumeWorld(); return; }   // every fight is a duel on the map (the dialog that led here left the world paused)
    resumeWorld();
  }
  // ---------- The Long Watch ----------
  const KEEPER = 'Keeper of the Watch';
  // the door (Meaning: carrying your own light is not being alone): opens at four seals, and stays open for any save that has already stood a night (tower.runs, tower.best or a live run)
  const watchOpen = () => { const t = game.towerState(); return sealCount() >= 4 || t.runs > 0 || t.best > 0 || !!t.run || !!game.props.noGates; };
  const WATCH_LINES = { surge: 'The wind is on the door tonight.', iron: 'Cold one. The blanket is thin.', wind: 'A mild week.', mono: 'They are all of a kind this week.' };   // one observation per twist, no numbers (04-M12)
  function partyLine() {
    return game.towerParty().map((x) => game.make(x.seed, (game.state.caught.find((e) => e.seed === x.seed) || {}).stage || 1).name + ' ' + x.hp + '/' + x.max).join(', ');
  }
  function towerFloorStart() {
    const t = game.towerState(); if (!t.run) return;
    const tr = game.towerFloor(t.run.floor), team = game.teamFor(tr), first = t.run.floor > t.best;
    const trainer = { id: tr.id, name: tr.name, team: team, stage: tr.stage, lv: tr.lv, reward: first ? tr.reward : 0, winLine: tr.winLine, tower: true, floor: tr.floor, warden: tr.warden };
    if (ACT.canDuel()) {   // action mode: the run's party fights the floor on the map; HP carries from the run
      const party = game.towerParty(), hp = {}; party.forEach((x) => { hp[x.seed] = x.hp; });
      const tw = game.towerTwist();
      if (party.some((x) => x.hp > 0) && ACT.startDuel({ tr: trainer, party: party.map((x) => x.seed), hp: hp, surge: tw.id === 'surge' ? tw.type : null })) { resumeWorld(); return; }
    }
    resumeWorld(); toast('Your party is not ready for the night.');
  }
  function towerLobby() {
    const g = game, t = g.towerState();
    if (!watchOpen()) { toast('The door is shut. Light shows under it.'); return; }
    if (t.run) {
      if (!g.towerParty().some((x) => x.hp > 0)) { g.endTowerRun(); towerLobby(); return; }
      showDialog(KEEPER, ['The watch waits on night ' + t.run.floor + '.', 'Your party: ' + partyLine() + '.'], [
        { label: 'Keep watching', fn: () => endDialog(towerFloorStart) },
        { label: 'Leave the watch', fn: () => { g.endTowerRun(); endDialog(); toast('The watch is over. Longest: ' + t.best + ' nights.'); } },
        { label: 'Not now', fn: () => endDialog() }
      ]);
      return;
    }
    const left = g.towerRunsLeft(), party = (g.partySeeds().length ? g.partySeeds() : [g.state.caught[0].seed]).map((sd) => g.make(sd, g.state.caught.find((e) => e.seed === sd).stage).name);
    const tw = g.towerTwist(), lit = !!advOf().flags.lampLit;   // the Keeper observes; the rules are in the weather past the door and in the logbook, never in his mouth. His lines change at lampLit: now they come to you
    const intro = [lit ? SAY.watchLit : (t.best ? SAY.watchBack : SAY.watchFirst), WATCH_LINES[tw.id] || tw.name + '.'];
    if (!left) { showDialog(KEEPER, [intro[0], SAY.watchEnough]); return; }
    showDialog(KEEPER, intro.concat(['You will bring ' + party.join(', ') + '.']), [
      { label: 'Begin the watch', fn: () => { g.startTowerRun(); endDialog(towerFloorStart); } },
      { label: 'Not now', fn: () => endDialog() }
    ]);
  }
  function towerAfterClose(res) {
    const g = game, t = g.towerState();
    open = false; $('screen').hidden = true;
    if (res.kind === 'win') {
      const lines = ['Night ' + res.floor + '. The lamp held.', 'Your party rests: ' + partyLine() + '.'];   // the essence is paid (settleBattle) and not announced; the logbook carries the count
      setTimeout(() => showDialog(KEEPER, lines, [
        { label: 'Night ' + (res.floor + 1), fn: () => endDialog(towerFloorStart) },
        { label: 'Rest', fn: () => { endDialog(); } }
      ]), 60);
    } else if (res.kind === 'top') {
      setTimeout(() => showDialog(KEEPER, SAY.watchTop.concat([res.first ? SAY.watchTopFirst : SAY.watchTopAgain])), 60);
    } else {
      setTimeout(() => showDialog(KEEPER, ['The lamp went out on night ' + res.floor + '.', SAY.watchLoss]), 60);   // a loss keeps the floor: package M (towerAfter)
    }
  }
  // ---------- the catch pouch (action mode): critters that dropped an orb wait here until you decide ----------
  function showPouchCard() {
    const p = game.state.pouch || []; if (!p.length) return false;
    game.update({ seed: p[0], previewSeed: null, reveal: (game.state.reveal || 0) + 1 });
    game.setState({ tab: 'roll', selected: null, armed: false, encounter: 'pouch', pouchCard: true });
    return true;
  }
  // keep by staying: the critter was kept beside you; the same card opens, already kept (nothing to decide)
  function showKeptCard(seed) {
    if (open || dlg || menuOpen || mapOpen || panel) return;
    lastOpener = document.activeElement; game.update({ seed: seed, previewSeed: null, reveal: (game.state.reveal || 0) + 1 });
    game.setState({ tab: 'roll', selected: null, armed: false, encounter: 'kept', pouchCard: false });
    open = true; $('screen').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); renderScreen();
  }
  function openPouch() {
    if (open || dlg || menuOpen || mapOpen || panel) return;
    lastOpener = document.activeElement; if (!showPouchCard()) return;
    open = true; $('screen').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); renderScreen(); game.sfx('tap');
  }
  // "Let it go" (drops it from the pouch) or "Next" after keeping: show the next critter, or close
  function pouchNext(seed, kept) {
    if (!kept) game.update({ pouch: (game.state.pouch || []).filter((x) => x !== seed) });
    if ((game.state.pouch || []).length && showPouchCard()) { renderScreen(); return; }
    close();
  }
  // an action-mode duel ended: the same follow-ups the battle screen's close() gives
  function duelDone(tr, npc, won, lines) {
    const g = game; if (tr.tower && won) hush(1200); musicLoop();   // dawn: a bar of silence, then the lamp that does not go out
    const grew = (lines || []).filter((l) => /grew to level/.test(l));
    if (tr.tower) { const res = g.state.towerResult; g.setState({ towerResult: null }); if (res) towerAfterClose(res); if (grew.length) setTimeout(() => toast(grew.join(' ')), 600); return; }
    const sealed = g.state.justSealed;
    if (sealed) {
      g.setState({ justSealed: null });
      const n = Object.values(WORLD.allNpcs()).flat().find((x) => x.id === sealed) || npc, count = ((g.state.npc && g.state.npc.seals) || []).length;
      const ls = [n.sealLine];   // the count is on the Seals card; nobody says it (02-F2, 01-F20)
      setTimeout(() => showDialog(n.name, [tr.winLine].concat(ls)), 400); if (grew.length) setTimeout(() => toast(grew.join(' ')), 4200); return;
    }
    if (won) { setTimeout(() => showDialog(tr.name, [tr.winLine].concat(tr.leader && npc && npc.sealLine ? [npc.sealLine] : []).filter((x) => x)), 400); /* the essence is paid and the counter moves; nobody says the number (02-F7, F18); a leader's second line is what she sees after the trial */ if (grew.length) setTimeout(() => toast(grew.join(' ')), 3500); }
    if (tr.ladder) { placeRivals(WORLD.allNpcs().arena); if (g.state.kindled) { g.setState({ kindled: false }); advSave((a) => { a.flags.kindlemane = true; }); setTimeout(() => toast(SECRETS[SECRET4_SEED].name + ' joined you!'), 3000); } }
    else toast('Your party was knocked out. ' + tr.name + ' wins this round. No penalty; you can try again.');
  }
  function close() {
    const tres = game.state.towerResult, trw = game.state.trainer, bw = game.state.battle;
    if (trw && trw.tower) {
      game.setState({ trainer: null, battle: null, towerResult: null });
      if (tres) { towerAfterClose(tres); return; }
      if (bw && !bw.over) toast('The watch is paused on night ' + trw.floor + '. Your HP is kept; the night starts over when you return.');
      open = false; $('screen').hidden = true; $('hud').hidden = false; WORLD.setPaused(false);
      return;
    }
    const sealed = game.state.justSealed;
    if (game.state.trainer) game.setState({ trainer: null, battle: null, justSealed: null });
    if (sealed) {
      const n = Object.values(WORLD.allNpcs()).flat().find((x) => x.id === sealed);
      const count = ((game.state.npc && game.state.npc.seals) || []).length;
      const lines = [n.sealLine];
      open = false; $('screen').hidden = true;
      setTimeout(() => showDialog(n.name, lines), 60);
      return;
    }
    if (game.state.encounter) game.setState({ encounter: null, reveal: 0, pouchCard: false });
    open = false; $('screen').hidden = true; $('hud').hidden = false; WORLD.setPaused(false);
    if (lastOpener && lastOpener.focus) lastOpener.focus();
  }
  function toast(text) {
    const t = $('toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }
  function interact(n) {
    if (dlg) { advance(); return; }
    if (!n) return;
    if (n.kind === 'sign') {
      const to = n.sign.to, lv = game.levelInfo(game.state.xp || 0).level;
      toast(n.sign.text);   // the sign names the place; a shut gate is seen, not read (gates by fires)
      return;
    }
    if (n.kind === 'water') { fish(n); return; }
    if (n.kind === 'object') { objectUse(n.obj); return; }
    if (n.kind === 'npc') { talk(n.npc); return; }
    if (n.place.open === 'tower' && n.place.enter && !watchOpen()) { toast('The door is shut. Light shows under it.'); return; }   // the Watch's door: four seals, or a watch already stood
    if (n.place.enter && n.place.open !== 'house' && WORLD.MAPS[n.place.enter]) { game.sfx('tap'); WORLD.go(n.place.enter); return; }
    if (n.place.open === 'tower') { towerLobby(); return; }
    if (n.place.open === 'gym') { const L = (WORLD.allNpcs()[WORLD.map.id] || []).find((x) => x.id === n.place.leader); if (L) talk(L); return; }
    if (n.place.open === 'house') { if (n.place.enter && WORLD.MAPS[n.place.enter]) { game.sfx('tap'); WORLD.go(n.place.enter); } else toast(n.place.text || 'Nobody seems to be home.'); return; }
    if (n.place.open === 'shop' && n.place.id !== 'shop') { const k = (WORLD.allNpcs()[WORLD.map.id] || []).find((x) => x.kind === 'shop'); if (k) talk(k); else openPanel('shop'); return; }
    openScreen(n.place.open);
  }
  // the one verb has one label: "Stay" wherever staying is the act (a chamber lamp, a seedling, the ninth seat, the window after the lamp)
  function stayLabel(o) {
    const f = advOf().flags;
    if (o.kind === 'chamberlamp') return lampKept(o.id) ? 'Examine' : 'Stay';
    if (o.kind === 'gbed') return bedStage(o) >= 2 ? 'Examine' : 'Stay';
    if (o.kind === 'seat') return ((game.state.npc && game.state.npc.cleared) || []).indexOf('keeper') !== -1 && !(game.state.caught.some((e) => e.seed === SECRET_SEED) || f.secret) ? 'Stay' : 'Examine';
    if (o.kind === 'windowlamp') return f.lampLit ? (f.homeLit === today() ? (hasWick() ? 'The lamp' : 'Look') : 'Stay') : null;
    return null;
  }
  function setNear(n) {
    const b = $('act');
    if (!n) { b.disabled = true; $('act-label').textContent = 'Walk up to a place'; return; }
    b.disabled = false;
    $('act-label').textContent = n.kind === 'object' ? (n.obj.label || stayLabel(n.obj) || { chest: 'Open the chest', plaque: advOf().open.arch ? 'Enter the arch' : 'Examine the arch', trough: 'Look', woodpile: 'Take a log', gbrazier: 'Feed the fire', callamp: 'Touch the lamp', core: 'Take the core', socket: 'Use the socket', furnace: 'Touch the furnace' }[n.obj.kind] || 'Examine') : n.kind === 'water' ? 'Fish' : n.kind === 'npc' ? (n.npc.trainer ? 'Talk to ' + n.npc.name : 'Talk to ' + n.npc.name) : n.kind === 'sign' ? 'Read sign' : ({ home: 'Enter home', lab: 'Enter lab', arena: 'Enter the arena', board: 'Read quests', tower: 'Go in', desk: 'Check your records', dexpc: 'Open the Dex', bell: 'Ring the bell', stair: 'Climb the stair' })[n.place.id] || ({ gym: 'Go in', house: 'Go inside', shop: 'Browse' })[n.place.open];
  }
  function stick() {
    const zone = $('stick'), knob = $('knob'); let id = null, ox = 0, oy = 0;
    const R = 46;
    const move = (e) => {
      const dx = e.clientX - ox, dy = e.clientY - oy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / R);
      WORLD.input.jx = (dx / d) * k; WORLD.input.jy = (dy / d) * k;
      knob.style.transform = 'translate(' + (dx / d) * Math.min(d, R) + 'px,' + (dy / d) * Math.min(d, R) + 'px)';
    };
    zone.addEventListener('pointerdown', (e) => { id = e.pointerId; zone.setPointerCapture(id); const r = zone.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; move(e); });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; WORLD.input.jx = 0; WORLD.input.jy = 0; knob.style.transform = ''; };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  }
  function start() {
    let tries = 0;
    const ready = () => { try { return localStorage.getItem('critter-roll:v2') !== null || localStorage.getItem('critter-roll:meta') === null; } catch (e) { return true; } };
    const go = () => { if (ready() || tries >= 5) { start2(); return; } tries += 1; setTimeout(go, 200); };
    go();
  }
  let aggroT = 0, folCache = null, fishing = null;
  // ---------- fishing: water critters bite (70% Tide, else the area's own types); uses a sighting like grass ----------
  function fish(w) {
    if (fishing || open || dlg || menuOpen || mapOpen || panel) return;
    if (!game.state.caught.length) { toast('You need a critter first. Look in the tall grass!'); return; }
    if (game.sightingsLeft() <= 0 && game.energy().left === 0) { toast('No sightings or rolls left today. Fishing uses them too.'); return; }
    const M = WORLD.map; WORLD.setPaused(true); WORLD.setFish({ x: w.x, y: w.y, bite: false }); game.sfx('tap'); toast('You cast your line...');
    const wait = 900 + Math.random() * 1500;
    fishing = setTimeout(() => {
      WORLD.setFish({ x: w.x, y: w.y, bite: true }); game.buzz(30); game.sfx('roll'); toast('Something bit!');
      fishing = setTimeout(() => {
        fishing = null; WORLD.setFish(null); WORLD.setPaused(false);
        const local = (M.types || []).filter((t) => t !== 'Tide'), types = Math.random() < 0.7 || !local.length ? ['Tide'] : local;
        const back = (game.state.returned || []).filter((sd) => !game.state.caught.some((c) => c.seed === sd));   // the water gives back what you let go: one cast in three (item 15)
        encounter(Object.assign({ types: types, zone: M.name, rare: false, fishing: true }, back.length && Math.random() < 1 / 3 ? { seed: back[Math.floor(Math.random() * back.length)] } : {}));
      }, 650);
    }, wait);
  }
  const ROUTE = { wren: ['Elder Wren', 'Mossbrook', 'west', 'Moss Forest'], glacia: ['Glacia', 'Frosthold', 'north', 'Frost Peaks'], blaze: ['Blaze', 'Cinderport', 'south', 'Ember Fields'], coral: ['Admiral Coral', 'Coralbay', 'east', 'Tide Shore'] };
  const T_HAS = (id) => typeof MUSIC !== 'undefined' && MUSIC.tracks.indexOf(id) !== -1;
  // silence as a sound (Meaning: a light is lit into quiet, and the music comes back changed): hush(ms) keeps the music off for that long; the loop then plays what the world now wants
  let hushT = 0;
  function hush(ms) { hushT = Date.now() + ms; if (typeof MUSIC !== 'undefined') MUSIC.play(null); }
  function musicTrack() {
    const st = game.state, f = advOf().flags;
    if (!$('title').hidden) return null;   // the title is silent until the light is touched (the first sound is one the player causes)
    if (Date.now() < hushT) return null;
    if (aggroT && !open) { if (dlg || Date.now() - aggroT < 1500) return 'spotted'; aggroT = 0; }
    if (open) aggroT = 0;
    { const di = ACT.duelInfo(); if (di && !open) { if (di.tower) return di.boss ? 'night@long' : 'night'; return di.boss ? 'trial' : 'battle'; } }   // a night of the Watch is a watch, not a fight; a keeper letting go is a trial, not a villain
    if (open && st.tab === 'battle') return st.trainer && st.trainer.tower ? (st.trainer.warden ? 'night@long' : 'night') : (st.trainer && (st.trainer.warden || st.trainer.leader || st.trainer.boss) ? 'trial' : 'battle');
    if (WORLD.map && WORLD.map.id === 'in-tower') return 'watch';   // the lobby: a lamp that does not go out
    const id = WORLD.map && (WORLD.map.interior ? WORLD.map.parent : (WORLD.map.base || WORLD.map.id)), alias = { descent: 'ember', ascent: 'frost', arena: 'moss', 'route-mf': 'peak', 'route-cm': 'moss', 'route-fc': 'frost', 'route-cc': 'tide', 'gym-wren': 'mossbrook', 'gym-glacia': 'frosthold', 'gym-blaze': 'cinderport', 'gym-coral': 'coralbay' }[id]; const base = alias || (MUSIC.tracks.indexOf(id) !== -1 ? id : 'town');
    if (base === 'dg-lamp') { const n = f.lampLit ? 3 : ['L1', 'L2', 'L3'].filter(lampKept).length; return n ? 'dg-lamp@' + n : 'dg-lamp'; }   // the music is the fourth lamp: a layer per lamp kept
    if (base === 'dg-forge' && f.forgeLit) return 'dg-forge@lit';
    if (base === 'dg-arch' && f.rubble) return 'dg-arch@seat';
    if (base === 'town' && f.lampLit && f.homeLit !== new Date().toDateString()) return 'town@dark';   // the window dark: the village without its tune until you light it (Home and its interiors)
    const tod = timeOfDay(), form = tod === 'night' ? '@night' : (tod === 'dusk' || tod === 'dawn' ? '@dusk' : '');
    return !WORLD.map.interior && !WORLD.map.cave && form && T_HAS(base + form) ? base + form : base;   // at dusk the sound shifts with the light; at night the same tune, quieter
  }
  function musicLoop() { if (typeof MUSIC === 'undefined' || !game) return; MUSIC.setEnabled(!(game.state.settings && game.state.settings.music === false)); if (performance.now() < hushUntil) { MUSIC.play(null); return; } MUSIC.play(musicTrack()); }
  function start2() {
    setInterval(() => { musicLoop(); renderWeather(); applyA11y(); }, 400); applyA11y();
    // things that only exist at certain hours (a lantern at night, ribbons at dusk, a boat at dawn, a light in the water at night): [gate id, true while the thing is GONE]
    const WILD_RULES = { 'route-mf-hollow': [['night', (t) => t !== 'night']], 'route-cm-crossing': [['dusk', (t) => t !== 'dusk']], 'route-fc-skerry': [['dawn', (t) => t !== 'dawn']], 'route-cc-drowned': [['night', (t) => t !== 'night']], 'route-fc': [['dawn', (t) => t !== 'dawn']] };
    let ruleState = {}; const applyRules = () => { if (!game || !WORLD.map) return; const id = WORLD.map.id, rules = WILD_RULES[id]; if (!rules) { ruleState = {}; return; } const t = timeOfDay(); rules.forEach((r) => { const gone = !!r[1](t); if (ruleState[id + r[0]] !== gone) { ruleState[id + r[0]] = gone; WORLD.setGate(id, r[0], gone); } }); };
    // people who keep hours: a `late` resident is away by day and home from dusk
    const applyHours = () => { const all = WORLD.allNpcs(), t = timeOfDay(), home = t === 'dusk' || t === 'night'; Object.keys(all).forEach((k) => all[k].forEach((n) => { if (n.late) n.hidden = !home; })); if (!ACT.dueling()) placeRivals(all.arena); };   // the Arena's rivals keep their places by the ladder's step (not mid-duel)
    const applyHelp = () => { if (!game) return; const all = WORLD.allNpcs(); (all.town || []).forEach((n) => { if (n.id === 'pip') n.hidden = sealCount() >= 1; }); shelfTick(); };   // help that leaves: Pip has gone from the square once you hold a seal
    setInterval(() => { applyRules(); applyHours(); applyHelp(); }, 500); applyHours(); applyHelp();
    // action mode (prototype): the lead critter fights live; Attack = tap to use the chosen move, hold to open the wheel
    {
      let leadCache = { key: '', k: null }; const foePool = {}, benchCache = {}, imgs = {}, atk = $('atk'), wheel = $('wheel'), ring = atk.querySelector('.ring'), seenToday = {};
      const ZONE_OF = { Frost: 'frost', Stone: 'frost', Ember: 'ember', Volt: 'ember', Moss: 'moss', Bloom: 'moss', Tide: 'tide', Dusk: 'tide' };
      const returnedHere = () => { const M = WORLD.map; if (!M) return []; const zone = M.base || M.id, own = new Set(game.state.caught.map((c) => c.seed)); return (game.state.returned || []).filter((sd) => !own.has(sd) && ZONE_OF[game.make(sd, 1).element.name] === zone); };
      let holdT = null, wheelOn = false, hover = -1, slots = [];
      ACT.bind({
        game: () => game, toast: toast, calm: () => !!(game && game.state.settings && game.state.settings.calm),
        enabled: () => !!game,
        lead: () => {
          const st = game.state; if (!st.caught.length) return null;
          const seeds = game.partySeeds(), sd = st.caught.some((e) => e.seed === st.fighter) ? st.fighter : (seeds[0] || st.caught[0].seed), e = st.caught.find((c) => c.seed === sd), key = sd + ':' + (e ? e.stage : 1) + ':' + (e ? e.lv || 1 : 1);
          if (leadCache.key !== key) leadCache = { key: key, k: game.make(sd, e ? e.stage : 1, e ? e.lv || 1 : 1) };
          return leadCache.k;
        },
        foe: (types, lead, rare) => {
          if (!rare && Math.random() < 1 / 3) { const back = returnedHere(); if (back.length) { const sd = back[Math.floor(Math.random() * back.length)]; return game.make(sd, lead.stage || 1, Math.max(1, (lead.lv || 1) + Math.floor(Math.random() * 3) - 1)); } }   // one spawn in three on its home zone: a critter you let go (item 15)
          const key = types.join(',') + (rare ? '+rare' : ''), pool = foePool[key] || (foePool[key] = []);
          if (pool.length < 30) for (let i = 0; i < (rare ? 600 : 150) && pool.length < 30; i++) { const sd = 1 + Math.floor(Math.random() * 999998), k = game.make(sd, 1); if ((!types.length || types.indexOf(k.element.name) !== -1) && (!rare || k.rarity === 'Rare' || k.rarity === 'Mythic')) pool.push(sd); }
          if (!pool.length) return null;
          const lv = Math.max(1, (lead.lv || 1) + Math.floor(Math.random() * 3) - 1);
          const own = new Set(game.state.caught.map((c) => c.seed)); let sd = pool[Math.floor(Math.random() * pool.length)]; for (let i = 0; i < 8 && own.has(sd); i++) sd = pool[Math.floor(Math.random() * pool.length)];   // skip critters you already keep when there is a choice
          return game.make(sd, lead.stage || 1, lv);
        },
        img: (k, facing) => { const key = k.seed + ':' + k.stage + ':' + (facing || 'down'); if (!imgs[key]) { const im = new Image(); im.src = PIX.sprite(k, 'icon', facing || 'down'); imgs[key] = im; } return imgs[key]; },
        bench: () => {
          const st = game.state, lead = leadCache.k ? leadCache.k.seed : null;
          return (ACT.duelParty() || game.partySeeds()).filter((sd) => sd !== lead).slice(0, 2).map((sd) => { const e = st.caught.find((c) => c.seed === sd), key = sd + ':' + e.stage + ':' + (e.lv || 1); if (!benchCache[key]) benchCache[key] = game.make(sd, e.stage, e.lv || 1); return benchCache[key]; });
        },
        setLead: (seed) => { game.update({ fighter: seed }); },
        kOf: (sd) => { const e = game.state.caught.find((c) => c.seed === sd); if (!e) return null; const key = sd + ':' + e.stage + ':' + (e.lv || 1); if (!benchCache[key]) benchCache[key] = game.make(sd, e.stage, e.lv || 1); return benchCache[key]; },
        duelDone: (tr, npc, won, lines) => duelDone(tr, npc, won, lines),
        onKill: (foe, mine) => game.actKill(foe, mine),
        worthy: (k) => game.actWorthy(k), pouchAdd: (sd) => game.actPouchAdd(sd),
        keep: (k, woke) => { const r = game.actKeep(k, woke); if (r.ok) showKeptCard(k.seed); return r; },   // keep by staying: the same card afterwards
        see: (map, no) => { const key = new Date().toDateString() + '|' + map + '|' + no; if (no !== null) { if (seenToday[key]) return; seenToday[key] = true; } game.questTick('see', map); },   // a city favour: the first sighting of a species per map per day, and every kill
        bag: () => bagOf(), useBag: (id) => { const b = bagOf(); if (!(b[id] > 0)) return false; b[id] -= 1; game.update({ bag: b }); return true; },
        sfx: (k, a) => game.sfx(k, a),
        doorCritter: () => !!advOf().flags.lampLit && homeLitNow()   // a lit day: one wild critter waits in the grass by the door (Meaning: what comes to the one who keeps)
      });
      const ctr = () => { const r = ring.getBoundingClientRect(), w = wheel.getBoundingClientRect(); return { x: r.left + r.width / 2 - w.left, y: r.top + r.height / 2 - w.top }; };
      function openWheel() {
        const mv = ACT.moves(); if (!mv.length) return; wheelOn = true; hover = -1; const c = ctr(), bn = ACT.benchList();
        const at = (deg, R, i) => ({ x: c.x + Math.cos(deg * Math.PI / 180) * R, y: c.y + Math.sin(deg * Math.PI / 180) * R, i: i });
        slots = mv.map((m, i) => at(180 + i * 32, 124, i)).concat(bn.map((b, j) => at(200 + j * 40, 205, 4 + j)));
        const sub = (m, i) => ({ attack: i === 0 ? 'quick' : 'heavy', guard: 'guard', status: 'special' }[m.kind] || '');
        wheel.innerHTML = '<div class="dim"></div>' + mv.map((m, i) => '<div class="slot' + (i === ACT.sel ? ' cur' : '') + '" data-i="' + i + '" style="left:' + slots[i].x.toFixed(0) + 'px;top:' + slots[i].y.toFixed(0) + 'px">' + esc(m.name) + '<small>' + sub(m, i) + '</small></div>').join('')
          + bn.map((b, j) => '<div class="slot sw' + (b.ok ? '' : ' off') + '" data-i="' + (4 + j) + '" style="left:' + slots[4 + j].x.toFixed(0) + 'px;top:' + slots[4 + j].y.toFixed(0) + 'px">' + esc(b.name) + '<small>' + (b.ok ? 'swap · ' + b.pct + '%' : 'fainted') + '</small></div>').join('');
        wheel.hidden = false; if (game.buzz) game.buzz([12]);
      }
      function wheelHover(cx, cy) {
        const w = wheel.getBoundingClientRect(), x = cx - w.left, y = cy - w.top; let best = -1, bd = 52;
        slots.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s.i; } });
        if (best !== hover) { hover = best; [].forEach.call(wheel.querySelectorAll('.slot'), (el) => el.classList.toggle('on', +el.dataset.i === hover)); }
      }
      function closeWheel(pick) { wheelOn = false; wheel.hidden = true; if (pick && hover >= 0) { if (hover < 4) { ACT.setSel(hover); if (game.sfx) game.sfx('tap'); } else { const b = ACT.benchList()[hover - 4]; if (b) ACT.swapTo(b.seed); } } }
      // a charge move (Ember's Scorch) is fed by holding the button; the wheel then opens by dragging off the button instead of by holding
      let charging = false, downX = 0, downY = 0;
      atk.addEventListener('pointerdown', (e) => { e.preventDefault(); try { atk.setPointerCapture(e.pointerId); } catch (x) {} wheelOn = false; clearTimeout(holdT); downX = e.clientX; downY = e.clientY; charging = ACT.chargeable() && ACT.chargeStart(); if (!charging) holdT = setTimeout(openWheel, 260); });
      atk.addEventListener('pointermove', (e) => { if (wheelOn) { wheelHover(e.clientX, e.clientY); return; } if (charging && Math.hypot(e.clientX - downX, e.clientY - downY) > 22) { charging = false; ACT.chargeCancel(); openWheel(); wheelHover(e.clientX, e.clientY); } });
      atk.addEventListener('pointerup', (e) => { clearTimeout(holdT); if (wheelOn) { wheelHover(e.clientX, e.clientY); closeWheel(true); } else if (charging) { charging = false; ACT.chargeEnd(); } else ACT.attack(); });
      atk.addEventListener('pointercancel', () => { clearTimeout(holdT); if (charging) { charging = false; ACT.chargeCancel(); } if (wheelOn) closeWheel(false); });
      atk.addEventListener('contextmenu', (e) => e.preventDefault());
      let jHeld = false;
      window.addEventListener('keydown', (e) => { if (e.key !== 'j' || WORLD.paused || jHeld) return; jHeld = true; if (!(ACT.chargeable() && ACT.chargeStart())) ACT.attack(); });
      window.addEventListener('keyup', (e) => { if (e.key !== 'j') return; jHeld = false; ACT.chargeEnd(); });
      // the catch pouch: a small icon with a count; tapping it opens the critter card (the same one grass sightings use)
      const pb = $('pouch'); let pbN = -1;
      pb.addEventListener('click', () => openPouch());
      setInterval(() => {
        const n = (game.state.pouch || []).length, show = ACT.enabled() && n > 0 && !WORLD.paused && !open;
        if (pb.hidden === show) pb.hidden = !show; if (show && n !== pbN) { pbN = n; pb.querySelector('b').textContent = n; pb.classList.remove('pop'); void pb.offsetWidth; pb.classList.add('pop'); }
      }, 150);
      const db = $('duel'); let dbSig = '';
      db.addEventListener('click', (ev) => { if (ev.target.closest('button')) ACT.giveUp(); });
      setInterval(() => {
        const di = ACT.duelInfo(), sig = di ? di.name + di.defeated + '/' + di.total + (di.dawn !== null && di.dawn !== undefined ? '/' + Math.round(di.dawn * 40) : '') : '';
        if (sig !== dbSig) { dbSig = sig; db.hidden = !di; if (di) db.innerHTML = '<b>' + esc(di.tower ? 'Night ' + di.floor : di.name) + '</b>' + (di.tower && di.dawn !== null ? '<span class="dawn" aria-label="until morning"><i style="width:' + Math.round(di.dawn * 100) + '%"></i></span>' : LEADERS.some((L) => L.name === di.name) ? '' : '<span>' + di.defeated + ' of ' + di.total + ' down</span>') + '<button aria-label="Give up the duel">Give up</button>'; }
      }, 150);
      setInterval(() => {
        const show = ACT.ready() && !WORLD.paused && !open; if (atk.hidden === show) atk.hidden = !show; if (!show) { if (wheelOn) closeWheel(false); return; }
        atk.style.setProperty('--cd', ACT.cdFrac().toFixed(2));
        const mv = ACT.moves()[ACT.sel]; const l = $('atk-label'); if (mv && l.textContent !== mv.name) l.textContent = mv.name;
      }, 80);
    }
    setInterval(() => { if (!document.hidden && game) game.addPlayTime(0.5); }, 30000);
    const comps = { Critter: TPL.compile(document.getElementById('tpl-critter').innerHTML) };
    const screenTpl = TPL.compile(document.getElementById('tpl-screen').innerHTML);
    game = new Game({});
    // one-time cleanup: the experimental and developer switches were removed from Settings, so turn off what they may have left on this device (Test mode, the dev unlock, level-skip / no-challenge overrides)
    try { if (!localStorage.getItem('critter-roll:cleanup1')) { DEV.levels = false; DEV.safe = false; devSave(); const s0 = game.state; if (s0.dev || (s0.settings && s0.settings.test)) game.update({ dev: false, settings: Object.assign({}, s0.settings, { test: false }) }); localStorage.setItem('critter-roll:cleanup1', '1'); } } catch (e) {}
    renderScreen = TPL.mount($('screen'), screenTpl, comps, () => game.renderVals());
    game.componentDidMount();
    let saved = null; try { saved = JSON.parse(localStorage.getItem('critter-roll:world') || 'null'); } catch (e) {}
    // a new day begins at Home (Meaning: being the keeper is the first thing you do each day): on the first load of a new real date after the lamp you stand at Home's door with the window dark above you.
    // Inside a cave, an interior or the Watch's lobby the saved position is kept (the window waits). Within the day the saved position is honoured as before. adv.flags.dayAt (default today) records the return.
    { const f = advOf().flags; if (f.lampLit) { const at = f.dayAt || today(), Ms = saved && WORLD.MAPS[saved.map]; if (at !== today() && !(Ms && (Ms.cave || Ms.interior))) saved = null; if (at !== today() || !f.dayAt) advSave((a) => { a.flags.dayAt = today(); }); } }
    WORLD.init($('world'), {
      onInteract: interact, onNear: setNear, onEncounter: encounter, npcs: npcList(),
      tint: () => (game.state.settings && game.state.settings.daynight === false) ? 'day' : timeOfDay(),
      objState: objState, carry: () => carry, relit: () => !!advOf().flags.lampLit, homeLit: homeLitNow, frost: () => Math.max(0, Math.min(1, stillT / STILL_S)), weather: () => weatherAt(WORLD.map.id), still: stillMotion, ambient: () => !(game.state.settings && game.state.settings.ambient === false),
      exitLocked: (e) => !game.props.noGates && ROUTE_GATES[e.to] !== undefined && WORLD.map.id.indexOf('route-') !== 0 ? !game.gateOpen(e.to) : WORLD.map.id === 'town' && e.to !== 'town' && !game.props.noGates && (e.to === 'peak' ? ((game.state.npc && game.state.npc.seals) || []).length < 4 : !game.gateOpen(e.to)),   // gates by fires (seal counts), with the old level rule kept for older saves
      onAlert: () => { aggroT = Date.now(); musicLoop(); },
      critterLead: () => !!(game && game.state.caught.length && !window.__noFollower),   // you steer the critter; the human walks behind it
      follower: APP_FOLLOWER,
      onLocked: (e) => { if (e.to === 'peak') toast('Lashed shut.'); },   // a shut gate says nothing: its lamp is unlit (item 6, the drawing is package W's)
      // sight challenges: only trainers you have never beaten (beaten ones wait for you to talk to them)
      canChallenge: (n) => !DEV.safe && !ACT.dueling() && !dlg && !open && !menuOpen && game.state.caught.length > 0 && !game.beatenToday(n.id) && ((game.state.npc && game.state.npc.cleared) || []).indexOf(n.id) === -1 && game.ladderReady(n),
      onSpotted: (n) => { if (!dlg && !open && !menuOpen) challenge(n); else WORLD.setPaused(open || menuOpen || !!dlg); },
      onMap: (m) => { trailDir = {}; tending = null; carry = false; burn = {}; coralReset(); iceCells = []; stillT = 0; plank(m.name); setNear(null); applyDungeon(); applyGym(); applyLamp(); applyForge(); renderWeather(); if (game && !m.interior && !m.hall && (game.state.visited || []).indexOf(m.id) === -1) game.update({ visited: (game.state.visited || []).concat([m.id]) }); },
      onGrass: () => {},   // the grass two tiles from the door is the hint; nothing is said
      pos: saved ? { x: saved.x, y: saved.y } : null, map: saved && saved.map
    });
    setNear(WORLD.nearest());
    $('act').addEventListener('click', () => interact(WORLD.nearest()));
    $('b-menu').addEventListener('click', openMenu);
    $('wm-close').addEventListener('click', closeMap);
    ['party', 'bag', 'shop'].forEach((id) => { $(id + '-close').addEventListener('click', closePanel); });
    $('pt-list').addEventListener('click', (e) => {
      const t = e.target.closest('[data-toggle]'), l = e.target.closest('[data-lead]'), p = game.partySeeds();
      if (t) { const s = +t.dataset.toggle, i = p.indexOf(s); if (i !== -1) p.splice(i, 1); else if (p.length < 3) p.push(s); setParty(p); }
      if (l) { const s = +l.dataset.lead; setParty([s].concat(p.filter((x) => x !== s))); }
    });
    $('bg-list').addEventListener('click', (e) => { const u = e.target.closest('[data-use]'); if (u) useItem(u.dataset.use); });
    $('sh-list').addEventListener('click', (e) => { const u = e.target.closest('[data-buy]'); if (u) buy(u.dataset.buy); });
    $('bk-close').addEventListener('click', closeBackup);
    $('bk-sync-now').addEventListener('click', () => { CLOUD.reconcile(); });
    wireAccount();
    $('cf-keep-cloud').addEventListener('click', () => { $('cf').hidden = true; CLOUD.resolve('cloud'); });
    $('cf-keep-local').addEventListener('click', () => { $('cf').hidden = true; WORLD.setPaused(false); CLOUD.resolve('local'); });
    $('bk-file').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => { $('bk-in').value = String(r.result || '').trim(); pendingImport = null; $('bk-restore').click(); }; r.readAsText(f); e.target.value = '';
    });
    (async () => {
      const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
      if (!dl) return;
      $('bk-download').hidden = false;
      $('bk-download').addEventListener('click', async () => {
        const d = new Date(), name = 'critter-roll-save-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.txt';
        try { await dl.save({ filename: name, data: exportCode() }); $('bk-msg').textContent = 'Save file downloaded.'; }
        catch (err) { $('bk-msg').textContent = err && err.code === 'declined' ? 'Download cancelled.' : 'The file could not be saved here. Copy the code instead.'; }
      });
    })();
    const copyText = (txt, ok) => { const done = () => { $('bk-msg').textContent = ok; }; const fb = () => { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); done(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fb); else fb(); };
    $('bk-stats-copy').addEventListener('click', () => copyText(game.statsExport(), 'Play stats copied. Paste them in your chat with Claude.'));
    (async () => {
      const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
      if (!dl) return;
      $('bk-stats-dl').hidden = false;
      $('bk-stats-dl').addEventListener('click', async () => {
        try { await dl.save({ filename: 'critter-roll-stats-' + game.statDay() + '.txt', data: game.statsExport() }); $('bk-msg').textContent = 'Play stats downloaded.'; }
        catch (err) { $('bk-msg').textContent = err && err.code === 'declined' ? 'Download cancelled.' : 'The file could not be saved here. Copy the stats instead.'; }
      });
    })();
    $('bk-copy').addEventListener('click', () => {
      const out = $('bk-out'); out.select();
      const done = () => { $('bk-msg').textContent = 'Copied. Paste it somewhere safe, like a note or an email to yourself.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(out.value).then(done, () => { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    });
    // Start over: two taps within 15 s; refused while signed in (the account copy would come straight back, or worse, an empty save would go up), so sign out first
    let resetArmed = 0;
    $('bk-reset').addEventListener('click', () => {
      const ac = CLOUD.account, signedIn = !!ac.email || (ac.mode === 'claude' && ['local', 'signedout', 'signin'].indexOf(CLOUD.status) === -1);
      if (signedIn) { $('bk-msg').textContent = 'You are signed in, so this save lives in your account. Sign out first (above), then start over. The account keeps this save.'; return; }
      if (Date.now() - resetArmed > 15000) { resetArmed = Date.now(); $('bk-reset').textContent = 'Erase and start over'; $('bk-reset').classList.add('armed'); $('bk-msg').textContent = 'This erases every critter, seal and step on this device. Tap again to start over.'; return; }
      window.__saveFrozen = true;
      try { const gone = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf('critter-roll:') === 0 && k !== 'critter-roll:device') gone.push(k); } gone.forEach((k) => localStorage.removeItem(k)); } catch (e) {}
      try { sessionStorage.removeItem('seeded'); } catch (e) {}
      $('bk-msg').textContent = 'Starting over...'; setTimeout(() => location.reload(), 200);
    });
    $('bk-in').addEventListener('input', () => { pendingImport = null; $('bk-restore').textContent = 'Check code'; $('bk-msg').textContent = ''; });
    $('bk-restore').addEventListener('click', () => {
      if (pendingImport) {
        try { SAVE_KEYS.forEach((k) => localStorage.removeItem(k)); Object.keys(pendingImport).forEach((k) => { if (SAVE_KEYS.indexOf(k) !== -1) localStorage.setItem(k, pendingImport[k]); }); localStorage.setItem('critter-roll:meta', JSON.stringify({ savedAt: Date.now(), syncedAt: 0 })); window.__saveFrozen = true; } catch (e) { $('bk-msg').textContent = 'Could not write the save on this device.'; return; }
        location.reload(); return;
      }
      const r = readCode($('bk-in').value);
      if (r.error) { $('bk-msg').textContent = r.error; return; }
      pendingImport = r.data; $('bk-restore').textContent = 'Replace my save';
      $('bk-msg').textContent = 'Found a save with ' + r.summary + '. This replaces your current game. Tap again to confirm.';
    });
    $('m-close').addEventListener('click', () => closeMenu());
    $('dev-close').addEventListener('click', closeDev); $('dev-body').addEventListener('click', (e) => { const t = e.target.closest('[data-dev]'); if (t) devAction(t.dataset.dev); });
    $('m-help').addEventListener('click', () => { closeMenu(); toast('Walk with the joystick. Tall grass hides wild critters, sparkling grass hides rarer ones. The Arena is for battles.'); });
    $('m-sound').addEventListener('click', () => { const s = Object.assign({}, game.state.settings); s.sound = !s.sound; game.update({ settings: s }); if (s.sound) game.sfx('tap'); renderMenu(); });
    $('m-grid').addEventListener('click', (e) => { const g = e.target.closest('[data-group]'); if (g) { toggleMenuGroup(g.dataset.group); return; } const t = e.target.closest('[data-tile]'); if (t) tile(t.dataset.tile); });
    $('menu').addEventListener('click', (e) => { if (e.target.id === 'menu') closeMenu(); });
    let pid = null; try { pid = localStorage.getItem('critter-roll:id'); if (!pid) { pid = String(100000000 + Math.floor(Math.random() * 899999999)); localStorage.setItem('critter-roll:id', pid); } } catch (e) { pid = '000000000'; }
    $('m-id').textContent = 'ID ' + pid;
    let devTaps = 0, devTimer = null;
    $('m-id').addEventListener('click', () => {
      devTaps += 1; clearTimeout(devTimer); devTimer = setTimeout(() => { devTaps = 0; }, 1500);
      if (devTaps >= 5 && !game.state.dev) { devTaps = 0; game.update({ dev: true }); renderMenu(); toast('Developer tools unlocked: open Menu, Game, Dev tools. Test mode is also in Settings.'); }
    });
    $('st-list').addEventListener('click', (e) => { const b = e.target.closest('[data-start]'); if (b) chooseStarter(+b.dataset.start); });

    window.addEventListener('keydown', (e) => {
      if (dlg && (e.key === 'Enter' || e.key === ' ') && !(e.target && e.target.closest && e.target.closest('#dlg-choices'))) { e.preventDefault(); advance(); return; }
      if (e.key === 'Escape') { if (panel) closePanel(); else if (!$('bk').hidden) closeBackup(); else if (mapOpen) closeMap(); else if (menuOpen) closeMenu(); else if (open) close(); }
    });
    $('dlg-box').addEventListener('click', advance);
    $('dlg-choices').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b && dlg && dlg.choices) dlg.choices[+b.dataset.c].fn(); });
    stick();
    let lastSaved = '';
    setInterval(() => { if (window.__saveFrozen) return; const p = WORLD.pos(); const s = JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y), map: WORLD.map.id }); if (s !== lastSaved) { lastSaved = s; try { localStorage.setItem('critter-roll:world', s); } catch (e) {} } }, 1000);
    paint();
    window.addEventListener('pagehide', () => CLOUD.flush());
    intro();
    CLOUD.init({ onStatus: cloudStatus, onAccount: cloudStatus, onConflict: showConflict, onAdopt: () => { window.__saveFrozen = true; try { sessionStorage.setItem('critter-roll:adopted', '1'); } catch (e) {} location.reload(); } });
  }
  return { build: 'review', words: () => { const t = (o) => { const r = {}; Object.keys(o).forEach((k) => { r[k] = [].concat(...o[k].map((x) => (Array.isArray(x) ? x.filter((y) => typeof y !== 'number') : (typeof x === 'string' ? [x] : [])))).flat(); }); return r; }; return { scaffold: t(SCAFFOLD), letgo: t(LETGO), say: SAY, lit: LIT_LINES, watch: WATCH_LINES }; }, homeLitNow: homeLitNow, keptDark: keptDark, objState: objState, watchOpen: watchOpen, placeRivals: placeRivals, tending: () => tending, carry: () => carry, stillT: () => stillT, stillK: () => Math.min(1, stillT / STILL_S), STILL_S: STILL_S, BURN_S: BURN_S, burn: () => Object.assign({}, burn), coral: () => JSON.parse(JSON.stringify(coral)), coralSeq: CORAL_SEQ, ice: () => iceCells.slice(), lampLevels: () => Object.assign({}, lampK), layoutInfo, mapSelect, placeCard, openPouch, pouchNext, towerFloorStart, weatherAt, start, schedule, close, open: openScreen, encounter, chooseStarter, hint, openPanel, closePanel, buy, useItem, setParty, openMenu, closeMenu, talk, advance, startTrainer, openMap, closeMap, travel, openBackup, exportCode, readCode, timeOfDay, get dialog() { return dlg; }, get game() { return game; }, toast };
})();
window.addEventListener('DOMContentLoaded', APP.start);
