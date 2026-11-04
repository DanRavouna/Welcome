# How strong is the secret critter? Win rate of a party led by Veilcrown vs an ordinary best-of-10 party (stage 3), against chosen trainers.
# Usage: python3 secretsim.py <lv> <n> <trainerId> [...]   (env SECRET=2 simulates Wickling, SECRET=3 Slagback, otherwise Veilcrown)
import sys, os
from playwright.sync_api import sync_playwright
lv, N, ids = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]
SEED = {'2': 'SECRET2_SEED', '3': 'SECRET3_SEED'}.get(os.environ.get('SECRET'), 'SECRET_SEED')
JS = """(cfg) => { const g = APP.game; const all = Object.values(WORLD.allNpcs()).flat(); const eff = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' };
  const smart = (bt) => { const P = bt.s[0], D = bt.s[1], s = P.k.kit[3]; if (P.uses > 0) { if (s.effect === 'heal' && P.hp < P.max * 0.45) return 3; if (s.effect === 'fortify' && P.fort === 0) return 3; if (eff[s.effect] && D[eff[s.effect]] === 0) return 3; } return 0; };
  const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const out = {};
  for (const id of cfg.ids) { const L = all.find(n => n.id === id); g._teams = {}; const team = g.teamFor(L); out[id] = {};
    for (const mode of ['ordinary', 'with the secret critter']) { let wins = 0;
      for (let t = 0; t < cfg.n; t++) { const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(Math.random() * 999998), 3, cfg.lv)); pool.sort((a, b) => power(b) - power(a));
        const party = mode === 'ordinary' ? pool.slice(0, 3) : [g.make(SECRET_SEED, 3, cfg.lv)].concat(pool.slice(0, 2));
        const foe0 = g.make(team[0], L.stage, L.lv || 1); let bt = g.newBattle(party[0], foe0, 0); bt.bench = party.slice(1).map(k => g.newBattle(k, foe0, 0).s[0]); let idx = 0, res = null;
        for (let guard = 0; guard < 400 && res === null; guard++) { g.resolve(bt, smart(bt), Math.random);
          if (bt.s[1].hp <= 0) { if (idx < team.length - 1) { idx++; bt.s[1] = g.newBattle(bt.s[0].k, g.make(team[idx], L.stage, L.lv || 1), 0).s[1]; bt.over = false; } else res = true; }
          if (res === null && bt.s[0].hp <= 0) { const j = bt.bench.findIndex(s => s.hp > 0); if (j !== -1) { const o = bt.s[0]; bt.s[0] = bt.bench[j]; bt.bench[j] = o; bt.over = false; } else res = false; }
          if (res === null && bt.over) res = false; }
        if (res) wins++; }
      out[id][mode] = Math.round(100 * wins / cfg.n); } }
  return out; }"""
JS = JS.replace('SECRET_SEED', SEED)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    r = pg.evaluate(JS, {'lv': lv, 'n': N, 'ids': ids})
    for k, v in r.items(): print(f"vs {k:7s} (party stage 3, Lv {lv}): ordinary {v['ordinary']:3d}% | with the secret critter leading {v['with the secret critter']:3d}%  ({v['with the secret critter']-v['ordinary']:+d})")
    b.close()
