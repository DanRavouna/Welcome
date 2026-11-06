# Evolution look: the base blob must never change (golden fingerprints), evolved forms must fit the sprite canvas,
# really differ from the base form (more parts, bigger silhouette), and keep stats/moves/names exactly as before.
from playwright.sync_api import sync_playwright
GOLD={'1':'9103d3f0','2':'f1360b9a','3':'a5e0c705','5':'c63261b9','7':'10e1e56c','12':'b4f078ae','19':'c1d52878','33':'f7911d3d','77':'d91031f0','101':'142c0880','250':'94b12ef9','404':'a59b40d3','999':'ec96873a','1234':'b3f19e33','4321':'4de1b027','9999':'cc7c886b','31337':'84b0c74b','77777':'25e3b5ca','123456':'fe08592c','999999':'32fae3e4'}
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  # 1) base blob unchanged
  got=pg.evaluate("""(()=>{const g=APP.game,H=(s)=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)};
    const out={};for(const s of %s){const k=g.make(s,1);const o={};for(const key of Object.keys(k)){if(typeof k[key]!=='function'&&key!=='seedLabel')o[key]=k[key]}out[s]=H(JSON.stringify(o))}return out})()"""%list(map(int,GOLD)))
  print('stage 1 blobs identical to the golden build (20 seeds):', got==GOLD)
  # 2) evolved forms fit inside 240x210 (rotated bounding boxes), 600 seeds x 2 stages
  r=pg.evaluate("""()=>{const g=APP.game;let bad=0,n=0;const ext=(p)=>{const a=(p.rot||0)*Math.PI/180,cx=p.x+p.w/2,cy=p.y+p.h/2,pts=[[-p.w/2,-p.h/2],[p.w/2,-p.h/2],[p.w/2,p.h/2],[-p.w/2,p.h/2]].map(([x,y])=>[cx+x*Math.cos(a)-y*Math.sin(a),cy+x*Math.sin(a)+y*Math.cos(a)]);return [Math.min(...pts.map(q=>q[0])),Math.max(...pts.map(q=>q[0])),Math.min(...pts.map(q=>q[1])),Math.max(...pts.map(q=>q[1]))]};
    for(let s=1;s<=600;s++)for(const st of [2,3]){const k=g.make(s,st);n++;let ok=true;for(const p of (k.parts||[]).concat([k.body])){if(p.bw===0&&/rgba\\(255,216,77/.test(p.bg))continue;const e=ext(p);if(e[0]<0||e[1]>240||e[2]<0||e[3]>210)ok=false}if(!ok)bad++}return {n,bad}}""")
  print('evolved forms clipped by the sprite edge:', r)
  # 3) evolutions really change: more parts, a bigger silhouette, wings only at stage 3; stats rules unchanged
  r=pg.evaluate("""async()=>{const g=APP.game;const load=(u)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=u});
    const area=async(k)=>{const im=await load(PIX.sprite(k,'big'));const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n};
    let more=0,grow=0,tot=0,wings=0,statsOk=0;for(let s=1;s<=240;s++){const a=g.make(s,1),b2=g.make(s,2),c=g.make(s,3);tot++;
      if(b2.parts.length>a.parts.length&&c.parts.length>b2.parts.length)more++;
      const [A,B,C]=[await area(a),await area(b2),await area(c)];if(B>A&&C>B)grow++;
      if(c.parts.length-b2.parts.length>=4)wings++;
      const sum=(k)=>k.stats.reduce((x,q)=>x+q.value,0);if(sum(b2)>=sum(a)&&sum(c)>=sum(b2))statsOk++}
    return {seeds:tot,'more parts each stage':more,'bigger sprite each stage':grow,'stage 3 adds wings/gem':wings,'stats rise per stage':statsOk}}""")
  print('evolution vs base:', r)
  # 4) every type has all three features defined
  print('type kits complete:', pg.evaluate("Object.keys(EVO_COL).every(t=>EVO_FEAT[t]&&EVO_FEAT[t].crest&&EVO_FEAT[t].tail&&EVO_WING[EVO_FEAT[t].wing])&&EVO_PLAN.length===6"))
  print('errors:', errs or 'none'); b.close()
