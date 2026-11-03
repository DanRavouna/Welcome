# Days to reach species milestones under the real daily economy (uses the game's make()).
from playwright.sync_api import sync_playwright
JS = """(cfg) => { const g = APP.game, COST = { Common: 1, Uncommon: 2, Rare: 4, Mythic: 8 }, out = {};
  for (const [name, sightings] of cfg.models) { const days = { 12: [], 24: [], 36: [], 48: [] };
    for (let t = 0; t < cfg.n; t++) { const seen = new Set(); const hit = {};
      for (let d = 1; d <= 400 && !hit[48]; d++) { let rolls = 20;
        for (let e = 0; e < sightings + 20; e++) { const paid = e >= sightings; if (paid) { if (rolls <= 0) break; rolls--; }
          const k = g.make(1 + Math.floor(Math.random() * 999998), 1); const c = k.shiny ? 0 : COST[k.rarity];
          if (!seen.has(k.speciesNo) && rolls >= c) { rolls -= c; seen.add(k.speciesNo); } }
        for (const m of [12, 24, 36, 48]) if (!hit[m] && seen.size >= m) { hit[m] = d; days[m].push(d); } }
      for (const m of [12, 24, 36, 48]) if (!hit[m]) days[m].push(400); }
    const q = (a, p) => { a.sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
    out[name] = Object.fromEntries([12, 24, 36, 48].map(m => [m, 'median ' + q(days[m], 0.5) + 'd (10-90%: ' + q(days[m], 0.1) + '-' + q(days[m], 0.9) + ')'])); }
  return out; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1000)
    r = pg.evaluate(JS, {'n': 300, 'models': [['engaged (40 sightings)', 40], ['casual (15 sightings)', 15]]})
    for k, v in r.items(): print(k); [print('  ', m, v[m]) for m in v]
    b.close()
