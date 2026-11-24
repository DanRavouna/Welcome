# Space Cube Launcher

A home-screen app for Android: your apps float as glass cubes in space near Saturn,
grouped into cubes you can open, with a chrome console, a custom keyboard for search,
and two favourite "eggs".

The 3D home screen is `app/src/main/assets/index.html` (the same page as the web prototype).
The Kotlin code wraps it and connects it to the phone.

## Install it — pick ONE way

### A. Android Studio (on your computer)
1. Install **Android Studio** (free) and open this folder (`SpaceCubeLauncher`).
   Let it finish "Gradle sync". If it offers to upgrade Gradle / the Android plugin, say yes.
2. On your phone: **Settings → About phone → Software information → tap "Build number" 7 times**
   (turns on Developer options), then **Settings → Developer options → USB debugging: on**.
3. Plug the phone in with USB, accept the "Allow USB debugging?" prompt.
4. In Android Studio pick your phone at the top and press the green **Run ▶** button.

### B. No Android Studio: let GitHub build it
1. Create a new (private) repository on GitHub and upload this whole folder to it.
2. Open the **Actions** tab — the "Build APK" job runs automatically (a few minutes).
3. Open the finished run, download **SpaceCubeLauncher-debug** (a zip with the .apk inside).
4. On your phone, open the .apk and allow "Install unknown apps" for your browser/files app when asked.

## Make it your home screen
Open **Space Cube** once, then press the phone's Home button and choose **Space Cube → Always**.
Or: **Settings → Apps → Choose default apps → Home app → Space Cube**.
To go back to Samsung's launcher: same place, pick **One UI Home**.

## What works on the phone
- All your installed apps, with their real icons. On first launch they're pre-sorted into
  Social / Media / Games / Tools / Work using each app's own category; the rest go to **Unsorted**
  (Settings ⚙ to move them).
- Tap a cube to select, tap again to open (real app launches). Groups open the same way.
- Search with the built-in keyboard; up to 8 results as cubes.
- Eggs = favourites: tap to launch, long-press to choose, or hold any app cube and drop it in an egg.
- New installs appear in Unsorted automatically; uninstalled apps disappear.
- **Back** closes things one step at a time; **Home** returns to the groups.
- The 3D scene pauses while another app is open (saves battery).

## Not done yet
- Long-press menu on cubes (app info / uninstall are already wired in Kotlin: `Launcher.appInfo`, `Launcher.uninstall`).
- Notification badges, swipe-down for notifications, double-tap to lock.
- Widgets.

## Files
- `app/src/main/assets/index.html` – the whole 3D home screen, as the app and the site load it. **Built, never edited by hand.**
- `src/` – what it is built from: `page.html` (markup and styles), `catalogue.js` (every place, the one saved state, the rules, the time model, the pictures), `game.js` (the home screen), `map.js` (the star map).
- `HANDOFF.md` – start here to work on the home screen; `docs/` has the rules, the code map and the data. `tests/run.sh` builds and tests it.
- `tools/build.py` – the one build command: `python3 space-cube-launcher/tools/build.py` (add `--preview FILE` for a stand-alone copy to open in a browser).
- `tools/catalog-hand.json` – everything written by hand: our planets, their rings and moons, their orbits, the landmarks, the star categories. `tools/nasa-snapshot.json` – the NASA Exoplanet Archive download (`tools/fetch_sky.py`, run by the "sky-data" workflow). `tools/build_catalog.py` turns both into `tools/catalog.json`, the one data file the page reads.
- `app/src/main/java/com/dan/spacecube/MainActivity.kt` – hosts the page, Home/Back, pause, app-change events.
- `app/src/main/java/com/dan/spacecube/LauncherBridge.kt` – what the page can ask the phone for.
- Bundled offline: `three.min.js` (three.js r128, MIT licence) and the Orbitron font (SIL Open Font Licence).
