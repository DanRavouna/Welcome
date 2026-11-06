# Wren's Gym, the trial of being tended: the gym door leads into a hall; Wren waits behind vines; four seedlings; a seedling grows only while you STAY beside it (about 2.5 s a stage, logged over real time); walking away stops it and keeps what grew; all four in bloom draws the vines back; nothing explains it (no sign); old saves (Wren beaten or her seal) find the way open; the stages survive a reload.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]},adv:{clues:[],open:{},flags:{}}}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  check('Wren no longer stands in the plaza', pg.evaluate("!(WORLD.allNpcs().mossbrook||[]).some(n=>n.id==='wren')"))
  check('she waits in the gym hall', pg.evaluate("(WORLD.allNpcs()['gym-wren']||[]).map(n=>n.id)")==['wren'])
  check('the gym door leads inside', pg.evaluate("WORLD.MAPS.mossbrook.places.find(p=>p.id==='gym-wren').enter")=='gym-wren')
  pg.evaluate("WORLD.enter('gym-wren');WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  objs=pg.evaluate("WORLD.map.objects.map(o=>o.kind)")
  check('four seedlings, a trough, vines, and no sign that explains anything', objs.count('gbed')==4 and 'trough' in objs and 'vines' in objs and 'gsign' not in objs, objs)
  texts=pg.evaluate("WORLD.map.objects.map(o=>o.text||'').join(' | ')")
  check('no object text tells the rule', not any(w in texts.lower() for w in ['smallest','first','stay','wait','order','tend','must']), texts)
  reach=lambda: pg.evaluate("""()=>{const M=WORLD.map,walk=(x,y)=>x>=0&&y>=0&&x<M.W&&y<M.H&&'.,=WZG'.includes(M.grid[y][x]);const seen=new Set(),q=[[10,17]];seen.add('10,17');while(q.length){const [x,y]=q.shift();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const k=(x+dx)+','+(y+dy);if(!seen.has(k)&&walk(x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy])}})}return seen.has('10,4')}""")
  check('Wren cannot be reached before the trial', not reach())
  def goto_bed(i,dy=1): pg.evaluate("([i,dy])=>{const o=WORLD.map.objects.find(q=>q.id==='bed'+i);WORLD.setPos((o.x+0.5)*32,(o.y+0.5+dy)*32)}",[i,dy]); pg.wait_for_timeout(200)
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(100)
  stage=lambda i: pg.evaluate("(i)=>APP.game.state.adv.flags['wb:bed'+i]|0",i)
  # 1. the first bed, the one by the way in: press Tend and stay. Growth is logged against the clock.
  goto_bed(1); check('the action by a seedling is Tend', pg.inner_text('#act-label')=='Tend', pg.inner_text('#act-label')); press()
  check('pressing Tend kneels you by the bed', pg.evaluate("APP.tending()")=='bed1' and 'kneel' in pg.inner_text('#toast'), pg.inner_text('#toast'))
  log=pg.evaluate("""()=>new Promise(res=>{const out=[];const t0=performance.now();const tick=()=>{out.push([Math.round(performance.now()-t0),APP.game.state.adv.flags['wb:bed1']|0]);if(performance.now()-t0<6500)requestAnimationFrame(tick);else res(out)};tick()})""")
  first=[t for t,s in log if s>=1]; second=[t for t,s in log if s>=2]
  check('it grows a stage after about 2.5 s of staying (not before 2 s, not after 3.5 s)', first and 2000<=first[0]<=3500, first[:1])
  check('and blooms after about 5 s', second and 4400<=second[0]<=6400, second[:1])
  check('in bloom it is no longer being tended', pg.evaluate("APP.tending()") is None)
  # 2. walking away mid-way stops it and keeps what grew
  goto_bed(2); press(); pg.wait_for_timeout(3000); s1=stage(2); check('bed2 grew one stage while you stayed 3 s', s1==1, s1)
  pg.wait_for_timeout(600); pg.evaluate("WORLD.setPos(12.5*32,16.5*32)"); pg.wait_for_timeout(300)
  check('walking away ends the tending', pg.evaluate("APP.tending()") is None)
  pg.wait_for_timeout(3000); check('nothing grows while you are away, and nothing is lost', stage(2)==1, stage(2))
  check('coming back and tending again continues from where it was', (goto_bed(2), press(), pg.wait_for_timeout(3000), stage(2))[-1]==2)
  check('Wren is still out of reach with two beds done', not reach())
  # 3. the other two
  for i in (3,4): goto_bed(i); press(); pg.wait_for_timeout(5800)
  check('all four in bloom', [stage(i) for i in (1,2,3,4)]==[2,2,2,2], [stage(i) for i in (1,2,3,4)])
  check('the vines drew back and the flag is saved', pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='vines').every(o=>o.hidden) && !!APP.game.state.adv.flags['gym:wren']"))
  check('Wren can be reached now', reach())
  pg.evaluate("APP.talk(WORLD.allNpcs()['gym-wren'][0])"); pg.wait_for_timeout(150)
  check('Wren speaks', pg.evaluate("APP.dialog && APP.dialog.name")=='Elder Wren')
  for _ in range(12):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  # 4. a reload keeps it; an old save finds it open
  pg.reload(); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.evaluate("window.__noTransition=true;window.__noFollower=true;document.getElementById('starter')&&(document.getElementById('starter').hidden=true);WORLD.enter('gym-wren');WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  check('after a reload: stages kept, vines gone, Wren reachable', [stage(i) for i in (1,2,3,4)]==[2,2,2,2] and reach())
  pg.evaluate("APP.game.update({npc:{done:[],beaten:{},cleared:['wren'],seals:['wren']},adv:{clues:[],open:{},flags:{}}}); WORLD.enter('mossbrook'); WORLD.enter('gym-wren')"); pg.wait_for_timeout(300)
  check('an old save with the Moss Seal: beds in bloom, way open', pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='vines').every(o=>o.hidden)") and reach())
  check('no page errors', not errs, errs); b.close()
done()
