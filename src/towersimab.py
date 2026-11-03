# Champion's Tower calibration: full runs with HP carry-over, using the game's own battle code.
import sys, json
from playwright.sync_api import sync_playwright
cfg = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
JS = """(cfg) => { const g = APP.game; if (cfg.curve) { window.__towerCurve = Object.assign({}, cfg.curve, { v: Math.random() }); } g._teams = {};
  if (cfg.twist) { window.__twist = cfg.twist; } else { delete window.__twist; } g._teams = {}; g._surge = cfg.twist && cfg.twist.id === 'surge' ? cfg.twist.type : null;
  const heal = cfg.twist ? cfg.twist.heal : (cfg.heal === undefined ? 0.3 : cfg.heal), revive = cfg.revive !== false;
  const eff = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' };
  const smart = (bt) => { const P = bt.s[0], D = bt.s[1], s = P.k.kit[3]; if (P.uses > 0) { if (s.effect === 'heal' && P.hp < P.max * 0.45) return 3; if (s.effect === 'fortify' && P.fort === 0) return 3; if (eff[s.effect] && D[eff[s.effect]] === 0) return 3; } return 0; };
  const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const out = {};
  const teams = []; for (let f = 1; f <= 20; f++) { const T = g.towerFloor(f); teams.push([T, g.teamFor(T)]); }
  for (const [name, st, lv, pool] of cfg.models) { const reach = new Array(22).fill(0); const floorWin = new Array(21).fill(0), floorTry = new Array(21).fill(0);
    for (let t = 0; t < cfg.n; t++) { const cand = []; for (let i = 0; i < pool; i++) cand.push(g.make(1 + Math.floor(Math.random() * 999998), st, lv)); cand.sort((a, b) => power(b) - power(a));
      const party = cand.slice(0, 3); const max = party.map(k => Math.round(k.stats[0].value * 1.5 + 60)); let hp = max.slice(); let f = 1;
      for (; f <= 20; f++) { const [T, team] = teams[f - 1]; floorTry[f]++;
        const alive = party.map((k, i) => i).filter(i => hp[i] > 0); if (!alive.length) break;
        const foe0 = g.make(team[0], T.stage, T.lv); const sides = party.map((k, i) => { const s = g.newBattle(k, foe0, 0).s[0]; s.hp = hp[i]; s.i = i; return s; });
        const bt = g.newBattle(party[alive[0]], foe0, 0); bt.s[0] = sides[alive[0]]; bt.bench = sides.filter((s, i) => i !== alive[0]); let idx = 0, res = null;
        for (let guard = 0; guard < 500 && res === null; guard++) { g.resolve(bt, smart(bt), Math.random);
          if (bt.s[1].hp <= 0) { if (idx < team.length - 1) { idx++; bt.s[1] = g.newBattle(bt.s[0].k, g.make(team[idx], T.stage, T.lv), 0).s[1]; bt.over = false; } else res = true; }
          if (res === null && bt.s[0].hp <= 0) { const j = bt.bench.findIndex(s => s.hp > 0); if (j !== -1) { const o = bt.s[0]; bt.s[0] = bt.bench[j]; bt.bench[j] = o; bt.over = false; } else res = false; }
          if (res === null && bt.over) res = false; }
        if (!res) break; floorWin[f]++;
        [bt.s[0]].concat(bt.bench).forEach(s => { hp[s.i] = Math.max(0, s.hp); });
        hp = hp.map((h, i) => (h > 0 || revive) ? Math.min(max[i], h + Math.round(max[i] * heal)) : 0); }
      reach[f - 1]++; }
    const cleared = reach; let acc = 0; const atLeast = []; for (let f = 20; f >= 0; f--) { acc += cleared[f]; atLeast[f] = Math.round(100 * acc / cfg.n); }
    let med = 0; for (let f = 0; f <= 20; f++) if (atLeast[f] >= 50) med = f;
    out[name] = { median: med, pClear: { 3: atLeast[3], 5: atLeast[5], 10: atLeast[10], 15: atLeast[15], 20: atLeast[20] }, floorWinPct: floorWin.map((w, i) => floorTry[i] ? Math.round(100 * w / floorTry[i]) : null).slice(1) }; }
  return out; }"""
cfg.setdefault('n', 300); cfg.setdefault('models', [['A fresh Lv14', 3, 14, 10], ['B mid Lv17', 3, 17, 15], ['C maxed Lv20', 3, 20, 25]])
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200); pg.evaluate('window.__noAb = ' + ('true' if __import__('os').environ.get('NOAB') else 'false'))
    r = pg.evaluate(JS, cfg)
    for k, v in r.items(): print(f"{k:14s} median floors cleared {v['median']:2d} | % clearing >=3:{v['pClear']['3']:3d} >=5:{v['pClear']['5']:3d} >=10:{v['pClear']['10']:3d} >=15:{v['pClear']['15']:3d} all20:{v['pClear']['20']:3d}")
    if cfg.get('detail'):
        for k, v in r.items(): print(k, 'per-floor win% (given reached):', v['floorWinPct'])
    b.close()
