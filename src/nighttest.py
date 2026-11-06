# The Watch's nights (Meaning: a night is kept by lasting it, not by beating whoever comes): the duel runs in the lobby itself, the visitor comes in at the door, the night ends at dawn with the party still standing and counts as kept, and the duel box shows the night running out instead of a body count.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__nightS=2.5; window.__noTransition=true")
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({caught:[{seed:5000,stage:3,lv:20},{seed:5001,stage:3,lv:20}],party:[5000,5001],fighter:5000,npc:{done:[],beaten:{},cleared:[],seals:['wren','glacia','blaze','coral']},tower:{best:0,day:'',runs:0,clears:0,run:null}}); APP.game.startTowerRun()")
  pg.evaluate("WORLD.enter('in-tower'); WORLD.setPaused(false)"); pg.wait_for_timeout(400)
  check('the lobby is marked as the duel hall', pg.evaluate("WORLD.map.duelHall===true"), pg.evaluate("WORLD.map.id"))
  pg.evaluate("APP.towerFloorStart()"); pg.wait_for_timeout(1150)   # the first visitor comes in after 0.9 s
  check('night 1 starts as a live duel in the lobby', pg.evaluate("ACT.dueling() && WORLD.map.id==='in-tower'"), pg.evaluate("[ACT.dueling(), WORLD.map.id, APP.game.state.trainer]"))
  foes=pg.evaluate("ACT.foes().map(f=>[Math.round(f.x/32*10)/10, Math.round(f.y/32*10)/10])")
  check('the visitor comes in at the door (bottom rows of the lobby, by the exit)', foes and all(y>=5.5 for x,y in foes), foes)
  d0=pg.evaluate("ACT.dawn()"); pg.wait_for_timeout(600); d1=pg.evaluate("ACT.dawn()")
  check('the night runs toward dawn', d0 is not None and d1>d0, [d0,d1])
  check('the duel box shows the night running out, not a body count', pg.evaluate("!!document.querySelector('#duel .dawn') && !/down/.test(document.getElementById('duel').textContent)"), pg.evaluate("document.getElementById('duel').innerHTML"))
  pg.wait_for_timeout(2600)
  r=pg.evaluate("({dueling:ACT.dueling(), run:APP.game.state.tower.run, best:APP.game.state.tower.best, res:APP.game.state.towerResult, dlg:APP.dialog&&APP.dialog.lines[0]})")
  check('at dawn the night is kept without anyone going down: the run moves to night 2', not r['dueling'] and r['run'] and r['run']['floor']==2 and r['best']==1, r)
  check('no page errors', not errs, errs); b.close()
done()
