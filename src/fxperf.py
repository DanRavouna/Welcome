from playwright.sync_api import sync_playwright
import sys
f=sys.argv[1] if len(sys.argv)>1 else '/mnt/user-data/outputs/critter-roll-world.html'
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(viewport={'width':390,'height':844}, device_scale_factor=3)
  pg.goto('file://'+f); pg.wait_for_timeout(1100)
  r=pg.evaluate("""async()=>{const g=APP.game; const seeds=[]; for(let s=300;seeds.length<2;s++) if(g.make(s,1).rarity!=='Mythic') seeds.push(s);
    const act=[], frames=[]; let run=true, last=performance.now(); const loop=(t)=>{frames.push(t-last); last=t; if(run) requestAnimationFrame(loop)}; requestAnimationFrame(loop);
    for(let n=0;n<25;n++){ const nb=g.newBattle(g.make(seeds[0],3,20), g.make(seeds[1],1,1), 0); nb.s[1].hp=nb.s[1].max*4; g.setState({battle:nb,trainer:null,bmode:'moves'}); if(n===0) APP.open('battle');
      await new Promise(r=>setTimeout(r,60)); const t0=performance.now(); g.battleAction({move:0}); act.push(performance.now()-t0); await new Promise(r=>setTimeout(r,180)); }
    run=false; frames.sort((a,b)=>a-b); act.sort((a,b)=>a-b); const q=(a,p)=>a[Math.floor(p*(a.length-1))].toFixed(1);
    return {action_median_ms:q(act,.5), action_p90_ms:q(act,.9), frame_median_ms:q(frames,.5), frame_p95_ms:q(frames,.95), frames:frames.length};}""")
  print(f.split('/')[-1], r); b.close()
