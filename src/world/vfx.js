// ---- VFX: procedural pixel-art attack effects (no image files). Built from the usual recipe for 2D combat feedback:
//   slash = a short crescent sweep with a white-hot core, a trailing echo and a dithered fade; impact = flash -> burst -> ring -> sparks;
//   plus particles, hit-stop (a 2-5 frame freeze that scales with the blow), directional screen shake, status icons and an afterimage on the lunge.
// Frames are generated once per (element, direction, size) into small canvases (1 art pixel = 2 screen pixels, like the rest of the game) and drawn like sprite sheets.
// Everything respects Settings > Reduce motion: no shake, no hit-stop, fewer particles.
const VFX = (() => {
  const TAU = Math.PI * 2, cache = {}, BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  let calmFn = () => false, FXL = [], PT = [], shakeA = 0, shakeX = 0, shakeY = 0, freezeT = 0;
  const calm = () => { try { return !!calmFn(); } catch (e) { return false; } };
  const rgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
  const css = (c) => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  // core, light, base, dark: the four shades every effect of an element is painted with
  const ramp = (hex) => { const b = rgb(hex); return [[255, 255, 255], mix(b, [255, 255, 255], 0.55), b, mix(b, [20, 10, 40], 0.45)]; };
  const hash = (n) => { n = Math.imul(n ^ (n >>> 15), 0x2C1B3C6D); n = Math.imul(n ^ (n >>> 12), 0x297A2D39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
  const noise = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), a = hash(i * 31 + s), b = hash((i + 1) * 31 + s); return a + (b - a) * u; };
  const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // how each element bends the basic crescent: (radius, width, angle-along-arc, frame) -> [radius, width]
  const MOD = {
    Ember: (r, w, d, i) => [r + 1.6 * noise(d * 3 + i, 9) - 0.8, w * (0.7 + 0.7 * noise(d * 5 + i * 1.7, 3))],            // licking flame edge
    Tide:  (r, w, d, i) => [r + 1.7 * Math.sin(d * 8 + i * 1.3), w * 0.95],                                              // a wave
    Moss:  (r, w, d) => [r + 1.1 * Math.sin(d * 4.5), w * (((d * 2.6) % 1 + 1) % 1 < 0.14 ? 1.9 : 0.85)],               // vine with leaf nubs
    Volt:  (r, w, d, i) => [r + (hash(Math.round(d * 9) + i * 13) - 0.5) * 4.4, w * 0.6],                                // jagged bolt
    Frost: (r, w, d) => [r, w * (0.55 + 1.0 * Math.abs((((d * 4) % 1) + 1) % 1 - 0.5) * 2)],                             // crystal facets
    Dusk:  (r, w) => [r, w * 0.6],                                                                                       // drawn as a double arc below
    Stone: (r, w) => [Math.round(r / 3) * 3, w * 1.2],                                                                   // blocky
    Bloom: (r, w, d) => [r, w * (0.75 + 0.55 * Math.abs(Math.sin(d * 7)))]                                               // petal swells
  };

  // ---- the slash: 5 frames of a crescent sweeping across +-span around direction `ang`
  function slashSet(el, hex, di, big) {
    const key = 's|' + el + '|' + di + '|' + big; if (cache[key]) return cache[key];
    const S = big ? 92 : 72, C = S / 2, R = big ? 30 : 22, W = big ? 9.5 : 6.4, span = big ? 1.4 : 1.2, N = 5, ang = di * Math.PI / 8, rp = ramp(hex), mod = MOD[el] || MOD.Ember, frames = [];
    for (let i = 0; i < N; i++) {
      const cv = canvas(S, S), g = cv.getContext('2d'), im = g.createImageData(S, S), d = im.data, head = -span + 2 * span * Math.min(1, (i + 1) / (N - 2.2)), fade = Math.max(0, (i - (N - 3)) / 2.2);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - C, dy = y + 0.5 - C, rho = Math.hypot(dx, dy); if (rho < R - W * 1.8 || rho > R + W * 1.8) continue;
        const dl = wrap(Math.atan2(dy, dx) - ang); if (Math.abs(dl) > span + 0.05) continue;
        const age = (head - dl) / (span * 1.9); if (age < 0 || age > 1) continue;
        const r0 = R * (1 + 0.1 * dl / span), w0 = W * Math.pow(1 - age, 0.42), m = mod(r0, w0, dl, i), rc = m[0], wd = Math.max(0.6, m[1]);
        let bd = Math.abs(rho - rc) / wd; if (el === 'Dusk') bd = Math.min(Math.abs(rho - (rc + 3.4)), Math.abs(rho - (rc - 3.4))) / (wd * 0.9);
        if (bd > 1) continue;
        const bay = BAY[(x & 3) + ((y & 3) << 2)] / 16; if (fade > 0 && bay < fade) continue; if (age > 0.8 && bay < (age - 0.8) / 0.2 * 0.8) continue;
        const col = bd < 0.3 && age < 0.65 ? rp[0] : (bd < 0.62 ? rp[1] : (age > 0.82 ? rp[3] : rp[2])), o = (y * S + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
      }
      g.putImageData(im, 0, 0); frames.push(cv);
    }
    return (cache[key] = { frames: frames, S: S, dur: 0.24 });
  }
  // ---- the impact: flash, element burst, ring, scattered sparks (non-directional)
  function impactSet(el, hex, big) {
    const key = 'i|' + el + '|' + big; if (cache[key]) return cache[key];
    const sc = big ? 1.45 : 1, S = Math.round(46 * sc), C = S / 2, rp = ramp(hex), N = 5, frames = [];
    const rays = { Frost: 6, Bloom: 5, Dusk: 4, Stone: 0, Volt: 8, Ember: 8, Tide: 8, Moss: 7 }[el] || 8;
    for (let i = 0; i < N; i++) {
      const cv = canvas(S, S), g = cv.getContext('2d'), im = g.createImageData(S, S), d = im.data;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - C, dy = y + 0.5 - C, rho = Math.hypot(dx, dy), th = Math.atan2(dy, dx), bay = BAY[(x & 3) + ((y & 3) << 2)] / 16; let col = null;
        if (i === 0) { if (rho < 6 * sc) col = rp[0]; else if (rho < 9 * sc && bay > 0.35) col = rp[1]; }
        else if (i === 1 || i === 2) {
          const L = (i === 1 ? 14 : 18) * sc; if (rays) { const k = TAU / rays, a = ((((th % k) + k) % k)) - k / 2; let lat = Math.abs(a) * rho; if (el === 'Volt') lat += (hash(Math.floor(rho / 3) + Math.floor(th / k)) - 0.5) * 2.6 * (rho / L);
            const hw = 2.1 * sc * (1 - rho / L) + 0.4; if (rho < L && lat < hw) col = rho / L < 0.4 ? rp[0] : (rho / L < 0.75 ? rp[1] : rp[2]); }
          else { const h = hash(Math.floor((x + i * 7) / 4) * 53 + Math.floor((y + i * 3) / 4)); if (rho > 6 * sc && rho < L && h > 0.72) col = h > 0.9 ? rp[1] : rp[3]; }   // Stone: blocky chunks
          if (!col && rho > 9 * sc && rho < 12.5 * sc && i === 2 && bay > 0.4) col = rp[1];
        } else if (i === 3) { const r1 = 16 * sc; if (Math.abs(rho - r1) < 1.5 * sc && bay > 0.3) col = rp[2]; else if (Math.abs(rho - r1 * 0.7) < 1 * sc && bay > 0.7) col = rp[1]; }
        else { const h = hash(Math.floor(x / 3) * 91 + Math.floor(y / 3) * 17 + 5); if (rho > 10 * sc && rho < 21 * sc && h > 0.93) col = rp[h > 0.97 ? 1 : 2]; }
        if (col) { const o = (y * S + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
      }
      g.putImageData(im, 0, 0); frames.push(cv);
    }
    return (cache[key] = { frames: frames, S: S, dur: 0.3 });
  }
  // ---- small sprites: projectiles, status icons, the shield
  function orb(el, hex) {
    const key = 'o|' + el; if (cache[key]) return cache[key];
    const S = 14, C = 7, rp = ramp(hex), cv = canvas(S, S), g = cv.getContext('2d'), im = g.createImageData(S, S), d = im.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.hypot(dx, dy); let col = null;
      if (el === 'Frost') { const q = Math.abs(dx) / 3.2 + Math.abs(dy) / 6.5; if (q < 1) col = q < 0.4 ? rp[0] : (q < 0.7 ? rp[1] : rp[2]); }
      else if (el === 'Tide') { if (r < 5.2 && r > 3.6) col = rp[2]; else if (r <= 3.6) col = rp[1]; if (dx < -0.5 && dy < -0.5 && r < 3.2 && r > 1.2) col = rp[0]; }
      else if (el === 'Bloom') { const q = Math.abs(dx) / 3 + Math.abs(dy) / 5; if (q < 1 && ((x + y) & 1 || q < 0.6)) col = q < 0.4 ? rp[0] : rp[2]; }
      else if (r < 5.5) col = r < 2 ? rp[0] : (r < 3.8 ? rp[1] : (r < 5 ? rp[2] : rp[3]));
      if (col) { const o = (y * S + x) * 4; d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    }
    g.putImageData(im, 0, 0); return (cache[key] = cv);
  }

  // ---- runtime: effects, particles, shake, hit-stop
  const nearDir = (ang) => ((Math.round(wrap(ang) / (Math.PI / 8)) % 16) + 16) % 16;
  function slash(el, hex, x, y, ang, big) { FXL.push({ k: 's', set: slashSet(el, hex, nearDir(ang), big ? 1 : 0), x: x, y: y, t: 0 }); }
  function impact(el, hex, x, y, big) { FXL.push({ k: 'i', set: impactSet(el, hex, big ? 1 : 0), x: x, y: y, t: 0 }); }
  const PSTYLE = {   // per element: [gravity, speedScale, life, size, shade index, drift]
    Ember: [-90, 1, 0.55, 2, 2, 0], Tide: [200, 0.9, 0.5, 2, 1, 0], Moss: [40, 0.7, 0.8, 4, 2, 1], Volt: [0, 1.7, 0.22, 2, 1, 0],
    Frost: [30, 0.7, 0.8, 2, 1, 1], Dusk: [-30, 0.7, 0.7, 2, 3, 1], Stone: [260, 0.9, 0.55, 4, 3, 0], Bloom: [20, 0.7, 0.9, 4, 2, 1]
  };
  function burst(el, hex, x, y, n, dx, dy, power) {
    if (calm()) n = Math.min(n, 3); const st = PSTYLE[el] || PSTYLE.Ember, rp = ramp(hex); if (PT.length > 220) return;
    for (let i = 0; i < n && PT.length < 220; i++) {
      const a = Math.atan2(dy || 0.001, dx || 0.001) + (Math.random() - 0.5) * (dx || dy ? 2.2 : TAU * 2), sp = (40 + Math.random() * 90) * (power || 1) * st[1];
      PT.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, g: st[0], t: 0, life: st[2] * (0.7 + Math.random() * 0.6), sz: st[3], col: css(rp[Math.random() < 0.3 ? 0 : st[4]]), drift: st[5], ph: Math.random() * 6 });
    }
  }
  function trail(el, hex, x, y) { if (calm() || PT.length > 220) return; const st = PSTYLE[el] || PSTYLE.Ember, rp = ramp(hex); PT.push({ x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 4, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, g: st[0] * 0.3, t: 0, life: 0.3, sz: 2, col: css(rp[Math.random() < 0.4 ? 1 : 2]), drift: 0, ph: 0 }); }
  function shake(dx, dy, power) { if (calm()) return; const l = Math.hypot(dx, dy) || 1; shakeX = dx / l; shakeY = dy / l; shakeA = Math.max(shakeA, power); }
  function hitStop(sec) { if (!calm()) freezeT = Math.max(freezeT, sec); }
  function freeze(dt) { if (freezeT > 0) { freezeT -= dt; step(dt * 0.5); return true; } return false; }
  function step(dt) {
    FXL.forEach((f) => { f.t += dt; }); FXL = FXL.filter((f) => f.t < f.set.dur);
    PT.forEach((p) => { p.t += dt; p.vy += p.g * dt; p.x += (p.vx + (p.drift ? Math.sin(p.t * 7 + p.ph) * 18 : 0)) * dt; p.y += p.vy * dt; p.vx *= 0.97; }); PT = PT.filter((p) => p.t < p.life);
    shakeA = Math.max(0, shakeA - dt * 38);
  }
  function shakeNow(t) { if (shakeA <= 0.1) return { x: 0, y: 0 }; const k = shakeA * Math.sin(t * 90); return { x: Math.round(shakeX * k + Math.sin(t * 131) * shakeA * 0.25), y: Math.round(shakeY * k + Math.cos(t * 117) * shakeA * 0.25) }; }
  function clear() { FXL = []; PT = []; shakeA = 0; freezeT = 0; }
  // draw all effects (world coordinates minus the camera; 1 art pixel = 2 screen pixels)
  function draw(c, cx, cy, snap) {
    c.imageSmoothingEnabled = false;
    FXL.forEach((f) => { const n = f.set.frames.length, i = Math.min(n - 1, Math.floor(f.t / f.set.dur * n)), S = f.set.S * 2; c.drawImage(f.set.frames[i], snap(f.x - cx - S / 2), snap(f.y - cy - S / 2), S, S); });
    PT.forEach((p) => { const a = 1 - p.t / p.life; c.globalAlpha = a < 0.35 ? a * 2.2 : 1; c.fillStyle = p.col; c.fillRect(snap(p.x - cx), snap(p.y - cy), p.sz, p.sz); }); c.globalAlpha = 1;
  }
  // a status icon row above an enemy (x, y = its head on screen): burn flames, weaken arrow, daze stars, drain swirl
  function status(c, x, y, s, t) {
    let ox = 0; const icon = (fn) => { fn(x + ox, y); ox += 9; };
    if (s.burn) icon((px, py) => { const f = Math.floor(t * 10) % 2; c.fillStyle = '#FF7A45'; c.fillRect(px - 2, py - 2 - f, 4, 5); c.fillStyle = '#FFD86B'; c.fillRect(px - 1, py - f, 2, 3); c.fillStyle = '#FFFFFF'; c.fillRect(px, py + 1 - f, 1, 1); });
    if (s.weak) icon((px, py) => { const b = Math.floor(t * 4) % 2; c.fillStyle = '#8B6CF0'; c.fillRect(px - 1, py - 4 + b, 2, 4); c.fillRect(px - 3, py + b, 6, 2); c.fillRect(px - 2, py + 2 + b, 4, 1); });
    if (s.daze) icon((px, py) => { for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; c.fillStyle = '#FFE066'; c.fillRect(Math.round(px + Math.cos(a) * 4) - 1, Math.round(py - 1 + Math.sin(a) * 2) - 1, 3, 3); } });
    if (s.sap) icon((px, py) => { for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; c.fillStyle = i ? '#4FB06D' : '#C8F0C0'; c.fillRect(Math.round(px + Math.cos(a) * 3) - 1, Math.round(py + Math.sin(a) * 3) - 1, 2, 2); } });
    if (s.fort) icon((px, py) => { c.fillStyle = '#A79C90'; c.fillRect(px - 3, py - 4, 6, 6); c.fillStyle = '#EEEAE5'; c.fillRect(px - 2, py - 3, 4, 4); c.fillStyle = '#A79C90'; c.fillRect(px - 1, py - 2, 2, 2); });
  }
  // the guard bubble: a hexagonal shimmer around the critter
  function shield(c, x, y, t, hex) {
    const rp = ramp(hex || '#6FA8FF'); c.save(); c.globalAlpha = 0.55 + 0.25 * Math.sin(t * 14); c.strokeStyle = css(rp[1]); c.lineWidth = 3;
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * 1.2; const px = x + Math.cos(a) * 21, py = y - 14 + Math.sin(a) * 18; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.stroke();
    c.globalAlpha *= 0.35; c.fillStyle = css(rp[2]); c.fill(); c.restore();
  }
  // build an element's frames in the background (one small set every 25 ms) so the first blows do not stall
  const warmed = {};
  function warm(el, hex) { if (warmed[el]) return; warmed[el] = true; const jobs = []; for (let d = 0; d < 16; d++) { jobs.push(() => slashSet(el, hex, d, 0)); jobs.push(() => slashSet(el, hex, d, 1)); } jobs.push(() => impactSet(el, hex, 0), () => impactSet(el, hex, 1), () => orb(el, hex)); let i = 0; const next = () => { if (i < jobs.length) { jobs[i++](); setTimeout(next, 25); } }; setTimeout(next, 400); }
  return { warm, bind: (o) => { if (o && o.calm) calmFn = o.calm; }, slash, impact, burst, trail, shake, hitStop, freeze, step, shakeNow, clear, draw, status, shield, orb, slashSet, impactSet, nearDir, get count() { return FXL.length + PT.length; } };
})();
