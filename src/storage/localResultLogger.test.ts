import { beforeEach, describe, expect, it } from "vitest";
import { darkThemeColors } from "@/domain/themes";
import { LocalResultLogger } from "./localResultLogger";
import type { TestResult } from "@/domain/types";

const result: TestResult = {
  id: "r1",
  config: {
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
  },
  startedAt: "2026-06-01T00:00:00.000Z",
  completedAt: "2026-06-01T00:01:00.000Z",
  elapsedMs: 1000,
  challengeResults: [
    {
      challengeId: "c1",
      mode: "target-match",
      beforeText: "a",
      targetText: "b",
      finalText: "b",
      elapsedMs: 1000,
      skillTags: ["replacement"],
      estimatedCorrections: 1,
      hintsUsed: 0,
      mouseActions: 0,
      keystrokes: 1,
      clipboardActions: 0,
      undoCount: 0,
      redoCount: 0,
    },
  ],
  totalKeystrokes: 1,
  hintsUsed: 0,
  mouseActions: 0,
  clipboardActions: 0,
  undoCount: 0,
  redoCount: 0,
  editsPerMinute: 60,
  estimatedCorrectionCount: 1,
  skillTagSummary: { replacement: 1 },
  bestSkillCategory: { tag: "replacement", count: 1, averageElapsedMs: 1000 },
  slowestSkillCategory: { tag: "replacement", count: 1, averageElapsedMs: 1000 },
  isPersonalBest: true,
  shareChallengeId: "c1",
};

describe("LocalResultLogger", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores results and personal bests locally", async () => {
    const logger = new LocalResultLogger();
    await logger.saveResult(result);
    expect(await logger.getResults()).toHaveLength(1);
    expect(Object.keys(await logger.getPersonalBests())).toHaveLength(1);
  });

  it("filters local history by mode and difficulty", async () => {
    const logger = new LocalResultLogger();
    await logger.saveResult(result);
    await logger.saveResult({
      ...result,
      id: "advanced",
      config: { ...result.config, difficulty: "standard", mode: "drill" },
    });

    expect(await logger.getHistory({ mode: "target-match" })).toHaveLength(1);
    expect(await logger.getHistory({ mode: "drill" })).toHaveLength(1);
    expect(await logger.getHistory({ difficulty: "standard" })).toHaveLength(2);
  });

  it("does not replace a faster personal best with a slower result", async () => {
    const logger = new LocalResultLogger();
    await logger.saveResult(result);
    await logger.saveResult({ ...result, id: "r2", elapsedMs: 2000 });
    const best = Object.values(await logger.getPersonalBests())[0];
    expect(best.elapsedMs).toBe(1000);
  });

  it("keeps personal best buckets separate by mode, count, and mouse policy", async () => {
    const logger = new LocalResultLogger();
    await logger.saveResult(result);
    await logger.saveResult({
      ...result,
      id: "mouse",
      config: { ...result.config, mousePolicy: "mouse-allowed" },
      elapsedMs: 2000,
    });
    await logger.saveResult({
      ...result,
      id: "drill",
      config: { ...result.config, mode: "drill" },
      elapsedMs: 3000,
    });
    await logger.saveResult({
      ...result,
      id: "four",
      config: { ...result.config, challengeCount: 4 },
      elapsedMs: 4000,
    });
    await logger.saveResult({
      ...result,
      id: "advanced",
      config: { ...result.config, difficulty: "advanced" },
      elapsedMs: 5000,
    });

    const bests = await logger.getPersonalBests();
    expect(Object.keys(bests)).toHaveLength(5);
    expect(bests["target-match|3|mac|keyboard-only|standard|standard-v1"].elapsedMs).toBe(1000);
    expect(bests["target-match|3|mac|mouse-allowed|standard|standard-v1"].elapsedMs).toBe(2000);
    expect(bests["drill|3|mac|keyboard-only|standard|standard-v1"].elapsedMs).toBe(3000);
    expect(bests["target-match|4|mac|keyboard-only|standard|standard-v1"].elapsedMs).toBe(4000);
    expect(bests["target-match|3|mac|keyboard-only|advanced|standard-v1"].elapsedMs).toBe(5000);
  });

  it("replaces a personal best with a faster result and caps stored results", async () => {
    const logger = new LocalResultLogger();
    for (let index = 0; index < 55; index += 1) {
      await logger.saveResult({ ...result, id: `r${index}`, elapsedMs: 2000 - index });
    }
    expect(await logger.getResults()).toHaveLength(50);
    const best = Object.values(await logger.getPersonalBests())[0];
    expect(best.elapsedMs).toBe(1946);
  });

  it("falls back safely when stored JSON is corrupt", async () => {
    window.localStorage.setItem("shortcutting:results", "{nope");
    const logger = new LocalResultLogger();
    expect(await logger.getResults()).toEqual([]);
  });
});
