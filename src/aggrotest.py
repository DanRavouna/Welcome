from playwright.sync_api import sync_playwright
errs=[]
def adv(pg):
  for _ in range(10):
    if not pg.evaluate("!!APP.dialog") or pg.evaluate("!document.getElementById('dlg-choices').hidden"): return
    pg.evaluate("APP.advance()")
def stand(pg):
  pg.evaluate("(()=>{const n=WORLD.allNpcs().town.find(n=>n.id==='rowan'); const v={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[n.dir]; WORLD.setPos((n.x+v[0]*2+0.5)*WORLD.TS,(n.y+v[1]*2+0.6)*WORLD.TS);})()")
  for _ in range(3): pg.evaluate("WORLD.step(1/60)")
  pg.wait_for_timeout(950)
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{follow:false})})")   # these suites test the turn-based battle screen, which is what the game uses when Critter follows you is off
  pg.evaluate("APP.game.update({caught:[{seed:5000,stage:3,lv:20}], party:[5000], fighter:5000, npc:{done:['fern'],beaten:{},cleared:[],seals:[]}}); WORLD.enter('town')")
  stand(pg); print('1st sighting -> dialog:', pg.evaluate("!!APP.dialog && APP.dialog.name"))
  adv(pg); pg.click("#dlg-choices button:has-text('Battle!')"); pg.wait_for_timeout(200)
  pg.evaluate("APP.close()"); pg.wait_for_timeout(200)   # leave the battle without fighting
  stand(pg); print('after leaving the battle, spotted again?', pg.evaluate("!!APP.dialog"))
  pg.evaluate("WORLD.enter('moss'); WORLD.enter('town')"); stand(pg); print('re-entered map -> spotted again (expected):', pg.evaluate("!!APP.dialog"))
  adv(pg); pg.click("#dlg-choices button:has-text('Battle!')"); pg.wait_for_timeout(200)
  pg.evaluate("Math.random=(()=>{let a=9;return()=>{a=(a*16807)%2147483647;return a/2147483647}})(); APP.game.renderVals().fight(); for(let i=0;i<200&&!APP.game.state.battle.over;i++) APP.game.battleAction({move:0})")
  print('won:', pg.evaluate("APP.game.state.battle.win")); pg.evaluate("APP.close()"); pg.wait_for_timeout(200)
  for _ in range(6):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()")
  pg.evaluate("WORLD.enter('moss'); WORLD.enter('town')"); stand(pg); print('beaten trainer spots you after re-entry?', pg.evaluate("!!APP.dialog"))
  # next day: still no sight trigger; talking offers a rematch with new lines
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{beaten:{}})}); WORLD.enter('moss'); WORLD.enter('town')"); stand(pg)
  print('next day, spots you?', pg.evaluate("!!APP.dialog"))
  pg.evaluate("APP.talk(WORLD.allNpcs().town.find(n=>n.id==='rowan'))"); pg.wait_for_timeout(60)
  print('talk:', pg.evaluate("APP.dialog.lines.join(' / ')")); adv(pg); print('choices:', pg.evaluate("[...document.querySelectorAll('#dlg-choices button')].map(b=>b.textContent)"))
  print('errors:', errs or 'none'); b.close()
