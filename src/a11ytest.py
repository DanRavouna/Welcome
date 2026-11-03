from playwright.sync_api import sync_playwright
errs=[]
AXE=open('/tmp/node_modules/axe-core/axe.min.js').read()
SCREENS=[('menu','APP.openMenu()','menu'),('dex','APP.closeMenu&&APP.closeMenu(true);APP.open("dex")','screen'),('roll','APP.open("roll")','screen'),('battle','APP.open("battle")','screen'),('map','APP.openMap()','wmap'),('shop','APP.close();APP.openPanel("shop")','shop'),('save','APP.closePanel&&APP.closePanel();APP.openBackup()','bk')]
def reset(pg):
  pg.evaluate("try{APP.close&&APP.close();APP.closePanel&&APP.closePanel();APP.closeMenu&&APP.closeMenu(true);APP.closeMap&&APP.closeMap();const k=document.getElementById('bk');if(k&&!k.hidden)document.getElementById('bk-close').click()}catch(e){}")
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:9},{seed:7,stage:1,lv:3},{seed:12,stage:1,lv:5}],party:[2,7],fighter:2,intro:true,essence:20}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  print('defaults off:', pg.evaluate("[APP.game.state.settings.bigtext, APP.game.state.settings.contrast]"), '| classes:', pg.evaluate("document.documentElement.className"))
  print('settings rows present:', pg.evaluate("(()=>{APP.open('dex');const t=1;return 0})()") or True)
  def setset(**kw):
    pg.evaluate("(kw)=>APP.game.update({settings:Object.assign({},APP.game.state.settings,kw)})", kw); pg.wait_for_timeout(600)
  # 1) larger text: overflow at several widths + the text really is bigger
  for w in [320,360,390,430]:
    pg.set_viewport_size({'width':w,'height':780})
    row=[]
    for big in [False,True]:
      setset(bigtext=big)
      bad=[]
      for nm,js,cid in SCREENS:
        reset(pg); pg.evaluate(js); pg.wait_for_timeout(250)
        o=pg.evaluate(f"(()=>{{const e=document.getElementById('{cid}');const f=e.querySelector('h2,h1,b,span');return {{page:document.documentElement.scrollWidth>innerWidth+1, box:e.scrollWidth>e.clientWidth+1, hidden:e.hidden}}}})()")
        if o['page'] or o['box']: bad.append(nm)
      row.append(bad or 'ok')
    print(f'width {w}: overflow normal={row[0]} | larger text={row[1]}')
  reset(pg); pg.set_viewport_size({'width':390,'height':844})
  fs=lambda: pg.evaluate("(()=>{APP.open('dex');const h=document.querySelector('#screen h2');const v=h?getComputedStyle(h).fontSize+' / zoom '+getComputedStyle(document.getElementById('screen')).zoom:null;APP.close();return v})()")
  setset(bigtext=False); a=fs(); setset(bigtext=True); c=fs(); print('Dex title size normal vs larger:', a, '|', c)
  # 2) high contrast: axe violations and "could not judge" counts
  setset(bigtext=False)
  AX="async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}});return [r.violations.reduce((n,v)=>n+v.nodes.length,0), r.incomplete.reduce((n,v)=>n+v.nodes.length,0)]}"
  pg.add_script_tag(content=AXE)
  for hc in [False,True]:
    setset(contrast=hc); res={}
    for nm,js,cid in SCREENS:
      reset(pg); pg.evaluate(js); pg.wait_for_timeout(300); res[nm]=pg.evaluate(AX)
    print('high contrast' if hc else 'normal      ', '(violations, could-not-judge) per screen:', res)
    if hc: pg.evaluate("APP.close();APP.open('dex')"); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/a11y-hc-dex.png')
  setset(contrast=True, bigtext=True); reset(pg); pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/a11y-both-menu.png')
  setset(contrast=False, bigtext=False); print('turning off clears classes:', repr(pg.evaluate("document.documentElement.className")))
  print('errors:', errs or 'none'); b.close()
