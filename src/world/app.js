// ---- Glue: game state, screens over the world, HUD ----
class Base {
  get props() { const s = (this.state && this.state.settings) || {}; return { accent: '#FFC94D', testMode: s.test !== false }; }
  setState(p) { this.state = Object.assign({}, this.state, p); APP.schedule(); }
}

class Component extends Base {
  constructor(props) {
    super(props);
    this.state = {
      seed: null, previewSeed: null, caught: [], tab: 'roll', selected: null, earned: [],
      seedInput: '', loadError: false, armed: false,
      essence: 0, wins: 0, day: '', used: 0,
      fighter: null, foeSeed: 1 + Math.floor(Math.random() * 999998), battle: null, reveal: 0, settings: { sound: true, vibrate: true, calm: false, test: false, daynight: true, track: true }
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
      titles: Array.isArray(d.titles) ? d.titles.filter((x) => typeof x === 'string') : [],
      title: typeof d.title === 'string' ? d.title : '',
      shinies: Array.isArray(d.shinies) ? d.shinies.filter((n) => Number.isInteger(n)) : [],
      tower: (() => {
        const t = d.tower && typeof d.tower === 'object' ? d.tower : {};
        const r = t.run && typeof t.run === 'object' && Array.isArray(t.run.party) ? { floor: Math.max(1, t.run.floor | 0), party: t.run.party.filter((n) => Number.isInteger(n)).slice(0, 3), hp: t.run.hp && typeof t.run.hp === 'object' ? t.run.hp : {} } : null;
        return { best: Math.max(0, t.best | 0), day: typeof t.day === 'string' ? t.day : '', runs: t.runs | 0, clears: t.clears | 0, run: r && r.party.length ? r : null };
      })(),
      settings: d.settings && typeof d.settings === 'object' ? { sound: d.settings.sound !== false, vibrate: d.settings.vibrate !== false, calm: d.settings.calm === true, test: d.settings.test === true, daynight: d.settings.daynight !== false, track: d.settings.track !== false, music: d.settings.music !== false, follow: d.settings.follow !== false } : { sound: true, vibrate: true, calm: false, test: false, daynight: true, track: true, music: true, follow: true },
      seen: (() => {
        const seen = Array.isArray(d.seen) ? d.seen.filter((n) => Number.isInteger(n) && n >= 1 && n <= 48) : [];
        (Array.isArray(d.caught) ? d.caught : []).forEach((e) => { if (e && Number.isInteger(e.seed)) { const no = this.make(e.seed, 1).speciesNo; if (seen.indexOf(no) === -1) seen.push(no); } });
        return seen;
      })()
    });
  }

  update(patch, events) {
    const s = Object.assign({}, this.state, patch);
    const extra = this.applyEvents(s, events || []);
    const seenAll = (s.seen || []).slice();
    (s.caught || []).forEach((e) => { const no = this.make(e.seed, 1).speciesNo; if (seenAll.indexOf(no) === -1) seenAll.push(no); });
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
      window.localStorage.setItem('critter-roll:v2', JSON.stringify({ caught: s.caught, essence: s.essence, wins: s.wins, day: s.day, used: s.used, earned: earned, seed: s.seed, xp: s.xp, quests: s.quests, seen: s.seen, settings: s.settings, npc: s.npc, party: s.party, bag: s.bag, charm: s.charm, lure: s.lure, cq: s.cq, tickets: s.tickets, intro: s.intro, hints: s.hints, dev: s.dev, sight: s.sight, tower: s.tower, titles: s.titles, title: s.title, shinies: s.shinies, stats: s.stats, visited: s.visited }));
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
    const w = stage === 1 ? w0 : Math.max(w0, Math.min(186, Math.round(w0 * sizeMult)));
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
    h = Math.min(h, 198 - Math.max(headroom, stage === 3 ? 24 : 0) - 4);
    const bx = Math.round(120 - w / 2);
    const by = 198 - h;

    const parts = [];
    if (stage === 3) parts.push({ x: Math.round(120 - (w + 44) / 2), y: by - 22, w: w + 44, h: h + 24, r: '50%', rot: 0, bg: 'rgba(255,216,77,0.45)', bw: 0, bc: INK });
    if (tail === 'stub') parts.push({ x: bx + w - 22, y: by + h - 48, w: 44, h: 26, r: '50%', rot: -30, bg: fill, bw: 3, bc: outline });
    if (tail === 'ball') parts.push({ x: bx + w - 16, y: by + h - 52, w: 34, h: 34, r: '50%', rot: 0, bg: fill, bw: 3, bc: outline });
    if (tail === 'spike') parts.push({ x: bx + w - 14, y: by + h - 50, w: 30, h: 30, r: '4px', rot: 45, bg: fill, bw: 3, bc: outline });

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
      strongVs: this.beats()[element.name].join(' + ').toUpperCase(),
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
        level: [[523, 0.08], [784, 0.08], [1047, 0.22]], claim: [[784, 0.07], [1047, 0.14]]
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
    const pool = ['roll', 'keep', 'win', 'adv', 'type', 'evolve', 'special', 'release', 'species'];
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
      burn: 0, weak: 0, daze: 0, sap: 0, fort: 0, guard: false, lastGuard: false, uses: 2
    });
    return { s: [side(me, me.name), side(foe, 'Wild ' + foe.name)], round: 1, log: [{ text: 'A wild ' + foe.name + ' appeared!' }], over: false, win: false, draw: false, fled: false, reward: reward };
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
    const dmg = Math.max(1, Math.round(power * (atk / (def + 40)) * mult * (0.85 + rand() * 0.3) * 0.6 * (D.guard ? 0.4 : 1) * (A.boost || 1) * (warded ? fx.ward.mult : 1) * (this._surge && A.k.element.name === this._surge ? 1.3 : 1)));
    if (warded) D.ward -= 1;
    D.hp = Math.max(0, D.hp - dmg);
    D.fxHits = (D.fxHits || []).concat([{ m: mult, g: !!D.guard, c: A.k.element.color }]);
    return dmg + ' dmg' + (mult > 1 ? ' (strong)' : (mult < 1 ? ' (weak)' : '')) + (D.guard ? ' (blocked)' : '');
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
    for (let i = 0; i < 2; i++) {
      const A = b.s[i], D = b.s[1 - i];
      if (A.burn > 0) { const d = Math.max(1, Math.round(A.max * 0.05)); A.hp = Math.max(0, A.hp - d); b.log.push({ text: A.label + ' took ' + d + ' burn damage.' }); }
      if (A.sap > 0 && D.hp > 0) { const d = Math.max(1, Math.round(A.max * 0.03)); A.hp = Math.max(0, A.hp - d); D.hp = Math.min(D.max, D.hp + d); b.log.push({ text: D.label + ' drained ' + d + ' HP.' }); }
      ['burn', 'weak', 'daze', 'sap', 'fort'].forEach((key) => { if (A[key] > 0) A[key] -= 1; });
    }
    this.finish(b);
    b.round += 1;
    if (!b.over && b.round > 60) { b.over = true; b.draw = true; b.log.push({ text: 'Both critters are worn out. It\u2019s a draw.' }); }
    return b;
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
      return k;
    });
    const types = {};
    caught.forEach((k) => { types[k.element.name] = true; });
    const typesFound = Object.keys(types).length;

    const beats = this.beats();
    const b = st.battle;
    const inBattle = !!b && !b.over;
    const fighterEntry = st.caught.find((e) => e.seed === st.fighter) || st.caught[0] || null;
    const me = fighterEntry ? this.make(fighterEntry.seed, fighterEntry.stage) : null;
    const foe = this.make(st.foeSeed, fighterEntry ? fighterEntry.stage : 1);
    let reward = 1;
    if (foe.rarity === 'Rare') reward += 1;
    if (foe.rarity === 'Mythic') reward += 2;
    if (me && beats[foe.element.name].indexOf(me.element.name) !== -1) reward += 1;
    let matchupNote = '';
    if (me) {
      if (beats[me.element.name].indexOf(foe.element.name) !== -1) matchupNote = me.element.name + ' is strong against ' + foe.element.name + '. You have the edge.';
      else if (beats[foe.element.name].indexOf(me.element.name) !== -1) matchupNote = foe.element.name + ' is strong against ' + me.element.name + '. Tough fight, bigger reward.';
      else matchupNote = 'No type advantage either way. Stats and tactics decide it.';
      matchupNote += ' Win reward: +' + reward + ' essence.';
    }

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
      return { name: tn, color: TCOL[tn], count: cells.filter((x) => x.found).length + '/6', cells: cells };
    });
    const spTi = Math.floor((spSel - 1) / 6), spSi = (spSel - 1) % 6, spFound = seen.indexOf(spSel) !== -1;
    const spd = {
      no: String(spSel).padStart(3, '0'),
      name: spFound ? this.speciesName(spTi, spSi) : 'Unknown species',
      line: TYPES[spTi] + ' type · ' + SHAPE_NAMES[spSi] + ' body',
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
    const tabDefs = [['roll', 'Roll'], ['dex', 'Dex (' + st.caught.length + ')'], ['battle', inBattle ? 'Battle •' : 'Battle'], ['badges', 'Trainer']];
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
    const cannotReroll = !b && st.essence < 1;

    const duel = !me ? [] : (b ? b.s : [{ k: me }, { k: foe }]).map((x, i) => {
      const max = x.max ?? Math.round(x.k.stats[0].value * 1.5 + 60);
      const now = x.hp ?? max;
      const pct = Math.round((now / max) * 100);
      const calm = st.settings && st.settings.calm;
      const hitClass = !calm && b && b.fx && b.fx.hit[i] ? (b.fx.round % 2 ? 'hit-a' : 'hit-b') : '';
      const F = b && b.fx && b.fx.side ? b.fx.side[i] : null, par = b && b.fx && b.fx.round % 2 ? 'a' : 'b';
      const fx = F ? { layer: 'fxl fx-' + par + (calm ? ' fx-calm' : ''), burst: !calm && !!F.burst && F.burst !== 'guard', burstCls: 'fx-burst fx-' + F.burst, color: F.color || '#FFFFFF',
        ring: !calm && !!F.ring, ringColor: F.ring || '#FFFFFF', num: F.num || '', numColor: F.heal ? '#8CFF9E' : (F.burst === 'strong' ? '#FFD86B' : '#FFFFFF'), numCls: 'fx-num' + (F.burst === 'strong' ? ' fx-big' : ''),
        label: F.ko ? 'KO!' : (F.label || ''), labelCls: F.ko ? 'fx-label fx-ko' : 'fx-label', labelColor: F.ko ? '#FF5A5A' : (F.ring && !F.burst ? F.ring : (F.burst === 'strong' ? '#FFD86B' : (F.ring || '#C9D6F2'))) } : null;
      const flashCls = F && F.burst && F.burst !== 'guard' && !calm ? 'fx-flash-' + par : '';
      return { hitClass: hitClass, fx: fx, flashCls: flashCls, side: i === 0 ? 'YOU' : 'WILD', sideColor: i === 0 ? '#A7F04A' : '#FF8A7A', k: x.k, hpMax: max, hpNow: now, hpPct: pct, hpColor: pct > 50 ? '#A7F04A' : (pct > 25 ? '#FFD86B' : '#FF8A7A'), status: b ? this.statusText(x) : (x.k.element.name + ' moves: ' + x.k.kit[3].name) };
    });

    const moveButtons = inBattle ? b.s[0].k.kit.map((mv, i) => {
      const P = b.s[0];
      const off = (mv.kind === 'guard' && P.lastGuard) || (mv.kind === 'status' && P.uses === 0);
      const sub = mv.kind === 'status' ? mv.sub + ' · ' + P.uses + ' left' : (mv.kind === 'guard' && P.lastGuard ? 'Not twice in a row' : mv.sub);
      return {
        name: mv.name, sub: sub, off: off,
        bg: off ? offBg : (mv.kind === 'attack' ? 'rgba(14,26,56,0.78)' : (mv.kind === 'guard' ? 'rgba(46,84,160,0.85)' : 'rgba(110,80,10,0.85)')),
        border: off ? 'rgba(255,255,255,0.2)' : (mv.kind === 'status' ? '#FFD86B' : 'rgba(255,255,255,0.5)'),
        fg: off ? offFg : '#FFFFFF',
        subFg: off ? offFg : (mv.kind === 'status' ? '#FFE69A' : '#C9D6F2'),
        use: () => this.playRound(i)
      };
    }) : [];

    const resultTitle = !b || !b.over ? '' : (b.fled ? 'You fled. No reward.' : (b.draw ? 'Draw. No essence this time.' : (b.win ? 'You won! +' + b.reward + ' essence' : 'You lost. Try another fighter or tactic.')));

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
        ['follow', 'Critter follows you', 'Your lead critter walks behind you in the world.'],
        ['sound', 'Sound effects', 'Chimes for rolls, battles and level-ups.'],
        ['vibrate', 'Vibration', 'Buzz on Mythic rolls, wins and level-ups (Android).'],
        ['calm', 'Reduce motion', 'Skip the roll reveal and hit shakes.'],
        ['daynight', 'Day and night', 'Tint the world by your local time. Dusk critters come out at night.'],
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
      caught: caught,
      caughtCount: st.caught.length,
      typesFound: typesFound,
      hasCaught: st.caught.length > 0,
      noCaught: st.caught.length === 0,
      showRoll: tab === 'roll',
      showCard: tab === 'roll' || detail,
      showDetail: detail,
      showDexList: tab === 'dex' && !detail && dexView === 'mine',
      showBattle: tab === 'battle',
      showBadges: tab === 'badges',
      showTestTools: tab === 'badges' && testMode,
      seedInput: st.seedInput,
      loadError: st.loadError,
      releaseLabel: st.armed ? 'Tap to confirm' : 'Release (+' + releaseGain + ')',
      releaseBg: st.armed ? 'rgba(150,40,30,0.85)' : 'rgba(14,26,56,0.78)',
      cannotEvolve: !canEvolve,
      evolveLabel: detail && entry.stage === 3 ? 'Fully evolved' : 'Evolve (−' + evolveCost + ')',
      evolveBg: canEvolve ? primaryBg : offBg,
      evolveFg: canEvolve ? '#2A1B00' : offFg,
      notInBattle: !inBattle,
      inBattle: inBattle,
      showLog: !!b,
      roundLabel: b ? (b.over ? 'Battle log · newest first' : 'Round ' + b.round + ' · newest first') : '',
      logLines: b ? b.log.slice(-6).reverse() : [],
      hasResult: !!b && b.over,
      resultTitle: resultTitle,
      fighters: caught.slice().sort((p, q) => (me && q.seed === me.seed ? 1 : 0) - (me && p.seed === me.seed ? 1 : 0)).map((k) => ({
        name: k.name,
        pressed: me && k.seed === me.seed ? 'true' : 'false',
        bg: me && k.seed === me.seed ? primaryBg : 'rgba(255,255,255,0.12)',
        fg: me && k.seed === me.seed ? '#2A1B00' : '#FFFFFF',
        pick: () => this.setState({ fighter: k.seed, battle: null })
      })),
      duel: duel,
      matchupNote: matchupNote,
      moveButtons: moveButtons,
      showPreBattle: tab === 'battle' && st.caught.length > 0 && !inBattle,
      showMoveBar: tab === 'battle' && inBattle,
      cannotFight: noEnergy,
      fightLabel: noEnergy ? 'Out of rolls today' : (b && b.over ? 'Fight again (1 roll)' : 'Fight (1 roll)'),
      fightBg: noEnergy ? offBg : primaryBg,
      fightFg: noEnergy ? offFg : '#2A1B00',
      fightShadow: noEnergy ? 'none' : glowShadow,
      cannotReroll: cannotReroll,
      rerollLabel: b ? 'New foe' : 'New foe (1 essence)',
      rerollBg: cannotReroll ? offBg : 'rgba(14,26,56,0.78)',
      rerollFg: cannotReroll ? offFg : '#FFFFFF',
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
      showSpecies: tab === 'dex' && !detail && dexView === 'species',
      showLevelUp: !!st.levelUp,
      levelUpText: st.levelUp ? 'Trainer level ' + st.levelUp + '! +2 essence' : '',
      badgeCount: badges.filter((x) => x.earned).length,
      toRoll: () => this.setState({ tab: 'roll', selected: null, armed: false }),
      closeDetail: () => this.setState({ selected: null, armed: false }),
      backToRoll: () => this.setState({ previewSeed: null, reveal: 0 }),
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
        this.update({ caught: [{ seed: shownSeed, stage: 1 }].concat(st.caught), seen: seen }, events);
        this.sfx('tap');
      },
      release: () => {
        if (!detail) return;
        if (!st.armed) { this.setState({ armed: true }); return; }
        this.update({
          caught: st.caught.filter((e) => e.seed !== entry.seed),
          essence: st.essence + releaseGain,
          selected: null, armed: false,
          fighter: st.fighter === entry.seed ? null : st.fighter,
          battle: b && b.s[0].k.seed === entry.seed ? null : b
        }, [{ t: 'release' }]);
      },
      evolve: () => {
        if (!canEvolve) return;
        this.update({
          caught: st.caught.map((e) => (e.seed === entry.seed ? Object.assign({}, e, { stage: e.stage + 1 }) : e)),
          essence: st.essence - evolveCost,
          battle: b && b.s[0].k.seed === entry.seed ? null : b
        }, [{ t: 'evolve' }]);
      },
      nextFoe: () => {
        if (b) { if (b.over) this.setState({ foeSeed: 1 + Math.floor(Math.random() * 999998), battle: null }); return; }
        if (st.essence < 1) return;
        this.update({ foeSeed: 1 + Math.floor(Math.random() * 999998), essence: st.essence - 1 });
      },
      fight: () => {
        const e2 = this.energy();
        if (!me || e2.left === 0 || inBattle) return;
        this.update({ battle: this.newBattle(me, foe, reward), day: e2.today, used: e2.used + 1 });
      },
      flee: () => {
        if (!inBattle) return;
        const nb = JSON.parse(JSON.stringify(b));
        nb.over = true; nb.fled = true; nb.log.push({ text: 'You fled the battle.' });
        this.setState({ battle: nb });
      },
      addEssence: () => this.update({ essence: st.essence + 10 }),
      resetRolls: () => this.update({ day: en.today, used: 0 }),
      newQuests: () => { const q = this.questsFor(st); this.update({ quests: this.makeQuests(q.day, (q.salt || 0) + 1) }); },
      dismissLevelUp: () => this.setState({ levelUp: null })
    };
  }

  playRound(i) {
    const b = this.state.battle;
    if (!b || b.over) return;
    const P = b.s[0], mv = P.k.kit[i];
    if ((mv.kind === 'guard' && P.lastGuard) || (mv.kind === 'status' && P.uses === 0)) return;
    const hp0 = [b.s[0].hp, b.s[1].hp];
    const nb = this.resolve(JSON.parse(JSON.stringify(b)), i, Math.random);
    nb.fx = { round: nb.round, hit: [nb.s[0].hp < hp0[0], nb.s[1].hp < hp0[1]] };
    if (nb.fx.hit[0] || nb.fx.hit[1]) this.sfx('hit');
    if (nb.over && nb.win) { setTimeout(() => this.sfx('win'), 250); this.buzz([40, 30, 40]); }
    else if (nb.over && !nb.draw) setTimeout(() => this.sfx('lose'), 250);
    const events = mv.kind === 'status' ? [{ t: 'special' }] : [];
    const patch = { battle: nb };
    if (nb.over && nb.win) {
      patch.wins = this.state.wins + 1;
      patch.essence = this.state.essence + nb.reward;
      events.push({ t: 'win', type: P.k.element.name, adv: this.beats()[P.k.element.name].indexOf(nb.s[1].k.element.name) !== -1 });
    } else if (nb.over && !nb.draw && !nb.fled) events.push({ t: 'loss' });
    this.update(patch, events);
  }
}

