# Engine build plan (Nov 7 2026, evening; Dan: "build everything else")

Scope: everything in `docs/engine-brief.md` except game content. No sentence, no last act, no station of a real game is written. The demo content exists only to prove the tools and says nothing.

## Layout on the site
```
index.html            the shelf (unchanged look; reads games/index.js; the last slot is the studio's secret door)
games/index.js        the list of cartridges (generated; the studio's publish rewrites it)
games/critter-roll/   the first cartridge, untouched
games/<id>/game.json  an engine game: all of its data in one file (format v1, docs/engine-format.md)
engine/engine.js      the one shared engine (fresh code)
play/index.html       plays games/<id>/game.json (?g=<id>)
studio/               the studio: road, maps, pixels, sound, events, play, save, publish
vendor/               the Supabase library beside the shelf (a copy of the one beside Critter Roll)
supabase/00N_*.sql    schema: saves for engine games, studio drafts, owner-only rules
supabase/functions/publish/  the Edge Function that commits a game to the repo (GitHub token stays a server secret)
```

## Milestones (each: tests, snapshot, push to main)
1. Engine core and format v1: maps, tiles, sprites, people, exits, triggers, the event interpreter, flags, saves, synth, placeholders, test API. Player page. Demo game. Shelf reads the list.
2. Studio shell: sign-in gate (one account), secret door, game list, road view, map editor, intent box, save (local + cloud), play inside.
3. Pixel editor with animation: palette, tiles, props, the body with facings and frames, onion skin, used by the map editor.
4. Sound: step sequencer and sound list on the engine's synth.
5. Events: step cards.
6. Cloud saves for players; publish through the Edge Function with a Check button; the deploy workflow.

What only Dan can verify: feel on the phone, the touch editors under a thumb, the real publish (the function checks his account, so no test here can pass its gate).
