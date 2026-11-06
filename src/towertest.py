# The Long Watch area: tiles changed only around the tower, label, locked toast, floors.
from playwright.sync_api import sync_playwright
errs=[]
def adv(pg):
  for _ in range(12):
    if pg.evaluate("!document.getElementById('dlg-choices').hidden"): return
    pg.evaluate('APP.advance()')
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=True)
  # old build for tile diff
  pg=ctx.new_page(); pg.goto('file:///tmp/cr/backups/live-before-endgame.html'); pg.wait_for_timeout(800)
  old=pg.evaluate("WORLD.map.grid.map(r=>r.join(''))"); pg.close()
  pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text and 'fonts' not in m.text else None)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  new=pg.evaluate("WORLD.map.grid.map(r=>r.join(''))")
  diff=[(x,y,old[y][x],new[y][x]) for y in range(len(old)) for x in range(len(old[0])) if old[y][x]!=new[y][x]]
  outside=[d for d in diff if not (24<=d[0]<=29 and 3<=d[1]<=11)]
  print('changed tiles',len(diff),'outside tower area',outside)
  # locked without seals, real mode
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false})})")
  pg.evaluate("""()=>{const g=APP.game; const seeds=[]; for(let s=5000;seeds.length<3;s++){const k=g.make(s,1); if(k.rarity!=='Mythic') seeds.push(s);} g.update({caught:seeds.map(x=>({seed:x,stage:3,lv:16})), party:seeds, fighter:seeds[0], essence:0, npc:Object.assign({},g.state.npc,{seals:['wren','glacia'],cleared:['rowan','ivy','bram','kiki','marlo'],done:['fern']}), seen:[...Array(20).keys()].map(i=>i+1)});}""")
  pg.evaluate("WORLD.enter('peak'); WORLD.setPos(12.9*WORLD.TS, 9.4*WORLD.TS); WORLD.step(1/60)")
  print('near:', pg.inner_text('#act-label'))
  pg.click('#act'); print('locked toast:', pg.inner_text('#toast'))
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})")
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
  print('replay blocked after win (STALE: simulates the old turn-based flow, always False now; the live Tower is covered by acttest5):', pg.evaluate("()=>{const v=APP.game.renderVals(); v.fighters[1]&&v.fighters[1].pick(); const v2=APP.game.renderVals(); const e0=APP.game.state.essence; v2.fight(); return v2.cannotFight===true && !(APP.game.state.battle&&!APP.game.state.battle.over) && APP.game.state.essence===e0}"))
  pg.evaluate("APP.close()"); pg.wait_for_timeout(120); print('after dialog:', pg.evaluate("APP.dialog && APP.dialog.lines.join(' / ')"))
  # reload keeps run
  pg.reload(); pg.wait_for_timeout(1100)
  print('after reload run:', pg.evaluate("JSON.stringify(APP.game.state.tower)"))
  # pause mid battle keeps HP, resets foes
  pg.evaluate("WORLD.enter('peak'); WORLD.setPos(12.9*WORLD.TS, 9.4*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(100)
  print('dbg', pg.evaluate("JSON.stringify([WORLD.nearest()&&WORLD.nearest().kind, !!APP.dialog, document.getElementById('hud').hidden, document.getElementById('act').disabled, document.getElementById('act-label').textContent, document.getElementById('tip').hidden])")); pg.click('#act', timeout=3000); pg.wait_for_timeout(50)
  print('resume lobby:', pg.evaluate("APP.dialog.lines.join(' / ')"))
  adv(pg); pg.click('#dlg-choices button >> nth=0'); pg.wait_for_timeout(150)
  pg.evaluate("APP.game.renderVals().fight()"); pg.evaluate("for(let i=0;i<3;i++) APP.game.battleAction({move:0})")
  hp=pg.evaluate("JSON.stringify(APP.game.state.tower.run.hp)")
  pg.evaluate("APP.close()"); pg.wait_for_timeout(50); print('pause toast:', pg.inner_text('#toast'))
  print('hp saved mid-battle == run hp:', hp==pg.evaluate("JSON.stringify(APP.game.state.tower.run.hp)"), hp)
  print('errors:', errs or 'none')
  b.close()
