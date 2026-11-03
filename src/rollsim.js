// Compare roll rules. Players walk through grass; species are uniform (town grass + shrine give every type).
const { Component } = require('./harness.js');
const x = new Component({});
const R = () => 1 + Math.floor(Math.random() * 999998);
const rel = { Common: 1, Uncommon: 1, Rare: 2, Mythic: 4 };
function sim(rule, days, encPerDay) {
  let ms = {}, seen = new Set(), keptRare = 0, keptMyth = 0, ess = 0, rollsUsed = 0, kept = 0;
  const mark = (k, d) => { if (!(k in ms)) ms[k] = d; };
  for (let d = 1; d <= days; d++) {
    let rolls = 20, essDay = 0;
    const enc = rule === 'A' ? 20 : encPerDay;
    for (let e = 0; e < enc && (rule !== 'A' || rolls > 0); e++) {
      const k = x.make(R(), 1);
      if (rule === 'A') rolls -= 1;          // the encounter itself costs a roll
      const cost = rule === 'A' ? 0 : (rule === 'B' ? 1 : ({ Common: 1, Uncommon: 1, Rare: 2, Mythic: 3 }[k.rarity]));
      const isNew = !seen.has(k.speciesNo), good = k.rarity === 'Rare' || k.rarity === 'Mythic';
      // sensible player: keep new species and good finds when affordable; otherwise keep commons only to release for essence (rule A keeps everything since the roll is already spent)
      let keep = rule === 'A' ? true : ((isNew || good) && rolls >= cost);
      if (keep) {
        rolls -= cost; kept++;
        if (isNew) seen.add(k.speciesNo);
        if (k.rarity === 'Rare') keptRare++; if (k.rarity === 'Mythic') { keptMyth++; mark('first Mythic kept', d); }
        if (!isNew) { ess += rel[k.rarity]; essDay += rel[k.rarity]; }
      }
    }
    // leftover rolls (rules B/C): keep ordinary critters to release for essence
    if (rule !== 'A') while (rolls > 0) { const k = x.make(R(), 1); if (k.rarity === 'Rare' || k.rarity === 'Mythic') continue; rolls -= 1; ess += 1; essDay += 1; }
    if (d === 3) ms._ess3 = (ess / 3).toFixed(1);
    if (seen.size >= 24) mark('24/48 species', d); if (seen.size >= 40) mark('40/48 species', d); if (seen.size === 48) mark('48/48 species', d);
    if (keptMyth >= 3) mark('3 Mythics kept', d);
    if (d === 7) { ms._rare7 = keptRare; ms._myth7 = keptMyth; }
  }
  return ms;
}
const N = 300, DAYS = 40;
for (const [rule, label] of [['A', 'A: encounters cost a roll (current)'], ['B', 'B: free encounters, keep = 1 roll'], ['C', 'C: free encounters, keep cost by rarity']]) {
  const res = []; for (let i = 0; i < N; i++) res.push(sim(rule, DAYS, 60));
  const med = (k) => { const v = res.map((r) => r[k]).filter((a) => a !== undefined).map(Number).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] + (v.length < N ? ' (' + Math.round(100 * v.length / N) + '% reach)' : '') : 'never'; };
  console.log(label);
  console.log('   first Mythic kept: day', med('first Mythic kept'), '| 3 Mythics: day', med('3 Mythics kept'), '| species 24: day', med('24/48 species'), '| 40: day', med('40/48 species'), '| all 48: day', med('48/48 species'));
  console.log('   by day 7: Rares kept', med('_rare7'), '| Mythics kept', med('_myth7'), '| essence/day from releases (days 1-3):', med('_ess3'));
}