const FREE_SIGHTINGS = 40;
const KEEP_COST = { Common: 1, Uncommon: 2, Rare: 4, Mythic: 8 };
const GATES = { moss: 1, frost: 3, ember: 6, tide: 9 };
const ZONE_NAMES = { moss: 'Moss Forest', frost: 'Frost Peaks', ember: 'Ember Fields', tide: 'Tide Shore' };
// where an NPC stands now (leaders moved into city gyms) and that map's display name
const npcHome = (id) => { if (typeof WORLD === 'undefined') return null; const all = WORLD.allNpcs(); for (const k in all) if ((all[k] || []).some((n) => n.id === id)) return k; return null; };
const mapName = (id) => (typeof WORLD !== 'undefined' && WORLD.MAPS[id] ? WORLD.MAPS[id].name : (ZONE_NAMES[id] || id));
// routes open at the higher gate of the two places they join, so no route skips a gate
// daily city side quests: one per city per day, rotating among three kinds (reward kept small: XP is the point)
const CITY_QUESTS = {
  mossbrook: { giver: 'bryn', list: [{ k: 'see', map: 'moss', n: 5, txt: 'spot 5 wild critters in Moss Forest' }, { k: 'keep', types: ['Moss', 'Bloom'], n: 1, txt: 'keep a Moss or Bloom critter' }, { k: 'beat', id: 'sorrel', n: 1, txt: 'beat Forager Sorrel' }] },
  frosthold: { giver: 'olaf', list: [{ k: 'see', map: 'route-mf', n: 5, txt: 'spot 5 wild critters on Highland Pass' }, { k: 'keep', types: ['Frost', 'Stone'], n: 1, txt: 'keep a Frost or Stone critter' }, { k: 'beat', id: 'kai', n: 1, txt: 'beat Mountaineer Kai on Highland Pass' }] },
  cinderport: { giver: 'ruby', list: [{ k: 'see', map: 'route-cm', n: 5, txt: 'spot 5 wild critters on Ashwood Trail' }, { k: 'keep', types: ['Ember', 'Volt'], n: 1, txt: 'keep an Ember or Volt critter' }, { k: 'beat', id: 'elm', n: 1, txt: 'beat Woodcutter Elm on Ashwood Trail' }] },
  coralbay: { giver: 'pearl', list: [{ k: 'see', map: 'route-cc', n: 5, txt: 'spot 5 wild critters on Reef Causeway' }, { k: 'keep', types: ['Tide', 'Dusk'], n: 1, txt: 'keep a Tide or Dusk critter' }, { k: 'beat', id: 'mako', n: 1, txt: 'beat Diver Mako on Reef Causeway' }] }
};
const CQ_REWARD = 4;
const ROUTE_GATES = { 'route-mf': 3, 'route-cm': 6, 'route-fc': 9, 'route-cc': 9 };
const LEADERS = [
  { id: 'wren', zone: 'moss', name: 'Elder Wren', color: '#4FB06D' },
  { id: 'glacia', zone: 'frost', name: 'Glacia', color: '#8FD8EA' },
  { id: 'blaze', zone: 'ember', name: 'Blaze', color: '#FF7A45' },
  { id: 'coral', zone: 'tide', name: 'Admiral Coral', color: '#3E8EF7' }
];
const SHINY_ODDS = 200;
// city items (strengths tuned with itemsim.py so each is worth about a Super Potion)
const ITEM_FX = { herb: { heal: 0.4 }, ward: { hits: 5, mult: 0.35 }, whet: { mult: 1.7 } };
const BAG0 = { potion: 0, super: 0, charm: 0, ticket: 0, herb: 0, ward: 0, whet: 0, lure: 0 };
const CITY_ITEM = { mossbrook: 'herb', frosthold: 'ward', cinderport: 'whet', coralbay: 'lure' };
// titles stay earned once met; species milestones also pay essence (sized by milesim.py)
const TITLES = [
  { id: 'explorer', name: 'Explorer', desc: 'Discover 12 species', essence: 10, goal: 12, of: (s) => (s.seen || []).length },
  { id: 'collector', name: 'Collector', desc: 'Discover 24 species', essence: 15, goal: 24, of: (s) => (s.seen || []).length },
  { id: 'naturalist', name: 'Naturalist', desc: 'Discover 36 species', essence: 20, goal: 36, of: (s) => (s.seen || []).length },
  { id: 'master', name: 'Critter Master', desc: 'Discover all 48 species', essence: 40, goal: 48, of: (s) => (s.seen || []).length },
  { id: 'champion', name: 'Champion', desc: 'Earn all 4 Leader Seals', essence: 0, goal: 4, of: (s) => ((s.npc && s.npc.seals) || []).length },
  { id: 'climber', name: 'Tower Climber', desc: 'Clear floor 10 of the Tower', essence: 0, goal: 10, of: (s) => (s.tower && s.tower.best) || 0 },
  { id: 'summit', name: 'Summit Champion', desc: 'Clear all 20 Tower floors', essence: 0, goal: 20, of: (s) => (s.tower && s.tower.best) || 0 },
  { id: 'shiny', name: 'Shiny Hunter', desc: 'Keep 3 shiny critters', essence: 0, goal: 3, of: (s) => (s.shinies || []).length }
];
const TOWER = { floors: 20, runsPerDay: 2, heal: 0.3 };
// weekly Tower twist: one rule per week (multipliers tuned with towersim.py twist runs)
const TWISTS = [
  { id: 'surge', name: 'Surge Week', heal: 0.3, mult: 1, about: (t) => t + ' critters deal 30% more damage this week, yours and the Tower\u2019s alike.' },
  { id: 'iron', name: 'Iron Climb', heal: 0.15, mult: 1.5, about: () => 'Only a short rest between floors this week (15% instead of 30%), but new-best essence is worth 50% more.' },
  { id: 'wind', name: 'Second Wind', heal: 0.4, mult: 0.75, about: () => 'Your party rests 40% between floors this week (normally 30%). New-best essence is worth 25% less.' },
  { id: 'mono', name: 'One Element', heal: 0.3, mult: 1, about: () => 'Every floor fields a single type this week. Bring the right counters.' }
];
const TWIST_TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
const TOWER_NAMES = ['Pip the Squire', 'Juno', 'Ash', 'Vera', 'Warden Sable', 'Theo', 'Lark', 'Rhea', 'Quill', 'Warden Onyx', 'Mika', 'Dorian', 'Sage', 'Nell', 'Warden Aurora', 'Felix', 'Iris', 'Bastian', 'Selene', 'Sovereign Vale'];
// floor curve, tuned by towersim.py (see handoff); window.__towerCurve overrides it in simulations only
const TOWER_CURVE = { size: [3, 3, 3, 3, 4, 3, 4, 4, 4, 5, 4, 4, 4, 4, 5, 4, 5, 4, 5, 5], stage: [2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], lv: [9, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 20], pick: [0.3, 0.35, 0.4, 0.3, 0.45, 0.4, 0.4, 0.45, 0.5, 0.55, 0.5, 0.55, 0.55, 0.6, 0.65, 0.55, 0.55, 0.6, 0.6, 0.7] };
const HABITAT = { Frost: 'Frost Peaks', Stone: 'Frost Peaks', Ember: 'Ember Fields', Volt: 'Ember Fields', Moss: 'Moss Forest', Bloom: 'Moss Forest', Tide: 'Tide Shore', Dusk: 'Tide Shore' };
const MAX_LV = 20;
const lvNeed = (lv) => 20 + 10 * (lv - 1);
class Game extends Component {
  make(seed, stage, lv) {
    const k = super.make(seed, stage);
    if (lv === undefined) { const own = this.state && this.state.caught ? this.state.caught.find((e) => e.seed === seed) : null; lv = own ? (own.lv || 1) : 1; }
    lv = Math.max(1, Math.min(MAX_LV, lv | 0));
    const m = 1 + 0.03 * (lv - 1);
    k.stats.forEach((q) => { q.value = Math.min(250, Math.round(q.value * m)); q.pct = Math.min(100, Math.round(q.value / 200 * 100)); });
    k.lv = lv;
    const sh = this.shinyHash(seed);
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
    const seen = (s.seen || []).slice(); s.caught.forEach((e) => { const no = this.make(e.seed, 1).speciesNo; if (seen.indexOf(no) === -1) seen.push(no); }); s.seen = seen;
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
      const got = seals.indexOf(L.id) !== -1, open = lvNow >= GATES[L.zone] || this.props.testMode;
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
      { id: 'backup', label: 'Backup', sub: 'Save code', icon: 'M12 3v12M7 10l5 5 5-5M5 21h14' },
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
  // ---------- world map ----------
  let mapOpen = false;
  function renderMap() {
    const st = game.state, lv = game.levelInfo(st.xp || 0).level, here = WORLD.map.id, test = game.props.testMode;
    const seals = (st.npc && st.npc.seals) || [], seen = st.seen || [];
    const TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
    const zoneTypes = { frost: ['Frost', 'Stone'], ember: ['Ember', 'Volt'], moss: ['Moss', 'Bloom'], tide: ['Tide', 'Dusk'] };
    const found = (z) => zoneTypes[z].reduce((n, t) => { const ti = TYPES.indexOf(t); return n + seen.filter((no) => Math.floor((no - 1) / 6) === ti).length; }, 0);
    const card = (id) => {
      if (id === 'town') return { id, name: 'Sproutvale', sub: 'Home, Lab, Shrine, Arena', open: true, lockTxt: '', seal: '', found: '' };
      const L = LEADERS.find((x) => x.zone === id), open = test || lv >= GATES[id];
      return { id, name: ZONE_NAMES[id], sub: zoneTypes[id].join(' and ') + ' critters', open, lockTxt: open ? '' : 'Opens at level ' + GATES[id],
        seal: L.name + (seals.indexOf(L.id) !== -1 ? ': seal earned' : ': not yet beaten'), found: found(id) + '/12 species found' };
    };
    const node = (id, cls) => { const c = card(id), isHere = here === id;
      return '<div class="mnode ' + cls + (c.open ? '' : ' locked') + (isHere ? ' here' : '') + '"><b>' + c.name + '</b><span>' + c.sub + '</span>' +
        (c.found ? '<span>' + c.found + '</span>' : '') + (c.seal ? '<span>' + c.seal + '</span>' : '') + (c.lockTxt ? '<span class="lk">' + c.lockTxt + '</span>' : '') +
        (isHere ? '<span class="you">You are here</span>' : (c.open ? '<button data-travel="' + id + '">Travel here</button>' : '')) + '</div>'; };
    const vis = st.visited || [], CITY = [['mossbrook', 'Mossbrook', 'past Moss Forest, to the west', 'Elder Wren\u2019s gym'], ['frosthold', 'Frosthold', 'past Frost Peaks, to the north', 'Glacia\u2019s gym'], ['cinderport', 'Cinderport', 'past Ember Fields, to the south', 'Blaze\u2019s gym'], ['coralbay', 'Coralbay', 'past Tide Shore, to the east', 'Admiral Coral\u2019s gym'], ['peak', "Champion's Peak", 'up the trail north of the plaza', 'The Tower']];
    const cnode = ([id, name, where, what]) => { const v = test || vis.indexOf(id) !== -1, isHere = here === id;
      return '<div class="mnode' + (v ? '' : ' locked') + (isHere ? ' here' : '') + '" style="min-width: 0; overflow-wrap: break-word"><b>' + (v ? name : 'Undiscovered') + '</b><span>' + (v ? what : 'Somewhere ' + where) + '</span>' + (isHere ? '<span class="you">You are here</span>' : (v ? '<button data-travel="' + id + '">Travel here</button>' : '<span class="lk">Find it on foot first</span>')) + '</div>'; };
    $('wm-grid').innerHTML = '<div></div>' + node('frost', 'n') + '<div></div>' + node('moss', 'w') + node('town', 'c') + node('tide', 'e') + '<div></div>' + node('ember', 's') + '<div></div>' +
      '<div style="grid-column: 1 / -1; font-weight: 900; margin-top: 6px">Cities and the Peak</div>' + '<div style="grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: inherit">' + CITY.map(cnode).join('') + '</div>';
    $('wm-tod').textContent = { night: 'Night: Dusk critters roam every zone.', dawn: 'Dawn', dusk: 'Dusk', day: 'Daytime' }[timeOfDay()];
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
    setInterval(musicLoop, 400);
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
      onMap: (m) => { plank(m.name); setNear(null); if (game && (m.city || m.id === 'peak') && (game.state.visited || []).indexOf(m.id) === -1) game.update({ visited: (game.state.visited || []).concat([m.id]) }); if (m.id !== 'town' && m.rate > 0 && game) setTimeout(() => hint('zone', 'Each zone has its own two types. The sparkling patch is rare grass with better odds.'), 900); },
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
    CLOUD.init({ onStatus: cloudStatus, onConflict: showConflict, onAdopt: () => { window.__saveFrozen = true; try { sessionStorage.setItem('critter-roll:adopted', '1'); } catch (e) {} location.reload(); } });
  }
  return { start, schedule, close, open: openScreen, encounter, objective, chooseStarter, hint, openPanel, closePanel, buy, useItem, setParty, openMenu, closeMenu, talk, advance, startTrainer, openMap, closeMap, travel, openBackup, exportCode, readCode, timeOfDay, get dialog() { return dlg; }, get game() { return game; }, toast };
})();
window.addEventListener('DOMContentLoaded', APP.start);
