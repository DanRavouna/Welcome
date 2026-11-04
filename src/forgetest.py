# The Forge Below: hub-and-spoke dungeon, walked by the bot with the real collision box. Cores from the side halls (either order) into the hub sockets,
# the north gate, the guards and the Forgemaster, the furnace, saving.
from playwright.sync_api import sync_playwright
import re
errs=[]
src=open('/home/user/critter-roll/src/walktest.py').read()
WALK=re.search(r'WALK = """(.*?)"""', src, re.S).group(1)
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:16}],party:[2],fighter:2,intro:true,xp:99999,essence:10,adv:{clues:[],open:{},flags:{}},settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  walk=lambda **t: pg.evaluate(WALK, t)
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  def enter():
    pg.evaluate("APP.close&&APP.close(); WORLD.enter('dg-forge'); WORLD.npcs.forEach(n=>n.declined=true); WORLD.map.rate=0; WORLD.setPaused(false)")
  def act(): pg.wait_for_timeout(250); pg.click('#act'); pg.wait_for_timeout(300); return pg.inner_text('#toast')[:85]
  flags=lambda: pg.evaluate("JSON.stringify(APP.game.state.adv.flags)")
  gate=lambda: pg.evaluate("WORLD.objects.filter(x=>x.gate==='gb').every(x=>x.hidden)?'open':'shut'")
  # 1) the door on the Descent, then the hub
  pg.evaluate("WORLD.enter('descent'); WORLD.setPaused(false)"); pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='forge-door');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y-0.4)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(300)
  print('door:', pg.inner_text('#act-label')); pg.click('#act'); pg.wait_for_timeout(300); print('first visit dialogue:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]")); finish(); pg.wait_for_timeout(700)
  print('inside:', pg.evaluate("WORLD.map.id"), '| open.forge saved:', pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2')).adv.open.forge"), '| dark radius:', pg.evaluate("WORLD.map.dark.r"))
  enter()
  REACH="""(ids)=>{const M=WORLD.map;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y)||WORLD.npcs.some(o=>o.x===x&&o.y===y);const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];
    while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    const adj=(o)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));const things=WORLD.objects.concat(WORLD.npcs);const out={};ids.forEach(id=>{const o=things.find(t=>t.id===id);out[id]=o?adj(o):'missing'});return out}"""
  print('at the start, reachable:', pg.evaluate(REACH, ['coreA','coreB','sockA','sockB','dross','ingot','hale','furnace','chest1','chest2']), '| north gate:', gate())
  # 2) a socket before its core, then WEST first: core A -> socket A, then EAST: core B -> socket B
  walk(adj='sockA'); print('socket without the core:', act())
  r=walk(adj='coreA'); print('walk to core A (west hall, past Smith Dross):', r['ok'], r['near']); print(' ', act(), '|', flags())
  r=walk(adj='sockA'); print('walk to socket A:', r['ok']); print(' ', act(), '| gate:', gate())
  r=walk(adj='coreB'); print('walk to core B (east hall, past Smith Ingot):', r['ok'], r['near']); print(' ', act(), '|', flags())
  r=walk(adj='sockB'); print('walk to socket B:', r['ok']); print(' ', act(), '| gate:', gate())
  print('after both sockets, reachable:', pg.evaluate(REACH, ['hale','furnace','chest2']))
  r=walk(adj='furnace'); print('walk to the furnace (past the Forgemaster):', r['ok'], r['near'])
  # 3) the other order works too (east first)
  pg.evaluate("APP.game.update({adv:{clues:[],open:{forge:true},flags:{}}})"); enter(); print('reset: gate', gate(), '| cores back on their pedestals:', pg.evaluate("WORLD.objects.filter(x=>x.kind==='core').every(x=>!x.hidden)"))
  for c in ['coreB','sockB','coreA','sockA']: r=walk(adj=c); act()
  print('east first, then west -> gate:', gate(), '|', flags())
  # 4) trainers: sight lines, flags, rewards
  r=pg.evaluate("""()=>{WORLD.npcs.forEach(n=>{n.declined=true});const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]},out={};for(const id of ['dross','ingot','hale']){const n=WORLD.npcs.find(x=>x.id===id);const d=v[n.dir];WORLD.setPos((n.x+d[0]*3+0.5)*WORLD.TS,(n.y+d[1]*3+0.65)*WORLD.TS);out[id]={at:[n.x,n.y],dir:n.dir,sees:WORLD.inSight(n),size:n.size,stage:n.stage,lv:n.lv,reward:n.reward,boss:!!n.boss,bonus:n.bonus||0}}return out}""")
  for k,v in r.items(): print('  ',k,v)
  # 5) the furnace: blocked, then lights once, +50 (30 + title 20)
  def furnace(): 
    walk(adj='furnace'); return act()
  print('furnace before the Forgemaster falls:', furnace())
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['hale'])})})")
  e0=pg.evaluate("APP.game.state.essence"); walk(adj='furnace'); pg.wait_for_timeout(250); pg.click('#act'); pg.wait_for_timeout(300); n=pg.evaluate("APP.dialog.lines.length"); finish(); pg.wait_for_timeout(500)
  print('first light: dialogue', n, 'lines | lit:', pg.evaluate("!!APP.game.state.adv.flags.forgeLit"), '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| title:', pg.evaluate("APP.game.state.titles.indexOf('forge')!==-1"))
  pg.wait_for_timeout(3000); print('Slagback handed over:', pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET3_SEED)")); pg.evaluate("APP.close(); WORLD.setPaused(false)")
  e1=pg.evaluate("APP.game.state.essence"); print('again:', furnace()[:50], '| unchanged:', pg.evaluate("APP.game.state.essence")==e1)
  print('chest2:', (lambda: (walk(adj='chest2'), act())[1])())
  # 6) journal, music, reload
  pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-tile=journal]').click()"); pg.wait_for_timeout(200); print('journal:', [l[:70] for l in pg.evaluate("APP.dialog.lines") if 'Forge Below' in l]); finish()
  enter(); pg.wait_for_timeout(900); print('music in the forge:', pg.evaluate("MUSIC.state.want"), '| own track:', pg.evaluate("MUSIC.tracks.indexOf('dg-forge')!==-1"))
  pg.reload(); pg.wait_for_timeout(1300); pg.evaluate("WORLD.enter('dg-forge')"); pg.wait_for_timeout(400)
  print('after reload: gate', gate(), '| cores hidden:', pg.evaluate("WORLD.objects.filter(x=>x.kind==='core').every(x=>x.hidden)"), '| sockets lit:', pg.evaluate("JSON.stringify(APP.game.state.adv.flags)"))
  print('errors:', errs or 'none'); b.close()
