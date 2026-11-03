// ---- FLAVOR: weather and time-of-day remarks for townsfolk (text only: no rewards, no state) ----
// FLAVOR.pick({ id, region, indoor, weather, tod, salt }) returns one extra line (or null) that app.js shows before an NPC's normal lines.
// Conditions: weather kinds (rain, storm, snow, fog, sun, ash) and times of day (dawn, dusk, night). Clear daytime says nothing extra.
// Lookup order per condition: NPC-specific line (NPC[id][cond]) > regional lines (OUT/IN[cond][region]) > generic (OUT/IN[cond]._).
// Regions are WEATHER.region keys: town, moss, frost, ember, tide, peak and the four routes. Add a person = add a row to NPC; add a region = add keys.
const FLAVOR = (() => {
  const OUT = { // said outdoors
    rain: { _: ['Rain again! Critters do not mind a soaking, and neither do I.', 'Mind the puddles. They hide more than you would think.'],
      moss: ['The forest drinks it all up. Tide critters wander in when it rains like this.'], tide: ['Good rain for Tide critters. They are everywhere today.'], town: ['The fountain is overflowing. It happens every time it rains.'] },
    storm: { _: ['Did you hear that thunder? Volt critters love this weather.', 'Stay close to the trees. Or do not. Volt critters are about.'],
      tide: ['The waves are wild today. Nobody is taking a boat out.'], ember: ['Even the embers are hissing in this storm.'] },
    snow: { _: ['Snow! Frost critters are out and about in it.', 'Every footprint shows in this. I like that.'],
      frost: ['Fresh snow on the peaks. My favourite kind of morning.'], peak: ['The wind up here bites. Dress warmly if you plan to climb.'] },
    fog: { _: ['I can barely see my own critter in this fog. Dusk critters love it, though.', 'Quiet fog today. Perfect for sneaking up on a wild critter.'], moss: ['The fog hangs between the trees like a curtain.'] },
    sun: { _: ['What a bright day! Bloom critters bask in weather like this.', 'The sun is out. Perfect for a long walk.'], ember: ['Sunny and warm. Not that it is ever cold here.'] },
    ash: { _: ['Ashfall again. Stone critters crawl out of it every time.', 'Keep your sleeve over your nose when the ash blows.'], ember: ['The forge winds carry ash this far today.'] },
    night: { _: ['It is late. Dusk critters roam everywhere after dark.', 'Careful out there. The grass looks different at night.'], tide: ['The harbor lights look lovely after dark.'] },
    dawn: { _: ['Up with the sun? Early trainers meet the quietest critters.', 'First light. The best time of day, if you ask me.'] },
    dusk: { _: ['The day is winding down. Dusk is when the shy critters come out.', 'Almost evening. Time to think about camp.'] }
  };
  const IN = { // said indoors (hearing it through the walls)
    rain: { _: ['Listen to the rain on the roof. I could stay in all day.', 'Rainy day. Good for staying in and polishing your Dex.'] },
    storm: { _: ['That thunder rattled the windows! Glad we are inside.', 'A proper storm. Stay in until it passes, dear.'] },
    snow: { _: ['It is snowing out there. The window is all frosted at the edges.', 'Snow on the roof. We will be cozy tonight.'] },
    fog: { _: ['The fog is so thick I cannot see across the street.'] },
    sun: { _: ['Such a bright day. The sun is coming right through the window.'] },
    ash: { _: ['Ash on the windowsill again. I just cleaned it!'] },
    night: { _: ['It is getting late. I was about to turn in.', 'Quiet at night. I can hear the whole house breathe.'] },
    dawn: { _: ['Up early today! The kettle is just warming.'] },
    dusk: { _: ['The lamps are coming on outside. Evening already.'] }
  };
  const NPC = { // person-specific remarks: { condition: 'line' }
    mom: { rain: 'Take your coat if you go out, sweetie. It is pouring!', snow: 'Snow! Do not forget your scarf, sweetie.', night: 'Do not stay out too late, sweetie. Dusk critters roam at night.' },
    remy: { rain: 'The Lab roof drums in the rain. I like it for reading.', storm: 'Thunder always makes the lab instruments hum.', night: 'I stay late at the Lab sometimes. Night is quiet for research.' },
    dell: { rain: 'Good thing the tent is waterproof. The soup less so.', night: 'The fire keeps the dark away. Mostly.', fog: 'Fog on the trail. I will wait it out by the fire.' },
    edda: { fog: 'Fog suits ruins. It makes the carvings look like they are moving.', night: 'I came to sketch the arch, but the dark is no good for drawing.', rain: 'Rain washes the moss off the carvings. I am torn.' },
    joss: { night: 'Dusk is my hour. I trim the lamp, and the old light turns once more.', fog: 'Fog like this is why the lighthouse was built.', storm: 'A storm! The lamp would have mattered tonight, once.' },
    neri: { storm: 'Storms wash up the best finds. I will be out as soon as it clears.', sun: 'Sun on the sand. Best beachcombing weather there is.', rain: 'The Tide critters love the rain, even in a wreck.' },
    mae: { rain: 'My flowers are loving this. Look at them perk up!', sun: 'The garden is glowing in this sun.', snow: 'Snow on the flowers. They sleep now, and wake up in spring.', night: 'I water by lamplight when it is warm. Not tonight.' }
  };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; return (h >>> 0); }
  function conds(weather, tod) { const c = []; if (weather && weather !== 'clear') c.push(weather); if (tod && tod !== 'day') c.push(tod); return c; }
  // one line for this person right now (stable while the weather block lasts: the same salt gives the same line)
  function pick(o) {
    const cs = conds(o.weather, o.tod); if (!cs.length) return null;
    const salt = String(o.salt || ''), set = o.indoor ? IN : OUT, pool = [];
    cs.forEach((c) => {
      const mine = NPC[o.id] && NPC[o.id][c]; if (mine) { pool.push(mine); return; }
      const reg = (set[c] && set[c][o.region]) || [], gen = (set[c] && set[c]._) || [];
      const w = reg.concat(reg, gen); // regional lines weigh in twice
      if (w.length) pool.push(w[hash(o.id + '|' + c + '|' + salt) % w.length]);
    });
    return pool.length ? pool[hash(o.id + '|' + salt) % pool.length] : null;
  }
  return { pick, conds, OUT, IN, NPC };
})();
