import type { SupabaseClient, User } from "@supabase/supabase-js";
import { personalBestKey } from "@/domain/results";
import type { Difficulty, Mode, TestResult } from "@/domain/types";
import {
  defaultHandleForUser,
  isLeaderboardEligible,
  leaderboardBucketForResult,
  normalizeHandle,
  validateHandle,
  type AccountProfile,
  type PublicLeaderboardEntry,
  type PublicProfileSummary,
} from "@/domain/cloud/accounts";
import { sanitizedCloudResult, validateCloudResult } from "@/domain/cloud/resultValidation";

type CloudSaveResult = {
  result: TestResult;
  validation: ReturnType<typeof validateCloudResult>;
  leaderboardEligible: boolean;
  imported: boolean;
};

type ProfileRow = {
  user_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  public_profile: boolean;
  leaderboard_opt_out: boolean;
  created_at?: string;
  updated_at?: string;
};

type RunRow = {
  id: string;
  result_json: TestResult;
};

type ProgressRow = {
  best_result_json: TestResult;
};

type PublicLeaderboardRow = {
  id: string;
  mode: string;
  difficulty: string;
  challenge_count: number;
  elapsed_ms: number;
  edits_per_minute: number;
  completed_at: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PublicProfileProgressRow = {
  handle: string;
  mode: string;
  difficulty: string;
  challenge_count: number;
  run_count: number;
  best_elapsed_ms: number | null;
  best_completed_at: string | null;
  best_edits_per_minute: number | null;
};

type PublicProfileRow = {
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at?: string;
};

const defaultLeaderboardLimit = 50;

export async function ensureProfile(client: SupabaseClient, user: User): Promise<AccountProfile> {
  const existing = await getProfileByUserId(client, user.id);
  if (existing) return existing;

  const baseHandle = defaultHandleForUser(user.id, user.email);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const handle = attempt === 0 ? baseHandle : `${baseHandle.slice(0, 18)}-${attempt + 1}`;
    const row = profileToRow({
      userId: user.id,
      handle,
      displayName: user.email?.split("@")[0] ?? "shortcutter",
      avatarUrl: null,
      bio: "",
      publicProfile: true,
      leaderboardOptOut: false,
    });
    const { data, error } = await client.from("profiles").insert(row).select("*").single<ProfileRow>();
    if (!error && data) return rowToProfile(data);
  }

  throw new Error("Could not create a unique profile handle.");
}

export async function getProfileByUserId(client: SupabaseClient, userId: string): Promise<AccountProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();
  if (error) throw error;
  return data ? rowToProfile(data) : null;
}

export async function updateProfile(client: SupabaseClient, userId: string, patch: Partial<AccountProfile>): Promise<AccountProfile> {
  const update: Partial<ProfileRow> = {};
  if (patch.handle !== undefined) {
    const handle = normalizeHandle(patch.handle);
    const issue = validateHandle(handle);
    if (issue) throw new Error(issue);
    update.handle = handle;
  }
  if (patch.displayName !== undefined) update.display_name = patch.displayName.trim().slice(0, 48) || "shortcutter";
  if (patch.bio !== undefined) update.bio = patch.bio.trim().slice(0, 160);
  if (patch.publicProfile !== undefined) update.public_profile = patch.publicProfile;
  if (patch.leaderboardOptOut !== undefined) update.leaderboard_opt_out = patch.leaderboardOptOut;

  const { data, error } = await client
    .from("profiles")
    .update(update)
    .eq("user_id", userId)
    .select("*")
    .single<ProfileRow>();
  if (error) throw error;

  if (patch.leaderboardOptOut) {
    await client.from("leaderboard_entries").delete().eq("user_id", userId);
  }

  return rowToProfile(data);
}

