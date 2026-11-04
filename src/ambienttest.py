import sys
from playwright.sync_api import sync_playwright
errs=[]
PW=sync_playwright().start()
def run(hour, shots):
    b=PW.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':600}); pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.set_fixed_time(f'2026-11-03T{hour:02d}:00:00')
    pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
    pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:9}], party:[2], fighter:2, intro:true, settings:Object.assign({},APP.game.state.settings,{follow:false})}); document.getElementById('tip') && (document.getElementById('tip').hidden=true)")
    return pg,b
pg,b=run(12,None)
ids=pg.evaluate("Object.keys(WORLD.MAPS).filter(i=>!WORLD.MAPS[i].interior)")
print('per-map ambient (planned -> spawned):')
for i in ids:
  pg.evaluate(f"window.__weather='clear'; WORLD.enter('{i}')"); pg.wait_for_timeout(250)
  r=pg.evaluate(f"({{planned: AMBIENT.listFor('{i}').reduce((n,[k,c])=>n+c,0), spawned: AMBIENT._list().length, kinds: [...new Set(AMBIENT._list().map(a=>a.kind))].join(',')}})")
  print(f"  {i:11s} {r['planned']:3d} -> {r['spawned']:3d} {r['kinds']}")
pg.evaluate("WORLD.enter('in-home')"); pg.wait_for_timeout(300); print('indoors ambient count:', pg.evaluate("AMBIENT._list().length"))
# bird flees when the player walks up
pg.evaluate("window.__weather='clear'; WORLD.enter('town'); WORLD.setPos(20*WORLD.TS,23.6*WORLD.TS)"); pg.wait_for_timeout(300)
r=pg.evaluate("""(()=>{const a=AMBIENT._list().find(x=>x.kind==='bird');WORLD.setPos(a.x,a.y+20);for(let i=0;i<10;i++)WORLD.step(1/30);return new Promise(res=>setTimeout(()=>res({fly:+a.fly.toFixed(2)>0}),400))})()""")
print('bird flies off when approached:', r)
# crabs stay on sand
pg.evaluate("WORLD.enter('tide')"); pg.wait_for_timeout(2500)
print('crabs on sand tiles only:', pg.evaluate("AMBIENT._list().filter(a=>a.kind==='crab').every(a=>WORLD.map.grid[Math.floor(a.y/32)][Math.floor(a.x/32)]==='.')"))
# reduce motion / setting off: nothing drawn
pg.evaluate("window.__weather='clear'; WORLD.enter('moss'); WORLD.setPos(17*WORLD.TS,14*WORLD.TS)"); pg.wait_for_timeout(1500)
print('visible ambient (day, clear, moss):', pg.evaluate("AMBIENT._list().filter(a=>a.vis>0.5).map(a=>a.kind).reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{})"))
pg.screenshot(path='/tmp/amb-moss-day.png')
pg.evaluate("window.__weather='rain'"); pg.wait_for_timeout(2500)
print('visible ambient (rain):', pg.evaluate("AMBIENT._list().filter(a=>a.vis>0.5).length"))
pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{ambient:false})}); window.__weather='clear'"); pg.wait_for_timeout(300)
pg.screenshot(path='/tmp/amb-off.png')
pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{ambient:true})})")
# scenes
def shot(m,pos,wk,name):
  pg.evaluate(f"window.__weather={wk!r}; WORLD.enter('{m}'); WORLD.setPos({pos[0]}*WORLD.TS,{pos[1]}*WORLD.TS)")
  for _ in range(30): pg.evaluate("WORLD.step(1/30)")
  pg.wait_for_timeout(2300); pg.screenshot(path=f'/tmp/amb-{name}.png')
shot('tide',(18,12),'rain','tide-rain'); shot('tide',(18,12),'storm','tide-storm'); shot('town',(22,17),'snow','town-snow')
shot('frost',(17,14),'clear','frost-glint'); shot('coralbay',(20,14),'clear','coral-crabs')
b.close()
pg,b=run(23,None)
pg.evaluate("window.__weather='clear'; WORLD.enter('moss'); WORLD.setPos(17*WORLD.TS,14*WORLD.TS)"); pg.wait_for_timeout(2800)
print('visible at night (moss):', pg.evaluate("AMBIENT._list().filter(a=>a.vis>0.5).map(a=>a.kind).reduce((o,k)=>(o[k]=(o[k]||0)+1,o),{})"))
pg.screenshot(path='/tmp/amb-moss-night.png'); b.close()
print('errors:', errs or 'none'); PW.stop()
