// ---- FLAVOR: weather and time-of-day remarks for townsfolk (text only: no rewards, no state) ----
// FLAVOR.pick({ id, region, indoor, weather, tod, salt }) returns one extra line (or null) that app.js shows before an NPC's normal lines.
// Conditions: weather kinds (rain, storm, snow, fog, sun, ash) and times of day (dawn, dusk, night). Clear daytime says nothing extra.
// Lookup order per condition: NPC-specific line (NPC[id][cond]) > regional lines (OUT/IN[cond][region]) > generic (OUT/IN[cond]._).
// Regions are WEATHER.region keys: town, moss, frost, ember, tide, peak and the four routes. Add a person = add a row to NPC; add a region = add keys.
const FLAVOR = (() => {
  // Every line is something the speaker can see or feel right now, in the voice of the place; none explains the weather's rules or points anywhere (Meaning: hint, never tell).
  const OUT = { // said outdoors
    rain: { _: ['The rain is the straight kind today.', 'Everything smells of wet stone.'],
      moss: ['The leaves hold the rain a while, then let it go all at once.'], tide: ['Rain on the sea makes no sound at all.'], town: ['The fountain cannot tell where the rain stops and it begins.'], ember: ['Rain here is gone before it lands. You can hear it hiss.'] },
    storm: { _: ['Count after the flash. It is getting closer.', 'The trees lean the same way as me.'],
      tide: ['Nobody has taken a boat out. The ropes are doubled.'], ember: ['The forge wind and the storm wind argue over the roofs.'] },
    snow: { _: ['Snow. Every footprint shows, and then it does not.', 'It falls straight. Not a breath of wind.'],
      frost: ['Fresh snow on the peaks. Nothing has moved up there since dawn.'], peak: ['The wind up here goes through a coat like it is not there.'] },
    fog: { _: ['I can see my own hand and not much past it.', 'Sounds come from the wrong side in fog.'], moss: ['The fog hangs between the trunks like washing.'] },
    sun: { _: ['Warm enough to sit on the step.', 'The sun is out. Everything that was wet is steaming.'], ember: ['Sun on top of the forge heat. The stones are too hot to touch.'] },
    ash: { _: ['Ash again. The sills are grey by noon.', 'Keep your sleeve over your nose when it blows.'], ember: ['The forge wind carries ash this far today.'] },
    night: { _: ['It is late. The lamps are the only colour left.', 'The grass looks different after dark. Deeper.'], tide: ['The harbour lights double in the water.'] },
    dawn: { _: ['First light. The quietest hour there is.', 'Up with the sun? So is everything else.'] },
    dusk: { _: ['The day is folding up.', 'Almost evening. The lamps will go on soon.'] }
  };
  const IN = { // said indoors (hearing it through the walls)
    rain: { _: ['Listen to it on the roof.', 'Rainy day. The kettle is on, as it always is.'] },
    storm: { _: ['That one rattled the windows.', 'A proper storm. The door stays shut until it passes.'] },
    snow: { _: ['It is snowing out there. The window is frosted at the edges.', 'Snow on the roof. It will be quiet tonight.'] },
    fog: { _: ['The fog is so thick I cannot see across the street.'] },
    sun: { _: ['Such a bright day. The sun comes right across the floor.'] },
    ash: { _: ['Ash on the windowsill again. I only just cleaned it.'] },
    night: { _: ['It is getting late.', 'Quiet at night. You can hear the whole house breathe.'] },
    dawn: { _: ['Up early. The kettle is only just warm.'] },
    dusk: { _: ['The lamps are coming on outside. Evening already.'] }
  };
  const NPC = { // person-specific remarks: { condition: 'line' }
    mom: { rain: 'Take your coat if you go out. It is pouring.', snow: 'Snow. Your scarf is on the peg.', night: 'It is late. The lamp in the window stays on.' },
    remy: { rain: 'The Lab roof drums in the rain. Good for reading.', storm: 'Thunder always makes the instruments hum.', night: 'I stay late sometimes. Night is quiet for pages.' },
    dell: { rain: 'Good thing the tent is waterproof. The soup less so.', night: 'The fire keeps the dark back a little way.', fog: 'Fog on the trail. I will sit by the fire until it lifts.' },
    edda: { fog: 'Fog suits the carvings. They look like they are moving.', night: 'I came to draw, but there is no light for it.', rain: 'Rain washes the moss off the carvings. I am torn about that.' },
    joss: { night: 'Dusk is my hour. I trim the lamp, and it turns once more.', fog: 'Fog like this is why the lamp was built.', storm: 'A storm. The lamp would have mattered tonight, once.' },
    neri: { storm: 'Storms bring things up the beach. I will be out as soon as it clears.', sun: 'Sun on the sand. The best kind of morning for looking.', rain: 'The wreck fills and empties with every rain.' },
    mae: { rain: 'The flowers are loving this. Look at them stand up.', sun: 'The garden is glowing.', snow: 'Snow on the flowers. They sleep now, and wake in spring.', night: 'I water by lamplight when it is warm. Not tonight.' }
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
