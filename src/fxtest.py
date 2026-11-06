# Battle effects: classes, round fx, DOM structure, no undefined classes.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1)
  pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  # a strong-matchup battle: my Ember vs a Moss foe
  pg.evaluate("""()=>{const g=APP.game; let me=0,foe=0; for(let s=100;!me||!foe;s++){const k=g.make(s,2); if(!me&&k.element.name==='Ember'&&k.rarity!=='Mythic')me=s; if(!foe&&k.element.name==='Moss'&&k.rarity!=='Mythic')foe=s;}
    g.update({caught:[{seed:me,stage:2,lv:12}].concat(g.state.caught), fighter:me}); const nb=g.newBattle(g.make(me,2), g.make(foe,1), 0); g.setState({battle:nb, trainer:null, bmode:'moves'}); APP.open('battle');}""")
  pg.wait_for_timeout(300)
  print('undefined class anywhere:', pg.evaluate("[...document.querySelectorAll('[class]')].some(e=>/undefined/.test(e.className))"))
  pg.evaluate("Math.random=(()=>{let a=11;return()=>{a=(a*16807)%2147483647;return a/2147483647}})(); APP.game.battleAction({move:0})")
  pg.wait_for_timeout(140)
  print('round fx:', pg.evaluate("JSON.stringify(APP.game.state.battle.fx.side)"))
  print('dom:', pg.evaluate("[...document.querySelectorAll('.fxl')].map(l=>[l.className, l.querySelectorAll('.fx-burst i').length, (l.querySelector('.fx-num')||{}).textContent, (l.querySelector('.fx-label')||{}).textContent])"))
  print('flash on foe sprite:', pg.evaluate("document.querySelectorAll('[class^=fx-flash]').length"))
  box=pg.evaluate("(()=>{const r=document.querySelectorAll('.fxl')[1]||document.querySelector('.fxl'); const c=r.closest('[class^=hit],div').getBoundingClientRect(); const q=r.getBoundingClientRect(); return [q.x,q.y,q.width,q.height]})()")
  pg.screenshot(path='/tmp/fx1.png', clip={'x':0,'y':box[1]-10,'width':390,'height':box[3]+20})
  # replay on next round (parity class flips)
  c1=pg.evaluate("document.querySelector('.fxl').className"); pg.evaluate("APP.game.battleAction({move:0})"); pg.wait_for_timeout(50)
  print('parity flips:', c1, '->', pg.evaluate("document.querySelector('.fxl') && document.querySelector('.fxl').className"))
  # heal via potion
  pg.evaluate("(()=>{const g=APP.game; const b=JSON.parse(JSON.stringify(g.state.battle)); b.s[0].hp=Math.round(b.s[0].max*0.3); b.over=false; g.setState({battle:b}); g.update({bag:{potion:2,super:0,charm:0,ticket:0}}); g.battleAction({item:'potion'});})()")
  pg.wait_for_timeout(60); print('potion fx me:', pg.evaluate("JSON.stringify(APP.game.state.battle.fx.side[0])"))
  # calm mode: numbers only
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:true})}); APP.game.battleAction({move:0})"); pg.wait_for_timeout(60)
  print('calm: bursts', pg.evaluate("document.querySelectorAll('.fx-burst').length"), '| layer', pg.evaluate("document.querySelector('.fxl') && document.querySelector('.fxl').className"))
  # KO
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:false})}); (()=>{const g=APP.game; const b=JSON.parse(JSON.stringify(g.state.battle)); b.s[1].hp=1; b.over=false; g.setState({battle:b}); g.battleAction({move:0});})()")
  pg.wait_for_timeout(250); print('ko label:', pg.evaluate("[...document.querySelectorAll('.fx-ko')].map(e=>e.textContent)"), '| over', pg.evaluate("APP.game.state.battle.over"))
  pg.screenshot(path='/tmp/fx2.png', clip={'x':0,'y':box[1]-10,'width':390,'height':box[3]+20})
  print('errors:', errs or 'none'); b.close()
