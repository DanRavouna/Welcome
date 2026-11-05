# The deep layer on the main path: keepers rest once you have carried the light; the land answers (lighthouse beams, the arch glows, home's window is lit by day).
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,npc:{done:[],beaten:{},cleared:['maren','hale','keeper'],seals:[]}}); DEV.safe=true; window.__noTransition=true; window.__tod='day'")
  def say(who):
    pg.evaluate("(id)=>{const all=WORLD.allNpcs();let n;for(const k in all){n=all[k].find(x=>x.id===id)||n}APP.talk(n)}",who); pg.wait_for_timeout(120)
    out=[]
    for _ in range(8):
      if not pg.evaluate("!!APP.dialog"): break
      out.append(pg.evaluate("(()=>{const d=document.getElementById('dlg');return d?d.innerText.replace(/\\n+/g,' / '):''})()")[-110:]); pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
    for _ in range(12):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(30)
    return out[-1:] if out else out
  setf=lambda k,v:pg.evaluate("([k,v])=>APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},(APP.game.state.adv||{}).flags,{[k]:v})})})",[k,v])
  for who,flag in [('maren','lampLit'),('hale','forgeLit'),('keeper','secret'),('joss','lampLit'),('brandt','lampLit'),('mom','lampLit')]:
    setf(flag,False); a=say(who); setf(flag,True); c=say(who); print(who,'before:',a,'| after',flag+':',c); setf(flag,False)
  # the land answers
  def shot(mapid,seals,lamp):
    pg.evaluate("([s,l])=>{APP.game.update({npc:{done:[],beaten:{},cleared:['maren','hale','keeper'],seals:['wren','glacia','blaze','coral'].slice(0,s)}});}",[seals,lamp]); setf('lampLit',lamp)
    pg.evaluate("(m)=>{WORLD.enter(m);WORLD.setPaused(true)}",mapid); pg.wait_for_timeout(300)
  def px(mapid,seals,lamp,pt):
    shot(mapid,seals,lamp)
    return pg.evaluate("""([pt])=>{const cv=document.querySelector('canvas'),g=cv.getContext('2d');const M=WORLD.map;let x,y;
      if(pt==='home'){const h=M.places.find(q=>q.id==='home');WORLD.setPos((h.x+3.5)*32,(h.y+h.h+2)*32);WORLD.drawNow();const c=WORLD.debug().cam;x=h.x*32+16+14-c.cx;y=h.y*32+Math.round(h.h*16)+8+10-c.cy}
      else{const l=M.props.find(q=>q.id==='lighthouse');WORLD.setPos((l.x+1)*32,(l.y+l.h+3)*32);WORLD.drawNow();const c=WORLD.debug().cam;x=(l.x+l.w/2)*32-c.cx;y=(l.y+0.6)*32-c.cy-60}
      WORLD.drawNow();const d=g.getImageData(Math.round(x*devicePixelRatio),Math.round(y*devicePixelRatio),1,1).data;return [d[0],d[1],d[2]]}""",[pt])
  h0=px('town',0,False,'home'); h3=px('town',3,False,'home'); print('home window by day, 0 seals vs 3 seals:',h0,h3,'| lit only with 3 seals:',h3[2]<h0[2]-60)
  l0=px('route-fc',0,False,'light'); l1=px('route-fc',4,True,'light'); print('lighthouse beam above the lamp, lamp dark vs lit:',l0,l1,'| beam only when lit:',l1[2]<l0[2]-15)
  print('errors:', errs or 'none'); b.close()
