# Standing layout test: no HUD element may overlap another, at 6 phone widths x 3 value sizes.
from playwright.sync_api import sync_playwright
import sys
JS = """() => {
  const sel = { plank: '#plank', rolls: '#c-rolls', essence: '#c-ess', level: '#c-lv', menu: '#b-menu', joystick: '#stick', action: '#act' };
  const R = {}; for (const k in sel) { let el = document.querySelector(sel[k]); if (!el) continue; if (el.closest('.chip')) el = el.closest('.chip'); if (el.closest('[hidden]')) continue; const r = el.getBoundingClientRect(); if (r.width) R[k] = r; }
  const out = [], keys = Object.keys(R), W = innerWidth;
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const a = R[keys[i]], b = R[keys[j]];
    const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ox > 0.5 && oy > 0.5) out.push(keys[i] + '/' + keys[j]); }
  keys.forEach((k) => { if (R[k].right > W + 0.5 || R[k].left < -0.5) out.push(k + ' off-screen'); });
  return out; }"""
SAVES = {
  'new': "{caught:[{seed:12,stage:1}],party:[12],intro:true,hints:['grass','zone','battle','party','shop','evolve'],essence:0,xp:0,settings:{test:false}}",
  'mid': "{caught:[{seed:12,stage:1},{seed:30,stage:1}],party:[12,30],intro:true,hints:['grass','zone','battle','party','shop','evolve'],essence:250,xp:2500,settings:{test:false}}",
  'big': "{caught:[{seed:12,stage:1},{seed:30,stage:1}],party:[12,30],intro:true,hints:['grass','zone','battle','party','shop','evolve'],essence:98765,xp:400000,settings:{test:true}}",
}
bad = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h in [(320, 640), (360, 740), (375, 667), (390, 844), (412, 915), (430, 932)]:
        row = []
        for name, save in SAVES.items():
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, has_touch=True); pg = ctx.new_page()
            pg.add_init_script("localStorage.getItem('critter-roll:v2') || localStorage.setItem('critter-roll:v2', JSON.stringify(" + save + "))")
            pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
            o = pg.evaluate(JS); bad += len(o); row.append(name + ': ' + (', '.join(o) if o else 'ok'))
            if len(sys.argv) > 1 and w in (320, 390) and name == 'big': pg.screenshot(path=f'/tmp/hud_{w}.png', clip={'x': 0, 'y': 0, 'width': w, 'height': 200})
            ctx.close()
        print(f'{w}px  ' + ' | '.join(row))
    b.close()
print('TOTAL OVERLAPS:', bad)
