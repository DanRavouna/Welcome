# The Lamp Tower (Meaning: the way home is lit by you): dark chambers, a lamp per chamber that takes while you stay beside it and opens the gate above, nothing closes behind you, the great lamp lights only from the three kept below it; the beacon door, trainers, saving.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':760}); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.add_init_script("window.__noFollower = true")   # test hook: no follower, so no action mode (these suites test the older flows)
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  REV=pg.evaluate("APP.build")=='review'   # the review copy (11's item 18): the great lamp is a chamber lamp GL lit by a 6 s stay, no Warden check, nothing given
  LID='GL' if REV else 'greatlamp'
  pg.evaluate("APP.game.update({hints:['party','shop','evolve','weather','zone','grass','keep','battle','online'],caught:[{seed:2,stage:3,lv:16}],party:[2],fighter:2,intro:true,xp:99999,essence:10,settings:Object.assign({},APP.game.state.settings,{follow:false,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true)")
  def finish():
    for _ in range(60):
      if not pg.evaluate("!!APP.dialog"): break
      pg.evaluate("APP.advance()"); pg.wait_for_timeout(40)
  # 1) the climb from the raw map data: with no lamp kept the top is out of reach; each kept lamp opens exactly its gate and never closes one
  G=pg.evaluate("""()=>{const M=WORLD.MAPS['dg-lamp'];const W=M.W,H=M.H;const solidC=(c)=>['C','O','T','X','~','F','G','R'].indexOf(c)!==-1;
    const objAt=new Map();M.objects.forEach(o=>objAt.set(o.x+','+o.y,o));const lamp=M.objects.find(o=>o.id===LID);
    const reach=(kept)=>{const free=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return false;const o=objAt.get(x+','+y);if(o)return !!(o.gate&&M.gates[o.gate].every(l=>kept.indexOf(l)!==-1));return !solidC(M.grid[y][x])};
      const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];let top=false;const lamps=[];
      while(q.length){const [x,y]=q.shift();if(Math.abs(lamp.x-x)+Math.abs(lamp.y-y)===1)top=true;M.objects.forEach(o=>{if(o.kind==='chamberlamp'&&o.id!==LID&&Math.abs(o.x-x)+Math.abs(o.y-y)===1&&lamps.indexOf(o.id)===-1)lamps.push(o.id)});
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(!seen.has(k)&&free(a,b)){seen.add(k);q.push([a,b])}}}
      return {n:seen.size,top,lamps:lamps.sort()}};
    return {none:reach([]),L1:reach(['L1']),L12:reach(['L1','L2']),all:reach(['L1','L2','L3']),dark:!!M.dark,gates:M.gates}}""".replace('LID', repr(LID)))
  print('climb graph:', G)
  print('no lamp kept: the top is out of reach and only L1 can be reached:', (not G['none']['top']) and G['none']['lamps']==['L1'])
  print('each kept lamp opens the next chamber (L1 -> L2, L1+L2 -> L3), all three -> the top:', G['L1']['lamps']==['L1','L2'] and G['L12']['lamps']==['L1','L2','L3'] and G['all']['top'])
  print('nothing closes: reachable cells only grow:', G['none']['n']<G['L1']['n']<G['L12']['n']<G['all']['n'], '| the climb is dark:', G['dark'])
  # 2) the real tower: door on the Ascent, then the levers pulled by hand
  pg.evaluate("WORLD.enter('ascent')"); pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='beacon-door');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.6)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(300)
  print('door label:', pg.inner_text('#act-label')); pg.click('#act'); pg.wait_for_timeout(300); print('first visit dialogue:', pg.evaluate("APP.dialog&&APP.dialog.lines[0]")); finish(); pg.wait_for_timeout(700)
  print('inside:', pg.evaluate("WORLD.map.id"), '| open.lamp saved:', pg.evaluate("JSON.parse(localStorage.getItem('critter-roll:v2')).adv.open.lamp"))
  gates=lambda: pg.evaluate("(()=>{const o=WORLD.objects;return ['g1','g2','g3'].map(g=>g+':'+(o.filter(x=>x.gate===g).every(x=>x.hidden)?'open':'shut')).join(' ')})()")
  def keep(oid, secs):   # stand beside a lamp for a while (the tending is in staying, not in a button)
    pg.evaluate(f"(()=>{{const o=WORLD.objects.find(x=>x.id==='{oid}');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.5)*WORLD.TS);WORLD.input.jx=0;WORLD.input.jy=0}})()"); pg.wait_for_timeout(int(secs*1000))
  print('start:', gates())
  keep('L1', 1.0); print('after 1 s by L1 (not yet):', gates(), '| kept flag:', pg.evaluate("!!APP.game.state.adv.flags['cl:L1']"))
  pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='L1');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+4.5)*WORLD.TS)})()"); pg.wait_for_timeout(600); keep('L1', 2.8)
  print('walk away and back, 2.8 s more: fades then takes:', gates(), '| kept flag:', pg.evaluate("!!APP.game.state.adv.flags['cl:L1']"))
  keep('L2', 2.8); print('after L2 :', gates()); keep('L3', 2.8); print('after L3 :', gates())
  REACH="""(ids)=>{const M=WORLD.map;const S=(x,y)=>x<0||y<0||x>=M.W||y>=M.H||WORLD.solidAt(x,y)||WORLD.npcs.some(o=>o.x===x&&o.y===y);const sp=[Math.floor(M.spawn[0]),Math.floor(M.spawn[1])];const seen=new Set([sp.join()]);const q=[sp];
    while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(a>=0&&b>=0&&a<M.W&&b<M.H&&!seen.has(k)&&!S(a,b)){seen.add(k);q.push([a,b])}}}
    const adj=(o)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has((o.x+dx)+','+(o.y+dy)));const things=WORLD.objects.concat(WORLD.npcs);const out={};ids.forEach(id=>{const o=things.find(t=>t.id===id);out[id]=o?adj(o):'missing'});return out}"""
  rch=pg.evaluate(REACH, ['bex','odo','maren',LID,'chest2']); rch['greatlamp']=rch.pop(LID)   # (printed under its old name on both builds)
  print('with all three lamps kept, reachable (walls of the real map, NPCs solid):', {k:rch[k] for k in ['bex','odo','maren','greatlamp','chest2']})
  pg.reload(); pg.wait_for_timeout(1100); pg.evaluate("WORLD.enter('dg-lamp')"); pg.wait_for_timeout(200); print('after a reload the kept lamps stay kept:', gates())
  # 3) trainers: sight lines, boss flag, rewards
  r=pg.evaluate("""()=>{WORLD.npcs.forEach(n=>{n.declined=true});const out={};for(const id of ['bex','odo','maren']){const n=WORLD.npcs.find(x=>x.id===id);WORLD.setPos((n.x+0.5)*WORLD.TS,(n.y+3.5)*WORLD.TS);out[id]={at:[n.x,n.y],sees:WORLD.inSight(n),size:n.size,stage:n.stage,lv:n.lv,reward:n.reward,boss:!!n.boss,bonus:n.bonus||0}}return out}""")
  for k,v in r.items(): print('  ',k,v)
  # 4) the great lamp (review copy): a chamber lamp GL, dark until the three below are kept, lit by a 6 s stay over real time; no Warden check; nothing given
  if REV:
    def gl_log(ms, leave_at=None):   # [t, k, lampLit, music want] every frame against the clock; leave_at: step away (4 tiles south) at that time
      return pg.evaluate("""([ms,leave])=>new Promise(res=>{const o=WORLD.objects.find(x=>x.id==='GL');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.5)*WORLD.TS);WORLD.input.jx=0;WORLD.input.jy=0;const t0=performance.now(),out=[];let left=false;
        const tick=()=>{const t=performance.now()-t0;if(leave!==null&&!left&&t>=leave){left=true;WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+5.5)*WORLD.TS)}const st=APP.objState(o);out.push([Math.round(t),Math.round((st.lit||0)*1000)/1000,!!APP.game.state.adv.flags.lampLit,(typeof MUSIC!=='undefined'&&MUSIC.state)?MUSIC.state.want:'?']);if(t<ms)requestAnimationFrame(tick);else res(out)};tick()})""", [ms, leave_at])
    flags=lambda **kw: pg.evaluate("(f)=>APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,f)})})", kw)
    has_wick=lambda: pg.evaluate("APP.game.state.caught.some(e=>e.seed===SECRET2_SEED)")
    pg.evaluate("WORLD.npcs.forEach(n=>{n.declined=true})")
    words=pg.evaluate("(()=>{const out=[];WORLD.npcs.forEach(n=>['intro','lines','afterLines','beatenLines'].forEach(k=>(n[k]||[]).forEach(l=>out.push(l)))||out.push(n.winLine||''));WORLD.objects.forEach(o=>out.push(o.text||''));return out.join(' | ')})()")
    import re
    ck=lambda name, cond, detail='': check(name, cond, '' if cond else detail)
    ck('review copy: no line in the tower says how to light it (wake it / touch the glass / lever)', not re.search(r'wake it|touch the glass|lever', words, re.I), words)
    check('review copy: no action label by the great lamp (it is not pressed)', (pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='GL');WORLD.setPos((o.x+0.5)*WORLD.TS,(o.y+1.5)*WORLD.TS);[0,1,2].forEach(()=>WORLD.step(1/30))})()"), pg.wait_for_timeout(250), pg.evaluate("document.getElementById('act').disabled || !/lamp|light|wake/i.test(document.getElementById('act-label').innerText)"))[-1], pg.inner_text('#act-label'))
    flags(**{'cl:L3':False}); L=gl_log(7000)
    ck('review copy: with one lamp below unkept the glass stays cold through a 7 s stay', all(k==0 for t,k,lit,w in L) and not pg.evaluate("!!APP.game.state.adv.flags.lampLit"), L[-1])
    flags(**{'cl:L3':True}); pg.wait_for_timeout(200)
    L=gl_log(5600, 3000); peak=max(k for t,k,lit,w in L if t<3000); end=L[-1][1]
    ck('review copy: a 3 s stay brings the glow up about half way (0.35 to 0.65), stepping away makes it fall', 0.35<=peak<=0.65 and end<peak-0.3 and not L[-1][2], [peak,end])
    pg.wait_for_timeout(1500)
    e0=pg.evaluate("APP.game.state.essence"); t0=pg.evaluate("APP.game.state.titles.slice()")
    pg.evaluate("window.__sfx=[]; const g=APP.game, o=g.sfx.bind(g); g.sfx=(...a)=>{window.__sfx.push(a[0]); return o(...a);}")
    L=gl_log(9000); lit_at=[t for t,k,lit,w in L if lit]
    ck('review copy: the stay lights it after about 6 s (5.5 to 7.0 s), never sooner', lit_at and 5500<=lit_at[0]<=7000, [lit_at[:1], [x for x in L if x[0]%1000<20]])
    if lit_at:
      w05=[w for t,k,lit,w in L if lit_at[0]+400<=t<=lit_at[0]+700]; w25=[w for t,k,lit,w in L if t>=lit_at[0]+2500]
      ck('review copy: silence at the lighting, then the lit arrangement (want null at 0.5 s, the lit form dg-lamp@3 at 2.5 s)', w05 and all(w is None for w in w05) and w25 and w25[-1] in ('dg-lamp@lit','dg-lamp@3'), [w05[:2], w25[-1:]])   # package S plays the lit form as dg-lamp@3 (dg-lamp@lit is its alias)
    pg.wait_for_timeout(300)
    check('review copy: one line, "The glass is warm."', pg.evaluate("APP.dialog && APP.dialog.lines")==['The glass is warm.'], pg.evaluate("APP.dialog && APP.dialog.lines"))
    finish()
    check('review copy: lit without the Warden (Maren never a gate)', pg.evaluate("!!APP.game.state.adv.flags.lampLit") and 'maren' not in (pg.evaluate("APP.game.state.npc.cleared") or []))
    ck('review copy: nothing given: essence unchanged, no title shown today, no essence toast, no jingle, no Wickling here', pg.evaluate("APP.game.state.essence")==e0 and pg.evaluate("APP.game.state.titles.slice()")==t0 and 'essence' not in pg.inner_text('#toast') and 'mythic' not in pg.evaluate("window.__sfx") and not has_wick(), [pg.evaluate("APP.game.state.essence")-e0, pg.inner_text('#toast'), pg.evaluate("window.__sfx")])
    print('lit:', pg.evaluate("APP.game.state.adv.flags.lampLit"), '| essence +', pg.evaluate("APP.game.state.essence")-e0)
  else:
    def lamp_use():
      pg.evaluate("(()=>{const o=WORLD.objects.find(x=>x.id==='greatlamp');WORLD.setPos((o.x-0.5)*WORLD.TS,(o.y+0.5)*WORLD.TS)})()"); pg.evaluate("[0,1,2,3].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(250); pg.click('#act'); pg.wait_for_timeout(300)
    lamp_use(); print('lamp before the Warden falls:', pg.inner_text('#toast')[:60])
    pg.evaluate("APP.game.update({npc:Object.assign({},APP.game.state.npc,{cleared:(APP.game.state.npc.cleared||[]).concat(['maren'])})})")
    pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{'cl:L3':false})})})"); lamp_use(); print('Warden down but one lamp below unkept:', pg.inner_text('#toast')[:40])
    pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{'cl:L3':true})})})")
    e0=pg.evaluate("APP.game.state.essence"); lamp_use(); print('lamp dialogue:', pg.evaluate("APP.dialog&&APP.dialog.lines.length"), 'lines'); finish(); pg.wait_for_timeout(400)
    print('lit:', pg.evaluate("APP.game.state.adv.flags.lampLit"), '| essence +', pg.evaluate("APP.game.state.essence")-e0, '| title:', pg.evaluate("APP.game.state.titles.indexOf('lamp')!==-1"))
    e1=pg.evaluate("APP.game.state.essence"); lamp_use(); print('again:', pg.inner_text('#toast')[:50], '| essence unchanged:', pg.evaluate("APP.game.state.essence")==e1)
  # 5) the beam on the Ascent (pixels above the lantern get brighter once lit), journal, music
  def beam_lum():
    pg.evaluate("WORLD.enter('ascent'); WORLD.setPos(14.5*WORLD.TS,11*WORLD.TS)"); pg.evaluate("[0,1,2,3,4,5,6,7,8,9].forEach(()=>WORLD.step(1/30))"); pg.wait_for_timeout(1200)
    return pg.evaluate("(()=>{const c=document.getElementById('world'),g=c.getContext('2d'),r=c.width/c.clientWidth,d=WORLD.debug().cam;const x=(14.5*32-d.cx),y=(2*32-d.cy);const p=g.getImageData(Math.round(x*r)-3,Math.round(y*r),6,4).data;let s=0;for(let i=0;i<p.length;i+=4)s+=(p[i]+p[i+1]+p[i+2])/3;return Math.round(s/(p.length/4))})()")
  lit=beam_lum(); pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{lampLit:false})})})"); unlit=beam_lum()
  print('brightness above the beacon lantern: lit', lit, 'vs unlit', unlit, '| brighter when lit:', lit>unlit)
  pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{lampLit:true})})})")
  pg.evaluate("APP.openMenu()"); pg.wait_for_timeout(200); pg.evaluate("document.querySelector('[data-tile=journal]').click()"); pg.wait_for_timeout(200); print('journal:', [l[:60] for l in pg.evaluate("APP.dialog.lines") if 'Lamp Tower' in l]); finish()
  pg.evaluate("WORLD.enter('dg-lamp')"); pg.wait_for_timeout(900); print('music in the tower:', pg.evaluate("MUSIC.state.want"), '| own track:', pg.evaluate("MUSIC.tracks.indexOf('dg-lamp')!==-1"))
  # 6) saving: levers and the lit lamp survive a reload; gates are applied when the map is entered
  pg.evaluate("APP.game.update({adv:Object.assign({},APP.game.state.adv,{flags:Object.assign({},APP.game.state.adv.flags,{'lv:L1':true})})})")
  pg.reload(); pg.wait_for_timeout(1300); pg.evaluate("WORLD.enter('dg-lamp')"); pg.wait_for_timeout(400)
  print('after reload: gates', gates(), '| flags:', pg.evaluate("JSON.stringify(APP.game.state.adv.flags)"))
  print('errors:', errs or 'none'); b.close()
done()
