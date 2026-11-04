from playwright.sync_api import sync_playwright
errs=[]
def adv(pg):
  for _ in range(10):
    if not pg.evaluate("!!APP.dialog"): return
    if pg.evaluate("!document.getElementById('dlg-choices').hidden"): return
    pg.evaluate("APP.advance()")
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{follow:false})})")   # these suites test the turn-based battle screen, which is what the game uses when Critter follows you is off
  pg.evaluate("APP.game.update({caught:[5000,5001,5002].map(s=>({seed:s,stage:3,lv:15})), party:[5000,5001,5002], fighter:5000, essence:100, npc:{done:['fern'],beaten:{},cleared:[],seals:[]}})")
  # rematch halving: first win full, rematch half
  r=pg.evaluate("""(()=>{const g=APP.game; const n=WORLD.allNpcs().mossbrook.find(x=>x.id==='sorrel'); APP.startTrainer(n); const r1=g.state.trainer.reward; APP.close(); g.update({npc:Object.assign({},g.state.npc,{cleared:['sorrel']})}); APP.startTrainer(n); const r2=g.state.trainer.reward; APP.close(); return [n.reward,r1,r2];})()""")
  print('sorrel reward / first / rematch:', r)
  # daily essence ceilings (all trainers + leader rematches + quests)
  print('daily max essence: old world', pg.evaluate("(()=>{const all=WORLD.allNpcs(); const T=[]; for(const k in all) all[k].forEach(n=>{ if(n.trainer&&!n.leader) T.push(n); }); const old=['rowan','ivy','bram','kiki','marlo']; const o=T.filter(n=>old.includes(n.id)).reduce((a,n)=>a+n.reward,0)+40; const nw=T.reduce((a,n)=>a+Math.ceil(n.reward/2),0)+40+4*CQ_REWARD; const nwFull=T.reduce((a,n)=>a+n.reward,0)+40; return [o, nwFull, nw];})()"), '(old / new without halving / new with halving + quests)')
  # quests: each city's quest; progress per kind; claim
  for city in ['mossbrook','frosthold','cinderport','coralbay']:
    print(city, pg.evaluate(f"JSON.stringify(APP.game.cityQuest('{city}').q)"))
  q=pg.evaluate("APP.game.cityQuest('mossbrook').q")
  if q['k']=='see':
    pg.evaluate("WORLD.enter('moss')"); s0=pg.evaluate("(APP.game.state.sight||{n:0}).n")
    for i in range(8):
      if pg.evaluate("APP.game.cityQuest('mossbrook').done"): break
      pg.evaluate("APP.encounter({types:['Moss','Bloom'], zone:'Moss Forest', rare:false})"); pg.wait_for_timeout(150); pg.evaluate("APP.close()"); pg.wait_for_timeout(80)
      pg.evaluate("document.getElementById('tip') && (document.getElementById('tip').hidden=true)")
    print('sightings used:', pg.evaluate("(APP.game.state.sight||{n:0}).n")-s0, '| quest progress:', pg.evaluate("APP.game.cityQuest('mossbrook').n"))
  elif q['k']=='keep':
    pg.evaluate("(()=>{const g=APP.game; for(let s=7000;;s++){ const k=g.make(s,1); if(['Moss','Bloom'].includes(k.element.name)){ g.update({caught:[{seed:s,stage:1}].concat(g.state.caught)}); break; } } })()")
  else:
    pg.evaluate("APP.game.questTick('beat','sorrel')")
  Q=pg.evaluate("APP.game.cityQuest('mossbrook')"); print('mossbrook progress:', Q['n'], '/', Q['q']['n'], 'done', Q['done'])
  e0=pg.evaluate("APP.game.state.essence"); x0=pg.evaluate("APP.game.state.xp||0")
  pg.evaluate("WORLD.enter('mossbrook'); APP.talk(WORLD.allNpcs().mossbrook.find(n=>n.id==='bryn'))"); pg.wait_for_timeout(80)
  print('bryn:', pg.evaluate("APP.dialog.lines.join(' / ')")); adv(pg)
  print('claimed: essence +', pg.evaluate("APP.game.state.essence")-e0, '| xp +', (pg.evaluate("APP.game.state.xp||0")-x0))
  pg.evaluate("APP.talk(WORLD.allNpcs().mossbrook.find(n=>n.id==='bryn'))"); pg.wait_for_timeout(60); print('again:', pg.evaluate("APP.dialog.lines.slice(-1)[0]")); adv(pg)
  pg.reload(); pg.wait_for_timeout(1100); print('after reload claimed:', pg.evaluate("APP.game.cityQuest('mossbrook').claimed"))
  print('errors:', errs or 'none'); b.close()
