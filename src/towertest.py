# The Long Watch: the tower stands on the peak map with a clear door front, label, locked toast, nights.
from playwright.sync_api import sync_playwright
errs=[]
def adv(pg):
  for _ in range(12):
    if pg.evaluate("!document.getElementById('dlg-choices').hidden"): return
    pg.evaluate('APP.advance()')
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
  pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text and 'fonts' not in m.text else None)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pk=pg.evaluate("(()=>{const M=WORLD.MAPS.peak,t=M.places.find(p=>p.kind==='tower');return {g:M.grid.map(r=>r.join('')),t:t,door:t.door}})()")
  t=pk['t']; dx,dy=pk['door']
  print('the Watch stands on Vigil Peak:', t['name'], '| door front walkable:', pk['g'][dy+1][dx] in '.,=' , '| footprint solid:', all(pk['g'][y][x]=='X' for y in range(t['y'],t['y']+t['h']) for x in range(t['x'],t['x']+t['w'])))
  # locked without seals, real mode
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false})})")
  pg.evaluate("""()=>{const g=APP.game; const seeds=[]; for(let s=5000;seeds.length<3;s++){const k=g.make(s,1); if(k.rarity!=='Mythic') seeds.push(s);} g.update({caught:seeds.map(x=>({seed:x,stage:3,lv:16})), party:seeds, fighter:seeds[0], essence:0, npc:Object.assign({},g.state.npc,{seals:['wren','glacia'],cleared:['rowan','ivy','bram','kiki','marlo'],done:['fern']}), seen:[...Array(20).keys()].map(i=>i+1)});}""")
  pg.evaluate("WORLD.enter('peak'); WORLD.setPos(12.9*WORLD.TS, 9.4*WORLD.TS); WORLD.step(1/60)")
  print('near:', pg.inner_text('#act-label'))
  pg.click('#act'); print('locked toast:', pg.inner_text('#toast'))
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})")
  pg.click('#act'); pg.wait_for_timeout(200); print('with seals the door leads into:', pg.evaluate("WORLD.map.id"))
  pg.evaluate("(()=>{const p=WORLD.map.places.find(q=>q.id==='stair');WORLD.setPos((p.door[0]+0.9)*WORLD.TS,(p.door[1]+1.4)*WORLD.TS);WORLD.step(1/60)})()"); pg.wait_for_timeout(100)
  pg.click('#act'); pg.wait_for_timeout(50); print('lobby:', pg.evaluate("APP.dialog.lines.join(' / ')"))
  adv(pg); pg.click('#dlg-choices button >> nth=0'); pg.wait_for_timeout(200)
  print('title:', pg.evaluate("APP.game.renderVals().screenTitle"), '| note:', pg.evaluate("APP.game.renderVals().matchupNote"))
  print('runs left after start:', pg.evaluate("APP.game.towerRunsLeft()"))
  pg.screenshot(path='/tmp/tw_battle.png')
  # fight floor 1 with move 0 until over
  pg.evaluate("Math.random=(()=>{let a=7;return()=>{a=(a*16807)%2147483647;return a/2147483647}})()")
  pg.evaluate("APP.game.renderVals().fight()"); pg.wait_for_timeout(50)
  r=pg.evaluate("()=>{const g=APP.game; for(let i=0;i<300&&g.state.battle&&!g.state.battle.over;i++) g.battleAction({move:0}); const b=g.state.battle; return {over:b.over,win:b.win,res:g.state.towerResult,tower:g.state.tower, ess:g.state.essence}}")
  print('floor1 result:', r)
  pg.evaluate("APP.close()"); pg.wait_for_timeout(120); print('after dialog:', pg.evaluate("APP.dialog && APP.dialog.lines.join(' / ')"))
  # reload keeps run
  pg.reload(); pg.wait_for_timeout(1100)
  print('after reload run:', pg.evaluate("JSON.stringify(APP.game.state.tower)"))
  # pause mid battle keeps HP, resets foes
  pg.evaluate("WORLD.enter('in-tower'); const p=WORLD.map.places.find(q=>q.id==='stair'); WORLD.setPos((p.door[0]+0.9)*WORLD.TS,(p.door[1]+1.4)*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(100)   # the lobby is a room now: the stair opens the keeper's dialog
  print('dbg', pg.evaluate("JSON.stringify([WORLD.nearest()&&WORLD.nearest().kind, !!APP.dialog, document.getElementById('hud').hidden, document.getElementById('act').disabled, document.getElementById('act-label').textContent, document.getElementById('tip').hidden])")); pg.click('#act', timeout=3000); pg.wait_for_timeout(50)
  print('resume lobby:', pg.evaluate("APP.dialog.lines.join(' / ')"))
  adv(pg); pg.click('#dlg-choices button >> nth=0'); pg.wait_for_timeout(150)
  pg.evaluate("APP.game.renderVals().fight()"); pg.evaluate("for(let i=0;i<3;i++) APP.game.battleAction({move:0})")
  hp=pg.evaluate("JSON.stringify(APP.game.state.tower.run.hp)")
  pg.evaluate("APP.close()"); pg.wait_for_timeout(50); print('pause toast:', pg.inner_text('#toast'))
  print('hp saved mid-battle == run hp:', hp==pg.evaluate("JSON.stringify(APP.game.state.tower.run.hp)"), hp)
  print('errors:', errs or 'none')
  b.close()
