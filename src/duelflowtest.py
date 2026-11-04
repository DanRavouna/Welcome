# The real way into a duel: a trainer spots you, the dialog asks, you accept. The world must be playable afterwards (it once stayed paused with the HUD hidden).
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch()
  for lead in (True,):
    pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=false")
    pg.evaluate("WORLD.enter('town'); WORLD.setPaused(false)"); pg.wait_for_timeout(900)
    for _ in range(40):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
    pg.evaluate("WORLD.setPaused(false)")
    pg.evaluate("(()=>{const n=Object.values(WORLD.allNpcs()).flat().find(x=>x.id==='rowan');n.declined=false;WORLD.setPos((n.x+0.5)*32,(n.y-3+0.9)*32)})()")
    pg.wait_for_timeout(2500)
    spotted=pg.evaluate("!!APP.dialog")
    for _ in range(12):
      if pg.locator('#dlg button', has_text='Battle!').count(): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(300)
    pg.locator('#dlg button', has_text='Battle!').click(timeout=3000); pg.wait_for_timeout(1800)
    st=pg.evaluate("({paused:WORLD.paused, hud:!document.getElementById('hud').hidden, duel:ACT.dueling(), screen:!document.getElementById('screen').hidden, foes:ACT.enemies.length, banner:!document.getElementById('duel').hidden, atk:!document.getElementById('atk').hidden})")
    p0=pg.evaluate("JSON.stringify(WORLD.pos())"); pg.evaluate("(a)=>{WORLD.input.jx=a[0];WORLD.input.jy=a[1]}",[0,1]); pg.wait_for_timeout(500); pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0"); moved=p0!=pg.evaluate("JSON.stringify(WORLD.pos())")
    print('critter-lead' if lead else 'classic', '| spotted:', spotted, '| after accepting:', st, '| can move:', moved)
    # win it for real through the same path, then the world must still be playable
    for _ in range(14):
      if not pg.evaluate("ACT.dueling()"): break
      pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies.find(x=>x.duel);if(!m)return;m.x=p.x+2;m.y=p.y+38;m.hx=m.x;m.hy=m.y;m.cd=99;m.tele=0;m.s.hp=1})()"); pg.wait_for_timeout(80)
      box=pg.locator('#atk').bounding_box(); pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2-8); pg.wait_for_timeout(900)
    pg.wait_for_timeout(1500); print('   duel won:', not pg.evaluate("ACT.dueling()"), '| win dialog shown:', pg.evaluate("!!APP.dialog"))
    for _ in range(40):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
    pg.wait_for_timeout(300); p0=pg.evaluate("JSON.stringify(WORLD.pos())"); pg.evaluate("(a)=>{WORLD.input.jx=a[0];WORLD.input.jy=a[1]}",[0,-1]); pg.wait_for_timeout(500); pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0")
    print('   afterwards: paused', pg.evaluate("WORLD.paused"), '| HUD', pg.evaluate("!document.getElementById('hud').hidden"), '| can move:', p0!=pg.evaluate("JSON.stringify(WORLD.pos())"))
    pg.close()
  # the Tower start path: same cleanup
  pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true; APP.game.startTowerRun(); WORLD.enter('peak'); WORLD.setPaused(false)"); pg.wait_for_timeout(1200)
  for _ in range(40):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  pg.evaluate("WORLD.setPaused(true); document.getElementById('hud').hidden=true; APP.towerFloorStart()"); pg.wait_for_timeout(500)
  print('Tower start from a paused dialog state: duel', pg.evaluate("ACT.dueling()"), '| paused', pg.evaluate("WORLD.paused"), '| HUD', pg.evaluate("!document.getElementById('hud').hidden"))
  print('errors:', errs or 'none'); b.close()
