// ---- CLOUD: saves your game online (Claude account on claude.ai, Supabase account elsewhere), local save stays the fast path ----
const CLOUD = (() => {
  const KEYS = ['critter-roll:v2', 'critter-roll:world', 'critter-roll:id', 'critter-roll:tip'];
  const META = 'critter-roll:meta';
  // Supabase: public Project URL + publishable key only (safe in client code; access is limited by row level security)
  const SUPA = { url: 'https://xuawpknnmozcfzgnflel.supabase.co', key: 'sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z' };
  let mode = 'none', sb = null, account = null, recovering = false, watching = false;
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
    if (!window.claude || typeof window.claude.use !== 'function') { await initSupa(); return; }
    mode = 'claude';
    let db = null, user = null;
    try { [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); } catch (e) { set('local'); return; }
    const uid = user ? await user.id() : null;
    if (!db || !uid) { set('signedout'); return; }
    ref = db.doc('data/users/' + uid + '/save');
    await reconcile();
    watch();
  }
  function watch() { if (watching) return; watching = true; document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else reconcile(); }); }
  // ---- Supabase accounts (email + password). The game stays fully playable signed out (local save). ----
  function supaLib(ms) {
    return new Promise((res) => { const t0 = Date.now(); (function poll() { const L = window.supabase; if (L && typeof L.createClient === 'function') return res(L); if (window.__supaFailed || Date.now() - t0 > ms) return res(null); setTimeout(poll, 100); })(); });
  }
  function supaErr(e, st) {
    const msg = String((e && e.message) || e || ''), s = st || (e && e.status) || 0;
    if (s === 401 || (e && e.code === 'PGRST301') || /jwt/i.test(msg)) return { code: 'revoked', message: msg };
    if (e && e.code === '23514') return { code: 'quota_exceeded', message: msg };
    if (!s || s >= 500 || /fetch|network|load failed/i.test(msg)) return { code: 'unavailable', message: msg };
    return { code: (e && e.code) || 'error', message: msg };
  }
  function supaRef(uid) {
    return {
      get: async () => { const r = await sb.from('saves').select('body').eq('user_id', uid).maybeSingle(); if (r.error) throw supaErr(r.error, r.status); return { exists: !!r.data, data: () => (r.data ? r.data.body : null) }; },
      set: async (body) => { const r = await sb.from('saves').upsert({ user_id: uid, body: body, updated_at: new Date().toISOString() }); if (r.error) throw supaErr(r.error, r.status); },
      acquire: async (o) => { const r = await sb.rpc('acquire_save_lease', { holder: o.holder, ttl_ms: o.ttlMs }); if (r.error) throw supaErr(r.error, r.status); return { acquired: r.data === true }; }
    };
  }
  const notify = () => { if (hooks.onAccount) hooks.onAccount(); };
  async function initSupa() {
    mode = 'supa';
    const L = await supaLib(8000);
    if (!L) { mode = 'none'; set('local'); notify(); return; }
    try { sb = L.createClient(SUPA.url, SUPA.key, { auth: { storageKey: 'critter-roll:auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); }
    catch (e) { sb = null; mode = 'none'; set('local'); notify(); return; }
    // Supabase warns against awaiting its calls inside this callback, so hand off to the next tick
    sb.auth.onAuthStateChange((ev, session) => { setTimeout(() => onAuth(ev, session), 0); });
    let session = null;
    try { const r = await withTimeout(sb.auth.getSession(), 10000); session = r && r.data ? r.data.session : null; } catch (e) {}
    await connect(session);
  }
  function onAuth(ev, session) {
    if (ev === 'PASSWORD_RECOVERY') { recovering = true; notify(); }
    if (ev === 'SIGNED_OUT') { account = null; ref = null; set('signin'); notify(); return; }
    if (session && session.user && (!account || account.id !== session.user.id)) connect(session);
  }
  async function connect(session) {
    if (!session || !session.user) { account = null; ref = null; set('signin'); notify(); return; }
    if (account && account.id === session.user.id && ref) return;
    account = { id: session.user.id, email: session.user.email || '' };
    ref = supaRef(account.id);
    notify();
    await reconcile();
    watch();
  }
  const stampUid = (m) => { if (mode === 'supa' && account) m.uid = account.id; return m; };
  function friendly(e) {
    const msg = String((e && e.message) || ''), s = (e && e.status) || 0;
    if (/invalid login credentials/i.test(msg)) return 'Wrong email or password.';
    if (/already registered|already exists/i.test(msg)) return 'That email already has an account. Sign in instead.';
    if (/email not confirmed/i.test(msg)) return 'Confirm your email first: open the link we sent you, then sign in.';
    if (/password/i.test(msg) && /(6|characters|short|weak)/i.test(msg)) return 'The password needs at least 6 characters.';
    if (/email/i.test(msg) && /invalid|valid/i.test(msg)) return 'That email address does not look right.';
    if (s === 429 || /rate limit|too many/i.test(msg)) return 'Too many tries. Wait a few minutes and try again.';
    if (!s || /fetch|network|load failed/i.test(msg)) return 'Could not reach the server. Check your connection.';
    return msg || 'Something went wrong. Try again.';
  }
  const here = () => location.origin + location.pathname;
  async function signIn(email, pw) {
    if (!sb) return 'Online saves are not available right now.';
    try { const r = await sb.auth.signInWithPassword({ email: String(email).trim(), password: pw }); if (r.error) return friendly(r.error); await connect(r.data.session); return null; }
    catch (e) { return friendly(e); }
  }
  async function signUp(email, pw) {
    if (!sb) return 'Online saves are not available right now.';
    try {
      const r = await sb.auth.signUp({ email: String(email).trim(), password: pw, options: { emailRedirectTo: here() } });
      if (r.error) return friendly(r.error);
      if (!r.data.session) return { check: true };
      await connect(r.data.session); return null;
    } catch (e) { return friendly(e); }
  }
  async function resetPassword(email) {
    if (!sb) return 'Online saves are not available right now.';
    try { const r = await sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: here() }); return r.error ? friendly(r.error) : null; }
    catch (e) { return friendly(e); }
  }
  async function setPassword(pw) {
    if (!sb) return 'Online saves are not available right now.';
    try { const r = await sb.auth.updateUser({ password: pw }); if (r.error) return friendly(r.error); recovering = false; notify(); return null; }
    catch (e) { return friendly(e); }
  }
  // Sign out only once this device's progress is safely online; then this device starts fresh (the account keeps everything).
  async function signOut() {
    if (!sb || !account) return null;
    if (timer) { clearTimeout(timer); timer = null; }
    const m0 = meta();
    if (!(m0.syncedAt && m0.savedAt <= m0.syncedAt && m0.uid === account.id)) { await push(); }
    const m = meta();
    if (status === 'conflict') return 'Choose which save to keep first.';
    if (!(m.syncedAt && m.savedAt <= m.syncedAt)) return 'Your latest progress is not online yet. Check your connection and try again.';
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
    window.__saveFrozen = true;
    KEYS.concat([META]).forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
    account = null; ref = null;
    return null;
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
    if (C.hash === lh) { m.syncedAt = C.savedAt; setMeta(stampUid(m)); lastSync = Date.now(); set('synced'); return; }
    const localChanged = !(m.syncedAt && m.savedAt <= m.syncedAt);
    const cloudChanged = !(m.syncedAt && C.savedAt <= m.syncedAt);
    const other = mode === 'supa' && account && m.uid && m.uid !== account.id && progress(local['critter-roll:v2']);
    if (!other && (!progress(local['critter-roll:v2']) || (!localChanged && cloudChanged))) { adopt(C); return; }
    if (other) { conflictData = { local: { data: local, savedAt: m.savedAt }, cloud: { data: C.data || {}, savedAt: C.savedAt } }; set('conflict'); if (hooks.onConflict) hooks.onConflict(conflictData); return; }
    if (localChanged && !cloudChanged) { await push(true); return; }
    conflictData = { local: { data: local, savedAt: m.savedAt }, cloud: { data: C.data || {}, savedAt: C.savedAt } };
    set('conflict');
    if (hooks.onConflict) hooks.onConflict(conflictData);
  }
  function adopt(C) {
    const d = C.data || {};
    KEYS.forEach((k) => { if (typeof d[k] === 'string') ls.set(k, d[k]); });
    // keep the save's fingerprint, or the reload's identical re-save would look like new local progress
    setMeta(stampUid({ savedAt: C.savedAt, syncedAt: C.savedAt, hash: hash(typeof d['critter-roll:v2'] === 'string' ? d['critter-roll:v2'] : ls.get('critter-roll:v2')) }));
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
      const m2 = meta(); m2.syncedAt = body.savedAt; setMeta(stampUid(m2)); lastSync = Date.now(); set('synced');
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
    if (mode === 'supa') return {
      signin: 'Not signed in. Saved on this device only.',
      signedout: 'Signed out. Sign in again to keep saving online.',
      connecting: 'Connecting…',
      saving: 'Saving online…',
      synced: 'Saved online' + (ago === null ? '' : (ago < 1 ? ', just now' : ', ' + ago + ' min ago')),
      offline: 'Could not reach the server. Saved on this device; it will try again.',
      full: 'Online save is too big. Saved on this device.',
      conflict: 'Two different saves found. Choose which one to keep.'
    }[status] || '';
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
  return { ready, init, changed, flush, resolve, reconcile, text, signIn, signUp, signOut, resetPassword, setPassword,
    get status() { return status; }, get conflict() { return conflictData; }, get connected() { return !!ref; },
    get status() { return status; },
    get account() { return { mode: mode, available: !!sb, email: account ? account.email : null, recovering: recovering }; } };
})();
