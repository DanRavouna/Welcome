// ---- ADV: adventure content: clues, dungeon layouts and the pixel art of dungeon objects ----
// A dungeon is a function in DUNGEONS returning { name, W, H, rows, objects, spawn, exit, dark }. world.js turns it into a map (buildDungeon).
//   rows    strings of tile chars: C = cave wall (solid), . = floor, = = flagstone
//   objects [{ id, kind, x, y, text?, ... }] interactive things on a (solid) tile; art is in ART[kind], light in LIGHT
//   dark    { r } how many tiles around the player stay lit (omit for a lit dungeon)
// To add a dungeon: write a function here, register it in DUNGEONS, give it a PAL entry in pxworld.js and a THEMES entry in world.js.
const ADV = (() => {
  const TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
  const TCOL = { Ember: '#FF7A45', Tide: '#3E8EF7', Moss: '#4FB06D', Volt: '#F5C518', Frost: '#8FD8EA', Dusk: '#8B6CF0', Stone: '#A79C90', Bloom: '#F27BB5' };
  // The Sealed Arch: four clues, one from each person beside a route landmark
  const CLUES = [
    { id: 'ruin', npc: 'edda', where: 'Highland Pass', lines: ['Look at the carvings. Eight critters share one fire, and one seat is left empty.', 'I think this arch is a door, not a ruin.'], note: 'Edda: the arch shows eight critters around a fire and one empty seat. She thinks it is a door.' },
    { id: 'camp', npc: 'dell', where: 'Ashwood Trail', lines: ['My granddad had a camp rhyme: "Fire for the first, lamp for the second, hull for the third, and the empty seat will answer."', 'I never knew what it meant.'], note: 'Dell: an old camp rhyme: "Fire for the first, lamp for the second, hull for the third, and the empty seat will answer."' },
    { id: 'lighthouse', npc: 'joss', where: 'Glacier Coast', lines: ['Here is a secret: the lamp never pointed at the sea. It points inland, at the old arch in the pass.', 'Whoever built it wanted the door found.'], note: 'Joss: the lighthouse lamp points at the old arch in the pass, not at the sea.' },
    { id: 'wreck', npc: 'neri', where: 'Reef Causeway', lines: ['I found a carved stone in the wreck. Eight critters at a fire, and a ninth seat with a dusty crown.', 'Same carving as the arch, I bet. Somebody wanted all four of us to find a piece.'], note: 'Neri: a stone in the wreck shows the same eight critters, and a ninth seat with a dusty crown.' }
  ];
  const STATUE_TEXT = {
    Ember: 'A statue of a flame critter. Its stone chest is still warm.', Tide: 'A statue of a tide critter. A little water pools at its feet.', Moss: 'A statue of a moss critter. Real moss grows on its shoulders.',
    Volt: 'A statue of a volt critter. Your hair stands up when you pass it.', Frost: 'A statue of a frost critter. The stone is cold as ice.', Dusk: 'A statue of a dusk critter. It seems to watch you from the corner of its eye.',
    Stone: 'A statue of a stone critter. It was carved from the same rock as the cave.', Bloom: 'A statue of a bloom critter. A single pink petal rests in its hand.'
  };
  // ---- the Sealed Arch ----
  // South: a round hall (eight statues around a fire, an empty ninth seat, three unlit lights to light in the order of the camp rhyme).
  // North, behind rubble that the rite clears: a moss gallery (wild Dusk/Stone critters, a guard), a lamp hall (a guard) and the Keeper's chamber (boss, chest, crown).
  function sealedArch() {
    const W = 26, H = 60, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - 13) / 10.5, dy = (y - 49) / 7.5; if (dx * dx + dy * dy <= 1) set(x, y, '.'); }   // the hall
    rect(12, 30, 13, 41); rect(12, 18, 13, 21); rect(12, 6, 13, 8);                      // corridors north (the first one is blocked by rubble at y 41)
    rect(5, 22, 20, 29); rect(5, 9, 20, 17); rect(6, 1, 19, 5);                             // gallery, lamp hall, the Keeper's chamber
    rect(12, 51, 13, 59, '=');                                                              // the way in
    for (let y = 45; y <= 51; y++) for (let x = 10; x <= 16; x++) if ((x - 13) * (x - 13) + (y - 48) * (y - 48) <= 7) set(x, y, '=');   // flagstones around the fire
    [[8, 23], [17, 23], [8, 28], [17, 28], [8, 11], [17, 11], [8, 15], [17, 15]].forEach(([x, y]) => set(x, y, 'C'));              // pillars
    rect(6, 24, 9, 27, 'W'); rect(16, 24, 19, 27, 'W'); rect(15, 22, 18, 23, 'W');     // glowing moss: wild critters live here (the middle lane stays clear, so progress never needs a grass step)
    objects.push({ id: 'fire', kind: 'fire', x: 13, y: 48, text: 'The fire burns without fuel or smoke. Eight stone shadows lean toward it.' });
    for (let i = 0; i < 9; i++) {
      const a = (-90 + i * 40) * Math.PI / 180, x = Math.round(13 + 3.5 * Math.cos(a)), y = Math.round(48 + 3.5 * Math.sin(a));
      if (i === 0) objects.push({ id: 'seat', kind: 'seat', x: x, y: y, text: 'The ninth seat is empty. Dust lies thick on the stone, and a small crown is carved above it.' });
      else { const t = TYPES[i - 1]; objects.push({ id: 'statue-' + t, kind: 'statue', type: t, x: x, y: y, text: STATUE_TEXT[t] }); }
    }
    objects.push({ id: 'rite0', kind: 'pyre', order: 0, x: 5, y: 48, text: 'A cold stone fire bowl.' }, { id: 'rite1', kind: 'lamp', order: 1, x: 21, y: 48, text: 'A lamp on a post, long unlit.' }, { id: 'rite2', kind: 'hull', order: 2, x: 19, y: 54, text: 'The prow of an old boat, set into the stone. A lantern hangs from it.' });
    objects.push({ id: 'chest1', kind: 'chest', x: 5, y: 51, reward: { potion: 2, essence: 5 }, text: 'A dusty chest.' });
    [[10, 54], [16, 54], [5, 22], [20, 22], [5, 9], [20, 9], [7, 1], [18, 1]].forEach(([x, y], i) => objects.push({ id: 'br' + (i + 1), kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' }));
    objects.push({ id: 'rb1', kind: 'rubble', x: 12, y: 41, rubble: true, text: 'Rubble blocks the passage north. Something heavy fell here long ago.' }, { id: 'rb2', kind: 'rubble', x: 13, y: 41, rubble: true, text: 'Rubble blocks the passage north. Something heavy fell here long ago.' });
    objects.push({ id: 'chest2', kind: 'chest', x: 17, y: 2, reward: { charm: 1, essence: 12 }, text: 'The Keeper’s chest.' }, { id: 'crown', kind: 'crown', x: 13, y: 1, text: 'A small gold crown.' });
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x] === '=' ? '=' : '.'));
    // (the Keeper stands 3 tiles from the crown, so touching the crown from below never picks him)
    return { name: 'The Sealed Arch', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [12.9, H - 1.4], exit: { edge: 's', a: 12, b: 13 }, dark: { r: 3.4 }, types: ['Dusk', 'Stone'], rate: 0.12,
      spots: { guard1: [13, 25], guard2: [13, 12], keeper: [13, 4] }, rubble: [[12, 41], [13, 41]] };
  }
  // ---- the Lamp Tower: a bright climb through four chambers. Levers flip gates (a gate is open when an odd number of its levers are ON), so going forward closes
  // the way behind you, and flipping a lever back always undoes it (you can never be locked in). Guards in chambers 2 and 3, the Warden and the great lamp at the top. ----
  function lampTower() {
    const W = 22, H = 54, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    rect(4, 37, 17, 47); rect(4, 25, 17, 33); rect(4, 13, 17, 21); rect(4, 1, 17, 9);                      // the four chambers (bottom to top)
    rect(10, 34, 11, 36); rect(10, 22, 11, 24); rect(10, 10, 11, 12);                                         // corridors between them, each shut by a gate
    rect(10, 48, 11, 53, '='); [[37, 47], [25, 33], [13, 21], [1, 9]].forEach(([a, c]) => rect(10, a, 11, c, '='));   // a flagstone way up the middle of each chamber
    [[6, 40], [15, 40], [6, 44], [15, 44], [6, 28], [15, 28], [6, 16], [15, 19], [6, 4], [15, 6]].forEach(([x, y]) => set(x, y, 'C'));   // pillars
    // gates: two tiles across each corridor; `levers` lists the levers that flip it
    const gate = (id, y, levers) => { objects.push({ id: id + 'a', kind: 'gate', gate: id, levers: levers, x: 10, y: y, reach: 1.9, text: 'An iron gate. Somewhere a lever works it.' }, { id: id + 'b', kind: 'gate', gate: id, levers: levers, x: 11, y: y, reach: 1.9, text: 'An iron gate. Somewhere a lever works it.' }); };
    gate('g1', 35, ['L1', 'L2']); gate('g2', 23, ['L2', 'L3']); gate('g3', 11, ['L3']);
    objects.push({ id: 'L1', kind: 'lever', x: 16, y: 44, text: 'A lever.' }, { id: 'L2', kind: 'lever', x: 5, y: 30, text: 'A lever.' }, { id: 'L3', kind: 'lever', x: 16, y: 18, text: 'A lever.' });
    objects.push({ id: 'tab1', kind: 'plaque', x: 6, y: 47, label: 'Read the tablet', text: 'Carved in the stone: "Three levers, three gates. What opens one may close another. Climb, and the lamp will know you."' });
    objects.push({ id: 'chest1', kind: 'chest', x: 16, y: 27, reward: { super: 2, essence: 6 }, text: 'A frosty chest.' }, { id: 'chest2', kind: 'chest', x: 16, y: 3, reward: { charm: 1, essence: 12 }, text: 'The Warden’s chest.' });
    [[5, 38], [16, 38], [5, 26], [16, 33], [5, 14], [15, 14], [5, 2], [14, 2]].forEach(([x, y], i) => objects.push({ id: 'tr' + i, kind: 'brazier', x: x, y: y, text: 'A torch burns steadily.' }));
    objects.push({ id: 'greatlamp', kind: 'greatlamp', x: 10, y: 2, text: 'The great lamp.' });
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x] === '=' ? '=' : '.'));
    return { name: 'The Lamp Tower', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [10.9, H - 1.4], exit: { edge: 's', a: 10, b: 11, to: 'ascent' },
      gates: { g1: ['L1', 'L2'], g2: ['L2', 'L3'], g3: ['L3'] }, spots: { guard1: [10, 29], guard2: [10, 16], warden: [10, 5] } };
  }
  // ---- the Forge Below: a hub with two side halls. Each hall holds a guard and a glowing core; carry both back to the hub sockets and the north gate opens onto the Forgemaster.
  // Non-linear (either hall first). Gates here follow RULES (all listed flags set), not lever parity. ----
  function forgeBelow() {
    const W = 30, H = 44, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = (x - 15) / 6.8, dy = (y - 26) / 6.8; if (dx * dx + dy * dy <= 1) set(x, y, '.'); }   // the round hub
    rect(2, 19, 7, 32); rect(22, 19, 27, 32); rect(7, 25, 9, 26); rect(20, 25, 23, 26);                          // west and east halls and their doorways
    rect(14, 13, 15, 19); rect(7, 2, 22, 12); rect(14, 33, 15, 43, '=');                                         // the way north to the Forgemaster, and the way in
    rect(14, 19, 15, 32, '='); rect(8, 25, 21, 26, '=');                                                          // flagstones across the hub
    rect(3, 29, 4, 31, '~'); rect(25, 21, 26, 23, '~'); rect(9, 5, 10, 8, '~'); rect(19, 5, 20, 8, '~');         // lava pools (not walkable)
    [[4, 22], [4, 27], [25, 27], [25, 31], [10, 10], [19, 10]].forEach(([x, y]) => set(x, y, 'C'));              // pillars
    objects.push({ id: 'coreA', kind: 'core', core: 'A', gate: 'coreA', x: 3, y: 20, text: 'A core of living flame.' }, { id: 'coreB', kind: 'core', core: 'B', gate: 'coreB', x: 26, y: 31, text: 'A core of cooled stone, still humming.' });
    objects.push({ id: 'sockA', kind: 'socket', core: 'A', x: 12, y: 22, text: 'A socket for the core of flame.' }, { id: 'sockB', kind: 'socket', core: 'B', x: 17, y: 22, text: 'A socket for the core of stone.' });
    const gate = (id, y) => { objects.push({ id: id + 'a', kind: 'gate', gate: id, x: 14, y: y, reach: 1.9, text: 'A slab of black iron seals the way north. Two sockets in the hub must wake first.' }, { id: id + 'b', kind: 'gate', gate: id, x: 15, y: y, reach: 1.9, text: 'A slab of black iron seals the way north. Two sockets in the hub must wake first.' }); };
    gate('gb', 15);
    objects.push({ id: 'chest1', kind: 'chest', x: 3, y: 31, reward: { super: 2, essence: 6 }, text: 'A scorched chest.' }, { id: 'chest2', kind: 'chest', x: 21, y: 3, reward: { charm: 1, essence: 12 }, text: 'The Forgemaster’s chest.' });
    [[10, 22], [19, 22], [10, 30], [19, 30], [8, 3], [21, 12], [6, 21], [23, 21]].forEach(([x, y], i) => objects.push({ id: 'fr' + i, kind: 'brazier', x: x, y: y, text: 'A brazier of hot coals.' }));
    objects.push({ id: 'furnace', kind: 'furnace', x: 14, y: 2, text: 'The great furnace.' });
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x] === '=' ? '=' : '.'));
    return { name: 'The Forge Below', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [14.9, H - 1.4], exit: { edge: 's', a: 14, b: 15, to: 'descent' }, dark: { r: 5.2 },
      rules: { gb: ['sock:A', 'sock:B'] }, pickups: { coreA: 'core:A', coreB: 'core:B' }, spots: { guard1: [5, 25], guard2: [24, 25], hale: [14, 6] } };
  }
  const DUNGEONS = { 'dg-arch': sealedArch, 'dg-lamp': lampTower, 'dg-forge': forgeBelow };
  // ---- pixel art (screen pixels, 32 px per tile, drawn on 2 px steps); x, y = the tile's top-left; st = object state from the app ----
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h); };
  const OL = '#14101E';
  const flame = (g, x, y, t, ph, big) => { // a flickering flame standing on (x, y)
    const f = Math.sin(t * 9 + ph), h1 = (big ? 20 : 12) + Math.round(f * 3) * 2, w1 = big ? 14 : 8;
    R(g, x - w1 / 2 - 2, y - h1 - 2, w1 + 4, h1 + 2, 'rgba(255,120,40,0.35)');
    R(g, x - w1 / 2, y - h1, w1, h1, '#E8552A'); R(g, x - w1 / 2 + 2, y - h1 + 4, w1 - 4, h1 - 4, '#FFA03A'); R(g, x - 2, y - h1 / 2, 4, h1 / 2, '#FFE08A');
    if (Math.sin(t * 5 + ph * 2) > 0.5) R(g, x + (big ? 8 : 5), y - h1 - 6, 2, 2, '#FFD86B');
  };
  const ART = {
    // a bench, facing the trees; the seat is worn smooth
    bench(g, x, y) {
      R(g, x + 3, y + 27, 26, 3, 'rgba(0,0,0,0.22)'); R(g, x + 4, y + 14, 24, 4, OL); R(g, x + 5, y + 15, 22, 2, '#A07E54'); R(g, x + 4, y + 19, 24, 5, OL); R(g, x + 5, y + 20, 22, 3, '#8A6A44'); R(g, x + 5, y + 20, 22, 1, '#B8935F');
      R(g, x + 6, y + 24, 3, 5, OL); R(g, x + 23, y + 24, 3, 5, OL); R(g, x + 7, y + 24, 1, 4, '#6E5030'); R(g, x + 24, y + 24, 1, 4, '#6E5030');
    },
    // a small bell on a bent branch
    bell(g, x, y, st, t, o) {
      R(g, x + 15, y + 2, 2, 12, '#5A4A38'); R(g, x + 8, y + 2, 16, 2, '#5A4A38'); const sw = Math.round(Math.sin(t * 1.3 + o.x) * 1);
      R(g, x + 12 + sw, y + 14, 8, 9, OL); R(g, x + 13 + sw, y + 15, 6, 7, '#D9B24A'); R(g, x + 13 + sw, y + 15, 2, 7, '#F2D27A'); R(g, x + 15 + sw, y + 23, 3, 3, OL); R(g, x + 15 + sw, y + 23, 2, 2, '#D9B24A');
    },
    // a row of stakes with ribbons; the ribbons move though nothing else does
    stakes(g, x, y, st, t) {
      R(g, x + 2, y + 28, 28, 3, 'rgba(0,0,0,0.2)');
      [[6, '#C0503A'], [13, '#E8C07A'], [20, '#8E5BC8'], [26, '#FFFFFF']].forEach(([a, c], i) => { R(g, x + a, y + 8, 2, 20, '#6E5030'); const w = Math.round(Math.sin(t * 3 + i * 1.7) * 2); R(g, x + a + 2, y + 9, 5 + w, 3, c); R(g, x + a + 2, y + 12, 3 + w, 2, c); });
    },
    // an overturned sled, half in the snow
    sled(g, x, y) {
      R(g, x + 3, y + 26, 26, 3, 'rgba(0,0,0,0.2)'); R(g, x + 4, y + 20, 24, 3, OL); R(g, x + 5, y + 21, 22, 1, '#DCE2EE'); R(g, x + 6, y + 14, 20, 6, OL); R(g, x + 7, y + 15, 18, 4, '#9A6330'); R(g, x + 7, y + 15, 18, 1, '#B8793C');
      R(g, x + 3, y + 22, 6, 2, OL); R(g, x + 23, y + 22, 6, 2, OL); R(g, x + 2, y + 27, 28, 2, '#F4F6FA');
    },
    // a small boat pulled up on the shore
    skiff(g, x, y) {
      R(g, x + 1, y + 26, 30, 4, 'rgba(0,0,0,0.2)'); R(g, x + 2, y + 17, 28, 9, OL); R(g, x + 3, y + 18, 26, 6, '#8A5A32'); R(g, x + 3, y + 18, 26, 2, '#B07A46'); R(g, x + 2, y + 17, 3, 3, OL); R(g, x + 27, y + 17, 3, 3, OL);
      R(g, x + 6, y + 24, 20, 2, 'rgba(120,170,220,0.55)'); R(g, x + 4, y + 27, 24, 2, 'rgba(120,170,220,0.4)');
    },
    // a chair set out facing the water, with nobody in it
    chair(g, x, y) {
      R(g, x + 6, y + 28, 20, 3, 'rgba(0,0,0,0.22)'); R(g, x + 8, y + 6, 3, 22, OL); R(g, x + 9, y + 7, 1, 20, '#A07E54'); R(g, x + 8, y + 6, 15, 3, OL); R(g, x + 9, y + 7, 13, 1, '#A07E54');
      R(g, x + 8, y + 18, 16, 4, OL); R(g, x + 9, y + 19, 14, 2, '#8A6A44'); R(g, x + 21, y + 18, 3, 10, OL); R(g, x + 22, y + 19, 1, 8, '#6E5030');
    },
    // water that is lit from below
    tidelight(g, x, y, st, t, o) {
      const f = 0.5 + 0.5 * Math.sin(t * 2 + o.x); R(g, x + 3, y + 14, 26, 14, OL); R(g, x + 4, y + 15, 24, 12, '#2A6FB0');
      const gl = g.createRadialGradient(x + 16, y + 21, 1, x + 16, y + 21, 22); gl.addColorStop(0, 'rgba(160,240,255,' + (0.55 + 0.2 * f) + ')'); gl.addColorStop(1, 'rgba(160,240,255,0)'); g.fillStyle = gl; g.fillRect(x - 6, y + 4, 44, 34);
      R(g, x + 8, y + 19, 6, 2, 'rgba(255,255,255,0.7)'); R(g, x + 17, y + 22, 7, 2, 'rgba(255,255,255,0.5)');
    },
    // a lantern on a leaning post: lit, warm, and nobody near it
    lantern(g, x, y, st, t, o) {
      R(g, x + 8, y + 28, 16, 3, 'rgba(0,0,0,0.22)'); R(g, x + 15, y + 8, 3, 21, '#5A4A38'); R(g, x + 15, y + 8, 1, 21, '#7A664C'); R(g, x + 15, y + 8, 10, 3, '#5A4A38');
      const f = 0.5 + 0.5 * Math.sin(t * 7 + o.x), gl = g.createRadialGradient(x + 23, y + 17, 1, x + 23, y + 17, 26 + f * 4); gl.addColorStop(0, 'rgba(255,214,120,0.55)'); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(x - 6, y - 8, 58, 52);
      R(g, x + 20, y + 11, 8, 11, OL); R(g, x + 21, y + 12, 6, 9, '#FFD27A'); R(g, x + 23, y + 14, 2, 5, '#FFF6D0'); R(g, x + 20, y + 10, 8, 2, OL);
    },
    // a lantern on a post along a road; st.k (0 to 1) is how lit it is (the app eases it, so a lamp warms up as if someone had just lit it)
    postlamp(g, x, y, st, t, o) {
      const k = st.k || 0;
      R(g, x + 10, y + 28, 12, 3, 'rgba(0,0,0,0.22)'); R(g, x + 15, y + 8, 3, 21, '#5A4A38'); R(g, x + 15, y + 8, 1, 21, '#7A664C'); R(g, x + 12, y + 8, 12, 3, '#5A4A38');
      if (k > 0.02) { const f = 0.5 + 0.5 * Math.sin(t * 6 + o.x), gl = g.createRadialGradient(x + 17, y + 17, 1, x + 17, y + 17, (22 + f * 3) * (0.4 + 0.6 * k)); gl.addColorStop(0, 'rgba(255,214,120,' + (0.6 * k).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(x - 10, y - 10, 56, 56); }
      R(g, x + 14, y + 11, 8, 11, OL); R(g, x + 15, y + 12, 6, 9, k > 0.5 ? '#FFD27A' : '#3A3340'); if (k > 0.5) R(g, x + 17, y + 14, 2, 5, '#FFF6D0'); R(g, x + 14, y + 10, 8, 2, OL);
    },
    // two cups on a flat stone; one still has steam
    cups(g, x, y, st, t, o) {
      R(g, x + 6, y + 26, 20, 3, 'rgba(0,0,0,0.22)'); R(g, x + 5, y + 20, 22, 7, OL); R(g, x + 6, y + 21, 20, 5, '#8E98AD'); R(g, x + 6, y + 21, 20, 2, '#B7BFCF');
      R(g, x + 8, y + 14, 6, 7, OL); R(g, x + 9, y + 15, 4, 5, '#C9A26A'); R(g, x + 18, y + 14, 6, 7, OL); R(g, x + 19, y + 15, 4, 5, '#C9A26A');
      const w = Math.sin(t * 2.2 + o.y); R(g, x + 20 + Math.round(w), y + 9, 1, 3, 'rgba(255,255,255,0.55)'); R(g, x + 21 - Math.round(w), y + 5, 1, 3, 'rgba(255,255,255,0.35)');
    },
    // a ring of small stones set by someone who was not in a hurry
    ringstones(g, x, y) {
      R(g, x + 2, y + 18, 28, 12, 'rgba(60,140,70,0.35)');
      [[6, 20], [11, 17], [18, 17], [24, 20], [24, 26], [18, 29], [11, 29], [6, 26]].forEach(([a, b], i) => { R(g, x + a, y + b - 3, 5, 5, OL); R(g, x + a + 1, y + b - 2, 3, 3, i % 2 ? '#A8B2C6' : '#C9D0DE'); });
    },
    // a door standing alone, with nothing behind it
    doorframe(g, x, y) {
      R(g, x + 4, y + 28, 24, 3, 'rgba(0,0,0,0.22)'); R(g, x + 5, y - 14, 4, 43, OL); R(g, x + 23, y - 14, 4, 43, OL); R(g, x + 5, y - 15, 22, 4, OL);
      R(g, x + 6, y - 13, 2, 41, '#8A6A44'); R(g, x + 24, y - 13, 2, 41, '#8A6A44'); R(g, x + 6, y - 14, 20, 2, '#A07E54'); R(g, x + 9, y - 10, 14, 38, 'rgba(120,160,200,0.10)');
    },
    chest(g, x, y, st) {
      R(g, x + 3, y + 28, 26, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 4, y + 14, 24, 14, OL); R(g, x + 6, y + 16, 20, 10, '#9A6330'); R(g, x + 6, y + 16, 20, 3, '#B8793C'); R(g, x + 6, y + 24, 20, 2, '#6E4420');
      if (st.open) { R(g, x + 4, y + 4, 24, 10, OL); R(g, x + 6, y + 6, 20, 6, '#7A4C24'); R(g, x + 8, y + 12, 16, 4, '#FFD86B'); R(g, x + 12, y + 12, 8, 2, '#FFF3B0'); }
      else { R(g, x + 4, y + 8, 24, 10, OL); R(g, x + 6, y + 10, 20, 6, '#B8793C'); R(g, x + 6, y + 10, 20, 2, '#D79A5A'); R(g, x + 14, y + 16, 4, 4, '#FFD86B'); R(g, x + 14, y + 18, 4, 2, OL); }
      R(g, x + 10, y + 10, 2, 16, '#5A5666'); R(g, x + 20, y + 10, 2, 16, '#5A5666');
    },
    brazier(g, x, y, st, t, o) {
      R(g, x + 6, y + 28, 20, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 12, y + 20, 8, 10, OL); R(g, x + 14, y + 20, 4, 9, '#6A6478'); R(g, x + 6, y + 14, 20, 8, OL); R(g, x + 8, y + 16, 16, 5, '#8A8498'); R(g, x + 8, y + 16, 16, 2, '#B4AEC4');
      flame(g, x + 16, y + 16, t, (o.x * 3 + o.y) % 7, false);
    },
    fire(g, x, y, st, t, o) {
      R(g, x + 2, y + 26, 28, 5, 'rgba(0,0,0,0.25)');
      R(g, x + 2, y + 16, 28, 12, OL); R(g, x + 4, y + 18, 24, 8, '#7A748A'); R(g, x + 4, y + 18, 24, 3, '#A49EB6'); R(g, x + 8, y + 22, 16, 3, '#3A3646');
      flame(g, x + 16, y + 20, t, 1.3, true);
    },
    statue(g, x, y, st, t, o) {
      const c = TCOL[o.type] || '#A79C90';
      R(g, x + 4, y + 28, 24, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 6, y + 22, 20, 9, OL); R(g, x + 8, y + 23, 16, 7, '#8E8A9C'); R(g, x + 8, y + 23, 16, 2, '#B4B0C4');
      R(g, x + 8, y + 8, 16, 16, OL); R(g, x + 10, y + 6, 12, 4, OL);
      R(g, x + 10, y + 10, 12, 12, '#A8A4B8'); R(g, x + 12, y + 8, 8, 4, '#A8A4B8'); R(g, x + 10, y + 10, 4, 12, '#C4C0D4'); R(g, x + 20, y + 12, 2, 10, '#7A768A');
      R(g, x + 12, y + 14, 2, 2, OL); R(g, x + 18, y + 14, 2, 2, OL); R(g, x + 14, y + 18, 4, 2, OL);
      R(g, x + 14, y + 24, 4, 4, c); R(g, x + 15, y + 25, 2, 2, '#FFFFFF');   // a gem in the type's colour
    },
    seat(g, x, y, st, t) {
      R(g, x + 4, y + 28, 24, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 6, y + 20, 20, 11, OL); R(g, x + 8, y + 21, 16, 9, '#7A768A'); R(g, x + 8, y + 21, 16, 2, '#A49EB6');
      R(g, x + 12, y + 14, 8, 8, '#5A566A'); R(g, x + 10, y + 18, 12, 4, '#6A667A');
      const k = 0.5 + 0.5 * Math.sin(t * 1.6);   // a faint gold shimmer where a ninth critter will sit
      g.save(); g.globalAlpha = 0.25 + 0.4 * k; R(g, x + 12, y + 6, 8, 2, '#FFD86B'); R(g, x + 14, y + 4, 4, 2, '#FFF3B0'); R(g, x + 10, y + 8, 2, 2, '#FFD86B'); R(g, x + 20, y + 8, 2, 2, '#FFD86B'); g.restore();
    },
    rubble(g, x, y) {
      R(g, x + 2, y + 26, 28, 4, 'rgba(0,0,0,0.25)');
      [[2, 14, 14, 14], [14, 10, 14, 18], [8, 6, 12, 12], [18, 20, 12, 10]].forEach(([a, b, w, h], i) => { R(g, x + a, y + b, w, h, OL); R(g, x + a + 2, y + b + 2, w - 4, h - 4, i % 2 ? '#6C6880' : '#807C94'); R(g, x + a + 2, y + b + 2, w - 4, 2, '#A09CB4'); });
    },
    pyre(g, x, y, st, t, o) {
      R(g, x + 3, y + 28, 26, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 4, y + 16, 24, 12, OL); R(g, x + 6, y + 18, 20, 8, '#7A748A'); R(g, x + 6, y + 18, 20, 2, '#A49EB6'); R(g, x + 8, y + 22, 16, 3, '#3A3646');
      if (st.lit) flame(g, x + 16, y + 20, t, 0.4, true); else { R(g, x + 10, y + 14, 12, 4, '#4A3A2A'); R(g, x + 12, y + 12, 8, 3, '#3A2C20'); R(g, x + 14, y + 10, 4, 2, '#555064'); }
    },
    lamp(g, x, y, st, t) {
      R(g, x + 8, y + 29, 16, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 13, y + 12, 6, 18, OL); R(g, x + 14, y + 12, 4, 17, '#6A6478'); R(g, x + 9, y + 26, 14, 5, OL); R(g, x + 11, y + 27, 10, 3, '#8A8498');
      R(g, x + 8, y + 2, 16, 14, OL);
      if (st.lit) { const k = 0.75 + 0.25 * Math.sin(t * 8); R(g, x + 10, y + 4, 12, 10, '#FFD86B'); R(g, x + 12, y + 6, 8, 6, '#FFF3B0'); g.save(); g.globalAlpha = 0.25 * k; R(g, x + 2, y - 4, 28, 26, '#FFD86B'); g.restore(); }
      else { R(g, x + 10, y + 4, 12, 10, '#4A4860'); R(g, x + 10, y + 4, 12, 2, '#6A6882'); }
      R(g, x + 11, y, 10, 3, OL);
    },
    hull(g, x, y, st, t) {
      R(g, x + 1, y + 28, 30, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 2, y + 18, 28, 11, OL); R(g, x + 4, y + 20, 24, 7, '#8A5A32'); R(g, x + 4, y + 20, 24, 2, '#A8723E'); R(g, x + 6, y + 24, 20, 2, '#5E3C22');
      R(g, x + 22, y + 8, 8, 12, OL); R(g, x + 24, y + 10, 4, 9, '#8A5A32');
      R(g, x + 12, y + 2, 4, 18, OL); R(g, x + 13, y + 3, 2, 16, '#A8723E');
      R(g, x + 16, y + 6, 2, 6, OL);
      if (st.lit) { const k = 0.75 + 0.25 * Math.sin(t * 7 + 2); R(g, x + 15, y + 10, 6, 6, OL); R(g, x + 16, y + 11, 4, 4, '#FFD86B'); g.save(); g.globalAlpha = 0.25 * k; R(g, x + 6, y + 2, 24, 24, '#FFD86B'); g.restore(); }
      else { R(g, x + 15, y + 10, 6, 6, OL); R(g, x + 16, y + 11, 4, 4, '#4A4860'); }
    },
    crown(g, x, y, st, t) {
      R(g, x + 6, y + 28, 20, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 6, y + 20, 20, 11, OL); R(g, x + 8, y + 21, 16, 9, '#7A768A'); R(g, x + 8, y + 21, 16, 2, '#A49EB6');
      const k = 0.5 + 0.5 * Math.sin(t * 2);
      R(g, x + 9, y + 12, 14, 9, OL); R(g, x + 10, y + 16, 12, 4, '#FFD86B'); R(g, x + 10, y + 12, 4, 6, '#FFD86B'); R(g, x + 15, y + 10, 4, 8, '#FFD86B'); R(g, x + 20, y + 12, 3, 6, '#FFD86B'); R(g, x + 11, y + 17, 10, 2, '#FFF3B0');
      g.save(); g.globalAlpha = 0.2 + 0.3 * k; R(g, x + 6, y + 6, 20, 2, '#FFF3B0'); R(g, x + 14, y + 2, 4, 4, '#FFF3B0'); g.restore();
    },
    lever(g, x, y, st) {
      R(g, x + 4, y + 28, 24, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 6, y + 20, 20, 10, OL); R(g, x + 8, y + 22, 16, 6, '#8A8498'); R(g, x + 8, y + 22, 16, 2, '#B4AEC4');
      const dx = st.on ? 8 : -8;   // the handle leans right when ON, left when OFF
      R(g, x + 14 + dx / 2, y + 10, 4, 14, OL); R(g, x + 15 + dx / 2, y + 11, 2, 12, '#6A6478');
      R(g, x + 12 + dx, y + 6, 8, 8, OL); R(g, x + 14 + dx, y + 8, 4, 4, st.on ? '#FFD86B' : '#D8574A');
    },
    gate(g, x, y) {
      R(g, x, y + 2, 32, 4, OL); R(g, x + 1, y + 3, 30, 2, '#6A6478'); R(g, x, y + 26, 32, 4, OL); R(g, x + 1, y + 27, 30, 2, '#6A6478');
      for (let i = 0; i < 5; i++) { R(g, x + 3 + i * 6, y + 4, 4, 24, OL); R(g, x + 4 + i * 6, y + 5, 2, 22, '#9A96AA'); }
    },
    greatlamp(g, x, y, st, t) {
      R(g, x + 4, y + 28, 24, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 8, y + 22, 16, 8, OL); R(g, x + 10, y + 24, 12, 5, '#8A8498');
      R(g, x + 6, y + 4, 20, 20, OL); R(g, x + 8, y + 6, 16, 16, st.lit ? '#FFE9A0' : '#3A4468');
      if (st.lit) { const k = 0.7 + 0.3 * Math.sin(t * 6); R(g, x + 11, y + 9, 10, 10, '#FFFFFF'); g.save(); g.globalAlpha = 0.3 * k; R(g, x - 6, y - 6, 44, 40, '#FFD86B'); g.restore(); }
      else { R(g, x + 11, y + 9, 10, 10, '#5A6896'); }
      R(g, x + 15, y + 6, 2, 16, OL); R(g, x + 8, y + 13, 16, 2, OL); R(g, x + 8, y, 16, 5, OL); R(g, x + 10, y + 1, 12, 3, '#C9D0DE');
    },
    cavemouth(g, x, y, st, t) {   // a doorway in a cliff wall, glowing from inside
      const k = 0.6 + 0.4 * Math.sin(t * 4);
      R(g, x, y, 32, 32, OL); R(g, x + 3, y + 8, 26, 24, '#2A1008'); R(g, x + 7, y + 4, 18, 8, '#2A1008');
      R(g, x + 6, y + 12, 20, 20, '#8A2A10'); R(g, x + 9, y + 12, 14, 20, '#E8552A'); R(g, x + 12, y + 16, 8, 16, '#FFA03A'); R(g, x + 14, y + 22, 4, 10, '#FFE08A');
      g.save(); g.globalAlpha = 0.25 * k; R(g, x - 6, y + 4, 44, 34, '#FF7A30'); g.restore();
      R(g, x + 2, y + 6, 28, 3, '#5A4A4A'); R(g, x + 4, y + 3, 24, 3, '#7A6A6A');
    },
    core(g, x, y, st, t, o) {
      const a = o.core === 'A', c1 = a ? '#FF9A3A' : '#8FD8EA', c2 = a ? '#FFE08A' : '#E0F4FF', k = 0.6 + 0.4 * Math.sin(t * 4 + (a ? 0 : 2));
      R(g, x + 6, y + 28, 20, 3, 'rgba(0,0,0,0.25)'); R(g, x + 8, y + 20, 16, 10, OL); R(g, x + 10, y + 22, 12, 7, '#7A748A'); R(g, x + 10, y + 22, 12, 2, '#A49EB6');
      R(g, x + 9, y + 6, 14, 14, OL); R(g, x + 11, y + 8, 10, 10, c1); R(g, x + 13, y + 10, 6, 6, c2);
      g.save(); g.globalAlpha = 0.3 * k; R(g, x + 3, y + 1, 26, 24, c1); g.restore();
    },
    socket(g, x, y, st, t, o) {
      const a = o.core === 'A', c1 = a ? '#FF9A3A' : '#8FD8EA', c2 = a ? '#FFE08A' : '#E0F4FF';
      R(g, x + 4, y + 28, 24, 3, 'rgba(0,0,0,0.25)'); R(g, x + 6, y + 14, 20, 16, OL); R(g, x + 8, y + 16, 16, 12, '#6A667A'); R(g, x + 8, y + 16, 16, 2, '#9A96AA');
      R(g, x + 10, y + 8, 12, 8, OL); R(g, x + 12, y + 10, 8, 4, st.on ? c1 : '#3A3646');
      if (st.on) { const k = 0.6 + 0.4 * Math.sin(t * 5); R(g, x + 13, y + 11, 6, 2, c2); g.save(); g.globalAlpha = 0.3 * k; R(g, x + 2, y + 2, 28, 22, c1); g.restore(); }
    },
    furnace(g, x, y, st, t) {
      R(g, x + 2, y + 28, 28, 3, 'rgba(0,0,0,0.25)'); R(g, x, y + 8, 32, 22, OL); R(g, x + 2, y + 10, 28, 18, '#6A6070'); R(g, x + 2, y + 10, 28, 3, '#9A90A8');
      R(g, x + 8, y + 14, 16, 14, OL); R(g, x + 10, y + 16, 12, 12, st.lit ? '#FF8A3A' : '#2A1E1E');
      if (st.lit) { const k = 0.7 + 0.3 * Math.sin(t * 7); R(g, x + 12, y + 18, 8, 8, '#FFE08A'); R(g, x + 14, y + 20, 4, 6, '#FFFFFF'); g.save(); g.globalAlpha = 0.3 * k; R(g, x - 6, y + 2, 44, 34, '#FF7A30'); g.restore(); }
      R(g, x + 11, y, 10, 10, OL); R(g, x + 13, y + 1, 6, 8, '#8A8498');
    },
    plaque(g, x, y, st, t) {   // the arch's rune stone: one gold rune per clue found
      R(g, x + 6, y + 28, 20, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 6, y + 6, 20, 24, OL); R(g, x + 8, y + 8, 16, 20, '#6A6880'); R(g, x + 8, y + 8, 16, 2, '#9A98B0');
      const n = st.glow | 0, k = 0.6 + 0.4 * Math.sin(t * 3);
      for (let i = 0; i < 4; i++) { const on = i < n; g.save(); g.globalAlpha = on ? (st.open ? 1 : 0.6 + 0.4 * k) : 1; R(g, x + 12, y + 11 + i * 4, 8, 2, on ? '#FFD86B' : '#4A4860'); g.restore(); }
    }
  };
  const LIGHT = { furnace: (o, st) => (st && st.lit ? 4.5 : 2), core: (o, st) => 2.6, socket: (o, st) => (st && st.on ? 2.6 : 0), greatlamp: (o, st) => (st && st.lit ? 4 : 0), fire: () => 3.8, brazier: () => 2.4, pyre: (o, st) => (st && st.lit ? 3.2 : 0), lamp: (o, st) => (st && st.lit ? 3.2 : 0), hull: (o, st) => (st && st.lit ? 3.0 : 0), crown: () => 1.6 };   // radius in tiles lit around an object
  return { CLUES, DUNGEONS, ART, LIGHT, TCOL, TYPES };
})();
