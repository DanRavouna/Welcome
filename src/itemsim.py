# City item value: win% with exactly one item vs leader fights, using the game's own battle code.
import sys, json
from playwright.sync_api import sync_playwright
cfg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
JS = """(cfg) => { const g = APP.game; if (cfg.fx) window.__itemFx = cfg.fx; const FX = window.__itemFx || ITEM_FX;
  const eff = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' };
  const smart = (bt) => { const P = bt.s[0], D = bt.s[1], s = P.k.kit[3]; if (P.uses > 0) { if (s.effect === 'heal' && P.hp < P.max * 0.45) return 3; if (s.effect === 'fortify' && P.fort === 0) return 3; if (eff[s.effect] && D[eff[s.effect]] === 0) return 3; } return 0; };
  const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const all = WORLD.allNpcs(); const find = (id) => { for (const k in all) { const n = all[k].find((x) => x.id === id); if (n) return n; } };
  const out = {};
  for (const [lid, st, lv] of cfg.fights) { const L = find(lid), team = g.teamFor(L); out[lid] = {};
    for (const mode of cfg.modes) { let wins = 0;
      for (let t = 0; t < cfg.n; t++) { const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(Math.random() * 999998), st, lv)); pool.sort((a, b) => power(b) - power(a));
        const party = pool.slice(0, 3); let idx = 0, used = false, res = null; const foe = (i) => g.make(team[i], L.stage, L.lv || 1);
        const bt = g.newBattle(party[0], foe(0), 0); bt.bench = party.slice(1).map((k) => g.newBattle(k, foe(0), 0).s[0]);
        for (let guard = 0; guard < 400 && res === null; guard++) { const P = bt.s[0]; let mi = smart(bt);
          if (!used && mode !== 'none') { const statused = P.burn > 0 || P.weak > 0 || P.daze > 0 || P.sap > 0;
            if (mode === 'super' && P.hp < P.max * 0.35) { P.hp = P.max; used = true; mi = -1; }
            else if (mode === 'potion' && P.hp < P.max * 0.35) { P.hp = Math.min(P.max, P.hp + Math.round(P.max * 0.4)); used = true; mi = -1; }
            else if (mode === 'whet') { P.boost = FX.whet.mult; used = true; mi = -1; }
            else if (mode === 'ward') { P.ward = FX.ward.hits; used = true; mi = -1; }
            else if (mode === 'herb' && (statused || P.hp < P.max * 0.5)) { P.hp = Math.min(P.max, P.hp + Math.round(P.max * FX.herb.heal)); P.burn = P.weak = P.daze = P.sap = 0; used = true; mi = -1; } }
          g.resolve(bt, mi, Math.random);
          if (bt.s[1].hp <= 0) { if (idx < team.length - 1) { idx++; bt.s[1] = g.newBattle(bt.s[0].k, foe(idx), 0).s[1]; bt.over = false; } else res = true; }
          if (res === null && bt.s[0].hp <= 0) { const j = bt.bench.findIndex((s) => s.hp > 0); if (j !== -1) { const o = bt.s[0]; bt.s[0] = bt.bench[j]; bt.bench[j] = o; bt.over = false; } else res = false; }
          if (res === null && bt.over) res = false; }
        if (res) wins++; }
      out[lid][mode] = Math.round(100 * wins / cfg.n); } }
  return out; }"""
cfg.setdefault('n', 500); cfg.setdefault('fights', [['glacia', 2, 7], ['coral', 3, 13]]); cfg.setdefault('modes', ['none', 'super', 'ward', 'whet', 'herb'])
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1100)
    r = pg.evaluate(JS, cfg)
    for k, v in r.items(): print(f"{k:7s} " + '  '.join(f"{m}:{v[m]}%" for m in cfg['modes']))
    b.close()
