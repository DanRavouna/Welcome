# Type verbs (Meaning: Frost is stillness, Ember the fire that has to be fed, Tide what comes back, Moss tending, Volt the wind that passes through, Dusk the dark you step into, Stone what is kept, Bloom gives without being asked). Frost's Deep Freeze: a ring of ice forms while you stand still and widens over REAL time, holds and chills what it touches, the first step shatters it. Ember's Scorch: hold to feed the flame, release a cone that burns; a tap is a puff. Timed against the clock.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noTransition=true")
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("(()=>{const o=WORLD.setPaused; WORLD.setPaused=(v)=>{ if(v) window.__pauseStack=new Error().stack.split('\\n').slice(1,4).join(' | '); return o(v); }})()")
  seeds=pg.evaluate("(()=>{const g=APP.game,o={};for(let s=1;s<400000&&!(o.Frost&&o.Ember&&o.Tide&&o.Moss&&o.Volt&&o.Dusk&&o.Stone&&o.Bloom);s+=13){const k=g.make(s,3);if(!o[k.element.name]&&k.rarity!=='Mythic')o[k.element.name]=s;}return o})()")
  def lead(seed):
    pg.evaluate("(s)=>{APP.game.update({caught:[{seed:s,stage:3,lv:20}],party:[s],fighter:s,intro:true,hints:['party','shop','evolve','weather','zone','grass','keep','battle','online']}); WORLD.enter('moss'); WORLD.setPaused(false)}", seed); pg.wait_for_timeout(500)
    for _ in range(8):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
    pg.evaluate("document.getElementById('starter').hidden=true; document.getElementById('title').hidden=true; WORLD.setPaused(false)"); pg.wait_for_timeout(1000)
    pg.evaluate("WORLD.npcs.forEach(n=>{n.declined=true}); ACT.clear(); WORLD.setPos(16*32,14*32); WORLD.input.jx=0; WORLD.input.jy=0; WORLD.setPaused(false)"); pg.wait_for_timeout(300)   # trainers look away: a challenge would pause the world
    check('the world runs (nothing left it paused)', not pg.evaluate("WORLD.paused"), pg.evaluate("({dlg:!!APP.dialog, tr:WORLD.transitioning, open:['screen','menu','wmap','bk','dev','cf','dlg','starter','title','party','bag','shop','hud'].filter(id=>document.getElementById(id)&&!document.getElementById(id).hidden), toast:document.getElementById('toast').textContent.slice(0,50), stack:window.__pauseStack})"))
  def foes_at(dx, elem='Moss'):   # two wild critters placed beside the hero, standing still (Tide where a first hit must not be softened: Moss's Thick Bark takes 30% off the first hit)
    pg.evaluate("([dx,elem])=>{ACT.clear(); ACT.spawn(2,elem,false); const o=ACT.heroPos?ACT.heroPos():WORLD.pos(); ACT.enemies.forEach((m,i)=>{m.x=o.x+dx*32; m.y=o.y+(i?20:-20); m.hx=m.x; m.hy=m.y; m.mode='idle'; m.cd=99; m.tele=0; m.s.hp=m.s.max=600;});}", [dx, elem]); pg.wait_for_timeout(100)
  # ---- Frost ----
  lead(seeds['Frost']); check('a Frost critter leads', pg.evaluate("ACT.hero.k.element.name")=='Frost')
  foes_at(1.4); pg.evaluate("ACT.setSel(3)")
  check('pressing the special starts the stillness verb', pg.evaluate("ACT.attack() && ACT.verb() && ACT.verb().kind==='frost'"), pg.evaluate("ACT.verb()"))
  log=pg.evaluate("""()=>new Promise(res=>{const t0=performance.now(),out=[];const tick=()=>{const v=ACT.verb();out.push([Math.round(performance.now()-t0), v?+v.r.toFixed(2):null, ACT.foes().filter(f=>f.frozen).length]);if(performance.now()-t0<1500)setTimeout(tick,100);else res(out)};tick()})""")
  rs=[r for t,r,f in log if r is not None]
  check('the ring widens over real time while you stand still (monotonic, about 1 tile per second)', len(rs)>=10 and all(rs[i]>=rs[i-1] for i in range(1,len(rs))) and 1.6<=rs[-1]<=2.3, [rs[0], rs[-1]])
  placed=lambda: pg.evaluate("ACT.foes().filter(f=>f.max===600)")   # the two placed ones; a wild respawn may wander in
  check('what it touches is held (both placed critters frozen) and chilled (hp down)', len(placed())==2 and all(f['frozen'] and f['hp']<600 for f in placed()), placed())
  if pg.evaluate("APP.build")=='review':   # the review copy (11's item 13): a verb keeps its own cooldown (st.vcd) and never costs the quick slash
    cd0=pg.evaluate("ACT.cd()"); hit=pg.evaluate("ACT.setSel(0), ACT.attack()")
    check('review copy: the quick slash fires while the ring stands (the verb never set its cooldown), and the ring stays', cd0==0 and hit and (pg.evaluate("ACT.verb()") or {}).get('kind')=='frost', [cd0, hit, pg.evaluate("ACT.verb()")])
  else:
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
  # ---- Tide ----
  lead(seeds['Tide']); check('a Tide critter leads', pg.evaluate("ACT.hero.k.element.name")=='Tide')
  pg.evaluate("ACT.setSel(3); WORLD.input.jx=1"); pg.wait_for_timeout(120); pg.evaluate("WORLD.input.jx=0"); pg.wait_for_timeout(200)   # face right
  foes_at(2.2); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)
  d0=pg.evaluate("(()=>{const p=WORLD.pos();return ACT.foes().filter(f=>f.max===600).map(f=>Math.hypot(f.x-p.x,f.y-p.y)/32)})()")
  check('the wave goes out ahead and finds the two critters', pg.evaluate("ACT.attack()") and all(f['weak']>0 for f in placed()), placed())
  pg.wait_for_timeout(700)
  d1=pg.evaluate("(()=>{const p=WORLD.pos();return ACT.foes().filter(f=>f.max===600).map(f=>Math.hypot(f.x-p.x,f.y-p.y)/32)})()")
  check('it comes back with them: both dragged from about 2.2 tiles to about 1, soaked (weakened) and hurt', all(d<1.5 for d in d1) and all(d>1.8 for d in d0) and all(f['hp']<600 for f in placed()), [d0, d1])
  # ---- Moss ----
  lead(seeds['Moss']); check('a Moss critter leads', pg.evaluate("ACT.hero.k.element.name")=='Moss')
  foes_at(1.5); pg.evaluate("ACT.setSel(3); ACT.enemies.forEach(m=>{m.mode='chase'}); ACT.hero.hp=Math.round(ACT.hero.max*0.5)"); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)
  x0=pg.evaluate("ACT.foes().filter(f=>f.max===600).map(f=>[f.x,f.y])"); h0=pg.evaluate("ACT.hero.hp")
  check('roots take the nearest critter: it is held and drained', pg.evaluate("ACT.attack()") and sum(1 for f in placed() if f['rooted'])==1 and any(f['sap']>0 for f in placed()), placed())
  pg.wait_for_timeout(1200)
  x1=pg.evaluate("ACT.foes().filter(f=>f.max===600).map(f=>[f.x,f.y])"); rooted=[f for f in placed() if f['rooted']]
  moved=[abs(a[0]-b[0])+abs(a[1]-b[1]) for a,b in zip(x0,x1)]
  check('the rooted one does not step while the roots hold (it was chasing)', rooted and min(moved)<2, [moved, [f['rooted'] for f in placed()]])
  check('staying beside what the roots hold feeds you back (hp rose)', pg.evaluate("ACT.hero.hp")>h0, [h0, pg.evaluate("ACT.hero.hp")])
  # ---- Volt ----
  lead(seeds['Volt']); check('a Volt critter leads', pg.evaluate("ACT.hero.k.element.name")=='Volt')
  pg.evaluate("ACT.setSel(3); WORLD.input.jx=1"); pg.wait_for_timeout(120); pg.evaluate("WORLD.input.jx=0"); pg.wait_for_timeout(200)
  pg.evaluate("ACT.clear(); ACT.spawn(2,'Moss',false); const o=WORLD.pos(); ACT.enemies.forEach((m,i)=>{m.x=o.x+(i?2.2:1.2)*32; m.y=o.y; m.hx=m.x; m.hy=m.y; m.mode='idle'; m.cd=99; m.tele=0; m.s.hp=m.s.max=600;})"); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)
  x0=pg.evaluate("WORLD.pos().x/32")
  log=pg.evaluate("""()=>new Promise(res=>{const ok=ACT.attack();const t0=performance.now(),out=[];const tick=()=>{out.push([Math.round(performance.now()-t0), +(WORLD.pos().x/32).toFixed(2), !!ACT.verb()]);if(performance.now()-t0<500)setTimeout(tick,40);else res({ok,out})};tick()})""")
  xs=[x for t,x,v in log['out']]
  check('the dash crosses about three tiles in about a third of a second, over real time', log['ok'] and xs[-1]-x0>=2.4 and all(xs[i]>=xs[i-1] for i in range(1,len(xs))) and not log['out'][-1][2], [x0, xs[-1], len(xs)])
  check('what it passed through is dazed and hurt, and pushed aside', all(f['daze']>0 and f['hp']<600 for f in placed()), placed())
  # ---- Dusk ----
  lead(seeds['Dusk']); check('a Dusk critter leads', pg.evaluate("ACT.hero.k.element.name")=='Dusk')
  foes_at(1.0, 'Tide'); pg.evaluate("ACT.enemies.splice(1); ACT.setSel(3)"); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)   # one critter, so both blows land on the same defence
  check('the veil falls: the critter is drawn faint', pg.evaluate("ACT.attack() && ACT.veiled() && ACT.veilAlpha()<1"))
  h0=pg.evaluate("ACT.hero.hp"); pg.evaluate("ACT.enemies.forEach(m=>{m.mode='chase'; m.cd=0; m.tele=0; m.kind='melee'})"); pg.wait_for_timeout(700); h1=pg.evaluate("ACT.hero.hp")
  check('what hunts it has lost it: a bite from a tile away does nothing while veiled', h1==h0, [h0, h1])
  pg.evaluate("ACT.enemies.forEach(m=>{m.cd=99})"); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)
  hp0=[f['hp'] for f in placed()]; print('dusk: veiled before the blow', pg.evaluate("ACT.veiled()"), '| blow accepted', pg.evaluate("ACT.setSel(0); ACT.attack()")); pg.wait_for_timeout(60); print('dusk: veiled 60 ms in', pg.evaluate("ACT.veiled()")); pg.wait_for_timeout(340); hp1=[f['hp'] for f in placed()]; dark=max(a-b for a,b in zip(hp0,hp1)); print('dusk: veiled after', pg.evaluate("ACT.veiled()"), '| cd', pg.evaluate("ACT.cdFrac()"))
  check('the first blow out of the dark lands and ends the veil', dark>0 and not pg.evaluate("ACT.veiled()"), [dark, pg.evaluate("ACT.veiled()")])
  pg.wait_for_function("ACT.cdFrac()===0", timeout=8000); pg.evaluate("(()=>{const o=WORLD.pos();ACT.enemies.forEach(m=>{m.x=o.x+32;m.y=o.y-20;m.hx=m.x;m.hy=m.y;m.kx=0;m.ky=0;});})()"); pg.wait_for_timeout(150)   # the dark blow knocked it back: put it beside the critter again for the plain blow
  hp2=[f['hp'] for f in placed()]; pg.evaluate("ACT.attack()"); pg.wait_for_timeout(400); hp3=[f['hp'] for f in placed()]; plain=max(a-b for a,b in zip(hp2,hp3))
  check('it lands far harder than the same blow in the open (1.8x, with the roll of 0.85 to 1.15 on each)', plain>0 and dark>=plain*1.3, [dark, plain])
  # ---- Stone ----
  lead(seeds['Stone']); check('a Stone critter leads', pg.evaluate("ACT.hero.k.element.name")=='Stone')
  pg.evaluate("ACT.setSel(3); WORLD.input.jx=1"); pg.wait_for_timeout(120); pg.evaluate("WORLD.input.jx=0"); pg.wait_for_timeout(200)
  pg.evaluate("ACT.clear(); ACT.spawn(1,'Volt',false); const o=WORLD.pos(); ACT.enemies.forEach((m)=>{m.x=o.x+3.2*32; m.y=o.y; m.hx=m.x; m.hy=m.y; m.mode='chase'; m.kind='melee'; m.cd=0; m.tele=0; m.s.hp=m.s.max=600;})"); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)
  h0=pg.evaluate("ACT.hero.hp")
  check('the wall is set on the tile you face', pg.evaluate("ACT.attack() && ACT.walls().length===1 && ACT.walls()[0].tx===Math.floor(WORLD.pos().x/32)+1"), pg.evaluate("ACT.walls()"))
  pg.wait_for_timeout(1800)
  d=pg.evaluate("(()=>{const p=WORLD.pos();const f=ACT.foes()[0];return f?Math.hypot(f.x-p.x,f.y-p.y)/32:null})()")
  check('a chasing critter cannot pass it: still beyond the wall (more than 1.3 tiles) after 1.8 s, and you are unhurt', d is not None and d>1.3 and pg.evaluate("ACT.hero.hp")==h0, [d, h0, pg.evaluate("ACT.hero.hp")])
  pg.evaluate("(()=>{const w=ACT.walls()[0];const o=WORLD.pos();ACT.enemies.forEach(m=>{m.x=o.x+4*32;m.y=o.y;m.kind='shoot';m.cd=0;m.tele=0.01;m.aim={x:o.x,y:o.y};}); })()")
  pg.wait_for_timeout(1500)
  check('a shot at you breaks on the wall instead (the wall has taken a hit, you have not)', pg.evaluate("ACT.walls().length===0 || ACT.walls()[0].hp<3") and pg.evaluate("ACT.hero.hp")==h0, [pg.evaluate("ACT.walls().length===0 ? 'wall broken' : 'wall hp ' + ACT.walls()[0].hp"), pg.evaluate("ACT.hero.hp")==h0])
  # ---- Bloom ----
  lead(seeds['Bloom']); check('a Bloom critter leads', pg.evaluate("ACT.hero.k.element.name")=='Bloom')
  foes_at(1.4, 'Tide'); pg.evaluate("ACT.setSel(3); ACT.enemies.forEach(m=>{m.mode='chase'; m.cd=0; m.tele=0}); ACT.hero.hp=Math.round(ACT.hero.max*0.5)"); pg.wait_for_function("ACT.cdFrac()===0", timeout=5000)
  h0=pg.evaluate("ACT.hero.hp")
  check('petals bloom around you', pg.evaluate("ACT.attack() && ACT.verb() && ACT.verb().kind==='bloom'"))
  pg.wait_for_timeout(1300)
  check('you heal while you stand in them (at least 10% in 1.3 s)', pg.evaluate("ACT.hero.hp")-h0>=pg.evaluate("ACT.hero.max")*0.1, [h0, pg.evaluate("ACT.hero.hp"), pg.evaluate("ACT.hero.max")])
  check('what came near has forgotten the fight for a moment (calm, idle)', all(f['calm'] and f['mode']=='idle' for f in placed()), placed())
  pg.wait_for_timeout(1400)
  check('the petals fade after about 2.4 s', pg.evaluate("ACT.verb()") is None)
  # ---- the heavy blow and the guard stance, every type (Bloom leads here) ----
  foes_at(1.0, 'Tide'); pg.evaluate("ACT.enemies.splice(1); ACT.setSel(1)"); pg.wait_for_function("ACT.cdFrac()===0", timeout=8000)
  taps=[]
  for i in range(5):
    pg.evaluate("(()=>{const o=WORLD.pos();ACT.enemies.splice(1);ACT.enemies.forEach(m=>{m.x=o.x+32;m.y=o.y-20;m.hx=m.x;m.hy=m.y;m.kx=0;m.ky=0;});})()"); pg.wait_for_timeout(100)   # (a wild Bloom critter that wandered in heals the target: only the placed one stays)
    h=pg.evaluate("ACT.foes()[0].hp"); pg.evaluate("ACT.attack()"); pg.wait_for_timeout(420); taps.append(h-pg.evaluate("ACT.foes()[0].hp")); pg.wait_for_function("ACT.cdFrac()===0", timeout=8000)
  check('the heavy never misses: five taps, five hits', all(t>0 for t in taps), taps)
  pg.evaluate("(()=>{const o=WORLD.pos();ACT.enemies.forEach(m=>{m.x=o.x+32;m.y=o.y-20;m.hx=m.x;m.hy=m.y;m.kx=0;m.ky=0;});})()"); pg.wait_for_timeout(100)
  h=pg.evaluate("ACT.foes()[0].hp"); check('holding the heavy feeds it (the charge rises over real time)', pg.evaluate("ACT.chargeable() && ACT.chargeStart() && ACT.verb().kind==='heavy'") and pg.evaluate("""()=>new Promise(res=>{const a=[];const t0=performance.now();const tick=()=>{a.push(ACT.verb()?ACT.verb().charge:null);if(performance.now()-t0<1300)setTimeout(tick,120);else res(a.every((x,i)=>x!==null&&(i===0||x>=a[i-1]))&&a[a.length-1]>=0.9)};tick()})"""))
  pg.evaluate("ACT.chargeEnd()"); pg.wait_for_timeout(450); fed=h-pg.evaluate("ACT.foes()[0].hp")
  check('let go fed, it lands about 2x the light tap (with the roll on each)', fed>=max(taps)*1.5 and fed>=sum(taps)/len(taps)*1.8, [fed, taps])
  # the stance
  pg.wait_for_function("ACT.cdFrac()===0", timeout=8000); pg.evaluate("ACT.setSel(2); ACT.hero.hp=ACT.hero.max; ACT.enemies.forEach(m=>{m.mode='chase'; m.kind='melee'; m.cd=0; m.tele=0; m.s.max=600; m.s.hp=600})")
  check('guard is a stance: held while the button is down', pg.evaluate("ACT.chargeStart() && ACT.stance() && ACT.hero.guard"))
  h0=pg.evaluate("ACT.hero.hp"); pg.wait_for_timeout(1300); h1=pg.evaluate("ACT.hero.hp"); guarded=h0-h1
  check('let go and it drops', pg.evaluate("ACT.chargeEnd() && !ACT.stance() && !ACT.hero.guard"))
  pg.wait_for_function("ACT.cdFrac()===0", timeout=8000); pg.evaluate("ACT.hero.hp=ACT.hero.max; ACT.enemies.forEach(m=>{m.mode='chase'; m.kind='melee'; m.cd=0; m.tele=0})"); h2=pg.evaluate("ACT.hero.hp"); pg.wait_for_timeout(1300); open_=h2-pg.evaluate("ACT.hero.hp")   # the same bites, in the open
  check('bites while standing firm cost far less than in the open', open_>0 and guarded<open_*0.7, [guarded, open_])
  pg.evaluate("ACT.enemies.forEach(m=>{m.cd=99})"); pg.wait_for_function("ACT.cdFrac()===0", timeout=8000); pg.evaluate("ACT.chargeStart()"); pg.wait_for_timeout(2900)
  check('it cannot be held forever: the stance breaks at about 2.5 s', not pg.evaluate("ACT.stance()") and not pg.evaluate("ACT.hero.guard"))
  check('no page errors', not errs, errs); b.close()
done()
