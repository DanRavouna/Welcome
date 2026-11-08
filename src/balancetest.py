# Balance and meaning constants pinned as explicit expectations (snapshots mask numbers, so a silent drift in these would otherwise pass): duel tuning, level gates, action rewards, Tower, and the seal wording (tending, never conquest).
from playwright.sync_api import sync_playwright
from chk import check, done
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  v=pg.evaluate("({DUEL_HP,DUEL_DMG,DUEL_PACE,ACT_XP,ACT_ESS_CAP,SHINY_ODDS,GATES,ROUTE_GATES,TOWER,CQ_REWARD,DUEL_TUNE})")
  check('duel multipliers (tuned with duelsim.py)', [v['DUEL_HP'],v['DUEL_DMG'],v['DUEL_PACE']]==[2.65,1.48,0.73], [v['DUEL_HP'],v['DUEL_DMG'],v['DUEL_PACE']])
  check('per-boss duel corrections', v['DUEL_TUNE']=={'maren':{'hp':1.15},'keeper':{'hp':1.25},'coral':{'hp':1.35}}, v['DUEL_TUNE'])
  check('action rewards: half a KO of XP, 15 essence a day', [v['ACT_XP'],v['ACT_ESS_CAP']]==[0.5,15], [v['ACT_XP'],v['ACT_ESS_CAP']])
  check('zone level gates 1/3/6/9', v['GATES']=={'moss':1,'frost':3,'ember':6,'tide':9}, v['GATES'])
  check('route gates follow the higher of the two places (3/6/9/9), climbs 11 and 13', v['ROUTE_GATES']=={'route-mf':3,'route-mf-gate':3,'route-mf-fork':3,'route-cm':6,'route-cm-edge':6,'route-cm-crossing':6,'route-fc':9,'route-fc-shelf':9,'route-fc-landing':9,'route-cc':9,'route-cc-pier':9,'route-cc-steam':9,'ascent':11,'descent':13}, v['ROUTE_GATES'])
  check('the Long Watch: 20 floors, 2 climbs a day, 30% heal', v['TOWER']=={'floors':20,'runsPerDay':2,'heal':0.3}, v['TOWER'])
  check('shiny odds 1 in 200, city quest reward 4', [v['SHINY_ODDS'],v['CQ_REWARD']]==[200,4])
  # the seals are handed over as fires to tend, never conceded (Meaning section of the handoff)
  L=pg.evaluate("(()=>{const all=WORLD.allNpcs(),o={};for(const k in all)all[k].forEach(n=>{if(n.leader)o[n.id]=[n.winLine,n.sealLine,(n.intro||[]).join(' ')]});return o})()")
  want={'wren':'It grows because someone stays beside it.','glacia':'The cold keeps what it is given.','blaze':'You did not put it out. You fed it.','coral':'The sea gives back what it is given.'}
  rev=pg.evaluate("APP.build||''")=='review'   # the review copy: the leaders say what they see, not what the trial meant (docs/review/02-words.md F3)
  if rev: want={'wren':'Four in bloom.','glacia':'The pool is still.','blaze':'All three at once.','coral':'Every lamp answered.'}
  for k,w in want.items(): check('%s hands over a fire: "%s"'%(k,w), k in L and w in L[k][0], L.get(k,['?'])[0])
  bad=['fallen to you','beat me','Champion','put out every flame','thawed','hold every seal']
  check('no conquest wording on any leader', not any(any(s.lower() in ' '.join(x).lower() for s in bad) for x in L.values()), [x for x in L.values() if any(s.lower() in ' '.join(x).lower() for s in bad)])
  check('Coral ends with the light left on', ('The harbour lamp was already lit' if rev else 'Someone left a light on for you') in L.get('coral',['','',''])[1])
  names=pg.evaluate("[WORLD.MAPS.peak.name, WORLD.MAPS.peak.places[0].name, TITLES.find(t=>t.id==='champion').name, TITLES.find(t=>t.id==='summit').name]")
  check('Vigil Peak / The Long Watch / Fire-keeper / Watchkeeper', names==['Vigil Peak','The Long Watch','Fire-keeper','Watchkeeper'], names)
  b.close()
done()
