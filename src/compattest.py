# Save compatibility: fields this build does not know survive our writes; old saves (missing newer fields) load with defaults and keep everything.
from playwright.sync_api import sync_playwright
import json
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':780})
  FUTURE={'futureThing':{'a':1,'b':[1,2,3]},'zzFlag':True}
  OLD={'caught':[{'seed':2,'stage':2,'lv':9},{'seed':7,'stage':1}],'essence':42,'wins':3,'intro':True,'xp':500,'settings':{'sound':True,'test':False},'tower':{'best':4}}   # an old save: no adv, no visited, no titles, no stats
  ctx.add_init_script("try{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('critter-roll:v2', %s); } }catch(e){}" % json.dumps(json.dumps(dict(OLD,**FUTURE))))
  pg=ctx.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1300)
  print('old save loads: critters', pg.evaluate("APP.game.state.caught.length"), '| essence', pg.evaluate("APP.game.state.essence"), '| xp', pg.evaluate("APP.game.state.xp"), '| tower best', pg.evaluate("APP.game.state.tower.best"))
  print('missing newer fields get safe defaults:', pg.evaluate("JSON.stringify({adv:APP.game.state.adv,visited:APP.game.state.visited,titles:APP.game.state.titles.length,settings:{weather:APP.game.state.settings.weather,ambient:APP.game.state.settings.ambient,bigtext:APP.game.state.settings.bigtext,contrast:APP.game.state.settings.contrast}})"))
  pg.evaluate("APP.game.update({essence:APP.game.state.essence+1, adv:{clues:['ruin'],open:{},flags:{}}})"); pg.wait_for_timeout(200)
  s=pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2'))")
  print('after a normal write, unknown fields kept:', all(s.get(k)==v for k,v in FUTURE.items()), '| our fields written:', s['essence']==43, s['adv']['clues']==['ruin'], '| old data kept:', len(s['caught'])==2 and s['tower']['best']==4)
  pg.reload(); pg.wait_for_timeout(1300); s=pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2'))")
  print('after a reload and another write: unknown fields still there:', all(s.get(k)==v for k,v in FUTURE.items()))
  # a corrupt or empty slot must not break saving
  pg.evaluate("localStorage.setItem('critter-roll:v2','{not json')"); pg.evaluate("APP.game.update({essence:5})"); pg.wait_for_timeout(200)
  print('corrupt stored value is replaced cleanly:', pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2')).essence")==5)
  print('errors:', errs or 'none'); b.close()
