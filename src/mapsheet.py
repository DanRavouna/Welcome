# Top-down colour sheet of chosen maps (tiles as coloured squares, exits as red marks): python3 mapsheet.py out.png mapId [mapId ...]
import sys, base64
from playwright.sync_api import sync_playwright
out = sys.argv[1]; ids = sys.argv[2:]
JS = """(ids) => { const C = { '.': '#5E9A4A', ',': '#6FB05A', '=': '#C9AE7E', T: '#1F5A2E', R: '#8E98AD', W: '#2E7A3A', Z: '#F5D24A', '~': '#3E8EF7', O: '#8A5A32', G: '#FFFFFF', C: '#3A3A4A', X: '#B7BFCF' };
  const Z = 8, pad = 14, maps = ids.map(i => WORLD.MAPS[i]); const w = maps.reduce((a, m) => a + m.W * Z + pad, pad), h = Math.max(...maps.map(m => m.H * Z)) + 40;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); c.fillStyle = '#20242E'; c.fillRect(0, 0, w, h); let x0 = pad;
  maps.forEach((m) => { c.fillStyle = '#FFF'; c.font = 'bold 12px sans-serif'; c.fillText(m.name + ' (' + m.id + ')', x0, 14);
    for (let y = 0; y < m.H; y++) for (let x = 0; x < m.W; x++) { c.fillStyle = C[m.grid[y][x]] || '#FF00FF'; c.fillRect(x0 + x * Z, 24 + y * Z, Z, Z); }
    m.exits.forEach((e) => { c.fillStyle = '#FF3030'; const a = e.a, b = e.b + 1; if (e.edge === 'n') c.fillRect(x0 + a * Z, 20, (b - a) * Z, 4); else if (e.edge === 's') c.fillRect(x0 + a * Z, 24 + m.H * Z, (b - a) * Z, 4); else if (e.edge === 'w') c.fillRect(x0 - 4, 24 + a * Z, 4, (b - a) * Z); else c.fillRect(x0 + m.W * Z, 24 + a * Z, 4, (b - a) * Z); c.fillStyle = '#FFE08A'; c.font = '10px sans-serif'; c.fillText(e.to.replace('route-mf-', '').replace('route-', ''), x0 + (e.edge === 'e' ? m.W * Z - 50 : (e.edge === 'w' ? 6 : (e.a * Z))), 24 + (e.edge === 's' ? m.H * Z - 4 : (e.edge === 'n' ? 14 : e.a * Z))); });
    x0 += m.W * Z + pad; });
  return cv.toDataURL('image/png'); }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1000)
    d = pg.evaluate(JS, ids); open(out, 'wb').write(base64.b64decode(d.split(',')[1])); print('wrote', out); b.close()
