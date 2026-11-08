# The opening, with REAL defaults (Meaning: being kept is the first thing played; the way out is the one that is lit): touch the light, pick a partner, and you stand at the door of Home with tall grass a few steps away and the one open gate lit by day, the others shut. Measured, not believed: tiles to the first grass and to the west gate by flood fill.
from playwright.sync_api import sync_playwright
from chk import check, done
from collections import deque
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1500)
  check('a new game opens on the title: one light to touch', pg.is_visible('#title') and pg.is_visible('#title-light'))
  pg.click('#title-light'); pg.wait_for_timeout(80)
  check('touching the light crosses into the game like a zone change', pg.evaluate("WORLD.transitioning && document.getElementById('title').classList.contains('out')"))
  pg.wait_for_timeout(1000)
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
  # the bot: the first keep, timed for real (action mode: a wild critter near you, reached by pathing over the real grid in real time, fought with the real attack until it drops its orb, the orb collected, the pouch opened, Keep pressed)
  import time
  pg.evaluate("WORLD.setPaused(false)")
  WALK=set('.,=WZ')
  def path(a, bt):   # BFS over the town grid, tile to tile
    if a==bt: return [bt]
    prev={a:None}; q=deque([a])
    while q:
      x,y=q.popleft()
      for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
        nx,ny=x+dx,y+dy
        if 0<=nx<r['W'] and 0<=ny<r['H'] and (nx,ny) not in prev and g[ny][nx] in WALK: prev[(nx,ny)]=(x,y); q.append((nx,ny))
        if (nx,ny)==bt: break
      if bt in prev: break
    if bt not in prev: return None
    out=[]; c=bt
    while c: out.append(c); c=prev[c]
    return out[::-1]
  t0=time.time(); tNear=None; tOrb=None; tKeep=None; stuck=0
  def foe(): return pg.evaluate("(()=>{const p=WORLD.pos();const f=ACT.foes().map(m=>({x:m.x,y:m.y,mode:m.mode,d:Math.hypot(m.x-p.x,m.y-p.y)/32})).sort((a,b)=>a.d-b.d);return f[0]||null})()")
  while time.time()-t0<60 and tKeep is None:
    if pg.evaluate("APP.game.state.pouch.length>0"):
      if tOrb is None: tOrb=time.time()-t0
      pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0; document.getElementById('pouch').click()"); pg.wait_for_timeout(500)
      pg.evaluate("APP.game.renderVals().keep && APP.game.renderVals().keep()"); pg.wait_for_timeout(400)
      if pg.evaluate("APP.game.state.caught.length")>=2: tKeep=time.time()-t0; pg.evaluate("APP.close && APP.close()"); pg.wait_for_timeout(300); pg.evaluate("WORLD.setPaused(false)")   # the card closes, the road is open again
      continue
    orb=pg.evaluate("(()=>{const o=ACT.orbs();return o.length?[o[0].x,o[0].y]:null})()")
    f=foe()
    tgt = {'x':orb[0],'y':orb[1],'d':9} if orb else f
    if not tgt: pg.wait_for_timeout(150); continue
    if tNear is None and f and f['d']<6: tNear=time.time()-t0
    if tgt['d']<=1.0 and not orb and tgt.get('mode')=='down':   # keep by staying (the review copy): a critter at 0 HP sits down; stand beside it until it is kept
      pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0"); pg.wait_for_timeout(250)
      if pg.evaluate("APP.game.state.caught.length")>=2: tKeep=time.time()-t0; pg.wait_for_timeout(300); pg.evaluate("APP.close && APP.close()"); pg.wait_for_timeout(300); pg.evaluate("WORLD.setPaused(false)")
      continue
    if tgt['d']<=1.15 and not orb and tgt.get('mode')!='down':
      pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0;ACT.attack()"); pg.wait_for_timeout(380); continue
    pos=pg.evaluate("WORLD.pos()"); a=(int(pos['x']//32),int(pos['y']//32)); bt=(int(tgt['x']//32),int(tgt['y']//32))
    pth=path(a,bt)
    if not pth: pg.wait_for_timeout(150); continue
    nxt=pth[1] if len(pth)>1 else pth[0]
    wx,wy=(nxt[0]+0.5)*32,(nxt[1]+0.6)*32
    if len(pth)<=2: wx,wy=tgt['x'],tgt['y']
    pg.evaluate("([wx,wy])=>{const p=WORLD.pos();const dx=wx-p.x,dy=wy-p.y,d=Math.hypot(dx,dy)||1;WORLD.input.jx=dx/d;WORLD.input.jy=dy/d}", [wx,wy]); pg.wait_for_timeout(100)
  pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0")
  print('seconds to a wild critter within 6 tiles:', None if tNear is None else round(tNear,1), '| to its orb in the pouch:', None if tOrb is None else round(tOrb,1), '| to the first keep:', None if tKeep is None else round(tKeep,1))
  check('a real first keep happens within 60 s of the opening (bot, real attack, no cheats)', tKeep is not None and tKeep<=60, [tNear, tOrb, tKeep])
  # the second minute: from the keep to the gate, into Moss Forest, to the sparkling patch until it stirs, on to Mossbrook and Wren's door (real walking, real time)
  def grid(): return pg.evaluate("({id:WORLD.map.id,W:WORLD.map.W,H:WORLD.map.H,g:WORLD.map.grid.map(r=>r.join(''))})")
  def goto(tile, limit=90):
    t=time.time(); G=grid(); last=None; still=0
    while time.time()-t<limit:
      st_=pg.evaluate("({p:WORLD.pos(),paused:WORLD.paused,scr:!document.getElementById('screen').hidden,dlg:!!APP.dialog,tr:WORLD.transitioning})")
      if last and abs(st_['p']['x']-last['x'])<1 and abs(st_['p']['y']-last['y'])<1: still+=1
      else: still=0
      last=st_['p']
      if still==30: print('  stuck at', [round(last['x']/32,1), round(last['y']/32,1)], 'on', G['id'], st_); 
      if st_['dlg']: pg.evaluate("APP.advance()")
      pos=pg.evaluate("WORLD.pos()"); a=(int(pos['x']//32),int(pos['y']//32))
      if Math_hyp(pos,tile)<0.7: pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0"); return True
      prev={a:None}; q=deque([a]); found=False
      while q and not found:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
          nx,ny=x+dx,y+dy
          if 0<=nx<G['W'] and 0<=ny<G['H'] and (nx,ny) not in prev and G['g'][ny][nx] in WALK: prev[(nx,ny)]=(x,y); q.append((nx,ny))
          if (nx,ny)==tile: found=True; break
      if not found: print('  no path from', a, 'to', tile, 'on', G['id']); return False
      pth=[]; c=tile
      while c: pth.append(c); c=prev[c]
      pth=pth[::-1]; nxt=pth[1] if len(pth)>1 else pth[0]
      pg.evaluate("([wx,wy])=>{const p=WORLD.pos();const dx=wx-p.x,dy=wy-p.y,d=Math.hypot(dx,dy)||1;WORLD.input.jx=dx/d;WORLD.input.jy=dy/d}", [(nxt[0]+0.5)*32,(nxt[1]+0.6)*32]); pg.wait_for_timeout(90)
    return False
  def Math_hyp(pos,tile): return ((pos['x']/32-(tile[0]+0.5))**2+(pos['y']/32-(tile[1]+0.6))**2)**0.5
  def cross(jx, jy, to, limit=8):
    t=time.time(); pg.evaluate("([x,y])=>{WORLD.input.jx=x;WORLD.input.jy=y}", [jx,jy])
    while time.time()-t<limit and pg.evaluate("WORLD.map.id")!=to: pg.wait_for_timeout(100)
    pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0"); pg.wait_for_timeout(900); return pg.evaluate("WORLD.map.id")==to
  T=time.time(); lap={}
  ok=goto((1,16)) and cross(-1,0,'moss'); lap['Moss Forest']=round(time.time()-T,1)
  check('the bot walks from the keep to the west gate and into Moss Forest', ok, lap)
  z=pg.evaluate("WORLD.map.rare"); ok2=ok and goto((z['x']+1,z['y']+1))
  t=time.time()
  while ok2 and time.time()-t<60 and not pg.evaluate("ACT.stirSpent()"):   # under a full parallel run the fight for the patch can take most of a minute   # the rare one comes only when it is quiet: the bot holds its ground in the patch and strikes only what comes within reach (real attack)
    f=foe()
    if f and f['d']<1.3: pg.evaluate("ACT.attack()")
    pg.wait_for_timeout(200)
  lap['the sparkling patch stirs and the rare one wakes']=round(time.time()-T,1)
  check('standing in the sparkling patch, something comes out of it', ok2 and pg.evaluate("ACT.stirSpent()"), lap)
  ok3=goto((1,14)) and cross(-1,0,'mossbrook'); lap['Mossbrook']=round(time.time()-T,1)
  check('on to Mossbrook', ok3, lap)
  d=pg.evaluate("WORLD.map.places.find(p=>p.id==='gym-wren').door"); ok4=ok3 and goto((d[0],d[1]+1)); lap["Wren's door"]=round(time.time()-T,1)
  check("to Wren's door, with the action button offering the gym", ok4 and 'gym' in pg.inner_text('#act-label').lower(), [lap, pg.inner_text('#act-label')])
  print('the second minute, seconds after the first keep:', lap, '| party HP at the end:', pg.evaluate("ACT.hero?[ACT.hero.hp,ACT.hero.max]:null"))
  check('no page errors', not errs, errs); b.close()
done()
