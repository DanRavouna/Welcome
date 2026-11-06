import sys, json
from playwright.sync_api import sync_playwright
cfg = json.loads(sys.argv[1])
JS = """(cfg) => { const g = APP.game; const all = Object.values(WORLD.allNpcs()).flat().filter(n => n.leader || n.trainer);
  const eff = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' };
  const smart = (bt) => { const P = bt.s[0], D = bt.s[1], s = P.k.kit[3]; if (P.uses > 0) { if (s.effect === 'heal' && P.hp < P.max * 0.45) return 3; if (s.effect === 'fortify' && P.fort === 0) return 3; if (eff[s.effect] && D[eff[s.effect]] === 0) return 3; } return 0; };
  const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const out = {};
  for (const L0 of all) { const L = Object.assign({}, L0, cfg.over[L0.id] || {}); g._teams = {}; const team = g.teamFor(L); out[L.id] = [];
    for (const st of [1, 2, 3]) { let wins = 0; const N = cfg.n;
      for (let t = 0; t < N; t++) { const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(Math.random() * 999998), st)); pool.sort((a, b) => power(b) - power(a));
        const party = pool.slice(0, cfg.party);
        const foe0 = g.make(team[0], L.stage); let bt = g.newBattle(party[0], foe0, 0); bt.bench = party.slice(1).map(k => g.newBattle(k, foe0, 0).s[0]); let idx = 0, res = null;
        for (let guard = 0; guard < 400 && res === null; guard++) { g.resolve(bt, smart(bt), Math.random);
          if (bt.s[1].hp <= 0) { if (idx < team.length - 1) { idx++; const me = bt.s[0]; me.hp = Math.min(me.max, me.hp + Math.round(me.max * cfg.heal)); bt.s[1] = g.newBattle(me.k, g.make(team[idx], L.stage), 0).s[1]; bt.over = false; } else res = true; }
          if (res === null && bt.s[0].hp <= 0) { const j = bt.bench.findIndex(s => s.hp > 0); if (j !== -1) { const o = bt.s[0]; bt.s[0] = bt.bench[j]; bt.bench[j] = o; bt.over = false; } else res = false; }
          if (res === null && bt.over) res = false; }
        if (res) wins++; }
      out[L.id].push(Math.round(100 * wins / N)); } }
  return out; }"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1000)
    r=pg.evaluate(JS, cfg)
    for k in ['rowan','ivy','wren','bram','glacia','kiki','blaze','marlo','coral']: print(k.ljust(7), 'stage1/2/3:', '/'.join(str(x).rjust(3)+'%' for x in r[k]), ' ', cfg['over'].get(k,''))
    b.close()
