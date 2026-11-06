# Eight facings for the trainer and the follower (Dan: "8 directional animations"): the facing follows the joystick angle in eight sectors, every facing has three frames (frame 0 idle), the walk cycle alternates over REAL time while walking and rests on frame 0 when still, and the follower turns toward where it is going.
from playwright.sync_api import sync_playwright
from chk import check, done
import math, time
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower=true; window.__noTransition=true")
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("WORLD.enter('town'); WORLD.setPos(21.9*32, 23.6*32); WORLD.setPaused(false)"); pg.wait_for_timeout(200)
  F=pg.evaluate("Object.fromEntries(Object.entries(PXW.frames()).map(([k,v])=>[k,v.length]))")
  check('eight facings, three frames each', sorted(F)==sorted(['up','upright','right','downright','down','downleft','left','upleft']) and all(n==3 for n in F.values()), F)
  want={'right':(1,0),'downright':(1,1),'down':(0,1),'downleft':(-1,1),'left':(-1,0),'upleft':(-1,-1),'up':(0,-1),'upright':(1,-1)}
  got={}
  for d,(jx,jy) in want.items():
    n=math.hypot(jx,jy); pg.evaluate("([x,y])=>{WORLD.setPos(21.9*32,23.6*32);WORLD.input.jx=x;WORLD.input.jy=y}", [jx/n,jy/n]); pg.wait_for_timeout(150); got[d]=pg.evaluate("WORLD.facing().player")
  pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0")
  check('the facing follows the joystick angle in eight sectors', all(got[d]==d for d in want), got)
  # the walk cycle over real time: sample the drawn frame against the clock while walking, then while still
  pg.evaluate("WORLD.setPos(21.9*32,23.6*32); WORLD.input.jx=0; WORLD.input.jy=1")
  log=pg.evaluate("""()=>new Promise(res=>{const t0=performance.now(),out=[];const tick=()=>{out.push([Math.round(performance.now()-t0),WORLD.walkFrame()]);if(performance.now()-t0<1200)setTimeout(tick,50);else res(out)};tick()})""")
  pg.evaluate("WORLD.input.jx=0;WORLD.input.jy=0"); pg.wait_for_timeout(200)
  frames=[f for t,f in log]; changes=sum(1 for i in range(1,len(frames)) if frames[i]!=frames[i-1])
  check('while walking the frame alternates between 1 and 2 over real time (at least 4 changes in 1.2 s, never frame 0)', changes>=4 and 0 not in frames, [changes, frames[:12]])
  check('standing still rests on the idle frame', pg.evaluate("WORLD.walkFrame()")==0)
  pg2=b.new_page(viewport={'width':390,'height':780}); pg2.on('pageerror',lambda e:errs.append(str(e))); pg2.add_init_script("window.__noTransition=true")   # a second page with the follower on
  pg2.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg2.wait_for_timeout(1100)
  pg2.evaluate("WORLD.enter('town'); WORLD.setPos(21.9*32,23.6*32); WORLD.setPaused(false); WORLD.input.jx=0.7; WORLD.input.jy=-0.7"); pg2.wait_for_timeout(1500); fd=pg2.evaluate("({facing:WORLD.facing(), f:WORLD.followerPos()})"); pg2.evaluate("WORLD.input.jx=0;WORLD.input.jy=0")
  check('the one walking behind turns toward where it is going (a diagonal too)', fd['facing']['follower'] in ('upright','up','right'), fd)
  check('no page errors', not errs, errs); b.close()
done()
