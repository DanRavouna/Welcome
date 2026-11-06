# Shiny critters: odds, sparkle and ribbon in the encounter, keep label with 0 rolls left.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844})
  pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  r=pg.evaluate("""()=>{const g=APP.game; let n=0, sh=0; const byR={}, byT={};
    for(let s=1;s<=200000;s++){ if(g.isShiny(s)) sh++; } 
    const N=20000; for(let i=0;i<N;i++){ const s=1+Math.floor(Math.random()*999998); const k=g.make(s,1); const R=k.rarity, T=k.element.name; byR[R]=byR[R]||[0,0]; byR[R][0]++; if(k.shiny) byR[R][1]++; byT[T]=byT[T]||[0,0]; byT[T][0]++; if(k.shiny) byT[T][1]++; }
    let ps=0; const PN=3000; for(let i=0;i<PN;i++){ if(g.isShiny(g.pickSeed(['Frost','Stone'], true))) ps++; }
    let first=0; for(let s=1;;s++){ if(g.isShiny(s)){first=s;break;} }
    const a=g.make(first,2), b2=g.make(first,2), plain=g.make(first-1,2);
    const st=g.starters().map(x=>g.isShiny(x));
    const npcSeeds=[]; Object.values(WORLD.allNpcs()).flat().filter(n=>n.trainer||n.leader).forEach(n=>npcSeeds.push(...g.teamFor(n))); for(let f=1;f<=20;f++) npcSeeds.push(...g.teamFor(g.towerFloor(f)));
    const rate=(o)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,(100*v[1]/v[0]).toFixed(2)+'% of '+v[0]]));
    return {rate_first200k:(100*sh/200000).toFixed(3)+'%', byRarity:rate(byR), byType:rate(byT), pickSeedRareGrass:(100*ps/PN).toFixed(2)+'%', firstShiny:first, name:a.name, idempotent:a.name===b2.name&&a.bodyColor===b2.bodyColor, body:[a.bodyColor, g.make(first,1).bodyColor], starters:st, foeShinies: npcSeeds.filter(x=>g.isShiny(x)).length+' of '+npcSeeds.length};}""")
  for k,v in r.items(): print(k,':',v)
  # reveal via encounter
  first=r['firstShiny']
  pg.evaluate(f"APP.game.pickSeed=()=>{first}; APP.encounter && 0")
  pg.evaluate("WORLD.enter('moss')"); pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:true})})")
  pg.evaluate("window.__sfx=[]; const o=APP.game.sfx.bind(APP.game); APP.game.sfx=(k,s)=>{window.__sfx.push(k); return o(k,s)}")
  pg.evaluate("APP.encounter({types:['Moss','Bloom'], zone:'Moss Forest', rare:false})"); pg.wait_for_timeout(1700)
  print('encounter seed shiny:', pg.evaluate("APP.game.isShiny(APP.game.state.seed)"), '| sfx:', pg.evaluate("window.__sfx"), '| ribbon:', pg.locator('text=★ Shiny').count(), '| class:', pg.evaluate("document.querySelector('.shiny-burst')?'burst':(document.querySelector('.shiny-still')?'still':'none')"))
  pg.screenshot(path='/tmp/shiny_card.png', clip={'x':0,'y':60,'width':390,'height':420})
  pg.evaluate("APP.close()"); pg.wait_for_timeout(100)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}), day:new Date().toDateString(), used:20})")
  pg.evaluate("APP.encounter({types:['Moss','Bloom'], zone:'Moss Forest', rare:false})"); pg.wait_for_timeout(300)
  v=pg.evaluate("(()=>{const v=APP.game.renderVals(); return {label:v.keepLabel, dis:v.keepDisabled, rolls:APP.game.energy().left}})()"); print('0 rolls shiny keep:', v)
  pg.evaluate("APP.game.renderVals().keep()"); pg.wait_for_timeout(100)
  print('kept free:', pg.evaluate(f"APP.game.state.caught.some(e=>e.seed==={first})"), '| used still', pg.evaluate("APP.game.state.used"))
  pg.reload(); pg.wait_for_timeout(1100); print('after reload still shiny in dex name:', pg.evaluate(f"APP.game.make({first},1).name"))
  print('errors:', errs or 'none'); b.close()
