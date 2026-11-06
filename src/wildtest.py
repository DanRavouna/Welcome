# Branching routes (all four route networks): every door and clearing reachable, a bypass loop and a dead end per route, doors lead where they say, level gates only at the city doors,
# chests / people work, things that exist only at certain hours, and wording that hints without explaining or pointing.
import re
from playwright.sync_api import sync_playwright
errs=[]
FLOOD = """(ids) => {
  const out = {};
  ids.forEach((id) => {
    WORLD.enter(id);
    const m = WORLD.MAPS[id], W = m.W, H = m.H, seen = new Uint8Array(W * H), first = m.exits[0];
    const start = first.edge === 'n' ? [first.a, 2] : first.edge === 's' ? [first.a, H - 3] : first.edge === 'w' ? [2, first.a] : [W - 3, first.a];
    const q = [start]; seen[start[1] * W + start[0]] = 1;
    while (q.length) { const cur = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => { const nx = cur[0] + d[0], ny = cur[1] + d[1]; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || WORLD.solidAt(nx, ny)) return; seen[ny * W + nx] = 1; q.push([nx, ny]); }); }
    const reach = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some((d) => { const a = x + d[0], b = y + d[1]; return a >= 0 && b >= 0 && a < W && b < H && seen[b * W + a]; });
    const doors = m.exits.map((e) => { const c = e.edge === 'n' ? [e.a, 1] : e.edge === 's' ? [e.a, H - 2] : e.edge === 'w' ? [1, e.a] : [W - 2, e.a]; return reach(c[0], c[1]); });
    const objs = (m.objects || []).map((o) => reach(o.x, o.y));
    let Z = 0, ZR = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m.grid[y][x] === 'Z') { Z++; if (seen[y * W + x]) ZR++; }
    out[id] = { doors: doors.every(Boolean), objects: objs.every(Boolean), rare: Z === ZR };
  });
  return out;
}"""
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true; window.__noTransition=true")
  nets=pg.evaluate("WORLD.NETS")
  ALL=[i for n in nets for i in n['ids']]
  print('networks:', [(n['base'], len(n['ids'])) for n in nets])
  # doors have a way back and a walkable arrival
  bad=pg.evaluate("""(ids)=>{const bad=[];ids.concat(['mossbrook','frosthold','cinderport','coralbay']).forEach(k=>{const m=WORLD.MAPS[k];m.exits.forEach(e=>{const t=WORLD.MAPS[e.to];if(!t){bad.push(k+'>'+e.to+' missing');return}
      if(!t.exits.some(x=>x.to===k))bad.push(k+'>'+e.to+' has no way back');const arr=t.arriveFrom&&t.arriveFrom[k];if(!arr){bad.push(e.to+' has no arrival from '+k);return}
      WORLD.enter(e.to);if(WORLD.solidAt(Math.floor(arr[0]),Math.floor(arr[1])))bad.push('arrival from '+k+' into '+e.to+' is solid')})});return bad}""", ALL)
  print('every door has a way back and a walkable arrival:', not bad, bad[:4] or '')
  f=pg.evaluate(FLOOD, ALL)
  print('all doors / objects reachable inside every map:', all(v['doors'] and v['objects'] for v in f.values()), [k for k,v in f.items() if not (v['doors'] and v['objects'])] or '', '| rare patches reachable:', all(v['rare'] for v in f.values()))
  # structure per network: at least two ways between its cities, and a dead end
  for n in nets:
    s=pg.evaluate("""(n)=>{const adj={};Object.keys(WORLD.MAPS).forEach(k=>adj[k]=[...new Set(WORLD.MAPS[k].exits.map(e=>e.to))]);const inNet=(m)=>n.ids.indexOf(m)!==-1;const paths=[];
      const dfs=(c,seen,path)=>{if(c===n.cityB){paths.push(path.join(' > '));return}(adj[c]||[]).forEach(m=>{if(!seen.has(m)&&(inNet(m)||m===n.cityB)){seen.add(m);path.push(m);dfs(m,seen,path);path.pop();seen.delete(m)}})};
      dfs(n.cityA,new Set([n.cityA]),[n.cityA]);return {paths:paths,dead:n.ids.filter(k=>adj[k].length===1)}}""", n)
    print(f"  {n['base']}: {len(s['paths'])} ways {n['cityA']} -> {n['cityB']} | dead ends: {s['dead']}")
    assert len(s['paths'])>=2 and s['dead']
  # walking through every door lands in the right map
  walked=pg.evaluate("""(ids)=>{const bad=[];ids.forEach(k=>{WORLD.MAPS[k].exits.forEach(e=>{WORLD.enter(k);WORLD.setPaused(false);const m=WORLD.map;const c=e.edge==='n'?[e.a+1,-0.3]:e.edge==='s'?[e.a+1,m.H+0.3]:e.edge==='w'?[-0.3,e.a+1]:[m.W+0.3,e.a+1];WORLD.setPos(c[0]*WORLD.TS,c[1]*WORLD.TS);WORLD.step(1/30);if(WORLD.map.id!==e.to)bad.push(k+'>'+e.to+' landed in '+WORLD.map.id)})});return bad}""", ALL)
  print('walking through every door lands in the right map:', not walked, walked[:3] or '')
  # level gates: only when entering a route from a city
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}),xp:0}); APP.game.props.testMode=false; APP.game.props.noGates=false")
  g=pg.evaluate("""(nets)=>{const out=[];nets.forEach(n=>{n.ids.forEach(id=>{WORLD.MAPS[id].exits.forEach(e=>{const fromCity=['mossbrook','frosthold','cinderport','coralbay'].indexOf(id)!==-1;const intoCity=['mossbrook','frosthold','cinderport','coralbay'].indexOf(e.to)!==-1;
      const gated=!!ROUTE_GATES[e.to]&&id.indexOf('route-')!==0; if(!intoCity&&gated)out.push('gated inside the network: '+id+'>'+e.to)})});
      ['cityA','cityB'].forEach(c=>{const city=WORLD.MAPS[n[c]];city.exits.filter(e=>e.to.indexOf(n.base)===0).forEach(e=>{if(!ROUTE_GATES[e.to])out.push('city door not gated: '+n[c]+'>'+e.to)})})});return out}""", nets)
  print('level gate only at the city doors:', not g, g or '')
  pg.evaluate("APP.game.update({xp:99999}); APP.game.props.testMode=true")
  # chests open once
  chests=pg.evaluate("Object.values(WORLD.MAPS).flatMap(m=>(m.id.indexOf('route-')===0?(m.objects||[]):[]).filter(o=>o.kind==='chest').map(o=>[m.id,o.id]))")
  results=[]
  for mid,oid in chests:
    pg.evaluate("(m)=>{WORLD.enter(m);WORLD.setPaused(false)}", mid); pg.wait_for_timeout(150)
    pg.evaluate("(o)=>{const ob=WORLD.objects.find(x=>x.id===o);WORLD.setPos((ob.x+0.5)*WORLD.TS,(ob.y+1.4)*WORLD.TS);WORLD.step(1/30)}", oid); pg.wait_for_timeout(200)
    pg.click('#act'); pg.wait_for_timeout(200); t1=pg.inner_text('#toast'); pg.wait_for_timeout(300); pg.click('#act'); pg.wait_for_timeout(200); t2=pg.inner_text('#toast')
    results.append((mid+'/'+oid,'You open the chest' in t1, 'empty' in t2))
  print(f'{len(chests)} chests: each opens once and is empty after:', all(a and c for _,a,c in results), '| failed:', [r for r in results if not (r[1] and r[2])])
  # people and unexplained things
  people=pg.evaluate("['brandt','hob','isla','orrin'].map(id=>{const e=Object.entries(WORLD.allNpcs()).find(([m,l])=>l.some(n=>n.id===id));if(!e)return id+' missing';const n=e[1].find(x=>x.id===id);const M=WORLD.MAPS[e[0]];return ['.',',','='].indexOf(M.grid[n.y][n.x])!==-1?'ok':id+' on '+M.grid[n.y][n.x]})")
  print('the four hermit-types stand on walkable ground:', people)
  things=pg.evaluate("Object.values(WORLD.MAPS).filter(m=>m.id.indexOf('route-')===0).flatMap(m=>(m.objects||[]).filter(o=>o.kind!=='chest').map(o=>m.id.replace('route-','')+':'+o.kind))")
  print('unexplained things placed:', things)
  # time-dependent things
  for mid,oid,when in [('route-mf-hollow','hp-lantern','night'),('route-cm-crossing','cm-stakes','dusk'),('route-fc-skerry','fc-skiff','dawn'),('route-cc-drowned','cc-glow','night')]:
    res={}
    for tod in ['day', when]:
      pg.evaluate("(a)=>{window.__tod=a[0];WORLD.enter(a[1]);WORLD.setPaused(false)}", [tod,mid]); pg.wait_for_timeout(1000)
      res[tod]=pg.evaluate("(o)=>{const ob=WORLD.objects.find(x=>x.id===o);return [!ob.hidden,WORLD.solidAt(ob.x,ob.y)]}", oid)
    print(f'  {oid} exists only at {when}: by day {res["day"]} -> at {when} {res[when]}', '| OK' if res['day']==[False,False] and res[when]==[True,True] else '| WRONG')
  pg.evaluate("window.__tod=undefined")
  # wording: no line explains, points or promises
  texts=pg.evaluate("""(()=>{const out=[];Object.values(WORLD.MAPS).filter(m=>m.id.indexOf('route-')===0&&m.id.length>8).forEach(m=>{(m.signs||[]).forEach(x=>out.push(x.text));(m.objects||[]).forEach(o=>o.text&&out.push(o.text))});
    Object.values(WORLD.allNpcs()).flat().filter(n=>['brandt','hob','isla','orrin'].includes(n.id)).forEach(n=>(n.lines||[]).forEach(l=>out.push(l)));return out})()""")
  badw=[t for t in texts if re.search(r"secret|hidden|treasure|reward|this way|go (north|south|east|west)|head to|follow the|look for|you should", t, re.I)]
  print(f'no line explains, points or promises ({len(texts)} texts):', not badw, badw or '')
  # music and sky follow the route
  print('sky follows the route on every side map:', pg.evaluate("(ids)=>ids.every(i=>WEATHER.at(i)!==null)", ALL))
  pg.evaluate("WORLD.enter('route-cc-shoals')"); pg.wait_for_timeout(1800); print('music on a side map:', pg.evaluate("MUSIC.current"))
  print('errors:', errs or 'none'); b.close()
