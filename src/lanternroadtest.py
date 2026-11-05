# The lantern road on Highland Pass: posts along the main road; at dusk/night only the one just ahead is lit (and it moves on as you pass); by day none; the cliff's door lamp is lit at night.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true")
  info=pg.evaluate("['route-mf-gate','route-mf','route-mf-fork','route-mf-hollow','route-cm'].map(id=>{const M=WORLD.MAPS[id];return [id,M.trail?M.trail.lamps.length:0,M.trail?M.trail.cells.length:0]})")
  print('lamps / road length per map:', info)
  def lit(mapid,tod,idx,steps=25):
    pg.evaluate("([m,t])=>{window.__tod=t;WORLD.enter(m);WORLD.setPaused(true)}",[mapid,tod]); pg.wait_for_timeout(100)
    pg.evaluate("([i])=>{const c=WORLD.map.trail.cells[i];WORLD.setPos((c[0]+0.5)*32,(c[1]+0.5)*32)}",[idx])
    for _ in range(steps): pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(40)
    return pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='postlamp'&&!o.always).map(o=>[o.trail,Math.round(APP.game&&0)])")
  def litset(mapid,tod,idx):
    pg.evaluate("([m,t])=>{window.__tod=t;WORLD.enter(m);WORLD.setPaused(true)}",[mapid,tod]); pg.wait_for_timeout(100)
    pg.evaluate("([i])=>{const c=WORLD.map.trail.cells[i];WORLD.setPos((c[0]+0.5)*32,(c[1]+0.5)*32)}",[idx])
    for _ in range(40): pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(40)
    return pg.evaluate("(()=>{const out=[];WORLD.map.objects.filter(o=>o.kind==='postlamp'&&!o.always).forEach(o=>{const st=OBJSTATE(o);if(st.k>0.5)out.push(o.trail)});return out})()".replace('OBJSTATE','window.__objState'))
  # expose the app's objState for the test through the world's draw option
  pg.evaluate("window.__objState=(o)=>APP.__objState?APP.__objState(o):{}")
  # the pass: lamps are lit one at a time as the player walks along the road
  res={}
  for tod in ['day','night']:
    pg.evaluate("([t])=>{window.__tod=t;WORLD.enter('route-mf');WORLD.setPaused(true)}",[tod]); pg.wait_for_timeout(150)
    n=pg.evaluate("WORLD.map.trail.cells.length"); lamps=pg.evaluate("WORLD.map.trail.lamps")
    seq=[]
    for i in [2, lamps[0]+4, lamps[1]+4, lamps[-1]+3]:
      pg.evaluate("([i])=>{const c=WORLD.map.trail.cells[i];WORLD.setPos((c[0]+0.5)*32,(c[1]+0.5)*32)}",[i])
      for _ in range(45): pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(40)
      seq.append(pg.evaluate("(()=>{const L=APP.lampLevels(),out=[];WORLD.map.objects.filter(o=>o.kind==='postlamp'&&!o.always).forEach(o=>{if((L[o.id]||0)>0.5)out.push(o.trail)});return out})()"))
    res[tod]=seq
  print('lit posts (on screen) at four spots along the road, DAY:', res['day'])
  print('lit posts (on screen) at four spots along the road, NIGHT:', res['night'])
  ok=all(len(x)==0 for x in res['day']) and all(len(x)<=1 for x in res['night']) and sum(len(x) for x in res['night'])>=2
  print('by day none lit; at night at most one lit at a time and it moves on:', ok)
  # cliff door lamp
  pg.evaluate("window.__tod='night'; WORLD.enter('route-mf-cliff'); WORLD.setPaused(true)"); pg.wait_for_timeout(100)
  pg.evaluate("(()=>{const o=WORLD.map.objects.find(q=>q.always);WORLD.setPos((o.x+0.5)*32,(o.y+2.5)*32)})()")
  for _ in range(45): pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(40)
  print('cliff door lamp lit at night:', pg.evaluate("(APP.lampLevels()[WORLD.map.objects.find(q=>q.always).id]||0)>0.5"))
  print('errors:', errs or 'none'); b.close()
