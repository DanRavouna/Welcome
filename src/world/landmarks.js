// ---- LAND: reusable landmarks (props) any map can use. Add a def here, then list it in a map's props (see PROPS in world.js) ----
// A def: { w, h, foot, draw(g, X, Y, P, k), text }
//   w, h   size in tiles
//   foot   rows of w chars: 'X' = solid tile, '.' = walkable (left as ground). Default: every tile solid.
//   draw   pixel art at 16 px per tile; (X, Y) is the top-left pixel; P = the map palette (P.g ground, P.gt grass shade, ...); k = 0..1 per-prop variation
//   text   optional lore line shown on a signpost placed next to the prop (override per use)
// Props never take part in M.places (no door, no name tag): they are scenery plus an optional signpost.
const LAND = (() => {
  const OL = '#2B2235';
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const shadow = (g, X, Y, w, h) => R(g, X + 2, Y + h - 3, w - 4, 3, 'rgba(0,0,0,0.2)');
  const moss = (g, P, x, y, w) => R(g, x, y, w, 2, P.gt || '#4E9A3E');
  const defs = {
    // a crumbled stone arch with rubble (any wild route or city outskirts)
    ruin: { w: 4, h: 3, text: 'Worn carvings on the old arch show critters of every type sharing one fire. Nobody remembers who built it.',
      draw(g, X, Y, P, k) {
        shadow(g, X, Y, 64, 48);
        R(g, X + 4, Y + 10, 12, 36, OL); R(g, X + 5, Y + 11, 10, 34, '#B7BFCF'); R(g, X + 5, Y + 11, 3, 34, '#DCE2EE'); R(g, X + 12, Y + 11, 3, 34, '#8E98AD');
        R(g, X + 48, Y + 20, 12, 26, OL); R(g, X + 49, Y + 21, 10, 24, '#B7BFCF'); R(g, X + 49, Y + 21, 3, 24, '#DCE2EE'); R(g, X + 56, Y + 21, 3, 24, '#8E98AD');
        R(g, X + 4, Y + 4, 30, 9, OL); R(g, X + 5, Y + 5, 28, 7, '#C9D0DE'); R(g, X + 5, Y + 5, 28, 2, '#E8EDF6'); R(g, X + 5, Y + 10, 28, 2, '#8E98AD'); // broken lintel
        R(g, X + 33, Y + 8, 4, 5, OL); R(g, X + 36, Y + 12, 4, 4, OL);
        for (let i = 0; i < 6; i++) { const rx = X + 20 + i * 5 + (i % 2) * 2, ry = Y + 38 + (i % 3) * 3; R(g, rx, ry, 6, 5, OL); R(g, rx + 1, ry + 1, 4, 3, i % 2 ? '#A8B2C6' : '#C9D0DE'); }
        moss(g, P, X + 5, Y + 24, 10); moss(g, P, X + 49, Y + 32, 10); moss(g, P, X + 8, Y + 5, 14);
        R(g, X + 8, Y + 30 + Math.round(k * 4), 2, 8, P.gt || '#4E9A3E'); // a hanging vine
      } },
    // a traveller's camp: tent and a low fire (stays lit forever)
    camp: { w: 3, h: 2, text: 'A traveller’s camp. The stew is still warm, but nobody is here. A note says: "Gone to look at the Peak."',
      draw(g, X, Y, P) {
        shadow(g, X, Y, 48, 32);
        const tent = ['.......oo.......', '......occo......', '.....occcco.....', '....occcccco....', '...occcccdcco...', '..occcccddcco...', '.occcccdddccco..', 'occccccdddcccco.', 'oooooooodddooooo'], col = { o: OL, c: '#D8574A', d: '#5A2420' };
        tent.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = col[row[x]]; if (c) R(g, X + 2 + x * 2, Y + 4 + y * 3, 2, 3, c); } });
        R(g, X + 2 + 16, Y + 4 + 6 * 3, 8, 12, '#2A1B14'); R(g, X + 2 + 18, Y + 4 + 6 * 3 + 2, 4, 10, '#0E0A10'); // door
        R(g, X + 34, Y + 22, 12, 4, OL); R(g, X + 35, Y + 23, 10, 2, '#7A4A2A'); R(g, X + 36, Y + 14, 8, 9, OL); R(g, X + 37, Y + 16, 6, 6, '#FF9A3A'); R(g, X + 38, Y + 18, 4, 4, '#FFD86B'); R(g, X + 39, Y + 12, 2, 4, '#FF9A3A'); // fire
      } },
    // a lighthouse on a rocky foot (coasts, harbors)
    lighthouse: { w: 2, h: 4, text: 'The lamp still turns every night. Ships once steered by it between the northern fort and the harbor.',
      draw(g, X, Y, P) {
        shadow(g, X, Y, 32, 64);
        R(g, X + 2, Y + 50, 28, 12, OL); R(g, X + 3, Y + 51, 26, 10, '#8E98AD'); R(g, X + 3, Y + 51, 26, 2, '#C9D0DE');
        R(g, X + 8, Y + 14, 16, 38, OL);
        for (let i = 0; i < 4; i++) { R(g, X + 9, Y + 15 + i * 9, 14, 9, i % 2 ? '#D8574A' : '#F4F6FA'); }
        R(g, X + 9, Y + 15, 3, 36, 'rgba(255,255,255,0.35)'); R(g, X + 20, Y + 15, 3, 36, 'rgba(0,0,0,0.18)');
        R(g, X + 6, Y + 10, 20, 5, OL); R(g, X + 7, Y + 11, 18, 3, '#4A5878');
        R(g, X + 9, Y + 2, 14, 9, OL); R(g, X + 10, Y + 3, 12, 7, '#FFE9A0'); R(g, X + 13, Y + 4, 6, 5, '#FFFFFF');
        R(g, X + 11, Y - 1, 10, 4, OL); R(g, X + 12, Y, 8, 2, '#D8574A');
        R(g, X + 13, Y + 34, 6, 8, OL); R(g, X + 14, Y + 35, 4, 6, '#1E2A4A');
      } },
    // a wrecked boat on the sand
    wreck: { w: 4, h: 2, text: 'A boat that never reached the forge town. Something lives in the hull now.',
      draw(g, X, Y, P) {
        shadow(g, X, Y, 64, 32);
        const hull = ['..........ooooooooooo.....', '.....oooooobbbbbbbbbbbo...', '..oooobbbbbbbbbbbbbbbbbbo.', '.obbbbbbbbbbbbbbddbbbbbbbo', 'obbbbbbbbbbbddbbbbbbbbbbo.', '.oobbbbbbbbbbbbbbbbbbboo..', '...ooooooooooooooooooo...'], col = { o: OL, b: '#8A5A32', d: '#5E3C22' };
        hull.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = col[row[x]]; if (c) R(g, X + 1 + x * 2, Y + 14 + y * 2, 2, 2, c); } });
        for (let i = 0; i < 5; i++) R(g, X + 12 + i * 8, Y + 17, 2, 10, 'rgba(0,0,0,0.25)');
        R(g, X + 30, Y + 2, 4, 20, OL); R(g, X + 31, Y + 3, 2, 18, '#B07A46'); R(g, X + 31, Y + 3, 12, 6, OL); R(g, X + 32, Y + 4, 10, 4, '#E8E2D0'); // mast and torn sail
        R(g, X + 8, Y + 8, 4, 8, OL); R(g, X + 9, Y + 9, 2, 6, '#B07A46');
      } },
    // an ancient beacon tower (3x5): stone shaft, a ring balcony and a dark lantern cage on top (a lit beam is drawn by the world when an object asks for it)
    beacon: { w: 3, h: 5, text: 'An ancient beacon tower. Its lantern has been dark for longer than anyone remembers.',
      draw(g, X, Y, P, k) {
        shadow(g, X, Y, 48, 80);
        R(g, X + 2, Y + 62, 44, 16, OL); R(g, X + 4, Y + 64, 40, 12, '#8E98AD'); R(g, X + 4, Y + 64, 40, 3, '#C9D0DE'); R(g, X + 4, Y + 74, 40, 2, '#5A6482');   // plinth
        R(g, X + 8, Y + 22, 32, 42, OL); R(g, X + 10, Y + 24, 28, 38, '#A8B2C6'); R(g, X + 10, Y + 24, 6, 38, '#DCE2EE'); R(g, X + 32, Y + 24, 6, 38, '#7E8AA2');   // shaft
        for (let i = 0; i < 4; i++) { R(g, X + 10, Y + 30 + i * 8, 28, 2, '#8E98AD'); }                                                                             // stone courses
        R(g, X + 20, Y + 38, 8, 12, OL); R(g, X + 22, Y + 40, 4, 8, '#2A3050'); R(g, X + 20, Y + 54, 8, 8, OL); R(g, X + 22, Y + 56, 4, 6, '#2A3050');                 // slits and the door
        R(g, X + 4, Y + 18, 40, 7, OL); R(g, X + 6, Y + 19, 36, 4, '#C9D0DE');                                                                                       // balcony
        R(g, X + 10, Y + 4, 28, 16, OL); R(g, X + 12, Y + 6, 24, 12, '#3A4468'); R(g, X + 14, Y + 8, 20, 8, '#5A6896'); R(g, X + 22, Y + 6, 3, 12, OL);               // lantern cage, dark glass
        R(g, X + 8, Y + 2, 32, 4, OL); R(g, X + 10, Y + 2, 28, 2, '#C9D0DE'); R(g, X + 20, Y - 4, 8, 6, OL); R(g, X + 22, Y - 2, 4, 4, '#8E98AD');                     // roof and finial
        moss(g, P, X + 10, Y + 24, 10);
      } },
    // a single stack of stones (1 tile): cheap trail marker
    cairn: { w: 1, h: 1,
      draw(g, X, Y) {
        shadow(g, X, Y, 16, 16);
        R(g, X + 2, Y + 9, 12, 5, OL); R(g, X + 3, Y + 10, 10, 3, '#A8B2C6'); R(g, X + 4, Y + 5, 8, 5, OL); R(g, X + 5, Y + 6, 6, 3, '#C9D0DE'); R(g, X + 6, Y + 2, 5, 4, OL); R(g, X + 7, Y + 3, 3, 2, '#DCE2EE');
      } },
    // a stone well with a little roof (villages, camps)
    well: { w: 2, h: 2, text: 'An old well. The water is cold and clear.',
      draw(g, X, Y) {
        shadow(g, X, Y, 32, 32);
        R(g, X + 2, Y + 14, 28, 16, OL); R(g, X + 3, Y + 15, 26, 14, '#A8B2C6'); R(g, X + 3, Y + 15, 26, 3, '#DCE2EE'); R(g, X + 7, Y + 18, 18, 7, '#2A6FB0'); R(g, X + 9, Y + 19, 6, 2, '#A8D8FF');
        R(g, X + 4, Y + 6, 3, 14, OL); R(g, X + 25, Y + 6, 3, 14, OL); R(g, X + 5, Y + 7, 1, 12, '#B07A46'); R(g, X + 26, Y + 7, 1, 12, '#B07A46');
        R(g, X + 2, Y + 2, 28, 6, OL); R(g, X + 3, Y + 3, 26, 4, '#C9604A'); R(g, X + 3, Y + 3, 26, 1, '#E8806A');
      } }
  };
  function foot(def) { const rows = []; for (let y = 0; y < def.h; y++) rows.push(def.foot ? def.foot[y] : 'X'.repeat(def.w)); return rows; }
  // draw one placed prop {id, x, y} onto a terrain canvas context (16 px per tile)
  function draw(g, p, P) { const d = defs[p.id]; if (d) d.draw(g, p.x * 16, p.y * 16, P || {}, ((p.x * 7 + p.y * 13) % 10) / 10); }
  return { defs, foot, draw };
})();
