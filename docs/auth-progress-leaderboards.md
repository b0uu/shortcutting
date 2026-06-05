# Auth, Progress, Profiles, And Leaderboards

This is the current post-MVP direction for cloud features.

## Defaults

- Guest play remains available and stores local history.
- Supabase email auth is implemented first.
- Google and GitHub OAuth are TODOs and are not implemented in this pass.
- Account entry happens on `/onboarding`, not in a modal.
- Public profiles are public by default.
- Leaderboard participation is on by default, with a visible opt-out.
- Local history imports automatically after signup.
- Cloud storage keeps run summaries and challenge results, not raw edit-event replay.

## Supabase Setup

Use the new Supabase Secret key (`sb_secret_...`) for server-only trusted writes. The legacy `service_role` key can be used only as a fallback.

Required env values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`

Supabase dashboard security setup:

- Enable Data API.
- Disable Automatically expose new tables.
- Enable automatic RLS.

Auth redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

## Public Surfaces

- `/onboarding`: email sign-in/signup flow, profile-default confirmation, local history import, then redirect to profile.
- `/leaderboards`: public rankings by mode, difficulty, and part count.
- `/profile/[handle]`: public user profile.

Leaderboard eligibility:

- keyboard-only run,
- no mouse actions,
- no hints,
- no clipboard actions,
- exact generated challenge validation,
- plausible elapsed time,
- user has not opted out.

Mouse-allowed runs can sync privately but do not rank.
