// ---- Glue part 1: Base and Component (game logic ported from the original canvas) ----
// ---- Glue: game state, screens over the world, HUD ----
class Base {
  get props() { const s = (this.state && this.state.settings) || {}; return { accent: '#FFC94D', testMode: s.test !== false, noGates: s.test !== false || DEV.levels }; }
  setState(p) { this.state = Object.assign({}, this.state, p); APP.schedule(); }
}

class Component extends Base {
  constructor(props) {
    super(props);
    this.state = {
      seed: null, previewSeed: null, caught: [], tab: 'roll', selected: null, earned: [],
      seedInput: '', loadError: false, armed: false,
      essence: 0, wins: 0, day: '', used: 0,
      fighter: null, foeSeed: 1 + Math.floor(Math.random() * 999998), battle: null, reveal: 0, settings: { sound: true, vibrate: true, calm: false, test: false, daynight: true, track: true, weather: true, ambient: true, bigtext: false, contrast: false }
    };
  }

  componentDidMount() {
    let d = {};
    try {
      const raw = window.localStorage.getItem('critter-roll:v2');
      if (raw) d = JSON.parse(raw) || {};
      else {
        const old = window.localStorage.getItem('critter-roll:caught');
        const arr = old ? JSON.parse(old) : null;
        if (Array.isArray(arr)) d = { caught: arr.filter((n) => Number.isInteger(n)).map((n) => ({ seed: n, stage: 1 })) };
      }
    } catch (e) {}
    this.update({
      caught: Array.isArray(d.caught) ? d.caught.filter((e) => e && Number.isInteger(e.seed) && Number.isInteger(e.stage)) : [],
      essence: Number.isInteger(d.essence) ? d.essence : 0,
      wins: Number.isInteger(d.wins) ? d.wins : 0,
      day: typeof d.day === 'string' ? d.day : '',
      used: Number.isInteger(d.used) ? d.used : 0,
      earned: Array.isArray(d.earned) ? d.earned.filter((x) => typeof x === 'string') : [],
      seed: Number.isInteger(d.seed) ? d.seed : 1 + Math.floor(Math.random() * 999998),
      xp: Number.isInteger(d.xp) ? d.xp : 0,
      quests: d.quests && typeof d.quests.day === 'string' ? d.quests : null,
      sight: d.sight && typeof d.sight === 'object' && typeof d.sight.day === 'string' ? { day: d.sight.day, n: d.sight.n | 0 } : { day: '', n: 0 },
      dev: d.dev === true || !!(d.settings && d.settings.test === true),
      intro: d.intro === true || (Array.isArray(d.caught) && d.caught.length > 0),
      hints: Array.isArray(d.hints) ? d.hints.filter((x) => typeof x === 'string') : [],
      party: Array.isArray(d.party) ? d.party.filter((n) => Number.isInteger(n)).slice(0, 3) : [],
      bag: Object.keys(BAG0).reduce((o, k) => { o[k] = d.bag && typeof d.bag === 'object' ? d.bag[k] | 0 : 0; return o; }, {}),
      lure: d.lure | 0,
      cq: d.cq && typeof d.cq === 'object' && d.cq.p ? d.cq : null,
      charm: Number.isInteger(d.charm) ? d.charm : 0,
      tickets: d.tickets && typeof d.tickets === 'object' ? d.tickets : { day: '', count: 0 },
      npc: d.npc && typeof d.npc === 'object' ? { done: Array.isArray(d.npc.done) ? d.npc.done : [], beaten: d.npc.beaten && typeof d.npc.beaten === 'object' ? d.npc.beaten : {}, cleared: Array.isArray(d.npc.cleared) ? d.npc.cleared : [], seals: Array.isArray(d.npc.seals) ? d.npc.seals : [] } : { done: [], beaten: {}, cleared: [], seals: [] },
      stats: d.stats && typeof d.stats === 'object' && d.stats.days && typeof d.stats.days === 'object' ? d.stats : { v: 1, days: {} },
      visited: Array.isArray(d.visited) ? d.visited.filter((x) => typeof x === 'string') : [],
      adv: (() => { const a = d.adv && typeof d.adv === 'object' ? d.adv : {}; return { clues: Array.isArray(a.clues) ? a.clues.filter((x) => typeof x === 'string') : [], open: a.open && typeof a.open === 'object' ? a.open : {}, flags: a.flags && typeof a.flags === 'object' ? a.flags : {} }; })(), // adventure progress: clues found, opened doors, chests taken
      titles: Array.isArray(d.titles) ? d.titles.filter((x) => typeof x === 'string') : [],
      title: typeof d.title === 'string' ? d.title : '',
      shinies: Array.isArray(d.shinies) ? d.shinies.filter((n) => Number.isInteger(n)) : [],
      pouch: Array.isArray(d.pouch) ? d.pouch.filter((n) => Number.isInteger(n)).slice(0, 8) : [],
      act: { day: d.act && typeof d.act.day === 'string' ? d.act.day : '', n: d.act ? Math.max(0, d.act.n | 0) : 0, tx: d.act ? Math.max(0, d.act.tx | 0) : 0 },
      returned: Array.isArray(d.returned) ? d.returned.filter((n) => Number.isInteger(n)).slice(-40) : [],   // critters you let go: met again on their own shore (item 15); default empty
      lvGates: d.lvGates === true || (d.lvGates === undefined && Array.isArray(d.caught) && d.caught.length > 0),   // a save older than the gates-by-fires build keeps the trainer-level gates as an alternative
      tower: (() => {
        const t = d.tower && typeof d.tower === 'object' ? d.tower : {};
        const r = t.run && typeof t.run === 'object' && Array.isArray(t.run.party) ? { floor: Math.max(1, t.run.floor | 0), party: t.run.party.filter((n) => Number.isInteger(n)).slice(0, 3), hp: t.run.hp && typeof t.run.hp === 'object' ? t.run.hp : {} } : null;
        return { best: Math.max(0, t.best | 0), day: typeof t.day === 'string' ? t.day : '', runs: t.runs | 0, clears: t.clears | 0, run: r && r.party.length ? r : null };
      })(),
      settings: d.settings && typeof d.settings === 'object' ? { sound: d.settings.sound !== false, vibrate: d.settings.vibrate !== false, calm: d.settings.calm === true, test: d.settings.test === true, daynight: d.settings.daynight !== false, track: d.settings.track !== false, music: d.settings.music !== false, weather: d.settings.weather !== false, ambient: d.settings.ambient !== false, bigtext: d.settings.bigtext === true, contrast: d.settings.contrast === true } : { sound: true, vibrate: true, calm: false, test: false, daynight: true, track: true, music: true, weather: true, ambient: true, bigtext: false, contrast: false },
      seen: (() => {
        const seen = Array.isArray(d.seen) ? d.seen.filter((n) => Number.isInteger(n) && n >= 1 && n <= 48) : [];
        (Array.isArray(d.caught) ? d.caught : []).forEach((e) => { if (e && Number.isInteger(e.seed)) { const no = this.make(e.seed, 1).speciesNo; if (no <= 48 && seen.indexOf(no) === -1) seen.push(no); } });   // the secret critter (#49) is a bonus, never counted in the 48
        return seen;
      })()
    });
  }

  update(patch, events) {
    const s = Object.assign({}, this.state, patch);
    const extra = this.applyEvents(s, events || []);
    const seenAll = (s.seen || []).slice();
    (s.caught || []).forEach((e) => { const no = this.make(e.seed, 1).speciesNo; if (no <= 48 && seenAll.indexOf(no) === -1) seenAll.push(no); });
    if (seenAll.length !== (s.seen || []).length) extra.seen = seenAll;
    Object.assign(s, extra);
    const before = this.levelInfo(this.state.xp || 0).level, after = this.levelInfo(s.xp || 0).level;
    if (after > before && this.state.xp !== undefined) {
      s.essence = (s.essence || 0) + 2 * (after - before);
      extra.essence = s.essence;
      extra.levelUp = after;
      this.sfx('level', s.settings);
      this.buzz([40, 30, 80], s.settings);
    }
    const earned = (s.earned || []).slice();
    this.badgeChecks(s).forEach((b) => { if (b.met && earned.indexOf(b.id) === -1) earned.push(b.id); });
    this.setState(Object.assign({}, patch, extra, { earned: earned }));
    try {
      // keep fields this build does not know (written by a newer build or another device): merge them under our own fields instead of dropping them
      let keep = {}; try { const old = JSON.parse(window.localStorage.getItem('critter-roll:v2') || '{}'); if (old && typeof old === 'object') keep = old; } catch (e2) {}
      window.localStorage.setItem('critter-roll:v2', JSON.stringify(Object.assign({}, keep, { caught: s.caught, essence: s.essence, wins: s.wins, day: s.day, used: s.used, earned: earned, seed: s.seed, xp: s.xp, quests: s.quests, seen: s.seen, settings: s.settings, npc: s.npc, party: s.party, bag: s.bag, charm: s.charm, lure: s.lure, cq: s.cq, tickets: s.tickets, intro: s.intro, hints: s.hints, dev: s.dev, sight: s.sight, tower: s.tower, act: s.act, pouch: s.pouch, titles: s.titles, title: s.title, shinies: s.shinies, stats: s.stats, visited: s.visited, adv: s.adv, returned: s.returned, lvGates: s.lvGates })));
    } catch (e) {}
  }

  badgeChecks(s) {
    const caught = s.caught.map((e) => this.make(e.seed, e.stage));
    const types = {};
    caught.forEach((k) => { types[k.element.name] = true; });
    const has = (fn) => caught.some(fn);
    return [
      { id: 'first', name: 'First keep', desc: 'Keep your first critter.', met: caught.length >= 1 },
      { id: 'collector', name: 'Collector', desc: 'Have 10 critters kept at once.', met: caught.length >= 10 },
      { id: 'spectrum', name: 'Full spectrum', desc: 'Own all 8 types at once.', met: Object.keys(types).length === 8 },
      { id: 'rare', name: 'Rare find', desc: 'Own a Rare or Mythic critter.', met: has((k) => k.rarity === 'Rare' || k.rarity === 'Mythic') },
      { id: 'legend', name: 'Legend', desc: 'Own a Mythic critter.', met: has((k) => k.rarity === 'Mythic') },
      { id: 'growth', name: 'Growth spurt', desc: 'Evolve a critter to stage 2.', met: has((k) => k.stage >= 2) },
      { id: 'apex', name: 'Apex', desc: 'Evolve a critter to stage 3.', met: has((k) => k.stage === 3) },
      { id: 'win1', name: 'First win', desc: 'Win a battle.', met: s.wins >= 1 },
      { id: 'champion', name: 'Champion', desc: 'Win 25 battles.', met: s.wins >= 25 }
    ];
  }

  energy() {
    const today = new Date().toDateString();
    const used = this.state.day === today ? this.state.used : 0;
    return { today: today, used: used, left: (this.props.testMode ?? true) ? 99 : Math.max(0, 20 - used) };
  }

