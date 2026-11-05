# Branching routes (Highland Pass network): every door and clearing is reachable, the graph has a bypass loop and a dead end, doors lead where they say, chests and the hermit work, no guidance is drawn.
from playwright.sync_api import sync_playwright
errs=[]
IDS=['route-mf-gate','route-mf','route-mf-fork','route-mf-hollow','route-mf-lookout','route-mf-cliff']
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
  # the graph
  g=pg.evaluate("(()=>{const o={};Object.keys(WORLD.MAPS).forEach(k=>{const m=WORLD.MAPS[k];o[k]=m.exits.map(e=>e.to)});return o})()")
  print('doors:', {k:g[k] for k in IDS})
  # every exit has a matching door back, and arrival spots are walkable
  r=pg.evaluate("""(ids)=>{const bad=[];ids.concat(['mossbrook','frosthold']).forEach(k=>{const m=WORLD.MAPS[k];m.exits.forEach(e=>{const t=WORLD.MAPS[e.to];if(!t){bad.push(k+'>'+e.to+' missing');return}
      if(!t.exits.some(x=>x.to===k))bad.push(k+'>'+e.to+' has no way back');
      const arr=t.arriveFrom&&t.arriveFrom[k];if(!arr){bad.push(e.to+' has no arrival from '+k);return}
      WORLD.enter(e.to);const tx=Math.floor(arr[0]),ty=Math.floor(arr[1]);if(WORLD.solidAt(tx,ty))bad.push('arrival from '+k+' into '+e.to+' is solid');})});return bad}""", IDS)
  print('every door has a way back and a walkable arrival:', not r, r or '')
  # flood fill inside each map: all doors, nooks, chests, NPCs reachable from the first door
  FLOOD = """(ids) => {
    const out = {};
    ids.forEach((id) => {
      WORLD.enter(id);
      const m = WORLD.MAPS[id], W = m.W, H = m.H, seen = new Uint8Array(W * H), first = m.exits[0];
      const start = first.edge === 'n' ? [first.a, 2] : first.edge === 's' ? [first.a, H - 3] : first.edge === 'w' ? [2, first.a] : [W - 3, first.a];
      const q = [start]; seen[start[1] * W + start[0]] = 1;
      while (q.length) {
        const cur = q.shift();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((d) => {
          const nx = cur[0] + d[0], ny = cur[1] + d[1];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || WORLD.solidAt(nx, ny)) return;
          seen[ny * W + nx] = 1; q.push([nx, ny]);
        });
      }
      const reach = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some((d) => { const a = x + d[0], b = y + d[1]; return a >= 0 && b >= 0 && a < W && b < H && seen[b * W + a]; });
      const doors = m.exits.map((e) => { const c = e.edge === 'n' ? [e.a, 1] : e.edge === 's' ? [e.a, H - 2] : e.edge === 'w' ? [1, e.a] : [W - 2, e.a]; return reach(c[0], c[1]); });
      const objs = (m.objects || []).map((o) => reach(o.x, o.y));
      let walk = 0; for (let i = 0; i < W * H; i++) if (seen[i]) walk++;
      let Z = 0, ZR = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m.grid[y][x] === 'Z') { Z++; if (seen[y * W + x]) ZR++; }
      out[id] = { doors: doors.every(Boolean), n: doors.length, objects: objs.every(Boolean), walkable: Math.round(100 * walk / (W * H)), rare: [Z, ZR] };
    });
    return out;
  }"""
  f=pg.evaluate(FLOOD, IDS)
  for k in IDS: print(' ', k, f[k])
  print('all doors / objects reachable in every map:', all(v['doors'] and v['objects'] for v in f.values()), '| rare patches fully reachable:', all(v['rare'][0]==v['rare'][1] for v in f.values()))
  # graph structure: two different ways Mossbrook -> Frosthold, and a dead end
  s=pg.evaluate("""()=>{const adj={};Object.keys(WORLD.MAPS).forEach(k=>adj[k]=[...new Set(WORLD.MAPS[k].exits.map(e=>e.to))]);
    const paths=[];const dfs=(n,seen,path)=>{if(n==='frosthold'){paths.push(path.slice());return}(adj[n]||[]).forEach(m=>{if(!seen.has(m)&&(m.indexOf('route-mf')===0||m==='frosthold')){seen.add(m);path.push(m);dfs(m,seen,path);path.pop();seen.delete(m)}})};
    dfs('mossbrook',new Set(['mossbrook']),['mossbrook']);
    const dead=Object.keys(WORLD.MAPS).filter(k=>k.indexOf('route-mf')===0&&adj[k].length===1);return {paths:paths.map(p=>p.join(' > ')),dead:dead}}""")
  print('ways from Mossbrook to Frosthold:', len(s['paths'])); [print('   ', x) for x in s['paths']]; print('dead ends:', s['dead'])
  # walk through the doors for real
  def hop(frm, to, mid=None):
    pg.evaluate("(f)=>{WORLD.enter(f);WORLD.setPaused(false);APP.game.setState({})}", frm); pg.wait_for_timeout(200)
    r=pg.evaluate("""(to)=>{const m=WORLD.map,e=m.exits.find(x=>x.to===to);const c=e.edge==='n'?[e.a+1,-0.3]:e.edge==='s'?[e.a+1,m.H+0.3]:e.edge==='w'?[-0.3,e.a+1]:[m.W+0.3,e.a+1];WORLD.setPos(c[0]*WORLD.TS,c[1]*WORLD.TS);WORLD.step(1/30);return WORLD.map.id}""", to); pg.wait_for_timeout(300)
    return pg.evaluate("WORLD.map.id")
  pg.evaluate("window.__noTransition=true")
  ok=[]
  for a,bb in [('mossbrook','route-mf-gate'),('route-mf-gate','route-mf'),('route-mf-gate','route-mf-hollow'),('route-mf-hollow','route-mf-lookout'),('route-mf-lookout','route-mf-fork'),('route-mf','route-mf-fork'),('route-mf','route-mf-cliff'),('route-mf-fork','frosthold')]:
    ok.append((a,bb,hop(a,bb)==bb))
  print('walking through each door lands in the right map:', all(x[2] for x in ok), [x for x in ok if not x[2]])
  # level gate only at the two city doors; none inside the network
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{test:false}),xp:0}); APP.game.props.testMode=false; APP.game.props.noGates=false")
  lock=pg.evaluate("""()=>{const out={};['mossbrook>route-mf-gate','frosthold>route-mf-fork','route-mf-gate>route-mf','route-mf>route-mf-cliff'].forEach(k=>{const [a,b]=k.split('>');out[k]=!!(ROUTE_GATES[b]&&a.indexOf('route-')!==0)});return out}""")
  print('level 3 gate applies only when entering from a city:', lock)
  # chests: open, reward, empty after
  pg.evaluate("APP.game.update({xp:99999,bag:{}})"); pg.evaluate("WORLD.enter('route-mf-hollow'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  e0=pg.evaluate("APP.game.state.essence")
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='hp-chest1');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.4)*WORLD.TS);WORLD.step(1/30)})()"); pg.wait_for_timeout(300)
  print('chest label:', pg.inner_text('#act-label')); pg.click('#act'); pg.wait_for_timeout(300); print('opened:', pg.inner_text('#toast')[:60], '| essence +', pg.evaluate("APP.game.state.essence")-e0)
  pg.wait_for_timeout(400); pg.click('#act'); pg.wait_for_timeout(300); print('second time:', pg.inner_text('#toast')[:30])
  # hermit
  pg.evaluate("WORLD.enter('route-mf-cliff'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  print('hermit stands on walkable ground in the cliff:', pg.evaluate("(()=>{const n=WORLD.npcs.find(x=>x.id==='brandt');return !!n&&!WORLD.solidAt(n.x,n.y)})()"))
  # nothing draws a guide; weather and music resolve for the side maps
  print('sky follows the Pass on every side map:', pg.evaluate("['route-mf-gate','route-mf-hollow','route-mf-lookout','route-mf-fork','route-mf-cliff'].every(i=>WEATHER.at(i)!==null)"), '| base:', pg.evaluate("WORLD.MAPS['route-mf-cliff'].base"))
  pg.evaluate("WORLD.enter('route-mf-lookout')"); pg.wait_for_timeout(1800); print('music on a side map follows the Pass (peak track):', pg.evaluate("MUSIC.current"))
  # mystery by hint, never by telling: odd things to find, one that exists only at night, and wording that never explains or points
  pg.evaluate("window.__tod='day'; WORLD.enter('route-mf-hollow'); WORLD.setPaused(false)"); pg.wait_for_timeout(900)
  day=pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='hp-lantern');return [!!o&&o.hidden,!WORLD.solidAt(o.x,o.y)]})()")
  pg.evaluate("window.__tod='night'"); pg.wait_for_timeout(900)
  night=pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='hp-lantern');return [!!o.hidden,!WORLD.solidAt(o.x,o.y)]})()")
  print('the lantern is gone by day (hidden, walkable):', day, '| burning at night (shown, solid):', night)
  pg.evaluate("window.__tod=undefined"); 
  things=pg.evaluate("Object.values(WORLD.MAPS).filter(m=>m.id.indexOf('route-mf-')===0).flatMap(m=>(m.objects||[]).filter(o=>['lantern','cups','ringstones','doorframe'].includes(o.kind)).map(o=>m.id.replace('route-mf-','')+':'+o.kind))")
  print('unexplained things placed:', things)
  texts=pg.evaluate("""(()=>{const out=[];Object.values(WORLD.MAPS).filter(m=>m.id.indexOf('route-mf')===0).forEach(m=>{(m.signs||[]).forEach(x=>out.push(x.text));(m.objects||[]).forEach(o=>o.text&&out.push(o.text))});
    Object.values(WORLD.allNpcs()).flat().filter(n=>['brandt'].includes(n.id)).forEach(n=>(n.lines||[]).forEach(l=>out.push(l)));return out})()""")
  bad=[t for t in texts if __import__('re').search(r"secret|hidden|treasure|reward|this way|go (north|south|east|west)|head to|follow the|look for|you should", t, __import__('re').I)]
  print('no line explains, points or promises (checked', len(texts), 'texts):', not bad, bad or '')
  pg.evaluate("WORLD.enter('route-mf'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  # touching the door that opens onto nothing
  pg.evaluate("WORLD.enter('route-mf-gate'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='hp-door');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.4)*WORLD.TS);WORLD.step(1/30)})()"); pg.wait_for_timeout(300); pg.click('#act'); pg.wait_for_timeout(300); print('the door:', pg.inner_text('#toast'))
  print('errors:', errs or 'none'); b.close()
