# The other three signature places (Meaning, per route): Ashwood camps with warm fires and nobody there; Glacier Coast's row of returned things at dawn with an empty chair; Reef Causeway's lamps that answer one another at night.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__noTransition=true; document.getElementById('starter').hidden=true")
  print('camps per Ashwood road map:', pg.evaluate("['route-cm-edge','route-cm','route-cm-crossing'].map(id=>WORLD.MAPS[id].objects.filter(o=>o.kind==='camp').length)"), '| camp text:', pg.evaluate("WORLD.MAPS['route-cm'].objects.find(o=>o.kind==='camp').text"))
  print('no camps on the bypass or the dead end:', pg.evaluate("['route-cm-smoulder','route-cm-hollow'].every(id=>!WORLD.MAPS[id].objects||!WORLD.MAPS[id].objects.some(o=>o.kind==='camp'))"))
  # Glacier: the row exists only at dawn, the chair always
  def vis(tod):
    pg.evaluate("([t])=>{window.__tod=t;WORLD.enter('route-fc');WORLD.setPaused(true)}",[tod]); pg.wait_for_timeout(1300)
    return pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='returned'||o.kind==='chair').map(o=>!o.hidden)")
  print('shore row visible at day / dawn (items..., chair):', vis('day'), vis('dawn'))
  # Reef: at night the lamps light one after another (a wave), never by day
  def wave(tod):
    pg.evaluate("([t])=>{window.__tod=t;WORLD.enter('route-cc-pier');WORLD.setPaused(true)}",[tod]); seen=set()
    for _ in range(40):
      pg.evaluate("WORLD.drawNow()"); pg.wait_for_timeout(300)
      seen.add(tuple(pg.evaluate("(()=>{const L=APP.lampLevels();return WORLD.map.objects.filter(o=>o.wave).map(o=>(L[o.id]||0)>0.5?1:0)})()")))
    return sorted(seen)
  d=wave('day'); n=wave('night')
  print('lamp patterns by day:', d, '| at night:', n)
  print('day none lit; night more than one pattern (it travels) and at most two lit at once:', all(sum(x)==0 for x in d) and len(n)>2 and all(sum(x)<=2 for x in n))
  print('errors:', errs or 'none'); b.close()
