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
# env ACT=1: the action-mode day instead (the review copy's economy: meeting and downing a critter is free, a keep costs the build's own KEEP_COST
# from the day's 20 rolls (energy()), no sightings term). A day is DOWNS downed critters at a steady pace over a 20-minute session; two keepers:
# 'collector' keeps a critter only for a species it does not have, 'keeps all' keeps every critter it downs while the rolls last (07's day bot).
# Prints keeps a day, the minute the rolls run out on day 1 and on day 7, and days to 12/24/36/48 species. Rare grass and quests are not modelled.
ACTJS = """(cfg) => { const g = APP.game, COST = KEEP_COST, R = 20, out = { cost: COST, rolls: R };   // 20: the day in base.js energy() (a test-mode page reports 99)
  for (const [name, downs, all] of cfg.models) { const days = { 12: [], 24: [], 36: [], 48: [] }, keeps = { 1: [], 3: [], 7: [] }, outAt = { 1: [], 7: [] };
    for (let t = 0; t < cfg.n; t++) { const seen = new Set(); const hit = {};
      for (let d = 1; d <= 400 && !hit[48]; d++) { let rolls = R, kept = 0, out1 = null;
        for (let e = 0; e < downs; e++) { const k = g.make(1 + Math.floor(Math.random() * 999998), 1), c = k.shiny ? 0 : (COST[k.rarity] || 1);
          if ((all || !seen.has(k.speciesNo)) && rolls >= c) { rolls -= c; kept++; seen.add(k.speciesNo); }
          if (out1 === null && rolls <= 0) out1 = e + 1; }
        if (keeps[d]) keeps[d].push(kept); if (outAt[d]) outAt[d].push(out1 === null ? null : 20 * out1 / downs);
        for (const m of [12, 24, 36, 48]) if (!hit[m] && seen.size >= m) { hit[m] = d; days[m].push(d); } }
      for (const m of [12, 24, 36, 48]) if (!hit[m]) days[m].push(400); }
    const q = (a, p) => { a.sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; }, mean = (a) => Math.round(10 * a.reduce((x, y) => x + y, 0) / a.length) / 10;
    const oa = (a) => { const s = a.filter((x) => x !== null); return (Math.round(100 * s.length / a.length)) + '% of days spent, median min ' + (s.length ? Math.round(q(s, 0.5) * 10) / 10 : '-'); };
    out[name] = { species: Object.fromEntries([12, 24, 36, 48].map(m => [m, 'median ' + q(days[m], 0.5) + 'd (10-90%: ' + q(days[m], 0.1) + '-' + q(days[m], 0.9) + ')'])),
      keeps: 'day 1 ' + mean(keeps[1]) + ', day 3 ' + mean(keeps[3]) + ', day 7 ' + mean(keeps[7]), out: 'day 1: ' + oa(outAt[1]) + '; day 7: ' + oa(outAt[7]) }; }
  return out; }"""
import os
HTML = os.environ.get('SIM_HTML', 'file:///mnt/user-data/outputs/critter-roll-world.html')   # env SIM_HTML=<path or URL> loads another build (e.g. games/critter-roll-review/index.html)
if '://' not in HTML: HTML = 'file://' + os.path.abspath(HTML)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto(HTML); pg.wait_for_timeout(1000)
    if os.environ.get('ACT'):
        D = [int(x) for x in os.environ.get('DOWNS', '30,60,120').split(',')]
        models = [[f'{w} ({d} downs a day, {d / 20:g}/min)', d, w == 'keeps all'] for w in ['collector', 'keeps all'] for d in D]
        r = pg.evaluate(ACTJS, {'n': 300, 'models': models})
        print('KEEP_COST', r.pop('cost'), '| rolls a day', r.pop('rolls'))
        for k, v in r.items(): print(k); print('   keeps a day:', v['keeps']); print('   rolls run out:', v['out']); [print('  ', m, v['species'][m]) for m in v['species']]
    else:
        r = pg.evaluate(JS, {'n': 300, 'models': [['engaged (40 sightings)', 40], ['casual (15 sightings)', 15]]})
        for k, v in r.items(): print(k); [print('  ', m, v[m]) for m in v]
    b.close()
