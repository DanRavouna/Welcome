# The Cold Ascent: the gate from Frosthold, the climb, trainers beside the trail, wild snow patches, landmarks, people, the beacon door.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':760}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:14}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  # 1) the way in: Frosthold's north gate and the road to it
  print('Frosthold exits:', pg.evaluate("WORLD.MAPS.frosthold.exits.map(e=>e.edge+'->'+e.to).join(' ')"), '| gate sign:', pg.evaluate("WORLD.MAPS.frosthold.signs.some(s=>s.to==='ascent')"))
  r=pg.evaluate("""()=>{const M=WORLD.MAPS.frosthold;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||['T','X','~','F','G','O','R','C','w','b','s','t','p','k','h','m'].indexOf(M.grid[y][x])!==-1;
    const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    return {northGateReachable:seen.has('31,0')||seen.has('32,0')||seen.has('31,1'),arrive:M.arriveFrom.ascent,otherExitsOk:M.exits.length}}""")
  print('walk from the Frosthold spawn to the north gate:', r)
  # 2) the level gate (real mode)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), xp:0}); WORLD.enter('frosthold'); WORLD.setPos(31.9*WORLD.TS,1.0*WORLD.TS); WORLD.input.jy=-1")
  for _ in range(12): pg.evaluate("WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(300)
  print('level 1 at the north gate -> still on', pg.evaluate("WORLD.map.id"), '| toast:', pg.inner_text('#toast')[:90])
  pg.evaluate("APP.game.update({xp:99999})"); pg.evaluate("WORLD.enter('frosthold'); WORLD.setPos(31.9*WORLD.TS,1.0*WORLD.TS); WORLD.input.jy=-1")
  for _ in range(12): pg.evaluate("WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(300); print('high level -> on', pg.evaluate("WORLD.map.id"), 'at', pg.evaluate("(()=>{const p=WORLD.pos();return [Math.round(p.x/32*10)/10,Math.round(p.y/32*10)/10]})()"))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:true})})")
  # 3) the climb: spawn -> beacon door reachable; every trainer's sight line crosses the trail
  R=pg.evaluate("""()=>{WORLD.enter('ascent');const M=WORLD.map;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y)||WORLD.npcs.some(o=>o.x===x&&o.y===y);
    const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    const adj=(o)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));
    const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};const trail=(n)=>{for(let k=1;k<=4;k++){const x=n.x+v[n.dir][0]*k,y=n.y+v[n.dir][1]*k;if(M.grid[y][x]==='=')return k;if(WORLD.solidAt(x,y))return 0}return 0};
    return {door:adj(M.objects[0]),npcs:Object.fromEntries(WORLD.npcs.map(n=>[n.id,{at:[n.x,n.y],reach:adj(n),trailAt:n.trainer?trail(n):'-',lv:n.lv,size:n.size,stage:n.stage,reward:n.reward}])),
      wild:M.grid.flat().filter(c=>c==='W').length,rare:M.grid.flat().filter(c=>c==='Z').length,types:M.types,rate:M.rate,props:M.props.map(p=>p.id).join(','),size:[M.W,M.H],sightFromTrail:null}}""")
  print('climb:', {k:R[k] for k in ['door','wild','rare','types','rate','props','size']})
  for k,v in R['npcs'].items(): print('  ',k,v)
  print('trainers see the trail within 4 tiles:', all(v['trailAt'] for k,v in R['npcs'].items() if v['trailAt']!='-'), '| all people reachable:', all(v['reach'] for v in R['npcs'].values()))
  # 4) the exit back, music, weather climate, travel map
  pg.evaluate("WORLD.setPos(14.9*WORLD.TS,65.2*WORLD.TS); WORLD.input.jy=1")
  for _ in range(14): pg.evaluate("WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(300); print('south exit ->', pg.evaluate("WORLD.map.id"), 'at', pg.evaluate("(()=>{const p=WORLD.pos();return [Math.round(p.x/32*10)/10,Math.round(p.y/32*10)/10]})()"))
  pg.evaluate("WORLD.enter('ascent')"); pg.wait_for_timeout(900); print('music on the Ascent wants:', pg.evaluate("MUSIC.state.want"), '| weather climate:', pg.evaluate("WEATHER.region('ascent')"), '| visited recorded:', pg.evaluate("APP.game.state.visited.indexOf('ascent')!==-1"))
  pg.evaluate("APP.openMap()"); pg.wait_for_timeout(300); print('travel map lists it:', 'The Cold Ascent' in pg.inner_text('#wmap')); pg.evaluate("APP.closeMap()")
  # 5) the beacon door (the dungeon behind it comes next)
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='beacon-door');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.6)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(300)
  print('act label at the door:', pg.inner_text('#act-label'))
  print('errors:', errs or 'none'); b.close()
