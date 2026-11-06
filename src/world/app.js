const APP = (() => {
  const $ = (id) => document.getElementById(id);
  let game, renderScreen, open = false, queued = false, lastOpener = null, toastTimer = null;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; paint(); }); }
  let lastLevel = null;
  function paint() {
    if (!game || !game.state) return;
    const st = game.state, lv = game.levelInfo(st.xp || 0), en = game.energy();
    if (lastLevel !== null && lv.level > lastLevel) {
      const opened = Object.keys(GATES).filter((z) => GATES[z] > lastLevel && GATES[z] <= lv.level);
      if (opened.length && !game.props.testMode) toast(opened.map((z) => ZONE_NAMES[z]).join(' and ') + (opened.length > 1 ? ' are' : ' is') + ' now open!');
    }
    lastLevel = lv.level;
    $('c-rolls').textContent = (game.props.testMode ? 'Test' : en.left + '/20');
    $('c-rolls').setAttribute('aria-label', game.props.testMode ? 'Test mode: unlimited rolls' : en.left + ' of 20 rolls left today');
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
    if (open || dlg || menuOpen || mapOpen || panel || !$('bk').hidden || !$('cf').hidden || !$('starter').hidden) return;
    if (game.sightingsLeft() <= 0 && game.energy().left === 0) { if (Date.now() - outNotice > 20000) { outNotice = Date.now(); hintQueue.length = 0; hintBusy = true; toast('The grass rustles, but your free sightings and rolls are used up for today. Both refill at midnight.'); setTimeout(() => { hintBusy = false; pumpHints(); }, 4600); } return; }
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
      if (game.encounter(info)) { game.questTick('see', WORLD.map.id); showScreen(); setTimeout(() => hint('keep', 'Seeing critters is free (' + FREE_SIGHTINGS + ' per day). Keeping one costs rolls: 1 for Common, 2 Uncommon, 4 Rare, 8 Mythic.'), 1300); } else WORLD.setPaused(false); }, calm ? 0 : 280);
  }
  function openScreen(tab) {
    if (tab === 'battle') setTimeout(() => hint('battle', 'Pick a move each turn. Special moves are limited, Guard blocks the next hit, and Switch or Bag use your turn.'), 400);
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
      { id: 'seals', label: 'Seals', sub: ((st.npc && st.npc.seals) || []).length + '/4 leaders', icon: 'M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z' },
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
    else { openScreen('badges'); scrollToHeading({ quests: 'Daily quests', badges: 'Badges', settings: 'Settings', seals: 'Leader seals' }[id] || 'Trainer'); }
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
  function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label + (K.type ? ': more ' + K.type + ' critters' : '') : ''; }
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
    if (show && game.state.intro && game.state.caught.length) setTimeout(() => hint('weather', WEATHER.KINDS[k].label + ' in ' + mapName(id) + ': ' + WEATHER.KINDS[k].note + ' more often. Weather changes every 6 hours, and the Map shows each area\u2019s sky.'), 1600);
  }
  // ---------- world map: one painted overview, with fast travel built in (tap a place, then Travel) ----------
  let mapOpen = false, mapSel = null;
  const ZTYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
  const ZONE_TYPES = { frost: ['Frost', 'Stone'], ember: ['Ember', 'Volt'], moss: ['Moss', 'Bloom'], tide: ['Tide', 'Dusk'] };
  const CITY = { mossbrook: ['Mossbrook', 'past Moss Forest, to the west', 'Elder Wren’s gym'], frosthold: ['Frosthold', 'past Frost Peaks, to the north', 'Glacia’s gym'], cinderport: ['Cinderport', 'past Ember Fields, to the south', 'Blaze’s gym'], coralbay: ['Coralbay', 'past Tide Shore, to the east', 'Admiral Coral’s gym'], peak: ["Vigil Peak", 'up the trail north of the plaza', 'The Tower'], ascent: ['The Cold Ascent', 'through the north gate of Frosthold', 'A climb to an old beacon'], descent: ['The Cinder Descent', 'through the south gate of Cinderport', 'A descent to a buried forge'] };
  // what the card under the map says about a place, and whether you can fast travel there
  function placeCard(id) {
    const st = game.state, lv = game.levelInfo(st.xp || 0).level, here = WORLD.map && WORLD.map.id, test = game.props.noGates, vis = st.visited || [];
    const seals = (st.npc && st.npc.seals) || [], seen = st.seen || [], known = knownMaps();
    const c = { id: id, name: '', lines: [], wx: weatherAt(id) ? weatherText(weatherAt(id)) : '', travel: false, status: '' };
    if (id === 'town') { c.name = 'Sproutvale'; c.lines = ['Home, Lab, Shrine, Arena']; c.travel = true; }
    else if (ZONE_NAMES[id]) {
      const L = LEADERS.find((x) => x.zone === id), open = test || lv >= GATES[id];
      const found = ZONE_TYPES[id].reduce((n, t) => { const ti = ZTYPES.indexOf(t); return n + seen.filter((no) => Math.floor((no - 1) / 6) === ti).length; }, 0);
      c.name = ZONE_NAMES[id]; c.lines = [ZONE_TYPES[id].join(' and ') + ' critters', found + '/12 species found', L.name + (seals.indexOf(L.id) !== -1 ? ': seal earned' : ': not yet beaten')];
      if (open) c.travel = true; else c.status = 'Opens at level ' + GATES[id];
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
    $('wm-tod').textContent = { night: 'Night: Dusk critters roam every zone.', dawn: 'Dawn', dusk: 'Dusk', day: 'Daytime' }[timeOfDay()] + (weatherAt('town') ? ' The weather changes at ' + String(WEATHER.nextChange().getHours()).padStart(2, '0') + ':00.' : '');
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
  const LAND = { town: '#92CF68', moss: '#6DB551', frost: '#D6EAF5', ember: '#DE9A62', tide: '#EBDB9F', route: '#9CD170', mossbrook: '#80C45E', frosthold: '#D6EAF5', cinderport: '#DE9A62', coralbay: '#EBDB9F', peak: '#B9B0C8', ascent: '#D6EAF5', descent: '#DE9A62', dg: '#A99C86' };
  const ICOL = { town: '#E0524A', moss: '#2F8A3C', frost: '#7DB8E0', ember: '#E0652A', tide: '#2D7FD0', mossbrook: '#3E8E3E', frosthold: '#5AA7D6', cinderport: '#C8502A', coralbay: '#1E9AA8', peak: '#7A6F96', ascent: '#5AA7D6', descent: '#C8502A' };
  const kindOf = (id) => id === 'town' ? 'town' : ZONE_NAMES[id] ? 'zone' : id === 'peak' ? 'peak' : id === 'ascent' || id === 'descent' ? 'mark' : CITY[id] ? 'city' : id.indexOf('dg-') === 0 ? 'dg' : 'route';
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
  const SCAFFOLD = {
    pip: [[1, ['You know all of this already.', 'I just like standing here.']]],
    mira: [[2, ['Take what you need.']]],
    fern: [[1, ['You know where to look.']], [3, ['I have been writing about you. Only a little.', 'There is not much left that I can tell you.']]],
    remy: [[1, ['The terminal is where it always was.']], [3, ['Fern is outside less these days.', 'She says she has run out of things to tell the trainers who come through.']]],
    mom: [[2, ['You are home. Good.', 'I stopped tidying the desk. You know where things are.']], [3, ['You did not ask what is for dinner.', 'The lamp in the window is on. I did not light it.']], [4, ['You do not have to tell me where you are going.', 'The door stays open. It always did.']]]
  };
  // the keepers rest once you have carried the light yourself (Meaning: they held it for you until you could). Lines only; [condition, lines].
  const LETGO = {
    maren: [() => advOf().flags.lampLit, ['The glass has not been warm in my lifetime.', 'I used to stand here all night. I think I will sit down.']],
    hale: [() => advOf().flags.forgeLit, ['It is warm in here. I had forgotten.', 'I will not need to watch it.']],
    keeper: [() => advOf().flags.secret, ['The seat is empty again, and it is not sad.', 'I held it so long. It is lighter than I expected.']],
    joss: [() => advOf().flags.lampLit, ['I did not light it tonight. It lit.', 'I think I am out of work. I do not mind.']],
    brandt: [() => advOf().flags.lampLit, ['One cup tonight.']],
    mom: [() => advOf().flags.lampLit, ['There was a light across the ceiling last night. It went the whole way over the roof.', 'I did not worry. Is that not odd?']]
  };
  const letGoLines = (n) => { const r = LETGO[n.id]; return r && r[0]() ? r[1] : null; };
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
    if (st.caught.length >= 2) hint('party', 'You have more than one critter now. Put them in your party (Menu, then Party) so they can step in during battles.');
    if ((st.essence || 0) >= 3 && st.caught.length) hint('shop', 'Mira near your home sells potions and charms for essence.');
    const ac = CLOUD.account;
    if (ac.mode === 'supa' && ac.available && !ac.email && st.caught.length >= 3) hint('online', 'Tip: sign in (Menu, then Save) so your progress is saved online and follows you to other devices.');
    if ((st.essence || 0) >= 15 && st.caught.length) hint('evolve', 'You have enough essence to evolve a critter. Open it in the Dex.');
  }
  async function intro() {
    if (game.state.intro || game.state.caught.length) return;
    await Promise.race([CLOUD.ready, new Promise((r) => setTimeout(r, 12000))]);
    if (game.state.intro || game.state.caught.length) return;
    showDialog('Professor Fern', ['Welcome to Sproutvale! I am Professor Fern.', 'Critters live all over this land: in the tall grass, the forests, the peaks and the shore.', 'Every trainer starts with a partner. Here are three. Each one is strong against one of the others.'], null, openStarter);
  }
  function openStarter() {
    const seeds = game.starters(), power = (k) => k.stats.reduce((x, q) => x + q.value, 0);
    $('st-list').innerHTML = seeds.map((s) => {
      const k = game.make(s, 1);
      return '<div class="scard"><img src="' + PIX.sprite(k, 'big') + '" alt="" width="120" height="105"><b>' + esc(k.name) + '</b><span>' + k.element.name + ' type · ' + k.natureText.split(':')[0] + '</span><span>Strong vs ' + k.strongVs.replace(' + ', ' and ').toLowerCase() + '</span><span>Power ' + power(k) + '</span><button class="bk-btn gold" data-start="' + s + '">Choose ' + esc(k.name) + '</button></div>';
    }).join('');
    $('starter').hidden = false; $('hud').hidden = true; WORLD.setPaused(true);
    const f = $('st-list').querySelector('button'); if (f) f.focus();
  }
  function chooseStarter(s) {
    const k = game.make(s, 1);
    game.update({ caught: [{ seed: s, stage: 1 }], party: [s], fighter: s, intro: true, seen: [k.speciesNo] }, [{ t: 'keep' }, { t: 'species' }]);
    game.sfx('claim');
    $('starter').hidden = true;
    showDialog('Professor Fern', ['A wonderful choice! ' + k.name + ' will be a loyal partner.', 'The world is yours to explore. Start by finding more critters in the tall grass, and talk to people: they know more than the signs do. Good luck!'], null);
  }
  // ---------- party, bag, shop ----------
  const ITEMS = {
    potion: { name: 'Potion', price: 3, desc: 'Heals 40% HP in battle. Uses your turn.' },
    super: { name: 'Super Potion', price: 7, desc: 'Fully heals in battle. Uses your turn.' },
    charm: { name: 'Rare Charm', price: 10, desc: 'Your next 3 wild encounters get sparkling-grass odds.' },
    ticket: { name: 'Roll Ticket', price: 5, desc: 'Gives back 1 roll today. Up to 3 per day.' },
    herb: { name: 'Mossleaf Remedy', price: 4, desc: 'Heals 40% HP and cures burn, weaken, daze and drain. Uses your turn. Sold in Mossbrook.', city: 'mossbrook' },
    ward: { name: 'Frost Ward', price: 5, desc: 'Your critter takes 65% less damage from the next 5 hits. Uses your turn. Sold in Frosthold.', city: 'frosthold' },
    whet: { name: 'Whetstone', price: 5, desc: 'Your critter deals 70% more damage for the rest of the battle. Uses your turn. Sold in Cinderport.', city: 'cinderport' },
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
  function renderShop() {
    const bag = bagOf(), ess = game.state.essence || 0;
    $('sh-ess').textContent = ess + ' essence';
    const here = WORLD.map && WORLD.map.id, local = CITY_ITEM[here];
    $('sh-list').innerHTML = Object.keys(ITEMS).filter((id) => !ITEMS[id].city || id === local).map((id) => {
      const it = ITEMS[id], can = ess >= it.price;
      return '<div class="prow"><span class="pn2"><b>' + it.name + '</b><span>' + it.desc + ' You have ' + bag[id] + '.</span></span>' +
        '<button class="pbtn' + (can ? ' on' : '') + '" data-buy="' + id + '"' + (can ? '' : ' disabled') + ' aria-label="Buy ' + it.name + ' for ' + it.price + ' essence">' + it.price + ' ◆</button></div>';
    }).join('');
  }
  function buy(id) {
    const it = ITEMS[id], ess = game.state.essence || 0; if (!it || ess < it.price) return;
    const bag = bagOf(); bag[id] += 1; game.update({ bag: bag, essence: ess - it.price }); game.sfx('tap'); renderShop();
  }
  // ---------- people ----------
  function npcList() {
    const M = WORLD.MAPS, out = { town: [
      { id: 'fern', name: 'Professor Fern', x: 37, y: 11, kind: 'request', pal: { h: '#E8E8F0', y: '#F4F7FB', Y: '#C9D3E6', p: '#4A5878' },
        need: 'species5', reward: 10,
        ask: ['Ah, a new trainer! I am Professor Fern. I study critters here at the Lab.', 'Could you help my research? Discover 5 different species and come back. I will make it worth your while.'],
        progress: (g) => 'You have found ' + (g.state.seen || []).length + ' of 5 species so far. The tall grass outside town is a good start.',
        thanks: ['Five species already? Wonderful work!', 'Here are 10 essence for your trouble.'],
        after: ['Keep exploring. The Species page in your Dex shows where each type lives.'] },
      { id: 'pip', name: 'Pip', x: 25, y: 14, kind: 'talk', pal: { h: '#8A5A34', y: '#7CD957', Y: '#4FA83A' },
        lines: ['Did you know? Sparkling grass hides rarer critters.', 'Trainers stand still and watch. If they see you, get ready to battle!'] },
      { id: 'mira', name: 'Mira', x: 6, y: 15, kind: 'shop', pal: { h: '#C0392B', y: '#F59ACB', Y: '#D86BA6' },
        lines: ['Welcome to my stall! Potions for battles, charms for rare finds, tickets for one more roll.'] },
      { lv: 1, id: 'rowan', name: 'Rowan', x: 13, y: 20, dir: 'up', kind: 'trainer', trainer: true, pal: { cap: true, c: '#3C6FE0', y: '#3C6FE0', Y: '#28509E' },
        types: ['Moss', 'Ember'], size: 2, stage: 1,
        intro: ['Hey, you look new around here!', 'Let me see what your critters can do.'], winLine: 'Wow, you are good! Here is your reward.', beatenLines: ['That was a great battle. Come back tomorrow for a rematch!'] }
    ] };
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
      { lv: 5, id: 'glacia', name: 'Glacia', at: 'leader', kind: 'leader', leader: true, pal: { h: '#DCEBFF', y: '#8FD8EA', Y: '#5E97AE', p: '#2E4A66' }, types: ['Frost', 'Stone'], size: 4, stage: 2, pick: 0.75, firstReward: 25, needs: 'bram',
        intro: ['I am Glacia, leader of Frost Peaks.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'The cold keeps what it is given. Take the Frost Seal. It will keep.', sealLine: 'The Frost Seal is quiet. Quiet fires last longest. Ember Fields awaits at level 6.', beatenLines: ['Rest by the fire, trainer. We can battle again tomorrow.'] },
      { lv: 9, id: 'bram', name: 'Hiker Bram', at: 'trainer', kind: 'trainer', trainer: true, pal: { cap: true, c: '#C0392B', y: '#8A5A34', Y: '#6B4626' }, types: ['Frost', 'Stone'], size: 4, stage: 2, pick: 0.5,
        intro: ['These peaks make critters tough.', 'Think yours can handle the cold?'], winLine: 'You climbed right over me! Well earned.', beatenLines: ['My critters need a rest. Tomorrow, then!'] },
      { id: 'sola', name: 'Sola', at: 'entrance', kind: 'request', pal: { h: '#F5D36A', y: '#9CC9D9', Y: '#5E97AE' }, need: 'stone', reward: 6,
        ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'Could you show me one? Keep a Stone critter and come back.'],
        progress: () => 'Still no Stone critter? They live in the tall grass here in Frost Peaks.', thanks: ['A Stone critter! It is even rockier than I imagined.', 'Take these 6 essence, as thanks.'], after: ['I will treasure that picture.'] }
    ]);
    zone('ember', [
      { lv: 15, id: 'blaze', name: 'Blaze', at: 'leader', kind: 'leader', leader: true, pal: { cap: true, c: '#1E1A2A', y: '#FF7A45', Y: '#C2410C' }, types: ['Ember', 'Volt'], size: 4, stage: 3, pick: 0.55, firstReward: 30, needs: 'kiki',
        intro: ['So you made it to the heart of Ember Fields.', 'I am Blaze. My team burns at full power. Ready?'], winLine: 'You did not put it out. You fed it. Take the Ember Seal.', sealLine: 'This one wants feeding every day. Tide Shore opens at level 9.', beatenLines: ['My flames need to rekindle. Come back tomorrow!'] },
      { lv: 10, id: 'kiki', name: 'Kiki', at: 'trainer', kind: 'trainer', trainer: true, pal: { h: '#F28C28', y: '#D8574A', Y: '#A8382E' }, types: ['Ember', 'Volt'], size: 3, stage: 2, pick: 0.55,
        intro: ['It is hot out here, and so are my critters!', 'Ready to feel the heat?'], winLine: 'Okay, okay, you win. That was electric!', beatenLines: ['My team is still cooling down. Come back tomorrow!'] },
      { id: 'dax', name: 'Dax', at: 'entrance', kind: 'request', pal: { cap: true, c: '#F5C542', y: '#4A5878', Y: '#2B3555' }, need: 'evolved', reward: 8,
        ask: ['I heard critters can evolve if you give them essence.', 'I have never seen one! Show me a critter at stage 2 or higher?'],
        progress: () => 'Evolve a critter in the Dex, then come back. Release extra critters to earn essence.', thanks: ['Whoa, look at the size of it!', 'Here, 8 essence. Thanks for showing me.'], after: ['One day I will evolve mine too.'] }
    ]);
    zone('moss', [
      { lv: 11, id: 'wren', name: 'Elder Wren', at: 'leader', kind: 'leader', leader: true, pal: { h: '#E8E8F0', y: '#4E6B19', Y: '#2E4210', p: '#4A3424' }, types: ['Moss', 'Bloom'], size: 3, stage: 2, pick: 0.6, firstReward: 20, needs: 'ivy',
        intro: ['Welcome, young trainer. I am Elder Wren, leader of Moss Forest.', 'Show me that you and your critters grow together.'], winLine: 'It grows because someone stays beside it. Stay a while. The Moss Seal.', sealLine: 'The first fire is the easiest to keep. Frost Peaks opens at level 3.', beatenLines: ['The forest needs rest. Visit me again tomorrow.'] },
      { lv: 4, id: 'ivy', name: 'Ivy', at: 'trainer', kind: 'trainer', trainer: true, pal: { h: '#2E7D32', y: '#F5A3D0', Y: '#D86BA6' }, types: ['Moss', 'Bloom'], size: 3, stage: 2, pick: 0.3,
        intro: ['Shh, the forest is listening.', 'Let us give it a battle worth hearing.'], winLine: 'Beautifully done. The forest approves.', beatenLines: ['Let the forest rest today. Tomorrow we can battle again.'] },
      { id: 'oak', name: 'Old Oak', at: 'talk', kind: 'talk', pal: { h: '#BDBDBD', y: '#6B8E23', Y: '#4E6B19' },
        lines: ['Every critter has a nature. Brave ones hit harder but bruise easier.', 'Pick the nature that fits how you like to battle.'] }
    ]);
    zone('tide', [
      { lv: 14, id: 'coral', name: 'Admiral Coral', at: 'leader', kind: 'leader', leader: true, pal: { cap: true, c: '#F8F8F8', y: '#1E2A4A', Y: '#0E1A38', p: '#1E2A4A' }, types: ['Tide', 'Dusk'], size: 5, stage: 3, pick: 0.75, firstReward: 35, needs: 'marlo',
        intro: ['Admiral Coral, leader of Tide Shore. Five critters, every one a veteran of the storm.', 'Win, and you will have tended every fire in the land.'], winLine: 'The sea gives back what it is given. The Tide Seal is yours.', sealLine: 'Four fires. Someone left a light on for you. Perhaps they still do. The trail north of Sproutvale is open.', beatenLines: ['My fleet is in the harbor. Challenge me again tomorrow.'] },
      { lv: 19, id: 'marlo', name: 'Captain Marlo', at: 'trainer', kind: 'trainer', trainer: true, pal: { cap: true, c: '#1E2A4A', y: '#FFFFFF', Y: '#C9D3E6' }, types: ['Tide', 'Dusk'], size: 4, stage: 3, pick: 0.4,
        intro: ['Ahoy! Four critters, one captain.', 'Can your crew weather all of them?'], winLine: 'You sailed through my whole crew! A fine captain you would make.', beatenLines: ['My crew is resting below deck. Tomorrow, sailor!'] },
      { id: 'nell', name: 'Nell', at: 'entrance', kind: 'request', pal: { h: '#6B3E1E', y: '#3C95DC', Y: '#2A6FB0' }, need: 'rare', reward: 8,
        ask: ['The waves sometimes wash up rare critters.', 'Have you found a Rare one yet? I would love to see it.'],
        progress: () => 'Sparkling grass is the best place to find Rare critters.', thanks: ['A Rare critter! It practically glows.', 'Please, take 8 essence.'], after: ['I will keep watching the waves.'] }
    ]);
    // Mossbrook (city): Elder Wren moves into her gym; Moss Forest keeps Ivy and Old Oak
    const wren = out.moss.find((n) => n.id === 'wren');
    out.moss = out.moss.filter((n) => n.id !== 'wren');
    Object.assign(wren, { x: 10, y: 3, dir: 'down', city: 'mossbrook', intro: ['Welcome to Mossbrook, young trainer. I am Elder Wren, leader of this gym.', 'Show me that you and your critters grow together.'] });
    out['gym-wren'] = [wren];   // the leader waits inside the gym, behind the vines
    out.mossbrook = [
      { id: 'juniper', name: 'Herbalist Juniper', x: 8, y: 10, kind: 'shop', pal: { h: '#6B3FA0', y: '#8E5BC8', Y: '#6B3FA0' },
        lines: ['Welcome to the Herb Hut! Same remedies as Mira in Sproutvale, brewed with Mossbrook leaves.'] },
      { lv: 3, id: 'sorrel', name: 'Forager Sorrel', x: 11, y: 11, dir: 'down', kind: 'trainer', trainer: true, pal: { cap: true, c: '#6B8E23', y: '#C9A26A', Y: '#8A6A44' }, types: ['Bloom', 'Volt'], size: 3, stage: 2, pick: 0.5,
        intro: ['Hold on, traveler! Mossbrook greets newcomers with a battle.', 'My critters grew up on forest berries. Ready?'], winLine: 'Ha! You earned your welcome. Here is your reward.', beatenLines: ['Rest up and come back tomorrow. The berries will be ripe again.'] },
      { id: 'fennel', name: 'Fennel', x: 24, y: 15, kind: 'talk', pal: { h: '#E8E8F0', y: '#C0503A', Y: '#8A3A28' },
        lines: ['Mossbrook was built around the old trees, not the other way around.', 'Elder Wren says a critter that rests well battles well.', 'Travellers come back from the Pass with the same story and different endings.'] },
      { id: 'bryn', name: 'Bryn', x: 16, y: 16, kind: 'talk', pal: { h: '#8A5A34', y: '#FFD86B', Y: '#E0A830' },
        lines: ['I saw a shiny critter once! It sparkled like the sun on the pond.', 'My mom says they are one in two hundred. I am still looking!', 'My uncle walked the Ashwood twice and came out two different ways. He says it was the same way.'] }
    ];
    // Frosthold, Cinderport, Coralbay (cities): leaders move into their gyms
    const city = (zoneId, cityId, leaderId, intro0, people) => {
      const L = out[zoneId].find((n) => n.id === leaderId);
      out[zoneId] = out[zoneId].filter((n) => n.id !== leaderId);
      Object.assign(L, { x: 19, y: 8, dir: 'down', city: cityId, intro: [intro0].concat(L.intro.slice(1)) });
      out[cityId] = [L].concat(people);
    };
    city('frost', 'frosthold', 'glacia', 'Welcome to Frosthold. I am Glacia, leader of this gym.', [
      { id: 'tove', name: 'Quartermaster Tove', x: 8, y: 10, kind: 'shop', pal: { h: '#E8E8F0', y: '#4A6A9A', Y: '#2E4A66' }, lines: ['Supplies for the cold road. Same goods as Sproutvale, packed for the snow.'] },
      { lv: 8, id: 'pike', name: 'Skier Pike', x: 15, y: 19, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#3E8EF7', y: '#DCEBFF', Y: '#8FB0D6' }, types: ['Frost', 'Tide'], size: 4, stage: 2, pick: 0.6,
        intro: ['Halt! Nobody enters Frosthold without a snowball fight.', 'Well, a critter battle. Same thing up here.'], winLine: 'Brr, you are tough. Here is your reward.', beatenLines: ['My critters need to thaw out. Tomorrow, rematch!'] },
      { id: 'hilde', name: 'Hilde', x: 24, y: 15, kind: 'talk', pal: { h: '#E8C07A', y: '#8E5BC8', Y: '#6B3FA0' }, lines: ['The palisade keeps out the wind, not the critters. They come and go as they like.', 'Some nights there is a light in the pass that is nobody\u2019s.', 'Glacia trains on the ice every morning. Her critters do not slip.'] },
      { id: 'olaf', name: 'Old Olaf', x: 16, y: 16, kind: 'talk', pal: { h: '#BDBDBD', y: '#5E97AE', Y: '#3E6E8E' }, lines: ['They say a tower stands on Vigil Peak, up the trail north of Sproutvale\u2019s plaza.', 'Only trainers with all four Leader Seals may climb it.', 'Before first light the shore gives back things the sea took.'] }
    ]);
    city('ember', 'cinderport', 'blaze', 'Welcome to Cinderport. I am Blaze, and this forge is my gym.', [
      { id: 'bea', name: 'Bellows Bea', x: 8, y: 10, kind: 'shop', pal: { h: '#3A2A1A', y: '#8A4A2A', Y: '#6A3A2A' }, lines: ['Forge Market! Same remedies as Mira\u2019s, kept warm by the furnace.'] },
      { lv: 12, id: 'tamsin', name: 'Smith Tamsin', x: 30, y: 6, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#5A4A4A', y: '#FF7A45', Y: '#B83A10' }, types: ['Ember', 'Stone'], size: 4, stage: 2, pick: 0.5,
        intro: ['You walked down the forge road. That means you face my anvil first!', 'Let us see if your critters are tempered.'], winLine: 'Forged in fire! You earned this reward.', beatenLines: ['The forge needs to cool. Come back tomorrow.'] },
      { id: 'cole', name: 'Cole', x: 24, y: 15, kind: 'talk', pal: { h: '#2A1A10', y: '#C0503A', Y: '#8A3A28' }, lines: ['Do not touch the lava pool. Ember critters swim in it. You cannot.', 'Blaze says a burn wears down even the toughest critter.', 'The woods west of here are never quiet at dusk, and never loud either.'] },
      { id: 'ruby', name: 'Ruby', x: 16, y: 16, kind: 'talk', pal: { h: '#C0392B', y: '#FFD86B', Y: '#E0A830' }, lines: ['The miners found a shiny rock critter last week! Shinies are rare, but they show up anywhere.', 'Admiral Coral\u2019s harbor is east, past Tide Shore. The boardwalk starts by the water.'] }
    ]);
    city('tide', 'coralbay', 'coral', 'Welcome aboard in Coralbay. I am Admiral Coral, leader of this gym.', [
      { id: 'marina', name: 'Marina', x: 8, y: 10, kind: 'shop', pal: { h: '#E8C07A', y: '#3A8A8A', Y: '#2A6A6A' }, lines: ['Harbor Market! Same goods as Sproutvale, shipped in fresh.'] },
      { lv: 15, id: 'rafe', name: 'Deckhand Rafe', x: 27, y: 6, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#2A5A9A', y: '#FFFFFF', Y: '#C9D3E6' }, types: ['Tide', 'Volt'], size: 4, stage: 3, pick: 0.55,
        intro: ['Ahoy! Nobody walks my pier without a battle.', 'Storm-tested critters, ready to sail.'], winLine: 'Blow me down! A fine battle. Here is your reward.', beatenLines: ['My crew needs a rest. Come back with tomorrow\u2019s tide.'] },
      { id: 'finn', name: 'Finn', x: 24, y: 15, kind: 'talk', pal: { h: '#8A5A34', y: '#4A9A8A', Y: '#2A6A6A' }, lines: ['Coral was the youngest admiral the harbor ever had. Her critters never lose their footing.', 'Count the waves on the causeway at night. Everyone gets a different number.', 'After her seal, climb the Tower. It is up the trail north of Sproutvale.'] },
      { id: 'pearl', name: 'Pearl', x: 16, y: 16, kind: 'talk', pal: { h: '#F4EAD6', y: '#E0A0B8', Y: '#C07898' }, lines: ['I collect shells. My brother collects critter species. He has all 48!', 'Well, he says he does.'] }
    ]);
    // the three other leaders wait inside their trial halls, like Wren
    [['glacia', 'frosthold'], ['blaze', 'cinderport'], ['coral', 'coralbay']].forEach(([id, cid]) => { const L = out[cid].find((n) => n.id === id); out[cid] = out[cid].filter((n) => n.id !== id); Object.assign(L, { x: 10, y: 3, dir: 'down' }); out['gym-' + id] = [L]; });
    // route trainers (one per route; tuned with lbal5.py against the gate's party model)
    const rt = (id, name, x, y, dir, types, size, stage, lv, pick, intro, winLine, pal) => ({ id, name, x, y, dir, kind: 'trainer', trainer: true, types, size, stage, lv, pick, pal, intro, winLine, beatenLines: ['That was a good battle. Come back tomorrow for another.'] });
    out['route-mf'] = [rt('kai', 'Mountaineer Kai', 16, 7, 'up', ['Moss', 'Frost'], 4, 2, 11, 0.55, ['The pass is steep, and so is my challenge!', 'Highland critters are tough. Prove yours are tougher.'], 'You climbed right over me. Here is your reward.', { cap: true, c: '#4E8A3A', y: '#E8E8F0', Y: '#A8B2C8' })];
    out['route-cm'] = [rt('elm', 'Woodcutter Elm', 16, 7, 'up', ['Ember', 'Moss'], 4, 2, 11, 0.5, ['Careful, the Ashwood still smoulders.', 'My critters grew up between the embers and the moss. Battle!'], 'You chopped right through my team. Here is your reward.', { cap: true, c: '#8A4A2A', y: '#C9A26A', Y: '#8A6A44' })];
    out['route-fc'] = [rt('signe', 'Ice Fisher Signe', 16, 7, 'up', ['Frost', 'Tide'], 4, 3, 18, 0.5, ['Shh, you will scare the fish. Unless you want a battle?', 'Of course you do. Everyone on this coast does.'], 'Hooked and landed. You win this one. Here is your reward.', { cap: true, c: '#3E8EF7', y: '#DCEBFF', Y: '#8FB0D6' })];
    out['route-cc'] = [rt('mako', 'Diver Mako', 16, 7, 'up', ['Tide', 'Ember'], 4, 3, 18, 0.5, ['I just surfaced from the reef. My critters are warmed up!', 'Steam and spray. Let us battle.'], 'You out-swam me! Here is your reward.', { cap: true, c: '#2A6A6A', y: '#FF7A45', Y: '#B83A10' })];
    // new people beside the route landmarks and in town (positions are found at load: the free walkable tile nearest the hint)
    const spot = (mapId, hx, hy, taken) => {
      const Mp = M[mapId], at = (x, y) => Mp.grid[y] && ['.', ','].indexOf(Mp.grid[y][x]) !== -1, busy = (x, y) => (out[mapId] || []).some((o) => o.x === x && o.y === y) || (taken || []).some((t) => t[0] === x && t[1] === y);
      const reserved = (x, y) => mapId.indexOf('route-') === 0 && x >= 13 && x <= 19 && y >= 3 && y <= 11;
      for (let r = 0; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const x = hx + dx, y = hy + dy; if (x > 3 && y > 3 && x < Mp.W - 4 && y < Mp.H - 4 && at(x, y) && !busy(x, y) && !reserved(x, y)) return [x, y]; }
      return [hx, hy];
    };
    const near = (mapId, propId, dx, dy) => { const p = (M[mapId].props || []).find((q) => q.id === propId); return p ? spot(mapId, p.x + dx, p.y + dy) : spot(mapId, 10, 10); };
    const pers = (id, name, mapId, pos, pal, lines) => { (out[mapId] = out[mapId] || []).push({ id, name, x: pos[0], y: pos[1], dir: 'down', kind: 'talk', pal, lines }); };
    pers('edda', 'Scholar Edda', 'route-mf', near('route-mf', 'ruin', 5, 1), { h: '#3A2A1A', y: '#8E5BC8', Y: '#6B3FA0' }, ['These carvings show a critter of each type around one fire. I count eight.', 'Highland Pass joins Mossbrook and Frosthold. The arch is older than both.']);
    pers('hob', 'Charcoal Burner Hob', 'route-cm-crossing', spot('route-cm-crossing', 24, 22), { h: '#2A2A2A', y: '#6A5A48', Y: '#4A3A2A' }, ['The fire does what it likes. I only keep it company.', 'People ask whether the wood is dying. I ask whether they are.']);
    pers('isla', 'Net Mender Isla', 'route-fc-skerry', spot('route-fc-skerry', 22, 22), { h: '#C9D0DE', y: '#3A6A9A', Y: '#2A4A7A' }, ['I mend the same net every winter. It has never held a fish. It holds other things.', 'Do not mind the chair. It is not mine.']);
    pers('orrin', 'Tide Reader Orrin', 'route-cc-drowned', spot('route-cc-drowned', 11, 18), { h: '#6A5A3A', y: '#3A8A8A', Y: '#2A6A6A' }, ['I count the waves. Last night I lost count at a number I had not reached.', 'The blossoms are early this year. Or the sea is late.']);
    pers('brandt', 'Hermit Brandt', 'route-mf-cliff', spot('route-mf-cliff', 9, 14), { h: '#BDBDBD', y: '#7A6A52', Y: '#5A4A38' }, ['Oh. You came the long way, or the short one.', 'Sit if you like. The second cup is not for you, but it will not mind.']);
    pers('dell', 'Camper Dell', 'route-cm', near('route-cm', 'camp', 4, 1), { h: '#8A5A34', y: '#4FB06D', Y: '#2E6A2C' }, ['Ha, that is my camp! I only left to fill my flask at the well.', 'Ashwood Trail links Cinderport and Mossbrook. Ember and Moss critters roam here.']);
    pers('joss', 'Lamplighter Joss', 'route-fc', near('route-fc', 'lighthouse', 3, 3), { h: '#BDBDBD', y: '#C0503A', Y: '#8A3A28' }, ['I still trim the lamp every dusk. It guides nobody now, but it feels right.', 'Glacier Coast runs between Frosthold and Coralbay. Frost and Tide critters live along it.']);
    pers('neri', 'Beachcomber Neri', 'route-cc', near('route-cc', 'wreck', 5, 2), { h: '#E8C07A', y: '#3A8A8A', Y: '#2A6A6A' }, ['Tide critters nest in the wreck. Do not poke them, they bite!', 'Reef Causeway links Coralbay and Cinderport. Tide and Ember critters share it.']);
    pers('mae', 'Gardener Mae', 'town', spot('town', 24, 18), { h: '#F4EAD6', y: '#E0A0B8', Y: '#C07898' }, ['Mind the flowers! Sproutvale is nicest in the morning.', 'If you find a sparkling grass patch, take your time. Rare critters hide there.']);
    // the Forge Below: two smiths guard the cores in the side halls (west one faces east, east one faces west), the Forgemaster waits north of the hub
    const fsp = M['dg-forge'].spots;
    out['dg-forge'] = [
      rt('dross', 'Smith Dross', fsp.guard1[0], fsp.guard1[1], 'right', ['Stone', 'Ember'], 5, 3, 16, 0.5, ['The west hall belongs to the forge, and so does the core on that pedestal.', 'Win it from me, if you can.'], 'Take the core. The forge chose you before I did.', { h: '#3A2A1A', y: '#8A8498', Y: '#5A566A' }),
      rt('ingot', 'Smith Ingot', fsp.guard2[0], fsp.guard2[1], 'left', ['Ember', 'Volt'], 5, 3, 16, 0.5, ['East hall. One core, one smith, one battle.', 'The hammer is warmed up!'], 'A fine strike. The core is yours.', { h: '#C0392B', y: '#F5C518', Y: '#C99A00' }),
      Object.assign(rt('hale', 'Forgemaster Hale', fsp.hale[0], fsp.hale[1], 'down', ['Ember', 'Stone'], 5, 3, 18, 0.6, ['Two cores woke the hub. Not many climb down this far.', 'The furnace has been cold since my master laid down his hammer. I keep it cold until someone shows me they can keep it lit.', 'Show me.'], 'The fire knows you. Go and wake it.', { h: '#E8E8F0', y: '#FF8A3D', Y: '#C0503A' }), { boss: true, bonus: 10, afterLines: ['The furnace is yours to wake. Open its door.'] })
    ];
    // the Lamp Tower's guards and the Warden (boss)
    const lsp = M['dg-lamp'].spots;
    out['dg-lamp'] = [
      rt('bex', 'Lampkeeper Bex', lsp.guard1[0], lsp.guard1[1], 'down', ['Volt', 'Stone'], 5, 3, 20, 0.5, ['Another climber! The second chamber has a keeper, and it is me.', 'Mind the gates. They have a mind of their own.'], 'Light on your feet and on your critters. Go on.', { h: '#2A1A10', y: '#F5C518', Y: '#C99A00' }),
      rt('odo', 'Lampkeeper Odo', lsp.guard2[0], lsp.guard2[1], 'down', ['Frost', 'Tide'], 5, 3, 20, 0.5, ['Cold up here, is it not? I keep the third chamber warm with battles.', 'Ready?'], 'Well fought. The Warden is waiting above.', { h: '#E8E8F0', y: '#3E8EF7', Y: '#2A5A9A' }),
      Object.assign(rt('maren', 'Warden Maren', lsp.warden[0], lsp.warden[1], 'down', ['Volt', 'Frost'], 5, 3, 18, 0.5, ['You climbed the whole way. Not many do.', 'The great lamp has been dark since before my grandmother. I keep it, and I keep it dark until someone proves they can carry its light.', 'Show me.'], 'The light knows you. Go and wake it.', { h: '#C9A8FF', y: '#FFF3B0', Y: '#E0C060' }), { boss: true, bonus: 10, afterLines: ['The lamp is yours to wake. Touch the glass.'] })
    ];
    // the Cinder Descent (the Ascent turned upside down): a cook at the camp, an old smelter by the lava bridge, and three trainers (now facing up toward the trail)
    out.descent = [
      rt('kolb', 'Smelter Kolb', 14, 23, 'up', ['Ember', 'Stone'], 3, 3, 18, 0.5, ['The second ledge is mine, climber. Or should I say descender?', 'The heat sharpens my critters. Let us see yours!'], 'Cool as slag. Go on down.', { h: '#2A1A10', y: '#D8574A', Y: '#8A3A28' }),
      rt('yara', 'Cinder Runner Yara', 17, 39, 'up', ['Ember', 'Volt'], 5, 3, 18, 0.5, ['I run this trail every morning before the vents wake up!', 'Race me, in a battle!'], 'Fast and tough. Mind the lava.', { h: '#C0392B', y: '#FFD86B', Y: '#E0A830' }),
      rt('brec', 'Slag Hauler Brec', 18, 47, 'up', ['Stone', 'Ember'], 5, 3, 18, 0.5, ['The forge is just below. Nobody walks past my wagon without a battle.', 'I have been hauling slag all day and I need some fun.'], 'Hm. The forge is yours to look at.', { h: '#8A5A34', y: '#6A6A86', Y: '#3E3E58' }),
      { id: 'mirel', name: 'Cook Mirel', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#E8C07A', y: '#FF8A3D', Y: '#C0503A' }, lines: ['Welcome to the rim camp! The trail zig-zags down five ledges to the crater floor. The vents get hot, but the camp never does.', 'Trainers watch the trail from the sides. Wild Ember and Stone critters hide in the ash tufts, and the sparkling patch deep down hides the rare ones.'] },
      { id: 'brand', name: 'Old Brand', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#BDBDBD', y: '#8A5A34', Y: '#5E3C22' }, lines: ['That bridge crosses a river of real lava. It was built before anyone here was born, and it has never burned.', 'Below the crater there is a forge. They say it made every blade in the land, and then it went quiet.'] }
    ];
    out.descent[3].x = near('descent', 'camp', 4, 1)[0]; out.descent[3].y = near('descent', 'camp', 4, 1)[1]; const bs = spot('descent', 11, 27); out.descent[4].x = bs[0]; out.descent[4].y = bs[1];
    // the Cold Ascent: a guide at the base camp, an old hiker by the river, and three climbers whose sight lines cross the trail
    out.ascent = [
      rt('reka', 'Climber Reka', 14, 42, 'down', ['Frost', 'Stone'], 3, 3, 18, 0.5, ['The second ledge is mine. Everybody crosses it, and everybody battles me.', 'Rope up, trainer!'], 'Good footing. Go on up.', { h: '#C0503A', y: '#5E97AE', Y: '#3E6E8E' }),
      rt('joran', 'Skier Joran', 17, 26, 'down', ['Frost', 'Dusk'], 4, 3, 18, 0.5, ['I came down this slope in nine seconds once. Think you can climb it in ten minutes?', 'Show me what you have!'], 'You climb as well as you battle.', { h: '#2A1A10', y: '#E8E8F0', Y: '#9AA3B5' }),
      rt('dag', 'Ice Climber Dag', 18, 18, 'down', ['Stone', 'Volt'], 5, 3, 18, 0.5, ['The summit is right above us. Nobody passes the last ledge without a battle.', 'My critters have been waiting in the cold all day.'], 'Fine, fine. The beacon is yours to look at.', { h: '#8A5A34', y: '#4A4A7A', Y: '#2E2E58' }),
      { id: 'ansel', name: 'Guide Ansel', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#BDBDBD', y: '#D8574A', Y: '#8A3A28' }, lines: ['Welcome to base camp! Five ledges lead up to the old beacon, and the trail zig-zags so the wind cannot find you.', 'Trainers watch the trail from the sides. Wild Frost and Stone critters hide in the snow tufts. The sparkling patch near the top hides the rare ones.'] },
      { id: 'marta', name: 'Old Marta', x: 0, y: 0, dir: 'down', kind: 'talk', pal: { h: '#E8E8F0', y: '#8E5BC8', Y: '#6B3FA0' }, lines: ['The glacier river does not freeze, whatever the climbers say. The log bridge is older than my grandmother.', 'They say the beacon above once lit every road in the land. Four fires and one lamp, and the whole country knew where home was.'] }
    ];
    out.ascent[3].x = near('ascent', 'camp', 4, 1)[0]; out.ascent[3].y = near('ascent', 'camp', 4, 1)[1]; const ms = spot('ascent', 11, 38); out.ascent[4].x = ms[0]; out.ascent[4].y = ms[1];
    // the Sealed Arch's guards and the Keeper (the Keeper is a boss: bonus essence on the first win, boss music)
    const dsp = M['dg-arch'].spots;
    out['dg-arch'] = [
      rt('pell', 'Delver Pell', dsp.guard1[0], dsp.guard1[1], 'down', ['Dusk', 'Moss'], 4, 2, 14, 0.5, ['Halt. Nobody crosses the glowing moss without a battle.', 'The seat is kept. So are its rules.'], 'You are stronger than you look. Go on.', { h: '#3A2A1A', y: '#6A6A86', Y: '#3E3E58' }),
      rt('ione', 'Delver Ione', dsp.guard2[0], dsp.guard2[1], 'down', ['Stone', 'Frost'], 4, 2, 14, 0.5, ['The lamp hall is mine. The Keeper is beyond me.', 'Show me you can hold your own first.'], 'Hm. Fair enough. The Keeper is waiting.', { h: '#BDBDBD', y: '#5E97AE', Y: '#3E6E8E' }),
      Object.assign(rt('keeper', 'Keeper Orlen', dsp.keeper[0], dsp.keeper[1], 'down', ['Dusk', 'Stone'], 5, 3, 17, 0.6, ['You found your way in. Few remember the rhyme.', 'Eight critters were enough for the world, they said. The ninth was kept here, asleep.', 'Prove you can be trusted with the seat.'], 'The seat is yours to approach. It has waited a very long time.', { h: '#E8E8F0', y: '#33226E', Y: '#1E1448' }), { boss: true, bonus: 10, afterLines: ['The seat is quiet now. Go and see it.'] })
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
    out['in-lab'] = [{ id: 'remy', name: 'Lab Aide Remy', x: 3, y: 5, dir: 'down', kind: 'talk', pal: { h: '#3A2A1A', y: '#E8EEF8', Y: '#9AA3B5' }, lines: ['Professor Fern is usually just outside, greeting new trainers.', 'The Dex terminal records every species you keep. Use it any time.'] }];
    const RPAL = [{ h: '#8A5A34', y: '#C0503A', Y: '#8A3A28' }, { h: '#E8E8F0', y: '#4A6A9A', Y: '#2E4A66' }, { h: '#3A2A1A', y: '#4FB06D', Y: '#2E6A2C' }, { h: '#C0392B', y: '#E0A0B8', Y: '#C07898' }];
    Object.keys(RES).forEach((pid, i) => { out['in-' + pid] = [Object.assign({ id: 'res-' + pid, name: RES[pid][0], x: 7, y: 3, dir: 'down', kind: 'talk', pal: RPAL[i % RPAL.length], lines: RES[pid][1] }, pid === 'house-moss' ? { x: 4, y: 5, late: true } : {})]; });   // Wil is home only from dusk (the note on the door): `late` is read by the 500 ms rules
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
  const lampK = {}; let trailDir = {}; let lampStamp = 0, lampDt = 0;
  function lampState(o) {
    const M = WORLD.map, tr = M && M.trail, now = performance.now(); if (now - lampStamp > 5) { lampDt = Math.min(0.1, (now - lampStamp) / 1000); lampStamp = now; } const dt = lampDt; let want = 0;
    const tod = timeOfDay(), dark = tod === 'night' || tod === 'dusk';
    if (o.always) want = dark ? 1 : 0;
    else if (o.own) {
      const f = advOf().flags, key = 'own:' + o.id;
      if (!f[key] && tr) { const P = WORLD.pos(), px = P.x / 32, py = P.y / 32; let pi = 0, bd = 1e9; tr.cells.forEach((c, i) => { const d = (c[0] - px) * (c[0] - px) + (c[1] - py) * (c[1] - py); if (d < bd) { bd = d; pi = i; } }); if (bd < 36 && pi >= o.trail) advSave((a) => { a.flags[key] = true; }); }
      want = advOf().flags[key] ? 1 : 0;
    }
    else if (o.wave) want = dark && (Math.floor(now / 1100) % (o.wave.n + 3) === o.wave.i || Math.floor(now / 1100) % (o.wave.n + 3) === o.wave.i + 1) ? 1 : 0;
    else if (tr && dark) {
      const P = WORLD.pos(), px = P.x / 32, py = P.y / 32; let pi = 0, bd = 1e9; tr.cells.forEach((c, i) => { const d = (c[0] - px) * (c[0] - px) + (c[1] - py) * (c[1] - py); if (d < bd) { bd = d; pi = i; } });
      if (trailDir[M.id] === undefined) trailDir[M.id] = pi < tr.cells.length / 2 ? 1 : -1;
      const dir = trailDir[M.id]; let next = null; tr.lamps.forEach((li) => { const ahead = (li - pi) * dir; if (ahead > 2 && (next === null || ahead < (next - pi) * dir)) next = li; });
      want = next === o.trail ? 1 : 0;
    }
    const k = lampK[o.id] === undefined ? want : lampK[o.id]; lampK[o.id] = k + Math.sign(want - k) * Math.min(Math.abs(want - k), dt * 1.6); return { k: lampK[o.id] };
  }
  function objState(o) { const a = advOf(); if (o.kind === 'postlamp') return lampState(o); if (o.kind === 'gbed') return bedState(o); if (o.kind === 'gbrazier') return brazierState(o); if (o.kind === 'callamp') return callampState(o); if (o.kind === 'sprouts') return { stage: sealCount() }; if (o.kind === 'windowlamp') { const t = timeOfDay(); return { lit: sealCount() >= 3 || t === 'night' || t === 'dusk' }; } if (o.kind === 'growthpost') return { n: 1 + sealCount() }; if (o.kind === 'harborlamp') { const t = timeOfDay(); return { lit: t === 'night' || t === 'dusk' }; } if (o.kind === 'hearth') return { logs: 1 + (Math.floor(Date.now() / 86400000) % 3) }; if (o.kind === 'moored') { const t = timeOfDay(); return { lit: t === 'night' || t === 'dusk' }; } if (o.kind === 'camp') { const t = timeOfDay(); return { dark: t === 'night' || t === 'dusk' }; } if (o.id === 'beacon-door') return { open: true, glow: a.flags.lampLit ? 4 : 2, lit: !!a.flags.lampLit }; if (o.kind === 'plaque') return { open: !!a.open.arch, glow: o.id === 'arch' ? (a.flags.lampLit ? 4 : a.clues.length) : 0 }; if (o.kind === 'chest') return { open: !!a.flags['chest:' + o.id] }; if (o.order !== undefined) return { lit: (a.flags.rite || []).indexOf(o.order) !== -1 }; if (o.kind === 'lever') return { on: !!a.flags['lv:' + o.id] }; if (o.kind === 'greatlamp') return { lit: !!a.flags.lampLit }; if (o.kind === 'socket') return { on: !!a.flags['sock:' + o.core] }; if (o.kind === 'furnace') return { lit: !!a.flags.forgeLit }; return {}; }
  function gainClue(c) {
    if (advOf().clues.indexOf(c.id) !== -1) return;
    advSave((a) => { a.clues.push(c.id); }); game.sfx('claim');
    const n = advOf().clues.length;
    toast('New clue (' + n + '/' + ADV.CLUES.length + ') in your Journal.');
    if (n === ADV.CLUES.length) setTimeout(() => { if (!advOf().open.arch && WORLD.map.id !== 'dg-arch') toast('That is all four clues. Go back to the old arch in Highland Pass.'); }, 4800);
  }
  function journal() {
    const have = advOf().clues, lines = ['Clues about the Sealed Arch: ' + have.length + ' of ' + ADV.CLUES.length + '.'];
    ADV.CLUES.forEach((c) => lines.push(have.indexOf(c.id) !== -1 ? c.note : 'Not found yet. Try asking around ' + c.where + '.'));
    if (advOf().open.arch) { const f = advOf().flags; lines.push('The Sealed Arch: ' + (f.rubble ? 'the way north is clear.' : 'rubble blocks the way north. The empty seat, a fire bowl, a lamp and a hull lantern must mean something.') + (((game.state.npc && game.state.npc.cleared) || []).indexOf('keeper') !== -1 ? ' You have beaten the Keeper.' : '') + (advOf().flags.secret ? ' The ninth seat has answered.' : '')); }
    if (advOf().open.forge) { const f = advOf().flags; lines.push('The Forge Below: ' + (f.forgeLit ? 'the great furnace is lit.' : 'the north gate opens when both hub sockets hold a core (' + ((f['sock:A'] ? 1 : 0) + (f['sock:B'] ? 1 : 0)) + '/2). One core lies in each side hall.')); } else if ((game.state.visited || []).indexOf('descent') !== -1) lines.push('The Cinder Descent leads down to a buried forge.');
    if (advOf().open.lamp) lines.push('The Lamp Tower: ' + (advOf().flags.lampLit ? 'the great lamp is lit, and its beam crosses the land.' : 'levers and gates climb to the great lamp. What opens one gate may close another.')); else if ((game.state.visited || []).indexOf('ascent') !== -1) lines.push('The Cold Ascent leads to an old beacon tower at the top of the peaks.'); else if (have.length === ADV.CLUES.length) lines.push('You have every clue. The arch in Highland Pass should answer now.');
    showDialog('Journal', lines);
  }
  function archUse() {
    const a = advOf();
    if (a.open.arch) { game.sfx('tap'); WORLD.go('dg-arch'); return; }
    if (a.clues.length < ADV.CLUES.length) { showDialog('The old arch', ['Eight critters sit around one fire. A ninth seat is carved empty.', 'The stone stays cold and silent. Clues found: ' + a.clues.length + ' of ' + ADV.CLUES.length + '. Someone on the other roads may know more.']); return; }
    showDialog('The old arch', ['Fire for the first. Lamp for the second. Hull for the third.', 'The carved flame between the pillars begins to glow...', 'A passage opens in the old arch.'], null, () => { advSave((x) => { x.open.arch = true; }); game.sfx('claim'); setTimeout(() => { game.sfx('claim'); WORLD.go('dg-arch'); }, 200); });
  }
  function chestUse(o) {
    const key = 'chest:' + o.id; if (advOf().flags[key]) { toast('The chest is empty.'); return; }
    const r = o.reward || {}, bag = Object.assign({}, game.state.bag), parts = [];
    Object.keys(r).forEach((k) => { if (k === 'essence') parts.push(r[k] + ' essence'); else { bag[k] = (bag[k] | 0) + r[k]; parts.push(r[k] + ' ' + ({ potion: 'Potion', super: 'Super Potion', charm: 'Rare Charm', ticket: 'Roll Ticket' }[k] || k) + (r[k] > 1 ? 's' : '')); } });
    advSave((a) => { a.flags[key] = true; }); game.update({ bag: bag, essence: (game.state.essence || 0) + (r.essence | 0) }); game.sfx('claim');
    toast('You open the chest: ' + parts.join(' and ') + '!');
  }
  // the rite: light the fire bowl, the lamp and the hull's lantern in that order (the camp rhyme); a wrong order puts them all out again (nothing is lost)
  function riteUse(o) {
    const a = advOf(); if (a.flags.rubble) { toast('The light burns steady.'); return; }
    const seq = (a.flags.rite || []).slice();
    if (seq.indexOf(o.order) !== -1) { toast('It is already lit.'); return; }
    if (o.order === seq.length) {
      seq.push(o.order); advSave((x) => { x.flags.rite = seq; }); game.sfx('claim');
      if (seq.length === 3) { toast('The hull\u2019s lantern catches. The empty seat flares gold, and far to the north stone grinds aside.'); setTimeout(() => { advSave((x) => { x.flags.rubble = true; }); applyDungeon(); game.sfx('claim'); }, 700); }
      else toast(seq.length === 1 ? 'The fire bowl catches. One light burns.' : 'The lamp wakes. Two lights burn.');
    } else {
      advSave((x) => { x.flags.rite = []; }); game.sfx('tap');
      toast(a.clues.indexOf('camp') !== -1 ? 'The lights gutter out. The camp rhyme: fire first, then lamp, then hull.' : 'The lights gutter out. Maybe the order matters.');
    }
  }
  // clear the rubble once the rite is done (also on load)
  function applyDungeon() { const m = WORLD.MAPS['dg-arch']; if (!m || !advOf().flags.rubble) return; const rb = (m.objects || []).filter((x) => x.rubble); if (rb.length) WORLD.openTiles('dg-arch', m.rubble, rb.map((x) => x.id)); }
  // the ninth seat answers: Veilcrown joins you (level 12, one form); the Dex opens on it
  function grantSecret(seed, quiet) {
    seed = seed || SECRET_SEED; const S = SECRETS[seed];
    if (!S || game.state.caught.some((e) => e.seed === seed)) return;
    advSave((a) => { a.flags[S.flag] = true; });
    game.update({ caught: game.state.caught.concat([{ seed: seed, stage: 3, lv: S.lv }]) });
    toast(S.name + ' joined you!');
    if (quiet) return;
    game.sfx('mythic'); game.buzz([30, 40, 30, 40, 30, 40, 160]);
    setTimeout(() => { openScreen('dex'); game.setState({ selected: seed, dexView: 'mine', armed: false }); }, 900);   // openScreen clears the selection, so select after opening
  }
  // ---- the Lamp Tower: levers flip gates (open = an odd number of its levers are ON), the beacon door leads in, the great lamp ends the climb ----
  function applyLamp() { const m = WORLD.MAPS['dg-lamp']; if (!m || !m.gates) return; const f = advOf().flags; Object.keys(m.gates).forEach((gid) => WORLD.setGate('dg-lamp', gid, m.gates[gid].filter((l) => f['lv:' + l]).length % 2 === 1)); }
  // ---- Wren's Gym: the trial of being tended (Meaning: you grew because someone stayed with you). Press Tend by a seedling, then STAY: it grows about one stage per 2.5 s, two stages to bloom.
  // Step away and it stops, keeping what it grew (a stage is saved the moment it is reached, nothing is ever lost). All four in bloom and the vines draw back. Old saves (Wren beaten, or her seal) find the way open. ----
  const BED_STAGE_S = 2.5, BED_REACH = 1.9; let tending = null, tendP = 0, tendStamp = 0;
  function gymOpen(id) { const f = advOf().flags, npc = game.state.npc || {}; return !!f['gym:' + id] || (npc.cleared || []).indexOf(id) !== -1 || (npc.seals || []).indexOf(id) !== -1; }
  function gymWrenOpen() { return gymOpen('wren'); }
  function applyGym() {
    tending = null; carry = false; coralReset();
    ['wren', 'glacia', 'blaze', 'coral'].forEach((id) => { if (WORLD.MAPS['gym-' + id]) WORLD.setGate('gym-' + id, id, gymOpen(id)); });
    const G = WORLD.MAPS['gym-glacia']; if (G && G.pool) { const cells = []; for (let y = G.pool[1]; y <= G.pool[3]; y++) for (let x = G.pool[0]; x <= G.pool[2]; x++) cells.push([x, y]); if (gymOpen('glacia')) WORLD.setTiles('gym-glacia', cells, '.'); else { WORLD.setTiles('gym-glacia', cells, '~'); iceCells = []; stillT = 0; } }   // the whole pool is frozen for good once the trial is done
  }
  function gymDone(id, line) { advSave((x) => { x.flags['gym:' + id] = true; }); applyGym(); game.sfx('claim'); toast(line); setTimeout(() => toast(line), 900); }
  // ---- Glacia's Gym: the trial of stillness. Ice forms on the water around you only while you stand still; what you leave behind melts when you move on; the plate under you never melts. ----
  const STILL_S = 0.8; let iceCells = [], stillT = 0, stillStamp = 0;
  setInterval(() => {
    const M = WORLD.map; if (!M || M.id !== 'gym-glacia' || gymOpen('glacia')) return;
    const now = performance.now(), dt = Math.min(0.3, (now - stillStamp) / 1000); stillStamp = now;
    const P = WORLD.pos(), tx = Math.floor(P.x / 32), ty = Math.floor(P.y / 32), near = (c) => Math.max(Math.abs(c[0] - tx), Math.abs(c[1] - ty)) <= 1;
    if (WORLD.moving()) {
      stillT = 0; const melt = iceCells.filter((c) => !near(c)); if (melt.length) { WORLD.setTiles('gym-glacia', melt, '~'); iceCells = iceCells.filter(near); }
    } else {
      stillT += dt;
      if (stillT >= STILL_S) { const grow = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, y = ty + dy; if (M.grid[y] && M.grid[y][x] === '~') grow.push([x, y]); } if (grow.length) { WORLD.setTiles('gym-glacia', grow, '.'); iceCells = iceCells.concat(grow); game.sfx('tap'); } }
    }
    if (ty <= 8 && M.pool && ty < M.pool[1]) gymDone('glacia', 'The pool goes still, and stays.');   // the far shore
  }, 100);
  // ---- Blaze's Gym: the fire that has to be fed. Carry one log at a time from the woodpile; a brazier burns down in BURN_S seconds; all three alight at once opens the way. ----
  const BURN_S = 14; let carry = false, burn = {}, burnStamp = 0;
  function brazierState(o) {
    const now = performance.now(), dt = Math.min(0.2, Math.max(0, (now - burnStamp) / 1000)); burnStamp = now;
    if (gymOpen('blaze')) return { burn: 1 };
    Object.keys(burn).forEach((k) => { burn[k] = Math.max(0, burn[k] - dt / BURN_S); });
    return { burn: burn[o.id] || 0 };
  }
  function woodUse() { if (carry) { toast('You already carry one.'); return; } carry = true; game.sfx('tap'); toast('You take a log.'); }
  function brazierUse(o) {
    if (gymOpen('blaze')) { toast('It burns steadily.'); return; }
    if (!carry) { toast((burn[o.id] || 0) > 0 ? 'It is burning down.' : 'It is cold.'); return; }
    carry = false; burn[o.id] = 1; game.sfx('tap'); toast('The fire takes it.');
    const M = WORLD.MAPS['gym-blaze']; if ((M.objects || []).filter((q) => q.kind === 'gbrazier').every((q) => (burn[q.id] || 0) > 0)) gymDone('blaze', 'Three fires. The slag cracks.');
  }
  // ---- Coral's Gym: answering across the dark. The lamps light in an order (the call), go out, and you touch them in that order (the answer); three rounds, one lamp longer each time. ----
  const CORAL_SEQ = [[2, 0, 4], [1, 3, 0, 2], [4, 1, 3, 0, 2]], CALL_STEP = 0.7;
  let coral = { round: 0, phase: 'idle', i: 0, t: 0, lit: {}, answered: [] }, coralStamp = 0;
  function coralReset() { coral = { round: 0, phase: 'idle', i: 0, t: 0, lit: {}, answered: [] }; }
  function coralCall() { coral.phase = 'call'; coral.i = 0; coral.t = 0; coral.answered = []; coral.lit = {}; }
  setInterval(() => {
    const M = WORLD.map; if (!M || M.id !== 'gym-coral' || gymOpen('coral')) return;
    const now = performance.now(), dt = Math.min(0.2, (now - coralStamp) / 1000); coralStamp = now; coral.t += dt; const seq = CORAL_SEQ[coral.round];
    if (coral.phase === 'idle' && coral.t > 1.2) coralCall();
    else if (coral.phase === 'call') { const k = Math.floor(coral.t / CALL_STEP); coral.lit = {}; if (k < seq.length) coral.lit[seq[k]] = (coral.t % CALL_STEP) < CALL_STEP * 0.8 ? 1 : 0; else if (coral.t > seq.length * CALL_STEP + 0.6) { coral.phase = 'listen'; coral.t = 0; coral.lit = {}; } }
    else if (coral.phase === 'listen') { Object.keys(coral.lit).forEach((k) => { coral.lit[k] = Math.max(0, coral.lit[k] - dt * 2.5); }); if (coral.t > 9 && !coral.answered.length) { coral.phase = 'idle'; coral.t = 0; } }
    else if (coral.phase === 'wrong') { const on = Math.floor(coral.t / 0.3) % 2 === 0 && coral.t < 1.2; coral.lit = { 0: on ? 1 : 0, 1: on ? 1 : 0, 2: on ? 1 : 0, 3: on ? 1 : 0, 4: on ? 1 : 0 }; if (coral.t > 1.8) coralCall(); }
    else if (coral.phase === 'right') { coral.lit = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }; if (coral.t > 1.4) { coral.round += 1; if (coral.round >= CORAL_SEQ.length) { gymDone('coral', 'The lamps stay lit. The chain falls.'); } else coralCall(); } }
  }, 50);
  function lampUse(o) {
    if (gymOpen('coral')) { toast('It stays lit.'); return; }
    if (coral.phase !== 'listen') { if (coral.phase === 'call') toast('It is still speaking.'); return; }
    const seq = CORAL_SEQ[coral.round]; coral.lit[o.n] = 1; game.sfx('tap');
    if (seq[coral.answered.length] === o.n) { coral.answered.push(o.n); coral.t = 0; if (coral.answered.length === seq.length) { coral.phase = 'right'; coral.t = 0; } }
    else { coral.phase = 'wrong'; coral.t = 0; }
  }
  function callampState(o2) { return { lit: gymOpen('coral') ? 1 : (coral.lit[o2.n] || 0) }; }
  const bedStage = (o) => (gymWrenOpen() ? 2 : (advOf().flags['wb:' + o.id] | 0));
  function bedState(o) {   // called every frame the bed is drawn: this is where growth happens
    const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - tendStamp) / 1000)); if (tending === o.id) tendStamp = now;
    let stage = bedStage(o), p = 0;
    if (tending === o.id && stage < 2) {
      const P = WORLD.pos(), d = Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5));
      if (d > BED_REACH) { tending = null; tendP = 0; }   // you walked away: it stops, quietly
      else {
        tendP += dt / BED_STAGE_S;
        if (tendP >= 1) { tendP = 0; stage += 1; const key = 'wb:' + o.id; advSave((x) => { x.flags[key] = stage; }); game.sfx('tap');
          if (stage >= 2) { tending = null; const M = WORLD.MAPS['gym-wren'], all = (M.objects || []).filter((q) => q.kind === 'gbed').every((q) => (advOf().flags['wb:' + q.id] | 0) >= 2);
            if (all) { advSave((x) => { x.flags['gym:wren'] = true; }); applyGym(); game.sfx('claim'); toast('The vines draw back.'); setTimeout(() => toast('The vines draw back.'), 900); } else toast('It is in bloom.'); } }
        p = tendP;
      }
    }
    return { stage: stage, p: p, tending: tending === o.id };
  }
  // growth happens in bedState (every frame the bed is drawn); walking so far that the bed leaves the screen must end the tending too, so a timer checks the distance as well
  setInterval(() => { if (!tending || !WORLD.map || WORLD.map.id !== 'gym-wren') { tending = null; return; } const o = (WORLD.map.objects || []).find((q) => q.id === tending); if (!o) { tending = null; return; } const P = WORLD.pos(); if (Math.hypot(P.x / 32 - (o.x + 0.5), P.y / 32 - (o.y + 0.5)) > BED_REACH) { tending = null; tendP = 0; } }, 250);
  function gbedUse(o) {
    if (bedStage(o) >= 2) { toast('It is in bloom.'); return; }
    if (tending === o.id) { toast('You are already here.'); return; }
    tending = o.id; tendP = 0; tendStamp = performance.now(); game.sfx('tap'); toast('You kneel by the bed.');
  }
  function leverUse(o) { const key = 'lv:' + o.id, on = !advOf().flags[key]; advSave((a) => { a.flags[key] = on; }); applyLamp(); game.sfx('tap'); toast('You pull the lever. Somewhere, a gate grinds.'); }
  function beaconDoorUse() {
    if (advOf().open.lamp) { game.sfx('tap'); WORLD.go('dg-lamp'); return; }
    showDialog('The Beacon', ['The great door is not locked. It never was.', 'It only waited for someone to climb all the way up.'], null, () => { advSave((x) => { x.open.lamp = true; }); game.sfx('claim'); setTimeout(() => WORLD.go('dg-lamp'), 200); });
  }
  function greatLampUse() {
    const beaten = ((game.state.npc && game.state.npc.cleared) || []).indexOf('maren') !== -1;
    if (!beaten) { toast('The Warden stands between you and the great lamp.'); return; }
    const lit = advOf().flags.lampLit, got = game.state.caught.some((e) => e.seed === SECRET2_SEED);
    if (lit && got) { toast('The great lamp burns steadily. Its light reaches the whole land.'); return; }
    if (lit) { showDialog('The great lamp', ['The glass glows warm under your hand. Something small stirs inside it.', 'A spark slips out of the flame, bright and curious, and lands on your shoulder.'], null, () => grantSecret(SECRET2_SEED)); return; }   // lit before Wickling existed, or by the dev tools
    showDialog('The great lamp', ['You touch the cold glass. A spark answers you.', 'The flame wakes, and a beam of light climbs out of the tower, over the peaks and across the whole land.', 'Far away, in the old arch and the lighthouse, something wakes too.', 'A spark slips out of the flame, bright and curious, and lands on your shoulder.'], null, () => {
      advSave((x) => { x.flags.lampLit = true; }); WORLD.gust(); game.update({ essence: (game.state.essence || 0) + 30 }); game.sfx('mythic'); game.buzz([30, 40, 30, 40, 30, 40, 160]); toast('The beacon is lit! +30 essence.');
      setTimeout(() => grantSecret(SECRET2_SEED), 1800);
    });
  }
  // ---- the Forge Below: cores from the two halls go into the hub sockets (either order); both sockets open the north gate; the furnace ends the run ----
  const CORE_NAME = { A: 'flame', B: 'stone' };
  function applyForge() { const m = WORLD.MAPS['dg-forge']; if (!m) return; const f = advOf().flags; Object.keys(m.pickups || {}).forEach((g) => WORLD.setGate('dg-forge', g, !!f[m.pickups[g]])); Object.keys(m.rules || {}).forEach((g) => WORLD.setGate('dg-forge', g, m.rules[g].every((k) => f[k]))); }
  function forgeDoorUse() {
    if (advOf().open.forge) { game.sfx('tap'); WORLD.go('dg-forge'); return; }
    showDialog('The forge door', ['A doorway of dry heat, cut into the crater wall.', 'The forge has been quiet for a long time. Something inside is still warm.'], null, () => { advSave((x) => { x.open.forge = true; }); game.sfx('claim'); setTimeout(() => WORLD.go('dg-forge'), 200); });
  }
  function coreUse(o) { const f = advOf().flags; if (f['core:' + o.core]) return; advSave((x) => { x.flags['core:' + o.core] = true; }); applyForge(); game.sfx('claim'); toast('You lift the core of ' + CORE_NAME[o.core] + '. It is warm in your hands. Carry it to the hub.'); }
  function socketUse(o) {
    const f = advOf().flags, c = o.core;
    if (f['sock:' + c]) { toast('The socket glows steadily.'); return; }
    if (!f['core:' + c]) { toast('A socket for the core of ' + CORE_NAME[c] + '. It belongs in one of the side halls.'); return; }
    advSave((x) => { x.flags['sock:' + c] = true; }); applyForge(); game.sfx('claim');
    const both = advOf().flags['sock:A'] && advOf().flags['sock:B'];
    toast(both ? 'Both sockets wake. Far to the north, a slab of black iron grinds aside.' : 'The core of ' + CORE_NAME[c] + ' settles into its socket. One more.');
  }
  function furnaceUse() {
    const beaten = ((game.state.npc && game.state.npc.cleared) || []).indexOf('hale') !== -1;
    if (!beaten) { toast('The Forgemaster stands between you and the great furnace.'); return; }
    const lit = advOf().flags.forgeLit, got = game.state.caught.some((e) => e.seed === SECRET3_SEED);
    if (lit && got) { toast('The furnace roars quietly. The whole crater glows.'); return; }
    if (lit) { showDialog('The great furnace', ['A coal in the ash shifts and looks up.', 'It climbs out, small and heavy and warm, and settles against your boots.'], null, () => grantSecret(SECRET3_SEED)); return; }   // lit before Slagback existed, or by the dev tools
    showDialog('The great furnace', ['You pull the soot-black door open. A single ember glows in the ash.', 'You blow on it. It brightens, then catches, then roars.', 'Far above, the whole crater lights up, and the old forge wakes for the first time in a very long time.', 'A coal in the ash shifts and looks up. It climbs out, small and heavy and warm.'], null, () => {
      advSave((x) => { x.flags.forgeLit = true; }); game.update({ essence: (game.state.essence || 0) + 30 }); game.sfx('mythic'); game.buzz([30, 40, 30, 40, 30, 40, 160]); toast('The forge is lit! +30 essence.');
      setTimeout(() => grantSecret(SECRET3_SEED), 1800);
    });
  }
  function objectUse(o) {
    if (o.kind === 'cavemouth') { forgeDoorUse(); return; }
    if (o.kind === 'core') { coreUse(o); return; }
    if (o.kind === 'socket') { socketUse(o); return; }
    if (o.kind === 'furnace') { furnaceUse(); return; }
    if (o.kind === 'plaque') { if (o.id === 'arch') archUse(); else if (o.id === 'beacon-door') beaconDoorUse(); else toast(o.text || 'Nothing happens.'); return; }
    if (o.kind === 'lever') { leverUse(o); return; }
    if (o.kind === 'gbed') { gbedUse(o); return; }
    if (o.kind === 'woodpile') { woodUse(); return; }
    if (o.kind === 'gbrazier') { brazierUse(o); return; }
    if (o.kind === 'callamp') { lampUse(o); return; }
    if (o.kind === 'greatlamp') { greatLampUse(); return; }
    if (o.kind === 'chest') { chestUse(o); return; }
    if (o.order !== undefined) { riteUse(o); return; }
    if (o.kind === 'crown') {
      const beaten = ((game.state.npc && game.state.npc.cleared) || []).indexOf('keeper') !== -1;
      if (!beaten) { toast('The Keeper stands between you and the crown.'); return; }
      const got = game.state.caught.some((e) => e.seed === SECRET_SEED) || advOf().flags.secret;
      if (got) { showDialog('The ninth seat', ['The seat is warm. Whatever was kept here is with you now.']); return; }
      showDialog('The ninth seat', ['The crown lifts from the stone and the dust settles around it.', 'Something that has been kept here a very long time opens its eyes.', 'It looks at you. Then it looks at the empty seat, and it chooses you instead.'], null, () => grantSecret(SECRET_SEED)); return;
    }
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
      b('lampdoor', 'Open the beacon door') + b('gates', 'Open all tower gates') + b('maren', 'Beat the Warden' + (cl.indexOf('maren') !== -1 ? ' (done)' : '')) + b('lit', 'Light the great lamp') + b('wick', 'Get Wickling') + b('forgedoor', 'Open the forge door') + b('cores', 'Wake both forge sockets') + b('hale', 'Beat the Forgemaster' + (cl.indexOf('hale') !== -1 ? ' (done)' : '')) + b('forgelit', 'Light the great furnace') + b('slag', 'Get Slagback') + b('resetadv', 'Reset the adventure') + '</div>' +
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
    else if (k === 'gates') devAdv((x) => { x.flags['lv:L1'] = true; x.flags['lv:L2'] = false; x.flags['lv:L3'] = true; });
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
    return FLAVOR.pick({ id: n.id.replace(/^res-/, ''), region: (WEATHER.region(outside) || ''), indoor: !!M.interior, weather: weatherAt(outside), tod: tod, salt: d.toDateString() + '#' + Math.floor(d.getHours() / WEATHER.BLOCK_H) + (tod === 'night' ? 'n' : '') });
  }
  function talk(n) {
    WORLD.facePlayer(n);
    const sc = letGoLines(n) || scaffoldLines(n); if (sc) n = Object.assign({}, n, { lines: sc, afterLines: letGoLines(n) ? sc : n.afterLines, after: n.after ? sc : n.after });
    const g = game, done = (g.state.npc && g.state.npc.done) || [];
    const qcity = Object.keys(CITY_QUESTS).find((c) => CITY_QUESTS[c].giver === n.id);
    if (qcity) {
      const Q = game.cityQuest(qcity);
      if (Q.claimed) { showDialog(n.name, n.lines.concat(['Thanks again for today! I will have a new favor tomorrow.'])); return; }
      if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, ['You did it! Thank you so much.', 'Here, take this: +' + CQ_REWARD + ' essence and some trainer experience.']); return; }
      showDialog(n.name, [n.lines[0], 'Could you do me a favor today? Please ' + Q.q.txt + '.', 'Progress: ' + Q.n + '/' + Q.q.n + '. Come back to me when it is done. I have a new favor every day.']); return;
    }
    if (n.kind === 'talk') {
      const fl = n.id === 'pip' ? null : flavorLine(n), lines = fl ? [fl].concat(n.lines) : n.lines, clue = ADV.CLUES.find((c) => c.npc === n.id);
      if (clue && advOf().clues.indexOf(clue.id) === -1) { showDialog(n.name, lines.concat(clue.lines), null, () => gainClue(clue)); return; }   // the first talk also teaches a clue about the Sealed Arch
      showDialog(n.name, lines); return;
    }
    if (n.kind === 'shop') { showDialog(n.name, n.lines, null, () => openPanel('shop')); return; } // shops stay quick: no weather remark
    if (n.kind === 'request') {
      if (done.indexOf(n.id) !== -1) { showDialog(n.name, n.after); return; }
      if (NEEDS[n.need](g)) {
        const npc = Object.assign({ done: [], beaten: {} }, g.state.npc); npc.done = done.concat([n.id]);
        g.update({ npc: npc, essence: g.state.essence + n.reward }); g.sfx('claim');
        showDialog(n.name, n.thanks); return;
      }
      showDialog(n.name, n.ask.concat([n.progress(g)])); return;
    }
    if (n.kind === 'trainer') challenge(n);
    if (n.kind === 'leader') {
      const npcSt = g.state.npc || {}, cleared = npcSt.cleared || [];
      if (cleared.indexOf(n.needs) === -1) {
        const tn = Object.values(WORLD.allNpcs()).flat().find((x) => x.id === n.needs);
        showDialog(n.name, [n.intro[0], 'Before you challenge me, prove yourself against ' + (tn ? tn.name : 'the trainer') + ' in ' + mapName(npcHome(n.needs) || n.zoneId) + '.']);
        return;
      }
      challenge(n);
    }
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
    const reward = n.leader ? (seals.indexOf(n.id) === -1 ? n.firstReward : n.reward) : (cleared.indexOf(n.id) === -1 ? n.reward + (n.bonus || 0) : Math.ceil(n.reward / 2));
    const tr = { id: n.id, name: n.name, team: team, stage: n.stage, lv: n.lv || 1, reward: reward, winLine: n.winLine, leader: !!n.leader, boss: !!n.boss };
    if (ACT.canDuel() && ACT.startDuel({ tr: tr, npc: n })) { n.declined = true; resumeWorld(); return; }   // action mode: fight it out on the map (the dialog that led here left the world paused)
    game.setState({ trainer: tr, battle: null });
    openScreen('battle');
  }
  // ---------- The Long Watch ----------
  const KEEPER = 'Tower Keeper';
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
    game.setState({ trainer: trainer, battle: null });
    openScreen('battle');
  }
  function towerLobby() {
    const g = game, t = g.towerState(), seals = ((g.state.npc && g.state.npc.seals) || []).length;
    if (seals < 4 && !g.props.noGates) { toast("The Long Watch opens to trainers with all 4 Leader Seals. You hold " + seals + '.'); return; }
    if (t.run) {
      if (!g.towerParty().some((x) => x.hp > 0)) { g.endTowerRun(); towerLobby(); return; }
      showDialog(KEEPER, ['Your climb is waiting on floor ' + t.run.floor + ' of ' + TOWER.floors + '.', 'Your party: ' + partyLine() + '.'], [
        { label: 'Climb on', fn: () => endDialog(towerFloorStart) },
        { label: 'Give up this run', fn: () => { g.endTowerRun(); endDialog(); toast('Run ended. Best floor: ' + t.best + '.'); } },
        { label: 'Not now', fn: () => endDialog() }
      ]);
      return;
    }
    const left = g.towerRunsLeft(), party = (g.partySeeds().length ? g.partySeeds() : [g.state.caught[0].seed]).map((sd) => g.make(sd, g.state.caught.find((e) => e.seed === sd).stage).name);
    const intro = [t.best ? 'Back again. Your longest watch reached floor ' + t.best + ' of ' + TOWER.floors + '.' : 'Welcome. ' + TOWER.floors + ' floors. Each one is a night, and each night someone comes to the door.',
      'Your party fights every floor in a row. HP carries over between floors. Essence is paid only for floors above your best.', 'This week: ' + g.towerTwist().name + '. ' + g.towerTwist().text];
    if (!left) { showDialog(KEEPER, intro.slice(0, 1).concat(['You have used today\u2019s ' + TOWER.runsPerDay + ' climbs. Come back tomorrow.'])); return; }
    showDialog(KEEPER, intro.concat(['Climbs left today: ' + (g.props.testMode ? 'unlimited (test mode)' : left) + '. You will bring ' + party.join(', ') + '.']), [
      { label: 'Start a climb', fn: () => { g.startTowerRun(); endDialog(towerFloorStart); } },
      { label: 'Not now', fn: () => endDialog() }
    ]);
  }
  function towerAfterClose(res) {
    const g = game, t = g.towerState();
    open = false; $('screen').hidden = true;
    if (res.kind === 'win') {
      const lines = ['Floor ' + res.floor + ' cleared!' + (res.reward ? ' +' + res.reward + ' essence for a new best.' : ''), 'Your party rests: ' + partyLine() + '.'];
      setTimeout(() => showDialog(KEEPER, lines, [
        { label: 'Climb to floor ' + (res.floor + 1), fn: () => endDialog(towerFloorStart) },
        { label: 'Rest outside', fn: () => { endDialog(); toast('Your climb is saved on floor ' + (res.floor + 1) + '.'); } }
      ]), 60);
    } else if (res.kind === 'top') {
      setTimeout(() => showDialog(KEEPER, ['You kept the watch to the top!' + (res.reward ? ' +' + res.reward + ' essence.' : ''), res.first ? 'Nobody in Sproutvale has kept it longer. The lamp is yours until morning.' : 'Kept to the top again: ' + t.clears + ' times now.']), 60);
    } else {
      setTimeout(() => showDialog(KEEPER, ['Your climb ended on floor ' + res.floor + '.', 'Best: floor ' + Math.max(t.best, 0) + ' of ' + TOWER.floors + '. Climbs left today: ' + (g.props.testMode ? 'unlimited' : g.towerRunsLeft()) + '.']), 60);
    }
  }
  // ---------- the catch pouch (action mode): critters that dropped an orb wait here until you decide ----------
  function showPouchCard() {
    const p = game.state.pouch || []; if (!p.length) return false;
    game.update({ seed: p[0], previewSeed: null, reveal: (game.state.reveal || 0) + 1 });
    game.setState({ tab: 'roll', selected: null, armed: false, encounter: 'pouch', pouchCard: true });
    return true;
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
    const g = game; musicLoop();
    const grew = (lines || []).filter((l) => /grew to level/.test(l));
    if (tr.tower) { const res = g.state.towerResult; g.setState({ towerResult: null }); if (res) towerAfterClose(res); if (grew.length) setTimeout(() => toast(grew.join(' ')), 600); return; }
    const sealed = g.state.justSealed;
    if (sealed) {
      g.setState({ justSealed: null });
      const n = Object.values(WORLD.allNpcs()).flat().find((x) => x.id === sealed) || npc, count = ((g.state.npc && g.state.npc.seals) || []).length;
      const ls = [n.sealLine, 'You now hold ' + count + ' of 4 Leader Seals.'];
      if (count === 4) ls.push('You have tended every fire in the land. Nobody in Sproutvale has tended so many.');
      setTimeout(() => showDialog(n.name, [tr.winLine].concat(ls)), 400); if (grew.length) setTimeout(() => toast(grew.join(' ')), 4200); return;
    }
    if (won) { setTimeout(() => showDialog(tr.name, [tr.winLine, 'You earned ' + tr.reward + ' essence.'].filter((x) => x && !/^You earned 0 /.test(x))), 400); if (grew.length) setTimeout(() => toast(grew.join(' ')), 3500); }
    else toast('Your party was knocked out. ' + tr.name + ' wins this round. No penalty; you can try again.');
  }
  function close() {
    const tres = game.state.towerResult, trw = game.state.trainer, bw = game.state.battle;
    if (trw && trw.tower) {
      game.setState({ trainer: null, battle: null, towerResult: null });
      if (tres) { towerAfterClose(tres); return; }
      if (bw && !bw.over) toast('Climb paused on floor ' + trw.floor + '. Your HP is kept; the floor starts over when you return.');
      open = false; $('screen').hidden = true; $('hud').hidden = false; WORLD.setPaused(false);
      return;
    }
    const sealed = game.state.justSealed;
    if (game.state.trainer) game.setState({ trainer: null, battle: null, justSealed: null });
    if (sealed) {
      const n = Object.values(WORLD.allNpcs()).flat().find((x) => x.id === sealed);
      const count = ((game.state.npc && game.state.npc.seals) || []).length;
      const lines = [n.sealLine, 'You now hold ' + count + ' of 4 Leader Seals.'];
      if (count === 4) lines.push('You have tended every fire in the land. Nobody in Sproutvale has tended so many.');
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
      toast(n.sign.text + (to && lv < GATES[to] ? (game.props.noGates ? ' Normally opens at level ' + GATES[to] + ' (open now in test mode).' : ' Opens at trainer level ' + GATES[to] + '.') : ''));
      return;
    }
    if (n.kind === 'water') { fish(n); return; }
    if (n.kind === 'object') { objectUse(n.obj); return; }
    if (n.kind === 'npc') { talk(n.npc); return; }
    if (n.place.open === 'tower' && n.place.enter) { const seals = ((game.state.npc && game.state.npc.seals) || []).length; if (seals < 4 && !game.props.noGates) { toast("The Long Watch opens to trainers with all 4 Leader Seals. You hold " + seals + '.'); return; } }   // the door itself keeps the watch for those who tended all four fires
    if (n.place.enter && n.place.open !== 'house' && WORLD.MAPS[n.place.enter]) { game.sfx('tap'); WORLD.go(n.place.enter); return; }
    if (n.place.open === 'tower') { towerLobby(); return; }
    if (n.place.open === 'gym') { const L = (WORLD.allNpcs()[WORLD.map.id] || []).find((x) => x.id === n.place.leader); if (L) talk(L); return; }
    if (n.place.open === 'house') { if (n.place.enter && WORLD.MAPS[n.place.enter]) { game.sfx('tap'); WORLD.go(n.place.enter); } else toast(n.place.text || 'Nobody seems to be home.'); return; }
    if (n.place.open === 'shop' && n.place.id !== 'shop') { const k = (WORLD.allNpcs()[WORLD.map.id] || []).find((x) => x.kind === 'shop'); if (k) talk(k); else openPanel('shop'); return; }
    openScreen(n.place.open);
  }
  function setNear(n) {
    const b = $('act');
    if (!n) { b.disabled = true; $('act-label').textContent = 'Walk up to a place'; return; }
    b.disabled = false;
    $('act-label').textContent = n.kind === 'object' ? (n.obj.label || { chest: 'Open the chest', plaque: advOf().open.arch ? 'Enter the arch' : 'Examine the arch', lever: 'Pull the lever', gbed: 'Tend', trough: 'Look', woodpile: 'Take a log', gbrazier: 'Feed the fire', callamp: 'Touch the lamp', greatlamp: 'Touch the great lamp', core: 'Take the core', socket: 'Use the socket', furnace: 'Touch the furnace' }[n.obj.kind] || 'Examine') : n.kind === 'water' ? 'Fish' : n.kind === 'npc' ? (n.npc.trainer ? 'Talk to ' + n.npc.name : 'Talk to ' + n.npc.name) : n.kind === 'sign' ? 'Read sign' : ({ home: 'Enter home', lab: 'Enter lab', shrine: 'Enter the shrine', arena: 'Enter the arena', board: 'Read quests', tower: 'Enter the Tower', desk: 'Check your records', dexpc: 'Open the Dex', altar: 'Roll a critter', bell: 'Ring the bell', stair: 'Climb' })[n.place.id] || ({ gym: 'Enter the gym', house: 'Go inside', shop: 'Browse' })[n.place.open];
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
        encounter({ types: types, zone: M.name, rare: false, fishing: true });
      }, 650);
    }, wait);
  }
  const ROUTE = { wren: ['Elder Wren', 'Mossbrook', 'west', 'Moss Forest'], glacia: ['Glacia', 'Frosthold', 'north', 'Frost Peaks'], blaze: ['Blaze', 'Cinderport', 'south', 'Ember Fields'], coral: ['Admiral Coral', 'Coralbay', 'east', 'Tide Shore'] };
  function musicTrack() {
    const st = game.state;
    if (aggroT && !open) { if (dlg || Date.now() - aggroT < 1500) return 'spotted'; aggroT = 0; }
    if (open) aggroT = 0;
    { const di = ACT.duelInfo(); if (di && !open) return di.boss || di.tower ? 'boss' : 'battle'; }
    if (open && st.tab === 'battle') return st.trainer && (st.trainer.tower || st.trainer.leader || st.trainer.boss) ? 'boss' : 'battle';
    const id = WORLD.map && (WORLD.map.interior ? WORLD.map.parent : (WORLD.map.base || WORLD.map.id)), alias = { descent: 'ember', ascent: 'frost', 'route-mf': 'peak', 'route-cm': 'moss', 'route-fc': 'frost', 'route-cc': 'tide' }[id]; return alias || (MUSIC.tracks.indexOf(id) !== -1 ? id : 'town');
  }
  function musicLoop() { if (typeof MUSIC === 'undefined' || !game) return; MUSIC.setEnabled(!(game.state.settings && game.state.settings.music === false)); MUSIC.play(musicTrack()); }
  function start2() {
    setInterval(() => { musicLoop(); renderWeather(); applyA11y(); }, 400); applyA11y();
    // things that only exist at certain hours (a lantern at night, ribbons at dusk, a boat at dawn, a light in the water at night): [gate id, true while the thing is GONE]
    const WILD_RULES = { 'route-mf-hollow': [['night', (t) => t !== 'night']], 'route-cm-crossing': [['dusk', (t) => t !== 'dusk']], 'route-fc-skerry': [['dawn', (t) => t !== 'dawn']], 'route-cc-drowned': [['night', (t) => t !== 'night']], 'route-fc': [['dawn', (t) => t !== 'dawn']] };
    let ruleState = {}; const applyRules = () => { if (!game || !WORLD.map) return; const id = WORLD.map.id, rules = WILD_RULES[id]; if (!rules) { ruleState = {}; return; } const t = timeOfDay(); rules.forEach((r) => { const gone = !!r[1](t); if (ruleState[id + r[0]] !== gone) { ruleState[id + r[0]] = gone; WORLD.setGate(id, r[0], gone); } }); };
    // people who keep hours: a `late` resident is away by day and home from dusk
    const applyHours = () => { const all = WORLD.allNpcs(), t = timeOfDay(), home = t === 'dusk' || t === 'night'; Object.keys(all).forEach((k) => all[k].forEach((n) => { if (n.late) n.hidden = !home; })); };
    setInterval(() => { applyRules(); applyHours(); }, 500); applyHours();
    // action mode (prototype): the lead critter fights live; Attack = tap to use the chosen move, hold to open the wheel
    {
      let leadCache = { key: '', k: null }; const foePool = {}, benchCache = {}, imgs = {}, atk = $('atk'), wheel = $('wheel'), ring = atk.querySelector('.ring');
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
          const key = types.join(',') + (rare ? '+rare' : ''), pool = foePool[key] || (foePool[key] = []);
          if (pool.length < 30) for (let i = 0; i < (rare ? 600 : 150) && pool.length < 30; i++) { const sd = 1 + Math.floor(Math.random() * 999998), k = game.make(sd, 1); if ((!types.length || types.indexOf(k.element.name) !== -1) && (!rare || k.rarity === 'Rare' || k.rarity === 'Mythic')) pool.push(sd); }
          if (!pool.length) return null;
          const lv = Math.max(1, (lead.lv || 1) + Math.floor(Math.random() * 3) - 1);
          const own = new Set(game.state.caught.map((c) => c.seed)); let sd = pool[Math.floor(Math.random() * pool.length)]; for (let i = 0; i < 8 && own.has(sd); i++) sd = pool[Math.floor(Math.random() * pool.length)];   // skip critters you already keep when there is a choice
          return game.make(sd, lead.stage || 1, lv);
        },
        img: (k) => { const key = k.seed + ':' + k.stage; if (!imgs[key]) { const im = new Image(); im.src = PIX.sprite(k, 'icon'); imgs[key] = im; } return imgs[key]; },
        bench: () => {
          const st = game.state, lead = leadCache.k ? leadCache.k.seed : null;
          return (ACT.duelParty() || game.partySeeds()).filter((sd) => sd !== lead).slice(0, 2).map((sd) => { const e = st.caught.find((c) => c.seed === sd), key = sd + ':' + e.stage + ':' + (e.lv || 1); if (!benchCache[key]) benchCache[key] = game.make(sd, e.stage, e.lv || 1); return benchCache[key]; });
        },
        setLead: (seed) => { game.update({ fighter: seed }); },
        kOf: (sd) => { const e = game.state.caught.find((c) => c.seed === sd); if (!e) return null; const key = sd + ':' + e.stage + ':' + (e.lv || 1); if (!benchCache[key]) benchCache[key] = game.make(sd, e.stage, e.lv || 1); return benchCache[key]; },
        duelDone: (tr, npc, won, lines) => duelDone(tr, npc, won, lines),
        onKill: (foe, mine) => game.actKill(foe, mine),
        worthy: (k) => game.actWorthy(k), pouchAdd: (sd) => game.actPouchAdd(sd),
        sfx: (k) => game.sfx(k)
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
      atk.addEventListener('pointerdown', (e) => { e.preventDefault(); try { atk.setPointerCapture(e.pointerId); } catch (x) {} wheelOn = false; clearTimeout(holdT); holdT = setTimeout(openWheel, 260); });
      atk.addEventListener('pointermove', (e) => { if (wheelOn) wheelHover(e.clientX, e.clientY); });
      atk.addEventListener('pointerup', (e) => { clearTimeout(holdT); if (wheelOn) { wheelHover(e.clientX, e.clientY); closeWheel(true); } else ACT.attack(); });
      atk.addEventListener('pointercancel', () => { clearTimeout(holdT); if (wheelOn) closeWheel(false); });
      atk.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', (e) => { if (e.key === 'j' && !WORLD.paused) ACT.attack(); });
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
        const di = ACT.duelInfo(), sig = di ? di.name + di.defeated + '/' + di.total : '';
        if (sig !== dbSig) { dbSig = sig; db.hidden = !di; if (di) db.innerHTML = '<b>' + esc(di.tower ? 'Floor ' + di.floor : di.name) + '</b><span>' + di.defeated + ' of ' + di.total + ' down</span><button aria-label="Give up the duel">Give up</button>'; }
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
    WORLD.init($('world'), {
      onInteract: interact, onNear: setNear, onEncounter: encounter, npcs: npcList(),
      tint: () => (game.state.settings && game.state.settings.daynight === false) ? 'day' : timeOfDay(),
      objState: objState, carry: () => carry, relit: () => !!advOf().flags.lampLit, homeLit: () => sealCount() >= 3, weather: () => weatherAt(WORLD.map.id), still: stillMotion, ambient: () => !(game.state.settings && game.state.settings.ambient === false),
      exitLocked: (e) => !game.props.noGates && ROUTE_GATES[e.to] && WORLD.map.id.indexOf('route-') !== 0 ? game.levelInfo(game.state.xp || 0).level < ROUTE_GATES[e.to] : WORLD.map.id === 'town' && e.to !== 'town' && !game.props.noGates && (e.to === 'peak' ? ((game.state.npc && game.state.npc.seals) || []).length < 4 : game.levelInfo(game.state.xp || 0).level < GATES[e.to]),
      onAlert: () => { aggroT = Date.now(); musicLoop(); },
      critterLead: () => !!(game && game.state.caught.length && !window.__noFollower),   // you steer the critter; the human walks behind it
      follower: () => {
        const st = game.state; if (!st.caught.length || window.__noFollower) return null;   // window.__noFollower is a test hook (the older turn-based suites)
        const seeds = game.partySeeds(), sd = st.caught.some((e) => e.seed === st.fighter) ? st.fighter : (seeds[0] || st.caught[0].seed), e = st.caught.find((c) => c.seed === sd);
        const key = sd + ':' + (e ? e.stage : 1);
        if (!folCache || folCache.key !== key) { const k = game.make(sd, e ? e.stage : 1), img = new Image(); img.src = PIX.sprite(k, 'icon'); folCache = { key: key, img: img, shiny: !!k.shiny }; }
        return folCache;
      },
      onLocked: (e) => ROUTE_GATES[e.to] ? toast(mapName(e.to) + ' opens at trainer level ' + ROUTE_GATES[e.to] + '. You are level ' + game.levelInfo(game.state.xp || 0).level + '.') : e.to === 'peak' ? toast("The trail to Vigil Peak opens with all 4 Leader Seals. You hold " + ((game.state.npc && game.state.npc.seals) || []).length + '.') : toast(ZONE_NAMES[e.to] + ' opens at trainer level ' + GATES[e.to] + '. You are level ' + game.levelInfo(game.state.xp || 0).level + '.'),
      // sight challenges: only trainers you have never beaten (beaten ones wait for you to talk to them)
      canChallenge: (n) => !DEV.safe && !ACT.dueling() && !dlg && !open && !menuOpen && game.state.caught.length > 0 && !game.beatenToday(n.id) && ((game.state.npc && game.state.npc.cleared) || []).indexOf(n.id) === -1,
      onSpotted: (n) => { if (!dlg && !open && !menuOpen) challenge(n); else WORLD.setPaused(open || menuOpen || !!dlg); },
      onMap: (m) => { trailDir = {}; tending = null; carry = false; burn = {}; coralReset(); iceCells = []; stillT = 0; plank(m.name); setNear(null); applyDungeon(); applyGym(); applyLamp(); applyForge(); renderWeather(); if (game && !m.interior && !m.hall && (game.state.visited || []).indexOf(m.id) === -1) game.update({ visited: (game.state.visited || []).concat([m.id]) }); if (m.id !== 'town' && m.rate > 0 && game) setTimeout(() => hint('zone', 'Each zone has its own two types. The sparkling patch is rare grass with better odds.'), 900); },
      onGrass: () => hint('grass', 'Tall grass hides wild critters. Keep walking through it to find one.'),
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
    $('m-help').addEventListener('click', () => { closeMenu(); toast('Walk with the joystick. Tall grass hides wild critters, sparkling grass hides rarer ones. The shrine rolls any type, the Arena is for battles.'); });
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
    $('tip').hidden = true;
    $('tip-close').addEventListener('click', () => { $('tip').hidden = true; try { localStorage.setItem('critter-roll:tip', '1'); } catch (e) {} });

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
  return { tending: () => tending, carry: () => carry, burn: () => Object.assign({}, burn), coral: () => JSON.parse(JSON.stringify(coral)), coralSeq: CORAL_SEQ, ice: () => iceCells.slice(), lampLevels: () => Object.assign({}, lampK), layoutInfo, mapSelect, placeCard, openPouch, pouchNext, towerFloorStart, weatherAt, start, schedule, close, open: openScreen, encounter, chooseStarter, hint, openPanel, closePanel, buy, useItem, setParty, openMenu, closeMenu, talk, advance, startTrainer, openMap, closeMap, travel, openBackup, exportCode, readCode, timeOfDay, get dialog() { return dlg; }, get game() { return game; }, toast };
})();
window.addEventListener('DOMContentLoaded', APP.start);
