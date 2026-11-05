# No guidance: the player explores on their own. No goal pill, no arrow or marker in the world, no direction hints from Pip; the Travel map (discovered places only) still works.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':320,'height':720}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), caught:[5000,5001,5002].map(s=>({seed:s,stage:2,lv:8})), party:[5000,5001,5002], fighter:5000, seen:[1,2,3,4,5], xp:4000})")
  pg.wait_for_timeout(200)
  print('no goal pill in the HUD:', pg.evaluate("!document.getElementById('goal') && !document.getElementById('goal-text')"), '| no objective hook or helpers in APP:', pg.evaluate("typeof APP.objective==='undefined'"))
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(25.5*WORLD.TS, 15.3*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(60)
  pg.click('#act'); pg.wait_for_timeout(80); t=pg.evaluate("APP.dialog && APP.dialog.lines.join(' / ')"); print('Pip says:', t)
  print('Pip gives no directions to the next goal:', not any(w in (t or '').lower() for w in ['next','head to','go to','pointer']))
  for _ in range(6):
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()")
  # the world draws nothing that points the way: sample the screen for the old gold arrow colour near the player over a few frames
  gold=pg.evaluate("""(()=>{const c=document.querySelector('canvas');const g=c.getContext('2d');const d=WORLD.debug().player;let n=0;const r=70;const im=g.getImageData(Math.max(0,(d.x-r)*devicePixelRatio),Math.max(0,(d.y-r)*devicePixelRatio),r*2*devicePixelRatio,r*2*devicePixelRatio).data;for(let i=0;i<im.length;i+=4){if(im[i]===255&&im[i+1]===216&&im[i+2]===107)n++}return n})()""")
  print('old gold arrow pixels near the player:', gold)
  # travel map before / after visiting
  pg.evaluate("APP.openMenu(); document.querySelector('[data-tile=map]').click()"); pg.wait_for_timeout(250)
  print('map before: frosthold =', pg.evaluate("APP.mapSelect('frosthold'),document.querySelector('#wm-info b').textContent"))
  w=pg.evaluate("[document.getElementById('wm-info').scrollWidth, document.getElementById('wm-info').clientWidth]"); print('map card fits (scrollW<=clientW):', w[0]<=w[1], w)
  pg.evaluate("document.getElementById('wm-close').click()"); pg.wait_for_timeout(100)
  pg.evaluate("WORLD.enter('frost'); WORLD.enter('frosthold')"); pg.wait_for_timeout(100)
  pg.reload(); pg.wait_for_timeout(1100); print('visited after reload:', pg.evaluate("APP.game.state.visited"))
  pg.evaluate("APP.openMenu(); document.querySelector('[data-tile=map]').click()"); pg.wait_for_timeout(250)
  print('map after: frosthold =', pg.evaluate("APP.mapSelect('frosthold'),document.querySelector('#wm-info b').textContent"))
  print('errors:', errs or 'none'); b.close()
