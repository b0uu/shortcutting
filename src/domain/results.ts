import type {
  ChallengeResult,
  PersonalBestKey,
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
