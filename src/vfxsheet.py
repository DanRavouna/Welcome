# Contact sheet of every generated effect, per element: slash (quick, heavy), impact (small, big), projectile. Writes /tmp/vfx-sheet.png
import sys
from playwright.sync_api import sync_playwright
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/vfx-sheet.png'
JS = """() => { const els = [['Ember','#FF7A45'],['Tide','#3E8EF7'],['Moss','#4FB06D'],['Volt','#F5C518'],['Frost','#8FD8EA'],['Dusk','#8B6CF0'],['Stone','#A79C90'],['Bloom','#F27BB5']];
  const Z = 2, cw = 1600, rowH = 190, cv = document.createElement('canvas'); cv.width = cw; cv.height = rowH * els.length + 20; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#35603A'; c.fillRect(0, 0, cv.width, cv.height);
  els.forEach(([el, hex], r) => { const y0 = r * rowH + 10; c.fillStyle = '#FFFFFF'; c.font = 'bold 15px sans-serif'; c.fillText(el, 6, y0 + 16);
    let x = 70;
    const q = VFX.slashSet(el, hex, 0, 0), h = VFX.slashSet(el, hex, 0, 1), i1 = VFX.impactSet(el, hex, 0), i2 = VFX.impactSet(el, hex, 1);
    q.frames.forEach((f) => { c.drawImage(f, x, y0, q.S * Z, q.S * Z); x += q.S * Z * 0.78; }); x += 20;
    h.frames.forEach((f) => { c.drawImage(f, x, y0 - 10, h.S * Z * 0.9, h.S * Z * 0.9); x += h.S * Z * 0.7; }); x += 20;
    i1.frames.forEach((f) => { c.drawImage(f, x, y0 + 10, i1.S * Z, i1.S * Z); x += i1.S * Z * 0.85; }); x += 14;
    i2.frames.slice(1, 4).forEach((f) => { c.drawImage(f, x, y0 - 6, i2.S * Z, i2.S * Z); x += i2.S * Z * 0.85; }); x += 14;
    const o = VFX.orb(el, hex); c.drawImage(o, x, y0 + 40, 14 * 4, 14 * 4); });
  return cv.toDataURL('image/png'); }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1000)
    import base64
    d = pg.evaluate(JS); open(out, 'wb').write(base64.b64decode(d.split(',')[1])); print('wrote', out, errs or 'no errors'); b.close()
