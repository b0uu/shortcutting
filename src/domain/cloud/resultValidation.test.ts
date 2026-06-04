import { describe, expect, it } from "vitest";
import { generateTargetChallenges } from "@/domain/challenges";
import { summarizeResult } from "@/domain/results";
import type { ChallengeResult, TestConfig } from "@/domain/types";
import { sanitizedCloudResult, validateCloudResult } from "./resultValidation";

const config: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "windows-linux",
  mousePolicy: "keyboard-only",
  difficulty: "standard",
  soundEnabled: true,
  theme: "dark",
  customTheme: {
    background: "#1c1a17",
    panel: "#242118",
    card: "#2a271f",
    text: "#e8e4da",
    mutedText: "#9f9688",
    accent: "#d4693a",
    success: "#7db884",
    error: "#e07575",
    focus: "#d4693a",
  },
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack: "cloud-validation",
  practiceSkillPack: null,
};

describe("cloud result validation", () => {
  it("accepts exact generated results", () => {
    const result = buildResult();
    const validation = validateCloudResult(result);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it("rejects wrong final text", () => {
    const result = buildResult();
    result.challengeResults[0] = {
      ...result.challengeResults[0],
      finalText: `${result.challengeResults[0].finalText} nope`,
    };
    const validation = validateCloudResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain("final-text");
  });

  it("rejects elapsed time that does not match timestamps", () => {
    const result = {
      ...buildResult(),
      elapsedMs: 250,
      completedAt: new Date(4000).toISOString(),
    };
    const validation = validateCloudResult(result);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain("timestamp-time");
  });

  it("strips raw edit events before cloud persistence", () => {
    const result = {
      ...buildResult(),
      editEvents: [{ id: "e1", timestamp: 1, challengeId: "c1", type: "keydown" as const }],
      extraField: "do not store this",
    };
    const sanitized = sanitizedCloudResult(result);
    expect(sanitized.editEvents).toBeUndefined();
    expect("extraField" in sanitized).toBe(false);
  });
});

function buildResult() {
  const challenges = generateTargetChallenges(config.challengeCount, config.seedPack, { difficulty: config.difficulty });
  const parts: ChallengeResult[] = challenges.map((challenge) => ({
    challengeId: challenge.id,
    mode: challenge.mode,
    beforeText: challenge.editableText,
    targetText: challenge.targetText,
    finalText: challenge.targetText,
    elapsedMs: 1200,
    skillTags: challenge.errors.flatMap((error) => error.skillTags),
    skillPacks: challenge.skillPacks,
    estimatedCorrections: challenge.estimatedCorrections,
    hintsUsed: 0,
    mouseActions: 0,
    keystrokes: 12,
    clipboardActions: 0,
    undoCount: 0,
    redoCount: 0,
  }));
  return summarizeResult("result-cloud", config, new Date(0).toISOString(), new Date(4000).toISOString(), 4000, parts, true);
}
