import json
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' else None); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1500)
    pg.screenshot(path='/tmp/w_start.png')
    # reachability: BFS over walkable tiles from spawn to each door-front tile
    res=pg.evaluate("""() => { const W=WORLD; const start=[Math.floor(W.pos().x/W.TS), Math.floor(W.pos().y/W.TS)];
      const seen=new Set([start.join()]), q=[start];
      while(q.length){ const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy; const k=nx+','+ny; if(seen.has(k)||W.solidAt(nx,ny)) continue; seen.add(k); q.push([nx,ny]); } }
      const out={}; W.PLACES.forEach(p=>{ const [dx,dy]=p.door; out[p.id]=seen.has(dx+','+(dy+1))||seen.has((dx+1)+','+(dy+1)); });
      W.SIGNS.forEach(s=>{ out['sign'+s.x]=[[1,0],[-1,0],[0,1],[0,-1]].some(([a,c])=>seen.has((s.x+a)+','+(s.y+c))); });
      out.walkable=seen.size; return out; }""")
    print('reachable:', res)
    # walk with real movement (keyboard) to each place using BFS path, then interact
    walk_js = """async (target) => { const W=WORLD; const TS=W.TS;
      const goal=target; const start=[Math.floor(W.pos().x/TS), Math.floor(W.pos().y/TS)];
      const prev=new Map([[start.join(),null]]); const q=[start]; let found=null;
      while(q.length){ const [x,y]=q.shift(); if(x===goal[0]&&y===goal[1]){found=[x,y];break;} for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy, k=nx+','+ny; if(prev.has(k)||W.solidAt(nx,ny)) continue; prev.set(k,[x,y]); q.push([nx,ny]); } }
      if(!found) return 'no path';
      const path=[]; let c=found; while(c){ path.unshift(c); c=prev.get(c.join()); }
      for (const [tx,ty] of path) { for (let i=0;i<120;i++){ const p=W.pos(); const gx=(tx+0.5)*TS, gy=(ty+0.6)*TS; const dx=gx-p.x, dy=gy-p.y; if (Math.hypot(dx,dy)<3) break; const d=Math.hypot(dx,dy); W.input.jx=dx/d; W.input.jy=dy/d; W.step(1/60); } }
      W.input.jx=0; W.input.jy=0; W.step(1/60); const n=W.nearest(); return n ? (n.place? n.place.id : 'sign') : 'none'; }"""
    shots={}
    for pid,tab in [('lab','dex'),('home','badges'),('board','badges'),('bell','battle')]:
        if pid=='bell': pg.evaluate("WORLD.enter('arena')"); pg.wait_for_timeout(100)   # the Arena is its own zone; the bell stands on its sand
        door=pg.evaluate(f"(()=>{{const p=WORLD.PLACES.find(x=>x.id==='{pid}'); return [p.door[0], p.door[1]+1];}})()")
        near=pg.evaluate(walk_js, door)
        pg.wait_for_timeout(100)
        label=pg.inner_text('#act-label'); enabled=pg.is_enabled('#act')
        pg.click('#act'); pg.wait_for_timeout(400)
        visible=pg.is_visible('#screen'); title=pg.evaluate("APP.game.state.tab")
        print(f'{pid}: walked -> near={near}, button="{label}" enabled={enabled}, screen open={visible}, tab={title}')
        pg.screenshot(path=f'/tmp/w_{pid}.png'); shots[pid]=1
        if visible: pg.click('#close-screen'); pg.wait_for_timeout(200)
        elif pg.evaluate("!!WORLD.map.interior"): pg.evaluate("WORLD.enter(WORLD.map.parent)"); pg.wait_for_timeout(150)   # Home, the Lab and the Arena are rooms: step back out
        assert not pg.is_visible('#screen')
    # sign (back in town: the Arena has none)
    pg.evaluate("WORLD.enter('town')"); pg.wait_for_timeout(150)
    s=pg.evaluate("(()=>{const s=WORLD.SIGNS[0]; return [s.x, s.y+1];})()")
    print('sign walk:', pg.evaluate(walk_js, s)); pg.click('#act'); pg.wait_for_timeout(200); print('toast:', pg.inner_text('#toast'))
    pg.screenshot(path='/tmp/w_sign.png')
    print('console errors:', errors if errors else 'none')
    b.close()
