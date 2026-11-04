# Action mode phase 4: keeping a defeated enemy (same price as grass: keep cost in rolls + a sighting), offers, limits, rare patches.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,essence:100,day:new Date().toDateString(),used:0,sight:{day:new Date().toDateString(),n:0},settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false,test:false})}); APP.game.props.testMode=false; document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1300)
  box=pg.locator('#atk').bounding_box(); tap=lambda: pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2-8)
  def foeAt(hp=1):
    pg.evaluate("ACT.enemies.length||ACT.spawn(2)")
    pg.evaluate("((hp)=>{const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+2;m.y=p.y+38;m.hx=m.x;m.hy=m.y;m.mode='idle';m.cd=99;m.tele=0;m.s.hp=hp;window.__k=m.k.seed;ACT.enemies.slice(1).forEach(o=>{o.x=p.x+900;o.hx=o.x})})(%s)"%hp); pg.wait_for_timeout(60)
  def kill(): foeAt(1); tap(); pg.wait_for_timeout(520)
  st=lambda: pg.evaluate("({n:APP.game.state.caught.length, used:APP.game.state.used, sight:APP.game.state.sight.n, seen:APP.game.state.seen.length})")
  pg.wait_for_timeout(500)
  kill(); print('defeat shows a Keep offer:', pg.evaluate("[!document.getElementById('keepbar').hidden, document.querySelectorAll('#keepbar button').length]"), '|', pg.inner_text('#keepbar').replace('\n',' / ')[:90])
  a=st(); pg.locator('#keepbar button').first.click(); pg.wait_for_timeout(300); c=st()
  print('keep: critters', a['n'],'->',c['n'], '| rolls used', a['used'],'->',c['used'], '| free sighting used', a['sight'],'->',c['sight'], '| joins at', pg.evaluate("JSON.stringify(APP.game.state.caught[0])"), '| toast:', pg.inner_text('#toast')[:60])
  print('offer gone after keeping:', pg.evaluate("ACT.offers().length"))
  # sightings used up: one extra roll
  pg.evaluate("APP.game.update({sight:{day:new Date().toDateString(),n:40}})"); pg.wait_for_timeout(500)
  print('cost with no free sightings left vs with:', pg.evaluate("(()=>{const g=APP.game,k=g.make(5,1);const a=g.actKeepCost(k).cost;g.update({sight:{day:new Date().toDateString(),n:0}});return [a,g.actKeepCost(k).cost,k.rarity]})()"))
  print('shiny is free:', pg.evaluate("APP.game.actKeepCost({shiny:true,rarity:'Rare'}).cost"), '| rare costs', pg.evaluate("APP.game.actKeepCost({rarity:'Rare'}).cost"), '| mythic', pg.evaluate("APP.game.actKeepCost({rarity:'Mythic'}).cost"))
  # not enough rolls: refused, nothing changes, the offer stays
  pg.wait_for_timeout(300); pg.evaluate("APP.game.update({used:20,day:new Date().toDateString()})"); pg.wait_for_timeout(300); kill(); a=st(); pg.locator('#keepbar button').first.click(); pg.wait_for_timeout(300); c=st()
  print('no rolls left: refused:', a['n']==c['n'] and a['used']==c['used'], '| toast:', pg.inner_text('#toast')[:40], '| offer still there:', pg.evaluate("ACT.offers().length>0"))
  pg.evaluate("APP.game.update({used:0})"); pg.wait_for_timeout(200)
  # an owned seed cannot be kept twice
  print('keeping the same critter twice:', pg.evaluate("(()=>{const g=APP.game,k=g.make(g.state.caught[0].seed,1);return g.actKeep(k).why})()"))
  # at most two offers; they expire
  pg.wait_for_timeout(500); kill(); pg.wait_for_timeout(400); kill(); pg.wait_for_timeout(400); kill(); print('three defeats leave two offers:', pg.evaluate("ACT.offers().length"))
  pg.evaluate("ACT.offers().forEach(o=>o.t=0.2)"); pg.wait_for_timeout(500); print('they expire:', pg.evaluate("[ACT.offers().length, document.getElementById('keepbar').hidden]"))
  # leaving the map drops them
  pg.wait_for_timeout(300); kill(); pg.evaluate("WORLD.enter('frost'); WORLD.setPaused(false)"); pg.wait_for_timeout(600); print('changing map clears offers:', pg.evaluate("ACT.offers().length"))
  # rare patches hold rare critters
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(800)
  print('rare spawns are Rare or Mythic:', pg.evaluate("(()=>{ACT.enemies.splice(0);ACT.spawn(3,undefined,true);return ACT.enemies.map(m=>m.k.rarity)})()"))
  s=pg.evaluate("localStorage.getItem('critter-roll:v2')"); print('save keeps the kept critters:', '"stage":1' in s)
  print('errors:', errs or 'none'); b.close()
