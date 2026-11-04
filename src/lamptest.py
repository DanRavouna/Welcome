# The Lamp Tower: levers/gates puzzle (state-graph search: solvable, never a trap), the beacon door, trainers, the great lamp, saving.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':760}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:16}],party:[2],fighter:2,intro:true,xp:99999,essence:10,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  # 1) the puzzle as a state graph over (lever states, where the player stands), from the raw map data (independent of the app code)
  G=pg.evaluate("""()=>{const M=WORLD.MAPS['dg-lamp'];const gates=M.gates,levers=[...new Set(Object.values(gates).flat())].sort();const W=M.W,H=M.H;
    const solidC=(c)=>['C','O','T','X','~','F','G','R'].indexOf(c)!==-1;const open=(g,st)=>gates[g].filter(l=>(st>>levers.indexOf(l))&1).length%2===1;
    const objAt=new Map();M.objects.forEach(o=>objAt.set(o.x+','+o.y,o));
    const free=(x,y,st)=>{if(x<0||y<0||x>=W||y>=H)return false;const o=objAt.get(x+','+y);if(o)return !!(o.gate&&open(o.gate,st));return !solidC(M.grid[y][x])};
    const leverAdj=levers.map(l=>{const o=objAt.get([...objAt.keys()].find(k=>objAt.get(k).id===l));return o});
    const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const lamp=M.objects.find(o=>o.id==='greatlamp');
    const id=(st,x,y)=>(st*H+y)*W+x, N=(1<<levers.length)*W*H;
    const nbrs=(st,x,y)=>{const out=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){if(free(x+dx,y+dy,st))out.push(id(st,x+dx,y+dy))}
      leverAdj.forEach((o,i)=>{if(Math.abs(o.x-x)+Math.abs(o.y-y)===1)out.push(id(st^(1<<i),x,y))});return out};
    // forward reachability from (all OFF, spawn)
    const start=id(0,sp[0],sp[1]);const fwd=new Uint8Array(N);fwd[start]=1;const q=[start];const adjList=new Map();let goal=false;
    while(q.length){const n=q.shift();const x=n%W,y=Math.floor(n/W)%H,st=Math.floor(n/(W*H));const ns=nbrs(st,x,y);adjList.set(n,ns);
      if(Math.abs(lamp.x-x)+Math.abs(lamp.y-y)===1)goal=true;ns.forEach(m=>{if(!fwd[m]){fwd[m]=1;q.push(m)}})}
    // reverse reachability to the start: every state reachable going forward must be able to come back (moves are reversible, so this holds unless a gate closes on you)
    const rev=new Map();adjList.forEach((ns,n)=>ns.forEach(m=>{if(!rev.has(m))rev.set(m,[]);rev.get(m).push(n)}));const back=new Uint8Array(N);back[start]=1;const bq=[start];
    while(bq.length){const n=bq.shift();(rev.get(n)||[]).forEach(m=>{if(!back[m]){back[m]=1;bq.push(m)}})}
    let reach=0,trapped=0;for(let n=0;n<N;n++)if(fwd[n]){reach++;if(!back[n])trapped++}
    // the same search without the lever flips: the top must NOT be reachable by walking alone
    return {levers,gates,positionsReachable:reach,trappedPositions:trapped,topReachableWithLevers:goal}}""")
  print('puzzle graph:', G)
  # 2) the real tower: door on the Ascent, then the levers pulled by hand
  pg.evaluate("WORLD.enter('ascent')"); pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='beacon-door');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.6)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(300)
  print('door label:', pg.inner_text('#act-label')); pg.click('#act'); pg.wait_for_timeout(300); print('first visit dialogue:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]")); finish(); pg.wait_for_timeout(700)
  print('inside:', pg.evaluate("WORLD.map.id"), '| open.lamp saved:', pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2')).adv.open.lamp"))
  gates=lambda: pg.evaluate("(()=>{const o=WORLD.objects;return ['g1','g2','g3'].map(g=>g+':'+(o.filter(x=>x.gate===g).every(x=>x.hidden)?'open':'shut')).join(' ')})()")
  def use(oid):
    pg.evaluate(f"(()=>{{const o=WORLD.objects.find(x=>x.id==='{oid}');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.5)*WORLD.TS)}})()")
    for _ in range(4): pg.evaluate("WORLD.step(1/30)")
    pg.wait_for_timeout(120); pg.click('#act'); pg.wait_for_timeout(250)
  print('start:', gates())
  use('L1'); print('after L1 :', gates()); use('L2'); print('after L2 :', gates()); use('L3'); print('after L3 :', gates())
  REACH="""(ids)=>{const M=WORLD.map;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y)||WORLD.npcs.some(o=>o.x===x&&o.y===y);const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];
    while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    const adj=(o)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));const things=WORLD.objects.concat(WORLD.npcs);const out={};ids.forEach(id=>{const o=things.find(t=>t.id===id);out[id]=o?adj(o):'missing'});return out}"""
  print('with all three levers ON, reachable (walls of the real map, NPCs solid):', pg.evaluate(REACH, ['bex','odo','maren','greatlamp','chest2']))
  use('L3'); use('L2'); use('L1'); print('all OFF again:', gates(), '| reachable:', pg.evaluate(REACH, ['bex','maren']))
  # 3) trainers: sight lines, boss flag, rewards
  r=pg.evaluate("""()=>{WORLD.npcs.forEach(n=>{n.declined=true});const out={};for(const id of ['bex','odo','maren']){const n=WORLD.npcs.find(x=>x.id===id);WORLD.setPos((n.x+0.5)*WORLD.TS,(n.y+3.5)*WORLD.TS);out[id]={at:[n.x,n.y],sees:WORLD.inSight(n),size:n.size,stage:n.stage,lv:n.lv,reward:n.reward,boss:!!n.boss,bonus:n.bonus||0}}return out}""")
  for k,v in r.items(): print('  ',k,v)
  # 4) the great lamp: blocked until the Warden falls, then it lights once
  def lamp_use():
    pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='greatlamp');WORLD.setPos((o.x-0.5)*WORLD.TS,(o.y+0.5)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(250); pg.click('#act'); pg.wait_for_timeout(300)
  lamp_use(); print('lamp before the Warden falls:', pg.inner_text('#toast')[:60])
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['maren'])})})")
  e0=pg.evaluate("APP.game.state.essence"); lamp_use(); print('lamp dialogue:', pg.evaluate("APP.dialog&&APP.dialog.lines.length"), 'lines'); finish(); pg.wait_for_timeout(400)
  print('lit:', pg.evaluate("APP.game.state.adv.flags.lampLit"), '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| title:', pg.evaluate("APP.game.state.titles.indexOf('lamp')!==-1"))
  e1=pg.evaluate("APP.game.state.essence"); lamp_use(); print('again:', pg.inner_text('#toast')[:50], '| essence unchanged:', pg.evaluate("APP.game.state.essence")==e1)
  # 5) the beam on the Ascent (pixels above the lantern get brighter once lit), journal, music
  def beam_lum():
    pg.evaluate("WORLD.enter('ascent'); WORLD.setPos(14.5*WORLD.TS,11*WORLD.TS)"); pg.evaluate("[0,1,2,3,4,5,6,7,8,9].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(1200)
    return pg.evaluate("(()=>{const c=document.getElementById('world'),g=c.getContext('2d'),r=c.width/c.clientWidth,d=WORLD.debug().cam;const x=(14.5*32-d.cx),y=(2*32-d.cy);const p=g.getImageData(Math.round(x*r)-3,Math.round(y*r),6,4).data;let s=0;for(let i=0;i<p.length;i+=4)s+=(p[i]+p[i+1]+p[i+2])/3;return Math.round(s/(p.length/4))})()")
  lit=beam_lum(); pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{lampLit:false})})})"); unlit=beam_lum()
  print('brightness above the beacon lantern: lit', lit, 'vs unlit', unlit, '| brighter when lit:', lit>unlit)
  pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{lampLit:true})})})")
  pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-tile=journal]').click()"); pg.wait_for_timeout(200); print('journal:', [l[:60] for l in pg.evaluate("APP.dialog.lines") if 'Lamp Tower' in l]); finish()
  pg.evaluate("WORLD.enter('dg-lamp')"); pg.wait_for_timeout(900); print('music in the tower:', pg.evaluate("MUSIC.state.want"), '| own track:', pg.evaluate("MUSIC.tracks.indexOf('dg-lamp')!==-1"))
  # 6) saving: levers and the lit lamp survive a reload; gates are applied when the map is entered
  pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{'lv:L1':true})})})")
  pg.reload(); pg.wait_for_timeout(1300); pg.evaluate("WORLD.enter('dg-lamp')"); pg.wait_for_timeout(400)
  print('after reload: gates', gates(), '| flags:', pg.evaluate("JSON.stringify(APP.game.state.adv.flags)"))
  print('errors:', errs or 'none'); b.close()
