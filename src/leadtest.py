# Critter-lead mode (Settings: Steer your critter): the joystick moves the critter, the human trails behind, aiming follows the critter's facing.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  def spot():   # an open place with room around
    return pg.evaluate("""(()=>{const M=WORLD.map;for(let y=8;y<M.H-8;y++)for(let x=8;x<M.W-8;x++){let ok=true;for(let dy=-5;dy<=5&&ok;dy++)for(let dx=-5;dx<=5&&ok;dx++)if(WORLD.solidAt(x+dx,y+dy)||(WORLD.map.objects||[]).some(o=>o.x===x+dx&&o.y===y+dy))ok=false;if(ok){WORLD.setPos((x+.5)*32,(y+.5)*32);return [x,y]}}return null})()""")
  def settle(): pg.wait_for_timeout(700)
  pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1000); print('open spot:', spot()); settle()
  def walk(jx,jy,ms):
    pg.evaluate("(a)=>{WORLD.input.jx=a[0];WORLD.input.jy=a[1]}",[jx,jy]); pg.wait_for_timeout(ms); pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0"); pg.wait_for_timeout(500)
  pg.wait_for_timeout(300); spot(); settle()
  print('steering the critter is the default: lead flag', pg.evaluate("WORLD.lead"))
  walk(1,0,700); a=pg.evaluate("[WORLD.pos(), WORLD.followerPos()]"); print('on: the human (trailing) is left of the critter body:', a[1]['x']<a[0]['x'], '| gap tiles', round((a[0]['x']-a[1]['x'])/32,1))
  walk(0,1,600); a=pg.evaluate("[WORLD.pos(), WORLD.followerPos()]"); print('moving down: the human is above the critter:', a[1]['y']<a[0]['y'], '| human faces', a[1]['dir'])
  d=pg.evaluate("WORLD.debug()"); print('camera follows the critter (body sits at the screen centre):', abs(d['player']['x']-195)<2)
  pg.screenshot(path='/tmp/lead.png')
  # aiming: attack uses the critter's facing, not the human's
  pg.evaluate("ACT.enemies.splice(0)"); pg.evaluate("ACT.spawn(2)")
  walk(1,0,300)
  pg.evaluate("(()=>{const p=WORLD.pos(),m=ACT.enemies[0],o=ACT.enemies[1];m.x=p.x+44;m.y=p.y;m.hx=m.x;m.hy=m.y;m.mode='idle';m.cd=99;m.tele=0;m.s.hp=m.s.max;o.x=p.x-44;o.y=p.y;o.hx=o.x;o.hy=o.y;o.mode='idle';o.cd=99;o.tele=0;o.s.hp=o.s.max;window.__a=m.s.hp;window.__b=o.s.hp})()")
  pg.wait_for_timeout(50); box=pg.locator('#atk').bounding_box(); pg.mouse.click(box['x']+box['width']/2, box['y']+box['height']/2-8); pg.wait_for_timeout(450)
  print('facing right: the enemy ahead is hit, the one behind is not:', pg.evaluate("[ACT.enemies[0].s.hp<window.__a, ACT.enemies[1].s.hp===window.__b]"))
  # the critter swings from its own position (offset applies to the body)
