import { describe, expect, it } from "vitest";
import { filterDrillDefinitions, generateDrillChallenges, hintForDrill } from "./drills";
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
    expect(drills.every((challenge) => challenge.estimatedCorrections > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.targetText.split(" ").length >= 3)).toBe(true);
  });

  it("keeps drill order deterministic by seed", () => {
    const first = generateDrillChallenges(7, "alternate-a").map((challenge) => challenge.drill?.id);
    const second = generateDrillChallenges(7, "alternate-a").map((challenge) => challenge.drill?.id);
    const different = generateDrillChallenges(7, "alternate-b").map((challenge) => challenge.drill?.id);

    expect(first).toEqual(second);
    expect(first).not.toEqual(different);
  });

  it("filters drill practice by skill pack with deterministic fallback", () => {
    const focused = generateDrillChallenges(3, "focus-delete", "deletion-cleanup");
    const fallback = generateDrillChallenges(3, "focus-delete", "indentation");
    const defaultDrills = generateDrillChallenges(3, "focus-delete");

    expect(filterDrillDefinitions("deletion-cleanup").length).toBeGreaterThan(0);
    expect(focused).toEqual(generateDrillChallenges(3, "focus-delete", "deletion-cleanup"));
    expect(focused.every((challenge) => challenge.skillPacks.includes("deletion-cleanup"))).toBe(true);
    expect(fallback.map((challenge) => challenge.drill?.id)).toEqual(defaultDrills.map((challenge) => challenge.drill?.id));
  });

  it("validates every first-pass drill", () => {
    const drills = generateDrillChallenges(7, "standard-v1");
    for (const drill of drills) {
      const validation = drill.drill?.validation;
      expect(validation).toBeTruthy();
      if (!validation) continue;
      if (validation.type === "text") {
        expect(validateChallenge(drill, validation.expectedText, drill.drill?.initialSelection ?? { start: 0, end: 0 })).toBe(true);
      } else if (validation.type === "cursor") {
        expect(validateChallenge(drill, drill.editableText, { start: validation.expectedIndex, end: validation.expectedIndex })).toBe(true);
      } else if (validation.type === "selection") {
        expect(validateChallenge(drill, drill.editableText, { start: validation.expectedStart, end: validation.expectedEnd })).toBe(true);
      }
    }
  });

  it("keeps drill metadata complete for learning summaries", () => {
    const drills = generateDrillChallenges(7, "standard-v1");

    for (const drill of drills) {
      expect(drill.mode).toBe("drill");
      expect(drill.skillPacks.length).toBeGreaterThan(0);
      expect(drill.intendedShortcutPath.length).toBeGreaterThan(0);
      expect(drill.errors.every((error) => error.skillTags.length > 0)).toBe(true);
      expect(drill.drill?.hintByPlatform.mac).toBeTruthy();
      expect(drill.drill?.hintByPlatform["windows-linux"]).toBeTruthy();
    }
  });
});
