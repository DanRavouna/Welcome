# Slagback, the third secret critter: data, Slow Burn, furnace hand-over, Dex bonus list, release block, reload.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  REV=pg.evaluate("APP.build")=='review'   # the review copy: the Forge ends quietly (11's item 24): no essence, no toast, no jingle, Slagback joins unannounced
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,essence:10,xp:99999,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})})")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  print('data:', pg.evaluate("(()=>{const g=APP.game,k=g.make(SECRET3_SEED,1,16),k3=g.make(SECRET3_SEED,3,16);return JSON.stringify({name:k.name,no:k.speciesNo,stage:k.stage,same:JSON.stringify(k.stats)===JSON.stringify(k3.stats),stats:k.stats.map(s=>s.value),type:k.element.name,ability:k.ability.name,kit:k.kit.map(m=>m.name),shiny:!!k.shiny,distinct:g.make(SECRET2_SEED,3,16).name!==k.name})})()"))
  r=pg.evaluate("""(()=>{const g=APP.game,w=g.make(SECRET3_SEED,3,16),foe=g.make(7,3,16);const N=4000;let burns=0,dur=null;
    for(let i=0;i<N;i++){const b=g.newBattle(w,foe,0);const A=b.s[0],D=b.s[1];D.hp=D.max;g.hit(A,D,10,Math.random);if(D.burn>0){burns++;dur=D.burn}}
    return {attackerBurnRate:burns/N,burnTurns:dur}})()""")
  print('Slow Burn:', r)
  pg.evaluate("DEV.safe=true; document.getElementById('tip')&&(document.getElementById('tip').hidden=true); APP.game.update({adv:{clues:[],open:{forge:true},flags:{}}}); APP.close&&APP.close(); WORLD.enter('dg-forge'); WORLD.map.rate=0; WORLD.setPaused(false); WORLD.npcs.forEach(n=>n.declined=true)"); finish(); pg.wait_for_timeout(300)
  def furn():
    pg.wait_for_timeout(300); finish(); pg.evaluate("(()=>{const s=document.getElementById('starter');if(s)s.hidden=true;document.getElementById('hud').hidden=false;WORLD.setPaused(false)})()")
    for dx,dy in [(0.5,1.5),(0.5,2.5),(-0.5,1.5),(1.5,1.5),(0.5,3.5)]:
      pg.evaluate("(([dx,dy])=>{WORLD.npcs.forEach(n=>n.declined=true);const o=WORLD.objects.find(x=>x.kind==='furnace');WORLD.setPos((o.x+dx)*WORLD.TS,(o.y+dy)*WORLD.TS)})(%s)"%[dx,dy]); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(250)
      if pg.evaluate("!document.getElementById('act').disabled"): break
    pg.click('#act'); pg.wait_for_timeout(300)
    if not pg.evaluate('!!APP.dialog'): pg.click('#act'); pg.wait_for_timeout(300)
  has=lambda: pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET3_SEED)")
  furn(); print('before Hale falls:', pg.inner_text('#toast')[:60], '| has Slagback:', has())
  pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['hale'])})})")
  e0=pg.evaluate("APP.game.state.essence"); t0=pg.evaluate("APP.game.state.titles.slice()")
  if REV: pg.evaluate("window.__sfx=[]; const g=APP.game, o=g.sfx.bind(g); g.sfx=(k)=>{window.__sfx.push(k); return o(k);}")
  furn(); n=pg.evaluate("APP.dialog.lines.length"); finish(); pg.wait_for_timeout(3600)
  print('first light: dialogue',n,'lines | lit:',pg.evaluate("!!APP.game.state.adv.flags.forgeLit"),'| essence +',pg.evaluate("APP.game.state.essence")-e0,'| Slagback:',has())
  if REV:
    te=pg.evaluate("(t0)=>TITLES.filter(t=>APP.game.state.titles.indexOf(t.id)!==-1 && t0.indexOf(t.id)===-1).reduce((n,t)=>n+(t.essence|0),0)", t0)
    check('review copy: the furnace itself pays no essence (only the titles it earns)', pg.evaluate("APP.game.state.essence")-e0==te, [pg.evaluate("APP.game.state.essence")-e0, te])
    check('review copy: no "essence" toast and no mythic jingle at the first light', 'essence +' not in pg.inner_text('#toast') and 'forge is lit' not in pg.inner_text('#toast').lower() and 'mythic' not in pg.evaluate("window.__sfx"), [pg.inner_text('#toast'), pg.evaluate("window.__sfx")])
    check('review copy: Slagback joins without opening the Dex', pg.evaluate("document.getElementById('screen').hidden"))
    pg.evaluate("APP.open('dex'); APP.game.setState({selected:SECRET3_SEED, dexView:'mine', armed:false})"); pg.wait_for_timeout(400)   # open it by hand to check the card and the release block
  print('detail:', [l for l in pg.inner_text('#screen').split('\n') if 'Slagback' in l or 'Slow Burn' in l][:4])
  REL='It stays with you' if REV else 'Cannot be released'   # the review copy's label for a secret critter (11's item 15 renamed release)
  pg.click("#screen button:has-text('%s')"%REL); pg.click("#screen button:has-text('%s')"%REL); pg.wait_for_timeout(200); print('release blocked:', has()); pg.evaluate("APP.close()")
  furn(); print('lit and owned:', pg.inner_text('#toast')[:60])
  pg.evaluate("APP.game.update({caught:APP.game.state.caught.filter(e=>e.seed!==SECRET3_SEED)})"); furn(); n=pg.evaluate("APP.dialog.lines.length"); finish(); pg.wait_for_timeout(1500)
  print('lit earlier, no Slagback: dialogue',n,'| now:',has())
  pg.evaluate("APP.close&&APP.close(); APP.game.setState({selected:null,dexView:'species'}); APP.open('dex')"); pg.wait_for_timeout(400); t=pg.inner_text('#screen'); pg.evaluate("APP.close()")
  print('Dex:', [l for l in t.split('\n') if 'Bonus species' in l or 'Slagback' in l or l.startswith('#051')])
  print('seen has 51, seen<=48 count:', pg.evaluate("[APP.game.state.seen.indexOf(51)!==-1, APP.game.state.seen.filter(x=>x<=48).length]"))
  pg.reload(); pg.wait_for_timeout(1300); print('after reload: kept', has(), '| (secrets stay out of seen, expected False) seen has 51:', pg.evaluate('APP.game.state.seen.indexOf(51)!==-1'))
  print('errors:', errs or 'none'); b.close()
done()
