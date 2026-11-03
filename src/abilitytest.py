from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:9},{seed:5001,stage:1}], party:[2,5001], fighter:2, intro:true})")
  # find one critter per type
  seeds=pg.evaluate("""(()=>{const g=APP.game,o={};for(let s=1;s<4000&&Object.keys(o).length<8;s++){const k=g.make(s,1);if(!o[k.element.name])o[k.element.name]=s}return o})()""")
  print('every type has an ability:', pg.evaluate("Object.keys(ABILITIES).length"), list(seeds))
  R=lambda js: pg.evaluate(js)
  # helper: run one hit between two types, many times
  def sim(att,dfn,n=3000,power=60):
    return R("""(()=>{const g=APP.game,a=g.make(%d,1),d=g.make(%d,1);let tot=0,miss=0;for(let i=0;i<%d;i++){const b=g.newBattle(a,d,0);const hp0=b.s[1].hp;const t=g.hit(b.s[0],b.s[1],%d,Math.random);if(/dodged/.test(t))miss++;tot+=hp0-b.s[1].hp}return {avg:+(tot/%d).toFixed(2),dodge:+(miss/%d).toFixed(3)}})()"""%(seeds[att],seeds[dfn],n,power,n,n))
  def off(f):
    R("window.__noAb=true"); r=f(); R("window.__noAb=false"); return r
  # same attacker type (Volt, neutral vs most) vs each defender type: on vs off damage ratio
  for d in ['Frost','Dusk','Moss']:
    a=sim('Stone',d); o=off(lambda: sim('Stone',d)); print(d,'defender dmg on/off:',a['avg'],o['avg'],'ratio',round(a['avg']/o['avg'],3),'| dodge on',a['dodge'])
  # Ember below half hp
  print('Ember blaze ratio:', R("""(()=>{const g=APP.game;const run=(ab)=>{window.__noAb=!ab;let t=0;for(let i=0;i<2000;i++){const b=g.newBattle(g.make(%d,1),g.make(%d,1),0);b.s[0].hp=Math.floor(b.s[0].max*0.4);const h=b.s[1].hp;g.hit(b.s[0],b.s[1],60,Math.random);t+=h-b.s[1].hp}return t/2000};const a=run(true),o=run(false);window.__noAb=false;return +(a/o).toFixed(3)})()"""%(seeds['Ember'],seeds['Stone'])))
  # Moss first hit only
  print('Moss bark first/second hit:', R("""(()=>{const g=APP.game;let f=0,s=0;for(let i=0;i<2000;i++){const b=g.newBattle(g.make(%d,1),g.make(%d,1),0);const h=b.s[1].hp;g.hit(b.s[0],b.s[1],60,Math.random);f+=h-b.s[1].hp;const h2=b.s[1].hp;g.hit(b.s[0],b.s[1],60,Math.random);s+=h2-b.s[1].hp}return [Math.round(f/2000),Math.round(s/2000)]})()"""%(seeds['Stone'],seeds['Moss'])))
  # Stone sturdy: huge hit at full hp leaves 1, only once
  print('Sturdy (hp after huge hit, then after a second):', R("""(()=>{const g=APP.game;const b=g.newBattle(g.make(%d,1),g.make(%d,1),0);g.hit(b.s[0],b.s[1],9999,()=>0.5);const a=b.s[1].hp;g.hit(b.s[0],b.s[1],9999,()=>0.5);return [a,b.s[1].hp]})()"""%(seeds['Ember'],seeds['Stone'])))
  # Bloom regrow once
  print('Regrow (hp before, after first low hit, flag):', R("""(()=>{const g=APP.game;const b=g.newBattle(g.make(%d,1),g.make(%d,1),0);const D=b.s[1];D.hp=Math.round(D.max*0.5);const m=D.max;g.hit(b.s[0],D,Math.round(m*0.5),()=>0.5);return [Math.round(m), D.hp, D.abUsed]})()"""%(seeds['Ember'],seeds['Bloom'])))
  # Tide drizzle
  print('Drizzle heals per round:', R("""(()=>{const g=APP.game;const b=g.newBattle(g.make(%d,1),g.make(%d,1),0);b.s[0].hp=Math.round(b.s[0].max*0.5);const h=b.s[0].hp;g.resolve(b,2,()=>0.5,2);return [h,b.s[0].hp,b.s[0].max]})()"""%(seeds['Tide'],seeds['Stone'])))
  # UI: dex card + species detail show ability
  pg.evaluate("APP.open('dex')"); pg.wait_for_timeout(500)
  print('dex card text has ability:', pg.evaluate("/Blaze|Drizzle|Thick Bark|Static|Numb|Veil|Sturdy|Regrow/.test(document.getElementById('screen').innerText)"))
  print('errors:', errs or 'none'); b.close()
