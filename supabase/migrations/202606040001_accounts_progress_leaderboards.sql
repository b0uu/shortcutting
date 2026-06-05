create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  display_name text,
  avatar_url text,
  bio text not null default '',
  public_profile boolean not null default true,
  leaderboard_opt_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9][a-z0-9_-]{1,22}[a-z0-9]$')
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_result_id text not null,
  mode text not null,
  difficulty text not null,
  challenge_count integer not null,
  platform text not null,
  mouse_policy text not null,
  seed_pack text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  elapsed_ms integer not null,
  total_keystrokes integer not null default 0,
  hints_used integer not null default 0,
  mouse_actions integer not null default 0,
  clipboard_actions integer not null default 0,
  undo_count integer not null default 0,
  redo_count integer not null default 0,
  edits_per_minute numeric not null default 0,
  estimated_corrections integer not null default 0,
  validation_status text not null default 'valid',
  leaderboard_eligible boolean not null default false,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_result_id)
);

create table if not exists public.challenge_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  part_index integer not null,
  mode text not null,
  before_text text not null,
  target_text text not null,
  final_text text not null,
  elapsed_ms integer not null,
  skill_tags text[] not null default '{}',
  skill_packs text[] not null default '{}',
  estimated_corrections integer not null default 0,
  hints_used integer not null default 0,
  mouse_actions integer not null default 0,
  keystrokes integer not null default 0,
  clipboard_actions integer not null default 0,
  undo_count integer not null default 0,
  redo_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  difficulty text not null,
  challenge_count integer not null,
  run_count integer not null default 0,
  total_elapsed_ms integer not null default 0,
  best_elapsed_ms integer,
  best_completed_at timestamptz,
  best_result_id text,
  best_result_json jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode, difficulty, challenge_count)
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(user_id) on delete cascade,
  run_id uuid not null references public.runs(id) on delete cascade,
  mode text not null,
  difficulty text not null,
  challenge_count integer not null,
  elapsed_ms integer not null,
  edits_per_minute numeric not null default 0,
  completed_at timestamptz not null,
  result_json jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, mode, difficulty, challenge_count)
);

alter table public.profiles enable row level security;
alter table public.runs enable row level security;
alter table public.challenge_results enable row level security;
alter table public.user_progress enable row level security;
alter table public.leaderboard_entries enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.runs from anon, authenticated;
revoke all on public.challenge_results from anon, authenticated;
revoke all on public.user_progress from anon, authenticated;
revoke all on public.leaderboard_entries from anon, authenticated;

create index if not exists runs_user_completed_idx on public.runs(user_id, completed_at desc);
create index if not exists challenge_results_run_idx on public.challenge_results(run_id, part_index);
create index if not exists leaderboard_bucket_idx on public.leaderboard_entries(mode, difficulty, challenge_count, elapsed_ms asc);

drop policy if exists "public can read public profiles" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users read own runs" on public.runs;
drop policy if exists "users read own challenge results" on public.challenge_results;
drop policy if exists "users read own progress" on public.user_progress;

create policy "users read own profile"
on public.profiles for select
using (auth.uid() = user_id);

create policy "users insert own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "users update own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users read own runs"
on public.runs for select
using (auth.uid() = user_id);

create policy "users read own challenge results"
on public.challenge_results for select
using (auth.uid() = user_id);

create policy "users read own progress"
on public.user_progress for select
using (auth.uid() = user_id);

create or replace view public.public_leaderboard_entries as
select
  leaderboard_entries.id,
  leaderboard_entries.mode,
  leaderboard_entries.difficulty,
  leaderboard_entries.challenge_count,
  leaderboard_entries.elapsed_ms,
  leaderboard_entries.edits_per_minute,
  leaderboard_entries.completed_at,
  profiles.handle,
  profiles.display_name,
  profiles.avatar_url
from public.leaderboard_entries
join public.profiles on profiles.user_id = leaderboard_entries.user_id
where profiles.leaderboard_opt_out = false;

create or replace view public.public_profile_progress as
select
  profiles.handle,
  user_progress.mode,
  user_progress.difficulty,
  user_progress.challenge_count,
  user_progress.run_count,
  user_progress.best_elapsed_ms,
  user_progress.best_completed_at,
  (user_progress.best_result_json->>'editsPerMinute')::numeric as best_edits_per_minute
from public.profiles
join public.user_progress on user_progress.user_id = profiles.user_id
where profiles.public_profile = true;

create or replace view public.public_profiles as
select
  handle,
  display_name,
  avatar_url,
  bio,
  created_at
from public.profiles
where public_profile = true;

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.runs to authenticated;
grant select on public.challenge_results to authenticated;
grant select on public.user_progress to authenticated;
grant select on public.public_leaderboard_entries to anon, authenticated;
grant select on public.public_profile_progress to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;
