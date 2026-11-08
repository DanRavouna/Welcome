# The Arena ladder (Meaning: a road of its own; five rivals climbed one a day, in front of others): the next rival waits on the sand and the others at their tents;
# a rival out of order will not fight; one ladder fight a day, win or lose; a climbed rival can be fought again like any trainer; the top step hands over Kindlemane and the rail takes your name.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  REV=pg.evaluate("APP.build")=='review'   # the review copy (11's item 25): the day is stamped on the WIN, so a lost ladder fight can be tried again today; the day's rival sits and says nothing
  pg.evaluate("APP.game.update({caught:[{seed:2,stage:2,lv:12},{seed:7,stage:2,lv:12}],party:[2,7],intro:true,hints:['party','shop','evolve','weather','zone','grass','keep','battle'],essence:0}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  pg.evaluate("WORLD.enter('arena')"); pg.wait_for_timeout(200)
  rivals=lambda: pg.evaluate("WORLD.allNpcs().arena.filter(n=>n.ladder).map(n=>[n.id,n.ladder,n.x,n.y])")
  r=rivals(); check('five rivals in ladder order', [x[0] for x in sorted(r,key=lambda x:x[1])]==['juno','bastian','sable','halvard','ash'], r)
  check('step 0: Juno waits on the sand, the others by their tents', [x for x in r if x[0]=='juno'][0][2:]==[20,7] and all(x[2]<10 for x in r if x[0]!='juno'), r)
  ready=lambda: pg.evaluate("WORLD.allNpcs().arena.filter(n=>n.ladder).map(n=>[n.id, APP.game.ladderReady(n)])")
  check('only Juno can be fought first', dict(ready())=={'juno':True,'bastian':False,'sable':False,'halvard':False,'ash':False}, ready())
  # Bastian, out of order: the dialog says not yet, no duel starts
  pg.evaluate("(()=>{const n=WORLD.allNpcs().arena.find(x=>x.id==='bastian'); APP.talk(n);})()"); pg.wait_for_timeout(120)
  check('Bastian out of order: a line, no fight', pg.evaluate("APP.dialog && APP.dialog.lines.join(' ')")=='Juno first. That is the order.' and not pg.evaluate("ACT.dueling()"), pg.evaluate("APP.dialog && APP.dialog.lines"))
  pg.evaluate("APP.advance(); APP.advance()"); pg.wait_for_timeout(100)
  # a ladder win, through the same settle path a duel uses
  def win(id, ladder, reward, won=True):
    return pg.evaluate("""([id,ladder,reward,won,rev])=>{const g=APP.game; const me=g.make(2,2,12), foe=g.make(31,2,10); const nb=g.newBattle(me, foe, 0); const lead=nb.s[0], f=nb.s[1]; if(won) f.hp=0; else lead.hp=0;
      const lines=g.actDuelEnd({id:id, name:id, reward:reward, winLine:'x', ladder:ladder}, won, {lead:lead, foe:f, bench:[], part:{2:true}, koXp:{}});
      if(!rev) APP.game.update({arena:Object.assign({step:0},g.state.arena,{day:new Date().toDateString()})});   // what startTrainer stamps when the fight begins (the review copy stamps the win itself)
      return [g.ladderStep(), g.state.essence, ((g.state.npc||{}).cleared||[]).indexOf(id)!==-1];}""",[id,ladder,reward,won,REV])
  if REV:   # a loss first: the day is not spent, Juno can be tried again today
    r=win('juno',1,14,False)
    check('review copy: losing to Juno spends nothing: step 0, no essence, the day not stamped, Juno ready again today', r==[0,0,False] and not pg.evaluate("APP.game.ladderFoughtToday()") and dict(ready())['juno']==True, [r, ready()])
  r=win('juno',1,14); check('beating Juno: step 1, +14 essence, cleared', r==[1,14,True], r)
  pg.evaluate("APP.placeRivals ? APP.placeRivals(WORLD.allNpcs().arena) : null")
  check('after the win the day is spent: Bastian waits until tomorrow', dict(ready())['bastian']==False and pg.evaluate("APP.game.ladderFoughtToday()"))
  pg.evaluate("(()=>{const n=WORLD.allNpcs().arena.find(x=>x.id==='bastian'); APP.talk(n);})()"); pg.wait_for_timeout(120)
  if REV:
    check('review copy: the win stamped the day by itself (nothing stamped at the start of a fight)', pg.evaluate("APP.game.ladderFoughtToday()"))
    check('Bastian the same day: one a day (review copy: he sits by the fire and says nothing; no fight)', not pg.evaluate("!!APP.dialog") and not pg.evaluate("ACT.dueling()") and pg.evaluate("(()=>{const n=WORLD.allNpcs().arena.find(x=>x.id==='bastian');return [n.x,n.y]})()")==[9,13], [pg.evaluate("APP.dialog && APP.dialog.lines"), pg.evaluate("(()=>{const n=WORLD.allNpcs().arena.find(x=>x.id==='bastian');return [n.x,n.y]})()")])
  else:
    check('Bastian the same day: one a day', pg.evaluate("APP.dialog && APP.dialog.lines.join(' ')")=='One a day. Come back with the sun.', pg.evaluate("APP.dialog && APP.dialog.lines")); pg.evaluate("APP.advance(); APP.advance()")
  check('the Challenger title is earned on the first step', 'challenger' in pg.evaluate("APP.game.state.titles||[]"))
  # a new day: Bastian is ready, Juno can be fought again (a rematch, like any trainer)
  pg.evaluate("APP.game.update({arena:Object.assign({},APP.game.state.arena,{day:'yesterday'})})")
  check('next day: Bastian ready, Juno ready for a rematch, Sable still waits', dict(ready())=={'juno':True,'bastian':True,'sable':False,'halvard':False,'ash':False}, ready())
  for id,l,rw in [('bastian',2,18),('sable',3,22),('halvard',4,26)]:
    win(id,l,rw); pg.evaluate("APP.game.update({arena:Object.assign({},APP.game.state.arena,{day:'yesterday'})})")
  check('four steps climbed', pg.evaluate("APP.game.ladderStep()")==4)
  before=pg.evaluate("APP.game.state.caught.length")
  r=win('ash',5,30)
  check('beating Ash: step 5 and Kindlemane joins (a secret, level 16, one form)', r[0]==5 and pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET4_SEED && e.stage===3 && e.lv===16)") and pg.evaluate("APP.game.state.caught.length")==before+1, [r, pg.evaluate("APP.game.state.caught.map(e=>e.seed)")])
  k=pg.evaluate("(()=>{const k=APP.game.make(SECRET4_SEED,3,16); return [k.name,k.element.name,k.rarity,k.ability.name,k.speciesNo];})()")
  check('Kindlemane: Ember, Mythic, Standfast, no. 52', k==['Kindlemane','Ember','Mythic','Standfast',52], k)
  check('Ring Champion earned', 'ringchamp' in pg.evaluate("APP.game.state.titles||[]"))
  check('Kindlemane is listed with the secrets in the Dex once the ladder is climbed', pg.evaluate("APP.game.renderVals().bonusList.some(x=>x.name==='Kindlemane')"))
  pg.evaluate("WORLD.enter('town'); WORLD.enter('arena')"); pg.wait_for_timeout(800); r=rivals()   # the NPC pass runs every 500 ms
  check('after the climb every rival sits by a tent (placed again on entering the Arena)', all(x[2]<10 for x in r), r)
  check('Standfast: below half HP Kindlemane takes less', pg.evaluate("""(()=>{const g=APP.game; const k=g.make(SECRET4_SEED,3,16), a=g.make(5,3,16); const nb=g.newBattle(a,k,0); const D=nb.s[1], A=nb.s[0]; const rnd=()=>0.5; D.hp=D.max; g.hit(A,D,60,rnd); const full=D.max-D.hp; D.hp=Math.round(D.max*0.3); const h0=D.hp; g.hit(A,D,60,rnd); const low=h0-D.hp; return low<full;})()"""))
  check('no page errors', not errs, errs); b.close()
done()
