# Rare grass in action mode (Meaning: the rare thing comes to the one who stays): stand in a sparkling patch with no wild critter near and it stirs for about 2.2 s (motes rise), then a rare critter comes out of the patch, once per visit; stepping out early lets the stir fade; re-entering the map resets it.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,essence:100,pouch:[]}); DEV.safe=true; window.__noTransition=true; window.__tod='day'; window.__weather='clear'; document.getElementById('starter').hidden=true")
  def finish():
    for _ in range(40):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1300); finish(); pg.evaluate("WORLD.setPaused(false)")
  check('action mode is on in Moss Forest', pg.evaluate("ACT.active()"))
  z=pg.evaluate("WORLD.map.rare"); check('Moss Forest has a sparkling patch', bool(z), z)
  # clear the wild critters away so none is near the patch, then stand in it
  pg.evaluate("ACT.clear()")
  def stand(): pg.evaluate("(z)=>{WORLD.setPos((z.x+1.5)*32,(z.y+1.5)*32);WORLD.input.jx=0;WORLD.input.jy=0}",z); pg.wait_for_timeout(300)
  stand()
  near=pg.evaluate("(z)=>ACT.foes().filter(f=>Math.hypot(f.x/32-(z.x+1.5),f.y/32-(z.y+1.5))<4).length",z)
  if near: pg.evaluate("(z)=>{WORLD.setPos((z.x+1.5)*32,(z.y+1.5)*32)}",z)
  log=pg.evaluate("""(z)=>new Promise(res=>{const t0=performance.now(),out=[];const tick=()=>{if(!ACT.foes().some(f=>f.woke)&&ACT.foes().some(f=>Math.hypot(f.x/32-(z.x+1.5),f.y/32-(z.y+1.5))<4))ACT.clear();out.push([Math.round(performance.now()-t0),Math.round(ACT.stir()*100)/100,ACT.foes().filter(f=>f.woke).length]);if(performance.now()-t0<4500)setTimeout(tick,100);else res(out)};tick()})""",z)
  rising=[s for t,s,w in log if s>0]
  woke=[t for t,s,w in log if w>0]
  check('standing in the patch, the stir rises (motes)', len(rising)>=5 and max(rising)>0.5, rising[:8])
  check('after about 2.2 s a rare critter comes out of the patch (1.8 to 4 s)', woke and 1800<=woke[0]<=4000, woke[:1])
  f=pg.evaluate("ACT.foes().find(f=>f.woke)")
  check('it is rare and it came out of the patch itself (within 2 tiles)', f and f['rare'] and f['rarity'] in ('Rare','Mythic') and abs(f['x']/32-(z['x']+1.5))<=2.6 and abs(f['y']/32-(z['y']+1.5))<=2.6, f)
  check('the patch is spent for this visit', pg.evaluate("ACT.stirSpent()"))
  # a fresh visit: the stir fades when you step out early
  pg.evaluate("WORLD.enter('town'); WORLD.setPaused(false)"); pg.wait_for_timeout(300); pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(600); pg.evaluate("ACT.clear()")
  check('re-entering the map resets the patch', not pg.evaluate("ACT.stirSpent()"))
  stand(); pg.wait_for_timeout(500); s1=pg.evaluate("ACT.stir()")   # step out well before 2.2 s: walk (a teleport would leave the follower parked in the patch, and the patch stirs for either of the two)
  pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=1"); pg.wait_for_timeout(900); pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(900); s2=pg.evaluate("ACT.stir()")
  check('step out early and the stir fades without anything coming out', s1>0.15 and s2<s1 and not pg.evaluate("ACT.stirSpent()"), [round(s1,2),round(s2,2),pg.evaluate("[WORLD.pos().y/32,WORLD.followerPos().y/32]")])
  check('no page errors', not errs, errs); b.close()
done()
