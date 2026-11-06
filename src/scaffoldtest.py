# The help that leaves as you earn seals (Meaning: you no longer need it kept for you): words only.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,hints:[],npc:{done:['fern'],beaten:{},cleared:[],seals:[]}}); DEV.safe=true; window.__weather='clear'; window.__tod='day'; window.__noTransition=true")
  def lines(who,seals):
    pg.evaluate("(s)=>APP.game.update({npc:Object.assign({},APP.game.state.npc,{seals:s})})",['wren','glacia','blaze','coral'][:seals])
    n=pg.evaluate("(id)=>{const all=WORLD.allNpcs();for(const k in all){const n=all[k].find(x=>x.id===id);if(n)return n}return null}",who)
    pg.evaluate("(id)=>{const all=WORLD.allNpcs();let n;for(const k in all){n=all[k].find(x=>x.id===id)||n}APP.talk(n)}",who); pg.wait_for_timeout(100)
    out=[]
    for _ in range(8):
      if not pg.evaluate("!!APP.dialog"): break
      out.append(pg.evaluate("(()=>{const d=APP.dialog;return d?d.name+' / '+d.lines.join(' / '):''})()")[:160])   # the dialog's own lines, not the typewriter text mid-animation; pg.evaluate("APP.advance()"); pg.wait_for_timeout(60)
    pg.evaluate("while(APP.dialog)APP.advance()")
    return out
  for who in ['pip','mira','mom','remy','fern']:
    for sc in range(5): print(who,'seals',sc,':',lines(who,sc))
  # tips: with no seal a hint shows, with a seal it does not (and nothing is recorded)
  pg.evaluate("APP.game.update({hints:[],npc:{done:[],beaten:{},cleared:[],seals:[]}})"); pg.evaluate("APP.hint('party','x tip')"); print('no seal: the tip is recorded:', pg.evaluate("APP.game.state.hints.includes('party')"))
  pg.evaluate("APP.game.update({hints:[],npc:{done:[],beaten:{},cleared:[],seals:['wren']}})"); pg.evaluate("APP.hint('party','x tip')"); print('one seal: tip recorded:', pg.evaluate("APP.game.state.hints"), '| the save tip still allowed:', (pg.evaluate("APP.hint('online','y');APP.game.state.hints")))
  print('errors:', errs or 'none'); b.close()
