# The Arena is its own ring, Sproutvale's cottages and the Long Watch have rooms (Meaning: the arena is where you stand with your critter in front of others; the Watch's lobby is the watch itself). The doors go inside; the altar rolls, the bell starts a battle, the stair opens the climb; the Watch's door still refuses without four seals; exits lead back; nothing is a tip.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  REV=pg.evaluate("APP.build")=='review'
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{test:false}),npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  def at_door(m,pid): pg.evaluate("([m,pid])=>{WORLD.enter(m);WORLD.setPaused(false);const p=WORLD.map.places.find(q=>q.id===pid);WORLD.setPos((p.door[0]+0.9)*32,(p.door[1]+(p.door[1]===p.y&&p.h>1?-0.6:1.4))*32);WORLD.step(1/60)}",[m,pid]); pg.wait_for_timeout(150)   # a door on the top row is reached from above
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(250)
  def at_device(pid): pg.evaluate("(pid)=>{const p=WORLD.map.places.find(q=>q.id===pid);WORLD.setPos((p.door[0]+0.9)*32,(p.door[1]+1.4)*32);WORLD.step(1/60)}",pid); pg.wait_for_timeout(150)
  tipwords=['tip','odds','you should','try ','better odds','rolls left']
  # the Arena: a place of its own; the ring fills its north, the camp its west, the town its south
  pg.evaluate("WORLD.enter('arena')"); pg.wait_for_timeout(150)
  check('the ring is walked into through its south gate (the floor and the gate open, the stands solid)', pg.evaluate("(()=>{const g=WORLD.map.grid; return g[13][20]==='.' && g[7][20]==='.' && g[7][13]==='X' && g[3][20]==='X';})()"), pg.evaluate("WORLD.map.grid.slice(5,15).map(r=>r.join(''))"))
  check('arena: names on the rail, a bench, a bucket, out on the sand', sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['bench','bucket','namewall'])
  check('the camp: five tents and a fire', sorted(pg.evaluate("(WORLD.map.props||[]).map(p=>p.id)"))==['campfire','tent','tent','tent','tent','tent'])
  check('the Arena hangs off the Ashwood Trail, nowhere else', pg.evaluate("WORLD.MAPS.arena.exits.map(e=>e.to)")==['route-cm'] and pg.evaluate("WORLD.MAPS['route-cm'].exits.some(e=>e.to==='arena') && !WORLD.MAPS.town.exits.some(e=>e.to==='arena')"))
  for pid,kinds in [('ar-a',['armchair','ledger','tally']),('ar-b',['kettle','stool','wallmap']),('ar-c',['drawings','smallbed','toolwall'])]:
    at_door('arena',pid); press(); check('the Arena house '+pid+' has its room', pg.evaluate("WORLD.map.id")=='in-'+pid and sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==kinds, pg.evaluate("[WORLD.map.id, WORLD.map.objects.map(o=>o.kind)]"))
  check('arena rooms: no line is a tip', not any(w in pg.evaluate("['in-ar-a','in-ar-b','in-ar-c'].map(id=>WORLD.MAPS[id].objects.map(o=>o.text).join(' | ')).join(' | ')").lower() for w in tipwords))
  # Sproutvale's two cottages have rooms
  at_door('town','house-pip'); check("Pip's door: Go inside", pg.inner_text('#act-label')=='Go inside', pg.inner_text('#act-label')); press(); check("it leads into Pip's house", pg.evaluate("WORLD.map.id")=='in-house-pip')
  check("Pip's room: a small bed, finds in jars, bowls", sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['bowls','jars','smallbed'])
  at_door('town','house-mira'); press(); check("Mira's room: the shelf, the ledger, the kettle", pg.evaluate("WORLD.map.id")=='in-house-mira' and sorted(pg.evaluate("WORLD.map.objects.map(o=>o.kind)"))==['jars','kettle','ledger'])
  check('town rooms: no line is a tip', not any(w in pg.evaluate("['in-house-pip','in-house-mira'].map(id=>WORLD.MAPS[id].objects.map(o=>o.text).join(' | ')).join(' | ')").lower() for w in tipwords))
  # the Long Watch
  at_door('peak','tower'); check('tower door: Enter the Tower', pg.inner_text('#act-label')==('Go in' if pg.evaluate("APP.build||''")=='review' else 'Enter the Tower')); press()   # the review copy's label is "Go in" (02-F33)
  if REV:   # the review copy (11's item 23): the door is shut without a word of rule; a save that has already kept a night keeps it open
    check('without four seals the door refuses and you stay outside', pg.evaluate("WORLD.map.id")=='peak' and 'The door is shut' in pg.inner_text('#toast') and 'seal' not in pg.inner_text('#toast').lower(), pg.inner_text('#toast'))
    pg.evaluate("APP.game.update({tower:Object.assign({},APP.game.state.tower,{best:3})})"); press()
    check('review copy: a save that kept a night (tower.best 3, no seals) goes in', pg.evaluate("WORLD.map.id")=='in-tower', pg.evaluate("WORLD.map.id"))
    pg.evaluate("APP.game.update({tower:{best:0,day:'',runs:0,clears:0,run:null}})"); at_door('peak','tower')
  else:
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
