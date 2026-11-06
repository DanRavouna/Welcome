# Shops and battle items per city, lure.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({caught:[5000,5001,5002].map(s=>({seed:s,stage:3,lv:15})), party:[5000,5001,5002], fighter:5000, essence:200, seen:[1,2,3], npc:{done:['fern'],beaten:{},cleared:[],seals:[]}})")
  for city in ['town','mossbrook','frosthold','cinderport','coralbay']:
    pg.evaluate(f"WORLD.enter('{city}'); APP.openPanel('shop')"); pg.wait_for_timeout(80)
    print(city, 'shop:', pg.evaluate("[...document.querySelectorAll('#sh-list b')].map(b=>b.textContent)"))
    pg.evaluate("APP.closePanel && APP.closePanel()"); pg.keyboard.press('Escape')
  pg.evaluate("APP.game.update({bag:Object.assign({},APP.game.state.bag,{herb:1,ward:1,whet:1,lure:1})})")
  # battle: whet, ward, herb effects on the real battle path
  pg.evaluate("(()=>{const g=APP.game; const nb=g.newBattle(g.make(5000,3,15), g.make(77,3,15), 0); g.setState({battle:nb,trainer:null,bmode:'moves'}); APP.open('battle');})()")
  r=pg.evaluate("""(()=>{const g=APP.game; const out={}; const items=()=>g.renderVals().itemList.map(i=>i.name+(i.off?'(off)':'')); out.list=items();
    g.battleAction({item:'whet'}); out.boost=g.state.battle.s[0].boost; out.listAfter=items();
    g.battleAction({item:'ward'}); out.ward=g.state.battle.s[0].ward;
    const b=JSON.parse(JSON.stringify(g.state.battle)); b.s[0].burn=3; b.s[0].hp=Math.round(b.s[0].max*0.3); g.setState({battle:b}); const hp0=b.s[0].hp;
    g.battleAction({item:'herb'}); const s0=g.state.battle.s[0]; out.herb={burn:s0.burn, healedAtLeast:s0.hp>hp0}; out.bag=g.state.bag; out.log=g.state.battle.log.slice(-1)[0].text; return out;})()""")
  print('battle items:', r)
  pg.evaluate("APP.close()")
  # lure: next encounter is an unkept species; consumed only on success
  pg.evaluate("WORLD.enter('moss'); APP.openPanel('bag')"); pg.wait_for_timeout(60); pg.click('[data-use=lure]'); pg.wait_for_timeout(60); pg.keyboard.press('Escape')
  print('lure set:', pg.evaluate("APP.game.state.lure"))
  pg.evaluate("APP.closePanel && APP.closePanel(); APP.encounter({types:['Moss','Bloom'], zone:'Moss Forest', rare:false})"); pg.wait_for_timeout(1300)
  print('encounter happened:', pg.evaluate("APP.game.state.tab==='roll'"), '| lured species unkept:', pg.evaluate("!APP.game.state.seen.includes(APP.game.make(APP.game.state.seed,1).speciesNo)"), '| lure left:', pg.evaluate("APP.game.state.lure"))
  pg.evaluate("APP.close()")
  # keep + beat quest kinds
  print('coralbay before any keep:', pg.evaluate("APP.game.cityQuest('coralbay').n"), '(raw load of 3 critters must not count)')
  pg.evaluate("(()=>{const g=APP.game; for(let s=7000;;s++){ const k=g.make(s,1); if(['Ember','Volt'].includes(k.element.name)){ g.pickSeed=()=>s; break; } } })()")
  pg.evaluate("APP.encounter({types:['Ember','Volt'], zone:'x', rare:false})"); pg.wait_for_timeout(1300); pg.evaluate("APP.game.renderVals().keep(); APP.close()"); pg.wait_for_timeout(100)
  print('cinderport keep quest progress:', pg.evaluate("JSON.stringify(APP.game.cityQuest('cinderport'))"))
  pg.evaluate("APP.game.questTick('beat','mako')"); print('coralbay quest:', pg.evaluate("JSON.stringify(APP.game.cityQuest('coralbay'))"))
  print('errors:', errs or 'none'); b.close()
