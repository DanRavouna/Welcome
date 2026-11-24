
(() => {
  // ============ data ============
  const CAT = window.CAT, CATS = CAT.starCats;         // the one catalogue, shared with the game
  const screen = document.getElementById('mapScreen');
  const DEG = Math.PI / 180, GLOW_LY = 20;   // GLOW_LY: the size of the glow drawn around each place you've been
  // equatorial (J2000) -> galactic, the standard rotation matrix; the map lies flat on the Milky Way's plane
  const MG = [[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445], [-0.8676661490, -0.1980763734, 0.4559837762]];
  function galDir(ra, dec) {
    const a = ra * DEG, d = dec * DEG, e = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
    const g = MG.map(r => r[0] * e[0] + r[1] * e[1] + r[2] * e[2]);       // x: to the galactic centre, y: galactic longitude 90, z: north galactic pole
    return new THREE.Vector3(g[0], g[2], -g[1]);                          // scene: up = north galactic pole
  }
  // distances span 4 ly to 55 million ly: the map compresses them (log scale from the Sun)
  const C = ly => 18 * Math.log10(1 + ly);
  const fmtLy = d => d < 0.01 ? 'HERE' : CAT.fmtLy(d);
  const KIND_RANK = { blackhole: 5, galaxy: 5, nebula: 4, cluster: 4, system: 1 };
  const PLACES = [];
  const rgbHex = s => s ? s.split(',').reduce((a, v) => a * 256 + (+v), 0) : undefined;
  CAT.systems.forEach(s => PLACES.push({ ...s, kind: 'system', dir: s.ly ? galDir(s.ra, s.dec) : new THREE.Vector3(1, 0, 0),
    planets: s.planets.map(q => ({ ...q, col: rgbHex(q.rgb) })) }));
  const SOL = PLACES.find(p => p.home);
  CAT.landmarks.forEach(l => PLACES.push({ ...l, dir: galDir(l.ra, l.dec) }));
  PLACES.forEach(p => { p.real = p.dir.clone().multiplyScalar(p.ly); p.pos = p.dir.clone().multiplyScalar(C(p.ly)); p.rank = p.home ? 10 : KIND_RANK[p.kind] || 1; });
  const byId = new Map(PLACES.map(p => [p.id, p]));
  // planets are places too (you can fly to them): id 'pl:<name>', they live inside their star's system
  PLACES.forEach(p => (p.planets || []).forEach(q => { q.kind = 'planet'; q.host = p; byId.set(q.id, q); }));
  const starOf = id => { const o = byId.get(id); return o && o.host ? o.host : o; };     // the star system a place is in

  // ============ saved progress ============
  const ST = CAT.state, visited = ST.visited, beenPl = ST.scanned, seen = ST.seen, save = CAT.save;   // the one state, shared with the game
  const WARP_LY = CAT.warpLy;
  const cat = o => CAT.byId.get(o.id);                // the catalogue's entry for one of the map's objects
  const known = o => !!o && CAT.known(cat(o)), inReach = o => CAT.inReach(cat(o.host || o));          // the shared rules
  // the map's JUMP: places you know, and the planets of a star system you've been to
  const canJump = o => !!o && o.id !== CAT.hereId() && inReach(o) && (o.kind === 'planet' ? visited.includes(o.host.id) : known(o));
  const nameOf = o => known(o) ? String(o.name).toUpperCase() : '???';
  // a place shows on the map if you've been there, it's within 30 ly of somewhere you've been,
  // or it's a famous landmark (seen from home with telescopes: shown dim until you go)
  // The map only shows where you've been: it grows as you explore. Far landmarks stay as ? markers to aim for.
  // Arriving somewhere, you see everything the sky shows from there: it goes on the map as ??? until you've been there.
  // Far landmarks show in the sky from anywhere, so they're always seen.
  function isRevealed(p) { return p.home || visited.includes(p.id) || seen.has(p.id); }   // landmarks too: only once seen

  // ============ scene ============
  const el = document.getElementById('mp-v'), ov = document.getElementById('mp-ov');
  const rd = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); rd.setPixelRatio(Math.min(2, devicePixelRatio)); rd.setClearColor(0); el.appendChild(rd.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(50, 1, 0.01, 5000);
  function resize() { rd.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();
  function canvasTex(sz, draw) { const c = document.createElement('canvas'); c.width = c.height = sz; draw(c.getContext('2d'), sz); const t = new THREE.CanvasTexture(c); return t; }
  const glow = (x, cx, cy, r, rgb, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
  const pic = p => p._pic || (p._pic = new THREE.CanvasTexture(CAT.picture(cat(p))));   // a place's picture: the same one the sky shows
  const ICON = {
    unknown: canvasTex(64, (x) => { glow(x, 32, 32, 26, '160,190,200', .35); x.strokeStyle = 'rgba(190,225,230,.8)'; x.lineWidth = 1.5; x.setLineDash([4, 3]); x.beginPath(); x.arc(32, 32, 15, 0, 7); x.stroke(); x.setLineDash([]); x.fillStyle = '#d8f4f0'; x.font = '700 18px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 32, 33); }),
  };
  const ray = (x, n, len, w, rgb, a, rot = 0) => { x.save(); x.translate(32, 32); x.rotate(rot); for (let i = 0; i < n; i++) { x.rotate(Math.PI * 2 / n); const g = x.createLinearGradient(0, 0, len, 0); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(0, -w / 2, len, w); } x.restore(); };
  const STAR_ICON = {
    red:    canvasTex(64, x => { glow(x, 32, 32, 16, '255,90,60', .55); glow(x, 32, 32, 6, '255,170,140', 1); }),
    orange: canvasTex(64, x => { glow(x, 32, 32, 20, '255,150,60', .55); glow(x, 32, 32, 8, '255,210,160', 1); }),
    sun:    canvasTex(64, x => { glow(x, 32, 32, 24, '255,220,110', .5); ray(x, 4, 26, 2, '255,235,170', .9, Math.PI / 4); glow(x, 32, 32, 9, '255,250,225', 1); }),
    white:  canvasTex(64, x => { glow(x, 32, 32, 24, '255,245,210', .5); ray(x, 6, 28, 1.6, '255,250,235', .9); glow(x, 32, 32, 9, '255,255,245', 1); }),
    hot:    canvasTex(64, x => { glow(x, 32, 32, 28, '140,180,255', .6); ray(x, 4, 32, 2.4, '200,225,255', 1); ray(x, 4, 18, 1.4, '200,225,255', .7, Math.PI / 4); glow(x, 32, 32, 10, '235,245,255', 1); }),
    giant:  canvasTex(64, x => { glow(x, 32, 32, 31, '255,120,50', .45); x.strokeStyle = 'rgba(255,170,110,.75)'; x.lineWidth = 1.5; x.beginPath(); x.arc(32, 32, 22, 0, 7); x.stroke(); glow(x, 32, 32, 15, '255,190,120', 1); }),
    wd:     canvasTex(64, x => { x.strokeStyle = 'rgba(190,225,255,.8)'; x.lineWidth = 1.2; x.beginPath(); x.arc(32, 32, 14, 0, 7); x.stroke(); glow(x, 32, 32, 8, '230,245,255', 1); glow(x, 32, 32, 3, '255,255,255', 1); }),
    brown:  canvasTex(64, x => { x.fillStyle = '#5a2a22'; x.beginPath(); x.arc(32, 32, 11, 0, 7); x.fill(); x.save(); x.beginPath(); x.arc(32, 32, 11, 0, 7); x.clip(); x.fillStyle = 'rgba(150,80,60,.8)'; [-6, 0, 6].forEach(y => x.fillRect(20, 31 + y, 24, 2.2)); x.restore(); x.strokeStyle = 'rgba(200,110,80,.6)'; x.lineWidth = 1.2; x.beginPath(); x.arc(32, 32, 13, 0, 7); x.stroke(); }),
  };
  PLACES.forEach(p => {
    const m = new THREE.SpriteMaterial({ map: p.home ? pic(p) : p.planets ? STAR_ICON[p.cat] : ICON.unknown, transparent: true, depthWrite: false, depthTest: false, sizeAttenuation: false });
    p.sp = new THREE.Sprite(m); p.sp.position.copy(p.pos); p.sp.scale.setScalar(p.home ? 0.08 : p.planets ? CATS[p.cat].size * 1.4 : 0.055); sc.add(p.sp);
  });
  // reference rings on the Milky Way plane, at real distances (the log scale shows here)
  const grid = new THREE.Group(); sc.add(grid);
  const ringLabels = [];
  [[10, '10 LY'], [100, '100 LY'], [1000, '1,000 LY'], [26670, 'GALACTIC CENTRE DIST.'], [2.5e6, '2.5 MILLION LY']].forEach(([ly, t]) => {
    const r = C(ly), pts = []; for (let k = 0; k <= 128; k++) pts.push(new THREE.Vector3(Math.cos(k / 128 * 6.2832) * r, 0, Math.sin(k / 128 * 6.2832) * r));
    grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x14514a, transparent: true, opacity: .55 })));
    ringLabels.push({ t, p: new THREE.Vector3(r, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.6) });
  });
  const gcDir = galDir(266.405, -28.936); gcDir.y = 0; gcDir.normalize();
  grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), gcDir.clone().multiplyScalar(C(26670))]), new THREE.LineDashedMaterial({ color: 0x14514a, dashSize: 1.5, gapSize: 1.5 })));
  grid.children[grid.children.length - 1].computeLineDistances();
  // explored areas: a soft glow and a slowly turning wireframe around each visited place
  const bubbleTex = canvasTex(128, (x) => glow(x, 64, 64, 64, '40,160,170', .35));
  const bubbles = new THREE.Group(); sc.add(bubbles);
  const routeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x7dffc6, dashSize: .8, gapSize: .6, transparent: true, opacity: .7 })); sc.add(routeLine);
  let SHOWN = [], spritesFor;                          // the places on the map; which system the sprites are currently hidden for
  function bubbleR(p) { return Math.max(0.6, (C(p.ly + GLOW_LY) - C(Math.max(0, p.ly - GLOW_LY))) / 2); }
  function rebuild() {
    while (bubbles.children.length) { const c = bubbles.children.pop(); c.geometry && c.geometry.dispose(); }
    visited.forEach(id => {
      const p = byId.get(id), r = bubbleR(p);
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.position.copy(p.pos); g.scale.setScalar(r * 2.2); g.userData.r = r; bubbles.add(g);
      const w = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), new THREE.MeshBasicMaterial({ color: 0x2bd6c0, wireframe: true, transparent: true, opacity: .1, depthWrite: false }));
      w.position.copy(p.pos); w.userData.r = r; bubbles.add(w);
    });
    PLACES.forEach(p => { p.shown = isRevealed(p); p.been = visited.includes(p.id); p.sp.visible = p.shown;
      p.sp.material.opacity = p.been || p.planets ? 1 : 0.6;
      if (!p.planets) { const k = known(p), m = k ? pic(p) : ICON.unknown; if (p.sp.material.map !== m) { p.sp.material.map = m; p.sp.material.needsUpdate = true; p.sp.scale.setScalar(k ? 0.09 : 0.055); } } });
    routeLine.geometry.setFromPoints(visited.map(id => byId.get(id).pos)); routeLine.computeLineDistances();
    SHOWN = PLACES.filter(p => p.shown); spritesFor = undefined;
    document.getElementById('mp-stat').textContent = visited.length + ' VISITED · ' + Math.max(0, seen.size - visited.filter(id => seen.has(id)).length) + ' SEEN, NOT VISITED';
  }

  // ============ your ship, floating at your current location ============
  const shipG = new THREE.Group(); sc.add(shipG);
  (function buildShip() {
    const hull = new THREE.MeshBasicMaterial({ color: 0xbff6ff }), dark = new THREE.MeshBasicMaterial({ color: 0x2b6f78 }), glowM = new THREE.MeshBasicMaterial({ color: 0x7dffc6 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 6), hull); body.rotation.x = -Math.PI / 2; shipG.add(body);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.45), dark); wing.position.z = 0.35; shipG.add(wing);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.35), dark); fin.position.set(0, 0.18, 0.5); shipG.add(fin);
    const eng = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, x => glow(x, 32, 32, 32, '125,255,198', 1)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    eng.scale.setScalar(0.7); eng.position.z = 0.8; shipG.add(eng); shipG.userData.eng = eng;
    shipG.traverse(o => { if (o.material) { o.material.depthTest = false; o.renderOrder = 5; } });
  })();

  // ============ a star system up close (planet orbits at their real sizes, sqrt-scaled) ============
  const sysG = new THREE.Group(); sc.add(sysG);
  let sysFor = null;
  const dotTex = canvasTex(64, (x) => { glow(x, 32, 32, 32, '255,255,255', 1); });
  function buildSystem(p) {
    while (sysG.children.length) sysG.remove(sysG.children[0]);
    sysFor = p; if (!p || !p.planets) return;
    sysG.position.copy(p.pos);
    const maxAu = Math.max(...p.planets.map(q => q.au || 0.05), 0.05);
    p.planets.forEach((q, i) => {
      const au = q.au || (0.05 * (i + 1)), r = 0.6 * (0.2 + 0.95 * Math.log10(1 + au * 4 / maxAu * 30) / Math.log10(1 + 120));   // log-spaced so inner planets don't pile up
      const pts = []; for (let k = 0; k <= 96; k++) pts.push(new THREE.Vector3(Math.cos(k / 96 * 6.2832) * r, 0, Math.sin(k / 96 * 6.2832) * r));
      sysG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2bd6c0, transparent: true, opacity: .45 })));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: q.col || ((q.eqt || 300) > 1000 ? 0xff9a5a : (q.re || 1) > 4 ? 0xe6c68a : 0x9fc6e6), sizeAttenuation: false, depthTest: false }));
      sp.scale.setScalar(0.012 + 0.012 * Math.min(1, (q.re || 1) / 11));
      sp.userData = { r, ph: q.ph * Math.PI / 180, sp: 0, q, au };   // where it is today (the catalogue's time model)
      sysG.add(sp); q.sprite = sp;
    });
  }

  // ============ camera & touch ============
  let yaw = 0.8, pitch = 0.55, dist = 170, goalD = 170;
  const tgt = new THREE.Vector3(), goal = new THREE.Vector3();
  const MIN_D = 2.6, MAX_D = 420;                     // closest zoom still fits a whole planetary system
  const LV = [[0, 5, 'SYSTEM'], [5, 30, 'NEIGHBOURHOOD'], [30, 95, 'REGION'], [95, 1e9, 'GALAXY']];
  const clampD = d => Math.max(MIN_D, Math.min(MAX_D, d));
  // zooming in homes in on the star (or bubble) under your fingers, so you can dive into any system
  let freeZoom = false;
  function zoomAt(x, y, f) {
    goalD = clampD(goalD * f); freeZoom = true;
    if (f >= 1 || !groups.length) return;
    let best = null, bd = 140;
    groups.forEach(g => { const d = Math.hypot(g.x - x, g.y - y); if (d < bd) { bd = d; best = g; } });
    if (!best) return;
    const c = new THREE.Vector3(); best.m.forEach(p => c.add(p.pos)); c.divideScalar(best.m.length);
    goal.lerp(c, Math.min(1, (1 - f) * 2.2));                       // drift toward it as you zoom
  }
  let touches = new Map(), pinch0 = 0, moved = 0, downT = 0;
  function onDown(id, x, y) { touches.set(id, [x, y]); if (touches.size === 1) { moved = 0; downT = performance.now(); } if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); moved += 99; } }
  function onMove(id, x, y) {
    if (!touches.has(id)) return; const o = touches.get(id), dx = x - o[0], dy = y - o[1]; touches.set(id, [x, y]);
    if (touches.size >= 2) { const [a, b] = [...touches.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, pinch0 / d); pinch0 = d; }
    else { moved += Math.abs(dx) + Math.abs(dy); yaw -= dx * 0.007; pitch = Math.max(-1.35, Math.min(1.35, pitch + dy * 0.007)); }
  }
  function onUp(id, x, y) { touches.delete(id); if (touches.size === 0 && moved < 8 && performance.now() - downT < 500) tap(x, y); if (touches.size < 2) pinch0 = 0; }
  el.addEventListener('touchstart', e => { e.preventDefault(); [...e.changedTouches].forEach(t => onDown(t.identifier, t.clientX, t.clientY)); }, { passive: false });
  el.addEventListener('touchmove', e => { e.preventDefault(); [...e.changedTouches].forEach(t => onMove(t.identifier, t.clientX, t.clientY)); }, { passive: false });
  el.addEventListener('touchend', e => { e.preventDefault(); [...e.changedTouches].forEach(t => onUp(t.identifier, t.clientX, t.clientY)); }, { passive: false });
  el.addEventListener('touchcancel', e => { [...e.changedTouches].forEach(t => touches.delete(t.identifier)); });
  el.addEventListener('mousedown', e => onDown('m', e.clientX, e.clientY));
  el.addEventListener('mousemove', e => onMove('m', e.clientX, e.clientY));
  el.addEventListener('mouseup', e => { if (touches.has('m')) onUp('m', e.clientX, e.clientY); });
  el.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, 1 + e.deltaY * 0.0015); }, { passive: false });
  (function legend() {
    const n = {}; PLACES.forEach(p => { if (p.planets) n[p.cat] = (n[p.cat] || 0) + 1; });
    const row = (img, label, count) => `<div class="k"><img src="${img}" alt=""><span>${label}</span><span>${count}</span></div>`;
    let h = Object.keys(CATS).map(k => row(STAR_ICON[k].image.toDataURL(), CATS[k].name, n[k] || 0)).join('');
    h += [['blackhole', 'BLACK HOLE'], ['nebula', 'NEBULA'], ['galaxy', 'GALAXY'], ['cluster', 'STAR CLUSTER']].map(([k, l]) => row(CAT.picture(CAT.landmarks.find(o => o.kind === k)).toDataURL(), l, PLACES.filter(p => p.kind === k).length)).join('');
    document.getElementById('mp-key').innerHTML = h;
  })();
  document.getElementById('mp-keyBtn').addEventListener('click', () => { const k = document.getElementById('mp-key'); k.style.display = k.style.display === 'block' ? 'none' : 'block'; });
  const btn = (id, f) => document.getElementById(id).addEventListener('click', f);
  btn('mp-zin', () => zoomAt(innerWidth / 2, innerHeight / 2, 1 / 2.2));
  btn('mp-zout', () => goalD = clampD(goalD * 2.2));
  btn('mp-home', () => { const h = starOf(CAT.hereId()); goal.copy(h.pos); goalD = h.planets ? 3.2 : 10; freeZoom = false; select(null); });

  // ============ selecting, zooming in, jumping ============
  let groups = [], sel = null;
  function select(p) {
    sel = p; const card = document.getElementById('mp-card');
    if (!p) { card.style.display = 'none'; return; }
    const jb = document.getElementById('mp-jump'); jb.classList.toggle('off', !canJump(p)); jb.textContent = canJump(p) || p.id === CAT.hereId() ? 'JUMP' : known(p) && !inReach(p) ? 'OUT OF RANGE · MAX ' + WARP_LY + ' LY' : 'JUMP · NOT VISITED';
    const hs = starOf(CAT.hereId()), sys = p.host || p, k = known(p), L = [];
    L.push(p.id === CAT.hereId() ? 'YOU ARE HERE' : sys === hs ? (p.host ? 'IN THIS SYSTEM' : 'YOUR SHIP IS IN THIS SYSTEM') : fmtLy(sys.real.distanceTo(hs.real)) + ' FROM YOU');
    if (p.kind === 'planet') L.push(...(k ? CAT.planetFacts(cat(p)) : ['UNKNOWN PLANET' + (visited.includes(sys.id) ? ' · JUMP THERE TO SCAN IT' : '')]));
    else if (k) { L.push(...CAT.placeFacts(cat(p))); if (p.planets) L.push(CATS[p.cat].note + (p.home ? ' · HOME' : '')); }
    else L.push(p.planets ? CATS[p.cat].name + ' · PLANETS: ???' : 'UNKNOWN OBJECT', 'VISIT IT IN THE GAME TO ' + (p.planets ? 'SCAN IT' : 'FIND OUT'));
    L.push(p.kind === 'planet' ? (beenPl.has(p.id) ? 'VISITED' : 'NOT VISITED') : p.been || p.home ? 'VISITED' : 'SEEN · NOT VISITED');
    document.getElementById('mp-cName').textContent = nameOf(p);
    document.getElementById('mp-cBody').innerHTML = L.map(l => '<p>' + l + '</p>').join('');
    document.getElementById('mp-jump').style.display = p.id === CAT.hereId() ? 'none' : '';
    document.getElementById('mp-zoomTo').style.display = p.kind === 'planet' ? 'none' : '';
    card.style.display = 'block';
  }
  function tap(x, y) {
    let best = null, bd = 36;
    groups.forEach(g => { const d = Math.hypot(g.x - x, g.y - y) - (g.planet ? 8 : 0); if (d < bd) { bd = d; best = g; } });
    if (!best) { select(null); return; }
    if (best.m.length > 1) {                                  // a bubble: zoom in until it splits
      const c = new THREE.Vector3(); best.m.forEach(p => c.add(p.pos)); c.divideScalar(best.m.length);
      let sp = 0; best.m.forEach(p => sp = Math.max(sp, p.pos.distanceTo(c)));
      goal.copy(c); goalD = clampD(Math.max(1.5, sp * 3)); freeZoom = false; select(null);
    } else select(best.m[0]);
  }
  btn('mp-zoomTo', () => { if (!sel) return; goal.copy(sel.pos); goalD = sel.planets ? 3.2 : 6; freeZoom = false; });
  btn('mp-jump', () => {
    if (!canJump(sel)) return;
    const star = sel.host || sel, target = sel;
    window.SpaceMap.close();
    if (window.SpaceJump) setTimeout(() => window.SpaceJump(star.id, target.kind === 'planet' ? target.name : null), 380);
  });

  // ============ every frame ============
  rebuild(); goal.copy(starOf(CAT.hereId()).pos); tgt.copy(goal);
  const pr = new THREE.Vector3();
  let running = false, lastHtml = '';
  const lvlEl = document.getElementById('mp-lvl'), knobEl = document.getElementById('mp-knob');
  const retEl = document.createElement('div'); retEl.className = 'ret'; retEl.style.display = 'none'; retEl.style.pointerEvents = 'none';      // the selection brackets
  retEl.innerHTML = '<i style="left:0;top:0;border-width:2px 0 0 2px"></i><i style="right:0;top:0;border-width:2px 2px 0 0"></i><i style="right:0;bottom:0;border-width:0 2px 2px 0"></i><i style="left:0;bottom:0;border-width:0 0 2px 2px"></i>';
  screen.appendChild(retEl);
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    tgt.lerp(goal, 0.09); dist += (goalD - dist) * 0.12;
    if (touches.size === 0 && !sel) yaw += 0.0007;                 // a slow idle turn
    cam.position.set(tgt.x + dist * Math.cos(pitch) * Math.sin(yaw), tgt.y + dist * Math.sin(pitch), tgt.z + dist * Math.cos(pitch) * Math.cos(yaw));
    cam.lookAt(tgt); cam.near = Math.max(0.005, dist * 0.01); cam.updateProjectionMatrix();
    const lv = LV.find(l => dist >= l[0] && dist < l[1]); if (lvlEl.textContent !== lv[2]) lvlEl.textContent = lv[2];
    knobEl.style.top = (100 - 100 * Math.log(dist / MIN_D) / Math.log(MAX_D / MIN_D)).toFixed(1) + '%';
    const t = performance.now() / 1000;
    bubbles.children.forEach(c => {                               // fade out a bubble you're inside or right next to, so it doesn't fill the screen
      const k = THREE.MathUtils.smoothstep(cam.position.distanceTo(c.position), c.userData.r * 0.9, c.userData.r * 2.6);
      if (c.isMesh) { c.rotation.y = t * 0.05; c.material.opacity = 0.1 * k; } else c.material.opacity = 0.25 + 0.75 * k;
    });
    // system close-up: the nearest star system to the view centre when zoomed right in
    const want = dist < 5 ? SHOWN.reduce((a, p) => p.planets && (p.home || p.been) && (!a || p.pos.distanceTo(tgt) < a.pos.distanceTo(tgt)) ? p : a, null) : null;
    if (want !== sysFor) buildSystem(want);
    if (sysFor && freeZoom) goal.lerp(sysFor.pos, 0.12);                         // inside a system: centre on its star
    sysG.visible = !!sysFor;
    if (spritesFor !== sysFor) { spritesFor = sysFor; PLACES.forEach(p => { p.sp.visible = p.shown && (!sysFor || p === sysFor); }); }   // only when it changes
    sysG.children.forEach(c => { if (c.isSprite) { if (!c.userData.col0) c.userData.col0 = c.material.color.getHex(); c.material.color.setHex(known(c.userData.q) ? c.userData.col0 : 0x6d7f80); const u = c.userData, a = u.ph + t * u.sp; c.position.set(Math.cos(a) * u.r, 0, Math.sin(a) * u.r); } });
    {                                                                 // the ship: same size on screen at every zoom, bobbing gently beside the star
      const hp = byId.get(CAT.hereId()), h = starOf(CAT.hereId()), k = dist * (hp.kind === 'planet' && sysFor === h ? 0.022 : 0.03);
      const at = hp.kind === 'planet' && sysFor === h && hp.sprite ? hp.sprite.position.clone().add(sysG.position) : h.pos;
      shipG.scale.setScalar(k); shipG.position.copy(at).add(new THREE.Vector3(0, k * (1.4 + 0.25 * Math.sin(t * 1.6)), 0));
      if (sysFor === h && hp === h) shipG.position.add(new THREE.Vector3(k * 1.2, 0, 0));
      shipG.rotation.set(0.15 * Math.sin(t * 0.9), t * 0.35, 0.12 * Math.sin(t * 1.3));
      shipG.userData.eng.material.opacity = 0.6 + 0.4 * Math.sin(t * 9);
    }
    // labels: places close together on screen merge into one bubble with a count
    const W = innerWidth, H = innerHeight, items = [], hereStar = starOf(CAT.hereId());
    SHOWN.forEach(p => {
      if (sysFor && p !== sysFor) return; pr.copy(p.pos).project(cam);
      if (pr.z > 1 || pr.x < -1.1 || pr.x > 1.1 || pr.y < -1.1 || pr.y > 1.1) return;
      items.push({ p, x: (pr.x + 1) / 2 * W, y: (1 - pr.y) / 2 * H, imp: p.rank + (p === hereStar ? 20 : 0) + (p.been ? 2 : 0) });
    });
    items.sort((a, b) => b.imp - a.imp); groups = [];
    const MERGE = sysFor ? 0 : 58;
    items.forEach(it => { const g = MERGE && groups.find(g => Math.hypot(g.x - it.x, g.y - it.y) < MERGE); if (g) g.m.push(it.p); else groups.push({ x: it.x, y: it.y, m: [it.p] }); });
    let html = '';
    groups.forEach(g => {
      const p = g.m[0], cls = p === hereStar ? 'lb here' : (!p.been && !p.planets) ? 'lb dim' : 'lb';
      if (g.m.length === 1) html += `<div class="${cls}" style="left:${Math.round(g.x + 10)}px;top:${Math.round(g.y - 15)}px">${nameOf(p)}</div>`;
      else html += `<div class="cl" style="left:${Math.round(g.x)}px;top:${Math.round(g.y)}px">${g.m.length}</div><div class="${cls}" style="left:${Math.round(g.x + 19)}px;top:${Math.round(g.y - 7)}px">${nameOf(p)} +${g.m.length - 1}</div>`;
    });
    if (sysFor) sysG.children.forEach(c => { if (!c.isSprite) return; pr.copy(c.position).add(sysG.position).project(cam); if (pr.z > 1) return;
      groups.push({ x: (pr.x + 1) / 2 * W, y: (1 - pr.y) / 2 * H, m: [c.userData.q], planet: true });
      const q = c.userData.q;
      html += `<div class="lb" style="left:${Math.round((pr.x + 1) / 2 * W + 8)}px;top:${Math.round((1 - pr.y) / 2 * H - 13)}px;font-size:8.5px;color:${q.id === CAT.hereId() ? '#7dffc6' : q.tag ? '#9fe8c8' : '#8fcabb'}">${nameOf(q)}${q.au && known(q) ? ' · ' + q.au + ' AU' : ''}${q.id === CAT.hereId() ? ' · YOU' : q.tag ? ' · ' + q.tag : ''}${beenPl.has(q.id) && q.id !== CAT.hereId() ? ' ✓' : ''}</div>`; });
    if (lv[2] !== 'SYSTEM') ringLabels.forEach(r => { pr.copy(r.p).project(cam); if (pr.z > 1 || Math.abs(pr.x) > 1 || Math.abs(pr.y) > 1) return;
      html += `<div class="lb" style="left:${Math.round((pr.x + 1) / 2 * W)}px;top:${Math.round((1 - pr.y) / 2 * H)}px;font-size:8px;color:#2f7d70">${r.t}</div>`; });
    const selPos = sel && (sel.kind === 'planet' ? (sysFor === sel.host && sel.sprite ? sel.sprite.position.clone().add(sysG.position) : null) : sel.shown ? sel.pos : null);
    let retOn = false;
    if (selPos) { pr.copy(selPos).project(cam); if (pr.z < 1) { retOn = true;
      retEl.style.left = ((pr.x + 1) / 2 * W).toFixed(1) + 'px'; retEl.style.top = ((1 - pr.y) / 2 * H).toFixed(1) + 'px'; retEl.style.transform = 'scale(' + (1 + 0.12 * Math.sin(t * 6)).toFixed(3) + ')'; } }
    retEl.style.display = retOn ? '' : 'none';
    if (html !== lastHtml) { ov.innerHTML = html; lastHtml = html; }   // the labels are rebuilt only when one of them moved
    rd.render(sc, cam);
  }
  // ============ the launcher talks to the map through this ============
  window.SpaceMap = {
    open() { resize(); rebuild(); running = true; screen.classList.add('show'); requestAnimationFrame(() => screen.classList.add('vis')); select(null);
      const h = starOf(CAT.hereId()); goal.copy(h.pos); tgt.copy(h.pos); goalD = dist = h.planets ? 3.2 : 10; frame(); },
    close() { running = false; screen.classList.remove('vis'); setTimeout(() => { if (!running) screen.classList.remove('show'); }, 360); if (window.SpaceMapClosed) window.SpaceMapClosed(); },
    get isOpen() { return running; },
    back() { if (sel) { select(null); return; } window.SpaceMap.close(); },
    debug: () => ({ here: CAT.hereId(), visited: visited.slice(), seen: seen.size, planets: [...beenPl] }),
    groups: () => groups.map(g => [Math.round(g.x), Math.round(g.y), g.m.length, nameOf(g.m[0]), !!g.planet, g.m[0].name]),
    selectId: id => select(byId.get(id)), card: () => document.getElementById('mp-card').innerText,
  };
  document.getElementById('mp-close').addEventListener('click', () => window.SpaceMap.close());
})();

