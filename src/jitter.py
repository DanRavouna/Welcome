# Player and camera screen position are steady at several pixel ratios and refresh rates.
from playwright.sync_api import sync_playwright
JS = """(hz) => {
  WORLD.enter('town'); const TS = WORLD.TS; WORLD.setPos(26 * TS, 18.6 * TS);
  const res = { newX: new Set(), newY: new Set(), oldWobble: 0, camSteps: new Set(), frames: 0 };
  let prevCam = null; const vw = innerWidth, vh = innerHeight;
  for (let i = 0; i < hz * 2; i++) {
    WORLD.input.jx = 1; WORLD.input.jy = 0.35; WORLD.step(1 / hz); WORLD.drawNow();
    const d = WORLD.debug(); res.frames++;
    res.newX.add(d.player.x.toFixed(3)); res.newY.add(d.player.y.toFixed(3));
    if (prevCam) res.camSteps.add((d.cam.cx - prevCam.cx).toFixed(2));
    prevCam = d.cam;
    // what the previous code would have drawn: camera and player rounded to the 2px grid separately
    const p = WORLD.pos(); const cxRaw = p.x - vw / 2; const cxOld = Math.round(cxRaw / 2) * 2; const pOld = Math.round((p.x - cxOld) / 2) * 2;
    res.oldSet = res.oldSet || new Set(); res.oldSet.add(pOld);
  }
  WORLD.input.jx = 0; WORLD.input.jy = 0;
  return { frames: res.frames, playerScreenX_new: [...res.newX], playerScreenY_new: [...res.newY], playerScreenX_old: [...res.oldSet], cameraStepSizes: [...res.camSteps].slice(0, 8) };
}"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for dpr in (1, 2, 3):
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=dpr, has_touch=True)
        pg = ctx.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(900)
        pg.evaluate("window.__r=Math.random; Math.random=()=>0.999")
        for hz in (60, 90, 120):
            r = pg.evaluate(JS, hz)
            print(f"dpr {dpr} @ {hz}Hz: player x positions NEW={r['playerScreenX_new']} y={r['playerScreenY_new']} | OLD={r['playerScreenX_old']} | camera step sizes {r['cameraStepSizes']}")
        ctx.close()
    b.close()
