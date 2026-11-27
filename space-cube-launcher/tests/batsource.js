// A stand-in for the app's battery test (window.Launcher.bat*, app 1.6+): same method names, same JSON strings.
// Start / Stop work; window.__batPlant(samples) replaces the readings with known ones (to check the sums).
(() => {
  const S = window.__batState = { running: false, start: 0, stop: 0, samples: [] };
  const reading = () => ({ t: Date.now(), level: 80, charge: 3000000, now: -400000, plugged: false, on: true });
  window.__batPlant = list => { S.samples = list; S.start = list[0].t; S.stop = list[list.length - 1].t; S.running = false; };
  window.__batSource = {
    batStart: () => { S.running = true; S.start = Date.now(); S.stop = 0; S.samples = [reading()]; },
    batStop: () => { S.samples.push(reading()); S.running = false; S.stop = Date.now(); },
    batStatus: () => JSON.stringify(S),
    batNow: () => JSON.stringify(reading()),
  };
})();
