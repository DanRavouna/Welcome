# Scenery must not jitter against the ground while the camera moves: step the camera 1 px at a time and check an object's screen position changes by exactly 1 px per step (it used to snap to a 2 px grid on the SCREEN, so it hopped 0 or 2 px).
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{calm:true}),npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true")
  for _ in range(30):
    if pg.evaluate("!!APP.dialog"): pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{ambient:false})}); WORLD.enter('moss'); WORLD.setPaused(true)"); pg.wait_for_timeout(300)
  kinds=['bench','stakes','sled','skiff','bell']
  pg.evaluate("""(kinds)=>{const M=WORLD.map;M.rate=0;M.objects=M.objects||[];const P={x:M.W*16,y:M.H*16};WORLD.setPos(P.x,P.y);kinds.forEach((k,i)=>M.objects.push({kind:k,id:'jt'+k,x:Math.floor(P.x/32)+1,y:Math.floor(P.y/32)-2-i*2}))}""",kinds)
  base=pg.evaluate("WORLD.pos()")
  def left_edge(kind,k):
    return pg.evaluate("""([kind,k,bx,by])=>{WORLD.setPos(bx+k,by);const cv=document.querySelector('canvas'),g=cv.getContext('2d');const o=WORLD.map.objects.find(q=>q.id==='jt'+kind);
      const grab=()=>{WORLD.drawNow();return g.getImageData(0,0,cv.width,cv.height)};
      o.hidden=false;const A=grab();o.hidden=true;const B=grab();o.hidden=false;
      let minx=1e9,miny=1e9;for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=(y*cv.width+x)*4;if(A.data[i]!==B.data[i]||A.data[i+1]!==B.data[i+1]||A.data[i+2]!==B.data[i+2]){if(x<minx)minx=x;if(y<miny)miny=y}}
      return [minx,miny,WORLD.debug().cam.cx]}""",[kind,k,base['x'],base['y']])
  bad=[]
  for kind in kinds:
    pts=[left_edge(kind,k) for k in range(8)]
    steps=[pts[i+1][0]-pts[i][0] for i in range(7)]; cam=[pts[i+1][2]-pts[i][2] for i in range(7)]
    ok=all(s==-c for s,c in zip(steps,cam)) and all(pt[1]==pts[0][1] for pt in pts)
    print(kind,'| camera steps',cam,'| object left-edge steps',steps,'| smooth:',ok)
    if not ok: bad.append(kind)
  print('every object moves exactly with the ground:', not bad, bad or '')
  print('errors:', errs or 'none'); b.close()
