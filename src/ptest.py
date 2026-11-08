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
    # the fight itself is a duel on the map (acttest5 covers it); here the outcome goes through the same settle path a duel uses
    def settle(nid, won=True):
        return pg.evaluate("""([nid,won])=>{const g=APP.game; const n=Object.values(WORLD.allNpcs()).flat().find(x=>x.id===nid); const team=g.teamFor(n); const seals=(g.state.npc&&g.state.npc.seals)||[], cleared=(g.state.npc&&g.state.npc.cleared)||[];
          const reward=n.leader?(seals.indexOf(n.id)===-1?n.firstReward:n.reward):(cleared.indexOf(n.id)===-1?n.reward+(n.bonus||0):Math.ceil(n.reward/2));
          const me=g.state.caught[0]; const nb=g.newBattle(g.make(me.seed,me.stage,me.lv||1), g.make(team[0],n.stage,n.lv||1), 0); if(won) nb.s[1].hp=0; else nb.s[0].hp=0;
          return g.actDuelEnd({id:n.id,name:n.name,team:team,stage:n.stage,lv:n.lv||1,reward:reward,winLine:n.winLine,leader:!!n.leader,boss:!!n.boss}, won, {lead:nb.s[0],foe:nb.s[1],bench:[],part:{[me.seed]:true},koXp:{}});}""", [nid, won])
    pg.wait_for_timeout(100); pg.locator('#dlg-choices button', has_text='Battle!').click(); pg.wait_for_timeout(250)
    x0=pg.evaluate("APP.game.state.xp"); e0=pg.evaluate("APP.game.state.essence")
    lines=settle('wren')
    print('wren win (settle):', '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| xp +', pg.evaluate("APP.game.state.xp")-x0, '| seals', pg.evaluate("APP.game.state.npc.seals"), '| sealed flag:', pg.evaluate("APP.game.state.justSealed"))
    pg.evaluate("APP.game.setState({justSealed:null})")
    pg.evaluate("APP.talk(WORLD.npcs.find(n=>n.id==='wren'))"); print('same day:', pg.evaluate("APP.dialog.lines[0]")); pg.evaluate("APP.advance(); APP.advance()")
    # next-day rematch: half essence, no extra seal
    pg.evaluate("""() => { const npc=Object.assign({},APP.game.state.npc); npc.beaten=Object.assign({},npc.beaten,{wren:'Mon Jan 01 2001'}); APP.game.update({npc}); }""")
    e1=pg.evaluate("APP.game.state.essence"); settle('wren')
    print('rematch (settle): essence +', pg.evaluate("APP.game.state.essence")-e1, '| seals', pg.evaluate("APP.game.state.npc.seals"), '| no second seal flag:', pg.evaluate("APP.game.state.justSealed")==None)
    # champion
    pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:['wren','glacia','blaze','coral']})})")
    pg.evaluate("APP.open('badges')"); pg.wait_for_timeout(300)
    rev=pg.evaluate("APP.build||''")=='review'   # the review copy names the card "The four fires", the banner "Fire-keeper" (docs/review/02-words.md F7)
    txt=pg.locator('#screen').inner_text(); print('title shown:', ('Fire-keeper\n' if rev else 'Keeper of Four Fires') in txt, '| seals 4/4:', ('4/4 kept' if rev else '4/4 earned') in txt)
    pg.evaluate("""() => { const el=[...document.querySelectorAll('#screen span')].find(s=>['Leader seals','The four fires'].includes(s.textContent.trim())); el.scrollIntoView(); }"""); pg.wait_for_timeout(200); pg.screenshot(path='/tmp/p_seals.png')
    pg.click('#close-screen'); pg.click('#b-menu'); pg.wait_for_timeout(200); print('menu seals tile:', pg.locator('[data-tile="seals"]').inner_text().replace('\n',' '))
    pg.wait_for_timeout(1200); pg.reload(); pg.wait_for_timeout(1100)
    print('after reload seals:', pg.evaluate("APP.game.state.npc.seals.length"), '| cleared:', pg.evaluate("APP.game.state.npc.cleared"))
    b.close()
print('errors:', errors if errors else 'none')
