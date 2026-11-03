from playwright.sync_api import sync_playwright
errs=[]
PW=sync_playwright().start()
def open_at(hour):
  b=PW.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.clock.set_fixed_time(f'2026-11-03T{hour:02d}:00:00')
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:9}], party:[2], fighter:2, intro:true}); document.getElementById('tip') && (document.getElementById('tip').hidden=true)")
  return pg,b
pg,b=open_at(12)
# 1) new people: on walkable tiles, reachable from the map's spawn
print('new people placement:')
for mid,nid in [('route-mf','edda'),('route-cm','dell'),('route-fc','joss'),('route-cc','neri'),('town','mae')]:
  r=pg.evaluate(f"""(()=>{{WORLD.enter('{mid}');const M=WORLD.map,n=WORLD.npcs.find(x=>x.id==='{nid}');if(!n)return {{missing:true}};
    const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y)||WORLD.npcs.some(o=>o.x===x&&o.y===y);
    const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];while(q.length){{const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){{const a=x+dx,b=y+dy,k=a+','+b;if(!seen.has(k)&&!S(a,b)){{seen.add(k);q.push([a,b])}}}}}}
    const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((n.x+dx)+','+(n.y+dy)));
    return {{tile:M.grid[n.y][n.x],at:[n.x,n.y],reachable:adj,trainerOnTile:WORLD.npcs.filter(o=>o.trainer).map(o=>[o.x,o.y].join())}}}})()""")
  print(f"  {nid:5s} {mid:9s}", r)
# 2) remark table: which conditions produce a line for Mae, Mom (indoor) and a shopkeeper
def line(nid, wk, indoor=None):
  where='in-home' if indoor else 'town'
  return pg.evaluate(f"(()=>{{window.__weather={wk!r}; WORLD.enter({where!r}); const n=WORLD.npcs.find(x=>x.id==={nid!r}); APP.talk(n); return APP.dialog.lines.slice()}})()")
print('Mae, clear noon  ->', line('mae','clear')[:1])
for wk in ['rain','storm','snow','fog','sun','ash']:
  l=line('mae',wk); print(f'Mae, {wk:5s} ->', l[0] if len(l)>2 else 'NO EXTRA LINE')
print('Mom indoors, rain ->', line('mom','rain',True)[:1])
print('Mom indoors, clear noon ->', line('mom','clear',True)[:1])
# stability: the same line while the weather block lasts
a=line('mae','rain')[0]; c=line('mae','rain')[0]; print('stable repeat:', a==c)
# all lines are short enough for the dialogue box
lens=pg.evaluate("(()=>{let max=0,n=0;for(const s of [FLAVOR.OUT,FLAVOR.IN])for(const c of Object.values(s))for(const v of Object.values(c))for(const t of v){n++;max=Math.max(max,t.length)}for(const v of Object.values(FLAVOR.NPC))for(const t of Object.values(v)){n++;max=Math.max(max,t.length)}return [n,max]})()")
print('flavor lines / longest:', lens)
# setting off: weather line gone
pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{weather:false})})")
print('weather setting off, rain override ->', 'extra' if len(line('mae','rain'))>2 else 'no extra line (correct)')
b.close()
# 3) night
pg,b=open_at(23)
pg.evaluate("window.__weather='clear'; WORLD.enter('town')")
n=pg.evaluate("(()=>{const n=WORLD.npcs.find(x=>x.id==='mae');APP.talk(n);return APP.dialog.lines.slice()})()")
print('Mae at 23:00 clear ->', n[0])
pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{daynight:false})})")
n=pg.evaluate("(()=>{const n=WORLD.npcs.find(x=>x.id==='mae');APP.talk(n);return APP.dialog.lines.slice()})()")
print('day/night off at 23:00 ->', 'extra' if len(n)>2 else 'no extra line (correct)')
b.close()
print('errors:', errs or 'none'); PW.stop()
