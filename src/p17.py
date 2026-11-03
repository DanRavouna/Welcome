import json
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1500)
    print('new player: test mode', pg.evaluate("APP.game.props.testMode"), '| rolls chip:', pg.inner_text('#c-rolls'), '| intro dialog:', pg.evaluate("APP.dialog && APP.dialog.name"))
    print('  goal before starter:', pg.inner_text('#goal-text'))
    pg.screenshot(path='/tmp/t_intro.png')
    for _ in range(6): pg.evaluate("APP.advance()"); pg.wait_for_timeout(30)
    pg.wait_for_timeout(200); print('starter screen open:', pg.is_visible('#starter'), '| cards:', [c.replace('\n',' | ') for c in pg.locator('.scard').all_inner_texts()])
    pg.screenshot(path='/tmp/t_starter.png')
    seeds=pg.evaluate("APP.game.starters()"); types=pg.evaluate("APP.game.starters().map(s=>APP.game.make(s,1).element.name)"); print('starter types:', types, '| same on reload:', seeds)
    pg.locator('.scard button').nth(1).click(); pg.wait_for_timeout(200)
    st=pg.evaluate("({caught:APP.game.state.caught, party:APP.game.state.party, intro:APP.game.state.intro, seen:APP.game.state.seen.length, xp:APP.game.state.xp})")
    print('after choosing:', st, '| Fern says:', pg.evaluate("APP.dialog.lines[0]"))
    for _ in range(6): pg.evaluate("APP.advance()"); pg.wait_for_timeout(30)
    pg.wait_for_timeout(200); print('goal:', pg.inner_text('#goal-text'), '| target:', pg.evaluate("JSON.stringify(APP.objective().target)"))
    # walk toward grass to see arrow + first grass hint
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    pg.screenshot(path='/tmp/t_goal.png')
    pg.evaluate("(()=>{ const M=WORLD.map; for(let y=0;y<M.H;y++)for(let x=0;x<M.W;x++) if(M.grid[y][x]==='W'){ WORLD.setPos((x+0.5)*WORLD.TS,(y+0.7)*WORLD.TS); WORLD.step(1/60); return; } })()")
    pg.wait_for_timeout(250); t1=pg.inner_text('#toast')
    pg.evaluate("WORLD.setPos(21.9*WORLD.TS, 23.6*WORLD.TS); WORLD.step(1/60)"); pg.wait_for_timeout(5000)
    pg.evaluate("(()=>{ const M=WORLD.map; for(let y=0;y<M.H;y++)for(let x=0;x<M.W;x++) if(M.grid[y][x]==='W'){ WORLD.setPos((x+0.5)*WORLD.TS,(y+0.7)*WORLD.TS); WORLD.step(1/60); return; } })()"); pg.wait_for_timeout(250)
    print('grass hint first time:', t1[:45], '| shown again?', pg.evaluate("document.getElementById('toast').hidden ? 'no' : document.getElementById('toast').textContent.slice(0,30)"), '| hints saved:', pg.evaluate("APP.game.state.hints"))
    # goal progression
    steps = [
      ("APP.game.update({caught:[{seed:12,stage:1},{seed:30,stage:1},{seed:45,stage:1}]})", 'party'),
      ("APP.game.update({party:[12,30,45]})", 'rowan'),
      ("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:['rowan']})})", 'fern species'),
      ("APP.game.update({seen:[1,2,3,4,5]})", 'fern return'),
      ("APP.game.update({npc:Object.assign({},APP.game.state.npc,{done:['fern']})})", 'moss (lv1)'),
      ("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:['rowan','ivy']})})", 'wren'),
      ("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren']})})", 'frost gate (lv)'),
      ("APP.game.update({xp:200})", 'bram'),
      ("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})", 'champion'),
    ]
    for js, label in steps:
        pg.evaluate(js); pg.wait_for_timeout(60)
        o=pg.evaluate("APP.objective()"); print(f'  {label:16s} ->', o['text'], '|', json.dumps(o['target']))
    # toggle arrow
    pg.click('#goal'); pg.wait_for_timeout(100); print('tap goal -> track:', pg.evaluate("APP.game.state.settings.track"), '| aria-pressed:', pg.get_attribute('#goal','aria-pressed'), '| toast:', pg.inner_text('#toast')[:40])
    pg.click('#goal'); pg.wait_for_timeout(100)
    # zone + battle hints
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:true})})")
    pg.evaluate("WORLD.enter('moss')"); pg.wait_for_timeout(1300); print('zone hint:', pg.evaluate("APP.game.state.hints.includes('zone')"))
    pg.evaluate("APP.open('battle')"); pg.wait_for_timeout(700); print('battle hint:', pg.evaluate("APP.game.state.hints.includes('battle')")); pg.evaluate("APP.close()")
    pg.wait_for_timeout(1300); pg.reload(); pg.wait_for_timeout(1500)
    print('after reload: no intro again:', pg.evaluate("APP.dialog === null"), '| starter hidden:', pg.evaluate("document.getElementById('starter').hidden"), '| track kept:', pg.evaluate("APP.game.state.settings.track"))
    ctx.close()
    # existing player from an older version: has critters, test on, no intro field
    ctx=b.new_context(); pg=ctx.new_page()
    pg.add_init_script("localStorage.getItem('critter-roll:v2') || localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:12,stage:2}],essence:5,wins:2,settings:{sound:true,vibrate:true,calm:false,test:true,daynight:true}}))")
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1500)
    print('existing player: intro shown:', pg.evaluate("!!APP.dialog"), '| test mode kept:', pg.evaluate("APP.game.props.testMode"), '| goal:', pg.inner_text('#goal-text'))
    b.close()
print('errors:', errors if errors else 'none')
