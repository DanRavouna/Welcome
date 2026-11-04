# Real-time battles: setting, cooldown button, foe clock, status ticks, guard, switching, pause gap, save compatibility.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15},{seed:9,stage:3,lv:12}],party:[2,9],fighter:2,intro:true,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  print('default setting off:', pg.evaluate("APP.game.state.settings.rtb===false"))
  pg.evaluate("APP.open('badges')"); pg.wait_for_timeout(400); t=pg.inner_text('#screen'); print('toggle row exists on the Trainer screen:', 'Real-time battles (beta)' in t); pg.evaluate("APP.close()")
  # classic mode untouched: one move = one full round (foe answers at once)
  pg.evaluate("APP.open('battle'); (()=>{const g=APP.game;g.setState({battle:g.newBattle(g.make(2,3,15),g.make(7,3,15),1),bmode:'moves'})})()"); pg.wait_for_timeout(300)
  print('classic: move buttons shown, no RT button:', pg.evaluate("!!document.querySelector('#screen button')&&!document.getElementById('rt-atk')"))
  pg.evaluate("APP.game.playRound(0)"); print('classic round advanced to', pg.evaluate("APP.game.state.battle.round"))
  # switch it on
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{rtb:true})}); (()=>{const g=APP.game;g.setState({battle:g.newBattle(g.make(2,3,15),g.make(7,3,15),1),bmode:'moves'})})()"); pg.wait_for_timeout(400)
  print('RT: attack button shown:', pg.evaluate("!!document.getElementById('rt-atk')"), '| label:', pg.inner_text('#rt-atk').replace('\n',' | '))
  # nothing happens until the clock runs; the foe acts alone, ticks happen
  r0=pg.evaluate("APP.game.state.battle.round"); pg.wait_for_timeout(3500); r1=pg.evaluate("APP.game.state.battle.round"); hp=pg.evaluate("APP.game.state.battle.s[0].hp<APP.game.state.battle.s[0].max")
  print('foe/ticks advance on their own: rounds', r0, '->', r1, '| you were hit:', hp)
  # cooldown: first tap lands, an immediate second one is ignored
  pg.wait_for_timeout(600)
  ok1=pg.evaluate("APP.game.rtPlayer(0)"); ok2=pg.evaluate("APP.game.rtPlayer(0)"); print('tap when ready:', ok1, '| tap again at once:', ok2, '| wait fraction now:', pg.evaluate("+APP.game.rtWait().toFixed(2)")>0.5)
  # swap the equipped move with the chips
  pg.evaluate("APP.game.setState({rtSel:1})"); pg.wait_for_timeout(200); print('after picking move 2 the button says:', pg.inner_text('#rt-atk').split('\n')[0])
  # cooldown scales with power and speed (heavier = slower), same damage per second
  print('cooldowns ms (move 1..4):', pg.evaluate("(()=>{const g=APP.game,b=g.state.battle;return [0,1,2,3].map(i=>g.rtCooldown(b,0,i))})()"))
  # guard is used up by the hit it blocks; fades after two ticks
  g=pg.evaluate("""(()=>{const g=APP.game,b=JSON.parse(JSON.stringify(g.state.battle));b.s[1].guard=true;const hp=b.s[1].hp;g.rtStep(b,0,0,()=>0.5);const used=!b.s[1].guard&&b.s[1].hp<hp;
    b.s[0].guard=true;g.rtTick(b);const one=b.s[0].guard;g.rtTick(b);return {used,afterOneTick:one,afterTwo:b.s[0].guard}})()""")
  print('guard:', g)
  # a pause (dialog, hidden tab) does not hand out free hits
  pg.evaluate("APP.game.rtUpdate(APP.game.rtNow())"); h0=pg.evaluate("APP.game.state.battle.s[0].hp"); rd=pg.evaluate("APP.game.state.battle.round")
  pg.evaluate("(()=>{const g=APP.game,n=g.rtNow();g.rtUpdate(n+5000)})()"); print('after a 5 s pause: round unchanged', pg.evaluate("APP.game.state.battle.round")==rd)
  # switching holds your attack
  pg.evaluate("(()=>{const g=APP.game,b=JSON.parse(JSON.stringify(g.state.battle));b.bench=[g.newBattle(g.make(9,3,12),g.make(7,3,12),0).s[0]];g.setState({battle:b});g.rtPlayer(0)})()"); pg.wait_for_timeout(1300)
  pg.evaluate("APP.game.battleAction({switchTo:0,rt:0})"); print('after a switch the button is locked:', pg.evaluate("APP.game.rtWait()>0.5"), '| lead now:', pg.evaluate("APP.game.state.battle.s[0].k.seed"))
  # a whole battle with a simple tapper; a trainer with several critters moves on to the next one
  pg.evaluate("""(()=>{const g=APP.game,tr=Object.values(WORLD.allNpcs()).flat().find(n=>n.id==='kolb'||n.trainer);window.__tr=tr;})()""")
  pg.evaluate("(()=>{const g=APP.game;g.update({caught:[{seed:2,stage:3,lv:30},{seed:9,stage:3,lv:30}]});g.setState({battle:g.newBattle(g.make(2,3,30),g.make(7,3,5),1),bmode:'moves',rtSel:0})})()")
  for i in range(60):
    pg.wait_for_timeout(300); pg.evaluate("APP.game.rtPlayer(0)")
    if pg.evaluate("APP.game.state.battle.over"): break
  print('battle finished:', pg.evaluate("[APP.game.state.battle.over, APP.game.state.battle.win]"))
  # saving: timing never lands in the save, the setting does, old saves without it load as off
  s=pg.evaluate("localStorage.getItem('critter-roll:v2')"); print('save has rtb true:', '"rtb":true' in s, '| no cooldown fields:', '"cd"' not in s and 'tickAt' not in s)
  pg.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('critter-roll:v2'));delete s.settings.rtb;localStorage.setItem('critter-roll:v2',JSON.stringify(s))})()"); pg.reload(); pg.wait_for_timeout(1300)
  print('old save without the field loads as off:', pg.evaluate("APP.game.state.settings.rtb===false"))
  print('errors:', errs or 'none'); b.close()
