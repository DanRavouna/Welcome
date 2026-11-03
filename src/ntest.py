from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('console', lambda m: errors.append(m.text) if m.type=='error' and 'ERR_NAME' not in m.text else None)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200); pg.evaluate('0')
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    # 1. placement + no blocking
    r=pg.evaluate("""() => { const out={}; const all=WORLD.allNpcs(); const S=new Set(['T','X','~','F','G','O','R']);
      for (const id of Object.keys(WORLD.MAPS)) { const M=WORLD.MAPS[id], npcs=all[id]||[]; const occ=new Set(npcs.map(n=>n.x+','+n.y));
        const solid=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||S.has(M.grid[y][x])||occ.has(x+','+y);
        const st=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])]; const seen=new Set([st.join()]), q=[st];
        while(q.length){const [x,y]=q.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny; if(seen.has(k)||solid(nx,ny))continue; seen.add(k); q.push([nx,ny]);}}
        let g=0,gr=0; for(let y=0;y<M.H;y++)for(let x=0;x<M.W;x++){ if('WZ'.includes(M.grid[y][x])){g++; if(seen.has(x+','+y))gr++;} }
        const npcOk=npcs.map(n=>n.id+':'+(!S.has(M.grid[n.y][n.x]) && [[1,0],[-1,0],[0,1],[0,-1]].some(([a,c])=>seen.has((n.x+a)+','+(n.y+c)))));
        const exitsOk=M.exits.every(e=>{for(let k=e.a;k<=e.b;k++){const t=e.edge==='n'?[k,0]:e.edge==='s'?[k,M.H-1]:e.edge==='w'?[0,k]:[M.W-1,k]; if(seen.has(t.join()))return true;} return false;});
        const placesOk=M.places.every(pl=>seen.has(pl.door[0]+','+(pl.door[1]+1))||seen.has((pl.door[0]+1)+','+(pl.door[1]+1)));
        out[id]={grass:gr+'/'+g, exitsOk, placesOk, npcs:npcOk}; } return out; }""")
    for k,v in r.items(): print('map', k, v)
    teams=pg.evaluate("""() => Object.values(WORLD.allNpcs()).flat().filter(n=>n.trainer).map(n=>{ const t=APP.game.teamFor(n); return n.id+': '+t.length+'/'+n.size+' '+t.map(s=>APP.game.make(s,1).element.name+'#'+APP.game.make(s,1).speciesNo).join(',')+' reward '+n.reward; })""")
    print('teams:', teams)
    # 2. talk + dialogue advance
    pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='pip'); WORLD.setPos((n.x+0.5)*WORLD.TS, (n.y+1.9)*WORLD.TS); WORLD.step(1/60); }""")
    print('near pip:', pg.inner_text('#act-label'))
    pg.click('#act'); pg.wait_for_timeout(100); first=pg.evaluate("APP.dialog && APP.dialog.lines[0]")
    pg.click('#dlg-box'); pg.wait_for_timeout(50); pg.click('#dlg-box'); pg.wait_for_timeout(1500); txt=pg.inner_text('#dlg-text')
    pg.screenshot(path='/tmp/n_dialog.png')
    pg.click('#dlg-box'); pg.wait_for_timeout(100)
    print('dialog first line:', first[:40], '| second shown fully:', txt[:40], '| closed:', pg.evaluate("document.getElementById('dlg').hidden"), '| world paused:', pg.evaluate("WORLD.paused"))
    # 3. request: Fern
    pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='fern'); APP.talk(n); }"""); pg.wait_for_timeout(100)
    lines=pg.evaluate("APP.dialog.lines.length"); last=pg.evaluate("APP.dialog.lines[APP.dialog.lines.length-1]")
    for _ in range(8): pg.evaluate("APP.advance()"); pg.wait_for_timeout(20)
    e0=pg.evaluate("APP.game.state.essence")
    pg.evaluate("APP.game.update({seen:[1,2,3,4,5]})")
    pg.evaluate("""() => APP.talk(WORLD.npcs.find(n=>n.id==='fern'))"""); 
    for _ in range(5): pg.evaluate("APP.advance()"); pg.wait_for_timeout(20)
    e1=pg.evaluate("APP.game.state.essence")
    pg.evaluate("""() => APP.talk(WORLD.npcs.find(n=>n.id==='fern'))"""); after=pg.evaluate("APP.dialog.lines[0]")
    for _ in range(3): pg.evaluate("APP.advance()")
    e2=pg.evaluate("APP.game.state.essence")
    print('fern before:', lines, 'lines, last:', last[:45], '| reward', e1-e0, '| repeat talk gives', e2-e1, '| after line:', after[:40])
    # 4. trainer: no critters -> no challenge
    pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='rowan'); WORLD.setPos((n.x+0.5)*WORLD.TS, (n.y-2+0.6)*WORLD.TS); for(let i=0;i<3;i++) WORLD.step(1/60); }""")
    pg.wait_for_timeout(900); print('no critters -> challenge:', pg.evaluate("!!APP.dialog"))
    # give a strong fighter, step out and back into sight
    pg.evaluate("""() => { const g=APP.game; let s=1; for(;;s++){ const k=g.make(s,3); if(k.stats.reduce((a,q)=>a+q.value,0)>430) break; } g.update({caught:[{seed:s,stage:3}]}); }""")
    pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='rowan'); WORLD.setPos((n.x+3.5)*WORLD.TS, (n.y-2+0.6)*WORLD.TS); WORLD.step(1/60); WORLD.setPos((n.x+0.5)*WORLD.TS, (n.y-2+0.6)*WORLD.TS); WORLD.step(1/60); }""")
    pg.wait_for_timeout(200); alert=pg.evaluate("WORLD.npcs.find(n=>n.id==='rowan').alert>0"); pg.screenshot(path='/tmp/n_alert.png')
    pg.wait_for_timeout(900); print('spotted -> alert:', alert, '| dialog:', pg.evaluate("APP.dialog && APP.dialog.name"))
    for _ in range(4): pg.evaluate("APP.advance()"); pg.wait_for_timeout(20)
    pg.wait_for_timeout(100); print('choices:', pg.locator('#dlg-choices button').all_inner_texts())
    pg.locator('#dlg-choices button', has_text='Battle!').click(); pg.wait_for_timeout(300)
    print('screen title:', pg.locator('#screen nav span').inner_text(), '| fight button:', pg.locator('#screen button', has_text='Battle Rowan').count())
    pg.screenshot(path='/tmp/n_pre.png')
    rolls_before=pg.evaluate("APP.game.state.used")
    pg.locator('#screen button', has_text='Battle Rowan').click(); pg.wait_for_timeout(150)
    sent=0
    for i in range(60):
        st=pg.evaluate("(()=>{const b=APP.game.state.battle; return b? {over:b.over, win:b.win, idx:b.trainer.idx}:null})()")
        if st['over']: break
        pg.locator('#screen button:has-text("PWR")').first.click(); pg.wait_for_timeout(30)
        if i==3: pg.screenshot(path='/tmp/n_mid.png')
    b2=pg.evaluate("(()=>{const b=APP.game.state.battle; return {over:b.over, win:b.win, idx:b.trainer.idx, sent:b.log.filter(l=>l.text.includes('sent out')).length, last:b.log[b.log.length-1].text}})()")
    print('battle:', b2, '| rolls used:', pg.evaluate("APP.game.state.used")-rolls_before)
    st=pg.evaluate("({ess:APP.game.state.essence, wins:APP.game.state.wins, beaten:APP.game.beatenToday('rowan')})"); print('after:', st)
    pg.screenshot(path='/tmp/n_end.png')
    if b2['win']:
        print('fight button now:', pg.locator('#screen button', has_text='Trainer beaten').count(), 'disabled:', pg.locator('#screen button', has_text='Trainer beaten').is_disabled())
    pg.click('#close-screen'); pg.wait_for_timeout(150)
    print('trainer cleared:', pg.evaluate("APP.game.state.trainer"), pg.evaluate("APP.game.state.battle"))
    # re-enter sight: beaten -> no challenge
    pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='rowan'); WORLD.setPos((n.x+3.5)*WORLD.TS,(n.y-2+0.6)*WORLD.TS); WORLD.step(1/60); WORLD.setPos((n.x+0.5)*WORLD.TS,(n.y-2+0.6)*WORLD.TS); WORLD.step(1/60);}""")
    pg.wait_for_timeout(900); print('beaten trainer re-challenges:', pg.evaluate("!!APP.dialog"))
    # normal arena unaffected
    pg.evaluate("APP.open('battle')"); pg.wait_for_timeout(150); print('normal arena title:', pg.locator('#screen nav span').inner_text(), '| reroll label:', pg.locator('#screen button', has_text='New foe').count()); pg.click('#close-screen')
    # Not now -> declined until map re-entered (Bram)
    pg.evaluate("WORLD.enter('frost')"); pg.wait_for_timeout(200)
    pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='bram'); WORLD.setPos((n.x-2+0.5)*WORLD.TS,(n.y+0.6)*WORLD.TS); WORLD.step(1/60); }"""); pg.wait_for_timeout(1000)
    got=pg.evaluate("!!APP.dialog")
    if got:
        for _ in range(4): pg.evaluate("APP.advance()")
        pg.locator('#dlg-choices button', has_text='Not now').click(); pg.wait_for_timeout(100)
        pg.evaluate("""() => { const n=WORLD.npcs.find(n=>n.id==='bram'); WORLD.setPos((n.x-3+0.5)*WORLD.TS,(n.y+0.6)*WORLD.TS); WORLD.step(1/60); WORLD.setPos((n.x-2+0.5)*WORLD.TS,(n.y+0.6)*WORLD.TS); WORLD.step(1/60);}"""); pg.wait_for_timeout(1000)
    print('bram spotted:', got, '| after Not now re-challenge:', pg.evaluate("!!APP.dialog"), '| world moving:', not pg.evaluate("WORLD.paused"))
    # persistence
    pg.wait_for_timeout(1200); pg.reload(); pg.wait_for_timeout(1200)
    print('after reload beaten rowan:', pg.evaluate("APP.game.beatenToday('rowan')"), '| fern done:', pg.evaluate("APP.game.state.npc.done"))
    b.close()
print('errors:', errors if errors else 'none')
