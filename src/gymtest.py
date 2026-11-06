# Wren's Gym, the trial of being tended: the gym door leads inside; Wren waits behind vines; four beds of different heights; tend the smallest first; out of order they droop and reset (nothing lost); all four in order and the vines draw back and Wren can be reached; old saves (Wren beaten or her seal) find the way open; the state survives a reload.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]},adv:{clues:[],open:{},flags:{}}}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  print('Wren no longer stands in the plaza:', pg.evaluate("!(WORLD.allNpcs().mossbrook||[]).some(n=>n.id==='wren')"), '| she waits in the gym hall:', pg.evaluate("(WORLD.allNpcs()['gym-wren']||[]).map(n=>n.id+'@'+n.x+','+n.y)"))
  # the gym door leads inside
  pg.evaluate("WORLD.enter('mossbrook');WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  door=pg.evaluate("(()=>{const g=WORLD.MAPS.mossbrook.places.find(p=>p.id==='gym-wren');return [g.enter,g.door]})()"); print('gym door leads to:', door)
  def at_obj(oid, dx=0, dy=1):
    pg.evaluate("([id,dx,dy])=>{const o=WORLD.map.objects.find(q=>q.id===id);WORLD.setPos((o.x+0.5+dx)*32,(o.y+0.5+dy)*32)}",[oid,dx,dy]); pg.wait_for_timeout(250)
  def press():
    pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(200)
  def state(): return pg.evaluate("(()=>{const f=APP.game.state.adv.flags;return [f.wg|0,!!f['gym:wren'],WORLD.map.objects.filter(o=>o.kind==='vines').every(o=>o.hidden)]})()")
  pg.evaluate("WORLD.enter('gym-wren');WORLD.setPaused(false)"); pg.wait_for_timeout(400)
  print('in the hall: tended / solved / vines gone:', state(), '| beds left to right (size):', pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='gbed').sort((a,b)=>a.x-b.x).map(o=>o.size)"))
  # reachability: the leader cannot be reached while the vines hang
  reach=lambda: pg.evaluate("""()=>{const M=WORLD.map,walk=(x,y)=>x>=0&&y>=0&&x<M.W&&y<M.H&&'.,=WZG'.includes(M.grid[y][x]);const seen=new Set(),q=[[10,17]];seen.add('10,17');while(q.length){const [x,y]=q.shift();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const k=(x+dx)+','+(y+dy);if(!seen.has(k)&&walk(x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy])}})}return seen.has('10,4')}""")
  print('Wren reachable before the trial:', reach())
  # wrong order: tend the second smallest first -> droop, reset
  at_obj('bed2'); press(); print('tend size 2 first (wrong):', state(), '| toast:', pg.inner_text('#toast'))
  at_obj('bed1'); press(); print('tend size 1:', state())
  at_obj('bed1'); press(); print('tend size 1 again (no harm):', state(), '| toast:', pg.inner_text('#toast'))
  at_obj('bed3'); press(); print('tend size 3 before 2 (wrong):', state(), '| toast:', pg.inner_text('#toast'))
  for sz in [1,2,3,4]: at_obj('bed%d'%sz); press()
  print('then 1, 2, 3, 4 in order:', state(), '| toast:', pg.inner_text('#toast'))
  print('Wren reachable after the trial:', reach())
  # Wren talks and offers the duel
  pg.evaluate("(()=>{const n=WORLD.allNpcs()['gym-wren'][0];APP.talk(n)})()"); pg.wait_for_timeout(200)
  print('Wren speaks:', pg.evaluate("(()=>{const d=document.getElementById('dlg');return d?d.innerText.replace(/\\n+/g,' / ').slice(0,90):''})()"))
  pg.evaluate("while(0){}"); 
  for _ in range(14):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(50)
  # persistence
  pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("window.__noTransition=true;window.__noFollower=true;document.getElementById('starter')&&(document.getElementById('starter').hidden=true);WORLD.enter('gym-wren');WORLD.setPaused(false)"); pg.wait_for_timeout(400)
  print('after a reload (solved, vines gone):', state(), '| reachable:', reach())
  # an old save: Wren already beaten, no trial flag
  pg.evaluate("APP.game.update({npc:{done:[],beaten:{},cleared:['wren'],seals:['wren']},adv:{clues:[],open:{},flags:{}}}); WORLD.enter('mossbrook'); WORLD.enter('gym-wren')"); pg.wait_for_timeout(400)
  print('old save with the Moss Seal: vines gone on entering:', state()[2], '| reachable:', reach())
  print('errors:', errs or 'none'); b.close()
