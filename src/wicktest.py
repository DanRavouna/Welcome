# Wickling, the second secret critter: data, Afterglow, the great-lamp hand-over, the Dex bonus list, release block, reload.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,essence:10,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  print('data:', pg.evaluate("(()=>{const g=APP.game,k=g.make(SECRET2_SEED,1,14),k3=g.make(SECRET2_SEED,3,14);return JSON.stringify({name:k.name,no:k.speciesNo,stage:k.stage,same:JSON.stringify(k.stats)===JSON.stringify(k3.stats),stats:k.stats.map(s=>s.value),lv1:g.make(SECRET2_SEED,3,1).stats.map(s=>s.value),type:k.element.name,rarity:k.rarity,ability:k.ability.name,kit:k.kit.map(m=>m.name),shiny:!!k.shiny,seedLabel:k.seedLabel,distinctFromVeil:g.make(SECRET_SEED,3,14).name!==k.name})})()"))
  # Afterglow: heals 20% and dazes the attacker the first time it drops below half HP; no type ability stacked on top (Volt's Static)
  r=pg.evaluate("""(()=>{const g=APP.game,w=g.make(SECRET2_SEED,3,14),foe=g.make(7,3,14);const b=g.newBattle(w,foe,0);const D=b.s[0],A=b.s[1];D.hp=Math.round(D.max*0.62);const before=D.hp;
    let t;for(let i=0;i<20&&D.hp>=D.max*0.5&&!D.abUsed;i++){t=g.hit(A,D,40,()=>0.5)}
    const healed=D.hp,used=D.abUsed,dz=A.daze;A.daze=0;const hp2=D.hp;g.hit(A,D,40,()=>0.5);const noSecondHeal=D.hp<hp2;
    let statics=0;for(let i=0;i<4000;i++){const b2=g.newBattle(w,foe,0);b2.s[0].hp=b2.s[0].max;g.hit(b2.s[1],b2.s[0],10,Math.random);if(b2.s[1].daze>0)statics++}
    return {before,max:D.max,afterFirstBelowHalf:healed,afterglowUsed:used,foeDazed:dz,secondHitHealed:!noSecondHeal,note:t,staticTriggers:statics}})()""")
  print('Afterglow:', r)
  # the Dex bonus list before / after
  def species():
    pg.evaluate("APP.close&&APP.close(); APP.game.setState({selected:null,dexView:'species'}); APP.open('dex')"); pg.wait_for_timeout(400); t=pg.inner_text('#screen'); pg.evaluate("APP.close()"); return [l for l in t.split('\n') if 'Bonus species' in l or l in ('???','Veilcrown','Wickling') or l.startswith('#05') or l.startswith('#04')]
  pg.evaluate("APP.game.update({adv:{clues:[],open:{},flags:{}}})"); print('nothing opened:', species())
  pg.evaluate("APP.game.update({adv:{clues:[],open:{arch:true},flags:{}}})"); print('arch open:', species())
  pg.evaluate("APP.game.update({adv:{clues:[],open:{arch:true,lamp:true},flags:{}}})"); print('beacon door open too:', species())
  # the great lamp, three ways
  pg.evaluate("APP.game.update({adv:{clues:[],open:{arch:true,lamp:true},flags:{'cl:L1':true,'cl:L2':true,'cl:L3':true}}}); WORLD.enter('dg-lamp'); WORLD.npcs.forEach(n=>n.declined=true)")
  def lamp():
    pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='greatlamp');WORLD.setPos((o.x-0.5)*WORLD.TS,(o.y+0.5)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(300); pg.click('#act'); pg.wait_for_timeout(300)
  has=lambda: pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET2_SEED)")
  lamp(); print('before the Warden falls:', pg.inner_text('#toast')[:55], '| has Wickling:', has())
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['maren'])})})")
  e0=pg.evaluate("APP.game.state.essence"); lamp(); n=pg.evaluate("APP.dialog.lines.length"); finish(); pg.wait_for_timeout(3600)
  print('first light: dialogue', n, 'lines | lit:', pg.evaluate("!!APP.game.state.adv.flags.lampLit"), '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| Wickling:', has(), '| flag:', pg.evaluate("!!APP.game.state.adv.flags.wickling"), '| Dex opened on it:', pg.evaluate("APP.game.state.selected===SECRET2_SEED && !document.getElementById('screen').hidden"))
  print('detail:', [l for l in pg.inner_text('#screen').split('\n') if 'Wickling' in l or 'Afterglow' in l or 'Seed' in l][:4]); pg.screenshot(path='/tmp/wick-detail.png')
  pg.click("#screen button:has-text('Cannot be released')"); pg.click("#screen button:has-text('Cannot be released')"); pg.wait_for_timeout(200); print('release blocked:', has()); pg.evaluate("APP.close()")
  lamp(); print('lit and owned:', pg.inner_text('#toast')[:60])
  # lit before Wickling existed (or by the dev tools): the lamp hands it over on the next touch
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.filter(e=>e.seed!==SECRET2_SEED),adv:{clues:[],open:{arch:true,lamp:true},flags:{lampLit:true}}})"); lamp(); n=pg.evaluate("APP.dialog.lines.length"); finish(); pg.wait_for_timeout(1500)
  print('lit earlier, no Wickling: dialogue', n, 'lines | Wickling now:', has())
  print('Dex bonus list:', species())
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.concat([{seed:SECRET_SEED,stage:3,lv:12}])})"); print('both found:', species())
  print('species counts still 48 only:', pg.evaluate("[APP.game.state.seen.length, APP.game.state.seen.indexOf(49)===-1&&APP.game.state.seen.indexOf(50)===-1]"))
  pg.reload(); pg.wait_for_timeout(1300); print('after reload: Wickling kept', has(), '| seen has 50:', pg.evaluate("APP.game.state.seen.indexOf(50)!==-1"))
  print('errors:', errs or 'none'); b.close()
