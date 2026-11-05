# Wind: trees, tall grass, flowers and water move in six poses on one west-to-east wave with a little irregularity; each place has its own wind that changes over time (steady in a pass or at sea, calm spells and gusts in a forest or town, restless and strong in the fire lands); the cold never moves; Reduce motion stops it; a gust at the lamp.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{calm:false})}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  # 1. each place's wind over four minutes (before weather, night or a gust)
  stats=pg.evaluate("""()=>{const out={};['town','moss','mossbrook','ember','cinderport','tide','coralbay','route-mf','route-mf-gate','route-cm','route-cc','frost','frosthold','ascent','peak','route-fc','route-fc-shelf'].forEach(id=>{const v=[];for(let t=0;t<240;t+=0.5)v.push(WORLD.windLevel(id,t));
    const calm=v.filter(x=>x<0.12).length/v.length,gust=v.filter(x=>x>0.7).length/v.length;let spells=[],run=0;v.forEach(x=>{if(x<0.12)run++;else{if(run)spells.push(run/2);run=0}});if(run)spells.push(run/2);
    out[id]={calm:Math.round(calm*100),gust:Math.round(gust*100),max:Math.round(Math.max(...v)*100)/100,spells:spells.length,longest:Math.max(0,...spells)}});return out}""")
  for k,v in stats.items(): print(f"{k:15s} calm {v['calm']:3d}% | strong {v['gust']:3d}% | peak {v['max']:.2f} | calm spells {v['spells']} (longest {v['longest']} s)")
  cold=[k for k in ['frost','frosthold','ascent','peak','route-fc','route-fc-shelf'] if stats[k]['max']==0]
  print('the cold never has any wind:', len(cold)==6, '| steady places (pass, sea) are never calm:', all(stats[k]['calm']==0 for k in ['route-mf','route-mf-gate','tide','coralbay','route-cc']), '| forests and town have calm spells and breezes:', all(stats[k]['calm']>=25 and stats[k]['spells']>=2 for k in ['moss','mossbrook','town']), '| fire lands gust hard with short calms:', all(stats[k]['gust']>=20 and stats[k]['calm']<45 for k in ['ember','cinderport','route-cm']))
  # 2. in play: the cold stays still in a storm and at a gust; windy places get stronger; night is calmer; Reduce motion stops it
  def now(m,wx=None,tod='day'):
    pg.evaluate("([m,w,t])=>{window.__weather=w;window.__tod=t;WORLD.enter(m);WORLD.setPaused(false)}",[m,wx,tod]); pg.wait_for_timeout(450)
    return pg.evaluate("(()=>{const w=WORLD.wind();return w?[w.A,Math.round(w.s*100)/100]:null})()")
  print('cold in a storm:', [now(m,'storm') for m in ['frost','route-fc','peak','ascent']], '| caves and interiors:', [now(m,'clear') for m in ['dg-arch','in-home']])
  mx=lambda m,tod:max((now(m,'clear',tod) or [0,0])[1] for _ in range(1))
  night=[now('ember','clear','night')[1] for _ in range(8)]
  print('Ember Fields at night, strength samples:', night, '| never above 0.6:', max(night)<=0.61)
  pg.evaluate("window.__tod='day'")
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:true})})"); pg.wait_for_timeout(300); print('Reduce motion in Moss Forest:', pg.evaluate("(()=>{const w=WORLD.wind();return [w.A,w.s]})()"))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:false})}); window.__weather='clear'; WORLD.enter('moss'); WORLD.gust()"); pg.wait_for_timeout(400)
  print('gust in Moss Forest:', pg.evaluate("(()=>{const w=WORLD.wind();return [w.A,w.s]})()"), end=' ')
  pg.evaluate("WORLD.enter('frost');WORLD.gust()"); pg.wait_for_timeout(400); print('| gust in Frost Peaks:', pg.evaluate("(()=>{const w=WORLD.wind();return [w.A,w.s]})()"))
  # 3. the picture: six distinct frames at both strengths, nothing differs away from moving tiles, one wave with a little irregularity
  pg.evaluate("window.__weather='clear';WORLD.enter('moss');WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  info=pg.evaluate("""()=>{const M=WORLD.MAPS.moss;const base=WORLD.terrainCanvas();const still=PXW.bake(base,0,0);const sets=[1,2].map(A=>{const fr=[];for(let k=0;k<6;k++)fr.push(PXW.bake(base,k,A));return fr});
    const sig=(cv)=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let h=0;for(let i=0;i<d.length;i+=997)h=(h*31+d[i]+d[i+3])|0;return h};
    const L=16,ok=(tx,ty)=>{const c=(M.grid[ty]||[])[tx];return c==='T'||c==='W'||c==='Z'||c==='~'||c===','};
    const cv=sets[0][1],d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,d0=still.getContext('2d').getImageData(0,0,still.width,still.height).data;let stray=0,changed=0;
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4;if(d[i]!==d0[i]||d[i+1]!==d0[i+1]||d[i+2]!==d0[i+2]){changed++;const tx=Math.floor(x/L),ty=Math.floor(y/L);let near=false;for(let dy=0;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++)if(ok(tx+dx,ty+dy)){near=true;break}if(!near)stray++}}
    const items=base.anim.items.filter(i=>i.k==='tree');let pairs=0,smooth=0,east=0;items.forEach(i=>{const o=items.find(j=>j.Y===i.Y&&j.X===i.X+16);if(o){pairs++;const dd=((o.ph-i.ph)%6+6)%6;if(dd===0||dd===1||dd===5)smooth++;if(dd===5||dd===0||dd===4)east++}});
    const gains=items.map(i=>i.gain);return {distinct:sets.map(s=>new Set(s.map(sig)).size),stray,changed,pairs,smooth,east,gmin:Math.min(...gains),gmax:Math.max(...gains)}}""")
  print('distinct frames calm / strong:', info['distinct'], '| pixels that differ from the still picture away from moving tiles:', info['stray'], 'of', info['changed'])
  print('neighbouring trees: a step apart', info['smooth'], 'of', info['pairs'], '| follow the wave west to east', info['east'], '| smooth but not perfect:', 0.6*info['pairs']<=info['smooth']<0.97*info['pairs'], '| stiffness per tree', round(info['gmin'],2), 'to', round(info['gmax'],2))
  print('errors:', errs or 'none'); b.close()
