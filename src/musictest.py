# Music: track data (bar lengths), the first tap unlocks audio, track follows the place.
from playwright.sync_api import sync_playwright
import struct, wave
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(args=['--autoplay-policy=user-gesture-required']); pg=b.new_page(viewport={'width':390,'height':844})
  pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
  print('bar lengths ok:', pg.evaluate("Object.entries(MUSIC._T).every(([k,t])=>{const bars=t.lead.split('|').map(x=>x.trim().split(/\\s+/).length); return bars.length===8&&bars.every(n=>n===8)&&t.chords.split(' ').length===8&&t.steps.length===64})"))
  print('before tap:', pg.evaluate("MUSIC.state"))
  pg.mouse.click(200,300); pg.wait_for_timeout(900); print('after tap:', pg.evaluate("MUSIC.state"))
  pg.evaluate("WORLD.enter('ember')"); pg.wait_for_timeout(900); print('ember:', pg.evaluate("MUSIC.current"))
  pg.evaluate("APP.open('battle')"); pg.wait_for_timeout(900); print('arena:', pg.evaluate("MUSIC.current"))
  pg.evaluate("APP.close(); APP.startTrainer(Object.values(WORLD.allNpcs()).flat().find(n=>n.leader))"); pg.wait_for_timeout(900); print('leader:', pg.evaluate("MUSIC.current"))
  pg.evaluate("APP.close()"); pg.wait_for_timeout(900); print('back:', pg.evaluate("MUSIC.current"))
  pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true}); document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(300); print('hidden:', pg.evaluate("MUSIC.state.running"))
  pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false}); document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(300); print('visible again:', pg.evaluate("MUSIC.state.running"))
  pg.evaluate("APP.game.update({settings:Object.assign({},APP.game.state.settings,{music:false})})"); pg.wait_for_timeout(600); print('toggle off:', pg.evaluate("MUSIC.state"))
  pg.reload(); pg.wait_for_timeout(1100); print('off kept after reload:', pg.evaluate("APP.game.state.settings.music"))
  # loudness: render each track offline (1 loop), compare with sfx peak 0.1
  stats=pg.evaluate("""async()=>{const out={}; for(const id of MUSIC.tracks){ const d=await MUSIC._render(id,1); let pk=0,sq=0; for(let i=0;i<d.length;i++){const a=Math.abs(d[i]); if(a>pk)pk=a; sq+=d[i]*d[i];} out[id]={peak:+pk.toFixed(3), rms:+Math.sqrt(sq/d.length).toFixed(4), secs:+(d.length/22050).toFixed(1)}; } return out;}""")
  for k,v in stats.items(): print(f'  {k:7s} {v}')
  # write a preview WAV: 1 loop of town + battle + boss
  smp=pg.evaluate("""async()=>{let a=[]; for(const id of ['town','moss','battle','boss']){ const d=await MUSIC._render(id,1); const k=8/0.05; for(let i=0;i<d.length;i+=1) a.push(Math.max(-1,Math.min(1,d[i]*4))); } return a;}""")
  w=wave.open('/mnt/user-data/outputs/critter-roll-music-preview.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(22050)
  w.writeframes(b''.join(struct.pack('<h',int(x*32000)) for x in smp)); w.close()
  print('errors:', errs or 'none'); b.close()
