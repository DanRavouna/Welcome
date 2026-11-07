// The studio's publish function. Runs on Supabase (Deno). The caller must be signed in as the owner; the GitHub token
// is a server secret (GITHUB_TOKEN) and never reaches a browser. mode "check" reads the repository; mode "publish"
// commits games/<id>/game.json and games/index.js to main in one commit, which the Pages workflow then deploys.
import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER = "patrav0412@gmail.com";
const REPO = "DanRavouna/Welcome";
const BRANCH = "main";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user || user.email !== OWNER) return json({ error: "This studio is not yours." }, 403);
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) return json({ error: "No GitHub token is set on the server." }, 500);
  const gh = (path: string, init: RequestInit = {}) =>
    fetch("https://api.github.com" + path, {
      ...init,
      headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "shelf-studio", "Content-Type": "application/json", ...(init.headers as Record<string, string> ?? {}) },
    });
  const body = await req.json().catch(() => ({}));

  if (body.mode === "check") {
    const r = await gh(`/repos/${REPO}`);
    if (!r.ok) return json({ error: `GitHub answered ${r.status} for the repository (is the token scoped to it, with Contents read and write?)` }, 502);
    const j = await r.json();
    return json({ ok: true, repo: j.full_name, branch: j.default_branch, push: j.permissions?.push ?? null });
  }
  if (body.mode !== "publish") return json({ error: "mode must be check or publish" }, 400);

  // the game: data only, a slug id, maps, under 6 MB
  const game = body.game;
  if (!game || typeof game !== "object" || !game.maps || typeof game.maps !== "object") return json({ error: "No game data." }, 400);
  const id = String(game.id ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!id || id === "critter-roll" || id === "index") return json({ error: "Bad game id." }, 400);
  game.id = id;
  const text = JSON.stringify(game);
  if (text.length > 6_000_000) return json({ error: "The game is over 6 MB." }, 413);
  if (JSON.stringify(JSON.parse(text)) !== text) return json({ error: "The game does not round-trip as JSON." }, 400);
  delete game.updated;

  // the shelf list: read, upsert this game, keep the order
  let list: Array<Record<string, unknown>> = [];
  const idx = await gh(`/repos/${REPO}/contents/games/index.js?ref=${BRANCH}`);
  if (idx.ok) {
    const j = await idx.json();
    const src = unb64(j.content as string);
    const m = src.match(/\[\s*[\s\S]*\]/);
    try { list = m ? JSON.parse(m[0]) : []; } catch { list = []; }
  }
  const entry = { id, name: String(game.name ?? id), year: Number(game.year) || new Date().getFullYear(), kind: "engine" };
  const at = list.findIndex((g) => g.id === id);
  if (at >= 0) list[at] = { ...list[at], ...entry }; else list.push(entry);
  const indexText = "// The cartridges on the shelf, in order. Generated: the studio's publish rewrites this file.\n// kind \"html\" is a game with its own page; kind \"engine\" plays games/<id>/game.json through play/.\nwindow.SHELF_GAMES = " +
    JSON.stringify(list, null, 2).replace(/\n/g, "\n") + ";\n";

  // one commit through the git data API: ref -> base tree -> blobs -> tree -> commit -> ref
  const refR = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  if (!refR.ok) return json({ error: `Could not read the branch (${refR.status}).` }, 502);
  const headSha = (await refR.json()).object.sha as string;
  const commitR = await gh(`/repos/${REPO}/git/commits/${headSha}`);
  const baseTree = (await commitR.json()).tree.sha as string;
  const blob = async (content: string) => {
    const r = await gh(`/repos/${REPO}/git/blobs`, { method: "POST", body: JSON.stringify({ content: b64(content), encoding: "base64" }) });
    if (!r.ok) throw new Error(`blob ${r.status}`);
    return (await r.json()).sha as string;
  };
  try {
    const gameSha = await blob(JSON.stringify(game));
    const indexSha = await blob(indexText);
    const treeR = await gh(`/repos/${REPO}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: baseTree, tree: [
      { path: `games/${id}/game.json`, mode: "100644", type: "blob", sha: gameSha },
      { path: "games/index.js", mode: "100644", type: "blob", sha: indexSha },
    ] }) });
    if (!treeR.ok) throw new Error(`tree ${treeR.status}`);
    const treeSha = (await treeR.json()).sha as string;
    const message = `Publish ${entry.name} (${id}) from the studio` + (body.note ? `\n\n${String(body.note).slice(0, 500)}` : "");
    const cR = await gh(`/repos/${REPO}/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: treeSha, parents: [headSha] }) });
    if (!cR.ok) throw new Error(`commit ${cR.status}`);
    const c = await cR.json();
    const uR = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: c.sha, force: false }) });
    if (!uR.ok) throw new Error(`ref ${uR.status}`);
    return json({ ok: true, sha: c.sha, url: c.html_url, path: `games/${id}/game.json` });
  } catch (e) {
    return json({ error: `GitHub refused the commit: ${(e as Error).message}` }, 502);
  }
});
