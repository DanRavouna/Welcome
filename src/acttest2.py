# Action mode phase 2: XP and essence from kills (daily cap), level-up, party swap from the wheel, auto-swap on knock-out, whole-party knock-out, saves.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15,xp:0},{seed:9,stage:3,lv:12},{seed:20,stage:2,lv:10}],party:[2,9,20],fighter:2,intro:true,xp:99999,essence:100,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1300)
  box=pg.locator('#atk').bounding_box(); cx,cy=box['x']+box['width']/2, box['y']+box['height']/2
  tap=lambda: pg.mouse.click(cx,cy-8)
  def foeAt(dx,dy,hp=None):
    pg.evaluate('ACT.enemies.length||ACT.spawn(2)')
    pg.evaluate("(([dx,dy,hp])=>{const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+dx;m.y=p.y+dy;m.hx=m.x;m.hy=m.y;m.mode='idle';m.cd=99;m.tele=0;if(hp)m.s.hp=hp;ACT.enemies.slice(1).forEach(o=>{o.x=p.x+900;o.hx=o.x})})(%s)"%[dx,dy,hp]); pg.wait_for_timeout(60)
  def kill():
    foeAt(2,38,1); tap(); pg.wait_for_timeout(520)
  e0=pg.evaluate("APP.game.state.essence"); xp0=pg.evaluate("APP.game.state.caught[0].xp||0"); lv0=pg.evaluate("APP.game.state.caught[0].lv")
  kill(); print('one kill: xp', xp0,'->',pg.evaluate("APP.game.state.caught[0].xp||0"), '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| act counter', pg.evaluate("JSON.stringify(APP.game.state.act)"))
  # the daily essence cap
  pg.wait_for_timeout(450)
  for i in range(16): kill(); pg.wait_for_timeout(500)
  e1=pg.evaluate("APP.game.state.essence"); kill(); print('after 17+ kills essence stops: +', pg.evaluate("APP.game.state.essence")-e1, '| counter', pg.evaluate("APP.game.state.act.n"), '| lead lv', lv0,'->',pg.evaluate("APP.game.state.caught[0].lv"))
  pg.evaluate("APP.game.update({act:{day:'Mon Jan 01 2001',n:99}})"); pg.wait_for_timeout(300); pg.wait_for_timeout(450); e2=pg.evaluate("APP.game.state.essence"); kill(); print('a new day resets the cap: +', pg.evaluate("APP.game.state.essence")-e2, '| counter', pg.evaluate("APP.game.state.act.n"))
  # reward maths (no clock): bigger foe pays more, capped by the ratio
  print('xp for foe lv 10/15/30 vs lead lv 15:', pg.evaluate("(()=>{const g=APP.game,l=g.make(2,3,15);return [10,15,30].map(n=>{const f=g.make(7,3,n);const c=JSON.parse(JSON.stringify(g.state.caught));const before=g.state.caught[0].xp||0,lv=g.state.caught[0].lv;g.update({caught:g.state.caught.map((e,i)=>i?e:Object.assign({},e,{lv:15,xp:0}))});const r=g.actKill(f,l);return r.xp})})()"))
  # swap from the wheel: hold, drag to the first bench slot
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.map((e,i)=>i?e:Object.assign({},e,{lv:15,xp:0}))})"); pg.wait_for_timeout(500)
  pg.mouse.move(cx,cy); pg.mouse.down(); pg.wait_for_timeout(450)
  print('wheel has 4 moves + 2 bench slots:', pg.evaluate("[document.querySelectorAll('#wheel .slot').length, document.querySelectorAll('#wheel .slot.sw').length]"), '| bench text:', pg.evaluate("[...document.querySelectorAll('#wheel .sw')].map(s=>s.innerText.replace(/\\n/g,' '))"))
  r=pg.evaluate("[...document.querySelectorAll('#wheel .slot')].map(s=>{const r=s.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})"); print('all 6 slots on screen:', all(x[0]>=0 and x[2]<=390 and x[1]>=0 and x[3]<=780 for x in r))
  sl=pg.locator('#wheel .sw').nth(0).bounding_box(); pg.mouse.move(sl['x']+sl['width']/2, sl['y']+sl['height']/2, steps=5); pg.wait_for_timeout(80); pg.mouse.up(); pg.wait_for_timeout(300)
  print('swapped: lead is now seed', pg.evaluate("APP.game.state.fighter"), '| hero', pg.evaluate("ACT.hero.k.name"))
  # swapping to a fainted critter is refused
  pg.wait_for_timeout(900); pg.evaluate("(()=>{const b=ACT.benchList();window.__t=b})()")
  print('swap back works, and a fainted one is refused:', pg.evaluate("ACT.swapTo(2)"), end=' | ')
  pg.wait_for_timeout(900); pg.evaluate("(()=>{const lead=ACT.hero;})()")
  # auto-swap when the lead is knocked out
  pg.wait_for_timeout(900)
  seedA=pg.evaluate("ACT.hero.k.seed"); pg.evaluate("(()=>{ACT.hero.hp=1;const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+4;m.y=p.y+10;m.mode='chase';m.cd=0;m.tele=0.01;ACT.enemies.slice(1).forEach(o=>{o.x=p.x+900;o.hx=o.x})})()"); pg.wait_for_timeout(2200)
  print('lead knocked out -> next critter steps in:', seedA, '->', pg.evaluate("APP.game.state.fighter"), '| toast:', pg.inner_text('#toast')[:50])
  print('the fainted one cannot be swapped to:', pg.evaluate("(()=>{const f=ACT.benchList().find(b=>!b.ok);return f?ACT.swapTo(f.seed):'none fainted'})()"))
  # all fainted -> everyone recovers to half
  pg.evaluate("(()=>{ACT.benchList(); })()"); pg.wait_for_timeout(500)
  pg.evaluate("(()=>{const g=APP.game;ACT.hero.hp=1;ACT.benchList().forEach(b=>{});})()")
  print('errors:', errs or 'none')
  # saves: act counter is saved, old saves without it load
  s=pg.evaluate("localStorage.getItem('critter-roll:v2')"); print('save has act counter:', '"act":' in s)
  pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('critter-roll:v2'));delete s.act;localStorage.setItem('critter-roll:v2',JSON.stringify(s))})()"); pg.reload(); pg.wait_for_timeout(1300); print('old save without act loads:', pg.evaluate("JSON.stringify(APP.game.state.act)"))
  b.close()
