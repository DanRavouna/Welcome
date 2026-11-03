// ---- World: Sproutvale + four zones, rendering, movement, exits, encounters ----
const WORLD = (() => {
  const TS = 32;
  const SOLID = new Set(['T', 'X', '~', 'F', 'G', 'O', 'R', 'w', 'b', 's', 't', 'p', 'k', 'h', 'm']);
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
    // trail north to Champion's Peak: stamped after the decor pass so the seeded scatter (and every other tile) is unchanged
    for (let y = 0; y <= 11; y++) { set(26, y, '='); set(27, y, '='); }
    set(28, 10, 'G'); signs.push({ x: 28, y: 10, to: 'peak', text: "North: Champion's Peak. The trail opens to trainers holding all 4 Leader Seals." });
    places.forEach((p) => { const [dx, dy] = p.door; [[dx, dy + 1], [dx + 1, dy + 1]].forEach(([x, y]) => set(x, y, '=')); });
    return {
      id: 'town', name: 'Sproutvale', theme: THEMES.town, grid: m, W, H, places, signs, types: ALL_TYPES, rate: 0.08,
      exits: [
        { edge: 'n', a: 21, b: 22, to: 'frost' }, { edge: 's', a: 21, b: 22, to: 'ember' },
        { edge: 'w', a: 16, b: 17, to: 'moss' }, { edge: 'e', a: 16, b: 17, to: 'tide' }, { edge: 'n', a: 26, b: 27, to: 'peak' }
      ],
      arriveFrom: { peak: [26.9, 1.2] },
      arrive: { n: [21.9, 1.2], s: [21.9, 32.6], w: [1.2, 17.2], e: [42.8, 17.2] },
      spawn: [21.9, 23.6]
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
  // ---------- Champion's Peak: the Tower's own zone (no wild critters) ----------
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
    const tower = { id: 'tower', name: "Champion's Tower", x: 10, y: 3, w: 6, h: 6, kind: 'tower', door: [12, 8], open: 'tower' };
    for (let y = 2; y < 9; y++) for (let x = 9; x <= 16; x++) set(x, y, y >= 3 && x >= 10 && x <= 15 ? 'X' : (m[y][x] === 'T' || m[y][x] === 'R' ? '.' : m[y][x]));
    for (let k = 0; k < 4; k++) { set(12, H - 1 - k, '='); set(13, H - 1 - k, '='); }
    set(15, 20, 'G');
    return {
      id: 'peak', name: "Champion's Peak", theme: THEMES.peak, grid: m, W, H, places: [tower],
      signs: [{ x: 15, y: 20, text: "Champion's Peak. The Tower at the summit tests your party floor after floor." }],
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
      { id: 'house-fennel', name: "Fennel's House", x: 26, y: 5, w: 5, h: 4, kind: 'house', door: [28, 8], open: 'house', roof: '#C0503A', wall: '#E8D7B0', text: 'A teapot whistles somewhere inside. Nobody answers.' },
      { id: 'house-moss', name: 'Mosscap Cottage', x: 6, y: 18, w: 5, h: 4, kind: 'house', door: [8, 21], open: 'house', roof: '#5E8E3A', wall: '#D9C29A', text: 'A note on the door: "Out foraging. Back by dusk."' },
      { id: 'house-bryn', name: "Bryn's House", x: 25, y: 18, w: 5, h: 4, kind: 'house', door: [27, 21], open: 'house', roof: '#D9A03A', wall: '#E8D7B0', text: 'Crayon drawings of critters cover the window.' }
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
      houses: [{ id: 'fh-a', name: 'Watch House', roof: '#3E6E8E', text: 'A guard snores loudly behind the door. Best not to wake him.' }, { id: 'fh-b', name: 'Fur Trader', roof: '#7A5A8E', text: 'A sign says: "Closed for the blizzard season."' }, { id: 'fh-c', name: 'Stone Cottage', roof: '#4E7E9A', text: 'Warm light and the smell of soup. Someone hums inside.' }],
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
  const MAPS = { town: buildTown(), peak: buildPeak(), mossbrook: buildMossbrook(), frosthold: buildCity(CITY_CFG.frosthold), cinderport: buildCity(CITY_CFG.cinderport), coralbay: buildCity(CITY_CFG.coralbay), frost: buildZone('frost'), ember: buildZone('ember'), moss: buildZone('moss'), tide: buildZone('tide'),
    'route-mf': buildZone('route-mf'), 'route-cm': buildZone('route-cm'), 'route-fc': buildZone('route-fc'), 'route-cc': buildZone('route-cc') };
  linkEdge(MAPS.moss, 'w', 14, 'mossbrook', [1.2, 15.2]);
  MAPS.moss.grid[12][3] = 'G'; MAPS.moss.signs.push({ x: 3, y: 12, to: 'mossbrook', text: 'West: Mossbrook village, home of Elder Wren.' });
  linkEdge(MAPS.frost, 'n', 17, 'frosthold', [17.9, 1.2]); MAPS.frost.grid[3][20] = 'G'; MAPS.frost.signs.push({ x: 20, y: 3, to: 'frosthold', text: "North: Frosthold, the fort town. Glacia's gym is there." });
  linkEdge(MAPS.ember, 's', 17, 'cinderport', [17.9, MAPS.ember.H - 1.4]); MAPS.ember.grid[MAPS.ember.H - 4][20] = 'G'; MAPS.ember.signs.push({ x: 20, y: MAPS.ember.H - 4, to: 'cinderport', text: "South: Cinderport, the forge town. Blaze's gym is there." });
  linkEdge(MAPS.tide, 'e', 14, 'coralbay', [MAPS.tide.W - 1.4, 15.2]); MAPS.tide.grid[12][24] = 'G'; MAPS.tide.signs.push({ x: 24, y: 12, to: 'coralbay', text: "East, along the boardwalk: Coralbay harbor. Admiral Coral's gym is there." });
  // the loop: each route's back exit leads to one city, a second exit (carved after the zone build) to the next
  const ROUTE_LINKS = [
    ['route-mf', 'mossbrook', 'n', 32, [32.9, 1.4], 'e', 'frosthold', 'w', 13, [1.4, 14.2]],
    ['route-cm', 'cinderport', 'w', 13, [1.4, 14.2], 'n', 'mossbrook', 's', 22, [22.9, 26.6]],
    ['route-fc', 'frosthold', 'e', 13, [34.6, 14.2], 's', 'coralbay', 'n', 28, [28.9, 1.4]],
    ['route-cc', 'coralbay', 's', 28, [28.9, 26.6], 'w', 'cinderport', 'e', 13, [34.6, 14.2]]
  ];
  ROUTE_LINKS.forEach(([rid, cityA, edgeA, aA, arrA, rEdgeB, cityB, edgeB, aB, arrB]) => {
    const R = MAPS[rid], back = R.exits[0];
    back.to = cityA; R.arriveFrom = { [cityA]: R.arrive[back.edge] };
    linkEdge(MAPS[cityA], edgeA, aA, rid, arrA);                        // city A side door onto the route
    const mid = Math.floor((rEdgeB === 'n' || rEdgeB === 's' ? R.W : R.H) / 2) - 1;
    const rArr = { n: [mid + 0.9, 1.4], s: [mid + 0.9, R.H - 1.4], w: [1.4, mid + 1.2], e: [R.W - 1.4, mid + 1.2] }[rEdgeB];
    linkEdge(R, rEdgeB, mid, cityB, rArr);                             // route's far end
    linkEdge(MAPS[cityB], edgeB, aB, rid, arrB);                        // city B side door onto the route
    R.signs[0].text = R.name + ': ' + R.types.join(' and ') + ' critters. This route links ' + MAPS[cityA].name + ' and ' + MAPS[cityB].name + '.';
    // signposts beside every new door (on the border, where a tree would stand, so they never block a street)
    const post = (Mp, edge, a, text) => { const [x, y] = { n: [a + 2, 1], s: [a + 2, Mp.H - 2], w: [1, a - 1], e: [Mp.W - 2, a - 1] }[edge]; Mp.grid[y][x] = 'G'; Mp.signs.push({ x: x, y: y, text: text }); };
    const dirWord = { n: 'North', s: 'South', w: 'West', e: 'East' };
    post(MAPS[cityA], edgeA, aA, dirWord[edgeA] + ': ' + R.name + ' (' + R.types.join(' and ') + ' critters), the road to ' + MAPS[cityB].name + '.');
    post(MAPS[cityB], edgeB, aB, dirWord[edgeB] + ': ' + R.name + ' (' + R.types.join(' and ') + ' critters), the road to ' + MAPS[cityA].name + '.');
    post(R, rEdgeB, mid, dirWord[rEdgeB] + ': ' + MAPS[cityB].name + '.');
  });
  // ---------- house interiors: every city house gets a room (door on the outside, exit through the bottom) ----------
  const ROOM_STYLE = { town: { floor: '#B07A46', wall: '#F4EAD6', rug: '#D8574A', bed: '#D8574A' }, lab: { floor: '#C9CFDA', wall: '#E8EEF8', rug: '#3C6FE0', bed: '#3C6FE0' }, mossbrook: { floor: '#B07A46', wall: '#E8D7B0', rug: '#4E8A3A', bed: '#4FB06D' }, frosthold: { floor: '#8E6B4A', wall: '#C9D3E6', rug: '#3E6E8E', bed: '#3E8EF7' }, cinderport: { floor: '#7A5A44', wall: '#D9C2A8', rug: '#A8382E', bed: '#D8574A' }, coralbay: { floor: '#C9A070', wall: '#F4EAD6', rug: '#2A8A9A', bed: '#4A9A8A' } };
  const ROOM_LAYOUTS = [
    { b: [[1, 2], [2, 2]], s: [[8, 2], [9, 2], [10, 2]], t: [[5, 4], [6, 4]], p: [[1, 7], [10, 7]], r: [4, 5, 7, 6] },
    { k: [[1, 2], [2, 2], [3, 2]], t: [[8, 5], [9, 5]], b: [[9, 2], [10, 2]], p: [[1, 7]], h: [[10, 7]], r: [3, 4, 6, 6] },
    { s: [[1, 2], [2, 2], [3, 2]], b: [[9, 2], [10, 2]], t: [[2, 5], [3, 5]], p: [[10, 7], [1, 7]], r: [5, 3, 8, 6] }
  ];
  function buildInterior(id, place, cityId, i, opt) {
    opt = opt || {}; const W = opt.W || 12, H = opt.H || 9, m = [], LY = opt.layout || ROOM_LAYOUTS[i % ROOM_LAYOUTS.length], dx = Math.floor(W / 2) - 1;
    for (let y = 0; y < H; y++) { const row = []; for (let x = 0; x < W; x++) row.push(y <= 1 || x === 0 || x === W - 1 || y === H - 1 ? 'w' : 'f'); m.push(row); }
    if (LY.r) for (let y = LY.r[1]; y <= LY.r[3]; y++) for (let x = LY.r[0]; x <= LY.r[2]; x++) m[y][x] = 'r';
    ['b', 's', 't', 'p', 'k', 'h', 'm'].forEach((k) => (LY[k] || []).forEach(([x, y]) => { m[y][x] = k; }));
    m[H - 1][dx] = 'd'; m[H - 1][dx + 1] = 'd';
    return { id: id, name: place.name, interior: true, rug: LY.r || null, parent: cityId, style: ROOM_STYLE[opt.style || cityId], theme: { bg: '#1A1424' }, grid: m, W: W, H: H, places: opt.places || [], signs: [], types: [], rate: 0,
      exits: [{ edge: 's', a: dx, b: dx + 1, to: cityId }], arrive: { s: [dx + 0.9, H - 1.6] }, spawn: [dx + 0.9, H - 1.6] };
  }
  ['mossbrook', 'frosthold', 'cinderport', 'coralbay'].forEach((cid) => MAPS[cid].places.filter((p) => p.open === 'house').forEach((p, i) => {
    const id = 'in-' + p.id; MAPS[id] = buildInterior(id, p, cid, i); p.enter = id;
    MAPS[cid].arriveFrom = Object.assign({}, MAPS[cid].arriveFrom, { [id]: [p.door[0] + 0.9, p.door[1] + 1.5] });
  }));
  // Sproutvale: your home (trainer records desk) and the Lab (Dex terminal); Fern stays outside for the intro
  [['home', { W: 12, H: 9, style: 'town', layout: { b: [[1, 2], [2, 2]], m: [[8, 2]], s: [[9, 2], [10, 2]], t: [[4, 5], [5, 5]], p: [[1, 7], [10, 7]], r: [3, 4, 7, 6] },
      places: [{ id: 'desk', name: 'Trainer records', x: 8, y: 2, w: 1, h: 1, kind: 'device', door: [8, 2], open: 'badges' }] }],
   ['lab', { W: 14, H: 10, style: 'lab', layout: { s: [[1, 2], [2, 2], [3, 2], [4, 2]], m: [[8, 2], [9, 2], [10, 2], [11, 2]], t: [[5, 6], [6, 6], [7, 6]], p: [[1, 8], [12, 8]], h: [[12, 5]], r: [4, 4, 9, 7] },
      places: [{ id: 'dexpc', name: 'Dex terminal', x: 9, y: 2, w: 1, h: 1, kind: 'device', door: [9, 2], open: 'dex' }] }]].forEach(([pid, opt], i) => {
    const P0 = MAPS.town.places.find((p) => p.id === pid), id = 'in-' + pid;
    MAPS[id] = buildInterior(id, P0, 'town', i, opt); P0.enter = id;
    MAPS.town.arriveFrom = Object.assign({}, MAPS.town.arriveFrom, { [id]: [P0.door[0] + 0.9, P0.door[1] + 1.5] });
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
  const P = { x: 21.9 * TS, y: 23.6 * TS, dir: 'down', moving: false, step: 0 };
  const input = { jx: 0, jy: 0, keys: {} };
  let canvas, ctx, vw = 0, vh = 0, dpr = 1, paused = false, tAnim = 0, opts = {};
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
  const npcAt = (tx, ty) => (NPCS[M.id] || []).some((n) => n.x === tx && n.y === ty);
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
  // where the objective lies on the current map: the target itself, the trail toward it, or the nearest tall grass
  let grassCache = { t: 0, p: null, map: null };
  function goalPoint(o) {
    if (!o) return null;
    if (o.grass) {
      const now = performance.now();
      if (grassCache.map !== M.id || now - grassCache.t > 600) {
        const tx = P.x / TS, ty = P.y / TS; let best = null, bd = 1e9;
        for (let y = 0; y < M.H; y++) for (let x = 0; x < M.W; x++) { const t = M.grid[y][x]; if (t !== 'W' && t !== 'Z') continue; const d = (x + 0.5 - tx) ** 2 + (y + 0.5 - ty) ** 2; if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; } }
        grassCache = { t: now, p: best, map: M.id };
      }
      if (!grassCache.p) return null;
      const onGrass = (() => { const t = M.grid[Math.floor(P.y / TS)] && M.grid[Math.floor(P.y / TS)][Math.floor(P.x / TS)]; return t === 'W' || t === 'Z'; })();
      return onGrass ? null : { x: grassCache.p.x, y: grassCache.p.y, marker: false };
    }
    if (o.map === M.id) return { x: o.x + 0.5, y: o.y + 0.6, marker: true };
    const hop = nextHop(M.id, o.map), e = M.exits.find((x) => x.to === hop) || M.exits.find((x) => x.to === 'town');
    if (!e) return null;
    const mid = (e.a + e.b + 1) / 2;
    return e.edge === 'n' ? { x: mid, y: 0.5 } : e.edge === 's' ? { x: mid, y: M.H - 0.5 } : e.edge === 'w' ? { x: 0.5, y: mid } : { x: M.W - 0.5, y: mid };
  }
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
  function nearest() {
    const tx = P.x / TS, ty = P.y / TS; let best = null, bd = 1.7;
    (NPCS[M.id] || []).forEach((n) => { const d = Math.hypot(tx - (n.x + 0.5), ty - (n.y + 0.9)); if (d < 1.45 && d < bd + 0.3) { bd = Math.min(bd, d); best = { kind: 'npc', npc: n }; } });
    if (best) return best;
    M.places.forEach((p) => { const [dx, dy] = p.door; const d = Math.hypot(tx - (dx + 1), ty - (dy + 1.1)); if (d < bd) { bd = d; best = { kind: 'place', place: p }; } });
    M.signs.forEach((s) => { const d = Math.hypot(tx - (s.x + 0.5), ty - (s.y + 0.5)); if (d < Math.min(bd, 1.6)) { bd = d; best = { kind: 'sign', sign: s }; } });
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
    const last = trail[trail.length - 1];
    if (!last || Math.hypot(P.x - last.x, P.y - last.y) > 2) { trail.push({ x: P.x, y: P.y }); if (trail.length > 60) trail.shift(); }
    let dist = 0, tgt = null;
    for (let i = trail.length - 1; i > 0; i--) { dist += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y); if (dist >= TS * 1.05) { tgt = trail[i - 1]; break; } }
    if (tgt) { FOL.moving = Math.hypot(tgt.x - FOL.x, tgt.y - FOL.y) > 0.5; FOL.x += (tgt.x - FOL.x) * 0.35; FOL.y += (tgt.y - FOL.y) * 0.35; } else FOL.moving = false;
  }
  function update(dt) {
    if (paused) { P.moving = false; return; }
    followerStep();
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
    if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) { const e = exitAt(tx, ty); if (e) { enter(e.to); return; } }
    // grass steps
    const key = tx + ',' + ty;
    if (key !== lastTile) {
      lastTile = key; stepsSince += 1;
      const t = M.grid[ty] && M.grid[ty][tx];
      if (t === 'W' || t === 'Z') {
        rustle = 0.35;
        if (opts.onGrass) opts.onGrass();
        const rate = t === 'Z' ? 0.22 : M.rate;
        if (stepsSince >= 3 && opts.random() < rate && opts.onEncounter) {
          stepsSince = 0;
          opts.onEncounter({ types: M.types, rare: t === 'Z', zone: M.name });
        }
      }
    }
    rustle = Math.max(0, rustle - dt); flash = Math.max(0, flash - dt);
    // trainers watch a straight line in front of them
    (NPCS[M.id] || []).forEach((n) => {
      if (n.trainer) {
        if (!n.declined && n.alert === 0 && opts.canChallenge && opts.canChallenge(n) && inSight(n)) {
          n.declined = true; // one sighting per visit: resets when you re-enter the map
          n.alert = 0.8; paused = true; input.jx = 0; input.jy = 0; if (opts.onAlert) opts.onAlert(n);
          setTimeout(() => { n.alert = 0; if (opts.onSpotted) opts.onSpotted(n); }, 750);
        }
      } else if (!n.leader) { n.turnT -= dt; if (n.turnT <= 0) { n.turnT = 2.5 + Math.random() * 4; n.dir = ['down', 'left', 'right', 'down'][Math.floor(Math.random() * 4)]; } }
    });
    const n = nearest(); const nk = n ? (n.place ? n.place.id : (n.npc ? 'npc' + n.npc.id : (n.sign ? 'sign' + n.sign.x + ',' + n.sign.y : n.kind + n.x + ',' + n.y))) : null;
    if (nk !== lastNear) { lastNear = nk; if (opts.onNear) opts.onNear(n); }
  }
  let FR = null, lastPlayerScreen = null, lastCam = null, tintNow = 'day';
  function drawPlayer(sx, sy) {
    if (!FR) FR = PXW.frames();
    const x = Math.round(sx * dpr) / dpr, y = Math.round(sy * dpr) / dpr;
    lastPlayerScreen = { x: x, y: y };
    ctx.fillStyle = 'rgba(10,30,10,0.32)'; ctx.fillRect(x - 10, y - 2, 20, 4); ctx.fillRect(x - 8, y - 4, 16, 8);
    const f = P.moving ? (Math.floor(P.step / 1.6) % 2 ? 1 : 2) : 0;
    ctx.drawImage(FR[P.dir][f], x - 16, y - 38, 32, 40);
    const t = M.grid[Math.floor(P.y / TS)] && M.grid[Math.floor(P.y / TS)][Math.floor(P.x / TS)];
    if (t === 'W' || t === 'Z') {
      const pal = PXW.PAL[M.id] || PXW.PAL.town, sway = rustle > 0 ? (Math.floor(tAnim * 20) % 2) * 2 : 0;
      for (let i = -3; i <= 3; i++) { const bx = x + i * 5 + sway; ctx.fillStyle = pal.tb; ctx.fillRect(bx - 2, y - 8, 4, 10); ctx.fillStyle = t === 'Z' ? '#FFF7D6' : pal.th; ctx.fillRect(bx - 2, y - 10, 2, 4); }
    }
  }
  function drawTag(text, sx, sy, gold) {
    ctx.font = '600 13px "Pixelify Sans", Nunito, sans-serif';
    const w = Math.round((ctx.measureText(text).width + 14) / 2) * 2, x = Math.round((sx - w / 2) * dpr) / dpr, y = Math.round((sy - 11) * dpr) / dpr;
    ctx.fillStyle = gold ? '#8A6510' : '#0E1A38'; ctx.fillRect(x, y + 2, w, 18); ctx.fillRect(x + 2, y, w - 4, 22);
    ctx.fillStyle = gold ? '#FFD86B' : '#1E2A4A'; ctx.fillRect(x + 2, y + 2, w - 4, 18);
    ctx.fillStyle = gold ? '#FFF1BF' : '#3A4A78'; ctx.fillRect(x + 2, y + 2, w - 4, 2);
    ctx.fillStyle = gold ? '#2A1B00' : '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + 12);
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
    ctx.drawImage(terrain, -cx, -cy, terrain.width * 2, terrain.height * 2);
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
    const fol = opts.follower ? opts.follower() : null;
    if (!FOL) followerReset();
    const list = (NPCS[M.id] || []).map((n) => ({ y: (n.y + 0.9) * TS, n: n })).concat([{ y: P.y, p: true }]).concat(fol && fol.img && fol.img.complete ? [{ y: FOL.y, f: true }] : []).sort((a, b) => a.y - b.y);
    list.forEach((it) => {
      if (it.p) { drawPlayer(pxs - cx, pys - cy); return; }
      if (it.f) {
        const x = snap(FOL.x - cx), y = snap(FOL.y - cy), hop = FOL.moving ? Math.abs(Math.sin(tAnim * 12)) * 3 : Math.abs(Math.sin(tAnim * 2)) * 1;
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
    if (fishAt) { // bobber
      const bx = snap((fishAt.x + 0.5) * TS - cx), by = snap((fishAt.y + 0.55) * TS - cy + Math.sin(tAnim * (fishAt.bite ? 22 : 4)) * (fishAt.bite ? 3 : 1.5));
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx - 8, by + 3, 16, 2);
      ctx.fillStyle = '#1E2A4A'; ctx.fillRect(bx - 4, by - 6, 8, 10); ctx.fillStyle = '#D8574A'; ctx.fillRect(bx - 3, by - 5, 6, 4); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(bx - 3, by - 1, 6, 4);
    }
    // objective: gold marker over the target, or an arrow around the player pointing the way
    const goal = opts.objective ? goalPoint(opts.objective()) : null;
    if (goal) {
      const gx = snap(goal.x * TS - cx), gy = snap(goal.y * TS - cy), px = pxs - cx, py = pys - cy - 18;
      const dx = gx - px, dy = gy - py, dist = Math.hypot(dx, dy);
      const bob = Math.round(Math.sin(tAnim * 5) * 2) * 2;
      if (gx > 8 && gx < vw - 8 && gy > 30 && gy < vh - 8 && goal.marker) {
        const mx = gx, my = gy - 62 + bob;
        const rows = [[-14, 14], [-12, 12], [-10, 10], [-8, 8], [-6, 6], [-4, 4], [-2, 2]];
        rows.forEach(([l, r], i) => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mx + l - 2, my + i * 3 - 2, r - l + 4, 5); });
        rows.forEach(([l, r], i) => { ctx.fillStyle = i < 2 ? '#8A6510' : '#FFD86B'; ctx.fillRect(mx + l, my + i * 3, r - l, 3); });
        ctx.fillStyle = '#8A6510'; ctx.fillRect(mx - 14, my, 28, 2);
      }
      if (dist > 70) {
        const ux = dx / dist, uy = dy / dist, ax = px + ux * (48 + bob), ay = py + uy * (48 + bob);
        ctx.save(); ctx.translate(Math.round(ax), Math.round(ay)); ctx.rotate(Math.atan2(uy, ux));
        ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(21, 0); ctx.lineTo(-12, -16); ctx.lineTo(-4, 0); ctx.lineTo(-12, 16); ctx.closePath();
        ctx.fillStyle = '#FFD86B'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#5A3E08'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(-15, -20); ctx.lineTo(-6, 0); ctx.lineTo(-15, 20); ctx.closePath(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
        ctx.restore();
      }
    }
    // weather (outdoors only), under the time-of-day tint so night darkens it too
    if (typeof WEATHER !== 'undefined') WEATHER.draw(ctx, { kind: M.interior ? null : (opts.weather ? opts.weather() : null), mapId: M.id, vw: vw, vh: vh, cx: cx, cy: cy, t: tAnim, still: opts.still ? opts.still() : false });
    // time of day: tint the world (tags drawn later stay crisp)
    const tod =M.interior ? 'day' : (opts.tint ? opts.tint() : 'day'); // lamplit rooms: no night tint indoors
    tintNow = tod;
    if (tod !== 'day') {
      ctx.fillStyle = { night: 'rgba(14,24,70,0.42)', dusk: 'rgba(255,110,50,0.14)', dawn: 'rgba(255,190,140,0.12)' }[tod];
      ctx.fillRect(0, 0, vw, vh);
      if (tod === 'night' || tod === 'dusk') M.places.forEach((p) => { if (p.kind) return; const roofH = Math.round(p.h * 32 * 0.5);
        [[p.x * TS + 16, p.y * TS + roofH + 8], [p.x * TS + p.w * TS - 44, p.y * TS + roofH + 8]].forEach(([wx, wy]) => { const x = snap(wx - cx), y = snap(wy - cy);
          const gr = ctx.createRadialGradient(x + 14, y + 10, 2, x + 14, y + 10, 34); gr.addColorStop(0, 'rgba(255,214,120,0.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = gr; ctx.fillRect(x - 24, y - 26, 76, 72);
          ctx.fillStyle = '#FFD86B'; ctx.fillRect(x, y, 28, 20); }); });
    }
    const near = nearest();
    M.places.forEach((p) => { const tx = (p.x + p.w / 2) * TS - cx, ty = p.y * TS - cy - (p.kind === 'board' ? 26 : 14); if (tx > -80 && tx < vw + 80 && ty > -20 && ty < vh + 20) drawTag(p.name, tx, ty, near && near.place === p); });
    if (M.rare) { const tx = (M.rare.x + 1.5) * TS - cx, ty = M.rare.y * TS - cy - 12; if (tx > -80 && tx < vw + 80 && ty > -20 && ty < vh + 20) drawTag('Rare grass', tx, ty, true); }
    M.exits.forEach((e) => {
      const name = MAPS[e.to] ? MAPS[e.to].name : e.to;
      let tx, ty; const mid = (e.a + e.b + 1) / 2;
      if (e.edge === 'n') { tx = mid * TS - cx; ty = 0.7 * TS - cy; } else if (e.edge === 's') { tx = mid * TS - cx; ty = (M.H - 0.7) * TS - cy; } else if (e.edge === 'w') { tx = 1.8 * TS - cx; ty = mid * TS - cy - 18; } else { tx = (M.W - 1.8) * TS - cx; ty = mid * TS - cy - 18; }
      const lab = locked(e) && opts.lockLabel ? opts.lockLabel(e) : null;
      if (lab) { if (e.edge === 'n') ty += 2.4 * TS; else if (e.edge === 's') ty -= 2.2 * TS; else tx += (e.edge === 'w' ? 1.2 : -1.2) * TS; }
      if (tx > -80 && tx < vw + 80 && ty > -20 && ty < vh + 20) drawTag(lab ? name + ' · ' + lab : 'To ' + name, tx, ty, false);
    });
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, flash * 3) + ')'; ctx.fillRect(0, 0, vw, vh); }
  }
  let last = 0;
  function frame(t) { const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; tAnim += dt; update(dt); draw(); requestAnimationFrame(frame); }
  function resize() { vw = canvas.clientWidth; vh = canvas.clientHeight; dpr = Math.min(3, window.devicePixelRatio || 1); canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr); if (!terrain || terrainFor !== M.id) prerender(); }
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
    init, input, nearest, MAPS, ZONES, TS, collides, enter, nextHop, setFish: (f) => { fishAt = f; }, follower: () => FOL,
    get map() { return M; }, get PLACES() { return M.places; }, get SIGNS() { return M.signs; },
    solidAt: (x, y) => solidAt(x, y),
    setPaused: (v) => { paused = v; if (v) { input.jx = 0; input.jy = 0; input.keys = {}; } }, get paused() { return paused; },
    get npcs() { return NPCS[M.id] || []; }, allNpcs: () => NPCS, facePlayer, inSight,
    pos: () => ({ x: P.x, y: P.y }), debug: () => ({ player: lastPlayerScreen, cam: lastCam, tint: tintNow }), drawNow: () => draw(), setPos: (x, y) => { P.x = x; P.y = y; }, step: (dt) => update(dt), flash: () => { flash = 0.3; }
  };
})();
