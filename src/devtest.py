# Developer tools, with REAL defaults (run without the seed hook): the unlock gesture, the panel, level-requirement override, no-challenge switch,
# teleport to every map, trainer level, adventure shortcuts, reset, hiding the tools, and that the closed panel never blocks the game.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':800})
  ctx.add_init_script("try{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:2,stage:3,lv:14}],party:[2],fighter:2,essence:20,wins:0,intro:true,settings:{sound:true,vibrate:true,calm:false,test:false,daynight:true,track:true,follow:false,weather:false,ambient:false}})); localStorage.setItem('critter-roll:menu', JSON.stringify(['critters','journey','game'])); } window.__noTransition=true; }catch(e){}")
  pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  pg.evaluate("document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def menu_has_dev(): pg.click('#b-menu'); pg.wait_for_timeout(200); r=pg.evaluate("!!document.querySelector('[data-tile=dev]')"); pg.click('#m-close'); pg.wait_for_timeout(150); return r
  print('fresh player: dev state', pg.evaluate("APP.game.state.dev"), '| Dev tools tile shown:', menu_has_dev(), '| overlay hidden (display none):', pg.evaluate("getComputedStyle(document.getElementById('dev')).display==='none'"))
  # the real unlock gesture: tap the ID five times
  pg.click('#b-menu'); pg.wait_for_timeout(200)
  for _ in range(5): pg.click('#m-id'); pg.wait_for_timeout(60)
  pg.wait_for_timeout(300); print('after 5 taps on the ID: dev', pg.evaluate("APP.game.state.dev"), '| tile shown:', pg.evaluate("!!document.querySelector('[data-tile=dev]')"))
  pg.click('[data-tile=dev]'); pg.wait_for_timeout(300)
  print('panel open:', pg.evaluate("!document.getElementById('dev').hidden"), '| sections:', [t for t in pg.inner_text('#dev-body').split('\n') if t.isupper() or t in ('REQUIREMENTS','TELEPORT','PLAYER','ADVENTURE','DEVELOPER MODE')][:6])
  btn=lambda a: pg.click(f"[data-dev='{a}']"); pressed=lambda a: pg.evaluate(f"document.querySelector(\"[data-dev='{a}']\").getAttribute('aria-pressed')")
  # 1) level requirements: the Ascent needs level 11 in real mode
  pg.click('#dev-close'); pg.wait_for_timeout(200)
  print('closed panel does not block the game (display none, act button clickable area):', pg.evaluate("getComputedStyle(document.getElementById('dev')).display==='none' && document.elementFromPoint(195,700)!==document.getElementById('dev')"))
  def try_gate():
    pg.evaluate("WORLD.enter('frosthold'); WORLD.setPos(31.9*WORLD.TS,1.0*WORLD.TS); WORLD.input.jy=-1")
    for _ in range(12): pg.evaluate("WORLD.step(1/30)")
    pg.evaluate("WORLD.input.jy=0"); pg.wait_for_timeout(300); return pg.evaluate("WORLD.map.id")
  print('level', pg.evaluate("APP.game.levelInfo(APP.game.state.xp||0).level"), 'at the Ascent gate, requirements ON ->', try_gate())
  pg.click('#b-menu'); pg.click('[data-tile=dev]'); pg.wait_for_timeout(200); btn('tog:levels'); print('Ignore level requirements pressed:', pressed('tog:levels'), '| noGates:', pg.evaluate("APP.game.props.noGates"), '| test mode still off:', pg.evaluate("APP.game.props.testMode===false"), '| rolls still limited:', pg.evaluate("APP.game.energy().left<99"))
  pg.click('#dev-close'); pg.wait_for_timeout(200); print('same gate with the override ->', try_gate())
  print('override is browser-only (not in the save):', pg.evaluate("JSON.stringify(JSON.parse(localStorage.getItem('critter-roll:v2'))).indexOf('levels')===-1"), '| stored:', pg.evaluate("localStorage.getItem('critter-roll:dev')"))
  # 2) no trainer challenges
  def alerted():
    pg.evaluate("WORLD.enter('route-mf'); WORLD.npcs.forEach(n=>{n.declined=false;n.alert=0}); const n=WORLD.npcs.find(x=>x.id==='kai'); WORLD.setPaused(false); WORLD.setPos((n.x+0.5)*WORLD.TS,(n.y-2+0.5)*WORLD.TS)")
    for _ in range(6): pg.evaluate("WORLD.step(1/30)")
    r=pg.evaluate("WORLD.npcs.find(x=>x.id==='kai').declined"); pg.evaluate("APP.dialog&&APP.advance&&0"); return r
  print('trainer sees you, challenges ON:', alerted()); pg.wait_for_timeout(1500)
  # decline the challenge so the test can go on
  for _ in range(40):
    pg.evaluate("(()=>{const c=[...document.querySelectorAll('#dlg-choices button')].find(b=>/not now|no/i.test(b.textContent));if(c)c.click()})()")
    if not pg.evaluate("!!APP.dialog"): break
    pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
  pg.evaluate("APP.close&&APP.close(); WORLD.setPaused(false)"); pg.wait_for_timeout(200)
  pg.click('#b-menu'); pg.click('[data-tile=dev]'); pg.wait_for_timeout(200); btn('tog:safe'); pg.click('#dev-close'); pg.wait_for_timeout(200)
  print('trainer sees you, "No trainer challenges" ON:', alerted())
  # 3) teleport to every map
  pg.click('#b-menu'); pg.click('[data-tile=dev]'); pg.wait_for_timeout(200)
  ids=pg.evaluate("Object.keys(WORLD.MAPS).filter(i=>!WORLD.MAPS[i].interior)"); bad=[]
  for i in ids:
    pg.evaluate("document.getElementById('dev').hidden||0"); 
    if pg.evaluate("document.getElementById('dev').hidden"): pg.click('#b-menu'); pg.click('[data-tile=dev]'); pg.wait_for_timeout(150)
    pg.click(f"[data-dev='tp:{i}']"); pg.wait_for_timeout(200)
    if pg.evaluate("WORLD.map.id")!=i or pg.evaluate("!document.getElementById('dev').hidden"): bad.append(i)
  print('teleport buttons:', len(ids), 'maps | failed:', bad or 'none')
  # 4) trainer level, essence, a strong critter
  pg.click('#b-menu'); pg.click('[data-tile=dev]'); pg.wait_for_timeout(200)
  btn('lv:20'); print('Level 20 ->', pg.evaluate("APP.game.levelInfo(APP.game.state.xp).level")); btn('lv:5'); print('Level 5 afterwards keeps it (never lowers):', pg.evaluate("APP.game.levelInfo(APP.game.state.xp).level"))
  e0=pg.evaluate("APP.game.state.essence"); btn('ess'); n0=pg.evaluate("APP.game.state.caught.length"); btn('crit'); print('+100 essence:', pg.evaluate("APP.game.state.essence")-e0, '| critters', n0, '->', pg.evaluate("APP.game.state.caught.length"), '| last:', pg.evaluate("JSON.stringify(APP.game.state.caught.slice(-1)[0])"))
  # 5) adventure shortcuts
  A=lambda: pg.evaluate("(()=>{const a=APP.game.state.adv,c=(APP.game.state.npc||{}).cleared||[];return {clues:a.clues.length,arch:!!a.open.arch,rubble:!!a.flags.rubble,lampdoor:!!a.open.lamp,lit:!!a.flags.lampLit,keeper:c.indexOf('keeper')!==-1,maren:c.indexOf('maren')!==-1,veil:APP.game.state.caught.some(e=>e.seed===SECRET_SEED),wick:APP.game.state.caught.some(e=>e.seed===SECRET2_SEED)}})()")
  for a in ['clues','arch','rite','keeper','veil','lampdoor','gates','maren','lit','wick']: btn(a); pg.wait_for_timeout(80)
  print('after every shortcut:', A())
  print('tower gates all open:', pg.evaluate("['g1','g2','g3'].map(g=>g+':'+(WORLD.MAPS['dg-lamp'].objects.filter(x=>x.gate===g).every(x=>x.hidden)?'open':'shut')).join(' ')"), '| arch rubble objects left:', pg.evaluate("WORLD.MAPS['dg-arch'].objects.filter(o=>o.rubble).length"))
  btn('resetadv'); print('after Reset the adventure:', A())
  # 6) hide the tools
  btn('devoff'); pg.wait_for_timeout(300); print('after Hide developer tools: dev', pg.evaluate("APP.game.state.dev"), '| panel closed:', pg.evaluate("document.getElementById('dev').hidden"), '| tile shown:', menu_has_dev())
  print('errors:', errs or 'none'); b.close()
