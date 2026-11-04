# Action mode phase 3: one behaviour per element (dash, shoot, thorn ring, darting melee, shards, blink, slam, healer), telegraphs, projectiles, damage radius.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1300)
  print('a behaviour for every element:', pg.evaluate("Object.keys(ACT.BEH).sort().join(',')"))
  def setup(elem, dx, dy, n=1):
    # dx, dy are distances in px along the first open direction (the player's surroundings have trees)
    pg.evaluate("""(([el,dx,dy,n])=>{ACT.enemies.splice(0);ACT.spawn(n,el);const p=WORLD.pos(),px=p.x/32,py=p.y/32;
      const dirs=[[0,1],[1,0],[-1,0],[0,-1]];let best=dirs[0],bl=-1;for(const d of dirs){let l=0;while(l<7&&!WORLD.solidAt(Math.floor(px+d[0]*(l+1)),Math.floor(py+d[1]*(l+1))))l++;if(l>bl){bl=l;best=d}}
      const dist=Math.hypot(dx,dy);window.__dir=best;ACT.enemies.forEach((m,i)=>{m.x=p.x+best[0]*dist+(best[1]?i*30:0);m.y=p.y+best[1]*dist+(best[0]?i*30:0);m.hx=m.x;m.hy=m.y;m.mode='chase';m.cd=0;m.tele=0;m.dash=0;m.retreat=0});ACT.hero.hp=ACT.hero.max;ACT.hero.guard=false})(%s)"""%[elem,dx,dy,n]); pg.wait_for_timeout(30)
  hpH=lambda: pg.evaluate("ACT.hero.hp")
  info=lambda: pg.evaluate("(()=>{const m=ACT.enemies[0];const p=WORLD.pos();return m?{el:m.k.element.name,d:Math.hypot(m.x-p.x,m.y-p.y)/32,tele:m.tele,kind:m.kind,dash:m.dash,shots:ACT.shots.length}:null})()")
  def watch(secs, step=50):
    out=[]; 
    for i in range(int(secs*1000/step)): pg.wait_for_timeout(step); out.append(info())
    return [o for o in out if o]
  # Tide: keeps its distance and shoots; the telegraph comes first; the bubble hurts
  setup('Tide',70,10); h0=hpH(); w=watch(5); print('Tide: telegraphed before shooting:', any(o['tele']>0 and o['kind']=='shoot' for o in w), '| fired a projectile:', any(o['shots']>0 for o in w), '| final distance (tiles):', round(w[-1]['d'],1), '| hurt:', hpH()<h0)
  # Frost: faster shard than Tide
  print('shard speed Frost vs Tide:', pg.evaluate("[ACT.BEH.Frost.ps, ACT.BEH.Tide.ps]"))
  # Ember: telegraph, then a fast charge that connects
  setup('Ember',100,0); h0=hpH(); prev=None; fast=0; tele=False
  for i in range(70):
    pg.wait_for_timeout(40); o=info()
    if not o: break
    tele = tele or (o['tele']>0 and o['kind']=='dash')
    cur=pg.evaluate("(()=>{const m=ACT.enemies[0];return [m.x,m.y]})()")
    if prev and ((cur[0]-prev[0])**2+(cur[1]-prev[1])**2)**.5>6: fast+=1
    prev=cur
  print('Ember: telegraphed charge:', tele, '| fast frames while charging:', fast>0, '| hit you:', hpH()<h0)
  # Moss and Stone: ring damage depends on distance
  for el in ['Moss','Stone']:
    setup(el,26,0); pg.evaluate("(()=>{const m=ACT.enemies[0];m.kind='aoe';m.aim={x:m.x,y:m.y};m.tele=0.02})()"); h0=hpH(); pg.wait_for_timeout(120); inside=hpH()<h0
    setup(el,150,0); pg.evaluate("(()=>{const m=ACT.enemies[0];m.kind='aoe';m.aim={x:m.x,y:m.y};m.tele=0.02})()"); h1=hpH(); pg.wait_for_timeout(120); print(el,'ring: hurts up close', inside, '| misses at 4.7 tiles:', hpH()==h1, '| radius tiles:', pg.evaluate("ACT.BEH.%s.rad"%el))
  # Volt: darts away after a hit, and is the fastest
  setup('Volt',26,0); pg.evaluate("(()=>{const m=ACT.enemies[0];m.kind='melee';m.aim={x:m.x,y:m.y};m.tele=0.02})()"); h0=hpH(); pg.wait_for_timeout(120); print('Volt: light hit', hpH()<h0, '| runs away afterwards:', pg.evaluate("ACT.enemies[0].retreat>0"), '| fastest mover:', pg.evaluate("Math.max(...Object.values(ACT.BEH).map(b=>b.spd))===ACT.BEH.Volt.spd"))
  # Dusk: blinks from far away to right next to you
  setup('Dusk',160,0); seen=False; near=None
  for i in range(70):
    pg.wait_for_timeout(50); o=info()
    if not o: break
    seen = seen or (o['kind']=='blink' and o['tele']>0)
    if seen and o['d']<1.6: near=o['d']; break
  print('Dusk: telegraphed blink:', seen, '| appears next to you (tiles):', None if near is None else round(near,1))
  # Bloom heals a hurt friend
  setup('Bloom',110,0,2); pg.evaluate("(()=>{const [a,b]=ACT.enemies;b.s.hp=Math.round(b.s.max*0.4);window.__hb=b.s.hp})()"); pg.wait_for_timeout(3500); print('Bloom heals an ally:', pg.evaluate("ACT.enemies.some(m=>m.s.hp>window.__hb)||ACT.enemies.length<2"), '| hp', pg.evaluate("window.__hb"),'->',pg.evaluate("Math.max(...ACT.enemies.map(m=>m.s.hp))"))
  # guard shrinks any enemy hit (same Game.hit): fixed dice, guarded vs not
  print('same hit, guarded vs not:', pg.evaluate("(()=>{const g=APP.game,h=ACT.hero,m={s:g.newBattle(h.k,g.make(7,3,15),0).s[1]},r=()=>0.5;h.hp=h.max;h.guard=false;g.hit(m.s,h,60,r);const a=h.max-h.hp;h.hp=h.max;h.guard=true;g.hit(m.s,h,60,r);const b=h.max-h.hp;h.guard=false;h.hp=h.max;return [Math.round(a),Math.round(b)]})()"))
  # a bubble is used up when it lands and cannot cross trees
  setup('Tide',90,0); pg.wait_for_timeout(3500); print('no bubble left flying after it lands:', pg.evaluate("ACT.shots.length<=1"))
  print('errors:', errs or 'none'); b.close()
