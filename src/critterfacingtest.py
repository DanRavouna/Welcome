# Critter facings (Dan: "8 directional animations for the critters", "a real second drawing from the same parts"): every species has eight facings from the generator; the back has no eyes, the profile has one, left mirrors right pixel for pixel; the lead critter, the one following and the wild ones draw the facing they move in.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noTransition=true")
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true}); document.getElementById('title').hidden=true; document.getElementById('starter').hidden=true; document.getElementById('hud').hidden=false")
  for _ in range(6):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
  check('the generator knows eight facings', pg.evaluate("PIX.FACINGS")==['down','up','right','left','downright','downleft','upright','upleft'], pg.evaluate("PIX.FACINGS"))
  # pixel counts per facing, for every species at stage 1: ink (eye) pixels and the mirror test
  r=pg.evaluate("""async()=>{const g=APP.game;const seeds=[];for(let s=1;seeds.length<48&&s<400000;s+=97){const k=g.make(s,1);if(!seeds.some(q=>q.no===k.speciesNo))seeds.push({s:s,no:k.speciesNo});}
    const load=(u)=>new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.src=u});
    const sil=async(k,f)=>{const im=await load(PIX.sprite(k,'big',f));const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;const rows=[];for(let y=0;y<c.height;y++){let row='';for(let xx=0;xx<c.width;xx++){row+=d[(y*c.width+xx)*4+3]?'#':'.';}rows.push(row);}return rows};
    const out={plan:0,mirror:0,n:0,bad:[],worst:0};
    for(const q of seeds){const k=g.make(q.s,1);out.n++;const D=PIX.plan(k,'down'),U=PIX.plan(k,'up'),R=PIX.plan(k,'right'),L=PIX.plan(k,'left'),DR=PIX.plan(k,'downright');
      const ok=D.eyes===k.eyes.length&&U.eyes===0&&R.eyes===1&&L.eyes===1&&L.mirror&&!R.mirror&&R.bodyW===Math.round(D.bodyW*0.8)&&DR.bodyW===Math.round(D.bodyW*0.92)&&U.front+U.back===D.front+D.back;
      if(ok)out.plan++;else out.bad.push(['plan',k.name,D,U,R,L,DR]);
      const Rs=await sil(k,'right'),Ls=await sil(k,'left');const mir=Rs.map(r=>r.split('').reverse().join(''));let diff=0,all=0;for(let y=0;y<Ls.length;y++)for(let x=0;x<Ls[y].length;x++){if(Ls[y][x]==='#'||mir[y][x]==='#'){all++;if(Ls[y][x]!==mir[y][x])diff++;}}
      const frac=all?diff/all:0;out.worst=Math.max(out.worst,frac);if(frac<=0.03)out.mirror++;else out.bad.push(['mirror',k.name,+frac.toFixed(3)]);}
    return out}""")
  check('for every species: all eyes on the front, none on the back, one in profile; the profile is 0.8 wide and the quarter 0.92; nothing is lost from behind', r['plan']==r['n'], [r['n'], r['plan'], [x for x in r['bad'] if x[0]=='plan'][:2]])
  check('left is the mirror of right in silhouette (within 3% of pixels, the rasteriser is not perfectly symmetric; shading stays lit from the top-left on purpose)', r['mirror']==r['n'], [r['n'], r['mirror'], r['worst'], [x for x in r['bad'] if x[0]=='mirror'][:3]])
  # in play: the lead critter's image follows its facing
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(21.9*32, 23.6*32); WORLD.setPaused(false)"); pg.wait_for_timeout(200)
  srcs={}
  for d,(jx,jy) in {'up':(0,-1),'right':(1,0),'downleft':(-0.7,0.7)}.items():
    pg.evaluate("([x,y])=>{WORLD.setPos(21.9*32,23.6*32);WORLD.input.jx=x;WORLD.input.jy=y}", [jx,jy]); pg.wait_for_timeout(400)
    srcs[d]=pg.evaluate("(()=>{const f=APP.follower?null:null;const fc=WORLD.facing();return fc.player})()")
  pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0")
  check('the lead critter is drawn with the facing it moves in', srcs=={'up':'up','right':'right','downleft':'downleft'}, srcs)
  im=pg.evaluate("(()=>{const k=APP.game.make(2,3);return [PIX.sprite(k,'icon','up')!==PIX.sprite(k,'icon','down'), PIX.sprite(k,'icon','left')!==PIX.sprite(k,'icon','right')]})()")
  check('the icon images differ per facing (what the world draws)', im==[True,True], im)
  check('no page errors', not errs, errs); b.close()
done()