export async function saveCloudResult(client: SupabaseClient, user: User, submitted: TestResult): Promise<CloudSaveResult> {
  const profile = await ensureProfile(client, user);
  const validation = validateCloudResult(submitted);
  if (!validation.valid) {
    return {
      result: sanitizedCloudResult(submitted),
      validation,
      leaderboardEligible: false,
      imported: false,
    };
  }

  const result = sanitizedCloudResult(submitted);
  const existing = await getRunByClientId(client, user.id, result.id);
  if (existing) {
    return {
      result: existing.result_json,
      validation,
      leaderboardEligible: false,
      imported: true,
    };
  }

  const leaderboardEligible = isLeaderboardEligible(result, profile);
  const runRow = runToRow(user.id, result, validation.valid, leaderboardEligible);
  const { data: run, error } = await client
    .from("runs")
    .insert(runRow)
    .select("id")
    .single<{ id: string }>();
  if (error) throw error;

  const challengeRows = result.challengeResults.map((part, index) => ({
    run_id: run.id,
    user_id: user.id,
    challenge_id: part.challengeId,
    part_index: index + 1,
    mode: part.mode,
    before_text: part.beforeText,
    target_text: part.targetText,
    final_text: part.finalText,
    elapsed_ms: Math.round(part.elapsedMs),
    skill_tags: part.skillTags,
    skill_packs: part.skillPacks,
    estimated_corrections: part.estimatedCorrections,
    hints_used: part.hintsUsed,
    mouse_actions: part.mouseActions,
    keystrokes: part.keystrokes,
    clipboard_actions: part.clipboardActions,
    undo_count: part.undoCount,
    redo_count: part.redoCount,
  }));
  if (challengeRows.length > 0) {
    const { error: challengeError } = await client.from("challenge_results").insert(challengeRows);
    if (challengeError) throw challengeError;
  }

  const bestResult = await updateProgress(client, user.id, result);
  const storedResult = { ...result, isPersonalBest: bestResult.id === result.id };
  if (leaderboardEligible) {
    await updateLeaderboard(client, user.id, profile, storedResult, run.id);
  }

  return {
    result: storedResult,
    validation,
    leaderboardEligible,
    imported: false,
  };
}

export async function importCloudResults(client: SupabaseClient, user: User, results: TestResult[]): Promise<{ imported: number; skipped: number; rejected: number }> {
  let imported = 0;
  let skipped = 0;
  let rejected = 0;
  for (const result of results) {
    const saved = await saveCloudResult(client, user, result);
    if (!saved.validation.valid) rejected += 1;
    else if (saved.imported) skipped += 1;
    else imported += 1;
  }
  return { imported, skipped, rejected };
}

export async function getCloudHistory(client: SupabaseClient, userId: string, filter: { mode?: Mode | "all"; difficulty?: Difficulty | "all" } = {}): Promise<TestResult[]> {
  let query = client
    .from("runs")
    .select("id,result_json")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(100);

  if (filter.mode && filter.mode !== "all") query = query.eq("mode", filter.mode);
  if (filter.difficulty && filter.difficulty !== "all") query = query.eq("difficulty", filter.difficulty);

  const { data, error } = await query.returns<RunRow[]>();
  if (error) throw error;
  return (data ?? []).map((row) => row.result_json);
}

export async function getCloudPersonalBests(client: SupabaseClient, userId: string): Promise<Record<string, TestResult>> {
  const { data, error } = await client
    .from("user_progress")
    .select("best_result_json")
    .eq("user_id", userId)
    .returns<ProgressRow[]>();
  if (error) throw error;

  return (data ?? []).reduce((bests, row) => {
    bests[personalBestKey(row.best_result_json.config)] = row.best_result_json;
    return bests;
  }, {} as Record<string, TestResult>);
}

export async function clearCloudData(client: SupabaseClient, userId: string): Promise<void> {
  await client.from("leaderboard_entries").delete().eq("user_id", userId);
  await client.from("challenge_results").delete().eq("user_id", userId);
  await client.from("runs").delete().eq("user_id", userId);
  await client.from("user_progress").delete().eq("user_id", userId);
}

