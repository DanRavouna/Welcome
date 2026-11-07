# A play-through with real randomness (repeat before calling a failure a regression): reveal, keep, battle rounds.
from playwright.sync_api import sync_playwright
errors=[]
def go(pg, pid):
    if pg.evaluate("!!WORLD.map.interior"): pg.evaluate("WORLD.enter(WORLD.map.parent)"); pg.wait_for_timeout(100)   # step back outside first (Home and the Lab are rooms)
    if pid=='bell' and pg.evaluate("WORLD.map.id")!='arena': pg.evaluate("WORLD.enter('arena')"); pg.wait_for_timeout(100)   # the Arena is its own zone; the bell stands on its sand
    door=pg.evaluate(f"(()=>{{const p=WORLD.PLACES.find(x=>x.id==='{pid}'); return [p.door[0], p.door[1]+1];}})()")
    pg.evaluate('window.__r=Math.random; Math.random=()=>0.999'); pg.evaluate(open('/tmp/walk.js').read(), door); pg.evaluate('Math.random=window.__r'); pg.wait_for_timeout(80); pg.click('#act'); pg.wait_for_timeout(300)
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    pg.evaluate('0')
    # a kept critter comes from the grass now (the shrine is gone): keep one through an encounter
    pg.evaluate("APP.encounter({types:['Moss','Bloom'], zone:'Moss Forest', rare:false})"); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Keep').first.click(); pg.wait_for_timeout(200)
    kept=pg.evaluate("APP.game.state.caught.length"); print('kept after Keep:', kept)
    pg.click('#close-screen'); pg.wait_for_timeout(200)
    go(pg,'bell')
    pg.get_by_role('button', name='Fight (1 roll)').click(); pg.wait_for_timeout(200)
    rounds=0
    while pg.evaluate("!!(APP.game.state.battle && !APP.game.state.battle.over)") and rounds<40:
        btns=pg.locator('#screen button:has-text("PWR")')
        btns.first.click(); pg.wait_for_timeout(60); rounds+=1
        if rounds==2: pg.screenshot(path='/tmp/p_battle.png')
    st=pg.evaluate("({over:APP.game.state.battle.over, win:APP.game.state.battle.win, wins:APP.game.state.wins, ess:APP.game.state.essence, xp:APP.game.state.xp})")
    print('battle after', rounds, 'rounds:', st, '| result text:', pg.locator('#screen p').filter(has_text='You').first.inner_text() if pg.locator('#screen p').filter(has_text='You').count() else '-')
    pg.click('#close-screen'); pg.wait_for_timeout(200)
    pg.click('#b-menu'); pg.wait_for_timeout(200); pg.click('[data-tile="dex"]'); pg.wait_for_timeout(300); print('dex shows kept critter:', pg.locator('#screen button:has-text("St.1")').count())
    pg.screenshot(path='/tmp/p_dex.png')
    pg.click('#close-screen'); pg.wait_for_timeout(1300)
    pos=pg.evaluate("WORLD.pos()")
    pg.reload(); pg.wait_for_timeout(1300)
    after=pg.evaluate("({kept:APP.game.state.caught.length, wins:APP.game.state.wins, pos:WORLD.pos(), tip:document.getElementById('tip').hidden})")
    print('after reload:', after, '| position before:', pos)
    pg.screenshot(path='/tmp/p_world.png')
    print('page errors:', errors if errors else 'none')
    b.close()
