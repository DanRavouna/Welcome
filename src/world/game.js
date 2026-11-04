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
      reward: Math.round((4 + f + (warden ? 5 : 0)) * tw.mult), winLine: warden ? 'The way up is yours. Few get this far.' : 'Go on, the next floor is waiting.', tower: true };
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
  playRound(i) { this.battleAction({ move: i }); }
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
  battleAction(act) {
    const b = this.state.battle;
    if (!b || b.over) return;
    const nb = JSON.parse(JSON.stringify(b)); nb.bench = nb.bench || [];
    const events = [], patch = { battle: nb, bmode: 'moves' };
    let mi = -1, P = nb.s[0];
    if (act.move !== undefined) {
      const mv = P.k.kit[act.move];
      if (!mv || (mv.kind === 'guard' && P.lastGuard) || (mv.kind === 'status' && P.uses === 0)) return;
      mi = act.move; if (mv.kind === 'status') events.push({ t: 'special' });
    } else if (act.switchTo !== undefined) {
      const nxt = nb.bench[act.switchTo]; if (!nxt || nxt.hp <= 0) return;
      nb.bench[act.switchTo] = P; nb.s[0] = nxt; nxt.guard = false; nxt.lastGuard = false;
      nb.log.push({ text: P.label + ' comes back. ' + nxt.label + ' steps in!' }); P = nxt;
    } else if (act.item) {
      const bag = Object.assign({}, BAG0, this.state.bag);
      const it = act.item, statused = P.burn > 0 || P.weak > 0 || P.daze > 0 || P.sap > 0;
      if (!(bag[it] > 0) || !this.itemUsable(it, P)) return;
      bag[it] -= 1; patch.bag = bag;
      if (it === 'potion' || it === 'super') {
        const amt = it === 'super' ? P.max - P.hp : Math.min(P.max - P.hp, Math.round(P.max * 0.4));
        P.hp += amt; nb.log.push({ text: 'You used a ' + (it === 'super' ? 'Super Potion' : 'Potion') + '. ' + P.label + ' recovered ' + amt + ' HP.' });
      } else if (it === 'herb') {
        const amt = Math.min(P.max - P.hp, Math.round(P.max * ITEM_FX.herb.heal)); P.hp += amt; P.burn = 0; P.weak = 0; P.daze = 0; P.sap = 0;
        nb.log.push({ text: 'You used a Mossleaf Remedy. ' + P.label + ' recovered ' + amt + ' HP' + (statused ? ' and shook off its status.' : '.') });
      } else if (it === 'ward') { P.ward = ITEM_FX.ward.hits; nb.log.push({ text: 'You used a Frost Ward. ' + P.label + ' is shielded from the next ' + ITEM_FX.ward.hits + ' hits.' }); }
      else if (it === 'whet') { P.boost = ITEM_FX.whet.mult; nb.log.push({ text: 'You used a Whetstone. ' + P.label + "'s attacks are sharper for the rest of the battle." }); }
    } else return;
    nb.part = nb.part || {}; nb.koXp = nb.koXp || {};
    nb.part[nb.s[0].k.seed] = true;
    const healed = act.item ? nb.s[0].hp - (b.s[0].k.seed === nb.s[0].k.seed ? b.s[0].hp : nb.s[0].hp) : 0;
    const hp0 = [nb.s[0].hp - healed, nb.s[1].hp];
    nb.s.forEach((sd) => { delete sd.fxHits; delete sd.fxSt; });
    this._surge = nb.trainer && nb.trainer.tower && this.towerTwist().id === 'surge' ? this.towerTwist().type : null;
    this.resolve(nb, mi, Math.random);
    this._surge = null;
    nb.fx = { round: nb.round, hit: [nb.s[0].hp < hp0[0], nb.s[1].hp < hp0[1]], side: this.fxSides(nb, hp0) };
    if (nb.fx.hit[0] || nb.fx.hit[1]) this.sfx('hit');
    const tr = nb.trainer;
    let won = false, lost = false;
    if (nb.s[1].hp <= 0) {
      const foeK = nb.s[1].k, ko = 8 + 2 * (foeK.lv || 1) + 5 * (foeK.stage || 1);
      nb.koXp[nb.s[0].k.seed] = (nb.koXp[nb.s[0].k.seed] || 0) + ko;
      if (tr && tr.idx < tr.team.length - 1) {
        tr.idx += 1;
        const foe = this.make(tr.team[tr.idx], tr.stage, tr.lv || 1);
        nb.s[1] = this.newBattle(nb.s[0].k, foe, nb.reward).s[1];
        nb.s[1].label = tr.name + "'s " + foe.name;
        nb.log.push({ text: tr.name + ' sent out ' + foe.name + '!' });
        nb.over = false; nb.win = false; nb.draw = false;
        this.sfx('claim');
      } else won = true;
    }
    if (!won && nb.s[0].hp <= 0) {
      const j = nb.bench.findIndex((s) => s.hp > 0);
      if (j !== -1) {
        const out = nb.s[0]; nb.s[0] = nb.bench[j]; nb.bench[j] = out;
        nb.log.push({ text: nb.s[0].label + ' steps in!' });
        nb.over = false; nb.win = false; nb.draw = false;
      } else lost = true;
    }
    if (won) {
      nb.over = true; nb.win = true; nb.draw = false;
      patch.wins = this.state.wins + 1; patch.essence = this.state.essence + nb.reward;
      events.push({ t: 'win', type: nb.s[0].k.element.name, adv: this.beats()[nb.s[0].k.element.name].indexOf(nb.s[1].k.element.name) !== -1 });
      if (tr && !tr.tower) {
        this.questTick('beat', tr.id, patch);
        const npc = Object.assign({ done: [], beaten: {}, cleared: [], seals: [] }, this.state.npc);
        npc.beaten = Object.assign({}, npc.beaten, { [tr.id]: new Date().toDateString() });
        if ((npc.cleared || []).indexOf(tr.id) === -1) npc.cleared = (npc.cleared || []).concat([tr.id]);
        if (tr.leader && (npc.seals || []).indexOf(tr.id) === -1) { npc.seals = (npc.seals || []).concat([tr.id]); patch.justSealed = tr.id; events.push({ t: 'leader' }); }
        patch.npc = npc;
        nb.log.push({ text: tr.name + ': "' + tr.winLine + '"' });
      }
      setTimeout(() => this.sfx('win'), 250); this.buzz([40, 30, 40]);
    } else if (lost) {
      nb.over = true; nb.win = false;
      if (!nb.draw) { events.push({ t: 'loss' }); setTimeout(() => this.sfx('lose'), 250); }
    } else if (nb.over && nb.draw) { /* round limit */ }
    if (tr && tr.tower) this.towerAfter(nb, won, lost || (nb.over && !won), patch);
    if (nb.over) this.awardXp(nb, won, patch);
    this.update(patch, events);
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
    } else if (lost) { nt.run = null; patch.towerResult = { kind: 'loss', floor: f, best: t.best }; }
    patch.tower = nt;
  }
  renderVals() {
    const v = super.renderVals();
    const enc = this.state.encounter;
    v.screenTitle = enc ? 'Wild critter' : ({ roll: 'Roll Shrine', dex: 'Critter Lab', battle: 'Arena', badges: 'Trainer' }[this.state.tab] || '');
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
    if (v.showRoll && v.c && !v.kept && !this.state.previewSeed) {
      const cost = v.c.shiny ? 0 : (KEEP_COST[v.c.rarity] || 1), en = this.energy(), can = en.left >= cost, baseKeep = v.keep;
      v.keepLabel = cost === 0 ? 'Keep (free, shiny!)' : (can ? 'Keep (' + cost + (cost === 1 ? ' roll)' : ' rolls)') : 'Needs ' + cost + ' rolls');
      v.keepDisabled = !can;
      v.keep = () => {
        const e2 = this.energy(); if (e2.left < cost || this.state.caught.some((x) => x.seed === v.c.seed)) return;
        this.update({ day: e2.today, used: e2.used + cost });
        baseKeep();
      };
    }
    v.showEncounterBar = v.showRoll && !!enc;
    const sl = this.sightingsLeft();
    v.encounterNote = enc ? 'Found in the tall grass of ' + enc + '. ' + (this.state.encounterPaid ? 'Your free sightings are used up, so this one cost a roll.' : 'Free sighting: ' + Math.max(0, sl) + ' left today.') : '';
    v.leaveLabel = v.kept ? 'Back to exploring' : 'Let it go';
    v.encKeepBg = v.kept ? 'rgba(40,110,60,0.85)' : (v.keepDisabled ? 'rgba(14,26,56,0.6)' : v.primaryBg);
    v.encKeepFg = v.kept ? '#FFFFFF' : (v.keepDisabled ? '#9FB0D0' : '#2A1B00');
    v.encKeepShadow = v.kept || v.keepDisabled ? 'none' : '0 4px 14px rgba(245,185,58,0.45)';
    const tr = this.state.trainer, b = this.state.battle;
    if (tr && this.state.tab === 'battle' && this.state.caught.length) {
      const st = this.state, fe = st.caught.find((e) => e.seed === st.fighter) || st.caught[0];
      const me = this.make(fe.seed, fe.stage), foe0 = this.make(tr.team[0], tr.stage, tr.lv || 1);
      const beaten = this.beatenToday(tr.id), won = b && b.trainer && b.over && b.win;
      if (!b) {
        const side = (k, i, label) => { const max = Math.round(k.stats[0].value * 1.5 + 60); return { hitClass: '', fx: null, flashCls: '', side: label, sideColor: i ? '#FF8A7A' : '#A7F04A', k: k, hpMax: max, hpNow: max, hpPct: 100, hpColor: '#A7F04A', status: i ? tr.name + "'s critter 1 of " + tr.team.length : me.element.name + ' moves: ' + me.kit[3].name }; };
        v.duel = [side(me, 0, 'YOU'), side(foe0, 1, tr.name.toUpperCase())];
      }
      v.matchupNote = tr.name + ' has ' + tr.team.length + ' critters. Your party can switch in when one faints. Win reward: +' + tr.reward + ' essence.';
      v.rerollLabel = b && b.over ? 'Done' : 'Not now'; v.cannotReroll = false; v.rerollBg = 'rgba(14,26,56,0.78)'; v.rerollFg = '#FFFFFF';
      v.nextFoe = () => APP.close();
      const can = !beaten && !(b && !b.over);
      v.cannotFight = !can;
      v.fightLabel = beaten || won ? 'Trainer beaten' : (b && b.over ? 'Rematch ' + tr.name : 'Battle ' + tr.name);
      v.fightBg = can ? v.primaryBg : 'rgba(14,26,56,0.6)'; v.fightFg = can ? '#2A1B00' : '#9FB0D0'; v.fightShadow = can ? '0 4px 14px rgba(245,185,58,0.45)' : 'none';
      v.fight = () => {
        if (!can) return;
        const nb = this.newBattle(me, foe0, tr.reward);
        nb.trainer = { id: tr.id, name: tr.name, team: tr.team.slice(), idx: 0, stage: tr.stage, lv: tr.lv || 1, winLine: tr.winLine, leader: !!tr.leader };
        nb.s[1].label = tr.name + "'s " + foe0.name;
        nb.log = [{ text: tr.name + ' sent out ' + foe0.name + '!' }];
        nb.bench = this.benchFor(fe.seed, foe0);
        this.setState({ battle: nb, bmode: 'moves' });
      };
      if (b && b.trainer) v.roundLabel = v.roundLabel.replace(' · newest first', '') + ' · ' + tr.name + "'s critter " + (b.trainer.idx + 1) + ' of ' + b.trainer.team.length;
      if (b && b.trainer && v.duel[1]) v.duel[1].side = tr.name.toUpperCase();
      v.screenTitle = 'vs ' + tr.name;
      v.backLabel = 'Leave';
      if (tr.tower) {
        const party = this.towerParty(), alive = party.filter((x) => x.hp > 0);
        const lead = alive.find((x) => x.seed === st.fighter) || alive[0];
        const done = b && b.over;
        v.screenTitle = 'Tower · Floor ' + tr.floor;
        v.backLabel = done ? 'Leave' : 'Pause';
        v.matchupNote = this.towerTwist().name + ': ' + this.towerTwist().text + ' Floor ' + tr.floor + ' of ' + TOWER.floors + (tr.warden ? ' (Warden)' : '') + '. ' + tr.name + ' has ' + tr.team.length + ' critters. Your HP carries over between floors. ' + (tr.reward ? 'First clear: +' + tr.reward + ' essence.' : 'Essence only for floors above your best.');
        v.rerollLabel = done ? 'Continue' : 'Not now';
        const runT = this.towerState().run, can = !!lead && !b && !!runT && runT.floor === tr.floor;
        v.cannotFight = !can;
        v.fighters = alive.map((x) => { const k = this.make(x.seed, (st.caught.find((e) => e.seed === x.seed) || {}).stage || 1), on = lead && x.seed === lead.seed;
          return { name: k.name + ' ' + x.hp + '/' + x.max, pressed: on ? 'true' : 'false', bg: on ? v.primaryBg : 'rgba(255,255,255,0.12)', fg: on ? '#2A1B00' : '#FFFFFF', pick: () => { if (!b) this.setState({ fighter: x.seed }); } }; });
        v.fightLabel = done ? (b.win ? 'Floor cleared' : 'Run over') : (lead ? 'Battle floor ' + tr.floor : 'No critter can fight');
        v.fightBg = can ? v.primaryBg : 'rgba(14,26,56,0.6)'; v.fightFg = can ? '#2A1B00' : '#9FB0D0'; v.fightShadow = can ? '0 4px 14px rgba(245,185,58,0.45)' : 'none';
        if (lead && !b) {
          const le = st.caught.find((e) => e.seed === lead.seed), me2 = this.make(lead.seed, le.stage);
          const pct = Math.round(lead.hp / lead.max * 100);
          v.duel[0] = Object.assign({}, v.duel[0], { k: me2, hpMax: lead.max, hpNow: lead.hp, hpPct: pct, hpColor: pct > 50 ? '#A7F04A' : (pct > 20 ? '#FFD86B' : '#FF6B6B'), status: me2.element.name + ' moves: ' + me2.kit[3].name + ' · ' + (alive.length - 1) + ' on bench' });
        }
        v.fight = () => {
          if (!can) return;
          const le = st.caught.find((e) => e.seed === lead.seed), me2 = this.make(lead.seed, le.stage);
          const nb = this.newBattle(me2, foe0, tr.reward); nb.s[0].hp = lead.hp;
          nb.trainer = { id: tr.id, name: tr.name, team: tr.team.slice(), idx: 0, stage: tr.stage, lv: tr.lv || 1, winLine: tr.winLine, tower: true, floor: tr.floor, warden: tr.warden };
          nb.s[1].label = tr.name + "'s " + foe0.name;
          nb.log = [{ text: tr.name + ' sent out ' + foe0.name + '!' }];
          nb.bench = party.filter((x) => x.seed !== lead.seed).map((x) => { const e = st.caught.find((c) => c.seed === x.seed), sd = this.newBattle(this.make(x.seed, e.stage), foe0, 0).s[0]; sd.hp = x.hp; return sd; });
          this.setState({ battle: nb, bmode: 'moves' });
        };
      }
    }
    // ---- party + bag in battle ----
    if (!tr && this.state.tab === 'battle' && this.state.caught.length && !(b && !b.over)) {
      v.fight = () => {
        const e2 = this.energy(), st = this.state;
        if (e2.left === 0 || (st.battle && !st.battle.over)) return;
        const fe = st.caught.find((e) => e.seed === st.fighter) || st.caught[0];
        const me = this.make(fe.seed, fe.stage), foe = this.make(st.foeSeed, fe.stage, fe.lv || 1), bt = this.beats();
        let reward = 1; if (foe.rarity === 'Rare') reward += 1; if (foe.rarity === 'Mythic') reward += 2; if (bt[foe.element.name].indexOf(me.element.name) !== -1) reward += 1;
        const nb = this.newBattle(me, foe, reward); nb.bench = this.benchFor(fe.seed, foe);
        this.update({ battle: nb, bmode: 'moves', day: e2.today, used: e2.used + 1 });
      };
    }
    {
      const st = this.state, bag = Object.assign({}, BAG0, st.bag);
      const bm = st.bmode || 'moves', inB = !!(b && !b.over), bench = (b && b.bench) || [];
      const alive = bench.filter((s) => s.hp > 0).length, P = b && b.s[0];
      const glass = 'rgba(14,26,56,0.78)', off = 'rgba(14,26,56,0.6)';
      v.showMoves = inB && bm === 'moves'; v.showSwitchList = inB && bm === 'switch'; v.showBagList = inB && bm === 'bag';
      v.benchList = bench.map((s, j) => ({ name: s.k.name, sub: s.hp > 0 ? s.k.element.name + ' · HP ' + s.hp + '/' + s.max : 'Fainted', off: s.hp <= 0, bg: s.hp <= 0 ? off : glass, fg: s.hp <= 0 ? '#9FB0D0' : '#FFFFFF', use: () => this.battleAction({ switchTo: j }) }));
      v.noBench = bench.length === 0;
      v.switchLabel = bm === 'switch' ? 'Moves' : 'Switch (' + alive + ')';
      v.cannotSwitch = bm !== 'switch' && alive === 0;
      v.switchBg = v.cannotSwitch ? off : glass; v.switchFg = v.cannotSwitch ? '#9FB0D0' : '#FFFFFF';
      v.toggleSwitch = () => this.setState({ bmode: bm === 'switch' ? 'moves' : 'switch' });
      const pots = bag.potion + bag.super + bag.herb + bag.ward + bag.whet, full = P ? P.hp >= P.max : true;
      const IL = [['potion', 'Potion', 'Heals 40% HP'], ['super', 'Super Potion', 'Heals to full'], ['herb', 'Mossleaf Remedy', 'Heals 40% + cures status'], ['ward', 'Frost Ward', '65% less damage, next 5 hits'], ['whet', 'Whetstone', '+70% damage this battle']];
      v.itemList = IL.filter(([id]) => id === 'potion' || id === 'super' || bag[id] > 0).map(([id, name, sub]) => {
        const can = this.itemUsable(id, P), o = !bag[id] || !can;
        return { name: name + ' ×' + bag[id], sub: !bag[id] ? 'None left. Buy at Mira’s stall.' : (!can ? (id === 'ward' || id === 'whet' ? 'Already active' : (id === 'herb' ? 'Full HP, no status' : 'Already at full HP')) : sub + ' · uses your turn'), off: o, bg: o ? off : glass, fg: o ? '#9FB0D0' : '#FFFFFF', use: () => this.battleAction({ item: id }) };
      });
      v.bagLabel = bm === 'bag' ? 'Moves' : 'Bag (' + pots + ')';
      v.toggleBag = () => this.setState({ bmode: bm === 'bag' ? 'moves' : 'bag' });
      if (b && v.duel && v.duel[0] && bench.length) v.duel[0].status = v.duel[0].status + ' · ' + alive + ' on bench';
      if (!b && !tr && v.duel && v.duel[1] && st.caught.length) {
        const fe2 = st.caught.find((e) => e.seed === st.fighter) || st.caught[0];
        const foeK = this.make(st.foeSeed, fe2.stage, fe2.lv || 1), max = Math.round(foeK.stats[0].value * 1.5 + 60);
        v.duel[1] = Object.assign({}, v.duel[1], { k: foeK, hpMax: max, hpNow: max, hpPct: 100 });
      }
      if (!b && v.duel && v.duel[0] && !(tr && tr.tower)) {
        const lead = (st.caught.find((e) => e.seed === st.fighter) || st.caught[0] || {}).seed;
        const n = this.partySeeds().filter((s) => s !== lead).slice(0, 2).length;
        v.duel[0].status = v.duel[0].status + (n ? ' · ' + n + ' on bench' : ' · no bench yet');
      }
    }
    const seals = (this.state.npc && this.state.npc.seals) || [];
    const lvNow = this.levelInfo(this.state.xp || 0).level;
    v.seals = LEADERS.map((L) => {
      const got = seals.indexOf(L.id) !== -1, open = lvNow >= GATES[L.zone] || this.props.noGates;
      return { name: L.name, zone: ZONE_NAMES[L.zone], got: got, notGot: !got, color: got ? L.color : '#AEBBD6', ring: got ? '#F5C542' : '#8C9BBD', glow: got ? '0 0 12px rgba(245,197,66,0.7)' : 'none',
        status: got ? 'Seal earned' : (open ? 'Waiting in ' + mapName(npcHome(L.id) || L.zone) : 'Opens at level ' + GATES[L.zone]), aria: L.name + ', ' + (got ? 'seal earned' : 'seal not earned') };
    });
    v.sealCount = seals.length;
    {
      const st = this.state, have = st.titles || [];
      v.titleName = this.titleName();
      v.titleCount = have.length;
      v.titleList = TITLES.map((t) => { const got = have.indexOf(t.id) !== -1, on = got && st.title === t.id, n = Math.min(t.goal, t.of(st));
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

