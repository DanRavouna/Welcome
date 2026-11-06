# Keeping a light, played (Meaning: being the keeper is a small act, not a line): before the beacon the window at Home is kept for you; after it the window is dark each day until you light it, and the road posts no longer light themselves ahead of you but light when you pass and stay lit. Also the two chairs at Home and the returned things on Tide Shore (the quiet first meetings of "who is counted" and "what the sea gives back").
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower=true; window.__tod='night'; window.__weather='clear'; window.__noTransition=true")
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(250)
  def fin():
    for _ in range(8):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  def at(oid): pg.evaluate("(id)=>{const o=WORLD.objects.find(q=>q.id===id);WORLD.setPos((o.x+0.5)*32,(o.y+1.6)*32);for(let i=0;i<3;i++)WORLD.step(1/30)}", oid); pg.wait_for_timeout(120)
  lit=lambda: pg.evaluate("(()=>{const o=WORLD.objects.find(q=>q.id==='wlamp');return !!APP.objState(o).lit})()") if pg.evaluate("typeof APP.objState==='function'") else None
  pg.evaluate("WORLD.enter('in-home'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  check('Home holds the two chairs (one has always been yours)', 'twochairs' in pg.evaluate("WORLD.objects.map(o=>o.kind)"), pg.evaluate("WORLD.objects.map(o=>o.kind)"))
  at('wlamp'); press(); first=pg.inner_text('#toast'); fin()
  check('before the beacon the window lamp is only something to look at', first and 'windowsill' in first, first)
  pg.evaluate("APP.game.update({adv:{clues:[],open:{arch:true,lamp:true},flags:{lampLit:true}}})"); pg.wait_for_timeout(100)
  glow0=pg.evaluate("(()=>{const o=WORLD.objects.find(q=>q.id==='wlamp');return WORLD.debugObjState?WORLD.debugObjState(o):null})()")
  at('wlamp'); press(); says=pg.evaluate("APP.dialog&&APP.dialog.lines[0]"); fin()
  check('after the beacon, touching the window lamp lights it (you keep it now)', says=='You light the lamp in the window. It faces the road.', says)
  today=pg.evaluate("new Date().toDateString()")
  check('the light is remembered for today only', pg.evaluate("APP.game.state.adv.flags.homeLit")==today, pg.evaluate("APP.game.state.adv.flags.homeLit"))
  at('wlamp'); press(); again=pg.inner_text('#toast'); fin()
  check('lit once, the lamp goes back to being something to look at for the rest of the day', again and 'windowsill' in again, again)
  # the town glow follows the same flag
  pg.evaluate("WORLD.enter('town'); WORLD.setPaused(false)"); pg.wait_for_timeout(200)
  pg.evaluate("APP.game.update({adv:{clues:[],open:{arch:true,lamp:true},flags:{lampLit:true,homeLit:'never'}}})")
  pg.evaluate("WORLD.enter('in-home'); WORLD.setPaused(false)"); pg.wait_for_timeout(200)
  at('wlamp'); label=pg.inner_text('#act-label')
  check('a new day: the lamp waits to be lit again (the action is offered)', label=='Examine', label)
  # the roads: before the beacon the post ahead lights itself at night; after it a post lights when you pass and the flag is saved
  pg.evaluate("APP.game.update({adv:{clues:[],open:{},flags:{}}})"); pg.evaluate("WORLD.enter('route-mf'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  lamps=pg.evaluate("WORLD.objects.filter(o=>o.kind==='postlamp').map(o=>o.id)")
  l=lamps[0]; at(l); pg.wait_for_timeout(700)   # the first post up the road
  check('before the beacon, standing by a road post saves nothing (it is kept for you)', not pg.evaluate("(id)=>!!APP.game.state.adv.flags['own:'+id]", l))
  pg.evaluate("APP.game.update({adv:{clues:[],open:{arch:true,lamp:true},flags:{lampLit:true}}})"); pg.evaluate("WORLD.enter('town'); WORLD.enter('route-mf'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  at(l); pg.wait_for_timeout(700)
  check('after the beacon, a post you pass is yours and stays lit (saved)', pg.evaluate("(id)=>!!APP.game.state.adv.flags['own:'+id]", l))
  check('the post further up the road, not passed yet, is still dark', not pg.evaluate("(id)=>!!APP.game.state.adv.flags['own:'+id]", lamps[1]))
  # the returned things on Tide Shore, by the water and away from the moored knot
  z=pg.evaluate("WORLD.MAPS.tide.objects.filter(o=>o.id.startsWith('z-')).map(o=>[o.id,o.x,o.y])")
  r=dict((a,(x,y)) for a,x,y in z)
  check('Tide Shore holds the returned things, at least 6 tiles from the moored knot', 'z-returned' in r and abs(r['z-returned'][1]-r['z-moored'][1])>=6, z)
  check('no page errors', not errs, errs); b.close()
done()
