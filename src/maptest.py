# The overview map: every outdoor map has a spot, regular places are grey until visited, secret places (dead ends, dungeons) are not drawn until found, links follow, visits persist, old saves are inferred.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,visited:[],npc:{done:[],beaten:{},cleared:[],seals:[]}}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true; window.__noTransition=true")
  for _ in range(30):
    if pg.evaluate("!!APP.dialog"): pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  # coverage and spacing
  cov=pg.evaluate("""()=>{const missing=Object.keys(WORLD.MAPS).filter(k=>!WORLD.MAPS[k].interior&&!WORLD.MAPS[k].hall&&!MAP_LAYOUT[k]);const extra=Object.keys(MAP_LAYOUT).filter(k=>!WORLD.MAPS[k]);
    const ids=Object.keys(MAP_LAYOUT),overlap=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const a=MAP_LAYOUT[ids[i]],b=MAP_LAYOUT[ids[j]];if(Math.abs(a[0]-b[0])<(a[2]+b[2])/2+0.05&&Math.abs(a[1]-b[1])<(a[2]+b[2])/2+0.05)overlap.push(ids[i]+'~'+ids[j])}
    const outside=ids.filter(k=>{const a=MAP_LAYOUT[k];return a[0]-a[2]/2<0||a[1]-a[2]/2<0||a[0]+a[2]/2>12||a[1]+a[2]/2>13});return {missing,extra,overlap,outside,n:ids.length}}""")
  print('every outdoor map has a place on the overview:', not cov['missing'], cov['missing'] or '', '| unknown ids:', cov['extra'] or 'none', '| nodes overlapping:', cov['overlap'] or 'none', '| outside the canvas:', cov['outside'] or 'none', '| nodes:', cov['n'])
  # a fresh player: only Sproutvale is lit, secrets are hidden, everything else grey
  pg.evaluate("WORLD.enter('town'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  f=pg.evaluate("(()=>{const i=APP.layoutInfo();const c={};i.nodes.forEach(n=>c[n.state]=(c[n.state]||0)+1);return {states:c,litIds:i.nodes.filter(n=>n.state==='lit').map(n=>n.id),links:i.links.filter(l=>l.state==='lit').length,hiddenAreSecret:i.nodes.filter(n=>n.state==='hidden').every(n=>n.secret),greyAreRegular:i.nodes.filter(n=>n.state==='grey').every(n=>!n.secret)}})()")
  print('new player: lit', f['litIds'], '| counts', f['states'], '| lit links:', f['links'], '| hidden are all secret:', f['hiddenAreSecret'], '| grey are all regular:', f['greyAreRegular'])
  # secret nodes: dead ends and dungeons only
  sec=pg.evaluate("Object.keys(MAP_LAYOUT).filter(k=>MAP_LAYOUT[k][3]).sort()"); print('secret places:', sec)
  # visiting records the map; a secret appears when found, and its link appears (grey until both ends are known)
  pg.evaluate("WORLD.enter('moss'); WORLD.enter('route-mf-gate'); WORLD.enter('route-mf'); WORLD.setPaused(false)"); pg.wait_for_timeout(400)
  print('visits recorded:', pg.evaluate("APP.game.state.visited"))
  before=pg.evaluate("(()=>{const i=APP.layoutInfo();return [i.nodes.find(n=>n.id==='route-mf-cliff').state,i.links.some(l=>l.a==='route-mf-cliff'||l.b==='route-mf-cliff')]})()")
  pg.evaluate("WORLD.enter('route-mf-cliff'); WORLD.setPaused(false)"); pg.wait_for_timeout(300)
  after=pg.evaluate("(()=>{const i=APP.layoutInfo();const l=i.links.find(l=>l.a==='route-mf-cliff'||l.b==='route-mf-cliff');return [i.nodes.find(n=>n.id==='route-mf-cliff').state,l&&l.state]})()")
  print('the cliff before / after being found (state, link):', before, '->', after)
  arch=pg.evaluate("APP.layoutInfo().nodes.find(n=>n.id==='dg-arch').state"); pg.evaluate("WORLD.enter('dg-arch'); WORLD.setPaused(false)"); pg.wait_for_timeout(300); print('a dungeon: hidden until entered:', arch, '->', pg.evaluate("APP.layoutInfo().nodes.find(n=>n.id==='dg-arch').state"))
  # what is drawn: lit places are coloured, grey ones have no colour, hidden ones are not drawn at all
  pg.evaluate("WORLD.enter('town'); WORLD.setPaused(false)"); pg.wait_for_timeout(300); pg.evaluate("APP.openMap()"); pg.wait_for_timeout(500)
  px=pg.evaluate("""()=>{const cv=document.getElementById('wm-canvas'),c=cv.getContext('2d'),k=cv.width/480;
      const at=(id,r)=>{const n=cv._nodes.find(m=>m.id===id);const d=c.getImageData(Math.round(n.x*40*k),Math.round((n.y*40-r+5)*k),1,1).data;return Math.max(d[0],d[1],d[2])-Math.min(d[0],d[1],d[2])};
      const sea=(x,y)=>{const d=c.getImageData(x*k,y*k,1,1).data;return [d[0],d[1],d[2]]};
      return {town:at('town',17),moss:at('moss',15),pass:at('route-mf',7.5),frost:at('frost',15),drawnHidden:cv._nodes.some(n=>n.state==='hidden'),corner:sea(470,510)}}""")
  print('icon colour strength: visited Sproutvale / Moss Forest / Highland Pass:', px['town'], px['moss'], px['pass'], '| unvisited Frost Peaks (grey):', px['frost'], '| hidden secrets are not drawn or tappable:', not px['drawnHidden'])
  print('visited places are coloured, grey ones are not:', min(px['town'],px['moss'],px['pass'])>30 and px['frost']<=22)
  print('count line:', pg.inner_text('#wm-count'))
  # one map with travel inside it: tap a place, the card under the map shows it, Travel is in the card
  box=pg.evaluate("(()=>{const cv=document.getElementById('wm-canvas'),r=cv.getBoundingClientRect(),f=(id)=>{const n=cv._nodes.find(m=>m.id===id);return [r.left+n.x/12*r.width,r.top+n.y/13*r.height]};return {town:f('town'),frost:f('frost'),moss:f('moss'),forge:[r.left+7/12*r.width,r.top+12.5/13*r.height],cliff:f('route-mf-cliff')}})()")
  def tap(k):
    pg.mouse.click(*box[k]); pg.wait_for_timeout(150); return pg.inner_text('#wm-info').replace('\n',' | ')
  print('tap Sproutvale:', tap('town'))
  print('tap Frost Peaks (grey, you are level 99):', tap('frost'), '| travel button:', pg.evaluate("!!document.querySelector('#wm-info [data-travel=frost]')"))
  print('tap where an undiscovered dungeon would be:', tap('forge'))
  pg.evaluate("APP.game.update({xp:0})"); pg.evaluate("APP.mapSelect('ember')"); print('a locked zone at level 1:', pg.inner_text('#wm-info').replace('\n',' | '), '| travel button:', pg.evaluate("!!document.querySelector('#wm-info [data-travel]')"))
  pg.evaluate("APP.mapSelect('cinderport')"); print('an undiscovered city:', pg.inner_text('#wm-info').replace('\n',' | '), '| travel button:', pg.evaluate("!!document.querySelector('#wm-info [data-travel]')"))
  pg.evaluate("APP.mapSelect('route-mf')"); print('a route you walked:', pg.inner_text('#wm-info').replace('\n',' | '), '| travel button:', pg.evaluate("!!document.querySelector('#wm-info [data-travel]')"))
  # keyboard: arrow keys move the selection, Enter travels
  pg.evaluate("APP.game.update({xp:99999})"); pg.evaluate("APP.mapSelect('town')"); pg.focus('#wm-canvas'); pg.keyboard.press('ArrowLeft'); pg.wait_for_timeout(100)
  print('arrow left from Sproutvale selects:', pg.inner_text('#wm-info').split('\n')[0]); pg.keyboard.press('Enter'); pg.wait_for_timeout(600); print('Enter travels:', pg.evaluate("WORLD.map.id"), '| map closed:', pg.evaluate("document.getElementById('wmap').hidden"))
  # the Travel button in the card
  pg.evaluate("APP.openMap()"); pg.wait_for_timeout(300); pg.evaluate("APP.mapSelect('town')"); pg.evaluate("document.querySelector('#wm-info [data-travel=town]').click()"); pg.wait_for_timeout(600); print('Travel button in the card works:', pg.evaluate("WORLD.map.id"))
  # persistence and old saves
  pg.reload(); pg.wait_for_timeout(1300); print('visits survive a reload:', pg.evaluate("APP.game.state.visited.length>=5"))
  pg.evaluate("APP.game.update({visited:[],npc:{done:[],beaten:{},cleared:['ivy','bram'],seals:['coral']}})"); pg.evaluate("WORLD.enter('town')"); pg.wait_for_timeout(300)
  print('an older save is inferred from progress (Ivy, Bram, Coral beaten):', pg.evaluate("APP.layoutInfo().nodes.filter(n=>n.state==='lit').map(n=>n.id).sort()"))
  print('errors:', errs or 'none'); b.close()
