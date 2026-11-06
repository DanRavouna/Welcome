# Zone maps: walking trips, grass encounters, map facts.
import json
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online']})")   # no one-time tip may queue onto a toast this test reads
    # 1. reachability on every map
    r=pg.evaluate("""() => { const out={}; for (const id of Object.keys(WORLD.MAPS)) { const M=WORLD.MAPS[id]; const S=new Set(['T','X','~','F','G','O','R']);
      const solid=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||S.has(M.grid[y][x]);
      const st=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])]; const seen=new Set([st.join()]), q=[st];
      while(q.length){const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny; if(seen.has(k)||solid(nx,ny))continue; seen.add(k); q.push([nx,ny]);}}
      let grass=0, grassReach=0, rare=0, rareReach=0; for(let y=0;y<M.H;y++)for(let x=0;x<M.W;x++){const t=M.grid[y][x]; if(t==='W'){grass++; if(seen.has(x+','+y))grassReach++;} if(t==='Z'){rare++; if(seen.has(x+','+y))rareReach++;}}
      const exitsOk=M.exits.every(e=>{ for(let k=e.a;k<=e.b;k++){ const t = e.edge==='n'?[k,0]:e.edge==='s'?[k,M.H-1]:e.edge==='w'?[0,k]:[M.W-1,k]; if(seen.has(t.join())) return true;} return false; });
      const signsOk=M.signs.every(s=>[[1,0],[-1,0],[0,1],[0,-1]].some(([a,c])=>seen.has((s.x+a)+','+(s.y+c))));
      const placesOk=M.places.every(pl=>seen.has(pl.door[0]+','+(pl.door[1]+1)));
      out[id]={grass:grassReach+'/'+grass, rare:rareReach+'/'+rare, exitsOk, signsOk, placesOk}; } return out; }""")
    for k,v in r.items(): print('map', k, v)
    # 2. walk through every exit and back using real movement
    walk = open('/tmp/walk.js').read()
    trip=pg.evaluate("""async () => { const res=[]; const TS=WORLD.TS; const r0=Math.random; Math.random=()=>0.999;
      const push=(dx,dy,n)=>{ for(let i=0;i<n;i++){ WORLD.input.jx=dx; WORLD.input.jy=dy; WORLD.step(1/60);} WORLD.input.jx=0; WORLD.input.jy=0; };
      const goEdge=(e)=>{ const M=WORLD.map; const mid=(e.a+e.b+1)/2; let gx,gy,dx=0,dy=0;
        if(e.edge==='n'){gx=mid;gy=0.6;dy=-1;} else if(e.edge==='s'){gx=mid;gy=M.H-0.4;dy=1;} else if(e.edge==='w'){gx=0.6;gy=mid+0.1;dx=-1;} else {gx=M.W-0.6;gy=mid+0.1;dx=1;}
        return [Math.floor(gx),Math.floor(gy),dx,dy]; };
      for (const z of ['frost','ember','moss','tide']) {
        WORLD.enter('town'); const e=WORLD.map.exits.find(x=>x.to===z); const [tx,ty,dx,dy]=goEdge(e);
        res.push(['town->'+z+' path', await window.__walk([tx,ty])]); push(dx,dy,90); res.push(['now in', WORLD.map.id]);
        const back=WORLD.map.exits[0]; const [bx,by,bdx,bdy]=goEdge(back);
        res.push([z+'->town path', await window.__walk([bx,by])]); push(bdx,bdy,90); res.push(['back in', WORLD.map.id]);
      } Math.random=r0; return res; }""".replace('window.__walk', '('+walk+')'))
    print('trips:', trip)
    # 3. encounter triggered by walking in grass
    enc=pg.evaluate("""async () => { if (!document.getElementById('screen').hidden) APP.close(); WORLD.enter('frost'); const M=WORLD.map; const TS=WORLD.TS; let tgt=null;
      for(let y=0;y<M.H&&!tgt;y++)for(let x=0;x<M.W&&!tgt;x++) if(M.grid[y][x]==='W') tgt=[x,y];
      const r0=Math.random; Math.random=()=>0.01;
      await (""" + walk + """)(tgt);
      for(let i=0;i<200 && document.getElementById('screen').hidden;i++){ WORLD.input.jx=(i%40<20)?1:-1; WORLD.step(1/60); await new Promise(r=>setTimeout(r,5)); }
      Math.random=r0; await new Promise(r=>setTimeout(r,400));
      return {open:!document.getElementById('screen').hidden, enc:APP.game.state.encounter, type:APP.game.make(APP.game.state.seed,1).element.name}; }""")
    print('grass encounter:', enc)
    pg.wait_for_timeout(300); pg.screenshot(path='/tmp/z_enc.png')
    btns=pg.locator('#screen button').all_inner_texts(); print('encounter buttons:', [x.strip().replace('\n',' ') for x in btns])
    print('no roll button in encounter:', not any('Roll a critter' in x for x in btns), '| seed tool hidden:', pg.locator('#seedField').count()==0)
    pg.get_by_role('button', name='Keep').click(); pg.wait_for_timeout(150)
    print('after keep:', pg.locator('#screen button').all_inner_texts()[-2:], 'kept=', pg.evaluate("APP.game.state.caught.length"))
    pg.get_by_role('button', name='Back to exploring').click(); pg.wait_for_timeout(150)
    print('closed:', pg.evaluate("document.getElementById('screen').hidden"), 'encounter cleared:', pg.evaluate("APP.game.state.encounter"))
    # 4. distribution
    d=pg.evaluate("""() => { const g=APP.game; let inT=0, rare=0, rareZ=0, myth=0, N=1500;
      for(let i=0;i<N;i++){ const k=g.make(g.pickSeed(['Frost','Stone'],false),1); if(['Frost','Stone'].includes(k.element.name)) inT++; if(k.rarity==='Rare'||k.rarity==='Mythic') rare++; }
      for(let i=0;i<N;i++){ const k=g.make(g.pickSeed(['Frost','Stone'],true),1); if(k.rarity==='Rare'||k.rarity==='Mythic') rareZ++; if(k.rarity==='Mythic') myth++; }
      return {zoneTypeShare:(inT/N).toFixed(2), rarePlusNormal:(rare/N).toFixed(3), rarePlusSparkle:(rareZ/N).toFixed(3), mythicSparkle:(myth/N).toFixed(3)}; }""")
    print('distribution:', d)
    # 5. out of rolls
    o=pg.evaluate("""async () => { const g=APP.game; g.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'], settings:Object.assign({},g.state.settings,{test:false}), day:new Date().toDateString(), used:20});   // no one-time tip may land on the toast read below
      APP.encounter({types:['Frost'], rare:false, zone:'Frost Peaks'}); await new Promise(r=>setTimeout(r,400));
      const r={screenOpen:!document.getElementById('screen').hidden, toast:document.getElementById('toast').textContent};
      g.update({settings:Object.assign({},g.state.settings,{test:true}), used:0}); return r; }""")
    print('out of rolls:', o)
    # 6. habitat hint + persistence of map
    h=pg.evaluate("""() => { APP.open('dex'); APP.game.setState({dexView:'species', speciesSel:25}); return APP.game.renderVals().spd.line; }""")
    print('species hint:', h); pg.evaluate("APP.close()")
    pg.evaluate("WORLD.enter('tide')"); pg.wait_for_timeout(1300); pg.reload(); pg.wait_for_timeout(1200)
    print('after reload map:', pg.evaluate("WORLD.map.id"), '| label:', pg.inner_text('#loc-name'))
    print('errors:', errors if errors else 'none')
    b.close()
