# Dungeon trainer balance: tries many (size, pick, lv) settings for one trainer against one assumed player party.
# Usage: python3 dgsim.py <trainerId> <stage> <lv> '[[size,pick,lv],...]' [n]
import sys, json
from playwright.sync_api import sync_playwright
tid, pst, plv, combos = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), json.loads(sys.argv[4]); N = int(sys.argv[5]) if len(sys.argv) > 5 else 400
JS = """(cfg) => { const g = APP.game; const all = Object.values(WORLD.allNpcs()).flat(); const base = all.find(n => n.id === cfg.id); const eff = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' };
  const smart = (bt) => { const P = bt.s[0], D = bt.s[1], s = P.k.kit[3]; if (P.uses > 0) { if (s.effect === 'heal' && P.hp < P.max * 0.45) return 3; if (s.effect === 'fortify' && P.fort === 0) return 3; if (eff[s.effect] && D[eff[s.effect]] === 0) return 3; } return 0; };
  const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const out = [];
  for (const [size, pick, lv] of cfg.combos) { const L = Object.assign({}, base, { size, pick, lv }); g._teams = {}; const team = g.teamFor(L); let wins = 0;
    for (let t = 0; t < cfg.n; t++) { const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(Math.random() * 999998), cfg.pst, cfg.plv)); pool.sort((a, b) => power(b) - power(a));
      const party = pool.slice(0, 3); const foe0 = g.make(team[0], L.stage, L.lv); let bt = g.newBattle(party[0], foe0, 0); bt.bench = party.slice(1).map(k => g.newBattle(k, foe0, 0).s[0]); let idx = 0, res = null;
      for (let guard = 0; guard < 400 && res === null; guard++) { g.resolve(bt, smart(bt), Math.random);
        if (bt.s[1].hp <= 0) { if (idx < team.length - 1) { idx++; bt.s[1] = g.newBattle(bt.s[0].k, g.make(team[idx], L.stage, L.lv), 0).s[1]; bt.over = false; } else res = true; }
        if (res === null && bt.s[0].hp <= 0) { const j = bt.bench.findIndex(s => s.hp > 0); if (j !== -1) { const o = bt.s[0]; bt.s[0] = bt.bench[j]; bt.bench[j] = o; bt.over = false; } else res = false; }
        if (res === null && bt.over) res = false; }
      if (res) wins++; }
    out.push({ size, pick, lv, team: team.length, types: team.map(s => g.make(s, 1).element.name).join('/'), win: Math.round(100 * wins / cfg.n) }); }
  return out; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    for r in pg.evaluate(JS, {'id': tid, 'pst': pst, 'plv': plv, 'combos': combos, 'n': N}):
        print(f"{tid:7s} vs party stage {pst} lv {plv} | size {r['size']} pick {r['pick']:.2f} lv {r['lv']:2d} -> win {r['win']:3d}%  team {r['types']}")
    b.close()
