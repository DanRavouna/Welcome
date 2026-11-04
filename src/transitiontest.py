# Runs WITHOUT the pwhook (the hook turns transitions off). Seeds an existing player itself.
from playwright.sync_api import sync_playwright
import time
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':700})
  ctx.add_init_script("try{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[{seed:2,stage:2,lv:9}],party:[2],fighter:2,essence:20,wins:0,intro:true,xp:99999,settings:{sound:true,vibrate:true,calm:false,test:true,daynight:true,track:true,follow:false,weather:false,ambient:false}})); } }catch(e){}")
  pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def watch(secs=3.0, shot_pre=None, shot_post=None):
    log=[]; t0=time.time(); shot1=shot2=False
    while time.time()-t0<secs:
      s=pg.evaluate("({m:WORLD.map.id,t:WORLD.transitioning})"); s['at']=round(time.time()-t0,2); log.append(s)
      if shot_pre and s['t'] and not shot1 and s['m']==log[0]['m']: pg.screenshot(path=shot_pre); shot1=True
      if shot_post and s['t'] and s['m']!=log[0]['m'] and not shot2: pg.screenshot(path=shot_post); shot2=True
      if len(log)>5 and not s['t'] and log[-2]['t']==False and any(x['t'] for x in log): break
    return log
  def summary(log):
    maps=[]; [maps.append(x['m']) for x in log if not maps or maps[-1]!=x['m']]
    tr=[x for x in log if x['t']]; return {'maps seen':maps,'transition frames':len(tr),'visible for (s)':round(tr[-1]['at']-tr[0]['at'],2) if tr else 0,'ended':not log[-1]['t']}
  # 1) a real walk off the west edge of the town
  e=pg.evaluate("(()=>{WORLD.enter('town');const x=WORLD.map.exits.find(e=>e.edge==='w');return x?[x.a,x.b,x.to]:null})()")
  print('town west exit:', e)
  pg.evaluate(f"WORLD.setPos(2.2*WORLD.TS,({e[0]}+1)*WORLD.TS); WORLD.input.jx=-1")
  log=watch(4, '/tmp/tr-out.png', '/tmp/tr-in.png'); pg.evaluate("WORLD.input.jx=0")
  print('edge walk ->', summary(log))
  swaps=sum(1 for a,b2 in zip(log,log[1:]) if a['m']!=b2['m']); print('map swaps during one walk:', swaps, '| swapped while transitioning:', all(b2['t'] for a,b2 in zip(log,log[1:]) if a['m']!=b2['m']))
  # 2) input is blocked while it runs (player does not walk during the transition)
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(17*WORLD.TS,20*WORLD.TS); WORLD.go('moss')")
  pos0=pg.evaluate("WORLD.pos()"); pg.evaluate("WORLD.input.jx=1"); pg.wait_for_timeout(150); pos1=pg.evaluate("WORLD.pos()"); inTR=pg.evaluate("WORLD.transitioning")
  print('during transition (running:', inTR, ') player moved:', abs(pos1['x']-pos0['x'])>1); pg.evaluate("WORLD.input.jx=0")
  pg.evaluate("WORLD.go('frost')")  # a second request while one is running
  log=watch(3); print('double go -> one transition, ends on', pg.evaluate("WORLD.map.id"), summary(log))
  # 3) Travel from the map goes zone to zone in ONE transition
  pg.evaluate("WORLD.enter('moss')"); pg.wait_for_timeout(200)
  pg.evaluate("APP.travel('ember')"); log=watch(3.5); print('travel moss -> ember:', summary(log), '| now on', pg.evaluate("WORLD.map.id"))
  # 4) doors: enter and leave the home
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(8.5*WORLD.TS,10*WORLD.TS)"); pg.wait_for_timeout(100)
  pg.evaluate("WORLD.go('in-home')"); log=watch(3); print('door in:', summary(log)); 
  # 5) reduce motion: a short fade only
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{calm:true})})"); pg.wait_for_timeout(100)
  pg.evaluate("WORLD.enter('town'); WORLD.go('moss')"); st=pg.evaluate("1"); log=watch(2.5, '/tmp/tr-calm.png')
  print('calm mode:', summary(log))
  print('errors:', errs or 'none'); b.close()
