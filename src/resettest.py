# Start over (Menu, Save): two taps erase this device's save and reload to a new game; one tap only arms it; nothing else in the panel is touched. Runs WITHOUT the seed hook so the reload really is a fresh start.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.wait_for_timeout(600)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15},{seed:9,stage:1}],party:[2],fighter:2,intro:true,xp:5000,essence:77,npc:{done:[],beaten:{},cleared:['ivy'],seals:['wren']}}); document.getElementById('starter')&&(document.getElementById('starter').hidden=true)")
  for _ in range(20):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.wait_for_timeout(300)
  keys0=pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('critter-roll:'))")
  check('a save exists on the device', 'critter-roll:v2' in keys0 and pg.evaluate("APP.game.state.caught.length")==2, keys0)
  pg.evaluate("APP.openBackup()"); pg.wait_for_timeout(200)
  check('the Save panel has a Start over button', pg.evaluate("!document.getElementById('bk').hidden && document.getElementById('bk-reset').textContent")=='Start over')
  pg.click('#bk-reset'); pg.wait_for_timeout(200)
  check('one tap only arms it (nothing erased)', pg.evaluate("document.getElementById('bk-reset').textContent")=='Erase and start over' and pg.evaluate("!!localStorage.getItem('critter-roll:v2')") and 'Tap again' in pg.inner_text('#bk-msg'), pg.inner_text('#bk-msg'))
  pg.click('#bk-reset'); pg.wait_for_timeout(1500); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.wait_for_timeout(800)
  keys1=pg.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('critter-roll:'))")
  check('after the second tap the page reloaded as a new game (no critters, intro not done)', pg.evaluate("APP.game.state.caught.length")==0 and not pg.evaluate("!!APP.game.state.intro"), pg.evaluate("[APP.game.state.caught.length, APP.game.state.intro]"))
  check('the old save keys are gone (the device id may stay)', all(k=='critter-roll:device' or not pg.evaluate("(k)=>localStorage.getItem(k)!==null && JSON.parse(localStorage.getItem(k)||'{}').caught&&JSON.parse(localStorage.getItem(k)).caught.length>0",k) for k in keys0), keys1)
  check('the new game shows the starter choice or the intro', pg.evaluate("!document.getElementById('starter').hidden || !!APP.dialog"))
  check('no page errors', not errs, errs); b.close()
done()
