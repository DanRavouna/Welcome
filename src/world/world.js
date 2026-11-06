// ---- World: Sproutvale + four zones, rendering, movement, exits, encounters ----
const WORLD = (() => {
  const TS = 32;
  const SOLID = new Set(['T', 'X', '~', 'F', 'G', 'O', 'R', 'w', 'b', 's', 't', 'p', 'k', 'h', 'm', 'a', 'x', 'n', 'C']);   // a = altar, x = stair, n = bell post (interiors) // C = cave wall
  function rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const THEMES = {
    town: { ground: '#62BE45', blade: 'rgba(40,110,30,0.45)', path: '#E2CB95', water: '#4FA3E8', tall: '#3E9A33', tallBlade: '#2F7D2E', tree: 'round', bg: '#2F7D2E', flowers: ['#FFFFFF', '#FFD86B', '#F59ACB'] },
    frost: { ground: '#E6EFF8', blade: 'rgba(120,150,190,0.35)', path: '#A7BFD9', water: '#BFE3F5', tall: '#9CC9D9', tallBlade: '#5E97AE', tree: 'pine', bg: '#C9D9EA', flowers: ['#FFFFFF', '#BBD5FF'], ice: true },
    ember: { ground: '#D49A5E', blade: 'rgba(120,60,20,0.35)', path: '#B9824C', water: '#FF6A2B', tall: '#C7A23A', tallBlade: '#8E6B1E', tree: 'dead', bg: '#7A4A26', flowers: ['#FFD86B', '#FF8A3D'], lava: true },
    moss: { ground: '#4E9A3E', blade: 'rgba(20,70,20,0.5)', path: '#B99B6A', water: '#3F8FC8', tall: '#2E7D33', tallBlade: '#1D5A24', tree: 'round', bg: '#1F5A24', flowers: ['#F59ACB', '#FFFFFF', '#C9A8FF'], dense: true },
    tide: { ground: '#F0DCA6', blade: 'rgba(150,120,60,0.3)', path: '#E2C98E', water: '#2F8FD8', tall: '#B9C46A', tallBlade: '#7E8A32', tree: 'palm', bg: '#1F6FB0', flowers: ['#FFFFFF', '#F59ACB'] }
  };
  THEMES.peak = { ground: '#8DB07A', blade: 'rgba(50,80,40,0.35)', path: '#C9C3D6', water: '#6FB6E8', tall: '#6E8E5E', tallBlade: '#4E6E40', tree: 'pine', bg: '#4E5E7A', flowers: ['#FFFFFF', '#C9A8FF', '#FFD86B'] };
  THEMES.frosthold = { ground: '#E6EFF8', blade: 'rgba(120,150,190,0.35)', path: '#9AA3B5', water: '#BFE3F5', tall: '#9CC9D9', tallBlade: '#5E97AE', tree: 'pine', bg: '#C9D9EA', flowers: ['#FFFFFF', '#BBD5FF'] };
  THEMES.cinderport = { lava: true, ground: '#C9925C', blade: 'rgba(110,60,20,0.35)', path: '#7A6A62', water: '#FF6A2B', tall: '#B9963A', tallBlade: '#8E6B1E', tree: 'dead', bg: '#5A3418', flowers: ['#FFD86B', '#FF8A3D'] };
  THEMES.coralbay = { ground: '#F2DFA8', blade: 'rgba(150,120,60,0.3)', path: '#C9A070', water: '#2F8FD8', tall: '#B9C46A', tallBlade: '#7E8A32', tree: 'palm', bg: '#1F6FB0', flowers: ['#FFFFFF', '#F59ACB'] };
  THEMES['dg-arch'] = { ground: '#262B40', blade: 'rgba(10,12,24,0.35)', path: '#515A7C', water: '#1E3A5F', tall: '#2E4A4A', tallBlade: '#1E3434', tree: 'dead', bg: '#0A0C18', flowers: ['#7AA0FF'], cave: true };
  THEMES.ascent = { ground: '#E8F0F8', blade: 'rgba(120,150,190,0.35)', path: '#A8B8D0', water: '#7FB8E0', tall: '#9CC9D9', tallBlade: '#5E97AE', tree: 'pine', bg: '#9FB4D0', flowers: ['#FFFFFF', '#BBD5FF'], ice: true };
  THEMES['gym-glacia'] = { ground: '#DCEFF8', blade: 'rgba(120,150,190,0.3)', path: '#B4C9E0', water: '#1E3A5F', tall: '#9CC9D9', tallBlade: '#5E97AE', tree: 'pine', bg: '#101A2A', flowers: ['#FFFFFF'], cave: true };
  THEMES['gym-blaze'] = { ground: '#6A4A3A', blade: 'rgba(20,10,10,0.3)', path: '#8A6A5A', water: '#FF6A2B', tall: '#6A4A38', tallBlade: '#3A2A20', tree: 'dead', bg: '#1A0E0A', flowers: ['#FF8A3D'], cave: true };
  THEMES['gym-coral'] = { ground: '#2A3A4A', blade: 'rgba(10,20,40,0.3)', path: '#3E5068', water: '#1E3A5F', tall: '#2E4A4A', tallBlade: '#1E3434', tree: 'palm', bg: '#08101C', flowers: ['#7AA0FF'], cave: true };
  THEMES['gym-wren'] = { ground: '#6E9A4A', blade: 'rgba(20,70,20,0.3)', path: '#B99B6A', water: '#3F8FC8', tall: '#2E7D33', tallBlade: '#1D5A24', tree: 'round', bg: '#2A1E12', flowers: ['#F5A3D0', '#FFFFFF'], cave: true };
  THEMES['dg-lamp'] = { ground: '#C9BFA8', blade: 'rgba(120,100,70,0.25)', path: '#E4DAC2', water: '#7FB8E0', tall: '#9CB89A', tallBlade: '#6A8A68', tree: 'pine', bg: '#8E8470', flowers: ['#FFFFFF'], cave: true };
  THEMES.descent = { ground: '#8A6A58', blade: 'rgba(60,30,20,0.35)', path: '#B08A70', water: '#FF6A2B', tall: '#C7A23A', tallBlade: '#8E6B1E', tree: 'dead', bg: '#3A1E14', flowers: ['#FFD86B', '#FF8A3D'], lava: true };
  THEMES['dg-forge'] = { ground: '#4A3A38', blade: 'rgba(20,10,10,0.35)', path: '#8A6A5A', water: '#FF6A2B', tall: '#6A4A38', tallBlade: '#3A2A20', tree: 'dead', bg: '#1A0E0A', flowers: ['#FF8A3D'], cave: true, lava: true };
  THEMES['route-mf'] = THEMES.peak; THEMES['route-cm'] = Object.assign({}, THEMES.moss, { dense: false }); THEMES['route-fc'] = THEMES.frost; THEMES['route-cc'] = THEMES.tide;
  THEMES.mossbrook = { ground: '#5FA34A', blade: 'rgba(30,80,30,0.4)', path: '#C9A878', water: '#4F9AD0', tall: '#44803A', tallBlade: '#2A6A2C', tree: 'round', bg: '#2A5A2C', flowers: ['#F5A3D0', '#FFFFFF', '#FFD86B'] };
  const ZONES = {
    frost: { name: 'Frost Peaks', types: ['Frost', 'Stone'], from: 'n', seed: 11 },
    ember: { name: 'Ember Fields', types: ['Ember', 'Volt'], from: 's', seed: 22 },
    moss: { name: 'Moss Forest', types: ['Moss', 'Bloom'], from: 'w', seed: 33 },
    tide: { name: 'Tide Shore', types: ['Tide', 'Dusk'], from: 'e', seed: 44 },
    // routes between neighbouring cities (built like zones, linked at both ends)
    'route-mf': { name: 'Highland Pass', types: ['Moss', 'Frost'], from: 'n', seed: 55, route: true },
    'route-cm': { name: 'Ashwood Trail', types: ['Ember', 'Moss'], from: 'w', seed: 66, route: true },
    'route-fc': { name: 'Glacier Coast', types: ['Frost', 'Tide'], from: 'e', seed: 77, route: true },
    'route-cc': { name: 'Reef Causeway', types: ['Tide', 'Ember'], from: 's', seed: 88, route: true }
  };
  const ALL_TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];

  // ---------- town ----------
  function buildTown() {
    const W = 44, H = 34, m = []; for (let y = 0; y < H; y++) m.push(new Array(W).fill('.'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = c; };
    const r = rng(20261101);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 || (e < 3 && r() < 0.6)) set(x, y, 'T'); }
    for (let x = 0; x < W; x++) { set(x, 16, '='); set(x, 17, '='); }
    for (let y = 0; y < H; y++) { set(21, y, '='); set(22, y, '='); }
    for (let y = 12; y <= 21; y++) for (let x = 16; x <= 27; x++) set(x, y, '=');
    for (let y = 9; y <= 14; y++) for (let x = 7; x <= 15; x++) { const dx = (x - 11) / 4.2, dy = (y - 11.5) / 2.6; if (dx * dx + dy * dy <= 1) set(x, y, '~'); }
    set(21, 19, 'O'); set(22, 19, 'O'); set(21, 20, 'O'); set(22, 20, 'O');
    const places = [
      { id: 'home', name: 'Your home', x: 5, y: 4, w: 7, h: 5, roof: '#D8574A', door: [8, 8], open: 'badges' },
      { id: 'lab', name: 'Critter Lab', x: 31, y: 4, w: 8, h: 6, roof: '#3C6FE0', door: [34, 9], open: 'dex' },
      { id: 'shrine', name: 'Roll Shrine', x: 31, y: 23, w: 6, h: 5, kind: 'shrine', door: [33, 27], open: 'roll' },
      { id: 'arena', name: 'Arena', x: 5, y: 23, w: 9, h: 6, kind: 'arena', door: [9, 28], open: 'battle' },
      { id: 'board', name: 'Quest board', x: 19, y: 12, w: 4, h: 1, kind: 'board', door: [20, 12], open: 'badges' }
    ];
    places.forEach((p) => {
      for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) set(x, y, 'X');
      const [dx, dy] = p.door, fy = dy + 1, target = fy <= 16 ? 16 : 17, step = target > fy ? 1 : -1;
      for (let y = fy; y !== target + step; y += step) { set(dx, y, '='); set(dx + 1, y, '='); }
    });
    for (let x = 4; x <= 12; x++) if (m[3][x] !== 'T') set(x, 3, 'F');
    [[17, 3, 4, 3], [26, 28, 5, 3], [3, 19, 3, 4], [37, 12, 4, 3]].forEach(([x0, y0, w, h]) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (m[y][x] === '.') set(x, y, 'W'); });
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (m[y][x] !== '.') continue;
      let near = false; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (['=', 'X', 'O', 'F'].includes(m[yy][xx])) near = true;
      const v = r(); if (!near && v < 0.06) set(x, y, 'T'); else if (!near && v < 0.075) set(x, y, 'R'); else if (v < 0.2) set(x, y, ',');
    }
    const signs = [
      { x: 19, y: 2, to: 'frost', text: 'North: Frost Peaks (Frost and Stone critters). Beyond the peaks lies Frosthold, where Glacia keeps her gym.' },
      { x: 24, y: 31, to: 'ember', text: 'South: Ember Fields (Ember and Volt critters). Past the fields, Blaze runs the forge gym of Cinderport.' },
      { x: 2, y: 14, to: 'moss', text: 'West: Moss Forest (Moss and Bloom critters). Elder Wren waits in Mossbrook, on the far side of the forest.' },
      { x: 41, y: 19, to: 'tide', text: 'East: Tide Shore (Tide and Dusk critters). Follow the boardwalk past the shore to reach Admiral Coral in Coralbay.' }
    ];
    signs.forEach((s) => set(s.x, s.y, 'G'));
    // the opening (Meaning: being kept is the first thing played): a patch of tall grass beside Home's path, and a lamp lit by day on the one open gate
  [[5, 9], [6, 9], [5, 10], [6, 10], [5, 11], [6, 11]].forEach(([x, y]) => { if (['.', ','].indexOf(m[y][x]) !== -1) m[y][x] = 'W'; });
  m[15][3] = 'O'; const openingObjects = [{ id: 'gate-lamp', kind: 'postlamp', day: true, x: 3, y: 15, reach: 1.7, text: 'A lamp on a post by the gate. Lit, in daylight. Someone keeps it that way.' }];
  // trail north to Vigil Peak: stamped after the decor pass so the seeded scatter (and every other tile) is unchanged
    for (let y = 0; y <= 11; y++) { set(26, y, '='); set(27, y, '='); }
    set(28, 10, 'G'); signs.push({ x: 28, y: 10, to: 'peak', text: "North: Vigil Peak. The trail opens to trainers holding all 4 Leader Seals." });
    places.forEach((p) => { const [dx, dy] = p.door; [[dx, dy + 1], [dx + 1, dy + 1]].forEach(([x, y]) => set(x, y, '=')); });
    return {
      id: 'town', name: 'Sproutvale', theme: THEMES.town, grid: m, W, H, places, signs, objects: openingObjects, types: ALL_TYPES, rate: 0.08,
      exits: [
        { edge: 'n', a: 21, b: 22, to: 'frost' }, { edge: 's', a: 21, b: 22, to: 'ember' },
        { edge: 'w', a: 16, b: 17, to: 'moss' }, { edge: 'e', a: 16, b: 17, to: 'tide' }, { edge: 'n', a: 26, b: 27, to: 'peak' }
      ],
      arriveFrom: { peak: [26.9, 1.2] },
      arrive: { n: [21.9, 1.2], s: [21.9, 32.6], w: [1.2, 17.2], e: [42.8, 17.2] },
      spawn: [8.9, 9.4]   // the opening: at the door of Home, the window above you, the road ahead
    };
  }

  // ---------- zones ----------
  function buildZone(id) {
    const z = ZONES[id], th = THEMES[id], W = 34, H = 28, r = rng(z.seed * 7919);
    const m = []; for (let y = 0; y < H; y++) m.push(new Array(W).fill('.'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = c; };
    const get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? m[y][x] : 'T');
    // town is on side `back`
    const back = { n: 's', s: 'n', w: 'e', e: 'w' }[z.from];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 || (e < 3 && r() < 0.55)) set(x, y, 'T'); }
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    // entrance gap + path toward center
    let ex, ey;
    if (back === 's') { ex = cx; ey = H - 1; } else if (back === 'n') { ex = cx; ey = 0; } else if (back === 'w') { ex = 0; ey = cy; } else { ex = W - 1; ey = cy; }
    const carve = (x0, y0, x1, y1) => {
      let x = x0, y = y0;
      while (x !== x1 || y !== y1) {
        set(x, y, '='); set(x + (back === 'w' || back === 'e' ? 0 : 1), y + (back === 'w' || back === 'e' ? 1 : 0), '=');
        if (x !== x1 && (y === y1 || r() < 0.5)) x += x1 > x ? 1 : -1; else if (y !== y1) y += y1 > y ? 1 : -1;
      }
      set(x, y, '=');
    };
    carve(ex, ey, cx, cy);
    // ocean strip for the shore (far side east)
    if (id === 'tide') for (let y = 0; y < H; y++) for (let x = W - 7; x < W; x++) set(x, y, '~');
    // pools: ice (frost), lava (ember), pond (moss)
    if (id !== 'tide') {
      const px = id === 'moss' ? 9 : 24, py = id === 'ember' ? 8 : 20;
      for (let y = py - 3; y <= py + 3; y++) for (let x = px - 4; x <= px + 4; x++) { const dx = (x - px) / 4, dy = (y - py) / 2.4; if (dx * dx + dy * dy <= 1 && get(x, y) !== '=') set(x, y, '~'); }
    }
    // loop path through the zone
    const ring = [[7, 6], [W - 9, 6], [W - 9, H - 7], [7, H - 7]];
    for (let i = 0; i < 4; i++) { const [a1, b1] = ring[i], [a2, b2] = ring[(i + 1) % 4]; let x = a1, y = b1; while (x !== a2 || y !== b2) { if (get(x, y) !== '~') set(x, y, '='); if (x !== a2) x += a2 > x ? 1 : -1; else y += b2 > y ? 1 : -1; } }
    carve(cx, cy, ring[0][0], ring[0][1]);
    // tall grass blobs
    const blobs = [[6, 9], [W - 10, 10], [11, H - 6], [W - 12, H - 5], [cx - 4, 4], [cx + 5, cy + 2]];
    blobs.forEach(([bx, by]) => { const rw = 2 + Math.floor(r() * 2), rh = 2 + Math.floor(r() * 2); for (let y = by - rh; y <= by + rh; y++) for (let x = bx - rw; x <= bx + rw; x++) { const dx = (x - bx) / (rw + 0.5), dy = (y - by) / (rh + 0.5); if (dx * dx + dy * dy <= 1 && get(x, y) === '.') set(x, y, 'W'); } });
    // rare grass in the corner farthest from the entrance
    const rx = back === 'e' ? 5 : (back === 'w' ? W - 12 : W - 8), ry = back === 's' ? 4 : (back === 'n' ? H - 6 : 4);
    for (let y = ry; y < ry + 3; y++) for (let x = rx; x < rx + 3; x++) set(x, y, 'Z');
    carve(rx + 1, ry + 1, cx, cy);
    // scatter
    const dens = th.dense ? 0.16 : (id === 'frost' ? 0.08 : 0.05);
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (get(x, y) !== '.') continue;
      let near = false; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (['=', 'Z'].includes(get(xx, yy))) near = true;
      const v = r(); if (!near && v < dens) set(x, y, 'T'); else if (!near && v < dens + 0.025) set(x, y, 'R'); else if (v < dens + 0.13) set(x, y, ',');
    }
    // entrance sign beside the path
    const sx = back === 's' || back === 'n' ? ex + 3 : (back === 'w' ? 3 : W - 4), sy = back === 's' ? H - 4 : (back === 'n' ? 3 : ey + 3);
    set(sx, sy, 'G');
    // re-open the entrance (border trees may cover it)
    for (let k = 0; k < 4; k++) { if (back === 's' || back === 'n') { const yy = back === 's' ? H - 1 - k : k; set(ex, yy, '='); set(ex + 1, yy, '='); } else { const xx = back === 'w' ? k : W - 1 - k; set(xx, ey, '='); set(xx, ey + 1, '='); } }
    const a = back === 's' || back === 'n' ? ex : ey;
    const arriveAt = { s: [ex + 0.9, H - 1.4], n: [ex + 0.9, 1.4], w: [1.4, ey + 1.2], e: [W - 1.4, ey + 1.2] }[back];
    return {
      id, name: z.name, theme: th, grid: m, W, H, places: [],
      signs: [{ x: sx, y: sy, text: z.name + ': ' + z.types.join(' and ') + ' critters hide in the tall grass. Sparkling grass hides rarer finds.' }],
      types: z.types, rate: 0.12,
      rare: { x: rx, y: ry, w: 3, h: 3 },
      exits: [{ edge: back, a: a, b: a + 1, to: 'town' }],
      arrive: { [back]: arriveAt }, spawn: arriveAt
    };
  }
  // ---------- Vigil Peak: the Tower's own zone (no wild critters) ----------
  function buildPeak() {
    const W = 26, H = 24, r = rng(9091);
    const m = []; for (let y = 0; y < H; y++) m.push(new Array(W).fill('.'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = c; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 || (e < 3 && r() < 0.6)) set(x, y, 'T'); }
    for (let y = 9; y < H; y++) { set(12, y, '='); set(13, y, '='); }                         // main trail
    for (let y = 9; y <= 11; y++) for (let x = 8; x <= 17; x++) set(x, y, '=');               // summit plaza
    [[5, 15], [19, 14], [6, 19], [20, 19], [17, 17]].forEach(([x, y]) => set(x, y, 'R'));     // boulders
    for (let y = 13; y <= 15; y++) for (let x = 3; x <= 7; x++) { const dx = (x - 5) / 2.4, dy = (y - 14) / 1.4; if (dx * dx + dy * dy <= 1 && m[y][x] === '.') set(x, y, '~'); } // tarn
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { if (m[y][x] !== '.') continue; const v = r(); if (v < 0.06 && (x < 9 || x > 16)) set(x, y, 'T'); else if (v < 0.2) set(x, y, ','); }
    const tower = { id: 'tower', name: "The Long Watch", x: 10, y: 3, w: 6, h: 6, kind: 'tower', door: [12, 8], open: 'tower' };
    for (let y = 2; y < 9; y++) for (let x = 9; x <= 16; x++) set(x, y, y >= 3 && x >= 10 && x <= 15 ? 'X' : (m[y][x] === 'T' || m[y][x] === 'R' ? '.' : m[y][x]));
    for (let k = 0; k < 4; k++) { set(12, H - 1 - k, '='); set(13, H - 1 - k, '='); }
    set(15, 20, 'G');
    return {
      id: 'peak', name: "Vigil Peak", theme: THEMES.peak, grid: m, W, H, places: [tower],
      signs: [{ x: 15, y: 20, text: "Vigil Peak. The Long Watch stands at the summit. Twenty nights, one lamp." }],
      types: [], rate: 0,
      exits: [{ edge: 's', a: 12, b: 13, to: 'town' }],
      arrive: { s: [12.9, H - 1.4] }, spawn: [12.9, H - 1.4]
    };
  }
  // ---------- cities ----------
  // Mossbrook: village past Moss Forest's west edge (Elder Wren's gym)
  function buildMossbrook() {
    const W = 36, H = 28, r = rng(5151);
    const m = []; for (let y = 0; y < H; y++) m.push(new Array(W).fill('.'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = c; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 || (e < 3 && r() < 0.6)) set(x, y, 'T'); }
    const path = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y, '='); };
    path(4, 13, W - 1, 14);                         // main street from the east gate
    path(14, 10, 21, 17);                           // village green
    const places = [
      { id: 'gym-wren', name: "Wren's Gym", x: 13, y: 2, w: 10, h: 6, kind: 'gym', door: [17, 7], open: 'gym', leader: 'wren', color: '#4FB06D', roof: '#4E8A3A' },
      { id: 'herbs', name: 'Herb Hut', x: 4, y: 6, w: 5, h: 4, kind: 'house', door: [6, 9], open: 'shop', roof: '#8E5BC8', wall: '#E8D7B0' },
      { id: 'house-fennel', name: "Fennel's House", x: 26, y: 5, w: 5, h: 4, kind: 'house', door: [28, 8], open: 'house', roof: '#C0503A', wall: '#E8D7B0', text: 'A kettle whistles inside.' },
      { id: 'house-moss', name: 'Mosscap Cottage', x: 6, y: 18, w: 5, h: 4, kind: 'house', door: [8, 21], open: 'house', roof: '#5E8E3A', wall: '#D9C29A', text: 'A note on the door: "Out foraging. Back by dusk."' },
      { id: 'house-bryn', name: "Bryn's House", x: 25, y: 18, w: 5, h: 4, kind: 'house', door: [27, 21], open: 'house', roof: '#D9A03A', wall: '#E8D7B0', text: 'Crayon drawings of critters cover the window. Every one has stars around it.' }
    ];
    places.forEach((p) => { for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) set(x, y, 'X'); });
    path(17, 8, 18, 10); path(6, 10, 7, 13); path(28, 9, 29, 13); path(11, 15, 12, 23); path(8, 22, 12, 23); path(31, 15, 32, 23); path(27, 22, 32, 23);
    for (let y = 23; y <= 25; y++) for (let x = 13; x <= 20; x++) { const dx = (x - 16.5) / 3.6, dy = (y - 24) / 1.3; if (dx * dx + dy * dy <= 1) set(x, y, '~'); } // pond
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (m[y][x] !== '.') continue;
      let near = false; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (m[yy] && ['=', 'X', '~'].includes(m[yy][xx])) near = true;
      const v = r(); if (!near && v < 0.11) set(x, y, 'T'); else if (v < 0.24) set(x, y, ',');
    }
    places.forEach((p) => { const [dx, dy] = p.door; set(dx, dy + 1, '='); set(dx + 1, dy + 1, '='); });
    for (let k = 0; k < 4; k++) { set(W - 1 - k, 13, '='); set(W - 1 - k, 14, '='); }
    const signs = [{ x: W - 5, y: 11, text: "Mossbrook: a village under the old trees. Elder Wren's gym stands at the north end." }];
    signs.forEach((sg) => set(sg.x, sg.y, 'G'));
    return {
      id: 'mossbrook', name: 'Mossbrook', city: true, theme: THEMES.mossbrook, grid: m, W, H, places, signs, types: [], rate: 0,
      exits: [{ edge: 'e', a: 13, b: 14, to: 'moss' }],
      arrive: { e: [W - 1.4, 14.2] }, spawn: [W - 1.4, 14.2]
    };
  }
  // generic city: gym north-centre over a plaza, main street, shop + 3 houses; entry road from any edge
  function buildCity(c) {
    const W = 36, H = 28, r = rng(c.seed);
    const m = []; for (let y = 0; y < H; y++) m.push(new Array(W).fill('.'));
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = t; };
    const path = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) set(x, y, '='); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 || (e < 3 && r() < 0.6)) set(x, y, 'T'); }
    if (c.palisade) for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (x === 2 || y === 2 || x === W - 3 || y === H - 3) set(x, y, 'F');
    if (c.sea) for (let y = 0; y < H; y++) for (let x = W - 5; x < W; x++) set(x, y, '~');
    const H3 = c.houses, LY = c.layout || {};
    if (!c.layout) { path(4, 13, c.entry === 'n' ? 33 : W - 5, 14); path(14, 10, 21, 17); }
    (LY.paths || []).forEach((q) => path(q[0], q[1], q[2], q[3]));
    const places = [
      { id: 'gym-' + c.leader, name: c.gymName, x: 13, y: 2, w: 10, h: 6, kind: 'gym', door: [17, 7], open: 'gym', leader: c.leader, color: c.color, roof: c.gymRoof },
      Object.assign({ id: 'shop-' + c.id, name: c.shopName, x: 4, y: 6, w: 5, h: 4, kind: 'house', door: [6, 9], open: 'shop', roof: c.shopRoof, wall: c.wall }, LY.shop || {}),
      Object.assign({ x: 26, y: 5, w: 5, h: 4, kind: 'house', door: [28, 8], open: 'house', wall: c.wall }, H3[0], (LY.houses || [])[0] || {}),
      Object.assign({ x: 6, y: 18, w: 5, h: 4, kind: 'house', door: [8, 21], open: 'house', wall: c.wall }, H3[1], (LY.houses || [])[1] || {}),
      Object.assign({ x: 25, y: 18, w: 5, h: 4, kind: 'house', door: [27, 21], open: 'house', wall: c.wall }, H3[2], (LY.houses || [])[2] || {})
    ];
    places.forEach((p) => { for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) set(x, y, 'X'); });
    if (!c.layout) { path(17, 8, 18, 10); path(6, 10, 7, 13); path(28, 9, 29, 13); path(11, 15, 12, 23); path(8, 22, 12, 23); path(31, 15, 32, 23); path(27, 22, 32, 23); }
    (LY.after || []).forEach((q) => path(q[0], q[1], q[2], q[3]));
    (LY.rocks || []).forEach((q) => { for (let y = q[1]; y <= q[3]; y++) for (let x = q[0]; x <= q[2]; x++) if (m[y][x] === '.' || m[y][x] === 'T') set(x, y, 'R'); });
    if (c.pool) { const [px, py, rx, ry] = c.pool; for (let y = Math.ceil(py - ry); y <= Math.floor(py + ry); y++) for (let x = Math.ceil(px - rx); x <= Math.floor(px + rx); x++) { const dx = (x - px) / rx, dy = (y - py) / ry; if (dx * dx + dy * dy <= 1 && m[y][x] !== '=' && m[y][x] !== 'X') set(x, y, '~'); } }
    let ex;
    if (c.entry === 'e') { path(W - 5, 13, W - 1, 14); ex = { edge: 'e', a: 13, arrive: [W - 1.4, 14.2] }; }
    else if (c.entry === 'w') { path(0, 13, 4, 14); ex = { edge: 'w', a: 13, arrive: [1.4, 14.2] }; }
    else if (c.entry === 's') { path(17, 17, 18, H - 1); ex = { edge: 's', a: 17, arrive: [17.9, H - 1.4] }; }
    else { path(32, 0, 33, LY.northRoadTo || 14); ex = { edge: 'n', a: 32, arrive: [32.9, 1.4] }; }
    if (c.sea && !c.layout) { path(W - 5, 13, W - 2, 14); [[W - 2, 12], [W - 2, 15]].forEach(([x, y]) => set(x, y, 'R')); }
    (LY.piers || []).forEach(([y, x0, x1]) => { path(x0, y, x1, y); set(x1, y - 1, 'R'); set(x1, y + 1, 'R'); });
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (m[y][x] !== '.') continue;
      let near = false; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (m[yy] && ['=', 'X', '~', 'F'].includes(m[yy][xx])) near = true;
      const v = r(); if (!near && v < c.trees) set(x, y, 'T'); else if (!near && v < c.trees + c.rocks) set(x, y, 'R'); else if (v < c.trees + c.rocks + 0.12) set(x, y, ',');
    }
    places.forEach((p) => { const [dx, dy] = p.door; set(dx, dy + 1, '='); set(dx + 1, dy + 1, '='); });
    (c.signs || []).forEach((sg) => set(sg.x, sg.y, 'G'));
    return {
      id: c.id, name: c.name, city: true, theme: THEMES[c.id], grid: m, W, H, places, signs: c.signs || [], types: [], rate: 0,
      exits: [{ edge: ex.edge, a: ex.a, b: ex.a + 1, to: c.from }], arrive: { [ex.edge]: ex.arrive }, spawn: ex.arrive
    };
  }
  const CITY_CFG = {
    frosthold: { id: 'frosthold', name: 'Frosthold', from: 'frost', entry: 's', seed: 6262,
      layout: { // terraces: an avenue climbs to the gym; two terraces split by a rocky ledge
        paths: [[17, 8, 18, 27], [5, 10, 30, 11], [5, 19, 30, 20], [14, 21, 21, 24]],
        shop: { x: 4, y: 6, door: [6, 9] }, houses: [{ x: 25, y: 6, door: [27, 9] }, { x: 5, y: 15, door: [7, 18] }, { x: 26, y: 15, door: [28, 18] }],
        rocks: [[3, 12, 14, 12], [21, 12, 32, 12]] }, leader: 'glacia', color: '#8FD8EA', gymName: "Glacia's Gym", gymRoof: '#5E97AE', shopName: 'Quartermaster', shopRoof: '#4A6A9A', wall: '#DCE2EE', palisade: true, trees: 0.07, rocks: 0.04,
      houses: [{ id: 'fh-a', name: 'Watch House', roof: '#3E6E8E', text: 'A stool scrapes inside. Somebody is awake after all.' }, { id: 'fh-b', name: 'Fur Trader', roof: '#7A5A8E', text: 'A sign says: "Closed for the blizzard season."' }, { id: 'fh-c', name: 'Stone Cottage', roof: '#4E7E9A', text: 'Warm light and the smell of soup. Someone hums inside.' }],
      signs: [{ x: 20, y: 24, text: "Frosthold: the fort at the edge of the peaks. Glacia's gym stands behind the plaza." }] },
    cinderport: { id: 'cinderport', name: 'Cinderport', from: 'ember', entry: 'n', seed: 7373,
      layout: { // market square in front of the forge gym; lava pool to the west
        paths: [[10, 9, 25, 19], [17, 8, 18, 8], [26, 13, 33, 14]], northRoadTo: 14,
        shop: { x: 4, y: 9, door: [6, 12] }, houses: [{ x: 24, y: 3, door: [26, 6] }, { x: 5, y: 20, door: [7, 23] }, { x: 27, y: 20, door: [29, 23] }],
        after: [[6, 13, 9, 14], [26, 7, 27, 12], [10, 20, 11, 25], [7, 24, 11, 25], [25, 20, 26, 25], [26, 24, 30, 25]] }, leader: 'blaze', color: '#FF7A45', gymName: "Blaze's Forge Gym", gymRoof: '#6A3A2A', shopName: 'Forge Market', shopRoof: '#8A4A2A', wall: '#D9C2A8', pool: [5, 16, 2.6, 1.4], trees: 0.05, rocks: 0.06,
      houses: [{ id: 'cp-a', name: 'Smithy', roof: '#5A4A4A', text: 'Clang! Clang! Someone is hammering hot metal inside.' }, { id: 'cp-b', name: 'Ash House', roof: '#9A5A3A', text: 'The door is warm to the touch.' }, { id: 'cp-c', name: 'Miner Lodge', roof: '#6A6A6A', text: 'Muddy boots line the step. The miners are still underground.' }],
      signs: [{ x: 30, y: 3, text: "Cinderport: forge town of the south. Blaze's gym burns at the north end of the plaza." }] },
    coralbay: { id: 'coralbay', name: 'Coralbay', from: 'tide', entry: 'w', seed: 8484,
      layout: { // a boardwalk runs along the shore with two piers; houses face it
        paths: [[0, 13, 29, 14], [28, 2, 29, 25], [17, 8, 18, 12]],
        shop: { x: 4, y: 7, door: [6, 10] }, houses: [{ x: 22, y: 4, door: [24, 7] }, { x: 8, y: 18, door: [10, 21] }, { x: 22, y: 17, door: [24, 20] }],
        after: [[6, 11, 7, 12], [24, 8, 27, 9], [24, 21, 27, 22], [13, 15, 14, 23], [10, 22, 14, 23]],
        piers: [[6, 30, 34], [21, 30, 34]] }, leader: 'coral', color: '#3E8EF7', gymName: "Coral's Harbor Gym", gymRoof: '#2A5A9A', shopName: 'Harbor Market', shopRoof: '#3A8A8A', wall: '#F4EAD6', sea: true, pool: [6, 24, 3, 1.3], trees: 0.05, rocks: 0.02,
      houses: [{ id: 'cb-a', name: 'Lighthouse Keeper', roof: '#D8574A', text: 'Charts and spyglasses fill the window.' }, { id: 'cb-b', name: 'Net Mender', roof: '#4A9A8A', text: 'Fishing nets hang drying over the door.' }, { id: 'cb-c', name: 'Shell House', roof: '#E0A0B8', text: 'Seashells spell out "Welcome" on the doorstep.' }],
      signs: [{ x: 3, y: 11, text: "Coralbay harbor. Admiral Coral's gym looks out over the plaza." }] }
  };
  // carve a trail from a zone's edge inward until it meets an existing path, then add the exit (after the zone's own scatter)
  function linkEdge(M, edge, a, to, arrive) {
    const W = M.W, H = M.H, g = M.grid;
    for (let k = 0; k < Math.max(W, H); k++) {
      const cells = edge === 'w' ? [[k, a], [k, a + 1]] : edge === 'e' ? [[W - 1 - k, a], [W - 1 - k, a + 1]] : edge === 'n' ? [[a, k], [a + 1, k]] : [[a, H - 1 - k], [a + 1, H - 1 - k]];
      if (k > 2 && cells.some(([x, y]) => g[y][x] === '=')) break;
      cells.forEach(([x, y]) => { g[y][x] = '='; });
    }
    M.exits.push({ edge: edge, a: a, b: a + 1, to: to });
    M.arriveFrom = Object.assign({}, M.arriveFrom, { [to]: arrive });
  }
  const MAPS = { town: buildTown(), peak: buildPeak(), ascent: buildAscent(), descent: buildDescent(), mossbrook: buildMossbrook(), frosthold: buildCity(CITY_CFG.frosthold), cinderport: buildCity(CITY_CFG.cinderport), coralbay: buildCity(CITY_CFG.coralbay), frost: buildZone('frost'), ember: buildZone('ember'), moss: buildZone('moss'), tide: buildZone('tide'),
    'route-mf': buildZone('route-mf'), 'route-cm': buildZone('route-cm'), 'route-fc': buildZone('route-fc'), 'route-cc': buildZone('route-cc') };
  linkEdge(MAPS.moss, 'w', 14, 'mossbrook', [1.2, 15.2]);
  MAPS.moss.grid[12][3] = 'G'; MAPS.moss.signs.push({ x: 3, y: 12, to: 'mossbrook', text: 'West: Mossbrook village, home of Elder Wren.' });
  linkEdge(MAPS.frost, 'n', 17, 'frosthold', [17.9, 1.2]); MAPS.frost.grid[3][20] = 'G'; MAPS.frost.signs.push({ x: 20, y: 3, to: 'frosthold', text: "North: Frosthold, the fort town. Glacia's gym is there." });
  linkEdge(MAPS.ember, 's', 17, 'cinderport', [17.9, MAPS.ember.H - 1.4]); MAPS.ember.grid[MAPS.ember.H - 4][20] = 'G'; MAPS.ember.signs.push({ x: 20, y: MAPS.ember.H - 4, to: 'cinderport', text: "South: Cinderport, the forge town. Blaze's gym is there." });
  linkEdge(MAPS.tide, 'e', 14, 'coralbay', [MAPS.tide.W - 1.4, 15.2]); MAPS.tide.grid[12][24] = 'G'; MAPS.tide.signs.push({ x: 24, y: 12, to: 'coralbay', text: "East, along the boardwalk: Coralbay harbor. Admiral Coral's gym is there." });
  // ---------- props: reusable landmarks (defs in landmarks.js) ----------
  // addProp(map, id, [x, y], text?) puts a landmark near the hint spot: the nearest legal place (clear ground, off paths, grass and water,
  // away from the borders and the reserved rectangle) gets the solid footprint, plus a signpost with the lore line just below it.
  function addProp(Mp, id, hint, text, reserved) {
    const d = LAND.defs[id]; if (!d) return null;
    const fp = LAND.foot(d), okTile = (x, y) => x >= 4 && y >= 4 && x < Mp.W - 4 && y < Mp.H - 4 && ['.', ',', 'T', 'R'].indexOf(Mp.grid[y][x]) !== -1;
    const blocked = (x, y) => (reserved || []).some(([a, b, c, e]) => x >= a && x <= c && y >= b && y <= e);
    const hasSign = !!(text || d.text), need = (px, py) => { for (let y = py - 1; y <= py + d.h + (hasSign ? 1 : 0); y++) for (let x = px - 1; x <= px + d.w; x++) { if (blocked(x, y)) return false; const inside = x >= px && x < px + d.w && y >= py && y < py + d.h; if (inside || (y === py + d.h && x === px + Math.floor((d.w - 1) / 2)) ? !okTile(x, y) : ['=', 'Z', '~', 'G', 'X', 'W'].indexOf(Mp.grid[y] ? Mp.grid[y][x] : 'T') !== -1) return false; } return true; };
    for (let rad = 0; rad < 14; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const px = hint[0] + dx, py = hint[1] + dy; if (!need(px, py)) continue;
      for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) Mp.grid[py + y][px + x] = fp[y][x] === 'X' ? 'X' : '.';
      (Mp.props = Mp.props || []).push({ id: id, x: px, y: py, w: d.w, h: d.h });
      if (hasSign) { const sx = px + Math.floor((d.w - 1) / 2), sy = py + d.h; Mp.grid[sy][sx] = 'G'; (Mp.signs = Mp.signs || []).push({ x: sx, y: sy, text: text || d.text }); }
      return { x: px, y: py };
    }
    return null;
  }
  // which landmarks stand on which map (hint spot, optional lore override). Future routes and cities: just add rows.
  const PROPS = {
    descent: [['camp', [6, 7]], ['cairn', [24, 15], ''], ['cairn', [6, 19], ''], ['cairn', [24, 27], ''], ['cairn', [6, 35], ''], ['cairn', [24, 43], '']],
    ascent: [['camp', [6, 57]], ['cairn', [24, 50], ''], ['cairn', [6, 46], ''], ['cairn', [24, 38], ''], ['cairn', [6, 30], ''], ['cairn', [24, 22], '']],
    'route-mf': [['ruin', [9, 17]], ['cairn', [26, 9]], ['cairn', [7, 11], '']],
    'route-cm': [['camp', [25, 18]], ['well', [8, 9]], ['cairn', [27, 7]]],
    'route-fc': [['lighthouse', [27, 8]], ['cairn', [8, 18]]],
    'route-cc': [['wreck', [8, 17]], ['cairn', [24, 6]]]
  };
  const PROP_RESERVED = [[13, 3, 19, 11]]; // the route trainer's stand and sight line (routes only)
  Object.keys(PROPS).forEach((mid) => PROPS[mid].forEach(([id, hint, text]) => addProp(MAPS[mid], id, hint, text === '' ? null : text, mid.indexOf('route-') === 0 ? PROP_RESERVED : [])));
  // ---------- wild networks: a route made of several maps with forks, loops and dead ends (no guide arrows: the player explores) ----------
  // buildWild(spec): { id, base (the route it belongs to: climate, music, palette, level gate), name, W, H, seed, types, hub:[x,y], doors:[{edge,a}], nooks:[{x,y,r,from?}],
  //   rare: nook index (a 3x3 rare patch in that clearing), grass: blobs, rate, objects:[{id,kind,x,y,reward,text}], signs:[{x,y,text}], talk? }
  // Every door gets a winding 2-wide path to the hub and every nook a path to the hub or to `from`, so all doors and nooks are connected. Doors are linked with connect().
  function buildWild(spec) {
    const W = spec.W || 34, H = spec.H || 28, r = rng(spec.seed * 7919), th = THEMES[spec.base], m = [];
    for (let y = 0; y < H; y++) m.push(new Array(W).fill('.'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = c; }, get = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? m[y][x] : 'T');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); if (e < 2 || (e < 3 && r() < 0.55)) set(x, y, 'T'); }
    const hub = spec.hub || [Math.floor(W / 2), Math.floor(H / 2)];
    const brush = (x, y) => { set(x, y, '='); set(x + 1, y, '='); set(x, y + 1, '='); set(x + 1, y + 1, '='); };
    const path = (x0, y0, x1, y1) => { let x = x0, y = y0, horiz = r() < 0.5; while (x !== x1 || y !== y1) { const run = 3 + Math.floor(r() * 5); for (let k = 0; k < run && (x !== x1 || y !== y1); k++) { brush(x, y); if (horiz && x !== x1) x += x1 > x ? 1 : -1; else if (!horiz && y !== y1) y += y1 > y ? 1 : -1; else horiz = !horiz; } horiz = !horiz; } brush(x1, y1); };   // trails go in straight runs of 3 to 7 tiles with a bend between, not a one-tile staircase
    const way = (x0, y0, x1, y1) => { const wx = Math.max(5, Math.min(W - 7, Math.round((x0 + x1) / 2 + (r() - 0.5) * 12))), wy = Math.max(5, Math.min(H - 7, Math.round((y0 + y1) / 2 + (r() - 0.5) * 12))); path(x0, y0, wx, wy); path(wx, wy, x1, y1); };   // a path bends through a random waypoint
    const nooks = spec.nooks || [];
    nooks.forEach((n) => { for (let y = n.y - n.r; y <= n.y + n.r; y++) for (let x = n.x - n.r; x <= n.x + n.r; x++) if ((x - n.x) ** 2 + (y - n.y) ** 2 <= n.r * n.r + 1) set(x, y, '.'); });
    (spec.doors || []).forEach((d) => { const [sx, sy] = d.edge === 'n' ? [d.a, 0] : d.edge === 's' ? [d.a, H - 2] : d.edge === 'w' ? [0, d.a] : [W - 2, d.a]; way(sx, sy, hub[0], hub[1]); });
    nooks.forEach((n) => { const f = n.from || hub; way(f[0], f[1], n.x, n.y); });
    for (let i = 0; i < (spec.grass == null ? 5 : spec.grass); i++) {
      const bx = 6 + Math.floor(r() * (W - 12)), by = 6 + Math.floor(r() * (H - 12)), rw = 2 + Math.floor(r() * 2), rh = 2 + Math.floor(r() * 2);
      for (let y = by - rh; y <= by + rh; y++) for (let x = bx - rw; x <= bx + rw; x++) { const dx = (x - bx) / (rw + 0.5), dy = (y - by) / (rh + 0.5); if (dx * dx + dy * dy <= 1 && get(x, y) === '.') set(x, y, 'W'); }
    }
    if (spec.rare != null && nooks[spec.rare]) { const n = nooks[spec.rare]; for (let y = n.y - 3; y <= n.y - 1; y++) for (let x = n.x - 1; x <= n.x + 1; x++) if (get(x, y) !== '=') set(x, y, 'Z'); }
    // what the land does: trees stand in stands and groves with meadow between them, each kind of route has its own feature (ridge, boulders, inlet, pools), and the ground near any path, clearing, object or the hub stays open so a walker always finds the way
    const prot = []; for (let y = 0; y < H; y++) prot.push(new Array(W).fill(false));
    const guard = (cx, cy, rad) => { for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) if (x >= 0 && y >= 0 && x < W && y < H) prot[y][x] = true; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y][x] === '=' || m[y][x] === 'Z') guard(x, y, 2);
    nooks.forEach((n) => guard(n.x, n.y, n.r + 2)); (spec.objects || []).forEach((o) => guard(o.x, o.y, 2)); (spec.signs || []).forEach((sg) => guard(sg.x, sg.y, 2)); guard(hub[0], hub[1], 3);
    (spec.keep || []).forEach((k) => guard(k[0], k[1], 3));
    const nearPath = (x, y, d) => { for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (get(xx, yy) === '=') return true; return false; };
    const free = (x, y) => x >= 3 && y >= 3 && x < W - 3 && y < H - 3 && !prot[y][x] && get(x, y) === '.';
    const blob = (cx, cy, rx, ry, ch, edge) => { for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) { const dx = (x - cx) / (rx + 0.4), dy = (y - cy) / (ry + 0.4); if (dx * dx + dy * dy <= 1 && free(x, y) && r() > edge) set(x, y, ch); } };
    const feature = spec.feature || { 'route-mf': 'ridge', 'route-cm': 'boulders', 'route-fc': 'inlet', 'route-cc': 'pools' }[spec.base];
    if (feature === 'ridge') for (let i = 0, got = 0; i < 40 && got < 2; i++) { const horiz = r() < 0.5, len = 8 + Math.floor(r() * 7), sx = 5 + Math.floor(r() * (W - 10 - (horiz ? len : 0))), sy = 5 + Math.floor(r() * (H - 10 - (horiz ? 0 : len))); let n = 0; for (let k = 0; k < len; k++) if (free(sx + (horiz ? k : 0), sy + (horiz ? 0 : k))) n++; if (n < len - 3) continue; got++; for (let k = 0; k < len; k++) { const x = sx + (horiz ? k : 0), y = sy + (horiz ? 0 : k); if (free(x, y)) set(x, y, 'R'); if (free(x + (horiz ? 0 : 1), y + (horiz ? 1 : 0)) && r() < 0.7) set(x + (horiz ? 0 : 1), y + (horiz ? 1 : 0), 'R'); } }   // a rock ridge with gaps where a trail already crosses it
    if (feature === 'boulders') for (let i = 0, got = 0; i < 40 && got < 5; i++) { const cx = 5 + Math.floor(r() * (W - 10)), cy = 5 + Math.floor(r() * (H - 10)); if (!free(cx, cy)) continue; got++; blob(cx, cy, 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), 'R', 0.3); }
    if (feature === 'inlet' || feature === 'pools') for (let i = 0, got = 0, want = feature === 'inlet' ? 1 : 2; i < 200 && got < want; i++) { const sm = i > 100 ? 1 : 0, rx = (feature === 'inlet' ? 4 : 2 + Math.floor(r() * 2)) - sm, ry = (feature === 'inlet' ? 3 : 2) - (sm && feature === 'inlet' ? 1 : 0), cx = 6 + rx + Math.floor(r() * (W - 12 - 2 * rx)), cy = 6 + ry + Math.floor(r() * (H - 12 - 2 * ry)); let ok = true; for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) if (get(x, y) !== "." || nearPath(x, y, 1) || nooks.some((n) => (x - n.x) ** 2 + (y - n.y) ** 2 <= (n.r + 2) ** 2) || (spec.objects || []).some((o) => Math.abs(o.x - x) < 3 && Math.abs(o.y - y) < 3)) ok = false; if (!ok) continue; got++; for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) { const dx = (x - cx) / (rx + 0.4), dy = (y - cy) / (ry + 0.4), d2 = dx * dx + dy * dy; if (d2 <= 1) set(x, y, '~'); else if (d2 <= 1.6 && r() > 0.4 && get(x, y) === '.') set(x, y, 'R'); } }
    for (let i = 0, n = Math.round(W * H / (th.dense ? 60 : 85)); i < n; i++) blob(4 + Math.floor(r() * (W - 8)), 4 + Math.floor(r() * (H - 8)), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 3), 'T', 0.18);
    const dens = th.dense ? 0.05 : 0.025;
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (get(x, y) !== '.' || prot[y][x]) { if (get(x, y) === '.' && r() < 0.14) set(x, y, ','); continue; }
      const v = r();
      if (v < dens) set(x, y, 'T'); else if (v < dens + 0.02) set(x, y, 'R'); else if (v < dens + 0.16) set(x, y, ',');
    }
    const objects = (spec.objects || []).map((o) => { set(o.x, o.y, 'O'); return Object.assign({ reach: 1.7 }, o); });
    const signs = (spec.signs || []).map((sg) => { set(sg.x, sg.y, 'G'); return sg; });
    return { id: spec.id, base: spec.base, name: spec.name, theme: th, grid: m, W, H, places: [], signs: signs, types: spec.types, rate: spec.rate == null ? 0.12 : spec.rate, exits: [], arriveFrom: {}, arrive: {}, spawn: [hub[0] + 0.5, hub[1] + 0.5], objects: objects };
  }
  // where you stand after arriving through a door on `edge` at position `a`
  const edgeArrival = (M, edge, a) => ({ n: [a + 0.9, 1.4], s: [a + 0.9, M.H - 1.4], w: [1.4, a + 1.2], e: [M.W - 1.4, a + 1.2] }[edge]);
  // link two maps through doors (each door carves its gap and records where you arrive); `arrA` / `arrB` override the arrival spot (the older city doors have their own)
  function doorWild(M, edge, a, to, arrive) {   // a wild map's door: its own path already reaches the border, so only the gap, the exit and the arrival spot are needed
    const W = M.W, H = M.H, g = M.grid;
    for (let k = 0; k < 4; k++) { const cells = edge === 'w' ? [[k, a], [k, a + 1]] : edge === 'e' ? [[W - 1 - k, a], [W - 1 - k, a + 1]] : edge === 'n' ? [[a, k], [a + 1, k]] : [[a, H - 1 - k], [a + 1, H - 1 - k]]; cells.forEach(([x, y]) => { g[y][x] = '='; }); }
    M.exits.push({ edge: edge, a: a, b: a + 1, to: to }); M.arriveFrom = Object.assign({}, M.arriveFrom, { [to]: arrive });
  }
  function connect(MA, edgeA, aA, MB, edgeB, aB, arrA, arrB) {
    (MA.base ? doorWild : linkEdge)(MA, edgeA, aA, MB.id, arrA || edgeArrival(MA, edgeA, aA));
    (MB.base ? doorWild : linkEdge)(MB, edgeB, aB, MA.id, arrB || edgeArrival(MB, edgeB, aB));
  }
  // ---- route networks (data). maps: buildWild specs; links: [mapA, edgeA, aA, mapB, edgeB, aB, arrivalInA?, arrivalInB?]; the city doors keep the arrival spots they always had.
  // Every network: a road between two cities, a bypass loop, at least one dead end, a few unexplained things, and nothing that points the way.
  const NETS = [];
  const NET_META = [];
  // a trail of lantern posts along the road between two doors (Meaning: the road is kept open by people you never meet). Only the posts are placed here; the app lights the one just ahead of you at dusk and night.
  function addTrail(M, fromEdge, toEdge, o) {
    o = o || {}; const kind = o.kind || 'postlamp', step = o.step || 7, start = o.start || 6;
    const W = M.W, H = M.H, g = M.grid, ex = (edge) => M.exits.find((e) => e.edge === edge); const ea = ex(fromEdge), eb = typeof toEdge === 'string' ? ex(toEdge) : { point: toEdge }; if (!ea || !eb) return;
    const cell = (e) => e.point ? (() => { let bc = null, bd = 1e9; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '=') { const d = (x - e.point[0]) ** 2 + (y - e.point[1]) ** 2; if (d < bd) { bd = d; bc = [x, y]; } } return bc; })() : e.edge === 's' ? [e.a, H - 2] : e.edge === 'n' ? [e.a, 1] : e.edge === 'w' ? [1, e.a] : [W - 2, e.a], A = cell(ea), B = cell(eb), key = (x, y) => y * W + x;
    const prev = new Map([[key(A[0], A[1]), null]]), q = [A]; let found = null;
    while (q.length && !found) { const [x, y] = q.shift(); if (x === B[0] && y === B[1]) { found = [x, y]; break; } [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev.has(key(nx, ny)) || g[ny][nx] !== '=') return; prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); }); }
    if (!found) return; const cells = []; for (let c = found; c; c = prev.get(key(c[0], c[1]))) cells.push(c); cells.reverse();
    const lamps = []; for (let i = start; i < cells.length - 5; i += step) {
      const [x, y] = cells[i]; let put = null;
      [[0, -2], [-2, 0], [0, 2], [2, 0], [-1, -2], [1, -2], [-2, -1], [-2, 1]].forEach(([dx, dy]) => { if (put) return; const nx = x + dx, ny = y + dy; if (nx < 3 || ny < 3 || nx > W - 4 || ny > H - 4) return; if (['.', ',', 'T'].indexOf(g[ny][nx]) === -1) return; for (let yy = ny - 1; yy <= ny + 1; yy++) for (let xx = nx - 1; xx <= nx + 1; xx++) if (g[yy][xx] === 'O' || g[yy][xx] === 'G') return; put = [nx, ny]; });
      if (!put) continue; g[put[1]][put[0]] = 'O'; (M.objects = M.objects || []).push(Object.assign({ id: (kind === 'postlamp' ? 'post-' : kind + '-') + M.id + '-' + lamps.length, kind: kind, x: put[0], y: put[1], reach: 1.7, text: o.text || 'A lantern on a post.', trail: i }, o.wave ? { wave: { i: lamps.length, n: 0 } } : {}, o.own ? { own: true } : {})); lamps.push(i);
    }
    if (o.wave) M.objects.forEach((q) => { if (q.wave) q.wave.n = lamps.length; });
    if (!o.kind && !o.wave) M.trail = { cells: cells, lamps: lamps }; else (M.chains = M.chains || []).push({ kind: kind, count: lamps.length });
  }
  // Glacier Coast: a neat row of small returned things beside the water at dawn, and an empty chair facing them (Meaning: what the sea gives back, and someone who tidies it before you wake)
  function addShore(M) {
    const W = M.W, H = M.H, g = M.grid, ok = (x, y) => x > 3 && y > 3 && x < W - 4 && y < H - 4 && ['.', ','].indexOf(g[y][x]) !== -1; let best = null;
    const water = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '~') water.push([x, y]);
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 14; x++) {
      let good = true; for (let k = 0; k < 10 && good; k++) for (let dy = -1; dy <= 1; dy++) if (!ok(x + k, y + dy)) good = false; if (!good) continue;
      let near = false; for (let yy = y - 1; yy <= y + 1 && !near; yy++) for (let xx = x - 1; xx <= x + 10; xx++) if (g[yy] && g[yy][xx] === '=') near = true; if (near) continue;
      const d = water.length ? Math.min.apply(null, water.map((w) => Math.abs(w[0] - (x + 5)) + Math.abs(w[1] - y))) : 0; if (!best || d < best.d) best = { x: x, y: y, d: d };
    }
    if (!best) return; const items = [['sandal', 'One sandal, set down heels together.'], ['cup', 'A cup, the right way up.'], ['boat', 'A toy boat, dry.'], ['comb', 'A comb. The teeth are all there.']];
    items.forEach((it, i) => { const x = best.x + i * 2, y = best.y; g[y][x] = 'O'; (M.objects = M.objects || []).push({ id: 'shore-' + i, kind: 'returned', v: it[0], gate: 'dawn', x: x, y: y, reach: 1.7, text: it[1] }); });
    g[best.y][best.x + 9] = 'O'; M.objects.push({ id: 'shore-chair', kind: 'chair', x: best.x + 9, y: best.y, reach: 1.7, text: 'An empty chair. It faces the row.' });
  }
  // one signature thing per zone (Meaning, see the handoff): placed on the nearest clear ground to a hint, beside the water when asked
  function addSpot(M, o, hx, hy, needWater) {
    // among every tile that is clear, beside a path and (when asked) beside water, take the one that is the LEAST open (most trees and rocks around it) and nearest the hint, so a thing never sits in the middle of the zone's open ground, which action fights need
    const g = M.grid, W = M.W, H = M.H, clear = (x, y) => ['.', ','].indexOf((g[y] || [])[x]) !== -1; let best = null;
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
      if (!clear(x, y)) continue;
      let ok = true, water = false, path = false, open = 0; for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) { const c = (g[yy] || [])[xx]; if (clear(xx, yy)) open++; if (Math.abs(xx - x) <= 2 && Math.abs(yy - y) <= 2) { if (c === '~' && Math.abs(xx - x) + Math.abs(yy - y) <= 2) water = true; if (c === '=') path = true; } if (Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1 && !clear(xx, yy) && !(c === '~' && (xx === x || yy === y))) ok = false; }
      if (needWater) { ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ax, ay]) => clear(x + ax, y + ay)); path = true; }
      if (!ok || !path || (needWater && !water)) continue;
      const score = open * 1.0 + (Math.abs(x - hx) + Math.abs(y - hy)) * 0.35; if (!best || score < best.score) best = { x: x, y: y, score: score };
    }
    if (!best) return false; g[best.y][best.x] = 'O'; (M.objects = M.objects || []).push(Object.assign({ x: best.x, y: best.y, reach: 1.7 }, o)); return true;
  }
  function buildNet(net) {
    net.maps.forEach((sp) => { sp.keep = (net.props || []).filter((pr) => pr[0] === sp.id).map((pr) => pr[2]); const Mp = buildWild(sp); MAPS[Mp.id] = Mp; THEMES[Mp.id] = THEMES[sp.base]; if (PXW.PAL[sp.base]) PXW.PAL[Mp.id] = PXW.PAL[sp.base]; });
    const main = MAPS[net.main]; main.exits = []; main.arriveFrom = {}; main.arrive = {};
    net.links.forEach((l) => connect(MAPS[l[0]], l[1], l[2], MAPS[l[3]], l[4], l[5], l[6] || null, l[7] || null));
    main.spawn = main.arriveFrom[net.spawnFrom];
    (net.props || []).forEach((pr) => addProp(MAPS[pr[0]], pr[1], pr[2], pr[3]));
    (net.trail || []).forEach((t) => addTrail(MAPS[t[0]], t[1], t[2], t[3]));
    (net.causeway || []).forEach(([mid, x1, y1, x2, y2]) => { const g = MAPS[mid].grid; for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (g[y] && g[y][x] === 'W') g[y][x] = '~';
      const open = (x, y) => g[y] && ['.', ',', 'W', 'Z', '='].indexOf(g[y][x]) !== -1; for (let y = y1 - 1; y <= y2 + 1; y++) for (let x = x1 - 1; x <= x2 + 1; x++) if (g[y] && ['.', ','].indexOf(g[y][x]) !== -1 && !open(x + 1, y) && !open(x - 1, y) && !open(x, y + 1) && !open(x, y - 1)) g[y][x] = '~'; });   // a lone cell the water walled in becomes water too   // the lantern road runs between water: only tall-grass cells turn to water, so every path and open cell stays
    if (net.shore) addShore(MAPS[net.shore]);
    const post = (Mp, edge, a, text) => { const xy = { n: [a + 2, 1], s: [a + 2, Mp.H - 2], w: [1, a - 1], e: [Mp.W - 2, a - 1] }[edge]; Mp.grid[xy[1]][xy[0]] = 'G'; Mp.signs.push({ x: xy[0], y: xy[1], text: text }); };
    (net.posts || []).forEach((pt) => post(MAPS[pt[0]], pt[1], pt[2], pt[3]));
    NET_META.push({ base: net.base, main: net.main, cityA: net.cityA, cityB: net.cityB, ids: [net.main].concat(net.maps.map((m) => m.id)) });
  }
  // ---- Highland Pass: Mossbrook -> Highland Gate -> the Pass proper (Kai, the old stones) -> Frost Fork -> Frosthold; a bypass over Whisper Hollow and the Windy Lookout; Hermit's Cliff has no road to it
  NETS.push({ base: 'route-mf', main: 'route-mf', cityA: 'mossbrook', cityB: 'frosthold', spawnFrom: 'route-mf-gate', trail: [['route-mf-gate', 's', 'n'], ['route-mf', 's', 'e'], ['route-mf-fork', 'w', 'e']],
    maps: [
      { id: 'route-mf-gate', base: 'route-mf', name: 'Highland Gate', seed: 5501, types: ['Moss', 'Frost'], hub: [16, 13], grass: 4, doors: [{ edge: 's', a: 16 }, { edge: 'n', a: 16 }, { edge: 'e', a: 12 }], nooks: [{ x: 26, y: 6, r: 2 }],
        objects: [{ id: 'hp-door', kind: 'doorframe', x: 26, y: 6, text: 'A door with nothing behind it. It does not open.' }] },
      { id: 'route-mf-hollow', base: 'route-mf', name: 'Whisper Hollow', seed: 5502, types: ['Moss', 'Frost'], hub: [14, 13], grass: 6, doors: [{ edge: 'w', a: 12 }, { edge: 'n', a: 14 }], nooks: [{ x: 26, y: 21, r: 3 }, { x: 7, y: 6, r: 2 }], rare: 0,
        objects: [{ id: 'hp-chest1', kind: 'chest', x: 26, y: 22, reward: { potion: 2, essence: 4 }, text: 'A chest, half sunk in the moss.' }, { id: 'hp-lantern', kind: 'lantern', gate: 'night', x: 7, y: 6, text: 'It is warm.' }] },
      { id: 'route-mf-lookout', base: 'route-mf', name: 'Windy Lookout', seed: 5503, types: ['Frost', 'Moss'], hub: [16, 12], grass: 3, doors: [{ edge: 's', a: 8 }, { edge: 's', a: 24 }], nooks: [{ x: 9, y: 6, r: 2 }],
        objects: [{ id: 'hp-ring', kind: 'ringstones', x: 9, y: 6, text: 'Stones, set in a circle by someone who was not in a hurry.' }] },
      { id: 'route-mf-fork', base: 'route-mf', name: 'Frost Fork', seed: 5504, types: ['Frost', 'Moss'], hub: [17, 13], grass: 5, doors: [{ edge: 'w', a: 13 }, { edge: 'n', a: 24 }, { edge: 'e', a: 13 }] },
      { id: 'route-mf-cliff', base: 'route-mf', name: 'Hermit\u2019s Cliff', seed: 5505, types: ['Frost', 'Dusk'], hub: [20, 14], grass: 3, doors: [{ edge: 'e', a: 20 }], nooks: [{ x: 8, y: 13, r: 3 }, { x: 10, y: 22, r: 2 }], rare: 0,
        objects: [{ id: 'hp-chest2', kind: 'chest', x: 8, y: 16, reward: { charm: 1, essence: 8 }, text: 'A small chest under the overhang.' }, { id: 'hp-cups', kind: 'cups', x: 6, y: 12, text: 'Two cups.' }, { id: 'hp-postlamp', kind: 'postlamp', always: true, x: 28, y: 17, text: 'A lantern on a post.' }] }
    ],
    links: [['mossbrook', 'n', 32, 'route-mf-gate', 's', 16, [32.9, 1.4]], ['route-mf-gate', 'n', 16, 'route-mf', 's', 17], ['route-mf-gate', 'e', 12, 'route-mf-hollow', 'w', 12], ['route-mf-hollow', 'n', 14, 'route-mf-lookout', 's', 8],
      ['route-mf-lookout', 's', 24, 'route-mf-fork', 'n', 24], ['route-mf', 'e', 13, 'route-mf-fork', 'w', 13], ['route-mf', 'w', 20, 'route-mf-cliff', 'e', 20], ['route-mf-fork', 'e', 13, 'frosthold', 'w', 13, null, [1.4, 14.2]]],
    props: [['route-mf-gate', 'cairn', [25, 10], 'Notches in the stone. They were not all cut by the same hand.'], ['route-mf-hollow', 'well', [20, 8], 'A moss-furred well. The rope is new.'],
      ['route-mf-lookout', 'cairn', [10, 9], 'From here the pass lies below you like an open hand. You count the roads twice.'], ['route-mf-cliff', 'cairn', [14, 10], 'A new stone on the top. It is still dark from the rain.']],
    posts: [['mossbrook', 'n', 32, 'North: the Highland Pass (Moss and Frost critters), the road to Frosthold.'], ['frosthold', 'w', 13, 'West: the Highland Pass (Moss and Frost critters), the road to Mossbrook.']] });
  // ---- Ashwood Trail: Cinderport -> Cinder Edge -> the trail proper (Elm, the camp) -> Mossroot Crossing -> Mossbrook; a bypass through Smoulder Wood; Charred Hollow is a dead end south of the trail
  NETS.push({ base: 'route-cm', main: 'route-cm', cityA: 'cinderport', cityB: 'mossbrook', spawnFrom: 'route-cm-edge', trail: [['route-cm-edge', 'e', 'w', { kind: 'camp', step: 14, start: 9, text: 'The stones are warm.' }], ['route-cm', 'e', 'n', { kind: 'camp', step: 14, start: 9, text: 'The stones are warm.' }], ['route-cm-crossing', 's', 'n', { kind: 'camp', step: 14, start: 9, text: 'The stones are warm.' }]],
    maps: [
      { id: 'route-cm-edge', base: 'route-cm', name: 'Cinder Edge', seed: 6601, types: ['Ember', 'Moss'], hub: [17, 13], grass: 4, doors: [{ edge: 'e', a: 13 }, { edge: 'w', a: 13 }, { edge: 'n', a: 14 }] },
      { id: 'route-cm-smoulder', base: 'route-cm', name: 'Smoulder Wood', seed: 6602, types: ['Ember', 'Moss'], hub: [15, 14], grass: 5, doors: [{ edge: 's', a: 14 }, { edge: 'e', a: 12 }], nooks: [{ x: 8, y: 7, r: 2 }, { x: 25, y: 20, r: 3 }], rare: 1,
        objects: [{ id: 'cm-bell', kind: 'bell', x: 8, y: 7, text: 'It rings once, softly. Nothing answers.' }, { id: 'cm-chest1', kind: 'chest', x: 25, y: 21, reward: { super: 1, essence: 5 }, text: 'A chest, blackened on one side only.' }] },
      { id: 'route-cm-crossing', base: 'route-cm', name: 'Mossroot Crossing', seed: 6603, types: ['Moss', 'Ember'], hub: [16, 13], grass: 4, doors: [{ edge: 'w', a: 12 }, { edge: 's', a: 16 }, { edge: 'n', a: 22 }], nooks: [{ x: 26, y: 20, r: 2 }],
        objects: [{ id: 'cm-stakes', kind: 'stakes', gate: 'dusk', x: 26, y: 20, text: 'Ribbons on stakes, faded different colours. One is new.' }] },
      { id: 'route-cm-hollow', base: 'route-cm', name: 'Charred Hollow', seed: 6604, types: ['Ember', 'Dusk'], hub: [17, 11], grass: 2, doors: [{ edge: 'n', a: 17 }], nooks: [{ x: 9, y: 17, r: 3 }],
        objects: [{ id: 'cm-bench', kind: 'bench', x: 9, y: 17, text: 'The wood is smooth where hands have rested.' }] }
    ],
    links: [['cinderport', 'w', 13, 'route-cm-edge', 'e', 13, [1.4, 14.2]], ['route-cm-edge', 'w', 13, 'route-cm', 'e', 14], ['route-cm-edge', 'n', 14, 'route-cm-smoulder', 's', 14], ['route-cm-smoulder', 'e', 12, 'route-cm-crossing', 'w', 12],
      ['route-cm', 'n', 16, 'route-cm-crossing', 's', 16], ['route-cm', 's', 17, 'route-cm-hollow', 'n', 17], ['route-cm-crossing', 'n', 22, 'mossbrook', 's', 22, null, [22.9, 26.6]]],
    props: [['route-cm-edge', 'cairn', [24, 8], 'Soot on one side only.'], ['route-cm-smoulder', 'well', [18, 8], 'A well with no bucket and no rope.'], ['route-cm-crossing', 'cairn', [8, 20], 'Stones balanced so lightly that the wind should have won.'], ['route-cm-hollow', 'cairn', [22, 18], 'Ash, and one footprint pressed into it that has not filled in.']],
    posts: [['cinderport', 'w', 13, 'West: the Ashwood Trail (Ember and Moss critters), the road to Mossbrook.'], ['mossbrook', 's', 22, 'South: the Ashwood Trail (Ember and Moss critters), the road to Cinderport.']] });
  // ---- Glacier Coast: Frosthold -> Frozen Shelf -> the coast proper (Signe, the lighthouse) -> Gull Landing -> Coralbay; a bypass along Rime Strand; the Skerry is a dead end off the coast
  NETS.push({ base: 'route-fc', main: 'route-fc', cityA: 'frosthold', cityB: 'coralbay', spawnFrom: 'route-fc-shelf', shore: 'route-fc',
    maps: [
      { id: 'route-fc-shelf', base: 'route-fc', name: 'Frozen Shelf', seed: 7701, types: ['Frost', 'Tide'], hub: [16, 13], grass: 4, doors: [{ edge: 'w', a: 13 }, { edge: 'e', a: 13 }, { edge: 's', a: 12 }] },
      { id: 'route-fc-strand', base: 'route-fc', name: 'Rime Strand', seed: 7702, types: ['Tide', 'Frost'], hub: [15, 14], grass: 5, doors: [{ edge: 'n', a: 12 }, { edge: 'e', a: 12 }], nooks: [{ x: 8, y: 20, r: 3 }], rare: 0,
        objects: [{ id: 'fc-sled', kind: 'sled', x: 8, y: 21, text: 'The runners are polished.' }, { id: 'fc-chest1', kind: 'chest', x: 8, y: 17, reward: { ticket: 1, essence: 5 }, text: 'A chest, rimed over. The lid gives easily.' }] },
      { id: 'route-fc-landing', base: 'route-fc', name: 'Gull Landing', seed: 7703, types: ['Tide', 'Frost'], hub: [17, 13], grass: 4, doors: [{ edge: 'n', a: 16 }, { edge: 'w', a: 12 }, { edge: 's', a: 28 }] },
      { id: 'route-fc-skerry', base: 'route-fc', name: 'The Skerry', seed: 7704, types: ['Tide', 'Dusk'], hub: [20, 13], grass: 2, doors: [{ edge: 'w', a: 12 }], nooks: [{ x: 26, y: 8, r: 3 }, { x: 24, y: 21, r: 2 }],
        objects: [{ id: 'fc-skiff', kind: 'skiff', gate: 'dawn', x: 26, y: 9, text: 'Wet. The tide is hours away.' }, { id: 'fc-chair', kind: 'chair', x: 24, y: 21, text: 'An empty chair, facing the water.' }] }
    ],
    links: [['frosthold', 'e', 13, 'route-fc-shelf', 'w', 13, [34.6, 14.2]], ['route-fc-shelf', 'e', 13, 'route-fc', 'w', 14], ['route-fc-shelf', 's', 12, 'route-fc-strand', 'n', 12], ['route-fc-strand', 'e', 12, 'route-fc-landing', 'w', 12],
      ['route-fc', 's', 16, 'route-fc-landing', 'n', 16], ['route-fc', 'e', 12, 'route-fc-skerry', 'w', 12], ['route-fc-landing', 's', 28, 'coralbay', 'n', 28, null, [28.9, 1.4]]],
    props: [['route-fc-shelf', 'cairn', [24, 8], 'Frost on the south face. Dry on the north.'], ['route-fc-strand', 'cairn', [20, 9], 'Shells set in a line, smallest to largest. The last place is empty.'], ['route-fc-skerry', 'cairn', [12, 8], 'Something was weighed against these stones and taken away.']],
    posts: [['frosthold', 'e', 13, 'East: the Glacier Coast (Frost and Tide critters), the road to Coralbay.'], ['coralbay', 'n', 28, 'North: the Glacier Coast (Frost and Tide critters), the road to Frosthold.']] });
  // ---- Reef Causeway: Coralbay -> Pier Road -> the causeway proper (Mako, the wreck) -> Steamvent Flats -> Cinderport; a bypass over the Low Shoals; the Drowned Orchard is a dead end south of the causeway
  NETS.push({ base: 'route-cc', main: 'route-cc', cityA: 'coralbay', cityB: 'cinderport', spawnFrom: 'route-cc-pier', causeway: [['route-cc', 11, 2, 15, 5], ['route-cc', 3, 7, 6, 12], ['route-cc-pier', 5, 9, 9, 11], ['route-cc-pier', 14, 7, 18, 12], ['route-cc-steam', 19, 7, 23, 11], ['route-cc-steam', 7, 15, 21, 18]], trail: [['route-cc-pier', 'n', 's', { wave: true, step: 6, start: 5 }], ['route-cc', 'n', 'w', { wave: true, step: 6, start: 5 }], ['route-cc-steam', 'e', 'w', { wave: true, step: 6, start: 5 }]],
    maps: [
      { id: 'route-cc-pier', base: 'route-cc', name: 'Pier Road', seed: 8801, types: ['Tide', 'Ember'], hub: [16, 13], grass: 4, doors: [{ edge: 'n', a: 16 }, { edge: 's', a: 16 }, { edge: 'e', a: 12 }] },
      { id: 'route-cc-shoals', base: 'route-cc', name: 'Low Shoals', seed: 8802, types: ['Tide', 'Ember'], hub: [15, 14], grass: 5, doors: [{ edge: 'w', a: 12 }, { edge: 's', a: 20 }], nooks: [{ x: 26, y: 8, r: 3 }], rare: 0,
        objects: [{ id: 'cc-chest1', kind: 'chest', x: 26, y: 9, reward: { potion: 1, essence: 5 }, text: 'A chest, crusted with salt. Someone has oiled the hinges.' }] },
      { id: 'route-cc-steam', base: 'route-cc', name: 'Steamvent Flats', seed: 8803, types: ['Ember', 'Tide'], hub: [17, 13], grass: 4, doors: [{ edge: 'e', a: 13 }, { edge: 'n', a: 20 }, { edge: 'w', a: 13 }] },
      { id: 'route-cc-drowned', base: 'route-cc', name: 'Drowned Orchard', seed: 8804, types: ['Tide', 'Dusk'], hub: [17, 11], grass: 2, doors: [{ edge: 'n', a: 17 }], nooks: [{ x: 9, y: 17, r: 3 }, { x: 25, y: 20, r: 2 }], rare: 0,
        objects: [{ id: 'cc-glow', kind: 'tidelight', gate: 'night', x: 9, y: 17, text: 'The water is lit from below.' }, { id: 'cc-chest2', kind: 'chest', x: 25, y: 21, reward: { charm: 1, essence: 7 }, text: 'A chest, wet inside and out.' }] }
    ],
    links: [['coralbay', 's', 28, 'route-cc-pier', 'n', 16, [28.9, 26.6]], ['route-cc-pier', 's', 16, 'route-cc', 'n', 17], ['route-cc-pier', 'e', 12, 'route-cc-shoals', 'w', 12], ['route-cc-shoals', 's', 20, 'route-cc-steam', 'n', 20],
      ['route-cc', 'w', 13, 'route-cc-steam', 'e', 13], ['route-cc', 's', 17, 'route-cc-drowned', 'n', 17], ['route-cc-steam', 'w', 13, 'cinderport', 'e', 13, null, [34.6, 14.2]]],
    props: [['route-cc-pier', 'cairn', [24, 9], 'Shells in a spiral. Someone counted.'], ['route-cc-shoals', 'cairn', [10, 9], 'The tide line is higher on this side than it should be.'], ['route-cc-steam', 'cairn', [10, 20], 'Warm to the touch, in the middle of a cold hour.'], ['route-cc-drowned', 'cairn', [22, 9], 'Fruit trees, standing in the water. They are in blossom.']],
    posts: [['coralbay', 's', 28, 'South: the Reef Causeway (Tide and Ember critters), the road to Cinderport.'], ['cinderport', 'e', 13, 'East: the Reef Causeway (Tide and Ember critters), the road to Coralbay.']] });
  NETS.forEach(buildNet);
  addTrail(MAPS.ascent, 's', [14, 10], { step: 18, start: 10, own: true, text: 'A lantern on a post. It is lit.' });
  addTrail(MAPS.descent, 'n', [14, 62], { step: 18, start: 10, own: true, text: 'A lantern on a post. It is lit.' });
  addSpot(MAPS.mossbrook, { id: 'c-growth', kind: 'growthpost', text: 'Notches, each a little higher than the last.' }, 19, 10, false);
  addSpot(MAPS.frosthold, { id: 'c-kettle', kind: 'kettle', text: 'The kettle is hot. Two cups.' }, 29, 9, false);
  addSpot(MAPS.cinderport, { id: 'c-bench', kind: 'workbench', text: 'Tools, laid out for the morning.' }, 21, 11, false);
  addSpot(MAPS.coralbay, { id: 'c-lamp', kind: 'harborlamp', text: 'Left on.' }, 26, 16, false);
  // the clue things stand beside their landmarks (the ruin's clue is the arch itself): a free tile just below or beside the prop
  ADV.CLUES.filter((c) => c.obj).forEach((c) => {
    const mid = { camp: 'route-cm', lighthouse: 'route-fc', wreck: 'route-cc' }[c.id], pid = { camp: 'camp', lighthouse: 'lighthouse', wreck: 'wreck' }[c.id], M2 = MAPS[mid], pr = (M2.props || []).find((q) => q.id === pid); if (!pr) return;
    const col = (x) => { const out = []; for (let y = pr.y; y <= pr.y + pr.h + 1; y++) out.push([x, y]); return out; };
    const cand = col(pr.x - 1).concat(col(pr.x + pr.w), [[pr.x, pr.y + pr.h + 1], [pr.x + pr.w - 1, pr.y + pr.h + 1]]);   // left of the prop first: the people who point at it all stand to its right
    const sgx = pr.x + Math.floor((pr.w - 1) / 2), sgy = pr.y + pr.h;   // the prop's sign cell: keep the stone 2 tiles from it so the action button offers the stone, not the sign
    const spot = cand.find(([x, y]) => M2.grid[y] && ['.', ','].indexOf(M2.grid[y][x]) !== -1 && Math.hypot(x - sgx, y - sgy) >= 2); if (!spot) return;
    M2.grid[spot[1]][spot[0]] = 'O'; (M2.objects = M2.objects || []).push({ id: 'clue-' + c.id, kind: c.obj.kind, clue: c.id, x: spot[0], y: spot[1], reach: 1.7, text: c.obj.text });
  });
  addSpot(MAPS.moss, { id: 'z-sprouts', kind: 'sprouts', text: 'Rows of young plants. The soil is turned.' }, 9, 6, false);
  addSpot(MAPS.frost, { id: 'z-icelamp', kind: 'icelamp', text: 'A flame, held in the ice.' }, 26, 19, false);
  addSpot(MAPS.ember, { id: 'z-hearth', kind: 'hearth', text: 'Fresh logs.' }, 10, 20, false);
  addSpot(MAPS.tide, { id: 'z-moored', kind: 'moored', text: 'The knot is a good one.' }, 26, 6, true);
  addSpot(MAPS.tide, { id: 'z-returned', kind: 'returned', text: 'A cup, a sandal, a toy boat, set in a row above the tide line. Someone straightened them.' }, 26, 20, true);   // Meaning: what the sea gives back, met on the shore before Coral asks you to answer
  // ---------- the Cold Ascent: five switchback ledges up the peaks above Frosthold, ending under the beacon tower ----------
  // Ledges are rectangles joined by 4-wide ramps through the cliff rows between them; a packed-snow trail zig-zags up, so trainers beside it
  // see you cross. Wild snow patches (W), a glacier river with a log bridge, a rare patch near the top, and a summit plateau with the beacon.
  function buildAscent() {
    const W = 30, H = 66, r = rng(4242), m = []; for (let y = 0; y < H; y++) m.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) m[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    const L = [{ y0: 49, y1: 55, enter: 'r', yc: 52 }, { y0: 41, y1: 47, enter: 'l', yc: 44 }, { y0: 33, y1: 39, enter: 'r', yc: 36 }, { y0: 25, y1: 31, enter: 'l', yc: 28 }, { y0: 17, y1: 23, enter: 'r', yc: 20 }];
    rect(5, 57, 24, 63); L.forEach((l) => rect(4, l.y0, 25, l.y1)); rect(3, 3, 26, 15);                          // camp, five ledges, the summit plateau
    L.forEach((l) => { const rx = l.enter === 'r' ? 22 : 4; rect(rx, l.y1 + 1, rx + 3, l.y1 + 1); });             // the ramp below each ledge
    rect(22, 56, 25, 56); rect(4, 16, 7, 16);                                                                       // camp -> first ledge (right), last ledge -> summit (left)
    rect(12, 33, 16, 39, '~');                                                                                      // glacier river across the third ledge
    [[6, 50, 9, 53], [14, 53, 17, 55], [18, 42, 22, 45], [8, 26, 12, 29], [12, 21, 18, 23], [17, 62, 21, 63]].forEach(([a, b, c, d]) => rect(a, b, c, d, 'W'));   // snow patches
    const near = (x, y) => { for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (['=', 'Z', '~'].indexOf(m[yy] ? m[yy][xx] : '.') !== -1) return true; return false; };
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) { if (m[y][x] !== '.' || near(x, y)) continue; const v = r(); if (v < 0.07) set(x, y, 'T'); else if (v < 0.1) set(x, y, 'R'); else if (v < 0.17) set(x, y, ','); }
    // the trail (2 wide): in from the south gap, along the camp, up each ramp, across each ledge on its middle rows, to the beacon door
    const px = (x0, y0, x1, y1) => rect(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1) + 1, Math.max(y0, y1) + 1, '=');
    px(14, 61, 14, 65); px(14, 60, 23, 60); px(23, 56, 23, 60);
    L.forEach((l, i) => { const e = l.enter === 'r' ? 23 : 5, x = l.enter === 'r' ? 5 : 23; px(e, l.y1 + 1, e, l.yc); px(e, l.yc, x, l.yc); px(x, l.y0 - 1, x, l.yc); });
    px(5, 12, 5, 16); px(5, 12, 14, 12); px(14, 9, 14, 12);
    rect(7, 18, 9, 20, 'Z');                                                                                        // a rare patch on the last ledge
    for (let y = 3; y <= 7; y++) for (let x = 13; x <= 15; x++) set(x, y, 'X');                                      // footprint of the beacon tower (3 x 5; its prop is registered below)
    set(14, 8, 'O');                                                                                               // the door tile under it (an object, see the app)
    // trees on the summit plateau edges
    [[4, 4], [5, 7], [4, 10], [25, 4], [24, 8], [25, 12], [9, 5], [20, 6], [10, 10], [19, 10]].forEach(([x, y]) => { if (m[y][x] === '.' || m[y][x] === ',') set(x, y, 'T'); });
    m[64][14] = '='; m[64][15] = '=';
    const arrive = [14.9, H - 1.4];
    return { id: 'ascent', name: 'The Cold Ascent', theme: THEMES.ascent, grid: m, W, H, places: [], signs: [], types: ['Frost', 'Stone'], rate: 0.12, rare: { x: 7, y: 18, w: 3, h: 3 },
      props: [{ id: 'beacon', x: 13, y: 3, w: 3, h: 5 }], objects: [{ id: 'beacon-door', kind: 'plaque', x: 14, y: 8, reach: 1.9, label: 'Examine the beacon door', text: 'The Beacon' }], exits: [{ edge: 's', a: 14, b: 15, to: 'frosthold' }], arrive: { s: arrive }, spawn: arrive };
  }
  // ---------- the Cinder Descent: the Ascent's layout turned upside down. Entrance at the north (from Cinderport), ledges that step DOWN into the volcano, a lava river with a bridge,
  // and the forge door cut into the crater's south wall. ----------
  function buildDescent() {
    const A = buildAscent(), W = A.W, H = A.H, g = A.grid.map((r) => r.slice()).reverse();
    for (let y = 58; y <= 62; y++) for (let x = 13; x <= 15; x++) g[y][x] = '.';     // the Ascent's beacon footprint is not needed here
    g[57][14] = '.';
    for (let y = 53; y <= 62; y++) { g[y][14] = '='; g[y][15] = '='; }                 // the trail runs on to the crater floor
    g[63][14] = 'O';                                                                    // the forge door (an object) in the south wall
    const arrive = [14.9, 1.4];
    return { id: 'descent', name: 'The Cinder Descent', theme: THEMES.descent, grid: g, W, H, places: [], signs: [], types: ['Ember', 'Stone'], rate: 0.12, rare: { x: 7, y: 45, w: 3, h: 3 }, props: [],
      objects: [{ id: 'forge-door', kind: 'cavemouth', x: 14, y: 63, reach: 1.9, label: 'Enter the forge', text: 'The Forge' }],
      exits: [{ edge: 'n', a: 14, b: 15, to: 'cinderport' }], arrive: { n: arrive }, spawn: arrive };
  }
  // ---------- dungeons (layouts live in adventure.js) ----------
  // buildDungeon turns a layout into a map: cave walls 'C', objects on solid 'O' tiles, an exit gap, a darkness radius.
  function buildDungeon(id) {
    const d = ADV.DUNGEONS[id](), grid = d.rows.map((r) => r.split(''));
    const objects = d.objects.map((o) => { grid[o.y][o.x] = 'O'; return Object.assign({ reach: 1.7 }, o); });
    const arrive = d.spawn;
    return { id: id, name: d.name, theme: THEMES[id], grid: grid, W: d.W, H: d.H, places: [], signs: [], types: d.types || [], rate: d.rate || 0, cave: true, hall: id.indexOf('gym-') === 0, pool: d.pool || null, dark: d.dark || null, objects: objects, spots: d.spots || {}, rubble: d.rubble || [],
      exits: [{ edge: d.exit.edge, a: d.exit.a, b: d.exit.b, to: d.exit.to || 'route-mf' }], arrive: { [d.exit.edge]: arrive }, spawn: arrive, gates: d.gates || {}, rules: d.rules || {}, pickups: d.pickups || {} };
  }
  MAPS['dg-arch'] = buildDungeon('dg-arch');
  MAPS['dg-lamp'] = buildDungeon('dg-lamp');
  MAPS['dg-forge'] = buildDungeon('dg-forge');
  // the trial halls behind the four gym doors
  [['gym-wren', 'mossbrook'], ['gym-glacia', 'frosthold'], ['gym-blaze', 'cinderport'], ['gym-coral', 'coralbay']].forEach(([gid, cid]) => {
    MAPS[gid] = buildDungeon(gid); const Mc = MAPS[cid], gp = Mc.places.find((q) => q.id === gid); gp.enter = gid; Mc.arriveFrom = Object.assign({}, Mc.arriveFrom, { [gid]: [gp.door[0] + 0.9, gp.door[1] + 1.5] });
  });
  // the Cold Ascent hangs off Frosthold's north palisade (a gate cut at columns 31-32), with signposts and landmarks placed with the reusable props
  (() => {   // Cinderport's southern gate (the gap in its tree line, columns 19-20) onto the Cinder Descent
    const C = MAPS.cinderport, D = MAPS.descent;
    for (let y = 20; y <= 27; y++) { C.grid[y][19] = '='; C.grid[y][20] = '='; }
    C.grid[24][21] = 'G'; C.signs.push({ x: 21, y: 24, to: 'descent', text: 'South: the Cinder Descent. A trail winds down into the volcano to an old forge (Ember and Stone critters). Climbers should be at least level 13.' });
    C.exits.push({ edge: 's', a: 19, b: 20, to: 'descent' }); C.arriveFrom = Object.assign({}, C.arriveFrom, { descent: [19.9, C.H - 1.4] });
    D.arriveFrom = { cinderport: D.spawn, 'dg-forge': [14.5, 62.6] };
    D.objects[0].glow = true;
    D.grid[3][12] = 'G'; D.signs.push({ x: 12, y: 3, text: 'The Cinder Descent. Five ledges down into the caldera. Wild Ember and Stone critters hide in the ash tufts. The heat is real, so do not hurry back up.' });
  })();
  (() => {
    const F = MAPS.frosthold, A = MAPS.ascent;
    for (let y = 0; y <= 11; y++) { F.grid[y][31] = '='; F.grid[y][32] = '='; }
    F.grid[4][30] = 'G'; F.signs.push({ x: 30, y: 4, to: 'ascent', text: 'North: the Cold Ascent. A trail climbs the peaks to an old beacon (Frost and Stone critters). Climbers should be at least level 11.' });
    F.exits.push({ edge: 'n', a: 31, b: 32, to: 'ascent' }); F.arriveFrom = Object.assign({}, F.arriveFrom, { ascent: [31.9, 1.4] });
    A.arriveFrom = { frosthold: A.spawn, 'dg-lamp': [14.5, 9.7] };
    A.objects[0].beam = { x: 14.5, y: 3.75 };   // the beacon's lantern: a light shaft rises from it once the lamp is relit
    A.grid[60][12] = 'G'; A.signs.push({ x: 12, y: 60, text: 'The Cold Ascent. Five ledges up to the old beacon. Wild Frost and Stone critters hide in the snow tufts. Turn back if the weather turns.' });
    A.grid[16][3] = 'C';
  })();
  // The Sealed Arch's door: the ruin's signpost tile becomes the "arch" object (a rune stone). With four clues the app opens it (see archUse in app.js).
  (() => {
    const Rm = MAPS['route-mf'], ruin = (Rm.props || []).find((p) => p.id === 'ruin'); if (!ruin) return;
    const sx = ruin.x + 1, sy = ruin.y + ruin.h;
    Rm.signs = Rm.signs.filter((s) => !(s.x === sx && s.y === sy)); Rm.grid[sy][sx] = 'O';
    for (const [dx, dy] of [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) { const c = Rm.grid[sy + dy] && Rm.grid[sy + dy][sx + dx]; if (c && c !== '=') Rm.grid[sy + dy][sx + dx] = '.'; }   // keep the doorstep clear
    (Rm.objects = Rm.objects || []).push({ id: 'arch', kind: 'plaque', x: sx, y: sy, reach: 1.9, portal: { x: ruin.x, y: ruin.y }, text: 'The Sealed Arch' });
    Rm.arriveFrom = Object.assign({}, Rm.arriveFrom, { 'dg-arch': [sx + 0.5, sy + 1.6] });
  })();
  // ---------- house interiors: every city house gets a room (door on the outside, exit through the bottom) ----------
  const ROOM_STYLE = { town: { floor: '#B07A46', wall: '#F4EAD6', rug: '#D8574A', bed: '#D8574A', mat: 'timber' }, lab: { floor: '#C9CFDA', wall: '#E8EEF8', rug: '#3C6FE0', bed: '#3C6FE0', mat: 'timber' }, mossbrook: { floor: '#B07A46', wall: '#D9B98A', rug: '#4E8A3A', bed: '#4FB06D', mat: 'log' }, frosthold: { floor: '#9AA3B5', wall: '#C9D3E6', rug: '#3C6FE0', bed: '#8FD8EA', mat: 'stone' }, cinderport: { floor: '#4A3A38', wall: '#8A4A3A', rug: '#FF7A45', bed: '#C0503A', mat: 'brick' }, coralbay: { floor: '#D9C29A', wall: '#F4F0E6', rug: '#3C95DC', bed: '#3C95DC', mat: 'shell' }, shrine: { floor: '#9AA3B5', wall: '#C9D3E6', rug: '#FFD86B', bed: '#FFD86B', mat: 'stone' }, arena: { floor: '#E8D3A2', wall: '#C2A06A', rug: '#D8574A', bed: '#D8574A', mat: 'timber' }, watch: { floor: '#6E6A94', wall: '#8F8BB4', rug: '#F5C542', bed: '#F5C542', mat: 'stone' } };
  const ROOM_LAYOUTS = [
    { b: [[1, 2], [2, 2]], s: [[8, 2], [9, 2], [10, 2]], t: [[5, 4], [6, 4]], p: [[1, 7], [10, 7]], r: [4, 5, 7, 6] },
    { k: [[1, 2], [2, 2], [3, 2]], t: [[8, 5], [9, 5]], b: [[9, 2], [10, 2]], p: [[1, 7]], h: [[10, 7]], r: [3, 4, 6, 6] },
    { s: [[1, 2], [2, 2], [3, 2]], b: [[9, 2], [10, 2]], t: [[2, 5], [3, 5]], p: [[10, 7], [1, 7]], r: [5, 3, 8, 6] }
  ];
  function buildInterior(id, place, cityId, i, opt) {
    opt = opt || {}; const W = opt.W || 12, H = opt.H || 9, m = [], LY = opt.layout || ROOM_LAYOUTS[i % ROOM_LAYOUTS.length], dx = Math.floor(W / 2) - 1;
    for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) row.push(y <= 1 || x === 0 || x === W - 1 || y === H - 1 ? 'w' : 'f'); m.push(row); }
    if (LY.r) for (let y = LY.r[1]; y <= LY.r[3]; y++) for (let x = LY.r[0]; x <= LY.r[2]; x++) m[y][x] = 'r';
    ['b', 's', 't', 'p', 'k', 'h', 'm', 'a', 'x', 'n'].forEach((k) => (LY[k] || []).forEach(([x, y]) => { m[y][x] = k; }));
    m[H - 1][dx] = 'd'; m[H - 1][dx + 1] = 'd';
    const objects = (opt.objects || []).map((o) => { m[o.y][o.x] = 'O'; return Object.assign({ reach: 1.7 }, o); });   // things to look at, drawn with the adventure art
    return { id: id, name: place.name, interior: true, duelHall: !!opt.duelHall, objects: objects, rug: LY.r || null, parent: cityId, style: ROOM_STYLE[opt.style || cityId], theme: { bg: '#1A1424' }, grid: m, W: W, H: H, places: opt.places || [], signs: [], types: [], rate: 0,
      exits: [{ edge: 's', a: dx, b: dx + 1, to: cityId }], arrive: { s: [dx + 0.9, H - 1.6] }, spawn: [dx + 0.9, H - 1.6] };
  }
  // Mossbrook's three houses are built by hand (Meaning, Mossbrook: being tended while you grow). Each room is a statement, made of things to look at, never a line that explains it:
  // Clover's house (Fennel is out): someone who keeps the kettle on for a person who is not back yet. Mosscap Cottage: what the forest gives to someone who goes back every day (Wil is home only after dusk, like the note on the door says).
  // Bryn's house: being believed in while you are still looking (every drawing is a shiny critter; the jar is for when, not if).
  const CITY_ROOMS = {
    'house-fennel': { layout: { b: [[9, 2], [10, 2]], t: [[5, 4], [6, 4]], p: [[1, 7]], r: [4, 4, 7, 6] },
      objects: [{ id: 'kettle', kind: 'kettle', x: 2, y: 2, text: 'The kettle is on. The cups are out, both of them.' }, { id: 'chair', kind: 'armchair', x: 10, y: 6, text: 'The cushion is worn in the shape of someone else.' }, { id: 'jars', kind: 'jars', x: 5, y: 2, text: 'Jars with dates on the lids. The newest says this week.' }] },
    'house-moss': { layout: { b: [[1, 2], [2, 2]], t: [[8, 5], [9, 5]], r: [3, 4, 6, 6] },
      objects: [{ id: 'baskets', kind: 'baskets', x: 10, y: 7, text: 'Four baskets by the door, four kinds of mushroom. One for each day so far.' }, { id: 'herbs', kind: 'herbs', x: 6, y: 2, text: 'Bunches of herbs drying. The oldest are nearly dust; the newest still smell of rain.' }, { id: 'map', kind: 'wallmap', x: 9, y: 2, text: 'A map of the forest. One path is drawn over and over, a little differently each time.' }] },
    'house-bryn': { layout: { b: [[1, 2], [2, 2]], t: [[8, 5], [9, 5]], p: [[10, 7]], r: [3, 4, 6, 6] },
      objects: [{ id: 'drawings', kind: 'drawings', x: 6, y: 2, text: 'Crayon critters, pinned in rows. Every one of them has stars drawn around it.' }, { id: 'jar', kind: 'shinyjar', x: 9, y: 2, text: 'An empty jar on the shelf. The label says: for the shiny one.' }, { id: 'smallbed', kind: 'smallbed', x: 1, y: 7, text: 'A small bed. The blanket has critters on it.' }] }
,
    // Frosthold (what is kept by being kept cold). Watch House: watching is a way of keeping (a stool at the window, a hundred winters tallied on the wall, a lantern trimmed, a cloak on its peg).
    // Fur Trader: put away for the season, kept for the next (furs folded and counted, the ledger closed). Stone Cottage: there is always soup (a pot that never leaves the fire, bowls for twelve, a chair by the hearth).
    'fh-a': { layout: { b: [[9, 2], [10, 2]], t: [[5, 5], [6, 5]], r: [4, 4, 7, 6] }, objects: [{ id: 'stool', kind: 'stool', x: 2, y: 2, text: 'A stool, right under the window. The seat is polished.' }, { id: 'tally', kind: 'tally', x: 6, y: 2, text: 'Marks cut into the wall in rows of five. You stop counting at a hundred.' }, { id: 'lamp', kind: 'lantern', x: 10, y: 6, text: 'A lantern, trimmed and full, lit low. It is ready.' }, { id: 'cloak', kind: 'cloakpeg', x: 1, y: 7, text: 'A cloak on a peg, still cold.' }] },
    'fh-b': { layout: { t: [[8, 5], [9, 5]], r: [3, 4, 6, 6] }, objects: [{ id: 'furs', kind: 'furs', x: 2, y: 2, text: 'Furs folded in a stack, each one tagged. The tags say what and when, not how much.' }, { id: 'furs2', kind: 'furs', x: 9, y: 2, text: 'More furs. Counted twice; the second count is underlined.' }, { id: 'ledger', kind: 'ledger', x: 5, y: 2, text: 'A ledger, closed, with a ribbon at the first page of spring.' }, { id: 'stove', kind: 'kettle', x: 10, y: 7, text: 'A stove with the kettle on. The only warm thing in the shop.' }] },
    'fh-c': { layout: { b: [[9, 2], [10, 2]], r: [3, 4, 6, 6] }, objects: [{ id: 'pot', kind: 'souppot', x: 2, y: 2, text: 'A pot on the fire. It has not left the fire in years; the hook has worn to fit it.' }, { id: 'bowls', kind: 'bowls', x: 6, y: 2, text: 'Bowls stacked for twelve. Two are warm.' }, { id: 'chair', kind: 'armchair', x: 1, y: 6, text: 'A chair by the fire, turned to the door.' }] },
    // Cinderport (the fire that has to be fed). Smithy: the work laid out for the morning (an anvil, tools in their places, coals banked for the night). Ash House: living with what falls (a broom by the door, this week's ash in a jar).
    // Miner Lodge: the lamp you take down with you (four bunks, three lamps on the hooks, a glowing stone on the table).
    'cp-a': { layout: { h: [[10, 2]], t: [[8, 5], [9, 5]], r: [3, 4, 6, 6] }, objects: [{ id: 'anvil', kind: 'anvil', x: 4, y: 5, text: 'An anvil. The top is bright where the hammer lands and dark everywhere else.' }, { id: 'tools', kind: 'toolwall', x: 2, y: 2, text: 'Tools on the wall, each above its own outline. None is missing.' }, { id: 'coals', kind: 'coals', x: 6, y: 2, text: 'Coals banked under ash for the night. In the morning they will only need breath.' }] },
    'cp-b': { layout: { b: [[1, 2], [2, 2]], h: [[6, 2]], t: [[8, 5], [9, 5]], r: [3, 4, 6, 6] }, objects: [{ id: 'broom', kind: 'broom', x: 10, y: 7, text: 'A broom by the door, worn to a slant.' }, { id: 'ashjar', kind: 'ashjar', x: 10, y: 2, text: 'A jar of grey ash on the sill. The label says this week.' }, { id: 'plant', kind: 'sprouts', x: 1, y: 7, text: 'Something green in a pot, in a town of ash. It is doing well.' }] },
    'cp-c': { layout: { t: [[5, 5], [6, 5]], r: [3, 4, 6, 6] }, objects: [{ id: 'bunks', kind: 'bunks', x: 1, y: 2, text: 'Four bunks. Three made, one slept in this morning.' }, { id: 'helmets', kind: 'helmets', x: 7, y: 2, text: 'Four hooks, three helmets. The fourth lamp is lit somewhere under the hill.' }, { id: 'rock', kind: 'glowrock', x: 10, y: 6, text: 'A stone that glows from inside. It came up today.' }] },
    // Coralbay (what the sea gives back; the road home). Lighthouse Keeper: a light kept for the ones not back (a logbook, oil enough for the winter, a list with one name not crossed off).
    // Net Mender: mending is the same knot ten thousand times (nets hung, one half mended on the floor). Shell House: what the sea gives back, kept in rows, with a gap for the next.
    'cb-a': { layout: { b: [[1, 2], [2, 2]], t: [[8, 5], [9, 5]], r: [3, 4, 6, 6] }, objects: [{ id: 'log', kind: 'logbook', x: 5, y: 2, text: 'A logbook, open. Tonight\u2019s line is already written: lamp lit, sea calm.' }, { id: 'oil', kind: 'oilcans', x: 10, y: 7, text: 'Oil cans in a row. Enough for the winter, and a little past it.' }, { id: 'list', kind: 'shiplist', x: 9, y: 2, text: 'A list of boats on the wall. Every name is crossed off but one.' }] },
    'cb-b': { layout: { b: [[9, 2], [10, 2]], r: [3, 4, 6, 6] }, objects: [{ id: 'nets', kind: 'nets', x: 3, y: 2, text: 'Nets hung to dry. The mended places are a different colour.' }, { id: 'work', kind: 'network', x: 1, y: 6, text: 'A net spread on the floor, half mended, the needle still in it.' }, { id: 'stool', kind: 'stool', x: 6, y: 5, text: 'A low stool. The legs are wrapped in net cord where they split.' }] },
    'cb-c': { layout: { t: [[8, 5], [9, 5]], r: [3, 4, 6, 6] }, objects: [{ id: 'shells', kind: 'shellrows', x: 3, y: 2, text: 'Shells on a shelf in rows, each on its own square of cloth. One square is empty.' }, { id: 'bed', kind: 'smallbed', x: 9, y: 2, text: 'A small bed. Sand in the blanket.' }, { id: 'bucket', kind: 'bucket', x: 10, y: 7, text: 'A bucket by the door, still wet.' }] }
  };
  ['mossbrook', 'frosthold', 'cinderport', 'coralbay'].forEach((cid) => MAPS[cid].places.filter((p) => p.open === 'house').forEach((p, i) => {
    const id = 'in-' + p.id; MAPS[id] = buildInterior(id, p, cid, i, CITY_ROOMS[p.id] || {}); p.enter = id;
    MAPS[cid].arriveFrom = Object.assign({}, MAPS[cid].arriveFrom, { [id]: [p.door[0] + 0.9, p.door[1] + 1.5] });
  }));
  // Sproutvale: your home (trainer records desk) and the Lab (Dex terminal); Fern stays outside for the intro
  // Home (Meaning: where you are kept): the lamp in the window that Mom did not light, a picture of two people one much smaller, your coat on its peg, still fitting. The Lab (being studied, and believed in): Fern's pages about a trainer with your name, a basket where small things slept and will again.
  [['home', { W: 12, H: 9, style: 'town', layout: { b: [[1, 2], [2, 2]], m: [[8, 2]], s: [[9, 2], [10, 2]], t: [[4, 5], [5, 5]], p: [[1, 7], [10, 7]], r: [3, 4, 7, 6] },
      places: [{ id: 'desk', name: 'Trainer records', x: 8, y: 2, w: 1, h: 1, kind: 'device', door: [8, 2], open: 'badges' }],
      objects: [{ id: 'wlamp', kind: 'windowlamp', x: 5, y: 2, text: 'A lamp on the windowsill, facing the road.' }, { id: 'chairs', kind: 'twochairs', x: 6, y: 5, text: 'Two chairs at the table. One of them has always been yours.' }, { id: 'photo', kind: 'photo', x: 6, y: 2, text: 'A picture on the wall: two people, one much smaller, in front of this house.' }, { id: 'coat', kind: 'cloakpeg', x: 10, y: 6, text: 'Your coat on its peg. It still fits. Just.' }] }],
   ['lab', { W: 14, H: 10, style: 'lab', layout: { s: [[1, 2], [2, 2], [3, 2], [4, 2]], m: [[8, 2], [9, 2], [10, 2], [11, 2]], t: [[5, 6], [6, 6], [7, 6]], p: [[1, 8], [12, 8]], h: [[12, 5]], r: [4, 4, 9, 7] },
      places: [{ id: 'dexpc', name: 'Dex terminal', x: 9, y: 2, w: 1, h: 1, kind: 'device', door: [9, 2], open: 'dex' }],
      objects: [{ id: 'notes', kind: 'notes', x: 6, y: 2, text: 'Pages in Fern\u2019s hand, pinned in order. The newest ones are about a trainer with your name.' }, { id: 'basket', kind: 'critterbasket', x: 10, y: 8, text: 'A basket with a folded blanket. Something small slept here, and will again.' }] }]].forEach(([pid, opt], i) => {
    const P0 = MAPS.town.places.find((p) => p.id === pid), id = 'in-' + pid;
    MAPS[id] = buildInterior(id, P0, 'town', i, opt); P0.enter = id;
    MAPS.town.arriveFrom = Object.assign({}, MAPS.town.arriveFrom, { [id]: [P0.door[0] + 0.9, P0.door[1] + 1.5] });
  });
  // the Roll Shrine, the Arena and the Long Watch have rooms too (Meaning, Sproutvale: where you are kept. The shrine gives without being asked, and others were here before you; the arena is where you stand with your critter in front of others; the Watch's lobby is the watch itself: a bench, a blanket, lamps that stay lit, the stair)
  [['town', 'shrine', 'in-shrine', { W: 12, H: 9, style: 'shrine', layout: { a: [[5, 2], [6, 2]], p: [[1, 2], [10, 2]], r: [4, 3, 7, 6] }, places: [{ id: 'altar', name: 'Roll altar', x: 5, y: 2, w: 2, h: 1, kind: 'device', door: [5, 2], open: 'roll' }],
      objects: [{ id: 'offer', kind: 'offerings', x: 2, y: 5, text: 'A bowl by the altar: petals, a button, a blue stone, a bottle cap. Left by people who were here before you.' }, { id: 'cand', kind: 'candles', x: 9, y: 5, text: 'Candles in a row. None has burned to the end. Somebody replaces them.' }] }],
   ['town', 'arena', 'in-arena', { W: 14, H: 10, style: 'arena', layout: { n: [[6, 2]], r: [3, 3, 10, 7] }, places: [{ id: 'bell', name: 'Arena bell', x: 6, y: 2, w: 1, h: 1, kind: 'device', door: [6, 2], open: 'battle' }],
      objects: [{ id: 'names', kind: 'namewall', x: 2, y: 2, text: 'Names scratched into the wall in every kind of hand. None is crossed out.' }, { id: 'bench', kind: 'bench', x: 11, y: 2, text: 'A bench facing the ring, worn in two places side by side.' }, { id: 'pail', kind: 'bucket', x: 12, y: 8, text: 'A bucket of water and a cloth, for after.' }] }],
   ['peak', 'tower', 'in-tower', { W: 12, H: 9, style: 'watch', duelHall: true, layout: { x: [[5, 2], [6, 2]], r: [4, 4, 7, 6] }, places: [{ id: 'stair', name: 'The stair', x: 5, y: 2, w: 2, h: 1, kind: 'device', door: [5, 2], open: 'tower' }],
      objects: [{ id: 'wl1', kind: 'walllamp', x: 2, y: 2, text: 'A lamp on the wall. It does not go out.' }, { id: 'wl2', kind: 'walllamp', x: 9, y: 2, text: 'A lamp on the wall. It does not go out.' }, { id: 'bb', kind: 'blanketbench', x: 1, y: 6, text: 'A bench with a folded blanket. Somebody sleeps here between watches.' }, { id: 'wlog', kind: 'logbook', x: 10, y: 6, text: 'A book of names and floors, one line a night. The last line is from last night.' }] }]].forEach(([pm, pid, id, opt], i) => {
    const P0 = MAPS[pm].places.find((p) => p.id === pid); MAPS[id] = buildInterior(id, P0, pm, i, opt); P0.enter = id;
    MAPS[pm].arriveFrom = Object.assign({}, MAPS[pm].arriveFrom, { [id]: [P0.door[0] + 0.9, P0.door[1] + 1.5] });
  });
  [['moss', ' Mossbrook lies past the far side.'], ['frost', ' The road continues north to Frosthold.'], ['ember', ' The road continues south to Cinderport.'], ['tide', ' A boardwalk leads east to Coralbay.']].forEach(([z, t]) => { MAPS[z].signs[0].text += t; });
  let M = MAPS.town;
  const solidAt = (tx, ty, map) => { const mm = map || M; return tx < 0 || ty < 0 || tx >= mm.W || ty >= mm.H || SOLID.has(mm.grid[ty][tx]); };

  // ---------- drawing ----------
  let terrain = null, terrainScale = 1, terrainFor = null;
  function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); let R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255; R = Math.max(0, Math.min(255, R + amt)); G = Math.max(0, Math.min(255, G + amt)); B = Math.max(0, Math.min(255, B + amt)); return 'rgb(' + R + ',' + G + ',' + B + ')'; }
  function prerender() {
    terrainFor = M.id; terrainScale = 1;
    terrain = PXW.terrain(M, M.id);
    windClass = 0; lastWind = null; lastPic = null; fade = null;
    if (terrain.anim) PXW.bake(terrain, 0, 0);   // pose 0 with no lean is exactly the old still picture
  }
  function drawTree(g, px, py, kind, r) {
    const sz = 0.9 + r() * 0.35;
    g.fillStyle = 'rgba(10,30,10,0.25)'; g.beginPath(); g.ellipse(px + 16, py + 28, 13 * sz, 5, 0, 0, 6.3); g.fill();
    if (kind === 'pine') {
      g.fillStyle = '#6B4A2E'; g.fillRect(px + 14, py + 20, 4, 9);
      for (let i = 0; i < 3; i++) { const w = (15 - i * 4) * sz, top = py - 6 + i * 8; g.fillStyle = '#2E6B4E'; g.beginPath(); g.moveTo(px + 16, top - 6); g.lineTo(px + 16 + w, top + 12); g.lineTo(px + 16 - w, top + 12); g.closePath(); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(px + 16, top - 6); g.lineTo(px + 16 + w * 0.45, top + 2); g.lineTo(px + 16 - w * 0.45, top + 2); g.closePath(); g.fill(); }
      return;
    }
    if (kind === 'dead') {
      g.strokeStyle = '#4A3424'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px + 16, py + 28); g.lineTo(px + 16, py + 4); g.moveTo(px + 16, py + 14); g.lineTo(px + 6, py + 6); g.moveTo(px + 16, py + 10); g.lineTo(px + 26, py + 2); g.stroke(); g.lineCap = 'butt';
      return;
    }
    if (kind === 'palm') {
      g.strokeStyle = '#8A6238'; g.lineWidth = 5; g.beginPath(); g.moveTo(px + 14, py + 28); g.quadraticCurveTo(px + 20, py + 14, px + 16, py + 2); g.stroke();
      g.fillStyle = '#3E9A44'; for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.55; g.beginPath(); g.ellipse(px + 16 + Math.cos(a) * 9, py + 2 + Math.sin(a) * 5, 10, 3.5, a, 0, 6.3); g.fill(); }
      return;
    }
    g.fillStyle = '#7A5230'; g.fillRect(px + 13, py + 16, 6, 12);
    const base = ['#2F8A3A', '#3A9A44', '#2C7F45'][Math.floor(r() * 3)];
    g.fillStyle = base; g.beginPath(); g.arc(px + 16, py + 10, 15 * sz, 0, 6.3); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.arc(px + 11, py + 5, 7 * sz, 0, 6.3); g.fill();
  }
  function drawPlace(g, p) {
    const px = p.x * TS, py = p.y * TS, pw = p.w * TS, ph = p.h * TS;
    g.fillStyle = 'rgba(20,50,20,0.25)'; g.beginPath(); g.ellipse(px + pw / 2, py + ph + 2, pw / 2 + 4, 8, 0, 0, 6.3); g.fill();
    if (p.kind === 'shrine') {
      g.fillStyle = '#B9C3D6'; g.beginPath(); g.ellipse(px + pw / 2, py + ph / 2 + 18, pw / 2, ph / 2 - 6, 0, 0, 6.3); g.fill();
      g.fillStyle = '#D7DEEA'; g.beginPath(); g.ellipse(px + pw / 2, py + ph / 2 + 12, pw / 2 - 10, ph / 2 - 14, 0, 0, 6.3); g.fill();
      [[-60, 0], [60, 0], [-34, -24], [34, -24]].forEach(([ox, oy]) => { g.fillStyle = '#9AA6BF'; g.fillRect(px + pw / 2 + ox - 6, py + ph / 2 + oy - 20, 12, 34); g.fillStyle = '#C9D3E6'; g.fillRect(px + pw / 2 + ox - 6, py + ph / 2 + oy - 20, 12, 5); });
      return;
    }
    if (p.kind === 'arena') {
      g.fillStyle = '#C2A06A'; g.beginPath(); g.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, 6.3); g.fill();
      g.fillStyle = '#E8D3A2'; g.beginPath(); g.ellipse(px + pw / 2, py + ph / 2, pw / 2 - 14, ph / 2 - 14, 0, 0, 6.3); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 3; g.beginPath(); g.ellipse(px + pw / 2, py + ph / 2, 30, 30, 0, 0, 6.3); g.stroke();
      g.beginPath(); g.moveTo(px + pw / 2, py + 16); g.lineTo(px + pw / 2, py + ph - 16); g.stroke();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; const fx = px + pw / 2 + Math.cos(a) * (pw / 2 - 6), fy = py + ph / 2 + Math.sin(a) * (ph / 2 - 6); g.fillStyle = i % 2 ? '#D8574A' : '#3C6FE0'; g.fillRect(fx - 3, fy - 8, 6, 12); }
      return;
    }
    if (p.kind === 'board') {
      g.fillStyle = '#7A5230'; g.fillRect(px + 6, py + 10, 6, 22); g.fillRect(px + pw - 12, py + 10, 6, 22);
      g.fillStyle = '#A9784A'; g.fillRect(px, py - 10, pw, 26); g.strokeStyle = '#6B4626'; g.lineWidth = 2; g.strokeRect(px, py - 10, pw, 26);
      ['#FFFFFF', '#FFF4C7', '#E2F6FA', '#FFFFFF'].forEach((c2, i) => { g.fillStyle = c2; g.fillRect(px + 10 + i * 28, py - 6, 20, 17); g.fillStyle = '#D8574A'; g.fillRect(px + 18 + i * 28, py - 8, 4, 4); });
      return;
    }
    const roofH = Math.round(ph * 0.48);
    g.fillStyle = '#F4EAD6'; g.fillRect(px + 4, py + roofH - 6, pw - 8, ph - roofH + 6);
    g.strokeStyle = '#B8A07A'; g.lineWidth = 2; g.strokeRect(px + 4, py + roofH - 6, pw - 8, ph - roofH + 6);
    g.fillStyle = p.roof; g.beginPath(); g.moveTo(px - 4, py + roofH); g.lineTo(px + 16, py); g.lineTo(px + pw - 16, py); g.lineTo(px + pw + 4, py + roofH); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 1; i < 4; i++) g.fillRect(px + 8, py + (roofH / 4) * i, pw - 16, 2);
    const doorX = p.door[0] * TS + TS - 14;
    g.fillStyle = '#7A5230'; g.fillRect(doorX, py + ph - 34, 28, 34); g.fillStyle = '#F5C542'; g.fillRect(doorX + 20, py + ph - 18, 3, 3);
    [[px + 18, py + roofH + 10], [px + pw - 46, py + roofH + 10]].forEach(([wx, wy]) => { g.fillStyle = '#9CD3F5'; g.fillRect(wx, wy, 28, 20); g.strokeStyle = '#FFFFFF'; g.lineWidth = 2; g.strokeRect(wx, wy, 28, 20); g.beginPath(); g.moveTo(wx + 14, wy); g.lineTo(wx + 14, wy + 20); g.stroke(); });
  }

  // ---------- state ----------
  const P = { x: 8.9 * TS, y: 9.4 * TS, dir: 'down', moving: false, step: 0 };
  const input = { jx: 0, jy: 0, keys: {} };
  let canvas, ctx, vw = 0, vh = 0, dpr = 1, paused = false, tAnim = 0, opts = {};
  let zoom = 1;
  let lastTile = '', stepsSince = 0, rustle = 0, flash = 0;

  function collides(nx, ny) {
    const hw = 9, top = 6, bot = 2;
    return [[nx - hw, ny - top], [nx + hw, ny - top], [nx - hw, ny + bot], [nx + hw, ny + bot]].some(([x, y]) => {
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) { const e = exitAt(tx, ty); if (!e) return true; if (locked(e)) { bump(e); return true; } return false; }
      return SOLID.has(M.grid[ty][tx]) || npcAt(tx, ty) || barricadeAt(tx, ty);
    });
  }
  let NPCS = {};
  const npcAt = (tx, ty) => (NPCS[M.id] || []).some((n) => !n.hidden && n.x === tx && n.y === ty);
  function setupNpcs(list) {
    NPCS = {};
    Object.keys(list).forEach((mapId) => {
      const mm = MAPS[mapId];
      NPCS[mapId] = list[mapId].map((cfg) => {
        const n = Object.assign({ dir: 'down', alert: 0, declined: false, turnT: 2 + Math.random() * 3 }, cfg);
        if (SOLID.has(mm.grid[n.y][n.x]) || mm.grid[n.y][n.x] === 'W' || mm.grid[n.y][n.x] === 'Z') mm.grid[n.y][n.x] = '.';
        n.frames = PXW.frames(n.pal);
        return n;
      });
    });
  }
  function facePlayer(n) {
    const dx = P.x / TS - (n.x + 0.5), dy = P.y / TS - (n.y + 0.9);
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  function inSight(n) {
    const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[n.dir];
    for (let k = 1; k <= 4; k++) {
      const x = n.x + v[0] * k, y = n.y + v[1] * k;
      if (x < 0 || y < 0 || x >= M.W || y >= M.H || SOLID.has(M.grid[y][x])) return false;
      if (x === tx && y === ty) return true;
    }
    return false;
  }
  const locked = (e) => !!(opts.exitLocked && opts.exitLocked(e));
  const barricadeAt = (tx, ty) => M.exits.some((e) => {
    if (!locked(e)) return false;
    if (e.edge === 'n') return ty === 1 && tx >= e.a && tx <= e.b; if (e.edge === 's') return ty === M.H - 2 && tx >= e.a && tx <= e.b;
    if (e.edge === 'w') return tx === 1 && ty >= e.a && ty <= e.b; return tx === M.W - 2 && ty >= e.a && ty <= e.b;
  }) && (bump(M.exits.find((e) => locked(e) && (((e.edge === 'n' && ty === 1) || (e.edge === 's' && ty === M.H - 2)) && tx >= e.a && tx <= e.b || ((e.edge === 'w' && tx === 1) || (e.edge === 'e' && tx === M.W - 2)) && ty >= e.a && ty <= e.b))), true);
  let lastBump = -Infinity;
  function bump(e) { const t = performance.now(); if (t - lastBump > 2500 && opts.onLocked) { lastBump = t; opts.onLocked(e); } }
  function nextHop(from, to) { // breadth-first over map exits
    if (!MAPS[to] || from === to) return to;
    const prev = { [from]: null }, q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; MAPS[c].exits.forEach((e) => { if (!(e.to in prev)) { prev[e.to] = c; q.push(e.to); } }); }
    if (!(to in prev)) return to;
    let c = to; while (prev[c] !== from && prev[c] !== null) c = prev[c]; return c;
  }
  function exitAt(tx, ty) {
    return M.exits.find((e) => (e.edge === 'n' && ty < 0 && tx >= e.a && tx <= e.b) || (e.edge === 's' && ty >= M.H && tx >= e.a && tx <= e.b) || (e.edge === 'w' && tx < 0 && ty >= e.a && ty <= e.b) || (e.edge === 'e' && tx >= M.W && ty >= e.a && ty <= e.b));
  }
  function enter(mapId, edgeFrom) {
    lastNear = null; fishAt = null; trail = []; FOL = null;
    const prev = M.id;
    M = MAPS[mapId];
    const spot = (M.arriveFrom && M.arriveFrom[prev]) || (mapId === 'town' && M.arrive[{ frost: 'n', ember: 's', moss: 'w', tide: 'e' }[prev]]) || M.spawn;
    P.x = spot[0] * TS; P.y = spot[1] * TS; lastTile = ''; stepsSince = 0;
    (NPCS[mapId] || []).forEach((n) => { n.declined = false; n.alert = 0; });
    if (canvas) prerender();
    if (opts.onMap) opts.onMap(M);
  }
  // ---------- map transitions: zoom toward the player, pixelate and darken, swap maps at the midpoint, then settle back ----------
  // go(mapId, pre?) is for real player moves (exits, doors, Travel); enter() stays instant for code and tests.
  // Reduce motion / calm mode: a short fade only. window.__noTransition (test hook) makes go() instant.
  let TR = null, fxC = null;
  function go(mapId, pre) {
    if (TR || !MAPS[mapId]) return;
    if (typeof window !== 'undefined' && window.__noTransition) { if (pre) enter(pre); enter(mapId); return; }
    const still = opts.still ? !!opts.still() : false;
    TR = { t: 0, dur: still ? 0.3 : 0.62, mapId: mapId, pre: pre || null, swapped: false, still: still };
    input.jx = 0; input.jy = 0; input.keys = {}; P.moving = false;
  }
  function stepTR(dt) {
    TR.t += dt;
    if (!TR.swapped && TR.t >= TR.dur / 2) { TR.swapped = true; if (TR.pre) enter(TR.pre); enter(TR.mapId); }
    if (TR.t >= TR.dur) TR = null;
  }
  function transitionFx() { // call last in draw(): everything already drawn is pixelated, zoomed and darkened by how far the transition is
    const u = Math.min(1, TR.t / TR.dur), kk = 1 - Math.abs(u * 2 - 1), k = kk * kk * (3 - 2 * kk), W = canvas.width, H = canvas.height;
    if (TR.still) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(10,14,30,' + (k * 0.9).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return; }
    const px = Math.max(1, Math.round((1 + k * 11) * dpr)), tw = Math.max(1, Math.ceil(W / px)), th = Math.max(1, Math.ceil(H / px)), z = 1 + 0.4 * k;
    if (!fxC) fxC = document.createElement('canvas');
    if (fxC.width !== tw || fxC.height !== th) { fxC.width = tw; fxC.height = th; }
    const f = fxC.getContext('2d'); f.imageSmoothingEnabled = true; f.drawImage(canvas, 0, 0, W, H, 0, 0, tw, th);
    const pc = lastPlayerScreen ? [lastPlayerScreen.x * dpr, (lastPlayerScreen.y - 18) * dpr] : [W / 2, H / 2];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#0A0E1E'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(fxC, 0, 0, tw, th, pc[0] - pc[0] * z, pc[1] - pc[1] * z, tw * px * z, th * px * z);
    ctx.fillStyle = 'rgba(10,14,30,' + (k * k * 0.92).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function nearest() {
    const tx = P.x / TS, ty = P.y / TS; let best = null, bd = 1.7;
    (NPCS[M.id] || []).forEach((n) => { if (n.hidden) return; const d = Math.hypot(tx - (n.x + 0.5), ty - (n.y + 0.9)); if (d < 1.45 && d < bd + 0.3) { bd = Math.min(bd, d); best = { kind: 'npc', npc: n }; } });
    if (best) return best;
    M.places.forEach((p) => { const [dx, dy] = p.door; const d = Math.hypot(tx - (dx + 1), ty - (dy + 1.1)); if (d < bd) { bd = d; best = { kind: 'place', place: p }; } });
    M.signs.forEach((s) => { const d = Math.hypot(tx - (s.x + 0.5), ty - (s.y + 0.5)); if (d < Math.min(bd, 1.6)) { bd = d; best = { kind: 'sign', sign: s }; } });
    (M.objects || []).forEach((o) => { if (o.hidden) return; const d = Math.hypot(tx - (o.x + 0.5), ty - (o.y + 0.5)); if (d < Math.min(bd, o.reach || 1.7)) { bd = d; best = { kind: 'object', obj: o }; } });
    if (!best && !(M.theme && M.theme.lava) && !M.interior) { // fishing: water next to you
      const fx = Math.floor(tx), fy = Math.floor(ty - 0.3), dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, f = dirs[P.dir] || [0, 1];
      const cand = [[fx + f[0], fy + f[1]], [fx, fy - 1], [fx, fy + 1], [fx - 1, fy], [fx + 1, fy]];
      const w = cand.find(([x, y]) => M.grid[y] && M.grid[y][x] === '~');
      if (w) best = { kind: 'water', x: w[0], y: w[1] };
    }
    return best;
  }
  let lastNear = null;
  let trail = [], FOL = null, fishAt = null; // follower critter (visual only) + fishing bobber
  function followerReset() { trail = []; FOL = { x: P.x, y: P.y + 2, moving: false }; }
  function followerStep() {
    if (!FOL) followerReset();
    if (Math.hypot(P.x - FOL.x, P.y - FOL.y) > TS * 6) { followerReset(); return; }   // the player was moved far (a teleport): the follower catches up at once
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(P.x - last.x, P.y - last.y) > 2) { trail.push({ x: P.x, y: P.y }); if (trail.length > 60) trail.shift(); }
    let dist = 0, tgt = null;
    for (let i = trail.length - 1; i > 0; i--) { dist += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y); if (dist >= TS * 1.05) { tgt = trail[i - 1]; break; } }
    if (tgt) { const ox = FOL.x, oy = FOL.y; FOL.moving = Math.hypot(tgt.x - FOL.x, tgt.y - FOL.y) > 0.5; FOL.x += (tgt.x - FOL.x) * 0.35; FOL.y += (tgt.y - FOL.y) * 0.35;
      const mx = FOL.x - ox, my = FOL.y - oy; if (Math.hypot(mx, my) > 0.15) { FOL.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up'); } if (FOL.moving) FOL.step = (FOL.step || 0) + 0.15; } else FOL.moving = false;
  }
  // critter-lead mode (Settings, with action mode): you steer the critter; the human walks behind it. P stays "the controlled body" for collisions, interactions, exits and the camera.
  let LEAD = false;
  function critterLead(fol) { return !!(fol && fol.img && fol.img.complete && opts.critterLead && opts.critterLead()); }
  function update(dt) {
    if (paused || TR) { P.moving = false; return; }
    followerStep();
    if (typeof ACT !== 'undefined') { const fl = opts.follower ? opts.follower() : null; LEAD = critterLead(fl); if (!LEAD) { P.ox = 0; P.oy = 0; } ACT.step({ M: M, TS: TS, P: LEAD ? FOL : P, FOL: LEAD ? P : FOL, lead: LEAD, fol: fl, dt: dt, solidAt: (x, y) => solidAt(x, y) }); }
    let vx = input.jx, vy = input.jy; const k = input.keys;
    if (k.ArrowLeft || k.a) vx -= 1; if (k.ArrowRight || k.d) vx += 1; if (k.ArrowUp || k.w) vy -= 1; if (k.ArrowDown || k.s) vy += 1;
    const len = Math.hypot(vx, vy);
    if (len > 0.15) {
      const sp = 4.2 * TS * dt * Math.min(1, len); vx /= len; vy /= len;
      const nx = P.x + vx * sp, ny = P.y + vy * sp;
      if (!collides(nx, P.y)) P.x = nx;
      if (!collides(P.x, ny)) P.y = ny;
      P.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      P.moving = true; P.step += dt * 9;
    } else P.moving = false;
    // left the map through an exit?
    const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
    if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) { const e = exitAt(tx, ty); if (e) { go(e.to); return; } }
    // grass steps
    const key = tx + ',' + ty;
    if (key !== lastTile) {
      lastTile = key; stepsSince += 1;
      const t = M.grid[ty] && M.grid[ty][tx];
      if (t === 'W' || t === 'Z') {
        rustle = 0.35;
        if (opts.onGrass) opts.onGrass();
        const rate = t === 'Z' ? 0.22 : M.rate;
        if (stepsSince >= 3 && opts.random() < rate && opts.onEncounter && !(typeof ACT !== 'undefined' && ACT.active())) {
          stepsSince = 0;
          opts.onEncounter({ types: M.types, rare: t === 'Z', zone: M.name });
        }
      }
    }
    rustle = Math.max(0, rustle - dt); flash = Math.max(0, flash - dt);
    // trainers watch a straight line in front of them
    (NPCS[M.id] || []).forEach((n) => {
      if (n.hidden) return;
      if (n.trainer) {
        if (!n.declined && n.alert === 0 && opts.canChallenge && opts.canChallenge(n) && inSight(n)) {
          n.declined = true; // one sighting per visit: resets when you re-enter the map
          n.alert = 0.8; paused = true; input.jx = 0; input.jy = 0; if (opts.onAlert) opts.onAlert(n);
          setTimeout(() => { n.alert = 0; if (opts.onSpotted) opts.onSpotted(n); }, 750);
        }
      } else if (!n.leader) { n.turnT -= dt; if (n.turnT <= 0) { n.turnT = 2.5 + Math.random() * 4; n.dir = ['down', 'left', 'right', 'down'][Math.floor(Math.random() * 4)]; } }
    });
    const n = nearest(); const nk = n ? (n.place ? n.place.id : (n.obj ? 'obj' + n.obj.id : n.npc ? 'npc' + n.npc.id : (n.sign ? 'sign' + n.sign.x + ',' + n.sign.y : n.kind + n.x + ',' + n.y))) : null;
    if (nk !== lastNear) { lastNear = nk; if (opts.onNear) opts.onNear(n); }
  }
  let FR = null, lastPlayerScreen = null, lastCam = null, tintNow = 'day';
  function drawPlayer(sx, sy, body) {
    if (!body && opts.carry && opts.carry()) { ctx.fillStyle = '#14101E'; ctx.fillRect(sx - 7, sy - 46, 14, 6); ctx.fillStyle = '#A87A48'; ctx.fillRect(sx - 6, sy - 45, 12, 4); ctx.fillStyle = '#C9986A'; ctx.fillRect(sx - 6, sy - 45, 12, 1); }   // a log carried on the shoulders (Blaze's trial)
    if (!FR) FR = PXW.frames();
    const B = body || P, x = Math.round(sx * dpr) / dpr, y = Math.round(sy * dpr) / dpr;
    if (!body) lastPlayerScreen = { x: x, y: y };
    ctx.fillStyle = 'rgba(10,30,10,0.32)'; ctx.fillRect(x - 10, y - 2, 20, 4); ctx.fillRect(x - 8, y - 4, 16, 8);
    const f = B.moving ? (Math.floor((B.step || 0) / 1.6) % 2 ? 1 : 2) : 0;
    ctx.drawImage(FR[B.dir || 'down'][f], x - 16, y - 38, 32, 40);
    const t = M.grid[Math.floor(B.y / TS)] && M.grid[Math.floor(B.y / TS)][Math.floor(B.x / TS)];
    if (t === 'W' || t === 'Z') {
      const pal = PXW.PAL[M.id] || PXW.PAL.town, sway = rustle > 0 ? (Math.floor(tAnim * 20) % 2) * 2 : 0;
      for (let i = -3; i <= 3; i++) { const bx = x + i * 5 + sway; ctx.fillStyle = pal.tb; ctx.fillRect(bx - 2, y - 8, 4, 10); ctx.fillStyle = t === 'Z' ? '#FFF7D6' : pal.th; ctx.fillRect(bx - 2, y - 10, 2, 4); }
    }
  }
  function drawCritterAt(fol, wx, wy, moving, cx, cy, snap, isBody) {
    const x = snap(wx - cx), y = snap(wy - cy), hop = moving ? Math.abs(Math.sin(tAnim * 12)) * 3 : Math.abs(Math.sin(tAnim * 2)) * 1;
    const w = 30, h = Math.round(30 * fol.img.height / Math.max(1, fol.img.width));
    if (isBody) lastPlayerScreen = { x: x, y: y };
    ctx.fillStyle = 'rgba(10,30,10,0.28)'; ctx.fillRect(x - 8, y - 2, 16, 3); ctx.fillRect(x - 6, y - 3, 12, 5);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(fol.img, Math.round(x - w / 2), Math.round(y - h - hop), w, h);
    if (fol.shiny && Math.floor(tAnim * 1.5) % 3 === 0) { const sx = x + 10 - (Math.floor(tAnim * 6) % 3) * 6, sy = y - h - 2 - hop; ctx.fillStyle = '#FFF3B0'; ctx.fillRect(sx - 1, sy - 4, 2, 8); ctx.fillRect(sx - 4, sy - 1, 8, 2); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx - 1, sy - 1, 2, 2); }
    if (isBody) { const t = M.grid[Math.floor(wy / TS)] && M.grid[Math.floor(wy / TS)][Math.floor(wx / TS)]; if (t === 'W' || t === 'Z') { const pal = PXW.PAL[M.id] || PXW.PAL.town, sway = rustle > 0 ? (Math.floor(tAnim * 20) % 2) * 2 : 0; for (let i = -3; i <= 3; i++) { const bx = x + i * 5 + sway; ctx.fillStyle = pal.tb; ctx.fillRect(bx - 2, y - 8, 4, 10); ctx.fillStyle = t === 'Z' ? '#FFF7D6' : pal.th; ctx.fillRect(bx - 2, y - 10, 2, 4); } } }
  }
  function drawTag(text, sx, sy, gold) {
    ctx.font = '600 13px "Pixelify Sans", Nunito, sans-serif';
    const w = Math.round((ctx.measureText(text).width + 14) / 2) * 2, x = Math.round((sx - w / 2) * dpr) / dpr, y = Math.round((sy - 11) * dpr) / dpr;
    ctx.fillStyle = gold ? '#8A6510' : '#0E1A38'; ctx.fillRect(x, y + 2, w, 18); ctx.fillRect(x + 2, y, w - 4, 22);
    ctx.fillStyle = gold ? '#FFD86B' : '#1E2A4A'; ctx.fillRect(x + 2, y + 2, w - 4, 18);
    ctx.fillStyle = gold ? '#FFF1BF' : '#3A4A78'; ctx.fillRect(x + 2, y + 2, w - 4, 2);
    ctx.fillStyle = gold ? '#2A1B00' : '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + 12);
  }
  // dark dungeons: a dark layer with stepped light circles around the player and around lit objects (braziers, fires)
  let darkC = null;
  // dark dungeons: the screen is covered in 8 px dark blocks whose darkness steps up with the distance to the nearest light (the player, lit braziers, fires).
  // Runs of equal darkness are batched into one fill per level, so there is no offscreen canvas and no full-screen blending.
  const DARK_A = [0.04, 0.12, 0.26, 0.45, 0.68, 0.95], DARK_D = [0.26, 0.42, 0.6, 0.8, 1.0];   // darkness per ring, ring edges as a fraction of the light radius
  function drawDark(cx, cy, pxs, pys) {
    const still = opts.still ? opts.still() : false, flick = still ? 1 : 1 + 0.025 * Math.sin(tAnim * 7), lights = [];
    const add = (x, y, r) => { r *= flick; if (x + r < 0 || x - r > vw || y + r < 0 || y - r > vh) return; lights.push([x, y, r * r]); };
    add(pxs - cx, pys - cy - 14, M.dark.r * TS);
    (M.objects || []).forEach((o) => { const r = ADV.LIGHT[o.kind] ? ADV.LIGHT[o.kind](o, opts.objState ? opts.objState(o) : null) : 0; if (r) add((o.x + 0.5) * TS - cx, (o.y + 0.5) * TS - cy, r * TS); });
    const C = 8, cols = Math.ceil(vw / C), rows = Math.ceil(vh / C), paths = DARK_A.map(() => new Path2D());
    for (let ry = 0; ry < rows; ry++) {
      const py = ry * C + C / 2; let run = -1, lvl = -1;
      for (let rx = 0; rx <= cols; rx++) {
        let l = -2;
        if (rx < cols) {
          const px = rx * C + C / 2; let best = 9;   // smallest (distance / radius)^2 over all lights
          for (let k = 0; k < lights.length; k++) { const L = lights[k], dx = px - L[0], dy = py - L[1], q = (dx * dx + dy * dy) / L[2]; if (q < best) best = q; }
          l = 5; for (let d = 0; d < 5; d++) if (best < DARK_D[d] * DARK_D[d]) { l = d; break; }
        }
        if (l !== lvl) { if (lvl >= 0) paths[lvl].rect(run * C, ry * C, (rx - run) * C, C); run = rx; lvl = l; }
      }
    }
    DARK_A.forEach((a, k) => { ctx.fillStyle = 'rgba(3,5,16,' + a + ')'; ctx.fill(paths[k]); });
  }
  const hash2 = (a, b, c) => { let h = Math.imul(a + 374761393, 668265263) ^ Math.imul(b + 1274126177, 2246822519) ^ Math.imul(c + 99, 3266489917); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // rain ripples / storm whitecaps on visible water tiles (pixel rings, 2 px steps)
  function waterFx(kind, cx, cy) {
    const x0 = Math.max(0, Math.floor(cx / TS)), x1 = Math.min(M.W - 1, Math.floor((cx + vw) / TS)), y0 = Math.max(0, Math.floor(cy / TS)), y1 = Math.min(M.H - 1, Math.floor((cy + vh) / TS));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (M.grid[ty][tx] !== '~') continue;
      const sx = Math.round(tx * TS - cx), sy = Math.round(ty * TS - cy);
      if (kind === 'storm') { // choppy whitecaps flicker on and off
        const f = Math.floor(tAnim * 2.5); ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let k = 0; k < 2; k++) if (hash2(tx, ty, f * 2 + k) < 0.35) { const ox = Math.floor(hash2(tx, ty, 50 + k + f) * 20) & ~1, oy = (6 + Math.floor(hash2(tx, ty, 90 + k) * 18)) & ~1; ctx.fillRect(sx + ox, sy + oy, 8, 2); ctx.fillRect(sx + ox + 2, sy + oy - 2, 4, 2); }
      } else {
        for (let k = 0; k < 2; k++) { const ph = (tAnim * 0.9 + hash2(tx, ty, k) * 3) % 1.6; if (ph > 0.8) continue;
          const sz = 2 + Math.floor(ph * 8) * 2, ox = 8 + Math.floor(hash2(tx, ty, 10 + k) * 14), oy = 8 + Math.floor(hash2(tx, ty, 20 + k) * 14), a = (1 - ph / 0.8) * 0.55;
          ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; const w = sz * 2, h = sz, x = sx + (ox & ~1) - sz, y = sy + (oy & ~1) - (sz >> 1);
          ctx.fillRect(x + 2, y, w - 4, 2); ctx.fillRect(x + 2, y + h - 2, w - 4, 2); ctx.fillRect(x, y + 2, 2, Math.max(0, h - 4)); ctx.fillRect(x + w - 2, y + 2, 2, Math.max(0, h - 4)); }
      }
    }
  }
  // snow settles on the roofs of ordinary buildings
  function snowCaps(cx, cy) {
    M.places.forEach((p) => {
      if (p.w < 3 || ['board', 'device', 'shrine'].indexOf(p.kind) !== -1) return;
      const x = Math.round(p.x * TS - cx), y = Math.round(p.y * TS - cy), w = p.w * TS; if (x > vw + 40 || x + w < -40 || y > vh + 40 || y + p.h * TS < -40) return;
      const roofH = Math.round(p.h * TS * 0.5), capH = Math.max(12, Math.round(roofH * 0.36) & ~1);
      ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fillRect(x + 6, y + 2, w - 12, 4); ctx.fillRect(x + 2, y + 6, w - 4, capH - 4);
      ctx.fillStyle = 'rgba(200,216,238,0.97)'; ctx.fillRect(x + 2, y + capH + 2, w - 4, 2); // shaded lower edge
      for (let i = 0; i < Math.floor((w - 4) / 6); i++) { const dr = ((i * 7 + p.x) % 3) * 2; ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fillRect(x + 2 + i * 6, y + capH + 4, 4, 2 + dr); }
    });
  }
  // ---- wind (Meaning per place: wind is change, so it blows where things change; the cold is stillness, so there it never blows, not even in a storm). Each place has a character: how strong it can get (base) and how much of the time it is calm (calm 0 = it never stops). The strength then changes over time by itself, from three slow waves that never line up, so a sheltered forest breathes now and then and a pass is always moving. ----
  const WINDS = { town: { base: 0.5, calm: 0.5 }, moss: { base: 0.55, calm: 0.6 }, tide: { base: 0.85, calm: 0.05 }, ember: { base: 1, calm: 0.25 }, 'route-mf': { base: 0.8, calm: 0.1 }, 'route-cm': { base: 1, calm: 0.25 }, 'route-cc': { base: 0.85, calm: 0.05 }, frost: { base: 0 }, peak: { base: 0 }, 'route-fc': { base: 0 } };
  const hashS = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
  // the wind strength 0..1 of a map at time t (seconds), before weather, night or a gust (a pure function, so tests can sample it)
  function windLevel(mapId, t, region) {
    const c = WINDS[region] || { base: 0.5, calm: 0.4 }; if (!(c.base > 0)) return 0;
    const sd = hashS(mapId), base = Math.min(1, c.base * (0.85 + 0.3 * hashS(mapId + 'b'))), ph1 = sd * 6.28, ph2 = hashS(mapId + 'c') * 6.28, ph3 = hashS(mapId + 'd') * 6.28;
    const n = 0.5 + 0.5 * (0.5 * Math.sin(6.283 * t / 23 + ph1) + 0.3 * Math.sin(6.283 * t / 37 + ph2) + 0.2 * Math.sin(6.283 * t / 61 + ph3));
    if (c.calm < 0.15) return base * (0.75 + 0.25 * n);
    const lo = 0.2 + 0.5 * c.calm; return base * Math.max(0, Math.min(1, (n - lo) / 0.25));
  }
  let gustUntil = 0, lastWind = null, windClass = 0, lastPic = null, fade = null, lastKf = 0, windPh = 0, windT = 0;
  const SIN6F = [0, 0.87, 0.87, 0, -0.87, -0.87];   // the same six poses the trees use
  function windNow() {
    if (M.interior || M.dark || M.cave || /^dg-/.test(M.id) || (opts.still && opts.still())) return { A: 0, fps: 0, s: 0 };
    const rg = typeof WEATHER !== 'undefined' && WEATHER.region ? WEATHER.region(M.id) : null; if (!((WINDS[rg] || { base: 0.5 }).base > 0)) return { A: 0, fps: 0, s: 0 };
    let s = windLevel(M.id, performance.now() / 1000, rg);
    const wk = opts.weather ? opts.weather() : null; if (wk === 'storm') s = Math.min(1, s * 1.4 + 0.25); else if (wk === 'rain') s = Math.min(1, s * 1.15); else if (wk === 'fog') s *= 0.5;
    if ((opts.tint ? opts.tint() : 'day') === 'night') s *= 0.6;   // the night is calmer
    if (performance.now() < gustUntil) s = 1;
    if (typeof window.__wind === 'number') s = window.__wind;   // test hook
    const prev = windClass, cls = s < (prev === 0 ? 0.14 : 0.1) ? 0 : (s >= (prev === 2 ? 0.66 : 0.74) ? 2 : 1); windClass = cls;   // a little hysteresis, so a strength hovering at a threshold does not flicker
    return { A: cls, fps: 1.5 + 1.5 * s, s: s };
  }
  function draw() {
    if (!terrain || terrainFor !== M.id) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mw = M.W * TS, mh = M.H * TS;
    // camera is built from the player's snapped position, so the player never moves relative to the screen
    const snap = (v) => Math.round(v * dpr) / dpr;
    const pxs = snap(P.x), pys = snap(P.y);
    let cx = pxs - snap(vw / 2), cy = pys - snap(vh * 0.55);
    cx = snap(mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx)));
    cy = snap(mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy)));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = M.theme.bg; ctx.fillRect(0, 0, vw, vh);
    // the picture is one of six baked frames (the still terrain plus the trees, grass, flowers and water in that pose); only the part on screen is copied
    let pic = terrain;
    // the pose is the running SUM of (speed x time), never time x speed: when the wind changes the pose keeps going from where it was instead of jumping
    if (terrain.anim) { const wd = windNow(); windPh += wd.fps * Math.min(0.1, Math.max(0, tAnim - windT)); windT = tAnim; const kf = wd.A ? Math.floor(windPh) % 6 : 0; lastKf = kf; if (lastWind && lastWind.A !== wd.A && lastPic) fade = { pic: lastPic, t0: performance.now() }; lastWind = wd; pic = terrain.anim.sets[wd.A] && terrain.anim.sets[wd.A][kf]; if (!pic) { const have = PXW.baked(terrain, wd.A); pic = have.length ? have[0] : PXW.bake(terrain, kf, wd.A); } PXW.fill(terrain, wd.A, performance.now()); lastPic = pic; }
    const sx0 = Math.max(0, Math.floor(cx / 2)), sy0 = Math.max(0, Math.floor(cy / 2)), sw = Math.max(1, Math.min(pic.width - sx0, Math.ceil(vw / 2) + 2)), sh = Math.max(1, Math.min(pic.height - sy0, Math.ceil(vh / 2) + 2));
    const fp = fade ? (performance.now() - fade.t0) / 300 : 1;   // a change of wind class fades over 0.3 s instead of jumping
    if (fade && fp < 1 && fade.pic.width === pic.width) { ctx.drawImage(fade.pic, sx0, sy0, sw, sh, sx0 * 2 - cx, sy0 * 2 - cy, sw * 2, sh * 2); ctx.globalAlpha = Math.max(0, fp); ctx.drawImage(pic, sx0, sy0, sw, sh, sx0 * 2 - cx, sy0 * 2 - cy, sw * 2, sh * 2); ctx.globalAlpha = 1; } else { fade = null; ctx.drawImage(pic, sx0, sy0, sw, sh, sx0 * 2 - cx, sy0 * 2 - cy, sw * 2, sh * 2); }
    if (typeof VFX !== 'undefined') { const sk = VFX.shakeNow(tAnim); if (sk.x || sk.y) { cx += sk.x; cy += sk.y; } }   // a blow shakes the camera along its direction (off in Reduce motion)
    lastCam = { cx: cx, cy: cy };
    if (M.id === 'town') {
      const sh = M.places[2], gx = (sh.x + sh.w / 2) * TS - cx, gy = (sh.y + sh.h / 2) * TS - cy + 6, pulse = 0.6 + 0.4 * Math.sin(tAnim * 2.2);
      const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 46); grd.addColorStop(0, 'rgba(255,216,107,' + (0.75 * pulse) + ')'); grd.addColorStop(1, 'rgba(255,216,107,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(gx, gy, 46, 0, 6.3); ctx.fill();
      { const bx = snap(gx), by = snap(gy - 10 - Math.round(pulse * 3 / 2) * 2);
        const rows = ['...o...', '..oyo..', '.oyywo.', 'oyyywwo', '.oyyyo.', '..oyo..', '...o...'];
        rows.forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) { const ch = row[xx]; if (ch === '.') continue; ctx.fillStyle = ch === 'o' ? '#8A6510' : (ch === 'w' ? '#FFFFFF' : '#FFD86B'); ctx.fillRect(bx - 7 + xx * 2, by - 7 + yy * 2 - 8, 2, 2); } }); }
      const fx = 22 * TS - cx, fy = 20 * TS - cy; ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 3; i++) { const a = tAnim * 3 + i * 2.1; ctx.fillRect(snap(fx + Math.round(Math.cos(a) * 5) * 2), snap(fy - 6 + Math.round(Math.sin(a * 1.3) * 2) * 2), 2, 2); }
    }
    if (M.rare) {
      const rr = M.rare;
      for (let i = 0; i < 6; i++) {
        const a = tAnim * 1.7 + i * 1.05, sx = (rr.x + 1.5) * TS - cx + Math.cos(a) * 34, sy = (rr.y + 1.5) * TS - cy + Math.sin(a * 1.3) * 26, s = 3 + 2 * Math.sin(tAnim * 4 + i);
        const qx = snap((rr.x + 1.5) * TS - cx + Math.round(Math.cos(a) * 17) * 2), qy = snap((rr.y + 1.5) * TS - cy + Math.round(Math.sin(a * 1.3) * 13) * 2); ctx.fillStyle = '#FFF7D6'; ctx.fillRect(qx, qy, 2, 2); if (s > 3.5) { ctx.fillStyle = '#FFD86B'; ctx.fillRect(qx - 2, qy, 2, 2); ctx.fillRect(qx + 2, qy, 2, 2); ctx.fillRect(qx, qy - 2, 2, 2); ctx.fillRect(qx, qy + 2, 2, 2); }
      }
    }
    // stone platform under leaders
    (NPCS[M.id] || []).forEach((n) => { if (!n.leader) return; const x = snap(n.x * TS - cx), y = snap(n.y * TS - cy);
      ctx.fillStyle = '#4A5878'; ctx.fillRect(x - 10, y - 6, 52, 44); ctx.fillStyle = '#C9D3E6'; ctx.fillRect(x - 8, y - 4, 48, 40); ctx.fillStyle = '#A8B4CC'; ctx.fillRect(x - 8, y + 16, 48, 2); ctx.fillRect(x + 14, y - 4, 2, 40);
      ctx.fillStyle = '#FFD86B'; [[-8, -4], [38, -4], [-8, 34], [38, 34]].forEach(([a, c2]) => ctx.fillRect(x + a, y + c2, 2, 2)); });
    // barricades on locked trails
    M.exits.forEach((e) => { if (!locked(e)) return;
      for (let k = e.a; k <= e.b; k++) {
        const tx = e.edge === 'n' || e.edge === 's' ? k : (e.edge === 'w' ? 1 : M.W - 2), ty = e.edge === 'n' ? 1 : (e.edge === 's' ? M.H - 2 : k);
        const x = snap(tx * TS - cx), y = snap(ty * TS - cy);
        ctx.fillStyle = '#4A2A14'; ctx.fillRect(x + 2, y + 6, 6, 26); ctx.fillRect(x + 24, y + 6, 6, 26);
        ctx.fillStyle = '#4A2A14'; ctx.fillRect(x, y + 8, 32, 12);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#F8F8F8' : '#D8574A'; ctx.fillRect(x + 2 + i * 7, y + 10, 7, 8); }
      } });
    // ambient scenery critters + weather on the ground (ripples, whitecaps, snow caps), under the entities
    const wk = M.interior ? null : (opts.weather ? opts.weather() : null), todNow = M.interior ? 'day' : (opts.tint ? opts.tint() : 'day');
    const ambEnv = { M: M, TS: TS, wind: lastWind ? lastWind.s : 0, solidAt: (x, y) => solidAt(x, y), tileAt: (x, y) => (M.grid[y] ? M.grid[y][x] : 'T'), player: { x: P.x, y: P.y }, cx: cx, cy: cy, vw: vw, vh: vh, t: tAnim, dt: frameDt, tod: todNow, weather: wk, still: opts.still ? opts.still() : false, on: opts.ambient ? opts.ambient() : true };
    if (typeof AMBIENT !== 'undefined') AMBIENT.draw(ctx, 'ground', ambEnv);
    if (!ambEnv.still && (wk === 'rain' || wk === 'storm')) waterFx(wk, cx, cy);
    if (wk === 'snow') snowCaps(cx, cy);
    const fol = opts.follower ? opts.follower() : null;
    if (!FOL) followerReset();
    const list = (NPCS[M.id] || []).filter((n) => !n.hidden).map((n) => ({ y: (n.y + 0.9) * TS, n: n })).concat((M.objects || []).filter((o) => !o.hidden).map((o) => ({ y: (o.y + 0.95) * TS, o: o }))).concat([{ y: P.y, p: true }]).concat(fol && fol.img && fol.img.complete ? [{ y: FOL.y, f: true }] : []).sort((a, b) => a.y - b.y);
    LEAD = critterLead(fol); if (!LEAD) { P.ox = 0; P.oy = 0; }
    const actEnv = { M: M, TS: TS, P: LEAD ? FOL : P, FOL: LEAD ? P : FOL, lead: LEAD, fol: fol, ctx: ctx, cx: cx, cy: cy, vw: vw, vh: vh, t: tAnim, snap: snap };
    if (typeof ACT !== 'undefined') ACT.items(actEnv).forEach((a) => list.push(a));
    list.sort((a, b) => a.y - b.y);
    list.forEach((it) => {
      if (it.fn) { it.fn(ctx); return; }
      if (it.p) { if (LEAD) drawCritterAt(fol, P.x + (P.ox || 0), P.y + (P.oy || 0), P.moving, cx, cy, snap, true); else drawPlayer(pxs - cx, pys - cy); return; }
      if (it.o) { const o = it.o, ox = snap(o.x * TS - cx), oy = snap(o.y * TS - cy), far = ox < -40 || ox > vw + 40 || oy < -50 || oy > vh + 50; if (far && o.kind !== 'postlamp') return; const st = opts.objState ? (opts.objState(o) || {}) : {}, art = ADV.ART[o.kind]; if (far) return; /* a post lamp's state eases over time, so it is stepped even off screen (otherwise the lamps ahead light only once they are in view) */ if (art) { ctx.save(); ctx.translate(ox, oy); art(ctx, 0, 0, st, tAnim, o); ctx.restore(); } return; }   // drawn from its own origin: the art snaps to a 2 px grid, which must be relative to the object, not the screen, or it jitters against the ground while the camera moves

      if (it.f && LEAD) { drawPlayer(snap(FOL.x - cx), snap(FOL.y - cy), { x: FOL.x, y: FOL.y, dir: FOL.dir || P.dir, moving: FOL.moving, step: FOL.step || 0 }); return; }
      if (it.f) {
        const x = snap(FOL.x + (FOL.ox || 0) - cx), y = snap(FOL.y + (FOL.oy || 0) - cy), hop = FOL.moving ? Math.abs(Math.sin(tAnim * 12)) * 3 : Math.abs(Math.sin(tAnim * 2)) * 1;
        const w = 30, h = Math.round(30 * fol.img.height / Math.max(1, fol.img.width));
        ctx.fillStyle = 'rgba(10,30,10,0.28)'; ctx.fillRect(x - 8, y - 2, 16, 3); ctx.fillRect(x - 6, y - 3, 12, 5);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(fol.img, Math.round(x - w / 2), Math.round(y - h - hop), w, h);
        if (fol.shiny && Math.floor(tAnim * 1.5) % 3 === 0) { const sx = x + 10 - (Math.floor(tAnim * 6) % 3) * 6, sy = y - h - 2 - hop; ctx.fillStyle = '#FFF3B0'; ctx.fillRect(sx - 1, sy - 4, 2, 8); ctx.fillRect(sx - 4, sy - 1, 8, 2); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(sx - 1, sy - 1, 2, 2); }
        return;
      }
      const n = it.n, x = snap((n.x + 0.5) * TS - cx), y = snap((n.y + 0.9) * TS - cy);
      if (x < -40 || x > vw + 40 || y < -60 || y > vh + 60) return;
      ctx.fillStyle = 'rgba(10,30,10,0.32)'; ctx.fillRect(x - 10, y - 2, 20, 4); ctx.fillRect(x - 8, y - 4, 16, 8);
      ctx.drawImage(n.frames[n.dir][0], x - 16, y - 38, 32, 40);
      if (n.alert > 0) { ctx.fillStyle = '#1E2A4A'; ctx.fillRect(x - 8, y - 66, 16, 22); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x - 6, y - 64, 12, 18); ctx.fillStyle = '#D8574A'; ctx.fillRect(x - 2, y - 61, 4, 9); ctx.fillRect(x - 2, y - 50, 4, 3); }
    });
    if (typeof ACT !== 'undefined') ACT.drawFx(actEnv);
    if (typeof AMBIENT !== 'undefined') AMBIENT.draw(ctx, 'air', ambEnv);
    if (fishAt) { // bobber
      const bx = snap((fishAt.x + 0.5) * TS - cx), by = snap((fishAt.y + 0.55) * TS - cy + Math.sin(tAnim * (fishAt.bite ? 22 : 4)) * (fishAt.bite ? 3 : 1.5));
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx - 8, by + 3, 16, 2);
      ctx.fillStyle = '#1E2A4A'; ctx.fillRect(bx - 4, by - 6, 8, 10); ctx.fillStyle = '#D8574A'; ctx.fillRect(bx - 3, by - 5, 6, 4); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(bx - 3, by - 1, 6, 4);
    }
    // the Sealed Arch's open doorway: a swirling glow between the pillars
    (M.objects || []).forEach((o) => { if (!o.portal || !(opts.objState && (opts.objState(o) || {}).open)) return;
      const X = snap(o.portal.x * TS - cx), Y = snap(o.portal.y * TS - cy), k = 0.5 + 0.5 * Math.sin(tAnim * 2.4);
      if (X < -140 || X > vw + 40 || Y < -120 || Y > vh + 40) return;
      const gr = ctx.createLinearGradient(0, Y + 28, 0, Y + 92); gr.addColorStop(0, 'rgba(190,150,255,' + (0.55 + 0.3 * k).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(60,40,140,0.9)');
      ctx.fillStyle = gr; ctx.fillRect(X + 34, Y + 28, 60, 64);
      for (let i = 0; i < 9; i++) { const px2 = X + 40 + ((i * 17 + Math.floor(tAnim * 6) * 3) % 48), py2 = Y + 34 + ((i * 23 + Math.floor(tAnim * 12 + i * 5)) % 52); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,216,107,0.9)'; ctx.fillRect(px2 & ~1, py2 & ~1, 2, 2); }
    });
    // a lit beacon: a shaft of light rising from its lantern (objects with `beam`, when their state says lit)
    const drawBeam = (bx2, by2, k) => {
      if (bx2 < -60 || bx2 > vw + 60 || by2 < -vh) return;
      const gr = ctx.createLinearGradient(0, by2, 0, 0); gr.addColorStop(0, 'rgba(255,236,160,' + (0.75 * k).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,236,160,0)');
      ctx.fillStyle = gr; ctx.fillRect(bx2 - 14, 0, 28, by2); ctx.fillStyle = 'rgba(255,248,200,' + (0.35 * k).toFixed(2) + ')'; ctx.fillRect(bx2 - 5, 0, 10, by2);
      const gl = ctx.createRadialGradient(bx2, by2, 2, bx2, by2, 56); gl.addColorStop(0, 'rgba(255,236,160,0.8)'); gl.addColorStop(1, 'rgba(255,236,160,0)'); ctx.fillStyle = gl; ctx.fillRect(bx2 - 56, by2 - 56, 112, 112);
    };
    (M.objects || []).forEach((o) => { if (!o.beam || !(opts.objState && (opts.objState(o) || {}).lit)) return; drawBeam(snap(o.beam.x * TS - cx), snap(o.beam.y * TS - cy), 0.6 + 0.4 * Math.sin(tAnim * 3)); });
    // once the great lamp is lit the land answers: every lighthouse throws a beam inland, day and night
    if (opts.relit && opts.relit()) (M.props || []).forEach((pr) => { if (pr.id === 'lighthouse') drawBeam(snap((pr.x + pr.w / 2) * TS - cx), snap((pr.y + 0.6) * TS - cy), 0.5 + 0.35 * Math.sin(tAnim * 2.2 + pr.x)); });
    // home: with three seals the lamp in the window is on, by day as well
    if (M.id === 'town' && opts.homeLit && opts.homeLit()) { const hp = M.places.find((q) => q.id === 'home'); if (hp) { const roofH = Math.round(hp.h * 32 * 0.5), x = snap(hp.x * TS + 16 - cx), y = snap(hp.y * TS + roofH + 8 - cy), k = 0.85 + 0.15 * Math.sin(tAnim * 1.7);
      const gr = ctx.createRadialGradient(x + 14, y + 10, 2, x + 14, y + 10, 38); gr.addColorStop(0, 'rgba(255,214,120,' + (0.6 * k).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = gr; ctx.fillRect(x - 28, y - 30, 84, 80); ctx.fillStyle = '#FFD86B'; ctx.fillRect(x, y, 28, 20); } }
    // chimney smoke from the houses that keep a fire (Meaning: a lit home; the puffs lean with the wind): Sproutvale cottages, Cinderport's forge houses and the gym halls' chimneys
    if (!M.interior && !(opts.still && opts.still())) { const arch = (PXW.PAL[M.id] || {}).arch; if (arch === 'cottage' || arch === 'forge') { const ws = lastWind ? lastWind.s : 0;
      M.places.forEach((p) => { if (p.kind && p.kind !== 'house' && p.kind !== 'gym') return; const chx = (p.x + p.w) * TS - (arch === 'forge' ? (p.kind === 'gym' ? 24 : 20) : 26), chy = p.y * TS - (arch === 'forge' ? 26 : 4);
        for (let i = 0; i < 3; i++) { const ph = (tAnim * 0.35 + i / 3 + (p.x * 0.37)) % 1, sx = snap(chx - cx + Math.round((ph * 10 * (0.3 + ws) + Math.sin(tAnim * 1.5 + i) * 2) / 2) * 2), sy = snap(chy - cy - Math.round(ph * 22 / 2) * 2), sz = 4 + Math.round(ph * 3) * 2;
          if (sx < -20 || sx > vw + 20 || sy < -20 || sy > vh + 20) continue; ctx.fillStyle = arch === 'forge' ? 'rgba(90,80,80,' + (0.45 * (1 - ph)).toFixed(2) + ')' : 'rgba(240,240,248,' + (0.55 * (1 - ph)).toFixed(2) + ')'; ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz); } }); } }
    // flags (Meaning: wind is change; a banner shows it where a fire is kept): one pennant on every gym hall, on the Long Watch and on the harbour mast. Its tail ripples pose by pose with the trees' six-step cycle, 1 px at a time; with no wind (the cold) it hangs still.
    if (!M.interior) { const kf = lastKf, ws = lastWind ? lastWind.s : 0, A = ws > 0.12 && !(opts.still && opts.still());
      const flag = (fx, fy, col) => { const x = snap(fx - cx), y = snap(fy - cy); if (x < -30 || x > vw + 30 || y < -30 || y > vh + 30) return;
        ctx.fillStyle = '#2B2235'; ctx.fillRect(x, y, 2, 16); ctx.fillStyle = '#E8D8B0'; ctx.fillRect(x, y - 2, 2, 2);
        if (!A) { ctx.fillStyle = col; ctx.fillRect(x + 2, y, 3, 8); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 4, y, 1, 8); return; }   // hanging
        for (let j = 0; j < 8; j++) { const dy = j < 3 ? 0 : Math.round(SIN6F[(kf + j) % 6]), h = 5 - (j >> 2); ctx.fillStyle = col; ctx.fillRect(x + 2 + j, y + dy, 1, h); if (j % 3 === 2) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 2 + j, y + dy, 1, h); } } };
      M.places.forEach((p) => { if (p.kind === 'gym') flag((p.x + p.w) * TS - 22, p.y * TS + 2, p.color || '#F5C542'); else if (p.kind === 'tower') flag((p.x + p.w) * TS - 14, p.y * TS - 12, '#FFD86B'); });
      (M.objects || []).forEach((o) => { if (o.kind === 'harborlamp') flag(o.x * TS + 26, o.y * TS - 10, '#D8574A'); }); }
    // weather (outdoors only), under the time-of-day tint so night darkens it too
    if (typeof WEATHER !== 'undefined') WEATHER.draw(ctx, { kind: M.interior ? null : (opts.weather ? opts.weather() : null), mapId: M.id, vw: vw, vh: vh, cx: cx, cy: cy, t: tAnim, wind: lastWind ? lastWind.s : 0, still: opts.still ? opts.still() : false });
    // time of day: tint the world (tags drawn later stay crisp)
    const tod = (M.interior || M.cave) ? 'day' : (opts.tint ? opts.tint() : 'day'); // lamplit rooms and caves: no night tint
    tintNow = tod;
    if (tod !== 'day') {
      ctx.fillStyle = { night: 'rgba(14,24,70,0.42)', dusk: 'rgba(255,110,50,0.14)', dawn: 'rgba(255,190,140,0.12)' }[tod];
      ctx.fillRect(0, 0, vw, vh);
      if (tod === 'night' || tod === 'dusk') M.places.forEach((p) => { if (p.kind) return; const roofH = Math.round(p.h * 32 * 0.5);
        [[p.x * TS + 16, p.y * TS + roofH + 8], [p.x * TS + p.w * TS - 44, p.y * TS + roofH + 8]].forEach(([wx, wy]) => { const x = snap(wx - cx), y = snap(wy - cy);
          const gr = ctx.createRadialGradient(x + 14, y + 10, 2, x + 14, y + 10, 34); gr.addColorStop(0, 'rgba(255,214,120,0.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = gr; ctx.fillRect(x - 24, y - 26, 76, 72);
          ctx.fillStyle = '#FFD86B'; ctx.fillRect(x, y, 28, 20); }); });
    }
    if (typeof AMBIENT !== 'undefined') AMBIENT.draw(ctx, 'glow', ambEnv); // lights (fireflies) shine over the night tint
    if (M.dark) drawDark(cx, cy, pxs, pys);
    const near = nearest();
    M.places.forEach((p) => { const tx = (p.x + p.w / 2) * TS - cx, ty = p.y * TS - cy - (p.kind === 'board' ? 26 : 14); if (tx > -80 && tx < vw + 80 && ty > -20 && ty < vh + 20) drawTag(p.name, tx, ty, near && near.place === p); });
    if (M.rare) { const tx = (M.rare.x + 1.5) * TS - cx, ty = M.rare.y * TS - cy - 12; if (tx > -80 && tx < vw + 80 && ty > -20 && ty < vh + 20) drawTag('Rare grass', tx, ty, true); }
    M.exits.forEach((e) => {
      const name = MAPS[e.to] ? MAPS[e.to].name : e.to;
      let tx, ty; const mid = (e.a + e.b + 1) / 2;
      if (e.edge === 'n') { tx = mid * TS - cx; ty = 0.7 * TS - cy; } else if (e.edge === 's') { tx = mid * TS - cx; ty = (M.H - 0.7) * TS - cy; } else if (e.edge === 'w') { tx = 1.8 * TS - cx; ty = mid * TS - cy - 18; } else { tx = (M.W - 1.8) * TS - cx; ty = mid * TS - cy - 18; }
      if (tx > -80 && tx < vw + 80 && ty > -20 && ty < vh + 20) drawTag('To ' + name, tx, ty, false);   // just the place name; the level requirement is told when you touch the gate
    });
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, flash * 3) + ')'; ctx.fillRect(0, 0, vw, vh); }
    if (TR) transitionFx();
  }
  let last = 0, frameDt = 0.016;
  function frame(t) { const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; frameDt = dt; tAnim += dt; if (TR) stepTR(dt); update(dt); draw(); requestAnimationFrame(frame); }
  // the view scales with the window: the shorter side shows about 14 tiles whatever the screen, in half steps so pixels stay even (a phone is 1, a laptop about 1.5 to 2). window.__zoom overrides it (tests).
  function resize() { const cw = canvas.clientWidth, ch = canvas.clientHeight; zoom = typeof window.__zoom === 'number' ? window.__zoom : Math.max(1, Math.floor(Math.min(cw, ch) / 448 * 2) / 2); vw = cw / zoom; vh = ch / zoom; dpr = Math.min(3, window.devicePixelRatio || 1) * zoom; canvas.width = Math.round(cw * Math.min(3, window.devicePixelRatio || 1)); canvas.height = Math.round(ch * Math.min(3, window.devicePixelRatio || 1)); if (!terrain || terrainFor !== M.id) prerender(); }
  function init(cv, o) {
    canvas = cv; ctx = cv.getContext('2d'); opts = Object.assign({ random: () => Math.random() }, o);
    if (o.npcs) setupNpcs(o.npcs);
    if (o.map && MAPS[o.map]) M = MAPS[o.map];
    if (o.pos) { P.x = o.pos.x; P.y = o.pos.y; }
    if (collides(P.x, P.y)) { P.x = M.spawn[0] * TS; P.y = M.spawn[1] * TS; } // a saved spot that became solid (layout change): back to the entrance
    if (collides(P.x, P.y) || P.x < 0 || P.y < 0 || P.x > M.W * TS || P.y > M.H * TS) { P.x = M.spawn[0] * TS; P.y = M.spawn[1] * TS; }
    resize(); window.addEventListener('resize', resize);
    window.addEventListener('keydown', (e) => { if (paused) return; input.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') { const n = nearest(); if (n && opts.onInteract) { e.preventDefault(); opts.onInteract(n); } } if (e.key.startsWith('Arrow')) e.preventDefault(); });
    window.addEventListener('keyup', (e) => { input.keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; });
    if (opts.onMap) opts.onMap(M);
    requestAnimationFrame(frame);
  }
  return {
    init, input, nearest, MAPS, ZONES, TS, collides, enter, go, nextHop, NETS: NET_META, get objects() { return M.objects || []; },
    // clear tiles (and the objects standing on them) of a map, e.g. rubble after the rite; redraws the ground if it is the current map
    // open or close a gate (all objects with `gate: id`): hidden + walkable when open, solid when closed
    setGate: (mapId, gateId, open) => { const m = MAPS[mapId]; if (!m) return; (m.objects || []).forEach((o) => { if (o.gate !== gateId) return; o.hidden = !!open; m.grid[o.y][o.x] = open ? '.' : 'O'; }); },
    setTiles: (mapId, cells, ch) => { const m = MAPS[mapId]; if (!m) return; cells.forEach(([x, y]) => { if (m.grid[y] && x >= 0 && x < m.W) m.grid[y][x] = ch; }); if (M === m && canvas) prerender(); }, moving: () => !!P.moving,
    openTiles: (mapId, cells, objIds) => { const m = MAPS[mapId]; if (!m) return; cells.forEach(([x, y]) => { if (m.grid[y]) m.grid[y][x] = '.'; }); m.objects = (m.objects || []).filter((o) => objIds.indexOf(o.id) === -1); if (M === m && canvas) prerender(); }, setFish: (f) => { fishAt = f; }, follower: () => FOL,
    addProp, PROPS, get map() { return M; }, get PLACES() { return M.places; }, get SIGNS() { return M.signs; },
    solidAt: (x, y) => solidAt(x, y),
    get zoom() { return zoom; }, view: () => ({ vw: vw, vh: vh, zoom: zoom }),
    setPaused: (v) => { paused = v; if (v) { input.jx = 0; input.jy = 0; input.keys = {}; } }, get paused() { return paused; }, get transitioning() { return !!TR; },
    get npcs() { return NPCS[M.id] || []; }, allNpcs: () => NPCS, facePlayer, inSight,
    followerPos: () => (FOL ? { x: FOL.x, y: FOL.y, dir: FOL.dir || null, moving: !!FOL.moving } : null), get lead() { return LEAD; },
    pos: () => ({ x: P.x, y: P.y }), terrainCanvas: () => terrain, windFrame: () => lastKf, windLevel: (id, t) => windLevel(id, t, typeof WEATHER !== 'undefined' && WEATHER.region ? WEATHER.region(id) : null), gust: () => { gustUntil = performance.now() + 3500; }, wind: () => lastWind, debug: () => ({ player: lastPlayerScreen, cam: lastCam, tint: tintNow }), drawNow: () => draw(), setPos: (x, y) => { P.x = x; P.y = y; }, step: (dt) => update(dt), flash: () => { flash = 0.3; }
  };
})();
