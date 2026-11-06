# Type verbs, Frost and Ember (Meaning: Frost is stillness, Ember is the fire that has to be fed). Frost's Deep Freeze: a ring of ice forms while you stand still and widens over REAL time, holds and chills what it touches, the first step shatters it. Ember's Scorch: hold to feed the flame, release a cone that burns; a tap is a puff. Timed against the clock.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noTransition=true")
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("(()=>{const o=WORLD.setPaused; WORLD.setPaused=(v)=>{ if(v) window.__pauseStack=new Error().stack.split('\\n').slice(1,4).join(' | '); return o(v); }})()")
  seeds=pg.evaluate("(()=>{const g=APP.game,o={};for(let s=1;s<200000&&!(o.Frost&&o.Ember);s+=13){const k=g.make(s,3);if(!o[k.element.name]&&k.rarity!=='Mythic')o[k.element.name]=s;}return o})()")
  def lead(seed):
    pg.evaluate("(s)=>{APP.game.update({caught:[{seed:s,stage:3,lv:20}],party:[s],fighter:s,intro:true,hints:['party','shop','evolve','weather','zone','grass','keep','battle','online']}); WORLD.enter('moss'); WORLD.setPaused(false)}", seed); pg.wait_for_timeout(500)
    for _ in range(8):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
    pg.evaluate("document.getElementById('starter').hidden=true; document.getElementById('title').hidden=true; WORLD.setPaused(false)"); pg.wait_for_timeout(1000)
    pg.evaluate("WORLD.npcs.forEach(n=>{n.declined=true}); ACT.clear(); WORLD.setPos(16*32,14*32); WORLD.input.jx=0; WORLD.input.jy=0; WORLD.setPaused(false)"); pg.wait_for_timeout(300)   # trainers look away: a challenge would pause the world
    check('the world runs (nothing left it paused)', not pg.evaluate("WORLD.paused"), pg.evaluate("({dlg:!!APP.dialog, tr:WORLD.transitioning, open:['screen','menu','wmap','bk','dev','cf','dlg','starter','title','party','bag','shop','hud'].filter(id=>document.getElementById(id)&&!document.getElementById(id).hidden), toast:document.getElementById('toast').textContent.slice(0,50), stack:window.__pauseStack})"))
  def foes_at(dx):   # two wild critters placed beside the hero, standing still
    pg.evaluate("(dx)=>{ACT.clear(); ACT.spawn(2,'Moss',false); const o=ACT.heroPos?ACT.heroPos():WORLD.pos(); ACT.enemies.forEach((m,i)=>{m.x=o.x+dx*32; m.y=o.y+(i?20:-20); m.hx=m.x; m.hy=m.y; m.mode='idle'; m.cd=99; m.tele=0; m.s.hp=m.s.max=600;});}", dx); pg.wait_for_timeout(100)
  # ---- Frost ----
  lead(seeds['Frost']); check('a Frost critter leads', pg.evaluate("ACT.hero.k.element.name")=='Frost')
  foes_at(1.4); pg.evaluate("ACT.setSel(3)")
  check('pressing the special starts the stillness verb', pg.evaluate("ACT.attack() && ACT.verb() && ACT.verb().kind==='frost'"), pg.evaluate("ACT.verb()"))
  log=pg.evaluate("""()=>new Promise(res=>{const t0=performance.now(),out=[];const tick=()=>{const v=ACT.verb();out.push([Math.round(performance.now()-t0), v?+v.r.toFixed(2):null, ACT.foes().filter(f=>f.frozen).length]);if(performance.now()-t0<1500)setTimeout(tick,100);else res(out)};tick()})""")
  rs=[r for t,r,f in log if r is not None]
  check('the ring widens over real time while you stand still (monotonic, about 1 tile per second)', len(rs)>=10 and all(rs[i]>=rs[i-1] for i in range(1,len(rs))) and 1.6<=rs[-1]<=2.3, [rs[0], rs[-1]])
  placed=lambda: pg.evaluate("ACT.foes().filter(f=>f.max===600)")   # the two placed ones; a wild respawn may wander in
  check('what it touches is held (both placed critters frozen) and chilled (hp down)', len(placed())==2 and all(f['frozen'] and f['hp']<600 for f in placed()), placed())
  check('no other attack while the ring stands', not pg.evaluate("ACT.setSel(0), ACT.attack()"))
  pg.evaluate("ACT.setSel(3); WORLD.input.jx=1"); pg.wait_for_timeout(250); pg.evaluate("WORLD.input.jx=0")
  check('the first step shatters it', pg.evaluate("ACT.verb()") is None)
  # ---- Ember ----
  lead(seeds['Ember']); check('an Ember critter leads', pg.evaluate("ACT.hero.k.element.name")=='Ember')
  foes_at(1.6); pg.evaluate("ACT.setSel(3); WORLD.input.jx=0.01"); pg.wait_for_timeout(60); pg.evaluate("WORLD.input.jx=0")   # face right
  pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)   # the cooldown from the Frost ring carries over the lead change
  hp0=[f['hp'] for f in placed()]
  check('a tap is a puff: it starts and ends a charge of 0', pg.evaluate("ACT.chargeable() && ACT.chargeStart() && ACT.verb().kind==='ember'") and pg.evaluate("ACT.chargeEnd()") , None)
  pg.wait_for_timeout(200); hp1=[f['hp'] for f in placed()]; puff=hp0[0]-hp1[0]
  pg.evaluate("ACT.enemies.forEach(m=>{m.cd=99})"); pg.wait_for_timeout(2600)   # cooldown
  check('the flame is fed while the button is held (charge rises over real time)', pg.evaluate("ACT.chargeStart()") and pg.evaluate("""()=>new Promise(res=>{const a=[];const t0=performance.now();const tick=()=>{a.push(ACT.verb()?ACT.verb().charge:null);if(performance.now()-t0<1300)setTimeout(tick,120);else res(a.every((x,i)=>x!==null&&(i===0||x>=a[i-1]))&&a[a.length-1]>=0.9)};tick()})"""))
  foes=[f['hp'] for f in placed()]; pg.evaluate("ACT.chargeEnd()"); pg.wait_for_timeout(200); hp2=[[f['hp'],f['burn']] for f in placed()]
  fed=foes[0]-hp2[0][0]
  check('released fed, the cone hits far harder than the puff and burns', fed>=puff*2 and fed>0 and all(b>0 for h,b in hp2), [puff, fed, hp2])
  check('no page errors', not errs, errs); b.close()
done()
