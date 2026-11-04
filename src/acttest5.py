# Action mode phase 5: trainers, leaders, dungeon bosses and the Tower fought live on the map; rewards go through the same settle code as the battle screen.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15,xp:0},{seed:9,stage:3,lv:12,xp:0}],party:[2,9],fighter:2,intro:true,xp:99999,essence:50,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  def go(mapid):
    pg.evaluate("(m)=>{WORLD.enter(m); WORLD.setPaused(false)}", mapid); pg.wait_for_timeout(900); finish(); pg.evaluate("WORLD.setPaused(false)"); pg.wait_for_timeout(200)
  def npc(i): return pg.evaluate("(i)=>{const n=Object.values(WORLD.allNpcs()).flat().find(x=>x.id===i);return !!n}", i)
  tap=lambda: pg.mouse.click(*(lambda b:(b['x']+b['width']/2,b['y']+b['height']/2-8))(pg.locator('#atk').bounding_box()))
  def start(i):
    pg.evaluate("(i)=>{const n=Object.values(WORLD.allNpcs()).flat().find(x=>x.id===i);APP.startTrainer(n)}", i); pg.wait_for_timeout(300)
  def duelFoe(timeout=5000):
    for _ in range(int(timeout/100)):
      if pg.evaluate("ACT.enemies.some(m=>m.duel)"): return True
      pg.wait_for_timeout(100)
    return False
  def killFoe():
    if not duelFoe(): return False
    pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies.find(x=>x.duel);m.x=p.x+2;m.y=p.y+38;m.hx=m.x;m.hy=m.y;m.cd=99;m.tele=0;m.s.hp=1})()"); pg.wait_for_timeout(60); tap(); pg.wait_for_timeout(450); return True
  def win():
    n=0
    while pg.evaluate("ACT.dueling()") and n<8:
      if not killFoe(): break
      n+=1
    return n
  S=lambda: pg.evaluate("({ess:APP.game.state.essence,wins:APP.game.state.wins,cl:(APP.game.state.npc||{}).cleared||[],seals:(APP.game.state.npc||{}).seals||[],xp:APP.game.state.caught.map(e=>[e.lv,e.xp||0])})")
  # 1) a plain trainer in the town
  go('town'); a=S(); start('rowan')
  print('duel started on the map, no battle screen:', pg.evaluate("[ACT.dueling(), document.getElementById('screen').hidden, APP.game.state.trainer, !document.getElementById('duel').hidden]"), '|', pg.inner_text('#duel').replace('\n',' ')[:60])
  print('wild critters are gone, the trainer sends one out:', pg.evaluate("ACT.enemies.every(m=>m.duel)"), duelFoe(), pg.evaluate("ACT.enemies.map(m=>m.s.label)"))
  n=win(); pg.wait_for_timeout(900); c=S(); print('beat Rowan after', n, 'critters | duel over:', not pg.evaluate("ACT.dueling()"), '| essence +', c['ess']-a['ess'], '| wins +', c['wins']-a['wins'], '| cleared:', 'rowan' in c['cl'], '| XP/levels changed:', a['xp']!=c['xp'], '| dialog:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]"))
  finish()
  # 2) rematch pays half; losing pays nothing and does not mark the trainer
  a=S(); start('rowan'); win(); pg.wait_for_timeout(900); c=S(); print('rematch essence +', c['ess']-a['ess'], '(half of the first win)'); finish()
  a=S(); start('rowan'); duelFoe(); pg.evaluate("(()=>{ACT.hero.hp=1;ACT.benchList();const b=APP.game;})()")
  pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies.find(x=>x.duel);m.x=p.x+4;m.y=p.y+10;m.mode='chase';m.cd=0;m.tele=0.01;m.aim={x:p.x,y:p.y};m.kind='melee'})()")
  # weaken every party member so the foe can finish the party
  pg.evaluate("(()=>{ACT.hero.hp=1;})()"); pg.evaluate("window.__lowAll=setInterval(()=>{ACT.hero.hp=Math.min(ACT.hero.hp,1);ACT.benchList().forEach(b=>{});},50)")
  pg.evaluate("(()=>{const g=APP.game;})()")
  for _ in range(60):
    pg.wait_for_timeout(150)
    if not pg.evaluate("ACT.dueling()"): break
    pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies.find(x=>x.duel);if(m){m.x=p.x+4;m.y=p.y+10;m.cd=0;if(m.tele<=0){m.kind='melee';m.aim={x:p.x,y:p.y};m.tele=0.02}}})()")
  pg.evaluate("clearInterval(window.__lowAll)")
  print('party knocked out loses the duel:', not pg.evaluate("ACT.dueling()"), '| no extra essence:', S()['ess']==a['ess'], '| toast:', pg.inner_text('#toast')[:50])
  pg.wait_for_timeout(4500)
  # 3) giving up and leaving the map
  go('town'); start('rowan'); duelFoe(); pg.click('#duel button'); pg.wait_for_timeout(200); print('give up ends it with no reward:', not pg.evaluate("ACT.dueling()"), '| toast:', pg.inner_text('#toast')[:40])
  start('rowan'); duelFoe(); pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(600); print('leaving the map ends it:', not pg.evaluate("ACT.dueling()"))
  # 4) a gym leader in a city: seal dialog
  go('frosthold'); a=S(); start('glacia'); n=win(); pg.wait_for_timeout(1500); c=S()
  print('Glacia beaten after', n, 'critters | seal:', 'glacia' in c['seals'], '| essence +', c['ess']-a['ess'], '| seal dialog:', pg.evaluate("APP.dialog&&APP.dialog.lines.slice(0,3).join(' / ')")[:140], '| justSealed cleared:', pg.evaluate("APP.game.state.justSealed===null||APP.game.state.justSealed===undefined"))
  finish()
  # 5) a dungeon boss in a cave
  go('dg-arch'); start('keeper'); print('Keeper duel in the cave: boss flag', pg.evaluate("[ACT.dueling(), ACT.duelInfo().boss]")); n=win(); pg.wait_for_timeout(900); print('Keeper beaten:', 'keeper' in S()['cl']); finish()
  # 6) the Tower: party locked, HP carried, win then loss
  pg.evaluate("APP.game.update({tower:{best:0,day:'',runs:0,clears:0,run:null}}); APP.game.startTowerRun()"); go('peak')
  hp0=pg.evaluate("APP.game.towerParty().map(x=>x.hp+'/'+x.max)"); pg.evaluate("APP.towerFloorStart()"); pg.wait_for_timeout(300)
  print('Tower floor 1 as a live duel:', pg.evaluate("[ACT.dueling(), ACT.duelInfo()&&ACT.duelInfo().tower, ACT.duelInfo()&&ACT.duelInfo().floor, APP.game.state.trainer]"), '| party hp', hp0)
  n=win(); pg.wait_for_timeout(1200); t=pg.evaluate("APP.game.state.tower"); print('floor 1 cleared after', n, '| run floor', t['run']['floor'] if t['run'] else None, '| best', t['best'], '| hp now', pg.evaluate("APP.game.towerParty().map(x=>x.hp+'/'+x.max)"), '| dialog:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]"))
  finish(); pg.wait_for_timeout(300); pg.locator('#dlg button', has_text='Rest outside').click(); pg.wait_for_timeout(400); pg.evaluate("WORLD.setPaused(false)")
  pg.evaluate("APP.towerFloorStart()"); pg.wait_for_timeout(300); pg.evaluate("ACT.hero.hp=100"); pg.click('#duel button'); pg.wait_for_timeout(300)
  print('giving up a Tower floor keeps the HP in the run:', pg.evaluate("APP.game.towerParty().map(x=>x.hp)"), '| run still on floor', pg.evaluate("APP.game.state.tower.run.floor"))
  pg.evaluate("APP.towerFloorStart()"); pg.wait_for_timeout(300); print('and the next try starts from that HP:', pg.evaluate("ACT.hero.hp"))
  pg.evaluate("window.__lowAll=setInterval(()=>{ACT.hero.hp=Math.min(ACT.hero.hp,1)},50)")
  for _ in range(60):
    pg.wait_for_timeout(150)
    if not pg.evaluate("ACT.dueling()"): break
    pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies.find(x=>x.duel);if(m){m.x=p.x+4;m.y=p.y+10;m.cd=0;if(m.tele<=0){m.kind='melee';m.aim={x:p.x,y:p.y};m.tele=0.02}}})()")
  pg.evaluate("clearInterval(window.__lowAll)"); pg.wait_for_timeout(800); print('Tower loss ends the run:', pg.evaluate("APP.game.state.tower.run===null"), '| dialog:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]"))
  s=pg.evaluate("localStorage.getItem('critter-roll:v2')"); print('save has no duel/enemy fields:', 'lastFoe' not in s and 'koXp' not in s)
  print('errors:', errs or 'none'); b.close()
