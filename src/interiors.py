from playwright.sync_api import sync_playwright
from collections import deque
import base64
SOL=set('TXF~GOR') | set('wbstpkh')
def reach(g, start):
  H=len(g); W=len(g[0]); seen={start}; q=deque([start])
  while q:
    x,y=q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      nx,ny=x+dx,y+dy
      if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and g[ny][nx] not in SOL: seen.add((nx,ny)); q.append((nx,ny))
  return seen
errs=[]; bad=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.mouse.click(200,400)
  houses=pg.evaluate("['mossbrook','frosthold','cinderport','coralbay'].flatMap(c=>WORLD.MAPS[c].places.filter(p=>p.open==='house').map(p=>[c,p.id,p.door[0],p.door[1],p.enter]))")
  print('houses with interiors:', len(houses), '/', len([h for h in houses if h[4]]))
  for c,pid,dx,dy,iid in houses:
    pg.evaluate(f"WORLD.enter('{c}'); WORLD.setPos({dx+0.9}*WORLD.TS, {dy+1.4}*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(30)
    lab=pg.inner_text('#act-label'); pg.click('#act', timeout=2000); pg.wait_for_timeout(40)
    inside=pg.evaluate("WORLD.map.id")
    I=pg.evaluate("(()=>{const M=WORLD.map; return {g:M.grid.map(r=>r.join('')), spawn:M.spawn, npcs:(WORLD.allNpcs()[M.id]||[]).map(n=>[n.x,n.y])}})()")
    R=reach(I['g'],(int(I['spawn'][0]),int(I['spawn'][1])))
    npcok=all(I['g'][y][x] not in SOL and any(abs(a-x)+abs(bb-y)==1 for (a,bb) in R) for x,y in I['npcs'])
    for _ in range(25): pg.evaluate("WORLD.input.jy=1; WORLD.step(1/30)")
    pg.evaluate("WORLD.input.jy=0"); back=pg.evaluate("[WORLD.map.id, Math.floor(WORLD.pos().x/WORLD.TS), Math.floor(WORLD.pos().y/WORLD.TS)]")
    ok = lab=='Go inside' and inside==iid and npcok and len(I['npcs'])==1 and back[0]==c and abs(back[1]-dx)<=2 and back[2]>=dy+1
    if not ok: bad.append((pid,lab,inside,npcok,back))
  print('all 12 houses enter/resident/exit ok:', not bad, bad[:3])
  pg.evaluate("WORLD.enter('in-cp-a')"); pg.wait_for_timeout(900); print('music inside smithy:', pg.evaluate("MUSIC.current"))
  d=pg.evaluate("""()=>{const ids=['in-house-fennel','in-fh-b','in-cb-a']; const o=document.createElement('canvas'); o.width=3*12*16*2+16; o.height=9*16*2; const g=o.getContext('2d'); g.imageSmoothingEnabled=false;
    ids.forEach((id,i)=>{const c=PXW.terrain(WORLD.MAPS[id],id); g.drawImage(c,0,0,c.width,c.height,i*(12*32+8),0,c.width*2,c.height*2);}); return o.toDataURL();}""")
  open('/tmp/rooms.png','wb').write(base64.b64decode(d.split(',')[1]))
  pg.evaluate("WORLD.enter('in-fh-c'); WORLD.setPos(6.4*WORLD.TS, 5.6*WORLD.TS)"); pg.wait_for_timeout(300)
  pg.screenshot(path='/tmp/room_live.png', clip={'x':0,'y':200,'width':390,'height':380})
  print('errors:', errs or 'none'); b.close()