export async function getLeaderboardEntries(
  client: SupabaseClient,
  filter: { mode: Mode; difficulty: Difficulty; challengeCount: number; limit?: number },
): Promise<PublicLeaderboardEntry[]> {
  const { data, error } = await client
    .from("public_leaderboard_entries")
    .select("id,mode,difficulty,challenge_count,elapsed_ms,edits_per_minute,completed_at,handle,display_name,avatar_url")
    .eq("mode", filter.mode)
    .eq("difficulty", filter.difficulty)
    .eq("challenge_count", filter.challengeCount)
    .order("elapsed_ms", { ascending: true })
    .limit(filter.limit ?? defaultLeaderboardLimit);
  if (error) throw error;

  return ((data ?? []) as PublicLeaderboardRow[]).map((row, index) => ({
    id: row.id,
    rank: index + 1,
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl: row.avatar_url,
    mode: row.mode as Mode,
    difficulty: row.difficulty as Difficulty,
    challengeCount: row.challenge_count as PublicLeaderboardEntry["challengeCount"],
    elapsedMs: row.elapsed_ms,
    editsPerMinute: row.edits_per_minute,
    completedAt: row.completed_at,
  }));
}

export async function getPublicProfileSummary(client: SupabaseClient, handle: string): Promise<PublicProfileSummary | null> {
  const { data: profileRow, error } = await client
    .from("public_profiles")
    .select("handle,display_name,avatar_url,bio,created_at")
    .eq("handle", normalizeHandle(handle))
    .maybeSingle<PublicProfileRow>();
  if (error) throw error;
  if (!profileRow) return null;

  const profile: AccountProfile = {
    userId: "",
    handle: profileRow.handle,
    displayName: profileRow.display_name ?? profileRow.handle,
    avatarUrl: profileRow.avatar_url,
    bio: profileRow.bio ?? "",
    publicProfile: true,
    leaderboardOptOut: false,
    createdAt: profileRow.created_at,
  };
  const { data: progressRows, error: progressError } = await client
    .from("public_profile_progress")
    .select("mode,difficulty,challenge_count,run_count,best_elapsed_ms,best_completed_at,best_edits_per_minute")
    .eq("handle", profile.handle);
  if (progressError) throw progressError;

  const rows = (progressRows ?? []) as PublicProfileProgressRow[];
  const runCount = rows.reduce((total, row) => total + Number(row.run_count ?? 0), 0);
  const bestElapsed = rows.reduce<number | null>((best, row) => {
    const elapsed = Number(row.best_elapsed_ms ?? 0);
    if (elapsed <= 0) return best;
    return best === null || elapsed < best ? elapsed : best;
  }, null);
  const bests = rows
    .filter((row) => row.best_elapsed_ms !== null && row.best_completed_at !== null)
    .map((row) => ({
      mode: row.mode as Mode,
      difficulty: row.difficulty as Difficulty,
      challengeCount: Number(row.challenge_count) as PublicProfileSummary["bests"][number]["challengeCount"],
      elapsedMs: Number(row.best_elapsed_ms),
      editsPerMinute: Number(row.best_edits_per_minute ?? 0),
      completedAt: String(row.best_completed_at),
    }))
    .sort((first, second) => first.elapsedMs - second.elapsedMs)
    .slice(0, 6);

  return {
    profile,
    totals: {
      runs: runCount,
      bestElapsedMs: bestElapsed,
      editsPerMinute: averageBestEdits(rows),
    },
    bests,
  };
}

async function getRunByClientId(client: SupabaseClient, userId: string, clientResultId: string): Promise<RunRow | null> {
  const { data, error } = await client
    .from("runs")
    .select("id,result_json")
    .eq("user_id", userId)
    .eq("client_result_id", clientResultId)
    .maybeSingle<RunRow>();
  if (error) throw error;
  return data ?? null;
}

