# Action mode difficulty: a bot that taps the quick slash whenever ready (0.15 s reaction) against wild critters, using the real Game.hit and the same timings as action.js.
# Usage: python3 actsim.py <heroLv> <foeLvDelta> <n>      (1 enemy and 3 enemies at once; 20% of enemy swings whiff because you move)
import sys
from playwright.sync_api import sync_playwright
lv, dl, N = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
JS = """(c) => { const g = APP.game, rand = Math.random; const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const R = {};
  for (const grp of [1, 3]) { let wins = 0, tk = 0, hpLost = 0, kills = 0, tt = 0;
    for (let t = 0; t < c.n; t++) {
      const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(rand() * 999998), 3, c.lv)); pool.sort((a, b) => power(b) - power(a)); const hk = pool[0];
      const hero = g.newBattle(hk, hk, 0).s[0]; const foes = []; for (let i = 0; i < grp; i++) { const fk = g.make(1 + Math.floor(rand() * 999998), 3, Math.max(1, c.lv + c.dl)); const s = g.newBattle(hk, fk, 0).s[1]; foes.push({ s: s, k: fk, cd: 0.6 + i * 0.5 + rand() * 0.4, tele: 0, state: 'wait' }); }
      let time = 0, cd = 0.2, dead = false, k0 = 0; const hp0 = hero.hp;
      while (time < 90 && foes.some(f => f.s.hp > 0) && !dead) { time += 0.05; cd -= 0.05;
        if (cd <= 0) { const f = foes.filter(f => f.s.hp > 0).sort((a, b) => a.s.hp - b.s.hp)[0]; if (f) { g.hit(hero, f.s, hk.kit[0].power, rand); delete f.s.fxHits; cd = 0.45 + 0.15 + 0.1; if (f.s.hp <= 0) { kills++; k0++; } } }
        for (const f of foes) { if (f.s.hp <= 0) continue; f.cd -= 0.05; if (f.tele > 0) { f.tele -= 0.05; if (f.tele <= 0 && rand() > 0.2 && !(f.s.daze > 0 && rand() < 0.45)) { g.hit(f.s, hero, f.k.kit[0].power, rand); delete hero.fxHits; if (hero.hp <= 0) dead = true; } } else if (f.cd <= 0) { f.tele = 0.32; f.cd = 1.5 + rand() * 0.5; } } }
      if (!dead) wins++; tt += time; hpLost += (hp0 - Math.max(0, hero.hp)) / hp0; tk += k0; }
    R[grp] = { win: Math.round(100 * wins / c.n), secs: +(tt / c.n).toFixed(1), hpLostPct: Math.round(100 * hpLost / c.n), killsPerRun: +(tk / c.n).toFixed(2) }; }
  return R; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    r = pg.evaluate(JS, {'lv': lv, 'dl': dl, 'n': N})
    print(f"hero Lv {lv} vs foes Lv {lv+dl} (n={N}): 1 enemy {r['1']} | 3 at once {r['3']}")
    b.close()
