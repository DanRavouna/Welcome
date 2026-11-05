# The RHYTHM of the wind, over real time (a still screenshot cannot show it): the pose number must advance steadily at the wind's own pace, never faster, with no jumps, also right after entering a place.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{calm:false,ambient:false})}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; window.__weather='clear'; document.getElementById('starter').hidden=true")
  def record(m, secs):
    pg.evaluate("([m])=>{WORLD.enter(m);WORLD.setPaused(false)}",[m])
    return pg.evaluate("""([secs])=>new Promise(res=>{const log=[];const t0=performance.now();const tick=()=>{const w=WORLD.wind();log.push([performance.now()-t0,WORLD.windFrame(),w?w.A:0,w?w.s:0]);if(performance.now()-t0<secs*1000)requestAnimationFrame(tick);else res(log)};requestAnimationFrame(tick)})""",[secs])
  def analyse(log, label):
    # a pose step is +1 modulo 6 (or 0); count steps per second in each 1-second window and any jump bigger than 1
    steps=[];jumps=0;worst=0
    for i in range(1,len(log)):
      d=(log[i][1]-log[i-1][1])%6
      if d>1 and log[i][2]>0 and log[i-1][2]>0: jumps+=1; worst=max(worst,d if d<=3 else 6-d)
      steps.append((log[i][0],d))
    wins={}
    for t,d in steps: wins[int(t//1000)]=wins.get(int(t//1000),0)+ (1 if d else 0)
    rates=[wins[k] for k in sorted(wins)]
    smax=max(l[3] for l in log)
    print(f"{label:34s} pose steps per second in each second: {rates} | highest wind {smax:.2f} (allowed pace up to {1.5+1.5*smax:.1f}/s) | jumps of more than one pose: {jumps}")
    return rates, smax, jumps
  out={}
  for m in ['ember','route-mf','moss']:
    out[m]=analyse(record(m,12), m+' (12 s after entering)')
  # leave and re-enter: the first seconds are where the user sees it speed up
  pg.evaluate("WORLD.enter('town')"); pg.wait_for_timeout(500)
  out['re']=analyse(record('route-mf',8),'route-mf again (first 8 s)')
  ok=all((max(r[0][:] or [0])<=1.5+1.5*r[1]+1.3) and r[2]==0 for r in out.values())
  print('steady pace (never above the wind pace plus one step, no jumps):', ok)
  print('errors:', errs or 'none'); b.close()
