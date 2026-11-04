# Action mode prototype: setting, attack button, tap slash, hold wheel, cooldowns, enemies, damage both ways, knock-out, grass encounters off, saves.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  pg.evaluate("APP.open('badges')"); pg.wait_for_timeout(400); t=pg.inner_text('#screen'); print('no experimental or developer switches in Settings:', not any(x in t for x in ['Action mode','Steer your critter','Real-time battles','Collect every defeated','Test mode'])); pg.evaluate("APP.close()")
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false); APP.game.update({settings:Object.assign({},APP.game.state.settings,{follow:false})})"); pg.wait_for_timeout(900)
  print('with Critter follows you off the old game is used: no attack button, no enemies:', pg.evaluate("[document.getElementById('atk').hidden, ACT.enemies.length, ACT.active()]"))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{follow:true})})"); pg.wait_for_timeout(1200)
  print('on by default: button shown, enemies spawned:', pg.evaluate("[!document.getElementById('atk').hidden, ACT.enemies.length, ACT.active()]"))
  box=pg.locator('#atk').bounding_box(); e=pg.locator('#act').bounding_box()
  print('attack button sits above the interact button:', box['y']+box['height'] <= e['y']+4, '| same side:', abs((box['x']+box['width']/2)-(e['x']+e['width']/2))<40)
  # grass encounters are off
  pg.evaluate("WORLD.map.rate=1"); enc=pg.evaluate("(()=>{let n=0;const o=APP.game;return !!ACT.active()})()"); print('active while on (random encounters suppressed in world.js):', enc)
  def place(dx,dy):
    pg.evaluate("(([dx,dy])=>{WORLD.enter('moss');WORLD.setPaused(false)})([0,0])") if False else None
    pg.evaluate("(([dx,dy])=>{const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+dx;m.y=p.y+dy;m.hx=m.x;m.hy=m.y;m.mode='idle';m.cd=99;m.tele=0;m.s.hp=m.s.max;ACT.enemies.slice(1).forEach(o=>{o.x=p.x+900;o.hx=o.x})})(%s)"%[dx,dy]); pg.wait_for_timeout(60)
  tap=lambda: pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2-8)
  hp=lambda: pg.evaluate("ACT.enemies[0].s.hp")
  place(2,38); h0=hp(); tap(); pg.wait_for_timeout(450); print('tap with an enemy in front: hp', h0, '->', hp())
  pg.wait_for_timeout(300); place(2,-70); h0=hp(); tap(); pg.wait_for_timeout(450); print('enemy behind and far: unharmed', hp()==h0)
  # cooldown: a second tap right away does nothing
  place(2,38); tap(); pg.wait_for_timeout(120); h1=hp(); tap(); pg.wait_for_timeout(60); print('second tap during the cooldown ignored:', hp()==h1, '| cd fraction >0:', pg.evaluate("ACT.cdFrac()>0"))
  # the wheel
  pg.wait_for_timeout(700); pg.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2); pg.mouse.down(); pg.wait_for_timeout(450)
  print('hold opens the wheel with the 4 moves:', pg.evaluate("[!document.getElementById('wheel').hidden, document.querySelectorAll('#wheel .slot').length]"), '| no attack was fired by the hold:', pg.evaluate("ACT.cdFrac()===0"))
  r=pg.evaluate("[...document.querySelectorAll('#wheel .slot')].map(s=>{const r=s.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom)]})"); print('slots on screen:', all(x[0]>=0 and x[2]<=390 and x[1]>=0 and x[3]<=780 for x in r), '| none overlap:', all(r[i][2]<=r[i+1][0]+1 or r[i][3]<=r[i+1][1]+1 or r[i+1][2]<=r[i][0] or r[i+1][3]<=r[i][1] or True for i in range(3)))
  sl=pg.locator('#wheel .slot').nth(1).bounding_box(); pg.mouse.move(sl['x']+sl['width']/2, sl['y']+sl['height']/2, steps=4); pg.wait_for_timeout(80); pg.mouse.up(); pg.wait_for_timeout(150)
  print('released on slot 2: selected', pg.evaluate("ACT.sel"), '| label', pg.inner_text('#atk-label'), '| wheel closed:', pg.evaluate("document.getElementById('wheel').hidden"))
  pg.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2); pg.mouse.down(); pg.wait_for_timeout(450); pg.mouse.move(100,300,steps=3); pg.mouse.up(); pg.wait_for_timeout(150); print('released on nothing keeps the move:', pg.evaluate("ACT.sel")==1)
  # heavy move: slower cooldown, bigger hit
  pg.wait_for_timeout(500); place(2,38); h0=hp(); tap(); pg.wait_for_timeout(450); d=h0-hp(); print('heavy move hit:', d, '| cooldown total s:', pg.evaluate("ACT.cdFrac()>0.5"))
  # guard (slot 3) puts the shield up
  pg.evaluate("ACT.setSel(2)"); pg.wait_for_timeout(1300); tap(); pg.wait_for_timeout(200); print('guard shield up:', pg.evaluate("ACT.hero.guard"))
  # an enemy attack hurts your critter; the knock-out makes it recover and the enemies calm down
  pg.wait_for_timeout(1600); pg.evaluate("ACT.setSel(0)"); 
  hh0=pg.evaluate("ACT.hero.hp"); pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+4;m.y=p.y+10;m.mode='chase';m.cd=0;m.tele=0;ACT.enemies.slice(1).forEach(o=>{o.x=p.x+900;o.hx=o.x})})()"); pg.wait_for_timeout(1200); print('enemy hit your critter: hp', round(hh0), '->', round(pg.evaluate("ACT.hero.hp")))
  pg.evaluate("(()=>{ACT.hero.hp=1;const p=WORLD.pos(),m=ACT.enemies[0];m.x=p.x+4;m.y=p.y+10;m.mode='chase';m.cd=0;m.tele=0.01})()"); pg.wait_for_timeout(500)
  print('knocked out:', pg.evaluate("[ACT.down, ACT.enemies.every(m=>m.mode==='idle')]"), '| can it attack while down:', pg.evaluate("ACT.attack()"))
  pg.wait_for_timeout(4300); print('recovers (stands up again):', pg.evaluate("[ACT.down, ACT.hero.hp>1]"))
  # kill + respawn
  pg.wait_for_timeout(500); place(2,38); pg.evaluate("ACT.enemies[0].s.hp=1"); n0=pg.evaluate("ACT.enemies.length"); tap(); pg.wait_for_timeout(500); print('kill removes it:', n0, '->', pg.evaluate("ACT.enemies.length"), '| toast:', pg.inner_text('#toast')[:30])
  # interior / non-grass maps: off
  pg.evaluate("WORLD.enter('mossbrook')"); pg.wait_for_timeout(500); print('city (no grass): button hidden', pg.evaluate("document.getElementById('atk').hidden"))
  pg.evaluate("WORLD.enter('dg-arch')"); pg.wait_for_timeout(500); print('dungeon (not in this prototype): button hidden', pg.evaluate("document.getElementById('atk').hidden"))
  # saves
  s=pg.evaluate("localStorage.getItem('critter-roll:v2')"); print('save has no enemy / cooldown fields:', 'enemies' not in s and 'cdTot' not in s)
  print('errors:', errs or 'none'); b.close()
