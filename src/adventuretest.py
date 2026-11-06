# Adventure: clues, the Sealed Arch, the dungeon hall, chest, Journal, darkness, saving. Runs with the seed hook (instant map changes).
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':760}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:2,lv:9}],party:[2],fighter:2,intro:true,essence:10,bag:{potion:0,super:0,charm:0,ticket:0,herb:0,ward:0,whet:0},settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  adv=lambda: pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2')).adv")
  print('fresh adv state:', pg.evaluate("APP.game.state.adv"))
  # the arch object replaced the ruin's signpost
  print('route-mf arch object / ruin sign left:', pg.evaluate("(()=>{const M=WORLD.MAPS['route-mf'];const r=M.props.find(p=>p.id==='ruin');return [M.objects.map(o=>o.id+':'+o.kind+'@'+o.x+','+o.y),M.signs.some(s=>s.x===r.x+1&&s.y===r.y+r.h),M.grid[r.y+r.h][r.x+1]]})()"))
  # sealed arch: no clues -> dialogue, nothing opens
  pg.evaluate("WORLD.enter('route-mf'); APP.dialog&&0")
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='arch');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.6)*WORLD.TS)})()")
  for _ in range(6): pg.evaluate("WORLD.step(1/30)")
  pg.wait_for_timeout(200); print('act label by the arch (0 clues):', pg.inner_text('#act-label'))
  pg.click('#act'); pg.wait_for_timeout(300)
  print('sealed dialogue:', pg.evaluate("APP.dialog&&APP.dialog.lines.join(' | ')")); finish()
  print('still on', pg.evaluate("WORLD.map.id"), '| open flag:', pg.evaluate("APP.game.state.adv.open.arch||false"))
  # the four clues, from the four people
  for mid,nid in [('route-mf','edda'),('route-cm','dell'),('route-fc','joss'),('route-cc','neri')]:
    pg.evaluate(f"WORLD.enter('{mid}'); APP.talk(WORLD.npcs.find(x=>x.id==='{nid}'))"); first=pg.evaluate("APP.dialog&&APP.dialog.lines.length"); finish()
    pg.evaluate(f"APP.talk(WORLD.npcs.find(x=>x.id==='{nid}'))"); again=pg.evaluate("APP.dialog&&APP.dialog.lines.length"); finish()
    print(f'  {nid}: lines first talk {first}, second talk {again} (clue only once) | clues now {pg.evaluate("APP.game.state.adv.clues.length")}')
  # Journal
  pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(200)
  print('journal tile sub:', pg.evaluate("(document.querySelector('[data-tile=journal] .ts')||{}).textContent"))
  pg.evaluate("document.querySelector('[data-tile=journal]').click()"); pg.wait_for_timeout(200)
  print('journal lines:', pg.evaluate("APP.dialog.lines.length"), '|', pg.evaluate("APP.dialog.lines[0]")); finish()
  # the arch opens with all four and leads into the hall
  pg.evaluate("WORLD.enter('route-mf')"); pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='arch');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.6)*WORLD.TS)})()")
  for _ in range(6): pg.evaluate("WORLD.step(1/30)")
  pg.click('#act'); pg.wait_for_timeout(300); finish(); pg.wait_for_timeout(600)
  print('after the 4th clue: map', pg.evaluate("WORLD.map.id"), '| open flag', pg.evaluate("APP.game.state.adv.open.arch"), '| saved:', adv()['open'])
  # music: the hall has its own track (the game picks it by map id), other maps are unaffected
  pg.wait_for_timeout(900); print('wanted track in the dungeon:', pg.evaluate("MUSIC.state.want"), '| has a track of its own:', pg.evaluate("MUSIC.tracks.indexOf('dg-arch')!==-1"))
  pg.evaluate("WORLD.enter('route-mf')"); pg.wait_for_timeout(900); print('wanted track on Highland Pass:', pg.evaluate("MUSIC.state.want")); pg.evaluate("WORLD.enter('dg-arch')"); pg.wait_for_timeout(500)
  # the hall
  H=pg.evaluate("""(()=>{const M=WORLD.map;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y);const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];
    while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    const adj=(o)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));
    const kinds={};M.objects.forEach(o=>{kinds[o.kind]=(kinds[o.kind]||0)+1});
    return {name:M.name,size:[M.W,M.H],dark:M.dark,kinds,unreachable:M.objects.filter(o=>!adj(o)).map(o=>o.id),exit:M.exits[0],floorTiles:seen.size,onSolid:M.objects.some(o=>M.grid[o.y][o.x]!=='O')}})()""")
  print('hall:', H)
  # the way back
  pg.evaluate("WORLD.setPos(12.9*WORLD.TS,59.2*WORLD.TS); WORLD.input.jy=1")
  for _ in range(20): pg.evaluate("WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(200); print('walked out the south gap ->', pg.evaluate("WORLD.map.id"), 'at', pg.evaluate("(()=>{const p=WORLD.pos();return [Math.round(p.x/32*10)/10,Math.round(p.y/32*10)/10]})()"))
  pg.wait_for_timeout(700); pg.evaluate("APP.close()")   # walking out crosses the route's tall grass: a wild encounter opens its screen ~280 ms after it starts, so wait, then close it if one happened (random)
  pg.evaluate("WORLD.enter('dg-arch')")
  # chest: reward once
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='chest1');WORLD.setPos((o.x+1.5)*WORLD.TS,(o.y+0.6)*WORLD.TS)})()")
  for _ in range(6): pg.evaluate("WORLD.step(1/30)")
  try: pg.wait_for_function("document.getElementById('act-label').textContent==='Open the chest'", timeout=4000)
  except Exception: pass
  print('act label by chest:', pg.inner_text('#act-label'))
  if pg.inner_text('#act-label')!='Open the chest': print('   DEBUG', pg.evaluate("({map:WORLD.map.id,paused:WORLD.paused,tr:WORLD.transitioning,dlg:!!APP.dialog,pos:WORLD.pos(),near:(()=>{const n=WORLD.nearest();return n?n.kind:null})(),chest:(()=>{const o=WORLD.objects.find(x=>x.id==='chest1');return o?[o.x,o.y]:null})()})"))
  b0=pg.evaluate("[APP.game.state.bag.potion, APP.game.state.essence]"); pg.click('#act'); pg.wait_for_timeout(300)
  b1=pg.evaluate("[APP.game.state.bag.potion, APP.game.state.essence]"); print('chest: potions/essence', b0,'->',b1, '| toast:', pg.inner_text('#toast')[:60])
  pg.wait_for_timeout(300); pg.click('#act'); pg.wait_for_timeout(300); print('second try:', pg.inner_text('#toast')[:40], '| unchanged:', pg.evaluate("[APP.game.state.bag.potion, APP.game.state.essence]")==b1)
  # statues + seat text
  print('statue/seat lines:', pg.evaluate("WORLD.objects.filter(o=>o.kind==='statue'||o.kind==='seat').map(o=>o.text.slice(0,32))"))
  # darkness: lit near the player, dark far away (sample the canvas)
  pg.evaluate("WORLD.setPos(12.9*WORLD.TS,57*WORLD.TS)")
  for _ in range(40): pg.evaluate("WORLD.step(1/30)")
  pg.wait_for_timeout(900)
  L=pg.evaluate("""(()=>{const c=document.getElementById('world'),g=c.getContext('2d'),d=WORLD.debug().player,r=c.width/c.clientWidth;const lum=(x,y)=>{const p=g.getImageData(Math.round(x*r),Math.round(y*r),1,1).data;return Math.round((p[0]+p[1]+p[2])/3)};
    return {near:lum(d.x-20,d.y-12),far:lum(20,c.clientHeight*0.2),player:d}})()""")
  print('brightness near the player vs far corner:', L)
  pg.screenshot(path='/tmp/adv-hall.png')

  # ---------- the rite, the rubble and the rooms beyond ----------
  REACH="""(ids)=>{const M=WORLD.map;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y)||WORLD.npcs.some(o=>o.x===x&&o.y===y);const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];
    while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    const adj=(o)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));
    const things=WORLD.objects.concat(WORLD.npcs);const out={};ids.forEach(id=>{const o=things.find(t=>t.id===id);out[id]=o?adj(o):'missing'});return out}"""
  ids=['chest1','rite0','rite1','rite2','pell','ione','keeper','chest2','crown']
  print('before the rite, reachable from the entrance:', pg.evaluate(REACH, ids))
  def use(oid):
    pg.evaluate(f"(()=>{{const o=WORLD.objects.find(x=>x.id==='{oid}');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.5)*WORLD.TS)}})()")
    for _ in range(4): pg.evaluate("WORLD.step(1/30)")
    pg.wait_for_timeout(120); pg.click('#act'); pg.wait_for_timeout(250); return pg.inner_text('#toast')[:70]
  print('rubble touched:', pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='rb1');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.5)*WORLD.TS);return 1})()") and (lambda: (pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"), pg.wait_for_timeout(120), pg.click('#act'), pg.wait_for_timeout(250), pg.inner_text('#toast')[:60])[-1])())
  print('1 lamp first (wrong):', use('rite1'), '| lit:', pg.evaluate("APP.game.state.adv.flags.rite"))
  print('2 fire:', use('rite0'), '| lit:', pg.evaluate("APP.game.state.adv.flags.rite"))
  print('3 hull too early (wrong):', use('rite2'), '| lit:', pg.evaluate("APP.game.state.adv.flags.rite"))
  use('rite0'); use('rite1'); print('4 fire, lamp:', pg.evaluate("APP.game.state.adv.flags.rite"), '| rubble flag:', pg.evaluate("!!APP.game.state.adv.flags.rubble"))
  print('5 hull:', use('rite2')); pg.wait_for_timeout(1500)
  print('rubble cleared:', pg.evaluate("!!APP.game.state.adv.flags.rubble"), '| rubble objects left:', pg.evaluate("WORLD.objects.filter(o=>o.rubble).length"), '| tile (12,41):', repr(pg.evaluate("WORLD.map.grid[41][12]")))
  print('after the rite, reachable:', pg.evaluate(REACH, ids))
  print('already lit ->', use('rite0'))
  # guards and the Keeper: sight lines down the middle of their rooms, boss flag, rewards
  r=pg.evaluate("""()=>{WORLD.npcs.forEach(n=>{n.declined=true});const out={};for(const id of ['pell','ione','keeper']){const n=WORLD.npcs.find(x=>x.id===id);WORLD.setPos((n.x+0.5)*WORLD.TS,(n.y+3.5)*WORLD.TS);out[id]={at:[n.x,n.y],dir:n.dir,sees:WORLD.inSight(n),size:n.size,stage:n.stage,lv:n.lv,reward:n.reward,boss:!!n.boss}}return out}""")
  for k,v in r.items(): print('  ',k,v)
  pg.evaluate("APP.startTrainer(WORLD.npcs.find(x=>x.id==='keeper'))"); pg.wait_for_timeout(400)
  print('Keeper battle state:', pg.evaluate("(()=>{const t=APP.game.state.trainer;return {boss:t.boss,reward:t.reward,team:t.team.length,stage:t.stage,lv:t.lv}})()")); pg.evaluate("APP.close()")
  # wild moss in the gallery, crown before/after the Keeper
  print('dungeon wild critters:', pg.evaluate("[WORLD.map.types,WORLD.map.rate, WORLD.map.grid.flat().filter(c=>c==='W').length+' moss tiles']"))
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='crown');WORLD.setPos((o.x-0.5)*WORLD.TS,(o.y+0.5)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(250)
  pg.click('#act'); pg.wait_for_timeout(250); print('crown before the Keeper falls:', pg.inner_text('#toast')[:60])
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['keeper'])})})")
  pg.click('#act'); pg.wait_for_timeout(300); print('crown after:', pg.evaluate("APP.dialog&&APP.dialog.lines[0].slice(0,50)")); finish()
  pg.wait_for_timeout(1400); pg.evaluate("APP.close()")   # the ninth seat answered: the Dex opened on the new critter; close it (details: secrettest.py)
  print('secret critter obtained:', pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET_SEED)"))
  # chest 2 and Journal
  print('chest2:', use('chest2'), '| bag charm:', pg.evaluate("APP.game.state.bag.charm"))
  pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-tile=journal]').click()"); pg.wait_for_timeout(200)
  print('journal dungeon line:', [l for l in pg.evaluate("APP.dialog.lines") if l.startswith('The Sealed Arch')]); finish()
  pg.evaluate("WORLD.enter('route-mf')")
  # save + reload keeps everything; an old save without adv loads with defaults
  pg.reload(); pg.wait_for_timeout(1300)
  print('after reload adv:', pg.evaluate("JSON.stringify(APP.game.state.adv)"))
  print('after reload the rubble is still gone:', pg.evaluate("(()=>{const m=WORLD.MAPS['dg-arch'];return [m.objects.filter(o=>o.rubble).length, m.grid[41][12]]})()"))
  pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('critter-roll:v2'));delete s.adv;localStorage.setItem('critter-roll:v2',JSON.stringify(s))})()"); pg.reload(); pg.wait_for_timeout(1300)
  print('old save (no adv) loads with:', pg.evaluate("JSON.stringify(APP.game.state.adv)"), '| caught kept:', pg.evaluate("APP.game.state.caught.length"))
  print('errors:', errs or 'none'); b.close()
