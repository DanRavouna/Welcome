// ---- MUSIC: original chiptune loops, synthesized live (no audio files) ----
const MUSIC = (() => {
  // Each track: 8 bars of 8 eighth-note steps. Lead tokens: note, '.' rest, '-' hold. Chords drive bass.
  const T = {
    town: { bpm: 104, wave: 'square', duty: 0.25, chords: 'C G Am F C G F G', bass: 'R . R . 5 . R .', drums: 'k . h . s . h .',
      lead: 'E5 - G5 - C6 - B5 A5 | G5 - D5 - G5 - . . | A5 - C6 - E5 - A5 G5 | F5 - A5 - C6 - - . | E5 - G5 - C6 - D6 E6 | D6 - B5 - G5 - . . | A5 - F5 - C6 - A5 - | B5 - D6 - G5 - - .' },
    moss: { bpm: 92, wave: 'triangle', chords: 'Am G F G Am G F E', bass: 'R - - . 5 - R .', drums: 'k . . h . . h .',
      lead: 'A4 - C5 - E5 - D5 C5 | B4 - D5 - G4 - - . | A4 - C5 - F5 - E5 D5 | D5 - - - B4 - . . | A4 - C5 - E5 - A5 G5 | G5 - D5 - B4 - - . | C5 - F5 - A5 - G5 F5 | E5 - - - G#4 - . .' },
    frost: { bpm: 80, wave: 'triangle', chords: 'Em C G D Em C Am B', bass: 'R - - - 5 - - -', drums: '. . h . . . h .',
      lead: 'E6 . B5 . G5 . . . | E6 . C6 . G5 . . . | D6 . B5 . G5 . D6 . | F#6 - - - . . . . | E6 . B5 . G5 . A5 B5 | C6 . G5 . E5 . . . | A5 . C6 . E6 . D6 C6 | B5 - - - D#6 - . .' },
    ember: { bpm: 126, wave: 'square', duty: 0.5, chords: 'Dm Bb C A Dm Bb Gm A', bass: 'R R 5 R R R 5 R', drums: 'k h s h k h s h',
      lead: 'D5 D5 F5 D5 A5 - G5 F5 | F5 - D5 - Bb4 - D5 - | E5 E5 G5 E5 C6 - Bb5 A5 | A5 - - - C#5 - E5 - | D5 D5 F5 D5 A5 - D6 C6 | Bb5 - F5 - D5 - F5 - | G5 - Bb5 - D6 - C6 Bb5 | A5 - E5 - C#5 - A4 -' },
    tide: { bpm: 110, wave: 'square', duty: 0.125, chords: 'F Dm Bb C F Dm Gm C', bass: 'R . 5 . R . 5 R', drums: 'k . h s . k s h',
      lead: 'C5 . F5 . A5 . F5 . | D5 . F5 . A5 - G5 F5 | D5 . F5 . Bb5 . A5 G5 | G5 - - - E5 - . . | C5 . F5 . A5 . C6 . | D6 . C6 . A5 - F5 . | G5 . Bb5 . D6 . C6 Bb5 | A5 - G5 - F5 - - .' },
    peak: { bpm: 96, wave: 'square', duty: 0.25, chords: 'G D Em C G D C D', bass: 'R - 5 - R - 5 -', drums: 'k . h . s . h h',
      lead: 'D5 - G5 - B5 - - A5 | A5 - F#5 - D5 - - . | E5 - G5 - B5 - E6 - | D6 - C6 - B5 - A5 - | D5 - G5 - B5 - D6 - | F#6 - E6 - D6 - A5 - | G5 - E5 - C6 - B5 A5 | A5 - - - F#5 - - -' },
    mossbrook: { bpm: 88, wave: 'triangle', chords: 'F C Dm Bb F C Bb C', bass: 'R . 5 . R . 5 .', drums: 'k . . h s . . h',
      lead: 'A4 - C5 - F5 - E5 - | E5 - G5 - C5 - - . | D5 - F5 - A5 - G5 F5 | F5 - - - D5 - - . | A4 - C5 - F5 - A5 - | G5 - E5 - C5 - E5 - | D5 - F5 - Bb5 - A5 G5 | G5 - - - E5 - - .' },
    frosthold: { bpm: 84, wave: 'triangle', chords: 'Dm Bb F C Dm Bb Gm A', bass: 'R - - - 5 - - -', drums: '. . h . . . h .',
      lead: 'D5 - - - F5 - A5 - | Bb5 - A5 - G5 - F5 - | A5 - - - C6 - A5 - | G5 - - - E5 - - - | D5 - - - F5 - A5 - | D6 - C6 - Bb5 - A5 - | G5 - Bb5 - D6 - C6 Bb5 | A5 - - - C#5 - - -' },
    cinderport: { bpm: 116, wave: 'square', duty: 0.5, chords: 'Gm Eb F D Gm Eb Cm D', bass: 'R . R . 5 . R 5', drums: 'k . s . k k s .',
      lead: 'G5 . G5 . Bb5 . D6 . | Eb6 - D6 - C6 - Bb5 - | A5 . F5 . A5 . C6 . | D6 - - - A5 - F#5 - | G5 . G5 . Bb5 . D6 . | G6 - F6 - Eb6 - D6 - | C6 - Eb6 - G5 - C6 - | D6 - - - F#5 - D5 -' },
    coralbay: { bpm: 100, wave: 'square', duty: 0.125, chords: 'C Am F G C Am Dm G', bass: 'R . 5 . R 5 . 5', drums: 'k . h s . h s h',
      lead: 'G5 . E5 . C5 . E5 G5 | A5 - - - E5 - C5 - | F5 . A5 . C6 . A5 . | G5 - - - D5 - - . | G5 . E5 . C6 . B5 A5 | A5 - E5 - C5 - E5 - | F5 . D5 . A5 . F5 . | G5 - - - B4 - - .' },
    'dg-arch': { bpm: 70, wave: 'triangle', chords: 'Dm Dm Bb A Dm Gm Bb A', bass: 'R - - - 5 - - -', drums: '. . . . . . . h',
      lead: 'D5 - - - F5 - A5 - | D5 - - - F5 - - . | Bb4 - - - D5 - F5 - | E5 - - - C#5 - - . | A5 - - - F5 - D5 - | G5 - - - Bb5 - D6 - | F5 - - - D5 - Bb4 - | E5 - C#5 - A4 - - .' },
    // the Lamp Tower (Meaning: the music is the fourth lamp): the dark form has no drums and half the notes, held low, in the Watch's key (the way home and the long watch share it);
    // each lamp kept below the great lamp adds a layer (@1 the bass walks, @2 the whole tune comes back an octave down, @3 = @lit the drums and the tune as written)
    'dg-lamp': { bpm: 66, wave: 'triangle', chords: 'Em C G D Em C Am B', bass: 'R - - - - - - -', drums: '. . . . . . . .',
      lead: 'G4 - - - D5 - - - | E4 - - - B4 - - . | B4 - - - G4 - - - | D5 - - - A4 - - . | G4 - - - D5 - - - | C5 - - - B4 - - - | C5 - - - A4 - - - | B4 - - - - - - .' },
    'dg-lamp@1': { bpm: 66, wave: 'triangle', chords: 'Em C G D Em C Am B', bass: 'R - - - 5 - - -', drums: '. . . . . . . .',
      lead: 'G4 - - - D5 - - - | E4 - - - B4 - - . | B4 - - - G4 - - - | D5 - - - A4 - - . | G4 - - - D5 - - - | C5 - - - B4 - - - | C5 - - - A4 - - - | B4 - - - - - - .' },
    'dg-lamp@2': { bpm: 66, wave: 'triangle', chords: 'Em C G D Em C Am B', bass: 'R - - - 5 - - -', drums: '. . . . . . . .',
      lead: 'G4 - B4 - D5 - B4 - | E4 - G4 - B4 - - . | C4 - E4 - G4 - E4 - | D4 - F#4 - A4 - - . | G4 - B4 - D5 - G5 - | E5 - D5 - B4 - G4 - | C5 - B4 - A4 - G4 - | F#4 - A4 - B4 - - .' },
    'dg-lamp@3': { bpm: 66, wave: 'triangle', chords: 'Em C G D Em C Am B', bass: 'R - - - 5 - - -', drums: 'k . h . s . h .',
      lead: 'G5 - B5 - D6 - B5 - | E5 - G5 - B5 - - . | C5 - E5 - G5 - E5 - | D5 - F#5 - A5 - - . | G5 - B5 - D6 - G6 - | E6 - D6 - B5 - G5 - | C6 - B5 - A5 - G5 - | F#5 - A5 - B5 - - .' },
    watch: { bpm: 72, wave: 'triangle', vol: 0.72, chords: 'Em C G D Em C Am B', bass: 'R - - - - - - -', drums: '. . . . . . . h',
      lead: 'E5 - - - B5 - - - | G5 - - - - - - . | C6 - - - B5 - - - | D6 - - - - - - . | E5 - - - B5 - - - | G5 - - - E6 - - - | A5 - - - C6 - - - | B5 - - - - - - .' },   // the Watch's lobby: a lamp that does not go out, waiting
    'dg-forge': { bpm: 78, wave: 'square', duty: 0.25, chords: 'Em Em C C Am Am B B', bass: 'R . R . 5 . R .', drums: 'k . . h k . s h',
      lead: 'E5 - - - G5 - B5 - | E5 - - - D5 - - . | C5 - E5 - G5 - E5 - | D5 - C5 - B4 - - . | A4 - C5 - E5 - A5 - | G5 - E5 - C5 - - . | B4 - D#5 - F#5 - B5 - | A5 - F#5 - D#5 - - .' },
    spotted: { bpm: 160, wave: 'square', duty: 0.125, chords: 'Em Em C D Em Em C B', bass: 'R R R R R R R R', drums: 'k h k h s h k s',
      lead: 'E5 . E5 . G5 . E5 . | B5 . A5 . G5 . F#5 . | E5 . G5 . C6 . B5 . | A5 - - - D6 - - - | E5 . E5 . G5 . E5 . | B5 . A5 . G5 . B5 . | C6 . B5 . A5 . G5 . | F#5 - - - D#5 - - -' },
    battle: { bpm: 150, wave: 'square', duty: 0.25, chords: 'Am F G E Am F D E', bass: 'R R R R 5 R R 5', drums: 'k h s h k k s h',
      lead: 'A5 . E5 A5 C6 . B5 A5 | F5 . C5 F5 A5 . G5 F5 | G5 . D5 G5 B5 . A5 G5 | G#5 - E5 - B5 - G#5 - | A5 . E5 A5 C6 . E6 D6 | C6 . A5 . F5 . A5 . | D6 . A5 . F#5 . A5 D6 | E6 - B5 - G#5 - E5 -' },
    boss: { bpm: 136, wave: 'square', duty: 0.5, chords: 'Cm Ab Bb G Cm Ab Fm G', bass: 'R R 5 R R R 5 5', drums: 'k h s h k k s s',
      lead: 'C5 - G5 - Eb6 - D6 C6 | Ab5 - - - C6 - Eb6 - | D6 - Bb5 - F5 - Bb5 D6 | B5 - - - G5 - D5 - | C5 - G5 - Eb6 - F6 G6 | Ab6 - G6 - Eb6 - C6 - | F6 - Eb6 - D6 - C6 Ab5 | B5 - D6 - G6 - - -' },
    // a trial (Meaning: a keeper letting go is not an enemy): Frosthold's chords without the A major, so no menace; brisk, but it keeps its feet on the ground
    trial: { bpm: 128, wave: 'square', duty: 0.25, chords: 'Dm Bb F C Dm Bb Gm C', bass: 'R . 5 . R . 5 R', drums: 'k . s . k h s .',
      lead: 'D5 . F5 A5 D6 - C6 A5 | Bb5 - F5 - D5 - F5 . | A5 . C6 . F5 . A5 C6 | G5 - E5 - C6 - - . | D5 . F5 A5 D6 - A5 F5 | Bb5 - A5 - F5 - D5 . | G5 . Bb5 . D6 . C6 Bb5 | A5 - - - E5 - - .' },
    // a night of the Watch (Meaning: the watch thickens, it is not a brawl): the lobby's own tune, a little faster, with a pulse under it; the long nights press harder
    night: { bpm: 96, wave: 'triangle', chords: 'Em C G D Em C Am B', bass: 'R - - - 5 - - -', drums: '. . h . k . h .',
      lead: 'E5 - - - B5 - - - | G5 - - - - - - . | C6 - - - B5 - - - | D6 - - - - - - . | E5 - - - B5 - - - | G5 - - - E6 - - - | A5 - - - C6 - - - | B5 - - - - - - .' },
    'night@long': { bpm: 104, wave: 'square', duty: 0.25, chords: 'Em C G D Em C Am B', bass: 'R - - - 5 - - -', drums: 'k . h . k . h h',
      lead: 'E5 - - - B5 - - - | G5 - - - - - - . | C6 - - - B5 - - - | D6 - - - - - - . | E5 - - - B5 - - - | G5 - - - E6 - - - | A5 - - - C6 - - - | B5 - - - - - - .' },
    // the Forge lit (Meaning: heard working): the same tune, faster, a fuller wave, every step drummed
    'dg-forge@lit': { bpm: 96, wave: 'square', duty: 0.5, chords: 'Em Em C C Am Am B B', bass: 'R . R . 5 . R .', drums: 'k h s h k h s h',
      lead: 'E5 - - - G5 - B5 - | E5 - - - D5 - - . | C5 - E5 - G5 - E5 - | D5 - C5 - B4 - - . | A4 - C5 - E5 - A5 - | G5 - E5 - C5 - - . | B4 - D#5 - F#5 - B5 - | A5 - F#5 - D#5 - - .' },
    // the Arch once the seat has answered: the bass on two steps and one kick a bar
    'dg-arch@seat': { bpm: 70, wave: 'triangle', chords: 'Dm Dm Bb A Dm Gm Bb A', bass: 'R - - - 5 - - -', drums: 'k . . . . . . h',
      lead: 'D5 - - - F5 - A5 - | D5 - - - F5 - - . | Bb4 - - - D5 - F5 - | E5 - - - C#5 - - . | A5 - - - F5 - D5 - | G5 - - - Bb5 - D6 - | F5 - - - D5 - Bb4 - | E5 - C#5 - A4 - - .' },
    // Home with the window dark (Meaning: after the beacon the window is lit only by you, each day): the village tune without its tune, until you light it
    'town@dark': { bpm: 104, wave: 'square', duty: 0.25, chords: 'C G Am F C G F G', bass: 'R . R . 5 . R .', drums: 'k . h . s . h .',
      lead: '. . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .' }
  };
  T['dg-lamp@lit'] = T['dg-lamp@3'];
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (n) => { const m = n.match(/^([A-G])([#b]?)(\d)$/); return 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // compile tracks into per-step events: lead [midi, steps] | null, bass midi | null, drum char
  function compile(t) {
    const lead = t.lead.replace(/\|/g, ' ').trim().split(/\s+/), chords = t.chords.split(' '), bp = t.bass.split(' '), dp = t.drums.split(' ');
    const steps = [];
    for (let i = 0; i < 64; i++) {
      const tok = lead[i]; let L = null;
      if (tok !== '.' && tok !== '-') { let len = 1; while (lead[i + len] === '-') len++; L = [midi(tok), len]; }
      const ch = chords[Math.floor(i / 8)], root = midi(ch.replace(/m$/, '').replace(/^([A-G][#b]?)$/, '$1') + '2'), b = bp[i % 8];
      let B = null; if (b === 'R') B = root; else if (b === '5') B = root + 7; else if (b === '-') B = -1;
      steps.push({ L: L, B: B, D: dp[i % 8] });
    }
    return steps;
  }
  // night versions of the place themes (Meaning: the world is quieter at night, the quiet before someone comes to a door): the same tune, slower, on a triangle wave, no drums, one bass note a bar
  const NIGHT_LEAD = {
    town: 'E4 - - - G4 - - - | D4 - - - - - - . | C5 - - - B4 - A4 - | A4 - - - F4 - - . | E4 - - - G4 - C5 - | D5 - - - B4 - - . | A4 - - - C5 - - - | B4 - - - - - - .',
    moss: 'A4 - - - C5 - - - | B4 - - - G4 - - . | A4 - - - F4 - - - | D5 - - - B4 - - . | A4 - - - E5 - - - | D5 - - - B4 - - . | C5 - - - A4 - - - | G#4 - - - - - - .',
    frost: 'E5 . . . B4 . . . | G4 . . . . . . . | D5 . . . B4 . . . | F#4 - - - . . . . | E5 . . . B4 . . . | C5 . . . G4 . . . | A4 . . . C5 . . . | B4 - - - - - - .',
    ember: 'D4 - - - F4 - A4 - | F4 - - - D4 - - . | E4 - - - G4 - C5 - | A4 - - - C#4 - - . | D4 - - - F4 - A4 - | Bb4 - - - F4 - - . | G4 - - - Bb4 - D5 - | A4 - - - - - - .',
    tide: 'C5 - - - A4 - - - | D4 - - - F4 - - . | D5 - - - Bb4 - - - | G4 - - - E4 - - . | C5 - - - A4 - F4 - | D5 - - - A4 - - . | G4 - - - Bb4 - D5 - | E5 - - - - - - .',
    peak: 'D5 - - - B4 - - - | A4 - - - F#4 - - . | E5 - - - G4 - B4 - | C5 - - - E5 - - . | D5 - - - G4 - - - | F#5 - - - D5 - - . | G4 - - - E5 - C5 - | A4 - - - - - - .',
    mossbrook: 'A4 - - - C5 - - - | E4 - - - G4 - - . | D4 - - - F4 - A4 - | F4 - - - D4 - - . | A4 - - - F5 - - - | G4 - - - E4 - - . | D5 - - - Bb4 - - - | G4 - - - - - - .',
    frosthold: 'D4 - - - - - A4 - | Bb4 - - - - - F4 - | A4 - - - - - C5 - | G4 - - - - - E4 - | D4 - - - - - A4 - | D5 - - - - - Bb4 - | G4 - - - - - D5 - | A4 - - - - - - .',
    cinderport: 'G4 - - - Bb4 - - - | Eb5 - - - D5 - - . | A4 - - - C5 - - - | D5 - - - F#4 - - . | G4 - - - Bb4 - D5 - | G5 - - - Eb5 - - . | C5 - - - Eb5 - - - | D5 - - - - - - .',
    coralbay: 'G4 - - - E4 - - - | A4 - - - E4 - - . | F4 - - - A4 - C5 - | G4 - - - D4 - - . | G4 - - - E4 - C5 - | A4 - - - E4 - - . | F4 - - - D4 - A4 - | G4 - - - - - - .',
  };   // the day's tune remembered: the same chords, fewer notes, lower and held
  Object.keys(NIGHT_LEAD).forEach((id) => { const t = T[id]; T[id + '@night'] = { bpm: Math.round(t.bpm * 0.78), wave: 'triangle', chords: t.chords, bass: 'R - - - - - - -', drums: '. . . . . . . .', lead: NIGHT_LEAD[id], vol: 0.62 }; });
  // dusk and dawn (Meaning: the hour is a hint; the sound shifts with the light, before the night does): the night's tune on the day's wave, a little slower, the day's bass, only the hats of the drums
  Object.keys(NIGHT_LEAD).forEach((id) => { const t = T[id]; T[id + '@dusk'] = { bpm: Math.round(t.bpm * 0.9), wave: t.wave, duty: t.duty, chords: t.chords, bass: t.bass, drums: t.drums.replace(/[ks]/g, '.'), lead: NIGHT_LEAD[id], vol: 0.8 }; });
  Object.keys(T).forEach((k) => { T[k].steps = compile(T[k]); });

  let ac = null, master = null, bus = null, noise = null, cur = null, want = null, step = 0, nextT = 0, timer = null, enabled = true, hidden = false, unlocked = false;
  const VOL = 0.05;
  function ensure() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ac = (typeof APP !== 'undefined' && APP.game && APP.game.ac) || new AC();
    if (typeof APP !== 'undefined' && APP.game) APP.game.ac = ac;
    master = ac.createGain(); master.gain.value = 0.0001; master.connect(ac.destination);
    const len = ac.sampleRate * 0.3; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function pulse(duty) { // PeriodicWave for a pulse of the given duty cycle
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }
  const waves = {};
  function tone(type, duty, f, t, dur, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (type === 'square' && duty && duty !== 0.5) { const key = 'p' + duty; waves[key] = waves[key] || pulse(duty); o.setPeriodicWave(waves[key]); } else o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol * 0.7, t + Math.max(0.02, dur * 0.6)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(kind, t) {
    if (kind === 'k') { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.16); return; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise;
    if (kind === 's') { f.type = 'bandpass'; f.frequency.value = 1800; g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); }
    else { f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); }
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + 0.15);
  }
  function tick() {
    if (!cur || !ac) return;
    const t = T[cur], dt = 60 / t.bpm / 2;
    while (nextT < ac.currentTime + 0.15) {
      const e = t.steps[step % 64];
      if (e.L) tone(t.wave, t.duty, hz(e.L[0]), nextT, e.L[1] * dt * 0.95, 0.32 * (t.vol || 1));
      if (e.B !== null && e.B >= 0) { let len = 1; while (t.steps[(step + len) % 64].B === -1 && len < 8) len++; tone('triangle', 0, hz(e.B), nextT, len * dt * 0.9, 0.55 * (t.vol || 1)); }
      if (e.D !== '.') drum(e.D, nextT);
      nextT += dt; step++;
    }
  }
  function startTrack(id) {
    const old = bus;
    if (old) { const g = old; g.gain.setValueAtTime(g.gain.value, ac.currentTime); g.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 0.5); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 700); }
    cur = id; step = 0; nextT = ac.currentTime + 0.12;
    bus = ac.createGain(); bus.gain.setValueAtTime(0.0001, ac.currentTime); bus.gain.linearRampToValueAtTime(1, ac.currentTime + 0.6); bus.connect(master);
    if (!timer) timer = setInterval(tick, 40);
  }
  function apply() {
    const on = enabled && !hidden && unlocked && !!want;
    if (!on) {
      if (cur && ac) { master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15); }
      if (cur && !hidden && !(enabled && want)) { cur = null; clearInterval(timer); timer = null; }
      if (hidden && timer) { clearInterval(timer); timer = null; }
      return;
    }
    if (!ensure()) return;
    if (ac.state === 'suspended') ac.resume();
    master.gain.setTargetAtTime(VOL, ac.currentTime, 0.2);
    if (cur !== want) startTrack(want);
    else if (!timer) { nextT = ac.currentTime + 0.1; timer = setInterval(tick, 40); }
  }
  function unlock() { if (unlocked) return; unlocked = true; apply(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; apply(); });
  return {
    tracks: Object.keys(T),
    play(id) { if (want === id) return; want = id; apply(); },
    setEnabled(on) { if (enabled === !!on) return; enabled = !!on; apply(); },
    get current() { return cur; },
    get state() { return { cur: cur, want: want, enabled: enabled, unlocked: unlocked, hidden: hidden, running: !!timer }; },
    _compile: compile, _T: T,
    // test helper: render N loops of a track offline and return the samples (does not touch live playback)
    async _render(id, loops) {
      const save = [ac, bus, cur, step, nextT, noise], t = T[id], dt = 60 / t.bpm / 2, sr = 22050;
      const off = new OfflineAudioContext(1, Math.ceil(sr * (64 * dt * (loops || 1) + 0.5)), sr);
      ac = off; Object.keys(waves).forEach((k) => delete waves[k]);
      const len = sr * 0.3; noise = off.createBuffer(1, len, sr); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const m = off.createGain(); m.gain.value = VOL; m.connect(off.destination); bus = off.createGain(); bus.connect(m);
      cur = id; step = 0; nextT = 0.05; const end = 64 * dt * (loops || 1);
      while (nextT < end) { const e = t.steps[step % 64]; if (e.L) tone(t.wave, t.duty, hz(e.L[0]), nextT, e.L[1] * dt * 0.95, 0.32 * (t.vol || 1)); if (e.B !== null && e.B >= 0) { let l = 1; while (t.steps[(step + l) % 64].B === -1 && l < 8) l++; tone('triangle', 0, hz(e.B), nextT, l * dt * 0.9, 0.55 * (t.vol || 1)); } if (e.D !== '.') drum(e.D, nextT); nextT += dt; step++; }
      const buf = await off.startRendering();
      [ac, bus, cur, step, nextT, noise] = save; Object.keys(waves).forEach((k) => delete waves[k]);
      return buf.getChannelData(0);
    }
  };
})();
