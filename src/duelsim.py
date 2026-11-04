# Action-mode duel simulator: the REAL ACT combat code (enemy behaviours, projectiles, swapping, Game.hit) run at simulated speed in an open arena, with a bot.
# Bot: walks the critter to the foe's feet and taps the quick slash whenever ready (using the special wastes time: every move shares one cooldown).
# It never dodges, so it is a fairly pessimistic stand-in for a person who moves.   Usage:
#   python3 duelsim.py <heroStage> <heroLv> <n> <trainerId> [...]          (an id may be floor:N for a Tower floor)
#   env DUEL=hp,dmg,pace (e.g. DUEL=2,1.3,0.8) overrides DUEL_HP / DUEL_DMG / DUEL_PACE to test a tuning value
import sys, os
from playwright.sync_api import sync_playwright
hst, hlv, N, ids = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
JS = """(cfg) => { const g = APP.game, rand = Math.random; const power = (k) => k.stats.reduce((a, q) => a + q.value, 0); const all = Object.values(WORLD.allNpcs()).flat(); const out = {};
  const G = Object.create(g); G.actDuelEnd = () => []; G.actTowerHold = () => {};
  for (const id of cfg.ids) {
    let tr; if (id.indexOf('floor:') === 0) { const f = g.towerFloor(+id.slice(6)); g._teams = {}; tr = { id: f.id, name: f.name, team: g.teamFor(f).slice(), stage: f.stage, lv: f.lv, reward: 0, tower: true, floor: f.floor, boss: !!f.warden }; }
    else { const n = all.find(x => x.id === id); g._teams = {}; tr = { id: n.id, name: n.name, team: g.teamFor(n).slice(), stage: n.stage, lv: n.lv || 1, reward: 0, leader: !!n.leader, boss: !!n.boss }; }
    out[id] = {};
    for (const policy of ['mash', 'smart']) { let wins = 0, tsum = 0, hpLeft = 0;
      for (let t = 0; t < cfg.n; t++) {
        const pool = []; for (let i = 0; i < 10; i++) pool.push(g.make(1 + Math.floor(rand() * 999998), cfg.hst, cfg.hlv)); pool.sort((a, b) => power(b) - power(a)); const party = pool.slice(0, 3); let cur = party[0], res = null;
        ACT.bind({ game: () => G, enabled: () => true, lead: () => cur, bench: () => party.filter(k => k !== cur), kOf: (sd) => party.find(k => k.seed === sd), setLead: (sd) => { cur = party.find(k => k.seed === sd) || cur; }, img: () => ({ complete: false }), foe: () => null, duelDone: (tr2, npc, won) => { res = !!won; } });
        const crit = { x: 400, y: 400, ox: 0, oy: 0, dir: 'right' }, human = { x: 370, y: 400, dir: 'right' }, M = { id: 'sim' + t, interior: false, cave: false, rate: 0, W: 60, H: 60, grid: [], types: [] };
        const env = { M: M, TS: 32, P: human, FOL: crit, lead: true, fol: true, dt: 0.05, solidAt: () => false };
        ACT.step(env); if (!ACT.startDuel({ tr: tr })) { res = false; }
        let time = 0, lastSel = -1;
        while (res === null && time < 200) {
          time += 0.05; const foe = ACT.enemies.find(m => m.duel), h = ACT.hero;
          if (foe && h) { const dx = foe.x - crit.x, dy = foe.y - crit.y, d = Math.hypot(dx, dy);
            if (d > 36) { const sp = 134 * 0.05; crit.x += dx / d * sp; crit.y += dy / d * sp; }
            crit.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            let sel = 0; if (cfg.policy === 'smart' || policy === 'smart') { const sp = h.k.kit[3]; if (sp && sp.effect === 'heal' && h.hp < h.max * 0.45) sel = 3; else if (sp && sp.effect !== 'heal' && sp.effect !== 'fortify' && foe.s[{ burn: 'burn', weaken: 'weak', daze: 'daze', sap: 'sap' }[sp.effect]] === 0 && ACT.cdFrac() === 0) sel = 3; }
            ACT.setSel(sel); ACT.attack(); }
          human.x = crit.x - 32; human.y = crit.y; env.dt = 0.05; ACT.step(env); }
        if (res === true) wins++; tsum += time; const h = ACT.hero; hpLeft += party.reduce((a, k) => a, 0); }
      out[id][policy] = { win: Math.round(100 * wins / cfg.n), secs: Math.round(tsum / cfg.n) }; } }
  return out; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_timeout(1200)
    dd = os.environ.get('DUEL')
    if dd: hp, dm, pc = [float(x) for x in dd.split(',')]; pg.evaluate('window.__duel = {hp: %s, dmg: %s, pace: %s}' % (hp, dm, pc))
    r = pg.evaluate(JS, {'hst': hst, 'hlv': hlv, 'n': N, 'ids': ids})
    for k, v in r.items(): print(f"{k:12s} hero stage {hst} Lv {hlv}: mash bot {v['mash']['win']:3d}% (avg fight {v['mash']['secs']}s)")
    b.close()
