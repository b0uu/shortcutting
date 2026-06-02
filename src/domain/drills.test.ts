import { describe, expect, it } from "vitest";
import { generateDrillChallenges, hintForDrill } from "./drills";
import { validateChallenge } from "./validation";

describe("drills", () => {
  it("generates the full MVP drill set with platform hints", () => {
    const drills = generateDrillChallenges(7, "standard-v1");
    expect(drills.map((challenge) => challenge.drill?.id)).toEqual([
      "delete-previous-word",
      "delete-next-word",
      "move-previous-word",
      "move-next-word",
      "select-previous-word",
      "replace-current-word",
      "insert-punctuation",
    ]);
    expect(hintForDrill(drills[0], "mac")).toContain("Option");
    expect(hintForDrill(drills[0], "windows-linux")).toContain("Ctrl");
    expect(drills.every((challenge) => challenge.intendedShortcutPath.length > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.attentionRanges.length > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.skillPacks.length > 0)).toBe(true);
  });

  it("keeps drill order deterministic by seed", () => {
    const first = generateDrillChallenges(7, "alternate-a").map((challenge) => challenge.drill?.id);
    const second = generateDrillChallenges(7, "alternate-a").map((challenge) => challenge.drill?.id);
    const different = generateDrillChallenges(7, "alternate-b").map((challenge) => challenge.drill?.id);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
  });

  it("validates every first-pass drill", () => {
    const drills = generateDrillChallenges(7, "standard-v1");
    expect(validateChallenge(drills[0], "Keep the final ", { start: 15, end: 15 })).toBe(true);
    expect(validateChallenge(drills[1], "Remove copy now", { start: 7, end: 7 })).toBe(true);
    expect(validateChallenge(drills[2], drills[2].editableText, { start: 10, end: 10 })).toBe(true);
    expect(validateChallenge(drills[3], drills[3].editableText, { start: 5, end: 5 })).toBe(true);
    expect(validateChallenge(drills[4], drills[4].editableText, { start: 12, end: 16 })).toBe(true);
    expect(validateChallenge(drills[5], "Use a clear label.", { start: 6, end: 11 })).toBe(true);
    expect(validateChallenge(drills[6], "Pause here, then continue.", { start: 10, end: 10 })).toBe(true);
  });
});
