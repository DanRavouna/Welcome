# Ambient drift (the last wind layer): leaves ride the wind in the moss country and embers rise in the fire lands, only while the map's wind blows; nothing drifts in the cold; chimney smoke rises from the houses that keep a fire (Sproutvale, Cinderport) and from none in Frosthold; Reduce motion stops it all.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,settings:Object.assign({},APP.game.state.settings,{calm:false,ambient:true})}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; window.__weather='clear'; document.getElementById('starter').hidden=true; document.getElementById('dlg').hidden=true")
  def visible(kind, m, wind, secs=2.2):
    pg.evaluate("([m,w])=>{window.__wind=w;WORLD.enter(m);WORLD.setPaused(false)}",[m,wind]); pg.wait_for_timeout(int(secs*1000))
    return pg.evaluate("(k)=>AMBIENT._list().filter(a=>a.kind===k&&a.vis>0.5).length",kind)
  check('leaves in Moss Forest when the wind blows', visible('leaf','moss',0.8)>=6, visible('leaf','moss',0.8))
  check('no leaves in Moss Forest in still air', visible('leaf','moss',0)==0, visible('leaf','moss',0))
  check('embers in Ember Fields when the wind blows', visible('ember','ember',0.8)>=6, visible('ember','ember',0.8))
  check('nothing drifts in Frost Peaks even in a gale', pg.evaluate("([m,w])=>{window.__wind=w;WORLD.enter(m);WORLD.setPaused(false);return AMBIENT.listFor(m).filter(x=>x[0]==='leaf'||x[0]==='ember').length}",['frost',1.0])==0)
  # leaves travel east with the wind
  pg.evaluate("window.__wind=0.8;WORLD.enter('moss');WORLD.setPaused(false)"); pg.wait_for_timeout(1500)
  xs=pg.evaluate("""()=>new Promise(res=>{const a=AMBIENT._list().filter(q=>q.kind==='leaf').map(q=>q.x);setTimeout(()=>{const b=AMBIENT._list().filter(q=>q.kind==='leaf').map(q=>q.x);res(a.map((x,i)=>b[i]-x))},1000)})""")
  moved=[d for d in xs if abs(d)<300]
  check('leaves drift east (positive x over one second)', moved and sum(1 for d in moved if d>10)>=len(moved)*0.8, [round(d) for d in moved[:6]])
  # chimney smoke: pixels above a cottage chimney change over time in town, none in Frosthold
  def smoke(m):
    pg.evaluate("([m])=>{window.__wind=0.4;WORLD.enter(m);WORLD.setPaused(false);const p=WORLD.map.places.find(q=>q.open==='house'||q.id==='home');WORLD.setPos((p.x+p.w/2)*32,(p.y+p.h+3)*32)}",[m]); pg.wait_for_timeout(400)
    return pg.evaluate("""()=>{const cv=document.querySelector('canvas'),g=cv.getContext('2d'),p=WORLD.map.places.find(q=>q.open==='house'||q.id==='home');const grab=()=>{WORLD.drawNow();const c=WORLD.debug().cam;const x=Math.round(((p.x+p.w)*32-30-c.cx)*devicePixelRatio),y=Math.round((p.y*32-34-c.cy)*devicePixelRatio);return g.getImageData(Math.max(0,x),Math.max(0,y),60*devicePixelRatio,34*devicePixelRatio).data};
      const A=grab();return new Promise(res=>setTimeout(()=>{const B=grab();let n=0;for(let i=0;i<A.length;i+=4)if(Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2])>30)n++;res(n)},600))}""")
  check('smoke moves above a Sproutvale chimney', smoke('town')>20, smoke('town'))
  check('no smoke above a Frosthold longhouse (what is kept cold)', smoke('frosthold')==0, smoke('frosthold'))
  check('smoke above a Cinderport forge house', smoke('cinderport')>20, smoke('cinderport'))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:true})})"); pg.wait_for_timeout(200)
  check('Reduce motion: no smoke', smoke('town')==0, smoke('town'))
  check('no page errors', not errs, errs); b.close()
done()
