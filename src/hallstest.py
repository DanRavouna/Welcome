# The Roll Shrine, the Arena and the Long Watch have rooms (Meaning, Sproutvale: the shrine gives without being asked and others were here before you; the arena is where you stand with your critter in front of others; the Watch's lobby is the watch itself). The doors go inside; the altar rolls, the bell starts a battle, the stair opens the climb; the Watch's door still refuses without four seals; exits lead back; nothing is a tip.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{test:false}),npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  def at_door(m,pid): pg.evaluate("([m,pid])=>{WORLD.enter(m);WORLD.setPaused(false);const p=WORLD.map.places.find(q=>q.id===pid);WORLD.setPos((p.door[0]+0.9)*32,(p.door[1]+1.4)*32);WORLD.step(1/60)}",[m,pid]); pg.wait_for_timeout(150)
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(250)
  def at_device(pid): pg.evaluate("(pid)=>{const p=WORLD.map.places.find(q=>q.id===pid);WORLD.setPos((p.door[0]+0.9)*32,(p.door[1]+1.4)*32);WORLD.step(1/60)}",pid); pg.wait_for_timeout(150)
  tipwords=['tip','odds','you should','try ','better odds','rolls left']
  # the shrine
  at_door('town','shrine'); check('shrine door: Enter the shrine', pg.inner_text('#act-label')=='Enter the shrine', pg.inner_text('#act-label')); press()
  check('it leads into the shrine room', pg.evaluate("WORLD.map.id")=='in-shrine')
  check('shrine: the offerings and the candles are there', sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['candles','offerings'])
  at_device('altar'); check('by the altar: Roll a critter', pg.inner_text('#act-label')=='Roll a critter', pg.inner_text('#act-label')); press()
  check('the altar opens the Roll screen', pg.evaluate("!document.getElementById('screen').hidden && APP.game.state.tab")=='roll', pg.evaluate("APP.game.state.tab")); pg.evaluate("APP.close()"); pg.wait_for_timeout(100)
  check('shrine: no line is a tip', not any(w in pg.evaluate("WORLD.map.objects.map(o=>o.text).join(' | ')").lower() for w in tipwords))
  for _ in range(70): pg.evaluate("WORLD.input.jy=1; WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); check('walking out of the shrine returns to Sproutvale', pg.evaluate("WORLD.map.id")=='town')
  # the arena
  at_door('town','arena'); check('arena door: Enter the arena', pg.inner_text('#act-label')=='Enter the arena'); press(); check('it leads into the arena', pg.evaluate("WORLD.map.id")=='in-arena')
  check('arena: names on the wall, a bench, a bucket', sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['bench','bucket','namewall'])
  at_device('bell'); check('by the bell: Ring the bell', pg.inner_text('#act-label')=='Ring the bell', pg.inner_text('#act-label')); press()
  check('the bell opens the battle screen', pg.evaluate("!document.getElementById('screen').hidden && APP.game.state.tab")=='battle', pg.evaluate("APP.game.state.tab")); pg.evaluate("APP.close()"); pg.wait_for_timeout(100)
  # the Long Watch
  at_door('peak','tower'); check('tower door: Enter the Tower', pg.inner_text('#act-label')=='Enter the Tower'); press()
  check('without four seals the door refuses and you stay outside', pg.evaluate("WORLD.map.id")=='peak' and 'opens to trainers with all 4' in pg.inner_text('#toast'), pg.inner_text('#toast'))
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})"); press()
  check('with four seals it leads into the lobby of the Watch', pg.evaluate("WORLD.map.id")=='in-tower')
  check('the lobby: two lamps that stay lit, a bench with a blanket, the book of nights', sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['blanketbench','logbook','walllamp','walllamp'])
  at_device('stair'); check('by the stair: Climb', pg.inner_text('#act-label')=='Climb', pg.inner_text('#act-label')); press()
  check('the stair opens the keeper\'s lobby dialog', pg.evaluate("APP.dialog && APP.dialog.name")=='Tower Keeper' and 'floors' in pg.evaluate("APP.dialog.lines.join(' ')"), pg.evaluate("APP.dialog && APP.dialog.lines[0]"))
  for _ in range(12):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.evaluate("if(document.querySelector('#dlg-choices button')){[...document.querySelectorAll('#dlg-choices button')].pop().click()}"); pg.wait_for_timeout(200)
  for _ in range(70): pg.evaluate("WORLD.input.jy=1; WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); check('walking out of the lobby returns to Vigil Peak', pg.evaluate("WORLD.map.id")=='peak', pg.evaluate("WORLD.map.id"))
  check('no page errors', not errs, errs); b.close()
done()
