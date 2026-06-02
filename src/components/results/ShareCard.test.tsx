import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { darkThemeColors } from "@/domain/themes";
import type { ChallengeResult, TestConfig, TestResult } from "@/domain/types";
import { ShareCard } from "./ShareCard";

const config: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "mac",
  mousePolicy: "keyboard-only",
  difficulty: "standard",
  soundEnabled: true,
  theme: "custom",
  customTheme: { ...darkThemeColors, accent: "#336699" },
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack: "standard-v1",
};

const challengeResult: ChallengeResult = {
  challengeId: "target-1",
  mode: "target-match",
  beforeText: "fix this",
  targetText: "Fix this.",
  finalText: "Fix this.",
  elapsedMs: 1000,
  skillTags: ["capitalization", "punctuation-insertion"],
  estimatedCorrections: 2,
  hintsUsed: 0,
  mouseActions: 0,
  keystrokes: 8,
  clipboardActions: 0,
  undoCount: 0,
  redoCount: 0,
};

const result: TestResult = {
  id: "result-1",
  config,
  startedAt: "2026-06-01T00:00:00.000Z",
  completedAt: "2026-06-01T00:00:01.000Z",
  elapsedMs: 1000,
  challengeResults: [challengeResult],
  totalKeystrokes: 8,
  hintsUsed: 0,
  mouseActions: 0,
  clipboardActions: 0,
  undoCount: 0,
  redoCount: 0,
  editsPerMinute: 120,
  estimatedCorrectionCount: 2,
  skillTagSummary: { capitalization: 1, "punctuation-insertion": 1 },
  bestSkillCategory: { tag: "capitalization", count: 1, averageElapsedMs: 1000 },
  slowestSkillCategory: { tag: "punctuation-insertion", count: 1, averageElapsedMs: 1000 },
  isPersonalBest: true,
  shareChallengeId: "target-1",
};

describe("ShareCard", () => {
  it("uses active theme variables for the share surface", () => {
    render(<ShareCard result={result} themeColors={config.customTheme} />);

    const card = screen.getByText("shortcutting").closest(".share-card") as HTMLElement;
    expect(card.style.getPropertyValue("--accent")).toBe("#336699");
    expect(card).toHaveAttribute("data-theme", "custom");
  });
});
