from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:9}], party:[2], fighter:2, intro:true})")
  # same time + area -> same weather; every kind valid
  print('deterministic:', pg.evaluate("WEATHER.at('moss')===WEATHER.at('moss')"))
  print('kinds seen over 400 blocks (moss):', pg.evaluate("""(()=>{const c={};for(let i=0;i<400;i++){const k=WEATHER.at('moss',new Date(2026,0,1+Math.floor(i/4),(i%4)*6));c[k]=(c[k]||0)+1}return c})()"""))
  print('kinds seen over 400 blocks (frost):', pg.evaluate("""(()=>{const c={};for(let i=0;i<400;i++){const k=WEATHER.at('frost',new Date(2026,0,1+Math.floor(i/4),(i%4)*6));c[k]=(c[k]||0)+1}return c})()"""))
  print('indoor null:', pg.evaluate("WEATHER.at('in-home')"), '| city = zone region:', pg.evaluate("WEATHER.region('coralbay')"))
  for k in ['rain','storm','snow','fog','sun','ash','clear']:
    pg.evaluate(f"window.__weather='{k}'; WORLD.enter('town'); WORLD.setPos(20*WORLD.TS,23.6*WORLD.TS)"); pg.wait_for_timeout(1900)
    print(k, 'state', pg.evaluate("WEATHER._state()"), '| icon:', pg.evaluate("document.getElementById('loc-wx').innerHTML.length>0"))
    pg.screenshot(path=f'/tmp/wx-{k}.png')
  # tilt
  print('tilt rate (rain, area without Tide):', pg.evaluate("(()=>{let n=0;for(let i=0;i<5000;i++){if(WEATHER.tilt({types:['Moss','Bloom']},'rain').types[0]==='Tide')n++}return n/5000})()"))
  print('tilt skips fixed seed:', pg.evaluate("WEATHER.tilt({types:['Moss'],seed:5},'rain',()=>0).types[0]"))
  # indoor: no weather drawn
  pg.evaluate("window.__weather='rain'; WORLD.enter('in-home')"); pg.wait_for_timeout(1900); print('indoor state:', pg.evaluate("WEATHER._state()"))
  # setting off
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{weather:false})}); WORLD.enter('town')"); pg.wait_for_timeout(700)
  print('setting off -> weatherAt:', pg.evaluate("APP.weatherAt('town')"), '| icon empty:', pg.evaluate("document.getElementById('loc-wx').innerHTML===''"))
  print('old save has weather default on:', pg.evaluate("new Game({}).state.settings.weather"))
  print('errors:', errs or 'none'); b.close()
