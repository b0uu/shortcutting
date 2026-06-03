import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import html2canvas from "html2canvas";
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
  editEvents: [
    { id: "e1", timestamp: 1, challengeId: "c1", type: "keydown", key: "Meta" },
    { id: "e2", timestamp: 2, challengeId: "c1", type: "keydown", key: "a" },
    { id: "e3", timestamp: 3, challengeId: "c1", type: "keydown", key: "Backspace" },
  ],
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
    expect(screen.getByText("corrections")).toBeInTheDocument();
    expect(screen.getByText("hints")).toBeInTheDocument();
    expect(screen.getByText("edits / min")).toBeInTheDocument();
    expect(screen.getByLabelText("keystroke replay")).toBeInTheDocument();
    expect(screen.getByLabelText("simulated keyboard")).toBeInTheDocument();
    expect(screen.getByText("2 estimated corrections")).toBeInTheDocument();
    expect(screen.getByText("best: capitalization")).toBeInTheDocument();
    expect(screen.getByText("hint focus: capitalization (1)")).toBeInTheDocument();
    expect(screen.queryByLabelText("next practice suggestion")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /practice this again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share card/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play again/i })).toBeInTheDocument();
  });

  it("renders a share card screenshot preview before copy or download actions", async () => {
    vi.mocked(html2canvas).mockResolvedValue({
      toDataURL: () => "data:image/png;base64,preview",
      toBlob: (callback: BlobCallback) => callback(new Blob(["preview"], { type: "image/png" })),
    } as HTMLCanvasElement);

    render(<ResultsScreen result={result} themeColors={darkThemeColors} onPlayAgain={() => {}} onPracticeAgain={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /share card/i }));

    await waitFor(() => expect(screen.getByLabelText("share card preview")).toBeInTheDocument());
    expect(screen.getByAltText("Generated share card screenshot")).toHaveAttribute("src", "data:image/png;base64,preview");
    expect(screen.getByRole("button", { name: /copy image/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^download$/i })).toBeInTheDocument();
  });
});
