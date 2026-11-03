const { Component } = require('./harness.js');
const x = new Component({});
const R = () => 1 + Math.floor(Math.random() * 999998);
const rel = { Common: 1, Uncommon: 1, Rare: 2, Mythic: 4 };
function sim(cost, free, days) {
  let ms = {}, seen = new Set(), keptRare = 0, keptMyth = 0, ess = 0, encTotal = 0;
  const mark = (k, d) => { if (!(k in ms)) ms[k] = d; };
  for (let d = 1; d <= days; d++) {
    let rolls = 20, essDay = 0, enc = 0;
    // free encounters first; once the free pool is used, an encounter costs a roll (like today)
    while (true) {
      if (enc >= free && rolls <= 0) break;
      if (enc >= free + 30) break;
      const paid = enc >= free; if (paid) rolls -= 1; enc++;
      const k = x.make(R(), 1), c = paid ? 0 : cost[k.rarity];
      const isNew = !seen.has(k.speciesNo), good = k.rarity === 'Rare' || k.rarity === 'Mythic';
      if (paid || ((isNew || good) && rolls >= c)) {
        rolls -= c; if (isNew) seen.add(k.speciesNo);
        if (k.rarity === 'Rare') keptRare++; if (k.rarity === 'Mythic') { keptMyth++; mark('m1', d); }
        if (!isNew) { ess += rel[k.rarity]; essDay += rel[k.rarity]; }
      }
    }
    encTotal += enc;
    if (d === 3) ms._ess = (ess / 3).toFixed(1);
    if (seen.size === 48) mark('all', d); if (seen.size >= 40) mark('s40', d);
    if (d === 7) { ms._rare7 = keptRare; ms._myth7 = keptMyth; ms._enc = Math.round(encTotal / 7); }
  }
  return ms;
}
const N = 300;
const variants = [
  ['A today (free=0)', { Common: 0, Uncommon: 0, Rare: 0, Mythic: 0 }, 0],
  ['free 30, cost 1/1/3/6', { Common: 1, Uncommon: 1, Rare: 3, Mythic: 6 }, 30],
  ['free 40, cost 1/1/3/6', { Common: 1, Uncommon: 1, Rare: 3, Mythic: 6 }, 40],
  ['free 40, cost 1/2/4/8', { Common: 1, Uncommon: 2, Rare: 4, Mythic: 8 }, 40],
  ['free 60, cost 1/2/4/8', { Common: 1, Uncommon: 2, Rare: 4, Mythic: 8 }, 60],
];
for (const [label, cost, free] of variants) {
  const res = []; for (let i = 0; i < N; i++) res.push(sim(cost, free, 40));
  const med = (k) => { const v = res.map((r) => r[k]).filter((a) => a !== undefined).map(Number).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 'never'; };
  console.log(label.padEnd(24), '| encounters/day', String(med('_enc')).padStart(3), '| 40 species day', String(med('s40')).padStart(2), '| all 48 day', String(med('all')).padStart(2), '| by day 7: Rares', String(med('_rare7')).padStart(2), ' Mythics', String(med('_myth7')).padStart(2), '| essence/day', med('_ess'));
}
