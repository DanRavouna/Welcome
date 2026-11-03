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
    renderGoal(); checkHints();
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
    $('m-grid').innerHTML = menuTiles().map((t) => '<button class="tile' + (t.wide ? ' wide' : '') + (t.locked ? ' locked' : '') + '" data-tile="' + t.id + '"' + (t.locked ? ' aria-disabled="true"' : '') + '>' +
      '<span class="ti"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + t.icon + '"></path></svg></span>' +
      '<span class="tl">' + t.label + '</span><span class="ts">' + t.sub + '</span>' + (t.badge ? '<span class="tb">' + t.badge + '</span>' : '') + '</button>').join('');
  }
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
  function timeOfDay(d) { const h = (d || new Date()).getHours(); return h >= 21 || h < 5 ? 'night' : (h < 7 ? 'dawn' : (h >= 18 ? 'dusk' : 'day')); }
  // ---------- weather ----------
  const reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function weatherAt(id) { // kind for a map, or null indoors / when the setting is off; window.__weather is a test override
    if (game && game.state.settings && game.state.settings.weather === false) return null;
    if (!WEATHER.region(id)) return null;
    return typeof window.__weather === 'string' ? window.__weather : WEATHER.at(id);
  }
  function stillMotion() { return !!((game && game.state.settings && game.state.settings.calm) || (reduceMQ && reduceMQ.matches)); }
  function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label + (K.type ? ': more ' + K.type + ' critters' : '') : ''; }
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
  // ---------- world map ----------
  let mapOpen = false;
  function renderMap() {
    const st = game.state, lv = game.levelInfo(st.xp || 0).level, here = WORLD.map.id, test = game.props.testMode;
    const seals = (st.npc && st.npc.seals) || [], seen = st.seen || [];
    const TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
    const zoneTypes = { frost: ['Frost', 'Stone'], ember: ['Ember', 'Volt'], moss: ['Moss', 'Bloom'], tide: ['Tide', 'Dusk'] };
    const found = (z) => zoneTypes[z].reduce((n, t) => { const ti = TYPES.indexOf(t); return n + seen.filter((no) => Math.floor((no - 1) / 6) === ti).length; }, 0);
    const card = (id) => {
      if (id === 'town') return { id, name: 'Sproutvale', sub: 'Home, Lab, Shrine, Arena', open: true, lockTxt: '', seal: '', found: '', wx: weatherText(weatherAt('town')) };
      const L = LEADERS.find((x) => x.zone === id), open = test || lv >= GATES[id];
      return { id, name: ZONE_NAMES[id], sub: zoneTypes[id].join(' and ') + ' critters', open, lockTxt: open ? '' : 'Opens at level ' + GATES[id], wx: weatherText(weatherAt(id)),
        seal: L.name + (seals.indexOf(L.id) !== -1 ? ': seal earned' : ': not yet beaten'), found: found(id) + '/12 species found' };
    };
    const node = (id, cls) => { const c = card(id), isHere = here === id;
      return '<div class="mnode ' + cls + (c.open ? '' : ' locked') + (isHere ? ' here' : '') + '"><b>' + c.name + '</b><span>' + c.sub + '</span>' +
        (c.wx ? '<span class="wx">' + c.wx + '</span>' : '') + (c.found ? '<span>' + c.found + '</span>' : '') + (c.seal ? '<span>' + c.seal + '</span>' : '') + (c.lockTxt ? '<span class="lk">' + c.lockTxt + '</span>' : '') +
        (isHere ? '<span class="you">You are here</span>' : (c.open ? '<button data-travel="' + id + '">Travel here</button>' : '')) + '</div>'; };
    const vis = st.visited || [], CITY = [['mossbrook', 'Mossbrook', 'past Moss Forest, to the west', 'Elder Wren\u2019s gym'], ['frosthold', 'Frosthold', 'past Frost Peaks, to the north', 'Glacia\u2019s gym'], ['cinderport', 'Cinderport', 'past Ember Fields, to the south', 'Blaze\u2019s gym'], ['coralbay', 'Coralbay', 'past Tide Shore, to the east', 'Admiral Coral\u2019s gym'], ['peak', "Champion's Peak", 'up the trail north of the plaza', 'The Tower']];
    const cnode = ([id, name, where, what]) => { const v = test || vis.indexOf(id) !== -1, isHere = here === id;
      return '<div class="mnode' + (v ? '' : ' locked') + (isHere ? ' here' : '') + '" style="min-width: 0; overflow-wrap: break-word"><b>' + (v ? name : 'Undiscovered') + '</b><span>' + (v ? what : 'Somewhere ' + where) + '</span>' + (v && weatherAt(id) ? '<span class="wx">' + weatherText(weatherAt(id)) + '</span>' : '') + (isHere ? '<span class="you">You are here</span>' : (v ? '<button data-travel="' + id + '">Travel here</button>' : '<span class="lk">Find it on foot first</span>')) + '</div>'; };
    $('wm-grid').innerHTML = '<div></div>' + node('frost', 'n') + '<div></div>' + node('moss', 'w') + node('town', 'c') + node('tide', 'e') + '<div></div>' + node('ember', 's') + '<div></div>' +
      '<div style="grid-column: 1 / -1; font-weight: 900; margin-top: 6px">Cities and the Peak</div>' + '<div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: inherit">' + CITY.map(cnode).join('') + '</div>';
    $('wm-tod').textContent = { night: 'Night: Dusk critters roam every zone.', dawn: 'Dawn', dusk: 'Dusk', day: 'Daytime' }[timeOfDay()] + (weatherAt('town') ? ' The weather changes at ' + String(WEATHER.nextChange().getHours()).padStart(2, '0') + ':00.' : '');
  }
  function openMap() { closeMenu(true); mapOpen = true; renderMap(); $('wmap').hidden = false; $('hud').hidden = true; WORLD.setPaused(true); $('wm-close').focus(); }
  function closeMap() { mapOpen = false; $('wmap').hidden = true; $('hud').hidden = false; WORLD.setPaused(false); }
  function travel(id) {
    closeMap();
    if (WORLD.map.id === id) return;
    if (ZONE_NAMES[id] && WORLD.map.id !== 'town') WORLD.enter('town');
    WORLD.enter(id); toast('You travel to ' + mapName(id) + '.');
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
  // ---------- guidance: next objective, hints, first-time intro ----------
  const npcAt = (map, id) => { const n = (WORLD.allNpcs()[map] || []).find((x) => x.id === id); return n ? { map: map, x: n.x, y: n.y } : null; };
  function objective() {
    const st = game.state, lv = game.levelInfo(st.xp || 0).level, npc = st.npc || {}, cleared = npc.cleared || [], seals = npc.seals || [], done = npc.done || [];
    const seen = (st.seen || []).length, n = st.caught.length, test = game.props.testMode;
    if (!n) return { text: 'Choose your first critter with Professor Fern', target: npcAt('town', 'fern') };
    if (n < 3) return { text: 'Find critters in the tall grass (' + n + '/3)', target: { grass: true } };
    if (game.partySeeds().length < Math.min(3, n)) return { text: 'Add critters to your party: Menu, then Party', target: null };
    if (cleared.indexOf('rowan') === -1) return { text: 'Beat Rowan in Sproutvale', target: npcAt('town', 'rowan') };
    if (done.indexOf('fern') === -1) return seen >= 5 ? { text: 'Show Professor Fern your 5 species', target: npcAt('town', 'fern') } : { text: 'Discover 5 species for Professor Fern (' + seen + '/5)', target: { grass: true } };
    const ZT = { moss: ['ivy', 'Ivy', 'wren', 'Elder Wren'], frost: ['bram', 'Hiker Bram', 'glacia', 'Glacia'], ember: ['kiki', 'Kiki', 'blaze', 'Blaze'], tide: ['marlo', 'Captain Marlo', 'coral', 'Admiral Coral'] };
    for (const z of ['moss', 'frost', 'ember', 'tide']) {
      const [tid, tname, lid, lname] = ZT[z];
      if (seals.indexOf(lid) !== -1) continue;
      if (!test && lv < GATES[z]) return { text: 'Reach trainer level ' + GATES[z] + ' to open ' + ZONE_NAMES[z] + ' (now ' + lv + ')', target: { grass: true } };
      if (cleared.indexOf(tid) === -1) return { text: 'Beat ' + tname + ' in ' + ZONE_NAMES[z], target: npcAt(z, tid) };
      const lh = npcHome(lid) || z; return { text: 'Challenge ' + lname + ' in ' + mapName(lh), target: npcAt(lh, lid) };
    }
    const tw = game.towerState();
    if (tw.run) return { text: 'Continue your Tower climb (floor ' + tw.run.floor + '/' + TOWER.floors + ')', target: { map: 'peak', x: 12.5, y: 8.6 } };
    if (tw.best < TOWER.floors) return { text: 'Climb the Champion\u2019s Tower (best ' + tw.best + '/' + TOWER.floors + ')', target: { map: 'peak', x: 12.5, y: 8.6 } };
    if (seen < 48) return { text: 'Champion! Complete the species list (' + seen + '/48)', target: { grass: true } };
    return { text: 'You have done it all. Daily quests and rematches await!', target: null };
  }
  let lastGoal = '';
  function renderGoal() {
    const o = objective();
    if (o.text !== lastGoal) { $('goal-text').textContent = o.text; lastGoal = o.text; }
    $('goal').removeAttribute('aria-pressed');
    $('goal').setAttribute('aria-label', 'Next goal: ' + o.text + '. Tap for a hint.');
  }
  const hintQueue = []; let hintBusy = false;
  function hint(id, text) {
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
    showDialog('Professor Fern', ['A wonderful choice! ' + k.name + ' will be a loyal partner.', 'The line under the sign at the top always shows your next goal, and the gold arrow points the way.', 'Start by finding more critters in the tall grass. Good luck!'], null, () => { renderGoal(); });
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
        intro: ['I am Glacia, leader of Frost Peaks.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'You thawed my whole team. The Frost Seal is yours.', sealLine: 'Carry the Frost Seal with pride. Ember Fields awaits at level 6.', beatenLines: ['Rest by the fire, trainer. We can battle again tomorrow.'] },
      { lv: 9, id: 'bram', name: 'Hiker Bram', at: 'trainer', kind: 'trainer', trainer: true, pal: { cap: true, c: '#C0392B', y: '#8A5A34', Y: '#6B4626' }, types: ['Frost', 'Stone'], size: 4, stage: 2, pick: 0.5,
        intro: ['These peaks make critters tough.', 'Think yours can handle the cold?'], winLine: 'You climbed right over me! Well earned.', beatenLines: ['My critters need a rest. Tomorrow, then!'] },
      { id: 'sola', name: 'Sola', at: 'entrance', kind: 'request', pal: { h: '#F5D36A', y: '#9CC9D9', Y: '#5E97AE' }, need: 'stone', reward: 6,
        ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'Could you show me one? Keep a Stone critter and come back.'],
        progress: () => 'Still no Stone critter? They live in the tall grass here in Frost Peaks.', thanks: ['A Stone critter! It is even rockier than I imagined.', 'Take these 6 essence, as thanks.'], after: ['I will treasure that picture.'] }
    ]);
    zone('ember', [
      { lv: 15, id: 'blaze', name: 'Blaze', at: 'leader', kind: 'leader', leader: true, pal: { cap: true, c: '#1E1A2A', y: '#FF7A45', Y: '#C2410C' }, types: ['Ember', 'Volt'], size: 4, stage: 3, pick: 0.55, firstReward: 30, needs: 'kiki',
        intro: ['So you made it to the heart of Ember Fields.', 'I am Blaze. My team burns at full power. Ready?'], winLine: 'Unreal. You put out every flame. Take the Ember Seal.', sealLine: 'The Ember Seal suits you. Tide Shore opens at level 9.', beatenLines: ['My flames need to rekindle. Come back tomorrow!'] },
      { lv: 10, id: 'kiki', name: 'Kiki', at: 'trainer', kind: 'trainer', trainer: true, pal: { h: '#F28C28', y: '#D8574A', Y: '#A8382E' }, types: ['Ember', 'Volt'], size: 3, stage: 2, pick: 0.55,
        intro: ['It is hot out here, and so are my critters!', 'Ready to feel the heat?'], winLine: 'Okay, okay, you win. That was electric!', beatenLines: ['My team is still cooling down. Come back tomorrow!'] },
      { id: 'dax', name: 'Dax', at: 'entrance', kind: 'request', pal: { cap: true, c: '#F5C542', y: '#4A5878', Y: '#2B3555' }, need: 'evolved', reward: 8,
        ask: ['I heard critters can evolve if you give them essence.', 'I have never seen one! Show me a critter at stage 2 or higher?'],
        progress: () => 'Evolve a critter in the Dex, then come back. Release extra critters to earn essence.', thanks: ['Whoa, look at the size of it!', 'Here, 8 essence. Thanks for showing me.'], after: ['One day I will evolve mine too.'] }
    ]);
    zone('moss', [
      { lv: 11, id: 'wren', name: 'Elder Wren', at: 'leader', kind: 'leader', leader: true, pal: { h: '#E8E8F0', y: '#4E6B19', Y: '#2E4210', p: '#4A3424' }, types: ['Moss', 'Bloom'], size: 3, stage: 2, pick: 0.6, firstReward: 20, needs: 'ivy',
        intro: ['Welcome, young trainer. I am Elder Wren, leader of Moss Forest.', 'Show me that you and your critters grow together.'], winLine: 'You have grown strong. The Moss Seal is yours.', sealLine: 'The Moss Seal marks your first step. Frost Peaks opens at level 3.', beatenLines: ['The forest needs rest. Visit me again tomorrow.'] },
      { lv: 4, id: 'ivy', name: 'Ivy', at: 'trainer', kind: 'trainer', trainer: true, pal: { h: '#2E7D32', y: '#F5A3D0', Y: '#D86BA6' }, types: ['Moss', 'Bloom'], size: 3, stage: 2, pick: 0.3,
        intro: ['Shh, the forest is listening.', 'Let us give it a battle worth hearing.'], winLine: 'Beautifully done. The forest approves.', beatenLines: ['Let the forest rest today. Tomorrow we can battle again.'] },
      { id: 'oak', name: 'Old Oak', at: 'talk', kind: 'talk', pal: { h: '#BDBDBD', y: '#6B8E23', Y: '#4E6B19' },
        lines: ['Every critter has a nature. Brave ones hit harder but bruise easier.', 'Pick the nature that fits how you like to battle.'] }
    ]);
    zone('tide', [
      { lv: 14, id: 'coral', name: 'Admiral Coral', at: 'leader', kind: 'leader', leader: true, pal: { cap: true, c: '#F8F8F8', y: '#1E2A4A', Y: '#0E1A38', p: '#1E2A4A' }, types: ['Tide', 'Dusk'], size: 5, stage: 3, pick: 0.75, firstReward: 35, needs: 'marlo',
        intro: ['Admiral Coral, leader of Tide Shore. Five critters, every one a veteran of the storm.', 'Beat me, and you hold every seal in the land.'], winLine: 'A perfect voyage. The Tide Seal is yours, champion.', sealLine: 'With the Tide Seal, your journey is complete.', beatenLines: ['My fleet is in the harbor. Challenge me again tomorrow.'] },
      { lv: 19, id: 'marlo', name: 'Captain Marlo', at: 'trainer', kind: 'trainer', trainer: true, pal: { cap: true, c: '#1E2A4A', y: '#FFFFFF', Y: '#C9D3E6' }, types: ['Tide', 'Dusk'], size: 4, stage: 3, pick: 0.4,
        intro: ['Ahoy! Four critters, one captain.', 'Can your crew weather all of them?'], winLine: 'You sailed through my whole crew! A fine captain you would make.', beatenLines: ['My crew is resting below deck. Tomorrow, sailor!'] },
      { id: 'nell', name: 'Nell', at: 'entrance', kind: 'request', pal: { h: '#6B3E1E', y: '#3C95DC', Y: '#2A6FB0' }, need: 'rare', reward: 8,
        ask: ['The waves sometimes wash up rare critters.', 'Have you found a Rare one yet? I would love to see it.'],
        progress: () => 'Sparkling grass is the best place to find Rare critters.', thanks: ['A Rare critter! It practically glows.', 'Please, take 8 essence.'], after: ['I will keep watching the waves.'] }
    ]);
    // Mossbrook (city): Elder Wren moves into her gym; Moss Forest keeps Ivy and Old Oak
    const wren = out.moss.find((n) => n.id === 'wren');
    out.moss = out.moss.filter((n) => n.id !== 'wren');
    Object.assign(wren, { x: 19, y: 8, dir: 'down', city: 'mossbrook', intro: ['Welcome to Mossbrook, young trainer. I am Elder Wren, leader of this gym.', 'Show me that you and your critters grow together.'] });
    out.mossbrook = [wren,
      { id: 'juniper', name: 'Herbalist Juniper', x: 8, y: 10, kind: 'shop', pal: { h: '#6B3FA0', y: '#8E5BC8', Y: '#6B3FA0' },
        lines: ['Welcome to the Herb Hut! Same remedies as Mira in Sproutvale, brewed with Mossbrook leaves.'] },
      { lv: 3, id: 'sorrel', name: 'Forager Sorrel', x: 11, y: 11, dir: 'down', kind: 'trainer', trainer: true, pal: { cap: true, c: '#6B8E23', y: '#C9A26A', Y: '#8A6A44' }, types: ['Bloom', 'Volt'], size: 3, stage: 2, pick: 0.5,
        intro: ['Hold on, traveler! Mossbrook greets newcomers with a battle.', 'My critters grew up on forest berries. Ready?'], winLine: 'Ha! You earned your welcome. Here is your reward.', beatenLines: ['Rest up and come back tomorrow. The berries will be ripe again.'] },
      { id: 'fennel', name: 'Fennel', x: 24, y: 15, kind: 'talk', pal: { h: '#E8E8F0', y: '#C0503A', Y: '#8A3A28' },
        lines: ['Mossbrook was built around the old trees, not the other way around.', 'Elder Wren says a critter that rests well battles well.'] },
      { id: 'bryn', name: 'Bryn', x: 16, y: 16, kind: 'talk', pal: { h: '#8A5A34', y: '#FFD86B', Y: '#E0A830' },
        lines: ['I saw a shiny critter once! It sparkled like the sun on the pond.', 'My mom says they are one in two hundred. I am still looking!'] }
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
      { id: 'hilde', name: 'Hilde', x: 24, y: 15, kind: 'talk', pal: { h: '#E8C07A', y: '#8E5BC8', Y: '#6B3FA0' }, lines: ['The palisade keeps out the wind, not the critters. They come and go as they like.', 'Glacia trains on the ice every morning. Her critters do not slip.'] },
      { id: 'olaf', name: 'Old Olaf', x: 16, y: 16, kind: 'talk', pal: { h: '#BDBDBD', y: '#5E97AE', Y: '#3E6E8E' }, lines: ['They say a tower stands on Champion\u2019s Peak, up the trail north of Sproutvale\u2019s plaza.', 'Only trainers with all four Leader Seals may climb it.'] }
    ]);
    city('ember', 'cinderport', 'blaze', 'Welcome to Cinderport. I am Blaze, and this forge is my gym.', [
      { id: 'bea', name: 'Bellows Bea', x: 8, y: 10, kind: 'shop', pal: { h: '#3A2A1A', y: '#8A4A2A', Y: '#6A3A2A' }, lines: ['Forge Market! Same remedies as Mira\u2019s, kept warm by the furnace.'] },
      { lv: 12, id: 'tamsin', name: 'Smith Tamsin', x: 30, y: 6, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#5A4A4A', y: '#FF7A45', Y: '#B83A10' }, types: ['Ember', 'Stone'], size: 4, stage: 2, pick: 0.5,
        intro: ['You walked down the forge road. That means you face my anvil first!', 'Let us see if your critters are tempered.'], winLine: 'Forged in fire! You earned this reward.', beatenLines: ['The forge needs to cool. Come back tomorrow.'] },
      { id: 'cole', name: 'Cole', x: 24, y: 15, kind: 'talk', pal: { h: '#2A1A10', y: '#C0503A', Y: '#8A3A28' }, lines: ['Do not touch the lava pool. Ember critters swim in it. You cannot.', 'Blaze says a burn wears down even the toughest critter.'] },
      { id: 'ruby', name: 'Ruby', x: 16, y: 16, kind: 'talk', pal: { h: '#C0392B', y: '#FFD86B', Y: '#E0A830' }, lines: ['The miners found a shiny rock critter last week! Shinies are rare, but they show up anywhere.', 'Admiral Coral\u2019s harbor is east, past Tide Shore. The boardwalk starts by the water.'] }
    ]);
    city('tide', 'coralbay', 'coral', 'Welcome aboard in Coralbay. I am Admiral Coral, leader of this gym.', [
      { id: 'marina', name: 'Marina', x: 8, y: 10, kind: 'shop', pal: { h: '#E8C07A', y: '#3A8A8A', Y: '#2A6A6A' }, lines: ['Harbor Market! Same goods as Sproutvale, shipped in fresh.'] },
      { lv: 15, id: 'rafe', name: 'Deckhand Rafe', x: 27, y: 6, dir: 'right', kind: 'trainer', trainer: true, pal: { cap: true, c: '#2A5A9A', y: '#FFFFFF', Y: '#C9D3E6' }, types: ['Tide', 'Volt'], size: 4, stage: 3, pick: 0.55,
        intro: ['Ahoy! Nobody walks my pier without a battle.', 'Storm-tested critters, ready to sail.'], winLine: 'Blow me down! A fine battle. Here is your reward.', beatenLines: ['My crew needs a rest. Come back with tomorrow\u2019s tide.'] },
      { id: 'finn', name: 'Finn', x: 24, y: 15, kind: 'talk', pal: { h: '#8A5A34', y: '#4A9A8A', Y: '#2A6A6A' }, lines: ['Coral was the youngest admiral the harbor ever had. Her critters never lose their footing.', 'After her seal, climb the Tower. It is up the trail north of Sproutvale.'] },
      { id: 'pearl', name: 'Pearl', x: 16, y: 16, kind: 'talk', pal: { h: '#F4EAD6', y: '#E0A0B8', Y: '#C07898' }, lines: ['I collect shells. My brother collects critter species. He has all 48!', 'Well, he says he does.'] }
    ]);
    // route trainers (one per route; tuned with lbal5.py against the gate's party model)
    const rt = (id, name, x, y, dir, types, size, stage, lv, pick, intro, winLine, pal) => ({ id, name, x, y, dir, kind: 'trainer', trainer: true, types, size, stage, lv, pick, pal, intro, winLine, beatenLines: ['That was a good battle. Come back tomorrow for another.'] });
    out['route-mf'] = [rt('kai', 'Mountaineer Kai', 16, 7, 'up', ['Moss', 'Frost'], 4, 2, 11, 0.55, ['The pass is steep, and so is my challenge!', 'Highland critters are tough. Prove yours are tougher.'], 'You climbed right over me. Here is your reward.', { cap: true, c: '#4E8A3A', y: '#E8E8F0', Y: '#A8B2C8' })];
    out['route-cm'] = [rt('elm', 'Woodcutter Elm', 16, 7, 'up', ['Ember', 'Moss'], 4, 2, 11, 0.5, ['Careful, the Ashwood still smoulders.', 'My critters grew up between the embers and the moss. Battle!'], 'You chopped right through my team. Here is your reward.', { cap: true, c: '#8A4A2A', y: '#C9A26A', Y: '#8A6A44' })];
    out['route-fc'] = [rt('signe', 'Ice Fisher Signe', 16, 7, 'up', ['Frost', 'Tide'], 4, 3, 18, 0.5, ['Shh, you will scare the fish. Unless you want a battle?', 'Of course you do. Everyone on this coast does.'], 'Hooked and landed. You win this one. Here is your reward.', { cap: true, c: '#3E8EF7', y: '#DCEBFF', Y: '#8FB0D6' })];
    out['route-cc'] = [rt('mako', 'Diver Mako', 16, 7, 'up', ['Tide', 'Ember'], 4, 3, 18, 0.5, ['I just surfaced from the reef. My critters are warmed up!', 'Steam and spray. Let us battle.'], 'You out-swam me! Here is your reward.', { cap: true, c: '#2A6A6A', y: '#FF7A45', Y: '#B83A10' })];
    // residents of the house interiors
    const RES = {
      'house-fennel': ['Grandma Clover', ['Oh, a visitor! Fennel is out by the green again.', 'Take your time. Critters like a calm trainer.']],
      'house-moss': ['Forager Wil', ['Just back from foraging. Moss Forest was full of Bloom critters today.', 'Tip: the sparkling grass patches hold the rare ones.']],
      'house-bryn': ["Bryn's Dad", ['Bryn talks about shiny critters all day. One in two hundred, they say.', 'If you ever find one, show Bryn. It would make the whole week.']],
      'fh-a': ['Guard Brann', ['Hm? I was not sleeping. I was resting my eyes.', 'The palisade has held for a hundred winters. It will hold one more.']],
      'fh-b': ['Trader Ylva', ['Closed for the blizzard season, but you can warm up by the fire.', 'Highland Pass to the west links us to Mossbrook. Glacier Coast to the east goes to Coralbay.']],
      'fh-c': ['Old Ingrid', ['Soup? There is always soup.', 'My grandson climbed the Tower once. Floor six! He still talks about it.']],
      'cp-a': ['Smith Hal', ['Clang! Oh, hello. Mind the anvil.', 'A Whetstone from the market makes a critter hit much harder. Use it early in a long battle.']],
      'cp-b': ['Cinda', ['The walls stay warm all night. No blankets needed in Cinderport!', 'Ashwood Trail, west of town, is full of Ember and Moss critters.']],
      'cp-c': ['Miner Petra', ['Back from the mines. We found more glowing rocks today.', 'Stone critters love the cold. You will find them in Frost Peaks.']],
      'cb-a': ['Keeper Morgan', ['From the top of the lighthouse I can see two roads.', 'Glacier Coast starts at the north end of the boardwalk, Reef Causeway at the south end.']],
      'cb-b': ['Old Tam', ['Nets need mending, critters need training. Same patience.', 'A Tide Lure from the market draws out species you have never kept.']],
      'cb-c': ["Pearl's Mum", ['Pearl is out collecting shells again.', 'She says her brother has all 48 species. I am not so sure.']]
    };
    out['in-home'] = [{ id: 'mom', name: 'Mom', x: 6, y: 4, dir: 'down', kind: 'talk', pal: { h: '#8A5A34', y: '#D8574A', Y: '#A8382E' }, lines: ['Welcome home, sweetie! Did you eat?', 'Your trainer records are on the desk. I keep them tidy for you.'] }];
    out['in-lab'] = [{ id: 'remy', name: 'Lab Aide Remy', x: 3, y: 5, dir: 'down', kind: 'talk', pal: { h: '#3A2A1A', y: '#E8EEF8', Y: '#9AA3B5' }, lines: ['Professor Fern is usually just outside, greeting new trainers.', 'The Dex terminal records every species you keep. Use it any time.'] }];
    const RPAL = [{ h: '#8A5A34', y: '#C0503A', Y: '#8A3A28' }, { h: '#E8E8F0', y: '#4A6A9A', Y: '#2E4A66' }, { h: '#3A2A1A', y: '#4FB06D', Y: '#2E6A2C' }, { h: '#C0392B', y: '#E0A0B8', Y: '#C07898' }];
    Object.keys(RES).forEach((pid, i) => { out['in-' + pid] = [{ id: 'res-' + pid, name: RES[pid][0], x: 7, y: 3, dir: 'down', kind: 'talk', pal: RPAL[i % RPAL.length], lines: RES[pid][1] }]; });
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
  function talk(n) {
    WORLD.facePlayer(n);
    const g = game, done = (g.state.npc && g.state.npc.done) || [];
    const qcity = Object.keys(CITY_QUESTS).find((c) => CITY_QUESTS[c].giver === n.id);
    if (qcity) {
      const Q = game.cityQuest(qcity);
      if (Q.claimed) { showDialog(n.name, n.lines.concat(['Thanks again for today! I will have a new favor tomorrow.'])); return; }
      if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, ['You did it! Thank you so much.', 'Here, take this: +' + CQ_REWARD + ' essence and some trainer experience.']); return; }
      showDialog(n.name, [n.lines[0], 'Could you do me a favor today? Please ' + Q.q.txt + '.', 'Progress: ' + Q.n + '/' + Q.q.n + '. Come back to me when it is done. I have a new favor every day.']); return;
    }
    if (n.kind === 'talk') { showDialog(n.name, n.id === 'pip' ? ['Need a pointer? Here is what I would do next.', wayHint()] : n.lines); return; }
    if (n.kind === 'shop') { showDialog(n.name, n.lines, null, () => openPanel('shop')); return; }
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
  function startTrainer(n) {
    const team = game.teamFor(n);
    const seals = (game.state.npc && game.state.npc.seals) || [];
    const cleared = (game.state.npc && game.state.npc.cleared) || [];
    // trainers: full reward on the first win, half on daily rematches (keeps daily essence close to the pre-city economy)
    const reward = n.leader ? (seals.indexOf(n.id) === -1 ? n.firstReward : n.reward) : (cleared.indexOf(n.id) === -1 ? n.reward : Math.ceil(n.reward / 2));
    game.setState({ trainer: { id: n.id, name: n.name, team: team, stage: n.stage, lv: n.lv || 1, reward: reward, winLine: n.winLine, leader: !!n.leader }, battle: null });
    openScreen('battle');
  }
  // ---------- Champion's Tower ----------
  const KEEPER = 'Tower Keeper';
  function partyLine() {
    return game.towerParty().map((x) => game.make(x.seed, (game.state.caught.find((e) => e.seed === x.seed) || {}).stage || 1).name + ' ' + x.hp + '/' + x.max).join(', ');
  }
  function towerFloorStart() {
    const t = game.towerState(); if (!t.run) return;
    const tr = game.towerFloor(t.run.floor), team = game.teamFor(tr), first = t.run.floor > t.best;
    game.setState({ trainer: { id: tr.id, name: tr.name, team: team, stage: tr.stage, lv: tr.lv, reward: first ? tr.reward : 0, winLine: tr.winLine, tower: true, floor: tr.floor, warden: tr.warden }, battle: null });
    openScreen('battle');
  }
  function towerLobby() {
    const g = game, t = g.towerState(), seals = ((g.state.npc && g.state.npc.seals) || []).length;
    if (seals < 4 && !g.props.testMode) { toast("The Champion's Tower opens to trainers with all 4 Leader Seals. You hold " + seals + '.'); return; }
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
    const intro = [t.best ? 'Back again, Champion. Your best is floor ' + t.best + ' of ' + TOWER.floors + '.' : 'Welcome, Champion. ' + TOWER.floors + ' floors of trainers stand between you and the top.',
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
      setTimeout(() => showDialog(KEEPER, ['You reached the top of the Champion\u2019s Tower!' + (res.reward ? ' +' + res.reward + ' essence.' : ''), res.first ? 'No trainer in Sproutvale has climbed higher. The summit is yours.' : 'Summit reached again: ' + t.clears + ' times now.']), 60);
    } else {
      setTimeout(() => showDialog(KEEPER, ['Your climb ended on floor ' + res.floor + '.', 'Best: floor ' + Math.max(t.best, 0) + ' of ' + TOWER.floors + '. Climbs left today: ' + (g.props.testMode ? 'unlimited' : g.towerRunsLeft()) + '.']), 60);
    }
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
      if (count === 4) lines.push('Every leader in the land has fallen to you. You are the Champion of Sproutvale!');
      open = false; $('screen').hidden = true;
      setTimeout(() => showDialog(n.name, lines), 60);
      return;
    }
    if (game.state.encounter) game.setState({ encounter: null, reveal: 0 });
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
      toast(n.sign.text + (to && lv < GATES[to] ? (game.props.testMode ? ' Normally opens at level ' + GATES[to] + ' (open now in test mode).' : ' Opens at trainer level ' + GATES[to] + '.') : ''));
      return;
    }
    if (n.kind === 'water') { fish(n); return; }
    if (n.kind === 'npc') { talk(n.npc); return; }
    if (n.place.enter && n.place.open !== 'house' && WORLD.MAPS[n.place.enter]) { game.sfx('tap'); WORLD.enter(n.place.enter); return; }
    if (n.place.open === 'tower') { towerLobby(); return; }
    if (n.place.open === 'gym') { const L = (WORLD.allNpcs()[WORLD.map.id] || []).find((x) => x.id === n.place.leader); if (L) talk(L); return; }
    if (n.place.open === 'house') { if (n.place.enter && WORLD.MAPS[n.place.enter]) { game.sfx('tap'); WORLD.enter(n.place.enter); } else toast(n.place.text || 'Nobody seems to be home.'); return; }
    if (n.place.open === 'shop' && n.place.id !== 'shop') { const k = (WORLD.allNpcs()[WORLD.map.id] || []).find((x) => x.kind === 'shop'); if (k) talk(k); else openPanel('shop'); return; }
    openScreen(n.place.open);
  }
  function setNear(n) {
    const b = $('act');
    if (!n) { b.disabled = true; $('act-label').textContent = 'Walk up to a place'; return; }
    b.disabled = false;
    $('act-label').textContent = n.kind === 'water' ? 'Fish' : n.kind === 'npc' ? (n.npc.trainer ? 'Talk to ' + n.npc.name : 'Talk to ' + n.npc.name) : n.kind === 'sign' ? 'Read sign' : ({ home: 'Enter home', lab: 'Enter lab', shrine: 'Roll here', arena: 'Battle here', board: 'Read quests', tower: 'Enter the Tower', desk: 'Check your records', dexpc: 'Open the Dex' })[n.place.id] || ({ gym: 'Enter the gym', house: 'Go inside', shop: 'Browse' })[n.place.open];
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
  function wayHint() {
    const o = objective(), t = o.text || '', st = game.state, seals = (st.npc && st.npc.seals) || [];
    const lid = Object.keys(ROUTE).find((id) => t.indexOf(ROUTE[id][0]) !== -1 && seals.indexOf(id) === -1);
    if (lid) { const [, city, dir, zone] = ROUTE[lid]; return ROUTE[lid][0] + ' keeps a gym in ' + city + '. Take the ' + dir + ' trail out of Sproutvale, cross ' + zone + ' and keep heading ' + dir + '. Signposts mark the way.'; }
    const zt = { 'Moss Forest': 'west', 'Frost Peaks': 'north', 'Ember Fields': 'south', 'Tide Shore': 'east' }, zk = Object.keys(zt).find((z) => t.indexOf(z) !== -1);
    if (zk) return zk + ' is through the ' + zt[zk] + ' trail out of Sproutvale. Its trainers watch the paths.';
    if (t.indexOf('Tower') !== -1) return "Champion's Peak is up the trail just north-east of Sproutvale's plaza, past the signpost. The Tower stands at the summit.";
    if (t.indexOf('Fern') !== -1) return 'Professor Fern works in the Lab on the east side of Sproutvale.';
    if (t.indexOf('Rowan') !== -1) return 'Rowan trains near the south side of Sproutvale. He watches the path, so he will find you.';
    if (t.indexOf('grass') !== -1 || t.indexOf('species') !== -1) return 'Tall grass grows in every zone around Sproutvale, and a little in town too. Each zone has its own types.';
    return t ? t + '.' : 'Explore! Signposts at every trail say where it leads.';
  }
  function musicTrack() {
    const st = game.state;
    if (aggroT && !open) { if (dlg || Date.now() - aggroT < 1500) return 'spotted'; aggroT = 0; }
    if (open) aggroT = 0;
    if (open && st.tab === 'battle') return st.trainer && (st.trainer.tower || st.trainer.leader) ? 'boss' : 'battle';
    const id = WORLD.map && (WORLD.map.interior ? WORLD.map.parent : WORLD.map.id), alias = { 'route-mf': 'peak', 'route-cm': 'moss', 'route-fc': 'frost', 'route-cc': 'tide' }[id]; return alias || (MUSIC.tracks.indexOf(id) !== -1 ? id : 'town');
  }
  function musicLoop() { if (typeof MUSIC === 'undefined' || !game) return; MUSIC.setEnabled(!(game.state.settings && game.state.settings.music === false)); MUSIC.play(musicTrack()); }
  function start2() {
    setInterval(() => { musicLoop(); renderWeather(); }, 400);
    setInterval(() => { if (!document.hidden && game) game.addPlayTime(0.5); }, 30000);
    const comps = { Critter: TPL.compile(document.getElementById('tpl-critter').innerHTML) };
    const screenTpl = TPL.compile(document.getElementById('tpl-screen').innerHTML);
    game = new Game({});
    renderScreen = TPL.mount($('screen'), screenTpl, comps, () => game.renderVals());
    game.componentDidMount();
    let saved = null; try { saved = JSON.parse(localStorage.getItem('critter-roll:world') || 'null'); } catch (e) {}
    WORLD.init($('world'), {
      onInteract: interact, onNear: setNear, onEncounter: encounter, npcs: npcList(),
      tint: () => (game.state.settings && game.state.settings.daynight === false) ? 'day' : timeOfDay(),
      weather: () => weatherAt(WORLD.map.id), still: stillMotion,
      exitLocked: (e) => !game.props.testMode && ROUTE_GATES[e.to] && WORLD.map.id.indexOf('route-') !== 0 ? game.levelInfo(game.state.xp || 0).level < ROUTE_GATES[e.to] : WORLD.map.id === 'town' && e.to !== 'town' && !game.props.testMode && (e.to === 'peak' ? ((game.state.npc && game.state.npc.seals) || []).length < 4 : game.levelInfo(game.state.xp || 0).level < GATES[e.to]),
      onAlert: () => { aggroT = Date.now(); musicLoop(); },
      follower: () => {
        const st = game.state; if (!st.caught.length || (st.settings && st.settings.follow === false)) return null;
        const seeds = game.partySeeds(), sd = st.caught.some((e) => e.seed === st.fighter) ? st.fighter : (seeds[0] || st.caught[0].seed), e = st.caught.find((c) => c.seed === sd);
        const key = sd + ':' + (e ? e.stage : 1);
        if (!folCache || folCache.key !== key) { const k = game.make(sd, e ? e.stage : 1), img = new Image(); img.src = PIX.sprite(k, 'icon'); folCache = { key: key, img: img, shiny: !!k.shiny }; }
        return folCache;
      },
      lockLabel: (e) => 'Lv ' + GATES[e.to],
      onLocked: (e) => ROUTE_GATES[e.to] ? toast(mapName(e.to) + ' opens at trainer level ' + ROUTE_GATES[e.to] + '. You are level ' + game.levelInfo(game.state.xp || 0).level + '.') : e.to === 'peak' ? toast("The trail to Champion's Peak opens with all 4 Leader Seals. You hold " + ((game.state.npc && game.state.npc.seals) || []).length + '.') : toast(ZONE_NAMES[e.to] + ' opens at trainer level ' + GATES[e.to] + '. You are level ' + game.levelInfo(game.state.xp || 0).level + '.'),
      // sight challenges: only trainers you have never beaten (beaten ones wait for you to talk to them)
      canChallenge: (n) => !dlg && !open && !menuOpen && game.state.caught.length > 0 && !game.beatenToday(n.id) && ((game.state.npc && game.state.npc.cleared) || []).indexOf(n.id) === -1,
      onSpotted: (n) => { if (!dlg && !open && !menuOpen) challenge(n); else WORLD.setPaused(open || menuOpen || !!dlg); },
      onMap: (m) => { plank(m.name); setNear(null); renderWeather(); if (game && (m.city || m.id === 'peak') && (game.state.visited || []).indexOf(m.id) === -1) game.update({ visited: (game.state.visited || []).concat([m.id]) }); if (m.id !== 'town' && m.rate > 0 && game) setTimeout(() => hint('zone', 'Each zone has its own two types. The sparkling patch is rare grass with better odds.'), 900); },
      onGrass: () => hint('grass', 'Tall grass hides wild critters. Keep walking through it to find one.'),
      objective: () => null, // no guide arrow or marker: signposts, paths and townsfolk lead the way
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
    $('wm-grid').addEventListener('click', (e) => { const t = e.target.closest('[data-travel]'); if (t) travel(t.dataset.travel); });
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
    $('m-help').addEventListener('click', () => { closeMenu(); toast('Walk with the joystick. Tall grass hides wild critters, sparkling grass hides rarer ones. The shrine rolls any type, the Arena is for battles.'); });
    $('m-sound').addEventListener('click', () => { const s = Object.assign({}, game.state.settings); s.sound = !s.sound; game.update({ settings: s }); if (s.sound) game.sfx('tap'); renderMenu(); });
    $('m-grid').addEventListener('click', (e) => { const t = e.target.closest('[data-tile]'); if (t) tile(t.dataset.tile); });
    $('menu').addEventListener('click', (e) => { if (e.target.id === 'menu') closeMenu(); });
    let pid = null; try { pid = localStorage.getItem('critter-roll:id'); if (!pid) { pid = String(100000000 + Math.floor(Math.random() * 899999999)); localStorage.setItem('critter-roll:id', pid); } } catch (e) { pid = '000000000'; }
    $('m-id').textContent = 'ID ' + pid;
    let devTaps = 0, devTimer = null;
    $('m-id').addEventListener('click', () => {
      devTaps += 1; clearTimeout(devTimer); devTimer = setTimeout(() => { devTaps = 0; }, 1500);
      if (devTaps >= 5 && !game.state.dev) { devTaps = 0; game.update({ dev: true }); toast('Developer options unlocked: Test mode is now in Trainer, Settings.'); }
    });
    $('goal').addEventListener('click', () => toast(wayHint()));
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
  return { weatherAt, start, schedule, close, open: openScreen, encounter, objective, chooseStarter, hint, openPanel, closePanel, buy, useItem, setParty, openMenu, closeMenu, talk, advance, startTrainer, openMap, closeMap, travel, openBackup, exportCode, readCode, timeOfDay, get dialog() { return dlg; }, get game() { return game; }, toast };
})();
window.addEventListener('DOMContentLoaded', APP.start);
