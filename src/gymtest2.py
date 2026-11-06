# The three other gym trials, each the act that carries its meaning, timed over real time: Glacia (stillness: ice forms around you only while you stand still, melts behind you when you move, the plate under you never melts; the far shore freezes the pool for good), Blaze (the fire that has to be fed: carry one log at a time, braziers burn down in about 14 s, all three alight at once opens the way), Coral (answering across the dark: lamps call in an order, you touch them in that order, three rounds, a wrong touch replays and loses nothing). Leaders wait inside; old saves find the way open; nothing explains the rule.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]},adv:{clues:[],open:{},flags:{}}}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  reach=lambda: pg.evaluate("""()=>{const M=WORLD.map,walk=(x,y)=>x>=0&&y>=0&&x<M.W&&y<M.H&&'.,=WZG'.includes(M.grid[y][x]);const seen=new Set(),q=[[10,M.H-2]];seen.add(q[0].join());while(q.length){const [x,y]=q.shift();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const k=(x+dx)+','+(y+dy);if(!seen.has(k)&&walk(x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy])}})}return seen.has('10,4')}""")
  def at(x,y): pg.evaluate("([x,y])=>WORLD.setPos((x+0.5)*32,(y+0.5)*32)",[x,y]); pg.wait_for_timeout(150)
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(120)
  texts=lambda: pg.evaluate("WORLD.map.objects.map(o=>o.text||'').join(' | ')").lower()
  for id,cid in [('glacia','frosthold'),('blaze','cinderport'),('coral','coralbay')]:
    check(id+' waits in the hall, not the plaza', pg.evaluate("([id,cid])=>!(WORLD.allNpcs()[cid]||[]).some(n=>n.id===id) && (WORLD.allNpcs()['gym-'+id]||[]).some(n=>n.id===id)",[id,cid]))
    check(cid+"'s gym door leads inside", pg.evaluate("([id,cid])=>WORLD.MAPS[cid].places.find(p=>p.id==='gym-'+id).enter",[id,cid])=='gym-'+id)
  # ================= Glacia: stillness =================
  pg.evaluate("WORLD.enter('gym-glacia');WORLD.setPaused(false)"); pg.wait_for_timeout(400)
  check('Glacia: no object text tells the rule', not any(w in texts() for w in ['still','wait','stand','move','ice forms','must']), texts())
  check('Glacia unreachable: black water lies between', not reach())
  at(10,15)   # the near shore, just below the pool
  pg.evaluate("WORLD.input.jx=1"); pg.wait_for_timeout(700)   # walk a little
  check('nothing freezes while you move', pg.evaluate("APP.ice().length")==0, pg.evaluate("APP.ice().length"))
  log=pg.evaluate("""()=>new Promise(res=>{WORLD.input.jx=0;const t0=performance.now(),out=[];const tick=()=>{out.push([Math.round(performance.now()-t0),APP.ice().length]);if(performance.now()-t0<2000)setTimeout(tick,50);else res(out)};tick()})""")   # the clock starts the moment you stop
  first=[t for t,n in log if n>0]
  check('standing still: ice forms around you after about 0.8 s (0.6 to 1.4 s)', first and 600<=first[0]<=1400, first[:1])
  ice=pg.evaluate("APP.ice()"); px=pg.evaluate("[Math.floor(WORLD.pos().x/32),Math.floor(WORLD.pos().y/32)]")
  check('the plates are the water cells next to you', ice and all(max(abs(c[0]-px[0]),abs(c[1]-px[1]))<=1 for c in ice), ice)
  check('a plate is walkable floor now', pg.evaluate("(c)=>WORLD.map.grid[c[1]][c[0]]",ice[0])=='.')
  at(ice[0][0], ice[0][1]); pg.wait_for_timeout(1200)   # step onto a plate and stand
  ice2=pg.evaluate("APP.ice()"); check('standing on the plate, the next ring forms ahead', len(ice2)>len(ice), [len(ice),len(ice2)])
  pg.evaluate("WORLD.input.jy=1"); pg.wait_for_timeout(500); pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(250)   # walk back toward the shore
  px2=pg.evaluate("[Math.floor(WORLD.pos().x/32),Math.floor(WORLD.pos().y/32)]"); ice3=pg.evaluate("APP.ice()")
  check('moving melts the plates that are no longer beside you', len(ice3)<len(ice2) and all(max(abs(c[0]-px2[0]),abs(c[1]-px2[1]))<=1 for c in ice3), [len(ice2),len(ice3)])
  check('a melted plate is water again', pg.evaluate("(cs)=>cs.filter(c=>WORLD.map.grid[c[1]][c[0]]==='~').length",[c for c in ice2 if c not in ice3])==len([c for c in ice2 if c not in ice3]))
  # cross the pool: stand, wait, step north, repeat
  at(10,15); y=15
  for step in range(9):
    pg.wait_for_timeout(1100); ic=pg.evaluate("APP.ice()")
    nxt=[c for c in ic if c[0]==10 and c[1]==y-1] or (pg.evaluate("(y)=>WORLD.map.grid[y][10]==='.' && y<WORLD.map.pool[1]",y-1) and [[10,y-1]])   # a plate ahead, or the far shore itself
    if nxt: at(10,y-1); y-=1
    if pg.evaluate("!!APP.game.state.adv.flags['gym:glacia']"): break
  check('crossing by stopping and stepping reaches the far shore and the pool freezes for good', pg.evaluate("!!APP.game.state.adv.flags['gym:glacia']") and pg.evaluate("(()=>{const M=WORLD.map;for(let y=M.pool[1];y<=M.pool[3];y++)for(let x=M.pool[0];x<=M.pool[2];x++)if(M.grid[y][x]!=='.')return false;return true})()"), y)
  check('Glacia can be reached now', reach())
  # ================= Blaze: the fire that has to be fed =================
  pg.evaluate("WORLD.enter('gym-blaze');WORLD.setPaused(false)"); pg.wait_for_timeout(400)
  check('Blaze: no object text tells the rule', not any(w in texts() for w in ['feed','carry','three','at once','must','keep it']), texts())
  check('Blaze unreachable: cold slag across the way', not reach())
  fires=pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='gbrazier').map(o=>[o.id,o.x,o.y])"); wood=pg.evaluate("(()=>{const o=WORLD.map.objects.find(q=>q.kind==='woodpile');return [o.x,o.y]})()")
  at(fires[0][1], fires[0][2]+1); press(); check('feeding without a log does nothing but tell you it is cold', 'cold' in pg.inner_text('#toast') and pg.evaluate("APP.burn()")=={} , pg.inner_text('#toast'))
  at(wood[0], wood[1]-1); check('by the woodpile the action is Take a log', pg.inner_text('#act-label')=='Take a log'); press(); check('you carry a log', pg.evaluate("APP.carry()"))
  press(); check('only one at a time', 'already' in pg.inner_text('#toast'))
  at(fires[0][1], fires[0][2]+1); check('by a brazier the action is Feed the fire', pg.inner_text('#act-label')=='Feed the fire'); press()
  check('the fire takes the log and you carry none', pg.evaluate("APP.carry()")==False and pg.evaluate("APP.burn()")[fires[0][0]]>0.9)
  log=pg.evaluate("""([id])=>new Promise(res=>{const t0=performance.now(),out=[];const tick=()=>{out.push([Math.round(performance.now()-t0),Math.round(APP.burn()[id]*100)/100]);if(performance.now()-t0<3000)setTimeout(tick,100);else res(out)};tick()})""",[fires[0][0]])
  check('it burns down over time (about 1/14 a second)', 0.72<=log[-1][1]<=0.86, log[-1])
  for f in fires[1:]:
    at(wood[0], wood[1]-1); press(); at(f[1], f[2]+1); press()
  check('with all three alight at once the slag cracks and the flag is saved', pg.evaluate("!!APP.game.state.adv.flags['gym:blaze']") and reach(), pg.evaluate("APP.burn()"))
  # a fresh attempt where you dawdle: the first fire is out before the third is fed
  pg.evaluate("APP.game.update({adv:{clues:[],open:{},flags:{'gym:glacia':true}}}); WORLD.enter('cinderport'); WORLD.enter('gym-blaze'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  at(wood[0], wood[1]-1); press(); at(fires[0][1], fires[0][2]+1); press(); pg.wait_for_timeout(15500)
  check('a fire left alone for 15 s is out again (the fire has to be fed)', pg.evaluate("APP.burn()")[fires[0][0]]==0 and not pg.evaluate("!!APP.game.state.adv.flags['gym:blaze']"), pg.evaluate("APP.burn()"))
  # ================= Coral: answering across the dark =================
  pg.evaluate("APP.game.update({adv:{clues:[],open:{},flags:{'gym:glacia':true,'gym:blaze':true}}}); WORLD.enter('gym-coral'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  check('Coral: the hall is dark and no object text tells the rule', pg.evaluate("!!WORLD.map.dark") and not any(w in texts() for w in ['order','repeat','answer','touch them','same','must']), texts())
  check('Coral unreachable: a chain across the way', not reach())
  lamps=pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='callamp').sort((a,b)=>a.n-b.n).map(o=>[o.x,o.y])")
  # watch the call: which lamp is lit over time, in order
  seen=pg.evaluate("""()=>new Promise(res=>{const t0=performance.now(),out=[];const tick=()=>{const c=APP.coral();const lit=Object.keys(c.lit).filter(k=>c.lit[k]>0.5).map(Number);out.push([c.phase,lit]);if(performance.now()-t0<4500)setTimeout(tick,60);else res(out)};tick()})""")
  order=[]; 
  for ph,lit in seen:
    if ph=='call' and len(lit)==1 and (not order or order[-1]!=lit[0]): order.append(lit[0])
  seq=pg.evaluate("APP.coralSeq[0]")
  check('the lamps call in an order, one at a time', order==seq, [order,seq])
  check('then the hall listens', pg.evaluate("APP.coral().phase")=='listen')
  def touch(n): at(lamps[n][0], lamps[n][1]+1); press()
  touch(seq[1]); check('a wrong lamp: all blink, nothing lost, the call comes again', pg.evaluate("APP.coral().phase") in ('wrong','call') and pg.evaluate("APP.coral().round")==0)
  pg.wait_for_timeout(1900+len(seq)*700+700); check('listening again', pg.evaluate("APP.coral().phase")=='listen', pg.evaluate("APP.coral().phase"))
  for n in seq: touch(n)
  check('the right answer ends round 1', pg.evaluate("APP.coral().phase")=='right'); pg.wait_for_timeout(1500)
  for r in (1,2):
    sq=pg.evaluate("(r)=>APP.coralSeq[r]",r); pg.wait_for_timeout(len(sq)*700+800)
    check('round %d: one lamp longer, listening'%(r+1), pg.evaluate("APP.coral().phase")=='listen' and pg.evaluate("APP.coral().round")==r, [pg.evaluate("APP.coral().phase"),pg.evaluate("APP.coral().round")])
    for n in sq: touch(n)
    pg.wait_for_timeout(1600)
  check('three answers: the lamps stay lit, the chain falls, the flag is saved', pg.evaluate("!!APP.game.state.adv.flags['gym:coral']") and reach() and pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='callamp').every(o=>APP.game.state.adv.flags['gym:coral'])"))
  pg.evaluate("APP.talk(WORLD.allNpcs()['gym-coral'][0])"); pg.wait_for_timeout(150); check('Coral speaks', pg.evaluate("APP.dialog && APP.dialog.name")=='Admiral Coral')
  for _ in range(12):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  # ================= reload and old saves =================
  pg.reload(); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.evaluate("window.__noTransition=true;window.__noFollower=true;document.getElementById('starter')&&(document.getElementById('starter').hidden=true)")
  ok=[]
  for id in ('glacia','blaze','coral'):
    pg.evaluate("(id)=>{WORLD.enter('gym-'+id);WORLD.setPaused(false)}",id); pg.wait_for_timeout(300); ok.append(reach())
  check('after a reload all three stay open', ok==[True,True,True], ok)
  pg.evaluate("APP.game.update({npc:{done:[],beaten:{},cleared:['glacia','blaze','coral'],seals:[]},adv:{clues:[],open:{},flags:{}}})")
  ok=[]
  for id in ('glacia','blaze','coral'):
    pg.evaluate("(id)=>{WORLD.enter('town');WORLD.enter('gym-'+id);WORLD.setPaused(false)}",id); pg.wait_for_timeout(300); ok.append(reach())
  check('an old save that beat the leaders finds every way open', ok==[True,True,True], ok)
  check('no page errors', not errs, errs); b.close()
done()
