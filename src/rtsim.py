# Real-time vs turn-based: win rate of the same best-of-10 stage-3 party against trainers.
# Modes: turn (existing sim, smart move choice), rt-mash (taps the first attack whenever it is ready, never anything else), rt-smart (same plus status moves when useful).
# Usage: python3 rtsim.py <lv> <n> <foePace> <trainerId> [...]    foePace = RT_FOE (1 = foe acts at the same pace as you)
import sys
from playwright.sync_api import sync_playwright
lv, N, pace, ids = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]), sys.argv[4:]
JS = """(cfg) => { const g = APP.game; const all = Object.values(WORLD.allNpcs()).flat(); const eff = { burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' };
  const smart = (bt) => { const P = bt.s[0], D = bt.s[1], s = P.k.kit[3]; if (P.uses > 0) { if (s.effect === 'heal' && P.hp < P.max * 0.45) return 3; if (s.effect === 'fortify' && P.fort === 0) return 3; if (eff[s.effect] && D[eff[s.effect]] === 0) return 3; } return 0; };
  const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const out = {};
  for (const id of cfg.ids) { const L = all.find(n => n.id === id); g._teams = {}; const team = g.teamFor(L); out[id] = {};
    for (const mode of ['turn', 'rt-mash', 'rt-smart']) { let wins = 0, secs = 0;
      for (let t = 0; t < cfg.n; t++) { const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(Math.random() * 999998), 3, cfg.lv)); pool.sort((a, b) => power(b) - power(a));
        const party = pool.slice(0, 3);
        const foe0 = g.make(team[0], L.stage, L.lv || 1); let bt = g.newBattle(party[0], foe0, 0); bt.bench = party.slice(1).map(k => g.newBattle(k, foe0, 0).s[0]); let idx = 0, res = null;
        const after = (now, cd) => { if (bt.s[1].hp <= 0) { if (idx < team.length - 1) { idx++; bt.s[1] = g.newBattle(bt.s[0].k, g.make(team[idx], L.stage, L.lv || 1), 0).s[1]; bt.over = false; cd[1] = now + 1100; } else res = true; }
          if (res === null && bt.s[0].hp <= 0) { const j = bt.bench.findIndex(s => s.hp > 0); if (j !== -1) { const o = bt.s[0]; bt.s[0] = bt.bench[j]; bt.bench[j] = o; bt.over = false; cd[0] = now + 1200; } else res = false; }
          if (res === null && bt.over) res = false; };
        if (mode === 'turn') { for (let guard = 0; guard < 400 && res === null; guard++) { g.resolve(bt, smart(bt), Math.random); after(0, [0, 0]); } }
        else { const cd = [500, 1600]; let tickAt = 2400, now = 0;
          while (res === null && now < 900000) { now += 50;
            if (now >= tickAt) { tickAt += 2400; g.rtTick(bt); after(now, cd); if (res !== null) break; }
            const order = Math.random() < 0.5 ? [0, 1] : [1, 0];
            for (const i of order) { if (res !== null) break; if (now < cd[i]) continue;
              if (i === 1) { const mi = g.aiChoice(bt, 1, Math.random); cd[1] = now + Math.round(g.rtCooldown(bt, 1, mi) * cfg.pace * (0.9 + Math.random() * 0.2)); g.rtStep(bt, 1, mi, Math.random); }
              else { const mi = mode === 'rt-mash' ? 0 : smart(bt); cd[0] = now + g.rtCooldown(bt, 0, mi); g.rtStep(bt, 0, mi, Math.random); }
              after(now, cd); } }
          if (res === null) res = false; secs += now / 1000; }
        if (res) wins++; }
      out[id][mode] = [Math.round(100 * wins / cfg.n), Math.round(secs / cfg.n)]; } }
  return out; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    r = pg.evaluate(JS, {'lv': lv, 'n': N, 'ids': ids, 'pace': pace})
    for k, v in r.items(): print(f"vs {k:8s} (stage 3, Lv {lv}, pace {pace}): turn {v['turn'][0]:3d}% | rt-mash {v['rt-mash'][0]:3d}% ({v['rt-mash'][1]}s) | rt-smart {v['rt-smart'][0]:3d}% ({v['rt-smart'][1]}s)")
    b.close()
