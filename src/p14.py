# World map card and fast travel with level gates, here marker, travel between zones, weather and save-code import/export.
from playwright.sync_api import sync_playwright
from chk import check, done
ck=lambda name, cond, detail='': check(name, cond, '' if cond else detail)   # the detail only when it fails (it holds the day's weather)
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100); pg.evaluate('0')
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    # map in real mode at level 3
    REV=pg.evaluate("APP.build")=='review'   # the review copy opens the gates by seals (11's item 9); the shipped game by trainer level
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), xp:200})")
    if REV:
        # a new save at level 3 with no seal: Frost Peaks stays shut (a level no longer opens it); one seal opens the Pass, two the town's north gate and Ember
        g=pg.evaluate("(()=>{const g=APP.game; const r={lvGates:g.state.lvGates, lv3:[g.gateOpen('route-mf'),g.gateOpen('frost')]}; g.update({npc:Object.assign({},g.state.npc,{seals:['wren']})}); r.one=[g.gateOpen('route-mf'),g.gateOpen('frost'),g.gateOpen('ember')]; g.update({npc:Object.assign({},g.state.npc,{seals:['wren','glacia']})}); r.two=[g.gateOpen('frost'),g.gateOpen('ember'),g.gateOpen('tide')]; return r;})()")
        check('review copy: a new save keeps no level gates', g['lvGates'] is False, g)
        check('review copy: level 3 and no seal opens neither the Pass nor Frost Peaks', g['lv3']==[False,False], g)
        check('review copy: one seal opens the Highland Pass, not the town\'s north gate', g['one']==[True,False,False], g)
        check('review copy: two seals open Frost Peaks and Ember Fields, not Tide Shore', g['two']==[True,True,False], g)
    pg.click('#b-menu'); pg.wait_for_timeout(150); pg.click('[data-tile="map"]'); pg.wait_for_timeout(200)
    cards=[pg.evaluate("(id)=>{APP.mapSelect(id);return document.getElementById('wm-info').innerText.replace(/\\n/g,' | ')}", i) for i in ['town','moss','frost','ember','tide']]
    print('map cards:'); [print('  ', c) for c in cards]
    if REV: ck('review copy: a shut gate names no level on the map', 'level' not in ' '.join(cards).lower() and 'The gate is shut' in cards[4], cards[4])
    pg.screenshot(path='/tmp/m_map.png')
    pg.evaluate("APP.mapSelect('frost')"); print('travel button in card:', pg.locator('#wm-info [data-travel]').evaluate_all("els=>els.map(e=>e.dataset.travel)"))
    pg.click('[data-travel="frost"]'); pg.wait_for_timeout(200); print('after travel:', pg.evaluate("WORLD.map.id"), '|', pg.inner_text('#loc-name'), '| toast:', pg.inner_text('#toast'))
    pg.click('#b-menu'); pg.click('[data-tile="map"]'); pg.wait_for_timeout(150)
    print('here marker on frost:', 'You are here' in pg.evaluate("document.getElementById('wm-info').innerText"), '| moss travel from frost ->', end=' ')
    pg.evaluate("APP.mapSelect('moss')"); pg.click('[data-travel="moss"]'); pg.wait_for_timeout(150); print(pg.evaluate("WORLD.map.id"))
    # gates now 3/6/9
    print('gates:', pg.evaluate("[6,9].map(()=>0) && (()=>{ const r=[]; for (const lv of [5,6,8,9]) { r.push(lv+':'+['ember','tide'].map(z=>z+(APP.game.levelInfo(0) && true ? '' : '')).join()); } return 'see map texts'; })()"))
    # day/night via faked clock
    tod=pg.evaluate("""() => { const out={}; for (const h of [3,6,12,19,22]) { const d=new Date(); d.setHours(h); out[h]=APP.timeOfDay(d); } return out; }""")
    print('time of day by hour:', tod)
    tint=pg.evaluate("""() => { const RD=Date; const res={}; for (const h of [12,22]) { window.Date=class extends RD { constructor(...a){ if(a.length) super(...a); else { super(); this.setHours(h); } } }; WORLD.drawNow(); res[h]=WORLD.debug().tint; } window.Date=RD; return res; }""")
    print('world tint at 12h / 22h:', tint)
    pg.evaluate("""() => { const RD=Date; window.Date=class extends RD { constructor(...a){ if(a.length) super(...a); else { super(); this.setHours(22); } } }; WORLD.drawNow(); window.Date=RD; }""")
    pg.screenshot(path='/tmp/m_night_raw.png')
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{daynight:false})})")
    off=pg.evaluate("""() => { const RD=Date; window.Date=class extends RD { constructor(...a){ if(a.length) super(...a); else { super(); this.setHours(22); } } }; WORLD.drawNow(); const t=WORLD.debug().tint; window.Date=RD; return t; }""")
    print('tint with setting off at 22h:', off)
    pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{daynight:true, test:true})})")
    # night encounter override
    dusk=pg.evaluate("""async () => { const RD=Date; window.__weather='clear'; /* the real day's weather (a sunny day draws Bloom) is pinned to clear for these three rolls */ window.Date=class extends RD { constructor(...a){ if(a.length) super(...a); else { super(); this.setHours(23); } } };
      const g=APP.game, seen=[]; const orig=g.encounter.bind(g); g.encounter=(info)=>{ seen.push(info.types.join('+')); return false; };
      const r0=Math.random; let lowCalls=0; Math.random=()=>0.1; APP.encounter({types:['Frost','Stone'], rare:false, zone:'Frost Peaks'}); await new Promise(r=>setTimeout(r,350));
      Math.random=()=>0.9; APP.encounter({types:['Frost','Stone'], rare:false, zone:'Frost Peaks'}); await new Promise(r=>setTimeout(r,350));
      window.Date=class extends RD { constructor(...a){ if(a.length) super(...a); else { super(); this.setHours(12); } } }; Math.random=()=>0.1; APP.encounter({types:['Frost','Stone'], rare:false, zone:'Frost Peaks'}); await new Promise(r=>setTimeout(r,350));   // noon pinned too: the real clock made this case Dusk at night
      window.Date=RD;
      Math.random=r0; g.encounter=orig; WORLD.setPaused(false); delete window.__weather; return seen; }""")
    print('encounter types [night+low roll, night+high roll, daytime]:', dusk)
    # backup round trip
    pg.evaluate("APP.game.update({caught:[{seed:12,stage:2},{seed:99,stage:1}], essence:42, seen:[3,9], xp:300})")
    pg.wait_for_timeout(1100)
    code=pg.evaluate("APP.exportCode()")
    print('code length:', len(code), '| starts:', code[:12])
    bad=pg.evaluate("""(c) => [APP.readCode('hello').error, APP.readCode(c.slice(0,-3)+'000').error, APP.readCode(c.replace('CRITTER1.','CRITTER1.A')).error, APP.readCode(c).summary]""", code)
    print('fake code ->', bad[0]); print('bad checksum ->', bad[1]); print('tampered ->', bad[2]); print('valid ->', bad[3])
    pg.evaluate("APP.game.update({caught:[], essence:0, seen:[], xp:0})"); pg.wait_for_timeout(200)
    pg.click('#b-menu'); pg.click('[data-tile="backup"]'); pg.wait_for_timeout(200)
    out_code=pg.input_value('#bk-out'); print('export shows current save:', APP_ok := out_code.startswith('CRITTER1.'))
    pg.fill('#bk-in', code); pg.click('#bk-restore'); pg.wait_for_timeout(100)
    print('step 1:', pg.inner_text('#bk-msg'), '| button:', pg.inner_text('#bk-restore'))
    pg.screenshot(path='/tmp/m_backup.png')
    pg.click('#bk-restore'); pg.wait_for_timeout(1500)
    print('restored after reload:', pg.evaluate("({kept:APP.game.state.caught.length, essence:APP.game.state.essence, seen:APP.game.state.seen.length, xp:APP.game.state.xp})"))
    b.close()
print('errors:', errors if errors else 'none')
done()
