# Wind: trees, tall grass, flowers and water move in six poses, out of phase tile by tile; where the place means stillness (the cold, the peak) nothing moves, not even in a storm; Reduce motion stops it; a gust at the lamp.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{calm:false})}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  def wind(m,wx=None):
    pg.evaluate("([m,w])=>{window.__weather=w;WORLD.enter(m);WORLD.setPaused(false)}",[m,wx]); pg.wait_for_timeout(500)
    return pg.evaluate("(()=>{const w=WORLD.wind();return w?[w.A,Math.round(w.s*100)/100]:null})()")
  res={}
  for m in ['town','moss','mossbrook','ember','cinderport','tide','coralbay','route-mf','route-mf-gate','route-cm','route-cc','frost','frosthold','ascent','peak','route-fc','route-fc-shelf','dg-arch','in-home']:
    res[m]=wind(m,'clear')
  print('wind [amplitude class, strength] per place, clear sky:', res)
  still=[m for m in ['frost','frosthold','ascent','peak','route-fc','route-fc-shelf','dg-arch','in-home'] if m in res and res[m] and res[m][0]==0]
  print('still places (the cold, the peak, caves, interiors):', still)
  storm={m:wind(m,'storm') for m in ['moss','ember','frost','route-fc','peak']}
  print('in a storm:', storm, '| the cold stays still:', storm['frost'][0]==0 and storm['route-fc'][0]==0 and storm['peak'][0]==0, '| warm places blow harder:', storm['moss'][1]>res['moss'][1])
  # frames: six poses differ; overlay pixels only near animated tiles
  pg.evaluate("window.__weather='clear';WORLD.enter('moss');WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  r=pg.evaluate("""()=>{const t=WORLD.terrainDebug?WORLD.terrainDebug():null;return t}""")
  info=pg.evaluate("""()=>{const M=WORLD.MAPS.moss;const base=WORLD.terrainCanvas();const still=PXW.bake(base,0,0);const sets=[1,2].map(A=>{const fr=[];for(let k=0;k<6;k++)fr.push(PXW.bake(base,k,A));return fr});
    const sig=(cv)=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let h=0;for(let i=0;i<d.length;i+=997)h=(h*31+d[i]+d[i+3])|0;return h};
    const L=16,ok=(tx,ty)=>{const c=(M.grid[ty]||[])[tx];return c==='T'||c==='W'||c==='Z'||c==='~'||c===','};
    const cv=sets[0][1],d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,d0=still.getContext('2d').getImageData(0,0,still.width,still.height).data;let stray=0,changed=0;
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4;if(d[i]!==d0[i]||d[i+1]!==d0[i+1]||d[i+2]!==d0[i+2]){changed++;const tx=Math.floor(x/L),ty=Math.floor(y/L);let near=false;for(let dy=0;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(ok(tx+dx,ty+dy)){near=true;break}if(!near)stray++}}
    return {distinct:sets.map(s=>new Set(s.map(sig)).size),stray,changed}}""")
  print('distinct frames calm / strong:', info['distinct'], '| pixels that differ from the still picture away from any moving tile:', info['stray'], '(of', info['changed'], 'that differ)')
  ph=pg.evaluate("""()=>{const base=WORLD.terrainCanvas(),items=base.anim.items.filter(i=>i.k==='tree');let pairs=0,smooth=0,dirOk=0;
    items.forEach(i=>{const o=items.find(j=>j.Y===i.Y&&j.X===i.X+16);if(o){pairs++;const d=((o.ph-i.ph)%6+6)%6;if(d===0||d===1||d===5)smooth++;if(d===5||d===0)dirOk++}});
    // along one long row of trees the phase should walk steadily through all six values
    let row=items.filter(i=>i.Y===items[0].Y).sort((a,b)=>a.X-b.X).map(i=>i.ph);
    const wave=[];for(let x=0;x<34;x++){const t=items.find(j=>Math.round(j.X/16)===x&&j.Y===items[Math.floor(items.length/2)].Y);if(t)wave.push(t.ph)}
    const fx=base.anim.items.filter(i=>i.k==='flower').slice(0,200);let fs=0,fp=0;fx.forEach(i=>{const o=fx.find(j=>j.Y===i.Y&&Math.abs(j.X-i.X-16)<2);if(o){fp++;const d=((o.ph-i.ph)%6+6)%6;if(d<=1||d===5)fs++}});
    return {pairs,smooth,dirOk,wave,fp,fs}}""")
  print('neighbouring trees a step apart (0 or 1 pose) in the same direction:', ph['smooth'], 'of', ph['pairs'], '| a row of trees, phase by column:', ph['wave'][:16], '| smooth:', ph['smooth']>=ph['pairs']*0.95)
  print('wave direction (each tree one pose behind or level with the tree to its west):', ph['dirOk'], 'of', ph['pairs'], '| rolls west to east:', ph['dirOk']>=ph['pairs']*0.95)
  # reduce motion and the gust
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:true})})"); pg.wait_for_timeout(300)
  print('Reduce motion (calm) in Moss Forest:', pg.evaluate("(()=>{const w=WORLD.wind();return [w.A,w.s]})()"))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:false})}); WORLD.gust()"); pg.wait_for_timeout(300)
  print('gust in Moss Forest:', pg.evaluate("(()=>{const w=WORLD.wind();return [w.A,w.s]})()"), end=' ')
  pg.evaluate("WORLD.enter('frost');WORLD.gust()"); pg.wait_for_timeout(300); print('| gust in Frost Peaks:', pg.evaluate("(()=>{const w=WORLD.wind();return [w.A,w.s]})()"))
  print('errors:', errs or 'none'); b.close()
