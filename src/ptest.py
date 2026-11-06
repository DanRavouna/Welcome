# Progression: level gates on zones, level-up, leader and seal flow, the Fire-keeper banner, reload.
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100); pg.evaluate('0')
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{follow:false})})")   # these suites test the turn-based battle screen, which is what the game uses when Critter follows you is off
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    push = """([dx,dy]) => { for(let i=0;i<90;i++){ WORLD.input.jx=dx; WORLD.input.jy=dy; WORLD.step(1/60);} WORLD.input.jx=0; WORLD.input.jy=0; return WORLD.map.id; }"""
    # gates: real mode, level 1
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), xp:0})")
    pg.evaluate("WORLD.enter('town'); WORLD.setPos(21.9*WORLD.TS, 3.6*WORLD.TS)"); pg.wait_for_timeout(100)
    m=pg.evaluate(push,[0,-1]); t=pg.inner_text('#toast')
    print('north at Lv1 ->', m, '| toast:', t)
    pg.wait_for_timeout(300); pg.screenshot(path='/tmp/p_gate.png')
    pg.evaluate("WORLD.enter('town'); WORLD.setPos(1.6*WORLD.TS, 17.2*WORLD.TS)")
    print('west at Lv1 ->', pg.evaluate(push,[-1,0]))
    pg.evaluate("WORLD.enter('town')")
    pg.evaluate("APP.game.update({xp:200})"); pg.wait_for_timeout(200); print('level-up toast:', pg.inner_text('#toast'), '| level', pg.evaluate("APP.game.levelInfo(APP.game.state.xp).level"))
    pg.evaluate("WORLD.setPos(21.9*WORLD.TS, 1.6*WORLD.TS)"); print('north at Lv3 ->', pg.evaluate(push,[0,-1]))
    pg.evaluate("WORLD.enter('town'); WORLD.setPos(21.9*WORLD.TS, 32.4*WORLD.TS)"); print('south (Ember) at Lv3 ->', pg.evaluate(push,[0,1]))
    # sign text
    pg.evaluate("WORLD.enter('town')"); pg.evaluate("APP.toast('')")
    sign=pg.evaluate("""() => { const s=WORLD.SIGNS.find(s=>s.to==='tide'); WORLD.setPos((s.x-0.5)*WORLD.TS,(s.y+0.6)*WORLD.TS); WORLD.step(1/60); return WORLD.nearest() && WORLD.nearest().kind; }""")
    pg.click('#act'); print('tide sign:', sign, '|', pg.inner_text('#toast'))
    # leader requires zone trainer
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:true})})")
    pg.evaluate("WORLD.enter('gym-wren')")   # Wren waits inside her gym hall now
    pg.evaluate("""() => { const g=APP.game; let s=1; for(;;s++){ const k=g.make(s,3); if(k.stats.reduce((a,q)=>a+q.value,0)>470) break; } const strong=[]; for(let t=1; strong.length<3; t++){ const k=g.make(t,3); if(k.stats.reduce((a,q)=>a+q.value,0)>450) strong.push(t); } g.update({caught:strong.map(x=>({seed:x,stage:3})), party:strong, fighter:strong[0], essence:0}); }""")
    pg.evaluate("APP.talk(WORLD.npcs.find(n=>n.id==='wren'))"); print('wren before Ivy:', pg.evaluate("APP.dialog.lines.join(' / ')"))
    for _ in range(4): pg.evaluate("APP.advance()")
    pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:['ivy']})})")
    pg.evaluate("APP.talk(WORLD.npcs.find(n=>n.id==='wren'))")
    for _ in range(4): pg.evaluate("APP.advance()")
    pg.wait_for_timeout(100); pg.locator('#dlg-choices button', has_text='Battle!').click(); pg.wait_for_timeout(250)
    x0=pg.evaluate("APP.game.state.xp"); e0=pg.evaluate("APP.game.state.essence")
    print('leader screen:', pg.locator('#screen nav span').inner_text(), '|', pg.locator('#screen p').first.inner_text()[:80])
    pg.locator('#screen button', has_text='Battle Elder Wren').click(); pg.wait_for_timeout(100)
    for i in range(120):
        if pg.evaluate("APP.game.state.battle.over"): break
        pg.locator('#screen button:has-text("PWR")').first.click(); pg.wait_for_timeout(20)
    bt=pg.evaluate("(()=>{const b=APP.game.state.battle; return {win:b.win, idx:b.trainer.idx, breath:b.log.filter(l=>l.text.includes('catches its breath')).length, sent:b.log.filter(l=>l.text.includes('sent out')).length}})()")
    print('wren battle:', bt, '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| xp +', pg.evaluate("APP.game.state.xp")-x0, '| seals', pg.evaluate("APP.game.state.npc.seals"))
    pg.screenshot(path='/tmp/p_lwin.png')
    pg.click('#close-screen'); pg.wait_for_timeout(1500)
    print('ceremony:', pg.evaluate("APP.dialog && APP.dialog.lines.join(' / ')"))
    pg.screenshot(path='/tmp/p_ceremony.png')
    for _ in range(4): pg.evaluate("APP.advance()")
    pg.evaluate("APP.talk(WORLD.npcs.find(n=>n.id==='wren'))"); print('same day:', pg.evaluate("APP.dialog.lines[0]")); pg.evaluate("APP.advance(); APP.advance()")
    # next-day rematch: 8 essence, no extra seal
    pg.evaluate("""() => { const npc=Object.assign({},APP.game.state.npc); npc.beaten=Object.assign({},npc.beaten,{wren:'Mon Jan 01 2001'}); APP.game.update({npc}); }""")
    pg.evaluate("APP.startTrainer(WORLD.npcs.find(n=>n.id==='wren'))"); pg.wait_for_timeout(150); e1=pg.evaluate("APP.game.state.essence")
    pg.locator('#screen button', has_text='Battle Elder Wren').click()
    for i in range(120):
        if pg.evaluate("APP.game.state.battle.over"): break
        pg.locator('#screen button:has-text("PWR")').first.click(); pg.wait_for_timeout(15)
    print('rematch win:', pg.evaluate("APP.game.state.battle.win"), '| essence +', pg.evaluate("APP.game.state.essence")-e1, '| seals', pg.evaluate("APP.game.state.npc.seals"))
    pg.click('#close-screen'); pg.wait_for_timeout(300); print('no second ceremony:', pg.evaluate("APP.dialog === null"))
    # champion
    pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})")
    pg.evaluate("APP.open('badges')"); pg.wait_for_timeout(300)
    txt=pg.locator('#screen').inner_text(); print('title shown:', 'Keeper of Four Fires' in txt, '| seals 4/4:', '4/4 earned' in txt)
    pg.evaluate("""() => { const el=[...document.querySelectorAll('#screen span')].find(s=>s.textContent.trim()==='Leader seals'); el.scrollIntoView(); }"""); pg.wait_for_timeout(200); pg.screenshot(path='/tmp/p_seals.png')
    pg.click('#close-screen'); pg.click('#b-menu'); pg.wait_for_timeout(200); print('menu seals tile:', pg.locator('[data-tile="seals"]').inner_text().replace('\n',' '))
    pg.wait_for_timeout(1200); pg.reload(); pg.wait_for_timeout(1100)
    print('after reload seals:', pg.evaluate("APP.game.state.npc.seals.length"), '| cleared:', pg.evaluate("APP.game.state.npc.cleared"))
    b.close()
print('errors:', errors if errors else 'none')
