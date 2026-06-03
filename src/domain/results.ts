import type {
  ChallengeResult,
  EditEvent,
  PersonalBestKey,
  PracticeSuggestion,
  SkillCategorySummary,
  SkillPack,
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
  editEvents: EditEvent[] = [],
): TestResult {
  const shareChallenge = chooseShareChallenge(challengeResults);
  return {
    id,
    config,
    startedAt,
    completedAt,
    elapsedMs,
    challengeResults,
    editEvents,
    totalKeystrokes: sum(challengeResults, "keystrokes"),
    hintsUsed: sum(challengeResults, "hintsUsed"),
    mouseActions: sum(challengeResults, "mouseActions"),
    clipboardActions: sum(challengeResults, "clipboardActions"),
    undoCount: sum(challengeResults, "undoCount"),
    redoCount: sum(challengeResults, "redoCount"),
    editsPerMinute: editsPerMinute(challengeResults, elapsedMs),
    estimatedCorrectionCount: sum(challengeResults, "estimatedCorrections"),
    skillTagSummary: skillTagSummary(challengeResults),
    skillPackSummary: skillPackSummary(challengeResults),
    hintSkillSummary: hintSkillSummary(challengeResults),
    bestSkillCategory: bestSkillCategory(challengeResults),
    slowestSkillCategory: slowestSkillCategory(challengeResults),
    nextPracticeSuggestion: nextPracticeSuggestion(config, challengeResults),
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

export function skillPackSummary(results: ChallengeResult[]): Partial<Record<SkillPack, number>> {
  return results.reduce((summary, result) => {
    for (const pack of result.skillPacks) {
      summary[pack] = (summary[pack] ?? 0) + 1;
    }
    return summary;
  }, {} as Partial<Record<SkillPack, number>>);
}

export function hintSkillSummary(results: ChallengeResult[]): Partial<Record<SkillTag, number>> {
  return results.reduce((summary, result) => {
    if (result.hintsUsed <= 0) return summary;
    for (const tag of result.skillTags) {
      summary[tag] = (summary[tag] ?? 0) + result.hintsUsed;
    }
    return summary;
  }, {} as Partial<Record<SkillTag, number>>);
}

export function nextPracticeSuggestion(config: TestConfig, results: ChallengeResult[]): PracticeSuggestion {
  const hintedTag = topEntry(hintSkillSummary(results))?.[0] ?? null;
  const slowTag = slowestSkillCategory(results)?.tag ?? null;
  const topTag = topEntry(skillTagSummary(results))?.[0] ?? null;
  const skillTag = hintedTag ?? slowTag ?? topTag;
  const relatedResults = skillTag
    ? results.filter((result) => result.skillTags.includes(skillTag))
    : results;
  const skillPack = topEntry(skillPackSummary(relatedResults))?.[0] ?? topEntry(skillPackSummary(results))?.[0] ?? null;

  if (!skillTag) {
    return {
      mode: config.mode,
      difficulty: config.difficulty,
      seedPack: config.seedPack,
      skillPack,
      skillTag,
      label: "practice this run again",
      rationale: "Repeat this setup to build consistency.",
    };
  }

  const source = hintedTag ? "hint usage" : slowTag === skillTag ? "your slowest category" : "your most common edit";
  return {
    mode: config.mode,
    difficulty: config.difficulty,
    seedPack: config.seedPack,
    skillPack,
    skillTag,
    label: `practice ${formatSkill(skillTag)}`,
    rationale: `Based on ${source}: ${formatSkill(skillTag)}.`,
  };
}

function bestSkillCategory(results: ChallengeResult[]): SkillCategorySummary | null {
  const categories = skillCategorySummaries(results);
  if (categories.length === 0) return null;
  return categories.reduce((best, current) => (
    current.averageElapsedMs < best.averageElapsedMs ? current : best
  ));
}

function topEntry<T extends string>(summary: Partial<Record<T, number>>): [T, number] | null {
  const entries = Object.entries(summary) as Array<[T, number]>;
  if (entries.length === 0) return null;
  return entries.reduce((best, current) => (current[1] > best[1] ? current : best));
}

function formatSkill(tag: SkillTag): string {
  return tag.replaceAll("-", " ");
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
