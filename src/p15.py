# Party screen: add up to 4, make lead, remove and re-add, counts.
from playwright.sync_api import sync_playwright
from chk import check, done
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100); pg.evaluate('0')
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{follow:false})})")   # these suites test the turn-based battle screen, which is what the game uses when Critter follows you is off
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    REV=pg.evaluate("APP.build")=='review'   # the review copy no longer sells the Roll Ticket (11's item 7: a day holds what it holds); held tickets still work
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
    if REV:
        check('review copy: the shop sells no Roll Ticket', pg.locator('[data-buy="ticket"]').count()==0, pg.locator('[data-buy]').evaluate_all("els=>els.map(e=>e.dataset.buy)"))
        for it in ['potion','potion','super','charm']: pg.click(f'[data-buy="{it}"]'); pg.wait_for_timeout(40)
        pg.evaluate("APP.game.update({bag:Object.assign({},APP.game.state.bag,{ticket:(APP.game.state.bag.ticket|0)+1})})")   # a ticket held from before still works
    else:
        for it in ['potion','potion','super','charm','ticket']: pg.click(f'[data-buy="{it}"]'); pg.wait_for_timeout(40)
    print('bag:', pg.evaluate("APP.game.state.bag"), '| essence left:', pg.evaluate("APP.game.state.essence"), '| charm button disabled (not enough):', pg.locator('[data-buy="charm"]').is_disabled())
    pg.screenshot(path='/tmp/s_shop.png'); pg.click('#shop-close')
    # (the turn-based battle screen with its switch and bag buttons is gone, Nov 2026: the party fights live on the map; acttest and acttest5 cover it)
    print('battle screen gone:', pg.evaluate("typeof APP.game.renderVals().fight")=='undefined')
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
done()
