# Attack visual effects: generated frames per element, caching, hit-stop, shake, particle cap, Reduce motion, and that a real attack fires them.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  r=pg.evaluate("""(()=>{const els=[['Ember','#FF7A45'],['Tide','#3E8EF7'],['Moss','#4FB06D'],['Volt','#F5C518'],['Frost','#8FD8EA'],['Dusk','#8B6CF0'],['Stone','#A79C90'],['Bloom','#F27BB5']];
    const px=(cv)=>{const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n};
    const out={};const t0=performance.now();
    els.forEach(([el,hex])=>{const q=VFX.slashSet(el,hex,3,0),h=VFX.slashSet(el,hex,3,1),i1=VFX.impactSet(el,hex,0),i2=VFX.impactSet(el,hex,1);
      out[el]={quick:q.frames.map(px),heavy:h.frames.map(px),impact:i1.frames.map(px),sameCache:VFX.slashSet(el,hex,3,0)===q,orb:px(VFX.orb(el,hex))}});
    out.ms=Math.round(performance.now()-t0);return out})()""")
  bad=[el for el,v in r.items() if el!='ms' and (min(v['quick'][:4])<8 or min(v['heavy'][:4])<40 or min(v['impact'][:4])<10 or not v['sameCache'] or v['orb']<10)]
  print('every element generates non-empty quick / heavy / impact frames, cached:', not bad, bad or '', '| build time for 8 elements x 4 sets:', r['ms'], 'ms')
  print('heavy slash is bigger than quick (Ember):', sum(r['Ember']['heavy'])>sum(r['Ember']['quick']), '| last frame sparser than the middle:', r['Ember']['quick'][4]<r['Ember']['quick'][2])
  print('different elements look different (pixel counts):', len(set(sum(r[e]['quick']) for e in ['Ember','Tide','Moss','Volt','Frost','Dusk','Stone','Bloom']))>=7)
  # hit-stop, shake, particle cap, reduce motion
  s=pg.evaluate("""(()=>{VFX.clear();VFX.hitStop(0.05);const a=VFX.freeze(0.02),b=VFX.freeze(0.02),c=VFX.freeze(0.02);const d=VFX.freeze(0.02);
    VFX.shake(1,0,6);let mx=0;for(let t=0;t<2;t+=0.013){mx=Math.max(mx,Math.abs(VFX.shakeNow(t).x))}
    for(let i=0;i<60;i++)VFX.burst('Ember','#FF7A45',0,0,20,1,0,1);const cap=VFX.count;
    for(let i=0;i<80;i++)VFX.step(0.02);const left=VFX.count;
    return {freezes:[a,b,c,d],shakePx:mx,particlesCapped:cap<=220,drained:left===0}})()""")
  print('hit-stop freezes then releases:', s['freezes'], '| shake moves the camera:', s['shakePx']>0, '| particle cap:', s['particlesCapped'], '| everything drains:', s['drained'])
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:true})})")
  c=pg.evaluate("""(()=>{VFX.clear();VFX.hitStop(0.2);VFX.shake(1,0,9);VFX.burst('Ember','#FF7A45',0,0,20,1,0,1);return {freeze:VFX.freeze(0.02),shake:VFX.shakeNow(0.05),particles:VFX.count}})()""")
  print('Reduce motion: no hit-stop, no shake, few particles:', c)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:false})})")
  # in the game: an attack fires slash + impact + particles, a status shows an icon, no errors
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1200)
  pg.evaluate("VFX.clear(); ACT.enemies.length||ACT.spawn(2)")
  pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+2;m.y=p.y+38;m.hx=m.x;m.hy=m.y;m.mode='idle';m.cd=99;m.tele=0;m.s.hp=m.s.max;m.s.burn=3;ACT.enemies.slice(1).forEach(o=>{o.x=p.x+900;o.hx=o.x})})()"); pg.wait_for_timeout(80)
  box=pg.locator('#atk').bounding_box(); pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2-8); pg.wait_for_timeout(200)
  print('attack spawned effects:', pg.evaluate("VFX.count")>3, '| enemy was hit:', pg.evaluate("ACT.enemies[0].s.hp<ACT.enemies[0].s.max"))
  pg.wait_for_timeout(1500); print('effects drain after the blow:', pg.evaluate("VFX.count")<5)
  print('errors:', errs or 'none'); b.close()
