# Weekly Tower twist: rotation over 8 weeks, same all week.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  print('rotation over 8 weeks:', pg.evaluate("[0,7,14,21,28,35,42,49].map(d=>{const t=APP.game.towerTwist(new Date(2026,10,2+d)); return t.name+(t.id==='surge'?'('+t.type+')':'')})"))
  print('same twist all week (Mon..Sun):', pg.evaluate("new Set([0,1,2,3,4,5,6].map(d=>APP.game.towerTwist(new Date(2026,10,2+d)).week)).size===1"))
  print('this week:', pg.evaluate("APP.game.towerTwist().name + ' | ' + APP.game.towerTwist().text"))
  # each twist in play: floor reward, heal, mono types, surge damage
  for tw in ['surge','iron','wind','mono']:
    r=pg.evaluate(f"""(()=>{{const g=APP.game; const T=TWISTS.find(t=>t.id==='{tw}'); window.__twist=Object.assign({{}},T,{{week:5,type:'Ember',text:T.about('Ember')}}); g._teams={{}};
      const f5=g.towerFloor(5); const seeds=[5000,5001,5002]; g.update({{caught:seeds.map(s=>({{seed:s,stage:3,lv:20}})), party:seeds, fighter:5000, tower:{{best:0,day:'',runs:0,clears:0,run:null}}}});
      g.startTowerRun(); const t=g.towerState(); seeds.forEach(s=>t.run.hp[s]=1); g.update({{tower:t}});
      const tr=g.towerFloor(1); g.setState({{trainer:{{id:tr.id,name:tr.name,team:g.teamFor(tr),stage:tr.stage,lv:tr.lv,reward:tr.reward,winLine:tr.winLine,tower:true,floor:1,warden:false}},battle:null}});
      const nb=g.newBattle(g.make(5000,3,20), g.make(g.teamFor(tr)[0],tr.stage,tr.lv), tr.reward); nb.trainer={{id:tr.id,name:tr.name,team:[g.teamFor(tr)[0]],idx:0,stage:tr.stage,lv:tr.lv,winLine:tr.winLine,tower:true,floor:1}}; nb.s[1].hp=1; nb.bench=[]; g.setState({{battle:nb}});
      Math.random=(()=>{{let a=4;return()=>{{a=(a*16807)%2147483647;return a/2147483647}}}})(); for(let i=0;i<30&&!g.state.battle.over;i++) g.battleAction({{move:0}});
      const hp=g.towerState().run? g.towerState().run.hp[5001]:null, max=g.maxHp(5001);
      const monoTypes=[...new Set(g.teamFor(g.towerFloor(3)).map(sd=>g.make(sd,1).element.name))];
      return {{f5reward:f5.reward, healedTo:hp, expectHeal:1+Math.round(max*T.heal), floor3types:monoTypes.join('/'), note:g.renderVals().matchupNote.slice(0,60)}};}})()""")
    print(tw, r)
  # surge damage check: same hit with/without surge
  print('surge dmg x1.3:', pg.evaluate("""(()=>{const g=APP.game; let e=0; for(let s=1;;s++){ if(g.make(s,2).element.name==='Ember'){e=s;break;} } const mk=()=>{const b=g.newBattle(g.make(e,2,10), g.make(777,2,10),0); return b;};
     const r=()=>0.5; const b1=mk(); const h0=b1.s[1].hp; g._surge=null; g.hit(b1.s[0],b1.s[1],50,r); const d1=h0-b1.s[1].hp; const b2=mk(); g._surge='Ember'; g.hit(b2.s[0],b2.s[1],50,r); g._surge=null; const d2=b2.s[1].hp; return [d1, h0-d2, ((h0-d2)/d1).toFixed(2)];})()"""))
  pg.evaluate("delete window.__twist")
  print('errors:', errs or 'none'); b.close()