  rng(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  beats() {
    return {
      Ember: ['Moss', 'Frost'], Tide: ['Ember', 'Stone'], Moss: ['Tide', 'Stone'], Volt: ['Tide', 'Dusk'],
      Frost: ['Moss', 'Bloom'], Dusk: ['Bloom', 'Frost'], Stone: ['Volt', 'Ember'], Bloom: ['Volt', 'Dusk']
    };
  }

  make(seed, stage) {
    if (SECRETS[seed]) return this.secretCritter(seed);
    stage = stage || 1;
    const r = this.rng(seed);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const weighted = (pairs) => {
      const total = pairs.reduce((s, p) => s + p[1], 0);
      let x = r() * total;
      for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    };
    const INK = '#1E2340';

    const element = pick([
      { name: 'Ember', color: '#FF7A45', tint: '#FFE4D8', heads: ['horns', 'nubs', 'flame'], moves: ['Cinder Snap', 'Ash Puff', 'Kindle Rush', 'Hearth Slam'] },
      { name: 'Tide', color: '#3E8EF7', tint: '#DCEBFF', heads: ['fins', 'nubs', 'none'], moves: ['Puddle Jab', 'Undertow', 'Brine Spray', 'Ripple Hop'] },
      { name: 'Moss', color: '#4FB06D', tint: '#DDF3E3', heads: ['leaf', 'ears', 'nubs'], moves: ['Vine Tug', 'Spore Cloud', 'Root Bind', 'Bark Bump'] },
      { name: 'Volt', color: '#F5C518', tint: '#FFF4C7', heads: ['antenna', 'ears', 'horns'], moves: ['Static Nip', 'Arc Dash', 'Buzz Slap', 'Jolt Spin'] },
      { name: 'Frost', color: '#8FD8EA', tint: '#E2F6FA', heads: ['ears', 'horns', 'none'], moves: ['Rime Bite', 'Flurry', 'Chill Gust', 'Ice Skate'] },
      { name: 'Dusk', color: '#8B6CF0', tint: '#EAE3FF', heads: ['ears', 'horns', 'antenna'], moves: ['Shade Step', 'Hex Gaze', 'Night Nibble', 'Gloom Wave'] },
      { name: 'Stone', color: '#A79C90', tint: '#EEEAE5', heads: ['nubs', 'horns', 'none'], moves: ['Pebble Toss', 'Rock Roll', 'Grit Guard', 'Quake Stomp'] },
      { name: 'Bloom', color: '#F27BB5', tint: '#FDE3F0', heads: ['leaf', 'ears', 'antenna'], moves: ['Petal Flick', 'Pollen Puff', 'Thorn Prick', 'Bloom Burst'] }
    ]);
    r(); r(); // name slots: kept so every seed keeps its body, stats and moves
    const rarity = weighted([['Common', 55], ['Uncommon', 28], ['Rare', 13], ['Mythic', 4]]);
    const rarityStyle = {
      Common: { bg: 'rgba(255,255,255,0.14)', fg: '#E6ECF7' },
      Uncommon: { bg: 'rgba(143,227,162,0.2)', fg: '#A6F0B6' },
      Rare: { bg: 'rgba(141,187,255,0.22)', fg: '#BBD5FF' },
      Mythic: { bg: 'linear-gradient(180deg, #FFE69A, #F5B93A)', fg: '#2A1B00' }
    }[rarity];

    const boost = 1 + 0.2 * (stage - 1);
    const stats = ['HP', 'ATK', 'DEF', 'SPD'].map((label) => {
      let v = 20 + Math.floor(r() * 80);
      if (rarity === 'Mythic') v = Math.min(120, v + 15);
      v = Math.min(150, Math.round(v * boost));
      return { label: label, value: v, pct: Math.round((v / 150) * 100) };
    });
    const vr = this.rng(seed * 31 + 17);
    const vpick = (arr) => arr[Math.floor(vr() * arr.length)];
    const nature = vpick([
      ['Brave', 'ATK', 'DEF'], ['Bold', 'DEF', 'SPD'], ['Hasty', 'SPD', 'DEF'], ['Calm', 'DEF', 'ATK'], ['Jolly', 'SPD', 'ATK'],
      ['Sturdy', 'HP', 'SPD'], ['Fierce', 'ATK', 'HP'], ['Nimble', 'SPD', 'HP'], ['Hardy', null, null], ['Steady', null, null]
    ]);
    stats.forEach((q) => {
      if (q.label === nature[1]) q.value = Math.min(150, Math.round(q.value * 1.1));
      if (q.label === nature[2]) q.value = Math.max(10, Math.round(q.value * 0.9));
      q.pct = Math.round((q.value / 150) * 100);
    });
    const natureText = nature[1] ? nature[0] + ' nature: higher ' + nature[1] + ', lower ' + nature[2] : nature[0] + ' nature: balanced stats';
    const atk = stats[1].value;

    const sizeMult = [1, 1.12, 1.22][stage - 1];
    const w0 = Math.round(110 + r() * 60);
    const h0 = Math.round(100 + r() * 70);
    const w = stage === 1 ? w0 : Math.min(150, Math.round(w0 * sizeMult)); // evolved forms are a little slimmer than the widest blobs: limbs, wings and tail need room inside the 240 px sprite
    let h = stage === 1 ? h0 : Math.max(h0, Math.min(170, Math.round(h0 * sizeMult)));
    const SHAPES = this.shapes();
    const shapeIdx = Math.floor(r() * SHAPES.length);
    const shape = SHAPES[shapeIdx];
    const typeIdx = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'].indexOf(element.name);
    const speciesNo = typeIdx * 6 + shapeIdx + 1;
    const shiny = { Ember: '#FFD54A', Tide: '#5CE1C6', Moss: '#B7E36B', Volt: '#FF9BD2', Frost: '#C7B8FF', Dusk: '#4A5578', Stone: '#E7D3A8', Bloom: '#F4F7FB' };
    const hsl = this.toHsl(element.color);
    const dh = (vr() - 0.5) * 24, ds = (vr() - 0.5) * 16, dl = (vr() - 0.5) * 12;
    const c = this.separate(rarity === 'Mythic' ? shiny[element.name] : this.fromHsl(hsl[0] + dh, hsl[1] + ds, hsl[2] + dl), element.tint, 1.35);
    const ch = this.toHsl(c);
    const fill = 'radial-gradient(circle at 34% 26%, ' + this.fromHsl(ch[0], ch[1], Math.min(96, ch[2] + 22)) + ' 0%, ' + c + ' 52%, ' + this.fromHsl(ch[0], ch[1], Math.max(8, ch[2] - 14)) + ' 100%)';
    const outline = this.fromHsl(ch[0], Math.min(100, ch[1] + 10), Math.max(10, ch[2] - 38));
    const bellyBg = rarity === 'Rare' ? this.fromHsl(hsl[0] + 180, 70, 82) : (rarity === 'Mythic' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)');
    const tail = weighted([['none', 45], ['stub', 20], ['ball', 20], ['spike', 15]]);
    const head = r() < 0.7 ? pick(element.heads) : pick(['none', 'nubs', 'ears', 'horns', 'antenna', 'fins', 'flame', 'leaf']);
    const headroom = { none: 0, fins: 0, nubs: 12, horns: 20, flame: 38, leaf: 44, ears: 50, antenna: 52 }[head];
    const legH = stage === 1 ? 0 : (stage === 2 ? 12 : 16), crestRoom = stage === 1 ? 0 : (stage === 2 ? 42 : 54); // evolved forms stand on legs and carry a crest (it shares its spot with the head decoration, so the taller of the two sets the headroom)
    h = Math.min(h, 198 - legH - Math.max(headroom, crestRoom, stage === 3 ? 24 : 0) - 4);
    const bx = Math.round(120 - w / 2);
    const by = 198 - legH - h;

    const parts = [];
    if (stage === 3) parts.push({ x: Math.round(120 - (w + 44) / 2), y: by - 22, w: w + 44, h: h + 24, r: '50%', rot: 0, bg: 'rgba(255,216,77,0.45)', bw: 0, bc: INK });
    let evo = null;
    if (stage > 1) { evo = this.evoKit({ type: element.name, shapeIdx: shapeIdx, stage: stage, bx: bx, by: by, w: w, h: h, fill: fill, outline: outline, seed: seed }); evo.back.forEach((q) => parts.push(q)); }
    if (stage === 1 && tail === 'stub') parts.push({ x: bx + w - 22, y: by + h - 48, w: 44, h: 26, r: '50%', rot: -30, bg: fill, bw: 3, bc: outline });
    if (stage === 1 && tail === 'ball') parts.push({ x: bx + w - 16, y: by + h - 52, w: 34, h: 34, r: '50%', rot: 0, bg: fill, bw: 3, bc: outline });
    if (stage === 1 && tail === 'spike') parts.push({ x: bx + w - 14, y: by + h - 50, w: 30, h: 30, r: '4px', rot: 45, bg: fill, bw: 3, bc: outline });

    if (head === 'nubs') {
      parts.push({ x: Math.round(bx + w * 0.2 - 14), y: by - 10, w: 28, h: 28, r: '50%', rot: 0, bg: fill, bw: 3, bc: outline });
      parts.push({ x: Math.round(bx + w * 0.8 - 14), y: by - 10, w: 28, h: 28, r: '50%', rot: 0, bg: fill, bw: 3, bc: outline });
    } else if (head === 'ears') {
      parts.push({ x: Math.round(bx + w * 0.26 - 15), y: by - 44, w: 30, h: 64, r: '50%', rot: -16, bg: fill, bw: 3, bc: outline });
      parts.push({ x: Math.round(bx + w * 0.74 - 15), y: by - 44, w: 30, h: 64, r: '50%', rot: 16, bg: fill, bw: 3, bc: outline });
    } else if (head === 'horns') {
      parts.push({ x: Math.round(bx + w * 0.28 - 12), y: by - 12, w: 24, h: 24, r: '4px', rot: 45, bg: '#F6F1E7', bw: 3, bc: INK });
      parts.push({ x: Math.round(bx + w * 0.72 - 12), y: by - 12, w: 24, h: 24, r: '4px', rot: 45, bg: '#F6F1E7', bw: 3, bc: INK });
    } else if (head === 'antenna') {
      parts.push({ x: 118, y: by - 36, w: 4, h: 40, r: '2px', rot: 0, bg: INK, bw: 0, bc: INK });
      parts.push({ x: 110, y: by - 50, w: 20, h: 20, r: '50%', rot: 0, bg: fill, bw: 3, bc: outline });
    } else if (head === 'fins') {
      parts.push({ x: bx - 20, y: Math.round(by + h * 0.45), w: 40, h: 24, r: '50%', rot: -25, bg: fill, bw: 3, bc: outline });
      parts.push({ x: bx + w - 20, y: Math.round(by + h * 0.45), w: 40, h: 24, r: '50%', rot: 25, bg: fill, bw: 3, bc: outline });
    } else if (head === 'flame') {
      parts.push({ x: 79, y: by - 14, w: 22, h: 22, r: '50% 0 50% 50%', rot: -70, bg: fill, bw: 3, bc: outline });
      parts.push({ x: 139, y: by - 14, w: 22, h: 22, r: '50% 0 50% 50%', rot: -20, bg: fill, bw: 3, bc: outline });
      parts.push({ x: 106, y: by - 30, w: 28, h: 28, r: '50% 0 50% 50%', rot: -45, bg: '#FFC24D', bw: 3, bc: INK });
    } else if (head === 'leaf') {
      parts.push({ x: 119, y: by - 16, w: 3, h: 20, r: '2px', rot: 0, bg: INK, bw: 0, bc: INK });
      parts.push({ x: 121, y: by - 40, w: 24, h: 36, r: '0 100% 0 100%', rot: 20, bg: element.name === 'Moss' ? '#2E8B57' : '#4FB06D', bw: 3, bc: INK });
    }

    const eyeCount = weighted([[1, 20], [2, 65], [3, 15]]);
    const s = Math.min(20 + Math.floor(r() * 11), Math.floor((w - 10 - (eyeCount - 1) * 8) / eyeCount));
    const eyes = [];
    for (let i = 0; i < eyeCount; i++) eyes.push({ s: s, ps: Math.round(s * 0.42) });
    const eyeY = Math.round(by + h * 0.28);

    const over = [];
    let pattern = weighted([['none', 50], ['spots', 30], ['stripes', 20]]);
    if (stage > 1 && pattern === 'none') pattern = 'stripes';
    const shade = 'rgba(22,24,29,0.16)';
    if (pattern === 'spots') {
      over.push({ x: Math.round(bx + w * 0.16), y: Math.round(by + h * 0.56), w: 16, h: 16, r: '50%', rot: 0, bg: shade });
      over.push({ x: Math.round(bx + w * 0.72), y: Math.round(by + h * 0.5), w: 20, h: 20, r: '50%', rot: 0, bg: shade });
      over.push({ x: Math.round(bx + w * 0.64), y: Math.round(by + h * 0.74), w: 14, h: 14, r: '50%', rot: 0, bg: shade });
    } else if (pattern === 'stripes') {
      over.push({ x: 105, y: by + 8, w: 6, h: 14, r: '3px', rot: -12, bg: shade });
      over.push({ x: 117, y: by + 6, w: 6, h: 14, r: '3px', rot: 0, bg: shade });
      over.push({ x: 129, y: by + 8, w: 6, h: 14, r: '3px', rot: 12, bg: shade });
    }
    if (evo) evo.over.forEach((q) => over.push(q));
    if (r() < 0.5) {
      over.push({ x: Math.round(bx + w * 0.18), y: eyeY + s + 2, w: 16, h: 9, r: '50%', rot: 0, bg: 'rgba(255,110,110,0.45)' });
      over.push({ x: Math.round(bx + w * 0.82 - 16), y: eyeY + s + 2, w: 16, h: 9, r: '50%', rot: 0, bg: 'rgba(255,110,110,0.45)' });
    }

    const mouthType = pick(['smile', 'open', 'flat', 'grin']);
    const mouth = {
      smile: { w: 28, h: 12, r: '0 0 50% 50%', bg: 'transparent', bw: '0 0 3px 0' },
      open: { w: 18, h: 16, r: '50%', bg: INK, bw: '0' },
      flat: { w: 20, h: 3, r: '2px', bg: INK, bw: '0' },
      grin: { w: 30, h: 15, r: '0 0 16px 16px', bg: '#FFFFFF', bw: '3px' }
    }[mouthType];
    mouth.x = Math.round(120 - mouth.w / 2);
    mouth.y = eyeY + s + 10;

    const pool = element.moves.slice();
    const m1 = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const m2 = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const moves = [
      { name: m1, power: Math.round(20 + atk * 0.5 + r() * 20) },
      { name: m2, power: Math.round((20 + atk * 0.5 + r() * 20) * 1.35) }
    ];

    const bellyW = Math.round(w * 0.56);
    const bellyH = Math.round(h * 0.34);
    r(); r(); // old flavor slots: kept for seed stability
    const height = (0.2 + r() * 2.2) * sizeMult;
    const weight = (0.5 + r() * 120) * sizeMult * sizeMult;

    const pre = vpick(['Fen', 'Mor', 'Quil', 'Zib', 'Tor', 'Lum', 'Bram', 'Kip', 'Vex', 'Oro', 'Pim', 'Grub', 'Sol', 'Nib', 'Wisp', 'Cad', 'Ash', 'Bix', 'Cor', 'Dax', 'Elm', 'Fizz', 'Gor', 'Hap', 'Isk', 'Jub', 'Kel', 'Lox', 'Mim', 'Nox', 'Pip', 'Quo', 'Rux', 'Saff', 'Tib', 'Umb', 'Vel', 'Wob', 'Yar', 'Zuk']);
    const suf = vpick(['lit', 'wick', 'doo', 'mire', 'ix', 'ble', 'pod', 'squall', 'nook', 'ling', 'bo', 'zor', 'ette', 'grim', 'fluff', 'tusk', 'bun', 'dle', 'kin', 'mop', 'paw', 'quill', 'rift', 'shard', 'snout', 'sprout', 'tuft', 'wump', 'zap', 'glim', 'bris', 'let', 'loo', 'mew', 'nub', 'ral', 'sly', 'tock', 'vy', 'wix']);
    const habitat = vpick(['in abandoned mailboxes', 'under mossy bridges', 'inside thunderclouds', 'at the bottom of tide pools', 'between old library shelves', 'on frozen rooftops', 'in hollow streetlamps', 'under porch steps', 'in the gaps of old stone walls', 'under warm laundromat vents', 'on the roofs of moving trains', 'inside forgotten teapots', 'along foggy riverbanks', 'in abandoned greenhouses', 'between subway rails', 'at the edge of frozen lakes', 'inside hollow logs', 'under lighthouse stairs', 'on windy hilltops', 'in overgrown playgrounds']);
    const habit = vpick(['Hums when it is happy.', 'Hoards shiny bottle caps.', 'Sneezes sparks when startled.', 'Follows travellers for days, then forgets why.', 'Naps curled in perfect circles.', 'Turns a shade darker when it fibs.', 'Mimics doorbells to get attention.', 'Leaves tiny footprints that glow until dawn.', 'Collects lost buttons and refuses to share.', 'Glows faintly when someone nearby is sad.', 'Hiccups tiny bubbles after eating.', 'Can copy any whistle after hearing it once.', 'Stores snacks in its cheeks for winter.', 'Rolls into a ball when it hears thunder.', 'Keeps a single pebble as a lucky charm.', 'Hums lullabies that put birds to sleep.', 'Chases its own shadow at noon.', 'Leaves neat little piles of leaves behind.', 'Gets grumpy if it misses a nap.', 'Trades shiny things for snacks.', 'Follows the smell of fresh bread for miles.', 'Draws squiggles in the dirt that look almost like words.', 'Only drinks from puddles that reflect the moon.', 'Sneaks into backpacks to go on trips.']);
    const fx = rarity !== 'Mythic' ? [] : [
      { x: bx - 14, y: by + 12, s: 12 }, { x: bx + w + 2, y: by + 26, s: 10 },
      { x: bx + w - 10, y: by - 12, s: 12 }, { x: bx + 4, y: by + h - 34, s: 9 }
    ];
    let name = pre + suf;
    if (stage > 1) {
      const er = this.rng(seed * 7 + stage);
      const list = stage === 2 ? ['mane', 'fang', 'horn', 'crest', 'claw', 'wing', 'scale', 'thorn'] : ['lord', 'titan', 'rex', 'monarch', 'sage', 'colossus', 'warden', 'regent'];
      name = pre + list[Math.floor(er() * list.length)];
    }

    return {
      seed: seed,
      stage: stage,
      no: String(speciesNo).padStart(3, '0'),
      speciesNo: speciesNo,
      speciesName: this.speciesName(typeIdx, shapeIdx),
      name: name,
      alt: name + ', a ' + rarity.toLowerCase() + ' ' + element.name + '-type critter, stage ' + stage,
      element: { name: element.name, color: element.color, tint: element.tint },
      strongVs: this.beats()[element.name].join(' + ').toUpperCase(), ability: ABILITIES[element.name],
      rarity: rarity,
      rarityBg: rarityStyle.bg,
      rarityFg: rarityStyle.fg,
      stats: stats,
      moves: moves,
      kit: this.kit(element.name, moves),
      height: height.toFixed(1) + ' m',
      weight: (weight >= 100 ? Math.round(weight) : weight.toFixed(1)) + ' kg',
      flavor: 'Lives ' + habitat + '. ' + habit,
      natureText: natureText,
      bodyColor: c,
      bellyBg: bellyBg,
      fx: fx,
      stageRing: rarity === 'Mythic' ? '#FFD86B' : 'rgba(255,255,255,0.35)',
      stageShadow: rarity === 'Mythic' ? '0 0 16px rgba(255,216,107,0.75)' : 'none',
      bodyFill: fill,
      outline: outline,
      glow: { Common: 'rgba(255,255,255,0.95)', Uncommon: '#7BD88F', Rare: '#6FA8FF', Mythic: '#FFD84D' }[rarity],
      parts: parts,
      over: over,
      body: { x: bx, y: by, w: w, h: h, r: shape },
      belly: { x: Math.round(120 - bellyW / 2), y: by + h - bellyH - 12, w: bellyW, h: bellyH },
      eyeRow: { x: bx, y: eyeY, w: w },
      eyes: eyes,
      look: pick(['flex-start', 'center', 'flex-end']),
      mouth: mouth
    };
  }

  sfx(kind, settings) {
    const cfg = settings || this.state.settings || {};
    if (!cfg.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = this.ac || new AC();
      const ac = this.ac;
      if (ac.state === 'suspended') ac.resume();
      const seq = {
        tap: [[880, 0.04]], roll: [[523, 0.08], [659, 0.1]], rare: [[659, 0.1], [784, 0.1], [988, 0.16]],
        mythic: [[784, 0.1], [988, 0.1], [1175, 0.1], [1568, 0.3]], hit: [[160, 0.07]],
        win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.28]], lose: [[392, 0.16], [311, 0.24]],
        slash: [[620, 0.03], [420, 0.05]], level: [[523, 0.08], [784, 0.08], [1047, 0.22]], claim: [[784, 0.07], [1047, 0.14]]
      }[kind];
      if (!seq) return;
      let t = ac.currentTime + 0.01;
      seq.forEach(([f, d]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = kind === 'hit' ? 'square' : 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(kind === 'hit' ? 0.06 : 0.1, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + d + 0.03);
        t += d * 0.9;
      });
    } catch (e) {}
  }

  buzz(pattern, settings) {
    const cfg = settings || this.state.settings || {};
    if (!cfg.vibrate) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  // The secret critters (Veilcrown, Wickling): every field a normal critter has, with hand-placed geometry instead of seeded parts. Always their one form (stage 3).
  secretCritter(seed) {
    const S = SECRETS[seed], ELEM = { Dusk: { name: 'Dusk', color: '#8B6CF0', tint: '#EAE3FF' }, Volt: { name: 'Volt', color: '#F5C518', tint: '#FFF4C7' }, Ember: { name: 'Ember', color: '#FF7A45', tint: '#FFE4D8' } }[S.type];
    const stats = S.stats.map(([label, v]) => ({ label: label, value: v, pct: Math.round(v / 150 * 100) }));
    const kit = this.kit(S.type, S.moves); kit[3].name = S.kit3;
    return Object.assign({
      seed: seed, stage: 3, no: String(S.speciesNo).padStart(3, '0'), speciesNo: S.speciesNo, speciesName: S.name, name: S.name,
      alt: S.name + ', a secret mythic ' + S.type + '-type critter',
      element: ELEM, strongVs: this.beats()[S.type].join(' + ').toUpperCase(), ability: S.ability,
      rarity: 'Mythic', rarityBg: 'linear-gradient(180deg, #FFE69A, #F5B93A)', rarityFg: '#2A1B00',
      stats: stats, moves: S.moves.map((m) => ({ name: m.name, power: m.power })), kit: kit, height: S.height, weight: S.weight, flavor: S.flavor, natureText: S.nature,
      stageRing: '#FFD86B', stageShadow: '0 0 16px rgba(255,216,107,0.75)', glow: '#FFD84D', look: 'center'
    }, this.secretGeometry(S.key));
  }
  secretGeometry(key) {
    const INK = '#1E2340';
    if (key === 'slagback') {   // a low basalt body with glowing cracks, a glowing belly, orange horns, back crusts, four stubby feet and a flame-tipped tail
      const body = '#4A3836', outline = '#1A1010', crust = '#6A4A42', hot = '#FF7A30';
      return {
        bodyColor: body, bellyBg: 'rgba(255,150,70,0.75)', outline: outline, bodyFill: 'radial-gradient(circle at 34% 26%, #7A5A50 0%, ' + body + ' 52%, #2A1A1A 100%)',
        fx: [{ x: 52, y: 90, s: 11 }, { x: 188, y: 100, s: 10 }, { x: 140, y: 52, s: 12 }, { x: 70, y: 160, s: 9 }],
        parts: [
          { x: 40, y: 80, w: 160, h: 118, r: '50%', rot: 0, bg: 'rgba(255,122,48,0.30)', bw: 0, bc: INK },
          { x: 74, y: 92, w: 34, h: 28, r: '40% 40% 20% 20%', rot: -8, bg: crust, bw: 3, bc: outline }, { x: 103, y: 84, w: 36, h: 30, r: '40% 40% 20% 20%', rot: 0, bg: crust, bw: 3, bc: outline }, { x: 134, y: 92, w: 34, h: 28, r: '40% 40% 20% 20%', rot: 8, bg: crust, bw: 3, bc: outline },
          { x: 82, y: 96, w: 14, h: 24, r: '50% 50% 0 0', rot: -20, bg: '#FF9A3A', bw: 3, bc: '#8A3A10' }, { x: 144, y: 96, w: 14, h: 24, r: '50% 50% 0 0', rot: 20, bg: '#FF9A3A', bw: 3, bc: '#8A3A10' },
          { x: 172, y: 146, w: 40, h: 20, r: '50%', rot: -20, bg: body, bw: 3, bc: outline }, { x: 200, y: 122, w: 22, h: 32, r: '50% 0 50% 50%', rot: -30, bg: '#FFA03A', bw: 3, bc: '#8A3A10' }, { x: 207, y: 133, w: 10, h: 14, r: '50% 0 50% 50%', rot: -30, bg: '#FFE08A', bw: 0, bc: INK },
          { x: 62, y: 178, w: 32, h: 22, r: '40%', rot: 0, bg: '#3A2A2A', bw: 3, bc: outline }, { x: 100, y: 184, w: 30, h: 18, r: '40%', rot: 0, bg: '#3A2A2A', bw: 3, bc: outline }, { x: 126, y: 184, w: 30, h: 18, r: '40%', rot: 0, bg: '#3A2A2A', bw: 3, bc: outline }, { x: 158, y: 178, w: 32, h: 22, r: '40%', rot: 0, bg: '#3A2A2A', bw: 3, bc: outline }
        ],
        over: [
          { x: 82, y: 140, w: 30, h: 4, r: '2px', rot: -25, bg: hot }, { x: 124, y: 134, w: 26, h: 4, r: '2px', rot: 20, bg: hot }, { x: 100, y: 156, w: 22, h: 4, r: '2px', rot: -10, bg: hot }, { x: 140, y: 152, w: 24, h: 4, r: '2px', rot: 30, bg: hot },
          { x: 86, y: 102, w: 18, h: 4, r: '2px', rot: -10, bg: hot }, { x: 138, y: 100, w: 18, h: 4, r: '2px', rot: 10, bg: hot }
        ],
        body: { x: 55, y: 106, w: 134, h: 86, r: '50% 50% 46% 46% / 60% 60% 40% 40%' }, belly: { x: 88, y: 142, w: 68, h: 38 },
        eyeRow: { x: 55, y: 124, w: 134 }, eyes: [{ s: 22, ps: 10 }, { s: 22, ps: 10 }],
        mouth: { w: 26, h: 10, r: '0 0 50% 50%', bg: 'transparent', bw: '0 0 3px 0', x: 109, y: 154 }
      };
    }
    if (key === 'kindlemane') {   // a tawny cat with a mane of flame, ember-tipped ears, a flame at the end of its tail, four heavy paws; it sits square, facing you
      const body = '#D99A5A', outline = '#5A2A10', mane = '#FF8A3A', mane2 = '#E0522A', petals = [];
      for (let i = 0; i < 10; i++) { const a = -90 + i * 36, rad = a * Math.PI / 180; petals.push({ x: Math.round(120 + Math.cos(rad) * 54) - 16, y: Math.round(104 + Math.sin(rad) * 50) - 30, w: 32, h: 60, r: '50% 50% 50% 50% / 62% 62% 38% 38%', rot: a + 90, bg: i % 2 ? mane : mane2, bw: 3, bc: '#8A3A10' }); }
      return {
        bodyColor: body, bellyBg: 'rgba(255,230,180,0.8)', outline: outline, bodyFill: 'radial-gradient(circle at 34% 26%, #F2C27A 0%, ' + body + ' 52%, #A86A30 100%)',
        fx: [{ x: 50, y: 60, s: 11 }, { x: 190, y: 70, s: 10 }, { x: 120, y: 24, s: 12 }, { x: 64, y: 168, s: 9 }],
        parts: [{ x: 36, y: 20, w: 168, h: 170, r: '50%', rot: 0, bg: 'rgba(255,138,58,0.22)', bw: 0, bc: INK }].concat(petals).concat([
          { x: 176, y: 150, w: 44, h: 18, r: '50%', rot: -28, bg: body, bw: 3, bc: outline }, { x: 204, y: 122, w: 22, h: 34, r: '50% 0 50% 50%', rot: -30, bg: mane, bw: 3, bc: '#8A3A10' }, { x: 211, y: 133, w: 10, h: 14, r: '50% 0 50% 50%', rot: -30, bg: '#FFE08A', bw: 0, bc: INK },   // the tail and its flame
          { x: 60, y: 184, w: 34, h: 18, r: '45%', rot: 0, bg: '#C98A4A', bw: 3, bc: outline }, { x: 96, y: 188, w: 30, h: 16, r: '45%', rot: 0, bg: '#C98A4A', bw: 3, bc: outline }, { x: 128, y: 188, w: 30, h: 16, r: '45%', rot: 0, bg: '#C98A4A', bw: 3, bc: outline }, { x: 160, y: 184, w: 34, h: 18, r: '45%', rot: 0, bg: '#C98A4A', bw: 3, bc: outline }   // four paws
        ]),
        over: [
          { x: 70, y: 66, w: 22, h: 30, r: '50% 50% 0 0', rot: -22, bg: body, bw: 3, bc: outline }, { x: 148, y: 66, w: 22, h: 30, r: '50% 50% 0 0', rot: 22, bg: body, bw: 3, bc: outline },   // the ears
          { x: 76, y: 60, w: 8, h: 12, r: '50% 50% 0 0', rot: -22, bg: mane, bw: 0, bc: INK }, { x: 156, y: 60, w: 8, h: 12, r: '50% 50% 0 0', rot: 22, bg: mane, bw: 0, bc: INK },   // ember tips
          { x: 104, y: 92, w: 32, h: 5, r: '3px', rot: 0, bg: '#A86A30' }   // the brow
        ],
        body: { x: 56, y: 90, w: 128, h: 102, r: '50% 50% 46% 46% / 56% 56% 44% 44%' }, belly: { x: 90, y: 142, w: 60, h: 40 },
        eyeRow: { x: 56, y: 116, w: 128 }, eyes: [{ s: 22, ps: 10 }, { s: 22, ps: 10 }],
        mouth: { w: 24, h: 10, r: '0 0 50% 50%', bg: 'transparent', bw: '0 0 3px 0', x: 108, y: 150 }
      };
    }
    if (key === 'wickling') {   // a round gold spark with a lantern on its antenna, small pale-blue wings, ice crystals on its back and a wick tail
      const body = '#FFE08A', outline = '#8A6510', wing = '#CFE6FF', wing2 = '#E8F4FF', wo = '#5A8AB8', gold = '#E8B84A';
      return {
        bodyColor: body, bellyBg: 'rgba(255,255,255,0.75)', outline: outline, bodyFill: 'radial-gradient(circle at 34% 26%, #FFFFFF 0%, ' + body + ' 52%, ' + gold + ' 100%)',
        fx: [{ x: 56, y: 70, s: 12 }, { x: 178, y: 78, s: 10 }, { x: 150, y: 20, s: 12 }, { x: 62, y: 150, s: 9 }],
        parts: [
          { x: 50, y: 14, w: 140, h: 182, r: '50%', rot: 0, bg: 'rgba(255,230,140,0.35)', bw: 0, bc: INK },                                            // glow (CSS only)
          { x: 20, y: 98, w: 66, h: 34, r: '0 100% 0 100%', rot: -30, bg: wing, bw: 3, bc: wo }, { x: 26, y: 122, w: 54, h: 26, r: '0 100% 0 100%', rot: -8, bg: wing2, bw: 3, bc: wo },
          { x: 154, y: 98, w: 66, h: 34, r: '100% 0 100% 0', rot: 30, bg: wing, bw: 3, bc: wo }, { x: 160, y: 122, w: 54, h: 26, r: '100% 0 100% 0', rot: 8, bg: wing2, bw: 3, bc: wo },
          { x: 86, y: 80, w: 12, h: 12, r: '2px', rot: 45, bg: '#BFE3F5', bw: 2, bc: wo }, { x: 142, y: 80, w: 12, h: 12, r: '2px', rot: 45, bg: '#BFE3F5', bw: 2, bc: wo }, { x: 114, y: 76, w: 12, h: 12, r: '2px', rot: 45, bg: '#E0F4FF', bw: 2, bc: wo },
          { x: 116, y: 50, w: 8, h: 54, r: '4px', rot: 0, bg: '#B8862A', bw: 3, bc: '#6A4A10' },                                                       // antenna stalk
          { x: 98, y: 16, w: 44, h: 44, r: '50%', rot: 0, bg: '#FFD86B', bw: 3, bc: outline }, { x: 106, y: 24, w: 28, h: 28, r: '50%', rot: 0, bg: '#FFF8D0', bw: 0, bc: INK },   // the lantern
          { x: 166, y: 152, w: 28, h: 14, r: '50%', rot: -30, bg: gold, bw: 3, bc: outline }, { x: 184, y: 126, w: 22, h: 30, r: '50% 0 50% 50%', rot: -30, bg: '#FFA03A', bw: 3, bc: '#8A4A10' }, { x: 190, y: 136, w: 10, h: 14, r: '50% 0 50% 50%', rot: -30, bg: '#FFE08A', bw: 0, bc: INK },   // wick tail and flame
          { x: 84, y: 184, w: 30, h: 16, r: '50%', rot: 0, bg: gold, bw: 3, bc: outline }, { x: 126, y: 184, w: 30, h: 16, r: '50%', rot: 0, bg: gold, bw: 3, bc: outline }
        ],
        over: [
          { x: 82, y: 142, w: 18, h: 10, r: '50%', rot: 0, bg: 'rgba(120,180,255,0.55)' }, { x: 140, y: 142, w: 18, h: 10, r: '50%', rot: 0, bg: 'rgba(120,180,255,0.55)' },
          { x: 100, y: 100, w: 7, h: 7, r: '2px', rot: 45, bg: '#FFFFFF' }, { x: 138, y: 104, w: 6, h: 6, r: '2px', rot: 45, bg: '#FFFFFF' }, { x: 120, y: 168, w: 6, h: 6, r: '2px', rot: 45, bg: '#FFFFFF' }
        ],
        body: { x: 70, y: 92, w: 100, h: 100, r: '50%' }, belly: { x: 92, y: 142, w: 56, h: 40 },
        eyeRow: { x: 70, y: 112, w: 100 }, eyes: [{ s: 26, ps: 12 }, { s: 26, ps: 12 }],
        mouth: { w: 24, h: 10, r: '0 0 50% 50%', bg: 'transparent', bw: '0 0 3px 0', x: 108, y: 148 }
      };
    }
    // Veilcrown: a violet body with a gold crown and gem, crescent horns, cloak-like wings dotted with stars and a wisp tail
    const body = '#5B45B8', outline = '#241A5A', dark = '#33257A', darker = '#2A1E66', gold = '#FFD86B', pale = '#F2E6B8';
    return {
      bodyColor: body, bellyBg: '#C9B8FF', outline: outline, bodyFill: 'radial-gradient(circle at 34% 26%, #8E78E8 0%, ' + body + ' 52%, #3A2A82 100%)',
      fx: [{ x: 46, y: 70, s: 12 }, { x: 186, y: 88, s: 10 }, { x: 150, y: 28, s: 12 }, { x: 60, y: 150, s: 9 }],
      parts: [
        { x: 34, y: 42, w: 172, h: 158, r: '50%', rot: 0, bg: 'rgba(255,216,77,0.35)', bw: 0, bc: INK },
        { x: 14, y: 72, w: 84, h: 58, r: '0 100% 0 100%', rot: -26, bg: dark, bw: 3, bc: '#1B1240' }, { x: 8, y: 112, w: 76, h: 44, r: '0 100% 0 100%', rot: -8, bg: darker, bw: 3, bc: '#1B1240' },
        { x: 142, y: 72, w: 84, h: 58, r: '100% 0 100% 0', rot: 26, bg: dark, bw: 3, bc: '#1B1240' }, { x: 156, y: 112, w: 76, h: 44, r: '100% 0 100% 0', rot: 8, bg: darker, bw: 3, bc: '#1B1240' },
        { x: 176, y: 152, w: 30, h: 26, r: '50%', rot: 0, bg: '#6B55C8', bw: 3, bc: outline }, { x: 196, y: 134, w: 20, h: 18, r: '50%', rot: 0, bg: '#7C66D8', bw: 3, bc: outline }, { x: 208, y: 120, w: 12, h: 12, r: '50%', rot: 0, bg: '#9A86EA', bw: 3, bc: outline },
        { x: 76, y: 40, w: 20, h: 46, r: '60% 0 40% 0', rot: -20, bg: pale, bw: 3, bc: '#8A6A2A' }, { x: 144, y: 40, w: 20, h: 46, r: '0 60% 0 40%', rot: 20, bg: pale, bw: 3, bc: '#8A6A2A' }
      ],
      over: [
        { x: 92, y: 62, w: 56, h: 12, r: '3px', rot: 0, bg: gold },
        { x: 90, y: 48, w: 14, h: 14, r: '3px', rot: 45, bg: gold }, { x: 113, y: 40, w: 14, h: 14, r: '3px', rot: 45, bg: gold }, { x: 136, y: 48, w: 14, h: 14, r: '3px', rot: 45, bg: gold },
        { x: 116, y: 64, w: 8, h: 8, r: '2px', rot: 45, bg: '#FF6AA8' },
        { x: 76, y: 104, w: 8, h: 8, r: '2px', rot: 45, bg: '#FFE9A0' }, { x: 158, y: 98, w: 8, h: 8, r: '2px', rot: 45, bg: '#FFE9A0' }, { x: 150, y: 152, w: 8, h: 8, r: '2px', rot: 45, bg: '#FFE9A0' }, { x: 82, y: 156, w: 8, h: 8, r: '2px', rot: 45, bg: '#FFE9A0' }
      ],
      body: { x: 60, y: 66, w: 120, h: 126, r: '50% 50% 46% 46% / 62% 62% 38% 38%' }, belly: { x: 84, y: 130, w: 72, h: 46 },
      eyeRow: { x: 60, y: 92, w: 120 }, eyes: [{ s: 30, ps: 13 }, { s: 30, ps: 13 }],
      mouth: { w: 28, h: 12, r: '0 0 50% 50%', bg: 'transparent', bw: '0 0 3px 0', x: 106, y: 132 }
    };
  }

  // Parts for an evolved form (stage 2, 3). Pure geometry from the seed's stage-specific stream, so the base form, stats and names never change.
  evoKit(o) {
    const E = EVO_COL[o.type], F = EVO_FEAT[o.type], plan = EVO_PLAN[o.shapeIdx], st = o.stage, bx = o.bx, by = o.by, w = o.w, h = o.h, mid = bx + w / 2, bot = by + h, INK = '#1E2340';
    const R = this.rng(o.seed * 53 + st * 7 + 3), back = [], over = [];
    const col = (k) => (k === 'f' ? o.fill : (E[k] || E.a));
    const mirrorR = (r) => String(r).split(' / ').map((s) => { const t = s.trim().split(/\s+/); if (t.length === 1) return t[0]; if (t.length === 2) return t[1] + ' ' + t[0]; if (t.length === 3) return t[1] + ' ' + t[0] + ' ' + t[1]; return t[1] + ' ' + t[0] + ' ' + t[3] + ' ' + t[2]; }).join(' / ');
    // a primitive list around an anchor, scaled, optionally mirrored about the body centre
    const place = (list, ax, ay, sc, mirror) => list.forEach(([x, y, pw, ph, r, rot, c]) => {
      const X = ax + x * sc, Y = ay + y * sc, Pw = pw * sc, Ph = ph * sc;
      back.push({ x: Math.round(mirror ? 2 * mid - X - Pw : X), y: Math.round(Y), w: Math.round(Pw), h: Math.round(Ph), r: mirror ? mirrorR(r) : r, rot: mirror ? -rot : rot, bg: col(c), bw: 3, bc: c === 'f' ? o.outline : INK });
    });
    if (st === 3) { const wing = EVO_WING[F.wing]; place(wing, bx + w - 20, by + h * 0.2, 0.95, false); place(wing, bx + w - 20, by + h * 0.2, 0.95, true); }
    const ts = st === 3 ? 1.0 : 0.85;
    place(F.tail, bx + w - 4, bot - 40, ts, false);
    place(F.crest, mid, by + 2, st === 3 ? 1.1 : 0.75, false);
    // arms (behind the body, hanging outward) with a hand; Boxy bodies get shoulder plates instead
    if (plan.arm) {
      const ay = by + h * plan.at, len = Math.round(plan.arm * (st === 3 ? 1.15 : 1)), aw = plan.aw;
      [1, -1].forEach((sd) => {
        const ax = sd === 1 ? bx + w - 10 : bx - aw + 10, th = (sd === 1 ? -plan.tilt : plan.tilt) * Math.PI / 180, cx = ax + aw / 2, cy = ay + len / 2;
        back.push({ x: Math.round(ax), y: Math.round(ay), w: aw, h: len, r: '50%', rot: sd === 1 ? -plan.tilt : plan.tilt, bg: o.fill, bw: 3, bc: o.outline });
        const hx = cx - Math.sin(th) * len / 2, hy = cy + Math.cos(th) * len / 2, hd = aw + 8;
        back.push({ x: Math.round(hx - hd / 2), y: Math.round(hy - hd / 2), w: hd, h: hd, r: '50%', rot: 0, bg: o.fill, bw: 3, bc: o.outline });
      });
    } else {
      [[bx - 8, 1], [bx + w - 26, -1]].forEach(([px]) => over.push({ x: Math.round(px), y: Math.round(by + h * 0.14), w: 34, h: 26, r: '8px', rot: 0, bg: E.d }));
    }
    // legs: two feet under the body (the body is lifted by legH), wider for squat bodies
    const lw = plan.leg;
    [bx + w * 0.26, bx + w * 0.74].forEach((cx2) => back.push({ x: Math.round(cx2 - lw / 2), y: Math.round(bot - 8), w: lw, h: 198 - Math.round(bot - 8), r: '40% 40% 50% 50%', rot: 0, bg: o.fill, bw: 3, bc: o.outline }));
    if (st === 3) over.push({ x: Math.round(mid - 7), y: Math.round(by + h * 0.5), w: 14, h: 14, r: '3px', rot: 45, bg: E.a });
    return { back: back, over: over };
  }

  shapes() {
    return ['52% 48% 46% 54% / 60% 58% 42% 40%', '50%', '48% 48% 40% 40% / 44% 44% 36% 36%', '50% 50% 46% 46% / 64% 64% 36% 36%', '50% 50% 50% 50% / 38% 38% 62% 62%', '34px 34px 26px 26px'];
  }

  speciesName(typeIdx, shapeIdx) {
    return ['Cinder', 'Ripple', 'Fern', 'Spark', 'Rime', 'Gloam', 'Pebble', 'Petal'][typeIdx] + ['puff', 'bun', 'kin', 'lump', 'drop', 'box'][shapeIdx];
  }

  levelInfo(xp) {
    let level = 1, left = xp, need = 80;
    while (left >= need) { left -= need; level += 1; need = 80 + 40 * (level - 1); }
    return { level: level, into: left, need: need };
  }

  hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h;
  }

  questDefs() {
    return {
      roll: { text: 'Find 5 critters', target: 5, ess: 2, icon: 'M4 4h16v16H4zM9 9h.01M15 15h.01M12 12h.01' },
      keep: { text: 'Keep 2 critters', target: 2, ess: 2, icon: 'M12 5v14M5 12h14' },
      win: { text: 'Win 2 battles', target: 2, ess: 3, icon: 'M5 21V4M5 4h11l-2 4 2 4H5' },
      adv: { text: 'Win a battle with a type advantage', target: 1, ess: 3, icon: 'M12 3l8 9-8 9-8-9z' },
      type: { text: 'Win a battle with a {T} critter', target: 1, ess: 4, icon: 'M12 3v4M12 17v4M3 12h4M17 12h4' },
      evolve: { text: 'Evolve a critter', target: 1, ess: 4, icon: 'M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7z' },
      special: { text: 'Use special moves 3 times', target: 3, ess: 3, icon: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z' },
      release: { text: 'Release a critter', target: 1, ess: 2, icon: 'M7 17L17 7M9 7h8v8' },
      species: { text: 'Discover a new species', target: 1, ess: 3, icon: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5' }
    };
  }

  makeQuests(day, salt) {
    const r = this.rng(this.hashStr(day + '#' + salt));
    const pool = ['keep', 'win', 'adv', 'type', 'evolve', 'species'];   // kinds the day can keep: 'roll' and 'special' never progress in action mode, 'release' is not asked for (letting go is return, item 15); their defs stay so old saves still read
    const items = [];
    while (items.length < 3) {
      const key = pool.splice(Math.floor(r() * pool.length), 1)[0];
      items.push({ key: key, T: key === 'type' ? ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'][Math.floor(r() * 8)] : null, progress: 0, claimed: false });
    }
    return { day: day, salt: salt, items: items };
  }

  questsFor(s) {
    const today = new Date().toDateString();
    const q = s.quests;
    if (q && q.day === today && Array.isArray(q.items)) return JSON.parse(JSON.stringify(q));
    return this.makeQuests(today, 0);
  }

  applyEvents(s, events) {
    const XP = { keep: 3, species: 25, evolve: 40, win: 10, loss: 3, leader: 100, quest: 30 };
    let xp = s.xp || 0;
    const q = this.questsFor(s), defs = this.questDefs();
    events.forEach((ev) => {
      xp += XP[ev.t] || 0;
      q.items.forEach((it) => {
        const d = defs[it.key];
        if (it.claimed || it.progress >= d.target) return;
        const hit = it.key === 'adv' ? (ev.t === 'win' && ev.adv) : (it.key === 'type' ? (ev.t === 'win' && ev.type === it.T) : ev.t === it.key);
        if (hit) it.progress += 1;
      });
    });
    return { xp: xp, quests: q };
  }

  toHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : (max === g ? (b - r) / d + 2 : (r - g) / d + 4);
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [16, 8, 0].map((sh) => { const v = ((n >> sh) & 255) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  separate(hex, bg, min) {
    const [h, s0, l0] = this.toHsl(hex);
    let l = l0, out = hex;
    const ratio = (a) => { const x = this.lum(a), y = this.lum(bg); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    while (ratio(out) < min && l > 15) { l -= 3; out = this.fromHsl(h, s0, l); }
    return out;
  }

  fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
    return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  kit(typeName, moves) {
    const T = {
      Ember: ['Ember Shell', 'Scorch', 'burn'], Tide: ['Bubble Wall', 'Soak', 'weaken'],
      Moss: ['Bark Skin', 'Leech Vine', 'sap'], Volt: ['Grounding', 'Static Shock', 'daze'],
      Frost: ['Ice Wall', 'Deep Freeze', 'daze'], Dusk: ['Veil', 'Hex', 'weaken'],
      Stone: ['Bulwark', 'Rockskin', 'fortify'], Bloom: ['Petal Shield', 'Soothing Scent', 'heal']
    }[typeName];
    const desc = { burn: 'Hits + burns 3 turns', weaken: 'Hits + weakens 3 turns', daze: 'Hits + dazes 2 turns', sap: 'Hits + drains 3 turns', fortify: 'Hits + raises DEF 3 turns', heal: 'Heals 28% HP' };
    return [
      { kind: 'attack', name: moves[0].name, power: moves[0].power, acc: 100, sub: 'PWR ' + moves[0].power },
      { kind: 'attack', name: moves[1].name, power: moves[1].power, acc: 75, sub: 'PWR ' + moves[1].power + ' · 75% hit' },
      { kind: 'guard', name: T[0], sub: 'Blocks 60% of next hit' },
      { kind: 'status', name: T[1], effect: T[2], sub: desc[T[2]] }
    ];
  }

  newBattle(me, foe, reward) {
    const side = (k, label) => ({
      k: k, label: label, hp: Math.round(k.stats[0].value * 1.5 + 60), max: Math.round(k.stats[0].value * 1.5 + 60),
      burn: 0, weak: 0, daze: 0, sap: 0, fort: 0, guard: false, lastGuard: false, uses: 2, abUsed: false
    });
    return { uid: Math.random(), s: [side(me, me.name), side(foe, 'Wild ' + foe.name)], round: 1, log: [{ text: 'A wild ' + foe.name + ' appeared!' }], over: false, win: false, draw: false, fled: false, reward: reward };
  }

  aiChoice(b, i, rand) {
    const A = b.s[i], D = b.s[1 - i], st = A.k.kit[3];
    const key = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' }[st.effect];
    if (A.uses > 0) {
      if (st.effect === 'heal' && A.hp < A.max * 0.4) return 3;
      if (st.effect === 'fortify' && A.fort === 0 && rand() < 0.5) return 3;
      if (key && D[key] === 0 && rand() < 0.45) return 3;
    }
    if (!A.lastGuard && A.hp < A.max * 0.5 && rand() < 0.15) return 2;
    return rand() < 0.4 ? 1 : 0;
  }

  hit(A, D, power, rand) {
    const beats = this.beats();
    const mult = beats[A.k.element.name].indexOf(D.k.element.name) !== -1 ? 1.5 : (beats[D.k.element.name].indexOf(A.k.element.name) !== -1 ? 0.75 : 1);
    const atk = A.k.stats[1].value * (A.weak > 0 ? 0.6 : 1);
    const def = D.k.stats[2].value * (D.fort > 0 ? 2 : 1);
    const fx = (typeof window !== 'undefined' && window.__itemFx) || ITEM_FX, warded = D.ward > 0;
    // abilities (one per type, both sides); window.__noAb switches them off for balance comparisons
    const ab = !(typeof window !== 'undefined' && window.__noAb), an = A.k.element.name, dn = D.k.element.name; let abMult = 1, abNote = '';
    if (ab) {
      if (dn === 'Dusk' && !SECRETS[D.k.seed] && rand() < 0.05) { D.fxHits = (D.fxHits || []).concat([{ m: 1, g: true, c: A.k.element.color }]); return 'dodged (Veil)'; }
      if (an === 'Ember' && !SECRETS[A.k.seed] && A.hp < A.max * 0.5) abMult *= 1.15;
      if (dn === 'Frost') abMult *= 0.92;
      if (dn === 'Moss' && !D.abUsed) { abMult *= 0.7; D.abUsed = true; abNote = ' (Thick Bark)'; }
      if (D.k.seed === SECRET4_SEED && D.hp < D.max * 0.5) { abMult *= 0.8; abNote = ' (Standfast)'; }   // Kindlemane: below half HP it takes 20% less
    }
    const dmg0 = Math.max(1, Math.round(power * (atk / (def + 40)) * mult * (0.85 + rand() * 0.3) * 0.6 * (D.guard ? 0.4 : 1) * (A.boost || 1) * (warded ? fx.ward.mult : 1) * (this._surge && A.k.element.name === this._surge ? 1.3 : 1) * abMult));
    let dmg = dmg0;
    if (ab && D.k.seed === SECRET_SEED && !D.abUsed && dmg >= D.hp) { dmg = D.hp - 1; D.abUsed = true; D.boost = Math.max(D.boost || 1, 1.3); abNote = ' (Last Light: held on)'; }
    if (ab && dn === 'Stone' && !D.abUsed && D.hp >= D.max * 0.6 && dmg >= D.hp) { dmg = D.hp - 1; D.abUsed = true; abNote = ' (Sturdy: held on)'; }
    if (warded) D.ward -= 1;
    D.hp = Math.max(0, D.hp - dmg);
    if (ab && A.k.seed === SECRET3_SEED && D.hp > 0 && D.burn === 0 && rand() < 0.25) { D.burn = 3; abNote += ' (Slow Burn: ' + D.label + ' is burning)'; }
    if (ab && D.k.seed === SECRET2_SEED && !D.abUsed && D.hp > 0 && D.hp < D.max * 0.5) { D.hp = Math.min(D.max, D.hp + Math.round(D.max * 0.2)); D.abUsed = true; A.daze = Math.max(A.daze, 2); abNote = ' (Afterglow: healed, and ' + A.label + ' is dazed)'; }
    if (ab && dn === 'Bloom' && !D.abUsed && D.hp > 0 && D.hp < D.max * 0.3) { D.hp = Math.min(D.max, D.hp + Math.round(D.max * 0.15)); D.abUsed = true; abNote = ' (Regrow)'; }
    if (ab && dn === 'Volt' && !SECRETS[D.k.seed] && D.hp > 0 && A.daze === 0 && rand() < 0.2) { A.daze = 2; abNote = ' (Static dazed ' + A.label + ')'; }
    D.fxHits = (D.fxHits || []).concat([{ m: mult, g: !!D.guard, c: A.k.element.color }]);
    return dmg + ' dmg' + (mult > 1 ? ' (strong)' : (mult < 1 ? ' (weak)' : '')) + (D.guard ? ' (blocked)' : '') + abNote;
  }

  act(b, i, mi, rand) {
    const A = b.s[i], D = b.s[1 - i], mv = A.k.kit[mi], log = b.log;
    if (A.hp <= 0 || D.hp <= 0) return;
    if (mi < 0) { A.guard = false; A.lastGuard = false; return; }
    A.guard = false;
    if (A.daze > 0 && rand() < 0.45) { log.push({ text: A.label + ' is dazed and can\u2019t move.' }); A.lastGuard = false; return; }
    if (mv.kind === 'guard') {
      A.guard = true; A.lastGuard = true;
      log.push({ text: A.label + ' used ' + mv.name + ' and braced.' });
      return;
    }
    A.lastGuard = false;
    if (mv.kind === 'status') {
      A.uses -= 1;
      const e = mv.effect;
      if (e === 'heal') { const amt = Math.round(A.max * 0.28); A.hp = Math.min(A.max, A.hp + amt); log.push({ text: A.label + ' used ' + mv.name + ' and healed ' + amt + '.' }); }
      else if (e === 'fortify') { const t = this.hit(A, D, Math.round(A.k.kit[0].power * 0.6), rand); A.fort = 3; log.push({ text: A.label + ' used ' + mv.name + ': ' + t + '. Its DEF rose.' }); }
      else {
        const key = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' }[e];
        const dmgText = this.hit(A, D, Math.round(A.k.kit[0].power * 0.6), rand);
        D[key] = e === 'daze' ? 2 : 3; D.fxSt = e;
        const word = { burn: 'is burned', weaken: 'is weakened', daze: 'is dazed', sap: 'is being drained' }[e];
        log.push({ text: A.label + ' used ' + mv.name + ': ' + dmgText + '. ' + D.label + ' ' + word + '.' });
      }
      return;
    }
    if (rand() * 100 >= mv.acc) { log.push({ text: A.label + ' used ' + mv.name + ' but missed.' }); return; }
    log.push({ text: A.label + ' used ' + mv.name + ': ' + this.hit(A, D, mv.power, rand) + '.' });
  }

  finish(b) {
    const [P, F] = b.s;
    if (P.hp > 0 && F.hp > 0) return;
    b.over = true;
    if (P.hp > 0) { b.win = true; b.log.push({ text: F.label + ' fainted. You win!' }); }
    else if (F.hp > 0) b.log.push({ text: P.label + ' fainted.' });
    else { b.draw = true; b.log.push({ text: 'Both critters fainted.' }); }
  }

  resolve(b, playerMove, rand, foeMove) {
    const choices = [playerMove, foeMove !== undefined ? foeMove : this.aiChoice(b, 1, rand)];
    const s0 = b.s[0].k.stats[3].value, s1 = b.s[1].k.stats[3].value;
    const first = s0 > s1 ? 0 : (s1 > s0 ? 1 : (rand() < 0.5 ? 0 : 1));
    for (const i of [first, 1 - first]) {
      this.act(b, i, choices[i], rand);
      this.finish(b);
      if (b.over) return b;
    }
    this.endRound(b);
    this.finish(b);
    b.round += 1;
    if (!b.over && b.round > 60) { b.over = true; b.draw = true; b.log.push({ text: 'Both critters are worn out. It\u2019s a draw.' }); }
    return b;
  }

  // end-of-round effects (burn, drain, Tide's Drizzle, status countdown): once per round in turn-based battles, once per RT tick in real-time ones
  endRound(b) {
    for (let i = 0; i < 2; i++) {
      const A = b.s[i], D = b.s[1 - i];
      if (A.burn > 0) { const d = Math.max(1, Math.round(A.max * 0.05)); A.hp = Math.max(0, A.hp - d); b.log.push({ text: A.label + ' took ' + d + ' burn damage.' }); }
      if (A.sap > 0 && D.hp > 0) { const d = Math.max(1, Math.round(A.max * 0.03)); A.hp = Math.max(0, A.hp - d); D.hp = Math.min(D.max, D.hp + d); b.log.push({ text: D.label + ' drained ' + d + ' HP.' }); }
      if (A.hp > 0 && A.k.element.name === 'Tide' && !(typeof window !== 'undefined' && window.__noAb)) { const h = Math.max(1, Math.round(A.max * 0.02)); A.hp = Math.min(A.max, A.hp + h); }
      ['burn', 'weak', 'daze', 'sap', 'fort'].forEach((key) => { if (A[key] > 0) A[key] -= 1; });
    }
  }

  statusText(A) {
    const out = [];
    if (A.guard) out.push('Guarding');
    if (A.burn) out.push('Burned');
    if (A.weak) out.push('Weakened');
    if (A.daze) out.push('Dazed');
    if (A.sap) out.push('Drained');
    if (A.fort) out.push('Fortified');
    return out.length ? out.join(', ') : 'No status';
  }

  renderVals() {
    const accent = this.props.accent ?? '#FFC94D';
    const primaryBg = 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%), ' + accent;
    const offBg = 'rgba(14,26,56,0.6)', offFg = '#9FB0D0', glowShadow = '0 4px 14px rgba(245,185,58,0.45)';
    const testMode = this.props.testMode ?? true;
    const st = this.state;
    const en = this.energy();
    const rollSeed = st.seed ?? 4127;
    const isPreview = st.previewSeed !== null;
    const shownSeed = isPreview ? st.previewSeed : rollSeed;
    const tab = st.tab;
    const entry = st.selected !== null ? st.caught.find((e) => e.seed === st.selected) : null;
    const detail = tab === 'dex' && !!entry;
    const c = detail ? this.make(entry.seed, entry.stage) : this.make(shownSeed, 1);
    const kept = st.caught.some((e) => e.seed === shownSeed);

    const caught = st.caught.map((e) => {
      const k = this.make(e.seed, e.stage);
      k.open = () => this.setState({ selected: e.seed, armed: false, reveal: 0 });
      k.isMythic = k.rarity === 'Mythic';
      k.medalRing = k.isMythic ? '#F5C542' : '#1E2A4A';
      k.medalGlow = k.isMythic ? '0 0 14px rgba(245,197,66,0.8)' : 'none';
      k.medalScale = e.stage === 1 ? 0.44 : 0.38; // evolved forms are wider (wings), so the round card shows them a little smaller
      return k;
    });
    const types = {};
    caught.forEach((k) => { types[k.element.name] = true; });
    const typesFound = Object.keys(types).length;
    // Dex filters and sorting (view settings only: not saved)
    const DEXT = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'], dexType = st.dexType || null, dexSort = st.dexSort || 'order', dexShiny = !!st.dexShiny, dexMissing = !!st.dexMissing;
    const RANK = { Mythic: 0, Rare: 1, Uncommon: 2, Common: 3 };
    let caughtShown = caught.filter((k) => (!dexType || k.element.name === dexType) && (!dexShiny || k.shiny));
    const idx = new Map(caught.map((k, i) => [k, i]));
    const cmp = { order: (a, b) => idx.get(a) - idx.get(b), newest: (a, b) => idx.get(b) - idx.get(a), level: (a, b) => (b.lv || 1) - (a.lv || 1) || idx.get(a) - idx.get(b), rarity: (a, b) => RANK[a.rarity] - RANK[b.rarity] || idx.get(a) - idx.get(b), name: (a, b) => a.name.localeCompare(b.name) }[dexSort] || ((a, b) => 0);
    caughtShown = caughtShown.slice().sort(cmp);
    const chip = (label, on, go, dot) => ({ label: label, pressed: on ? 'true' : 'false', go: go, bg: on ? '#1E2A4A' : 'rgba(255,255,255,0.75)', fg: on ? '#FFFFFF' : '#1E2A4A', dot: dot || 'transparent' });
    const dexTypeChips = [chip('All types', !dexType, () => this.setState({ dexType: null }))].concat(DEXT.map((t) => chip(t, dexType === t, () => this.setState({ dexType: dexType === t ? null : t }), { Ember: '#FF7A45', Tide: '#3E8EF7', Moss: '#4FB06D', Volt: '#F5C518', Frost: '#8FD8EA', Dusk: '#8B6CF0', Stone: '#A79C90', Bloom: '#F27BB5' }[t])));
    const dexSortChips = [['order', 'Kept order'], ['newest', 'Newest'], ['level', 'Level'], ['rarity', 'Rarity'], ['name', 'Name']].map(([id, l]) => chip(l, dexSort === id, () => this.setState({ dexSort: id })))
      .concat([chip('★ Shiny only', dexShiny, () => this.setState({ dexShiny: !dexShiny }))]);
    const dexCount = 'Showing ' + caughtShown.length + ' of ' + caught.length;

    const rel = { Common: 1, Uncommon: 1, Rare: 2, Mythic: 4 };
    const releaseGain = detail ? rel[c.rarity] * entry.stage : 0;
    const evolveCost = detail ? (entry.stage === 1 ? 15 : 60) : 0;
    const canEvolve = detail && entry.stage < 3 && st.essence >= evolveCost;

    const earned = st.earned || [];
    const BI = {
      first: ['M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z', Math.min(st.caught.length, 1), 1],
      collector: ['M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z', Math.min(st.caught.length, 10), 10],
      spectrum: ['M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8', typesFound, 8],
      rare: ['M6 3h12l3 6-9 12L3 9zM3 9h18M9 3l3 6 3-6', caught.some((k) => k.rarity === 'Rare' || k.rarity === 'Mythic') ? 1 : 0, 1],
      legend: ['M3 18h18M4 18l-1-11 5 4 4-7 4 7 5-4-1 11', caught.some((k) => k.rarity === 'Mythic') ? 1 : 0, 1],
      growth: ['M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-5-6-5 0 4 2 5 6 5z', caught.some((k) => k.stage >= 2) ? 1 : 0, 1],
      apex: ['M3 20l6-10 4 6 3-4 5 8zM16 3l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L13 5.3l2-.3z', caught.some((k) => k.stage === 3) ? 1 : 0, 1],
      win1: ['M5 21V4M5 4h11l-2 4 2 4H5', Math.min(st.wins, 1), 1],
      champion: ['M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6', Math.min(st.wins, 25), 25]
    };
    const rowDefs = [['I', 'Collect', ['first', 'collector', 'spectrum']], ['II', 'Rarity', ['rare', 'legend']], ['III', 'Growth', ['growth', 'apex']], ['IV', 'Battle', ['win1', 'champion']]];
    const checks = {};
    this.badgeChecks(st).forEach((x) => { checks[x.id] = x; });
    const selId = st.badgeSel && checks[st.badgeSel] ? st.badgeSel : 'first';
    const badgeInfo = (id, rowName) => {
      const x = checks[id], got = x.met || earned.indexOf(id) !== -1, bi = BI[id];
      const progress = (got ? bi[2] : bi[1]) + '/' + bi[2];
      return {
        name: x.name, desc: x.desc, earned: got, icon: bi[0], progress: progress, row: rowName,
        ring: got ? '#F5C542' : (id === selId ? '#8DB4FF' : '#4A5878'),
        glow: got ? '0 0 12px rgba(245,197,66,0.75)' : 'none',
        opacity: got ? '1' : '0.55',
        pressed: id === selId ? 'true' : 'false',
        underline: id === selId ? 'underline' : 'none',
        aria: x.name + ', ' + (got ? 'earned' : 'progress ' + progress),
        select: () => this.setState({ badgeSel: id })
      };
    };
    const badgeRows = rowDefs.map((r) => ({ tier: r[0], name: r[1], items: r[2].map((id) => badgeInfo(id, r[1])) }));
    const selRow = rowDefs.find((r) => r[2].indexOf(selId) !== -1);
    const bdx = badgeInfo(selId, selRow[1]);
    const bd = Object.assign({}, bdx, {
      status: bdx.earned ? 'Earned' : 'In progress',
      barBg: bdx.earned ? 'rgba(245,197,66,0.2)' : 'rgba(139,227,106,0.18)',
      barFg: bdx.earned ? '#FFD86B' : '#9BEA7C'
    });
    const badges = this.badgeChecks(st).map((x) => {
      const got = x.met || earned.indexOf(x.id) !== -1;
      return { name: x.name, desc: x.desc, earned: got, locked: !got, bg: got ? 'rgba(90,64,8,0.85)' : 'rgba(14,26,56,0.72)', borderStyle: got ? 'solid' : 'dashed', borderColor: got ? '#FFD86B' : 'rgba(255,255,255,0.4)' };
    });

    const lv = this.levelInfo(st.xp || 0);
    const qs = this.questsFor(st), qdefs = this.questDefs();
    const quests = qs.items.map((it, i) => {
      const d = qdefs[it.key], done = it.progress >= d.target;
      return {
        text: d.text.replace('{T}', it.T || ''), icon: d.icon,
        progressText: Math.min(it.progress, d.target) + '/' + d.target,
        pct: Math.round((Math.min(it.progress, d.target) / d.target) * 100),
        reward: '+' + d.ess + ' essence · +30 XP',
        canClaim: done && !it.claimed, claimed: it.claimed, open: !done,
        ring: it.claimed ? '#8FE3A2' : (done ? '#F5C542' : '#4A5878'),
        claim: () => {
          const q2 = this.questsFor(this.state);
          const t = q2.items[i];
          if (!t || t.claimed || t.progress < qdefs[t.key].target) return;
          t.claimed = true;
          this.update({ quests: q2, essence: this.state.essence + qdefs[t.key].ess, xp: (this.state.xp || 0) + 30 });
          this.sfx('claim');
        }
      };
    });
    const TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
    const TCOL = { Ember: '#FF7A45', Tide: '#3E8EF7', Moss: '#4FB06D', Volt: '#F5C518', Frost: '#8FD8EA', Dusk: '#8B6CF0', Stone: '#A79C90', Bloom: '#F27BB5' };
    const SHAPE_NAMES = ['Blob', 'Round', 'Tall', 'Squat', 'Pear', 'Boxy'];
    const shapes = this.shapes();
    const seen = st.seen || [];
    const spSel = st.speciesSel || (seen.length ? Math.min.apply(null, seen) : 1);
    const speciesRows = TYPES.map((tn, ti) => {
      const cells = shapes.map((shp, si) => {
        const no = ti * 6 + si + 1, found = seen.indexOf(no) !== -1;
        return {
          no: String(no).padStart(3, '0'), found: found, unknown: !found, radius: shp,
          fill: found ? 'radial-gradient(circle at 34% 26%, #FFFFFF 0%, ' + TCOL[tn] + ' 55%)' : '#AEBBD6',
          ring: no === spSel ? '#F5C542' : (found ? '#1E2A4A' : '#8C9BBD'),
          aria: found ? '#' + no + ' ' + this.speciesName(ti, si) : '#' + no + ', not found yet',
          pressed: no === spSel ? 'true' : 'false',
          select: () => this.setState({ speciesSel: no })
        };
      });
      return { name: tn, color: TCOL[tn], count: cells.filter((x) => x.found).length + '/6', cells: dexMissing ? cells.filter((x) => !x.found) : cells };
    }).filter((r) => r.cells.length > 0);
    const speciesChips = [chip('All species', !dexMissing, () => this.setState({ dexMissing: false })), chip('Not yet found', dexMissing, () => this.setState({ dexMissing: true }))];
    // the bonus species (#49, #50): each shows as ??? once its door has been opened and for good once found; never part of the 48
    const bonusDefs = [[SECRET_SEED, !!(st.adv && st.adv.open && st.adv.open.arch)], [SECRET2_SEED, !!(st.adv && st.adv.open && st.adv.open.lamp)], [SECRET3_SEED, !!(st.adv && st.adv.open && st.adv.open.forge)], [SECRET4_SEED, !!(st.arena && st.arena.step >= 5)]];
    const bonusFound = (sd) => st.caught.some((e) => e.seed === sd);
    const bonusList = bonusDefs.map(([sd, opened]) => { const f = bonusFound(sd), S = SECRETS[sd]; return { show: (f || opened) && (!dexMissing || !f), icon: '', name: f ? S.name : '???', sub: f ? '#0' + S.speciesNo + ' · ' + S.type + ' · ' + S.ability.name : S.hint, sd: sd, f: f }; }).filter((x) => x.show);
    if (st.dexView === 'species') bonusList.forEach((x) => { x.icon = PIX.sprite(this.make(x.sd, 3, SECRETS[x.sd].lv), x.f ? 'icon' : 'silhouette'); });
    const spTi = Math.floor((spSel - 1) / 6), spSi = (spSel - 1) % 6, spFound = seen.indexOf(spSel) !== -1;
    const spd = {
      no: String(spSel).padStart(3, '0'),
      name: spFound ? this.speciesName(spTi, spSi) : 'Unknown species',
      line: TYPES[spTi] + ' type · ' + SHAPE_NAMES[spSi] + ' body',
      extra: 'Ability ' + ABILITIES[TYPES[spTi]].name + ': ' + ABILITIES[TYPES[spTi]].text + (Object.keys(WEATHER.KINDS).filter((k) => WEATHER.KINDS[k].type === TYPES[spTi]).map((k) => ' Appears more in ' + WEATHER.KINDS[k].label.toLowerCase() + '.')[0] || ''),
      status: spFound ? 'Discovered' + (caught.filter((k) => k.speciesNo === spSel).length ? ' · ' + caught.filter((k) => k.speciesNo === spSel).length + ' kept' : '') : 'Not found yet. Keep one to discover it.',
      color: TCOL[TYPES[spTi]], radius: shapes[spSi],
      fill: spFound ? 'radial-gradient(circle at 34% 26%, #FFFFFF 0%, ' + TCOL[TYPES[spTi]] + ' 55%)' : '#5A6890'
    };
    const dexView = st.dexView || 'mine';
    const dexToggle = [['mine', 'My critters (' + st.caught.length + ')'], ['species', 'Species (' + seen.length + '/48)']].map((d) => ({
      label: d[1], pressed: dexView === d[0] ? 'true' : 'false',
      bg: dexView === d[0] ? '#1E2A4A' : 'transparent', fg: dexView === d[0] ? '#FFFFFF' : '#1E2A4A',
      go: () => this.setState({ dexView: d[0] })
    }));
    const tabDefs = [['roll', 'Roll'], ['dex', 'Dex (' + st.caught.length + ')'], ['badges', 'Trainer']];
    const tabs = tabDefs.map((t) => ({
      label: t[1],
      pressed: tab === t[0] ? 'true' : 'false',
      bg: tab === t[0] ? '#1E2A4A' : 'transparent',
      fg: tab === t[0] ? '#FFFFFF' : '#1E2A4A',
      shadow: tab === t[0] ? 'inset 0 -3px 0 #FFD86B' : 'none',
      go: () => this.setState({ tab: t[0], selected: null, armed: false, reveal: 0 })
    }));

    const noEnergy = en.left === 0;
    const keepDisabled = kept || isPreview;

    return {
      accent: accent,
      primaryBg: primaryBg,
      c: c,
      tabs: tabs,
      shinyClass: st.settings && st.settings.calm ? '' : (st.reveal && tab === 'roll' ? 'shiny-burst' : 'shiny-still'),
      revealClass: st.reveal && tab === 'roll' && !(st.settings && st.settings.calm) ? (st.reveal % 2 ? 'reveal-a' : 'reveal-b') : '',
      glowClass: st.reveal && tab === 'roll' && !(st.settings && st.settings.calm) ? (st.reveal % 2 ? 'glow-a' : 'glow-b') : '',
      settingRows: [
        ['music', 'Music', 'Background tunes for each area and battle.'],
        ['sound', 'Sound effects', 'Chimes for rolls, battles and level-ups.'],
        ['vibrate', 'Vibration', 'Buzz on Mythic rolls, wins and level-ups (Android).'],
        ['calm', 'Reduce motion', 'Skip the roll reveal and hit shakes.'],
        ['daynight', 'Day and night', 'Tint the world by your local time. Dusk critters come out at night.'],
        ['bigtext', 'Larger text', 'Menus, screens and dialogue are 25% bigger. The map HUD stays the same.'],
        ['contrast', 'High contrast', 'Solid dark panels, brighter text and stronger outlines.'],
        ['ambient', 'Wildlife', 'Butterflies, birds, crabs and fireflies that wander the world. Looks only.'],
        ['weather', 'Weather', 'Rain, snow, fog and sun that change every 6 hours and bring out other critters.'],
        ['test', 'Test mode (developer)', 'Unlimited rolls and all trails open. Turning it on skips the real progression.']
      ].filter((r) => r[0] !== 'test' || st.dev || (st.settings && st.settings.test)).map((r) => {
        const cfg = st.settings || {}, on = !!cfg[r[0]];
        return {
          id: 'setting-' + r[0], label: r[1], desc: r[2], checked: on ? 'true' : 'false',
          track: on ? '#3E9B2E' : '#8592B0', knobLeft: on ? 27 : 3,
          toggle: () => {
            const next = Object.assign({}, this.state.settings || {});
            next[r[0]] = !on;
            this.update({ settings: next });
            if (r[0] === 'sound' && !on) this.sfx('tap', next);
            if (r[0] === 'vibrate' && !on) this.buzz(30, next);
          }
        };
      }),
      energyText: testMode ? 'Test' : en.left + '/20',
      energyAria: testMode ? 'Test mode: unlimited rolls' : en.left + ' of 20 rolls left today',
      essence: st.essence,
      essenceAria: st.essence + ' essence',
      wins: st.wins,
      kept: kept,
      notKept: !kept,
      isPreview: isPreview,
      keepDisabled: keepDisabled,
      keepLabel: kept ? 'Kept' : (isPreview ? 'Preview only' : 'Keep'),
      keepBg: kept ? 'rgba(40,110,60,0.85)' : (isPreview ? offBg : 'rgba(14,26,56,0.78)'),
      keepFg: isPreview && !kept ? offFg : '#FFFFFF',
      noEnergy: noEnergy,
      rollLabel: noEnergy ? 'Out of rolls today' : 'Roll a critter',
      rollBg: noEnergy ? offBg : primaryBg,
      rollFg: noEnergy ? offFg : '#2A1B00',
      rollShadow: noEnergy ? 'none' : glowShadow,
      caught: caughtShown, dexTypeChips: dexTypeChips, dexSortChips: dexSortChips, dexCount: dexCount, dexNoMatch: caught.length > 0 && caughtShown.length === 0,
      caughtCount: st.caught.length,
      typesFound: typesFound,
      hasCaught: st.caught.length > 0,
      noCaught: st.caught.length === 0,
      showRoll: tab === 'roll',
      showCard: tab === 'roll' || detail,
      showDetail: detail,
      showDexList: tab === 'dex' && !detail && dexView === 'mine',
      showBadges: tab === 'badges',
      showTestTools: tab === 'badges' && testMode,
      seedInput: st.seedInput,
      loadError: st.loadError,
      releaseLabel: detail && SECRETS[entry.seed] ? 'It stays with you' : (st.armed ? 'Tap to confirm' : 'Let it go' + (releaseGain ? ' (+' + releaseGain + ')' : '')),
      releaseBg: st.armed ? 'rgba(150,40,30,0.85)' : 'rgba(14,26,56,0.78)',
      cannotEvolve: !canEvolve,
      evolveLabel: detail && entry.stage === 3 ? 'Fully evolved' : 'Evolve (−' + evolveCost + ')',
      evolveBg: canEvolve ? primaryBg : offBg,
      evolveFg: canEvolve ? '#2A1B00' : offFg,
      badges: badges,
      badgeRows: badgeRows,
      bd: bd,
      isMenu: tab === 'dex' || tab === 'badges',
      trainerLevel: lv.level,
      xpText: lv.into + '/' + lv.need + ' XP',
      xpPct: Math.round((lv.into / lv.need) * 100),
      nextLevel: lv.level + 1,
      quests: quests,
      questsDone: quests.filter((x) => !x.open).length,
      speciesRows: speciesRows,
      spd: spd,
      speciesFound: seen.length,
      dexToggle: dexToggle,
      showDexToggle: tab === 'dex' && !detail,
      showSpecies: tab === 'dex' && !detail && dexView === 'species', speciesChips: speciesChips, showBonus: bonusList.length > 0, bonusList: bonusList, bonusCount: bonusDefs.filter(([sd]) => bonusFound(sd)).length + '/' + bonusDefs.length, dexNoMissing: dexMissing && speciesRows.length === 0,
      showLevelUp: !!st.levelUp,
      levelUpText: st.levelUp ? 'Trainer level ' + st.levelUp + '! +2 essence' : '',
      badgeCount: badges.filter((x) => x.earned).length,
      toRoll: () => this.setState({ tab: 'roll', selected: null, armed: false }),
      closeDetail: () => this.setState({ selected: null, armed: false }),
      backToRoll: () => this.setState({ previewSeed: null, reveal: 0 }),
      close: () => APP.close(),   // the Dex and the Arena, with nothing kept yet: back outside, to the grass
      onSeedInput: (e) => this.setState({ seedInput: e.target.value, loadError: false }),
      loadSeed: () => {
        const n = Number(String(st.seedInput).trim());
        if (Number.isInteger(n) && n >= 1 && n <= 999999) this.setState({ previewSeed: n, seedInput: '', loadError: false, reveal: 0 });
        else this.setState({ loadError: true });
      },
      rollAgain: () => {
        const e2 = this.energy();
        if (e2.left === 0) return;
        const ns = 1 + Math.floor(Math.random() * 999998);
        this.update({ seed: ns, previewSeed: null, day: e2.today, used: e2.used + 1, reveal: (st.reveal || 0) + 1 }, [{ t: 'roll' }]);
        const rr = this.make(ns, 1).rarity;
        const delay = st.settings && st.settings.calm ? 0 : 650;
        setTimeout(() => {
          this.sfx(rr === 'Mythic' ? 'mythic' : (rr === 'Rare' ? 'rare' : 'roll'));
          if (rr === 'Mythic') this.buzz([60, 40, 60, 40, 140]);
        }, delay);
      },
      keep: () => {
        if (keepDisabled) return;
        const no = this.make(shownSeed, 1).speciesNo;
        const seen = (st.seen || []).slice();
        const events = [{ t: 'keep' }];
        if (seen.indexOf(no) === -1) { seen.push(no); events.push({ t: 'species' }); }
        this.update({ caught: [{ seed: shownSeed, stage: 1 }].concat(st.caught), seen: seen, returned: (st.returned || []).filter((x) => x !== shownSeed) }, events);   // a critter met again on its shore or on a line leaves the returned pool when kept
        this.sfx('tap');
      },
      release: () => {
        if (!detail) return;
        if (SECRETS[entry.seed]) { this.sfx('tap'); return; }   // the secret critters stay with you
        if (!st.armed) { this.setState({ armed: true }); return; }
        this.update({
          caught: st.caught.filter((e) => e.seed !== entry.seed),
          returned: (st.returned || []).filter((x) => x !== entry.seed).concat([entry.seed]).slice(-40),   // it goes back: met again on its own shore, or on a line
          essence: st.essence + releaseGain,
          selected: null, armed: false,
          fighter: st.fighter === entry.seed ? null : st.fighter,
          battle: st.battle && st.battle.s[0].k.seed === entry.seed ? null : st.battle   /* (b was never defined here: Let it go and Evolve threw) */
        }, [{ t: 'release' }]);
      },
      evolve: () => {
        if (!canEvolve) return;
        this.update({
          caught: st.caught.map((e) => (e.seed === entry.seed ? Object.assign({}, e, { stage: e.stage + 1 }) : e)),
          essence: st.essence - evolveCost,
          battle: st.battle && st.battle.s[0].k.seed === entry.seed ? null : st.battle   /* (b was never defined here: Let it go and Evolve threw) */
        }, [{ t: 'evolve' }]);
      },
      addEssence: () => this.update({ essence: st.essence + 10 }),
      resetRolls: () => this.update({ day: en.today, used: 0 }),
      newQuests: () => { const q = this.questsFor(st); this.update({ quests: this.makeQuests(q.day, (q.salt || 0) + 1) }); },
      dismissLevelUp: () => this.setState({ levelUp: null })
    };
  }

}

