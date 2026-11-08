class Game extends Component {
  make(seed, stage, lv) {
    const k = super.make(seed, stage);
    if (lv === undefined) { const own = this.state && this.state.caught ? this.state.caught.find((e) => e.seed === seed) : null; lv = own ? (own.lv || 1) : 1; }
    lv = Math.max(1, Math.min(MAX_LV, lv | 0));
    const m = 1 + 0.03 * (lv - 1);
    k.stats.forEach((q) => { q.value = Math.min(250, Math.round(q.value * m)); q.pct = Math.min(100, Math.round(q.value / 200 * 100)); });
    k.lv = lv;
    k.seedLabel = SECRETS[seed] ? 'secret' : String(seed);
    const sh = SECRETS[seed] ? 0 : this.shinyHash(seed);   // the secret critter is never shiny
    if (sh) this.shinify(k, sh);
    return k;
  }
  // 1 in SHINY_ODDS seeds are shiny; independent hash so it does not correlate with type, rarity or shape
  shinyHash(seed) {
    let h = (seed ^ 0x5BD1E995) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45D9F3B) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45D9F3B) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
    return h % SHINY_ODDS === 0 ? (h | 1) : 0;
  }
  // ---- play stats: one compact row per day, last 60 days, folded into normal saves ----
  statDay() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  addPlayTime(min) { this._pm = (this._pm || 0) + min; }
  recordStats(patch, events) {
    if (!patch || !this.state || !Array.isArray(this.state.caught) || patch.stats) return;
    const old = this.state.stats && this.state.stats.days ? this.state.stats : { v: 1, days: {} };
    const day = this.statDay(), days = Object.assign({}, old.days), r = JSON.parse(JSON.stringify(days[day] || { min: 0, earn: 0, spend: 0, ev: {}, tower: { runs: 0, best: 0, top: 0 } }));
    const s = Object.assign({}, this.state, patch);
    // essence: everything that changed since the last record (catches level-up bonuses one update late)
    const last = typeof old.ess === 'number' ? old.ess : (this.state.essence || 0), now = typeof patch.essence === 'number' ? patch.essence : (this.state.essence || 0);
    const d1 = (this.state.essence || 0) - last, d2 = now - (this.state.essence || 0);
    [d1, d2].forEach((d) => { if (d > 0) r.earn += d; else if (d < 0) r.spend -= d; });
    (events || []).forEach((e) => { if (e && e.t) r.ev[e.t] = (r.ev[e.t] || 0) + 1; });
    if (patch.towerResult) { const tr = patch.towerResult; if (tr.kind !== 'win') r.tower.runs += 1; r.tower.best = Math.max(r.tower.best, tr.kind === 'loss' ? tr.floor - 1 : tr.floor); if (tr.kind === 'top') r.tower.top += 1; }
    if (this._pm) { r.min = Math.round((r.min + this._pm) * 10) / 10; this._pm = 0; }
    const party = (this.partySeeds ? this.partySeeds() : []).map((sd) => (s.caught.find((e) => e.seed === sd) || {}).lv || 1);
    r.end = { lv: this.levelInfo(s.xp || 0).level, species: (s.seen || []).length, caught: s.caught.length, party: party.length ? Math.round(party.reduce((a, b) => a + b, 0) / party.length * 10) / 10 : 0,
      ess: now, rolls: s.day === new Date().toDateString() ? (s.used || 0) : 0, sight: s.sight && s.sight.day === new Date().toDateString() ? (s.sight.n || 0) : 0,
      seals: ((s.npc && s.npc.seals) || []).length, towerBest: (s.tower && s.tower.best) || 0, titles: (s.titles || []).length, shinies: (s.shinies || []).length };
    days[day] = r;
    const keys = Object.keys(days).sort(); while (keys.length > 60) delete days[keys.shift()];
    patch.stats = { v: 1, ess: now, days: days };
  }
  statsExport() {
    const st = this.state.stats || { days: {} }, keys = Object.keys(st.days).sort();
    const lines = ['Critter Roll play stats (' + keys.length + ' days). Paste or attach this in a chat with Claude for balance tuning.', 'day | min | essence +/- | rolls | sightings | keeps/new | wins/losses | evolves | tower runs/best | trainer lv | species | party lv'];
    keys.forEach((k) => { const r = st.days[k], e = r.end || {}, ev = r.ev || {}; lines.push([k, r.min, '+' + r.earn + '/-' + r.spend, e.rolls, e.sight, (ev.keep || 0) + '/' + (ev.species || 0), (ev.win || 0) + '/' + (ev.loss || 0), ev.evolve || 0, r.tower.runs + '/' + r.tower.best, e.lv, e.species, e.party].join(' | ')); });
    return lines.join('\n') + '\n\nRAW ' + JSON.stringify(st.days);
  }
  titleGains(patch) {
    if (!patch) return [];
    const s = Object.assign({}, this.state || {}, patch);
    if (!Array.isArray(s.caught) || s.seen === undefined) return [];
    const sh = (s.shinies || []).slice();
    s.caught.forEach((e) => { if (this.isShiny(e.seed) && sh.indexOf(e.seed) === -1) sh.push(e.seed); });
    if (sh.length !== (s.shinies || []).length) { patch.shinies = sh; s.shinies = sh; }
    // species count as the base update will compute it, so milestones fire on the same keep
    const seen = (s.seen || []).slice(); s.caught.forEach((e) => { const no = this.make(e.seed, 1).speciesNo; if (no <= 48 && seen.indexOf(no) === -1) seen.push(no); }); s.seen = seen;   // the bonus species (#49) never counts toward the 48
    const have = s.titles || [], got = TITLES.filter((t) => have.indexOf(t.id) === -1 && t.of(s) >= t.goal);
    if (!got.length) return [];
    patch.titles = have.concat(got.map((t) => t.id));
    const bonus = got.reduce((a, t) => a + t.essence, 0);
    if (bonus) patch.essence = (patch.essence !== undefined ? patch.essence : (s.essence || 0)) + bonus;
    return got;
  }
  titleName(s) { s = s || this.state; const t = TITLES.find((x) => x.id === s.title && (s.titles || []).indexOf(x.id) !== -1); return t ? t.name : 'Rookie'; }
  isShiny(seed) { return !!this.shinyHash(seed); }
  shinify(k, h) {
    const shift = 140 + ((h >>> 9) % 81);
    const hex = (m) => { const [hh, ss, ll] = this.toHsl(m); return this.fromHsl(hh + shift, Math.min(100, ss + 8), ll); };
    const rgb = (m, r, g, b, a) => { const x = hex('#' + [r, g, b].map((v) => (+v).toString(16).padStart(2, '0')).join('')), n = parseInt(x.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
    const rot = (str) => typeof str !== 'string' ? str : str.replace(/#[0-9A-Fa-f]{6}\b/g, hex).replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g, rgb);
    ['bodyColor', 'bodyFill', 'outline'].forEach((f) => { k[f] = rot(k[f]); });
    (k.parts || []).forEach((p) => { if (!(p.bw === 0 && /rgba\(255,216,77/.test(p.bg))) p.bg = rot(p.bg); });
    (k.over || []).forEach((o) => { o.bg = rot(o.bg); });
    k.shiny = true; k.name = k.name + ' ★'; if (k.alt) k.alt = 'Shiny ' + k.alt;
  }
  pickSeed(types, rare, rand) {
    rand = rand || Math.random;
    const wantType = rand() < 0.85, wantRare = rare && rand() < 0.35;
    for (let i = 0; i < 600; i++) {
      const s = 1 + Math.floor(rand() * 999998), k = this.make(s, 1);
      if (wantType && types.indexOf(k.element.name) === -1) continue;
      if (wantRare && k.rarity !== 'Rare' && k.rarity !== 'Mythic') continue;
      return s;
    }
    return 1 + Math.floor(rand() * 999998);
  }
  sightingsLeft() {
    const today = new Date().toDateString(), s = this.state.sight;
    return FREE_SIGHTINGS - (s && s.day === today ? s.n : 0);
  }
  encounter(info, rand) {
    const e2 = this.energy(), today = new Date().toDateString(), free = this.sightingsLeft() > 0;
    if (!free && e2.left === 0) return false;
    const s = this.state.sight && this.state.sight.day === today ? this.state.sight : { day: today, n: 0 };
    const ns = Number.isInteger(info.seed) ? info.seed : this.pickSeed(info.types, info.rare, rand);
    this.update({ seed: ns, previewSeed: null, day: e2.today, used: e2.used + (free ? 0 : 1), sight: { day: today, n: s.n + (free ? 1 : 0) }, encounterPaid: !free, lure: Number.isInteger(info.seed) ? 0 : (this.state.lure || 0), reveal: (this.state.reveal || 0) + 1, tab: 'roll', selected: null, armed: false, encounter: info.zone }, [{ t: 'roll' }]);
    const rr = this.make(ns, 1).rarity, calm = this.state.settings && this.state.settings.calm;
    setTimeout(() => { this.sfx(rr === 'Mythic' ? 'mythic' : (rr === 'Rare' ? 'rare' : 'roll')); if (rr === 'Mythic') this.buzz([60, 40, 60, 40, 140]); }, calm ? 0 : 650);
    return true;
  }
  teamFor(t) {
    this._teams = this._teams || {};
    if (this._teams[t.id]) return this._teams[t.id];
    let h = 0; for (const ch of t.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const seeds = [], species = [];
    if (typeof t.pick === 'number') {
      // leaders: rank candidates by total stats and take the one at the leader's strength percentile
      const power = (k) => k.stats.reduce((x, q) => x + q.value, 0);
      for (let slot = 0; slot < t.size; slot++) {
        const type = t.types[slot % t.types.length], cands = [];
        for (let s = (h % 500000) + 1 + slot * 7001; cands.length < 120 && s < (h % 500000) + 400000; s++) {
          const k = this.make(s, 1);
          if (k.element.name !== type || k.rarity === 'Mythic' || species.indexOf(k.speciesNo) !== -1) continue;
          cands.push({ s: s, p: power(this.make(s, t.stage)), no: k.speciesNo });
        }
        cands.sort((x, y) => x.p - y.p);
        const c = cands[Math.min(cands.length - 1, Math.floor(t.pick * (cands.length - 1)))];
        seeds.push(c.s); species.push(c.no);
      }
      this._teams[t.id] = seeds; return seeds;
    }
    for (let s = (h % 500000) + 1; seeds.length < t.size && s < (h % 500000) + 60000; s++) {
      const k = this.make(s, 1);
      if (k.element.name !== t.types[seeds.length % t.types.length] || (k.rarity === 'Mythic') || (!t.leader && k.rarity === 'Rare') || species.indexOf(k.speciesNo) !== -1) continue;
      seeds.push(s); species.push(k.speciesNo);
    }
    this._teams[t.id] = seeds; return seeds;
  }
  // per-side battle effects for the round just resolved (read by the battle screen)
  fxSides(nb, hp0) {
    const ST = { burn: ['Burned', '#FF8A3D'], weaken: ['Weakened', '#B48CFF'], daze: ['Dazed', '#FFD86B'], sap: ['Drained', '#6EE7A8'] };
    return nb.s.map((sd, i) => {
      const hits = sd.fxHits || [], d = sd.hp - hp0[i], f = {};
      if (hits.length) {
        const strong = hits.some((h) => h.m > 1), weak = hits.every((h) => h.m < 1), guard = hits.every((h) => h.g);
        f.burst = guard ? 'guard' : (strong ? 'strong' : (weak ? 'weak' : 'norm')); f.color = hits[hits.length - 1].c;
        if (guard) f.ring = '#7FD3FF';
      }
      if (d < 0) f.num = '-' + (-d); else if (d > 0) { f.num = '+' + d; f.heal = true; }
      if (sd.fxSt && ST[sd.fxSt]) { f.label = ST[sd.fxSt][0]; f.ring = ST[sd.fxSt][1]; }
      else if (f.burst === 'strong') f.label = 'Strong!';
      else if (f.burst === 'weak') f.label = 'Weak';
      else if (f.burst === 'guard') f.label = 'Blocked';
      if (hp0[i] > 0 && sd.hp <= 0) f.ko = true;
      return Object.keys(f).length ? f : null;
    });
  }
  cityQuest(city) {
    const C = CITY_QUESTS[city]; if (!C) return null;
    const day = new Date().toDateString(); let h = 0; for (const ch of day + city) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const q = C.list[h % C.list.length], cq = this.state.cq && this.state.cq.day === day ? this.state.cq : { day: day, p: {} };
    const p = cq.p[city] || { n: 0, claimed: false };
    return { city: city, q: q, n: Math.min(q.n, p.n), done: p.n >= q.n, claimed: p.claimed, day: day };
  }
  questTick(kind, val, patch) {
    const day = new Date().toDateString(), cq = this.state.cq && this.state.cq.day === day ? JSON.parse(JSON.stringify(this.state.cq)) : { day: day, p: {} };
    let hit = false;
    Object.keys(CITY_QUESTS).forEach((city) => {
      const Q = this.cityQuest(city); if (!Q || Q.claimed || Q.done || Q.q.k !== kind) return;
      const ok = kind === 'see' ? Q.q.map === val : kind === 'keep' ? Q.q.types.indexOf(val) !== -1 : Q.q.id === val;
      if (!ok) return; const p = cq.p[city] || { n: 0, claimed: false }; p.n += 1; cq.p[city] = p; hit = true;
    });
    if (!hit) return;
    if (patch) patch.cq = cq; else this.update({ cq: cq });
  }
  claimCityQuest(city) {
    const Q = this.cityQuest(city); if (!Q || !Q.done || Q.claimed) return false;
    const cq = JSON.parse(JSON.stringify(this.state.cq)); cq.p[city].claimed = true;
    this.update({ cq: cq, essence: (this.state.essence || 0) + CQ_REWARD }, [{ t: 'quest' }]);
    return true;
  }
  itemUsable(it, P) {
    if (!P) return false;
    const statused = P.burn > 0 || P.weak > 0 || P.daze > 0 || P.sap > 0;
    if (it === 'potion' || it === 'super') return P.hp < P.max;
    if (it === 'herb') return P.hp < P.max || statused;
    if (it === 'ward') return !(P.ward > 0);
    if (it === 'whet') return !(P.boost > 1);
    return false;
  }
  // gates by fires (review copy, item 9): a town gate or a route is open once you hold enough seals (GATES / ROUTE_GATES as seal counts); a save older than this build
  // (state.lvGates) also keeps the old trainer-level rule as an alternative, and a save that has walked the Cold Ascent keeps the climb.
  gateOpen(id) {
    const need = ROUTE_GATES[id] !== undefined ? ROUTE_GATES[id] : GATES[id]; if (need === undefined) return true;
    const seals = ((this.state.npc && this.state.npc.seals) || []).length; if (seals >= need) return true;
    if (id === 'ascent' && (this.state.visited || []).indexOf('ascent') !== -1) return true;
    if (this.state.lvGates) { const old = ROUTE_GATES_LV[id] !== undefined ? ROUTE_GATES_LV[id] : GATES_LV[id]; if (old !== undefined && this.levelInfo(this.state.xp || 0).level >= old) return true; }
    return false;
  }
  // quests the day can keep (item 7): a saved quest of a kind that can no longer progress in action mode is regenerated once with salt + 1 on load
  componentDidMount() {
    super.componentDidMount();
    const q = this.state.quests, dead = ['roll', 'special', 'release'];
    if (q && q.day === new Date().toDateString() && Array.isArray(q.items) && q.items.some((it) => dead.indexOf(it.key) !== -1)) this.update({ quests: this.makeQuests(q.day, (q.salt || 0) + 1) });
  }
  towerTwist(date) {
    if (typeof window !== 'undefined' && window.__twist) return window.__twist;
    const d = date || new Date(), week = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 3) / 7); // weeks start on Monday
    const T = TWISTS[week % TWISTS.length], ty = TWIST_TYPES[week % TWIST_TYPES.length];
    return Object.assign({}, T, { week: week, type: ty, text: T.about(ty) });
  }
  towerFloor(f) {
    const C = window.__towerCurve || TOWER_CURVE, i = Math.max(0, Math.min(TOWER.floors, f) - 1), A = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
    const tw = this.towerTwist(), warden = f % 5 === 0; let types = [A[(f * 3) % 8], A[(f * 3 + 3) % 8]]; if (warden) types.push(A[(f * 3 + 5) % 8]);
    if (tw.id === 'mono') types = [A[(f * 5 + tw.week) % 8]];
    return { id: 'tower-' + f + (tw.id === 'mono' ? '-mono' + tw.week : ''), name: TOWER_NAMES[i], floor: f, warden: warden, types: types, size: C.size[i], stage: C.stage[i], lv: C.lv[i], pick: C.pick[i],
      reward: Math.round((4 + f + (warden ? 5 : 0)) * tw.mult), winLine: warden ? 'A long one, and the lamp held. Few keep it this far.' : 'The lamp held. The next night is coming.', tower: true };
  }
  towerState() { return Object.assign({ best: 0, day: '', runs: 0, clears: 0, run: null }, this.state.tower); }
  towerRunsLeft() {
    if (this.props.testMode) return 99;
    const t = this.towerState(); return Math.max(0, TOWER.runsPerDay - (t.day === new Date().toDateString() ? t.runs : 0));
  }
  maxHp(seed) { const e = this.state.caught.find((x) => x.seed === seed); if (!e) return 0; return Math.round(this.make(seed, e.stage).stats[0].value * 1.5 + 60); }
  towerParty() {
    const t = this.towerState(); if (!t.run) return [];
    return t.run.party.filter((sd) => this.state.caught.some((e) => e.seed === sd)).map((sd) => { const max = this.maxHp(sd); return { seed: sd, max: max, hp: Math.max(0, Math.min(max, t.run.hp[sd] === undefined ? max : t.run.hp[sd] | 0)) }; });
  }
  startTowerRun() {
    const t = this.towerState(), today = new Date().toDateString(), party = this.partySeeds().length ? this.partySeeds() : [this.state.caught[0].seed];
    const hp = {}; party.forEach((sd) => { hp[sd] = this.maxHp(sd); });
    this.update({ tower: Object.assign({}, t, { day: today, runs: (t.day === today ? t.runs : 0) + 1, run: { floor: 1, party: party, hp: hp } }) });
  }
  endTowerRun() { this.update({ tower: Object.assign({}, this.towerState(), { run: null }) }); }
  // the Arena ladder: five named rivals in a fixed order, one ladder fight a day (win or lose); a climbed rival can be fought again, once a day, like any trainer
  ladderStep() { return (this.state.arena && this.state.arena.step) || 0; }
  ladderFoughtToday() { return !!(this.state.arena && this.state.arena.day === new Date().toDateString()); }
  ladderReady(n) { if (!n.ladder) return true; const step = this.ladderStep(); if (n.ladder <= step) return true; return n.ladder === step + 1 && !this.ladderFoughtToday(); }
  beatenToday(id) { const b = (this.state.npc && this.state.npc.beaten) || {}; return b[id] === new Date().toDateString(); }
  update(patch, events) {
    if (window.__saveFrozen) return;
    const shinyReveal = patch && patch.reveal && Number.isInteger(patch.seed) && patch.seed !== this.state.seed && this.isShiny(patch.seed);
    // only real keeps count (a keep event), never a cloud-sync or load that brings in many critters at once
    if (patch && (events || []).some((e) => e && e.t === 'keep') && Array.isArray(patch.caught) && this.state && Array.isArray(this.state.caught) && patch.caught.length > this.state.caught.length && !patch.cq) {
      patch.caught.filter((e) => !this.state.caught.some((c) => c.seed === e.seed)).forEach((e) => this.questTick('keep', this.make(e.seed, 1).element.name, patch));
    }
    const gained = this.titleGains(patch);
    this.recordStats(patch, events);
    super.update(patch, events);
    if (gained.length && typeof APP !== 'undefined' && APP.toast) setTimeout(() => { APP.toast('New title' + (gained.length > 1 ? 's' : '') + ': ' + gained.map((t) => t.name + (t.essence ? ' (+' + t.essence + ' essence)' : '')).join(', ') + '. Wear ' + (gained.length > 1 ? 'one' : 'it') + ' from your Trainer card.'); this.sfx('level'); }, 700); if (typeof CLOUD !== 'undefined') CLOUD.changed();
    if (shinyReveal) { const calm = this.state.settings && this.state.settings.calm; setTimeout(() => { this.sfx('mythic'); this.buzz([30, 40, 30, 40, 30, 40, 160]); }, calm ? 50 : 900); }
  }
  starters() {
    if (this._starters) return this._starters;
    const power = (k) => k.stats.reduce((x, q) => x + q.value, 0);
    this._starters = ['Ember', 'Tide', 'Moss'].map((type, ti) => {
      const cands = [];
      for (let s = 31337 + ti * 50021; cands.length < 80 && s < 31337 + ti * 50021 + 200000; s++) {
        const k = this.make(s, 1);
        if (k.element.name !== type || (k.rarity !== 'Common' && k.rarity !== 'Uncommon') || k.eyes.length !== 2) continue;
        cands.push({ s: s, p: power(k) });
      }
      cands.sort((x, y) => x.p - y.p);
      return cands[Math.floor(cands.length * 0.75)].s;
    });
    return this._starters;
  }
  partySeeds() {
    const own = new Set(this.state.caught.map((e) => e.seed));
    return (this.state.party || []).filter((s) => own.has(s)).slice(0, 3);
  }
  benchFor(leadSeed, foe) {
    return this.partySeeds().filter((s) => s !== leadSeed).slice(0, 2).map((s) => {
      const e = this.state.caught.find((x) => x.seed === s), k = this.make(e.seed, e.stage);
      return this.newBattle(k, foe, 0).s[0];
    });
  }
  // action mode: keep a defeated wild critter. Same price as meeting and keeping it in the grass: the keep cost in rolls (shiny = free)
  // plus the sighting (a free one while any are left today, otherwise one roll). It joins at stage 1, level 1, like any kept critter.
  // action mode: every defeated critter you do not already keep (or hold in the pouch) drops a catch orb
  actWorthy(k) { const st = this.state; return !st.caught.some((e) => e.seed === k.seed) && (st.pouch || []).indexOf(k.seed) === -1; }
  // put a collected orb in the pouch (8 at most); returns true, or 'full'
  actPouchAdd(seed) { const p = (this.state.pouch || []).slice(); if (p.indexOf(seed) !== -1) return true; if (p.length >= 8) return 'full'; p.push(seed); this.update({ pouch: p }); return true; }
  // the price of a keep in rolls (the day's lamp): shiny free; a critter that woke for you in the rare grass (woke) keeps at the Common price. The sightings counter no longer adds to it.
  actKeepCost(k, woke) { return { cost: k.shiny ? 0 : (woke ? KEEP_COST.Common : (KEEP_COST[k.rarity] || 1)), free: true }; }
  actKeep(k, woke) {
    const st = this.state; if (st.caught.some((e) => e.seed === k.seed)) return { ok: false, why: 'owned' };
    const e2 = this.energy(), c = this.actKeepCost(k, woke);
    if (e2.left < c.cost) return { ok: false, why: 'rolls', cost: c.cost, left: e2.left };
    const no = this.make(k.seed, 1).speciesNo, seen = (st.seen || []).slice(), events = [{ t: 'keep' }];
    if (no <= 48 && seen.indexOf(no) === -1) { seen.push(no); events.push({ t: 'species' }); }
    this.update({ caught: [{ seed: k.seed, stage: 1 }].concat(st.caught), seen: seen, day: e2.today, used: e2.used + c.cost, pouch: (st.pouch || []).filter((x) => x !== k.seed), returned: (st.returned || []).filter((x) => x !== k.seed) }, events);
    this.sfx('keep'); return { ok: true, cost: c.cost, species: events.length > 1 };
  }
  // action mode: a defeated wild critter pays the lead critter XP (it can level up) and, for the first ACT_ESS_CAP kills each day, essence like a won wild battle
  actKill(foeK, leadK) {
    const st = this.state, today = new Date().toDateString(), a = st.act && st.act.day === today ? st.act : { day: today, n: 0, tx: 0 };
    const caught = st.caught.map((e) => Object.assign({}, e)), e = caught.find((x) => x.seed === leadK.seed);
    const tx = a.tx | 0, txp = this.energy().left <= 0 && tx < ACT_TXP_CAP ? 1 : 0;   // the day's lamp spent: the first ACT_TXP_CAP kills still move the trainer, by one
    const ratio = Math.max(0.5, Math.min(1.5, (foeK.lv || 1) / Math.max(1, leadK.lv || 1)));
    const xpGain = Math.max(1, Math.round((8 + 2 * (foeK.lv || 1) + 5 * (foeK.stage || 1)) * ACT_XP * ratio));
    let lv0 = 0, lv1 = 0;
    if (e) { lv0 = lv1 = e.lv || 1; let xp = (e.xp || 0) + xpGain; while (lv1 < MAX_LV && xp >= lvNeed(lv1)) { xp -= lvNeed(lv1); lv1 += 1; } if (lv1 >= MAX_LV) xp = 0; e.lv = lv1; e.xp = xp; }
    let ess = 0;
    if (a.n < ACT_ESS_CAP) { ess = 1 + (foeK.rarity === 'Rare' ? 1 : 0) + (foeK.rarity === 'Mythic' ? 2 : 0) + (this.beats()[leadK.element.name].indexOf(foeK.element.name) !== -1 ? 1 : 0); }
    const patch = { caught: caught, essence: st.essence + ess, act: { day: today, n: a.n + 1, tx: tx + txp } }; if (txp) patch.xp = (st.xp || 0) + txp;
    this.update(patch);
    if (lv1 > lv0) setTimeout(() => this.sfx('level'), 150);
    return { xp: xpGain, ess: ess, txp: txp, lv: lv1 > lv0 ? lv1 : 0, capped: a.n + 1 >= ACT_ESS_CAP };
  }
  awardXp(nb, won, patch) {
    const caught = (patch.caught || this.state.caught).map((e) => Object.assign({}, e));
    let grew = false;
    Object.keys(nb.part || {}).forEach((sk) => {
      const seed = +sk, e = caught.find((x) => x.seed === seed); if (!e) return;
      const name = this.make(seed, e.stage, e.lv || 1).name;
      let lv = e.lv || 1, xp = (e.xp || 0) + 5 + (won ? 10 : 0) + ((nb.koXp || {})[sk] || 0);
      while (lv < MAX_LV && xp >= lvNeed(lv)) { xp -= lvNeed(lv); lv += 1; nb.log.push({ text: name + ' grew to level ' + lv + '!' }); grew = true; }
      if (lv >= MAX_LV) xp = 0;
      e.lv = lv; e.xp = xp;
    });
    patch.caught = caught;
    if (grew) setTimeout(() => this.sfx('level'), 600);
  }
  // the end of a trainer or wild battle (shared by the turn-based screen and the action-mode duel): rewards, seals, quests, Tower progress, XP
  settleBattle(nb, tr, won, lost, patch, events) {
    if (won) {
      nb.over = true; nb.win = true; nb.draw = false;
      patch.wins = this.state.wins + 1; patch.essence = this.state.essence + nb.reward;
      events.push({ t: 'win', type: nb.s[0].k.element.name, adv: this.beats()[nb.s[0].k.element.name].indexOf(nb.s[1].k.element.name) !== -1 });
      if (tr && !tr.tower) {
        this.questTick('beat', tr.id, patch);
        const npc = Object.assign({ done: [], beaten: {}, cleared: [], seals: [] }, this.state.npc);
        npc.beaten = Object.assign({}, npc.beaten, { [tr.id]: new Date().toDateString() });
        if ((npc.cleared || []).indexOf(tr.id) === -1) npc.cleared = (npc.cleared || []).concat([tr.id]);
        // a leader's seal is granted when the trial is kept (app.js gymDone), never here: the duel is for XP
        patch.npc = npc;
        if (tr.ladder) {   // the Arena ladder: the step climbed; the top step keeps Kindlemane for whoever climbs it
          const ar = Object.assign({ step: 0, day: '' }, this.state.arena); if (tr.ladder === ar.step + 1) ar.day = new Date().toDateString(); ar.step = Math.max(ar.step, tr.ladder); patch.arena = ar;   // the day is stamped on a WON ladder fight (a lost one can be tried again today)
          if (tr.ladder >= 5 && !(patch.caught || this.state.caught).some((e) => e.seed === SECRET4_SEED)) { patch.caught = (patch.caught || this.state.caught).concat([{ seed: SECRET4_SEED, stage: 3, lv: SECRETS[SECRET4_SEED].lv }]); patch.kindled = true; }
        }
        nb.log.push({ text: tr.name + ': "' + tr.winLine + '"' });
      }
      setTimeout(() => this.sfx(tr && tr.tower ? 'dawn' : 'win'), 250); this.buzz([40, 30, 40]);   // the Watch: dawn, not a fight won
    } else if (lost) {
      nb.over = true; nb.win = false;
      if (!nb.draw) { events.push({ t: 'loss' }); setTimeout(() => this.sfx('lose'), 250); }
    } else if (nb.over && nb.draw) { /* round limit */ }
    if (tr && tr.tower) this.towerAfter(nb, won, lost || (nb.over && !won), patch);
    if (nb.over) this.awardXp(nb, won, patch);
    this.update(patch, events);
  }
  // action mode: a duel in the overworld ended. `o` = { lead, foe, bench (battler sides), part: {seed: true}, koXp: {seed: xp} }. Returns the log lines (level-ups).
  actDuelEnd(tr, won, o) {
    const nb = { s: [o.lead, o.foe], bench: o.bench || [], reward: tr.reward || 0, round: 1, log: [], over: true, win: !!won, draw: false, trainer: tr, part: o.part || {}, koXp: o.koXp || {} };
    this._surge = null; this.settleBattle(nb, tr, !!won, !won, {}, []);
    return nb.log.map((l) => l.text);
  }
  // action mode: leaving a Tower floor unfinished keeps the party's HP in the run (the floor starts over)
  actTowerHold(sides) {
    const t = this.towerState(); if (!t.run) return; const run = { floor: t.run.floor, party: t.run.party.slice(), hp: Object.assign({}, t.run.hp) };
    sides.forEach((sd) => { run.hp[sd.k.seed] = Math.max(0, Math.round(sd.hp)); }); this.update({ tower: Object.assign({}, t, { run: run }) });
  }
  towerAfter(nb, won, lost, patch) {
    const t = this.towerState(); if (!t.run) return;
    const run = { floor: t.run.floor, party: t.run.party.slice(), hp: Object.assign({}, t.run.hp) };
    [nb.s[0]].concat(nb.bench || []).forEach((sd) => { run.hp[sd.k.seed] = Math.max(0, sd.hp); });
    const f = nb.trainer.floor, nt = Object.assign({}, t, { run: run });
    if (won) {
      nb.log.push({ text: nb.trainer.name + ': \"' + nb.trainer.winLine + '\"' });
      nt.best = Math.max(t.best, f);
      if (f >= TOWER.floors) { nt.run = null; nt.clears = (t.clears || 0) + 1; patch.towerResult = { kind: 'top', floor: f, reward: nb.reward, first: t.best < f }; }
      else {
        run.floor = f + 1;
        const heal = this.towerTwist().heal; run.party.forEach((sd) => { const max = this.maxHp(sd); run.hp[sd] = Math.min(max, (run.hp[sd] === undefined ? max : run.hp[sd]) + Math.round(max * heal)); });
        patch.towerResult = { kind: 'win', floor: f, reward: nb.reward, first: t.best < f };
      }
    } else if (lost) { run.party.forEach((sd) => { run.hp[sd] = Math.round(this.maxHp(sd) * TOWER.heal); }); patch.towerResult = { kind: 'loss', floor: f, best: t.best }; }   // a night not kept does not unmake the watch: the run waits on the same night, the party at 30% (best unchanged)
    patch.tower = nt;
  }
  renderVals() {
    const v = super.renderVals();
    const enc = this.state.encounter;
    v.screenTitle = enc ? 'Wild critter' : ({ roll: 'Critter', dex: 'Critter Lab', badges: 'Trainer' }[this.state.tab] || '');
    v.closeScreen = () => APP.close();
    v.backLabel = WORLD.map ? WORLD.map.name : 'Sproutvale';
    v.showRollTools = v.showRoll && !enc;
    if (v.c) {
      const own = this.state.caught.find((e) => e.seed === v.c.seed);
      v.c.owned = !!own;
      const lv = own ? (own.lv || 1) : 1, xp = own ? (own.xp || 0) : 0;
      v.c.lvLine = lv >= MAX_LV ? 'Level ' + lv + ' (max)' : 'Level ' + lv + ' · ' + xp + '/' + lvNeed(lv) + ' XP to level ' + (lv + 1);
      v.c.xpPct = lv >= MAX_LV ? 100 : Math.round(xp / lvNeed(lv) * 100);
    }
    const pouchMode = !!this.state.pouchCard && enc === 'pouch';
    if (v.showRoll && v.c && !v.kept && !this.state.previewSeed) {
      const cost = pouchMode ? this.actKeepCost(v.c).cost : (v.c.shiny ? 0 : (KEEP_COST[v.c.rarity] || 1)), en = this.energy(), can = en.left >= cost, baseKeep = v.keep;
      v.keepLabel = cost === 0 ? 'Keep (free, shiny!)' : (can ? 'Keep (' + cost + (cost === 1 ? ' roll)' : ' rolls)') : 'Needs ' + cost + (cost === 1 ? ' roll' : ' rolls'));
      v.keepDisabled = !can;
      v.keep = () => {
        if (pouchMode) { const r = this.actKeep(v.c); if (r.ok) this.setState({ reveal: 0 }); return; }
        const e2 = this.energy(); if (e2.left < cost || this.state.caught.some((x) => x.seed === v.c.seed)) return;
        this.update({ day: e2.today, used: e2.used + cost });
        baseKeep();
      };
    }
    v.showEncounterBar = v.showRoll && !!enc;
    const sl = this.sightingsLeft();
    v.encounterNote = enc && enc !== 'kept' ? 'Found in the tall grass of ' + enc + '. ' + (this.state.encounterPaid ? 'Your free sightings are used up, so this one cost a roll.' : 'Free sighting: ' + Math.max(0, sl) + ' left today.') : '';
    if (enc === 'kept') v.showEncounterBar = false;   // kept by staying beside it: the card shows the critter, nothing to explain
    v.leaveLabel = v.kept ? 'Back to exploring' : 'Let it go';
    v.leaveGo = v.closeScreen;
    if (pouchMode && v.c) {
      const more = (this.state.pouch || []).filter((x) => x !== v.c.seed).length, kc = this.actKeepCost(v.c);
      v.leaveLabel = v.kept ? (more ? 'Next critter (' + more + ')' : 'Back to exploring') : (more ? 'Let it go, next (' + more + ')' : 'Let it go');
      v.leaveGo = () => APP.pouchNext(v.c.seed, !!v.kept);
      v.encounterNote = '';   // the pouch card without its paragraph (04-P1): the critter and the price
    }
    v.encKeepBg = v.kept ? 'rgba(40,110,60,0.85)' : (v.keepDisabled ? 'rgba(14,26,56,0.6)' : v.primaryBg);
    v.encKeepFg = v.kept ? '#FFFFFF' : (v.keepDisabled ? '#9FB0D0' : '#2A1B00');
    v.encKeepShadow = v.kept || v.keepDisabled ? 'none' : '0 4px 14px rgba(245,185,58,0.45)';
    const seals = (this.state.npc && this.state.npc.seals) || [];
    v.seals = LEADERS.map((L) => {
      const got = seals.indexOf(L.id) !== -1, open = this.gateOpen(L.zone) || this.props.noGates;
      return { name: L.name, zone: ZONE_NAMES[L.zone], got: got, notGot: !got, color: got ? L.color : '#AEBBD6', ring: got ? '#F5C542' : '#8C9BBD', glow: got ? '0 0 12px rgba(245,197,66,0.7)' : 'none',
        status: got ? 'Seal earned' : (open ? 'Waiting in ' + mapName(npcHome(L.id) || L.zone) : 'Behind a shut gate'), aria: L.name + ', ' + (got ? 'seal earned' : 'seal not earned') };
    });
    v.sealCount = seals.length;
    {
      const st = this.state, have = st.titles || [];
      v.titleName = this.titleName();
      v.titleCount = have.length;
      v.titleList = TITLES.filter((t) => !t.hidden || have.indexOf(t.id) !== -1).map((t) => { const got = have.indexOf(t.id) !== -1, on = got && st.title === t.id, n = Math.min(t.goal, t.of(st));   // a hidden title (the lamp's) exists only once earned
        return { name: t.name, sub: got ? (on ? 'Wearing now · tap to remove' : 'Earned · tap to wear') : t.desc + ' (' + n + '/' + t.goal + ')' + (t.essence ? ' · +' + t.essence + ' essence' : ''),
          bg: on ? 'linear-gradient(180deg, #FFE69A, #F5B93A)' : (got ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'), fg: got ? '#1E2A4A' : '#5A6890', pressed: on ? 'true' : 'false', disabled: !got,
          pick: () => { if (got) this.update({ title: on ? '' : t.id }); } }; });
    }
    v.champion = seals.length === 4;
    if (v.spd) v.spd.line = v.spd.line + ' · lives in ' + HABITAT[v.spd.line.split(' ')[0]];
    // pixel sprites
    if (v.c) v.c.sprite = PIX.sprite(v.c, 'big');
    (v.caught || []).forEach((k) => { k.sprite = PIX.sprite(k, 'big'); });
    (v.duel || []).forEach((d) => { d.k.sprite = PIX.sprite(d.k, 'big'); });
    const icon = (no, found) => PIX.sprite(this.make(this.repSeed(no, v.caught), 1), found ? 'icon' : 'silhouette');
    (v.speciesRows || []).forEach((row) => row.cells.forEach((cell) => { cell.icon = icon(parseInt(cell.no, 10), cell.found); }));
    if (v.spd) v.spd.icon = icon(parseInt(v.spd.no, 10), v.spd.name !== 'Unknown species');
    return v;
  }
  repSeed(no, caught) {
    const own = (caught || []).find((k) => k.speciesNo === no);
    if (own) return own.seed;
    this._rep = this._rep || {};
    if (!this._rep[no]) { for (let s = no * 7919; s < no * 7919 + 4000; s++) { if (this.make(s, 1).speciesNo === no) { this._rep[no] = s; break; } } }
    return this._rep[no] || 1;
  }
}

