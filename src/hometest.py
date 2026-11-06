# Your home and the Lab: door labels, residents, devices open their screens, exit.
from playwright.sync_api import sync_playwright
from collections import deque
import base64
SOL=set('TXF~GOR') | set('wbstpkhm')
def reach(g, start):
  H=len(g); W=len(g[0]); seen={start}; q=deque([start])
  while q:
    x,y=q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      nx,ny=x+dx,y+dy
      if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and g[ny][nx] not in SOL: seen.add((nx,ny)); q.append((nx,ny))
  return seen
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  for pid,dev,tab in [('home','desk','badges'),('lab','dexpc','dex')]:
    d=pg.evaluate(f"WORLD.MAPS.town.places.find(p=>p.id==='{pid}').door")
    pg.evaluate(f"WORLD.enter('town'); WORLD.setPos({d[0]+0.9}*WORLD.TS, {d[1]+1.4}*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(40)
    lab=pg.inner_text('#act-label'); pg.click('#act'); pg.wait_for_timeout(60); inside=pg.evaluate("WORLD.map.id")
    I=pg.evaluate("(()=>{const M=WORLD.map; return {g:M.grid.map(r=>r.join('')), spawn:M.spawn, npcs:(WORLD.allNpcs()[M.id]||[]).map(n=>[n.x,n.y]), dev:M.places.map(p=>p.door)}})()")
    R=reach(I['g'],(int(I['spawn'][0]),int(I['spawn'][1])))
    npcok=all(any(abs(a-x)+abs(c-y)==1 for (a,c) in R) for x,y in I['npcs']); devok=all((x,y+1) in R for x,y in I['dev'])
    dv=I['dev'][0]; pg.evaluate(f"WORLD.setPos({dv[0]+0.5}*WORLD.TS, {dv[1]+1.6}*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(40)
    dlab=pg.inner_text('#act-label'); pg.click('#act'); pg.wait_for_timeout(250)
    opened=pg.evaluate("[!document.getElementById('screen').hidden, APP.game.state.tab]"); pg.evaluate("APP.close()"); pg.wait_for_timeout(100)
    sp=I['spawn']; pg.evaluate(f"WORLD.setPos({sp[0]}*WORLD.TS, {sp[1]}*WORLD.TS)")
    for _ in range(25): pg.evaluate("WORLD.input.jy=1; WORLD.step(1/30)")
    pg.evaluate("WORLD.input.jy=0"); back=pg.evaluate("[WORLD.map.id, Math.floor(WORLD.pos().x/WORLD.TS), Math.floor(WORLD.pos().y/WORLD.TS)]")
    print(f"{pid}: door '{lab}' -> {inside} | resident ok {npcok} | device reachable {devok} '{dlab}' opens {opened} | exit -> {back} (door {d})")
  d=pg.evaluate("""()=>{const ids=['in-home','in-lab']; const o=document.createElement('canvas'); o.width=(12+14)*32+8; o.height=10*32; const g=o.getContext('2d'); g.imageSmoothingEnabled=false; let x=0;
    ids.forEach((id)=>{const c=PXW.terrain(WORLD.MAPS[id],id); g.drawImage(c,0,0,c.width,c.height,x,0,c.width*2,c.height*2); x+=c.width*2+8;}); return o.toDataURL();}""")
  open('/tmp/homelab.png','wb').write(base64.b64decode(d.split(',')[1]))
  print('errors:', errs or 'none'); b.close()
