from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':320,'height':720}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), caught:[5000,5001,5002].map(s=>({seed:s,stage:2,lv:8})), party:[5000,5001,5002], fighter:5000, seen:[1,2,3,4,5], xp:4000, npc:{done:['fern'],beaten:{},cleared:['rowan','ivy','bram'],seals:['wren']}})")
  pg.wait_for_timeout(200)
  # arrow: count gold arrow pixels drawn near the player over a few frames (world draws goal only when objective() is set)
  print('objective hook returns:', pg.evaluate("APP.__objHook ? APP.__objHook() : 'n/a'"))
  print('goal text:', pg.inner_text('#goal-text'))
  pg.click('#goal'); pg.wait_for_timeout(80); print('goal tap hint:', pg.inner_text('#toast'))
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(25.5*WORLD.TS, 15.3*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(60)
  pg.click('#act'); pg.wait_for_timeout(80); print('Pip:', pg.evaluate("APP.dialog && APP.dialog.lines.join(' / ')"))
  for _ in range(6):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()")
  # travel map before/after visiting
  pg.evaluate("APP.openMenu(); document.querySelector('[data-tile=map]').click()"); pg.wait_for_timeout(250)
  print('map before:', pg.evaluate("[...document.querySelectorAll('#wm-grid .mnode b')].map(b=>b.textContent).slice(5)"))
  w=pg.evaluate("[document.getElementById('wm-grid').scrollWidth, document.getElementById('wm-grid').clientWidth]"); print('map fits 320 (scrollW<=clientW):', w[0]<=w[1], w)
  pg.evaluate("document.getElementById('wm-close').click()"); pg.wait_for_timeout(100)
  pg.evaluate("WORLD.enter('frost'); WORLD.enter('frosthold')"); pg.wait_for_timeout(100)
  pg.reload(); pg.wait_for_timeout(1100); print('visited after reload:', pg.evaluate("APP.game.state.visited"))
  pg.evaluate("APP.openMenu(); document.querySelector('[data-tile=map]').click()"); pg.wait_for_timeout(250)
  print('map after:', pg.evaluate("[...document.querySelectorAll('#wm-grid .mnode b')].map(b=>b.textContent).slice(5)"))
  pg.evaluate("document.querySelector('[data-travel=frosthold]') ? document.querySelector('[data-travel=frosthold]').click() : (WORLD.map.id==='frosthold' ? 0 : null)"); pg.wait_for_timeout(150)
  print('now in:', pg.evaluate("WORLD.map.id"))
  box=pg.evaluate("null")
  print('errors:', errs or 'none'); b.close()
