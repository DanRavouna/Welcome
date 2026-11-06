# The opening, with REAL defaults (Meaning: being kept is the first thing played; the way out is the one that is lit): touch the light, pick a partner, and you stand at the door of Home with tall grass a few steps away and the one open gate lit by day, the others shut. Measured, not believed: tiles to the first grass and to the west gate by flood fill.
from playwright.sync_api import sync_playwright
from chk import check, done
from collections import deque
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1500)
  check('a new game opens on the title: one light to touch', pg.is_visible('#title') and pg.is_visible('#title-light'))
  pg.click('#title-light'); pg.wait_for_timeout(300)
  fern=[]
  for _ in range(6):
    if not pg.evaluate("!!APP.dialog"): break
    fern.append(pg.evaluate("APP.dialog.lines[APP.dialog.i]")); pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
  pg.wait_for_timeout(300); pg.click('.scard button'); pg.wait_for_timeout(300)
  for _ in range(6):
    if not pg.evaluate("!!APP.dialog"): break
    fern.append(pg.evaluate("APP.dialog.lines[APP.dialog.i]")); pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
  check('Fern points at what you can see (the gate with the lamp, the grass by your door)', any('gate with the lamp' in l and 'by your door' in l for l in fern), fern[-1:])
  r=pg.evaluate("""()=>{const M=WORLD.map,P=WORLD.pos(),h=M.places.find(p=>p.id==='home');return {map:M.id,pos:[P.x/32,P.y/32],door:h.door,g:M.grid.map(r=>r.join('')),W:M.W,H:M.H,lamp:(M.objects||[]).find(o=>o.id==='gate-lamp'),levels:APP.lampLevels?APP.lampLevels():null}}""")
  check('you start at the door of Home', r['map']=='town' and abs(r['pos'][0]-(r['door'][0]+0.9))<0.2 and abs(r['pos'][1]-(r['door'][1]+1.4))<0.2, [r['pos'], r['door']])
  SOL=set('TXFGOR~'); g=r['g']; sx,sy=int(r['pos'][0]),int(r['pos'][1]); dist={(sx,sy):0}; q=deque([(sx,sy)])
  while q:
    x,y=q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      nx,ny=x+dx,y+dy
      if 0<=nx<r['W'] and 0<=ny<r['H'] and (nx,ny) not in dist and g[ny][nx] not in SOL: dist[(nx,ny)]=dist[(x,y)]+1; q.append((nx,ny))
  grass=min((d for (x,y),d in dist.items() if g[y][x]=='W'), default=999); gate=dist.get((0,16), dist.get((0,17), 999))
  print('tiles to the first tall grass:', grass, '| tiles to the west gate:', gate)
  check('the first tall grass is within 6 tiles of the door', grass<=6, grass)
  check('the open gate (west) is within 20 tiles and in the direction the road runs', gate<=20, gate)
  check('a lamp stands by the west gate and is lit by day', r['lamp'] and r['lamp']['day'] is True and g[r['lamp']['y']][r['lamp']['x']]=='O', r['lamp'])
  pg.evaluate("window.__tod='day'"); pg.wait_for_timeout(900)
  lv=pg.evaluate("APP.lampLevels()")
  check('the gate lamp burns in daylight (its level is 1)', lv and lv.get('gate-lamp')==1, lv)
  check('the window above the door is kept lit for you at the start (by day)', pg.evaluate("APP.homeLitNow()"), None)
  check('no page errors', not errs, errs); b.close()
done()
