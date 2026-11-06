# Landmark props: definitions, draw and footprint check per id.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  print('defs:', pg.evaluate("Object.keys(LAND.defs)"))
  # every def draws something, and its footprint rows match its size
  print('draw/footprint check:', pg.evaluate("""(()=>{const out={};for(const [id,d] of Object.entries(LAND.defs)){const c=document.createElement('canvas');c.width=d.w*16+8;c.height=d.h*16+8;const g=c.getContext('2d');LAND.draw(g,{id,x:0,y:0},{gt:'#4E9A3E'});const px=g.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<px.length;i+=4)if(px[i]>0)n++;const f=LAND.foot(d);out[id]={pixels:n,rows:f.length,cols:f[0].length,ok:f.length===d.h&&f.every(r=>r.length===d.w)}}return out})()"""))
  # contact sheet
  pg.evaluate("""(()=>{const ids=Object.keys(LAND.defs);const c=document.createElement('canvas');c.width=600;c.height=130;c.style.cssText='position:fixed;left:0;top:0;z-index:99999;background:#74C25C;width:1200px;height:260px;image-rendering:pixelated';c.id='sheet';const g=c.getContext('2d');let x=8;for(const id of ids){const d=LAND.defs[id];LAND.draw(g,{id,x:x/16,y:1},{gt:'#3E8A3A'});x+=d.w*16+16}document.body.appendChild(c)})()""")
  pg.screenshot(path='/tmp/landmarks-sheet.png',clip={'x':0,'y':0,'width':390,'height':260})
  # placement per route
  for rid in ['route-mf','route-cm','route-fc','route-cc']:
    r=pg.evaluate(f"""(()=>{{const M=WORLD.MAPS['{rid}'];const bad=[];(M.props||[]).forEach(p=>{{for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)if(M.grid[p.y+y][p.x+x]!=='X')bad.push([p.id,p.x+x,p.y+y])}});return {{props:(M.props||[]).map(p=>p.id+'@'+p.x+','+p.y),signs:M.signs.length,notSolid:bad}}}})()""")
    print(rid, r)
  print('errors:', errs or 'none'); b.close()
