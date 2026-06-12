alter table public.user_progress
  add column if not exists best_edits_per_minute numeric;

alter table public.leaderboard_entries
  add column if not exists handle text,
  add column if not exists display_name text,
  add column if not exists avatar_url text;

update public.user_progress
set best_edits_per_minute = (best_result_json->>'editsPerMinute')::numeric
where best_edits_per_minute is null
  and best_result_json ? 'editsPerMinute'
  and best_result_json->>'editsPerMinute' ~ '^[0-9]+(\.[0-9]+)?$';

update public.leaderboard_entries
set
  handle = profiles.handle,
  display_name = profiles.display_name,
  avatar_url = profiles.avatar_url
from public.profiles
where profiles.user_id = leaderboard_entries.user_id
  and leaderboard_entries.handle is null;

delete from public.leaderboard_entries
using public.profiles
where profiles.user_id = leaderboard_entries.user_id
  and profiles.leaderboard_opt_out = true;

drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "profiles are readable by owner or public" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "public can read public profiles" on public.profiles;
drop policy if exists "users read own runs" on public.runs;
drop policy if exists "users read own challenge results" on public.challenge_results;
drop policy if exists "users read own progress" on public.user_progress;
drop policy if exists "progress is readable by owner or public profile" on public.user_progress;
drop policy if exists "public can read public profile progress" on public.user_progress;
drop policy if exists "public can read leaderboard entries" on public.leaderboard_entries;

create policy "profiles are readable by owner or public"
on public.profiles for select
using (public_profile = true or (select auth.uid()) = user_id);

create policy "users insert own profile"
on public.profiles for insert
with check ((select auth.uid()) = user_id);

create policy "users update own profile"
on public.profiles for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users read own runs"
on public.runs for select
using ((select auth.uid()) = user_id);

create policy "users read own challenge results"
on public.challenge_results for select
using ((select auth.uid()) = user_id);

create policy "progress is readable by owner or public profile"
on public.user_progress for select
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.profiles
    where profiles.user_id = user_progress.user_id
      and profiles.public_profile = true
  )
);

create policy "public can read leaderboard entries"
on public.leaderboard_entries for select
using (handle is not null);

create index if not exists challenge_results_user_idx
on public.challenge_results(user_id);

create index if not exists leaderboard_entries_profile_idx
on public.leaderboard_entries(profile_id);

create index if not exists leaderboard_entries_run_idx
on public.leaderboard_entries(run_id);

revoke select on public.profiles from anon, authenticated;
revoke select on public.user_progress from anon, authenticated;
revoke select on public.leaderboard_entries from anon, authenticated;

grant select (
  user_id,
  handle,
  display_name,
  avatar_url,
  bio,
  public_profile,
  leaderboard_opt_out,
  created_at,
  updated_at
) on public.profiles to anon, authenticated;

grant select (
  user_id,
  mode,
  difficulty,
  challenge_count,
  run_count,
  best_elapsed_ms,
  best_completed_at,
  best_edits_per_minute
) on public.user_progress to anon, authenticated;

grant select (
  id,
  mode,
  difficulty,
  challenge_count,
  elapsed_ms,
  edits_per_minute,
  completed_at,
  handle,
  display_name,
  avatar_url
) on public.leaderboard_entries to anon, authenticated;

create or replace view public.public_leaderboard_entries
with (security_invoker = true)
as
select
  id,
  mode,
  difficulty,
  challenge_count,
  elapsed_ms,
  edits_per_minute,
  completed_at,
  handle,
  display_name,
  avatar_url
from public.leaderboard_entries
where handle is not null;

create or replace view public.public_profile_progress
with (security_invoker = true)
as
select
  profiles.handle,
  user_progress.mode,
  user_progress.difficulty,
  user_progress.challenge_count,
  user_progress.run_count,
  user_progress.best_elapsed_ms,
  user_progress.best_completed_at,
  user_progress.best_edits_per_minute
from public.profiles
join public.user_progress on user_progress.user_id = profiles.user_id
where profiles.public_profile = true;

create or replace view public.public_profiles
with (security_invoker = true)
as
select
  handle,
  display_name,
  avatar_url,
  bio,
  created_at
from public.profiles
where public_profile = true;

grant select on public.public_leaderboard_entries to anon, authenticated;
grant select on public.public_profile_progress to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
