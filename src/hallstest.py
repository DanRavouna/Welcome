# The Arena is its own ring, Sproutvale's cottages and the Long Watch have rooms (Meaning: the arena is where you stand with your critter in front of others; the Watch's lobby is the watch itself). The doors go inside; the altar rolls, the bell starts a battle, the stair opens the climb; the Watch's door still refuses without four seals; exits lead back; nothing is a tip.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{test:false}),npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  def at_door(m,pid): pg.evaluate("([m,pid])=>{WORLD.enter(m);WORLD.setPaused(false);const p=WORLD.map.places.find(q=>q.id===pid);WORLD.setPos((p.door[0]+0.9)*32,(p.door[1]+(p.door[1]===p.y&&p.h>1?-0.6:1.4))*32);WORLD.step(1/60)}",[m,pid]); pg.wait_for_timeout(150)   # a door on the top row is reached from above
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(250)
  def at_device(pid): pg.evaluate("(pid)=>{const p=WORLD.map.places.find(q=>q.id===pid);WORLD.setPos((p.door[0]+0.9)*32,(p.door[1]+1.4)*32);WORLD.step(1/60)}",pid); pg.wait_for_timeout(150)
  tipwords=['tip','odds','you should','try ','better odds','rolls left']
  # the Arena: the zone is the ring; the bell stands on the sand
  at_door('arena','bell'); check('by the Arena bell: Ring the bell', pg.inner_text('#act-label')=='Ring the bell', pg.inner_text('#act-label')); press()
  check('the bell opens the battle screen', pg.evaluate("!document.getElementById('screen').hidden && APP.game.state.tab")=='battle', pg.evaluate("APP.game.state.tab")); pg.evaluate("APP.close()"); pg.wait_for_timeout(100)
  check('arena: names on the rail, a bench, a bucket, out on the sand', sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['bench','bucket','namewall'])
  check('the zone is the ring: the road from the east edge runs through the gate onto the sand, the stands and the corners are solid', pg.evaluate("(()=>{const g=WORLD.map.grid,W=WORLD.map.W; return g[9][W-1]==='=' && g[10][W-4]==='=' && g[9][12]==='.' && g[2][13]==='X' && g[1][1]==='X' && g[9][3]==='X';})()"), pg.evaluate("WORLD.map.grid.slice(8,12).map(r=>r.join(''))"))
  check('the Arena hangs off the Ashwood Trail, nowhere else', pg.evaluate("WORLD.MAPS.arena.exits.map(e=>e.to)")==['route-cm'] and pg.evaluate("WORLD.MAPS['route-cm'].exits.some(e=>e.to==='arena') && !WORLD.MAPS.town.exits.some(e=>e.to==='arena')"))
  # Sproutvale's two cottages have rooms
  at_door('town','house-pip'); check("Pip's door: Go inside", pg.inner_text('#act-label')=='Go inside', pg.inner_text('#act-label')); press(); check("it leads into Pip's house", pg.evaluate("WORLD.map.id")=='in-house-pip')
  check("Pip's room: a small bed, finds in jars, bowls", sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['bowls','jars','smallbed'])
  at_door('town','house-mira'); press(); check("Mira's room: the shelf, the ledger, the kettle", pg.evaluate("WORLD.map.id")=='in-house-mira' and sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['jars','kettle','ledger'])
  check('town rooms: no line is a tip', not any(w in pg.evaluate("['in-house-pip','in-house-mira'].map(id=>WORLD.MAPS[id].objects.map(o=>o.text).join(' | ')).join(' | ')").lower() for w in tipwords))
  # the Long Watch
  at_door('peak','tower'); check('tower door: Enter the Tower', pg.inner_text('#act-label')=='Enter the Tower'); press()
  check('without four seals the door refuses and you stay outside', pg.evaluate("WORLD.map.id")=='peak' and 'is for those who hold all 4' in pg.inner_text('#toast'), pg.inner_text('#toast'))
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})"); press()
  check('with four seals it leads into the lobby of the Watch', pg.evaluate("WORLD.map.id")=='in-tower')
  check('the lobby: two lamps that stay lit, a bench with a blanket, the book of nights', sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['blanketbench','logbook','walllamp','walllamp'])
  at_device('stair'); check('by the stair: Climb the stair', pg.inner_text('#act-label')=='Climb the stair', pg.inner_text('#act-label')); press()
  check('the stair opens the keeper\'s lobby dialog', pg.evaluate("APP.dialog && APP.dialog.name")=='Keeper of the Watch' and 'nights' in pg.evaluate("APP.dialog.lines.join(' ')"), pg.evaluate("APP.dialog && APP.dialog.lines[0]"))
  for _ in range(12):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.evaluate("if(document.querySelector('#dlg-choices button')){[...document.querySelectorAll('#dlg-choices button')].pop().click()}"); pg.wait_for_timeout(200)
  for _ in range(70): pg.evaluate("WORLD.input.jy=1; WORLD.step(1/30)")
  pg.evaluate("WORLD.input.jy=0"); check('walking out of the lobby returns to Vigil Peak', pg.evaluate("WORLD.map.id")=='peak', pg.evaluate("WORLD.map.id"))
  check('no page errors', not errs, errs); b.close()
done()
