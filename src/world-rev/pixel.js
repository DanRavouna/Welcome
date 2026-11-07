// ---- PIX: turns the game's critter geometry into pixel-art sprites ----
const PIX = (() => {
  const cache = new Map();
  function parseColor(str) {
    if (!str) return [0, 0, 0, 0];
    str = str.trim();
    if (str[0] === '#') { const n = parseInt(str.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    return [0, 0, 0, 0];
  }
  const css = (c) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')';
  function radii(str, w, h) {
    const [hs, vs] = String(str).split('/');
    const expand = (s) => { const t = s.trim().split(/\s+/); if (t.length === 1) return [t[0], t[0], t[0], t[0]]; if (t.length === 2) return [t[0], t[1], t[0], t[1]]; if (t.length === 3) return [t[0], t[1], t[2], t[1]]; return t; };
    const H = expand(hs), V = expand(vs || hs);
    const val = (tok, size) => tok.endsWith('%') ? parseFloat(tok) / 100 * size : parseFloat(tok) || 0;
    const r = [0, 1, 2, 3].map((i) => ({ x: val(H[i], w), y: val(V[i], h) }));
    const f = Math.min(1, w / ((r[0].x + r[1].x) || 1), w / ((r[3].x + r[2].x) || 1), h / ((r[0].y + r[3].y) || 1), h / ((r[1].y + r[2].y) || 1));
    r.forEach((q) => { q.x = Math.max(0.01, q.x * f); q.y = Math.max(0.01, q.y * f); });
    return r;
  }
  function shape(g, x, y, w, h, rad, rot) {
    const [tl, tr, br, bl] = radii(rad, w, h);
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((rot || 0) * Math.PI / 180); g.translate(-w / 2, -h / 2);
    g.beginPath(); g.moveTo(tl.x, 0); g.lineTo(w - tr.x, 0); g.ellipse(w - tr.x, tr.y, tr.x, tr.y, 0, -Math.PI / 2, 0);
    g.lineTo(w, h - br.y); g.ellipse(w - br.x, h - br.y, br.x, br.y, 0, 0, Math.PI / 2);
    g.lineTo(bl.x, h); g.ellipse(bl.x, h - bl.y, bl.x, bl.y, 0, Math.PI / 2, Math.PI);
    g.lineTo(0, tl.y); g.ellipse(tl.x, tl.y, tl.x, tl.y, 0, Math.PI, Math.PI * 1.5); g.closePath();
    g.restore();
  }
  const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), 1];
  // ---- facings (Dan, Nov 2026: eight directions, a real second drawing from the same parts, not a flip of the front) ----
  // Every facing is the critter's own geometry re-arranged: the back shows the parts mirrored with no face and the tail in front of the body; the profile is the body narrowed to 0.8 with one eye and the mouth at the far edge and the tail behind; the quarter views sit between (0.92 wide, the face shifted toward the facing). Left facings mirror the right ones.
  const FACE = { down: { c: 1, mirror: false, face: 'front' }, up: { c: 1, mirror: true, face: 'none', tailFront: true }, right: { c: 0.8, mirror: false, face: 'side', tailBack: true }, left: { c: 0.8, mirror: true, face: 'side', tailBack: true },
    downright: { c: 0.92, mirror: false, face: 'quarter' }, downleft: { c: 0.92, mirror: true, face: 'quarter' }, upright: { c: 0.92, mirror: true, face: 'none', sliver: true, tailFront: true }, upleft: { c: 0.92, mirror: false, face: 'none', sliver: true, tailFront: true } };   // sliver: the outer third of one eye shows at the far edge of the back quarter, clipped by the body
  const mirrorR = (r) => String(r).split(' / ').map((s) => { const t = s.trim().split(/\s+/); if (t.length === 1) return t[0]; if (t.length === 2) return t[1] + ' ' + t[0]; if (t.length === 3) return t[1] + ' ' + t[0] + ' ' + t[1]; return t[1] + ' ' + t[0] + ' ' + t[3] + ' ' + t[2]; }).join(' / ');
  function geometry(k, facing) {
    const F = FACE[facing] || FACE.down, c = F.c, body = k.body, isTail = (p) => p.x + p.w / 2 > body.x + body.w * 0.72 && p.y + p.h / 2 > body.y + body.h * 0.35;
    const tx = (p, flip) => { let x = 120 + (p.x + p.w / 2 - 120) * c - p.w * c / 2, w = p.w * c, r = p.r, rot = p.rot || 0; if (flip) { x = 240 - x - w; r = mirrorR(r); rot = -rot; } return Object.assign({}, p, { x: x, w: w, r: r, rot: rot }); };
    const parts = (k.parts || []).map((p) => tx(p, F.mirror !== !!(F.tailBack && isTail(p)))), over = (k.over || []).map((p) => tx(p, F.mirror)), bodyT = tx(body, F.mirror), belly = tx(k.belly, F.mirror), mouth = tx(k.mouth, F.mirror), eyeRow = tx(k.eyeRow, F.mirror);
    const back = parts.filter((p, i) => !(F.tailFront && isTail((k.parts || [])[i]))), front = parts.filter((p, i) => F.tailFront && isTail((k.parts || [])[i]));
    return { F: F, back: back, front: front, over: over, body: bodyT, belly: belly, mouth: mouth, eyeRow: eyeRow, shift: (F.face === 'quarter' ? 0.1 : (F.face === 'side' ? 0.28 : 0)) * bodyT.w * (F.mirror ? -1 : 1) };
  }
  function draw(k, S, mode, facing) {
    const Wd = Math.round(240 * S), Ht = Math.round(210 * S), G = geometry(k, facing || 'down'), F = G.F;
    const c = document.createElement('canvas'); c.width = Wd; c.height = Ht;
    const g = c.getContext('2d'); g.scale(S, S);
    const body = parseColor(k.bodyColor), ink = parseColor('#1E2340');
    const fillOf = (bg) => (typeof bg === 'string' && bg.indexOf('gradient') !== -1) ? body : parseColor(bg);
    const partFill = (p) => { if (p.bw === 0 && /rgba\(255,216,77/.test(p.bg)) return; const col = fillOf(p.bg); g.fillStyle = css(col); shape(g, p.x, p.y, p.w, p.h, p.r, p.rot); g.fill(); };
    G.back.forEach(partFill);
    g.fillStyle = css(body); shape(g, G.body.x, G.body.y, G.body.w, G.body.h, G.body.r, 0); g.fill();
    if (F.face !== 'none') { g.fillStyle = k.bellyBg; g.beginPath(); g.ellipse(G.belly.x + G.belly.w / 2 + G.shift * 0.6, G.belly.y + G.belly.h / 2, G.belly.w / 2 * (F.face === 'side' ? 0.7 : 1), G.belly.h / 2, 0, 0, 6.3); g.fill(); }
    else { const lo2 = mix(body, [0, 0, 0], 0.18); g.fillStyle = css(lo2); g.beginPath(); g.ellipse(G.body.x + G.body.w / 2, G.body.y + G.body.h * 0.42, G.body.w * 0.1, G.body.h * 0.3, 0, 0, 6.3); g.fill(); }   // from behind: no face, a darker line down the back
    G.front.forEach(partFill);
    if (F.face !== 'none') G.over.forEach((o) => { g.fillStyle = o.bg; shape(g, o.x, o.y, o.w, o.h, o.r, o.rot); g.fill(); });
    if (F.sliver && k.eyes.length) { const s0 = k.eyes[0].s, cxS = G.body.x + G.body.w * (F.mirror ? 0.04 : 0.96), cyS = k.eyeRow.y + s0 / 2; g.save(); shape(g, G.body.x, G.body.y, G.body.w, G.body.h, G.body.r, 0); g.clip(); g.fillStyle = css(ink); g.beginPath(); g.arc(cxS + (F.mirror ? -s0 * 0.22 : s0 * 0.22), cyS, s0 / 2, 0, 6.3); g.fill(); g.restore(); }   // the back quarter: a sliver of one eye at the far edge
    const eyesDrawn = F.face === 'none' ? [] : (F.face === 'side' ? [k.eyes[k.eyes.length - 1]] : k.eyes);
    const n = eyesDrawn.length, s = n ? k.eyes[0].s : 0, total = n * s + (n - 1) * 8, sx = (F.face === 'side' ? G.body.x + G.body.w * (F.mirror ? 0.2 : 0.8) - s / 2 : G.eyeRow.x + (G.eyeRow.w - total) / 2 + G.shift);
    eyesDrawn.forEach((e, i) => {
      const ex = sx + i * (s + 8), ey = k.eyeRow.y, cxE = ex + s / 2, cyE = ey + s / 2;
      g.fillStyle = css(ink); g.beginPath(); g.arc(cxE, cyE, s / 2, 0, 6.3); g.fill();
      if (mode === 'icon') return;
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cxE, cyE, s / 2 - 3.5, 0, 6.3); g.fill();
      const ps = e.ps, px = k.look === 'flex-start' ? ex + 5 + ps / 2 : (k.look === 'flex-end' ? ex + s - 5 - ps / 2 : cxE);
      g.fillStyle = css(ink); g.beginPath(); g.arc(px, cyE, ps / 2 + (mode === 'icon' ? 1.5 : 0.5), 0, 6.3); g.fill();
      if (mode === 'big') { g.fillStyle = '#FFFFFF'; g.fillRect(px - ps / 2 + 0.5, cyE - ps / 2 + 0.5, Math.max(4, ps * 0.4), Math.max(4, ps * 0.4)); }
    });
    const m = Object.assign({}, G.mouth, { x: G.mouth.x + G.shift * (F.face === 'side' ? 0.9 : 0.8), w: G.mouth.w * (F.face === 'side' ? 0.6 : 1) });
    g.fillStyle = css(ink);
    if (F.face === 'none') {}
    else if (m.bg === 'transparent') { g.lineWidth = 4; g.strokeStyle = css(ink); g.beginPath(); g.ellipse(m.x + m.w / 2, m.y, m.w / 2, m.h, 0, 0.15, Math.PI - 0.15); g.stroke(); }
    else if (m.bg === '#FFFFFF') { g.fillRect(m.x, m.y, m.w, m.h); g.fillStyle = '#FFFFFF'; g.fillRect(m.x + 3, m.y + 2, m.w - 6, m.h - 5); }
    else { g.beginPath(); g.ellipse(m.x + m.w / 2, m.y + m.h / 2, m.w / 2 + 1, Math.max(2.5, m.h / 2 + 1), 0, 0, 6.3); g.fill(); }
    // ---- pixel pass ----
    const img = g.getImageData(0, 0, Wd, Ht), d = img.data;
    const at = (x, y) => (x < 0 || y < 0 || x >= Wd || y >= Ht) ? 0 : d[(y * Wd + x) * 4 + 3];
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 120) { d[i + 3] = 0; } else d[i + 3] = 255; }
    const outline = parseColor(k.outline || '#1E2340');
    const near = (i, col, tol) => Math.abs(d[i] - col[0]) + Math.abs(d[i + 1] - col[1]) + Math.abs(d[i + 2] - col[2]) < tol;
    if (mode === 'silhouette') {
      for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { d[i] = 70; d[i + 1] = 84; d[i + 2] = 122; }
    } else if (mode === 'icon') {
      const light = [255, 248, 232];
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        const col = lum < 0.22 ? outline : (lum > 0.82 ? light : body);
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
      }
    } else {
      const hi = mix(body, [255, 255, 255], 0.35), lo = mix(body, [0, 0, 0], 0.22);
      const copy = new Uint8ClampedArray(d);
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        const i = (y * Wd + x) * 4; if (!copy[i + 3] || !near(i, body, 60)) continue;
        const up = at(x, y - 1), left = at(x - 1, y), down = at(x, y + 1), right = at(x + 1, y), down2 = at(x, y + 2);
        let col = null;
        if (!up || !left) col = hi; else if (!down || !right || !down2) col = lo;
        if (col) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
      }
    }
    // outline around the whole sprite
    const ol = mode === 'silhouette' ? [43, 53, 85, 1] : outline, mark = [];
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { if (at(x, y)) continue; if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) mark.push((y * Wd + x) * 4); }
    mark.forEach((i) => { d[i] = ol[0]; d[i + 1] = ol[1]; d[i + 2] = ol[2]; d[i + 3] = 255; });
    // mythic sparkles as crisp pixels
    if (mode === 'big' && k.fx) k.fx.forEach((f) => {
      const fx0 = F.mirror ? 240 - f.x - f.s : f.x, x0 = Math.round((fx0 + f.s / 2) * S), y0 = Math.round((f.y + f.s / 2) * S);   // the sparkles turn with the facing
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const x = x0 + a, y = y0 + b; if (x >= 0 && y >= 0 && x < Wd && y < Ht) { const i = (y * Wd + x) * 4; const isC = a === 0 && b === 0; d[i] = 255; d[i + 1] = isC ? 255 : 216; d[i + 2] = isC ? 255 : 107; d[i + 3] = 255; } });
    });
    g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(img, 0, 0);
    return c.toDataURL();
  }
  function sprite(k, mode, facing) {
    mode = mode || 'big'; facing = facing || 'down';
    const key = k.seed + ':' + k.stage + ':' + mode + ':' + facing;
    if (!cache.has(key)) cache.set(key, draw(k, mode === 'big' ? 0.25 : 0.075, mode, facing));
    return cache.get(key);
  }
  // what a facing does to a critter, for tests: how many eyes it draws, whether it is mirrored, how wide the body is, how many parts sit in front of the body
  const plan = (k, facing) => { const G = geometry(k, facing || 'down'); return { face: G.F.face, eyes: G.F.face === 'none' ? 0 : (G.F.face === 'side' ? 1 : k.eyes.length), sliver: !!G.F.sliver, mirror: !!G.F.mirror, bodyW: Math.round(G.body.w), front: G.front.length, back: G.back.length }; };
  return { sprite, radii, parseColor, plan, FACINGS: Object.keys(FACE) };
})();
