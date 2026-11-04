# Action mode keeping: defeated critters drop catch orbs (new species / rare / shiny by default), orbs are collected into a pouch icon, the pouch opens the full critter card.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,essence:100,day:new Date().toDateString(),used:0,sight:{day:new Date().toDateString(),n:0},pouch:[],settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false,test:false,keepall:false})}); APP.game.props.testMode=false; document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  def finish():
    for _ in range(40):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1300); finish(); pg.evaluate("WORLD.setPaused(false)")
  box=pg.locator('#atk').bounding_box(); tap=lambda: pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2-8)
  print('no keep chips in the page any more:', pg.evaluate("!document.getElementById('keepbar')"))
  def foe(kind):   # kind: 'new' = species not seen, 'seen' = species already seen, 'rare'
    pg.evaluate("""((kind)=>{const g=APP.game;ACT.enemies.splice(0);ACT.orbs().splice(0);ACT.spawn(1,undefined,kind==='rare');const p=WORLD.pos(),m=ACT.enemies[0];
      const no=g.make(m.k.seed,1).speciesNo;let seen=(g.state.seen||[]).filter(n=>n!==no);if(kind==='seen')seen.push(no);g.update({seen:seen});
      m.x=p.x+2;m.y=p.y+64;m.hx=m.x;m.hy=m.y;m.mode="idle";m.cd=99;m.tele=0;m.s.hp=1;window.__k=m.k.seed})(%s)"""%repr(kind)); pg.wait_for_timeout(80)
  def kill(kind):
    foe(kind); tap(); pg.wait_for_timeout(600)
  kill('seen'); print('every defeated critter you do not own drops an orb (even of a known species):', pg.evaluate("ACT.orbs().length+APP.game.state.pouch.length"))
  kill('new'); print('a defeated critter of a NEW species drops an orb:', pg.evaluate("ACT.orbs().length"), '| the orb carries its type colour:', pg.evaluate("ACT.orbs()[0]&&ACT.orbs()[0].k.element.color"))
  pg.screenshot(path='/tmp/orb.png')
  # collect: stand on it
  pg.evaluate("(()=>{const o=ACT.orbs()[0],p=WORLD.pos();WORLD.setPos(o.x,o.y+4)})()"); pg.wait_for_timeout(500)
  print('walking over it collects it:', pg.evaluate("[ACT.orbs().length, APP.game.state.pouch.length]"), '| pouch icon shown with the count:', pg.evaluate("[!document.getElementById('pouch').hidden, document.querySelector('#pouch b').textContent]"))
  # the screen is not cluttered: after several defeats there is still only the small pouch icon
  for i in range(3):
    kill('new'); pg.evaluate("(()=>{const o=ACT.orbs()[0];if(o)WORLD.setPos(o.x,o.y+4)})()"); pg.wait_for_timeout(500)
  print('after more defeats: pouch holds', pg.evaluate("APP.game.state.pouch.length"), '| visible HUD extras besides the pouch:', pg.evaluate("[...document.querySelectorAll('#hud > *')].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0).map(e=>e.id||e.className).filter(x=>['keepbar','offer'].includes(x))"))
  # open the pouch: the full card
  pg.click('#pouch'); pg.wait_for_timeout(600); t=pg.inner_text('#screen'); first=pg.evaluate("APP.game.state.pouch[0]"); nm=pg.evaluate("(s)=>APP.game.make(s,1).name", first)
  print('the pouch opens the critter card:', nm in t, '| shows type / ability / moves:', 'Ability' in t and 'Moves' in t, '| has Keep and Let it go:', 'Keep (' in t and 'Let it go' in t, '| note:', [l for l in t.split('\n') if 'Dropped by' in l][0][:70])
  pg.screenshot(path='/tmp/card.png')
  # keep it: same price as grass (keep cost + free sighting)
  a=pg.evaluate("({n:APP.game.state.caught.length,used:APP.game.state.used,sight:APP.game.state.sight.n,pouch:APP.game.state.pouch.length})"); pg.locator('#screen button', has_text='Keep (').first.click(); pg.wait_for_timeout(400); c=pg.evaluate("({n:APP.game.state.caught.length,used:APP.game.state.used,sight:APP.game.state.sight.n,pouch:APP.game.state.pouch.length,stage:APP.game.state.caught[0].stage,seed:APP.game.state.caught[0].seed})")
  print('kept:', a['n'],'->',c['n'], '| rolls used', a['used'],'->',c['used'], '| free sighting', a['sight'],'->',c['sight'], '| pouch', a['pouch'],'->',c['pouch'], '| it was the one shown:', c['seed']==first, '| joins at stage', c['stage'])
  # next critter, let one go
  t=pg.inner_text('#screen'); print('after keeping the button offers the next critter:', 'Next critter' in t)
  pg.locator('#screen button', has_text='Next critter').click(); pg.wait_for_timeout(400); n0=pg.evaluate("APP.game.state.pouch.length"); pg.locator('#screen button', has_text='Let it go').first.click(); pg.wait_for_timeout(400)
  print('letting one go removes it from the pouch:', n0, '->', pg.evaluate("APP.game.state.pouch.length"), '| no critter was added:', pg.evaluate("APP.game.state.caught.length")==c['n'])
  # back chip closes and leaves the rest
  n1=pg.evaluate("APP.game.state.pouch.length"); pg.evaluate("APP.close()"); pg.wait_for_timeout(300); print('closing the card leaves the rest in the pouch:', n1, '->', pg.evaluate("APP.game.state.pouch.length"), '| world playable again:', pg.evaluate("[!WORLD.paused, !document.getElementById('hud').hidden]"))
  # not enough rolls: disabled, nothing charged
  pg.evaluate("APP.game.update({used:20,day:new Date().toDateString()})"); pg.click('#pouch'); pg.wait_for_timeout(500); t=pg.inner_text('#screen'); a=pg.evaluate("APP.game.state.caught.length")
  print('no rolls left:', 'Needs' in t, '| keep button disabled:', pg.evaluate("[...document.querySelectorAll('#screen button')].filter(b=>/Needs \\d/.test(b.innerText)).every(b=>b.disabled)")); pg.evaluate("APP.close(); APP.game.update({used:0})")
  # sightings used up costs one more
  print('price with / without free sightings:', pg.evaluate("(()=>{const g=APP.game,k=g.make(5,1);const a=g.actKeepCost(k).cost;g.update({sight:{day:new Date().toDateString(),n:40}});const b=g.actKeepCost(k).cost;g.update({sight:{day:new Date().toDateString(),n:0}});return [a,b]})()"))
  pg.evaluate("APP.game.update({pouch:[]})"); foe('rare'); tap(); pg.wait_for_timeout(700); print('a rare critter drops one too:', pg.evaluate("[ACT.orbs().length + APP.game.state.pouch.length, APP.game.make(window.__k,1).rarity]"))
  pg.evaluate("APP.game.update({pouch:[APP.game.state.caught[0].seed]})"); pg.evaluate("(()=>{ACT.enemies.splice(0);ACT.orbs().splice(0);ACT.spawn(1);const m=ACT.enemies[0];window.__own=APP.game.worthyOwned=APP.game.actWorthy({seed:APP.game.state.caught[0].seed})})()"); print('a critter you already keep does not drop one:', not pg.evaluate('window.__own'))
  # expiry, full pouch, map change
  pg.evaluate("ACT.orbs().forEach(o=>o.t=o.life-0.1)"); pg.wait_for_timeout(400); print('uncollected orbs fade away:', pg.evaluate("ACT.orbs().length"))
  pg.evaluate("APP.game.update({pouch:[11,12,13,14,15,16,17,18]})"); kill('new'); pg.evaluate("(()=>{const o=ACT.orbs()[0];if(o)WORLD.setPos(o.x,o.y+4)})()"); pg.wait_for_timeout(500); print('full pouch (8): the orb stays on the ground, pouch', pg.evaluate("[ACT.orbs().length, APP.game.state.pouch.length]"))
  pg.evaluate("WORLD.enter('frost'); WORLD.setPaused(false)"); pg.wait_for_timeout(600); print('changing map clears orbs, the pouch stays:', pg.evaluate("[ACT.orbs().length, APP.game.state.pouch.length]"))
  # saves
  s=pg.evaluate("localStorage.getItem('critter-roll:v2')"); print('save holds the pouch:', '"pouch":[11' in s)
  pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('critter-roll:v2'));delete s.pouch;localStorage.setItem('critter-roll:v2',JSON.stringify(s))})()"); pg.reload(); pg.wait_for_timeout(1300); print('old save without pouch loads:', pg.evaluate("JSON.stringify(APP.game.state.pouch)"))
  print('errors:', errs or 'none'); b.close()
