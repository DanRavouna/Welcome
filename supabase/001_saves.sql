-- Critter Roll cloud saves. One row per player; only that player can read or write it.
create table if not exists public.saves (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  body jsonb not null,
  updated_at timestamptz not null default now(),
  constraint saves_body_size check (pg_column_size(body) < 2000000)
);
alter table public.saves enable row level security;
drop policy if exists "own save: read" on public.saves;
drop policy if exists "own save: insert" on public.saves;
drop policy if exists "own save: update" on public.saves;
create policy "own save: read" on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "own save: insert" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "own save: update" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Short write lease so two devices never overwrite each other mid-save (same idea as the claude.ai version).
create table if not exists public.save_leases (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  holder text not null,
  until timestamptz not null
);
alter table public.save_leases enable row level security;
drop policy if exists "own lease: read" on public.save_leases;
drop policy if exists "own lease: insert" on public.save_leases;
drop policy if exists "own lease: update" on public.save_leases;
create policy "own lease: read" on public.save_leases for select to authenticated using (auth.uid() = user_id);
create policy "own lease: insert" on public.save_leases for insert to authenticated with check (auth.uid() = user_id);
create policy "own lease: update" on public.save_leases for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.acquire_save_lease(holder text, ttl_ms integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare got boolean;
begin
  if auth.uid() is null then return false; end if;
  insert into public.save_leases (user_id, holder, until)
  values (auth.uid(), acquire_save_lease.holder, now() + make_interval(secs => least(greatest(ttl_ms, 1000), 30000) / 1000.0))
  on conflict (user_id) do update set holder = excluded.holder, until = excluded.until
    where public.save_leases.until < now() or public.save_leases.holder = excluded.holder
  returning true into got;
  return coalesce(got, false);
end $$;
revoke execute on function public.acquire_save_lease(text, integer) from public, anon;
grant execute on function public.acquire_save_lease(text, integer) to authenticated;

-- Anonymous visitors get nothing; signed-in players reach only their own rows through the policies above.
revoke all on public.saves, public.save_leases from anon;
