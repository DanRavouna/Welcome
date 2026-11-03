// ---- PXW: pixel-art tiles, buildings and the player sprite (drawn at 16px per tile, shown at 2x) ----
const PXW = (() => {
  const L = 16;
  const PAL = {
    town: { g: '#74C25C', gd: '#8FD873', gt: '#4E9A3E', p: '#E8D09A', ps: '#D4B57A', pe: '#B8945C', w: '#5AA8F0', wl: '#A8D8FF', we: '#3C7FC8', t: '#3E9A3E', tb: '#2C7A2E', th: '#7CD25C', tree: 'round', ol: '#23402A', fl: ['#F06A6A', '#FFFFFF', '#F5A3D0'] },
    frost: { g: '#E4EEF8', gd: '#FFFFFF', gt: '#B9CCE0', p: '#B4C9E0', ps: '#A0B8D2', pe: '#7F9BBA', w: '#BFE3F5', wl: '#FFFFFF', we: '#8DBBD8', t: '#8FC3D6', tb: '#5E97AE', th: '#C8E8F2', tree: 'pine', ol: '#2E4A66', fl: ['#FFFFFF', '#BBD5FF'] },
    ember: { g: '#D9A066', gd: '#E8B27A', gt: '#B57A44', p: '#B9824C', ps: '#A67040', pe: '#7E5230', w: '#FF6A2B', wl: '#FFC24D', we: '#B83A10', t: '#C9A23A', tb: '#8E6B1E', th: '#E8C65A', tree: 'dead', ol: '#4A2A14', fl: ['#FFD86B', '#FF8A3D'] },
    moss: { g: '#4FA040', gd: '#63B852', gt: '#357F2E', p: '#B99B6A', ps: '#A4865A', pe: '#7E6440', w: '#3F8FC8', wl: '#8CC8F0', we: '#2A6A9A', t: '#2E7D33', tb: '#1D5A24', th: '#4FA040', tree: 'round', ol: '#163A1A', fl: ['#F5A3D0', '#FFFFFF', '#C9A8FF'] },
    peak: { g: '#8DB07A', gd: '#A3C48E', gt: '#6E8E5E', p: '#C9C3D6', ps: '#B3ACC4', pe: '#8E87A2', w: '#6FB6E8', wl: '#C8E8FF', we: '#4A8EC0', t: '#6E8E5E', tb: '#4E6E40', th: '#A3C48E', tree: 'pine', ol: '#2E3A4A', fl: ['#FFFFFF', '#C9A8FF', '#FFD86B'] },
    frosthold: { g: '#E4EEF8', gd: '#FFFFFF', gt: '#B9CCE0', p: '#9AA3B5', ps: '#868FA2', pe: '#6A7286', w: '#BFE3F5', wl: '#FFFFFF', we: '#8DBBD8', t: '#8FC3D6', tb: '#5E97AE', th: '#C8E8F2', tree: 'pine', ol: '#2E4A66', fl: ['#FFFFFF', '#BBD5FF'] },
    cinderport: { g: '#C9925C', gd: '#D9A670', gt: '#A87444', p: '#7A6A62', ps: '#6A5A52', pe: '#4E4038', w: '#FF6A2B', wl: '#FFC24D', we: '#B83A10', t: '#B9963A', tb: '#8E6B1E', th: '#D8B55A', tree: 'dead', ol: '#3A2210', fl: ['#FFD86B', '#FF8A3D'] },
    coralbay: { g: '#F2DFA8', gd: '#FAECC4', gt: '#D9C38A', p: '#C9A070', ps: '#B08858', pe: '#8A6A44', w: '#3C95DC', wl: '#A8D8FF', we: '#2A6FB0', t: '#B9C46A', tb: '#7E8A32', th: '#D8E08A', tree: 'palm', ol: '#5A4A20', fl: ['#FFFFFF', '#F5A3D0'] },
    mossbrook: { g: '#5FA34A', gd: '#74B85C', gt: '#44803A', p: '#C9A878', ps: '#B39064', pe: '#8A6A44', w: '#4F9AD0', wl: '#9CD0F2', we: '#2F70A0', t: '#3E8A3A', tb: '#2A6A2C', th: '#74B85C', tree: 'round', ol: '#1E3A1E', fl: ['#F5A3D0', '#FFFFFF', '#FFD86B', '#C9A8FF'] },
    tide: { g: '#F2DFA8', gd: '#FAECC4', gt: '#D9C38A', p: '#E2C98E', ps: '#CDB27A', pe: '#B09060', w: '#3C95DC', wl: '#A8D8FF', we: '#2A6FB0', t: '#B9C46A', tb: '#7E8A32', th: '#D8E08A', tree: 'palm', ol: '#5A4A20', fl: ['#FFFFFF', '#F5A3D0'] }
  };
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
        if (y <= 1) { R(X, Y, L, L, S.wall); R(X, Y + (y ? 12 : 0), L, y ? 4 : 2, shade(S.wall, -0.18)); for (let i = 3; i < L; i += 5) R(X + i, Y + 2, 1, y ? 10 : 14, shade(S.wall, -0.06)); if (y === 1 && T(x, 2) !== 'w' && x % 4 === 2) { R(X + 2, Y - 8, 12, 14, '#3A2E50'); R(X + 3, Y - 7, 10, 12, '#9CD0F2'); R(X + 8, Y - 7, 1, 12, '#3A2E50'); R(X + 3, Y - 2, 10, 1, '#3A2E50'); } }
        else { R(X, Y, L, L, shade(S.wall, -0.35)); R(X + (x === 0 ? L - 3 : 0), Y, 3, L, shade(S.wall, -0.5)); if (y === H - 1) R(X, Y, L, 3, shade(S.wall, -0.5)); }
        continue;
      }
      R(X, Y, L, L, S.floor); R(X, Y + 7, L, 1, shade(S.floor, -0.18)); R(X, Y + 15, L, 1, shade(S.floor, -0.18)); R(X + ((x + y) % 2 ? 4 : 11), Y, 1, 7, shade(S.floor, -0.12)); R(X + ((x + y) % 2 ? 9 : 2), Y + 8, 1, 7, shade(S.floor, -0.12));
      if (T(x, y - 1) === 'w') R(X, Y, L, 3, 'rgba(0,0,0,0.18)');
      if (rug(x, y)) { R(X, Y, L, L, S.rug); R(X, Y + 2, L, 1, shade(S.rug, 0.25)); R(X, Y + 13, L, 1, shade(S.rug, 0.25)); if (!rug(x - 1, y)) R(X, Y, 2, L, shade(S.rug, -0.3)); if (!rug(x + 1, y)) R(X + 14, Y, 2, L, shade(S.rug, -0.3)); if (!rug(x, y - 1)) R(X, Y, L, 2, shade(S.rug, -0.3)); if (!rug(x, y + 1)) R(X, Y + 14, L, 2, shade(S.rug, -0.3)); }
      if (t === 'd') { R(X + 1, Y + 4, 14, 10, '#8A5A34'); R(X + 2, Y + 5, 12, 8, '#B07A46'); }
      const ol = '#2A1E14';
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
  function terrain(M, themeId) {
    if (M.interior) return interior(M);
    const P = PAL[themeId] || PAL.town, W = M.W, H = M.H, grid = M.grid;
    const c = document.createElement('canvas'); c.width = W * L; c.height = H * L;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const r = r2(1234 + W * H);
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
        g.fillStyle = P.wl; const wy = Y + 4 + Math.floor(r() * 8), wx = X + Math.floor(r() * 8); g.fillRect(wx, wy, 4, 1); g.fillRect(wx + 1, wy - 1, 2, 1);
        if (T(x, y - 1) !== '~') { g.fillStyle = P.wl; g.fillRect(X, Y, L, 2); }
        if (T(x, y + 1) !== '~') { g.fillStyle = P.we; g.fillRect(X, Y + L - 2, L, 2); }
        continue;
      }
      g.fillStyle = P.g; g.fillRect(X, Y, L, L);
      g.fillStyle = P.gd; for (let yy = 1; yy < L; yy += 4) for (let xx = ((yy >> 2) % 2) * 2 + 1; xx < L; xx += 4) g.fillRect(X + xx, Y + yy, 1, 1);
      if (r() < 0.25) stamp(g, X + 3 + Math.floor(r() * 6), Y + 5 + Math.floor(r() * 6), ['g.g', '.g.'], { g: P.gt });
      if (t === ',') { const cols = P.fl; for (let i = 0; i < 2; i++) stamp(g, X + 2 + i * 7 + Math.floor(r() * 2), Y + 3 + Math.floor(r() * 8), FLOWER, { a: cols[Math.floor(r() * cols.length)], c: '#FFE08A', l: P.gt }); }
      if (t === 'W' || t === 'Z') {
        g.fillStyle = t === 'Z' ? P.th : P.t; g.fillRect(X, Y, L, L);
        const cl = t === 'Z' ? { h: '#FFF7D6', b: P.t, d: P.tb } : { h: P.th, b: P.t, d: P.tb };
        stamp(g, X, Y + 2, TUFT, cl); stamp(g, X + 8, Y + 2, TUFT, cl); stamp(g, X + 4, Y + 9, TUFT, cl); stamp(g, X + 12, Y + 9, TUFT, cl);
      }
    }
    // fences
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === 'F') {
      const X = x * L, Y = y * L; g.fillStyle = '#5E3C22'; g.fillRect(X + 2, Y + 4, 3, 11); g.fillRect(X + 11, Y + 4, 3, 11); g.fillStyle = '#B07A46'; g.fillRect(X, Y + 6, L, 2); g.fillRect(X, Y + 10, L, 2); g.fillStyle = '#C8955A'; g.fillRect(X + 3, Y + 4, 1, 10); g.fillRect(X + 12, Y + 4, 1, 10);
    }
    M.places.forEach((p) => place(g, p, P));
    if (M.id === 'town') { // fountain
      const fx = 21 * L, fy = 19 * L;
      g.fillStyle = '#4A5878'; g.fillRect(fx + 1, fy, 30, 32); g.fillRect(fx, fy + 1, 32, 30);
      g.fillStyle = '#B7C2D6'; g.fillRect(fx + 2, fy + 1, 28, 30); g.fillRect(fx + 1, fy + 2, 30, 28);
      g.fillStyle = '#5AA8F0'; g.fillRect(fx + 5, fy + 5, 22, 22); g.fillStyle = '#A8D8FF'; g.fillRect(fx + 7, fy + 7, 6, 1); g.fillRect(fx + 18, fy + 20, 5, 1);
      g.fillStyle = '#B7C2D6'; g.fillRect(fx + 13, fy + 13, 6, 6); g.fillStyle = '#4A5878'; g.fillRect(fx + 13, fy + 18, 6, 1);
    }
    M.signs.forEach((s) => { const X = s.x * L, Y = s.y * L; stamp(g, X + 1, Y + 2, ['oooooooooooooo', 'owwwwwwwwwwwwo', 'owkkkkkkkkkwwo', 'owwwwwwwwwwwwo', 'owkkkkkkwwwwwo', 'owwwwwwwwwwwwo', 'oooooooooooooo', '......ot......', '......ot......', '......ot......', '......ot......', '.....oooo.....'], { o: '#4A2A14', w: '#C8955A', k: '#7A4E2A', t: '#8A5A34' }); });
    // rocks & trees, row by row so lower ones overlap upper ones
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = grid[y][x], X = x * L, Y = y * L;
      if (t === 'R') { const rc = themeId === 'ember' ? { o: '#1E1414', l: '#7A6464', g: '#4E3E3E', d: '#3A2E2E' } : { o: '#3A4258', l: '#DCE2EE', g: '#A8B2C6', d: '#7E8AA2' }; g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X + 2, Y + 14, 12, 2); stamp(g, X, Y + 6, ROCK, rc); }
      if (t === 'T') { const kind = P.tree; const rows = TREE[kind]; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 3, Y + L - 2, 10, 2); stamp(g, X, Y + L - rows.length, rows, treeColors(kind, P)); }
    }
    return c;
  }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
  function place(g, p, P) {
    const X = p.x * L, Y = p.y * L, Wd = p.w * L, Hd = p.h * L;
    const ol = '#2B2235';
    if (p.kind === 'shrine') {
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 4, Y + Hd - 4, Wd - 8, 4);
      g.fillStyle = '#4A5878'; g.fillRect(X + 6, Y + 26, Wd - 12, Hd - 30); g.fillStyle = '#C9D3E6'; g.fillRect(X + 7, Y + 27, Wd - 14, Hd - 33); g.fillStyle = '#A8B4CC'; for (let i = 0; i < 6; i++) g.fillRect(X + 10 + i * 13, Y + 40 + (i % 2) * 8, 8, 1);
      [[12, 8], [Wd - 20, 8], [24, 2], [Wd - 32, 2]].forEach(([ox, oy]) => { g.fillStyle = ol; g.fillRect(X + ox - 1, Y + oy - 1, 10, 30); g.fillStyle = '#9AA6BF'; g.fillRect(X + ox, Y + oy, 8, 28); g.fillStyle = '#DCE2EE'; g.fillRect(X + ox, Y + oy, 8, 3); g.fillRect(X + ox, Y + oy, 2, 28); });
      return;
    }
    if (p.kind === 'arena') {
      g.fillStyle = ol; g.fillRect(X + 2, Y + 2, Wd - 4, Hd - 4);
      g.fillStyle = '#C2A06A'; g.fillRect(X + 3, Y + 3, Wd - 6, Hd - 6);
      g.fillStyle = '#E8D3A2'; g.fillRect(X + 9, Y + 9, Wd - 18, Hd - 18);
      g.fillStyle = '#FFFFFF'; g.fillRect(X + Wd / 2, Y + 12, 1, Hd - 24); for (let a = 0; a < 40; a++) { const ang = a / 40 * 6.283; g.fillRect(Math.round(X + Wd / 2 + Math.cos(ang) * 12), Math.round(Y + Hd / 2 + Math.sin(ang) * 12), 1, 1); }
      for (let i = 0; i < Wd - 8; i += 8) { g.fillStyle = (i / 8) % 2 ? '#D8574A' : '#3C6FE0'; g.fillRect(X + 4 + i, Y + 4, 4, 4); g.fillRect(X + 4 + i, Y + Hd - 8, 4, 4); }
      return;
    }
    if (p.kind === 'device') return; // drawn by the interior tile itself
    if (p.kind === 'gym') { // leader hall: timber hall, leader-colored emblem + banners
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, col = p.color || '#F5C542', roofH = 34;
      R(X + 2, Y + Hd - 1, Wd - 4, 3, 'rgba(0,0,0,0.22)');
      R(X + 3, Y + roofH - 4, Wd - 6, Hd - roofH + 4, ol); R(X + 4, Y + roofH - 3, Wd - 8, Hd - roofH + 2, '#C9A26A');
      for (let x = X + 4; x < X + Wd - 4; x += 12) R(x, Y + roofH - 3, 2, Hd - roofH + 2, '#9A7448');
      R(X + 4, Y + roofH + 6, Wd - 8, 2, '#9A7448');
      for (let i = 0; i < roofH; i++) { const w = Wd + 6 - Math.round(i * 0.5) * 2; R(X + Wd / 2 - w / 2 - 1, Y + roofH - i, w + 2, 1, ol); R(X + Wd / 2 - w / 2, Y + roofH - i, w, 1, i % 4 < 2 ? p.roof || '#4E8A3A' : shade(p.roof || '#4E8A3A', -0.2)); }
      R(X - 2, Y + roofH, Wd + 4, 3, shade(p.roof || '#4E8A3A', -0.35));
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
    // house
    const roofH = Math.round(Hd * 0.5);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 2, Y + Hd, Wd - 4, 2);
    g.fillStyle = ol; g.fillRect(X + 2, Y + roofH - 3, Wd - 4, Hd - roofH + 3);
    g.fillStyle = p.wall || '#F4EAD6'; g.fillRect(X + 3, Y + roofH - 2, Wd - 6, Hd - roofH + 1);
    g.fillStyle = p.wall ? shade(p.wall, -0.1) : '#E2D2B4'; for (let yy = Y + roofH + 2; yy < Y + Hd - 1; yy += 4) g.fillRect(X + 3, yy, Wd - 6, 1);
    const roof = p.roof || '#28509E', roofD = roof === '#D8574A' ? '#A8382E' : (roof === '#28509E' || !p.roof ? '#28509E' : shade(roof, -0.25)), roofL = roof === '#D8574A' ? '#F08070' : (roof === '#28509E' || !p.roof ? '#6A96F0' : shade(roof, 0.3));
    g.fillStyle = ol; g.fillRect(X - 1, Y, Wd + 2, roofH + 1);
    for (let row = 0; row < roofH; row += 3) { g.fillStyle = (row / 3) % 2 ? roof : roofD; g.fillRect(X, Y + 1 + row, Wd, 3); }
    g.fillStyle = roofL; g.fillRect(X, Y + 1, Wd, 1);
    const doorX = p.door[0] * L + L - 6;
    g.fillStyle = ol; g.fillRect(doorX - 1, Y + Hd - 14, 14, 14); g.fillStyle = '#8A5A34'; g.fillRect(doorX, Y + Hd - 13, 12, 13); g.fillStyle = '#6B4626'; g.fillRect(doorX + 5, Y + Hd - 13, 1, 13); g.fillStyle = '#FFD86B'; g.fillRect(doorX + 9, Y + Hd - 7, 1, 1);
    [[X + 8, Y + roofH + 4], [X + Wd - 22, Y + roofH + 4]].forEach(([wx, wy]) => { g.fillStyle = ol; g.fillRect(wx - 1, wy - 1, 16, 12); g.fillStyle = '#9CD3F5'; g.fillRect(wx, wy, 14, 10); g.fillStyle = '#FFFFFF'; g.fillRect(wx + 7, wy, 1, 10); g.fillRect(wx, wy + 5, 14, 1); g.fillRect(wx + 1, wy + 1, 2, 1); });
  }
  // ---- player: 16x20 sprites per direction, 3 frames ----
  const PC = { o: '#1E1A2A', h: '#2B2235', s: '#F2C9A0', e: '#1E2A4A', y: '#FFD86B', Y: '#E0A830', w: '#FFFFFF', p: '#2B2F45', b: '#F5C542', c: '#D8574A' };
  const HEAD_D = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhssssshho...', '..ohsseesesho...', '..ohssssssso....', '...ossssss o....'.replace(' ', 's'), '....oooooo......'];
  function frames(pal) {
    const C = Object.assign({}, PC, pal || {});
    const make = (dir, f) => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 20; const g = c.getContext('2d');
      let head;
      if (dir === 'down') head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhssssshho...', '..ohseesseho....', '..ohssssssho....', '...ossssss o....'.replace(' ', 'o'), '....oooooo......'];
      else if (dir === 'up') head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhhhhhhho....', '..ohhhhhhhho....', '..ohhhhhhhho....', '...ohhhhhho.....', '....oooooo......'];
      else head = ['....oooooo......', '...ohhhhhho.....', '..ohhhhhhhho....', '..ohhhhsssso....', '..ohhhsssesso...', '..ohhhsssssso...', '...ohhssssso....', '....oooooo......'];
      const bodyRows = ['...ooyyyyyoo....', '..oyywwwwwyyo...', '..oyyyyyyyyyo...', '..osyyyyyyyso...', '...oyyyyyyyo....', '....oppoppo.....'];
      const legs = [['....opo.opo.....', '....opo.opo.....', '....obo.obo.....', '....ooo.ooo.....'], ['....opo..opo....', '...opo...opo....', '...obo....obo...', '...ooo....ooo...'], ['.....opo.opo....', '....opo...opo...', '....obo...obo...', '....ooo...ooo...']][f];
      let rows = head.concat(bodyRows, legs);
      if (C.cap) { rows = rows.map((r, i) => (i < 3 ? r.replace(/h/g, 'c') : r)); rows[3] = rows[3].replace(/^(..o)hh/, '$1cc').replace(/^(..o)h/, '$1c'); }
      if (dir === 'left') { const flip = rows.map((r) => r.split('').reverse().join('')); stamp(g, 0, 0, flip, C); }
      else stamp(g, 0, 0, rows, C);
      return c;
    };
    const out = {}; ['down', 'up', 'left', 'right'].forEach((d) => { out[d] = [0, 1, 2].map((f) => make(d, f)); }); return out;
  }
  return { L, PAL, terrain, frames };
})();
