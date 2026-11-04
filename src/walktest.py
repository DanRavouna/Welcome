# A bot that WALKS the new areas with the real collision box (18 x 8 px on 32 px tiles), not just a tile search:
# the climb to the beacon door, the Sealed Arch's statue ring, and the whole Lamp Tower (levers pulled by hand, there and back).
from playwright.sync_api import sync_playwright
errs=[]
WALK = """async (t) => {
  const M = WORLD.map, TS = WORLD.TS;
  const free = (x, y) => x >= 0 && y >= 0 && x < M.W && y < M.H && !WORLD.solidAt(x, y) && !WORLD.npcs.some(n => n.x === x && n.y === y) && ['W', 'Z'].indexOf(M.grid[y][x]) === -1;   // stay out of the tall grass, like a careful player
  const things = WORLD.objects.concat(WORLD.npcs);
  let goal;
  if (t.adj) { const o = things.find(q => q.id === t.adj); if (!o) return { ok: false, why: 'no such thing ' + t.adj }; goal = (x, y) => Math.abs(x - o.x) + Math.abs(y - o.y) === 1; }
  else goal = (x, y) => x === t.tile[0] && y === t.tile[1];
  const p0 = WORLD.pos(), s = [Math.floor(p0.x / TS), Math.floor(p0.y / TS)];
  const par = new Map([[s.join(), null]]), q = [s]; let end = null;
  while (q.length) { const [x, y] = q.shift(); if (goal(x, y)) { end = [x, y]; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy, k = a + ',' + b; if (!par.has(k) && free(a, b)) { par.set(k, [x, y]); q.push([a, b]); } } }
  if (!end) return { ok: false, why: 'no path' };
  const path = []; for (let c = end; c; c = par.get(c.join())) path.unshift(c);
  let steps = 0, stuckAt = null;
  for (const [tx, ty] of path.slice(1)) {
    const px = (tx + 0.5) * TS, py = (ty + 0.65) * TS; let it = 0;
    for (;;) { const p = WORLD.pos(), dx = px - p.x, dy = py - p.y, d = Math.hypot(dx, dy); if (d < 4) break;
      if (++it > 60) { stuckAt = [tx, ty]; break; }
      WORLD.input.jx = dx / d; WORLD.input.jy = dy / d; WORLD.step(1 / 30); steps++; }
    if (stuckAt) break;
  }
  WORLD.input.jx = 0; WORLD.input.jy = 0; WORLD.step(1 / 30);
  const p = WORLD.pos(), n = WORLD.nearest();
  return { ok: !stuckAt, steps, stuckAt, tile: [Math.floor(p.x / TS), Math.floor(p.y / TS)], near: n ? n.kind + ':' + (n.obj ? n.obj.id : n.npc ? n.npc.id : n.sign ? 'sign' : '?') : null };
}"""
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:16}],party:[2],fighter:2,intro:true,xp:99999,adv:{clues:[],open:{arch:true,lamp:true},flags:{rubble:true,rite:[0,1,2]}},settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  walk=lambda **t: pg.evaluate(WALK, t)
  def at(mid, x=None, y=None):
    pg.evaluate(f"WORLD.enter('{mid}'); WORLD.npcs.forEach(n=>n.declined=true); WORLD.map.rate=0; APP.close(); WORLD.setPaused(false)")   # this test is about collision: no random wild encounters (they pause the world)
    if x is not None: pg.evaluate(f"WORLD.setPos({x}*WORLD.TS,{y}*WORLD.TS)")
  # 1) the climb: from the south gap to the beacon door
  at('ascent'); r=walk(adj='beacon-door'); print('Cold Ascent, gap -> beacon door:', r)
  # 2) the Sealed Arch with the rubble gone: through the statue ring to the crown and the chest behind the Keeper
  at('dg-arch'); 
  for target in ['chest1','crown','chest2','keeper']:
    r=walk(adj=target); print(f'Sealed Arch -> {target}:', r)
    if target=='crown': print('   standing under the crown, the action button is for:', r['near'], '(must be the crown, not the Keeper)')
  # 3) the Lamp Tower, by hand: pull each lever with the real action button, then up to the great lamp and all the way back out
  at('dg-lamp'); pg.evaluate("APP.game.update({adv:{clues:[],open:{lamp:true},flags:{}}})"); pg.evaluate("WORLD.enter('dg-lamp'); WORLD.npcs.forEach(n=>n.declined=true); WORLD.map.rate=0")
  gates=lambda: pg.evaluate("['g1','g2','g3'].map(g=>g+':'+(WORLD.objects.filter(x=>x.gate===g).every(x=>x.hidden)?'open':'shut')).join(' ')")
  def pull(lv):
    r=walk(adj=lv); pg.wait_for_timeout(250); assert pg.evaluate("(WORLD.nearest()||{}).kind")=='object', r; pg.click('#act'); pg.wait_for_timeout(250); return r
  print('tower start:', gates(), '| the way up is shut:', walk(adj='L2')['ok']==False)
  pull('L1'); print('pulled L1:', gates()); r=walk(adj='L2'); print('  walk to L2 (through g1):', r)
  pull('L2'); print('pulled L2:', gates()); r=walk(adj='L3'); print('  walk to L3 (through g2):', r)
  pull('L3'); print('pulled L3:', gates()); r=walk(adj='greatlamp'); print('  walk to the great lamp (through g3):', r)
  print('--- and back out')
  pull('L3'); print('flip L3 back:', gates()); pull('L2'); print('flip L2 back:', gates()); pull('L1'); print('flip L1 back:', gates())
  r=walk(tile=[10,52]); print('  back to the entrance:', r)
  pg.evaluate("WORLD.setPos(10.9*WORLD.TS,53.2*WORLD.TS); WORLD.input.jy=1")
  for _ in range(14): pg.evaluate("WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(300); print('  out through the exit ->', pg.evaluate("WORLD.map.id"))
  print('errors:', errs or 'none'); b.close()
