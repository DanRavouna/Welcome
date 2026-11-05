from playwright.sync_api import sync_playwright
from collections import deque
errs=[]
def reach(g, start):
  SOL=set('TXF~GOR'); H=len(g); W=len(g[0]); seen={start}; q=deque([start])
  while q:
    x,y=q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      nx,ny=x+dx,y+dy
      if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and g[ny][nx] not in SOL: seen.add((nx,ny)); q.append((nx,ny))
  return seen
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844})
  pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  mb=pg.evaluate("WORLD.MAPS.mossbrook.grid.map(r=>r.join(''))"); ms=pg.evaluate("WORLD.MAPS.moss.grid.map(r=>r.join(''))")
  R=reach(mb,(35,13))
  doors=pg.evaluate("WORLD.MAPS.mossbrook.places.map(p=>[p.id,p.door[0],p.door[1]+1])")
  print('mossbrook doors reachable:', all((x,y) in R for _,x,y in doors), '| npcs reachable:', all(any(abs(x-n[1])+abs(y-n[2])==1 for (x,y) in R) for n in pg.evaluate("WORLD.allNpcs().mossbrook.map(n=>[n.id,n.x,n.y])")))
  Rm=reach(ms,(0,14)); print('moss west link reaches moss east entrance:', (33,13) in Rm or (33,14) in Rm, '| exits:', pg.evaluate("JSON.stringify(WORLD.MAPS.moss.exits)"))
  print('wren home:', pg.evaluate("npcHome('wren')"), '| moss npcs:', pg.evaluate("WORLD.allNpcs().moss.map(n=>n.id)"))
  print('route town->mossbrook next hop:', pg.evaluate("WORLD.nextHop('town','mossbrook')"), '| moss->mossbrook:', pg.evaluate("WORLD.nextHop('moss','mossbrook')"), '| mossbrook->peak:', pg.evaluate("WORLD.nextHop('mossbrook','peak')"))
  # walk from moss west edge into mossbrook
  pg.evaluate("WORLD.enter('moss'); WORLD.setPos(1.5*WORLD.TS, 15*WORLD.TS)")
  for _ in range(20): pg.evaluate("WORLD.input.jx=-1; WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jx=0"); print('walked west ->', pg.evaluate("WORLD.map.id"), pg.evaluate("[Math.round(WORLD.pos().x/WORLD.TS), Math.round(WORLD.pos().y/WORLD.TS)]"))
  pg.mouse.click(200,400); pg.wait_for_timeout(900); print('music:', pg.evaluate("MUSIC.current"))
  # objective with ivy cleared -> challenge wren in Mossbrook, arrow routes
  pg.evaluate("(()=>{const g=APP.game; const seeds=[5000,5001,5002]; g.update({caught:seeds.map(s=>({seed:s,stage:2,lv:8})), party:seeds, fighter:5000, seen:[1,2,3,4,5], npc:{done:['fern'],beaten:{},cleared:['rowan','ivy'],seals:[]}, xp:2000});})()")
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(21.9*WORLD.TS, 23.6*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(200)
  # gym door -> Wren dialog; house -> toast; herb hut -> shop
  pg.evaluate("WORLD.enter('mossbrook'); WORLD.setPos(17.9*WORLD.TS, 8.3*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(80)
  print('near gym/wren label:', pg.inner_text('#act-label')); pg.click('#act'); pg.wait_for_timeout(100); print('dialog:', pg.evaluate("APP.dialog && APP.dialog.name"), '|', pg.evaluate("APP.dialog && APP.dialog.lines[0]"))
  for _ in range(10):
    if pg.evaluate("!document.getElementById('dlg-choices').hidden || !APP.dialog"): break
    pg.evaluate("APP.advance()")
  print('wren choices:', pg.evaluate("[...document.querySelectorAll('#dlg-choices button')].map(b=>b.textContent)"))
  pg.click("#dlg-choices button:has-text('Not now')"); pg.wait_for_timeout(150)
  pg.evaluate("WORLD.setPos(28.9*WORLD.TS, 9.3*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(60); print('house label:', pg.inner_text('#act-label'))
  pg.click('#act'); pg.wait_for_timeout(60); print('house toast:', pg.inner_text('#toast')[:60])
  pg.evaluate("WORLD.setPos(6.9*WORLD.TS, 10.3*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(60); print('herb hut label:', pg.inner_text('#act-label'))
  print('errors:', errs or 'none'); b.close()
