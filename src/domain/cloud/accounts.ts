import type { ChallengeCount, Difficulty, Mode, TestResult } from "@/domain/types";

export type AccountUser = {
  id: string;
  email: string | null;
};

export type AccountProfile = {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  publicProfile: boolean;
  leaderboardOptOut: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LeaderboardBucket = {
  mode: Mode;
  difficulty: Difficulty;
  challengeCount: ChallengeCount;
};

export type PublicLeaderboardEntry = {
  id: string;
  rank: number;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  mode: Mode;
  difficulty: Difficulty;
  challengeCount: ChallengeCount;
  elapsedMs: number;
  editsPerMinute: number;
  completedAt: string;
};

export type PublicProfileSummary = {
  profile: AccountProfile;
  totals: {
    runs: number;
    bestElapsedMs: number | null;
    editsPerMinute: number;
  };
  bests: Array<{
    mode: Mode;
    difficulty: Difficulty;
    challengeCount: ChallengeCount;
    elapsedMs: number;
    completedAt: string;
  }>;
};

const reservedHandles = new Set([
  "admin",
  "api",
  "auth",
  "leaderboard",
  "leaderboards",
  "settings",
  "shortcutting",
  "supabase",
  "u",
]);

export function defaultHandleForUser(userId: string, email?: string | null): string {
  const emailPrefix = email?.split("@")[0] ?? "";
  const normalized = normalizeHandle(emailPrefix);
  if (normalized && !reservedHandles.has(normalized)) return normalized.slice(0, 24);
  return `user-${userId.slice(0, 8).toLowerCase()}`;
}

export function normalizeHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function validateHandle(value: string): string | null {
  const normalized = normalizeHandle(value);
  if (normalized.length < 3) return "Handle must be at least 3 characters.";
  if (normalized.length > 24) return "Handle must be 24 characters or fewer.";
  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(normalized)) {
    return "Handle must start and end with a letter or number.";
  }
  if (reservedHandles.has(normalized)) return "That handle is reserved.";
  return null;
}

export function leaderboardBucketForResult(result: TestResult): LeaderboardBucket {
  return {
    mode: result.config.mode,
    difficulty: result.config.difficulty,
    challengeCount: result.config.challengeCount,
  };
}

export function isLeaderboardEligible(result: TestResult, profile?: Pick<AccountProfile, "leaderboardOptOut"> | null): boolean {
  return result.config.mousePolicy === "keyboard-only"
    && result.mouseActions === 0
    && result.hintsUsed === 0
    && result.clipboardActions === 0
    && !profile?.leaderboardOptOut;
}
