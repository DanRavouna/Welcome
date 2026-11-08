// WEATHER: local weather per area, picked from the local date + a 6-hour block + the area's climate.
// Nothing is saved: every device works out the same sky from the clock. Visual + a small encounter tilt; battles are unchanged.
const WEATHER = (() => {
  const BLOCK_H = 6; // weather changes at 00:00, 06:00, 12:00 and 18:00 local time
  const TILT = 0.2;  // chance that a wild encounter is swapped to the weather's type (like the night Dusk rule)
  const KINDS = {
    clear: { label: 'Clear', type: null },
    sun: { label: 'Sunny', type: 'Bloom' },
    rain: { label: 'Rain', type: 'Tide' },
    storm: { label: 'Thunderstorm', type: 'Volt' },
    snow: { label: 'Snow', type: 'Frost' },
    fog: { label: 'Fog', type: 'Dusk' },
    ash: { label: 'Ashfall', type: 'Stone' }
  };
  // weights out of 100 per climate
  const CLIMATE = {
    town: { clear: 55, sun: 15, rain: 18, fog: 7, storm: 5 },
    moss: { clear: 40, sun: 10, rain: 28, fog: 17, storm: 5 },
    frost: { clear: 40, snow: 45, fog: 15 },
    ember: { clear: 45, sun: 25, ash: 22, storm: 8 },
    tide: { clear: 45, sun: 15, rain: 22, fog: 8, storm: 10 },
    peak: { clear: 45, snow: 35, fog: 20 }
  };
  // a route's climate is the average of the two areas it joins
  const ROUTE_MIX = { 'route-mf': ['moss', 'frost'], 'route-cm': ['ember', 'moss'], 'route-fc': ['frost', 'tide'], 'route-cc': ['tide', 'ember'] };
  Object.keys(ROUTE_MIX).forEach((r) => { const c = {}; ROUTE_MIX[r].forEach((k) => { const w = CLIMATE[k]; Object.keys(w).forEach((x) => { c[x] = (c[x] || 0) + w[x] / 2; }); }); CLIMATE[r] = c; });
  // cities share the sky of the zone next to them
  const REGION = { descent: 'ember', ascent: 'peak', town: 'town', arena: 'moss', peak: 'peak', moss: 'moss', mossbrook: 'moss', frost: 'frost', frosthold: 'frost', ember: 'ember', cinderport: 'ember', tide: 'tide', coralbay: 'tide' };
  function region(mapId) { return REGION[mapId] || (CLIMATE[mapId] ? mapId : null) || (typeof mapId === 'string' && mapId.indexOf('route-') === 0 && mapId.length > 8 ? region(mapId.slice(0, 8)) : null); }   // a route's side maps share its sky
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  function blockOf(d) { return Math.floor(d.getHours() / BLOCK_H); }
  function key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + '#' + blockOf(d); }
  // kind for an area at a time (indoor maps and unknown maps: null)
  function at(mapId, date) {
    const r = region(mapId); if (!r) return null;
    const d = date || new Date(), w = CLIMATE[r], u = hash(key(d) + '|' + r) * 100;
    let acc = 0; const ks = Object.keys(w);
    for (let i = 0; i < ks.length; i++) { acc += w[ks[i]]; if (u < acc) return ks[i]; }
    return ks[ks.length - 1];
  }
  // when the current block ends (Date)
  function nextChange(date) { const d = new Date((date || new Date()).getTime()); d.setHours((blockOf(d) + 1) * BLOCK_H, 0, 0, 0); return d; }
  // encounter tilt: returns the info to use (pure; rand defaults to Math.random)
  function tilt(info, kind, rand) {
    const t = kind && KINDS[kind] && KINDS[kind].type;
    if (!t || Number.isInteger(info.seed) || (info.types || []).indexOf(t) !== -1) return info;
    return (rand || Math.random)() < TILT ? Object.assign({}, info, { types: [t], weather: kind }) : info;
  }

  // ---------- drawing (screen space, pixel style; the world calls draw() every frame) ----------
  let cur = null, k = 0, want = null, lastMap = null, parts = [], flashT = 0, boltIn = 8, lastT = 0, ws = 0;   // ws: the map's wind strength 0..1 (from the world, smoothed over 1.5 s): every particle takes its sideways motion from it, so where the wind is zero (the cold) snow falls slowly and straight
  const OVER = { rain: 'rgba(30,50,95,', storm: 'rgba(20,28,60,', snow: 'rgba(225,236,255,', fog: 'rgba(214,222,232,', sun: 'rgba(255,214,110,', ash: 'rgba(80,62,54,' };
  const OVER_A = { rain: 0.16, storm: 0.28, snow: 0.12, fog: 0.26, sun: 0.09, ash: 0.16 };
  function spawn(kind, vw, vh) {
    const area = vw * vh, n = Math.min({ rain: 170, storm: 220, snow: 120, fog: 7, sun: 16, ash: 70 }[kind] || 0, Math.round(area / ({ rain: 2400, storm: 1900, snow: 3200, fog: 60000, sun: 24000, ash: 5500 }[kind] || 1e9)));
    parts = [];
    for (let i = 0; i < n; i++) {
      const p = { x: Math.random() * (vw + 80), y: Math.random() * (vh + 80), s: Math.random() };
      if (kind === 'fog') { p.w = 160 + Math.random() * 220; p.h = 18 + Math.round(Math.random() * 3) * 8; p.v = 6 + Math.random() * 10; }
      if (kind === 'ash') p.ember = Math.random() < 0.18;
      parts.push(p);
    }
  }
  const mod = (a, m) => ((a % m) + m) % m;
  // o = { kind, mapId, vw, vh, cx, cy, t, still }
  function draw(ctx, o) {
    const dt = Math.min(0.05, Math.max(0, o.t - lastT)); lastT = o.t;
    if (o.mapId !== lastMap) { lastMap = o.mapId; cur = o.kind; want = o.kind; k = o.kind ? 1 : 0; parts = []; ws = o.wind || 0; }
    ws += ((o.wind || 0) - ws) * Math.min(1, dt / 1.5); const wf = Math.min(1, ws * 2);   // wf: how much flutter and sway there is (none at all in still air)
    want = o.kind;
    if (want !== cur) { k -= dt / 1.5; if (k <= 0) { k = 0; cur = want; parts = []; } } // fade out, then switch
    else if (cur && k < 1) k = Math.min(1, k + dt / 1.5);
    if (!cur || cur === 'clear' || k <= 0) return;
    const vw = o.vw, vh = o.vh, W = vw + 80, H = vh + 80;
    ctx.fillStyle = OVER[cur] + (OVER_A[cur] * k).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh);
    if (o.still) return; // reduced motion: the colour wash only
    if (!parts.length) spawn(cur, vw, vh);
    const ox = -o.cx, oy = -o.cy, a = k;
    if (cur === 'rain' || cur === 'storm') {
      const fast = cur === 'storm' ? 1.25 : 1, slant = 0.03 + ws * (cur === 'storm' ? 0.55 : 0.4);   // leans down and to the east with the wind, nearly straight in calm air
      ctx.fillStyle = 'rgba(205,222,255,' + (0.5 * a).toFixed(3) + ')';
      parts.forEach((p) => {
        p.y += dt * (520 + p.s * 260) * fast; p.x += dt * (520 + p.s * 260) * fast * slant;
        if (p.y > H) { p.y -= H; p.x = Math.random() * W; }
        const x = Math.round(mod(p.x + ox, W) - 40) & ~1, y = Math.round(mod(p.y + oy, H) - 40) & ~1, len = p.s > 0.6 ? 12 : 8;
        for (let j = 0; j < len; j += 2) ctx.fillRect(x + Math.round((j - len) * slant / 2) * 2, y + j, 2, 2);
        if (p.s > 0.93 && mod(p.y + oy, H) > vh * 0.3) ctx.fillRect(x - 4, y + len + 4, 2, 2), ctx.fillRect(x + 4, y + len + 4, 2, 2);
      });
      if (cur === 'storm') { // a soft sky flash every 9-18 s (well under the 3-per-second photosensitivity limit)
        boltIn -= dt; if (boltIn <= 0) { boltIn = 9 + Math.random() * 9; flashT = 0.3; }
        if (flashT > 0) { flashT -= dt; ctx.fillStyle = 'rgba(235,240,255,' + (Math.max(0, flashT) * 0.7 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, vw, vh); }
      }
    } else if (cur === 'snow') {
      parts.forEach((p) => {
        p.y += dt * (28 + p.s * 40) * (0.55 + 0.45 * wf); p.x += ws * (40 + p.s * 50) * dt + Math.sin(o.t * (0.8 + p.s) + p.s * 9) * dt * 18 * wf;   // slow and dead straight in still air
        if (p.y > H) { p.y -= H; p.x = Math.random() * W; }
        const x = Math.round(mod(p.x + ox, W) - 40) & ~1, y = Math.round(mod(p.y + oy, H) - 40) & ~1, big = p.s > 0.7;
        ctx.fillStyle = 'rgba(255,255,255,' + ((big ? 0.95 : 0.75) * a).toFixed(3) + ')';
        if (big) { ctx.fillRect(x, y - 2, 2, 6); ctx.fillRect(x - 2, y, 6, 2); } else ctx.fillRect(x, y, 2, 2);
      });
    } else if (cur === 'fog') {
      parts.forEach((p, i) => {
        p.x += dt * p.v * (0.1 + ws * 1.1);
        const x = Math.round(mod(p.x + ox * 0.6, W + p.w) - p.w) & ~1, y = Math.round(mod(p.y + oy * 0.6, H) - 40) & ~1;
        ctx.fillStyle = 'rgba(236,240,246,' + ((0.16 + (i % 3) * 0.04) * a).toFixed(3) + ')';
        ctx.fillRect(x, y, p.w, p.h); ctx.fillRect(x + 16, y - 8, p.w - 32, 8); ctx.fillRect(x + 16, y + p.h, p.w - 32, 8);
      });
    } else if (cur === 'sun') { // slow drifting pollen motes
      parts.forEach((p) => {
        p.y -= dt * (6 + p.s * 8); p.x += Math.sin(o.t * 0.6 + p.s * 7) * dt * 8 * wf + ws * 10 * dt;
        if (p.y < 0) p.y += H;
        const x = Math.round(mod(p.x + ox, W) - 40) & ~1, y = Math.round(mod(p.y + oy, H) - 40) & ~1, on = Math.sin(o.t * 2 + p.s * 20) > -0.2;
        if (!on) return;
        ctx.fillStyle = 'rgba(255,240,170,' + (0.85 * a).toFixed(3) + ')'; ctx.fillRect(x, y, 2, 2);
        if (p.s > 0.6) { ctx.fillStyle = 'rgba(255,214,107,' + (0.6 * a).toFixed(3) + ')'; ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 2, y, 2, 2); ctx.fillRect(x, y - 2, 2, 2); ctx.fillRect(x, y + 2, 2, 2); }
      });
    } else if (cur === 'ash') {
      parts.forEach((p) => {
        if (p.ember) { p.y -= dt * (20 + p.s * 24); if (p.y < 0) { p.y += H; p.x = Math.random() * W; } }
        else { p.y += dt * (24 + p.s * 26); if (p.y > H) { p.y -= H; p.x = Math.random() * W; } }
        p.x += (Math.sin(o.t * 0.9 + p.s * 11) * 10 * wf + ws * 30) * dt;
        const x = Math.round(mod(p.x + ox, W) - 40) & ~1, y = Math.round(mod(p.y + oy, H) - 40) & ~1;
        ctx.fillStyle = p.ember ? 'rgba(255,150,70,' + ((0.6 + 0.4 * Math.sin(o.t * 6 + p.s * 30)) * a).toFixed(3) + ')' : 'rgba(170,160,156,' + (0.8 * a).toFixed(3) + ')';
        ctx.fillRect(x, y, 2, 2); if (!p.ember && p.s > 0.75) ctx.fillRect(x + 2, y, 2, 2);
      });
    }
  }
  // small pixel icon (inline SVG, 18px) for the HUD location sign
  const ICON = {
    sun: '<rect x="7" y="7" width="10" height="10" fill="#FFD86B"/><rect x="11" y="2" width="2" height="3" fill="#FFD86B"/><rect x="11" y="19" width="2" height="3" fill="#FFD86B"/><rect x="2" y="11" width="3" height="2" fill="#FFD86B"/><rect x="19" y="11" width="3" height="2" fill="#FFD86B"/><rect x="4" y="4" width="2" height="2" fill="#FFD86B"/><rect x="18" y="4" width="2" height="2" fill="#FFD86B"/><rect x="4" y="18" width="2" height="2" fill="#FFD86B"/><rect x="18" y="18" width="2" height="2" fill="#FFD86B"/>',
    rain: '<rect x="5" y="5" width="12" height="6" fill="#E8EEF8"/><rect x="3" y="8" width="18" height="5" fill="#E8EEF8"/><rect x="6" y="15" width="2" height="4" fill="#5BA8FF"/><rect x="11" y="16" width="2" height="4" fill="#5BA8FF"/><rect x="16" y="15" width="2" height="4" fill="#5BA8FF"/>',
    storm: '<rect x="5" y="4" width="12" height="6" fill="#B8C2D6"/><rect x="3" y="7" width="18" height="5" fill="#B8C2D6"/><rect x="11" y="12" width="4" height="3" fill="#FFD86B"/><rect x="9" y="15" width="4" height="3" fill="#FFD86B"/><rect x="11" y="18" width="2" height="3" fill="#FFD86B"/>',
    snow: '<rect x="11" y="3" width="2" height="18" fill="#FFFFFF"/><rect x="3" y="11" width="18" height="2" fill="#FFFFFF"/><rect x="6" y="6" width="2" height="2" fill="#FFFFFF"/><rect x="16" y="6" width="2" height="2" fill="#FFFFFF"/><rect x="6" y="16" width="2" height="2" fill="#FFFFFF"/><rect x="16" y="16" width="2" height="2" fill="#FFFFFF"/><rect x="9" y="5" width="6" height="2" fill="#FFFFFF"/><rect x="9" y="17" width="6" height="2" fill="#FFFFFF"/>',
    fog: '<rect x="3" y="6" width="16" height="3" fill="#E8EEF8"/><rect x="6" y="11" width="15" height="3" fill="#E8EEF8"/><rect x="3" y="16" width="14" height="3" fill="#E8EEF8"/>',
    ash: '<rect x="5" y="5" width="12" height="6" fill="#8E8480"/><rect x="3" y="8" width="18" height="5" fill="#8E8480"/><rect x="6" y="16" width="2" height="2" fill="#B8AEA8"/><rect x="12" y="18" width="2" height="2" fill="#FF9646"/><rect x="17" y="15" width="2" height="2" fill="#B8AEA8"/>'
  };
  function icon(kind) { return ICON[kind] ? '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">' + ICON[kind] + '</svg>' : ''; }
  return { _parts: () => parts.map((p) => ({ x: p.x, y: p.y })), _wind: () => ws, at, nextChange, tilt, draw, icon, region, KINDS, CLIMATE, TILT, BLOCK_H, _state: () => ({ cur, k, parts: parts.length }) };
})();
