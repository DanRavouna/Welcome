# Critter Roll

A shelf of games at https://danravouna.github.io/Welcome/ (the root `index.html`). Critter Roll, an original creature-collector web game, is the first cartridge on it: https://danravouna.github.io/Welcome/games/critter-roll/

- `games/critter-roll/index.html` is the built game. Rebuild it with `python3 src/build2.py`.
- `engine/` is the shared engine for the games made in `studio/` (data in `games/<id>/game.json`, played through `play/`). See `docs/engine-brief.md`, `docs/engine-format.md` and `docs/process.md`.
- `src/` holds the source and tests. `critter-roll-handoff.md` covers the design and history.
