// One account for the shelf: sign in, create an account, forgot password, sign out, and saves for the engine games that
// follow the player (table shelf_saves). Local-first: the device's save is used at once; the cloud copy is pulled when
// signed in and the newer one wins; every change is pushed after a short pause. Loaded by the shelf and by play/.
(function () {
  'use strict';
  const SB_URL = 'https://xuawpknnmozcfzgnflel.supabase.co', SB_KEY = 'sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z';
  let sb = null, user = null, timers = {}, listeners = [];
  const notify = () => listeners.forEach((f) => { try { f(SHELFCLOUD.state()); } catch (e) {} });
  function friendly(err) { const m = String(err && err.message || err || ''); if (/invalid login/i.test(m)) return 'Wrong email or password.'; if (/already registered|already exists/i.test(m)) return 'That email already has an account. Sign in instead.'; if (/email not confirmed/i.test(m)) return 'Confirm your email first: open the link we sent you, then sign in.'; if (/password/i.test(m) && /(6|characters|short|weak)/i.test(m)) return 'The password needs at least 6 characters.'; if (/fetch|network|load failed/i.test(m)) return 'Could not reach the server.'; return m || 'Something went wrong.'; }
  const here = () => location.origin + location.pathname.replace(/play\/[^/]*$/, '');
  const SHELFCLOUD = {
    async init() {
      if (!window.supabase || window.__supaFailed) { notify(); return; }
      try { sb = window.supabase.createClient(SB_URL, SB_KEY); const s = await sb.auth.getSession(); user = s.data && s.data.session ? s.data.session.user : null; sb.auth.onAuthStateChange((_e, sess) => { user = sess ? sess.user : null; notify(); }); } catch (e) { sb = null; }
      notify();
    },
    state() { return { available: !!sb, email: user ? user.email : null }; },
    onChange(f) { listeners.push(f); },
    async signIn(email, pw) { if (!sb) return 'Online saves are not available right now.'; const r = await sb.auth.signInWithPassword({ email: String(email).trim(), password: pw }); return r.error ? friendly(r.error) : null; },
    async signUp(email, pw) { if (!sb) return 'Online saves are not available right now.'; const r = await sb.auth.signUp({ email: String(email).trim(), password: pw, options: { emailRedirectTo: here() } }); if (r.error) return friendly(r.error); return r.data.session ? null : 'Check your email to confirm the account, then sign in.'; },
    async forgot(email) { if (!sb) return 'Online saves are not available right now.'; const r = await sb.auth.resetPasswordForEmail(String(email).trim(), { redirectTo: here() }); return r.error ? friendly(r.error) : 'Check your email for the link.'; },
    async signOut() { if (sb) await sb.auth.signOut(); user = null; notify(); },
    // the save of one game: local first; when signed in, the cloud copy is pulled and the newer wins
    async pull(gameId) {
      if (!sb || !user) return null;
      try { const r = await sb.from('shelf_saves').select('body').eq('game_id', gameId).maybeSingle(); return r.error || !r.data ? null : r.data.body; } catch (e) { return null; }
    },
    push(gameId, save) {
      if (!sb || !user) return; if (timers[gameId]) clearTimeout(timers[gameId]);
      timers[gameId] = setTimeout(async () => { timers[gameId] = null; try { await sb.from('shelf_saves').upsert({ user_id: user.id, game_id: gameId, body: save, updated_at: new Date().toISOString() }); } catch (e) {} }, 1500);
    },
    async flush(gameId, save) { if (!sb || !user) return; if (timers[gameId]) { clearTimeout(timers[gameId]); timers[gameId] = null; } try { await sb.from('shelf_saves').upsert({ user_id: user.id, game_id: gameId, body: save, updated_at: new Date().toISOString() }); } catch (e) {} },
    // a small account panel, used by the shelf and the player page
    panel(host) {
      const el = document.createElement('div'); el.className = 'acct'; host.appendChild(el);
      const draw = (st) => {
        if (!st.available) { el.innerHTML = '<span class="acct-note">Saves stay on this device.</span>'; return; }
        if (st.email) { el.innerHTML = '<span class="acct-note">Signed in as ' + st.email.replace(/[<>&]/g, '') + '</span> <button type="button" id="acct-out">Sign out</button>'; el.querySelector('#acct-out').onclick = () => SHELFCLOUD.signOut(); return; }
        el.innerHTML = '<form id="acct-form"><input id="acct-email" type="email" placeholder="email" autocomplete="username" required> <input id="acct-pw" type="password" placeholder="password" autocomplete="current-password" required> <button type="submit">Sign in</button> <button type="button" id="acct-new">Create</button> <button type="button" id="acct-forgot">Forgot</button><div class="acct-note" id="acct-msg" aria-live="polite">Sign in and your saves follow you.</div></form>';
        const msg = el.querySelector('#acct-msg'), email = () => el.querySelector('#acct-email').value, pw = () => el.querySelector('#acct-pw').value;
        el.querySelector('#acct-form').onsubmit = async (e) => { e.preventDefault(); msg.textContent = 'Signing in…'; const r = await SHELFCLOUD.signIn(email(), pw()); if (r) msg.textContent = r; };
        el.querySelector('#acct-new').onclick = async () => { if (!email() || !pw()) { msg.textContent = 'Enter an email and a password.'; return; } msg.textContent = 'Creating…'; const r = await SHELFCLOUD.signUp(email(), pw()); msg.textContent = r || 'Account made.'; };
        el.querySelector('#acct-forgot').onclick = async () => { if (!email()) { msg.textContent = 'Enter your email first.'; return; } msg.textContent = await SHELFCLOUD.forgot(email()); };
      };
      SHELFCLOUD.onChange(draw); draw(SHELFCLOUD.state());
    }
  };
  window.SHELFCLOUD = SHELFCLOUD;
})();
