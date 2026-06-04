import { generateTargetChallenges } from "@/domain/challenges";
import { generatePythonChallenges } from "@/domain/coding";
import { generateDrillChallenges } from "@/domain/drills";
import type { Challenge, TestConfig, TestResult } from "@/domain/types";

export type CloudValidationIssue = {
  code: string;
  message: string;
};

export type CloudValidationResult = {
  valid: boolean;
  issues: CloudValidationIssue[];
};

const maxRunMs = 30 * 60 * 1000;
const minRunMs = 250;

export function validateCloudResult(result: TestResult): CloudValidationResult {
  const issues: CloudValidationIssue[] = [];
  const generated = challengesForConfig(result.config);
  const partElapsedTotal = result.challengeResults.reduce((total, part) => total + part.elapsedMs, 0);
  const startedAtMs = Date.parse(result.startedAt);
  const completedAtMs = Date.parse(result.completedAt);

  if (result.challengeResults.length !== generated.length) {
    issues.push({
      code: "challenge-count",
      message: "Submitted part count does not match the generated run.",
    });
  }

  for (const [index, challenge] of generated.entries()) {
    const part = result.challengeResults[index];
    if (!part) continue;
    if (part.challengeId !== challenge.id) {
      issues.push({ code: "challenge-id", message: `Part ${index + 1} has the wrong challenge id.` });
    }
    if (part.beforeText !== challenge.editableText) {
      issues.push({ code: "editable-text", message: `Part ${index + 1} editable text does not match the generated challenge.` });
    }
    if (part.targetText !== challenge.targetText) {
      issues.push({ code: "target-text", message: `Part ${index + 1} target text does not match the generated challenge.` });
    }
    if (part.finalText !== challenge.targetText) {
      issues.push({ code: "final-text", message: `Part ${index + 1} final text does not match the target.` });
    }
    if (part.elapsedMs < 0 || part.elapsedMs > maxRunMs) {
      issues.push({ code: "part-time", message: `Part ${index + 1} has an implausible elapsed time.` });
    }
  }

  if (result.elapsedMs < minRunMs || result.elapsedMs > maxRunMs) {
    issues.push({ code: "run-time", message: "Run elapsed time is outside the accepted range." });
  }
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(completedAtMs) || completedAtMs < startedAtMs) {
    issues.push({ code: "timestamp", message: "Run timestamps are invalid." });
  } else if (Math.abs((completedAtMs - startedAtMs) - result.elapsedMs) > 2000) {
    issues.push({ code: "timestamp-time", message: "Run elapsed time does not match submitted timestamps." });
  }
  if (partElapsedTotal <= 0 || partElapsedTotal - result.elapsedMs > 1000) {
    issues.push({ code: "part-time-total", message: "Part timings are inconsistent with run elapsed time." });
  }

  if (result.challengeResults.some((part) => part.mouseActions < 0 || part.hintsUsed < 0 || part.clipboardActions < 0)) {
    issues.push({ code: "negative-actions", message: "Run action counts cannot be negative." });
  }

  const totalMouse = sum(result, "mouseActions");
  const totalHints = sum(result, "hintsUsed");
  const totalClipboard = sum(result, "clipboardActions");
  const totalKeys = sum(result, "keystrokes");
  if (totalMouse !== result.mouseActions || totalHints !== result.hintsUsed || totalClipboard !== result.clipboardActions || totalKeys !== result.totalKeystrokes) {
    issues.push({ code: "aggregate-mismatch", message: "Run summary counts do not match part counts." });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function sanitizedCloudResult(result: TestResult): TestResult {
  return {
    id: String(result.id).slice(0, 128),
    config: result.config,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    elapsedMs: result.elapsedMs,
    challengeResults: result.challengeResults.map((part) => ({
      challengeId: part.challengeId,
      mode: part.mode,
      beforeText: part.beforeText,
      targetText: part.targetText,
      finalText: part.finalText,
      elapsedMs: part.elapsedMs,
      skillTags: part.skillTags,
      skillPacks: part.skillPacks,
      estimatedCorrections: part.estimatedCorrections,
      hintsUsed: part.hintsUsed,
      mouseActions: part.mouseActions,
      keystrokes: part.keystrokes,
      clipboardActions: part.clipboardActions,
      undoCount: part.undoCount,
      redoCount: part.redoCount,
    })),
    totalKeystrokes: result.totalKeystrokes,
    hintsUsed: result.hintsUsed,
    mouseActions: result.mouseActions,
    clipboardActions: result.clipboardActions,
    undoCount: result.undoCount,
    redoCount: result.redoCount,
    editsPerMinute: result.editsPerMinute,
    estimatedCorrectionCount: result.estimatedCorrectionCount,
    skillTagSummary: result.skillTagSummary,
    skillPackSummary: result.skillPackSummary,
    hintSkillSummary: result.hintSkillSummary,
    bestSkillCategory: result.bestSkillCategory,
    slowestSkillCategory: result.slowestSkillCategory,
    nextPracticeSuggestion: result.nextPracticeSuggestion,
    isPersonalBest: result.isPersonalBest,
    shareChallengeId: result.shareChallengeId,
  };
}

function challengesForConfig(config: TestConfig): Challenge[] {
  if (config.mode === "drill") {
    return generateDrillChallenges(config.challengeCount, config.seedPack, config.practiceSkillPack ?? undefined);
  }
  if (config.mode === "coding") {
    return generatePythonChallenges(config.challengeCount, config.seedPack, config.difficulty, config.practiceSkillPack ?? undefined);
  }
  return generateTargetChallenges(config.challengeCount, config.seedPack, { difficulty: config.difficulty, skillPack: config.practiceSkillPack ?? undefined });
}

function sum(result: TestResult, key: "mouseActions" | "hintsUsed" | "clipboardActions" | "keystrokes"): number {
  return result.challengeResults.reduce((total, part) => total + part[key], 0);
}
