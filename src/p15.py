from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100); pg.evaluate('0')
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    pg.evaluate("APP.game.update({caught:[{seed:12,stage:1},{seed:30,stage:2},{seed:45,stage:1},{seed:77,stage:1}], essence:40})")
    # party overlay
    pg.click('#b-menu'); pg.click('[data-tile="party"]'); pg.wait_for_timeout(200)
    for s in [30,12,45,77]:
        btn=pg.locator(f'[data-toggle="{s}"]')
        if btn.is_enabled(): btn.click(); pg.wait_for_timeout(50)
    print('party after adding 4:', pg.evaluate("APP.game.state.party"), '| count text:', pg.inner_text('#pt-count'), '| 4th disabled:', pg.locator('[data-toggle="77"]').is_disabled())
    pg.click('[data-lead="45"]'); pg.wait_for_timeout(50); print('after make-lead 45:', pg.evaluate("APP.game.state.party"), 'fighter', pg.evaluate("APP.game.state.fighter"))
    pg.screenshot(path='/tmp/s_party.png')
    pg.click('[data-toggle="12"]'); pg.click('[data-toggle="12"]'); pg.wait_for_timeout(50); print('remove+re-add 12:', pg.evaluate("APP.game.state.party"))
    pg.click('#party-close')
    # shop via Mira
    pg.evaluate("APP.talk(WORLD.npcs.find(n=>n.id==='mira'))"); pg.wait_for_timeout(100); pg.evaluate("APP.advance(); APP.advance()"); pg.wait_for_timeout(200)
    print('shop open after Mira:', not pg.evaluate("document.getElementById('shop').hidden"), '|', pg.inner_text('#sh-ess'))
    for it in ['potion','potion','super','charm','ticket']: pg.click(f'[data-buy="{it}"]'); pg.wait_for_timeout(40)
    print('bag:', pg.evaluate("APP.game.state.bag"), '| essence left:', pg.evaluate("APP.game.state.essence"), '| charm button disabled (not enough):', pg.locator('[data-buy="charm"]').is_disabled())
    pg.screenshot(path='/tmp/s_shop.png'); pg.click('#shop-close')
    # wild battle with party
    pg.evaluate("APP.open('battle')"); pg.wait_for_timeout(200)
    print('pre-battle YOU status:', pg.evaluate("APP.game.renderVals().duel[0].status"))
    pg.locator('#screen button', has_text='Fight (1 roll)').click(); pg.wait_for_timeout(150)
    bench=pg.evaluate("APP.game.state.battle.bench.map(s=>s.k.name)"); print('bench in battle:', bench, '| lead:', pg.evaluate("APP.game.state.battle.s[0].k.name"))
    # manual switch uses turn
    r0=pg.evaluate("APP.game.state.battle.round"); pg.locator('#screen button', has_text='Switch (2)').click(); pg.wait_for_timeout(80)
    pg.screenshot(path='/tmp/s_switch.png')
    pg.locator('#screen button').filter(has_text='HP ').first.click(); pg.wait_for_timeout(120)
    print('switch: round', r0, '->', pg.evaluate("APP.game.state.battle.round"), '| new lead:', pg.evaluate("APP.game.state.battle.s[0].k.name"), '| log:', pg.evaluate("APP.game.state.battle.log.slice(-3).map(l=>l.text).join(' / ')")[:140])
    # potion: damage our lead first
    pg.evaluate("(()=>{const b=JSON.parse(JSON.stringify(APP.game.state.battle)); b.s[0].hp=Math.round(b.s[0].max*0.3); APP.game.setState({battle:b});})()")
    hp=pg.evaluate("APP.game.state.battle.s[0].hp"); pg.locator('#screen button', has_text='Bag (').click(); pg.wait_for_timeout(80)
    pg.screenshot(path='/tmp/s_bag.png')
    pg.locator('#screen button', has_text='Potion ×2').click(); pg.wait_for_timeout(120)
    print('potion: hp', hp, '->', pg.evaluate("APP.game.state.battle.s[0].hp"), '(minus any foe hit) | potions left', pg.evaluate("APP.game.state.bag.potion"), '| log has potion:', pg.evaluate("APP.game.state.battle.log.some(l=>l.text.includes('used a Potion'))"))
    # auto-switch on faint: set lead hp 1 and keep attacking
    pg.evaluate("(()=>{const b=JSON.parse(JSON.stringify(APP.game.state.battle)); b.s[0].hp=1; b.s[1].hp=b.s[1].max; APP.game.setState({battle:b});})()")
    lead=pg.evaluate("APP.game.state.battle.s[0].k.name")
    for i in range(3):
        if pg.evaluate("APP.game.state.battle.s[0].k.name")!=lead or pg.evaluate("APP.game.state.battle.over"): break
        pg.locator('#screen button:has-text("PWR")').first.click(); pg.wait_for_timeout(60)
    print('auto-switch: lead', lead, '->', pg.evaluate("APP.game.state.battle.s[0].k.name"), '| over:', pg.evaluate("APP.game.state.battle.over"), '| steps-in logged:', pg.evaluate("APP.game.state.battle.log.some(l=>l.text.includes('steps in'))"))
    # all faint -> loss
    pg.evaluate("(()=>{const b=JSON.parse(JSON.stringify(APP.game.state.battle)); b.s[0].hp=1; b.bench.forEach(s=>s.hp=0); b.s[1].hp=b.s[1].max; APP.game.setState({battle:b});})()")
    for i in range(4):
        if pg.evaluate("APP.game.state.battle.over"): break
        pg.locator('#screen button:has-text("PWR")').first.click(); pg.wait_for_timeout(60)
    print('all fainted -> over:', pg.evaluate("APP.game.state.battle.over"), 'win:', pg.evaluate("APP.game.state.battle.win"), '| result:', pg.evaluate("APP.game.renderVals().resultTitle"))
    pg.click('#close-screen')
    # trainer with party
    pg.evaluate("APP.startTrainer(WORLD.npcs.find(n=>n.id==='rowan'))"); pg.wait_for_timeout(150)
    pg.locator('#screen button', has_text='Battle Rowan').click(); pg.wait_for_timeout(100)
    print('trainer bench:', pg.evaluate("APP.game.state.battle.bench.length"))
    for i in range(150):
        if pg.evaluate("APP.game.state.battle.over"): break
        pg.locator('#screen button:has-text("PWR")').first.click(); pg.wait_for_timeout(15)
    print('rowan result:', pg.evaluate("(()=>{const b=APP.game.state.battle; return {win:b.win, sent:b.log.filter(l=>l.text.includes('sent out')).length, stepsIn:b.log.filter(l=>l.text.includes('steps in')).length}})()"))
    pg.click('#close-screen'); pg.wait_for_timeout(200)
    # bag: charm + ticket
    pg.click('#b-menu'); pg.click('[data-tile="bag"]'); pg.wait_for_timeout(150)
    pg.click('[data-use="charm"]'); pg.wait_for_timeout(80); print('charm active:', pg.evaluate("APP.game.state.charm"), '|', pg.inner_text('#bg-note'))
    pg.click('[data-use="ticket"]'); pg.wait_for_timeout(80); print('ticket in test mode ->', pg.inner_text('#toast'))
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), day:new Date().toDateString(), used:20})")
    pg.click('[data-use="ticket"]'); pg.wait_for_timeout(80); print('ticket real mode: used 20 ->', pg.evaluate("APP.game.state.used"), '| tickets', pg.evaluate("APP.game.state.tickets"))
    pg.click('#bag-close')
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:true})})")
    seen=pg.evaluate("""async () => { const g=APP.game, rec=[]; const orig=g.encounter.bind(g); g.encounter=(info)=>{ rec.push(info.rare); return false; };
      for (let i=0;i<4;i++){ APP.encounter({types:['Moss'], rare:false, zone:'Moss Forest'}); await new Promise(r=>setTimeout(r,320)); WORLD.setPaused(false); }
      g.encounter=orig; return rec; }""")
    print('charm on 4 encounters (rare odds?):', seen, '| charm left:', pg.evaluate("APP.game.state.charm"))
    pg.wait_for_timeout(1200); pg.reload(); pg.wait_for_timeout(1100)
    print('after reload: party', pg.evaluate("APP.game.state.party"), '| bag', pg.evaluate("APP.game.state.bag"))
    b.close()
print('errors:', errors if errors else 'none')
