// ---- PXW: pixel-art tiles, buildings and the player sprite (drawn at 16px per tile, shown at 2x) ----
const PXW = (() => {
  const L = 16;
  const PAL = {
    town: { arch: 'cottage',  g: '#74C25C', gd: '#8FD873', gt: '#4E9A3E', p: '#E8D09A', ps: '#D4B57A', pe: '#B8945C', w: '#5AA8F0', wl: '#A8D8FF', we: '#3C7FC8', t: '#3E9A3E', tb: '#2C7A2E', th: '#7CD25C', tree: 'round', ol: '#23402A', fl: ['#F06A6A', '#FFFFFF', '#F5A3D0'] },
    frost: { g: '#E4EEF8', gd: '#FFFFFF', gt: '#B9CCE0', p: '#B4C9E0', ps: '#A0B8D2', pe: '#7F9BBA', w: '#BFE3F5', wl: '#FFFFFF', we: '#8DBBD8', t: '#8FC3D6', tb: '#5E97AE', th: '#C8E8F2', tree: 'pine', ol: '#2E4A66', fl: ['#FFFFFF', '#BBD5FF'] },
    ember: { g: '#D9A066', gd: '#E8B27A', gt: '#B57A44', p: '#B9824C', ps: '#A67040', pe: '#7E5230', w: '#FF6A2B', wl: '#FFC24D', we: '#B83A10', t: '#C9A23A', tb: '#8E6B1E', th: '#E8C65A', tree: 'dead', ol: '#4A2A14', fl: ['#FFD86B', '#FF8A3D'] },
    moss: { g: '#4FA040', gd: '#63B852', gt: '#357F2E', p: '#B99B6A', ps: '#A4865A', pe: '#7E6440', w: '#3F8FC8', wl: '#8CC8F0', we: '#2A6A9A', t: '#2E7D33', tb: '#1D5A24', th: '#4FA040', tree: 'round', ol: '#163A1A', fl: ['#F5A3D0', '#FFFFFF', '#C9A8FF'] },
    peak: { g: '#8DB07A', gd: '#A3C48E', gt: '#6E8E5E', p: '#C9C3D6', ps: '#B3ACC4', pe: '#8E87A2', w: '#6FB6E8', wl: '#C8E8FF', we: '#4A8EC0', t: '#6E8E5E', tb: '#4E6E40', th: '#A3C48E', tree: 'pine', ol: '#2E3A4A', fl: ['#FFFFFF', '#C9A8FF', '#FFD86B'] },
    frosthold: { arch: 'longhouse',  g: '#E4EEF8', gd: '#FFFFFF', gt: '#B9CCE0', p: '#9AA3B5', ps: '#868FA2', pe: '#6A7286', w: '#BFE3F5', wl: '#FFFFFF', we: '#8DBBD8', t: '#8FC3D6', tb: '#5E97AE', th: '#C8E8F2', tree: 'pine', ol: '#2E4A66', fl: ['#FFFFFF', '#BBD5FF'] },
    cinderport: { arch: 'forge',  g: '#C9925C', gd: '#D9A670', gt: '#A87444', p: '#7A6A62', ps: '#6A5A52', pe: '#4E4038', w: '#FF6A2B', wl: '#FFC24D', we: '#B83A10', t: '#B9963A', tb: '#8E6B1E', th: '#D8B55A', tree: 'dead', ol: '#3A2210', fl: ['#FFD86B', '#FF8A3D'] },
    coralbay: { arch: 'shell',  g: '#F2DFA8', gd: '#FAECC4', gt: '#D9C38A', p: '#C9A070', ps: '#B08858', pe: '#8A6A44', w: '#3C95DC', wl: '#A8D8FF', we: '#2A6FB0', t: '#B9C46A', tb: '#7E8A32', th: '#D8E08A', tree: 'palm', ol: '#5A4A20', fl: ['#FFFFFF', '#F5A3D0'] },
    mossbrook: { arch: 'grove',  g: '#5FA34A', gd: '#74B85C', gt: '#44803A', p: '#C9A878', ps: '#B39064', pe: '#8A6A44', w: '#4F9AD0', wl: '#9CD0F2', we: '#2F70A0', t: '#3E8A3A', tb: '#2A6A2C', th: '#74B85C', tree: 'round', ol: '#1E3A1E', fl: ['#F5A3D0', '#FFFFFF', '#FFD86B', '#C9A8FF'] },
    tide: { g: '#F2DFA8', gd: '#FAECC4', gt: '#D9C38A', p: '#E2C98E', ps: '#CDB27A', pe: '#B09060', w: '#3C95DC', wl: '#A8D8FF', we: '#2A6FB0', t: '#B9C46A', tb: '#7E8A32', th: '#D8E08A', tree: 'palm', ol: '#5A4A20', fl: ['#FFFFFF', '#F5A3D0'] }
  };
  PAL['gym-wren'] = { g: '#6E9A4A', gd: '#82B05C', gt: '#4E7E3A', p: '#C9AE7E', ps: '#B39464', pe: '#8A6A44', w: '#3F8FC8', wl: '#8CC8F0', we: '#2A6A9A', t: '#2E7D33', tb: '#1D5A24', th: '#4FA040', tree: 'round', ol: '#163A1A', fl: ['#F5A3D0', '#FFFFFF'], cw: '#5A3E26', cwl: '#7A5A38', cwd: '#3E2A18' };
  PAL['dg-arch'] = { g: '#262B40', gd: '#2F3550', gt: '#1C2033', p: '#515A7C', ps: '#626C90', pe: '#383E5A', w: '#1E3A5F', wl: '#3A6A9A', we: '#122A48', t: '#2E4A4A', tb: '#1E3434', th: '#3E6A5A', tree: 'dead', ol: '#0A0C18', fl: ['#7AA0FF'], cw: '#171A2A', cwl: '#3A4160', cwd: '#0C0E1A' };
  PAL.ascent = { g: '#E8F0F8', gd: '#FFFFFF', gt: '#B9CCE0', p: '#A8B8D0', ps: '#98A8C2', pe: '#7888A4', w: '#7FB8E0', wl: '#D8EEFF', we: '#4A88B8', t: '#9CC9D9', tb: '#5E97AE', th: '#C8E8F2', tree: 'pine', ol: '#2E3A4A', fl: ['#FFFFFF', '#BBD5FF'], cw: '#6E7A96', cwl: '#C4D0E6', cwd: '#3E4864' };
  PAL['dg-lamp'] = { g: '#C9BFA8', gd: '#D8CFB8', gt: '#B5AA92', p: '#E4DAC2', ps: '#D2C8AE', pe: '#A89E86', w: '#7FB8E0', wl: '#D8EEFF', we: '#4A88B8', t: '#9CB89A', tb: '#6A8A68', th: '#C8E0C4', tree: 'pine', ol: '#2E2A3A', fl: ['#FFFFFF'], cw: '#7C7488', cwl: '#B8B0C8', cwd: '#4C4660' };
  PAL.descent = { g: '#8A6A58', gd: '#A08068', gt: '#6A4A38', p: '#B08A70', ps: '#9A7860', pe: '#6A4A38', w: '#FF6A2B', wl: '#FFC24D', we: '#B83A10', t: '#C7A23A', tb: '#8E6B1E', th: '#E8C860', tree: 'dead', ol: '#2A1810', fl: ['#FFD86B', '#FF8A3D'], cw: '#3A2A2A', cwl: '#7A5A4A', cwd: '#1A1010' };
  PAL['gym-glacia'] = Object.assign({}, PAL.frost, { g: '#DCEFF8', gd: '#EEF7FC', gt: '#B9CCE0', w: '#1E3A5F', wl: '#3A6A9A', we: '#122A48', cw: '#3A4A66', cwl: '#5E7898', cwd: '#20283A' });
  PAL['gym-blaze'] = Object.assign({}, PAL.descent, { g: '#6A4A3A', gd: '#7A5A48', gt: '#4A3028', cw: '#3A2218', cwl: '#5A3A2A', cwd: '#1A0E0A' });
  PAL['gym-coral'] = Object.assign({}, PAL['dg-arch'], { g: '#2A3A4A', gd: '#34465A', gt: '#1E2C3A', cw: '#1A2432', cwl: '#34485E', cwd: '#0C121A' });
  PAL['dg-forge'] = { g: '#4A3A38', gd: '#5A4A46', gt: '#3A2A28', p: '#8A6A5A', ps: '#7A5A4A', pe: '#5A3A2A', w: '#FF6A2B', wl: '#FFC24D', we: '#B83A10', t: '#6A4A38', tb: '#3A2A20', th: '#8A6A50', tree: 'dead', ol: '#1A0E0A', fl: ['#FF8A3D'], cw: '#2A1A1A', cwl: '#6A4A3A', cwd: '#120808' };
  PAL['route-mf'] = Object.assign({}, PAL.peak, { g: '#97B07E', gd: '#ABC492' }); PAL['route-fc'] = Object.assign({}, PAL.frost, { w: '#3C95DC', wl: '#A8D8FF', we: '#2A6FB0' }); PAL['route-cc'] = Object.assign({}, PAL.tide, { p: '#B08858', ps: '#9A7448', tree: 'palm' });
  PAL['route-cm'] = { g: '#8C9A5E', gd: '#A0AE70', gt: '#6E7A44', p: '#A08A6A', ps: '#8E7858', pe: '#6A5A40', w: '#4F9AD0', wl: '#9CD0F2', we: '#2F70A0', t: '#7E8A3A', tb: '#5E6A22', th: '#A0AE70', tree: 'dead', ol: '#2E2A1A', fl: ['#FF8A3D', '#FFD86B'] };
  function stamp(g, x0, y0, rows, colors) {
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) { const ch = rows[y][x]; const col = colors[ch]; if (col) { g.fillStyle = col; g.fillRect(x0 + x, y0 + y, 1, 1); } }
  }
  const TREE = {
    round: ['.....oooooo.....', '...oollllggoo...', '..ollllggggggo..', '.ollllgggggggdo.', '.olllgggggggggo.', 'ollggggggggggddo', 'olggggggggggdddo', 'ogggggggggggdddo', 'ogggggggggdddddo', '.oggggggdddddddo', '.oggdddddddddddo', '..odddddddddddo.', '...oooddddooo...', '......otto......', '......otTo......', '.....otttTo.....', '.....ooooooo....'],
    pine: ['.......oo.......', '......owwo......', '.....owwwwo.....', '.....ogwwgo.....', '....oggggggo....', '...owwwgggwwo...', '...ogggggggdo...', '..oggggggggddo..', '..owwwggggwwwo..', '.ogggggggggddo..', '.ogggggggggdddo.', 'oggggggggggddddo', 'oooooooddoooooo.', '......otTo......', '......otTo......', '.....ooooo......'],
    dead: ['................', '..o.........o...', '..to.......ot...', '...to..o..ot....', '....to.t.ot.....', '.....tottt......', '......tTt.......', '......tTt..o....', '..o...tTt.ot....', '...to.tTtot.....', '....tttTtt......', '......tTt.......', '......tTt.......', '......tTt.......', '.....otTTo......', '....oooooo......'],
    palm: ['..oo......oo....', '.ollo....ollo...', 'ollllo..ollllo..', '.ogglloollggo...', '..oggllllggo....', '.ollllggllllo...', 'olggo.tt.oggo...', 'ogo...tT...oo...', '.o....tT........', '......tT........', '.......tT.......', '.......tT.......', '.......tT.......', '......otTo......', '.....oooooo.....']
  };
  function treeColors(kind, P) {
    if (kind === 'pine') return { o: P.ol, g: '#2E6B4E', d: '#1F4F38', w: '#FFFFFF', t: '#6B4A2E', T: '#4A321E' };
    if (kind === 'dead') return { o: '#2A1A10', t: '#5A3E28', T: '#3E2A1A' };
    if (kind === 'palm') return { o: '#1E4A26', l: '#6CC86A', g: '#3E9A44', t: '#9A6E40', T: '#6E4C2A' };
    return { o: P.ol, l: '#7CD072', g: '#43A54C', d: '#2C7F3C', t: '#8A5A34', T: '#5E3C22' };
  }
  const ROCK = ['....oooooo......', '..oollllggoo....', '.ollllgggggdo...', 'olllggggggggdo..', 'ollggggggggddo..', 'ogggggggggdddo..', '.ogggggggddddo..', '..oodddddddoo...', '....oooooooo....'];
  const TUFT = ['..h...h.', '.hb..hb.', '.bb..bb.', 'hbd.hbd.', 'bdd.bdd.', 'bdd.bdd.'];
  const FLOWER = ['.a.a', 'acca', '.a.a', '..l.'];
  const r2 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // house interiors: plank floor, papered walls with windows, rugs and furniture (one sprite per tile)
  function interior(M) {
    const W = M.W, H = M.H, grid = M.grid, S = M.style, c = document.createElement('canvas'); c.width = W * L; c.height = H * L;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 'w' : grid[y][x]);
    const rug = (x, y) => !!M.rug && x >= M.rug[0] && x <= M.rug[2] && y >= M.rug[1] && y <= M.rug[3];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = grid[y][x], X = x * L, Y = y * L;
      if (t === 'w') {
        const mat = S.mat || 'timber';
        if (y <= 1) {   // the back wall, in the region's material (Meaning: the same architecture inside as out)
          R(X, Y, L, L, S.wall);
          if (mat === 'log') { for (let yy = 0; yy < L; yy += 5) { R(X, Y + yy, L, 5, '#A87A48'); R(X, Y + yy, L, 1, '#C9986A'); R(X, Y + yy + 4, L, 1, '#7A5230'); } if (x % 3 === 0) R(X + 2, Y + 2, 3, 2, '#6E4A2E'); }
          else if (mat === 'stone') { for (let yy = 0; yy < L; yy += 4) for (let xx = ((yy / 4) % 2) * 4; xx < L; xx += 8) { R(X + xx, Y + yy, 7, 3, '#8E98AD'); R(X + xx, Y + yy, 7, 1, '#B7BFCF'); } R(X, Y, L, L, 'rgba(60,70,90,0.12)'); }
          else if (mat === 'brick') { for (let yy = 0; yy < L; yy += 4) { R(X, Y + yy, L, 1, '#4E2218'); for (let xx = ((yy / 4) % 2) * 5; xx < L; xx += 10) R(X + xx, Y + yy + 1, 1, 3, '#4E2218'); } if ((x + y) % 4 === 0) R(X + 6, Y + 5, 4, 3, '#9A5A48'); }
          else if (mat === 'shell') { R(X, Y, L, L, '#F4F0E6'); R(X, Y + (y ? 12 : 0), L, y ? 4 : 2, '#3C95DC'); if (y === 1 && x % 4 === 2) { R(X + 5, Y + 2, 6, 6, '#F5A3D0'); R(X + 7, Y + 4, 2, 2, '#E07AB0'); } }
          else { R(X, Y + (y ? 12 : 0), L, y ? 4 : 2, shade(S.wall, -0.18)); for (let i = 3; i < L; i += 5) R(X + i, Y + 2, 1, y ? 10 : 14, shade(S.wall, -0.06)); }
          if (y === 1 && x % 4 === 1 && x > 0 && x < W - 1) { R(X + 3, Y + 1, 10, 10, '#2B2235'); R(X + 4, Y + 2, 8, 8, mat === 'shell' ? '#3C95DC' : '#9CD3F5'); R(X + 7, Y + 2, 1, 8, '#FFFFFF'); R(X + 4, Y + 5, 8, 1, '#FFFFFF'); if (mat === 'shell') { R(X + 3, Y + 1, 1, 1, '#F4F0E6'); R(X + 12, Y + 1, 1, 1, '#F4F0E6'); R(X + 3, Y + 10, 1, 1, '#F4F0E6'); R(X + 12, Y + 10, 1, 1, '#F4F0E6'); } }   // a window
        }
        else { R(X, Y, L, L, shade(S.wall, -0.35)); R(X + (x === 0 ? L - 3 : 0), Y, 3, L, shade(S.wall, -0.5)); if (y === H - 1) R(X, Y, L, 3, shade(S.wall, -0.5)); }
        continue;
      }
      R(X, Y, L, L, S.floor); R(X, Y + 7, L, 1, shade(S.floor, -0.18)); R(X, Y + 15, L, 1, shade(S.floor, -0.18)); R(X + ((x + y) % 2 ? 4 : 11), Y, 1, 7, shade(S.floor, -0.12)); R(X + ((x + y) % 2 ? 9 : 2), Y + 8, 1, 7, shade(S.floor, -0.12));
      if (T(x, y - 1) === 'w') R(X, Y, L, 3, 'rgba(0,0,0,0.18)');
      if (rug(x, y)) { R(X, Y, L, L, S.rug); R(X, Y + 2, L, 1, shade(S.rug, 0.25)); R(X, Y + 13, L, 1, shade(S.rug, 0.25)); if (!rug(x - 1, y)) R(X, Y, 2, L, shade(S.rug, -0.3)); if (!rug(x + 1, y)) R(X + 14, Y, 2, L, shade(S.rug, -0.3)); if (!rug(x, y - 1)) R(X, Y, L, 2, shade(S.rug, -0.3)); if (!rug(x, y + 1)) R(X, Y + 14, L, 2, shade(S.rug, -0.3)); }
      if (t === 'd') { R(X + 1, Y + 4, 14, 10, '#8A5A34'); R(X + 2, Y + 5, 12, 8, '#B07A46'); }
      const ol = '#2A1E14';
      if (t === 'x') { R(X, Y - 6, L, 21, ol); R(X + 1, Y - 5, 14, 19, '#3E3A5A'); for (let i = 0; i < 4; i++) { R(X + 2, Y + 10 - i * 4, 12 - i * 2, 3, '#8F8BB4'); R(X + 2, Y + 10 - i * 4, 12 - i * 2, 1, '#B9B5D8'); } R(X + 6, Y - 4, 4, 5, '#1E1A2A'); }   // the stair up
      if (t === 'n') { R(X + 6, Y - 4, 4, 18, ol); R(X + 7, Y - 3, 2, 16, '#5E3C22'); R(X + 3, Y - 6, 10, 3, ol); R(X + 4, Y - 5, 8, 1, '#8A5A34'); R(X + 5, Y - 2, 6, 7, ol); R(X + 6, Y - 1, 4, 5, '#D9A03A'); R(X + 7, Y + 4, 2, 2, '#8A6A2A'); }   // the arena bell on its post
      if (t === 'b') { R(X, Y - 2, L, 17, ol); R(X + 1, Y - 1, 14, 15, '#E8E8F0'); R(X + 1, Y + 5, 14, 9, S.bed); R(X + 1, Y + 5, 14, 1, shade(S.bed, 0.3)); R(X + 3, Y + 1, 10, 3, '#FFFFFF'); }
      if (t === 's') { R(X, Y - 6, L, 21, ol); R(X + 1, Y - 5, 14, 19, '#8A5A34'); [[-4, '#D8574A'], [2, '#3E8EF7'], [8, '#4FB06D']].forEach(([dy, col], i) => { R(X + 1, Y + dy + 4, 14, 1, '#5E3C22'); for (let k = 0; k < 4; k++) R(X + 2 + k * 3, Y + dy, 2, 4, k % 2 ? col : shade(col, 0.3)); }); }
      if (t === 't') { R(X + 1, Y + 3, 14, 9, ol); R(X + 2, Y + 4, 12, 6, '#B07A46'); R(X + 2, Y + 4, 12, 1, '#D9A066'); R(X + 3, Y + 11, 2, 4, ol); R(X + 11, Y + 11, 2, 4, ol); R(X + 6, Y + 2, 4, 3, '#FFFFFF'); }
      if (t === 'p') { R(X + 4, Y + 9, 8, 6, ol); R(X + 5, Y + 10, 6, 5, '#C0503A'); R(X + 3, Y + 1, 10, 9, '#2E6A2C'); R(X + 4, Y + 2, 8, 6, '#4FB06D'); R(X + 6, Y + 3, 2, 2, '#8FE0A0'); }
      if (t === 'k') { R(X, Y - 1, L, 16, ol); R(X + 1, Y, 14, 14, '#9AA3B5'); R(X + 1, Y, 14, 3, '#C9D3E6'); R(X + 3, Y + 5, 10, 7, '#3A3A46'); R(X + 5, Y + 7, 6, 3, '#FF8A3D'); }
      if (t === 'm') { R(X, Y - 3, L, 18, ol); R(X + 1, Y - 2, 14, 16, '#9AA3B5'); R(X + 1, Y + 9, 14, 5, '#7A8296'); R(X + 3, Y, 10, 8, '#1E2A4A'); R(X + 4, Y + 1, 8, 6, '#6EE7F5'); R(X + 5, Y + 2, 4, 1, '#FFFFFF'); R(X + 5, Y + 4, 6, 1, '#B8F5FF'); R(X + 11, Y + 11, 2, 2, '#A7F04A'); }
      if (t === 'h') { R(X + 1, Y + 4, 14, 11, ol); R(X + 2, Y + 5, 12, 9, '#8A5A34'); R(X + 2, Y + 8, 12, 1, '#5E3C22'); R(X + 7, Y + 7, 2, 3, '#FFD86B'); }
    }
    return c;
  }
  // ---- wind: trees, tall grass, flowers and water are NOT painted into the still terrain image; terrain() records them (with the same seeded positions as before) and bake() paints them into transparent overlay frames, six poses of a sway cycle, each tile out of phase with its neighbours ----
  const SIN6 = [0, 0.87, 0.87, 0, -0.87, -0.87];
  const hashT = (x, y) => { let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // the phase is a smooth function of where a thing stands, with no noise: one wave of wind rolls from west to east across the land (a wavelength of about 12 tiles, tilted a little), so each tree is only a small step behind the one to its west. px, py are pixel positions on the 16-px-per-tile picture.
  const phaseAt = (px, py, odd) => { let ph = Math.round(-(px / 16 * 0.5 + py / 16 * 0.12)); if (odd) { const h = hashT(px, py); if (h < odd) ph += hashT(py, px) < 0.5 ? -1 : 1; } return ((ph % 6) + 6) % 6; };   // odd: the share of things that break from the wave by one pose, so it is not too perfect
  const gainAt = (px, py, lo, hi) => lo + (hi - lo) * hashT(px + 91, py + 47);   // each tree its own stiffness
  // Only the outer bits of a sprite move (Dan: "only the bits outside of the tree should move, not the whole line"). Every horizontal run of pixels keeps its core; just its two ends flutter by at most ONE pixel, growing or shrinking (the end pixel is copied outward or pulled in), and only in the upper ~60% of the sprite, so trunks, stems and the middle of a crown never move. Most of the cycle is rest: V6 is [0, 0, 1, 0, 0, -1], so a thing moves in two of its six poses and a gust shows as a band passing. Class 1 (breeze) moves about half the rows, class 2 (strong) most of them; a stiff tree (small gain) fewer.
  const V6 = [0, 0, 1, 0, 0, -1];
  function swayStamp(g, x0, y0, rows, colors, k, A, gain) {
    const n = rows.length, lim = Math.ceil(n * 0.62);
    for (let y = 0; y < n; y++) {
      const row = rows[y], movable = A > 0 && y < lim && hashT(x0 * 3 + y, y0 + y * 5) < (A >= 2 ? 0.9 : 0.5) * Math.min(1.2, gain);
      const lag = y >> 1, dl0 = movable ? V6[(((k - lag) % 6) + 6) % 6] : 0, dr0 = movable ? V6[(((k - lag + 1) % 6) + 6) % 6] : 0;
      let x = 0;
      while (x < row.length) {
        if (!colors[row[x]]) { x++; continue; }
        let e = x; while (e + 1 < row.length && colors[row[e + 1]]) e++;
        const put = (xx, ch) => { g.fillStyle = colors[ch]; g.fillRect(x0 + xx, y0 + y, 1, 1); };
        const trunk = e > x && /^[tT]+$/.test(row.slice(x, e + 1));   // trunks never move, even in the upper rows
        if (e === x) { put(x + dl0, row[x]); }   // a lone pixel (a twig, a flower head) shifts as a whole
        else {
          let dl = trunk ? 0 : dl0, dr = trunk ? 0 : dr0; if (x + dl > e + dr) { dl = 0; dr = 0; }
          for (let xi = x; xi <= e; xi++) { if (xi < x + dl && dl > 0) continue; if (xi > e + dr && dr < 0) continue; let ch = row[xi]; if (xi === x && dl < 0) ch = row[x + 1]; if (xi === e && dr > 0) ch = row[e - 1]; if (xi === x + dl && dl > 0) ch = row[x]; if (xi === e + dr && dr < 0) ch = row[e]; put(xi, ch); }
          if (dl < 0) put(x - 1, row[x]); if (dr > 0) put(e + 1, row[e]);
        }
        x = e + 1;
      }
    }
  }
  function bake(base, k, A) {
    const an = base.anim; if (!an) return null; const set = an.sets[A] || (an.sets[A] = []); if (set[k]) return set[k];
    const cv = document.createElement('canvas'); cv.width = base.width; cv.height = base.height; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(base, 0, 0); const P = an.P;   // each frame is the whole picture (one blit per frame at draw time, as before), not a transparent overlay (two blits cost 25 ms a frame on a throttled phone)
    an.items.forEach((it) => {
      const kk = A ? (k + it.ph) % 6 : 0;
      if (it.k === 'tree') swayStamp(g, it.X, it.Y, it.rows, it.colors, kk, A, it.gain || 1);
      else if (it.k === 'tuft') swayStamp(g, it.X, it.Y, TUFT, it.cl, kk, A, 0.8 * (it.gain || 1));
      else if (it.k === 'flower') swayStamp(g, it.X, it.Y, FLOWER, it.cl, kk, A, 0.7 * (it.gain || 1));
      else if (it.k === 'wave') { const dx = A ? Math.round(SIN6[kk] * 0.9) : 0; g.fillStyle = P.wl; g.fillRect(it.X + it.wx + dx, it.Y + it.wy, 4, 1); g.fillRect(it.X + it.wx + 1 + dx, it.Y + it.wy - 1, 2, 1); if (A && kk % 3 === 0) g.fillRect(it.X + ((it.wx + 7 + kk) % 13), it.Y + ((it.wy + 5) % 14) + 1, 1, 1); }
      else if (it.k === 'sparkle') { if (A && kk % 3 === 0) { g.fillStyle = '#FFFFFF'; g.fillRect(it.X + it.dx, it.Y + it.dy, 2, 2); g.fillRect(it.X + it.dx - 1, it.Y + it.dy, 4, 1); } }
    });
    set[k] = cv; return cv;
  }
  const baked = (base, A) => { const set = base.anim && base.anim.sets[A]; return set ? set.filter(Boolean) : []; };
  // one missing frame at a time, no more often than every 120 ms, so a map loads at once and the other poses arrive as it runs
  function fill(base, A, now) { const an = base.anim; if (!an || !A || now - (an.last || 0) < 120) return; const set = an.sets[A] || []; for (let k = 0; k < 6; k++) if (!set[k]) { bake(base, k, A); an.last = now; return; } }
  function terrain(M, themeId) {
    if (M.interior) return interior(M);
    const P = PAL[themeId] || PAL.town, W = M.W, H = M.H, grid = M.grid;
    const c = document.createElement('canvas'); c.width = W * L; c.height = H * L;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const r = r2(1234 + W * H), anim = [];
    const T = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 'T' : grid[y][x]);
    const isPath = (t) => t === '=';
    // ground everywhere first (trees/rocks/signs sit on grass)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x * L, Y = y * L, t = grid[y][x];
      if (t === '=') {
        g.fillStyle = P.p; g.fillRect(X, Y, L, L);
        g.fillStyle = P.ps; for (let i = 0; i < 5; i++) g.fillRect(X + Math.floor(r() * 15), Y + Math.floor(r() * 15), 1, 1);
        g.fillStyle = P.pe;
        if (!isPath(T(x, y - 1)) && T(x, y - 1) !== 'X') g.fillRect(X, Y, L, 1);
        if (!isPath(T(x, y + 1)) && T(x, y + 1) !== 'X') g.fillRect(X, Y + L - 1, L, 1);
        if (!isPath(T(x - 1, y)) && T(x - 1, y) !== 'X') g.fillRect(X, Y, 1, L);
        if (!isPath(T(x + 1, y)) && T(x + 1, y) !== 'X') g.fillRect(X + L - 1, Y, 1, L);
        continue;
      }
      if (t === '~') {
        g.fillStyle = P.w; g.fillRect(X, Y, L, L);
        const wy = 4 + Math.floor(r() * 8), wx = Math.floor(r() * 8); anim.push({ k: 'wave', X: X, Y: Y, wx: wx, wy: wy, ph: phaseAt(X, Y) });
        if (T(x, y - 1) !== '~') { g.fillStyle = P.wl; g.fillRect(X, Y, L, 2); }
        if (T(x, y + 1) !== '~') { g.fillStyle = P.we; g.fillRect(X, Y + L - 2, L, 2); }
        continue;
      }
      g.fillStyle = P.g; g.fillRect(X, Y, L, L);
      g.fillStyle = P.gd; for (let yy = 1; yy < L; yy += 4) for (let xx = ((yy >> 2) % 2) * 2 + 1; xx < L; xx += 4) g.fillRect(X + xx, Y + yy, 1, 1);
      if (r() < 0.25) stamp(g, X + 3 + Math.floor(r() * 6), Y + 5 + Math.floor(r() * 6), ['g.g', '.g.'], { g: P.gt });
      if (t === ',') { const cols = P.fl; for (let i = 0; i < 2; i++) { const fx = X + 2 + i * 7 + Math.floor(r() * 2), fy = Y + 3 + Math.floor(r() * 8); anim.push({ k: 'flower', X: fx, Y: fy, cl: { a: cols[Math.floor(r() * cols.length)], c: '#FFE08A', l: P.gt }, ph: phaseAt(fx, fy, 0.12), gain: gainAt(fx, fy, 0.85, 1.1) }); } }
      if (t === 'W' || t === 'Z') {
        g.fillStyle = t === 'Z' ? P.th : P.t; g.fillRect(X, Y, L, L);
        const cl = t === 'Z' ? { h: '#FFF7D6', b: P.t, d: P.tb } : { h: P.th, b: P.t, d: P.tb };
        [[0, 2], [8, 2], [4, 9], [12, 9]].forEach((q, qi) => anim.push({ k: 'tuft', X: X + q[0], Y: Y + q[1], cl: cl, ph: phaseAt(X + q[0], Y + q[1], 0.12), gain: gainAt(X + q[0], Y + q[1], 0.85, 1.1) }));
        if (t === 'Z') anim.push({ k: 'sparkle', X: X, Y: Y, dx: 2 + (hashT(x, y) * 10 | 0), dy: 2 + (hashT(y, x) * 10 | 0), ph: (hashT(x + 7, y + 3) * 6 | 0) });
      }
    }
    // cave walls (dungeons): dark rock with a lit front face wherever the floor shows below
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === 'C') {
      const X = x * L, Y = y * L; g.fillStyle = P.cw; g.fillRect(X, Y, L, L);
      g.fillStyle = P.cwl; for (let i = 0; i < 3; i++) g.fillRect(X + Math.floor(r() * 14), Y + Math.floor(r() * 10), 2, 1);
      if (T(x, y + 1) !== 'C') { g.fillStyle = P.cwl; g.fillRect(X, Y + L - 6, L, 4); g.fillStyle = P.cwd; g.fillRect(X, Y + L - 2, L, 2); }
      if (T(x, y - 1) !== 'C') { g.fillStyle = P.cwl; g.fillRect(X, Y, L, 2); }
    }
    // fences
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === 'F') {
      const X = x * L, Y = y * L; g.fillStyle = '#5E3C22'; g.fillRect(X + 2, Y + 4, 3, 11); g.fillRect(X + 11, Y + 4, 3, 11); g.fillStyle = '#B07A46'; g.fillRect(X, Y + 6, L, 2); g.fillRect(X, Y + 10, L, 2); g.fillStyle = '#C8955A'; g.fillRect(X + 3, Y + 4, 1, 10); g.fillRect(X + 12, Y + 4, 1, 10);
    }
    M.places.forEach((p) => place(g, p, P));
    (M.props || []).forEach((p) => LAND.draw(g, p, P)); // reusable landmarks (landmarks.js)
    if (M.id === 'town') { // fountain
      const fx = 21 * L, fy = 19 * L;
      g.fillStyle = '#4A5878'; g.fillRect(fx + 1, fy, 30, 32); g.fillRect(fx, fy + 1, 32, 30);
      g.fillStyle = '#B7C2D6'; g.fillRect(fx + 2, fy + 1, 28, 30); g.fillRect(fx + 1, fy + 2, 30, 28);
      g.fillStyle = '#5AA8F0'; g.fillRect(fx + 5, fy + 5, 22, 22); g.fillStyle = '#A8D8FF'; g.fillRect(fx + 7, fy + 7, 6, 1); g.fillRect(fx + 18, fy + 20, 5, 1);
      g.fillStyle = '#B7C2D6'; g.fillRect(fx + 13, fy + 13, 6, 6); g.fillStyle = '#4A5878'; g.fillRect(fx + 13, fy + 18, 6, 1);
      anim.push({ k: 'sparkle', X: fx + 6, Y: fy + 6, dx: 0, dy: 0, ph: 0 }, { k: 'sparkle', X: fx + 17, Y: fy + 18, dx: 0, dy: 0, ph: 3 });
    }
    M.signs.forEach((s) => { const X = s.x * L, Y = s.y * L; stamp(g, X + 1, Y + 2, ['oooooooooooooo', 'owwwwwwwwwwwwo', 'owkkkkkkkkkwwo', 'owwwwwwwwwwwwo', 'owkkkkkkwwwwwo', 'owwwwwwwwwwwwo', 'oooooooooooooo', '......ot......', '......ot......', '......ot......', '......ot......', '.....oooo.....'], { o: '#4A2A14', w: '#C8955A', k: '#7A4E2A', t: '#8A5A34' }); });
    // rocks & trees, row by row so lower ones overlap upper ones
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = grid[y][x], X = x * L, Y = y * L;
      if (t === 'R') { const rc = themeId === 'ember' ? { o: '#1E1414', l: '#7A6464', g: '#4E3E3E', d: '#3A2E2E' } : { o: '#3A4258', l: '#DCE2EE', g: '#A8B2C6', d: '#7E8AA2' }; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X + 2, Y + 14, 12, 2); stamp(g, X, Y + 6, ROCK, rc); }
      if (t === 'T') { const kind = P.tree; const rows = TREE[kind]; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 3, Y + L - 2, 10, 2); anim.push({ k: 'tree', X: X, Y: Y + L - rows.length, rows: rows, colors: treeColors(kind, P), ph: phaseAt(X, Y + L - rows.length, 0.25), gain: gainAt(X, Y, 0.7, 1.15) }); }
    }
    c.anim = { items: anim, P: P, sets: {}, last: 0 };   // always: the still image lacks trees, grass, flowers and water highlights until frame 0 is baked
    return c;
  }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
  function place(g, p, P) {
    const X = p.x * L, Y = p.y * L, Wd = p.w * L, Hd = p.h * L;
    const ol = '#2B2235';
    if (p.kind === 'arena') {   // Meaning: where you stand with your critter in front of others. A ring of stone with stands that face inward, the gate left open: anyone may step in, and someone is always watching.
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, cx = X + Wd / 2, cy = Y + Hd / 2 + 2, rx = Wd / 2 - 1, ry = Hd / 2 - 3, east = p.gate === 'e', cloth = ['#D8574A', '#3C6FE0', '#F5C542', '#F5A3D0', '#FFFFFF', '#4FB06D'];
      if (!east) R(X + 4, Y + Hd - 2, Wd - 8, 4, 'rgba(0,0,0,0.22)');
      for (let y = 0; y < Hd + (east ? 0 : 4); y++) for (let x = 0; x < Wd; x++) {
        const dx = X + x - cx, dy = Y + y - cy, r = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)), gate = east ? (dx > rx * 0.45 && Math.abs(dy) < 20) : (Math.abs(dx) < 24 && dy < -ry * 0.45);
        let c = null;
        if (r > 1) { if (!east) continue; c = ((x >> 3) + (y >> 3)) % 2 ? '#5A6478' : '#626C82'; if ((x % 8 === 0) || (y % 8 === 0)) c = '#4A5468'; }   // the apron outside the wall, flagged (only when the ring is the whole map)
        else if (gate) c = r > 0.97 ? null : '#E8D3A2';
        else if (r > 0.95) c = ol;
        else if (r > 0.86) c = (y % 4 < 2) ? '#8E98AD' : '#B7BFCF';   // the outer wall, coursed stone
        else if (r > 0.80) c = '#5A6478';   // the top of the wall, in shadow
        else if (r > 0.68) c = ((Math.floor(r * 50)) % 2) ? '#C9A26A' : '#A8864E';   // the upper tier
        else if (r > 0.56) c = ((Math.floor(r * 50)) % 2) ? '#D8B57A' : '#B8955A';   // the lower tier
        else if (r > 0.53) c = ol;   // the rail round the floor
        else c = Math.abs(r - 0.26) < 0.025 ? '#FFFFFF' : '#E8D3A2';   // the sand, and the ring drawn in it
        if (c) R(X + x, Y + y, 1, 1, c);
        if (!gate && r > 0.56 && r < 0.80 && hsh(X + x, Y + y) < 0.045) { R(X + x, Y + y - 1, 2, 2, cloth[Math.floor(hsh(y, x) * cloth.length)]); R(X + x, Y + y - 2, 2, 1, '#F2C9A0'); }   // the others, in the stands
      }
      if (east) {   // the gate in the east wall: two posts and both leaves swung open, against the apron
        const gx = X + Wd - 22; R(gx, cy - 23, 22, 3, ol); R(gx, cy + 20, 22, 3, ol); R(gx + 1, cy - 22, 20, 1, '#B7BFCF'); R(gx + 1, cy + 21, 20, 1, '#B7BFCF');
        R(gx + 10, cy - 28, 14, 5, ol); R(gx + 11, cy - 27, 12, 3, '#6B4626'); R(gx + 10, cy + 23, 14, 5, ol); R(gx + 11, cy + 24, 12, 3, '#6B4626');
      } else {
        R(cx - 27, Y - 2, 3, 22, ol); R(cx + 24, Y - 2, 3, 22, ol); R(cx - 26, Y - 1, 1, 20, '#B7BFCF'); R(cx + 25, Y - 1, 1, 20, '#B7BFCF');   // the gate posts
        R(cx - 32, Y - 2, 5, 14, ol); R(cx - 31, Y - 1, 3, 12, '#6B4626'); R(cx + 27, Y - 2, 5, 14, ol); R(cx + 28, Y - 1, 3, 12, '#6B4626');   // both leaves swung open
      }
      M_BELL(R, cx, cy - 8, ol);   // the bell post in the middle of the sand (the Arena's bell device sits on the centre tile)
      [[X + 14, Y + 30, '#D8574A'], [X + Wd - 18, Y + 30, '#3C6FE0']].forEach(([bx, by, c]) => { R(bx, by - 6, 1, 30, ol); R(bx + 1, by - 5, 7, 14, ol); R(bx + 2, by - 4, 5, 12, c); R(bx + 2, by + 8, 2, 2, c); R(bx + 5, by + 8, 2, 2, c); R(bx + 3, by - 1, 2, 2, '#FFFFFF'); });   // two banners, on the apron
      return;
    }
    if (p.kind === 'device') return; // drawn by the interior tile itself
    if (p.kind === 'gym') { // leader hall: timber hall, leader-colored emblem + banners
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, col = p.color || '#F5C542', roofH = 34;
      R(X + 2, Y + Hd - 1, Wd - 4, 3, 'rgba(0,0,0,0.22)');
      R(X + 3, Y + roofH - 4, Wd - 6, Hd - roofH + 4, ol); R(X + 4, Y + roofH - 3, Wd - 8, Hd - roofH + 2, '#C9A26A');
      for (let x = X + 4; x < X + Wd - 4; x += 12) R(x, Y + roofH - 3, 2, Hd - roofH + 2, '#9A7448');
      R(X + 4, Y + roofH + 6, Wd - 8, 2, '#9A7448');
      gymRoof(R, P, p, X, Y, Wd, roofH, ol);
      const cx = X + Wd / 2; R(cx - 9, Y + 8, 18, 18, ol); R(cx - 8, Y + 9, 16, 16, '#F4EAD6'); R(cx - 5, Y + 12, 10, 10, col); R(cx - 2, Y + 15, 4, 4, '#FFFFFF');
      const dx0 = p.door[0] * L + L - 9; R(dx0 - 1, Y + Hd - 19, 20, 19, ol); R(dx0, Y + Hd - 18, 18, 18, '#6B4626'); R(dx0 + 8, Y + Hd - 18, 2, 18, '#4A3020'); R(dx0 - 3, Y + Hd - 22, 24, 3, col);
      [[X + 10, Y + roofH + 10], [X + Wd - 18, Y + roofH + 10]].forEach(([bx, by]) => { R(bx - 1, by - 1, 10, 22, ol); R(bx, by, 8, 18, col); R(bx, by + 18, 3, 3, col); R(bx + 5, by + 18, 3, 3, col); R(bx + 3, by + 5, 2, 2, '#FFFFFF'); });
      [[X + 22, Y + roofH + 12], [X + Wd - 36, Y + roofH + 12]].forEach(([wx, wy]) => { R(wx - 1, wy - 1, 14, 12, ol); R(wx, wy, 12, 10, '#FFE08A'); R(wx + 6, wy, 1, 10, '#C9962A'); });
      return;
    }
    if (p.kind === 'tower') {
      const cx = X + Wd / 2, R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const tier = (x0, y0, w, h, face, lite, dark) => { R(x0 - 1, y0 - 1, w + 2, h + 2, ol); R(x0, y0, w, h, face); R(x0, y0, w, 2, lite); R(x0 + w - 3, y0 + 2, 3, h - 2, dark);
        for (let y = y0 + 5, row = 0; y < y0 + h - 1; y += 5, row++) { R(x0, y, w - 3, 1, dark); for (let x = x0 + (row % 2 ? 3 : 7); x < x0 + w - 4; x += 9) R(x, y - 4, 1, 4, dark); } };
      R(X + 3, Y + Hd - 1, Wd - 6, 3, 'rgba(0,0,0,0.22)');
      tier(X + 4, Y + 60, Wd - 8, 36, '#8F8BB4', '#B9B5D8', '#6E6A94');
      tier(X + 14, Y + 28, Wd - 28, 32, '#9C98C0', '#C4C0E2', '#77739E');
      tier(X + 26, Y + 4, Wd - 52, 24, '#A8A4CC', '#CFCBEC', '#807CA8');
      [[X + 3, Y + 58, Wd - 6], [X + 13, Y + 26, Wd - 26], [X + 25, Y + 2, Wd - 50]].forEach(([x, y, w]) => { R(x, y, w, 3, ol); R(x + 1, y, w - 2, 2, '#F5C542'); for (let i = x + 3; i < x + w - 3; i += 6) R(i, y + 2, 2, 2, '#C9962A'); });
      for (let i = 0; i < 22; i++) { const w = Math.max(2, 50 - i * 2.3) | 0; R(cx - w / 2 - 1, Y + 1 - i, w + 2, 1, ol); R(cx - w / 2, Y + 1 - i, w, 1, i % 3 === 0 ? '#7A5CC8' : '#5B3FA8'); if (w > 6) R(cx - w / 2 + 2, Y + 1 - i, 2, 1, '#9C84E0'); }
      R(cx, Y - 33, 1, 13, ol); R(cx + 1, Y - 33, 9, 3, '#FFD86B'); R(cx + 1, Y - 30, 6, 2, '#E0A830');
      const win = (wx, wy) => { R(wx - 1, wy - 1, 8, 11, ol); R(wx, wy + 2, 6, 8, '#FFE08A'); R(wx + 1, wy, 4, 2, '#FFE08A'); R(wx, wy + 5, 6, 1, '#E0A830'); R(wx + 1, wy + 3, 1, 2, '#FFFFFF'); };
      win(cx - 3, Y + 10); win(X + 24, Y + 38); win(cx - 3, Y + 38); win(X + Wd - 30, Y + 38); win(X + 14, Y + 70); win(X + Wd - 20, Y + 70);
      const dx0 = p.door[0] * L + L - 8;
      R(dx0 - 1, Y + Hd - 21, 18, 21, ol); R(dx0 + 1, Y + Hd - 23, 14, 2, ol); R(dx0, Y + Hd - 20, 16, 20, '#6B4626'); R(dx0 + 2, Y + Hd - 22, 12, 2, '#6B4626');
      R(dx0 + 2, Y + Hd - 18, 12, 18, '#8A5A34'); R(dx0 + 7, Y + Hd - 18, 2, 18, '#5E3C22'); R(dx0 + 11, Y + Hd - 9, 2, 2, '#FFD86B'); R(dx0 - 2, Y + Hd - 26, 20, 3, '#F5C542'); R(dx0 - 2, Y + Hd - 26, 20, 1, ol);
      [[X + 26, Y + 62], [X + Wd - 32, Y + 62]].forEach(([bx, by]) => { R(bx - 1, by - 1, 8, 16, ol); R(bx, by, 6, 13, '#D8574A'); R(bx, by + 13, 2, 2, '#D8574A'); R(bx + 4, by + 13, 2, 2, '#D8574A'); R(bx + 2, by + 4, 2, 2, '#FFD86B'); R(bx, by, 6, 1, '#F08070'); });
      return;
    }
    if (p.kind === 'board') {
      g.fillStyle = '#5E3C22'; g.fillRect(X + 4, Y + 4, 3, 12); g.fillRect(X + Wd - 7, Y + 4, 3, 12);
      g.fillStyle = ol; g.fillRect(X, Y - 7, Wd, 14); g.fillStyle = '#B07A46'; g.fillRect(X + 1, Y - 6, Wd - 2, 12);
      ['#FFFFFF', '#FFF4C7', '#E2F6FA', '#FFFFFF'].forEach((c2, i) => { g.fillStyle = c2; g.fillRect(X + 5 + i * 14, Y - 4, 9, 8); g.fillStyle = '#D8574A'; g.fillRect(X + 9 + i * 14, Y - 5, 2, 2); });
      return;
    }
    // house: one architecture per region (P.arch), each a statement of the region's meaning. The footprint (p.x, p.y, p.w, p.h) and the door never move; only the drawing differs.
    if (p.id === 'lab') { drawLab(g, p, X, Y, Wd, Hd, ol); return; }
    drawHouse(g, p, P, X, Y, Wd, Hd, ol);
    mark(g, p, P, X, Y, Wd, Hd, ol);
  }
  // Meaning: being studied, and believed in. The Lab is glass to see in and out of, with a dish turned to the sky: it watches and listens for what is out there, you included.
  function drawLab(g, p, X, Y, Wd, Hd, ol) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, doorX = p.door[0] * L + L - 6, top = Y + 22, glass = '#9CD3F5', glassL = '#D6F0FF', frame = '#3C6FE0';
    R(X + 2, Y + Hd, Wd - 4, 2, 'rgba(0,0,0,0.2)');
    R(X + 2, top, Wd - 4, Hd - (top - Y) + 1, ol); R(X + 3, top + 1, Wd - 6, Hd - (top - Y) - 1, '#E8EEF8');   // the body, pale
    R(X + 3, top + 1, Wd - 6, 1, '#FFFFFF'); R(X + 3, Y + Hd - 6, Wd - 6, 5, '#C9CFDA');   // a light top edge, a plinth
    R(X - 2, top - 7, Wd + 4, 8, ol); R(X - 1, top - 6, Wd + 2, 6, '#B7BFCF'); R(X - 1, top - 6, Wd + 2, 2, '#DCE2EE'); R(X - 1, top - 1, Wd + 2, 1, '#8E98AD');   // the flat roof slab, overhanging
    for (let wx = X + 8; wx + 20 <= X + Wd - 34; wx += 24) { R(wx - 1, top + 9, 22, 16, frame); R(wx, top + 10, 20, 14, glass); R(wx + 1, top + 11, 6, 3, glassL); R(wx + 9, top + 10, 2, 14, frame); }   // a band of wide windows
    R(doorX - 3, Y + Hd - 19, 18, 19, frame); R(doorX - 2, Y + Hd - 18, 16, 18, glass); R(doorX + 5, Y + Hd - 18, 2, 18, frame); R(doorX - 1, Y + Hd - 17, 4, 3, glassL); R(doorX + 10, Y + Hd - 10, 2, 3, '#1E2A4A');   // a glass door
    const ax = X + Wd - 32, aw = 29, ay = top + 14;   // the glass annex: a greenhouse wing, plants inside
    R(ax - 1, ay, aw + 2, Hd - (ay - Y) + 1, ol); R(ax, ay + 1, aw, Hd - (ay - Y) - 1, glass);
    for (let i = 0; i < 10; i++) { const w = Math.round(aw * i / 10 / 2) * 2; R(ax + aw / 2 - w / 2 - 1, ay - 10 + i, w + 2, 1, ol); R(ax + aw / 2 - w / 2, ay - 10 + i, w, 1, i % 3 ? glass : glassL); }   // its sloped glass roof
    for (let x = ax + 7; x < ax + aw - 2; x += 7) R(x, ay + 1, 1, Hd - (ay - Y) - 1, frame); R(ax, ay + Math.round((Hd - (ay - Y)) / 2), aw, 1, frame);
    [[ax + 3, Y + Hd - 9], [ax + 11, Y + Hd - 12], [ax + 19, Y + Hd - 8], [ax + 24, Y + Hd - 11]].forEach(([px0, py0], i) => { R(px0, py0, 4, 6, '#4FB06D'); R(px0 + 1, py0 - 3, 2, 3, '#4FB06D'); if (i % 2) R(px0 + 1, py0 - 4, 2, 2, '#F5A3D0'); R(px0 - 1, py0 + 6, 6, 3, '#A87A48'); });
    const dx0 = X + 16, dy0 = top - 8;   // the dish on the roof, turned up and east
    R(dx0 + 5, dy0 - 10, 2, 12, ol); R(dx0 + 5, dy0 - 9, 1, 10, '#8E98AD');
    for (let i = 0; i < 12; i++) { const w = Math.round(Math.sqrt(Math.max(0, 1 - ((i - 6) * (i - 6)) / 36)) * 7); R(dx0 + 6 - w + i / 2, dy0 - 22 + i, w + 3, 1, i === 0 || i === 11 ? ol : (i < 4 ? '#FFFFFF' : '#DCE2EE')); }
    R(dx0 + 9, dy0 - 18, 3, 1, ol); R(dx0 + 12, dy0 - 19, 2, 2, '#D8574A');   // the feed, a red light at its tip
  }
  // Meaning: a place says what it is by how it is built, not by a word over it; the two places whose use a wall cannot show hang a symbol by the door, the way a real shop does.
  // Shops: a hung board with a potion. Everything else (home, the Lab, houses, arena, gyms, board, tower) reads from its own shape (a board on the Lab read as a face, Dan).
  const MARK = {
    shop: ['............', '.ffffffffff.', '.ffffnnffff.', '.ffffnnffff.', '.fffrrrrfff.', '.ffrrwrrrff.', '.ffrrrrrrff.', '.fffrrrrfff.', '.ffffffffff.', '............']
  };
  function mark(g, p, P, X, Y, Wd, Hd, ol) {
    const rows = p.open === 'shop' ? MARK.shop : null; if (!rows) return;
    const roofH = Math.round(Hd * 0.5), doorX = p.door[0] * L + L - 6, arch = P.arch || 'cottage';
    const sx = arch === 'shell' ? X + 21 : doorX - 1, sy = Y + roofH + (arch === 'shell' ? 5 : 4);   // over the door; Coralbay's porthole sits there, so left of it
    g.fillStyle = ol; g.fillRect(sx - 1, sy - 3, 14, 13); g.fillStyle = '#8A5A34'; g.fillRect(sx + 2, sy - 3, 8, 2); g.fillStyle = ol; g.fillRect(sx + 5, sy - 2, 2, 1);   // the bracket it hangs from
    stamp(g, sx, sy, rows, { f: '#F4EAD6', n: '#8A5A34', r: '#E05A7A', w: '#FFFFFF', k: '#2B4A8E' });
  }
  // the Arena's bell: a post with a crossbar and a brass bell hanging from it (the same bell as the old arena room's)
  function M_BELL(R, bx, by, ol) { R(bx - 2, by - 20, 4, 22, ol); R(bx - 1, by - 19, 2, 20, '#5E3C22'); R(bx - 7, by - 22, 14, 3, ol); R(bx - 6, by - 21, 12, 1, '#8A5A34'); R(bx - 4, by - 18, 8, 8, ol); R(bx - 3, by - 17, 6, 6, '#F5C542'); R(bx - 3, by - 17, 6, 1, '#FFF1BF'); R(bx - 1, by - 11, 2, 2, '#C9962A'); R(bx - 6, by + 1, 12, 2, 'rgba(0,0,0,0.22)'); }
  // the gym hall's roof follows its region (same painters as the houses), its colour stays the leader's
  function gymRoof(R, P, p, X, Y, Wd, roofH, ol) {
    const arch = P.arch || 'cottage', roof = p.roof || '#4E8A3A';
    if (arch === 'longhouse') { const apex = Y - 10, eaveY = Y + roofH + 2; for (let i = 0; i <= eaveY - apex; i++) { const w = Math.round((Wd + 8) * i / (eaveY - apex) / 2) * 2, x0 = X + Wd / 2 - w / 2; if (w < 2) continue; R(x0 - 1, apex + i, w + 2, 1, ol); R(x0, apex + i, w, 1, i % 4 < 2 ? roof : shade(roof, -0.25)); } for (let i = 0; i <= Math.round((eaveY - apex) * 0.55); i++) { const w = Math.round((Wd + 8) * i / (eaveY - apex) / 2) * 2 - 6, x0 = X + Wd / 2 - w / 2; if (w < 2) continue; R(x0, apex + i + 1, w, 1, '#FFFFFF'); } R(X - 4, eaveY, Wd + 8, 2, '#FFFFFF'); return; }
    if (arch === 'forge') { R(X - 3, Y + 4, Wd + 6, roofH - 2, ol); R(X - 2, Y + 5, Wd + 4, roofH - 4, roof); R(X - 2, Y + 5, Wd + 4, 2, shade(roof, 0.3)); for (let x = X + 2; x < X + Wd - 2; x += 10) { R(x, Y + 5, 1, roofH - 4, shade(roof, -0.3)); for (let yy = Y + 8; yy < Y + roofH; yy += 6) R(x + 4, yy, 2, 2, shade(roof, 0.4)); } const cxm = X + Wd - 16; R(cxm - 1, Y - 12, 10, 18, ol); R(cxm, Y - 11, 8, 16, '#6E3424'); [[cxm + 2, Y - 17], [cxm + 5, Y - 20]].forEach(([ex, ey], i) => R(ex, ey, 2, 2, i ? '#FFD86B' : '#FF9A3A')); return; }
    dome(R, X, Y, Wd, roofH, [roof, shade(roof, -0.25)], ol, shade(roof, 0.3));
    if (arch === 'grove') for (let i = 0; i < 10; i++) { const tx = X + 8 + Math.floor(hsh(p.x + i, p.y + 3) * (Wd - 16)), ty = Y + 8 + Math.floor(hsh(p.y + i, p.x + 5) * (roofH - 12)); R(tx, ty - 3, 1, 3, '#7CC25C'); if (i % 3 === 0) R(tx + 1, ty - 4, 2, 2, '#F5A3D0'); }
    if (arch === 'shell') for (let i = 3; i < roofH; i += 3) { const k = (roofH - i) / roofH, w = Math.round((Wd + 4) * Math.sqrt(Math.max(0, 1 - k * k)) / 2) * 2 - 6; for (let x = X + Wd / 2 - w / 2 + ((i / 3) % 2) * 4; x < X + Wd / 2 + w / 2; x += 8) R(x, Y + i, 1, 1, '#A8D8FF'); }
  }
  const hsh = (a, b) => ((Math.imul(a + 7, 2654435761) ^ Math.imul(b + 13, 1597334677)) >>> 0) / 4294967296;
  // dome roof rows: width follows a half ellipse, so the roof is round like a cap
  function dome(R, X, Y, Wd, roofH, cols, ol, rim) {
    for (let i = 0; i <= roofH; i++) { const k = (roofH - i) / roofH, w = Math.round((Wd + 4) * Math.sqrt(Math.max(0, 1 - k * k)) / 2) * 2; if (w < 4) continue; const x0 = X + Wd / 2 - w / 2;
      R(x0 - 1, Y + i, w + 2, 1, ol); R(x0, Y + i, w, 1, cols[Math.floor(i / 3) % cols.length]); if (i < 3 && rim) R(x0 + 2, Y + i, w - 4, 1, rim); }
  }
  function drawHouse(g, p, P, X, Y, Wd, Hd, ol) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, arch = P.arch || 'cottage', roofH = Math.round(Hd * 0.5), roof = p.roof || '#28509E', doorX = p.door[0] * L + L - 6, sd = hsh(p.x, p.y);
    const door = (w, h, c, round) => { R(doorX - 1 - (w - 12) / 2, Y + Hd - h - 1, w + 2, h + 1, ol); R(doorX - (w - 12) / 2, Y + Hd - h, w, h, c); R(doorX - (w - 12) / 2 + w / 2 - 1, Y + Hd - h, 1, h, shade(c, -0.3)); R(doorX - (w - 12) / 2 + w - 4, Y + Hd - h / 2, 2, 2, '#FFD86B'); if (round) { R(doorX - 1 - (w - 12) / 2, Y + Hd - h - 1, 2, 2, P.g); R(doorX - 1 - (w - 12) / 2 + w, Y + Hd - h - 1, 2, 2, P.g); } };
    const win = (wx, wy, w, h, glass, bars) => { R(wx - 1, wy - 1, w + 2, h + 2, ol); R(wx, wy, w, h, glass); if (bars) { R(wx + w / 2, wy, 1, h, '#FFFFFF'); R(wx, wy + h / 2, w, 1, '#FFFFFF'); } R(wx + 1, wy + 1, 2, 2, 'rgba(255,255,255,0.6)'); };
    R(X + 2, Y + Hd, Wd - 4, 2, 'rgba(0,0,0,0.2)');
    if (arch === 'grove') {   // Mossbrook: built around the old trees. Log walls, a living moss roof with grass and flowers, a trunk and its canopy leaning over one side.
      R(X + 2, Y + roofH - 3, Wd - 4, Hd - roofH + 3, ol); for (let yy = Y + roofH - 2; yy < Y + Hd - 1; yy += 5) { R(X + 3, yy, Wd - 6, 5, '#A87A48'); R(X + 3, yy, Wd - 6, 1, '#C9986A'); R(X + 3, yy + 4, Wd - 6, 1, '#7A5230'); R(X + 3, yy + 1, 1, 3, '#6E4A2E'); R(X + Wd - 4, yy + 1, 1, 3, '#6E4A2E'); }
      dome(R, X, Y, Wd, roofH, ['#4E8A3A', '#3E7A2E', '#5A9A44'], ol, '#7CC25C');
      for (let i = 0; i < 9; i++) { const tx = X + 6 + Math.floor(hsh(p.x + i, p.y) * (Wd - 12)), ty = Y + 6 + Math.floor(hsh(p.y + i, p.x) * (roofH - 9)); R(tx, ty - 3, 1, 3, '#7CC25C'); R(tx + 2, ty - 2, 1, 2, '#7CC25C'); if (i % 3 === 0) R(tx + 1, ty - 4, 2, 2, [roof, '#F5A3D0', '#FFFFFF'][i % 3 === 0 ? (i / 3) % 3 : 0]); }
      const tx0 = sd < 0.5 ? X - 6 : X + Wd - 4; R(tx0 - 1, Y + roofH - 8, 12, Hd - roofH + 9, ol); R(tx0, Y + roofH - 7, 10, Hd - roofH + 7, '#6E4A2E'); R(tx0 + 2, Y + roofH - 7, 2, Hd - roofH + 7, '#8A5A34');
      const crown = (ccx, ccy, rx, ry, dark, light) => { for (let i = -ry; i <= ry; i++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (i * i) / (ry * ry)))); if (w < 1) continue; R(ccx - w - 1, ccy + i, 2 * w + 2, 1, ol); } for (let i = -ry + 1; i <= ry - 1; i++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (i * i) / (ry * ry)))) - 1; if (w < 1) continue; R(ccx - w, ccy + i, 2 * w, 1, i < -ry * 0.3 ? light : dark); } };   // a round crown, row by row
      crown(tx0 + 5, Y + roofH - 16, 17, 11, '#3E8A3E', '#5FBF58'); crown(tx0 + 9, Y + roofH - 25, 11, 7, '#3E8A3E', '#5FBF58');
      [[tx0 - 6, Y + roofH - 12], [tx0 + 12, Y + roofH - 9], [tx0 + 3, Y + roofH - 20]].forEach(([lx, ly]) => { R(lx, ly, 3, 2, '#2E7D33'); R(lx + 1, ly - 1, 1, 1, '#2E7D33'); });   // a few darker leaf clumps
      door(12, 14, '#6B4626', true); win(X + 8, Y + roofH + 4, 12, 9, '#9CD3F5', true); win(X + Wd - 20, Y + roofH + 4, 12, 9, '#9CD3F5', true);
      R(X + Wd - 8, Y + roofH, 2, Hd - roofH - 2, '#2E7D33'); R(X + Wd - 10, Y + roofH + 6, 3, 2, '#5FBF58'); R(X + Wd - 7, Y + roofH + 14, 3, 2, '#5FBF58');   // a vine down the wall
      return;
    }
    if (arch === 'longhouse') {   // Frosthold: what is kept by being kept cold. Stone feet, dark timber, a steep gable under a cap of snow, icicles at the eaves, a lantern kept by the door.
      R(X + 2, Y + roofH - 3, Wd - 4, Hd - roofH + 3, ol); R(X + 3, Y + roofH - 2, Wd - 6, Hd - roofH + 1, '#5A4636'); for (let x = X + 3; x < X + Wd - 3; x += 7) R(x, Y + roofH - 2, 1, Hd - roofH + 1, '#3E3026');
      for (let yy = Y + Hd - 12; yy < Y + Hd - 1; yy += 4) for (let x = X + 3 + ((yy / 4) % 2) * 4; x < X + Wd - 3; x += 8) { R(x, yy, 7, 3, '#8E98AD'); R(x, yy, 7, 1, '#B7BFCF'); }   // stone feet
      const apex = Y - 8, eaveY = Y + roofH + 2; for (let i = 0; i <= eaveY - apex; i++) { const w = Math.round((Wd + 8) * i / (eaveY - apex) / 2) * 2, x0 = X + Wd / 2 - w / 2; if (w < 2) continue; R(x0 - 1, apex + i, w + 2, 1, ol); R(x0, apex + i, w, 1, i % 4 < 2 ? '#4A3A2E' : '#3E3026'); }
      for (let i = 0; i <= Math.round((eaveY - apex) * 0.6); i++) { const w = Math.round((Wd + 8) * i / (eaveY - apex) / 2) * 2 - 6, x0 = X + Wd / 2 - w / 2; if (w < 2) continue; R(x0, apex + i + 1, w, 1, i % 5 === 4 ? '#D8E6F2' : '#FFFFFF'); }   // the snow cap
      R(X - 4, eaveY, Wd + 8, 2, '#FFFFFF'); [[X - 1, 5], [X + 10, 3], [X + Wd / 2 - 3, 6], [X + Wd - 12, 4], [X + Wd + 1, 5]].forEach(([ix, h]) => { R(ix, eaveY + 2, 2, h, '#DCEFF8'); R(ix, eaveY + 2, 1, h, '#FFFFFF'); });
      R(X + Wd / 2 - 7, apex - 2, 3, 10, '#6E4A2E'); R(X + Wd / 2 + 4, apex - 2, 3, 10, '#6E4A2E'); R(X + Wd / 2 - 6, apex + 3, 12, 1, '#6E4A2E');   // crossed beams at the peak
      door(12, 14, '#4A3020', false); win(X + 10, Y + roofH + 6, 8, 8, '#FFE08A', false); win(X + Wd - 18, Y + roofH + 6, 8, 8, '#FFE08A', false);
      const lx = doorX + 18; R(lx, Y + Hd - 24, 1, 5, '#2B2235'); R(lx - 2, Y + Hd - 19, 5, 6, ol); R(lx - 1, Y + Hd - 18, 3, 4, '#FFD27A'); R(lx - 4, Y + Hd - 21, 9, 1, 'rgba(255,210,120,0.45)'); R(lx - 4, Y + Hd - 12, 9, 1, 'rgba(255,210,120,0.45)');   // the lantern kept by the door
      return;
    }
    if (arch === 'forge') {   // Cinderport: the fire that has to be fed. Brick walls, an iron roof with rivets, a chimney with embers on every house, windows lit from inside.
      R(X + 2, Y + roofH - 3, Wd - 4, Hd - roofH + 3, ol); R(X + 3, Y + roofH - 2, Wd - 6, Hd - roofH + 1, '#7A3A2A'); for (let yy = Y + roofH; yy < Y + Hd - 1; yy += 4) { R(X + 3, yy, Wd - 6, 1, '#4E2218'); for (let x = X + 3 + ((yy / 4) % 2) * 5; x < X + Wd - 3; x += 10) R(x, yy + 1, 1, 3, '#4E2218'); }
      R(X - 3, Y + 4, Wd + 6, roofH - 2, ol); R(X - 2, Y + 5, Wd + 4, roofH - 4, '#5E6270'); R(X - 2, Y + 5, Wd + 4, 2, '#8A8E9C'); for (let x = X + 2; x < X + Wd - 2; x += 10) { R(x, Y + 5, 1, roofH - 4, '#4A4E5A'); for (let yy = Y + 8; yy < Y + roofH; yy += 6) R(x + 4, yy, 2, 2, '#9AA0B0'); }
      R(X - 3, Y + roofH + 1, Wd + 6, 2, '#3A3E48');
      const cxm = X + Wd - 14; R(cxm - 1, Y - 12, 10, 18, ol); R(cxm, Y - 11, 8, 16, '#6E3424'); R(cxm, Y - 11, 8, 2, '#8A4A38'); R(cxm + 1, Y - 13, 6, 2, '#2A2420'); [[cxm + 2, Y - 17], [cxm + 5, Y - 20], [cxm + 3, Y - 23]].forEach(([ex, ey], i) => R(ex, ey, 2, 2, i % 2 ? '#FF9A3A' : '#FFD86B'));   // the chimney, embers rising
      door(16, 14, '#3A2A24', false); R(doorX - 3 + 7, Y + Hd - 14, 1, 14, '#6A6A78');
      win(X + 8, Y + roofH + 5, 12, 9, '#FF9A3A', true); win(X + Wd - 20, Y + roofH + 5, 12, 9, '#FF9A3A', true);
      return;
    }
    if (arch === 'shell') {   // Coralbay: what the sea gives back, and the road home. Whitewashed round walls, a blue tiled dome, a porthole, a shell over the door, a lamp left on beside it.
      R(X + 2, Y + roofH - 3, Wd - 4, Hd - roofH + 3, ol); R(X + 3, Y + roofH - 2, Wd - 6, Hd - roofH + 1, '#F4F0E6'); R(X + 3, Y + roofH - 2, 1, 1, ol); R(X + Wd - 4, Y + roofH - 2, 1, 1, ol); R(X + 3, Y + Hd - 2, 1, 1, ol); R(X + Wd - 4, Y + Hd - 2, 1, 1, ol);
      R(X + 3, Y + Hd - 5, Wd - 6, 1, '#B8A888'); for (let x = X + 6; x < X + Wd - 6; x += 6) R(x, Y + Hd - 5, 2, 1, '#8A7A5A');   // a rope along the base
      dome(R, X, Y, Wd, roofH, ['#3C7FC8', '#2F6FB0', '#4A8ED8'], ol, '#9CD3F5'); for (let i = 3; i < roofH; i += 3) { const k = (roofH - i) / roofH, w = Math.round((Wd + 4) * Math.sqrt(Math.max(0, 1 - k * k)) / 2) * 2 - 6; for (let x = X + Wd / 2 - w / 2 + ((i / 3) % 2) * 4; x < X + Wd / 2 + w / 2; x += 8) R(x, Y + i, 1, 1, '#A8D8FF'); }
      const px0 = X + Wd / 2 - 5, py0 = Y + roofH + 4; R(px0 - 1, py0 - 1, 12, 12, ol); R(px0, py0, 10, 10, '#3C95DC'); [[px0 - 1, py0 - 1], [px0 + 10, py0 - 1], [px0 - 1, py0 + 10], [px0 + 10, py0 + 10]].forEach(([cx2, cy2]) => R(cx2, cy2, 1, 1, '#F4F0E6')); R(px0, py0, 10, 1, '#FFFFFF'); R(px0, py0, 1, 10, '#FFFFFF'); R(px0 + 2, py0 + 2, 2, 2, '#FFFFFF');   // the porthole
      door(12, 14, '#4A8ED8', true); R(doorX + 2, Y + Hd - 20, 8, 5, '#F5A3D0'); R(doorX + 4, Y + Hd - 21, 4, 1, '#F5A3D0'); R(doorX + 5, Y + Hd - 18, 1, 3, '#E07AB0'); R(doorX + 7, Y + Hd - 18, 1, 3, '#E07AB0');   // a shell over the door
      const lx = doorX + 18; R(lx - 2, Y + Hd - 21, 5, 6, ol); R(lx - 1, Y + Hd - 20, 3, 4, '#FFD27A'); R(lx + 3, Y + Hd - 22, 1, 7, '#4A5878'); R(lx - 4, Y + Hd - 23, 9, 1, 'rgba(255,210,120,0.45)'); R(lx - 4, Y + Hd - 14, 9, 1, 'rgba(255,210,120,0.45)');   // the lamp left on
      win(X + 6, Y + roofH + 6, 8, 8, '#9CD3F5', false); win(X + Wd - 14, Y + roofH + 6, 8, 8, '#9CD3F5', false);
      return;
    }
    // Sproutvale cottages: kept warm. A round shingled roof, a timber-framed cream wall, a chimney with a puff of smoke, flower boxes under the windows.
    R(X + 2, Y + roofH - 3, Wd - 4, Hd - roofH + 3, ol); R(X + 3, Y + roofH - 2, Wd - 6, Hd - roofH + 1, p.wall || '#F4EAD6');
    R(X + 3, Y + roofH - 2, Wd - 6, 2, '#8A5A34'); R(X + 3, Y + roofH - 2, 2, Hd - roofH + 1, '#8A5A34'); R(X + Wd - 5, Y + roofH - 2, 2, Hd - roofH + 1, '#8A5A34'); R(X + Wd / 2 - 1, Y + roofH, 2, Hd - roofH - 1, '#A87A48');   // timber frame
    const roofD = shade(roof, -0.25), roofL = shade(roof, 0.3);
    dome(R, X, Y, Wd, roofH, [roof, roofD], ol, roofL); for (let i = 3; i < roofH; i += 3) { const k = (roofH - i - 2) / roofH, w = Math.round((Wd + 4) * Math.sqrt(Math.max(0, 1 - k * k)) / 2) * 2 - 6; for (let x = X + Wd / 2 - w / 2 + ((i / 3) % 2) * 3; x < X + Wd / 2 + w / 2; x += 6) R(x, Y + i + 2, 1, 1, roofD); }
    const cxm = X + Wd - 16; R(cxm - 1, Y - 2, 8, 12, ol); R(cxm, Y - 1, 6, 10, '#8E98AD'); R(cxm, Y - 1, 6, 2, '#B7BFCF'); R(cxm + 1, Y - 6, 2, 2, 'rgba(255,255,255,0.55)'); R(cxm + 4, Y - 9, 2, 2, 'rgba(255,255,255,0.4)');
    door(12, 14, '#8A5A34', true);
    [[X + 8, Y + roofH + 4], [X + Wd - 22, Y + roofH + 4]].forEach(([wx, wy]) => { win(wx, wy, 14, 10, '#9CD3F5', true); R(wx - 1, wy + 11, 16, 4, ol); R(wx, wy + 12, 14, 2, '#8A5A34'); [0, 4, 8, 12].forEach((fx, i) => R(wx + fx + 1, wy + 10, 2, 2, ['#F06A6A', '#FFD86B', '#F5A3D0', '#FFFFFF'][i])); });
  }
  // ---- player: 16x20 sprites, eight facings, 3 frames each (frame 0 is the idle). The diagonals are the same parts re-arranged, not flips of the front: hair covers more of the face from the back quarter, the face sits off-centre on the front quarter, the near hand shows. Left facings are the right ones mirrored. ----
  const PC = { o: '#1E1A2A', h: '#2B2235', s: '#F2C9A0', e: '#1E2A4A', y: '#FFD86B', Y: '#E0A830', w: '#FFFFFF', p: '#2B2F45', b: '#F5C542', c: '#D8574A' };
  const HEAD_D = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhssssshho...', '..ohsseesesho...', '..ohssssssso....', '...ossssss o....'.replace(' ', 's'), '....oooooo......'];
  function frames(pal) {
    const C = Object.assign({}, PC, pal || {});
    const make = (dir, f) => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 20; const g = c.getContext('2d');
      let head;
      if (dir === 'down') head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhssssshho...', '..ohseesseho....', '..ohssssssho....', '...ossssss o....'.replace(' ', 'o'), '....oooooo......'];
      else if (dir === 'up') head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhhhhhhho....', '..ohhhhhhhho....', '..ohhhhhhhho....', '...ohhhhhho.....', '....oooooo......'];
      else if (dir === 'downright' || dir === 'downleft') head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhhsssshho...', '..ohhsesesho....', '..ohhssssssho...', '...ohsssssso....', '....oooooo......'];   // front quarter: the face a little to the side, both eyes
      else if (dir === 'upright' || dir === 'upleft') head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhhhhhhso....', '..ohhhhhhhsso...', '..ohhhhhhhsso...', '...ohhhhhhso....', '....oooooo......'];   // back quarter: hair, and the edge of a cheek
      else head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhhhsssso....', '..ohhhsssesso...', '..ohhhsssssso...', '...ohhssssso....', '....oooooo......'];
      const quarter = dir === 'downright' || dir === 'downleft' || dir === 'upright' || dir === 'upleft';
      const bodyRows = quarter ? ['...ooyyyyyoo....', '..oyyywwwwyyo...', '..oyyyyyyyyyo...', '..oyyyyyyyyso...', '...oyyyyyyyo....', '....oppoppo.....'] : ['...ooyyyyyoo....', '..oyywwwwwyyo...', '..oyyyyyyyyyo...', '..osyyyyyyyso...', '...oyyyyyyyo....', '....oppoppo.....'];   // on a quarter view only the near hand shows and the stripe sits off-centre
      const legs = [['....opo.opo.....', '....opo.opo.....', '....obo.obo.....', '....ooo.ooo.....'], ['....opo..opo....', '...opo...opo....', '...obo....obo...', '...ooo....ooo...'], ['.....opo.opo....', '....opo...opo...', '....obo...obo...', '....ooo...ooo...']][f];
      let rows = head.concat(bodyRows, legs);
      if (C.cap) { rows = rows.map((r, i) => (i < 3 ? r.replace(/h/g, 'c') : r)); rows[3] = rows[3].replace(/^(..o)hh/, '$1cc').replace(/^(..o)h/, '$1c'); }
      if (dir === 'left' || dir === 'downleft' || dir === 'upleft') { const flip = rows.map((r) => r.split('').reverse().join('')); stamp(g, 0, 0, flip, C); }
      else stamp(g, 0, 0, rows, C);
      return c;
    };
    const out = {}; ['down', 'up', 'left', 'right', 'downright', 'downleft', 'upright', 'upleft'].forEach((d) => { out[d] = [0, 1, 2].map((f) => make(d, f)); }); return out;
  }
  return { L, PAL, terrain, frames, bake, fill, baked, swayStamp, TREE, TUFT, FLOWER };
})();
