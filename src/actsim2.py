# Live bot against each element's enemy in the real world loop: walks toward it and taps the quick slash. Prints time to kill and share of the lead's HP lost.
# Usage: python3 actsim2.py [trials]     (needs the pwhook seed hook: run with PYTHONPATH=src/pwhook)
import sys
from playwright.sync_api import sync_playwright
N = int(sys.argv[1]) if len(sys.argv) > 1 else 4
BOT = """(el) => new Promise((res) => {
  ACT.enemies.splice(0); ACT.spawn(1, el); const m = ACT.enemies[0]; if (!m) return res(null);
  const M = WORLD.map; let spot = null; for (let y = 8; y < M.H - 8 && !spot; y++) for (let x = 8; x < M.W - 8 && !spot; x++) { let ok = true; for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -4; dx <= 4 && ok; dx++) if (WORLD.solidAt(x + dx, y + dy)) ok = false; if (ok) spot = [x, y]; }
  if (!spot) return res(null); WORLD.setPos((spot[0] + 0.5) * 32, (spot[1] + 0.5) * 32);
  const p = WORLD.pos(); m.x = p.x + 130; m.y = p.y; m.hx = m.x; m.hy = m.y; m.mode = 'chase'; m.cd = 0.5;
  ACT.hero.hp = ACT.hero.max; ACT.setSel(0); const hp0 = ACT.hero.max, t0 = performance.now(); let alive = true;
  const iv = setInterval(() => { const t = (performance.now() - t0) / 1000, mm = ACT.enemies[0], pos = WORLD.pos();
    if (!mm || mm.s.hp <= 0 || mm !== m) { clearInterval(iv); WORLD.input.jx = 0; WORLD.input.jy = 0; return res({ ok: true, t: t, lost: 1 - ACT.hero.hp / hp0 }); }
    if (t > 30 || ACT.down) { clearInterval(iv); WORLD.input.jx = 0; WORLD.input.jy = 0; return res({ ok: false, t: t, lost: 1 - ACT.hero.hp / hp0 }); }
    const dx = mm.x - pos.x, dy = mm.y - pos.y, d = Math.hypot(dx, dy) || 1;
    if (d > 45) { WORLD.input.jx = dx / d; WORLD.input.jy = dy / d; } else { WORLD.input.jx = dx / d * 0.25; WORLD.input.jy = dy / d * 0.25; }
    ACT.attack(); }, 50); })"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 780}); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    pg.evaluate("APP.game.update({caught:[{seed:2,stage:3,lv:15}],party:[2],fighter:2,intro:true,xp:99999,settings:Object.assign({},APP.game.state.settings,{arpg:true,follow:true,weather:false,ambient:false})}); document.getElementById('tip')&&(document.getElementById('tip').hidden=true); DEV.safe=true")
    pg.evaluate("WORLD.enter('moss'); WORLD.setPaused(false)"); pg.wait_for_timeout(1300)
    for el in ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom']:
        rs = []
        for i in range(N):
            pg.evaluate("ACT.enemies.splice(0)"); pg.wait_for_timeout(300)
            r = pg.evaluate(BOT, el)
            if r: rs.append(r)
            pg.evaluate("(()=>{ACT.hero.hp=ACT.hero.max})()"); pg.wait_for_timeout(5200)
        if rs: print(f"{el:6s}: killed {sum(1 for r in rs if r['ok'])}/{len(rs)} | avg time {sum(r['t'] for r in rs)/len(rs):4.1f}s | avg HP lost {100*sum(r['lost'] for r in rs)/len(rs):3.0f}%")
    b.close()
