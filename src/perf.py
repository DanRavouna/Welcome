from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=3, has_touch=True)
    pg=ctx.new_page(); cdp=ctx.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
    import time; t=time.time(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP !== 'undefined' && APP.game && APP.game.state && APP.game.state.seen"); print('load to playable: %.0f ms' % ((time.time()-t)*1000))
    pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
    print(pg.evaluate("""() => { const g=APP.game; const caught=[]; for(let i=1;caught.length<150;i+=37) caught.push({seed:i, stage:1+(i%3)});
      g.update({caught}); const T=(f)=>{const t=performance.now(); f(); return Math.round(performance.now()-t);};
      const r={}; r.renderVals_150=T(()=>g.renderVals()); r.renderVals_again=T(()=>g.renderVals());
      g.setState({tab:'dex'}); r.openDex_first=T(()=>{ APP.open('dex'); }); APP.close();
      g.setState({dexView:'species'}); r.openSpecies=T(()=>{ APP.open('dex'); g.setState({dexView:'species'}); g.renderVals(); }); APP.close();
      r.keep_update=T(()=>g.update({essence:g.state.essence+1}));
      // world frame cost
      let n=0; const t0=performance.now(); for(let i=0;i<60;i++){ WORLD.input.jx=1; WORLD.step(1/60); WORLD.drawNow(); } r.world_frame_avg=((performance.now()-t0)/60).toFixed(1);
      return r; }"""))
    b.close()
