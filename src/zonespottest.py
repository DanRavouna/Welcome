# One signature thing per Sproutvale zone: sprouts that grow with your seals (Moss), a flame held in ice (Frost), a hearth with fresh logs each day (Ember), a tied skiff whose lamp is lit at night (Tide).
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true; document.getElementById('starter').hidden=true")
  want={'moss':'z-sprouts','frost':'z-icelamp','ember':'z-hearth','tide':'z-moored'}
  r=pg.evaluate("""(want)=>Object.keys(want).map(z=>{const M=WORLD.MAPS[z],o=(M.objects||[]).find(q=>q.id===want[z]);if(!o)return [z,'MISSING'];
    // reachable: flood fill from the spawn over tiles that are not solid, then any neighbour of the object
    const walk=(x,y)=>x>=0&&y>=0&&x<M.W&&y<M.H&&'.,=WZG'.includes(M.grid[y][x]);const seen=new Set(),q=[[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])]];seen.add(q[0].join());
    while(q.length){const [x,y]=q.shift();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const k=(x+dx)+','+(y+dy);if(!seen.has(k)&&walk(x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy])}})}
    const near=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));return [z,o.x+','+o.y,'reachable:'+near]})""",want)
  print('placed:', r)
  # the art itself, on a blank canvas: sprouts grow with the stage, the hearth stack grows with the logs, the skiff lamp is lit only when asked
  r=pg.evaluate("""()=>{const cnt=(fn)=>{const cv=document.createElement('canvas');cv.width=cv.height=40;const g=cv.getContext('2d');fn(g);const d=g.getImageData(0,0,40,40).data;let green=0,warm=0,all=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>200){all++;if(d[i+1]>d[i]+30&&d[i+1]>d[i+2]+30)green++;if(d[i]>230&&d[i+2]<140)warm++}}return {green,warm,all}};
    const A=ADV.ART;return {sprouts:[0,1,2,3,4].map(k=>cnt(g=>A.sprouts(g,2,2,{stage:k},0,{x:0})).green),logs:[1,2,3].map(k=>cnt(g=>A.hearth(g,2,2,{logs:k},0,{x:0})).all),skiff:[false,true].map(l=>cnt(g=>A.moored(g,6,6,{lit:l},0,{x:0})).warm)}}""")
  print('sprout leaf pixels by stage 0..4:', r['sprouts'], '| grows:', all(r['sprouts'][i]<r['sprouts'][i+1] for i in range(4)))
  print('hearth pixels with 1..3 logs:', r['logs'], '| grows:', r['logs'][0]<r['logs'][1]<r['logs'][2])
  print('skiff lamp warm pixels unlit / lit:', r['skiff'], '| lit only when asked:', r['skiff'][1]>r['skiff'][0])
  print('errors:', errs or 'none'); b.close()
