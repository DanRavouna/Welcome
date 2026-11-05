from playwright.sync_api import sync_playwright
from collections import deque
SOL=set('TXF~GOR')
def reach(g, start):
  H=len(g); W=len(g[0]); seen={start}; q=deque([start])
  while q:
    x,y=q.popleft()
    for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
      nx,ny=x+dx,y+dy
      if 0<=nx<W and 0<=ny<H and (nx,ny) not in seen and g[ny][nx] not in SOL: seen.add((nx,ny)); q.append((nx,ny))
  return seen
def edgecell(e,W,H): return {'n':(e['a'],0),'s':(e['a'],H-1),'w':(0,e['a']),'e':(W-1,e['a'])}[e['edge']]
errs=[]
# Highland Pass (route-mf) is a network of maps now: wildtest.py covers it. These are the three single-map routes.
R={'route-cm':('cinderport','mossbrook',6),'route-fc':('frosthold','coralbay',9),'route-cc':('coralbay','cinderport',9)}
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  get=lambda mid: pg.evaluate(f"(()=>{{const M=WORLD.MAPS['{mid}']; return {{g:M.grid.map(r=>r.join('')), spawn:M.spawn, ex:M.exits, types:M.types, npcs:(WORLD.allNpcs()['{mid}']||[]).map(n=>[n.id,n.x,n.y,n.dir||'',!!n.trainer])}}}})()")
  for rid,(a,bb,gate) in R.items():
    M=get(rid); g=M['g']; H=len(g); W=len(g[0])
    ex={e['to']:e for e in M['ex']}; ca=edgecell(ex[a],W,H); cb=edgecell(ex[bb],W,H)
    con=cb in reach(g,ca)
    tr=M['npcs'][0]; v={'up':(0,-1),'down':(0,1),'left':(-1,0),'right':(1,0)}[tr[3]]; sight=[g[tr[2]+v[1]*k][tr[1]+v[0]*k] for k in range(1,4)]
    cityok=[]
    for c in (a,bb):
      C=get(c); cg=C['g']; ce=[e for e in C['ex'] if e['to']==rid][0]; cityok.append(edgecell(ce,len(cg[0]),len(cg)) in reach(cg,(int(C['spawn'][0]),int(C['spawn'][1]))))
    print(f"{rid}: {a}<->{bb} route connected {con} | city doors connected {cityok} | trainer {tr[0]} on '{g[tr[2]][tr[1]]}' sight {sight} | types {M['types']}")
    # walk: from city A through its door into the route, then off the far end into city B
    for frm,to in ((a,rid),(rid,bb)):
      C=get(frm); cg=C['g']; e=[x for x in C['ex'] if x['to']==to][0]; Wc=len(cg[0]); Hc=len(cg)
      s={'n':(e['a']+0.9,1.5,0,-1),'s':(e['a']+0.9,Hc-1.5,0,1),'w':(1.5,e['a']+1,-1,0),'e':(Wc-1.5,e['a']+1,1,0)}[e['edge']]
      pg.evaluate(f"WORLD.enter('{frm}'); WORLD.setPos({s[0]}*WORLD.TS,{s[1]}*WORLD.TS)")
      for _ in range(20): pg.evaluate(f"WORLD.input.jx={s[2]}; WORLD.input.jy={s[3]}; WORLD.step(1/30)")
      pg.evaluate("WORLD.input.jx=0; WORLD.input.jy=0")
      print(f"   walk {frm} -> {pg.evaluate('WORLD.map.id')} (expected {to})")
  # gates: level 1, real mode, at Mossbrook north door
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), xp:0})")
  C=get('mossbrook'); e=[x for x in C['ex'] if x['to']=='route-mf-gate'][0]
  pg.evaluate(f"WORLD.enter('mossbrook'); WORLD.setPos({e['a']+0.9}*WORLD.TS, 2.3*WORLD.TS)")
  for _ in range(30): pg.evaluate("WORLD.input.jy=-1; WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); print('lv1 at the Highland Gate door -> map:', pg.evaluate("WORLD.map.id"), '| toast:', pg.inner_text('#toast'))
  pg.evaluate("APP.game.update({xp:99999})")
  for _ in range(30): pg.evaluate("WORLD.input.jy=-1; WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); print('high level -> map:', pg.evaluate("WORLD.map.id"))
  pg.mouse.click(200,400); pg.wait_for_timeout(900); print('route music:', pg.evaluate("MUSIC.current"))
  print('errors:', errs or 'none'); b.close()
