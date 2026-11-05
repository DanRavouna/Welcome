# The cities' signature things and the climbs' own lights (Meaning: on the two climbs YOU light the way, and what you lit stays lit).
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]},adv:{clues:[],open:{},flags:{}}}); DEV.safe=true; window.__noTransition=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  want={'mossbrook':'c-growth','frosthold':'c-kettle','cinderport':'c-bench','coralbay':'c-lamp'}
  r=pg.evaluate("""(want)=>Object.keys(want).map(z=>{const M=WORLD.MAPS[z],o=(M.objects||[]).find(q=>q.id===want[z]);if(!o)return [z,'MISSING'];
    const walk=(x,y)=>x>=0&&y>=0&&x<M.W&&y<M.H&&'.,=WZG'.includes(M.grid[y][x]);const seen=new Set(),q=[[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])]];seen.add(q[0].join());
    while(q.length){const [x,y]=q.shift();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const k=(x+dx)+','+(y+dy);if(!seen.has(k)&&walk(x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy])}})}
    return [z,o.x+','+o.y,'reachable:'+[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)))]})""",want)
  print('city things:', r)
  art=pg.evaluate("""()=>{const cnt=(fn)=>{const cv=document.createElement('canvas');cv.width=cv.height=40;const g=cv.getContext('2d');fn(g);const d=g.getImageData(0,0,40,40).data;let all=0,warm=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>200){all++;if(d[i]>230&&d[i+2]<150)warm++}}return {all,warm}};const A=ADV.ART;
    return {notches:[1,2,3,4,5].map(n=>cnt(g=>A.growthpost(g,2,2,{n:n},0,{x:0})).all),harbor:[false,true].map(l=>cnt(g=>A.harborlamp(g,6,6,{lit:l},0,{x:0})).warm)}}""")
  print('growth post pixels with 1..5 notches:', art['notches'], '| harbour lamp warm pixels unlit/lit:', art['harbor'])
  # the climbs: lamps you pass stay lit, the ones ahead are dark
  for m in ['ascent','descent']:
    pg.evaluate("(m)=>{WORLD.enter(m);WORLD.setPaused(true)}",m); pg.wait_for_timeout(200)
    lamps=pg.evaluate("WORLD.map.trail.lamps"); n=pg.evaluate("WORLD.map.trail.cells.length"); seq=[]
    marks=[1, lamps[1]+2, lamps[3]+2, n-3]; cur=0
    for tgt in marks:
      for i in range(cur, tgt+1, 3):
        pg.evaluate("([i])=>{const c=WORLD.map.trail.cells[i];WORLD.setPos((c[0]+0.5)*32,(c[1]+0.5)*32)}",[i]); pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(15)
      cur=tgt
      for _ in range(35): pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(40)
      seq.append(pg.evaluate("(()=>{const F=APP.game.state.adv.flags;return WORLD.map.objects.filter(o=>o.own).sort((a,b)=>a.trail-b.trail).map(o=>F['own:'+o.id]?1:0).join('')})()"))
    print(m,'lit lamps (in road order) at four points on the climb:', seq, '| grows and never goes out:', all(sum(map(int,seq[i]))<=sum(map(int,seq[i+1])) for i in range(3)) and seq[-1].count('0')==0 and seq[0].count('1')<=1)
  # it persists
  pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("document.getElementById('starter')&&(document.getElementById('starter').hidden=true); window.__noTransition=true; WORLD.enter('ascent');WORLD.setPaused(true)"); pg.wait_for_timeout(300)
  for _ in range(40): pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(40)
  print('after a reload, lit lamps at the foot of the Ascent (all lit by the climb before):', pg.evaluate("(()=>{const F=APP.game.state.adv.flags;return WORLD.map.objects.filter(o=>o.own).sort((a,b)=>a.trail-b.trail).map(o=>F['own:'+o.id]?1:0).join('')})()"))
  print('errors:', errs or 'none'); b.close()
