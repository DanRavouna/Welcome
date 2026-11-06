# Titles: retroactive awards, essence paid once, no double award after reload, locked titles disabled.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':320,'height':760}); pg=ctx.new_page()
  pg.on('pageerror',lambda e:errs.append(str(e)))
  # existing save that already qualifies (25 species, 4 seals, tower best 10) -> retro award once on load
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(900)
  pg.evaluate("""()=>{const g=APP.game; const caught=[], have=new Set(); for(let s=1; have.size<25; s++){ const no=g.make(s,1).speciesNo; if(!have.has(no)&&!g.isShiny(s)){have.add(no); caught.push({seed:s,stage:1});} }
    const raw=JSON.parse(localStorage.getItem('critter-roll:v2')); Object.assign(raw,{caught, essence:5, seen:[...have], npc:{done:['fern'],beaten:{},cleared:[],seals:['wren','glacia','blaze','coral']}, tower:{best:10,day:'',runs:0,clears:0,run:null}}); delete raw.titles; localStorage.setItem('critter-roll:v2', JSON.stringify(raw));}""")
  pg.reload(); pg.wait_for_timeout(1500)
  print('retro titles:', pg.evaluate("APP.game.state.titles"), '| essence 5 ->', pg.evaluate("APP.game.state.essence"), '(expect 30)')
  print('toast:', pg.inner_text('#toast'))
  pg.reload(); pg.wait_for_timeout(1200); print('no double award after reload: essence', pg.evaluate("APP.game.state.essence"))
  # milestone on a keep: reach 36 via keeps
  pg.evaluate("""()=>{const g=APP.game; const have=new Set(g.state.seen); const add=[]; for(let s=5000; have.size<35; s++){ const no=g.make(s,1).speciesNo; if(!have.has(no)&&!g.isShiny(s)){have.add(no); add.push({seed:s,stage:1});} } g.update({caught:add.concat(g.state.caught)});}""")
  print('at 35:', pg.evaluate("APP.game.state.titles.length"), pg.evaluate("APP.game.state.seen.length"))
  e0=pg.evaluate("APP.game.state.essence")
  pg.evaluate("""()=>{const g=APP.game; const have=new Set(g.state.seen); for(let s=9000;;s++){ const no=g.make(s,1).speciesNo; if(!have.has(no)&&!g.isShiny(s)){ g.update({caught:[{seed:s,stage:1}].concat(g.state.caught)}); break; } } }""")
  print('36th species -> naturalist:', 'naturalist' in pg.evaluate("APP.game.state.titles"), '| essence +', pg.evaluate("APP.game.state.essence")-e0)
  # shiny hunter: keep 3 shinies, release one -> title stays
  pg.evaluate("""()=>{const g=APP.game; const sh=[]; for(let s=1; sh.length<3; s++) if(g.isShiny(s)) sh.push({seed:s,stage:1}); g.update({caught:sh.concat(g.state.caught)});}""")
  print('shiny hunter:', 'shiny' in pg.evaluate("APP.game.state.titles"), pg.evaluate("APP.game.state.shinies"))
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.filter(e=>!APP.game.isShiny(e.seed))})"); print('kept after release:', 'shiny' in pg.evaluate("APP.game.state.titles"))
  # wear title + profile
  pg.evaluate("APP.open('badges')"); pg.wait_for_timeout(300)
  pg.click("button:has-text('Critter Master')", timeout=2000) if False else None
  pg.click("button:has-text('Shiny Hunter')"); pg.wait_for_timeout(150)
  print('wearing:', pg.evaluate("APP.game.titleName()"), '| locked button disabled:', pg.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Watchkeeper')).disabled"))
  sec=pg.locator("text=Titles").first; sec.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
  box=pg.locator("text=Titles").first.bounding_box(); pg.screenshot(path='/tmp/titles.png', clip={'x':0,'y':max(0,box['y']-20),'width':320,'height':330})
  pg.evaluate("APP.close()"); pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(300)
  print('menu title:', pg.inner_text('#m-title'))
  pg.screenshot(path='/tmp/menuhead.png', clip={'x':0,'y':0,'width':320,'height':200})
  pg.reload(); pg.wait_for_timeout(1100); print('after reload wearing:', pg.evaluate("APP.game.titleName()"))
  print('errors:', errs or 'none'); b.close()
