# The secret critter (Veilcrown): reserved seed, fixed data, kept out of the 48 counts, the crown hands it over once, it cannot be released,
# its ability replaces Dusk's Veil, and the Dex shows it as a bonus entry.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:9}],party:[2],fighter:2,intro:true,essence:10,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  # 1) data
  print('reserved seed above every normal seed:', pg.evaluate("SECRET_SEED>999999"), '| normal seed range check:', pg.evaluate("(()=>{const g=APP.game;let hit=0;for(let i=0;i<3000;i++){if(g.make(1+Math.floor(Math.random()*999999),1).speciesNo>48)hit++}return hit})()"), 'normal critters with species > 48')
  print('data:', pg.evaluate("(()=>{const g=APP.game,k=g.make(SECRET_SEED,1,12),k3=g.make(SECRET_SEED,3,12);return JSON.stringify({name:k.name,no:k.speciesNo,stage:k.stage,same:JSON.stringify(k.stats)===JSON.stringify(k3.stats),stats:k.stats.map(s=>s.value),lv1:g.make(SECRET_SEED,3,1).stats.map(s=>s.value),lv20:g.make(SECRET_SEED,3,20).stats.map(s=>s.value),type:k.element.name,rarity:k.rarity,ability:k.ability.name,kit:k.kit.map(m=>m.name),shiny:!!k.shiny,seedLabel:k.seedLabel})})()"))
  # 2) not counted in the 48: seen stays <= 48, Critter Master unaffected
  r=pg.evaluate("""(()=>{const g=APP.game;g.update({seen:Array.from({length:47},(_,i)=>i+1),caught:g.state.caught.concat([{seed:SECRET_SEED,stage:3,lv:12}])});return {seenLen:g.state.seen.length,has49:g.state.seen.indexOf(49)!==-1,titles:g.state.titles.slice(),essence:g.state.essence}})()""")
  print('47 species + the secret critter:', r, '-> Critter Master earned:', 'master' in r['titles'], '| The Ninth Seat earned:', 'secret' in r['titles'])
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.filter(e=>e.seed!==SECRET_SEED),titles:APP.game.state.titles.filter(t=>t!=='secret'),seen:Array.from({length:10},(_,i)=>i+1)})")
  # 3) the crown hands it over once
  pg.evaluate("APP.game.update({adv:{clues:['ruin','camp','lighthouse','wreck'],open:{arch:true},flags:{rubble:true,rite:[0,1,2]}},npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['keeper'])})}); WORLD.enter('dg-arch'); WORLD.npcs.forEach(n=>n.declined=true)")
  def at_crown():
    pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='crown');WORLD.setPos((o.x-0.5)*WORLD.TS,(o.y+0.5)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(300)
  at_crown(); e0=pg.evaluate("APP.game.state.essence"); pg.click('#act'); pg.wait_for_timeout(300)
  print('crown dialogue lines:', pg.evaluate("APP.dialog.lines.length"), '| first:', pg.evaluate("APP.dialog.lines[0]")); finish(); pg.wait_for_timeout(1500)
  print('obtained:', pg.evaluate("APP.game.state.caught.filter(e=>e.seed===SECRET_SEED)"), '| flag:', pg.evaluate("APP.game.state.adv.flags.secret"), '| essence +', pg.evaluate("APP.game.state.essence")-e0, '(title bonus)', '| titles has secret:', pg.evaluate("APP.game.state.titles.indexOf('secret')!==-1"))
  print('Dex opened on it:', pg.evaluate("APP.game.state.selected===SECRET_SEED && !document.getElementById('screen').hidden"), '| detail text:', [l for l in pg.inner_text('#screen').split('\n') if 'Veilcrown' in l or 'Last Light' in l or 'Seed' in l][:4])
  pg.screenshot(path='/tmp/secret-detail.png')
  # 4) cannot be released; fully evolved
  lab=[l for l in pg.inner_text('#screen').split('\n') if 'release' in l.lower() or 'evolved' in l.lower() or 'Release' in l]
  print('buttons:', lab)
  pg.click("#screen button:has-text('Cannot be released')"); pg.click("#screen button:has-text('Cannot be released')"); pg.wait_for_timeout(200)
  print('still kept after two taps on Release:', pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET_SEED)"))
  pg.evaluate("APP.close()")
  # 5) the seat answers only once
  at_crown(); pg.click('#act'); pg.wait_for_timeout(300); print('second visit:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]")); finish()
  print('copies kept:', pg.evaluate("APP.game.state.caught.filter(e=>e.seed===SECRET_SEED).length"))
  # 6) Last Light replaces Veil: survives one lethal hit with 1 HP, next hit lands harder; never dodges
  r=pg.evaluate("""(()=>{const g=APP.game,sec=g.make(SECRET_SEED,3,12),foe=g.make(7,3,12);const b=g.newBattle(sec,foe,0);const D=b.s[0],A=b.s[1];
    const t1=g.hit(A,D,9999,()=>0.5);const hp1=D.hp,used=D.abUsed,boost=D.boost;const t2=g.hit(A,D,9999,()=>0.5);
    let dodge=0;for(let i=0;i<4000;i++){const b2=g.newBattle(sec,foe,0);if(/dodged/.test(g.hit(b2.s[1],b2.s[0],30,Math.random)))dodge++}
    let dusk=0;const dk=(()=>{for(let s=1;s<5000;s++){const k=g.make(s,1);if(k.element.name==='Dusk')return k}})();for(let i=0;i<4000;i++){const b2=g.newBattle(dk,foe,0);if(/dodged/.test(g.hit(b2.s[1],b2.s[0],30,Math.random)))dusk++}
    return {afterFirst:hp1,used,boost,afterSecond:D.hp,note:t1,secretDodges:dodge,duskDodges:dusk}})()""")
  print('Last Light:', r)
  # 7) Dex bonus entry in the species view
  def species():
    pg.evaluate("APP.game.setState({selected:null,dexView:'species'}); APP.open('dex')"); pg.wait_for_timeout(400); return pg.inner_text('#screen')
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.filter(e=>e.seed!==SECRET_SEED),adv:{clues:[],open:{},flags:{}}})")
  t=species(); print('before the arch opens, bonus shown:', 'Bonus species' in t)
  pg.evaluate("APP.close(); APP.game.update({adv:{clues:[],open:{arch:true},flags:{}}})"); t=species(); print('arch open, not found:', [l for l in t.split('\n') if 'Bonus species' in l or l=='???'])
  pg.evaluate("APP.close(); APP.game.update({caught:APP.game.state.caught.concat([{seed:SECRET_SEED,stage:3,lv:12}])})"); t=species(); print('found:', [l for l in t.split('\n') if 'Bonus species' in l or 'Veilcrown' in l or '#049' in l]); print('species counter still counts 48 only:', [l for l in t.split('\n') if '/48' in l][:2])
  pg.screenshot(path='/tmp/secret-species.png')
  # 8) reload keeps it, and `seen` never gets 49
  pg.evaluate("APP.close()"); pg.reload(); pg.wait_for_timeout(1300)
  print('after reload: kept', pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET_SEED)"), '| seen has 49:', pg.evaluate("APP.game.state.seen.indexOf(49)!==-1"), '| title kept:', pg.evaluate("APP.game.state.titles.indexOf('secret')!==-1"))
  print('errors:', errs or 'none'); b.close()
