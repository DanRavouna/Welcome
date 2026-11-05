# The weather takes its sideways motion from the map's wind: in still air (the cold) snow falls slowly and dead straight and rain falls straight; where it blows, snow, rain, ash and fog lean east, the way the trees roll, and more in a storm.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{calm:false,ambient:false})}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; document.getElementById('starter').hidden=true")
  def drift(m,kind,gust=False,secs=3.0):
    if kind in ('rain','storm'): secs=0.3
    pg.evaluate("([m,w])=>{window.__weather=w;WORLD.enter(m);WORLD.setPaused(false)}",[m,kind]); pg.wait_for_timeout(1800)
    if gust: pg.evaluate("WORLD.gust()"); pg.wait_for_timeout(1700); secs=1.6
    return pg.evaluate("""([secs])=>new Promise(res=>{const A=WEATHER._parts();setTimeout(()=>{const B=WEATHER._parts();let n=0,dx=0,dy=0,ax=0;
      for(let i=0;i<Math.min(A.length,B.length);i++){const ddy=B[i].y-A[i].y;if(ddy>0&&ddy<250){n++;dx+=B[i].x-A[i].x;dy+=ddy;ax+=Math.abs(B[i].x-A[i].x)}}
      res({n,vx:n?Math.round(dx/n/secs*10)/10:0,vy:n?Math.round(dy/n/secs*10)/10:0,meanDx:n?Math.round(dx/n*10)/10:0,meanAbsDx:n?Math.round(ax/n*10)/10:0,meanDy:n?Math.round(dy/n*10)/10:0,ws:Math.round(WEATHER._wind()*100)/100})},secs*1000)})""",[secs])
  r={}
  r['frost snow']=drift('frost','snow'); r['frosthold snow']=drift('frosthold','snow'); r['Glacier Coast snow']=drift('route-fc','snow'); r['Vigil Peak snow']=drift('peak','snow')
  r['Highland Pass snow']=drift('route-mf','snow'); r['Highland Pass snow, gust']=drift('route-mf','snow',True)
  r['Moss rain']=drift('moss','rain'); r['Moss storm']=drift('moss','storm'); r['frost rain']=drift('frost','rain'); r['Ember ash']=drift('ember','ash'); r['Moss fog']=drift('moss','fog'); r['frost fog']=drift('frost','fog')
  for k,v in r.items(): print(f"{k:26s} {v['n']:3d} particles | sideways {v['vx']:7.1f} px/s while falling {v['vy']:6.1f} px/s | wind {v['ws']}")
  cold=[r[k] for k in ['frost snow','frosthold snow','Glacier Coast snow','Vigil Peak snow']]
  print('snow in the cold falls dead straight (no sideways drift at all):', all(c['meanAbsDx']==0 for c in cold), '| and slower than in the wind:', max(c['vy'] for c in cold) < r['Highland Pass snow']['vy'])
  print('snow in Highland Pass leans east, more in a gust:', r['Highland Pass snow']['vx']>0 and r['Highland Pass snow, gust']['vx']>r['Highland Pass snow']['vx'])
  print('rain leans east (like the trees), more in a storm, and falls straight in the cold:', r['Moss rain']['vx']>0 and r['Moss storm']['vx']>r['Moss rain']['vx'] and 0<=r['frost rain']['vx']<0.06*r['frost rain']['vy'])
  print('ash drifts east in the fire lands:', r['Ember ash']['vx']>0, '| fog creeps in the cold and drifts where it blows:', r['frost fog']['meanDx']<r['Moss fog']['meanDx'] or r['Moss fog']['meanDx']==0)
  print('errors:', errs or 'none'); b.close()
