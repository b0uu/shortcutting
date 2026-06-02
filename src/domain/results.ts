import type {
  ChallengeResult,
  PersonalBestKey,
  SkillCategorySummary,
  SkillTag,
  TestConfig,
  TestResult,
} from "./types";
import { editDistance } from "./diff";

export function personalBestKey(config: TestConfig): string {
  const key: PersonalBestKey = {
    mode: config.mode,
    challengeCount: config.challengeCount,
    platform: config.platform,
    mousePolicy: config.mousePolicy,
    difficulty: config.difficulty,
    seedPack: config.seedPack,
  };

  return [
    key.mode,
    key.challengeCount,
    key.platform,
    key.mousePolicy,
    key.difficulty,
    key.seedPack,
  ].join("|");
}

export function chooseShareChallenge(results: ChallengeResult[]): ChallengeResult {
  if (results.length === 0) {
    throw new Error("Cannot choose a share challenge without results.");
  }

  return results.reduce((best, current) => {
    const bestDistance = editDistance(best.beforeText, best.targetText);
    const currentDistance = editDistance(current.beforeText, current.targetText);
    return currentDistance >= bestDistance ? current : best;
  }, results[results.length - 1]);
}

export function summarizeResult(
  id: string,
  config: TestConfig,
  startedAt: string,
  completedAt: string,
  elapsedMs: number,
  challengeResults: ChallengeResult[],
  isPersonalBest: boolean,
): TestResult {
  const shareChallenge = chooseShareChallenge(challengeResults);
  return {
    id,
    config,
    startedAt,
    completedAt,
    elapsedMs,
    challengeResults,
    totalKeystrokes: sum(challengeResults, "keystrokes"),
    hintsUsed: sum(challengeResults, "hintsUsed"),
    mouseActions: sum(challengeResults, "mouseActions"),
    clipboardActions: sum(challengeResults, "clipboardActions"),
    undoCount: sum(challengeResults, "undoCount"),
    redoCount: sum(challengeResults, "redoCount"),
    editsPerMinute: editsPerMinute(challengeResults, elapsedMs),
    estimatedCorrectionCount: sum(challengeResults, "estimatedCorrections"),
    skillTagSummary: skillTagSummary(challengeResults),
    bestSkillCategory: bestSkillCategory(challengeResults),
    slowestSkillCategory: slowestSkillCategory(challengeResults),
    isPersonalBest,
    shareChallengeId: shareChallenge.challengeId,
  };
}

function sum(results: ChallengeResult[], key: keyof ChallengeResult): number {
  return results.reduce((total, result) => {
    const value = result[key];
    return typeof value === "number" ? total + value : total;
  }, 0);
}

function editsPerMinute(results: ChallengeResult[], elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const edits = sum(results, "estimatedCorrections");
  return Math.round((edits / (elapsedMs / 60000)) * 10) / 10;
}

export function skillTagSummary(results: ChallengeResult[]): Partial<Record<SkillTag, number>> {
  return results.reduce((summary, result) => {
    for (const tag of result.skillTags) {
      summary[tag] = (summary[tag] ?? 0) + 1;
    }
    return summary;
  }, {} as Partial<Record<SkillTag, number>>);
}

function bestSkillCategory(results: ChallengeResult[]): SkillCategorySummary | null {
  const categories = skillCategorySummaries(results);
  if (categories.length === 0) return null;
  return categories.reduce((best, current) => (
    current.averageElapsedMs < best.averageElapsedMs ? current : best
  ));
}

function slowestSkillCategory(results: ChallengeResult[]): SkillCategorySummary | null {
  const categories = skillCategorySummaries(results);
  if (categories.length === 0) return null;
  return categories.reduce((slowest, current) => (
    current.averageElapsedMs > slowest.averageElapsedMs ? current : slowest
  ));
}

function skillCategorySummaries(results: ChallengeResult[]): SkillCategorySummary[] {
  const bucket = new Map<SkillTag, { count: number; elapsedMs: number }>();
  for (const result of results) {
    for (const tag of result.skillTags) {
      const current = bucket.get(tag) ?? { count: 0, elapsedMs: 0 };
      bucket.set(tag, {
        count: current.count + 1,
        elapsedMs: current.elapsedMs + result.elapsedMs,
      });
    }
  }

  return Array.from(bucket.entries()).map(([tag, value]) => ({
    tag,
    count: value.count,
    averageElapsedMs: value.elapsedMs / value.count,
  }));
}
