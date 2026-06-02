import { describe, expect, it } from "vitest";
import { darkThemeColors } from "./themes";
import type { ChallengeResult, TestConfig } from "./types";
import { chooseShareChallenge, personalBestKey, summarizeResult } from "./results";

const config: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "mac",
  mousePolicy: "keyboard-only",
  difficulty: "standard",
  soundEnabled: true,
  theme: "dark",
  customTheme: darkThemeColors,
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack: "standard-v1",
};

const baseResult: ChallengeResult = {
  challengeId: "a",
  mode: "target-match",
  beforeText: "abc",
  targetText: "abc",
  finalText: "abc",
  elapsedMs: 100,
  skillTags: ["replacement"],
  estimatedCorrections: 1,
  hintsUsed: 0,
  mouseActions: 0,
  keystrokes: 3,
  clipboardActions: 0,
  undoCount: 0,
  redoCount: 0,
};

describe("results", () => {
  it("segments personal bests by the full key", () => {
    expect(personalBestKey(config)).toBe("target-match|3|mac|keyboard-only|standard|standard-v1");
  });

  it("chooses the longest edit distance for share cards", () => {
    const chosen = chooseShareChallenge([
      baseResult,
      { ...baseResult, challengeId: "b", beforeText: "very wrong", targetText: "right" },
    ]);
    expect(chosen.challengeId).toBe("b");
  });

  it("aggregates result totals", () => {
    const summary = summarizeResult(
      "r1",
      config,
      "2026-06-01T00:00:00.000Z",
      "2026-06-01T00:01:00.000Z",
      1000,
      [
        { ...baseResult, clipboardActions: 1, undoCount: 1 },
        {
          ...baseResult,
          challengeId: "b",
          hintsUsed: 1,
          mouseActions: 2,
          clipboardActions: 2,
          redoCount: 1,
        },
      ],
      true,
    );
    expect(summary.totalKeystrokes).toBe(6);
    expect(summary.hintsUsed).toBe(1);
    expect(summary.mouseActions).toBe(2);
    expect(summary.clipboardActions).toBe(3);
    expect(summary.undoCount).toBe(1);
    expect(summary.redoCount).toBe(1);
    expect(summary.editsPerMinute).toBe(120);
    expect(summary.estimatedCorrectionCount).toBe(2);
    expect(summary.skillTagSummary.replacement).toBe(2);
    expect(summary.bestSkillCategory?.tag).toBe("replacement");
    expect(summary.slowestSkillCategory?.tag).toBe("replacement");
  });

  it("identifies faster and slower skill categories", () => {
    const summary = summarizeResult(
      "r1",
      config,
      "2026-06-01T00:00:00.000Z",
      "2026-06-01T00:01:00.000Z",
      10000,
      [
        { ...baseResult, skillTags: ["word-deletion"], elapsedMs: 8000 },
        { ...baseResult, challengeId: "b", skillTags: ["punctuation-insertion"], elapsedMs: 2000 },
      ],
      false,
    );

    expect(summary.bestSkillCategory?.tag).toBe("punctuation-insertion");
    expect(summary.slowestSkillCategory?.tag).toBe("word-deletion");
  });
});
