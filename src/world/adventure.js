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
  // ---- Wren's Gym (Mossbrook): the trial of being tended. Four seedlings in a garden, a stone trough of water in the middle, the way north hung with vines, Wren beyond them.
  // A seedling grows only while you STAY beside it (press Tend, then stand): about 2.5 s a stage, two stages to bloom. Walk away and it simply stops, keeping what it grew; nothing is ever lost.
  // When all four bloom the vines draw back. No sign explains it: the first bed is right beside the way in, and the first try teaches it (Meaning: you grew because someone stayed with you). ----
  function wrenHall() {
    const W = 22, H = 19, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    rect(6, 2, 15, 5, '=');                  // the leader's chamber
    rect(2, 7, 19, 17, '=');                 // the hall
    rect(3, 8, 18, 13, '.');                 // the garden
    rect(10, 16, 11, 18, '=');               // the way in
    rect(9, 6, 12, 6, '=');                  // the way north (hung with vines)
    [[5, 3], [8, 1], [13, 4], [16, 2], [3, 13], [18, 8]].forEach(([x, y]) => set(x, y, ','));
    [[11, 13], [4, 9], [16, 9], [8, 11]].forEach(([x, y], i) => objects.push({ id: 'bed' + (i + 1), kind: 'gbed', x: x, y: y, text: 'A seedling in turned soil.' }));   // bed1 is the one you pass on the way in
    objects.push({ id: 'trough', kind: 'trough', x: 12, y: 10, text: 'A stone trough. The water is clear, and it was filled today.' });
    [9, 10, 11, 12].forEach((x) => objects.push({ id: 'vines' + x, kind: 'vines', gate: 'wren', x: x, y: 6, text: 'Vines hang across the way.' }));
    [[3, 16], [18, 16], [7, 3], [14, 3]].forEach(([x, y], i) => objects.push({ id: 'gbr' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. The coals are warm.' }));
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x]));
    return { name: 'Wren\u2019s Gym', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [10.9, H - 1.4], exit: { edge: 's', a: 10, b: 11, to: 'mossbrook' }, types: [], rate: 0, spots: { wren: [10, 3] } };
  }
  // ---- Glacia's Gym (Frosthold): the trial of stillness. Black water lies between the door and Glacia. Ice forms on the water around you only while you STAND STILL (about 0.8 s),
  // and the ice you leave behind melts the moment you move on; the plate under your feet never melts. You cross by stopping, waiting, stepping, stopping. Reach the far shore and the whole pool
  // freezes for good (Meaning: what is kept by being kept cold; the cold keeps what it is given). No sign: the first still moment at the water's edge teaches it. ----
  function glaciaHall() {
    const W = 22, H = 21, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    rect(6, 2, 15, 5, '=');                  // the leader's chamber
    rect(2, 7, 19, 19, '.');                 // the hall (ice floor)
    rect(3, 9, 18, 14, '~');                 // the black water
    rect(10, 18, 11, 20, '=');               // the way in
    rect(9, 6, 12, 6, '=');                  // the way north (icicles hang across it)
    [9, 10, 11, 12].forEach((x) => objects.push({ id: 'ice' + x, kind: 'icicles', gate: 'glacia', x: x, y: 6, text: 'Icicles, thick as arms.' }));
    [[3, 17], [18, 17], [7, 3], [14, 3]].forEach(([x, y], i) => objects.push({ id: 'glb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. The flame is thin and straight.' }));
    objects.push({ id: 'gstone', kind: 'ringstones', x: 17, y: 8, text: 'Stones on the far shore. Someone sat here a long time.' });
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x]));
    return { name: 'Glacia\u2019s Gym', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [10.9, H - 1.4], exit: { edge: 's', a: 10, b: 11, to: 'frosthold' }, types: [], rate: 0, spots: { glacia: [10, 3] }, pool: [3, 9, 18, 14] };
  }
  // ---- Blaze's Gym (Cinderport): the trial of the fire that has to be fed. Three braziers between the door and Blaze, a woodpile by the door. A brazier burns down in about 14 s and goes dark.
  // You carry one log at a time: take one, feed a fire, go back. The way opens the moment all three burn at once (Meaning: this one wants feeding every day; the fire is kept by someone who keeps coming back). ----
  function blazeHall() {
    const W = 22, H = 19, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    rect(6, 2, 15, 5, '=');                  // the leader's chamber
    rect(2, 7, 19, 17, '.');                 // the hall
    rect(10, 16, 11, 18, '=');               // the way in
    rect(9, 6, 12, 6, '=');                  // the way north (a slab of cold slag)
    [[4, 10], [11, 8], [17, 10]].forEach(([x, y], i) => objects.push({ id: 'fire' + (i + 1), kind: 'gbrazier', x: x, y: y, text: 'A great brazier. The iron is warm.' }));
    objects.push({ id: 'wood', kind: 'woodpile', x: 10, y: 15, text: 'Split logs, stacked by someone who stacks logs every day.' });
    [9, 10, 11, 12].forEach((x) => objects.push({ id: 'slag' + x, kind: 'slagwall', gate: 'blaze', x: x, y: 6, text: 'Cold slag, poured across the way.' }));
    [[7, 3], [14, 3]].forEach(([x, y], i) => objects.push({ id: 'blb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' }));
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x]));
    return { name: 'Blaze\u2019s Gym', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [10.9, H - 1.4], exit: { edge: 's', a: 10, b: 11, to: 'cinderport' }, types: [], rate: 0, spots: { blaze: [10, 3] } };
  }
  // ---- Coral's Gym (Coralbay): the trial of answering across the dark. The hall is dark; five lamps stand in it. They light one after another (the call), then go out; you touch them in the same
  // order (the answer). Three rounds, each one lamp longer. A wrong touch makes them all blink and the call comes again; nothing is lost. When the third answer is right the lamps stay lit and the
  // chain across the way falls (Meaning: the road home lit across the dark; someone left a light on for you, and you answer it). ----
  function coralHall() {
    const W = 22, H = 19, rows = [], objects = [];
    for (let y = 0; y < H; y++) rows.push(new Array(W).fill('C'));
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c || '.'); };
    rect(6, 2, 15, 5, '=');                  // the leader's chamber
    rect(2, 7, 19, 17, '.');                 // the hall
    rect(10, 16, 11, 18, '=');               // the way in
    rect(9, 6, 12, 6, '=');                  // the way north (a chain across it)
    [[4, 9], [8, 12], [11, 8], [14, 12], [18, 9]].forEach(([x, y], i) => objects.push({ id: 'lamp' + i, kind: 'callamp', n: i, x: x, y: y, text: 'A lamp on a post. The glass is warm.' }));
    [9, 10, 11, 12].forEach((x) => objects.push({ id: 'chain' + x, kind: 'chain', gate: 'coral', x: x, y: 6, text: 'A chain across the way, wet from the sea.' }));
    [[7, 3], [14, 3]].forEach(([x, y], i) => objects.push({ id: 'clb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' }));
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x]));
    return { name: 'Coral\u2019s Gym', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [10.9, H - 1.4], exit: { edge: 's', a: 10, b: 11, to: 'coralbay' }, types: [], rate: 0, spots: { coral: [10, 3] }, dark: { r: 3.2 } };
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
  const DUNGEONS = { 'dg-arch': sealedArch, 'dg-lamp': lampTower, 'dg-forge': forgeBelow, 'gym-wren': wrenHall, 'gym-glacia': glaciaHall, 'gym-blaze': blazeHall, 'gym-coral': coralHall };
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
    // a camp fire on stones with a stack of split logs: nobody here, the stones are warm
    camp(g, x, y, st, t, o) {
      const dark = !!st.dark, f = Math.round(Math.sin(t * 8 + o.x) * 2) * 2;
      R(g, x + 3, y + 27, 26, 3, 'rgba(0,0,0,0.22)'); R(g, x + 4, y + 18, 24, 10, OL); R(g, x + 5, y + 19, 22, 8, '#8E8A86'); R(g, x + 9, y + 21, 14, 5, '#3A3330');
      R(g, x + 22, y + 10, 8, 10, OL); R(g, x + 23, y + 11, 6, 8, '#A87A48'); R(g, x + 23, y + 14, 6, 1, '#7A5230'); R(g, x + 23, y + 17, 6, 1, '#7A5230');
      const gl = g.createRadialGradient(x + 14, y + 18, 1, x + 14, y + 18, dark ? 30 : 16); gl.addColorStop(0, 'rgba(255,150,60,' + (dark ? 0.5 : 0.22) + ')'); gl.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gl; g.fillRect(x - 18, y - 12, 64, 56);
      R(g, x + 10, y + 12 - f / 2, 8, 10 + f / 2, '#E8552A'); R(g, x + 12, y + 14 - f / 2, 4, 8 + f / 2, '#FFB03A'); R(g, x + 13, y + 18, 2, 4, '#FFE08A');
    },
    // things set down in a neat row on the shore: a sandal, a cup, a toy boat, a comb
    returned(g, x, y, st, t, o) {
      R(g, x + 6, y + 26, 20, 3, 'rgba(0,0,0,0.2)'); R(g, x + 8, y + 22, 16, 5, OL); R(g, x + 9, y + 23, 14, 3, '#9AA3B5');
      if (o.v === 'sandal') { R(g, x + 9, y + 16, 5, 7, OL); R(g, x + 10, y + 17, 3, 5, '#B8793C'); R(g, x + 17, y + 16, 5, 7, OL); R(g, x + 18, y + 17, 3, 5, '#B8793C'); }
      else if (o.v === 'cup') { R(g, x + 12, y + 14, 8, 9, OL); R(g, x + 13, y + 15, 6, 7, '#E8E0D0'); R(g, x + 20, y + 16, 3, 4, OL); R(g, x + 13, y + 15, 6, 1, '#8A7A6A'); }
      else if (o.v === 'boat') { R(g, x + 9, y + 19, 14, 4, OL); R(g, x + 10, y + 20, 12, 2, '#C0503A'); R(g, x + 15, y + 12, 2, 8, OL); R(g, x + 17, y + 13, 5, 5, '#F4F6FA'); }
      else { R(g, x + 9, y + 18, 14, 5, OL); R(g, x + 10, y + 19, 12, 3, '#E8C07A'); for (let i = 0; i < 6; i++) R(g, x + 10 + i * 2, y + 22, 1, 2, '#E8C07A'); }
    },
    // young plants in turned soil that are taller the more seals you hold (st.stage 0 to 4), and a can left at the end of the row
    sprouts(g, x, y, st, t, o) {
      const k = Math.max(0, Math.min(4, st.stage | 0));
      R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.2)'); R(g, x + 2, y + 20, 28, 8, OL); R(g, x + 3, y + 21, 26, 6, '#6E4A2E'); R(g, x + 3, y + 21, 26, 1, '#8A6038');
      [6, 14, 22].forEach((px, i) => { const h = 2 + k * 3 + (i === 1 ? 1 : 0); R(g, px + 1, y + 21 - h, 2, h, '#2F8A3C'); if (k > 0) R(g, px - 1, y + 21 - h, 6, 2, '#5FBF58'); if (k > 2) { R(g, px - 2, y + 21 - h - 2, 8, 2, '#5FBF58'); R(g, px + 1, y + 21 - h - 4, 2, 2, '#F59ACB'); } });
      R(g, x + 27, y + 17, 4, 5, OL); R(g, x + 28, y + 18, 2, 3, '#8E98AD');
    },
    // a flame held in a block of ice: it does not flicker
    icelamp(g, x, y, st, t, o) {
      R(g, x + 4, y + 27, 24, 3, 'rgba(0,0,0,0.2)'); R(g, x + 6, y + 6, 20, 22, OL); R(g, x + 7, y + 7, 18, 20, '#BFE4F4'); R(g, x + 7, y + 7, 18, 3, '#E8F6FC'); R(g, x + 8, y + 12, 3, 12, '#9ACBE4');
      R(g, x + 13, y + 12, 6, 11, '#FFA03A'); R(g, x + 14, y + 14, 4, 8, '#FFD27A'); R(g, x + 15, y + 17, 2, 4, '#FFF6D0');
    },
    // a stone hearth with a stack of split logs that is fresh each day (st.logs 1 to 3)
    hearth(g, x, y, st, t, o) {
      const n = Math.max(1, Math.min(3, st.logs | 0)), f = Math.round(Math.sin(t * 8 + o.x) * 2) * 2;
      R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); R(g, x + 3, y + 14, 26, 14, OL); R(g, x + 4, y + 15, 24, 12, '#8E8A86'); R(g, x + 8, y + 19, 16, 8, '#2A2420');
      R(g, x + 11, y + 15 - f / 2, 10, 12 + f / 2, '#E8552A'); R(g, x + 13, y + 18 - f / 2, 6, 9 + f / 2, '#FFB03A'); R(g, x + 15, y + 22, 2, 5, '#FFE08A');
      for (let i = 0; i < n; i++) { R(g, x + 28, y + 24 - i * 5, 5, 4, OL); R(g, x + 29, y + 25 - i * 5, 3, 2, '#A87A48'); }
    },
    // a skiff tied at the water's edge with a lamp at its bow, lit at dusk and night; nobody aboard
    moored(g, x, y, st, t, o) {
      R(g, x + 1, y + 26, 30, 4, 'rgba(0,0,0,0.2)'); R(g, x + 2, y + 17, 28, 9, OL); R(g, x + 3, y + 18, 26, 6, '#8A5A32'); R(g, x + 3, y + 18, 26, 2, '#B07A46'); R(g, x + 2, y + 15, 3, 4, OL);
      R(g, x + 6, y + 24, 20, 2, 'rgba(120,170,220,0.55)'); R(g, x + 4, y + 10, 2, 8, '#5A4A38');
      if (st.lit) { const gl = g.createRadialGradient(x + 5, y + 10, 1, x + 5, y + 10, 24); gl.addColorStop(0, 'rgba(255,214,120,0.6)'); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(x - 20, y - 14, 50, 48); R(g, x + 2, y + 6, 6, 6, '#FFD27A'); } else R(g, x + 2, y + 6, 6, 6, '#3A3340');
      R(g, x + 1, y + 5, 8, 1, OL);
    },
    // a post with notches cut at growing heights, one more for each seal you hold (st.n 1 to 5)
    growthpost(g, x, y, st, t, o) {
      const n = Math.max(1, Math.min(5, st.n | 0));
      R(g, x + 8, y + 27, 16, 3, 'rgba(0,0,0,0.22)'); R(g, x + 12, y + 2, 8, 26, OL); R(g, x + 13, y + 3, 6, 24, '#A07E54'); R(g, x + 13, y + 3, 1, 24, '#C0985E');
      for (let i = 0; i < n; i++) { R(g, x + 12 - (i % 2 ? 2 : 0), y + 24 - i * 4 - (i > 2 ? 1 : 0), 10, 2, OL); }
    },
    // a stove with a kettle that is steaming, and two cups
    kettle(g, x, y, st, t, o) {
      R(g, x + 3, y + 27, 26, 3, 'rgba(0,0,0,0.22)'); R(g, x + 6, y + 16, 20, 12, OL); R(g, x + 7, y + 17, 18, 10, '#6E6A66'); R(g, x + 10, y + 22, 12, 5, '#2A2420'); R(g, x + 14, y + 23, 4, 4, '#FFA03A');
      R(g, x + 11, y + 9, 10, 8, OL); R(g, x + 12, y + 10, 8, 6, '#C9B088'); R(g, x + 20, y + 11, 4, 2, OL); const w = Math.round(Math.sin(t * 2) * 1);
      R(g, x + 15 + w, y + 4, 2, 4, 'rgba(255,255,255,0.55)'); R(g, x + 14 - w, y + 0, 2, 4, 'rgba(255,255,255,0.35)'); R(g, x + 1, y + 21, 4, 5, OL); R(g, x + 2, y + 22, 2, 3, '#E8E0D0'); R(g, x + 27, y + 21, 4, 5, OL); R(g, x + 28, y + 22, 2, 3, '#E8E0D0');
    },
    // a bench with tools laid in a row and an apron on a peg
    workbench(g, x, y, st, t, o) {
      R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); R(g, x + 3, y + 16, 26, 4, OL); R(g, x + 4, y + 17, 24, 2, '#A07E54'); R(g, x + 5, y + 20, 3, 8, OL); R(g, x + 24, y + 20, 3, 8, OL);
      R(g, x + 6, y + 13, 8, 3, OL); R(g, x + 7, y + 14, 6, 1, '#8E98AD'); R(g, x + 16, y + 11, 2, 5, OL); R(g, x + 14, y + 11, 6, 2, OL); R(g, x + 22, y + 12, 5, 4, '#6E5030');
      R(g, x + 27, y + 4, 2, 8, '#5A4A38'); R(g, x + 24, y + 8, 7, 9, OL); R(g, x + 25, y + 9, 5, 7, '#C0503A');
    },
    // a lamp left on at the harbour, lit at dusk and night (st.lit)
    harborlamp(g, x, y, st, t, o) {
      R(g, x + 9, y + 28, 14, 3, 'rgba(0,0,0,0.22)'); R(g, x + 14, y + 6, 4, 22, '#4A5878'); R(g, x + 11, y + 4, 10, 3, '#4A5878'); R(g, x + 11, y + 6, 10, 10, OL);
      if (st.lit) { const gl = g.createRadialGradient(x + 16, y + 11, 1, x + 16, y + 11, 26); gl.addColorStop(0, 'rgba(255,214,120,0.6)'); gl.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gl; g.fillRect(x - 12, y - 14, 56, 52); }
      R(g, x + 12, y + 7, 8, 8, st.lit ? '#FFD27A' : '#3A3340');
    },
    // a seedling in a raised planter box: st.stage 0 (a two-leaf seedling), 1 (leafy), 2 (in bloom); st.p is the growth under way (0..1) so you SEE it rise while you stay; st.tending draws the care (green motes rising)
    gbed(g, x, y, st, t, o) {
      const stage = st.stage | 0, p = Math.max(0, Math.min(1, st.p || 0)), k = stage + p, tend = !!st.tending;
      R(g, x + 1, y + 28, 30, 3, 'rgba(0,0,0,0.28)');
      R(g, x + 1, y + 16, 30, 13, OL); R(g, x + 2, y + 17, 28, 11, '#8A5A32'); R(g, x + 2, y + 17, 28, 3, '#B07A46'); R(g, x + 2, y + 26, 28, 2, '#5E3C22');   // the box
      R(g, x + 4, y + 20, 24, 6, OL); R(g, x + 5, y + 21, 22, 4, '#4A2E1A'); R(g, x + 6, y + 21, 20, 1, '#6E4A2E');                                             // turned soil
      const leaf = k >= 2 ? '#4FC25A' : k >= 1 ? '#6FC865' : '#8ED878', lite = '#B8F0A0', stem = k >= 1 ? '#1F7A32' : '#3E9A3E';
      const h = Math.round(6 + k * 7), top = y + 21 - h;                        // 6 px seedling to 20 px plant
      R(g, x + 14, top, 4, h, OL); R(g, x + 15, top, 2, h, stem);
      const w0 = Math.round(4 + Math.min(k, 1) * 3);                            // the first pair of leaves is there from the start
      R(g, x + 15 - w0, top + 1, w0 + 1, 4, OL); R(g, x + 16, top + 1, w0 + 1, 4, OL); R(g, x + 15 - w0 + 1, top + 2, w0 - 1, 2, leaf); R(g, x + 17, top + 2, w0 - 1, 2, leaf); R(g, x + 15 - w0 + 1, top + 2, 2, 1, lite);
      if (k >= 1) { const w = Math.round(4 + (Math.min(k, 2) - 1) * 4); R(g, x + 15 - w, top + 8, w + 1, 4, OL); R(g, x + 16, top + 9, w + 1, 4, OL); R(g, x + 16 - w, top + 9, w - 1, 2, leaf); R(g, x + 17, top + 10, w - 1, 2, leaf); }
      if (stage >= 2) { [[16, top - 5], [9, top + 3], [23, top + 6]].forEach(([fx, fy]) => { R(g, x + fx - 3, fy - 1, 6, 6, OL); R(g, x + fx - 2, fy, 4, 4, '#F59ACB'); R(g, x + fx - 1, fy + 1, 2, 2, '#FFE0F0'); }); }
      if (tend) { for (let i = 0; i < 4; i++) { const ph = (t * 0.8 + i * 0.29) % 1; R(g, x + 7 + i * 6 + Math.round(Math.sin(t * 3 + i) * 1) * 2, y + 18 - Math.round(ph * 14) * 2, 2, 2, 'rgba(170,240,150,' + (0.9 - ph * 0.8).toFixed(2) + ')'); } }
    },
    // a stone trough of clear water, filled today
    trough(g, x, y, st, t, o) {
      R(g, x + 1, y + 28, 30, 3, 'rgba(0,0,0,0.25)'); R(g, x + 1, y + 10, 30, 19, OL); R(g, x + 2, y + 11, 28, 17, '#8E98AD'); R(g, x + 2, y + 11, 28, 3, '#C9D0DC'); R(g, x + 2, y + 26, 28, 2, '#5E6678');
      R(g, x + 5, y + 14, 22, 11, OL); R(g, x + 6, y + 15, 20, 9, '#3F8FC8'); R(g, x + 6, y + 15, 20, 2, '#5AA8F0'); const w = Math.round(Math.sin(t * 1.3 + o.x) * 2); R(g, x + 9 + w, y + 18, 7, 1, '#A8D8FF'); R(g, x + 16 - w, y + 21, 6, 1, '#A8D8FF');
    },
    // icicles hanging across a way (Glacia's gate)
    icicles(g, x, y, st, t, o) {
      R(g, x, y, 32, 5, OL); R(g, x + 1, y + 1, 30, 3, '#5E97AE');
      [2, 8, 13, 19, 25].forEach((vx, i) => { const L = 24 - (i % 2) * 8 - (i === 2 ? 4 : 0); R(g, x + vx - 1, y + 4, 6, L, OL); R(g, x + vx, y + 4, 4, L - 1, '#BFE4F4'); R(g, x + vx, y + 4, 1, L - 1, '#FFFFFF'); R(g, x + vx + 1, y + 3 + L, 2, 2, OL); });
    },
    // a great brazier whose fire is a burn level (st.burn 0..1): tall and bright when fed, embers when low, cold iron at 0
    gbrazier(g, x, y, st, t, o) {
      const b = Math.max(0, Math.min(1, st.burn || 0)), f = Math.round(Math.sin(t * 9 + o.x) * 2) * 2;
      R(g, x + 3, y + 28, 26, 3, 'rgba(0,0,0,0.25)'); R(g, x + 12, y + 22, 8, 6, OL); R(g, x + 13, y + 23, 6, 4, '#3A3330'); R(g, x + 4, y + 14, 24, 9, OL); R(g, x + 5, y + 15, 22, 7, '#4A4440'); R(g, x + 5, y + 15, 22, 2, '#6A6460');
      if (b > 0) { const h = Math.round(6 + b * 16), gl = g.createRadialGradient(x + 16, y + 14, 1, x + 16, y + 14, 18 + b * 22); gl.addColorStop(0, 'rgba(255,150,60,' + (0.25 + 0.4 * b).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gl; g.fillRect(x - 24, y - 30, 80, 70);
        R(g, x + 11, y + 15 - h + f / 2, 10, h - f / 2, '#E8552A'); R(g, x + 13, y + 17 - Math.round(h * 0.7), 6, Math.round(h * 0.7), '#FFB03A'); if (b > 0.35) R(g, x + 15, y + 16 - Math.round(h * 0.4), 2, Math.round(h * 0.4), '#FFE08A'); }
      else { R(g, x + 9, y + 12, 14, 3, '#2A2420'); R(g, x + 12, y + 11, 3, 2, '#3A3330'); }
    },
    // split logs, stacked
    woodpile(g, x, y) {
      R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); [[3, 20], [11, 20], [19, 20], [7, 14], [15, 14], [11, 8]].forEach(([lx, ly]) => { R(g, x + lx, y + ly, 10, 7, OL); R(g, x + lx + 1, y + ly + 1, 8, 5, '#A87A48'); R(g, x + lx + 1, y + ly + 1, 8, 1, '#C9986A'); R(g, x + lx + 3, y + ly + 3, 2, 2, '#7A5230'); });
    },
    // a wall of cold slag across a way (Blaze's gate)
    slagwall(g, x, y, st, t, o) {
      R(g, x, y + 2, 32, 26, OL); R(g, x + 1, y + 3, 30, 24, '#3A2A24'); R(g, x + 1, y + 3, 30, 3, '#5A4A40'); [[4, 9], [14, 14], [22, 8], [9, 20], [24, 20]].forEach(([px, py]) => { R(g, x + px, y + py, 5, 3, '#2A1C18'); R(g, x + px + 1, y + py + 1, 2, 1, '#5E3A2A'); });
    },
    // a lamp on a post in the dark hall (Coral); st.lit 0..1
    callamp(g, x, y, st, t, o) {
      const k = Math.max(0, Math.min(1, st.lit || 0));
      R(g, x + 10, y + 28, 12, 3, 'rgba(0,0,0,0.3)'); R(g, x + 14, y + 10, 4, 18, OL); R(g, x + 15, y + 10, 2, 18, '#4A5878'); R(g, x + 9, y + 2, 14, 3, OL); R(g, x + 10, y + 3, 12, 1, '#6A7A98');
      if (k > 0.02) { const gl = g.createRadialGradient(x + 16, y + 9, 1, x + 16, y + 9, 14 + k * 30); gl.addColorStop(0, 'rgba(255,220,130,' + (0.7 * k).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,220,130,0)'); g.fillStyle = gl; g.fillRect(x - 30, y - 36, 92, 90); }
      R(g, x + 10, y + 4, 12, 11, OL); R(g, x + 11, y + 5, 10, 9, k > 0.5 ? '#FFD27A' : k > 0.02 ? '#B08A40' : '#3A3340'); if (k > 0.5) R(g, x + 14, y + 7, 4, 5, '#FFF6D0');
    },
    // a chain across a way (Coral's gate)
    chain(g, x, y, st, t, o) {
      R(g, x, y + 12, 32, 6, OL); for (let i = 0; i < 4; i++) { R(g, x + i * 8 + 1, y + 13, 6, 4, i % 2 ? '#8E98AD' : '#6A7488'); R(g, x + i * 8 + 3, y + 14, 2, 2, OL); } R(g, x + 6, y + 18, 3, 3, 'rgba(120,170,220,0.5)');
    },
    // an armchair with a worn cushion
    armchair(g, x, y) {
      R(g, x + 3, y + 27, 26, 3, 'rgba(0,0,0,0.22)'); R(g, x + 4, y + 6, 24, 22, OL); R(g, x + 5, y + 7, 22, 20, '#8E5BC8'); R(g, x + 5, y + 7, 22, 2, '#A97AE0'); R(g, x + 5, y + 16, 4, 11, '#7A4AB0'); R(g, x + 23, y + 16, 4, 11, '#7A4AB0');
      R(g, x + 9, y + 17, 14, 8, '#B08AE0'); R(g, x + 12, y + 19, 8, 4, '#9A74CC');   // the cushion, worn in the middle
    },
    // a shelf of jars with dated lids
    jars(g, x, y) {
      R(g, x + 1, y + 4, 30, 24, OL); R(g, x + 2, y + 5, 28, 22, '#8A5A34'); R(g, x + 2, y + 14, 28, 2, '#5E3C22'); R(g, x + 2, y + 25, 28, 2, '#5E3C22');
      [[4, 6, '#C8A24A'], [11, 6, '#8E5BC8'], [18, 6, '#C0503A'], [24, 6, '#4FB06D'], [5, 16, '#D9A066'], [13, 16, '#C8A24A'], [21, 16, '#8E5BC8']].forEach(([jx, jy, c]) => { R(g, x + jx, jy + y, 6, 8, OL); R(g, x + jx + 1, jy + y + 1, 4, 6, c); R(g, x + jx + 1, jy + y, 4, 1, '#E8E0D0'); R(g, x + jx + 2, jy + y + 3, 2, 2, '#F4EAD6'); });
    },
    // foraging baskets, each with a different find
    baskets(g, x, y) {
      R(g, x + 1, y + 27, 30, 3, 'rgba(0,0,0,0.22)');
      [[1, 16, '#C0503A'], [9, 18, '#E8C07A'], [17, 16, '#8E5BC8'], [24, 18, '#F4EAD6']].forEach(([bx, by, c]) => { R(g, x + bx, y + by, 8, 10, OL); R(g, x + bx + 1, y + by + 1, 6, 8, '#B07A46'); R(g, x + bx + 1, y + by + 4, 6, 1, '#8A5A34'); R(g, x + bx + 2, y + by - 1, 4, 3, c); R(g, x + bx + 3, y + by - 2, 2, 1, c); });
    },
    // bunches of herbs hanging to dry, oldest to newest
    herbs(g, x, y) {
      R(g, x + 1, y + 2, 30, 3, '#5A4A38'); [[3, '#8A7A4A', 10], [10, '#6E8A3A', 12], [17, '#4E9A3E', 14], [24, '#3E9A44', 16]].forEach(([hx, c, L]) => { R(g, x + hx, y + 5, 1, 4, '#C9B088'); R(g, x + hx - 2, y + 9, 5, L, OL); R(g, x + hx - 1, y + 10, 3, L - 2, c); R(g, x + hx - 3, y + 12, 2, 3, c); R(g, x + hx + 2, y + 15, 2, 3, c); });
    },
    // a map on the wall, the same path drawn many times
    wallmap(g, x, y) {
      R(g, x + 2, y + 2, 28, 24, OL); R(g, x + 3, y + 3, 26, 22, '#E8D7B0'); R(g, x + 6, y + 6, 8, 6, '#4FA040'); R(g, x + 18, y + 14, 7, 7, '#3F8FC8');
      [['#6E4A2E', 0], ['#8A5A34', 1], ['#5A3A22', -1], ['#A0703C', 2]].forEach(([c, d]) => { R(g, x + 5 + d, y + 20, 10, 1, c); R(g, x + 14 + d, y + 14 + d, 1, 7, c); R(g, x + 14 + d, y + 13 + d, 9, 1, c); R(g, x + 22 + d, y + 7, 1, 7, c); });
    },
    // crayon drawings pinned on the wall, stars around each
    drawings(g, x, y) {
      [[2, 3, '#F59ACB'], [12, 2, '#FFD86B'], [22, 4, '#7CD957'], [4, 15, '#5AA8F0'], [15, 14, '#FF8A3D'], [24, 16, '#C9A8FF']].forEach(([dx, dy, c]) => { R(g, x + dx, y + dy, 8, 9, '#FFFFFF'); R(g, x + dx + 2, y + dy + 2, 4, 4, c); R(g, x + dx + 3, y + dy + 3, 1, 1, OL); R(g, x + dx + 3, y + dy, 2, 1, '#C0503A'); R(g, x + dx + 1, y + dy + 7, 1, 1, '#FFD86B'); R(g, x + dx + 6, y + dy + 1, 1, 1, '#FFD86B'); R(g, x + dx + 6, y + dy + 7, 1, 1, '#FFD86B'); });
    },
    // an empty jar on a shelf, with a label
    shinyjar(g, x, y) {
      R(g, x + 1, y + 16, 30, 4, OL); R(g, x + 2, y + 17, 28, 2, '#8A5A34'); R(g, x + 11, y + 3, 10, 14, OL); R(g, x + 12, y + 4, 8, 12, '#D8EAF4'); R(g, x + 12, y + 4, 8, 2, '#8E98AD'); R(g, x + 13, y + 9, 6, 4, '#F4EAD6'); R(g, x + 14, y + 10, 4, 1, '#5A4A38'); R(g, x + 13, y + 6, 1, 6, '#FFFFFF');
    },
    // a small bed with a critter blanket
    smallbed(g, x, y) {
      R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); R(g, x + 3, y + 4, 26, 24, OL); R(g, x + 4, y + 5, 24, 22, '#E8E8F0'); R(g, x + 4, y + 12, 24, 15, '#FFD86B'); R(g, x + 4, y + 12, 24, 1, '#E0A830'); [[7, 15], [15, 19], [21, 15], [10, 22]].forEach(([bx, by]) => { R(g, x + bx, y + by, 4, 3, '#4FB06D'); R(g, x + bx + 1, y + by + 1, 1, 1, OL); });
      R(g, x + 7, y + 6, 10, 4, '#FFFFFF');
    },
    // --- the other nine houses ---
    stool(g, x, y) { R(g, x + 8, y + 27, 16, 3, 'rgba(0,0,0,0.22)'); R(g, x + 8, y + 14, 16, 5, OL); R(g, x + 9, y + 15, 14, 3, '#B07A46'); R(g, x + 9, y + 15, 14, 1, '#D9A066'); R(g, x + 10, y + 19, 2, 8, OL); R(g, x + 20, y + 19, 2, 8, OL); R(g, x + 15, y + 19, 2, 8, '#6E4A2E'); },
    tally(g, x, y) { R(g, x + 2, y + 2, 28, 24, '#3E3026'); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const tx = x + 4 + c * 5, ty = y + 4 + r * 6; R(g, tx, ty, 1, 4, '#C9D3E6'); R(g, tx + 2, ty, 1, 4, '#C9D3E6'); if (c % 2) R(g, tx - 2, ty + 2, 5, 1, '#C9D3E6'); } },
    cloakpeg(g, x, y) { R(g, x + 14, y + 2, 4, 3, '#5A4A38'); R(g, x + 8, y + 5, 16, 20, OL); R(g, x + 9, y + 6, 14, 18, '#3E6E8E'); R(g, x + 9, y + 6, 14, 3, '#5A8EAE'); R(g, x + 12, y + 9, 2, 14, '#2E4A66'); R(g, x + 15, y + 2, 2, 3, '#C9D3E6'); },
    furs(g, x, y) { R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); [[20, '#8A6A4A'], [15, '#C9A878'], [10, '#5A4A38'], [5, '#E8E0D0']].forEach(([fy, c]) => { R(g, x + 3, y + fy, 26, 6, OL); R(g, x + 4, y + fy + 1, 24, 4, c); R(g, x + 4, y + fy + 1, 24, 1, 'rgba(255,255,255,0.25)'); R(g, x + 24, y + fy + 2, 4, 2, '#F4EAD6'); }); },
    ledger(g, x, y) { R(g, x + 4, y + 27, 24, 3, 'rgba(0,0,0,0.22)'); R(g, x + 5, y + 16, 22, 11, OL); R(g, x + 6, y + 17, 20, 9, '#8A5A34'); R(g, x + 6, y + 17, 20, 1, '#B07A46'); R(g, x + 8, y + 18, 16, 7, '#E8D7B0'); R(g, x + 10, y + 20, 12, 1, '#5A4A38'); R(g, x + 10, y + 22, 8, 1, '#5A4A38'); R(g, x + 15, y + 14, 2, 5, '#C0503A'); },
    souppot(g, x, y, st, t, o) { R(g, x + 3, y + 27, 26, 3, 'rgba(0,0,0,0.25)'); R(g, x + 6, y + 20, 20, 7, '#3A3330'); R(g, x + 10, y + 22, 12, 4, '#FF8A3D'); R(g, x + 12, y + 23, 8, 2, '#FFD86B'); R(g, x + 15, y + 2, 2, 8, '#5A4A38'); R(g, x + 7, y + 9, 18, 12, OL); R(g, x + 8, y + 10, 16, 10, '#3A3A46'); R(g, x + 8, y + 10, 16, 2, '#5A5A6A'); R(g, x + 10, y + 11, 12, 1, '#C9A26A'); const w = Math.round(Math.sin(t * 2 + o.x) * 1); R(g, x + 12 + w, y + 5, 2, 4, 'rgba(255,255,255,0.5)'); R(g, x + 18 - w, y + 3, 2, 4, 'rgba(255,255,255,0.35)'); },
    bowls(g, x, y) { R(g, x + 1, y + 16, 30, 4, OL); R(g, x + 2, y + 17, 28, 2, '#8A5A34'); for (let i = 0; i < 6; i++) { const bx = x + 3 + (i % 3) * 9, by = y + 6 + Math.floor(i / 3) * 5; R(g, bx, by, 8, 4, OL); R(g, bx + 1, by + 1, 6, 2, i < 2 ? '#E8C07A' : '#E8E0D0'); } R(g, x + 4, y + 22, 8, 4, OL); R(g, x + 5, y + 23, 6, 2, '#E8C07A'); R(g, x + 20, y + 22, 8, 4, OL); R(g, x + 21, y + 23, 6, 2, '#E8C07A'); },
    anvil(g, x, y) { R(g, x + 4, y + 27, 24, 3, 'rgba(0,0,0,0.28)'); R(g, x + 9, y + 18, 14, 9, OL); R(g, x + 10, y + 19, 12, 7, '#3A3A46'); R(g, x + 3, y + 10, 26, 9, OL); R(g, x + 4, y + 11, 24, 7, '#5A5A6A'); R(g, x + 8, y + 11, 14, 2, '#C9D3E6'); R(g, x + 2, y + 12, 3, 4, '#5A5A6A'); },
    toolwall(g, x, y) { R(g, x + 2, y + 2, 28, 24, '#5A2A1E'); [[5, 'hammer'], [12, 'tongs'], [19, 'file'], [25, 'hammer']].forEach(([tx, k]) => { R(g, x + tx - 2, y + 3, 6, 20, '#4A2218'); R(g, x + tx, y + 4, 2, 16, '#A87A48'); if (k === 'hammer') R(g, x + tx - 2, y + 4, 6, 4, '#8E98AD'); else if (k === 'tongs') { R(g, x + tx - 1, y + 16, 1, 5, '#8E98AD'); R(g, x + tx + 2, y + 16, 1, 5, '#8E98AD'); } else R(g, x + tx, y + 4, 2, 10, '#B7BFCF'); }); },
    coals(g, x, y, st, t, o) { R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.25)'); R(g, x + 3, y + 14, 26, 13, OL); R(g, x + 4, y + 15, 24, 11, '#4A4440'); R(g, x + 6, y + 17, 20, 7, '#2A2420'); const k = 0.5 + 0.5 * Math.sin(t * 1.5 + o.x); [[8, 19], [14, 21], [20, 18], [11, 22]].forEach(([cx, cy], i) => R(g, x + cx, y + cy, 3, 2, i % 2 ? 'rgba(255,120,40,' + (0.5 + 0.4 * k).toFixed(2) + ')' : 'rgba(255,180,60,' + (0.4 + 0.4 * k).toFixed(2) + ')')); R(g, x + 6, y + 16, 20, 2, '#8A8480'); },
    broom(g, x, y) { R(g, x + 10, y + 27, 12, 3, 'rgba(0,0,0,0.22)'); R(g, x + 15, y + 3, 2, 17, '#A87A48'); R(g, x + 11, y + 19, 10, 9, OL); R(g, x + 12, y + 20, 8, 7, '#C9A26A'); R(g, x + 12, y + 20, 8, 1, '#8A5A34'); R(g, x + 14, y + 26, 6, 2, '#C9A26A'); },
    ashjar(g, x, y) { R(g, x + 1, y + 16, 30, 4, OL); R(g, x + 2, y + 17, 28, 2, '#8A5A34'); R(g, x + 11, y + 4, 10, 13, OL); R(g, x + 12, y + 5, 8, 11, '#D8EAF4'); R(g, x + 12, y + 9, 8, 7, '#8E8A86'); R(g, x + 12, y + 5, 8, 2, '#8E98AD'); R(g, x + 13, y + 10, 6, 3, '#F4EAD6'); },
    bunks(g, x, y) { R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); [[3, 3], [3, 15], [17, 3], [17, 15]].forEach(([bx, by], i) => { R(g, x + bx, y + by, 12, 11, OL); R(g, x + bx + 1, y + by + 1, 10, 9, '#E8E8F0'); R(g, x + bx + 1, y + by + 5, 10, 5, i === 3 ? '#9A7A5A' : '#C0503A'); if (i === 3) R(g, x + bx + 2, y + by + 2, 4, 2, '#C9C9D6'); }); },
    helmets(g, x, y) { R(g, x + 2, y + 2, 28, 4, '#5A4A38'); [5, 12, 19, 26].forEach((hx, i) => { R(g, x + hx, y + 6, 2, 3, '#8E98AD'); if (i < 3) { R(g, x + hx - 3, y + 9, 8, 7, OL); R(g, x + hx - 2, y + 10, 6, 5, '#C8A24A'); R(g, x + hx, y + 11, 2, 2, '#FFE08A'); } }); },
    glowrock(g, x, y, st, t, o) { R(g, x + 6, y + 27, 20, 3, 'rgba(0,0,0,0.22)'); const k = 0.6 + 0.4 * Math.sin(t * 2 + o.x), gl = g.createRadialGradient(x + 16, y + 20, 1, x + 16, y + 20, 18); gl.addColorStop(0, 'rgba(120,230,160,' + (0.45 * k).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(120,230,160,0)'); g.fillStyle = gl; g.fillRect(x - 6, y - 2, 44, 44); R(g, x + 9, y + 14, 14, 12, OL); R(g, x + 10, y + 15, 12, 10, '#4A5A58'); R(g, x + 13, y + 17, 6, 5, '#7AE0A0'); R(g, x + 14, y + 18, 2, 2, '#E0FFF0'); },
    logbook(g, x, y) { R(g, x + 4, y + 27, 24, 3, 'rgba(0,0,0,0.22)'); R(g, x + 3, y + 16, 26, 11, OL); R(g, x + 4, y + 17, 24, 9, '#F4EAD6'); R(g, x + 16, y + 17, 1, 9, '#B8A888'); [19, 21, 23].forEach((ly) => { R(g, x + 6, y + ly, 8, 1, '#5A4A38'); R(g, x + 18, y + ly, 8, 1, '#5A4A38'); }); R(g, x + 18, y + 23, 5, 1, '#3C95DC'); },
    oilcans(g, x, y) { R(g, x + 2, y + 27, 28, 3, 'rgba(0,0,0,0.22)'); [3, 10, 17, 24].forEach((cx, i) => { R(g, x + cx, y + 12, 7, 15, OL); R(g, x + cx + 1, y + 13, 5, 13, i === 3 ? '#8E98AD' : '#C8A24A'); R(g, x + cx + 2, y + 9, 3, 4, OL); R(g, x + cx + 1, y + 13, 5, 2, 'rgba(255,255,255,0.3)'); }); },
    shiplist(g, x, y) { R(g, x + 3, y + 2, 26, 24, OL); R(g, x + 4, y + 3, 24, 22, '#F4EAD6'); for (let i = 0; i < 6; i++) { const ly = y + 5 + i * 3; R(g, x + 6, ly, 14 - (i % 3) * 2, 1, '#5A4A38'); if (i !== 4) R(g, x + 5, ly, 18, 1, 'rgba(192,80,58,0.9)'); } R(g, x + 22, y + 17, 4, 1, '#3C95DC'); },
    nets(g, x, y) { R(g, x + 1, y + 2, 30, 3, '#5A4A38'); for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const nx = x + 3 + c * 4, ny = y + 6 + r * 4; R(g, nx, ny, 4, 1, (r + c) % 5 === 0 ? '#E8C07A' : '#8A7A5A'); R(g, nx, ny, 1, 4, (r + c) % 7 === 0 ? '#E8C07A' : '#8A7A5A'); } },
    network(g, x, y) { R(g, x + 2, y + 10, 28, 18, 'rgba(0,0,0,0.1)'); for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) { const nx = x + 3 + c * 4, ny = y + 11 + r * 4; if (c > 3 && r > 1) continue; R(g, nx, ny, 4, 1, '#8A7A5A'); R(g, nx, ny, 1, 4, '#8A7A5A'); } R(g, x + 20, y + 20, 1, 6, '#C9D3E6'); R(g, x + 19, y + 19, 3, 1, '#C9D3E6'); R(g, x + 21, y + 21, 5, 1, '#E8C07A'); },
    shellrows(g, x, y) { R(g, x + 1, y + 4, 30, 22, OL); R(g, x + 2, y + 5, 28, 20, '#8A5A34'); [10, 17, 24].forEach((ly) => R(g, x + 2, y + ly, 28, 1, '#5E3C22')); let n = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const sx = x + 4 + c * 7, sy = y + 6 + r * 7; R(g, sx, sy, 5, 4, '#F4F0E6'); if (n !== 7) { R(g, sx + 1, sy, 3, 3, ['#F5A3D0', '#FFD86B', '#E07AB0', '#9CD3F5', '#FFFFFF'][n % 5]); R(g, sx + 2, sy + 1, 1, 1, OL); } n++; } },
    bucket(g, x, y) { R(g, x + 8, y + 27, 16, 3, 'rgba(0,0,0,0.22)'); R(g, x + 9, y + 12, 14, 15, OL); R(g, x + 10, y + 13, 12, 13, '#8E98AD'); R(g, x + 10, y + 13, 12, 2, '#B7BFCF'); R(g, x + 11, y + 15, 10, 4, '#3C95DC'); R(g, x + 9, y + 8, 1, 5, OL); R(g, x + 22, y + 8, 1, 5, OL); R(g, x + 9, y + 8, 14, 1, OL); R(g, x + 12, y + 27, 8, 2, 'rgba(120,170,220,0.5)'); },
    // vines hung across a way: braided and heavy, with pale flowers, darker than tall grass
    vines(g, x, y, st, t, o) {
      const sw = Math.round(Math.sin(t * 1.4 + o.x) * 1);
      R(g, x, y, 32, 6, OL); R(g, x + 1, y + 1, 30, 4, '#1B4E26');
      [3, 9, 15, 21, 27].forEach((vx, i) => { const L = 28 - (i % 2) * 6; R(g, vx + x - 1 + sw, y + 4, 5, L, OL); R(g, vx + x + sw, y + 4, 3, L - 1, i % 2 ? '#2A7A38' : '#1F6A2E'); R(g, vx + x - 3 + sw, y + 9 + (i % 3) * 5, 4, 3, '#4FC25A'); R(g, vx + x + 3 + sw, y + 16 + (i % 2) * 4, 4, 3, '#4FC25A'); if (i % 2 === 0) R(g, vx + x + sw, y + 21, 3, 3, '#F4E8A0'); });
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
  const LIGHT = { gbrazier: (o, st) => (st && st.burn > 0 ? 1.6 + 2.4 * st.burn : 0.6), callamp: (o, st) => (st && st.lit > 0.02 ? 1.2 + 2.6 * st.lit : 0.5), furnace: (o, st) => (st && st.lit ? 4.5 : 2), core: (o, st) => 2.6, socket: (o, st) => (st && st.on ? 2.6 : 0), greatlamp: (o, st) => (st && st.lit ? 4 : 0), fire: () => 3.8, brazier: () => 2.4, pyre: (o, st) => (st && st.lit ? 3.2 : 0), lamp: (o, st) => (st && st.lit ? 3.2 : 0), hull: (o, st) => (st && st.lit ? 3.0 : 0), crown: () => 1.6 };   // radius in tiles lit around an object
  return { CLUES, DUNGEONS, ART, LIGHT, TCOL, TYPES };
})();
