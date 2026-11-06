# Dex screen: collection counts, filter chips, sorting.
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
  # a mixed collection: 2 Ember, 2 Tide, 1 Moss, one of them shiny, different levels
  setup=pg.evaluate("""(()=>{const g=APP.game,by={},sh=[];for(let s=1;s<6000;s++){const k=g.make(s,1);if(k.shiny){if(sh.length<1)sh.push(s)}else{(by[k.element.name]=by[k.element.name]||[]).push(s)}}
    const seeds=[by.Ember[0],by.Tide[0],by.Moss[0],by.Ember[1],by.Tide[1],sh[0]];
    g.update({caught:seeds.map((s,i)=>({seed:s,stage:1,lv:1+i*3})),party:seeds.slice(0,3),fighter:seeds[0],seen:seeds.map(s=>g.make(s,1).speciesNo),intro:true});
    return {seeds, shinyType:g.make(sh[0],1).element.name}})()""")
  print('collection:', setup)
  pg.evaluate("APP.open('dex')"); pg.wait_for_timeout(500)
  txt=lambda: pg.inner_text('#screen')
  def names(): return pg.evaluate("[...document.querySelectorAll('#screen button')].filter(b=>/St\\.\\d · Lv/.test(b.innerText)).map(b=>b.innerText.replace(/\\n/g,' ').slice(0,70))")
  print('count line:', [l for l in txt().split('\n') if l.startswith('Showing')])
  print('chips present:', all(w in txt() for w in ['All types','Ember','Bloom','Kept order','Newest','Level','Rarity','Name','Shiny only']))
  # filter by Ember
  pg.click("#screen button:has-text('Ember')"); pg.wait_for_timeout(200)
  print('Ember filter ->', [l for l in txt().split('\n') if l.startswith('Showing')], '| all Ember:', all('Ember' in n for n in names()), len(names()))
  pg.click("#screen button:has-text('All types')"); pg.wait_for_timeout(100)
  # sort by level: highest first
  pg.click("#screen button:has-text('Level')"); pg.wait_for_timeout(200)
  lv=pg.evaluate("[...document.querySelectorAll('#screen button')].filter(b=>/St\\.\\d · Lv/.test(b.innerText)).map(b=>+b.innerText.match(/Lv (\\d+)/)[1])")
  print('level sort descending:', lv, lv==sorted(lv,reverse=True))
  pg.click("#screen button:has-text('Newest')"); pg.wait_for_timeout(200)
  lv=pg.evaluate("[...document.querySelectorAll('#screen button')].filter(b=>/St\\.\\d · Lv/.test(b.innerText)).map(b=>+b.innerText.match(/Lv (\\d+)/)[1])")
  print('newest first (levels were 1,4,7,10,13,16):', lv)
  pg.click("#screen button:has-text('Kept order')"); pg.wait_for_timeout(200)
  lv=pg.evaluate("[...document.querySelectorAll('#screen button')].filter(b=>/St\\.\\d · Lv/.test(b.innerText)).map(b=>+b.innerText.match(/Lv (\\d+)/)[1])")
  print('kept order ascending (oldest first):', lv, lv==sorted(lv))
  pg.click("#screen button:has-text('Rarity')"); pg.wait_for_timeout(200)
  rk=pg.evaluate("[...document.querySelectorAll('#screen button')].filter(b=>/St\\.\\d · Lv/.test(b.innerText)).map(b=>b.innerText.match(/(Common|Uncommon|Rare|Mythic)/)[1])")
  R={'Mythic':0,'Rare':1,'Uncommon':2,'Common':3}; print('rarity sort:', rk, [R[x] for x in rk]==sorted(R[x] for x in rk))
  # shiny only
  pg.click("#screen button:has-text('Shiny only')"); pg.wait_for_timeout(200)
  print('shiny only ->', [l for l in txt().split('\n') if l.startswith('Showing')], names())
  pg.click("#screen button:has-text('Ember')"); pg.wait_for_timeout(200)
  print('shiny + Ember (no match) -> message:', 'No critter matches' in txt())
  pg.click("#screen button:has-text('Shiny only')"); pg.click("#screen button:has-text('Ember')"); pg.wait_for_timeout(100)
  pg.screenshot(path='/tmp/dex-mine.png')
  # species view
  pg.click("#screen button:has-text('Species (')"); pg.wait_for_timeout(300)
  n_all=pg.evaluate("document.querySelectorAll('#screen button[aria-label^=\"#\"]').length")
  pg.click("#screen button:has-text('Not yet found')"); pg.wait_for_timeout(200)
  n_miss=pg.evaluate("document.querySelectorAll('#screen button[aria-label^=\"#\"]').length")
  print('species cells all / not-yet-found:', n_all, n_miss, '(48 - found %d expected)' % len(set(pg.evaluate("APP.game.state.seen"))))
  print('species detail line:', [l for l in txt().split('\n') if l.startswith('Ability')])
  pg.screenshot(path='/tmp/dex-species.png')
  # everything found -> message
  pg.evaluate("APP.game.update({seen:Array.from({length:48},(_, i)=>i+1)})"); pg.wait_for_timeout(300)
  print('all found message:', 'Nothing is missing' in txt())
  print('filters are not saved:', pg.evaluate("!('dexType' in JSON.parse(localStorage.getItem('critter-roll:v2')||'{}'))"))
  print('errors:', errs or 'none'); b.close()
