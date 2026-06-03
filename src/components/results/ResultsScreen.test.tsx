import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { darkThemeColors } from "@/domain/themes";
import type { TestResult } from "@/domain/types";
import { ResultsScreen } from "./ResultsScreen";

vi.mock("html2canvas", () => ({
  default: vi.fn(),
}));

const result: TestResult = {
  id: "result-1",
  config: {
    mode: "target-match",
    challengeCount: 3,
    platformPreference: "auto",
    platform: "mac",
    mousePolicy: "keyboard-only",
    difficulty: "advanced",
    soundEnabled: true,
    theme: "dark",
    customTheme: darkThemeColors,
    codingLanguage: "python",
    smartPairs: true,
    reducedMotion: false,
    seedPack: "standard-v1",
  },
  startedAt: "2026-06-01T00:00:00.000Z",
  completedAt: "2026-06-01T00:00:02.000Z",
  elapsedMs: 2000,
  challengeResults: [{
    challengeId: "c1",
    mode: "target-match",
    beforeText: "fix this",
    targetText: "Fix this.",
    finalText: "Fix this.",
    elapsedMs: 2000,
    skillTags: ["capitalization"],
    skillPacks: ["punctuation-casing"],
    estimatedCorrections: 2,
    hintsUsed: 1,
    mouseActions: 0,
    keystrokes: 12,
    clipboardActions: 1,
    undoCount: 1,
    redoCount: 1,
  }],
  totalKeystrokes: 12,
  hintsUsed: 1,
  mouseActions: 0,
  clipboardActions: 1,
  undoCount: 1,
  redoCount: 1,
  editsPerMinute: 60,
  estimatedCorrectionCount: 2,
  skillTagSummary: { capitalization: 1 },
  skillPackSummary: { "punctuation-casing": 1 },
  hintSkillSummary: { capitalization: 1 },
  bestSkillCategory: { tag: "capitalization", count: 1, averageElapsedMs: 2000 },
  slowestSkillCategory: { tag: "capitalization", count: 1, averageElapsedMs: 2000 },
  nextPracticeSuggestion: {
    mode: "target-match",
    difficulty: "advanced",
    seedPack: "standard-v1",
    skillPack: "punctuation-casing",
    skillTag: "capitalization",
    label: "practice capitalization",
    rationale: "Based on hint usage: capitalization.",
  },
  isPersonalBest: true,
  shareChallengeId: "c1",
};

describe("ResultsScreen", () => {
  it("renders compact analytics and result actions", () => {
    render(<ResultsScreen result={result} themeColors={darkThemeColors} onPlayAgain={() => {}} onPracticeAgain={() => {}} />);

    expect(screen.getByRole("heading", { name: "00:02.0" })).toBeInTheDocument();
    expect(screen.getByText("keystrokes")).toBeInTheDocument();
    expect(screen.getByText("clipboard")).toBeInTheDocument();
    expect(screen.getByText("undo / redo")).toBeInTheDocument();
    expect(screen.getByText("edits / min")).toBeInTheDocument();
    expect(screen.getByText("2 estimated corrections")).toBeInTheDocument();
    expect(screen.getByText("best: capitalization")).toBeInTheDocument();
    expect(screen.getByText("hint focus: capitalization (1)")).toBeInTheDocument();
    expect(screen.getByText("practice capitalization")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /practice this again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download card/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play again/i })).toBeInTheDocument();
  });
});
