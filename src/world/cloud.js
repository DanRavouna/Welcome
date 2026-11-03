// ---- CLOUD: saves your game to your Claude account (private), local save stays the fast path ----
const CLOUD = (() => {
  const KEYS = ['critter-roll:v2', 'critter-roll:world', 'critter-roll:id', 'critter-roll:tip'];
  const META = 'critter-roll:meta';
  let ref = null, status = 'connecting', lastSync = 0, pushing = false, again = false, timer = null, hooks = {}, conflictData = null, started = false;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const hash = (s) => { let h = 2166136261; s = s || ''; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  const meta = () => { try { return JSON.parse(ls.get(META) || '{}'); } catch (e) { return {}; } };
  const setMeta = (m) => ls.set(META, JSON.stringify(m));
  const readLocal = () => { const d = {}; KEYS.forEach((k) => { const v = ls.get(k); if (v !== null) d[k] = v; }); return d; };
  const progress = (v2) => { try { const s = JSON.parse(v2 || '{}'); return (s.caught || []).length > 0 || (s.xp || 0) > 0 || (s.essence || 0) > 0; } catch (e) { return false; } };
  function set(s) { status = s; if (hooks.onStatus) hooks.onStatus(s); }
  function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), ms))]); }
  let readyResolve; const ready = new Promise((r) => { readyResolve = r; });
  async function init(h) { try { await init2(h); } finally { readyResolve(); } }
  async function init2(h) {
    hooks = h || {}; started = true;
    if (!window.claude || typeof window.claude.use !== 'function') { set('local'); return; }
    let db = null, user = null;
    try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { set('local'); return; }
    const uid = user ? await user.id() : null;
    if (!db || !uid) { set('signedout'); return; }
    ref = db.doc('data/users/' + uid + '/save');
    await reconcile();
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else reconcile(); });
  }
  async function reconcile() {
    if (!ref || pushing) return;
    if (status !== 'conflict') set('connecting');
    let snap;
    try { snap = await withTimeout(ref.get(), 10000); }
    catch (e) { set(e && e.code === 'revoked' ? 'signedout' : 'offline'); return; }
    const m = meta();
    if (!m.savedAt) { m.savedAt = Date.now(); setMeta(m); }
    if (!snap.exists) { await push(true); return; }
    await decide(snap.data() || {});
  }
  async function decide(C) {
    const m = meta(), local = readLocal(), lh = hash(local['critter-roll:v2']);
    if (C.hash === lh) { m.syncedAt = C.savedAt; setMeta(m); lastSync = Date.now(); set('synced'); return; }
    const localChanged = !(m.syncedAt && m.savedAt <= m.syncedAt);
    const cloudChanged = !(m.syncedAt && C.savedAt <= m.syncedAt);
    if (!progress(local['critter-roll:v2']) || (!localChanged && cloudChanged)) { adopt(C); return; }
    if (localChanged && !cloudChanged) { await push(true); return; }
    conflictData = { local: { data: local, savedAt: m.savedAt }, cloud: { data: C.data || {}, savedAt: C.savedAt } };
    set('conflict');
    if (hooks.onConflict) hooks.onConflict(conflictData);
  }
  function adopt(C) {
    const d = C.data || {};
    KEYS.forEach((k) => { if (typeof d[k] === 'string') ls.set(k, d[k]); });
    setMeta({ savedAt: C.savedAt, syncedAt: C.savedAt });
    set('synced');
    if (hooks.onAdopt) hooks.onAdopt();
  }
  const deviceId = (() => { let d = ls.get('critter-roll:device'); if (!d) { d = 'd' + Math.random().toString(36).slice(2, 10); ls.set('critter-roll:device', d); } return d; })();
  async function push(checked) {
    if (!ref) return;
    if (pushing) { again = true; return; }
    pushing = true; set('saving');
    try {
      // one writer at a time across your devices, then re-check the account save before overwriting it
      let lease = { acquired: true };
      try { lease = await withTimeout(ref.acquire({ holder: deviceId, ttlMs: 4000 }), 10000); }
      catch (e) { if (!e || ['capability_removed', 'capability_disabled', 'transform_error'].indexOf(e.code) === -1) throw e; }
      if (!lease.acquired) { pushing = false; setTimeout(() => push(checked), 2500); return; }
      if (!checked) {
        const snap = await withTimeout(ref.get(), 10000);
        if (snap.exists) {
          const C = snap.data() || {}, m0 = meta();
          if (C.hash !== hash(ls.get('critter-roll:v2')) && C.savedAt > (m0.syncedAt || 0)) { pushing = false; await decide(C); return; }
        }
      }
      const m = meta(), data = readLocal(), body = { v: 1, savedAt: m.savedAt || Date.now(), hash: hash(data['critter-roll:v2']), data: data };
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try { await withTimeout(ref.set(body), 15000); ok = true; }
        catch (e) { if (e && e.code === 'unavailable' && attempt === 0) { await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1500)); continue; } throw e; }
      }
      const m2 = meta(); m2.syncedAt = body.savedAt; setMeta(m2); lastSync = Date.now(); set('synced');
    } catch (e) {
      set(e && e.code === 'revoked' ? 'signedout' : (e && e.code === 'quota_exceeded' ? 'full' : 'offline'));
    }
    pushing = false;
    if (again) { again = false; push(); }
  }
  // called after every local save of game progress
  function changed() {
    const m = meta(), h = hash(ls.get('critter-roll:v2'));
    if (m.hash === h) return;
    m.hash = h; m.savedAt = Date.now(); setMeta(m);
    if (!ref || status === 'conflict') return;
    clearTimeout(timer); timer = setTimeout(() => { timer = null; push(); }, 3000);
  }
  function flush() { if (timer) { clearTimeout(timer); timer = null; push(); } }
  function resolve(choice) {
    if (!conflictData) return;
    const c = conflictData; conflictData = null;
    if (choice === 'cloud') adopt({ data: c.cloud.data, savedAt: c.cloud.savedAt });
    else { const m = meta(); m.savedAt = Date.now(); setMeta(m); set('saving'); push(true); }
  }
  function text() {
    const ago = lastSync ? Math.round((Date.now() - lastSync) / 60000) : null;
    return {
      local: 'Saved on this device only',
      signedout: 'Sign in to Claude to save to your account. Saved on this device for now.',
      connecting: 'Connecting to your account…',
      saving: 'Saving to your account…',
      synced: 'Saved to your account' + (ago === null ? '' : (ago < 1 ? ', just now' : ', ' + ago + ' min ago')),
      offline: 'Could not reach your account. Saved on this device; it will try again.',
      full: 'Your account storage for this game is full. Saved on this device.',
      conflict: 'Two different saves found. Choose which one to keep.'
    }[status] || '';
  }
  return { ready, init, changed, flush, resolve, reconcile, text, get status() { return status; }, get conflict() { return conflictData; }, get connected() { return !!ref; } };
})();
