# Vigil Peak: only the trail and sign changed in town, the tower door is reachable, locked without 4 seals.
from playwright.sync_api import sync_playwright
from collections import deque
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844})
  pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  new=pg.evaluate("WORLD.MAPS.town.grid.map(r=>r.join(''))")
  trail=[new[y][x] for y in range(0,12) for x in (26,27)]
  print('the trail north is stamped (path tiles in columns 26-27, rows 0-11):', trail.count('=')==len(trail), '| sign at (28,10):', new[10][28]=='G', '| the stamp is 2 wide, nothing else of the row changed:', all(new[y][25] not in '=' and new[y][28] not in '=' for y in range(0,9)))
  g=pg.evaluate("WORLD.MAPS.peak.grid.map(r=>r.join(''))"); SOL=set('TXF~GOR')
  start=(12,23); seen={start}; q=deque([start])
  while q:
    x,y=q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      nx,ny=x+dx,y+dy
      if 0<=nx<26 and 0<=ny<24 and (nx,ny) not in seen and g[ny][nx] not in SOL: seen.add((nx,ny)); q.append((nx,ny))
  print('door front (12,9) reachable from entrance:', (12,9) in seen, '| walkable tiles:', len(seen))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false})})")
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(26.9*WORLD.TS, 2.3*WORLD.TS)")
  for _ in range(40): pg.evaluate("WORLD.input.jy=-1; WORLD.step(1/30)")
  print('no seals -> still in town:', pg.evaluate("WORLD.map.id"), '| toast:', pg.inner_text('#toast')[:70])
  pg.evaluate("WORLD.input.jy=0; APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})")
  for _ in range(40): pg.evaluate("WORLD.input.jy=-1; WORLD.step(1/30)")
  pos=pg.evaluate("[WORLD.map.id, +(WORLD.pos().x/WORLD.TS).toFixed(1), +(WORLD.pos().y/WORLD.TS).toFixed(1)]") if pg.evaluate("typeof WORLD.pos==='function'") else pg.evaluate("WORLD.map.id")
  print('4 seals -> map:', pos)
  pg.evaluate("WORLD.input.jy=0; WORLD.setPos(12.9*WORLD.TS, 9.4*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(50)
  print('tower door label:', pg.inner_text('#act-label'))
  pg.mouse.click(200,400); pg.wait_for_timeout(900); print('peak music:', pg.evaluate("MUSIC.current"))
  pg.evaluate("WORLD.setPos(12.9*WORLD.TS, 22.5*WORLD.TS)")
  for _ in range(30): pg.evaluate("WORLD.input.jy=1; WORLD.step(1/30)")
  print('back down -> map:', pg.evaluate("WORLD.map.id"), '| arrived near trail:', pg.evaluate("[Math.round(WORLD.pos?WORLD.pos().x/WORLD.TS:0), Math.round(WORLD.pos?WORLD.pos().y/WORLD.TS:0)]"))
  pg.evaluate("WORLD.input.jy=0")
  # aggro: put player in Rowan's sight line
  pg.evaluate("(()=>{const n=WORLD.allNpcs().town.find(n=>n.id==='rowan'); const g=APP.game; const npc=Object.assign({done:['fern'],beaten:{},cleared:[],seals:[]},g.state.npc); npc.cleared=[]; npc.beaten={}; g.update({npc, caught:[{seed:5000,stage:1}], party:[5000], fighter:5000}); const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[n.dir]; WORLD.setPos((n.x+v[0]*2+0.5)*WORLD.TS,(n.y+v[1]*2+0.6)*WORLD.TS); window.__dir=n.dir;})()")
  for _ in range(3): pg.evaluate("WORLD.step(1/60)")
  pg.wait_for_timeout(500); t1=pg.evaluate("MUSIC.state.want")
  pg.wait_for_timeout(1200); t2=pg.evaluate("[MUSIC.state.want, !!APP.dialog]")
  print('aggro music during alert:', t1, '| during challenge dialog:', t2)
  print('errors:', errs or 'none'); b.close()
