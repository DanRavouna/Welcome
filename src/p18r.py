# Daily sightings and rolls: free sighting, first-keep hint, energy accounting.
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_context(viewport={'width':390,'height':844}, has_touch=True).new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.add_init_script("window.__weather='clear'; if(!sessionStorage.getItem('s')){sessionStorage.setItem('s','1'); localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:12,stage:1}],party:[12],intro:true,hints:['grass','zone','battle','party','shop','evolve'],settings:{test:false}}));}")
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
    seeds=pg.evaluate("""(()=>{ const g=APP.game, out={}; for(let s=1; Object.keys(out).length<4; s++){ if (s === 12) continue; const r=g.make(s,1).rarity; if(!out[r]) out[r]=s; } return out; })()""")
    st=lambda: pg.evaluate("({used:APP.game.state.used, left:APP.game.energy().left, sightings:APP.game.sightingsLeft(), kept:APP.game.state.caught.length})")
    enc=lambda: pg.evaluate("Math.random=()=>0.999; APP.encounter({types:['Moss'],rare:false,zone:'Sproutvale'})") or pg.wait_for_timeout(450)
    print('start:', st())
    enc(); print('after 1 free sighting:', st(), '| note:', pg.evaluate("APP.game.renderVals().encounterNote"))
    try: pg.wait_for_function("document.getElementById('toast').textContent.indexOf('Keeping one')!==-1 && APP.game.state.hints.includes('keep')", timeout=4000)   # the hint lands on its own timer; a fixed wait read it mid-way under load
    except Exception: pass
    print('first-keep hint:', pg.evaluate("APP.game.state.hints.includes('keep')"), '|', pg.inner_text('#toast')[:50])
    for r in ['Common','Uncommon','Rare','Mythic']:
        pg.evaluate(f"APP.game.setState({{seed:{seeds[r]}}})"); v=pg.evaluate("(()=>{const v=APP.game.renderVals(); return [v.keepLabel, v.keepDisabled]})()")
        print(f'  {r:9s} -> button "{v[0]}" disabled={v[1]}')
    pg.evaluate(f"APP.game.setState({{seed:{seeds['Rare']}}})"); before=st(); pg.evaluate("APP.game.renderVals().keep()"); after=st()
    print('keep a Rare: rolls left', before['left'], '->', after['left'], '| kept', before['kept'], '->', after['kept'])
    pg.evaluate("APP.close()")
    pg.evaluate("APP.game.update({used:18})"); enc()
    pg.evaluate(f"APP.game.setState({{seed:{seeds['Rare']}}})"); v=pg.evaluate("(()=>{const v=APP.game.renderVals(); return [v.keepLabel, v.keepDisabled]})()")
    print('2 rolls left, Rare ->', v, '| tapping keep does nothing:', (pg.evaluate("APP.game.renderVals().keep(), APP.game.state.caught.length")==after['kept']))
    pg.evaluate(f"APP.game.setState({{seed:{seeds['Common']}}})"); pg.evaluate("APP.game.renderVals().keep()"); print('  Common still keepable with 2 left ->', st())
    pg.evaluate("APP.close()")
    # use up the free sightings
    pg.evaluate("APP.game.update({used:0, sight:{day:new Date().toDateString(), n:40}})")
    enc(); print('41st sighting:', st(), '| paid:', pg.evaluate("APP.game.state.encounterPaid"), '| note:', pg.evaluate("APP.game.renderVals().encounterNote")[-55:])
    pg.evaluate("APP.close()")
    pg.evaluate("APP.game.update({used:20})"); pg.wait_for_timeout(5000); enc()
    print('no sightings + no rolls -> screen opened:', not pg.evaluate("document.getElementById('screen').hidden"), '| toast:', pg.inner_text('#toast')[:70])
    # (the Roll Shrine is gone: critters come from the grass only)
    # new day resets sightings, persistence
    pg.evaluate("APP.game.update({sight:{day:new Date().toDateString(), n:17}})"); pg.wait_for_timeout(1200); pg.reload(); pg.wait_for_timeout(1300)
    print('after reload sightings left:', pg.evaluate("APP.game.sightingsLeft()"), '| count from a past day resets:', pg.evaluate("APP.game.update({sight:{day:'Mon Jan 01 2001', n:40}}), APP.game.sightingsLeft()"))
    # test mode: keep allowed
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:true})})"); enc()
    pg.evaluate(f"APP.game.setState({{seed:{seeds['Mythic']}}})"); print('test mode Mythic keep:', pg.evaluate("APP.game.renderVals().keepLabel"))
    b.close()
print('errors:', errors or 'none')
