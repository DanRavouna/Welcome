# All twelve city houses: each room is a statement inside its city's meaning, made of things to look at; door texts agree with the inside; nothing is a tip; every thing and every resident reachable; Wil (Mosscap Cottage) is away by day and home from dusk as the note says (away = not drawn, not solid, not talkable).
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999}); DEV.safe=true; window.__noTransition=true; window.__noFollower=true; window.__tod='day'; window.__weather='clear'; document.getElementById('starter').hidden=true")
  want={'in-house-fennel':['kettle','armchair','jars'],'in-house-moss':['baskets','herbs','wallmap'],'in-house-bryn':['drawings','shinyjar','smallbed'],'in-fh-a':['stool','tally','lantern','cloakpeg'],'in-fh-b':['furs','furs','ledger','kettle'],'in-fh-c':['souppot','bowls','armchair'],'in-cp-a':['anvil','toolwall','coals'],'in-cp-b':['broom','ashjar','sprouts'],'in-cp-c':['bunks','helmets','glowrock'],'in-cb-a':['logbook','oilcans','shiplist'],'in-cb-b':['nets','network','stool'],'in-cb-c':['shellrows','smallbed','bucket'],'in-home':['windowlamp','twochairs','photo','cloakpeg'],'in-lab':['notes','critterbasket']}
  reach=lambda: pg.evaluate("""()=>{const M=WORLD.map,S=new Set(['w','b','s','t','p','k','h','m','O']),walk=(x,y)=>x>=0&&y>=0&&x<M.W&&y<M.H&&!S.has(M.grid[y][x]);const seen=new Set(),q=[[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])]];seen.add(q[0].join());while(q.length){const [x,y]=q.shift();[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const k=(x+dx)+','+(y+dy);if(!seen.has(k)&&walk(x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy])}})}return [...seen]}""")
  tipwords=['tip','odds','one in two hundred','sparkling grass','rare ones','they say','you should','try ','whetstone','lure from the market','starts at the north end','links us to','full of ember','love the cold','all 48']
  for mid,kinds in want.items():
    pg.evaluate("(m)=>{WORLD.enter(m);WORLD.setPaused(false)}",mid); pg.wait_for_timeout(300)
    objs=pg.evaluate("WORLD.map.objects.map(o=>o.kind)")
    check(mid+': the room holds its things', sorted(objs)==sorted(kinds), objs)
    R=set(tuple(int(v) for v in c.split(',')) for c in reach()); pos=pg.evaluate("WORLD.map.objects.map(o=>[o.x,o.y]).concat((WORLD.allNpcs()[WORLD.map.id]||[]).map(n=>[n.x,n.y]))")
    check(mid+': every thing and the resident can be stood next to', all(any((x+dx,y+dy) in R for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))) for x,y in pos), pos)
    texts=pg.evaluate("WORLD.map.objects.map(o=>o.text).concat((WORLD.allNpcs()[WORLD.map.id]||[]).flatMap(n=>n.lines)).join(' | ')")
    check(mid+': nothing is a tip, everything is something to look at', not any(w in texts.lower() for w in tipwords), texts[:160])
    check(mid+': every thing has a line', pg.evaluate("WORLD.map.objects.every(o=>o.text&&o.text.length>10)"))
  # door texts agree with the inside
  doors=pg.evaluate("WORLD.MAPS.mossbrook.places.filter(p=>p.open==='house').map(p=>[p.id,p.text])")
  check('Clover\'s door: a kettle whistles, and nobody is said to be absent', any(i=='house-fennel' and 'kettle' in t.lower() and 'nobody' not in t.lower() for i,t in doors), doors)
  check("Bryn's door: the drawings have stars, like the ones inside", any(i=='house-bryn' and 'stars' in t.lower() for i,t in doors))
  # Wil keeps hours
  pg.evaluate("window.__tod='day'; WORLD.enter('in-house-moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(700)
  wil=lambda: pg.evaluate("(()=>{const n=(WORLD.allNpcs()['in-house-moss']||[])[0];return n?{hidden:!!n.hidden,x:n.x,y:n.y}:null})()")
  w=wil(); check('by day Wil is away (hidden)', w and w['hidden'], w)
  pg.evaluate("([x,y])=>WORLD.setPos((x+0.5)*32,(y+1.5)*32)",[w['x'],w['y']]); pg.wait_for_timeout(200)
  check('by day his spot is not a person to talk to', pg.inner_text('#act-label')!='Talk to Forager Wil', pg.inner_text('#act-label'))
  pg.evaluate("([x,y])=>{WORLD.setPos((x+0.5)*32,(y+1.5)*32);WORLD.input.jy=-1}",[w['x'],w['y']]); pg.wait_for_timeout(400); pg.evaluate("WORLD.input.jy=0")
  check('by day you can walk through where he stands (he is not there)', pg.evaluate("Math.floor(WORLD.pos().y/32)")<=w['y'], pg.evaluate("Math.floor(WORLD.pos().y/32)"))
  pg.evaluate("window.__tod='dusk'"); pg.wait_for_timeout(700); pg.evaluate("([x,y])=>WORLD.setPos((x+0.5)*32,(y+1.5)*32)",[w['x'],w['y']]); pg.wait_for_timeout(200)
  check('from dusk Wil is home and you can talk to him', not wil()['hidden'] and pg.inner_text('#act-label')=='Talk to Forager Wil', pg.inner_text('#act-label'))
  pg.evaluate("window.__tod='night'"); pg.wait_for_timeout(700); check('and at night', not wil()['hidden'])
  # the other two are always home
  pg.evaluate("window.__tod='day'"); pg.wait_for_timeout(700)
  check('Clover and Bryn\'s dad are always home', pg.evaluate("['in-house-fennel','in-house-bryn'].every(m=>!(WORLD.allNpcs()[m]||[])[0].hidden)"))
  # looking at a thing
  pg.evaluate("WORLD.enter('in-house-fennel'); WORLD.setPaused(false)"); pg.wait_for_timeout(200); pg.evaluate("(()=>{const o=WORLD.map.objects.find(q=>q.kind==='armchair');WORLD.setPos((o.x+0.5)*32,(o.y-0.5)*32)})()"); pg.wait_for_timeout(200)
  check('by the armchair the action is Examine', pg.inner_text('#act-label')=='Examine', pg.inner_text('#act-label')); pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(150)
  check('and it says what you see', 'worn' in pg.inner_text('#toast'), pg.inner_text('#toast'))
  check('no page errors', not errs, errs); b.close()
done()