async function updateProgress(client: SupabaseClient, userId: string, result: TestResult): Promise<TestResult> {
  const bucket = leaderboardBucketForResult(result);
  const { data: current, error: currentError } = await client
    .from("user_progress")
    .select("run_count,total_elapsed_ms,best_elapsed_ms,best_result_json")
    .eq("user_id", userId)
    .eq("mode", bucket.mode)
    .eq("difficulty", bucket.difficulty)
    .eq("challenge_count", bucket.challengeCount)
    .maybeSingle<{
      run_count: number;
      total_elapsed_ms: number;
      best_elapsed_ms: number | null;
      best_result_json: TestResult | null;
    }>();
  if (currentError) throw currentError;

  const isBest = !current?.best_elapsed_ms || result.elapsedMs < current.best_elapsed_ms;
  const bestResult = isBest ? result : current.best_result_json ?? result;
  const row = {
    user_id: userId,
    mode: bucket.mode,
    difficulty: bucket.difficulty,
    challenge_count: bucket.challengeCount,
    run_count: (current?.run_count ?? 0) + 1,
    total_elapsed_ms: (current?.total_elapsed_ms ?? 0) + Math.round(result.elapsedMs),
    best_elapsed_ms: Math.round(bestResult.elapsedMs),
    best_completed_at: bestResult.completedAt,
    best_result_id: bestResult.id,
    best_result_json: bestResult,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client
    .from("user_progress")
    .upsert(row, { onConflict: "user_id,mode,difficulty,challenge_count" });
  if (error) throw error;
  return bestResult;
}

async function updateLeaderboard(client: SupabaseClient, userId: string, profile: AccountProfile, result: TestResult, runId: string): Promise<void> {
  const bucket = leaderboardBucketForResult(result);
  const { data: current, error: currentError } = await client
    .from("leaderboard_entries")
    .select("elapsed_ms")
    .eq("user_id", userId)
    .eq("mode", bucket.mode)
    .eq("difficulty", bucket.difficulty)
    .eq("challenge_count", bucket.challengeCount)
    .maybeSingle<{ elapsed_ms: number }>();
  if (currentError) throw currentError;
  if (current && current.elapsed_ms <= result.elapsedMs) return;

  const { error } = await client.from("leaderboard_entries").upsert({
    user_id: userId,
    profile_id: profile.userId,
    run_id: runId,
    mode: bucket.mode,
    difficulty: bucket.difficulty,
    challenge_count: bucket.challengeCount,
    elapsed_ms: Math.round(result.elapsedMs),
    edits_per_minute: result.editsPerMinute,
    completed_at: result.completedAt,
    result_json: result,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,mode,difficulty,challenge_count" });
  if (error) throw error;
}

function rowToProfile(row: ProfileRow): AccountProfile {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    avatarUrl: row.avatar_url,
    bio: row.bio ?? "",
    publicProfile: row.public_profile,
    leaderboardOptOut: row.leaderboard_opt_out,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function profileToRow(profile: AccountProfile): ProfileRow {
  return {
    user_id: profile.userId,
    handle: profile.handle,
    display_name: profile.displayName,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
    public_profile: profile.publicProfile,
    leaderboard_opt_out: profile.leaderboardOptOut,
  };
}

function runToRow(userId: string, result: TestResult, valid: boolean, leaderboardEligible: boolean) {
  return {
    user_id: userId,
    client_result_id: result.id,
    mode: result.config.mode,
    difficulty: result.config.difficulty,
    challenge_count: result.config.challengeCount,
    platform: result.config.platform,
    mouse_policy: result.config.mousePolicy,
    seed_pack: result.config.seedPack,
    started_at: result.startedAt,
    completed_at: result.completedAt,
    elapsed_ms: Math.round(result.elapsedMs),
    total_keystrokes: result.totalKeystrokes,
    hints_used: result.hintsUsed,
    mouse_actions: result.mouseActions,
    clipboard_actions: result.clipboardActions,
    undo_count: result.undoCount,
    redo_count: result.redoCount,
    edits_per_minute: result.editsPerMinute,
    estimated_corrections: result.estimatedCorrectionCount,
    validation_status: valid ? "valid" : "rejected",
    leaderboard_eligible: leaderboardEligible,
    result_json: result,
  };
}

function averageBestEdits(rows: PublicProfileProgressRow[]): number {
  const values = rows
    .map((row) => row.best_edits_per_minute)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return 0;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}
