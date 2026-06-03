import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { darkThemeColors } from "@/domain/themes";
import type { TestResult } from "@/domain/types";
import { LocalResultLogger } from "@/storage/localResultLogger";
import { HistoryPanel } from "./HistoryPanel";

const baseResult: TestResult = {
  id: "result-1",
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
  completedAt: "2026-06-01T00:00:01.000Z",
  elapsedMs: 1000,
  challengeResults: [{
    challengeId: "c1",
    mode: "target-match",
    beforeText: "fix this",
    targetText: "Fix this.",
    finalText: "Fix this.",
    elapsedMs: 1000,
    skillTags: ["capitalization"],
    skillPacks: ["punctuation-casing"],
    estimatedCorrections: 1,
    hintsUsed: 0,
    mouseActions: 0,
    keystrokes: 8,
    clipboardActions: 0,
    undoCount: 0,
    redoCount: 0,
  }],
  totalKeystrokes: 8,
  hintsUsed: 0,
  mouseActions: 0,
  clipboardActions: 0,
  undoCount: 0,
  redoCount: 0,
  editsPerMinute: 60,
  estimatedCorrectionCount: 1,
  skillTagSummary: { capitalization: 1 },
  skillPackSummary: { "punctuation-casing": 1 },
  hintSkillSummary: {},
  bestSkillCategory: { tag: "capitalization", count: 1, averageElapsedMs: 1000 },
  slowestSkillCategory: { tag: "capitalization", count: 1, averageElapsedMs: 1000 },
  nextPracticeSuggestion: {
    mode: "target-match",
    difficulty: "standard",
    seedPack: "standard-v1",
    skillPack: "punctuation-casing",
    skillTag: "capitalization",
    label: "practice capitalization",
    rationale: "Based on your most common edit: capitalization.",
  },
  isPersonalBest: true,
  shareChallengeId: "c1",
};

describe("HistoryPanel", () => {
  it("renders local history, filters runs, and clears with in-app confirmation", async () => {
    window.localStorage.clear();
    const logger = new LocalResultLogger();
    await logger.saveResult(baseResult);
    await logger.saveResult({
      ...baseResult,
      id: "drill-result",
      config: { ...baseResult.config, mode: "drill" },
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);
    render(<HistoryPanel open logger={logger} onClose={() => {}} />);

    await screen.findByText(/2 recent runs/i);
    expect(screen.getByLabelText("personal bests")).toHaveTextContent("target match");
    expect(screen.getByText("Fix this.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "show share card" }));
    expect(screen.getByText(/challenge before \/ after/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "target" }));
    await waitFor(() => expect(screen.getByText(/1 recent runs/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "clear history" }));
    expect(screen.getByRole("button", { name: "confirm clear history" })).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "confirm clear history" }));
    await waitFor(() => expect(screen.getByText(/no local runs yet/i)).toBeInTheDocument());
    expect(await logger.getResults()).toEqual([]);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
