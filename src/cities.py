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
errs=[]
C={'mossbrook':('moss','wren'),'frosthold':('frost','glacia'),'cinderport':('ember','blaze'),'coralbay':('tide','coral')}
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  for cid,(z,lid) in C.items():
    M=pg.evaluate(f"(()=>{{const M=WORLD.MAPS.{cid}; return {{g:M.grid.map(r=>r.join('')), spawn:M.spawn, doors:M.places.map(p=>[p.door[0],p.door[1]+1]), npcs:WORLD.allNpcs().{cid}.map(n=>[n.id,n.x,n.y,n.dir||'',!!n.trainer])}}}})()")
    g=M['g']; R=reach(g,(int(M['spawn'][0]),int(M['spawn'][1])))
    doors=all(tuple(d) in R for d in M['doors'])
    onSolid=[n[0] for n in M['npcs'] if g[n[2]][n[1]] in SOL]
    npcOk=all(any(abs(x-n[1])+abs(y-n[2])==1 for (x,y) in R) for n in M['npcs'])
    sight=[]
    for n in M['npcs']:
      if n[4]:
        v={'up':(0,-1),'down':(0,1),'left':(-1,0),'right':(1,0)}[n[3]]; cells=[(n[1]+v[0]*k,n[2]+v[1]*k) for k in range(1,5)]
        sight.append((n[0],[g[y][x] for x,y in cells]))
    Z=pg.evaluate(f"(()=>{{const M=WORLD.MAPS.{z}; return {{g:M.grid.map(r=>r.join('')), spawn:M.spawn, ex:M.exits}}}})()")
    Rz=reach(Z['g'],(int(Z['spawn'][0]),int(Z['spawn'][1]))); e=[x for x in Z['ex'] if x['to']==cid][0]
    W=len(Z['g'][0]); H=len(Z['g']); edgeCell={'n':(e['a'],0),'s':(e['a'],H-1),'w':(0,e['a']),'e':(W-1,e['a'])}[e['edge']]
    print(f"{cid:10s} doors {doors} | npc reachable {npcOk} | on solid {onSolid} | zone link {edgeCell in Rz} | leader home {pg.evaluate(f'npcHome(\"{lid}\")')} | town hop {pg.evaluate(f'WORLD.nextHop(\"town\",\"{cid}\")')} | trainer sight {sight}")
    # walk across the link
    a={'n':(e['a']+0.9,1.5,0,-1),'s':(e['a']+0.9,H-1.5,0,1),'w':(1.5,e['a']+1,-1,0),'e':(W-1.5,e['a']+1,1,0)}[e['edge']]
    pg.evaluate(f"WORLD.enter('{z}'); WORLD.setPos({a[0]}*WORLD.TS,{a[1]}*WORLD.TS)")
    for _ in range(20): pg.evaluate(f"WORLD.input.jx={a[2]}; WORLD.input.jy={a[3]}; WORLD.step(1/30)")
    pg.evaluate("WORLD.input.jx=0; WORLD.input.jy=0")
    print('   walk ->', pg.evaluate("WORLD.map.id"))
  pg.mouse.click(200,400); pg.wait_for_timeout(900); print('music in', pg.evaluate("WORLD.map.id"), '->', pg.evaluate("MUSIC.current"))
  print('errors:', errs or 'none'); b.close()
