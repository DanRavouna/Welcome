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
  // ---- the Sealed Arch: a round hall, eight statues around a fire, one empty seat (north), rubble blocking the way on ----
  function sealedArch() {
    const W = 26, H = 20, rows = [], objects = [];
    for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) { const dx = (x - 13) / 10.5, dy = (y - 9) / 7.5; r += dx * dx + dy * dy <= 1 ? '.' : 'C'; } rows.push(r.split('')); }
    const set = (x, y, c) => { if (y >= 0 && y < H && x >= 0 && x < W) rows[y][x] = c; };
    for (let y = 0; y <= 3; y++) { set(12, y, '.'); set(13, y, '.'); }                 // the alcove behind the empty seat
    for (let y = 16; y < H; y++) { set(12, y, '='); set(13, y, '='); }                 // the way in
    for (let y = 11; y <= 16; y++) { set(12, y, '='); set(13, y, '='); }
    for (let y = 5; y <= 11; y++) for (let x = 10; x <= 16; x++) if ((x - 13) * (x - 13) + (y - 8) * (y - 8) <= 7) set(x, y, '=');    // flagstones around the fire
    objects.push({ id: 'fire', kind: 'fire', x: 13, y: 8, text: 'The fire burns without fuel or smoke. Eight stone shadows lean toward it.' });
    for (let i = 0; i < 9; i++) {
      const a = (-90 + i * 40) * Math.PI / 180, x = Math.round(13 + 3.5 * Math.cos(a)), y = Math.round(8 + 3.5 * Math.sin(a));
      if (i === 0) objects.push({ id: 'seat', kind: 'seat', x: x, y: y, text: 'The ninth seat is empty. Dust lies thick on the stone, and a small crown is carved above it.' });
      else { const t = TYPES[i - 1]; objects.push({ id: 'statue-' + t, kind: 'statue', type: t, x: x, y: y, text: STATUE_TEXT[t] }); }
    }
    objects.push({ id: 'chest1', kind: 'chest', x: 5, y: 10, reward: { potion: 2, essence: 5 }, text: 'A dusty chest.' });
    objects.push({ id: 'br1', kind: 'brazier', x: 10, y: 14, text: 'A brazier. Somebody keeps it lit.' }, { id: 'br2', kind: 'brazier', x: 16, y: 14, text: 'A brazier. Somebody keeps it lit.' });
    objects.push({ id: 'rb1', kind: 'rubble', x: 12, y: 3, text: 'Rubble blocks the passage north. Something heavy fell here long ago.' }, { id: 'rb2', kind: 'rubble', x: 13, y: 3, text: 'Rubble blocks the passage north. Something heavy fell here long ago.' });
    objects.forEach((o) => set(o.x, o.y, rows[o.y][o.x] === '=' ? '=' : '.'));
    return { name: 'The Sealed Arch', W: W, H: H, rows: rows.map((r) => r.join('')), objects: objects, spawn: [12.9, H - 1.4], exit: { edge: 's', a: 12, b: 13 }, dark: { r: 3.4 } };
  }
  const DUNGEONS = { 'dg-arch': sealedArch };
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
    plaque(g, x, y, st, t) {   // the arch's rune stone: one gold rune per clue found
      R(g, x + 6, y + 28, 20, 3, 'rgba(0,0,0,0.25)');
      R(g, x + 6, y + 6, 20, 24, OL); R(g, x + 8, y + 8, 16, 20, '#6A6880'); R(g, x + 8, y + 8, 16, 2, '#9A98B0');
      const n = st.glow | 0, k = 0.6 + 0.4 * Math.sin(t * 3);
      for (let i = 0; i < 4; i++) { const on = i < n; g.save(); g.globalAlpha = on ? (st.open ? 1 : 0.6 + 0.4 * k) : 1; R(g, x + 12, y + 11 + i * 4, 8, 2, on ? '#FFD86B' : '#4A4860'); g.restore(); }
    }
  };
  const LIGHT = { fire: () => 3.8, brazier: () => 2.4 };   // radius in tiles lit around an object
  return { CLUES, DUNGEONS, ART, LIGHT, TCOL, TYPES };
})();
