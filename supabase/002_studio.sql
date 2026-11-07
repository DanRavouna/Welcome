-- The studio's drafts and the engine games' saves. Applied through the Supabase Management API (see CLAUDE.md).
-- Drafts: one row per game in progress; only the owner's account (one email) can read or write them.
create table if not exists public.studio_games (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body jsonb not null,
  updated_at timestamptz not null default now(),
  constraint studio_games_body_size check (pg_column_size(body) < 8000000)
);
alter table public.studio_games enable row level security;
drop policy if exists "studio: owner reads" on public.studio_games;
drop policy if exists "studio: owner inserts" on public.studio_games;
drop policy if exists "studio: owner updates" on public.studio_games;
drop policy if exists "studio: owner deletes" on public.studio_games;
create policy "studio: owner reads" on public.studio_games for select to authenticated
  using (auth.uid() = owner and (auth.jwt() ->> 'email') = 'patrav0412@gmail.com');
create policy "studio: owner inserts" on public.studio_games for insert to authenticated
  with check (auth.uid() = owner and (auth.jwt() ->> 'email') = 'patrav0412@gmail.com');
create policy "studio: owner updates" on public.studio_games for update to authenticated
  using (auth.uid() = owner and (auth.jwt() ->> 'email') = 'patrav0412@gmail.com')
  with check (auth.uid() = owner and (auth.jwt() ->> 'email') = 'patrav0412@gmail.com');
create policy "studio: owner deletes" on public.studio_games for delete to authenticated
  using (auth.uid() = owner and (auth.jwt() ->> 'email') = 'patrav0412@gmail.com');
revoke all on public.studio_games from anon;

-- Saves for engine games on the shelf: one row per player per game; only that player reaches it.
create table if not exists public.shelf_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  game_id text not null,
  body jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id),
  constraint shelf_saves_body_size check (pg_column_size(body) < 2000000)
);
alter table public.shelf_saves enable row level security;
drop policy if exists "shelf save: read" on public.shelf_saves;
drop policy if exists "shelf save: insert" on public.shelf_saves;
drop policy if exists "shelf save: update" on public.shelf_saves;
create policy "shelf save: read" on public.shelf_saves for select to authenticated using (auth.uid() = user_id);
create policy "shelf save: insert" on public.shelf_saves for insert to authenticated with check (auth.uid() = user_id);
create policy "shelf save: update" on public.shelf_saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.shelf_saves from anon;
