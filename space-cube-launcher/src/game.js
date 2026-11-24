
(function () {
  // =========================================================
  //  TUNABLE VALUES (one place to adjust the feel)
  // =========================================================
  const CFG = {
    cubeSpinSensitivity: 0.008, cubeSpinCoast: 0.99, cubeIdleSpin: 0.09,
    cubeBobHeight: 0.08, cubeBobSpeed: 0.9, selectedScale: 1.18, cubeGlassOpacity: 1,
    groupOpenSpeed: 5, appOpenSeconds: 0.5,
    selectSeconds: 0.3,       // how long a cube takes to jump up and settle when selected
    skyTurnSpeed: 0.015, skyDragSensitivity: 0.003,
    dotSpeed: 2,              // particles fly toward you twice as fast as before
    dotSway: 1, dotSize: 1,
    moonsMove: false,         // real moons take days to orbit, so to the eye they hold still
    titanOrbitSec: 1800,
    tagOpacityWithCubes: 0.5, tagLineLength: 24,
  };

  // ---- Clock (uses the phone's own time and time zone) ----
  const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const MONS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function updateClock() {
    const d = new Date();
    document.getElementById('hh').textContent = String(d.getHours()).padStart(2, '0');
    document.getElementById('mm').textContent = String(d.getMinutes()).padStart(2, '0');
    document.getElementById('date').textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONS[d.getMonth()];
  }
  updateClock(); setInterval(updateClock, 1000);
  // triple-tap the clock: reload, to pick up the newest version of this screen
  let clockTaps = [];
  document.getElementById('clock').addEventListener('click', () => {
    const now = Date.now(); clockTaps = clockTaps.filter(t => now - t < 700); clockTaps.push(now);
    if (clockTaps.length >= 3) {                     // reload, asking for a fresh copy (a new address skips GitHub's 10-minute cache)
      clockTaps = [];
      if (window.Launcher && window.Launcher.reloadLive) window.Launcher.reloadLive();   // phone: fetch the newest from the website
      else if (location.protocol === 'https:' && location.hostname.endsWith('github.io')) location.replace(location.pathname + '?v=' + Date.now());
      else location.reload();
    }
  });

  if (!window.THREE) { document.getElementById('err').style.display = 'flex'; return; }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);

  // =========================================================
  //  ROTATING SPACE BACKGROUND
  // =========================================================
  // One rig, centred on the camera, holds BOTH the far stars and the near dots.
  // Turning space rotates the rig, so everything turns together like looking around
  // from a ship; the near dots also fly toward you along the rig's own forward axis.
  const spaceRig = new THREE.Group();
  scene.add(spaceRig);
  // The far things (the stars, the star you're near, the planet you're at and its moons) live in their own scene, drawn first:
  // so when you travel right up to a moon it still sits BEHIND the dots, the ships and your cubes.
  // sysRig always copies spaceRig (same place, same turn); sysWorld is where the ship is in the system of the planet you're at.
  const sysScene = new THREE.Scene();
  const sysRig = new THREE.Group(); sysScene.add(sysRig);
  const sysWorld = new THREE.Group(); sysRig.add(sysWorld);
  // The starry sky is a pure backdrop, drawn before everything: planets always cover it
  const skyScene = new THREE.Scene();
  const skyRig = new THREE.Group(); skyScene.add(skyRig);
  function syncSysRig() {
    sysRig.position.copy(spaceRig.position); sysRig.quaternion.copy(spaceRig.quaternion); sysRig.updateMatrixWorld(true);
    skyRig.position.copy(spaceRig.position); skyRig.quaternion.copy(spaceRig.quaternion); skyRig.updateMatrixWorld(true);
  }
  const sky = new THREE.Group();
  sky.rotation.x = 0.35;
  skyRig.add(sky);

  function makeStars(count, rMin, rMax, size, color) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = rMin + Math.random() * (rMax - rMin);
      const t = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      p[i*3]   = r * Math.sin(ph) * Math.cos(t);
      p[i*3+1] = r * Math.sin(ph) * Math.sin(t);
      p[i*3+2] = r * Math.cos(ph);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({
      color, size, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
  }
  sky.add(makeStars(3000, 500, 900, 1.8, 0x8899ff));
  sky.add(makeStars(1500, 200, 450, 1.3, 0xffffff));
  sky.add(makeStars(400,  80,  180, 0.8, 0xffe9c4));

  function glowTexture(inner) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128,128,0,128,128,128);
    gr.addColorStop(0, inner); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  }

  // =========================================================
  //  NEAR SPACE: real floating particles at many depths around the cubes.
  //  Each dot drifts slowly toward you, sways on its own, twinkles, and wraps
  //  around when it passes the camera, so you fly *through* space instead of
  //  looking at a painted dome. Dragging space pushes the whole field sideways.
  // =========================================================
  // The dots fill a full SPHERE around your viewpoint (not just a box in front),
  // so there are dots in every direction you can turn to.
  const FIELD_N = 3000, R = 70, R2 = R * R;
  const fPos = new Float32Array(FIELD_N * 3);
  const fSize = new Float32Array(FIELD_N), fPhase = new Float32Array(FIELD_N), fTint = new Float32Array(FIELD_N);
  const fSpeed = new Float32Array(FIELD_N), fSway = new Float32Array(FIELD_N);
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < FIELD_N; i++) {
    // uniform random point inside the sphere
    let x, y, z;
    do { x = rnd(-R, R); y = rnd(-R, R); z = rnd(-R, R); } while (x*x + y*y + z*z > R2);
    fPos[i*3] = x; fPos[i*3+1] = y; fPos[i*3+2] = z;
    fSize[i] = Math.random() < 0.08 ? rnd(2.2, 3.4) : rnd(0.7, 1.7);   // a few bigger, brighter specks
    fPhase[i] = rnd(0, 6.283); fTint[i] = Math.random();
    fSpeed[i] = rnd(0.6, 2.2); fSway[i] = rnd(0.05, 0.25);
  }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  fGeo.setAttribute('aSize',  new THREE.BufferAttribute(fSize, 1));
  fGeo.setAttribute('aPhase', new THREE.BufferAttribute(fPhase, 1));
  fGeo.setAttribute('aTint',  new THREE.BufferAttribute(fTint, 1));
  const fBorn = new Float32Array(FIELD_N).fill(-100);           // time each dot appeared (start: long ago = fully visible)
  fGeo.setAttribute('aBorn',  new THREE.BufferAttribute(fBorn, 1));
  const fMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, uSize: { value: 1 } },
    vertexShader: `
      attribute float aSize; attribute float aPhase; attribute float aTint; attribute float aBorn;
      uniform float uTime; uniform float uPx; uniform float uSize;
      varying float vAlpha; varying vec3 vColor; varying float vNear;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float d = -mv.z;
        // grows as it comes at you: far = a tiny speck, close = a big bright star
        gl_PointSize = clamp(aSize * uSize * uPx * (160.0 / max(d, 0.5)), 1.8 * uPx, 30.0 * uPx * uSize);
        vNear = 1.0 - smoothstep(3.0, 32.0, d);
        vAlpha = clamp((uTime - aBorn) / 1.2, 0.0, 1.0);   // fades in once when it appears, then stays fully opaque
        vColor = mix(vec3(0.70, 0.80, 1.0), vec3(1.0, 0.92, 0.80), step(0.75, aTint));
        vColor = mix(vColor, vec3(0.75, 0.65, 1.0), step(0.93, aTint));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vAlpha; varying vec3 vColor; varying float vNear;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c);
        float hot  = 1.0 - smoothstep(0.06, 0.16, r);          // white-hot centre
        float body = 1.0 - smoothstep(0.16, 0.28, r);          // coloured disc
        float glow = exp(-r * r * 22.0) * (0.25 + 0.55 * vNear); // soft halo, stronger up close
        // close stars get a faint 4-point sparkle
        float spikes = (max(0.0, 1.0 - abs(c.x) * 16.0) + max(0.0, 1.0 - abs(c.y) * 16.0))
                       * (1.0 - smoothstep(0.0, 0.5, r)) * vNear * 0.7;
        float a = clamp(body + glow + spikes, 0.0, 1.0) * vAlpha;
        if (a < 0.01) discard;
        vec3 col = mix(vColor, vec3(1.0), max(hot, spikes * 0.8)) * (1.15 + 0.5 * vNear);
        gl_FragColor = vec4(col, a);
      }`
  });
  const field = new THREE.Points(fGeo, fMat);
  field.frustumCulled = false;
  spaceRig.add(field);

  // =========================================================
  //  A STAR SYSTEM, AS SEEN FROM A SHIP PARKED NEAR ONE OF ITS PLANETS
  //  Real sizes and distances (from the catalogue) set how big everything looks. From 25 of its
  //  radii away the planet you're at is a clear disk (with its rings, if it has any); the other
  //  planets and the star are so far away they show up as points of light. Where each one is
  //  comes from the catalogue's time model (our planets: where they really are today).
  // =========================================================
  const KM_SCENE = 400;                       // how far the planet you're at sits from you when you arrive (scene units)
  const PARK_RADII = 25;                      // ...which stands for 25 of its own radii: a clear disk, rings and all
  let k = 1;                                  // km -> scene units for the planet you're at (set by buildBody)

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const P = V(-0.05, 0.30, -1).normalize();    // where the home planet sits on a first start (near the top of the screen)
  // Ecliptic (the plane the planets orbit in): tilted a little against the screen
  const N = V(0.15, 1, 0.25).normalize();      // ecliptic "north"
  // Sun direction: ~50° phase angle so the home planet is mostly lit with a visible night edge on a first start
  const toShip = P.clone().negate();
  const side = new THREE.Vector3().crossVectors(N, toShip).normalize();
  const S = toShip.clone().multiplyScalar(Math.cos(0.87)).addScaledVector(side, Math.sin(0.87));
  S.addScaledVector(N, -S.dot(N)).normalize(); // keep the Sun on the ecliptic

  // ---- pictures painted for a planet's `look` (see also solTexture) ----
  function saturnTexture() {
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const pal = ['#e9dcb4','#d9c391','#cfb27a','#e6d6a8','#c9a96e','#efe4c4','#d4b985','#bfa36d'];
    let y = 0, i = 0;
    while (y < H) {                             // horizontal cloud bands of varying width
      const h = 6 + Math.random() * 26;
      x.fillStyle = pal[(i++ * 3 + (Math.random() * 2 | 0)) % pal.length];
      x.fillRect(0, y, W, h + 1); y += h;
    }
    for (let n = 0; n < 1400; n++) {            // fine streaks along the bands
      const yy = Math.random() * H;
      x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.06) + ')';
      x.fillRect(Math.random() * W, yy, 40 + Math.random() * 200, 1 + Math.random() * 2);
    }
    const g = x.createLinearGradient(0, 0, 0, H);   // greyer, darker poles
    g.addColorStop(0, 'rgba(110,120,120,0.55)'); g.addColorStop(0.16, 'rgba(110,120,120,0)');
    g.addColorStop(0.84, 'rgba(110,120,120,0)'); g.addColorStop(1, 'rgba(110,120,120,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return new THREE.CanvasTexture(c);
  }
  function ringTexture(RING) {
    const W = 1024, c = document.createElement('canvas'); c.width = W; c.height = 1;
    const x = c.getContext('2d');
    const r0 = RING.C0, r1 = RING.A1, at = km => (km - r0) / (r1 - r0) * W;
    for (let px = 0; px < W; px++) {
      const km = r0 + (px / W) * (r1 - r0);
      let a, col;
      if (km < RING.C1)      { a = 0.18; col = [150,140,125]; }          // C ring: faint, greyish
      else if (km < RING.B1) { a = 0.88; col = [235,222,190]; }          // B ring: densest, brightest
      else if (km < RING.A0) { a = 0.06; col = [120,110,100]; }          // Cassini Division: near-empty gap
      else                   { a = 0.55; col = [215,200,170]; }          // A ring
      a *= 0.85 + 0.15 * Math.sin(px * 0.21) * Math.sin(px * 0.047 + 1.3);  // soft ringlet structure (smooth, no pixel noise)
      x.fillStyle = 'rgba(' + col.join(',') + ',' + Math.min(a, 1) + ')';
      x.fillRect(px, 0, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;   // no shimmer when small on screen
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  const sunDirU = { value: S.clone() };       // the light of the star you're near, for every body's shader
  const MAIN_MOON_PERIOD_S = 1800;
  const moonMat = (col, haze, map) => new THREE.ShaderMaterial({
    uniforms: { sunDir: sunDirU, col: { value: new THREE.Vector3(...col) }, haze: { value: haze ? 1 : 0 }, map: { value: map } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
        vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz);
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec3 sunDir; uniform vec3 col; uniform float haze; uniform sampler2D map; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() {
        float d = dot(normalize(vN), normalize(sunDir));
        float light = smoothstep(-0.05, 0.3, d) + 0.01;
        vec3 c = col * texture2D(map, vUv).rgb * 1.12 * light;
        // Titan's thick orange atmosphere: a glowing rim, even on the night edge
        float rim = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.5);
        c += haze * rim * vec3(0.9, 0.55, 0.2) * (0.25 + 0.75 * smoothstep(-0.4, 0.3, d));
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  // Moon surfaces (only seen up close): craters for most, plus each moon's signature look
  function moonTexture(m) {
    const name = m.name, look = m.look;
    const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    let seed = 0; for (const ch of name) seed = seed * 31 + ch.charCodeAt(0);
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed & 0xffff) / 0x10000; };
    x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {                       // soft mottling
      const v = 150 + rnd() * 90 | 0; x.fillStyle = `rgba(${v},${v},${v},0.08)`;
      x.beginPath(); x.arc(rnd() * W, rnd() * H, 2 + rnd() * 14, 0, 7); x.fill();
    }
    const crater = (cx, cy, r) => {                          // dark floor, bright rim on the sunward side
      for (const dx of [-W, 0, W]) {
        x.fillStyle = 'rgba(70,70,70,0.30)'; x.beginPath(); x.ellipse(cx + dx, cy, r, r * 0.9, 0, 0, 7); x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = Math.max(1, r * 0.18);
        x.beginPath(); x.ellipse(cx + dx, cy, r, r * 0.9, 0, 3.6, 6.0); x.stroke();
        x.strokeStyle = 'rgba(40,40,40,0.30)'; x.beginPath(); x.ellipse(cx + dx, cy, r, r * 0.9, 0, 0.5, 2.8); x.stroke();
      }
    };
    const many = (n, rmax) => { for (let i = 0; i < n; i++) crater(rnd() * W, 20 + rnd() * (H - 40), 1.5 + Math.pow(rnd(), 3) * rmax); };
    if (look === 'ice') {                              // bright smooth ice, blue "tiger stripes" near the south pole
      x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(0, 0, W, H); many(90, 6);
      x.strokeStyle = 'rgba(120,180,230,0.75)'; x.lineWidth = 3;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(60 + i * 30, H - 40 + i * 6); x.bezierCurveTo(160, H - 60 + i * 6, 260, H - 30 + i * 5, 380 + i * 20, H - 45 + i * 6); x.stroke(); }
    } else if (look === 'haze') {                           // haze hides the ground: soft orange bands
      x.fillStyle = '#e7a457'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) { x.fillStyle = `rgba(${200 + rnd() * 40 | 0},${120 + rnd() * 40 | 0},60,0.25)`; x.fillRect(0, rnd() * H, W, 8 + rnd() * 26); }
    } else if (look === 'twotone') {                         // two-tone: one half dark as coal
      many(260, 16);
      const g = x.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, 'rgba(40,28,18,0)'); g.addColorStop(0.2, 'rgba(40,28,18,0.92)'); g.addColorStop(0.55, 'rgba(40,28,18,0.92)'); g.addColorStop(0.7, 'rgba(40,28,18,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    } else if (look === 'bigcrater') {                           // one enormous crater
      many(320, 10); crater(W * 0.3, H * 0.45, 38); x.fillStyle = 'rgba(200,200,200,0.5)'; x.beginPath(); x.arc(W * 0.3, H * 0.45, 5, 0, 7); x.fill();
    } else if (look === 'wisps') {                           // bright wispy ice cliffs on one side
      many(240, 12); x.strokeStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 30; i++) { x.lineWidth = 1 + rnd() * 3; x.beginPath(); const sx = W * 0.6 + rnd() * W * 0.3, sy = rnd() * H; x.moveTo(sx, sy); x.lineTo(sx + (rnd() - 0.5) * 60, sy + (rnd() - 0.5) * 80); x.stroke(); }
    } else if (look === 'canyon') {                          // big crater and a long canyon
      many(280, 12); crater(W * 0.7, H * 0.35, 30);
      x.strokeStyle = 'rgba(60,60,60,0.4)'; x.lineWidth = 4; x.beginPath(); x.moveTo(W * 0.1, H * 0.2); x.bezierCurveTo(W * 0.3, H * 0.5, W * 0.4, H * 0.7, W * 0.5, H * 0.95); x.stroke();
    } else many(380, 14);                                    // Rhea: heavily cratered
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  const moonGlowTex = pointTexture('255,245,225');
  const hazeGlowTex = pointTexture('255,175,90');     // a hazy moon glows orange (Titan)
  const tmpQ = new THREE.Vector3();
  function moonLocal(a, th, out) { return out.set(Math.cos(th) * a * k, 0, Math.sin(th) * a * k); }

  let moonObjs = [];                          // the moons of the planet you're at (filled by buildBody)

  function updateMoons(dt) {
    moonObjs.forEach(o => {
      if (CFG.moonsMove) o.th += o.w * (MAIN_MOON_PERIOD_S / CFG.titanOrbitSec) * dt;
      moonLocal(o.m.a, o.th, o.holder.position);
      // glow sized from distance so it stays a visible point but never swamps the disk
      o.holder.getWorldPosition(tmpQ);
      const dist = tmpQ.distanceTo(camera.position);
      // From inside the planet's system its moons outshine every background star,
      // so their glow is sized to read clearly brighter than the stars (bigger moons = bigger glow)
      const px = dist * 0.0045;                       // ~2 px at this distance
      const g = Math.max(o.m.r * k * 3.2, px * (2.2 + 1.6 * Math.min(o.m.r / 800, 1)));
      o.glow.scale.set(g, g, 1);
      const diskPx = (o.m.r * k / dist) * (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      o.glow.material.opacity = Math.max(0, Math.min(1, 1 - (diskPx - 3) / 10));
    });
  }

  // ---- The Sun and the other planets: points of light at their real apparent brightness ----
  function pointTexture(rgb) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(' + rgb + ',0.95)');
    g.addColorStop(0.45, 'rgba(' + rgb + ',0.18)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  // The frame of our own system: N = ecliptic north, S = the Sun seen from the home planet, T completes it
  const T = new THREE.Vector3().crossVectors(N, S).normalize();
  // Where a planet is around its star (km): its orbit size and its place on the orbit, both from the catalogue.
  // Our system lies on the ecliptic; other systems get a fixed invented tilt (unknown for nearly all of them).
  const KM_AU = window.CAT.KM_AU, orbitPlanes = new Map();
  function orbitPlane(sys) {                  // -> { u, v: the plane's axes, n: its north, tilt: the line a planet's spin axis leans around }
    let pl = orbitPlanes.get(sys.id);
    if (!pl) {
      if (sys.ecliptic) pl = { u: S.clone().negate(), v: T.clone().negate(), n: N.clone(), tilt: side.clone() };   // angle counted the way the planets move, from the Sun -> home planet line
      else { let hsh = 2166136261; for (let i = 0; i < sys.id.length; i++) { hsh ^= sys.id.charCodeAt(i); hsh = Math.imul(hsh, 16777619); }
        const f = k => ((Math.imul(hsh ^ k, 2654435761) >>> 0) / 4294967296) - 0.5, n = new THREE.Vector3(f(1), f(2), f(3)).normalize();
        const u = new THREE.Vector3(1, 0, 0).cross(n); if (u.lengthSq() < 1e-3) u.set(0, 1, 0).cross(n); u.normalize();
        pl = { u, v: new THREE.Vector3().crossVectors(n, u), n, tilt: u.clone() }; }
      orbitPlanes.set(sys.id, pl);
    }
    return pl;
  }
  function orbitPos(sys, q) {
    const pl = orbitPlane(sys), ph = q.ph * Math.PI / 180, r = (q.auNow || q.au) * KM_AU;      // (q.ph, q.auNow: where it is today, from the catalogue's time model)
    return pl.u.clone().multiplyScalar(Math.cos(ph) * r).addScaledVector(pl.v, Math.sin(ph) * r);
  }

  // =========================================================
  //  THE PLANET YOU'RE AT: one real-scale scene, built from the catalogue for whichever planet it is
  //  (body, rings and moons if its data has them). You arrive PARK_RADII radii away from it.
  //  Its name tags and flight targets (HUD_TARGETS, NAV) are rebuilt with it.
  // =========================================================
  const BODY = { sys: null, q: null, group: new THREE.Group(), mesh: null, ringMat: null, axis: new THREE.Vector3(0, 1, 0), starDir: S.clone(), eqKm: 1, fitKm: 1 };
  sysWorld.add(BODY.group);
  function bodyFrame(sys, q) {                // a planet's star, in the star's real direction, and its spin axis (also its ring plane)
    const pl = orbitPlane(sys);
    return { starDir: orbitPos(sys, q).negate().normalize(), axis: pl.n.clone().applyAxisAngle(pl.tilt, THREE.MathUtils.degToRad(q.tiltDeg || 0)).normalize() };
  }
  // Where you park beside a body (the direction from it to you): ~50 degrees off its star, on the side you came from,
  // so it's mostly lit with a visible night edge. A planet is seen a little from above its equator (its rings, if any).
  function parkDir(away, starDir, axis, planet) {
    let perp = away.clone().addScaledVector(starDir, -away.dot(starDir));
    if (perp.lengthSq() < 1e-6) perp = axis.clone().addScaledVector(starDir, -axis.dot(starDir));
    perp.normalize();
    const ph = THREE.MathUtils.degToRad(50), dir = starDir.clone().multiplyScalar(Math.cos(ph)).addScaledVector(perp, Math.sin(ph));
    if (planet) dir.addScaledVector(axis, 0.3);
    return dir.normalize();
  }
  // A star seen close: a disk in its own colour, darker toward its edge, inside a soft glow that scales with it
  function starMesh(q, r) {
    const col = new THREE.Color(...q.col);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), new THREE.ShaderMaterial({
      uniforms: { col: { value: col } },
      vertexShader: `varying vec3 vN, vV; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 col; varying vec3 vN, vV; void main() { float mu = max(0.0, dot(normalize(vN), normalize(vV)));
        gl_FragColor = vec4(mix(col, vec3(1.0), 0.55 * mu) * (0.55 + 0.45 * sqrt(mu)), 1.0); }` }));
    const rgb = q.col.map(v => Math.round(v * 255)).join(',');
    [[2.6, 0.9], [7, 0.35]].forEach(([s, op]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pointTexture(rgb), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op }));
      sp.scale.set(r * s * 2, r * s * 2, 1); m.add(sp);
    });
    return m;
  }
  function bodyTexture(q) { return q.look === 'saturn' ? saturnTexture() : q.look ? solTexture(q.look) : null; }
  function clearBody() {
    const g = BODY.group;
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) { const t = m.map || (m.uniforms && m.uniforms.map && m.uniforms.map.value); if (t) t.dispose(); m.dispose(); } });
    while (g.children.length) g.remove(g.children[0]);
    HUD_TARGETS.forEach(t => t.g.remove()); HUD_TARGETS = [];
    NAV.forEach(n => { occluders.remove(n.occ); nearOcc.remove(n.occNear); n.occ.geometry.dispose(); }); NAV = [];
    moonObjs = []; BODY.sys = BODY.q = BODY.mesh = BODY.ringMat = null;
    if (navLock && !navLock.deep) cancelLock();
    travel = null; nav.target = null; navOffset.set(0, 0, 0); shipPos.set(0, 0, 0); sysWorld.position.set(0, 0, 0); routePlan = null;
  }
  function buildBody(sys, q, dir) {
    clearBody();
    const eqKm = q.eqRKm || q.diamKm / 2, polKm = q.polRKm || eqKm, pl = orbitPlane(sys), g = BODY.group;
    k = KM_SCENE / (PARK_RADII * eqKm);
    BODY.sys = sys; BODY.q = q; BODY.eqKm = BODY.fitKm = eqKm;
    const fr = q.star ? { starDir: dir.clone().negate().normalize(), axis: orbitPlane(sys).n.clone() } : bodyFrame(sys, q);   // a star: its own light, its system's north
    BODY.starDir.copy(fr.starDir); BODY.axis.copy(fr.axis);
    g.position.copy(dir).normalize().multiplyScalar(KM_SCENE); g.scale.setScalar(1);
    g.quaternion.setFromUnitVectors(V(0, 1, 0), BODY.axis);
    const mesh = q.star ? starMesh(q, eqKm * k) : planetMesh(Object.assign({}, q, { tex: bodyTexture(q) }), eqKm * k, sunDirU);
    mesh.scale.y = polKm / eqKm;               // flattened at the poles, where the data says so
    g.add(mesh); BODY.mesh = mesh;
    if (q.rings) {
      const RING = q.rings; BODY.fitKm = RING.A1;
      BODY.ringMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { map: { value: ringTexture(RING) }, sunDir: sunDirU, r0: { value: RING.C0 * k }, r1: { value: RING.A1 * k },
                    center: { value: new THREE.Vector3() }, pR: { value: eqKm * k }, ringN: { value: BODY.axis.clone() } },
        vertexShader: `
          varying vec2 vP; varying vec3 vW;
          void main() { vP = position.xy; vW = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform sampler2D map; uniform vec3 sunDir; uniform float r0; uniform float r1;
          uniform vec3 center; uniform float pR; uniform vec3 ringN;
          varying vec2 vP; varying vec3 vW;
          void main() {
            float t = (length(vP) - r0) / (r1 - r0);
            vec4 c = texture2D(map, vec2(t, 0.5));
            vec3 s = normalize(sunDir);
            float lit = 0.35 + 0.65 * abs(dot(normalize(ringN), s));
            // the planet's shadow falling across the rings
            vec3 q = vW - center; float along = dot(q, s);
            if (along < 0.0 && length(q - along * s) < pR) lit *= 0.12;
            gl_FragColor = vec4(c.rgb * lit, c.a);
          }`
      });
      const rings = new THREE.Mesh(new THREE.RingGeometry(RING.C0 * k, RING.A1 * k, 256, 1), BODY.ringMat);
      rings.rotation.x = -Math.PI / 2;        // ring plane = the planet's equator
      g.add(rings);
    }
    // moons: on circles in the planet's equator plane. Time is sped up a lot when they're set to move:
    // the main moon goes round in ~30 min, the others faster or slower by Kepler's law.
    const moons = (q.moons || []).map(m => ({ name: m.name, ph: m.ph, a: m.aKm, r: m.rKm, col: m.col, haze: m.haze, look: m.look, major: m.major, side: m.side, retro: m.retro }));
    const main = moons.find(m => m.major) || moons[0];
    moonObjs = moons.map(m => {
      const body = new THREE.Mesh(new THREE.SphereGeometry(m.r * k, 64, 40), moonMat(m.col, m.haze, moonTexture(m)));
      // a small glow so far-away moons still read as points of light (never smaller than ~2 px)
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: m.haze ? hazeGlowTex : moonGlowTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 1 }));
      const holder = new THREE.Group(); holder.add(body, glow);
      g.add(holder);
      const period = MAIN_MOON_PERIOD_S * Math.pow(m.a / main.a, 1.5);
      const th0 = m.ph * Math.PI / 180;         // where it is today (the catalogue's time model)
      return { m, holder, glow, body, th: th0, w: (m.retro ? -2 : 2) * Math.PI / period };
    });
    // name tags and flight targets: the planet, its main moon, then the rest
    const km = v => Math.round(v).toLocaleString('en-US') + ' KM';
    const add = (name, obj, mo, side, minor) => {
      const t = { name, obj, rKm: mo ? mo.m.r : eqKm * 1.12, minor, sx: (side || [1, -1])[0], sy: (side || [1, -1])[1] };   // (the planet's line starts just off its edge)
      makeTag(t, hudEl); hudEl.prepend(t.g);
      HUD_TARGETS.push(t);
      const n = { t, name, moon: mo,
        bodyR: (mo ? mo.m.r : eqKm) * k,               // the solid body
        fitR: (mo ? mo.m.r : BODY.fitKm) * k,          // what has to fit on screen (a ringed planet: its rings)
        facts: mo ? ['DIAMETER ' + km(2 * mo.m.r), 'ORBIT ' + km(mo.m.a) + ' FROM ' + q.name.toUpperCase()]
                  : q.facts || ['DIAMETER ' + km(2 * eqKm), ...(q.rings ? ['RINGS ' + km(2 * q.rings.A1) + ' ACROSS'] : [])] };
      n.occ = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), occMat); n.occ.renderOrder = -10; occluders.add(n.occ);
      n.occNear = new THREE.Mesh(n.occ.geometry, occMat); n.occNear.renderOrder = -10; nearOcc.add(n.occNear);
      NAV.push(n);
    };
    add(q.name.toUpperCase(), g, null, q.side, false);
    moonObjs.filter(o => o.m.major).forEach(o => add(o.m.name.toUpperCase(), o.holder, o, o.m.side, false));
    moonObjs.filter(o => !o.m.major).forEach(o => add(o.m.name.toUpperCase(), o.holder, o, o.m.side, true));
    updateMoons(0); g.updateMatrixWorld(true);
  }

  // Flight direction = straight at the screen, whatever way space has been turned.
  // The dots live inside the rotating rig, so each frame the screen's "toward you" axis
  // is converted into the rig's own coordinates.
  const flyDir = new THREE.Vector3(), flyU = new THREE.Vector3(), flyV = new THREE.Vector3();
  const invRig = new THREE.Quaternion(), helper = new THREE.Vector3();
  let bornDirty = false, warp = 1;
  function updateField(t, dt) {
    invRig.copy(spaceRig.quaternion).invert();
    flyDir.set(0, 0, 1).applyQuaternion(invRig);                 // toward the camera, in rig space
    helper.set(0, 1, 0).applyQuaternion(invRig);                 // screen "up", in rig space
    flyU.crossVectors(helper, flyDir).normalize();               // two axes across the screen
    flyV.crossVectors(flyDir, flyU).normalize();
    const p = fPos;
    for (let i = 0; i < FIELD_N; i++) {
      const k = i * 3;
      const sp = fSpeed[i] * CFG.dotSpeed * warp * dt;
      const swU = Math.sin(t * 0.3 + fPhase[i]) * fSway[i] * CFG.dotSway * dt;  // gentle individual sway
      const swV = Math.cos(t * 0.25 + fPhase[i]) * fSway[i] * CFG.dotSway * dt;
      p[k]   += flyDir.x * sp + flyU.x * swU + flyV.x * swV;
      p[k+1] += flyDir.y * sp + flyU.y * swU + flyV.y * swV;
      p[k+2] += flyDir.z * sp + flyU.z * swU + flyV.z * swV;
      // passed behind you and left the sphere: re-enter far ahead, at the matching spot
      if (p[k]*p[k] + p[k+1]*p[k+1] + p[k+2]*p[k+2] > R2) {
        let a, b;
        do { a = rnd(-R, R); b = rnd(-R, R); } while (a*a + b*b > R2 * 0.98);
        const back = -Math.sqrt(R2 - a*a - b*b) + 0.5;
        p[k]   = flyU.x * a + flyV.x * b + flyDir.x * back;
        p[k+1] = flyU.y * a + flyV.y * b + flyDir.y * back;
        p[k+2] = flyU.z * a + flyV.z * b + flyDir.z * back;
        fBorn[i] = t; bornDirty = true;
      }
    }
    fGeo.attributes.position.needsUpdate = true;
    if (bornDirty) { fGeo.attributes.aBorn.needsUpdate = true; bornDirty = false; }
    fMat.uniforms.uTime.value = t;
    fMat.uniforms.uSize.value = CFG.dotSize;
  }

  // =========================================================
  //  DATA: groups and their apps (placeholder names + original icons)
  // =========================================================
  const DEFAULT_GROUPS = [
    { name: 'Social', tint: '#ff6fa8', apps: [
      { name: 'Chat',    c1: '#ff8a5c', c2: '#d9367a', glyph: 'bubble' },
      { name: 'Photos',  c1: '#ffd25c', c2: '#e0742b', glyph: 'sun' },
      { name: 'Friends', c1: '#ff6fa8', c2: '#8a2bd9', glyph: 'heart' },
      { name: 'Feed',    c1: '#6cc8ff', c2: '#2c64c9', glyph: 'wave' } ]},
    { name: 'Media', tint: '#9b6bff', apps: [
      { name: 'Music',    c1: '#9b6bff', c2: '#3a2bb8', glyph: 'note' },
      { name: 'Video',    c1: '#ff5c5c', c2: '#a3123a', glyph: 'play' },
      { name: 'Podcasts', c1: '#c46bff', c2: '#5a1d9e', glyph: 'wave' },
      { name: 'Radio',    c1: '#ff9f5c', c2: '#c9452c', glyph: 'ring' } ]},
    { name: 'Games', tint: '#5ce08a', apps: [
      { name: 'Arcade', c1: '#5ce08a', c2: '#1d8f8a', glyph: 'star' },
      { name: 'Puzzle', c1: '#ffd25c', c2: '#2c9e5a', glyph: 'tri' },
      { name: 'Racing', c1: '#ff6b5c', c2: '#e0b02b', glyph: 'play' },
      { name: 'Cards',  c1: '#6cffd8', c2: '#1d6f8f', glyph: 'heart' },
      { name: 'Retro',  c1: '#b8ff5c', c2: '#3a8f1d', glyph: 'planet' } ]},
    { name: 'Tools', tint: '#6cc8ff', apps: [
      { name: 'Camera',  c1: '#6cc8ff', c2: '#2c64c9', glyph: 'ring' },
      { name: 'Files',   c1: '#8aa0ff', c2: '#3a4bb8', glyph: 'tri' },
      { name: 'Calc',    c1: '#5cd3e0', c2: '#1d5f8f', glyph: 'plus' },
      { name: 'Weather', c1: '#ffd25c', c2: '#3a8fe0', glyph: 'sun' } ]},
    { name: 'Work', tint: '#ffd25c', apps: [
      { name: 'Mail',     c1: '#5c9eff', c2: '#2b3ab8', glyph: 'bubble' },
      { name: 'Calendar', c1: '#ff7a5c', c2: '#c92c4b', glyph: 'plus' },
      { name: 'Notes',    c1: '#ffe15c', c2: '#e09a2b', glyph: 'wave' } ]},
    { name: 'Space', tint: '#2fd3c4', apps: [
      { name: 'Stars',   c1: '#2fd3c4', c2: '#3a5bff', glyph: 'star' },
      { name: 'Moon',    c1: '#9b6bff', c2: '#1d1d6f', glyph: 'moon' },
      { name: 'Planets', c1: '#ff9f5c', c2: '#7a2bd9', glyph: 'planet' },
      { name: 'Orbit',   c1: '#5ce0d0', c2: '#2c64c9', glyph: 'ring' } ]},
  ];

  // Apps that aren't in any group yet. Never shown as a cube on the home screen;
  // they only appear in Settings. (In the real launcher, newly installed apps land here.)
  const DEFAULT_UNSORTED = [
    { name: 'Maps',      c1: '#5ce08a', c2: '#2c64c9', glyph: 'tri' },
    { name: 'Bank',      c1: '#ffd25c', c2: '#2c9e5a', glyph: 'plus' },
    { name: 'Translate', c1: '#6cc8ff', c2: '#9b6bff', glyph: 'bubble' },
    { name: 'Fitness',   c1: '#ff6b5c', c2: '#ff9f5c', glyph: 'heart' },
  ];

  // ---- Running inside the Android app? Then use the phone's real apps. ----
  const NATIVE = !!(window.Launcher && window.Launcher.isNative && window.Launcher.isNative());
  const keyOf = app => app.key || app.name;          // stable id: package/activity on the phone, name in the browser
  let NATIVE_APPS = new Map();                        // key -> app object
  function loadNativeApps() {
    NATIVE_APPS = new Map();
    let list = [];
    try { list = JSON.parse(window.Launcher.getApps()); } catch (e) {}
    list.forEach(a => {
      // work-profile apps: their own key (personal keys stay as before, so saves keep working) and "(Work)" in the name
      const app = { key: a.pkg + '/' + a.activity + (a.work ? '@' + a.user : ''), pkg: a.pkg, activity: a.activity,
                    name: a.work ? a.name + ' (Work)' : a.name, work: !!a.work, user: a.work ? a.user : null,
                    icon: a.icon, category: a.category, c1: '#5fe3f2', c2: '#2c64c9' };
      app.img = new Image(); app.img.src = a.icon;
      NATIVE_APPS.set(app.key, app);
    });
  }
  // First launch on the phone: pre-sort by each app's own category; the rest go to Unsorted.
  function autoSortNative() {
    const groups = [
      { name: 'Social', tint: '#ff6fa8', apps: [] }, { name: 'Media', tint: '#9b6bff', apps: [] },
      { name: 'Games', tint: '#5ce08a', apps: [] },  { name: 'Tools', tint: '#6cc8ff', apps: [] },
      { name: 'Work', tint: '#ffd25c', apps: [] },
    ];
    const to = { social: 0, audio: 1, video: 1, image: 1, game: 2, maps: 3, news: 3, productivity: 4 };
    const unsorted = [];
    [...NATIVE_APPS.values()].sort((x, y) => x.name.localeCompare(y.name)).forEach(app => {
      const gi = to[app.category]; (gi === undefined ? unsorted : groups[gi].apps).push(app);
    });
    const firstTwo = [...NATIVE_APPS.values()].slice(0, 2).map(keyOf);
    return { groups, unsorted, favs: [firstTwo[0] || '', firstTwo[1] || ''] };
  }

  // Saved arrangement. In the browser it's the placeholder apps; on the phone it's real apps (stored by key).
  const STORE_KEY = NATIVE ? 'spaceCubeGroups.phone.v1' : 'spaceCubeGroups.v2';
  const copy = o => JSON.parse(JSON.stringify(o));
  function loadData() {
    if (NATIVE) {
      loadNativeApps();
      try {
        const d = JSON.parse(localStorage.getItem(STORE_KEY));
        if (d && Array.isArray(d.groups) && d.groups.length) return reconcile(d);
      } catch (e) {}
      return autoSortNative();
    }
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d && Array.isArray(d.groups) && d.groups.length && Array.isArray(d.unsorted)) return d;
    } catch (e) {}
    return { groups: copy(DEFAULT_GROUPS), unsorted: copy(DEFAULT_UNSORTED), favs: ['Chat', 'Camera'] };
  }
  // Rebuild real app objects from saved keys: uninstalled apps drop out, new installs land in Unsorted.
  function reconcile(d) {
    const used = new Set();
    const take = k => { const a = NATIVE_APPS.get(k); if (a && !used.has(k)) { used.add(k); return a; } return null; };
    const groups = d.groups.map(g => ({ name: g.name, tint: g.tint, apps: (g.keys || []).map(take).filter(Boolean) }));
    const unsorted = (d.unsorted || []).map(take).filter(Boolean);
    [...NATIVE_APPS.values()].forEach(a => { if (!used.has(a.key)) unsorted.push(a); });
    const favs = (d.favs || ['', '']).map(k => NATIVE_APPS.has(k) ? k : '');
    return { groups, unsorted, favs };
  }
  function saveGroups() {
    try {
      const data = NATIVE
        ? { groups: GROUPS.map(g => ({ name: g.name, tint: g.tint, keys: g.apps.map(keyOf) })), unsorted: UNSORTED.map(keyOf), favs: FAVS }
        : { groups: GROUPS, unsorted: UNSORTED, favs: FAVS };
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  const saved = loadData();
  let GROUPS = saved.groups;
  let UNSORTED = saved.unsorted;
  let FAVS = Array.isArray(saved.favs) && saved.favs.length === 2 ? saved.favs : ['Chat', 'Camera'];   // [left egg, right egg] (app keys)
  // one haptic helper for both the phone and the browser
  function buzz(pattern) {
    try {
      if (NATIVE) window.Launcher.vibrate(Array.isArray(pattern) ? pattern.reduce((a, b, i) => i % 2 ? a : a + b, 0) : pattern);
      else if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  }
  const MAX_GROUPS = 6;
  const TINTS = ['#ff6fa8','#9b6bff','#5ce08a','#6cc8ff','#ffd25c','#2fd3c4','#ff9f5c','#c46bff'];

  // =========================================================
  //  TEXTURES
  // =========================================================
  function drawGlyph(x, kind, cx, cy) {
    x.fillStyle = '#fff'; x.strokeStyle = '#fff'; x.lineWidth = 14; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath();
    if (kind === 'planet') {
      x.arc(cx, cy, 64, 0, Math.PI*2); x.fill();
      x.beginPath(); x.ellipse(cx, cy, 124, 36, -0.35, 0, Math.PI*2); x.stroke();
    } else if (kind === 'star') {
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 42 : 100, a = -Math.PI/2 + i * Math.PI/5;
        x.lineTo(cx + r*Math.cos(a), cy + r*Math.sin(a));
      }
      x.closePath(); x.fill();
    } else if (kind === 'moon') {
      x.arc(cx, cy, 90, 0, Math.PI*2); x.fill();
      x.globalCompositeOperation = 'destination-out';
      x.beginPath(); x.arc(cx + 45, cy - 30, 80, 0, Math.PI*2); x.fill();
      x.globalCompositeOperation = 'source-over';
    } else if (kind === 'wave') {
      for (let k = -1; k <= 1; k++) {
        x.beginPath();
        for (let i = 0; i <= 40; i++) {
          const px = cx - 110 + i * 5.5, py = cy + k*48 + Math.sin(i/40*Math.PI*2) * 22;
          i ? x.lineTo(px, py) : x.moveTo(px, py);
        }
        x.stroke();
      }
    } else if (kind === 'sun') {
      x.arc(cx, cy, 52, 0, Math.PI*2); x.fill();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI/4;
        x.beginPath(); x.moveTo(cx + 78*Math.cos(a), cy + 78*Math.sin(a));
        x.lineTo(cx + 112*Math.cos(a), cy + 112*Math.sin(a)); x.stroke();
      }
    } else if (kind === 'tri') {
      x.moveTo(cx, cy - 100); x.lineTo(cx + 95, cy + 70); x.lineTo(cx - 95, cy + 70);
      x.closePath(); x.lineWidth = 18; x.stroke();
    } else if (kind === 'heart') {
      x.moveTo(cx, cy + 85);
      x.bezierCurveTo(cx - 140, cy - 10, cx - 70, cy - 110, cx, cy - 45);
      x.bezierCurveTo(cx + 70, cy - 110, cx + 140, cy - 10, cx, cy + 85); x.fill();
    } else if (kind === 'note') {
      x.arc(cx - 40, cy + 60, 34, 0, Math.PI*2); x.fill();
      x.fillRect(cx - 12, cy - 95, 18, 160);
      x.fillRect(cx - 12, cy - 95, 80, 22);
    } else if (kind === 'play') {
      x.moveTo(cx - 55, cy - 85); x.lineTo(cx + 85, cy); x.lineTo(cx - 55, cy + 85); x.closePath(); x.fill();
    } else if (kind === 'ring') {
      x.lineWidth = 22; x.arc(cx, cy, 85, 0, Math.PI*2); x.stroke();
      x.beginPath(); x.arc(cx, cy, 30, 0, Math.PI*2); x.fill();
    } else if (kind === 'bubble') {
      x.ellipse(cx, cy - 10, 105, 75, 0, 0, Math.PI*2); x.fill();
      x.beginPath(); x.moveTo(cx - 50, cy + 45); x.lineTo(cx - 75, cy + 100); x.lineTo(cx - 5, cy + 55); x.fill();
    } else if (kind === 'plus') {
      x.lineWidth = 30; x.moveTo(cx, cy - 85); x.lineTo(cx, cy + 85);
      x.moveTo(cx - 85, cy); x.lineTo(cx + 85, cy); x.stroke();
    }
  }

  // One glass colour for every cube: the cyan of the clock display
  const GLASS = '#5fe3f2';
  // '#rrggbb' + alpha -> 'rgba(...)'
  const tintRGBA = (hex, a) => 'rgba(' + [1,3,5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',') + ',' + a + ')';
  function roundRectPath(x, px, py, w, r) {
    x.beginPath();
    x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + w, r);
    x.arcTo(px + w, py + w, px, py + w, r); x.arcTo(px, py + w, px, py, r);
    x.arcTo(px, py, px + w, py, r); x.closePath();
  }

  // App cube face: glass with the app's illustration tile in the middle
  function appTexture(app) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = tintRGBA(GLASS, 0.198); x.fillRect(0, 0, S, S);         // clock-cyan glass (10% lighter than before)
    x.strokeStyle = 'rgba(170,220,255,0.55)'; x.lineWidth = 10; x.strokeRect(5, 5, S-10, S-10);
    const pad = 96, w = S - pad*2;
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (app.img) {                                   // real app icon (on the phone)
      const paint = () => { x.drawImage(app.img, pad - 12, pad - 12, w + 24, w + 24); t.needsUpdate = true; };
      if (app.img.complete && app.img.naturalWidth) paint(); else app.img.addEventListener('load', paint, { once: true });
      return t;
    }
    const g = x.createLinearGradient(pad, pad, pad + w, pad + w);
    g.addColorStop(0, app.c1); g.addColorStop(1, app.c2);
    x.fillStyle = g; roundRectPath(x, pad, pad, w, 70); x.fill();
    const gc = document.createElement('canvas'); gc.width = gc.height = S;
    drawGlyph(gc.getContext('2d'), app.glyph, S/2, S/2);
    x.drawImage(gc, 0, 0);
    return t;
  }
  // Solid icon on all faces for the small cubes shown inside a group
  function miniTexture(app) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    if (app.img) {                                   // real app icon on a dark-glass backing
      const t = new THREE.CanvasTexture(c);
      const paint = () => { x.fillStyle = '#16323f'; x.fillRect(0, 0, S, S); x.drawImage(app.img, 8, 8, S - 16, S - 16); t.needsUpdate = true; };
      x.fillStyle = '#16323f'; x.fillRect(0, 0, S, S);
      if (app.img.complete && app.img.naturalWidth) paint(); else app.img.addEventListener('load', paint, { once: true });
      return t;
    }
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, app.c1); g.addColorStop(1, app.c2);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    const gc = document.createElement('canvas'); gc.width = gc.height = 512;
    drawGlyph(gc.getContext('2d'), app.glyph, 256, 256);
    x.drawImage(gc, 0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }
  // Group cube face: clear tinted glass, bright border, nothing else
  function groupTexture(tint) {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = tintRGBA(GLASS, 0.144); x.fillRect(0, 0, S, S);         // clock-cyan glass (10% lighter than before)
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);          // subtle glass sheen
    x.strokeStyle = GLASS; x.globalAlpha = 0.75; x.lineWidth = 12; x.strokeRect(6, 6, S-12, S-12);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }

  // Cube names use the same HUD look as the planet tags: Orbitron, uppercase,
  // wide letter spacing, mint green with a soft glow.
  const LABEL_FONT = "600 40px 'Orbitron', system-ui, sans-serif";
  const liveLabels = new Set();                  // so labels can be redrawn once the font has loaded
  function drawLabel(c, text) {
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.font = LABEL_FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
    const t = text.toUpperCase();
    if ('letterSpacing' in x) x.letterSpacing = '5px';
    const w = x.measureText(t).width;
    const fit = Math.min(1, (c.width - 24) / w);   // shrink long names to fit
    x.save(); x.translate(c.width / 2, c.height / 2); x.scale(fit, fit);
    x.shadowColor = 'rgba(90,255,190,0.75)'; x.shadowBlur = 10;
    x.fillStyle = '#a6ffd9'; x.fillText(t, 0, 0);
    x.restore();
  }
  function labelSprite(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    drawLabel(c, text);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(1.6, 0.3, 1);
    sp.userData.label = { c, text, tex };
    liveLabels.add(sp);
    return sp;
  }
  // Orbitron loads from the web: redraw every label once it's ready
  if (document.fonts && document.fonts.load) {
    document.fonts.load(LABEL_FONT).then(() => {
      liveLabels.forEach(sp => { const L = sp.userData.label; drawLabel(L.c, L.text); L.tex.needsUpdate = true; });
    }).catch(() => {});
  }

  // =========================================================
  //  CUBES
  // =========================================================
  function roundedBox(size, radius, seg) {
    const g = new THREE.BoxGeometry(size, size, size, seg, seg, seg);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const inner = size / 2 - radius;
    const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      c.set(Math.max(-inner, Math.min(inner, v.x)),
            Math.max(-inner, Math.min(inner, v.y)),
            Math.max(-inner, Math.min(inner, v.z)));
      n.subVectors(v, c).normalize();
      v.copy(c).addScaledVector(n, radius);
      pos.setXYZ(i, v.x, v.y, v.z); nor.setXYZ(i, n.x, n.y, n.z);
    }
    pos.needsUpdate = nor.needsUpdate = true;
    return g;
  }
  const CUBE = 0.95;
  const geo = roundedBox(CUBE, CUBE * 0.14, 20);
  const MINI = 0.24;
  const miniGeo = roundedBox(MINI, MINI * 0.18, 6);
  const haloTex = glowTexture('rgba(110,190,255,0.6)');
  const appLayer = new THREE.Group(); scene.add(appLayer);

  // Builds one cube "item" (group or app). Opacity values are the item's full-visibility levels.
  // Inside walls of an app cube: plain glass only. Showing the icons on the inside walls
  // made dark, mirrored "shadow" copies of the icons visible through the front.
  function glassBackTexture() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.144)'; x.fillRect(0, 0, S, S);    // tinted clock-cyan via material colour
    return new THREE.CanvasTexture(c);
  }
  const appBackTex = glassBackTexture();

  function makeItem(kind, data, tex, frontOp, backOp) {
    const glass = { map: tex, transparent: true, depthWrite: false, metalness: 0.1, roughness: 0.1,
                    emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: kind === 'group' ? 0.25 : 0.4 };
    const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({ side: THREE.FrontSide, opacity: frontOp }, glass)));
    const backTex = kind === 'app' ? appBackTex : tex;
    const back  = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({}, glass,
      { side: THREE.BackSide, opacity: backOp, map: backTex, emissiveMap: backTex,
        color: kind === 'app' ? new THREE.Color(GLASS) : new THREE.Color(0xffffff),
        emissive: kind === 'app' ? new THREE.Color(GLASS) : new THREE.Color(0xffffff) })));
    front.renderOrder = 3; back.renderOrder = 1; front.add(back);
    front.quaternion.setFromEuler(new THREE.Euler(Math.random()*6, Math.random()*6, 0));

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.set(2.6, 2.6, 1); halo.position.z = -0.6;
    const label = labelSprite(data.name); label.position.y = -0.85;

    const holder = new THREE.Group();
    holder.add(halo, front, label);
    holder.visible = false;
    appLayer.add(holder);

    return { kind, data, holder, mesh: front, back, halo, label, frontOp, backOp, minis: [],
      velX: (Math.random() - 0.5) * 0.4, velY: 0.15 + Math.random() * 0.2,
      phase: Math.random() * Math.PI * 2, base: new THREE.Vector3(), scale: 1, selP: 0,
      vis: 0, visTarget: 0, origin: null };
  }

  // Small app cubes floating inside each group cube (up to 4, arranged like a tetrahedron)
  const MINI_SPOTS = [[-1,-1,-1],[1,1,-1],[1,-1,1],[-1,1,1]].map(p => new THREE.Vector3(...p).multiplyScalar(0.16));
  let groupItems = [];
  const appItemsByGroup = new Map();             // built the first time a group is opened
  function buildGroupItem(g) {
    const it = makeItem('group', g, groupTexture(g.tint), 0.55, 0.3);
    g.apps.slice(0, 4).forEach((app, k) => {
      const tex = miniTexture(app);
      const m = new THREE.Mesh(miniGeo, new THREE.MeshStandardMaterial({
        map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35,
        metalness: 0.2, roughness: 0.4, transparent: true, opacity: 1 }));
      m.position.copy(MINI_SPOTS[k]);
      m.renderOrder = 2;                         // between the group's back and front glass
      m.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.8);
      it.mesh.add(m); it.minis.push(m);
    });
    return it;
  }
  function disposeItem(it) {
    liveLabels.delete(it.label);
    it.holder.traverse(o => {
      if (o.material) { if (o.material.map && o.material.map !== haloTex && o.material.map !== appBackTex) o.material.map.dispose(); o.material.dispose(); }
    });
    appLayer.remove(it.holder);
  }
  // Rebuild every cube from GROUPS (called after the settings menu changes things)
  function rebuildCubes() {
    groupItems.forEach(disposeItem);
    appItemsByGroup.forEach(list => list.forEach(disposeItem));
    appItemsByGroup.clear();
    groupItems = GROUPS.map(buildGroupItem);
    let hv = 'groups'; try { hv = homeView; } catch (e) {}
    groupItems.forEach(it => { it.visTarget = hv === 'groups' ? 1 : 0; it.vis = 0; });
    layout();
    try { recentCache.forEach(disposeItem); recentCache.clear(); recentItems = []; refreshRecents(); } catch (e) {}
  }
  function appItemsFor(gi) {
    if (!appItemsByGroup.has(gi)) {
      appItemsByGroup.set(gi, GROUPS[gi].apps.map(a => { const it = makeItem('app', a, appTexture(a), 0.95, 0.45); it.inGroup = true; return it; }));
      layout();
    }
    return appItemsByGroup.get(gi);
  }

  // Grid layout: 2 columns in portrait, 3 in landscape. Camera fits a 6-cube grid.
  // ---- Arrival: the fly-in played on unlock (and when the launcher first starts) ----
  let camBaseZ = 0, arrivalT = 1, arrivalHeld = false;                  // arrivalT: 0 -> 1 over the fly-in; 1 = done
  const ARRIVAL_S = 1.7;
  const easeOutCubic = x => 1 - Math.pow(1 - x, 3);
  const easeOutBack = x => { const k = 1.6, p = x - 1; return 1 + (k + 1) * p * p * p + k * p * p; };
  function playArrival() {
    arrivalT = 0;
    if (typeof requestCoverHide === 'function') requestCoverHide();
    document.body.classList.add('arriving');          // tuck the clock, buttons and console away instantly...
    void document.body.offsetWidth;
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('arriving')));   // ...then slide them in
  }
  // system bars (Android app only): CSS px covered by the status bar / gesture bar
  const INSETS = { top: 0, bottom: 0 };
  const CLOCK_BASE = 1.4;
  let CLOCK_SPACE = CLOCK_BASE;
  const CONSOLE_BASE = 2.2;
  let CONSOLE_SPACE = CONSOLE_BASE;   // empty band kept at the bottom for the Saturn-style console (coming next)
  function gridPositions(items) {
    const aspect = innerWidth / innerHeight;
    const cols6 = aspect < 1 ? 2 : 3;
    const n = items.length;
    const big = n > 6 && items[0] && items[0].inGroup;     // a group with lots of apps
    // up to 6: the normal big cubes. More: 3 or 4 per row, smaller, and the list scrolls.
    const cols = big ? (n <= 12 ? cols6 + 1 : cols6 + 2) : cols6;
    const size = big ? (cols === cols6 + 1 ? 0.72 : 0.56) : 1;
    const gx = 1.7 * (cols6 + 0.15) / (cols + 0.15) * (big ? 1 : 1), gy = big ? 1.75 * size + 0.18 : 1.75;
    const rows6 = Math.ceil(6 / cols6);
    const topY = ((rows6 - 1) / 2) * 1.75 + 0.1 - CLOCK_SPACE / 2 + CONSOLE_SPACE / 2;
    const usedRows = Math.ceil(n / cols);
    items.forEach((c, i) => {
      const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
      c.sizeMul = c.inGroup ? size : (c.sizeMul || 1);
      c.arrIdx = i;
      if (big) c.base.set((col - (inRow - 1) / 2) * gx, topY - row * gy, 0);
      else c.base.set((col - (inRow - 1) / 2) * gx, ((usedRows - 1) / 2 - row) * gy + topY - ((rows6 - 1) / 2) * 1.75, 0);
    });
    if (items[0] && items[0].inGroup) items.scrollMax = big ? Math.max(0, (usedRows - 1) * gy - (rows6 - 1) * 1.75) : 0;
  }
  // visible band for a scrolling group (cubes outside it fade out under the clock / console)
  function scrollBand() {
    const rows6 = 3, topY = ((rows6 - 1) / 2) * 1.75 + 0.1 - CLOCK_SPACE / 2 + CONSOLE_SPACE / 2;
    return { top: topY + 0.75, bottom: topY - (rows6 - 1) * 1.75 - 0.75 };
  }
  let groupScroll = 0, groupScrollVel = 0;
  function layout() {
    const aspect = innerWidth / innerHeight;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    const most = 6;                                  // fixed zoom; big groups scroll instead
    const cols = aspect < 1 ? 2 : 3, rows = Math.ceil(most / cols);
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // fit the grid, then widen the top/bottom reserves by the system bars and fit again
    const fitZ = () => {
      const w = (cols - 1) * 1.7 + 1.8, h = (rows - 1) * 1.75 + 2.2 + CLOCK_SPACE + CONSOLE_SPACE;
      return Math.max(h / (2 * tanH), w / (2 * tanH * aspect)) + 0.6;
    };
    CLOCK_SPACE = CLOCK_BASE; CONSOLE_SPACE = CONSOLE_BASE;
    for (let k = 0; k < 2; k++) {
      const wpp = 2 * tanH * fitZ() / innerHeight;    // world units per screen pixel
      CLOCK_SPACE = CLOCK_BASE + INSETS.top * wpp;
      CONSOLE_SPACE = CONSOLE_BASE + INSETS.bottom * wpp;
    }
    camera.position.set(0, 0, fitZ());
    spaceRig.position.copy(camera.position); syncSysRig();
    camBaseZ = camera.position.z;
    gridPositions(groupItems);
    appItemsByGroup.forEach(list => gridPositions(list));
    try { if (recentItems.length) { gridPositions(recentItems); recentItems.forEach(it => it.targetBase = it.base.clone()); } } catch (e) {}   // (not created yet at first layout)
  }
  // =========================================================
  //  RECENT APPS: the home screen shows a cube for each app you're using (max 6).
  //  A cube appears when an app is used and stays until you flick it away (upward).
  //  The groups live on a second screen (button at the top right).
  // =========================================================
  let homeView = 'recent';                         // 'recent' | 'groups'
  // Slots are made only by launching: the list starts empty, a launch adds a cube in the next slot,
  // re-opening an app keeps its slot, and when all 6 are taken the least recently used one gives up its slot.
  const RECENT_MAX = 6, RECENT_KEY = NATIVE ? 'spaceCubeRecents.phone.v2' : 'spaceCubeRecents.v2';
  let RECENTS = [], DISMISSED = {}, SINCE = Date.now();   // RECENTS: [{ key, t }] in slot order; SINCE: phone history read up to here
  try { const d = JSON.parse(localStorage.getItem(RECENT_KEY)); if (d) { RECENTS = d.recents || []; DISMISSED = d.dismissed || {}; SINCE = d.since || SINCE; } } catch (e) {}
  function saveRecents() { try { localStorage.setItem(RECENT_KEY, JSON.stringify({ recents: RECENTS, dismissed: DISMISSED, since: SINCE })); } catch (e) {} }
  saveRecents();                                   // first run: history before now is never pulled in
  // Put an app in the list: keep its slot if it has one, else take the next slot (evicting the least recently used when full)
  function placeRecent(k, t) {
    const cur = RECENTS.find(r => r.key === k);
    if (cur) { cur.t = Math.max(cur.t, t); return; }
    if (RECENTS.length >= RECENT_MAX) {               // full: take over the least recently used slot, others stay put
      const oldest = RECENTS.reduce((a, b) => (b.t < a.t ? b : a));
      RECENTS[RECENTS.indexOf(oldest)] = { key: k, t };
    } else RECENTS.push({ key: k, t });
  }
  const recentCache = new Map();                   // app key -> its cube
  let recentItems = [];
  const findAppByKey = key => allApps().find(a => keyOf(a) === key);
  function recentItemFor(app) {
    const k = keyOf(app);
    if (!recentCache.has(k)) recentCache.set(k, makeItem('app', app, appTexture(app), 0.95, 0.45));
    return recentCache.get(k);
  }
  function recentsShowing() { let s = false; try { s = searchActive; } catch (e) {} return homeView === 'recent' && !s; }   // (search may not exist yet at startup)
  // Rebuild the recent grid from RECENTS; cubes glide to their new spots, new ones pop in, closed ones leave
  function refreshRecents() {
    const apps = RECENTS.map(r => findAppByKey(r.key)).filter(Boolean).slice(0, RECENT_MAX);
    const next = apps.map(recentItemFor);
    recentItems.forEach(it => { if (!next.includes(it)) { it.visTarget = 0; try { if (selected === it) selected = null; } catch (e) {} } });
    const olds = next.map(it => it.base.clone());
    gridPositions(next);                            // sets each cube's base to its new spot...
    next.forEach((it, i) => {
      it.targetBase = it.base.clone();
      if (it.vis > 0.05 && !it.flyOff) it.base.copy(olds[i]);   // ...then glides there from where it was
      it.visTarget = recentsShowing() ? 1 : 0;
    });
    recentItems = next;
    updateEmptyHint();
  }
  // An app was launched (from here, or reported by the phone)
  function noteAppUsed(app, t) {
    const k = keyOf(app); t = t || Date.now();
    placeRecent(k, t);
    delete DISMISSED[k];
    saveRecents(); refreshRecents();
  }
  // Flicked away: the cube shoots up and off the screen
  function dismissRecent(c) {
    const k = keyOf(c.data);
    RECENTS = RECENTS.filter(r => r.key !== k);
    DISMISSED[k] = Date.now();
    c.flyOff = true; c.visTarget = 0;
    saveRecents(); refreshRecents();
  }
  // On the phone: ask Android which apps were opened since the last check (never before the launcher started counting)
  function syncPhoneRecents() {
    if (!NATIVE || !window.Launcher.getRecentApps) return;
    let list = [];
    const now = Date.now();
    try { list = JSON.parse(window.Launcher.getRecentApps(SINCE)); } catch (e) { return; }
    SINCE = now;
    list.sort((a, b) => a.t - b.t);                            // oldest first, so slots fill in launch order
    let changed = false;
    list.forEach(({ pkg, t }) => {
      const app = [...NATIVE_APPS.values()].find(a => a.pkg === pkg && !a.work) || [...NATIVE_APPS.values()].find(a => a.pkg === pkg);   // usage history is the personal profile's
      if (!app) return;
      const k = keyOf(app);
      if (DISMISSED[k] && DISMISSED[k] >= t) return;          // closed after its last use: stays closed
      placeRecent(k, t); delete DISMISSED[k]; changed = true;
    });
    saveRecents();
    if (changed) refreshRecents();
  }

  // Switch between the recent-apps screen and the groups screen
  function setHomeView(v) {
    if (v === homeView && !(v === 'groups' && openGroupIdx >= 0)) return;
    if (openGroupIdx >= 0) leaveGroup();
    homeView = v; selected = null;
    groupItems.forEach(it => it.visTarget = v === 'groups' ? 1 : 0);
    recentItems.forEach(it => it.visTarget = v === 'recent' ? 1 : 0);
    const viewBtn = document.getElementById('hideBtn');
    viewBtn.textContent = v === 'groups' ? '◈' : '▦';
    viewBtn.setAttribute('aria-label', v === 'groups' ? 'Show open apps' : 'Show groups');
    groupTitle.textContent = v === 'groups' ? 'GROUPS' : '';
    groupTitle.classList.toggle('show', v === 'groups');
    updateEmptyHint();
  }
  function updateEmptyHint() {
    const el = document.getElementById('recentEmpty');
    if (!el) return;
    const show = recentsShowing() && !recentItems.length;
    el.classList.toggle('show', show);
    const ask = document.getElementById('usageAsk');
    if (ask) ask.style.display = NATIVE && window.Launcher.hasUsageAccess && !window.Launcher.hasUsageAccess() ? '' : 'none';
  }

  rebuildCubes();                                // start on the home screen

  // Lights
  scene.add(new THREE.AmbientLight(0x404a70, 0.9));
  const key = new THREE.DirectionalLight(0xbfd8ff, 1.2); key.position.set(3, 4, 5); scene.add(key);
  const rimP = new THREE.PointLight(0xb060ff, 1.2, 30); rimP.position.set(-4, -3, -2); scene.add(rimP);
  const rimB = new THREE.PointLight(0x7fd4ff, 1.0, 30); rimB.position.set(4, -1, 4);  scene.add(rimB);

  // =========================================================
  //  NAVIGATION: home (groups) <-> inside a group (apps)
  // =========================================================
  let openGroupIdx = -1;                         // -1 = home screen
  const groupBackBtn = document.getElementById('groupBack');
  const groupTitle = document.getElementById('groupTitle');

  function currentItems() {
    if (searchActive) return resultItems;
    if (homeView === 'recent') return recentItems;
    return openGroupIdx < 0 ? groupItems : appItemsFor(openGroupIdx);
  }

  function enterGroup(gi) {
    const g = groupItems[gi];
    openGroupIdx = gi; selected = null; groupScroll = 0; groupScrollVel = 0;
    groupItems.forEach(it => it.visTarget = 0);
    appItemsFor(gi).forEach(it => {
      it.origin = g.base.clone();              // apps burst out of the group cube
      it.vis = 0; it.visTarget = 1;
      it.velY = 6 + Math.random() * 4;          // spin as they emerge
    });
    g.velY = 10;
    groupTitle.textContent = g.data.name.toUpperCase();
    groupTitle.classList.add('show'); groupBackBtn.classList.add('show'); settingsBtn.classList.add('hidden');
  }
  function leaveGroup() {
    if (openGroupIdx < 0) return;
    appItemsFor(openGroupIdx).forEach(it => it.visTarget = 0);   // fly back into the group cube
    groupItems.forEach(it => it.visTarget = 1);
    selected = groupItems[openGroupIdx];
    openGroupIdx = -1;
    groupBackBtn.classList.remove('show'); settingsBtn.classList.remove('hidden');
    groupTitle.textContent = homeView === 'groups' ? 'GROUPS' : ''; groupTitle.classList.toggle('show', homeView === 'groups');
  }
  groupBackBtn.addEventListener('click', leaveGroup);


  // =========================================================
  //  SETTINGS: sort apps into groups
  // =========================================================
  const settingsEl = document.getElementById('settings');
  const settingsBtn = document.getElementById('settingsBtn');
  const listEl = document.getElementById('groupList');
  const helpEl = document.getElementById('setHelp');
  let picked = null;              // { gi, ai } of the app chosen to move; gi = -1 means Unsorted
  const UNS = -1;
  const appsOf = gi => gi === UNS ? UNSORTED : GROUPS[gi].apps;

  function setHelp() {
    helpEl.textContent = picked
      ? 'Now tap where \u201c' + appsOf(picked.gi)[picked.ai].name + '\u201d should go.'
      : 'Tap an app, then tap the group to move it into.';
  }

  function moveInto(gi) {
    const [app] = appsOf(picked.gi).splice(picked.ai, 1);
    appsOf(gi).push(app);
    picked = null; setHelp(); renderSettings();
  }

  function chipsFor(gi) {
    const apps = appsOf(gi);
    const chips = document.createElement('div'); chips.className = 'chips';
    if (!apps.length) {
      const em = document.createElement('div'); em.className = 'empty';
      em.textContent = gi === UNS ? 'All apps are sorted' : 'Empty — tap an app, then tap here';
      chips.append(em);
    }
    apps.forEach((a, ai) => {
      const chip = document.createElement('button'); chip.className = 'chip';
      if (picked && picked.gi === gi && picked.ai === ai) chip.classList.add('picked');
      const sw = document.createElement('i'); sw.style.background = a.icon ? `center/cover url(${a.icon})` : 'linear-gradient(135deg,' + a.c1 + ',' + a.c2 + ')';
      chip.append(sw, document.createTextNode(a.name));
      chip.addEventListener('click', e => {
        e.stopPropagation();
        // an app is already picked from elsewhere: tapping anything in this section moves it here
        if (picked && picked.gi !== gi) { moveInto(gi); return; }
        picked = (picked && picked.gi === gi && picked.ai === ai) ? null : { gi, ai };
        setHelp(); renderSettings();
      });
      chips.append(chip);
    });
    return chips;
  }

  function cardFor(gi) {
    const card = document.createElement('div');
    card.className = 'gCard' + (gi === UNS ? ' unsorted' : '') + (picked && picked.gi !== gi ? ' target' : '');
    card.addEventListener('click', () => { if (picked && picked.gi !== gi) moveInto(gi); });
    return card;
  }

  function renderSettings() {
    listEl.innerHTML = '';

    // --- Unsorted (hidden from the home screen) ---
    const uCard = cardFor(UNS);
    const uTop = document.createElement('div'); uTop.className = 'gTop';
    const uName = document.createElement('span'); uName.className = 'gName uName'; uName.textContent = 'Unsorted';
    const uCount = document.createElement('span'); uCount.className = 'gCount';
    uCount.textContent = UNSORTED.length + (UNSORTED.length === 1 ? ' app' : ' apps');
    uTop.append(uName, uCount);
    const uNote = document.createElement('div'); uNote.className = 'uNote';
    uNote.textContent = 'Not shown on the home screen';
    uCard.append(uTop, uNote, chipsFor(UNS));
    listEl.append(uCard);

    // --- Visible groups ---
    GROUPS.forEach((g, gi) => {
      const card = cardFor(gi);
      const top = document.createElement('div'); top.className = 'gTop';
      const dot = document.createElement('span'); dot.className = 'gDot';
      dot.style.borderColor = g.tint; dot.style.background = g.tint + '33';
      const name = document.createElement('input'); name.className = 'gName'; name.value = g.name;
      name.maxLength = 14; name.setAttribute('aria-label', 'Group name');
      name.addEventListener('input', () => { g.name = name.value || 'Group'; });
      name.addEventListener('click', e => {
        e.stopPropagation();
        if (picked && picked.gi !== gi) { name.blur(); moveInto(gi); }   // moving an app: the name counts as part of the card
      });
      const count = document.createElement('span'); count.className = 'gCount';
      count.textContent = g.apps.length + (g.apps.length === 1 ? ' app' : ' apps');
      const del = document.createElement('button'); del.className = 'gDel'; del.textContent = 'Delete';
      del.disabled = GROUPS.length <= 1;
      del.title = 'Delete this group (its apps go to Unsorted)';
      del.addEventListener('click', e => {
        e.stopPropagation();
        UNSORTED.push(...g.apps);                 // nothing is lost: apps fall back to Unsorted
        GROUPS.splice(gi, 1); picked = null; setHelp(); renderSettings();
      });
      top.append(dot, name, count, del);
      card.append(top, chipsFor(gi));
      listEl.append(card);
    });

    if (GROUPS.length < MAX_GROUPS) {
      const add = document.createElement('button'); add.className = 'chromeBtn'; add.id = 'addGroup';
      add.textContent = '+ New group';
      add.addEventListener('click', () => {
        const used = GROUPS.map(g => g.tint);
        const tint = TINTS.find(t => !used.includes(t)) || TINTS[GROUPS.length % TINTS.length];
        GROUPS.push({ name: 'Group ' + (GROUPS.length + 1), tint, apps: [] });
        renderSettings(); listEl.scrollTop = listEl.scrollHeight;
      });
      listEl.append(add);
    }
  }

  function openSettings() {
    if (opening) return;
    if (searchInput.value) { searchInput.value = ''; runSearch(); }
    showKbd(false);
    leaveGroup(); selected = null; picked = null;
    setHelp(); renderSettings();
    settingsEl.classList.add('show');
  }
  function closeSettings() {
    GROUPS.forEach(g => { g.name = (g.name || '').trim() || 'Group'; });
    saveGroups();
    settingsEl.classList.remove('show');
    rebuildCubes();                               // cubes re-form with the new arrangement
    renderEggs();
  }
  settingsBtn.addEventListener('click', openSettings);
  document.getElementById('doneSettings').addEventListener('click', closeSettings);
  document.getElementById('resetGroups').addEventListener('click', () => {
    if (NATIVE) { const d = autoSortNative(); GROUPS = d.groups; UNSORTED = d.unsorted; }
    else { GROUPS = copy(DEFAULT_GROUPS); UNSORTED = copy(DEFAULT_UNSORTED); }
    picked = null; setHelp(); renderSettings();
  });

  // =========================================================
  //  HUD NAME TAGS: a short line leaves each body at an angle, then runs
  //  flat under its name. Tags flip sides near screen edges and skip any
  //  that would overlap a more important one.
  // =========================================================
  const hudEl = document.getElementById('hud');
  const SVGNS = 'http://www.w3.org/2000/svg';
  const measureCtx = document.createElement('canvas').getContext('2d');
  const tagW = (txt, minor) => {
    measureCtx.font = '600 ' + (minor ? 9 : 10.5) + 'px Orbitron, system-ui, sans-serif';
    return measureCtx.measureText(txt).width + txt.length * (minor ? 1.3 : 1.5);   // + letter-spacing
  };
  // Each tag has ONE fixed side (sx: 1 right / -1 left, sy: -1 up / 1 down), from the catalogue.
  let HUD_TARGETS = [];                       // the planet you're at and its moons (filled by buildBody)
  const DLABELS = [];                         // the tags of the sky places near the middle of your view (a small pool, made further down)
  // ONE name tag for everything: a small ring on the thing, a short line, the name on the line.
  function makeTag(t, parent) {               // t: { name, minor, sx, sy }
    t.g = document.createElementNS(SVGNS, 'g'); if (t.minor) t.g.setAttribute('class', 'minor');
    t.ring = document.createElementNS(SVGNS, 'circle'); t.path = document.createElementNS(SVGNS, 'path'); t.text = document.createElementNS(SVGNS, 'text');
    t.g.append(t.ring, t.path, t.text); parent.append(t.g); setTagText(t, t.name || ''); return t;
  }
  function setTagText(t, txt) { t.text.textContent = txt; t.w = tagW(txt, t.minor); }
  function tagBox(t, x, y, rPx, extra) {      // where the tag's line and name go (extra: a longer line, to step past another tag)
    const sx = t.sx, sy = t.sy, x0 = x + sx * (rPx * 0.72 + 3), y0 = y + sy * (rPx * 0.72 + 3);
    const leg = (t.minor ? CFG.tagLineLength * 0.67 : CFG.tagLineLength) + (extra || 0);
    const x1 = x0 + sx * leg, y1 = y0 + sy * leg, x2 = x1 + sx * (t.w + 10);
    return { x0, y0, x1, y1, x2, l: Math.min(x1, x2), r: Math.max(x1, x2) };
  }
  function drawTag(t, x, y, rPx, b, ringR) {
    t.ring.setAttribute('cx', x.toFixed(1)); t.ring.setAttribute('cy', y.toFixed(1)); t.ring.setAttribute('r', ringR);
    t.path.setAttribute('d', `M${b.x0.toFixed(1)},${b.y0.toFixed(1)} L${b.x1.toFixed(1)},${b.y1.toFixed(1)} L${b.x2.toFixed(1)},${b.y1.toFixed(1)}`);
    t.text.setAttribute('x', (b.l + 5).toFixed(1)); t.text.setAttribute('y', (b.y1 - 5).toFixed(1));
  }

  // =========================================================
  //  PASSING SHIPS: 8 original low-poly craft (flat-shaded, 90s style).
  //  Most cross far away; now and then one sweeps past close beside you.
  //  They fly in space's own frame, so they turn with the stars.
  // =========================================================
  const shipLayer = new THREE.Group(); spaceRig.add(shipLayer);
  const M = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, metalness: 0.35, roughness: 0.55 }, extra || {}));
  const HULL = M(0xe7ebf0), PANEL = M(0x9aa3b0), DARK = M(0x3a4352), ACCENT = M(0xff6a3d),
        ACC2 = M(0xffc84a), CANOPY = M(0x5fe3f2, { emissive: 0x1aa6c0, emissiveIntensity: 0.6, roughness: 0.2 });
  const engineTex = pointTexture('120,230,255');
  function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
  function cone(r, h, seg, mat, x = 0, y = 0, z = 0, rx = Math.PI / 2) {   // points along +z by default
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.rotation.x = rx; m.position.set(x, y, z); return m; }
  function cyl(r1, r2, h, seg, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; }
  function wing(pts, thick, mat, mirror) {       // flat polygon wing in the x/z plane
    const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0] * (mirror ? -1 : 1), p[1]) : sh.moveTo(p[0] * (mirror ? -1 : 1), p[1]));
    const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false });
    const m = new THREE.Mesh(g, mat); m.rotation.x = Math.PI / 2; m.position.y = thick / 2; return m;
  }
  const pair = (pts, thick, mat) => [wing(pts, thick, mat, false), wing(pts, thick, mat, true)];
  function glow(size, x = 0, y = 0, z = 0) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: engineTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(size, size, 1); sp.position.set(x, y, z); return sp;
  }

  // Every model faces +z (nose forward). Roughly 1.5 units long.
  const SHIP_MODELS = [
    function dart() {            // slim arrow fighter with long swept wings
      const g = new THREE.Group();
      g.add(cone(0.16, 1.0, 5, HULL, 0, 0, 0.45), box(0.3, 0.18, 0.7, HULL, 0, 0, -0.2), cone(0.09, 0.3, 4, CANOPY, 0, 0.12, 0.2, Math.PI / 2));
      g.add(...pair([[0.1, 0.25], [0.95, -0.45], [0.85, -0.55], [0.1, -0.45]], 0.03, PANEL));
      g.add(box(0.05, 0.22, 0.25, ACCENT, 0, 0.18, -0.45), glow(0.5, 0, 0, -0.62));
      return g;
    },
    function hauler() {          // chunky cargo tug with twin engine pods
      const g = new THREE.Group();
      g.add(box(0.55, 0.38, 1.1, HULL), box(0.5, 0.12, 0.6, PANEL, 0, 0.25, -0.1), box(0.3, 0.14, 0.25, CANOPY, 0, 0.12, 0.5));
      g.add(cyl(0.14, 0.17, 0.7, 8, DARK, 0.42, -0.06, -0.25), cyl(0.14, 0.17, 0.7, 8, DARK, -0.42, -0.06, -0.25));
      g.add(box(0.6, 0.04, 0.12, ACC2, 0, 0.2, 0.3), glow(0.45, 0.42, -0.06, -0.65), glow(0.45, -0.42, -0.06, -0.65));
      return g;
    },
    function manta() {          // flat wing-body glider
      const g = new THREE.Group();
      g.add(wing([[0, 0.7], [0.85, -0.35], [0.4, -0.25], [0, -0.45], [-0.4, -0.25], [-0.85, -0.35]], 0.08, HULL));
      g.add(cone(0.1, 0.35, 4, CANOPY, 0, 0.08, 0.25), box(0.5, 0.05, 0.08, ACCENT, 0, 0.06, -0.15), glow(0.55, 0, 0, -0.45));
      return g;
    },
    function needle() {         // long interceptor on twin booms
      const g = new THREE.Group();
      g.add(cyl(0.07, 0.11, 1.3, 6, HULL, 0, 0, 0.1), cone(0.07, 0.35, 6, PANEL, 0, 0, 0.9), cone(0.06, 0.2, 4, CANOPY, 0, 0.08, 0.5));
      g.add(cyl(0.05, 0.05, 0.9, 6, PANEL, 0.35, 0, -0.15), cyl(0.05, 0.05, 0.9, 6, PANEL, -0.35, 0, -0.15), box(0.7, 0.03, 0.18, HULL, 0, 0, -0.1));
      g.add(glow(0.35, 0.35, 0, -0.62), glow(0.35, -0.35, 0, -0.62), glow(0.4, 0, 0, -0.58));
      return g;
    },
    function trident() {        // three forward prongs around a core
      const g = new THREE.Group();
      g.add(box(0.32, 0.32, 0.6, HULL, 0, 0, -0.15), cone(0.1, 0.25, 4, CANOPY, 0, 0.18, 0.05));
      [[0, 0.22], [0.26, -0.12], [-0.26, -0.12]].forEach(([x, y]) => g.add(box(0.07, 0.07, 0.9, PANEL, x, y, 0.35), box(0.08, 0.08, 0.08, ACCENT, x, y, 0.82)));
      g.add(glow(0.55, 0, 0, -0.5));
      return g;
    },
    function shuttle() {        // rounded shuttle with stubby wings
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), HULL); body.scale.set(1, 0.8, 2); g.add(body);
      g.add(box(0.36, 0.1, 0.22, CANOPY, 0, 0.17, 0.35), ...pair([[0.25, 0.1], [0.62, -0.2], [0.62, -0.32], [0.25, -0.35]], 0.05, PANEL));
      g.add(box(0.22, 0.28, 0.05, ACC2, 0, 0.3, -0.45), glow(0.5, 0, 0, -0.68));
      return g;
    },
    function ringer() {         // hull threaded through a big engine ring
      const g = new THREE.Group();
      g.add(cyl(0.12, 0.14, 1.1, 6, HULL, 0, 0, 0.05), cone(0.12, 0.3, 6, PANEL, 0, 0, 0.75), cone(0.07, 0.2, 4, CANOPY, 0, 0.1, 0.35));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 5, 10), DARK); ring.position.z = -0.3; g.add(ring);
      [0, 1, 2].forEach(i => { const a = i * Math.PI * 2 / 3; g.add(box(0.04, 0.38, 0.06, PANEL, Math.cos(a) * 0.22, Math.sin(a) * 0.22, -0.3)); });
      g.add(glow(0.7, 0, 0, -0.35));
      return g;
    },
    function crescent() {       // fighter with forward-curving blade wings
      const g = new THREE.Group();
      g.add(box(0.22, 0.2, 0.9, HULL, 0, 0, 0.05), cone(0.13, 0.4, 4, HULL, 0, 0, 0.7), cone(0.07, 0.22, 4, CANOPY, 0, 0.13, 0.3));
      g.add(...pair([[0.1, -0.1], [0.45, -0.25], [0.8, 0.05], [0.9, 0.45], [0.7, 0.0], [0.4, -0.05], [0.1, 0.15]], 0.03, PANEL));
      g.add(box(0.3, 0.05, 0.05, ACCENT, 0, 0.11, -0.25), glow(0.45, 0, 0, -0.45));
      return g;
    },
  ];

  const ships = [];
  let nextShipIn = 2;
  const qInv = new THREE.Quaternion(), shipTmp = new THREE.Vector3(), FWD = new THREE.Vector3(0, 0, 1);
  function spawnShip(noWhale) {
    if (!noWhale && !whale && Math.random() < 0.05) return spawnWhale();   // 1 in 20: a space whale instead of a ship
    if (!noWhale && !squad && Math.random() < 0.1) return spawnSquad();    // 1 in 10: a squadron
    const g = SHIP_MODELS[Math.floor(Math.random() * SHIP_MODELS.length)]();
    const roll = Math.random();
    if (roll < 0.35) return spawnOvertaker(g);              // ~1 in 3: overtakes you, flying your way but faster
    const close = roll < 0.55;                              // ~1 in 5: crosses right beside you
    // path in screen-aligned (camera) space: cross from one side to the other
    const dirSign = Math.random() < 0.5 ? 1 : -1;
    const z = close ? camera.position.z - (0.7 + Math.random() * 1.3) : camera.position.z - (18 + Math.random() * 60);
    const depth = camera.position.z - z;
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth * camera.aspect;
    const y = (Math.random() - 0.3) * depth * 0.55 + (close ? (Math.random() < 0.5 ? 1.6 : -1.8) : 0);
    const start = new THREE.Vector3(-dirSign * (halfW + 3), y, z + (Math.random() - 0.5) * 4);
    const end = new THREE.Vector3(dirSign * (halfW + 3), y + (Math.random() - 0.5) * depth * 0.3, z + (close ? 6 : (Math.random() - 0.5) * 30));
    // convert to space's own frame so the ship turns with the stars
    qInv.copy(spaceRig.quaternion).invert();
    [start, end].forEach(v => v.sub(spaceRig.position).applyQuaternion(qInv));
    const speed = close ? 5 + Math.random() * 3 : 4 + Math.random() * 6;
    const dir = end.clone().sub(start).normalize();
    g.quaternion.setFromUnitVectors(FWD, dir);
    const s = close ? 0.8 + Math.random() * 0.3 : 1 + Math.random() * 0.6;
    g.scale.setScalar(s);
    g.position.copy(start);
    shipLayer.add(g);
    ships.push({ g, dir, speed, life: 10 + Math.random() * 20, age: 0, bank: (Math.random() - 0.5) * 0.6, base: g.quaternion.clone(), wob: Math.random() * 6 });   // leaves after 10-30 s
  }
  // A ship coming from behind you, flying the same way you are (into the screen) but faster:
  // it appears big at a screen edge, then shrinks away toward the distance.
  function spawnOvertaker(g) {
    const sx = Math.random() < 0.5 ? -1 : 1, sy = Math.random() < 0.6 ? 1 : -1;
    const start = new THREE.Vector3(sx * (0.7 + Math.random() * 1.2), sy * (0.5 + Math.random() * 1.2), camera.position.z + 2);   // starts just beside/over your shoulder
    const end = new THREE.Vector3(start.x * 0.35 + (Math.random() - 0.5) * 6, start.y * 0.35 + (Math.random() - 0.5) * 4, camera.position.z - 160);
    qInv.copy(spaceRig.quaternion).invert();
    [start, end].forEach(v => v.sub(spaceRig.position).applyQuaternion(qInv));
    const speed = 16 + Math.random() * 14;                  // much faster than the dots drifting by
    const dir = end.clone().sub(start).normalize();
    g.quaternion.setFromUnitVectors(FWD, dir);              // nose points where it's going (away from you)
    g.scale.setScalar(0.8 + Math.random() * 0.3);
    g.position.copy(start);
    shipLayer.add(g);
    ships.push({ g, dir, speed, life: 10 + Math.random() * 20, age: 0, bank: (Math.random() - 0.5) * 0.5, base: g.quaternion.clone(), wob: Math.random() * 6 });   // leaves after 10-30 s
  }
  // Ships never just vanish: at the end of their run they charge up, jump to lightspeed
  // leaving a streak, and flash into a sparkle far away (like slipping through a portal).
  const CHARGE_S = 0.7, JUMP_S = 0.4, JUMP_DIST = 140;
  const jumpFx = [];                               // streaks and sparkles still fading out
  const trailGeo = new THREE.BoxGeometry(1, 1, 1);
  function disposeShip(g) {
    shipLayer.remove(g);
    g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.isSpriteMaterial) o.material.dispose(); });
  }
  function startJump(sh) {
    sh.phase = 'jump'; sh.jt = 0; sh.from = sh.g.position.clone();
    const mk = (op, col) => new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    sh.trail = [mk(0.9, 0xd8fbff), mk(0.25, 0x6fd8ff)];          // bright core + soft wide glow
    sh.trail.forEach(m => shipLayer.add(m));
  }
  function placeTrail(sh, from, to) {
    const len = Math.max(0.001, from.distanceTo(to)), w = 0.05 * sh.g.scale.x;
    sh.trail.forEach((m, k) => {
      m.position.copy(from).add(to).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(FWD, sh.jdir);
      m.scale.set(w * (k ? 5 : 1), w * (k ? 5 : 1), len);
    });
  }
  function sparkleAt(pos, size) {                   // the portal flash: core + star flare + ring + sparks
    const g = new THREE.Group(); g.position.copy(pos);
    const mkS = (sx, sy, tex) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex || engineTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending })); sp.scale.set(sx, sy || sx, 1); g.add(sp); return sp; };
    const core = mkS(size), core2 = mkS(size * 0.5);
    const flareH = mkS(size * 3, size * 0.12), flareV = mkS(size * 0.12, size * 2.2);
    const specks = [];
    for (let i = 0; i < 22; i++) {
      const sp = mkS(size * 0.16);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(size * (0.9 + Math.random() * 1.2));
      specks.push({ sp, v });
    }
    shipLayer.add(g);
    jumpFx.push({ kind: 'spark', g, core, core2, flareH, flareV, specks, t: 0, dur: 1.3, size });
  }
  // =========================================================
  //  THE SPACE WHALE (1 in 20 spawns). An original low-poly whale ~50x a ship's size,
  //  far out, drifting across very slowly. It never warps: after a minute it dissolves into sparkles.
  // =========================================================
  var whale = null;
  const whaleFx = [];
  const WHALE_LIFE = 60, WHALE_SCALE = 14;
  function makeWhale() {
    const g = new THREE.Group(), mats = [];
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ flatShading: true, metalness: 0.1, roughness: 0.75,
      transparent: true, opacity: 0 }, o)); mats.push(m); return m; };
    // body: a lathe (round in section) along +z, tail at -z, head at +z; low segment count for the 90s look
    const prof = [[0.05,-3.3],[0.22,-2.7],[0.5,-1.8],[0.82,-0.6],[1.0,0.5],[0.97,1.5],[0.78,2.4],[0.42,3.05],[0.08,3.35]];
    const geo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10);
    geo.rotateX(Math.PI / 2);                               // length along z...
    geo.scale(1, 0.82, 1);                                  // ...a little flatter than round
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const back = new THREE.Color(0x35507a), belly = new THREE.Color(0xc4d6e8), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {                   // dark back, pale belly
      const y = pos.getY(i), r = Math.hypot(pos.getX(i), y) || 1;
      c.copy(back).lerp(belly, THREE.MathUtils.smoothstep(-y / r, 0.05, 0.6));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(new THREE.Mesh(geo, mat({ vertexColors: true, color: 0xffffff })));
    const finMat = mat({ color: 0x2c4468 });
    // tail flukes on a pivot so they can beat
    const tail = new THREE.Group(); tail.position.z = -3.0; g.add(tail);
    [false, true].forEach(m => { const w = wing([[0, 0.25], [1.7, -0.55], [1.5, -0.95], [0.55, -0.55], [0, -0.7]], 0.07, finMat, m); tail.add(w); });
    // pectoral fins, drooping a little
    [1, -1].forEach(sd => {
      const fg = new THREE.Group(); fg.position.set(0.62 * sd, -0.42, 1.0); fg.rotation.z = -0.45 * sd;
      fg.add(wing([[0, 0.35], [1.25 * sd, -0.45], [1.05 * sd, -0.85], [0, -0.25]], 0.05, finMat, false)); g.add(fg);
    });
    // small dorsal ridge
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 4), finMat); ridge.position.set(0, 0.72, -1.4); g.add(ridge);
    // eyes
    const eyeM = mat({ color: 0x0b1020, roughness: 0.3 });
    [1, -1].forEach(sd => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), eyeM); e.position.set(0.66 * sd, 0.02, 2.35); g.add(e); });
    // a row of soft glow spots along each flank
    const spots = [];
    const radiusAt = z => { for (let i = 1; i < prof.length; i++) if (z <= prof[i][1]) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * (z - y0) / (y1 - y0); } return 0.1; };
    for (let i = 0; i < 9; i++) {
      const z = -1.9 + i * 0.48;
      [1, -1].forEach(sd => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: engineTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
        const r = radiusAt(z) * 0.98;
        sp.position.set(Math.cos(-0.35) * r * sd, Math.sin(-0.35) * r * 0.82, z); sp.scale.set(0.32, 0.32, 1);
        g.add(sp); spots.push({ sp, ph: i * 0.7 + (sd > 0 ? 0 : 1.3) });
      });
    }
    // ---- the glowing OUTLINE: a rim light on the silhouette only (no inner lines) ----
    const rims = [];
    const rimMat = () => { const m = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color(0x9ff6ff) } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uI; uniform vec3 uC; varying vec3 vN; varying vec3 vV;
        void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float rim = pow(f, 4.0) * uI;
          if (rim < 0.004) discard; gl_FragColor = vec4(uC * (0.7 + 0.3 * min(uI, 3.0)), min(rim, 1.0)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      rims.push(m); return m; };
    g.traverse(o => {                                         // a rim copy of the body, flukes and fins, moving with them
      if (!o.isMesh || o.geometry.type !== 'LatheGeometry' || o.userData.fx) return;   // the body's silhouette (flat fins would light up whole)
      const r = new THREE.Mesh(o.geometry, rimMat()); r.userData.fx = true;
      r.position.copy(o.position); r.rotation.copy(o.rotation); r.scale.copy(o.scale); r.renderOrder = 6;
      o.parent.add(r);
    });
    // ---- the HALO: a soft ring of light just outside the silhouette (a slightly bigger shell, glowing at its inner edge) ----
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color(0x7fe9ff) } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uI; uniform vec3 uC; varying vec3 vN; varying vec3 vV;
        void main() { float x = abs(dot(normalize(vN), normalize(vV)));
          float ring = smoothstep(0.0, 0.38, x) * (1.0 - smoothstep(0.38, 0.8, x));   // soft, brightest right at the body's edge
          float a = ring * ring * uI * 0.22; if (a < 0.004) discard; gl_FragColor = vec4(uC, min(a, 1.0)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide });
    const halo = new THREE.Mesh(geo, haloMat); halo.scale.setScalar(1.08); halo.userData.fx = true; halo.renderOrder = 5; g.add(halo);
    // ---- the RIPPLE: a copy of the outline that expands outward once and fades ----
    const ripMat = rimMat(); rims.pop();                       // (driven separately from the outline)
    const ripple = new THREE.Mesh(geo, ripMat); ripple.userData.fx = true; ripple.visible = false; ripple.renderOrder = 6; g.add(ripple);
    return { g, mats, tail, spots, body: geo, rims, haloMat, ripple, ripMat };
  }
  // Our own speed through space: how fast the dots stream past us (average)
  const ourSpeed = () => 1.4 * CFG.dotSpeed;
  // Routes: 'by' = overtakes us from behind, passing beside us; 'head' = comes from far ahead and sweeps past us;
  // 'cross' = crosses far away at a random angle. (Speeds are relative to us; at least 3x our speed when it passes us.)
  function spawnWhale(route) {
    const w = makeWhale();
    route = route || (Math.random() < 0.35 ? 'by' : Math.random() < 0.5 ? 'head' : 'cross');
    const cz = camera.position.z, v = ourSpeed();
    // close passes go over us (or under us): the portrait screen is tall, so that's where you actually see it go by
    const sx = Math.random() < 0.5 ? 1 : -1, side = sx * (6 + Math.random() * 8);
    const lift = (Math.random() < 0.65 ? 1 : -1) * (16 + Math.random() * 4);
    let start, dirC, speed;
    if (route === 'by') {                                   // flying our way at ~3x our speed: 2x faster than us, relative
      start = new THREE.Vector3(side, lift, cz + 70);
      dirC = new THREE.Vector3(-sx * 0.06, (Math.random() - 0.5) * 0.04, -1).normalize();
      speed = v * (2 + Math.random() * 0.8);
    } else if (route === 'head') {                          // flying toward us at ~3x our speed: 4x, relative
      start = new THREE.Vector3(side, lift * 1.15, cz - 320);
      dirC = new THREE.Vector3(-sx * 0.03, (Math.random() - 0.5) * 0.03, 1).normalize();
      speed = v * (4 + Math.random());
    } else {                                                // far crossing, any angle
      const depth = 170 + Math.random() * 90;
      const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * depth * camera.aspect;
      const a = Math.random() * Math.PI * 2;
      dirC = new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.55, (Math.random() - 0.5) * 0.8).normalize();
      speed = 1.3 + Math.random() * 0.7;
      const centre = new THREE.Vector3((Math.random() - 0.5) * halfW * 0.6, (Math.random() - 0.5) * depth * 0.2, cz - depth);
      start = centre.addScaledVector(dirC, -speed * 25);    // crosses the middle of the view about halfway through its stay
    }
    // into space's own frame, so it turns with the stars; keep it upright (its back toward screen-up)
    qInv.copy(spaceRig.quaternion).invert();
    start.sub(spaceRig.position).applyQuaternion(qInv);
    const dir = dirC.applyQuaternion(qInv), up = new THREE.Vector3(0, 1, 0).applyQuaternion(qInv);
    const m4 = new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), up);   // +z of the model along dir
    w.g.quaternion.setFromRotationMatrix(m4);
    w.base = w.g.quaternion.clone();
    w.g.scale.setScalar(WHALE_SCALE);
    w.g.position.copy(start);
    w.dir = dir; w.speed = speed; w.route = route; w.age = 0; w.state = 'in'; w.st = 0; w.emit = 0;
    shipLayer.add(w.g);
    whale = w;
  }
  const whaleTmpV = new THREE.Vector3(), whaleQ = new THREE.Quaternion(), whaleAxis = new THREE.Vector3(1, 0, 0);
  const smooth01 = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const wN = new THREE.Vector3(), wV = new THREE.Vector3(), wQ = new THREE.Quaternion(), camLocal = new THREE.Vector3();
  // one sparkle leaving the silhouette, drifting outward (scale > 1: from the expanding ripple instead)
  function whaleEdgeSpark(w, scale) {
    const pos = w.body.attributes.position, nor = w.body.attributes.normal;
    w.g.getWorldQuaternion(wQ);
    camLocal.copy(camera.position); shipLayer.worldToLocal(camLocal);
    for (let tries = 0; tries < 12; tries++) {
      const i = Math.floor(Math.random() * pos.count);
      whaleTmpV.set(pos.getX(i) * scale, pos.getY(i) * scale, pos.getZ(i) * scale);
      w.g.localToWorld(whaleTmpV); shipLayer.worldToLocal(whaleTmpV);
      wN.set(nor.getX(i), nor.getY(i), nor.getZ(i)).applyQuaternion(wQ).normalize();
      wV.copy(camLocal).sub(whaleTmpV).normalize();
      const d = wN.dot(wV);
      if (Math.abs(d) > 0.3) continue;                        // only from the silhouette
      const out = wN.addScaledVector(wV, -d).normalize();      // outward, across the screen
      const v = out.multiplyScalar(6 + Math.random() * 10).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: engineTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const sz = 2.2 + Math.random() * 2.6; sp.scale.set(sz, sz, 1); sp.position.copy(whaleTmpV);
      shipLayer.add(sp);
      whaleFx.push({ sp, v, t: 0, dur: 1.1 + Math.random() * 1.1, sz });
      return;
    }
  }
  // outline brightness e (1 = normal outline). The halo is always 3x the outline.
  function setGlow(w, e) {
    w.rims.forEach(m => { m.uniforms.uI.value = e; });
    w.haloMat.uniforms.uI.value = e * 3;
  }
  function updateWhale(dt) {
    for (let i = whaleFx.length - 1; i >= 0; i--) {
      const f = whaleFx[i]; f.t += dt;
      const k = f.t / f.dur;
      f.sp.position.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.exp(-2.4 * dt));
      f.sp.material.opacity = Math.max(0, (1 - k)) * (0.65 + 0.35 * Math.sin(f.t * 18 + i));
      const z = f.sz * (1 - 0.6 * k); f.sp.scale.set(z, z, 1);
      if (k >= 1) { shipLayer.remove(f.sp); f.sp.material.dispose(); whaleFx.splice(i, 1); }
    }
    const w = whale; if (!w) return;
    w.age += dt; w.st += dt;
    w.g.position.addScaledVector(w.dir, w.speed * dt);
    // ARRIVING and LEAVING play the same way:
    //   the outline glows up to 3x (halo 3x the outline), sparkles start leaving the edge as it nears its peak ->
    //   a single ripple pulses outward (a copy of the outline expanding), the body appears (or vanishes), sparkles keep coming
    const BUILD = 2.6, RIP = 1.4, FAINT = 0.3, PEAK = 3;
    let body = w.state === 'in' ? 0 : 1, glow = FAINT, emitRate = 0;
    if (w.state === 'swim') {
      if (w.st >= WHALE_LIFE) { w.state = 'out'; w.st = 0; }
    } else {
      const from = w.state === 'in' ? 0 : FAINT;
      if (w.st < BUILD) {
        const k = w.st / BUILD;
        glow = from + (PEAK - from) * k * k;                    // rises slowly, then faster
        emitRate = 70 * smooth01((k - 0.45) / 0.55);            // sparkles begin as it nears its peak
      } else {
        const r = (w.st - BUILD) / RIP;
        if (!w.rippled) { w.rippled = true; w.ripple.visible = true; }
        w.ripple.scale.setScalar(1 + 0.75 * (1 - Math.pow(1 - Math.min(1, r), 2)));   // pulses out, easing off
        w.ripMat.uniforms.uI.value = PEAK * (1 - smooth01(r));
        const settle = smooth01(r / 0.45);
        if (w.state === 'in') { body = settle; glow = PEAK + (FAINT - PEAK) * settle; }   // visible now; outline back to a faint rim
        else { body = 1 - settle; glow = PEAK * (1 - smooth01(r / 0.8)); }               // gone; outline fades away
        emitRate = 70 * (1 - smooth01(r)) + 0.0;
        if (Math.random() < dt * 30 * (1 - r)) whaleEdgeSpark(w, w.ripple.scale.x);       // the ripple sheds a few too
        if (r >= 1) {
          w.ripple.visible = false; w.rippled = false;
          if (w.state === 'in') { w.state = 'swim'; w.st = 0; } else w.done = true;
        }
      }
    }
    setGlow(w, glow);
    w.emit += emitRate * dt;
    while (w.emit >= 1) { w.emit -= 1; whaleEdgeSpark(w, 1); }
    // slow swimming: flukes beat, the body rocks gently (still while it's only an outline)
    const beat = 0.9 * (1 + w.speed / 8);                  // fast whales beat their flukes harder
    w.tail.rotation.x = Math.sin(w.age * beat) * 0.28 * body;
    whaleQ.setFromAxisAngle(whaleAxis, Math.sin(w.age * beat - 0.8) * 0.035 * body);
    w.g.quaternion.copy(w.base).multiply(whaleQ);
    w.mats.forEach(m => { m.opacity = body; m.depthWrite = body > 0.95; });
    w.spots.forEach(({ sp, ph }) => { sp.material.opacity = body * (0.45 + 0.35 * Math.sin(w.age * 1.4 + ph)); });
    if (w.done) {
      shipLayer.remove(w.g);
      w.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      whale = null;
    }
  }
  // =========================================================
  //  SQUADRONS: 3-5 assault ships (Dart, Needle, Crescent, Trident) in a V.
  //  Sometimes they chase a target that weaves to dodge, firing twin laser bolts at it.
  //  When their time is up the target jumps to lightspeed first, and the squadron follows it in.
  // =========================================================
  const ASSAULT = [0, 3, 4, 7];                        // indexes in SHIP_MODELS: dart, needle, trident, crescent
  const CIVIL = [1, 2, 5, 6];                          // hauler, manta, shuttle, ringer
  var squad = null;
  const bolts = [], hitFx = [];
  const boltGeo = new THREE.BoxGeometry(0.05, 0.05, 1.4);
  const boltMat = new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const boltGlowMat = new THREE.MeshBasicMaterial({ color: 0x2bff6a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const hitTex = pointTexture('255,190,110');
  function spawnSquad(chase, route) {
    if (chase === undefined) chase = Math.random() < 0.6;
    const n = 3 + Math.floor(Math.random() * 3);
    const cz = camera.position.z;
    route = route || (Math.random() < 0.25 ? 'by' : Math.random() < 0.33 ? 'head' : 'cross');   // from behind, head-on, or any angle
    let start, dirC, speed;
    if (route === 'by') {                                 // comes from behind us and races ahead (the target first)
      const sx = Math.random() < 0.5 ? 1 : -1, sy = Math.random() < 0.6 ? 1 : -1;
      start = new THREE.Vector3(sx * (1.2 + Math.random() * 1.5), sy * (1.0 + Math.random() * 1.2), cz + 8);
      dirC = new THREE.Vector3(-sx * 0.05, -sy * 0.04, -1).normalize();
      speed = 14 + Math.random() * 6;
    } else if (route === 'head') {                        // comes at us from far ahead and streaks past
      const sx = Math.random() < 0.5 ? 1 : -1, sy = Math.random() < 0.6 ? 1 : -1;
      start = new THREE.Vector3(sx * (1.5 + Math.random() * 2), sy * (1.2 + Math.random() * 1.5), cz - 110 - Math.random() * 40);
      dirC = new THREE.Vector3(sx * 0.01, sy * 0.008, 1).normalize();
      speed = 13 + Math.random() * 6;
    } else {                                              // crosses the view from any side, at any angle (down, up, diagonal, away...)
      const depth = 22 + Math.random() * 35;
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const a = Math.random() * Math.PI * 2;
      dirC = new THREE.Vector3(Math.cos(a), Math.sin(a), (Math.random() - 0.6) * 0.9).normalize();
      speed = 5 + Math.random() * 3;
      const centre = new THREE.Vector3((Math.random() - 0.5) * tanH * depth * camera.aspect, (Math.random() - 0.5) * tanH * depth * 0.8, cz - depth);
      start = centre.addScaledVector(dirC, -speed * 4);    // reaches the middle of the view after ~4 s
    }
    qInv.copy(spaceRig.quaternion).invert();
    start.sub(spaceRig.position).applyQuaternion(qInv);
    const dir = dirC.applyQuaternion(qInv);
    const U = new THREE.Vector3(1, 0, 0).applyQuaternion(qInv), V0 = new THREE.Vector3(0, 1, 0).applyQuaternion(qInv);
    U.addScaledVector(dir, -U.dot(dir)).normalize(); const V = new THREE.Vector3().crossVectors(dir, U).normalize();
    if (V.dot(V0) < 0) V.negate();
    const sq = { start, dir, U, V, speed, t: 0, life: 12 + Math.random() * 10, chase, lag: chase ? 0.55 + Math.random() * 0.25 : 0,
      ph1: Math.random() * 6, ph2: Math.random() * 6, members: [], target: null, released: false };
    const addShip = (g, role, off) => {
      g.scale.setScalar(0.9);
      shipLayer.add(g);
      const sh = { g, dir: dir.clone(), speed, life: Infinity, age: 0, bank: 0, base: g.quaternion.clone(), wob: Math.random() * 6,
        squad: sq, role, off, prev: null, fireIn: 1 + Math.random() };
      ships.push(sh); return sh;
    };
    const lead = ASSAULT[Math.floor(Math.random() * ASSAULT.length)];
    for (let i = 0; i < n; i++) {                         // V formation: leader in front, wingmen fanning back
      const k = Math.ceil(i / 2), side = i === 0 ? 0 : (i % 2 ? 1 : -1);
      const model = lead;                                // a squadron is all the same ship
      sq.members.push(addShip(SHIP_MODELS[model](), 'wing', new THREE.Vector3(side * k * 2.1, (Math.random() - 0.5) * 0.5, -k * 2.4)));
    }
    if (chase) {
      const pool = Math.random() < 0.5 ? CIVIL : ASSAULT.filter(m => m !== lead);
      sq.target = addShip(SHIP_MODELS[pool[Math.floor(Math.random() * pool.length)]](), 'target', new THREE.Vector3());
    }
    squad = sq;
    updateSquad(0);
  }
  // where the flight path is at time t; amp = how hard it weaves
  const sqP = new THREE.Vector3();
  function squadPath(sq, t, amp, out) {
    out.copy(sq.start).addScaledVector(sq.dir, sq.speed * t)
      .addScaledVector(sq.U, Math.sin(t * 1.1 + sq.ph1) * amp)
      .addScaledVector(sq.V, Math.sin(t * 1.7 + sq.ph2) * amp * 0.6);
    return out;
  }
  const sqVel = new THREE.Vector3(), sqTmp = new THREE.Vector3(), boltDir = new THREE.Vector3();
  function placeSquadShip(sq, sh, pos, dt) {
    if (sh.prev && dt > 0) {
      sqVel.copy(pos).sub(sh.prev);
      sh.vel = (sh.vel || new THREE.Vector3()).copy(sqVel).divideScalar(dt);
      if (sqVel.lengthSq() > 1e-8) {
        sqVel.normalize(); sh.dir.copy(sqVel);
        sh.base.setFromUnitVectors(FWD, sqVel);
        // bank into turns: lateral velocity along U
        const lat = sqVel.dot(sq.U);
        sh.bank += ((-lat * 6) - sh.bank) * Math.min(1, dt * 4);
      }
    }
    sh.prev = (sh.prev || new THREE.Vector3()).copy(pos);
    sh.g.position.copy(pos);
  }
  function fireBolt(from, to, shooterScale, shooterVel) {
    boltDir.copy(to).sub(from).normalize()
      .add(sqTmp.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.06)).normalize();
    [-0.25, 0.25].forEach(side => {                       // twin bolts from both wings
      const g = new THREE.Group();
      const core = new THREE.Mesh(boltGeo, boltMat), glowM = new THREE.Mesh(boltGeo, boltGlowMat);
      glowM.scale.set(4, 4, 1.1); g.add(core, glowM);
      g.quaternion.setFromUnitVectors(FWD, boltDir);
      g.position.copy(from).addScaledVector(sqTmp.set(1, 0, 0).applyQuaternion(g.quaternion), side * shooterScale);
      g.scale.setScalar(shooterScale);
      shipLayer.add(g);
      bolts.push({ g, v: boltDir.clone().multiplyScalar(70).add(shooterVel || sqTmp.set(0, 0, 0)), life: 0.9 });
    });
  }
  function hitSpark(pos, size) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: hitTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.copy(pos); sp.scale.set(size, size, 1); shipLayer.add(sp);
    hitFx.push({ sp, t: 0, dur: 0.35, size });
  }
  function updateSquad(dt) {
    // bolts in flight
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.life -= dt; b.g.position.addScaledVector(b.v, dt);
      const tgt = squad && squad.target && !squad.target.phase ? squad.target : null;
      if (tgt && b.g.position.distanceTo(tgt.g.position) < 1.3 * tgt.g.scale.x) { hitSpark(b.g.position, 1.4); b.life = 0; }
      if (b.life <= 0) { shipLayer.remove(b.g); bolts.splice(i, 1); }
    }
    for (let i = hitFx.length - 1; i >= 0; i--) {
      const h = hitFx[i]; h.t += dt; const k = h.t / h.dur;
      const z = h.size * (0.6 + 1.2 * k); h.sp.scale.set(z, z, 1); h.sp.material.opacity = 1 - k;
      if (k >= 1) { shipLayer.remove(h.sp); h.sp.material.dispose(); hitFx.splice(i, 1); }
    }
    const sq = squad; if (!sq) return;
    sq.t += dt;
    const flying = sq.members.concat(sq.target ? [sq.target] : []).filter(sh => !sh.phase && ships.includes(sh));
    if (!flying.length && !bolts.length) { squad = null; return; }
    if (sq.target && sq.target.squad) placeSquadShip(sq, sq.target, squadPath(sq, sq.t, 2.2, sqP), dt);
    sq.members.forEach(sh => {
      if (sh.phase || !sh.squad) return;                  // released: it flies on by itself now
      squadPath(sq, sq.t - sq.lag, sq.chase ? 1.6 : 0.25, sqP)
        .addScaledVector(sq.U, sh.off.x).addScaledVector(sq.V, sh.off.y).addScaledVector(sq.dir, sh.off.z);
      placeSquadShip(sq, sh, sqP, dt);
      // firing: short twin bursts at the target while it's ahead
      if (sq.chase && sq.target && !sq.target.phase && sq.t > 0.5) {
        sh.fireIn -= dt;
        if (sh.fireIn <= 0) {
          sqTmp.copy(sq.target.g.position).sub(sh.g.position);
          if (sqTmp.dot(sh.dir) > 0 && sqTmp.length() < 40) {
            const lead = sqTmp.length() / 70;               // bolt flight time
            const aim = sq.target.g.position.clone();      // bolts carry the shooter's speed, so lead by the difference
            if (sq.target.vel) aim.addScaledVector(sq.target.vel, lead); if (sh.vel) aim.addScaledVector(sh.vel, -lead);
            fireBolt(sh.g.position.clone().addScaledVector(sh.dir, 0.8 * sh.g.scale.x), aim, sh.g.scale.x, sh.vel && sh.vel.clone());
          }
          sh.fireIn = Math.random() < 0.35 ? 0.12 : 0.45 + Math.random() * 0.9;   // sometimes a quick double shot
        }
      }
    });
    // time's up: the target jumps first, the squadron follows it into lightspeed
    if (!sq.released && sq.t >= sq.life) {
      sq.released = true;
      const order = (sq.target ? [sq.target] : []).concat(sq.members);
      order.forEach((sh, i) => { if (!sh.phase) { sh.squad = null; sh.life = sh.age + (sq.target ? 0.35 : 0) * Math.min(i, 1) + i * 0.12; } });
    }
  }
  // =========================================================
  //  LEFT BEHIND: when we warp, everything flying around us slides back past us at our extra speed
  //  (the same speed the dots stream by), and is gone once it's well behind. Nothing new arrives mid-warp.
  // =========================================================
  const lbFwd = new THREE.Vector3(), lbD = new THREE.Vector3();
  const warping = () => !!(travel || deepJump) || warp > 1.5;
  function dropWhale() {
    shipLayer.remove(whale.g); whale.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); whale = null;
  }
  function leaveBehind(dt) {
    const extra = ourSpeed() * (warp - 1);
    if (Math.abs(extra) < 0.01) return;
    lbFwd.set(0, 0, -1).applyQuaternion(spaceRig.quaternion.clone().invert());
    lbD.copy(lbFwd).multiplyScalar(-extra * dt);
    shipLayer.children.forEach(o => { if (!o.userData.pathLine) o.position.add(lbD); });
    ships.forEach(sh => { if (sh.from) sh.from.add(lbD); if (sh.prev) sh.prev.add(lbD); });
    if (squad) squad.start.add(lbD);
    jumpFx.forEach(fx => { if (fx.from) fx.from.add(lbD); if (fx.to) fx.to.add(lbD); });
    for (let i = ships.length - 1; i >= 0; i--) {
      const sh = ships[i];
      if (sh.g.position.dot(lbFwd) > -40) continue;
      if (sh.trail) sh.trail.forEach(m => { shipLayer.remove(m); m.material.dispose(); });
      disposeShip(sh.g); ships.splice(i, 1);
    }
    if (whale && whale.g.position.dot(lbFwd) < -140) dropWhale();
  }

  // =========================================================
  //  FLIGHT PATHS: every ship (and each squadron as a whole) looks 3 s ahead along its line,
  //  checks it against where the whale and the other ships will be, and bends its line around them.
  //  The whale is too big to dodge anything: everyone else goes around it.
  //  Debug > Ships > Show paths draws those lines.
  // =========================================================
  const AV_T = 3, AV_STEP = 0.2, WHALE_R = 1.5 * WHALE_SCALE, WHALE_HALF = 2.4 * WHALE_SCALE;
  const avA = new THREE.Vector3(), avB = new THREE.Vector3(), avC = new THREE.Vector3(), avPush = new THREE.Vector3(), avTmp = new THREE.Vector3();
  function moverList() {
    const L = [];
    if (whale) L.push({ kind: 'whale', pos: whale.g.position, vel: whale.dir.clone().multiplyScalar(whale.speed), r: WHALE_R, axis: whale.dir, half: WHALE_HALF });
    ships.forEach(sh => {
      if (sh.phase === 'jump' || sh.squad) return;           // squadron members move as one formation (below)
      L.push({ kind: 'ship', sh, pos: sh.g.position, vel: sh.dir.clone().multiplyScalar(sh.phase === 'charge' ? sh.speed * 0.3 : sh.speed), r: 1.5 * sh.g.scale.x });
    });
    const sq = squad;
    if (sq && !sq.released) {
      const mem = sq.members.concat(sq.target ? [sq.target] : []).filter(sh => sh.squad && !sh.phase && ships.includes(sh));
      if (mem.length) {
        const c = new THREE.Vector3(); mem.forEach(sh => c.add(sh.g.position)); c.divideScalar(mem.length);
        let r = 0; mem.forEach(sh => r = Math.max(r, sh.g.position.distanceTo(c)));
        sq.avV = sq.avV || new THREE.Vector3();
        L.push({ kind: 'squad', sq, pos: c, vel: sq.dir.clone().multiplyScalar(sq.speed).add(sq.avV), r: r + 1.5 });
      }
    }
    return L;
  }
  function moverAt(m, t, near, out) {                    // where mover m will be at time t (closest point of the whale's body to `near`)
    out.copy(m.pos).addScaledVector(m.vel, t);
    if (m.axis) out.addScaledVector(m.axis, THREE.MathUtils.clamp(avTmp.copy(near).sub(out).dot(m.axis), -m.half, m.half));
    return out;
  }
  function steerAway(a, L) {
    avPush.set(0, 0, 0);
    const v2 = Math.max(a.vel.lengthSq(), 1e-6);
    for (const b of L) {
      if (b === a) continue;
      const T = b.kind === 'whale' ? 6 : AV_T;              // the whale is huge: start going round it sooner
      for (let t = 0; t <= T; t += AV_STEP) {
        avA.copy(a.pos).addScaledVector(a.vel, t);
        moverAt(b, t, avA, avB);
        avC.copy(avA).sub(avB);
        const d = avC.length(), need = a.r + b.r + 0.8;
        if (d >= need) continue;
        avC.addScaledVector(a.vel, -avC.dot(a.vel) / v2);   // only sideways: it keeps flying, just bends its line
        if (avC.lengthSq() < 1e-6) avC.set(0, 1, 0).applyQuaternion(spaceRig.quaternion.clone().invert()).addScaledVector(a.vel, -avC.dot(a.vel) / v2);
        avPush.addScaledVector(avC.normalize(), (1 - d / need) * (1 - 0.6 * t / T) * (b.kind === 'whale' ? 3 : 1));
        break;                                            // the first conflict with this one is what matters
      }
    }
    return avPush;
  }
  let showPaths = false;
  const pathLines = [];
  function updateAvoid(dt) {
    if (window.__noAvoid) return;
    const L = moverList();
    L.forEach(a => {
      if (a.kind === 'whale') return;
      const push = steerAway(a, L);
      if (a.kind === 'ship') {
        const sh = a.sh;
        if (sh.phase || push.lengthSq() < 1e-8) return;
        const before = sh.dir.clone();
        sh.dir.addScaledVector(push, dt * 2.2).normalize();
        sh.base.setFromUnitVectors(FWD, sh.dir);
        const turn = avTmp.crossVectors(before, sh.dir).dot(new THREE.Vector3(0, 0, 1).applyQuaternion(spaceRig.quaternion.clone().invert()));
        sh.bank += (THREE.MathUtils.clamp(-turn / Math.max(dt, 1e-3) * 2, -0.7, 0.7) - sh.bank) * Math.min(1, dt * 3);   // lean into the swerve
      } else if (a.kind === 'squad') {
        const sq = a.sq;
        sq.avV.addScaledVector(push, dt * sq.speed * 0.9);
        sq.avV.multiplyScalar(Math.exp(-1.2 * dt));
        sq.start.addScaledVector(sq.avV, dt);              // the whole formation's line shifts; the ships turn with it
      }
    });
    // debug: draw each line, 4 s ahead
    pathLines.forEach(l => l.visible = false);
    if (!showPaths) return;
    L.forEach((m, i) => {
      let ln = pathLines[i];
      if (!ln) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(21 * 3), 3));
        ln = new THREE.Line(g, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false }));
        ln.userData.pathLine = true; ln.frustumCulled = false; shipLayer.add(ln); pathLines.push(ln);
      }
      ln.visible = true; ln.material.color.set(m.kind === 'whale' ? 0xffa05a : m.kind === 'squad' ? 0x7dff9a : 0x7fe6ff);
      const arr = ln.geometry.attributes.position.array;
      for (let k = 0; k <= 20; k++) { avA.copy(m.pos).addScaledVector(m.vel, k * 0.2); arr.set([avA.x, avA.y, avA.z], k * 3); }
      ln.geometry.attributes.position.needsUpdate = true;
    });
  }
  function updateShips(dt) {
    leaveBehind(dt);
    updateWhale(dt);
    updateSquad(dt);
    updateAvoid(dt);
    nextShipIn -= dt;
    if (warping()) nextShipIn = Math.max(nextShipIn, 1.5);       // nothing arrives mid-warp, and not right as we stop
    if (nextShipIn <= 0 && ships.length < 9) { spawnShip(); nextShipIn = 2 + Math.random() * 4; }   // avg every 4 s; up to 9 at once now that they stay 10-30 s
    for (let i = ships.length - 1; i >= 0; i--) {
      const sh = ships[i];
      sh.age += dt;
      const phase = sh.phase || 'cruise';
      if (phase === 'cruise') {
        if (!sh.squad) sh.g.position.addScaledVector(sh.dir, sh.speed * dt);
        if (sh.age > sh.life) {
          sh.phase = 'charge'; sh.ct = 0; sh.glows = []; sh.g.traverse(o => { if (o.isSprite) sh.glows.push([o, o.scale.x]); });
          // the jump heads into the distance (away from you), so its flash shows up where the ship vanished
          const away = sh.g.position.clone().normalize();          // you sit at the centre of space's frame
          sh.jdir = away.multiplyScalar(1).addScaledVector(sh.dir, 0.45).normalize();
          sh.base0 = sh.base.clone(); sh.baseJ = new THREE.Quaternion().setFromUnitVectors(FWD, sh.jdir);
        }
      } else if (phase === 'charge') {                  // slows down, engines swell, a little shiver
        sh.ct += dt;
        const c = Math.min(1, sh.ct / CHARGE_S);
        sh.g.position.addScaledVector(sh.dir, sh.speed * (1 - 0.8 * c) * dt);
        sh.glows.forEach(([o, s0]) => { const k = s0 * (1 + 2.5 * c * c); o.scale.set(k, k, 1); });
        sh.base.copy(sh.base0).slerp(sh.baseJ, c * c * (3 - 2 * c));   // swings its nose round to the jump line
        sh.g.position.x += (Math.random() - 0.5) * 0.02 * c * sh.g.scale.x;
        if (c >= 1) startJump(sh);
      } else if (phase === 'jump') {                    // blasts away, stretching, leaving a streak
        sh.jt += dt;
        const j = Math.min(1, sh.jt / JUMP_S), d = JUMP_DIST * j * j;
        sh.g.position.copy(sh.from).addScaledVector(sh.jdir, d);
        sh.g.scale.z = sh.g.scale.x * (1 + 4 * j);
        placeTrail(sh, sh.from, sh.g.position);
        if (j >= 1) {
          const end = sh.g.position.clone();
          sparkleAt(end, 4 + end.length() * 0.075);
          jumpFx.push({ kind: 'trail', meshes: sh.trail, from: sh.from.clone(), to: end, dir: sh.dir, w: sh.g.scale.x, t: 0, dur: 0.9 });
          disposeShip(sh.g); ships.splice(i, 1);
          continue;
        }
      }
      // gentle banking roll so they feel piloted
      shipTmp.set(0, 0, 1);
      sh.g.quaternion.copy(sh.base).multiply(new THREE.Quaternion().setFromAxisAngle(shipTmp, sh.bank + Math.sin(sh.age * 0.8 + sh.wob) * 0.15));
    }
    for (let i = jumpFx.length - 1; i >= 0; i--) {
      const fx = jumpFx[i];
      fx.t += dt;
      const k = Math.min(1, fx.t / fx.dur), fade = 1 - k * k * (3 - 2 * k);
      if (fx.kind === 'trail') {                        // the streak thins and fades, its tail catching up
        const from = fx.from.clone().lerp(fx.to, k * k);
        fx.meshes.forEach((m, n) => {
          m.position.copy(from).add(fx.to).multiplyScalar(0.5);
          m.scale.z = Math.max(0.001, from.distanceTo(fx.to));
          m.scale.x = m.scale.y = 0.05 * fx.w * (n ? 5 : 1) * (0.4 + 0.6 * fade);
          m.material.opacity = (n ? 0.25 : 0.9) * fade;
        });
        if (k >= 1) { fx.meshes.forEach(m => { shipLayer.remove(m); m.material.dispose(); }); jumpFx.splice(i, 1); }
      } else {                                         // sparkle: quick swell, specks drift out and twinkle away
        const pop = Math.min(1, fx.t / 0.1), flash = pop * Math.max(0, 1 - fx.t / 0.5);   // bright burst for the first half-second
        const cs = fx.size * (0.4 + 0.9 * pop) * (1 - 0.5 * k);
        fx.core.scale.set(cs, cs, 1); fx.core.material.opacity = fade;
        fx.core2.material.opacity = flash;
        fx.flareH.scale.set(fx.size * 3.2 * (0.3 + 0.7 * pop) * (1 - 0.6 * k), fx.size * 0.12, 1); fx.flareH.material.opacity = fade;
        fx.flareV.scale.set(fx.size * 0.12, fx.size * 2.2 * (0.3 + 0.7 * pop) * (1 - 0.6 * k), 1); fx.flareV.material.opacity = fade;

        fx.specks.forEach(({ sp, v }, n) => {
          sp.position.copy(v).multiplyScalar(k);
          sp.material.opacity = fade * (0.6 + 0.4 * Math.sin(fx.t * 30 + n * 2.1));
        });
        if (k >= 1) { shipLayer.remove(fx.g); fx.g.traverse(o => { if (o.material) o.material.dispose(); }); jumpFx.splice(i, 1); }
      }
    }
  }

  // ---- Start looking at an empty patch of sky ----
  // Test ~4000 evenly spread directions and pick the one farthest from every
  // planet, moon and the star (a ringed planet counts with its rings). Then turn space so
  // that direction is straight ahead. Bodies drift into view later as space turns.
  function startInEmptySky() {
    spaceRig.updateMatrixWorld(true); syncSysRig();
    const bodies = [...HUD_TARGETS, ...LOCAL.map(o => ({ dirRig: o.dirLocal })), { dirRig: BODY.starDir }].map(t => {
      if (t.dirRig) return { dir: t.dirRig.clone().normalize(), extra: 0 };
      const w = new THREE.Vector3(); t.obj.getWorldPosition(w);
      const local = spaceRig.worldToLocal(w.clone());               // rig space (camera at origin)
      const extra = t.obj === BODY.group && BODY.q.rings ? THREE.MathUtils.degToRad(6) : 0;   // ring span
      return { dir: local.normalize(), extra };
    });
    const N = 4000, golden = Math.PI * (3 - Math.sqrt(5));
    let best = null, bestScore = -1;
    const d = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
      d.set(Math.cos(th) * r, y, Math.sin(th) * r);
      let score = Infinity;
      for (const b of bodies) score = Math.min(score, d.angleTo(b.dir) - b.extra);
      if (score > bestScore) { bestScore = score; best = d.clone(); }
    }
    spaceRig.quaternion.setFromUnitVectors(best, new THREE.Vector3(0, 0, -1));
  }
  // re-measure once the font has loaded so the underline matches the word exactly
  const remeasure = () => { HUD_TARGETS.forEach(t => t.w = tagW(t.name, t.minor)); DLABELS.forEach(L => L.w = tagW(L.text.textContent, true)); };
  remeasure(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  const hp = new THREE.Vector3(), camFwd = new THREE.Vector3();
  const hudOcc = new THREE.Vector3();
  function updateHud(fade) {
    hudEl.style.opacity = fade;
    if (fade < 0.02) return;
    if (deepJump && deepJump.swapped) { HUD_TARGETS.forEach(t => t.g.style.display = 'none'); return; }   // arriving: the scene is still rushing in
    const W = innerWidth, H = innerHeight;
    const pxPerRad = (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.getWorldDirection(camFwd);
    HUD_TARGETS.forEach(t => {
      t.obj.getWorldPosition(hp);
      const toObj = hp.clone().sub(camera.position), dist = toObj.length();
      hp.project(camera);
      const x = (hp.x + 1) / 2 * W, y = (1 - hp.y) / 2 * H;
      if (toObj.dot(camFwd) <= 0) { t.g.style.display = 'none'; return; }      // behind you
      if (NAV.some(n => {                         // hidden behind a nearer planet or moon
        if (n.t === t) return false;
        n.t.obj.getWorldPosition(hudOcc); const dn = hudOcc.distanceTo(camera.position);
        if (dn >= dist) return false;
        return toObj.angleTo(hudOcc.sub(camera.position)) < Math.asin(Math.min(1, n.bodyR / dn));
      })) { t.g.style.display = 'none'; return; }
      const rPx = t.rKm ? Math.max((t.rKm * k / dist) * pxPerRad, 3) : 4;
      const b = tagBox(t, x, y, rPx);
      // hide only once the WHOLE tag (object, line and name) has left the screen,
      // so it slides off the edge together with its object instead of popping away
      const l = Math.min(x - 8, b.x2), r = Math.max(x + 8, b.x2), top = Math.min(y - 8, b.y1 - 16), bot = Math.max(y + 8, b.y1 + 3);
      if (r < 0 || l > W || bot < 0 || top > H) { t.g.style.display = 'none'; return; }
      t.g.style.display = '';
      drawTag(t, x, y, rPx, b, t.rKm && rPx > 6 ? 0 : (t.minor ? 4 : 6));            // small target ring on point-like bodies
    });
  }

  // =========================================================
  //  FLIGHTS: tap the planet you're at or one of its moons (or its label) to lock on, tap again to go there.
  //  The ship turns to face it, warps across, and parks with it lit in front of you.
  //  You stay there (remembered across restarts).
  // =========================================================
  const shipPos = new THREE.Vector3();               // where the ship is, in the frame of the planet's system (0 = where you arrived)
  const nav = { target: null };                      // name of the body we're parked at (null = the original spot)
  const navOffset = new THREE.Vector3();             // ship position relative to that body (moons start at random spots each launch)
  let NAV = [];                                      // flight targets: the planet you're at and its moons (filled by buildBody)
  const navTmp = new THREE.Vector3(), navTmp2 = new THREE.Vector3();
  function navLocal(n, out) {                         // a body's centre in the system frame
    n.t.obj.getWorldPosition(out); return sysWorld.worldToLocal(out);
  }
  let navLock = null, lockT = 0, travel = null, navWarp = 1, sysNear = 0.1, factsT = -1, factsFor = null;
  function saveNav() { deep.nav = nav.target ? { target: nav.target, offset: navOffset.toArray() } : null; deep.q = spaceRig.quaternion.toArray(); window.CAT.save(); }

  // ---- lock-on reticle (Star Fox style corner brackets) ----
  const lockG = document.createElementNS(SVGNS, 'g'); lockG.setAttribute('class', 'lock'); lockG.style.display = 'none';
  const lockCorners = [0, 1, 2, 3].map(() => { const pth = document.createElementNS(SVGNS, 'path'); lockG.append(pth); return pth; });
  const lockName = document.createElementNS(SVGNS, 'text'), lockHint = document.createElementNS(SVGNS, 'text');
  lockHint.setAttribute('class', 'hint'); lockG.append(lockName, lockHint);
  const factsG = document.createElementNS(SVGNS, 'g'); factsG.setAttribute('class', 'facts'); factsG.style.display = 'none';
  const factLines = [0, 1, 2, 3, 4, 5, 6].map(() => { const tx = document.createElementNS(SVGNS, 'text'); factsG.append(tx); return tx; });
  hudEl.append(lockG, factsG);
  const fmtKm = km => km >= 1e6 ? (km / 1e6).toFixed(1) + 'M KM' : km >= 1e4 ? Math.round(km / 1e3) + 'K KM' : Math.round(km).toLocaleString('en-US') + ' KM';
  function screenOf(n, out) {                         // -> [x, y, radiusPx, inFront, distScene]
    if (n.deep) return deepScreenOf(n);
    n.t.obj.getWorldPosition(navTmp);
    const dist = navTmp.distanceTo(camera.position);
    camera.getWorldDirection(navTmp2);
    const front = navTmp.clone().sub(camera.position).dot(navTmp2) > 0;
    navTmp.project(camera);
    const pxPerRad = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return [(navTmp.x + 1) / 2 * innerWidth, (1 - navTmp.y) / 2 * innerHeight, (n.bodyR / dist) * pxPerRad, front, dist];
  }
  function lockOn(n) { if (n.deep) reportSeen(n); navLock = n; lockT = performance.now(); try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(14); } catch (e) {} }
  function cancelLock() { navLock = null; lockG.style.display = 'none'; }
  // A tap on empty space: lock on / engage / cancel. Returns true if it used the tap.
  function navTap(x, y) {
    if (travel || deepJump) return true;
    let best = null, bestD = Infinity;
    NAV.forEach(n => {
      const [sx, sy, r, front] = screenOf(n);
      if (!front) return;
      const d = Math.hypot(x - sx, y - sy);
      let hit = d < Math.max(r + 14, 28);
      if (!hit && n.t.g && n.t.g.style.display !== 'none') {                    // or its label
        const b = n.t.text.getBoundingClientRect(); hit = x > b.left - 10 && x < b.right + 10 && y > b.top - 12 && y < b.bottom + 12;
      }
      if (hit && d < bestD) { best = n; bestD = d; }
    });
    const dp = deepPick(x, y);
    if (dp && (!best || dp.d < bestD * 0.6)) best = dp.o;
    if (best) {
      if (navLock === best) engage(best);
      else if (nav.target === best.name && !travel) { lockOn(best); }
      else lockOn(best);
      return true;
    }
    if (navLock) { cancelLock(); return true; }
    return false;
  }
  function engage(n) {
    if (n.deep) {
      if (!inRange(n)) { lockT = performance.now(); try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(60); } catch (e) {} return; }   // out of range: the lock pulses, nothing happens
      cancelLock(); deepGo(n); return;
    }
    const plan = routePlan && routePlan.n === n ? routePlan : planRoute(n);
    cancelLock();
    if (nav.target === n.name) return;               // already here
    const { p0, p1, ctrl, ctrl2, len0 } = plan;
    const len = p0.distanceTo(p1);
    const fly = 2.4 + 0.5 * Math.log10(1 + len);
    travel = { n, p0, p1, ctrl, ctrl2, t: 0, turn: 0.8, fly, dur: 0.8 + fly, settle: 0.6, plan };
    nav.target = null; factsT = -1; factsG.style.display = 'none';
    routeShowT = performance.now();
  }
  // The route to a body: parking spot ~50 degrees off the Sun, a curve that leaves heading at it,
  // swings wide of the planet if needed, and ends with a straight run in.
  function planRoute(n) {
    const tp = navLocal(n, new THREE.Vector3());
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const d = Math.max(n.fitR / (tanH * 0.7), n.bodyR * 2.2);
    const dir = parkDir(shipPos.clone().sub(tp).normalize(), BODY.starDir, BODY.axis, !n.moon);
    const p1 = tp.clone().addScaledVector(dir, d), p0 = shipPos.clone();
    const len0 = p0.distanceTo(p1);
    // a curved route: leave heading at the target, arrive flying straight in (so the view doesn't swing at the end)
    const ctrl = p0.clone().addScaledVector(tp.clone().sub(p0).normalize(), len0 * 0.35);
    const ctrl2 = p1.clone().addScaledVector(dir, len0 * 0.4);
    if (n.moon) {                       // don't fly through the planet or its rings
      const sc = BODY.group.position, seg = p1.clone().sub(p0), u = Math.max(0, Math.min(1, sc.clone().sub(p0).dot(seg) / seg.lengthSq()));
      const close = p0.clone().addScaledVector(seg, u), clear = BODY.fitKm * k * 1.4;
      if (close.distanceTo(sc) < clear) {
        const out = close.clone().addScaledVector(close.clone().sub(sc).normalize(), clear * 1.6);
        ctrl.copy(out).addScaledVector(out.clone().sub(p0).normalize(), len0 * 0.1);   // swing wide early; the end stays a straight run in
      }
    }
    return { n, p0, p1, ctrl, ctrl2, len0 };
  }
  // ---- the route on screen: a line of glowing dots from the ship's nose to the target ----
  const ROUTE_N = 64;
  const routeTex = pointTexture('125,255,198');
  const routeGroup = new THREE.Group(); sysWorld.add(routeGroup); routeGroup.visible = false;
  const routeDots = [];
  for (let i = 0; i < ROUTE_N; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: routeTex, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: false, opacity: 0 }));
    sp.scale.set(0.022, 0.022, 1); routeGroup.add(sp); routeDots.push(sp);
  }
  let routePlan = null, routeLockT = 0, routeShowT = 0;
  const bez = (pl, u, out) => { const a = 1 - u, b = u;
    return out.set(0, 0, 0).addScaledVector(pl.p0, a * a * a).addScaledVector(pl.ctrl, 3 * a * a * b)
      .addScaledVector(pl.ctrl2, 3 * a * b * b).addScaledVector(pl.p1, b * b * b); };
  function layRoute(pl) {
    // start just below the view (where the ship's nose would be), blending into the true route
    const inv = spaceRig.quaternion.clone().invert();
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(inv), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(inv);
    const lift = Math.min(pl.len0 * 0.05, 6);
    routeDots.forEach((sp, i) => {
      const u = (i + 1.5) / (ROUTE_N + 1);
      bez(pl, u, sp.position);
      const w = Math.pow(1 - u, 2.2);                                     // offset fades out along the route
      sp.position.addScaledVector(down, lift * w).addScaledVector(fwd, lift * 0.6 * w);
      sp.userData.u = u;
    });
  }
  function updateRoute() {
    const now = performance.now();
    if (navLock && !navLock.deep && nav.target !== navLock.name && !travel) {
      if (!routePlan || routePlan.n !== navLock) { routePlan = planRoute(navLock); layRoute(routePlan); routeLockT = now; }
      routeGroup.visible = true;
      const reveal = Math.min(1, (now - routeLockT) / 450), ph = now / 1000;
      routeDots.forEach((sp, i) => {
        const u = sp.userData.u;
        const shown = u <= reveal ? 1 : 0;
        const pulse = 0.5 + 0.5 * Math.cos((u * 6 - ph * 1.6) * Math.PI * 2 / 6 * 3);   // pulses flowing toward the target
        sp.material.opacity = shown * (0.5 + 0.5 * Math.pow(Math.max(0, pulse), 3));
      });
    } else if (travel && travel.plan) {
      if (routePlan !== travel.plan) { routePlan = travel.plan; layRoute(routePlan); }
      routeGroup.visible = true;
      const u = Math.max(0, Math.min(1, (travel.t - travel.turn) / travel.fly)), e = prof(PROFILE.e, u);
      const fade = Math.max(0, 1 - (now - routeShowT) / 1000 / (travel.dur * 0.8));
      routeDots.forEach(sp => { sp.material.opacity = sp.userData.u > e + 0.02 ? 0.6 * fade : 0; });   // passed dots vanish
    } else {
      routeGroup.visible = false; routePlan = null;
    }
  }
  const qFace = new THREE.Quaternion(), mBasis = new THREE.Matrix4();
  function faceQuat(fwdLocal, out) {                  // the turn of space that puts fwdLocal straight ahead, keeping "up" roughly as it is
    const upL = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceRig.quaternion.clone().invert());
    const z = fwdLocal.clone().normalize().negate();
    const y = upL.addScaledVector(z, -upL.dot(z)).normalize(), xx = new THREE.Vector3().crossVectors(y, z);
    mBasis.makeBasis(xx, y, z); out.setFromRotationMatrix(mBasis).invert(); return out;
  }
  // Speed over the trip: a hard punch (12% of the time), full warp, then a long, gentle slow-down
  const PROFILE = (() => {
    const N = 400, A = 0.12, B = 0.42, v = [], e = [0];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      v.push(u < A ? Math.pow(u / A, 1.6) : u < B ? 1 : Math.pow(1 - (u - B) / (1 - B), 2.2));
    }
    for (let i = 1; i <= N; i++) e.push(e[i - 1] + (v[i] + v[i - 1]) / 2);
    const tot = e[N]; return { N, v, e: e.map(x => x / tot) };
  })();
  const prof = (arr, u) => { const f = Math.max(0, Math.min(1, u)) * PROFILE.N, i = Math.min(PROFILE.N - 1, Math.floor(f)), r = f - i; return arr[i] * (1 - r) + arr[i + 1] * r; };
  let worldFov = 55, travelV = 0;                     // wider view for the far/space layers while warping
  // camera "body language" for the space layers only (your cubes stay level): bank into turns, nose lift, shake
  const camMove = { roll: 0, pitch: 0, shake: 0, prevFwd: null };
  function navUpdate(dt) {
    if (travel) {
      const tr = travel; tr.t += dt;
      const tp = navLocal(tr.n, navTmp.set(0, 0, 0)).clone();
      const u = Math.max(0, Math.min(1, (tr.t - tr.turn) / tr.fly));
      const e = prof(PROFILE.e, u), v = tr.t < tr.turn ? 0 : prof(PROFILE.v, u);
      const a = 1 - e, b = e;
      shipPos.set(0, 0, 0).addScaledVector(tr.p0, a * a * a).addScaledVector(tr.ctrl, 3 * a * a * b).addScaledVector(tr.ctrl2, 3 * a * b * b).addScaledVector(tr.p1, b * b * b);
      // charge: in the last moments of the turn the dots slow and drift back... then the punch
      const charge = tr.t < tr.turn ? Math.max(0, (tr.t - (tr.turn - 0.4)) / 0.4) : 0;
      const ch = charge * charge;
      // anticipation: the ship pulls back a touch, nose lifts, view squeezes, dots rush backward...
      if (charge > 0) {
        const back = tr.p0.clone().sub(tr.ctrl).normalize().multiplyScalar(Math.min(tr.plan.len0 * 0.01, 2.5) * ch);
        shipPos.add(back);
      }
      const sinceGo = tr.t - tr.turn;
      if (sinceGo >= 0 && sinceGo < 0.5) {                                     // ...release: ease the pull-back out over the first moments
        const k = 1 - THREE.MathUtils.smoothstep(sinceGo, 0, 0.5);
        shipPos.add(tr.p0.clone().sub(tr.ctrl).normalize().multiplyScalar(Math.min(tr.plan.len0 * 0.01, 2.5) * k));
      }
      navWarp = tr.t < tr.turn ? 1 - 2.6 * ch : 1 + 70 * v;
      travelV = v;
      // punch: the view snaps wide (a little past, then settles) and shakes for a moment
      const over = sinceGo >= 0 ? Math.max(0, 1 - sinceGo / 0.6) : 0;
      worldFov = 55 + 20 * Math.pow(v, 0.8) + 6 * Math.sin(Math.min(1, sinceGo / 0.6) * Math.PI) * over - 6 * ch;
      camMove.pitch = 0.035 * ch;
      if (sinceGo >= 0 && sinceGo < 0.05 && !tr.shook) { tr.shook = true; camMove.shake = 1; try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(35); } catch (e) {} }
      // look where the ship is going: along the route (a little ahead on the curve);
      // the route starts heading at the target and ends with a straight run in, so start and end still face it
      // look INTO the turn: aim at a point well ahead on the curve (where the turn is taking you), not just the tangent
      const ahead = bez(tr, Math.min(1, e + 0.22), navTmp2).sub(shipPos);
      const toT = tp.sub(shipPos);
      const w = THREE.MathUtils.smoothstep(e, 0.9, 1);                     // last moments: settle onto the target
      const look = ahead.lengthSq() > 1e-10 ? ahead.normalize().multiplyScalar(1 - w).addScaledVector(toT.normalize(), w) : toT;
      faceQuat(look, qFace);
      spaceRig.quaternion.slerp(qFace, Math.min(1, dt * (tr.t < tr.turn ? 5 : 7)));
      // bank into the turn: roll with how fast the heading swings left/right
      const fwdNow = new THREE.Vector3(0, 0, -1).applyQuaternion(spaceRig.quaternion.clone().invert());
      if (camMove.prevFwd && dt > 0) {
        const upL = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceRig.quaternion.clone().invert());
        const yawRate = new THREE.Vector3().crossVectors(camMove.prevFwd, fwdNow).dot(upL) / dt;   // + = turning left
        const want = THREE.MathUtils.clamp(yawRate * 0.55, -0.5, 0.5);
        camMove.roll += (want - camMove.roll) * Math.min(1, dt * 4);
      }
      camMove.prevFwd = fwdNow;
      skyVelX = skyVelY = 0;
      if (tr.t >= tr.dur) {                                                   // there: hold still, finish turning smoothly
        shipPos.copy(tr.p1);
        if (tr.t >= tr.dur + tr.settle) {
          faceQuat(navLocal(tr.n, new THREE.Vector3()).sub(shipPos), qFace);
          if (spaceRig.quaternion.angleTo(qFace) < 0.002) spaceRig.quaternion.copy(qFace);
        }
      }
      if (tr.t >= tr.dur + tr.settle) {
        nav.target = tr.n.name; travel = null; navWarp = 1; worldFov = 55; travelV = 0; camMove.prevFwd = null;
        navOffset.copy(shipPos).sub(navLocal(tr.n, new THREE.Vector3())); saveNav();
        factsFor = tr.n; factsT = performance.now();
        try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(20); } catch (e) {}
      }
    }
    if (!travel) {                                    // not flying: bank, nose and shake ease back to level
      camMove.roll *= Math.pow(0.02, dt); camMove.pitch *= Math.pow(0.02, dt);
    }
    camMove.shake *= Math.pow(0.003, dt);
    if (!travel && nav.target) {
      const n = NAV.find(x => x.name === nav.target);
      if (n) { sysWorld.position.copy(shipPos).negate(); syncSysRig(); shipPos.copy(navLocal(n, navTmp2)).add(navOffset); }
    }
    sysWorld.position.copy(shipPos).negate();
    syncSysRig();
    // near plane for the far pass: close to the nearest surface, so a moon right in front of you isn't clipped
    let nearest = Infinity;
    NAV.forEach(n => { n.t.obj.getWorldPosition(navTmp2); nearest = Math.min(nearest, navTmp2.distanceTo(camera.position) - n.bodyR); });
    sysNear = Math.max(0.0005, Math.min(0.1, nearest * 0.25));
  }
  function navHud() {
    if (navLock) {
      const [x, y, r, front, dist] = screenOf(navLock);
      if (!front) { lockG.style.display = 'none'; return; }
      lockG.style.display = '';
      const k01 = Math.min(1, (performance.now() - lockT) / 350), e = 1 - Math.pow(1 - k01, 3);
      const fin = Math.max(r * 1.25, 20), sz = fin + (1 - e) * 110, L = Math.max(7, fin * 0.35);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
        const cx = x + sx * sz, cy = y + sy * sz;
        lockCorners[i].setAttribute('d', `M${(cx - sx * L).toFixed(1)},${cy.toFixed(1)} L${cx.toFixed(1)},${cy.toFixed(1)} L${cx.toFixed(1)},${(cy - sy * L).toFixed(1)}`);
      });
      const here = navLock.deep ? deep.sys === navLock.id : nav.target === navLock.name;
      lockName.textContent = navLock.name + (here ? '' : '  ' + (navLock.local ? distText(navLock) : navLock.deep ? fmtLy(deepDist(navLock)) : fmtKm(Math.max(0, dist - navLock.bodyR) / k)));
      lockName.setAttribute('x', (x - sz).toFixed(1)); lockName.setAttribute('y', (y + sz + 16).toFixed(1));
      lockHint.textContent = here ? 'YOU ARE HERE' : navLock.deep ? (inRange(navLock) ? 'TAP AGAIN TO JUMP' : 'OUT OF RANGE · MAX ' + WARP_LY + ' LY') : 'TAP AGAIN TO ENGAGE';
      lockHint.setAttribute('x', (x - sz).toFixed(1)); lockHint.setAttribute('y', (y + sz + 30).toFixed(1));
    } else lockG.style.display = 'none';
    if (factsFor && factsT > 0) {                    // arrival readout, ~7 s
      const age = (performance.now() - factsT) / 1000;
      if (age > 7.5) { factsT = -1; factsG.style.display = 'none'; return; }
      const [x, y, r, front] = screenOf(factsFor);
      if (!front) { factsG.style.display = 'none'; return; }
      factsG.style.display = ''; factsG.style.opacity = Math.min(1, age / 0.5, (7.5 - age) / 0.8);
      const lines = [factsFor.name, ...factsFor.facts], fx = 18, dockTop = innerHeight - (INSETS.bottom || 0) - 150, fy = Math.min(dockTop - lines.length * 16, y + r + 34);   // all lines stay above the dock
      factLines.forEach((tx, i) => { tx.textContent = lines[i] || ''; tx.setAttribute('x', fx); tx.setAttribute('y', fy + i * 16); tx.setAttribute('class', i ? '' : 'big'); });
    }
  }
  // Invisible stand-ins for the bodies, drawn in the near "space" layer: dots, ships and the whale
  // behind a planet are hidden by it (the planets themselves are drawn in the far pass).
  const occluders = new THREE.Group(); scene.add(occluders);
  const occMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  // Near copies: the same outline on screen, placed just in front of you. They hide the flying dots
  // wherever a planet covers the screen (the dots read as stars, so none should show on a planet).
  const nearOcc = new THREE.Group(); scene.add(nearOcc); nearOcc.visible = false;
  const occQ = new THREE.Quaternion(), occDir = new THREE.Vector3();
  function updateOccluders() {
    NAV.forEach(n => {
      const src = n.moon ? n.moon.body : BODY.mesh;
      src.getWorldPosition(n.occ.position); src.getWorldQuaternion(occQ); n.occ.quaternion.copy(occQ);
      src.getWorldScale(n.occ.scale); n.occ.scale.multiplyScalar(n.bodyR * 0.985);   // a hair smaller: no dark fringe
      occDir.copy(n.occ.position).sub(camera.position);
      const dist = occDir.length(), nearD = 0.5;
      n.occNear.visible = dist > n.bodyR * 1.02;                   // (not when you're inside it)
      n.occNear.position.copy(camera.position).addScaledVector(occDir, nearD / dist);
      n.occNear.quaternion.copy(occQ); n.occNear.scale.copy(n.occ.scale).multiplyScalar(nearD / dist);
    });
  }
  // Warp streaks: blue-white lines rushing past, each with a bright head and a tail fading to nothing.
  // While a far jump holds in hyperspace (warpDeep 0..1) there are more of them, longer, over a dark veil (no white light).
  const STREAK_N = 260, STREAK_DEEP_N = 900;
  const streakGeo = new THREE.BufferGeometry(), streakPos = new Float32Array(STREAK_DEEP_N * 6), streakCol = new Float32Array(STREAK_DEEP_N * 6), streakSeed = [];
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPos, 3)); streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 3));
  const streakMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const streaks = new THREE.LineSegments(streakGeo, streakMat); streaks.frustumCulled = false; scene.add(streaks);
  const seedStreak = s => { const a = Math.random() * Math.PI * 2, r = 1.5 + Math.pow(Math.random(), 0.6) * 22; s.x = Math.cos(a) * r; s.y = Math.sin(a) * r; return s; };
  for (let i = 0; i < STREAK_DEEP_N; i++) {
    const s = seedStreak({ z: -Math.random() * 90, b: 0.45 + 0.55 * Math.pow(Math.random(), 2) });          // b: how bright this one is
    const c = [0.62 + 0.38 * s.b, 0.75 + 0.25 * s.b, 1].map(v => v * s.b);                                   // blue-white, the brightest nearly white
    streakCol.set([...c, 0, 0, 0.12 * s.b], i * 6); streakSeed.push(s);                                       // head bright, tail fading out
  }
  let warpDeep = 0, warpVeil = 0;                      // set by the warp: hyperspace hold (0..1), dark veil over the far layers (0..1)
  function updateStreaks(dt) {
    streakMat.opacity = Math.min(0.9, Math.max(travelV * 1.2, warpVeil));
    streaks.visible = streakMat.opacity > 0.01;
    if (!streaks.visible) return;
    streaks.position.copy(camera.position); streaks.quaternion.copy(camera.quaternion);
    const v = Math.max(travelV, warpVeil), n = Math.round(STREAK_N + (STREAK_DEEP_N - STREAK_N) * warpDeep);
    const sp = (140 + 110 * warpDeep) * v * dt, len = 2 + (26 + 34 * warpDeep) * v;
    for (let i = 0; i < n; i++) {
      const s = streakSeed[i];
      s.z += sp; if (s.z > 0) { s.z -= 90; seedStreak(s); }
      streakPos.set([s.x, s.y, s.z, s.x, s.y, s.z - len * (0.6 + 0.8 * s.b)], i * 6);
    }
    streakGeo.setDrawRange(0, n * 2); streakGeo.attributes.position.needsUpdate = true;
  }
  // the veil: deep blue-black over the sky while you are in hyperspace, a small blue-white glow where you're heading
  const veilScene = new THREE.Scene(), veilCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const veilMat = new THREE.ShaderMaterial({ transparent: true, depthTest: false, depthWrite: false, uniforms: { k: { value: 0 }, aspect: { value: 1 } },
    vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform float k, aspect; varying vec2 vP;
      void main() { float r = length(vec2(vP.x * aspect, vP.y)), g = exp(-r * r * 90.0) + 0.35 * exp(-r * r * 9.0);
        vec3 c = mix(vec3(0.012, 0.025, 0.07), vec3(0.6, 0.78, 1.0), clamp(g, 0.0, 1.0));
        gl_FragColor = vec4(c, k * clamp(0.93 + g, 0.0, 1.0)); }` });
  veilScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veilMat));
  // =========================================================
  //  DEEP SKY: the real sky around you.
  //  - The 1000 nearest known exoplanets (NASA Exoplanet Archive, pscomppars, fetched 2026-11-23),
  //    one marker per star, in their real directions. They show out to the distance set in Settings,
  //    fainter with distance, and only near the middle of the view.
  //  - Black holes, nebulae, galaxies and a star cluster at their real positions (CDS Sesame).
  //  - The Milky Way band along the real galactic plane, with slow coloured waves of gas.
  //  The sky is turned so the Sun sits where it really is against those stars, from the home planet's real
  //  place on its orbit today (the catalogue's time model).
  //  Tap to lock on, tap again to jump there. A jump to a star lands at the star; from there you jump on to its planets.
  //  Landmark close-ups and planet surfaces are artist's impressions built from each object's real numbers.
  // =========================================================
  // Where you are: a place (a star system or a landmark) and, in a star system, the planet you're at.
  // Home is simply the home planet of our system: a place like any other.
  var deep = window.CAT.state, deepJump = null;       // the one state (see the catalogue), plus what only the game needs:
  Object.defineProperties(deep, { atHome: { get: window.CAT.atHome }, at: { get() { return window.CAT.atHome() ? null : this.sys; } } });
  deep.here = new THREE.Vector3();                   // where you are among the stars (ly, in the sky's frame)
  // Warp range: you can see stars farther out, but only jump to stars within 20 ly of where you are.
  // Places marked `always` (our own system, and the far landmarks) can be seen and reached from anywhere; so can the planets of the system you're in.
  const WARP_LY = window.CAT.warpLy;
  deep.limit = Math.max(deep.limit, WARP_LY);          // star dots are always drawn at least as far as you can jump
  // the star map records a place as seen (???) only when its name tag shows on your screen, or you lock on to it
  const reportSeen = o => window.CAT.saw(o.id);
  const inRange = o => !o.deep || o.local || window.CAT.inReach(window.CAT.byId.get(o.id));
  const SKY = window.CAT;                             // the one catalogue (see the top of the page)
  const DEG = Math.PI / 180;
  const satLon = SKY.homeLon;                         // the home planet's real longitude today (the catalogue's time model)
  // From the home planet the Sun sits at ecliptic longitude satLon + 180 deg: that fixes where longitude 0 (the March equinox) is
  const EQX = S.clone().applyAxisAngle(N, -(satLon + Math.PI)).normalize();
  const EQY = new THREE.Vector3().crossVectors(N, EQX);
  const OBL = 23.43928 * DEG;                          // obliquity of the ecliptic at J2000 (JPL)
  function eqDir(raDeg, decDeg, out = new THREE.Vector3()) {   // RA/Dec (J2000) -> direction in the scene
    const ra = raDeg * DEG, de = decDeg * DEG;
    const x = Math.cos(de) * Math.cos(ra), y = Math.cos(de) * Math.sin(ra), z = Math.sin(de);
    const ye = y * Math.cos(OBL) + z * Math.sin(OBL), ze = -y * Math.sin(OBL) + z * Math.cos(OBL);
    return out.set(0, 0, 0).addScaledVector(EQX, x).addScaledVector(EQY, ye).addScaledVector(N, ze).normalize();
  }
  const fmtLy = SKY.fmtLy, starColor = teff => new THREE.Color(...SKY.starRGB(teff));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // ---- the catalogue ----
  const SYSTEMS = [], LANDMARKS = [];
  const SOL = { ...SKY.sol, deep: true, kind: 'system', pos: new THREE.Vector3() };      // our own system: one more star system
  SKY.systems.forEach(s => { if (s !== SKY.sol) SYSTEMS.push({ ...s, deep: true, kind: 'system', pos: eqDir(s.ra, s.dec).multiplyScalar(s.ly) }); });
  SKY.landmarks.forEach(l => LANDMARKS.push({ ...l, look: l.look || {}, deep: true, pos: eqDir(l.ra, l.dec).multiplyScalar(l.ly) }));
  const ALL_DEEP = [...SYSTEMS, ...LANDMARKS, SOL];
  const PLACE = new Map(ALL_DEEP.map(o => [o.id, o]));
  const curPlace = () => PLACE.get(deep.sys);
  // ---- inside a star system: its bodies (the star and every planet on its orbit, orbitPos), so from where you are you see the others
  //      in their true directions and sizes, and can lock on and jump between them. The same for every system, ours included.
  //      `local`: a body of the system you're in (q: its planet, or null for the star).
  let LOCAL = [], ACTIVE = [], SPRITED = [];
  const distText = o => (o.distKm / KM_AU).toFixed(o.distKm < 10 * KM_AU ? 2 : 1) + ' AU';
  const planetOf = SKY.planetOf;                        // (the named planet, or null: the star)
  const localShip = new THREE.Vector3();               // where the ship is parked in the system you're in (km from its star)
  function setupLocal() {
    LOCAL.forEach(o => { const i = ALL_DEEP.indexOf(o); if (i >= 0) ALL_DEEP.splice(i, 1); if (o.sprite) { skyRig.remove(o.sprite); o.sprite.material.dispose(); } });
    LOCAL = [];
    const s = curPlace(); if (!s.planets) return;
    const here = planetOf(s, deep.planet), C = here ? orbitPos(s, here) : new THREE.Vector3();          // the body you're at (the star: the centre)
    const P = localShip.copy(C).addScaledVector(BODY.group.position, -1 / k);                            // the ship, parked beside it (km): every body is seen from here
    if (here) {                                          // the star: its glow is drawn by buildDest, so it needs no dot of its own
      const o = { deep: true, local: true, kind: 'star', id: 'star:' + s.id, name: SKY.byId.get(s.id).name, host: s, q: null, pos: s.pos, ly: s.ly,
        distKm: P.length(), dirLocal: P.clone().negate().normalize(), facts: deepFacts(s) };
      ALL_DEEP.push(o); LOCAL.push(o);
    }
    s.planets.forEach(q => {
      if (q === here) return;
      const v = orbitPos(s, q).sub(P), cls = q.cls;
      const o = { deep: true, local: true, kind: 'planet', id: q.id, name: q.name.toUpperCase() + (q.home ? ' · HOME' : ''), host: s, q, pos: s.pos, ly: s.ly,
        distKm: v.length(), dirLocal: v.normalize(), diamKm: q.diamKm, facts: deepFacts(s, q.name) };
      o.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: pointTexture(q.rgb || (cls === 'giant' ? '255,225,180' : cls === 'rocky' ? '230,200,170' : '170,210,255')), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      skyRig.add(o.sprite); ALL_DEEP.push(o); LOCAL.push(o);
    });
  }
  const deepDist = o => o.pos.distanceTo(deep.here);
  const relDir = (o, out) => o.dirLocal ? out.copy(o.dirLocal) : out.copy(o.pos).sub(deep.here).normalize();
  const planetClass = SKY.planetClass, CLASS_NAME = SKY.CLASS_NAME;
  function deepFacts(o, planetName) {
    const q = planetOf(o, planetName);
    return q ? [...SKY.placeFacts(o), ...SKY.planetFacts(q)] : SKY.placeFacts(o);
  }
  ALL_DEEP.forEach(o => o.facts = deepFacts(o));

  // ---- exoplanet markers: one glowing point per star ----
  const SHELL = 950;                                 // the sky shells (scene units): star dots at 950, pictures and planet dots just outside
  const MARK_R = 980, PIC_FILL = 0.6;                // a picture's glow fills about 60% of its square
  const sysGeo = new THREE.BufferGeometry();
  const sysPos = new Float32Array(SYSTEMS.length * 3), sysCol = new Float32Array(SYSTEMS.length * 3), sysDist = new Float32Array(SYSTEMS.length);
  SYSTEMS.forEach((o, i) => { const c = starColor(o.teff); sysCol.set([c.r, c.g, c.b], i * 3); });
  sysGeo.setAttribute('position', new THREE.BufferAttribute(sysPos, 3));
  sysGeo.setAttribute('aCol', new THREE.BufferAttribute(sysCol, 3));
  sysGeo.setAttribute('aDist', new THREE.BufferAttribute(sysDist, 1));
  const CONE = [Math.cos(38 * DEG), Math.cos(12 * DEG)];      // fully shown inside 12 deg of the centre, gone past 38 deg
  const sysMat = new THREE.ShaderMaterial({
    uniforms: { uFwd: { value: new THREE.Vector3(0, 0, -1) }, uLimit: { value: 50 }, uPx: { value: 1 }, uCone: { value: new THREE.Vector2(CONE[0], CONE[1]) } },
    vertexShader: `attribute vec3 aCol; attribute float aDist; uniform vec3 uFwd; uniform float uLimit, uPx; uniform vec2 uCone;
      varying vec3 vC; varying float vA;
      void main() {
        float c = smoothstep(uCone.x, uCone.y, dot(normalize(position), uFwd));
        float near = clamp(1.0 - aDist / uLimit, 0.0, 1.0);
        vA = step(aDist, uLimit) * step(0.01, aDist) * c * (0.3 + 0.7 * near); vC = aCol;
        gl_PointSize = uPx * (3.0 + 6.0 * near) * (0.55 + 0.45 * c);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main() { vec2 p = gl_PointCoord * 2.0 - 1.0; float r = dot(p, p);
        if (r > 1.0 || vA < 0.004) discard;
        float core = exp(-r * 9.0), halo = exp(-r * 2.4) * 0.5;
        gl_FragColor = vec4(mix(vC, vec3(1.0), core * 0.65) * (core + halo) * vA, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sysPoints = new THREE.Points(sysGeo, sysMat); sysPoints.frustumCulled = false; skyRig.add(sysPoints);

  // ---- landmark pictures on the sky ----
  function canvasTex(size, draw, soft) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); draw(x, size);
    if (soft) {                                        // fade to nothing before the edge, so a glow is never cut off in a straight line
      const g = x.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, size, size); x.globalCompositeOperation = 'source-over';
    }
    return new THREE.CanvasTexture(c);
  }
  const blob = (x, cx, cy, r, rgb, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = g; x.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
  const landmarkTex = o => new THREE.CanvasTexture(SKY.picture(o));     // the catalogue's picture of a place (the map shows the same one)
  // Real sizes come from the catalogue (diamLy). Black holes are far too small to see, so they show at the minimum dot size.
  const MIN_PX = 9;                                      // nothing is drawn smaller than this (a small dot)
  const SUN_R_KM = 695700;                               // the Sun's volumetric mean radius (NASA NSSDC Sun fact sheet, updated 2024-05-09)
  const SUN_DIAM_LY = 2 * SUN_R_KM / 9.4607e12;         // ...its diameter in light-years
  // The bodies of the system you're in (Dan, 2026-11-24, "D"): nearly all are far under a pixel, so a plain floor made them all alike.
  //  size: their real size in the sky, compressed. 0.001 px or less -> 6 px, 0.1 px -> 84 px (log scale between); past 84 px, the real size.
  //  (Calibrated by Dan: Jupiter seen from Saturn, really 0.056 px, is drawn about 74 px, five times the first try: a close target must really show.)
  //  brightness: the light they really send you, from the star's light (radius^2 x temperature^4), their distance from it, their size,
  //  their albedo (NASA for ours; 0.3, an assumption, for the rest) and their distance from you. On a log scale, 1e2 -> 0.35, 1e6 -> 1.
  const LOCAL_PX = [6, 84], ALBEDO_GUESS = 0.3;
  function localLook(o, pxPerRad) {
    const tp = o.diamKm / Math.max(o.distKm, 1) * pxPerRad, cl = THREE.MathUtils.clamp;
    const px = tp >= LOCAL_PX[1] ? tp : LOCAL_PX[0] + (LOCAL_PX[1] - LOCAL_PX[0]) * cl((Math.log10(tp) + 3) / 2, 0, 1);
    const s = o.host, q = o.q, lum = Math.pow(s.strad || 1, 2) * Math.pow((s.teff || 5772) / 5772, 4);
    const rs = q.auNow || q.au, d = o.distKm / KM_AU, R = o.diamKm / 2;
    const flux = lum * (q.albedo || ALBEDO_GUESS) * R * R / (rs * rs * d * d);
    return { px, bright: 0.35 + 0.65 * cl((Math.log10(flux) - 2) / 4, 0, 1) };
  }
  function sizeMarkers() {                               // every sky picture at its true size as seen from where you are
    const pxPerRad = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(worldFov / 2)), minA = MIN_PX / pxPerRad;
    SPRITED.forEach(o => {
      if (o.local) { const L = localLook(o, pxPerRad); o.sprite.scale.setScalar(L.px / pxPerRad * MARK_R / PIC_FILL); o.faint = L.bright; return; }   // inside a star system: see localLook
      const d = deepDist(o); if (d < 1e-6) return;       // (the place you're in)
      const diam = o.diamLy || 0;
      const ang = diam / d, a = Math.max(ang, minA);
      o.sprite.scale.setScalar(a * MARK_R / PIC_FILL);
      o.faint = ang > 3 * minA ? 0.55 : 1;               // big, spread-out things (galaxies, nebulae) are faint, not bright
    });
  }
  ALL_DEEP.forEach(o => {
    if (!o.always) return;                              // (ordinary stars are drawn together as one cloud of points)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: landmarkTex(o), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    o.sprite = sp; skyRig.add(sp);                      // (sized every frame: sizeMarkers)
  });
  // "MILKY WAY" seen from outside it (from Andromeda, the LMC or M87)
  const mwTex = landmarkTex({ id: 'mw', kind: 'galaxy' });

  // ---- the Milky Way band, along the real galactic plane, with drifting coloured gas ----
  const GP = eqDir(192.85948, 27.12825), GC = eqDir(266.405, -28.936);   // north galactic pole, galactic centre (J2000)
  GC.addScaledVector(GP, -GC.dot(GP)).normalize();
  const GY = new THREE.Vector3().crossVectors(GP, GC);                      // galactic longitude 90 deg (toward Cygnus)
  const galDir = (l, b, out = new THREE.Vector3()) => out.set(0, 0, 0).addScaledVector(GC, Math.cos(b) * Math.cos(l)).addScaledVector(GY, Math.cos(b) * Math.sin(l)).addScaledVector(GP, Math.sin(b));
  const mwGroup = new THREE.Group(); skyRig.add(mwGroup);
  {
    const R = rng(7), Nmw = 9000, pos = new Float32Array(Nmw * 3), col = new Float32Array(Nmw * 3), v = new THREE.Vector3();
    const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += R(); return (u - 2) / 0.58; };
    for (let i = 0; i < Nmw; i++) {
      let l = R() < 0.4 ? gauss() * 35 * DEG : (R() * 2 - 1) * Math.PI;
      const bulge = Math.exp(-Math.pow(l / (25 * DEG), 2));
      let b = gauss() * (2.4 + 9 * bulge) * DEG;
      if (Math.abs(b) < 1.2 * DEG && bulge > 0.3 && R() < 0.6) b += (b < 0 ? -1 : 1) * 2 * DEG;     // the dark dust lane
      galDir(l, b, v).multiplyScalar(1000); pos.set([v.x, v.y, v.z], i * 3);
      const w = bulge * (0.6 + 0.4 * R()), br = 0.35 + 0.65 * R();
      col.set([br * (0.78 + 0.22 * w), br * (0.8 + 0.08 * w), br * (1 - 0.3 * w)], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    mwGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, map: pointTexture('255,255,255') })));
  }
  const cloudTex = [0, 1, 2].map(n => canvasTex(256, (x, s) => { const R = rng(99 + n); for (let i = 0; i < 14; i++) blob(x, s / 2 + (R() - 0.5) * s * 0.5, s / 2 + (R() - 0.5) * s * 0.35, s * (0.15 + R() * 0.25), '255,255,255', 0.35); }, true));
  const WAVE_HUES = ['150,90,255', '60,200,210', '255,90,170', '90,140,255', '255,150,90', '120,255,200'];
  const waves = [];
  for (let i = 0; i < 46; i++) {                        // the diffuse glow of the band itself (brightest toward the centre)
    const R = rng(500 + i), l = (i / 46) * Math.PI * 2 - Math.PI + (R() - 0.5) * 0.1, bulge = Math.exp(-Math.pow(l / (30 * DEG), 2));
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % 3], color: new THREE.Color(0.85, 0.85 - 0.1 * bulge, 1 - 0.3 * bulge), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.07 + 0.12 * bulge }));
    galDir(l, (R() - 0.5) * 3 * DEG, sp.position).multiplyScalar(1080); const s = 200 + 160 * bulge; sp.scale.set(s * 1.4, s * (0.5 + 0.5 * bulge), 1);
    mwGroup.add(sp);
  }
  for (let i = 0; i < 18; i++) {
    const R = rng(300 + i), l = (R() * 2 - 1) * Math.PI * (i < 8 ? 0.35 : 1), b = (R() - 0.5) * 9 * DEG;
    const hue = WAVE_HUES[i % WAVE_HUES.length].split(',').map(v => v / 255);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % 3], color: new THREE.Color(hue[0], hue[1], hue[2]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    galDir(l, b, sp.position).multiplyScalar(1050); const s = 220 + R() * 260; sp.scale.set(s * 1.6, s, 1);
    sp.material.rotation = R() * Math.PI; sp.userData = { ph: R() * 6.28, sp: 0.15 + R() * 0.2, base: 0.07 + R() * 0.07 };
    mwGroup.add(sp); waves.push(sp);
  }

  function refreshMarkers() {
    const v = new THREE.Vector3();
    SYSTEMS.forEach((o, i) => { const d = deepDist(o); relDir(o, v).multiplyScalar(SHELL); sysPos.set([v.x, v.y, v.z], i * 3); sysDist[i] = d; });
    sysGeo.attributes.position.needsUpdate = true; sysGeo.attributes.aDist.needsUpdate = true;
    const outside = deep.here.length() > 60000;                     // far outside our galaxy
    ALL_DEEP.forEach(o => { if (!o.sprite) return; relDir(o, o.sprite.position).multiplyScalar(MARK_R); });
    // the few things worth checking every frame: what can be seen and reached from anywhere, this system's planets, and the stars within warp range
    ACTIVE = ALL_DEEP.filter(o => o.always || o.local || deepDist(o) <= WARP_LY);
    SPRITED = ACTIVE.filter(o => o.sprite);
    mwGroup.visible = !outside;
    SOL.name = outside ? 'MILKY WAY · SOL' : 'SOL'; SOL.diamLy = outside ? 100000 : SUN_DIAM_LY;   // from outside the galaxy, home is the Milky Way
    SOL.sprite.material.map = outside ? mwTex : SOL.sprite.userData.tex || (SOL.sprite.userData.tex = SOL.sprite.material.map);
    // (sizes are set every frame by sizeMarkers)
  }

  // ---- what you see where you arrive (artist's impressions from the real numbers) ----
  const destGroup = new THREE.Group(); sysRig.add(destGroup);
  const destStar = new THREE.Group(); sysRig.add(destStar);   // the star of the system you're at: fixed in its real direction
  const DEST_D = 60, STAR_D = 400;                    // how far the close-up (and its star's glow) sit from you, in scene units
  const SUN_FROM_EARTH = 2 * SUN_R_KM / KM_AU;         // the Sun's size in Earth's sky (radians)
  let dest = null;                                     // { solids: [{mesh, r}], tick(dt, t), lights: [{u, local}] , center radius}
  function planetTexture(cls, eqt, seed) {
    const R = rng(seed), W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const T = eqt || 300;
    if (cls === 'giant' || cls === 'neptune' || cls === 'subneptune') {
      const pal = cls === 'giant' ? (T > 1000 ? ['#3a1a14', '#6b2a18', '#a1401e', '#2b1410', '#83301a'] : T > 350 ? ['#d8b48a', '#b8865a', '#e8cfa8', '#9c6c44', '#c99a6a'] : ['#d9c8a8', '#bfa07a', '#e9dcc0', '#a8865e', '#cbb48c'])
        : T > 800 ? ['#9f8fc4', '#b7a6d6', '#8574ae', '#c7bce0'] : ['#6fa8d8', '#4f86c0', '#8cc0e6', '#5d97cc'];
      let y = 0, i = 0; while (y < H) { const h = (cls === 'giant' ? 5 : 14) + R() * (cls === 'giant' ? 24 : 40); x.fillStyle = pal[(i++ + (R() * 2 | 0)) % pal.length]; x.fillRect(0, y, W, h + 1); y += h; }
      for (let n = 0; n < 900; n++) { x.fillStyle = `rgba(255,255,255,${R() * (cls === 'giant' ? 0.06 : 0.04)})`; x.fillRect(R() * W, R() * H, 30 + R() * 200, 1 + R() * 2); }
      if (cls === 'giant' && R() < 0.6) { x.fillStyle = 'rgba(180,80,50,0.5)'; x.beginPath(); x.ellipse(R() * W, H * (0.3 + R() * 0.4), 26, 12, 0, 0, Math.PI * 2); x.fill(); }
    } else {
      const base = T > 700 ? '#2a2422' : T > 260 ? '#8a6a4e' : '#c9ced4';
      x.fillStyle = base; x.fillRect(0, 0, W, H);
      const spots = T > 700 ? ['#3a302c', '#1c1716'] : T > 260 ? ['#a5835f', '#6e5440', '#b99873', '#5a4636'] : ['#e8edf2', '#aeb6bf', '#9aa3ad'];
      for (let n = 0; n < 700; n++) { x.fillStyle = spots[n % spots.length]; x.globalAlpha = 0.25; x.beginPath(); x.arc(R() * W, R() * H, 2 + R() * 22, 0, Math.PI * 2); x.fill(); }
      x.globalAlpha = 1;
      if (T > 700) { x.strokeStyle = 'rgba(255,120,30,0.85)'; x.lineWidth = 1.5; for (let n = 0; n < 60; n++) { x.beginPath(); let px = R() * W, py = R() * H; x.moveTo(px, py); for (let k2 = 0; k2 < 6; k2++) { px += (R() - 0.5) * 40; py += (R() - 0.5) * 20; x.lineTo(px, py); } x.stroke(); } }
    }
    return new THREE.CanvasTexture(c);
  }
  function solTexture(look) {                         // well-known looks, painted (a planet's `look` in the catalogue)
    const R = rng(hash(look)), W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const bands = (pal, min, max) => { let y = 0, i = 0; while (y < H) { const hh = min + R() * (max - min); x.fillStyle = pal[(i++ + (R() * 2 | 0)) % pal.length]; x.fillRect(0, y, W, hh + 1); y += hh; } };
    const blobs = (cols, n, rmin, rmax, a) => { for (let k = 0; k < n; k++) { x.globalAlpha = a; x.fillStyle = cols[k % cols.length]; x.beginPath(); x.ellipse(R() * W, H * (0.12 + R() * 0.76), rmin + R() * (rmax - rmin), (rmin + R() * (rmax - rmin)) * 0.6, R() * 3, 0, Math.PI * 2); x.fill(); } x.globalAlpha = 1; };
    const caps = col => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col); g.addColorStop(0.07, col); g.addColorStop(0.13, 'rgba(255,255,255,0)'); g.addColorStop(0.87, 'rgba(255,255,255,0)'); g.addColorStop(0.93, col); g.addColorStop(1, col); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    if (look === 'jupiter') { bands(['#e8d8bc', '#c99a6b', '#f2e6d0', '#a8774f', '#d9b48c', '#efe0c6'], 6, 22); x.fillStyle = '#b5523a'; x.globalAlpha = 0.85; x.beginPath(); x.ellipse(W * 0.62, H * 0.64, 34, 15, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; }
    else if (look === 'earth') { x.fillStyle = '#1f4f8f'; x.fillRect(0, 0, W, H); blobs(['#3f7a3a', '#6b8a46', '#9c8a5a', '#4d7f3e'], 26, 18, 70, 0.95); caps('#f2f6fa'); blobs(['#ffffff'], 40, 10, 50, 0.38); }
    else if (look === 'mars') { x.fillStyle = '#b5532e'; x.fillRect(0, 0, W, H); blobs(['#7e3a22', '#c8693c', '#8f4428'], 40, 10, 60, 0.6); caps('#f4ede6'); }
    else if (look === 'venus') { bands(['#efdcae', '#e6cf98', '#f6e8c4', '#dcc187'], 14, 40); blobs(['#fff5dc'], 20, 30, 90, 0.18); }
    else if (look === 'cratered' || look === 'moon') { x.fillStyle = look === 'moon' ? '#9a9a96' : '#8c8580'; x.fillRect(0, 0, W, H); for (let k = 0; k < 260; k++) { const cx = R() * W, cy = R() * H, rr = 2 + Math.pow(R(), 3) * 26; x.fillStyle = 'rgba(40,36,34,0.35)'; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); x.strokeStyle = 'rgba(220,215,210,0.25)'; x.beginPath(); x.arc(cx - 1, cy - 1, rr, 0, 7); x.stroke(); } }
    else if (look === 'uranus') { bands(['#b8e6ea', '#acdfe5', '#c4ecef'], 30, 60); }
    else if (look === 'neptune') { bands(['#3f63d6', '#3557c4', '#4a70e0', '#2f4fb5'], 12, 34); x.fillStyle = 'rgba(20,30,90,0.7)'; x.beginPath(); x.ellipse(W * 0.4, H * 0.62, 26, 12, 0, 0, 7); x.fill(); }
    return new THREE.CanvasTexture(c);
  }
  function planetMesh(p, r, lightU) {
    const cls = p.cls, hot = THREE.MathUtils.smoothstep(p.eqt || 0, 800, 2000);
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), new THREE.ShaderMaterial({
      uniforms: { map: { value: p.tex || planetTexture(cls, p.eqt, hash(p.name)) }, sunDir: lightU, hot: { value: hot } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; void main() { vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 sunDir; uniform float hot; varying vec2 vUv; varying vec3 vN;
        void main() { vec3 t = texture2D(map, vUv).rgb; float d = dot(normalize(vN), normalize(sunDir));
          float light = smoothstep(-0.08, 0.35, d) * 1.05 + 0.02;
          vec3 glow = vec3(1.0, 0.35, 0.08) * hot * (1.0 - light) * 0.55 * (0.4 + t.r);
          gl_FragColor = vec4(t * light + glow, 1.0); }` }));
    const tint = cls === 'rocky' ? (p.eqt > 700 ? [1, 0.5, 0.25] : [0.6, 0.75, 1]) : cls === 'giant' ? (p.eqt > 1000 ? [1, 0.45, 0.2] : [1, 0.85, 0.6]) : [0.45, 0.75, 1];
    const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 48, 32), new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(...tint) }, sunDir: lightU },
      vertexShader: `varying vec3 vN, vV; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 tint, sunDir; varying vec3 vN, vV; void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        float lit = smoothstep(-0.3, 0.4, dot(normalize(vN), normalize(sunDir))); gl_FragColor = vec4(tint * f * lit * 0.9, 1.0); }`,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.add(atm); return m;
  }
  function glowSprite(rgb, size, op) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pointTexture(rgb), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op }));
    sp.scale.set(size, size, 1); return sp;
  }
  function clearDest() {
    destGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    while (destGroup.children.length) destGroup.remove(destGroup.children[0]);
    destStar.traverse(o => { if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    while (destStar.children.length) destStar.remove(destStar.children[0]);
    dest = null;
  }
  function buildDest(o, dir, planetName) {
    clearDest();
    const q0 = planetOf(o, planetName);
    const R = rng(hash(o.id));
    const fw = dir.clone().normalize();
    const upL = new THREE.Vector3(0, 1, 0).applyQuaternion(spaceRig.quaternion.clone().invert());
    const rt = new THREE.Vector3().crossVectors(fw, upL).normalize(), up = new THREE.Vector3().crossVectors(rt, fw);
    const at = (x, y, z, out = new THREE.Vector3()) => out.set(0, 0, 0).addScaledVector(rt, x).addScaledVector(up, y).addScaledVector(fw, z);
    dest = { solids: [], lights: [], anim: [], r: 10, group: destGroup, D: DEST_D };   // group, D: what rushes in on arrival, and how far it ends up
    const addLight = local => { const u = { value: new THREE.Vector3() }; dest.lights.push({ u, local }); return u; };
    if (q0) {                                          // a planet, lit by its star from the star's real direction, at the star's true size
      const col = starColor(o.teff), rgb = [col.r, col.g, col.b].map(v => Math.round(v * 255)).join(',');
      const starDir = orbitPos(o, q0).negate().normalize();
      const starAng = 2 * (o.strad || 1) * SUN_R_KM / ((q0.auNow || q0.au) * KM_AU), kSun = starAng / SUN_FROM_EARTH;   // compared with our Sun seen from Earth
      const g = Math.min(kSun, 3);                        // glare: a far star is a small, intense point with a soft halo
      const st = glowSprite('255,255,255', Math.max(STAR_D * starAng / 0.36, 7), 1);
      const g1 = glowSprite(rgb, 200 * Math.max(Math.sqrt(g), 0.3), 0.75 * THREE.MathUtils.clamp(g, 0.35, 1)), g2 = glowSprite(rgb, 600 * Math.sqrt(g), 0.25 * Math.min(g, 1));
      [st, g1, g2].forEach(sp => sp.position.copy(starDir).multiplyScalar(STAR_D)); destStar.add(g2, g1, st);
      buildBody(o, q0, fw);                            // the planet itself, with its rings and moons: the one real-scale scene
    } else if (o.planets) {                            // at the star itself: the same scene, with the star as the body (no radius in the catalogue: drawn as the Sun's)
      const c = starColor(o.teff);
      buildBody(o, { star: true, name: SKY.byId.get(o.id).name, eqRKm: (o.strad || 1) * SUN_R_KM, col: [c.r, c.g, c.b], facts: SKY.placeFacts(o) }, fw);
    } else clearBody();
    if (o.planets) { dest.group = BODY.group; dest.D = KM_SCENE; dest.r = BODY.eqKm * k; dest.ext = BODY.fitKm * k; dest.off = 0; }
    destGroup.position.copy(fw).multiplyScalar(DEST_D); destGroup.scale.setScalar(1);
    if (o.planets) {}                                  // (a star system: its body scene is built above)
    else if (o.kind === 'blackhole') {
      const bh = new THREE.Group(); bh.position.copy(at(0, 0, 90)); destGroup.add(bh);
      const hole = new THREE.Mesh(new THREE.SphereGeometry(7, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
      bh.add(hole); dest.solids.push({ mesh: hole, r: 7 }); dest.r = 14; dest.ext = 34; dest.off = 90;
      const tU = { value: 0 };
      const disk = new THREE.Mesh(new THREE.RingGeometry(8.5, 34, 160, 1), new THREE.ShaderMaterial({ uniforms: { uT: tU, uFade: { value: 1 } },
        vertexShader: `varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uT, uFade; varying vec3 vP;
          void main() { float r = length(vP.xy), a = atan(vP.y, vP.x), x = (r - 8.5) / 25.5;
            float n = 0.5 + 0.5 * sin(a * 6.0 - uT * 1.4 + r * 0.9); n = mix(n, 0.5 + 0.5 * sin(a * 13.0 + uT * 2.1 - r * 1.7), 0.5);
            vec3 c = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.55, 0.15), smoothstep(0.0, 0.4, x)); c = mix(c, vec3(0.55, 0.1, 0.04), smoothstep(0.4, 1.0, x));
            float b = pow(1.0 - x, 1.5) * (0.55 + 0.45 * n) * (1.0 + 0.75 * sin(a)) * smoothstep(0.0, 0.05, x) * (1.0 - smoothstep(0.8, 1.0, x));
            gl_FragColor = vec4(c * b * 1.7 * uFade, 1.0); }`,
        side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const n = up.clone().multiplyScalar(Math.cos(14 * DEG)).addScaledVector(fw, -Math.sin(14 * DEG)).normalize();
      disk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); bh.add(disk);
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, (x, s) => { x.lineWidth = 7; x.strokeStyle = 'rgba(255,215,160,0.95)'; x.shadowColor = 'rgba(255,160,70,1)'; x.shadowBlur = 22; x.beginPath(); x.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2); x.stroke(); }),
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); ring.scale.set(31, 31, 1); bh.add(ring);
      bh.add(glowSprite('255,140,60', 160, 0.22));
      dest.anim.push(dt => tU.value += dt);
      if (o.look.jet) {                                 // a jet
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.6, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        jet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); jet.position.addScaledVector(n, 82); bh.add(jet);
      }
      if (o.look.companion) {                           // the bright star it pulls gas from
        const sAt = at(-30, 15, 10), s1 = glowSprite('200,220,255', 26, 1), s2 = glowSprite('120,160,255', 120, 0.35);
        s1.position.copy(sAt); s2.position.copy(sAt); bh.add(s2, s1);
        const Ns = 240, pp = new Float32Array(Ns * 3); for (let i = 0; i < Ns; i++) { const u = i / Ns; const v = sAt.clone().multiplyScalar(1 - u).addScaledVector(at(0, 0, 0), u).add(at(Math.sin(u * 9) * 6 * (1 - u), (R() - 0.5) * 2, 0)); pp.set([v.x, v.y, v.z], i * 3); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
        bh.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, color: 0x9fc0ff, map: pointTexture('255,255,255'), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })));
      }
      if (o.look.crowd) {                               // crowded stars around it
        const Ns = 400, pp = new Float32Array(Ns * 3); for (let i = 0; i < Ns; i++) { const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(30 + Math.pow(R(), 0.5) * 160); pp.set([v.x, v.y, v.z], i * 3); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
        bh.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 3, color: 0xfff0d8, map: pointTexture('255,255,255'), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
      }
    } else if (o.kind === 'galaxy') {
      const lmc = !!o.look.irregular;                  // (an irregular galaxy: a bar and loose clouds, no spiral arms)
      dest.r = 60; dest.ext = lmc ? 110 : 150; dest.off = lmc ? 380 : 430;
      const Ng = 9000, pp = new Float32Array(Ng * 3), cc = new Float32Array(Ng * 3);
      for (let i = 0; i < Ng; i++) {
        let x, y; const r0 = R();
        if (lmc) { const g = () => (R() + R() + R() + R() - 2) / 0.58; if (r0 < 0.35) { x = g() * 40; y = g() * 9 + x * 0.15; } else if (r0 < 0.42) { x = -55 + g() * 8; y = 35 + g() * 8; } else { x = g() * 75; y = g() * 58; } }
        else if (r0 < 0.45) { const rr = 150 * -Math.log(1 - R() * 0.95) / 3, a = R() * Math.PI * 2; x = Math.cos(a) * rr; y = Math.sin(a) * rr; }
        else { const arm = i % 2, rr = 8 + Math.pow(R(), 0.75) * 145, a = arm * Math.PI + Math.log(rr / 8) * 2.0 + (R() - 0.5) * 1.1; x = Math.cos(a) * rr + (R() - 0.5) * 12; y = Math.sin(a) * rr + (R() - 0.5) * 12; }
        const z = (R() - 0.5) * 6, rr2 = Math.hypot(x, y) / 150;
        pp.set([x, y, z], i * 3);
        const pink = lmc && r0 >= 0.35 && r0 < 0.42 ? true : R() < 0.05, core = Math.max(0, 1 - rr2 * 3);
        cc.set(pink ? [1, 0.45, 0.7] : [0.75 + 0.25 * core, 0.78 + 0.12 * core, 1 - 0.35 * core], i * 3);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pp, 3)); g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      const gal = new THREE.Points(g, new THREE.PointsMaterial({ size: 3, vertexColors: true, map: pointTexture('255,255,255'), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      const tilt = (o.look.tilt || 45) * DEG;            // how tilted we see it (catalogue; Andromeda about 77 deg, NASA)
      gal.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rt, up.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(fw, Math.sin(tilt)), up.clone().multiplyScalar(-Math.sin(tilt)).addScaledVector(fw, Math.cos(tilt))));
      const holder = new THREE.Group(); holder.position.copy(at(0, 0, lmc ? 380 : 430)); holder.add(gal); destGroup.add(holder);
      const coreG = glowSprite('255,230,190', lmc ? 120 : 170, 0.8); coreG.position.copy(holder.position); destGroup.add(coreG);
      dest.anim.push(dt => gal.rotateZ(dt * 0.01));
    } else {                                           // nebulae and the Pleiades
      dest.r = 40;
      const pal = o.pal || ['200,120,255'], ring = !!o.look.ring, cl = o.kind === 'cluster';
      dest.ext = ring ? 30 : cl ? 120 : 130; dest.off = ring ? 150 : cl ? 150 : 210;
      const nC = cl ? 22 : ring ? 70 : 60;
      for (let i = 0; i < nC; i++) {
        const hue = pal[ring ? (i % 3 === 0 ? 0 : 1) : i % pal.length].split(',').map(v => v / 255);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex[i % 3], color: new THREE.Color(hue[0], hue[1], hue[2]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: cl ? 0.12 : (o.look.dim || 0.2) + R() * 0.16 }));
        if (ring) { const a = R() * Math.PI * 2, rr = (i % 3 === 0 ? 8 : 22) + (R() - 0.5) * 5; sp.position.copy(at(Math.cos(a) * rr * 1.1, Math.sin(a) * rr * 0.9, 150 + (R() - 0.5) * 6)); }
        else sp.position.copy(at((R() - 0.5) * 260, (R() - 0.5) * 200, 90 + R() * 240));
        const s = (ring ? 16 : 70) + R() * (ring ? 16 : 100); sp.scale.set(s, s, 1); sp.material.rotation = R() * 6.28;
        sp.userData = { ph: R() * 6.28, base: sp.material.opacity };
        destGroup.add(sp); dest.anim.push((dt, t) => sp.material.opacity = sp.userData.base * (0.8 + 0.2 * Math.sin(t * 0.4 + sp.userData.ph)) * (dest.fadeK == null ? 1 : dest.fadeK));
      }
      const nS = cl ? 9 : ring ? 1 : 30;
      for (let i = 0; i < nS; i++) {
        const st = glowSprite(cl ? '170,200,255' : '255,245,230', cl ? 22 + R() * 14 : ring ? 6 : 3 + R() * 6, 1);
        st.position.copy(ring ? at(0, 0, 150) : cl ? at((R() - 0.5) * 120, (R() - 0.5) * 70, 40 + R() * 80) : at((R() - 0.5) * 240, (R() - 0.5) * 180, 90 + R() * 220));
        destGroup.add(st);
      }
      if (cl) for (let i = 0; i < 140; i++) { const st = glowSprite('200,220,255', 2 + R() * 3, 0.8); st.position.copy(at((R() - 0.5) * 260, (R() - 0.5) * 180, 30 + R() * 200)); destGroup.add(st); }
      if (o.look.pulsar) {                              // a pulsar at its heart
        const pu = glowSprite('190,215,255', 14, 1); pu.position.copy(at(0, 0, 160)); destGroup.add(pu);
        dest.anim.push((dt, t) => pu.material.opacity = (0.35 + 0.65 * (Math.sin(t * 40) > 0.6 ? 1 : 0.2)) * (dest.fadeK == null ? 1 : dest.fadeK));
      }
    }
  }

  // ---- arriving somewhere ----

  // the route to a far destination: glowing dots from your nose straight out toward it (same look as the flight routes)
  const DEEP_ROUTE_N = 60;
  const deepRoute = new THREE.Group(); deepRoute.visible = false; sysRig.add(deepRoute);
  const deepRouteDots = [];
  for (let i = 0; i < DEEP_ROUTE_N; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: routeTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false, opacity: 0 }));
    const u = (i + 1) / (DEEP_ROUTE_N + 1); sp.userData.u = u; sp.scale.setScalar(0.022 * (1 - 0.55 * u)); deepRoute.add(sp); deepRouteDots.push(sp);
  }
  let deepRouteFor = null, deepRouteT = 0;
  const drDown = new THREE.Vector3(), drDir = new THREE.Vector3();
  function updateDeepRoute() {
    const lockT0 = navLock && navLock.deep && inRange(navLock) && navLock.id !== deep.sys ? navLock : null;
    const tgt = deepJump && !deepJump.swapped ? deepJump.o : lockT0;
    if (!tgt) { deepRoute.visible = false; deepRouteFor = null; return; }
    if (deepRouteFor !== tgt) { deepRouteFor = tgt; deepRouteT = performance.now(); }
    if (deepJump) drDir.copy(deepJump.dir); else relDir(tgt, drDir);
    drDown.set(0, -1, 0).applyQuaternion(qInvTmp.copy(spaceRig.quaternion).invert());
    const now = performance.now(), reveal = Math.min(1, (now - deepRouteT) / 450), ph = now / 1000;
    const fade = deepJump ? Math.max(0, 1 - Math.max(0, deepJump.t - deepJump.turn) / 0.8) : 1;   // gone soon after the punch
    deepRoute.visible = true;
    deepRouteDots.forEach(sp => {
      const u = sp.userData.u, d = 3 + Math.pow(u, 2.2) * 900, w = Math.pow(1 - u, 2.2);
      sp.position.copy(drDir).multiplyScalar(d).addScaledVector(drDown, 3 * w);       // starts just below the view, where your nose is
      const pulse = 0.5 + 0.5 * Math.cos((u * 6 - ph * 1.6) * Math.PI);
      sp.material.opacity = (u <= reveal ? 1 : 0) * (0.45 + 0.55 * Math.pow(Math.max(0, pulse), 3)) * fade;
    });
  }
  // arriving: the destination first shows as a far point of light where you're heading, then grows as you slow down
  const deepBeacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: pointTexture('255,255,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  deepBeacon.scale.setScalar(0.05); deepBeacon.visible = false; sysRig.add(deepBeacon);
  // the target's sky picture, shown where it'll appear after the warp, cross-fading into the 3D version as you arrive
  const deepPicture = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  deepPicture.visible = false; sysRig.add(deepPicture);
  function setDestFade(k) {                            // fade the 3D destination's glowing parts in (0..1)
    if (!dest) return;
    if (!dest.fades) {
      dest.fades = [];
      destGroup.traverse(o => { const m = o.material; if (!m) return;
        if (m.uniforms && m.uniforms.uFade) dest.fades.push({ m, u: true });
        else if (m.transparent && !(m.uniforms && m.uniforms.sunDir)) dest.fades.push({ m, base: m.opacity }); });
    }
    dest.fadeK = k;
    dest.fades.forEach(f => { if (f.u) f.m.uniforms.uFade.value = k; else f.m.opacity = f.base * k; });
  }
  function arriveAt(o, dir, planetName) {
    deep.here.copy(o.pos); deep.dir = dir.toArray(); SKY.arrive(o.id, planetName);
    deep.nav = null;
    buildDest(o, dir, deep.planet); setupLocal(); sysWorld.visible = !!o.planets; refreshMarkers();   // (setupLocal needs the body scene: it measures from the ship)
  }
  function saveDeep() { deep.q = spaceRig.quaternion.toArray(); SKY.save(); }
  const destOcc = [0, 1, 2, 3].map(() => { const a = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), occMat), b = new THREE.Mesh(a.geometry, occMat); a.renderOrder = b.renderOrder = -10; occluders.add(a); nearOcc.add(b); a.visible = b.visible = false; return [a, b]; });

  function deepGo(o, planetName) {
    if (o.local) return deepGo(o.host, o.q ? o.q.name : null);
    if (deepJump || travel || !inRange(o)) return;
    const same = o.id === deep.sys, q = planetOf(o, planetName);
    planetName = q ? q.name : null;                    // a planet of that system, or null: its star (a jump to a star lands at the star)
    if (same && (!o.planets || planetName === deep.planet)) return;
    const lb = same ? LOCAL.find(x => x.q === q) : null;
    const dir = lb ? lb.dirLocal.clone() : relDir(o, new THREE.Vector3());     // another planet of this system: its real direction
    // far jumps hold in hyperspace for a while (2 s for the nearest landmarks, up to 4 s for M87): you're travelling far
    const dly = o.pos.distanceTo(deep.here), lg = Math.log10;
    const hold = same || dly <= WARP_LY ? 0 : THREE.MathUtils.clamp(2 + 2 * (lg(dly) - lg(400)) / (lg(5.5e7) - lg(400)), 2, 4);
    const pxPerRad = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(55 / 2));
    const mark = (lb || o).sprite;                     // how big it looked before the jump: its picture, or a star's dot
    const a0 = mark ? PIC_FILL * mark.scale.x / MARK_R : 0.6 * (3 + 6 * Math.max(0, 1 - dly / deep.limit)) / pxPerRad;
    deepJump = { o, planet: planetName || null, dir, t: 0, turn: same ? 0.5 : 1.0, warp: same ? 1.6 : 2.6, arrive: same ? 2.2 : 3.0, hold, a0 };
    factsT = -1; factsG.style.display = 'none';
  }
  function deepJumpUpdate(dt) {
    const j = deepJump; j.t += dt;
    skyVelX = skyVelY = 0;
    const H = j.hold || 0, T1 = j.turn, T2 = T1 + j.warp + H, T3 = T2 + j.arrive, tf = T1 + j.warp * 0.55, ta = tf + H;   // in hyperspace (dark veil, dense streaks) from tf to ta
    faceQuat(j.dir, qFace); spaceRig.quaternion.slerp(qFace, Math.min(1, dt * (j.t < T1 ? 4.5 : 8)));
    const charge = j.t < T1 ? Math.max(0, (j.t - (T1 - 0.45)) / 0.45) : 0, ch = charge * charge;
    let v = 0;
    if (j.t >= T1 && j.t < T2) { const u = (j.t - T1) / j.warp; v = u < 0.15 ? Math.pow(u / 0.15, 1.5) : 1; }   // (u > 1 while holding in hyperspace: still full warp)
    else if (j.t >= T2) v = Math.pow(1 - Math.min(1, (j.t - T2) / j.arrive), 2.2);
    navWarp = j.t < T1 ? 1 - 2.6 * ch : 1 + 70 * v; travelV = v;
    const since = j.t - T1, over = since >= 0 ? Math.max(0, 1 - since / 0.6) : 0;
    worldFov = 55 + 22 * Math.pow(v, 0.8) + 6 * Math.sin(Math.min(1, Math.max(0, since) / 0.6) * Math.PI) * over - 6 * ch;
    camMove.pitch = 0.035 * ch;
    if (since >= 0 && !j.shook) { j.shook = true; camMove.shake = 1; try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(35); } catch (e) {} }
    const fl = j.t < tf ? Math.pow(Math.max(0, 1 - (tf - j.t) / 0.35), 1.5)
             : j.t < ta ? 1                                                                              // holding in hyperspace: the veil stays, the streaks rush on
             : Math.pow(Math.max(0, 1 - (j.t - ta) / (H ? 0.6 : 0.35)), 1.5);
    warpVeil = fl; warpDeep = H && j.t >= tf - 0.35 && j.t < ta + 0.6 ? Math.min(1, (j.t - tf + 0.35) / 0.6, (ta + 0.6 - j.t) / 0.6) : 0;
    if (!j.swapped && j.t >= tf + H / 2) { j.swapped = true;
      const q = planetOf(j.o, j.planet);
      if (q) {                                          // you come out of the warp at the planet's parking spot, facing it (at a star: straight on, the way you came)
        const fr = bodyFrame(j.o, q);
        j.dir = parkDir(j.dir.clone().negate(), fr.starDir, fr.axis, true).negate(); faceQuat(j.dir, qFace); spaceRig.quaternion.copy(qFace);
      }
      arriveAt(j.o, j.dir, j.planet); }
    if (j.swapped) {                        // the destination rushes in from far away, then slows to a stop
      const ga = ta + (H ? 0.45 : 0.25);                                                        // start growing once the veil has mostly cleared
      const u = THREE.MathUtils.clamp((j.t - ga) / (T3 - ga), 0, 1), e = 1 - Math.pow(1 - u, 3);
      // it starts exactly as big on screen as it looked before you left, and only grows from there
      const ext = dest.ext || 10, off = dest.off || 0, G = dest.group, DEST_D = dest.D;
      const a1 = 2 * ext / (DEST_D + off), a0 = Math.min(j.a0 || a1, a1);
      const a = Math.exp(Math.log(a0) + (Math.log(a1) - Math.log(a0)) * e);                     // apparent size: smooth, steady growth
      G.position.copy(j.dir).multiplyScalar(DEST_D);
      G.scale.setScalar(Math.min(1, a * DEST_D / Math.max(1e-6, 2 * ext - a * off)));
      if (!dest.pts) { dest.pts = []; G.traverse(o => { if (o.isPoints) dest.pts.push({ m: o.material, s: o.material.size }); }); }
      dest.pts.forEach(p => p.m.size = p.s * G.scale.x);                       // star dots shrink with the rest while it's far
      if (!j.o.planets && j.o.sprite) {                                               // a landmark: its sky picture first, blending into the 3D view
        if (!j.picSet) { j.picSet = true; deepPicture.material.map = j.o.sprite.material.map; deepPicture.material.needsUpdate = true; }
        deepPicture.visible = true; deepPicture.position.copy(G.position).addScaledVector(j.dir, off * G.scale.x);
        deepPicture.scale.setScalar(a * (DEST_D + off * G.scale.x) / 0.6);
        deepPicture.material.opacity = 0.9 * (1 - THREE.MathUtils.smoothstep(e, 0.15, 0.7));
        setDestFade(THREE.MathUtils.smoothstep(e, 0.05, 0.55));
      }
      if (j.o.planets) {                                                                        // a star or planet: its dot carries on, then hands over to the planet
        if (!j.beaconSet) { j.beaconSet = true; deepBeacon.material.color.setHex(starColor(j.o.teff).getHex()); }
        deepBeacon.visible = true; deepBeacon.position.copy(G.position);
        deepBeacon.scale.setScalar(Math.max(j.a0, a) * DEST_D / 0.45);
        deepBeacon.material.opacity = 1 - THREE.MathUtils.smoothstep(e, 0.35, 0.85);
      }
    }
    if (j.t >= T3) {
      deepJump = null; navWarp = 1; worldFov = 55; travelV = 0; warpVeil = warpDeep = 0; dest.group.scale.setScalar(1); deepBeacon.visible = false; deepPicture.visible = false; setDestFade(1); if (dest && dest.pts) dest.pts.forEach(p => p.m.size = p.s);
      saveDeep(); factsFor = { deep: true, center: true, name: deep.planet ? deep.planet.toUpperCase() : j.o.name, facts: deepFacts(j.o, deep.planet) }; factsT = performance.now();
      try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(20); } catch (e) {}
    }
  }

  // ---- screen helpers, picking ----
  const dTmp = new THREE.Vector3(), dTmp2 = new THREE.Vector3(), camF = new THREE.Vector3();
  function deepScreenOf(o) {                           // -> [x, y, radiusPx, inFront, dist]
    if (o.center) { (dest ? dest.group : destGroup).getWorldPosition(dTmp); }
    else { relDir(o, dTmp).applyQuaternion(spaceRig.quaternion).multiplyScalar(500).add(camera.position); }
    camera.getWorldDirection(camF);
    const front = dTmp2.copy(dTmp).sub(camera.position).dot(camF) > 0, dist = dTmp2.length();
    dTmp.project(camera);
    const pxPerRad = (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const r = o.center && dest ? (dest.r / Math.max(dist, 1)) * pxPerRad : 0;
    return [(dTmp.x + 1) / 2 * innerWidth, (1 - dTmp.y) / 2 * innerHeight, r, front, dist];
  }
  const fwdLocal = new THREE.Vector3(), qInvTmp = new THREE.Quaternion();
  function deepVis(o) {                                // how visible a marker is right now (0..1)
    if (o.id === deep.sys) return 0;                   // the place you're in
    const c = THREE.MathUtils.smoothstep(relDir(o, dTmp2).dot(fwdLocal), CONE[0], CONE[1]);
    if (o.always || o.local) return 0.35 + 0.65 * c;
    return deepDist(o) > WARP_LY ? 0 : c;              // ordinary stars: named and reachable within warp range only
  }
  function deepPick(x, y) {
    let best = null, bestD = 34;
    ACTIVE.forEach(o => {
      if (deepVis(o) < (o.sprite ? 0.3 : 0.35)) return;
      const [sx, sy, , front] = deepScreenOf(o); if (!front) return;
      const d = Math.hypot(x - sx, y - sy); if (d < bestD) { best = o; bestD = d; }
    });
    return best ? { o: best, d: bestD } : null;
  }

  // ---- labels near the middle of the view ----
  const deepLabelG = document.createElementNS(SVGNS, 'g'); hudEl.append(deepLabelG);
  for (let i = 0; i < 6; i++) { const L = makeTag({ name: '', minor: true, sx: 1, sy: -1 }, deepLabelG); L.g.style.display = 'none'; DLABELS.push(L); }
  function deepLabels() {
    const cx = innerWidth / 2, cy = innerHeight / 2, R2 = Math.min(innerWidth, innerHeight) * 0.3, picks = [];
    const body = dest ? deepScreenOf({ center: true }) : null;      // no name tags over the close-up in front of you
    if (!deepJump) ACTIVE.forEach(o => {
      if (o.vis < 0.55 || o === navLock) return;
      const [x, y, , front] = deepScreenOf(o); if (!front) return;
      if (body && body[3] && Math.hypot(x - body[0], y - body[1]) < body[2] + 6) return;
      const d = Math.hypot(x - cx, y - cy); if (d < R2) picks.push({ o, x, y, d });
    });
    picks.sort((a, b) => a.d - b.d);
    const placed = [];
    DLABELS.forEach((L, i) => {
      const p = picks[i]; if (!p) { if (L.key != null) { L.g.style.display = 'none'; L.key = L.o = null; } return; }
      if (L.o !== p.o) { L.o = p.o; [L.sx, L.sy] = (p.o.q && p.o.q.side) || [1, -1];
        setTagText(L, p.o.name + '  ' + (p.o.distKm != null ? distText(p.o) : fmtLy(deepDist(p.o)))); reportSeen(p.o); }
      let b = tagBox(L, p.x, p.y, 4, 0);
      for (let n = 1; n < 6 && placed.some(r => Math.abs(r.y - b.y1) < 13 && b.l < r.r && r.l < b.r); n++) b = tagBox(L, p.x, p.y, 4, n * 13);   // a longer line steps past a tag already there
      placed.push({ y: b.y1, l: b.l, r: b.r });
      const key = p.o.id + '|' + p.x.toFixed(1) + '|' + p.y.toFixed(1) + '|' + b.y1.toFixed(1);
      if (L.key === key) return;                         // nothing moved: leave the page alone
      if (L.key == null) L.g.style.display = '';
      L.key = key; drawTag(L, p.x, p.y, 4, b, 4);
    });
  }

  // ---- every frame ----
  function deepUpdate(dt) {
    if (!SKY) return;
    if (deepJump) deepJumpUpdate(dt);
    fwdLocal.set(0, 0, -1).applyQuaternion(qInvTmp.copy(spaceRig.quaternion).invert());
    sysMat.uniforms.uFwd.value.copy(fwdLocal); sysMat.uniforms.uLimit.value = deep.limit; sysMat.uniforms.uPx.value = renderer.getPixelRatio();
    const t = performance.now() / 1000;
    sizeMarkers();
    ACTIVE.forEach(o => { o.vis = deepVis(o); });       // once per frame, for the pictures and the name tags
    SPRITED.forEach(o => { o.sprite.material.opacity = o.vis * 0.9 * (o.faint || 1); });
    waves.forEach(w => w.material.opacity = w.userData.base * (0.6 + 0.4 * Math.sin(t * w.userData.sp + w.userData.ph)));
    if (dest) {
      dest.anim.forEach(f => f(dt, t));
      dest.lights.forEach(L => { L.u.value.copy(L.local).applyQuaternion(spaceRig.quaternion); });
    }
    destOcc.forEach(([a, b], i) => {
      const s = dest && dest.solids[i];
      a.visible = b.visible = !!s; if (!s) return;
      const rs = s.r * destGroup.scale.x; s.mesh.getWorldPosition(a.position); a.scale.setScalar(rs * 0.985);
      occDir.copy(a.position).sub(camera.position); const dist = occDir.length();
      b.visible = dist > rs * 1.02; b.position.copy(camera.position).addScaledVector(occDir, 0.5 / dist); b.scale.setScalar(rs * 0.985 * 0.5 / dist);
    });
    if (!BODY.q) sysNear = 0.5;                         // (no body scene: a landmark)
    updateDeepRoute();
    deepLabels();
  }
  window.__deepDebug = () => ({ scale: dest ? dest.group.scale.x : null, jumping: !!deepJump, veil: +warpVeil.toFixed(3), hyper: +warpDeep.toFixed(3), at: deep.at, sys: deep.sys, planet: deep.planet, local: LOCAL.map(o => o.id), active: ACTIVE.length, all: ALL_DEEP.length, here: deep.here.toArray().map(v => +v.toFixed(2)), limit: deep.limit, jumping: !!deepJump,
    systems: SYSTEMS.length, landmarks: LANDMARKS.length, satLonDeg: +(satLon / DEG).toFixed(2),
    shown: SYSTEMS.filter(o => deepDist(o) <= deep.limit).length });
  window.__deepScr = id => { const o = (PLACE.get(id) || LOCAL.find(x => x.id === id)); return o ? deepScreenOf(o).map(v => typeof v === 'number' ? +v.toFixed(1) : v) : null; };
  window.__eqEcl = (ra, de) => { const d = eqDir(ra, de); return [+(Math.atan2(d.dot(EQY), d.dot(EQX)) / DEG).toFixed(2), +(Math.asin(d.dot(N)) / DEG).toFixed(2)]; };
  window.__galLB = id => { const d = relDir(ALL_DEEP.find(x => x.id === id), new THREE.Vector3()); return [+(Math.atan2(d.dot(GY), d.dot(GC)) / DEG).toFixed(1), +(Math.asin(d.dot(GP)) / DEG).toFixed(1)]; };
  // the star map's JUMP lands here: the normal warp, to a star (or one of its planets)
  window.SpaceJump = (id, planetName) => {
    const o = (PLACE.get(id) || LOCAL.find(x => x.id === id)); if (o) { cancelLock(); deepGo(o, planetName); }
  };

  window.__localDebug = () => ({ shipKm: localShip.length(), bodies: LOCAL.map(o => ({ id: o.id, distKm: o.distKm, centreKm: o.q ? orbitPos(o.host, o.q).length() : 0, ...(o.q ? localLook(o, (innerHeight / 2) / Math.tan(THREE.MathUtils.degToRad(55 / 2))) : {}) })) });
  window.__deepGo = id => { const o = (PLACE.get(id) || LOCAL.find(x => x.id === id)); if (o) deepGo(o); return !!o; };
  window.__deepFace = id => { const o = (PLACE.get(id) || LOCAL.find(x => x.id === id)); if (o) { faceQuat(relDir(o, new THREE.Vector3()), qFace); spaceRig.quaternion.copy(qFace); syncSysRig(); } return !!o; };

  // ---- back where you left off ----
  {
    const o = PLACE.get(deep.sys) || SOL, was = { q: deep.q, nav: deep.nav, hadDir: !!deep.dir };
    arriveAt(o, deep.dir ? new THREE.Vector3().fromArray(deep.dir) : P.clone(), deep.planet);
    if (!was.hadDir) deep.dir = null;                  // (a first start is not an arrival)
    if (was.q) spaceRig.quaternion.fromArray(was.q); else startInEmptySky();
    syncSysRig();
    const n = was.nav && was.nav.offset && NAV.find(x => x.name === was.nav.target);
    if (n) {                                           // you'd flown to a body here: same spot relative to it, facing it
      nav.target = n.name; navOffset.fromArray(was.nav.offset); deep.nav = was.nav;
      shipPos.copy(navLocal(n, new THREE.Vector3())).add(navOffset);
      sysWorld.position.copy(shipPos).negate(); syncSysRig();
      faceQuat(navLocal(n, new THREE.Vector3()).sub(shipPos), qFace); spaceRig.quaternion.copy(qFace);
      syncSysRig();
    }
    deep.q = was.q || null;
  }

  window.__face = what => { const d = what === 'star' ? BODY.starDir.clone() : navLocal(NAV[0], new THREE.Vector3()).sub(shipPos); faceQuat(d, qFace); spaceRig.quaternion.copy(qFace); syncSysRig(); };
  window.__navGo = name => { const n = NAV.find(x => x.name === name); if (n) engage(n); return !!n; };
  window.__navList = () => NAV.map(n => ({ name: n.name, facts: n.facts, side: [n.t.sx, n.t.sy] }));
  window.__navDebug = () => ({ target: nav.target, lock: navLock && navLock.name, travel: !!travel, ship: shipPos.toArray().map(v => +v.toFixed(2)) });

  // =========================================================
  //  SEARCH: type in the console; matching apps appear as cubes (max 8, 4 x 2)
  // =========================================================
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const searchStatus = document.getElementById('searchStatus');
  const consoleEl = document.getElementById('console');
  const MAX_RESULTS = 8, RESULT_SIZE = 0.68;
  let searchActive = false, resultItems = [], searchFocused = false, resultsCount = 0;
  const resultCache = new Map();                 // app object -> its result cube (built once)

  function allApps() {
    const list = [];
    GROUPS.forEach(g => g.apps.forEach(a => list.push(a)));
    UNSORTED.forEach(a => list.push(a));
    return list;
  }
  function findApps(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const rank = a => {
      const n = a.name.toLowerCase();
      if (n.startsWith(q)) return 0;                               // "te" -> "Teams" first
      if (n.split(/[\s\-_.]+/).some(w => w.startsWith(q))) return 1;   // start of a later word
      if (n.includes(q)) return 2;                                 // anywhere in the name
      return -1;
    };
    return allApps().map(a => ({ a, r: rank(a) })).filter(x => x.r >= 0)
      .sort((x, y) => x.r - y.r || x.a.name.localeCompare(y.a.name))
      .slice(0, MAX_RESULTS).map(x => x.a);
  }

  // 4 columns x 2 rows, placed just under the clock so they stay visible above the keyboard
  // 4 columns x 2 rows, sitting just above the console (and above the keyboard when it's open)
  function resultSpot(i, out) {
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfH = tanH * camera.position.z, halfW = halfH * camera.aspect;
    const H = innerHeight, toWorldY = py => halfH * (1 - 2 * py / H), pxPerUnit = H / (2 * halfH);
    const consoleTop = H - 150 - INSETS.bottom - kbdLift();          // top of the console on screen
    const cols = 4, gx = Math.min(1.25, (2 * halfW - 0.3) / cols), gy = 1.3;
    const bottomRowPy = consoleTop - 0.95 * pxPerUnit;               // leaves room for the names
    const col = i % cols, row = Math.floor(i / cols), rows = Math.min(2, Math.ceil(resultsCount / cols));
    const py = bottomRowPy - (rows - 1 - row) * gy * pxPerUnit;
    return out.set((col - (cols - 1) / 2) * gx, toWorldY(py), 0);
  }

  function resultItemFor(app) {
    if (!resultCache.has(app)) {
      const it = makeItem('app', app, appTexture(app), 0.95, 0.45);
      it.sizeMul = RESULT_SIZE; it.targetBase = new THREE.Vector3();
      resultCache.set(app, it);
    }
    return resultCache.get(app);
  }

  function runSearch() {
    const q = searchInput.value;
    searchClear.classList.toggle('show', q.length > 0);
    const found = findApps(q);
    const wasActive = searchActive;
    searchActive = q.trim().length > 0;

    if (searchActive && !wasActive) {
      // entering search: tuck away whatever was showing
      if (openGroupIdx >= 0) { appItemsFor(openGroupIdx).forEach(it => it.visTarget = 0); openGroupIdx = -1;
        groupTitle.classList.remove('show'); groupBackBtn.classList.remove('show'); settingsBtn.classList.remove('hidden'); }
      groupItems.forEach(it => it.visTarget = 0);
      recentItems.forEach(it => it.visTarget = 0);
      selected = null;
    }
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfH0 = tanH * camera.position.z;
    const emerge = new THREE.Vector3(0, halfH0 * (1 - 2 * (innerHeight - 75 - INSETS.bottom - kbdLift()) / innerHeight), 0.5);   // cubes rise out of the search bar
    const next = found.map(resultItemFor);
    resultsCount = next.length;
    resultItems.forEach(it => { if (!next.includes(it)) { it.visTarget = 0; if (selected === it) selected = null; } });
    next.forEach((it, i) => {
      resultSpot(i, it.targetBase);
      if (it.vis < 0.05) { it.base.copy(it.targetBase); it.origin = emerge.clone(); it.velY = 6 + Math.random() * 3; }
      it.visTarget = 1;
    });
    resultItems = next;
    if (!searchActive) {                            // cleared: the home view comes back
      if (homeView === 'groups') groupItems.forEach(it => it.visTarget = 1);
      else recentItems.forEach(it => it.visTarget = 1);
    }
    updateEmptyHint();

    searchStatus.textContent = !searchActive ? '' : found.length ? found.length + (found.length === 1 ? ' MATCH' : ' MATCHES') : 'NO MATCH';
    searchStatus.classList.toggle('show', searchActive);
  }

  searchInput.addEventListener('input', runSearch);
  searchInput.addEventListener('focus', () => { searchFocused = true; if (!appsVisible) { appsVisible = true; } });
  searchInput.addEventListener('blur', () => { searchFocused = false; setTimeout(fitViewport, 300); });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && resultItems[0]) { searchInput.blur(); selected = resultItems[0]; openApp(resultItems[0]); }
    if (e.key === 'Escape') { searchInput.value = ''; runSearch(); searchInput.blur(); }
  });
  searchClear.addEventListener('click', () => { searchInput.value = ''; runSearch(); showKbd(true); });

  // Keep the console sitting right above the on-screen keyboard
  function placeConsole() {
    const vv = window.visualViewport;
    const covered = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
    const lift = Math.max(covered, kbdLift());
    consoleEl.style.transform = lift ? `translateY(${-lift}px)` : '';
  }

  // ---- Custom keyboard ----
  const kbd = document.getElementById('kbd');
  // build letter keys
  kbd.querySelectorAll('.row').forEach(row => {
    row.innerHTML = row.innerHTML.replace(/\$\{'([^']*)'\}/, (m, keys) =>
      [...keys].map(k => `<button data-k="${k}"${/[0-9]/.test(k) ? ' class="num"' : ''}>${k.toUpperCase()}</button>`).join(''));
  });
  let kbdOpen = false;
  function kbdLift() { return kbdOpen ? kbd.offsetHeight : 0; }
  function showKbd(on) {
    if (kbdOpen === on) return;
    kbdOpen = on; kbd.classList.toggle('show', on);
    placeConsole();
    resultItems.forEach((it, i) => resultSpot(i, it.targetBase));   // results glide up/down with it
  }
  function typeKey(k) {
    if (k === 'back') searchInput.value = searchInput.value.slice(0, -1);
    else if (k === 'hide') { showKbd(false); return; }
    else if (k === 'go') { showKbd(false); if (resultItems[0]) { selected = resultItems[0]; openApp(resultItems[0]); } return; }
    else if (searchInput.value.length < 24) searchInput.value += k;
    runSearch();
  }
  let repeatTimer = null;
  kbd.addEventListener('pointerdown', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.preventDefault();                                   // keep focus/caret in the search bar
    b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 110);
    typeKey(b.dataset.k);
    if (b.dataset.k === 'back') {                          // hold backspace to keep deleting
      clearTimeout(repeatTimer);
      repeatTimer = setTimeout(function rep() { typeKey('back'); repeatTimer = setTimeout(rep, 70); }, 380);
    }
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => kbd.addEventListener(ev, () => clearTimeout(repeatTimer)));
  searchInput.addEventListener('pointerdown', () => showKbd(true));
  searchInput.addEventListener('focus', () => showKbd(true));
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', placeConsole);
    visualViewport.addEventListener('scroll', placeConsole);
  }

  // ---- Opening an app (stand-in screen; the real launcher starts the actual app) ----
  const appScreen = document.getElementById('appScreen');
  let opening = null, openP = 0, openDir = 0;
  function openApp(c) {
    if (opening) return;
    noteAppUsed(c.data);
    opening = c; openDir = 1; openP = 0; selected = c;
    c.velY = 14;
    appScreen.style.background = 'linear-gradient(160deg,' + c.data.c1 + ',' + c.data.c2 + ')';
    document.getElementById('appName').textContent = c.data.name;
  }
  document.getElementById('backBtn').addEventListener('click', () => {
    if (eggLaunched) { eggLaunched = false; appScreen.classList.remove('show'); return; }
    if (!opening) return;
    openDir = -1; appScreen.classList.remove('show');
  });

  // =========================================================
  //  FAVOURITES IN THE EGGS: each egg holds one app, floating as a cube.
  //  Tap = launch. Long-press = choose which app lives there.
  // =========================================================
  const eggs = [...document.querySelectorAll('#console .egg')];
  const iconURLCache = new Map();
  function appIconURL(app) {
    if (app.icon) return app.icon;
    if (!iconURLCache.has(app.name)) iconURLCache.set(app.name, miniTexture(app).image.toDataURL());
    return iconURLCache.get(app.name);
  }
  const appByName = key => allApps().find(a => keyOf(a) === key);
  function renderEggs() {
    eggs.forEach((egg, i) => {
      const app = appByName(FAVS[i]);
      egg.querySelectorAll('.cube i').forEach(f => {
        f.classList.toggle('icon', !!app);
        f.style.backgroundImage = app ? `url(${appIconURL(app)})` : '';
      });
      document.getElementById('eggName' + i).textContent = app ? app.name.toUpperCase() : 'EMPTY';
      egg.setAttribute('aria-label', app ? 'Open ' + app.name : 'Empty favourite');
    });
  }

  // launching straight from an egg: flash the egg, then show the app
  let eggLaunched = false;
  // Egg tap: the app's cube flies straight out of the egg into the screen (opens); its slot is waiting when you come back
  const eggPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), eggHit = new THREE.Vector3();
  function launchFromEgg(app, eggEl) {
    if (opening) return;
    closeEverything();
    if (homeView !== 'recent') setHomeView('recent');
    const k = keyOf(app), had = RECENTS.some(r => r.key === k);
    noteAppUsed(app);
    const c = recentItemFor(app);
    if (!had && eggEl && c.targetBase) {                 // new cube: start at the egg, glide up to its slot
      const r = eggEl.getBoundingClientRect();
      ndc.set(((r.left + r.width / 2) / innerWidth) * 2 - 1, -((r.top + r.height / 2) / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      eggPlane.constant = -c.targetBase.z;
      if (raycaster.ray.intersectPlane(eggPlane, eggHit)) c.base.copy(eggHit);
      c.vis = 0.5;
    }
    c.visTarget = 1;
    openApp(c);
  }

  const picker = document.getElementById('favPicker');
  let pickingFor = 0;
  function openPicker(i) {
    pickingFor = i; showKbd(false);
    document.getElementById('favTitle').textContent = (i === 0 ? 'LEFT' : 'RIGHT') + ' EGG · CHOOSE AN APP';
    const list = document.getElementById('favList'); list.innerHTML = '';
    allApps().slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(app => {
      const chip = document.createElement('button'); chip.className = 'chip' + (FAVS[i] === keyOf(app) ? ' current' : '');
      const sw = document.createElement('i'); sw.style.background = app.icon ? `center/cover url(${app.icon})` : 'linear-gradient(135deg,' + app.c1 + ',' + app.c2 + ')';
      chip.append(sw, document.createTextNode(app.name));
      chip.addEventListener('click', () => { FAVS[i] = keyOf(app); saveGroups(); renderEggs(); picker.classList.remove('show'); });
      list.append(chip);
    });
    picker.classList.add('show');
  }
  document.getElementById('favCancel').addEventListener('click', () => picker.classList.remove('show'));
  picker.addEventListener('click', e => { if (e.target === picker) picker.classList.remove('show'); });

  eggs.forEach((egg, i) => {
    let timer = null, longPressed = false, downAt = 0;
    egg.addEventListener('pointerdown', e => {
      e.preventDefault(); longPressed = false; downAt = performance.now();
      egg.classList.add('press');
      timer = setTimeout(() => { longPressed = true; egg.classList.remove('press'); buzz(15); openPicker(i); }, 550);
    });
    const end = launch => {
      clearTimeout(timer);
      if (!egg.classList.contains('press')) return;
      if (launch && !longPressed && performance.now() - downAt >= 550) {   // held long enough even if the timer was late
        egg.classList.remove('press'); openPicker(i); return;
      }
      if (launch && !longPressed) {
        const app = appByName(FAVS[i]);
        setTimeout(() => egg.classList.remove('press'), 250);
        if (app) launchFromEgg(app, egg); else openPicker(i);
      } else egg.classList.remove('press');
    };
    egg.addEventListener('pointerup', () => end(true));
    egg.addEventListener('pointerleave', () => end(false));
    egg.addEventListener('pointercancel', () => end(false));
    egg.addEventListener('contextmenu', e => e.preventDefault());
  });
  renderEggs();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(renderEggs);

  // =========================================================
  //  INPUT
  // =========================================================
  const el = renderer.domElement;
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(px, py) {
    if (!appsVisible) return null;
    const items = currentItems().filter(it => it.vis > 0.6 && (it.scrollFade === undefined || it.scrollFade > 0.5));
    ndc.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(items.map(c => c.mesh), false);
    return hits.length ? items.find(c => c.mesh === hits[0].object) : null;
  }

  const qx = new THREE.Quaternion(), qy = new THREE.Quaternion();
  const AX = new THREE.Vector3(1,0,0), AY = new THREE.Vector3(0,1,0);
  function spin(mesh, dx, dy) {
    qy.setFromAxisAngle(AY, dx); qx.setFromAxisAngle(AX, dy);
    mesh.quaternion.premultiply(qy).premultiply(qx);
  }

  // (spin values come from CFG at the top of the script)
  const WINDOW_MS = 100, HOLD_MS = 120, TAP_MOVE = 10, TAP_MS = 280;

  let selected = null, active = null;
  let lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, samples = [];
  let skyVelY = 0.015, skyVelX = 0;

  el.addEventListener('pointerdown', e => {
    if (opening) return;
    el.setPointerCapture(e.pointerId);
    lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now();
    samples = [{ x: e.clientX, y: e.clientY, t: downT }];
    const hit = pick(e.clientX, e.clientY);
    active = hit || 'sky';
    if (hit) { hit.velX = hit.velY = 0; }
    // hold an APP cube still for a moment to pick it up and drag it (e.g. into an egg)
    clearTimeout(liftTimer);
    if (hit && hit.kind === 'app') liftTimer = setTimeout(() => {
      if (active === hit && Math.hypot(lastX - downX, lastY - downY) < TAP_MOVE) startDrag(hit, lastX, lastY);
    }, LIFT_MS);
  });

  el.addEventListener('pointermove', e => {
    if (dragging) { moveDrag(e.clientX, e.clientY); return; }
    if (!active) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (active === 'sky') {
      const list = openGroupIdx >= 0 && !searchActive ? appItemsFor(openGroupIdx) : null;
      if (list && list.scrollMax > 0) {             // big group: up/down scrolls the apps, sideways turns space
        groupScroll = Math.max(-0.4, Math.min(list.scrollMax + 0.4, groupScroll - dy * worldPerPx()));
        spaceRig.rotation.y += dx * CFG.skyDragSensitivity;
      } else { spaceRig.rotation.y += dx * CFG.skyDragSensitivity; spaceRig.rotation.x += dy * CFG.skyDragSensitivity; }
    }
    else spin(active.mesh, dx * CFG.cubeSpinSensitivity, dy * CFG.cubeSpinSensitivity);
    lastX = e.clientX; lastY = e.clientY;
    const now = performance.now();
    samples.push({ x: e.clientX, y: e.clientY, t: now });
    while (samples.length > 2 && now - samples[0].t > WINDOW_MS) samples.shift();
  });

  function worldPerPx() { return 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / innerHeight; }
  function endPointer(e) {
    clearTimeout(liftTimer);
    if (dragging) { endDrag(); active = null; return; }
    if (!active) return;
    const now = performance.now();
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const isTap = moved < TAP_MOVE && now - downT < TAP_MS;

    if (active !== 'sky' && isTap) {
      // 1st tap selects; tapping the selected cube again opens it
      const c = active;
      if (selected === c) {
        if (c.kind === 'group') enterGroup(groupItems.indexOf(c));
        else openApp(c);
      } else selected = c;
      active = null; return;
    }
    if (active === 'sky' && isTap) {
      const kbdUp = document.getElementById('kbd').classList.contains('show');
      if (!kbdUp && !selected && navTap(e.clientX, e.clientY)) { active = null; return; }   // planets: lock on / go
      selected = null; active = null; showKbd(false); return;                              // tap on space closes the keyboard
    }

    const last = samples[samples.length - 1], first = samples[0];
    let vx = 0, vy = 0;
    if (last && samples.length >= 2 && now - last.t <= HOLD_MS) {
      const dt = Math.max((last.t - first.t) / 1000, 0.008);
      vx = (last.x - first.x) / dt; vy = (last.y - first.y) / dt;
    }
    if (active === 'sky') {
      const list = openGroupIdx >= 0 && !searchActive ? appItemsFor(openGroupIdx) : null;
      if (list && list.scrollMax > 0) { groupScrollVel = -vy * worldPerPx(); skyVelY = vx * CFG.skyDragSensitivity; }
      else { skyVelY = vx * CFG.skyDragSensitivity; skyVelX = vy * CFG.skyDragSensitivity; }
    }
    else if (recentItems.includes(active) && vy < -900 && Math.abs(vy) > Math.abs(vx) * 1.4) {
      dismissRecent(active);                          // flicked up: close it, like swiping away in Recents
    }
    else { active.velX = vx * CFG.cubeSpinSensitivity; active.velY = vy * CFG.cubeSpinSensitivity; selected = active; }
    active = null;
  }
  // ---- drag & drop to favourite ----
  const LIFT_MS = 380;
  let liftTimer = null, dragging = null;
  const dragGhost = document.getElementById('dragGhost');
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.6);   // cube floats a little in front of the grid
  const dragHit = new THREE.Vector3();
  function eggUnder(x, y) {
    return eggs.findIndex(egg => { const r = egg.getBoundingClientRect();
      return x > r.left - 14 && x < r.right + 14 && y > r.top - 14 && y < r.bottom + 14; });
  }
  function startDrag(c, x, y) {
    dragging = c; if (selected === c) selected = null;   // no selection pop while carrying
    buzz(12);
    eggs.forEach(egg => egg.classList.add('target'));
    dragGhost.style.backgroundImage = `url(${appIconURL(c.data)})`;
    moveDrag(x, y);
  }
  function moveDrag(x, y) {
    const c = dragging;
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(dragPlane, dragHit)) { c.dragPos = c.dragPos || new THREE.Vector3(); c.dragPos.copy(dragHit); }
    c.dragBlend = c.dragBlend || 0;                       // eases up to 1 in updateItem: the cube glides to your finger
    // over the console the cube would hide behind the chrome, so show a floating icon there
    const overConsole = y > consoleEl.getBoundingClientRect().top + 10;
    dragGhost.style.left = x + 'px'; dragGhost.style.top = y + 'px';
    dragGhost.classList.toggle('show', overConsole);
    const over = eggUnder(x, y);
    eggs.forEach((egg, i) => egg.classList.toggle('over', i === over));
    c.dragOverEgg = over;
  }
  function endDrag() {
    const c = dragging; dragging = null;
    eggs.forEach(egg => egg.classList.remove('target', 'over'));
    if (c.dragOverEgg >= 0) {
      const i = c.dragOverEgg, egg = eggs[i], swap = egg.querySelector('.swap');
      // 1) the carried icon flies into the egg's centre and shrinks into it
      const r = egg.getBoundingClientRect();
      dragGhost.classList.add('show', 'fly');
      requestAnimationFrame(() => {
        dragGhost.style.left = (r.left + r.width / 2) + 'px'; dragGhost.style.top = (r.top + r.height / 2) + 'px';
        dragGhost.style.transform = 'scale(.35)'; dragGhost.style.opacity = '0';
      });
      // 2) meanwhile the old favourite shrinks away...
      swap.classList.remove('in'); swap.classList.add('out');
      setTimeout(() => {
        // 3) ...and the new one takes its place, popping in and settling
        FAVS[i] = keyOf(c.data); saveGroups(); renderEggs();
        swap.classList.remove('out'); void swap.offsetWidth; swap.classList.add('in');
        egg.classList.add('press'); setTimeout(() => egg.classList.remove('press'), 300);
        buzz([10, 40, 18]);
      }, 280);
      setTimeout(() => { dragGhost.classList.remove('show', 'fly'); dragGhost.style.transform = ''; dragGhost.style.opacity = ''; }, 340);
      // 4) the cube you carried reappears gradually back in its own spot
      c.dragBlend = 0; c.regrow = 0;
    } else {
      dragGhost.classList.remove('show');
      c.dragBlend = Math.min(c.dragBlend, 0.999);   // dropped elsewhere: it glides back home
    }
    c.dragOverEgg = -1;
  }

  el.addEventListener('pointerup', endPointer);
  el.addEventListener('pointercancel', endPointer);

  let appsVisible = true, appFade = 1;
  const viewBtn = document.getElementById('hideBtn');
  viewBtn.addEventListener('click', () => setHomeView(homeView === 'recent' ? 'groups' : 'recent'));
  document.getElementById('usageAsk').addEventListener('click', () => { try { window.Launcher.openUsageAccess(); } catch (e) {} });

  // =========================================================
  //  LOOP
  // =========================================================
  const clock = new THREE.Clock();
  let prev = performance.now();
  const tmp = new THREE.Vector3();
  const smooth = p => p * p * (3 - 2 * p);

  function updateItem(c, t, dt, f) {
    // visibility transition (0 hidden, 1 shown) for entering/leaving a group
    c.vis += (c.visTarget - c.vis) * Math.min(CFG.groupOpenSpeed * dt, 1);
    if (Math.abs(c.visTarget - c.vis) < 0.002) c.vis = c.visTarget;
    c.holder.visible = c.vis > 0.01 && appFade > 0.01;
    if (!c.holder.visible) return;
    const v = smooth(c.vis);

    if (active !== c) {
      spin(c.mesh, c.velX * dt, c.velY * dt);
      c.velX *= f; c.velY *= f;
      if (Math.abs(c.velY) < CFG.cubeIdleSpin) c.velY += (CFG.cubeIdleSpin - c.velY) * Math.min(1.2 * dt, 1);
    }
    c.minis.forEach(m => { m.rotation.x += m.userData.spin.x * dt; m.rotation.y += m.userData.spin.y * dt; });

    const isSel = selected === c;
    // selection runs on a 0..1 timeline with ease-in-out, so growing, moving forward
    // and the glow all start gently, speed up, then settle (no pop)
    c.selP = Math.max(0, Math.min(1, c.selP + (isSel ? 1 : -1) * dt / CFG.selectSeconds));
    let e;
    if (isSel) {
      // pressed: react straight away (fast start), overshoot a touch, settle...
      const p = c.selP - 1, k = 1.9;
      e = 1 + (k + 1) * p * p * p + k * p * p;             // ease-out-back
    } else {
      e = c.selP * c.selP * (3 - 2 * c.selP);             // let go: smooth ease-in-out back down
    }
    // ...then keep pulsing gently while it stays selected
    const pulse = isSel && c.selP >= 1 ? Math.sin((t - (c.pulseT0 || t)) * 4.2) * 0.025 : 0;
    if (isSel && c.selP < 1) c.pulseT0 = t + 0.0;           // pulse starts right after the settle
    c.scale = 1 + (CFG.selectedScale - 1) * e + pulse;
    if (c.flyOff) {                                  // flicked away: shoot up off the screen
      c.base.y += dt * 16;
      if (c.vis < 0.03) { c.flyOff = false; if (c.targetBase) c.base.copy(c.targetBase); }
    } else if (c.targetBase && opening !== c) c.base.lerp(c.targetBase, Math.min(10 * dt, 1));   // glide when the list re-orders (not while it's flying into the screen)
    let s = c.scale * (0.6 + 0.4 * appFade) * (c.sizeMul || 1);

    // position: home cubes recede when hidden; app cubes emerge from their group cube
    tmp.set(c.base.x, c.base.y + Math.sin(t * CFG.cubeBobSpeed + c.phase) * CFG.cubeBobHeight - (1 - appFade) * 0.6, c.base.z + 0.5 * e);
    if (c.kind === 'app' && !c.origin && !c.inGroup && recentCache.has(keyOf(c.data))) s *= 0.3 + 0.7 * v;   // recent cubes pop in/out
    if (c.kind === 'app' && c.origin) {
      tmp.lerpVectors(c.origin, tmp, v);
      s *= 0.25 + 0.75 * v;
    } else if (c.kind === 'group') {
      const isOpened = openGroupIdx >= 0 && groupItems[openGroupIdx] === c;
      if (isOpened) s *= v * v;                 // opened group shrinks away where it stands
      else tmp.z -= (1 - v) * 3;                 // the other groups fall back
    }

    // app opening animation
    let others = 1;
    if (opening) {
      if (opening === c) {
        tmp.lerp(new THREE.Vector3(0, 0, camera.position.z - 1.4), smooth(openP));
        s *= 1 + smooth(openP) * 1.6;
      } else others = 1 - smooth(openP);
    }
    // scrolling inside a big group: shift the list, fade cubes leaving the visible band
    c.scrollFade = 1;
    if (c.inGroup) {
      tmp.y += groupScroll;
      const band = scrollBand();
      const over = Math.max(0, tmp.y - band.top, band.bottom - tmp.y);
      c.scrollFade = Math.max(0, 1 - over / 0.6);
    }
    // drag & drop: follow the finger, then glide home with ease-in-out
    if (c.dragPos && (c.dragBlend > 0 || dragging === c)) {
      c.dragBlend = dragging === c ? Math.min(1, c.dragBlend + dt / 0.18)    // lift: glide to the finger
                                   : Math.max(0, c.dragBlend - dt / 0.35);   // let go: glide home
      const b = c.dragBlend * c.dragBlend * (3 - 2 * c.dragBlend);
      tmp.lerp(c.dragPos, b);
      s *= 1 - 0.25 * b;            // a bit smaller while carried
    }
    if (arrivalT < 1) {                               // arrival: cubes rise and pop into place one after another
      const local = Math.max(0, Math.min(1, (arrivalT - 0.3 - (c.arrIdx || 0) * 0.06) / 0.4));
      s *= Math.max(0, easeOutBack(local));
      tmp.y -= (1 - easeOutCubic(local)) * 1.2;
    }
    if (c.regrow !== undefined && c.regrow < 1) {   // after a drop into an egg: grow back from nothing
      c.regrow = Math.min(1, c.regrow + dt / 0.7);
      const g = c.regrow * c.regrow * (3 - 2 * c.regrow);
      s *= g;
    }
    c.holder.position.copy(tmp);
    c.holder.scale.set(s, s, s);

    const a = appFade * v * others * (c.scrollFade === undefined ? 1 : c.scrollFade);
    c.mesh.material.opacity = Math.min(1, c.frontOp * CFG.cubeGlassOpacity) * a;
    c.back.material.opacity = Math.min(1, c.backOp * CFG.cubeGlassOpacity) * a;
    c.minis.forEach(m => m.material.opacity = a);
    c.label.material.opacity = a * (opening ? 1 - smooth(openP) : 1);
    const ge = Math.min(1, Math.max(0, e));
    c.halo.material.opacity = (0.18 + ge * (0.67 + Math.sin(t * 4.2) * 0.15)) * a;   // glow pulses in step with the cube
  }

  let oneFrame = false, coverPending = 0;
  function requestCoverHide() { coverPending = 2; }   // wait 2 drawn frames so the frame is really on screen
  function drawOneFrame() { oneFrame = true; try { tick(); } finally { oneFrame = false; } }
  function tick() {
    const t = clock.getElapsedTime();
    if (arrivalT < 1) {
      if (!arrivalHeld) arrivalT = Math.min(1, arrivalT + Math.min((performance.now() - prev) / 1000, 0.05) / ARRIVAL_S);
      const e = easeOutCubic(arrivalT);
      camera.position.z = camBaseZ + (1 - e) * 9;      // start further back, glide forward to the ship
      spaceRig.position.copy(camera.position);
      warp = 1 + Math.pow(1 - e, 2) * 28;              // dots rush past at the start, then calm down
    } else warp = navWarp;
    const now = performance.now();
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    const f = Math.pow(Math.pow(CFG.cubeSpinCoast, 60), dt);

    updateField(t, dt);
    updateShips(dt);
    updateDash(dt);
    navUpdate(dt);
    sunDirU.value.copy(BODY.starDir).applyQuaternion(spaceRig.quaternion);   // starlight turns with space
    if (BODY.mesh) BODY.mesh.rotation.y += dt * 0.05;
    if (BODY.ringMat) { BODY.group.getWorldPosition(BODY.ringMat.uniforms.center.value); BODY.ringMat.uniforms.ringN.value.copy(BODY.axis).applyQuaternion(spaceRig.quaternion); }
    updateMoons(dt);
    if (active !== 'sky' && !travel && !deepJump) {
      spaceRig.rotation.y += skyVelY * dt; spaceRig.rotation.x += skyVelX * dt;
      skyVelY += ((nav.target || !BODY.q ? 0 : CFG.skyTurnSpeed) - skyVelY) * Math.min(0.6 * dt, 1);   // parked at a body: no slow drift
      skyVelX *= Math.pow(0.4, dt);
    }
    appFade += ((appsVisible ? 1 : 0) - appFade) * Math.min(6 * dt, 1);
    if (openGroupIdx >= 0 && active !== 'sky') {        // scroll coasting + springing back from the ends
      const max = appItemsFor(openGroupIdx).scrollMax || 0;
      groupScroll += groupScrollVel * dt; groupScrollVel *= Math.pow(0.04, dt);
      if (groupScroll < 0) { groupScroll += (0 - groupScroll) * Math.min(10 * dt, 1); groupScrollVel = 0; }
      if (groupScroll > max) { groupScroll += (max - groupScroll) * Math.min(10 * dt, 1); groupScrollVel = 0; }
    }

    if (opening) {
      openP = Math.max(0, Math.min(1, openP + openDir * dt / CFG.appOpenSeconds));
      if (openDir > 0 && openP >= 0.85) {
        if (opening.targetBase) opening.base.copy(opening.targetBase);   // hidden behind the app: settle into its slot for the return
        if (NATIVE) {                                   // hand over to the real app, then reset the animation behind it
          if (!opening.launched) { opening.launched = true; (opening.data.work && window.Launcher.launchAs) ? window.Launcher.launchAs(opening.data.pkg, opening.data.activity, opening.data.user) : window.Launcher.launch(opening.data.pkg, opening.data.activity);
            setTimeout(() => { openDir = -1; }, 450); }
        } else appScreen.classList.add('show');
      }
      if (openDir < 0 && openP <= 0) { if (opening) opening.launched = false; opening = null; openDir = 0; }
    }

    groupItems.forEach(c => updateItem(c, t, dt, f));
    recentCache.forEach(c => updateItem(c, t, dt, f));
    appItemsByGroup.forEach(list => list.forEach(c => updateItem(c, t, dt, f)));
    resultCache.forEach(c => updateItem(c, t, dt, f));

    // tags are softer while the cubes are showing, hidden while an app or settings is open
    const settingsOpen = settingsEl.classList.contains('show');
    updateHud(opening || settingsOpen || travel || deepJump ? 0 : 1 - (1 - CFG.tagOpacityWithCubes) * appFade);
    navHud();
    syncSysRig();
    updateOccluders();
    deepUpdate(dt);
    updateStreaks(dt);
    updateRoute();
    // 1) far pass: stars, the star and planet you're at, its moons   2) space layer: dots, ships, whale (hidden behind planets)
    // 3) UI layer: your cubes (and the checklist ship), always on top
    renderer.autoClear = false; renderer.clear();
    const n0 = camera.near, f0 = camera.far, fov0 = camera.fov;
    camera.rotation.set(camMove.pitch + (Math.random() - 0.5) * 0.012 * camMove.shake,
                        (Math.random() - 0.5) * 0.012 * camMove.shake, camMove.roll);
    camera.updateMatrixWorld();
    camera.fov = worldFov; camera.near = 1; camera.far = 3000; camera.updateProjectionMatrix();
    renderer.render(skyScene, camera);                // 0) the starry backdrop
    renderer.clearDepth();
    camera.near = sysNear; camera.updateProjectionMatrix();
    renderer.render(sysScene, camera);
    if (warpVeil > 0.003) { veilMat.uniforms.k.value = warpVeil; veilMat.uniforms.aspect.value = innerWidth / innerHeight; renderer.render(veilScene, veilCam); }
    camera.near = n0; camera.far = f0; camera.updateProjectionMatrix();
    renderer.clearDepth();
    appLayer.visible = false; if (dash) dash.g.visible = false;
    // 2a) the flying dots, hidden wherever a planet covers the screen
    shipLayer.visible = false; occluders.visible = false; const stV = streaks.visible; streaks.visible = false; nearOcc.visible = true;
    renderer.render(scene, camera);
    renderer.clearDepth();
    // 2b) ships, whale, squadrons and warp streaks, with true depth against the planets
    field.visible = false; nearOcc.visible = false; shipLayer.visible = true; occluders.visible = true; streaks.visible = stV;
    renderer.render(scene, camera);
    field.visible = true;
    camera.fov = fov0; camera.updateProjectionMatrix();
    camera.rotation.set(0, 0, 0); camera.updateMatrixWorld();          // your cubes stay level
    renderer.clearDepth();
    appLayer.visible = true; if (dash) dash.g.visible = true;
    spaceRig.visible = false; occluders.visible = false; streaks.visible = false;
    renderer.render(scene, camera);
    spaceRig.visible = true; occluders.visible = true;
    if (coverPending > 0 && !oneFrame && --coverPending === 0) {
      try { if (window.Launcher && window.Launcher.hideCover) window.Launcher.hideCover(); } catch (e) {}
    }
    if (!paused && !oneFrame && !mapOpen) requestAnimationFrame(tick);
  }
  let paused = false, mapOpen = false;
  function openMap() {
    if (!window.SpaceMap || deepJump || travel) return;
    closeEverything(); cancelLock(); mapOpen = true; window.SpaceMap.open();
  }
  window.SpaceMapClosed = () => { if (!mapOpen) return; mapOpen = false; prev = performance.now(); requestAnimationFrame(tick); };
  document.getElementById('mapBtn').addEventListener('click', openMap);
  syncPhoneRecents(); refreshRecents(); setHomeView('recent');
  playArrival();                                    // fly in when the launcher starts

  // =========================================================
  //  SLEEP / WAKE-UP CHECKLISTS
  //  Set in Settings (time + items). At that time the checklist window appears:
  //  a ship dashes across and leaves a line, the line opens into a hologram frame.
  //  On the phone, Android also rings a notification at that time (tap = open it here).
  // =========================================================
  const ROUTINE_KEY = 'spaceCubeRoutines.v1', RSTATE_KEY = 'spaceCubeRoutineState.v1';
  const RWINDOW = 3 * 3600e3;                      // a checklist stays "due" for 3 hours after its time
  const RNAMES = { sleep: 'SLEEP SEQUENCE', wake: 'WAKE-UP SEQUENCE' };
  let ROUTINES = { sleep: { on: false, time: '23:00', items: ['Phone on the charger', 'Alarm set for tomorrow', 'Lights off'] },
                   wake:  { on: false, time: '07:00', items: ['Open the curtains', 'Make the bed'] } };
  let RSTATE = {};                                 // kind -> { key: date of that night/morning, done: [i], closed, snooze }
  try { const d = JSON.parse(localStorage.getItem(ROUTINE_KEY)); if (d) ['sleep', 'wake'].forEach(k => { if (d[k]) ROUTINES[k] = Object.assign(ROUTINES[k], d[k]); }); } catch (e) {}
  try { RSTATE = JSON.parse(localStorage.getItem(RSTATE_KEY)) || {}; } catch (e) {}
  function saveRoutines() {
    try { localStorage.setItem(ROUTINE_KEY, JSON.stringify(ROUTINES)); } catch (e) {}
    if (NATIVE && window.Launcher.setRoutineAlarms) {                     // let Android ring at these times
      const out = {};
      Object.entries(ROUTINES).forEach(([k, r]) => { const [h, m] = r.time.split(':').map(Number); out[k] = { on: r.on, h, m }; });
      try { window.Launcher.setRoutineAlarms(JSON.stringify(out)); } catch (e) {}
    }
  }
  function saveRState() { try { localStorage.setItem(RSTATE_KEY, JSON.stringify(RSTATE)); } catch (e) {} }
  // The most recent moment this checklist's time came round (today's, or yesterday's if today's is still ahead)
  function lastStart(kind, now) {
    const [h, m] = ROUTINES[kind].time.split(':').map(Number);
    const d = new Date(now); d.setHours(h, m, 0, 0);
    if (d.getTime() > now) d.setDate(d.getDate() - 1);
    return d;
  }
  const dayKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function stateFor(kind, now) {
    const key = dayKey(lastStart(kind, now));
    if (!RSTATE[kind] || RSTATE[kind].key !== key) RSTATE[kind] = { key, done: [], closed: false, snooze: 0 };
    return RSTATE[kind];
  }
  // Changing a time or switching a checklist on shouldn't fire a time that has already passed
  function settleRoutine(kind) {
    const now = Date.now();
    const st = stateFor(kind, now);
    if (now - lastStart(kind, now).getTime() < RWINDOW) st.closed = true;
    saveRState();
  }
  function dueRoutine(now) {
    let best = null, bestT = -1;
    ['sleep', 'wake'].forEach(k => {
      const r = ROUTINES[k];
      if (!r.on || !r.items.length) return;
      const t0 = lastStart(k, now).getTime();
      const st = stateFor(k, now);
      if (now - t0 < RWINDOW && !st.closed && st.snooze <= now && t0 > bestT) { best = k; bestT = t0; }
    });
    return best;
  }

  // ---- the window ----
  const rWrap = document.getElementById('rWrap'), rLine = document.getElementById('rLine'), rFrame = document.getElementById('rFrame');
  const rList = document.getElementById('rList'), rDone = document.getElementById('rDone');
  let routineOpen = null, routineBusy = false, pendingRoutine = null;
  var dash = null;                                  // the ship crossing the screen
  function routineBlocked() {
    return paused || routineBusy || routineOpen || document.body.classList.contains('arriving') || arrivalT < 1 ||
      cfgEl.classList.contains('show') || settingsEl.classList.contains('show') || opening;
  }
  function checkRoutines() {
    if (pendingRoutine && !routineBlocked()) { const k = pendingRoutine; pendingRoutine = null; showRoutine(k, true); return; }
    if (routineBlocked()) return;
    const k = dueRoutine(Date.now());
    if (k) showRoutine(k);
  }
  setInterval(checkRoutines, 15000);
  setTimeout(checkRoutines, 2500);
  function renderRoutine(kind) {
    const r = ROUTINES[kind], st = stateFor(kind, Date.now());
    document.getElementById('rTitle').textContent = RNAMES[kind];
    document.getElementById('rTime').textContent = r.time;
    rList.innerHTML = '';
    r.items.forEach((txt, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button'); b.className = 'rItem' + (st.done.includes(i) ? ' done' : '');
      b.innerHTML = '<i class="rBox"></i><span></span>'; b.querySelector('span').textContent = txt;
      b.addEventListener('click', () => {
        const at = st.done.indexOf(i);
        if (at >= 0) st.done.splice(at, 1); else st.done.push(i);
        b.classList.toggle('done', at < 0); saveRState();
        try { window.Launcher && window.Launcher.vibrate && window.Launcher.vibrate(12); } catch (e) {}
        if (r.items.every((_, j) => st.done.includes(j))) {          // all done: say so, then fold away
          rDone.classList.add('show'); st.closed = true; saveRState();
          setTimeout(() => closeRoutine(), 900);
        }
      });
      li.appendChild(b); rList.appendChild(li);
    });
    rDone.classList.remove('show');
  }
  function showRoutine(kind, force) {
    if (!ROUTINES[kind]) return;
    if (routineBlocked()) { if (force) pendingRoutine = kind; return; }
    const st = stateFor(kind, Date.now());
    if (force) { st.closed = false; st.snooze = 0; saveRState(); }
    routineOpen = kind; routineBusy = true;
    document.body.classList.add('routine');
    closeEverything();
    renderRoutine(kind);
    rWrap.classList.add('live');
    const H = Math.min(innerHeight * 0.66, 150 + ROUTINES[kind].items.length * 44);
    const Y = Math.max(H / 2 + 70, innerHeight * 0.46);
    rLine.className = ''; rLine.style.top = Y + 'px'; rLine.style.width = '0px';
    rFrame.style.transition = 'none'; rFrame.className = ''; rFrame.style.top = (Y - 2) + 'px'; rFrame.style.height = '0px'; void rFrame.offsetWidth; rFrame.style.transition = '';
    // 1) a ship dashes across, the line trails behind it
    startDash(Y, () => {
      // 2) the line splits: top and bottom edges move apart into the frame
      rFrame.classList.add('on');
      requestAnimationFrame(() => {
        rFrame.style.top = (Y - H / 2 - 2) + 'px'; rFrame.style.height = H + 'px';
        rLine.classList.remove('on');
      });
      // 3) the hologram comes on
      setTimeout(() => { rFrame.classList.add('ready'); routineBusy = false; }, 520);
    });
  }
  function closeRoutine(snoozeMin) {
    if (!routineOpen || routineBusy) return;
    const kind = routineOpen, st = stateFor(kind, Date.now());
    if (snoozeMin) st.snooze = Date.now() + snoozeMin * 60e3; else st.closed = true;
    saveRState();
    routineBusy = true;
    rFrame.classList.remove('ready');                               // text fades...
    setTimeout(() => {                                              // ...top and bottom edges close in and meet in one line...
      const mid = parseFloat(rFrame.style.top) + parseFloat(rFrame.style.height) / 2;
      rFrame.style.top = (mid - 2 + 2) + 'px'; rFrame.style.height = '0px';
      rFrame.classList.add('collapse');                             // (and stretch to full width, like the ship's line)
      setTimeout(() => {
        rFrame.classList.add('exit');                               // ...which leaves the screen left to right, fading a little
        let finished = false;
        // a few tiny sparks shed from the tail end of the line as it goes
        const sparkY = parseFloat(rFrame.style.top) + 2;
        let lastSpark = 0;
        const shed = now => {
          if (finished) return;
          const x = rFrame.getBoundingClientRect().left;
          if (x < innerWidth - 4 && now - lastSpark > 28) {
            lastSpark = now;
            const sp = document.createElement('i'); sp.className = 'rSpark';
            sp.style.left = (x + Math.random() * 14) + 'px'; sp.style.top = (sparkY + (Math.random() - 0.5) * 3) + 'px';
            sp.style.setProperty('--dx', (-6 - Math.random() * 14) + 'px');            // drift back along the trail...
            sp.style.setProperty('--dy', ((Math.random() - 0.5) * 12) + 'px');         // ...and a touch up or down
            sp.style.setProperty('--life', (420 + Math.random() * 300) + 'ms');
            sp.addEventListener('animationend', () => sp.remove());
            rWrap.appendChild(sp);
          }
          requestAnimationFrame(shed);
        };
        requestAnimationFrame(shed);
        const finish = () => {
          if (finished) return; finished = true;
          rFrame.removeEventListener('transitionend', onEnd);
          rFrame.style.transition = 'none'; rFrame.className = ''; void rFrame.offsetWidth; rFrame.style.transition = '';   // reset instantly, unseen (no ghost sliding back)
          rLine.className = ''; rWrap.classList.remove('live'); document.body.classList.remove('routine'); routineOpen = null; routineBusy = false;
        };
        const onEnd = e => { if (e.target === rFrame && e.propertyName === 'left' && rFrame.getBoundingClientRect().left >= innerWidth - 2) finish(); };   // only once the line is really off screen
        rFrame.addEventListener('transitionend', onEnd);
        setTimeout(finish, 1500);                                   // safety net
      }, 500);
    }, 250);
  }
  window.showRoutine = kind => showRoutine(kind, true);
  document.getElementById('rClose').addEventListener('click', () => closeRoutine());
  document.getElementById('rSnooze').addEventListener('click', () => closeRoutine(10));

  // The dashing ship: one of the passing-ship models, flown across just in front of the cubes
  function startDash(yPx, done) {
    const g = SHIP_MODELS[Math.floor(Math.random() * SHIP_MODELS.length)]();
    const z = 1.6, depth = camera.position.z - z;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = tanH * depth * camera.aspect, wy = (1 - 2 * yPx / innerHeight) * tanH * depth;
    g.scale.setScalar((2 * halfW) * 0.2 / 1.5);                     // about a fifth of the screen wide
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));   // nose to the right
    g.rotateZ(0.25);                                                // banked a little, like it's swooping in
    g.traverse(o => { o.renderOrder = 50; });
    scene.add(g);
    dash = { g, t: 0, dur: 0.55, x0: -halfW - 1.5, x1: halfW + 1.5, y: wy, z, done };
    rLine.classList.add('on');
  }
  const dashV = new THREE.Vector3();
  function updateDash(dt) {
    if (!dash) return;
    dash.t += dt;
    const p = Math.min(1, dash.t / dash.dur), e = p * p * (3 - 2 * p) * 0.25 + p * 0.75;   // fast, nearly even
    dash.g.position.set(dash.x0 + (dash.x1 - dash.x0) * e, dash.y, dash.z);
    dashV.copy(dash.g.position); dashV.x -= 0.5 * dash.g.scale.x;   // the line starts at the ship's tail
    dashV.project(camera);
    rLine.style.width = Math.max(0, Math.min(innerWidth, (dashV.x + 1) / 2 * innerWidth)) + 'px';
    if (p >= 1) {
      rLine.style.width = '100%';
      scene.remove(dash.g);
      dash.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.isSpriteMaterial) o.material.dispose(); });
      const cb = dash.done; dash = null; cb();
    }
  }

  // ---- Settings panel ----
  const cfgEl = document.getElementById('cfg'), cfgList = document.getElementById('cfgList');
  function renderCfg() {
    cfgList.innerHTML = '';
    [['sleep', 'SLEEP', 'Bedtime checklist'], ['wake', 'WAKE-UP', 'Morning checklist']].forEach(([k, title, note]) => {
      const r = ROUTINES[k];
      const card = document.createElement('div'); card.className = 'gCard';
      card.innerHTML = `<div class="gTop"><span class="rcTitle">${title}</span><input type="time" class="rcTime"><button class="chromeBtn rcOn"></button></div>
        <div class="rcNote">${note}: appears at this time every day</div><div class="rcItems"></div>
        <div class="rcAdd"><input class="gName rcNew" placeholder="Add an item" enterkeyhint="done"><button class="chromeBtn rcPlus">+</button></div>
        <div class="rcFoot"><button class="chromeBtn rcPrev">Preview</button></div>`;
      const time = card.querySelector('.rcTime'), on = card.querySelector('.rcOn'), items = card.querySelector('.rcItems');
      time.value = r.time;
      time.addEventListener('change', () => { if (time.value) { r.time = time.value; settleRoutine(k); saveRoutines(); } });
      const paintOn = () => { on.textContent = r.on ? 'ON' : 'OFF'; on.classList.toggle('off', !r.on); };
      paintOn();
      on.addEventListener('click', () => {
        r.on = !r.on; paintOn(); if (r.on) settleRoutine(k); saveRoutines();
        if (r.on && NATIVE && window.Launcher.askNotifications) try { window.Launcher.askNotifications(); } catch (e) {}
      });
      const paintItems = () => {
        items.innerHTML = r.items.length ? '' : '<div class="empty">No items yet</div>';
        r.items.forEach((txt, i) => {
          const row = document.createElement('div'); row.className = 'rcRow';
          row.innerHTML = '<span></span><button class="rcUp" aria-label="Move up">▲</button><button class="gDel" aria-label="Delete">✕</button>';
          row.querySelector('span').textContent = txt;
          const up = row.querySelector('.rcUp'); up.disabled = i === 0;
          up.addEventListener('click', () => { [r.items[i - 1], r.items[i]] = [r.items[i], r.items[i - 1]]; resetDone(k); saveRoutines(); paintItems(); });
          row.querySelector('.gDel').addEventListener('click', () => { r.items.splice(i, 1); resetDone(k); saveRoutines(); paintItems(); });
          items.appendChild(row);
        });
      };
      paintItems();
      const inp = card.querySelector('.rcNew');
      const add = () => { const v = inp.value.trim(); if (!v) return; r.items.push(v); inp.value = ''; saveRoutines(); paintItems(); };
      card.querySelector('.rcPlus').addEventListener('click', add);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { add(); inp.blur(); } });
      inp.addEventListener('focus', () => setTimeout(() => inp.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350));   // keep it above the keyboard
      card.querySelector('.rcPrev').addEventListener('click', () => { closeCfg(); setTimeout(() => showRoutine(k, true), 450); });
      cfgList.appendChild(card);
    });
    if (NATIVE && window.Launcher.setLiveWallpaper) {              // live wallpaper (APK 1.3+)
      const wc = document.createElement('div'); wc.className = 'gCard';
      let on = false; try { on = window.Launcher.isLiveWallpaperOn(); } catch (e) {}
      wc.innerHTML = `<div class="gTop"><span class="rcTitle">WALLPAPER</span><button class="chromeBtn" id="lwBtn"></button></div>
        <div class="rcNote">Flying space on your lock screen and behind recent apps. In the preview, tap Set wallpaper, then Home and lock screens.</div>`;
      const btn = wc.querySelector('#lwBtn'); btn.textContent = on ? 'ACTIVE' : 'SET';
      btn.addEventListener('click', () => { try { window.Launcher.setLiveWallpaper(); } catch (e) {} });
      cfgList.appendChild(wc);
    }
    if (SKY) {                                                       // deep sky: how far out to show exoplanets
      const dc = document.createElement('div'); dc.className = 'gCard';
      dc.innerHTML = `<div class="gTop"><span class="rcTitle">DEEP SKY</span><span class="dsVal" style="margin-left:auto;font-size:12px;opacity:.8"></span></div>
        <div class="rcNote">Stars with known planets are drawn as dots out to this distance, fainter the farther they are. You can lock on and jump to the ones within ${WARP_LY} light-years.</div>
        <input type="range" class="dsRange" min="${WARP_LY}" max="170" step="5" style="width:100%;accent-color:#7dffc6;margin:10px 0 4px">
        <div class="rcNote" style="opacity:.6">Data: NASA Exoplanet Archive, ${SKY.planetCount} nearest planets (${SKY.fetched}). Positions: CDS Sesame.</div>`;
      const rg = dc.querySelector('.dsRange'), val = dc.querySelector('.dsVal');
      const paint = () => { const n = SYSTEMS.filter(o => o.ly <= deep.limit).reduce((a, o) => a + o.planets.length, 0); val.textContent = deep.limit + ' LY · ' + n + ' PLANETS'; };
      deep.limit = Math.max(deep.limit, WARP_LY); rg.value = deep.limit; paint();
      rg.addEventListener('input', () => { deep.limit = +rg.value; paint(); saveDeep(); });
      cfgList.appendChild(dc);
    }
    const tag = document.createElement('p'); tag.className = 'setHelp'; tag.id = 'buildTag';
    tag.style.cssText = 'opacity:.5;font-size:11px;text-align:center;margin-top:18px';
    tag.textContent = 'SCREEN 2026-11-24 · 58';
    try { if (NATIVE && window.Launcher.appVersion) tag.textContent += ' · APP ' + window.Launcher.appVersion(); } catch (e) {}
    if (NATIVE) tag.textContent += location.hostname.endsWith('github.io') ? ' · LIVE' : ' · BUILT-IN';
    cfgList.appendChild(tag);
    const dbg = document.createElement('div'); dbg.className = 'gCard'; dbg.id = 'dbgCard'; dbg.style.display = debugOpen ? '' : 'none';
    dbg.innerHTML = `<div class="gTop"><span class="rcTitle">DEBUG</span></div>
      <div class="dbgTabs"><button data-tab="ships" class="on">SHIPS</button><button data-tab="squads">SQUADRONS</button><button data-tab="whale">WHALE</button></div>
      <div class="dbgPane" data-pane="ships">
        <button class="chromeBtn" data-d="ship">1 ship</button><button class="chromeBtn" data-d="ships">5 ships</button>
        <button class="chromeBtn" data-d="jump">All jump</button><button class="chromeBtn" data-d="paths">${showPaths ? 'Hide paths' : 'Show paths'}</button></div>
      <div class="dbgPane" data-pane="squads" hidden>
        <button class="chromeBtn" data-d="sqchase">Chase from behind</button><button class="chromeBtn" data-d="sqhead">Chase head-on</button><button class="chromeBtn" data-d="sqcross">Chase any angle</button><button class="chromeBtn" data-d="sqfly">Formation</button>
        <button class="chromeBtn" data-d="sqend">Jump out</button></div>
      <div class="dbgPane" data-pane="whale" hidden>
        <button class="chromeBtn" data-d="whaleby">Overtakes</button><button class="chromeBtn" data-d="whalehead">Head-on</button>
        <button class="chromeBtn" data-d="whalecross">Far</button><button class="chromeBtn" data-d="whaleout">Leave</button></div>`;
    dbg.querySelectorAll('.dbgTabs button').forEach(tb => tb.addEventListener('click', () => {
      dbg.querySelectorAll('.dbgTabs button').forEach(x => x.classList.toggle('on', x === tb));
      dbg.querySelectorAll('.dbgPane').forEach(pn => { pn.hidden = pn.dataset.pane !== tb.dataset.tab; });
    }));
    dbg.querySelectorAll('.dbgPane button').forEach(b => b.addEventListener('click', () => {
      const d = b.dataset.d;
      closeCfg();
      setTimeout(() => {
        if (d === 'paths') showPaths = !showPaths;
        if (d === 'ship') spawnShip(true);
        if (d === 'ships') for (let i = 0; i < 5; i++) spawnShip(true);
        if (d === 'jump') ships.forEach(sh => { if (!sh.phase) sh.life = sh.age; });
        if (d === 'sqhead') { if (squad) squad.t = squad.life; setTimeout(() => spawnSquad(true, 'head'), squad ? 50 : 0); }
        if (d === 'sqchase' || d === 'sqfly' || d === 'sqcross') { if (squad) squad.t = squad.life; setTimeout(() => spawnSquad(d !== 'sqfly', d === 'sqcross' ? 'cross' : d === 'sqchase' ? 'by' : undefined), squad ? 50 : 0); }
        if (d === 'sqend' && squad) squad.t = squad.life;
        if (d === 'whaleout' && whale && whale.state !== 'out') { whale.state = 'out'; whale.st = 0; }
        const route = { whaleby: 'by', whalehead: 'head', whalecross: 'cross' }[d];
        if (route) {                                                // replace any current whale right away
          if (whale) { shipLayer.remove(whale.g); whale.g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); whale = null; }
          spawnWhale(route);
        }
      }, 350);
    }));
    cfgList.appendChild(dbg);
    let taps = [];
    tag.addEventListener('click', () => {                           // 5 quick taps on the version line
      const now = Date.now(); taps = taps.filter(x => now - x < 4000); taps.push(now);
      if (taps.length >= 5) { taps = []; debugOpen = !debugOpen; dbg.style.display = debugOpen ? '' : 'none'; if (debugOpen) dbg.scrollIntoView({ behavior: 'smooth' }); }
    });
  }
  let debugOpen = false;
  function resetDone(k) { if (RSTATE[k]) { RSTATE[k].done = []; saveRState(); } }   // items moved: old ticks no longer line up
  function openCfg() { closeEverything(); renderCfg(); cfgEl.classList.add('show'); }
  function closeCfg() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); cfgEl.classList.remove('show'); }
  document.getElementById('cfgBtn').addEventListener('click', openCfg);
  document.getElementById('cfgDone').addEventListener('click', closeCfg);
  saveRoutines();                                   // make sure Android has the current times

  // =========================================================
  //  PHONE HOOKS (called by the Android app)
  // =========================================================
  function closeEverything() {
    if (window.SpaceMap && window.SpaceMap.isOpen) window.SpaceMap.close();
    if (typeof cfgEl !== 'undefined' && cfgEl.classList.contains('show')) closeCfg();
    picker.classList.remove('show');
    if (settingsEl.classList.contains('show')) closeSettings();
    showKbd(false);
    if (searchInput.value) { searchInput.value = ''; runSearch(); }
    leaveGroup();
    selected = null;
  }
  // Back: close the top-most thing that's open, one step at a time
  window.handleBack = () => {
    if (window.SpaceMap && window.SpaceMap.isOpen) { window.SpaceMap.back(); return true; }
    if (navLock) { cancelLock(); return true; }
    if (routineOpen) { closeRoutine(); return true; }
    if (cfgEl.classList.contains('show')) { closeCfg(); return true; }
    if (picker.classList.contains('show')) { picker.classList.remove('show'); return true; }
    if (settingsEl.classList.contains('show')) { closeSettings(); return true; }
    if (kbdOpen) { showKbd(false); return true; }
    if (searchInput.value) { searchInput.value = ''; runSearch(); return true; }
    if (openGroupIdx >= 0) { leaveGroup(); return true; }
    if (homeView === 'groups') { setHomeView('recent'); return true; }
    if (selected) { selected = null; return true; }
    return false;
  };
  // Home pressed while already home: back to the groups
  window.goHome = () => { closeEverything(); appsVisible = true; setHomeView('recent'); };
  // Another app is in front: stop drawing (saves battery). Back home: start again.
  window.setInsets = (top, bottom) => {
    INSETS.top = top || 0; INSETS.bottom = bottom || 0;
    document.documentElement.style.setProperty('--inset-top', INSETS.top + 'px');
    document.documentElement.style.setProperty('--inset-bottom', INSETS.bottom + 'px');
    layout(); resultItems.forEach((it, i) => resultSpot(i, it.targetBase)); placeConsole();
  };
  if (window.__pendingInsets) window.setInsets(...window.__pendingInsets);
  // Unlock: the Android app calls this when the phone is unlocked (newer app builds).
  // Screen turned off: get the fly-in's starting pose ready NOW (empty space, everything tucked away)
  // and draw it, so the first thing you see after unlocking is the start of the fly-in, not the old screen.
  window.onScreenOff = () => {
    closeEverything();
    arrivalT = 0; arrivalHeld = true;
    document.body.classList.add('arriving');
    drawOneFrame();
    // hand the app an exact picture of this frame, so its cover matches the live screen pixel for pixel
    // (read right after drawing, in the same task, while the frame is still in the canvas)
    try {
      if (window.Launcher && window.Launcher.setCover)
        window.Launcher.setCover(renderer.domElement.toDataURL('image/jpeg', 0.9));
    } catch (e) {}
  };
  // Unlocked (or back on screen after it was prepared): release the fly-in.
  function releaseArrival() {
    if (!arrivalHeld) return;
    arrivalHeld = false;
    prev = performance.now();
    requestCoverHide();
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('arriving')));
  }
  window.onUnlock = () => { if (arrivalHeld) releaseArrival(); else playArrival(); };
  let pausedAt = 0;
  window.setPaused = p => {
    if (!p) { try { syncPhoneRecents(); updateEmptyHint(); } catch (e) {} }
    if (p) pausedAt = Date.now();
    else if (arrivalHeld) releaseArrival();                 // came back after the screen was off
    // older app builds have no screen/unlock signals: treat "back after 20 s or more away" as an unlock
    else if (!window.__hasUnlockHook && pausedAt && Date.now() - pausedAt > 20000) playArrival();
    if (p === paused) return;
    paused = p;
    if (!p) { prev = performance.now(); requestAnimationFrame(tick); setTimeout(checkRoutines, 900); }
  };
  // An app was installed, removed or updated
  window.onAppsChanged = () => {
    if (!NATIVE) return;
    saveGroups();                                    // keep the current arrangement...
    let stored = null; try { stored = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) {}
    loadNativeApps();
    const d = stored ? reconcile(stored) : autoSortNative();   // ...then match it to the new app list
    GROUPS = d.groups; UNSORTED = d.unsorted; FAVS = d.favs;
    if (openGroupIdx >= 0) leaveGroup();
    rebuildCubes(); renderEggs();
    resultCache.forEach(disposeItem); resultCache.clear(); resultItems = [];
    if (searchInput.value) runSearch();
  };
  tick();

  let lastW = innerWidth, lastH = innerHeight;
  function fitViewport() {
    // ignore height-only shrinks while typing (that's the keyboard), so cubes don't jump
    if (searchFocused && innerWidth === lastW && innerHeight < lastH) { placeConsole(); return; }
    lastW = innerWidth; lastH = innerHeight;
    renderer.setSize(innerWidth, innerHeight); layout();
    resultItems.forEach((it, i) => resultSpot(i, it.targetBase));
    placeConsole();
  }
  addEventListener('resize', fitViewport);
})();
