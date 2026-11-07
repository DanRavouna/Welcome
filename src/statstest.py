# Play stats rows: today row, survives reload, 70-day cap.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}); ctx.grant_permissions(['clipboard-read','clipboard-write']); pg=ctx.new_page()
  pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({essence:100})")
  # keep 3 via encounter flow
  for i in range(3):
    pg.evaluate("APP.encounter({types:['Moss','Bloom'], zone:'Moss Forest', rare:false})"); pg.wait_for_timeout(80); pg.evaluate("APP.game.renderVals().keep(); APP.close()"); pg.wait_for_timeout(60)
  # evolve one (spends essence)
  pg.evaluate("(()=>{const g=APP.game; const v=g.renderVals(); })()")
  e0=pg.evaluate("APP.game.state.essence")
  pg.evaluate("(()=>{const g=APP.game; const c=g.state.caught[0]; g.update({caught:[Object.assign({},c,{stage:2})].concat(g.state.caught.slice(1)), essence:g.state.essence-15},[{t:'evolve'}]);})()")
  # win a wild battle
  pg.evaluate("(()=>{const g=APP.game; const k=g.state.caught[0]; const nb=g.newBattle(g.make(k.seed,2,15), g.make(77,1,1), 4); nb.s[1].hp=0; g.actDuelEnd({id:'wild',name:'Wild',reward:4,winLine:''}, true, {lead:nb.s[0],foe:nb.s[1],bench:[],part:{[k.seed]:true},koXp:{}});})()")   # a win through the duel's settle path
  pg.evaluate("APP.game.addPlayTime(2.5); APP.game.update({})")
  day=pg.evaluate("APP.game.statDay()"); r=pg.evaluate(f"JSON.stringify(APP.game.state.stats.days['{day}'])")
  print('today row:', r)
  pg.reload(); pg.wait_for_timeout(1100); print('row survives reload:', pg.evaluate(f"!!APP.game.state.stats.days['{day}']"))
  # 60 day cap
  pg.evaluate("(()=>{const g=APP.game; const st=JSON.parse(JSON.stringify(g.state.stats)); for(let i=1;i<=70;i++){ st.days['2026-0'+(1+Math.floor(i/31))+'-'+String(1+i%28).padStart(2,'0')+'x'+i]={min:1,earn:1,spend:0,ev:{},tower:{runs:0,best:0,top:0},end:{}}; } g.setState({stats:st}); g.update({essence:g.state.essence+1});})()")
  print('days kept after 70 extra:', pg.evaluate("Object.keys(APP.game.state.stats.days).length"))
  print('save size bytes:', pg.evaluate("localStorage.getItem('critter-roll:v2').length"))
  ex=pg.evaluate("APP.game.statsExport()"); print('export head:\n' + '\n'.join(ex.split('\n')[:2]) + '\n' + [l for l in ex.split('\n') if l.startswith(day)][0])
  pg.evaluate("APP.openMenu(); document.querySelector('[data-tile=backup]').click()"); pg.wait_for_timeout(300); pg.click('#bk-stats-copy'); pg.wait_for_timeout(200)
  print('copy msg:', pg.inner_text('#bk-msg'), '| clipboard starts:', pg.evaluate("navigator.clipboard.readText()")[:30])
  print('errors:', errs or 'none'); b.close()
