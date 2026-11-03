# Run WITHOUT the pwhook (real defaults): bash src/run-tests.sh menutest.py handles this via the NOHOOK list.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844})
  # an existing player (intro done) but NOTHING about the menu: real defaults
  ctx.add_init_script("try{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:2,stage:2,lv:9},{seed:7,stage:1,lv:3}],party:[2,7],fighter:2,essence:20,wins:0,intro:true,settings:{sound:true,vibrate:true,calm:false,test:false,daynight:true,track:true}})); } }catch(e){}")
  pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  vis=lambda: pg.evaluate("[...document.querySelectorAll('#m-grid [data-tile]')].filter(e=>e.offsetParent!==null).map(e=>e.dataset.tile)")
  heads=lambda: pg.evaluate("[...document.querySelectorAll('[data-group]')].map(e=>e.dataset.group+':'+e.getAttribute('aria-expanded'))")
  pg.click('#b-menu'); pg.wait_for_timeout(250)
  print('fresh state headers:', heads(), '| visible tiles:', vis())
  # open Journey
  pg.click('[data-group="journey"]'); pg.wait_for_timeout(150)
  print('after opening Journey:', heads(), '| visible:', vis(), '| focus kept on header:', pg.evaluate("document.activeElement.dataset.group"))
  # persists across close/open
  pg.click('#m-close'); pg.wait_for_timeout(150); pg.click('#b-menu'); pg.wait_for_timeout(200)
  print('after reopen:', heads())
  # collapse again, check quest badge on the collapsed header (complete a quest)
  pg.click('[data-group="journey"]'); pg.wait_for_timeout(100)
  print('collapsed Journey hides its tiles:', 'map' not in vis(), '| badge on header:', pg.evaluate("(document.querySelector('[data-group=journey] .mhb')||{}).textContent||'none'"))
  # make one quest ready, then the collapsed Journey header must show the badge
  pg.evaluate("(()=>{const g=APP.game,q=g.questsFor(g.state),d=g.questDefs();q.items[0].progress=d[q.items[0].key].target;g.update({quests:q});APP.closeMenu();APP.openMenu()})()"); pg.wait_for_timeout(250)
  print('collapsed Journey badge when a quest is ready:', pg.evaluate("(document.querySelector('[data-group=journey] .mhb')||{}).textContent||'none'"))
  # tile inside an open group works (Dex), Game group opens to Settings and Save
  pg.click('[data-group="game"]'); pg.wait_for_timeout(100); print('Game group visible tiles:', [t for t in vis() if t in ('settings','backup')])
  pg.click('[data-tile="backup"]'); pg.wait_for_timeout(300); print('Save panel opened from menu:', pg.evaluate("!document.getElementById('bk').hidden"))
  pg.click('#bk-close'); pg.wait_for_timeout(200)
  # keyboard: header is a real button, Enter toggles
  pg.click('#b-menu'); pg.wait_for_timeout(200); pg.focus('[data-group="game"]'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
  print('keyboard Enter toggles:', heads())
  # layout: no overflow at several widths, everything open and closed
  for w in [320,360,390,430]:
    pg.set_viewport_size({'width':w,'height':780}); pg.wait_for_timeout(150)
    for st in ['all open','all closed']:
      pg.evaluate("localStorage.setItem('critter-roll:menu', JSON.stringify(%s)); APP.closeMenu(); APP.openMenu()" % ("['critters','journey','game']" if st=='all open' else "[]")); pg.wait_for_timeout(150)
      o=pg.evaluate("(()=>{const p=document.querySelector('.mpanel');return [p.scrollWidth>p.clientWidth+1, document.documentElement.scrollWidth>innerWidth+1]})()")
      print(f'  {w}px {st}: overflow {o}', end='')
    print()
  pg.set_viewport_size({'width':390,'height':844})
  pg.evaluate("localStorage.setItem('critter-roll:menu', JSON.stringify(['critters','journey'])); APP.closeMenu(); APP.openMenu()"); pg.wait_for_timeout(200); pg.screenshot(path='/tmp/menu-groups.png')
  print('errors:', errs or 'none'); b.close()
