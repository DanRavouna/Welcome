# Package S probe: the music per place and act, the title's silence, the new sounds with an sfx spy, every track rendered offline.
import sys, time
from playwright.sync_api import sync_playwright
URL = 'file://' + sys.argv[1]
errs = []; fails = []
def check(name, ok, info=''):
    print(('PASS ' if ok else 'FAIL ') + name, '' if ok else ('| ' + str(info)));
    if not ok: fails.append(name)
SPY = "window.__sfx=[]; (function(){const o=APP.game.sfx; APP.game.sfx=function(k,a){window.__sfx.push(a===undefined||typeof a==='object'?k:k+':'+(typeof a==='number'?Math.round(a):a)); return o.apply(this, arguments)}})(); window.__buzz=[]; navigator.vibrate=(p)=>{window.__buzz.push(p); return true}"
with sync_playwright() as p:
  b = p.chromium.launch(args=['--autoplay-policy=user-gesture-required']); pg = b.new_page(viewport={'width': 390, 'height': 844})
  pg.on('pageerror', lambda e: errs.append(str(e)))
  pg.add_init_script("window.__tod='day'; window.__weather='clear'")
  pg.goto(URL); pg.wait_for_function("typeof APP!=='undefined' && APP.game"); pg.wait_for_timeout(1500)
  # 1) the title is silent; a tap on the dark starts nothing; the first sound the player causes is `light`; the town's tune comes once the title has gone
  check('the title shows', pg.is_visible('#title'))
  pg.evaluate(SPY)
  st0 = pg.evaluate("MUSIC.state"); check('musicTrack() is null while the title shows (want null)', st0['want'] is None, st0)
  pg.mouse.click(20, 800); pg.wait_for_timeout(600); st1 = pg.evaluate("MUSIC.state")
  check('a tap on the dark unlocks audio but plays nothing (cur null)', st1['unlocked'] and st1['cur'] is None and st1['want'] is None, st1)
  pg.click('#title-light'); pg.wait_for_timeout(100)
  check('the first sound is light', pg.evaluate("window.__sfx")[:1] == ['light'], pg.evaluate("window.__sfx"))
  pg.wait_for_timeout(1100); st2 = pg.evaluate("MUSIC.state"); check('the town plays once the title is gone', st2['cur'] == 'town', st2)
  # a save with a strong critter, action mode on
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:16},{seed:9,stage:3,lv:12}],party:[2,9],fighter:2,intro:true,xp:99999,essence:100,pouch:[],settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false,sound:true,vibrate:true})}); DEV.safe=true; window.__noTransition=true; document.getElementById('starter').hidden=true")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  def go(m): pg.evaluate("(m)=>{WORLD.enter(m); WORLD.setPaused(false)}", m); pg.wait_for_timeout(700); finish(); pg.evaluate("WORLD.setPaused(false)"); pg.wait_for_timeout(500)
  def want(): return pg.evaluate("MUSIC.state.want")
  def tod(t): pg.evaluate("(t)=>{window.__tod=t}", t); pg.wait_for_timeout(500)
  def flags(f): pg.evaluate("(f)=>APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:f})})", f); pg.wait_for_timeout(500)
  def at(x, y): pg.evaluate("([x,y])=>{WORLD.setPos((x+0.5)*32,(y+0.5)*32); WORLD.input.jx=0; WORLD.input.jy=0; [0,1,2,3].forEach(()=>WORLD.step(1/30))}", [x, y]); pg.wait_for_timeout(250)
  def press(): pg.evaluate("document.getElementById('act').click()"); pg.wait_for_timeout(120)
  def obj(pred): return pg.evaluate("(p)=>{const o=WORLD.map.objects.find(new Function('o','return '+p)); return o?[o.x,o.y,o.id]:null}", pred)
  finish()
  # 2) the halls by day and night
  for hall, tr in [('gym-coral', 'coralbay'), ('gym-wren', 'mossbrook'), ('gym-glacia', 'frosthold'), ('gym-blaze', 'cinderport')]:
    go(hall); tod('day'); d = want(); tod('night'); n = want(); tod('day')
    check(hall + ' plays ' + tr + ' by day and by night (not town)', d == tr and n == tr, [d, n])
  # 3) dusk, dawn, night outdoors
  go('ember'); tod('dusk'); du = want(); tod('dawn'); da = want(); tod('night'); ni = want(); tod('day'); dy = want()
  check('ember: @dusk at dusk and dawn, @night at night, plain by day', [du, da, ni, dy] == ['ember@dusk', 'ember@dusk', 'ember@night', 'ember'], [du, da, ni, dy])
  # 4) a leader's duel is a trial
  go('gym-wren'); pg.evaluate("APP.startTrainer(Object.values(WORLD.allNpcs()).flat().find(n=>n.id==='wren'))"); pg.wait_for_timeout(700)
  check('a leader on the map: trial, not boss', pg.evaluate("ACT.dueling()") and want() == 'trial', [pg.evaluate("ACT.dueling()"), want()])
  pg.evaluate("ACT.giveUp()"); pg.wait_for_timeout(300); finish()
  # 5) the lit arrangements by flag
  go('dg-lamp'); base = want(); flags({'cl:L1': True}); l1 = want(); flags({'cl:L1': True, 'cl:L2': True}); l2 = want(); flags({'lampLit': True}); l3 = want(); flags({})
  check('the Tower: dg-lamp, @1, @2, @3 by lamps kept / lampLit', [base, l1, l2, l3] == ['dg-lamp', 'dg-lamp@1', 'dg-lamp@2', 'dg-lamp@3'], [base, l1, l2, l3])
  go('dg-forge'); f0 = want(); flags({'forgeLit': True}); f1 = want(); flags({})
  check('the Forge: dg-forge then dg-forge@lit', [f0, f1] == ['dg-forge', 'dg-forge@lit'], [f0, f1])
  go('dg-arch'); a0 = want(); flags({'rubble': True}); a1 = want(); flags({})
  check('the Arch: dg-arch then dg-arch@seat', [a0, a1] == ['dg-arch', 'dg-arch@seat'], [a0, a1])
  today = pg.evaluate("new Date().toDateString()")
  go('town'); t0 = want(); flags({'lampLit': True}); t1 = want(); go('in-home'); t2 = want(); flags({'lampLit': True, 'homeLit': today}); t3 = want(); go('town'); t4 = want()
  check('Home: town, then town@dark after lampLit (and inside), then town once the window is lit today', [t0, t1, t2, t3, t4] == ['town', 'town@dark', 'town@dark', 'town', 'town'], [t0, t1, t2, t3, t4])
  # the window lit by hand plays light and buzzes [20,60,120]
  flags({'lampLit': True}); go('in-home'); w = obj("o.kind==='windowlamp'")
  if w:
    pg.evaluate("window.__sfx=[]; window.__buzz=[]"); at(w[0], w[1] + 1); press(); pg.wait_for_timeout(200); finish()
    check('the window lit: light + buzz [20,60,120], then town', pg.evaluate("window.__sfx") == ['light'] and pg.evaluate("window.__buzz") == [[20, 60, 120]] and pg.evaluate("APP.game.state.adv.flags.homeLit") == today, [pg.evaluate("window.__sfx"), pg.evaluate("window.__buzz"), pg.inner_text('#act-label')])
    pg.wait_for_timeout(600); check('after the window: town (inside Home)', want() == 'town', want())
  else: check('a windowlamp exists in town', False)
  flags({})
  # 6) Coral's call is heard in order; the answer in the lamp's pitch; wrong, then the call again slower; right
  go('gym-coral'); pg.evaluate("WORLD.enter('gym-coral'); WORLD.setPaused(false); window.__sfx=[]"); pg.wait_for_timeout(4400)
  s = pg.evaluate("window.__sfx"); seq = pg.evaluate("APP.coralSeq[0]")
  check('the call: lamp entries in CORAL_SEQ[0] order', [x for x in s if x.startswith('lamp:')] == ['lamp:%d' % n for n in seq], s)
  lamps = pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='callamp').sort((a,b)=>a.n-b.n).map(o=>[o.x,o.y])")
  ph = pg.evaluate("APP.coral().phase"); check('listening after the call', ph == 'listen', ph)
  wrong = [n for n in range(5) if n != seq[0]][0]
  pg.evaluate("window.__sfx=[]"); at(lamps[wrong][0], lamps[wrong][1] + 1); press(); pg.wait_for_timeout(500)
  s = pg.evaluate("window.__sfx"); check('a wrong answer: its lamp pitch, then wrong', s[:2] == ['lamp:%d' % wrong, 'wrong'], s)
  t0 = time.time(); pg.evaluate("window.__sfx=[]"); pg.wait_for_timeout(1500)
  log = []
  for _ in range(60):
    log.append((round(time.time() - t0, 2), pg.evaluate("window.__sfx.length"), pg.evaluate("APP.coral().phase")))
    if log[-1][2] == 'listen': break
    pg.wait_for_timeout(100)
  s = pg.evaluate("window.__sfx"); check('after a wrong answer the call replays, slower (about 1.0 s a step), in order', [x for x in s if x.startswith('lamp:')] == ['lamp:%d' % n for n in seq] and log[-1][2] == 'listen' and 3.3 <= log[-1][0] <= 5.5, (s, log[-1]))
  pg.evaluate("window.__sfx=[]")
  for n in seq: at(lamps[n][0], lamps[n][1] + 1); press(); pg.wait_for_timeout(150)
  pg.wait_for_timeout(500); s = pg.evaluate("window.__sfx")
  check('the right answer: each lamp in its pitch, then right', s == ['lamp:%d' % n for n in seq] + ['right'], s)
  # 7) Blaze: a log, the fire fed, heard guttering about 10.5 s later and out at 14 s (real time)
  go('gym-blaze'); fires = pg.evaluate("WORLD.map.objects.filter(o=>o.kind==='gbrazier').map(o=>[o.x,o.y])"); wood = obj("o.kind==='woodpile'")
  pg.evaluate("window.__sfx=[]"); at(wood[0], wood[1] - 1); press(); at(fires[0][0], fires[0][1] + 1); press(); t0 = time.time()
  s = pg.evaluate("window.__sfx"); check('a log taken: log; the fire fed: feed', s == ['log', 'feed'], s)
  seen = {}
  while time.time() - t0 < 16:
    for k in pg.evaluate("window.__sfx"):
      if k in ('gutter', 'out') and k not in seen: seen[k] = round(time.time() - t0, 1)
    if 'out' in seen: break
    pg.wait_for_timeout(200)
  check('the fire heard dying: gutter about 10.5 s after the feed, out about 14 s', 9.5 <= seen.get('gutter', 0) <= 11.8 and 13 <= seen.get('out', 0) <= 15.5, seen)
  # 8) Wren's bed: a tick every 0.8 s while tending, sprout at a stage, bloom at two
  go('gym-wren'); bed = obj("o.kind==='gbed'"); pg.evaluate("window.__sfx=[]"); at(bed[0], bed[1] + 1); press(); t0 = time.time(); pg.wait_for_timeout(5600)
  s = pg.evaluate("window.__sfx"); ticks = [x for x in s if x.startswith('tend:')]
  check('the bed: kneel (tap), ticks rising, sprout, then bloom', s[:1] == ['tap'] and len(ticks) >= 5 and 'sprout' in s and 'bloom' in s and s.index('sprout') < s.index('bloom'), s)
  flags({})
  # 9) the Tower's lamp: ticks rising, then light when kept; walking off a half-taken lamp gutters
  go('dg-lamp'); L1 = obj("o.id==='L1'"); pg.evaluate("window.__sfx=[]"); at(L1[0], L1[1] + 1); pg.wait_for_timeout(3000)
  s = pg.evaluate("window.__sfx"); ticks = [int(x.split(':')[1]) for x in s if x.startswith('tick:')]
  check('L1: ticks rising in pitch, then light when kept (no claim)', len(ticks) >= 3 and ticks == sorted(ticks) and 'light' in s and 'claim' not in s and pg.evaluate("!!APP.game.state.adv.flags['cl:L1']"), s)
  check('one lamp kept: the music is dg-lamp@1', want() == 'dg-lamp@1', want())
  L2 = obj("o.id==='L2'"); pg.evaluate("window.__sfx=[]"); at(L2[0], L2[1] + 1); pg.wait_for_timeout(1000); at(L2[0], L2[1] + 6); pg.wait_for_timeout(1600)
  s = pg.evaluate("window.__sfx"); check('L2 left after 1 s: ticks then gutter, not kept', 'gutter' in s and 'light' not in s and not pg.evaluate("!!APP.game.state.adv.flags['cl:L2']"), s)
  # 10) the great lamp: silence, light held long, buzz [20,60,120], then dg-lamp@lit (dg-lamp@3)
  flags({'cl:L1': True, 'cl:L2': True, 'cl:L3': True}); pg.evaluate("APP.game.update({npc:{done:[],beaten:{},cleared:['maren'],seals:[]}})")
  go('dg-lamp'); gl = obj("o.id==='greatlamp'"); pg.evaluate("window.__sfx=[]; window.__buzz=[]"); at(gl[0] - 1, gl[1]); press(); pg.wait_for_timeout(200)
  check('the great lamp dialog opens', pg.evaluate("!!APP.dialog"), pg.inner_text('#act-label'))
  finish(); pg.wait_for_timeout(500); m05 = pg.evaluate("MUSIC.state"); pg.wait_for_timeout(2000); m25 = pg.evaluate("MUSIC.state")
  s = pg.evaluate("window.__sfx"); check('the great lamp: light:long first, buzz [20,60,120] first (the mythic 1.8 s later is grantSecret, which package R moves to the sill)', s[:1] == ['light:long'] and pg.evaluate("window.__buzz")[:1] == [[20, 60, 120]], (s, pg.evaluate("window.__buzz")))
  check('silence at 0.5 s (cur null), dg-lamp@3 at 2.5 s', m05['cur'] is None and m05['want'] is None and m25['want'] == 'dg-lamp@3', (m05, m25))
  # 11) the Forge: silence, the forge's sound, then dg-forge@lit
  flags({'sock:A': True, 'sock:B': True, 'core:A': True, 'core:B': True}); pg.evaluate("APP.game.update({npc:{done:[],beaten:{},cleared:['hale'],seals:[]}})")
  go('dg-forge'); fu = obj("o.kind==='furnace'"); pg.evaluate("window.__sfx=[]"); at(fu[0], fu[1] + 1); press(); pg.wait_for_timeout(200)
  finish(); pg.wait_for_timeout(500); m05 = pg.evaluate("MUSIC.state"); pg.wait_for_timeout(1500); m20 = pg.evaluate("MUSIC.state")
  s = pg.evaluate("window.__sfx"); check('the Forge: forge sound first (grantSecret 1.8 s later: package R); silence at 0.5 s, dg-forge@lit at 2 s', s[:1] == ['forge'] and m05['want'] is None and m20['want'] == 'dg-forge@lit', (s, m05, m20))
  # 12) the Watch: a knock, the night track, dawn instead of win, a bar of silence, then watch
  pg.wait_for_timeout(1200); pg.evaluate("if(!document.getElementById('screen').hidden) APP.close()"); finish()   # grantSecret opened the Dex after the lamp and the forge
  flags({}); pg.evaluate("window.__nightS=3; APP.game.update({npc:{done:[],beaten:{},cleared:[],seals:['wren','glacia','blaze','coral']},tower:{best:0,day:'',runs:0,clears:0,run:null}}); APP.game.startTowerRun()")
  go('in-tower'); check('the lobby: watch', want() == 'watch', want())
  pg.evaluate("window.__sfx=[]"); pg.evaluate("APP.towerFloorStart()"); pg.wait_for_timeout(1000)
  s = pg.evaluate("window.__sfx"); check('the night begins with a knock and the night track', 'knock' in s and pg.evaluate("ACT.dueling()") and want() == 'night', (s, want()))
  pg.wait_for_timeout(2500); s = pg.evaluate("window.__sfx"); m = pg.evaluate("MUSIC.state")
  check('dawn: the dawn sound, no win, the music hushed', 'dawn' in s and 'win' not in s and m['want'] is None, (s, m))
  pg.wait_for_timeout(1300); check('then the lobby\'s tune again', want() == 'watch', want()); finish()
  # the long night: night@long
  pg.evaluate("APP.game.update({tower:{best:4,day:'',runs:0,clears:0,run:{floor:5,party:[2,9],hp:{}}}})"); pg.evaluate("window.__nightS=30; APP.towerFloorStart()"); pg.wait_for_timeout(600)
  check('night 5 (a long night): night@long', want() == 'night@long', want()); pg.evaluate("ACT.giveUp()"); pg.wait_for_timeout(300); finish()
  # 13) a keep is keep; a kill is not claim; the rare grass stirs audibly and wakes to rare
  pg.evaluate("window.__sfx=[]; APP.game.actKeep(APP.game.make(777,1))"); check('a critter kept: keep', pg.evaluate("window.__sfx") == ['keep'], pg.evaluate("window.__sfx"))
  go('moss'); z = pg.evaluate("WORLD.map.rare"); pg.evaluate("ACT.clear()"); pg.evaluate("window.__sfx=[]")
  pg.evaluate("(z)=>{WORLD.setPos((z.x+1.5)*32,(z.y+1.5)*32);WORLD.input.jx=0;WORLD.input.jy=0}", z)
  for _ in range(45):
    pg.evaluate("(z)=>{if(!ACT.foes().some(f=>f.woke)&&ACT.foes().some(f=>Math.hypot(f.x/32-(z.x+1.5),f.y/32-(z.y+1.5))<4))ACT.clear()}", z)
    if pg.evaluate("ACT.foes().some(f=>f.woke)"): break
    pg.wait_for_timeout(100)
  s = pg.evaluate("window.__sfx"); st = [x for x in s if x.startswith('stir:')]
  check('the rare grass: stir ticks rising, then rare (not claim)', len(st) >= 3 and 'rare' in s and 'claim' not in s, s)
  # 14) every track compiles and renders; the Tower's forms rise with the count
  stats = pg.evaluate("""async()=>{const out={}; for(const id of MUSIC.tracks){ const d=await MUSIC._render(id,1); let pk=0,sq=0; for(let i=0;i<d.length;i++){const a=Math.abs(d[i]); if(a>pk)pk=a; sq+=d[i]*d[i];} out[id]={peak:+pk.toFixed(3), rms:+Math.sqrt(sq/d.length).toFixed(4), secs:+(d.length/22050).toFixed(1)}; } return out;}""")
  print('tracks:', len(stats))
  for k in ['trial', 'night', 'night@long', 'dg-lamp', 'dg-lamp@1', 'dg-lamp@2', 'dg-lamp@3', 'dg-forge', 'dg-forge@lit', 'dg-arch@seat', 'town', 'town@dark', 'town@dusk', 'frost@dusk', 'peak']: print('  %-12s %s' % (k, stats[k]))
  r = [stats['dg-lamp']['rms'], stats['dg-lamp@1']['rms'], stats['dg-lamp@2']['rms'], stats['dg-lamp@3']['rms']]
  check('dg-lamp rms rises with the lamps kept', r == sorted(r) and r[0] < r[3], r)
  check('every track renders with a signal', all(v['rms'] > 0.002 for v in stats.values()), [k for k, v in stats.items() if v['rms'] <= 0.002])
  check('bar lengths ok for every track', pg.evaluate("Object.entries(MUSIC._T).every(([k,t])=>{const bars=t.lead.split('|').map(x=>x.trim().split(/\\s+/).length); return bars.length===8&&bars.every(n=>n===8)&&t.chords.split(' ').length===8&&t.steps.length===64})"))
  check('no page errors', not errs, errs)
  b.close()
print('FAILS:', fails or 'none')
