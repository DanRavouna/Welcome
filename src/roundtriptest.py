# Save round trip (rule 3 of CLAUDE.md: never drop a field): every top-level save field is set to a distinct value, written through the game's own save, reloaded, and compared one by one. Also the Dex species count, which no other test pins (a mutation pass found both gaps, Nov 2026).
from playwright.sync_api import sync_playwright
from chk import check, done
import json
errs=[]
FIX={'caught':[{'seed':2,'stage':3,'lv':12},{'seed':9,'stage':1}],'essence':77,'wins':5,'used':3,'earned':['first'],'seed':4242,'xp':1234,
  'quests':{'day':'Mon Jan 01 2029','list':[]},'sight':{'day':'Mon Jan 01 2029','n':7},'intro':True,'hints':['party','shop'],'party':[2,9],'bag':{'potion':2,'super':1,'charm':0,'ticket':3,'herb':1,'ward':1,'whet':2,'lure':0},
  'lure':1,'cq':{'p':'abc','n':1},'charm':2,'tickets':{'day':'x','count':2},'npc':{'done':['rowan'],'beaten':{'ivy':'d'},'cleared':['rowan'],'seals':['wren']},
  'stats':{'v':1,'days':{'Mon Jan 01 2029':{'min':3}}},'visited':['town','moss'],'adv':{'clues':['ruin'],'open':{'arch':True},'flags':{'rubble':True}},
  'titles':['champion'],'title':'champion','shinies':[7,9],'pouch':[11,12],'act':{'day':'Mon Jan 01 2029','n':2},'tower':{'best':6,'day':'x','runs':1,'clears':0,'run':{'floor':3,'party':[2,9],'hp':{'2':40,'9':12}}},
  'settings':{'sound':False,'vibrate':False,'calm':True,'test':False,'daynight':True}}
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':780}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  REV=pg.evaluate("APP.build")=='review'
  if REV:   # the review copy's new save fields (11's items 7, 9, 15): act.tx (trainer XP paid after the rolls), returned (critters let go), lvGates (the old level gates kept for older saves)
    FIX['act']=dict(FIX['act'], tx=4); FIX['returned']=[5,6]; FIX['lvGates']=True; FIX['arena']={'step':2,'day':'Mon Jan 01 2029'}   # arena: the ladder, which no build saved before (fixed in the review copy)
  pg.evaluate("(f)=>APP.game.update(f)", FIX); pg.wait_for_timeout(300)
  pg.reload(); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.wait_for_timeout(600)
  st=pg.evaluate("APP.game.state")
  lost=[]
  for k,v in FIX.items():
    got=st.get(k)
    if k=='settings': ok=all(got.get(kk)==vv for kk,vv in v.items())
    elif k in ('earned','titles','shinies'): ok=all(x in got for x in v)   # recomputed on load (badges, titles, the shiny list from the critters kept): must still hold what was written
    elif k=='quests': ok=isinstance(got,dict) and 'day' in got   # the daily quests reset for today's date
    elif k=='essence': ok=got>=v   # badge rewards granted on load can only add
    else: ok=got==v
    if not ok: lost.append((k,got))
  check('every save field comes back as written after a reload', not lost, lost)
  check('seen is rebuilt from the kept critters (species of seeds 2 and 9)', sorted(st['seen'])==sorted(pg.evaluate("[2,9].map(s=>APP.game.make(s,1).speciesNo)")), st['seen'])
  v=pg.evaluate("(()=>{const v=APP.game.renderVals();return {toggle:v.dexToggle.map(d=>d.label||d[1]||JSON.stringify(d)), found:v.speciesFound}})()")
  n=len(st['seen'])
  check('the Dex species count matches seen (%d/48)'%n, v['found']==n and any(('(%d/48)'%n) in str(t) for t in v['toggle']), v)
  # the fields written to disk: none missing from the record itself
  raw=json.loads(pg.evaluate("localStorage.getItem('critter-roll:v2')"))
  missing=[k for k in FIX if k not in raw]
  check('the record on disk holds every field', not missing, missing)
  if REV:   # an older record without the new fields loads with safe defaults (and a save that already kept critters keeps the level gates)
    def load(rec):
      pg.evaluate("(r)=>localStorage.setItem('critter-roll:v2', JSON.stringify(r))", rec); pg.reload(); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.wait_for_timeout(400)
      return pg.evaluate("(()=>{const s=APP.game.state;return {act:s.act, returned:s.returned, lvGates:s.lvGates, arena:s.arena}})()")
    old=dict(raw); [old.pop(k,None) for k in ('returned','lvGates','arena')]; old['act']={'day':'Mon Jan 01 2029','n':2}
    d=load(old); check('review copy: an old save with critters: act.tx 0, returned [], lvGates true, arena step 0', d=={'act':{'day':'Mon Jan 01 2029','n':2,'tx':0},'returned':[],'lvGates':True,'arena':{'step':0,'day':''}}, d)
    fresh={'caught':[],'essence':0,'wins':0,'intro':True}
    d=load(fresh); check('review copy: a new save: lvGates false (gates by seals only)', d['lvGates'] is False and d['returned']==[] and d['act']['tx']==0, d)
    old['lvGates']=False; d=load(old); check('review copy: lvGates false as written stays false', d['lvGates'] is False, d)
  check('no page errors', not errs, errs); b.close()
done()
