import { describe, expect, it } from "vitest";
import { filterDrillDefinitions, generateDrillChallenges, hintForDrill } from "./drills";
import { validateChallenge } from "./validation";

describe("drills", () => {
  it("generates a varied drill set with platform hints", () => {
    const drillCount = filterDrillDefinitions().length;
    const drills = generateDrillChallenges(drillCount, "standard-v1");
    const ids = drills.map((challenge) => challenge.drill?.id);
    expect(new Set(ids).size).toBe(drillCount);
    expect(ids).toEqual(expect.arrayContaining([
      "delete-previous-word",
      "delete-next-word",
      "move-previous-word",
      "move-next-word",
      "select-previous-word",
      "select-current-word",
      "select-line",
      "replace-current-word",
      "delete-selected-fragment",
      "insert-punctuation",
      "insert-period-and-stay",
    ]));
    const deleteDrill = drills.find((challenge) => challenge.drill?.id === "delete-previous-word");
    expect(deleteDrill).toBeTruthy();
    expect(hintForDrill(deleteDrill!, "mac")).toContain("Option");
    expect(hintForDrill(deleteDrill!, "windows-linux")).toContain("Ctrl");
    expect(drills.every((challenge) => challenge.intendedShortcutPath.length > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.attentionRanges.length > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.skillPacks.length > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.estimatedCorrections > 0)).toBe(true);
    expect(drills.every((challenge) => challenge.targetText.split(/\s+/).length >= 3)).toBe(true);
    expect(drills
      .filter((challenge) => challenge.drill?.id !== "delete-next-word")
      .every((challenge) => challenge.drill?.initialSelection?.start === challenge.editableText.length)).toBe(true);
    expect(drills
      .filter((challenge) => challenge.drill?.id !== "delete-next-word")
      .every((challenge) => challenge.drill?.initialSelection?.end === challenge.editableText.length)).toBe(true);
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
    const drills = generateDrillChallenges(filterDrillDefinitions().length, "standard-v1");
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

  it("uses self-contained prompts that name the object and outcome", () => {
    const drills = generateDrillChallenges(filterDrillDefinitions().length, "standard-v1");
    const promptById = new Map(drills.map((challenge) => [challenge.drill?.id, challenge.prompt]));

    expect(promptById.get("delete-previous-word")).toMatch(/^Delete the previous word: ".+"\.$/);
    expect(promptById.get("delete-next-word")).toMatch(/^Delete the next word: ".+"\.$/);
    expect(promptById.get("move-previous-word")).toMatch(/^Move to the start of \w+\.$/);
    expect(promptById.get("move-next-word")).toMatch(/^Move to the end of \w+\.$/);
    expect(promptById.get("move-character")).toMatch(/^Move the caret one character left, before the final letter in ".+"\.$/);
    expect(promptById.get("select-previous-word")).toMatch(/^Select the final word: ".+"\.$/);
    expect(promptById.get("select-current-word")).toMatch(/^Select ".+"\.$/);
    expect(promptById.get("select-line")).toMatch(/^Select the line: ".+"\.$/);
    expect(promptById.get("replace-current-word")).toMatch(/^Replace ".+" with ".+"\.$/);
    expect(promptById.get("delete-selected-fragment")).toMatch(/^Delete the selected fragment: ".+"\.$/);
    expect(promptById.get("insert-punctuation")).toMatch(/^Insert a comma after ".+"\.$/);
    expect(promptById.get("insert-period-and-stay")).toMatch(/^Insert a period after ".+"\.$/);
  });

  it("does not use ambiguous bare characters as the character movement target", () => {
    for (let index = 0; index < 20; index += 1) {
      const drill = generateDrillChallenges(filterDrillDefinitions().length, `move-character-${index}`)
        .find((challenge) => challenge.drill?.id === "move-character");
      expect(drill?.prompt).toMatch(/^Move the caret one character left, before the final letter in "\w+"\.$/);
      expect(drill?.prompt).not.toMatch(/^Move the caret (before|after) "\S"\.$/);
    }
  });

  it("does not ask for punctuation at the current right-edge caret position", () => {
    for (let index = 0; index < 20; index += 1) {
      const drill = generateDrillChallenges(filterDrillDefinitions().length, `period-position-${index}`)
        .find((challenge) => challenge.drill?.id === "insert-period-and-stay");
      const validation = drill?.drill?.validation;
      expect(validation?.type).toBe("text+cursor");
      if (validation?.type !== "text+cursor" || !drill?.drill?.initialSelection) continue;
      expect(validation.expectedIndex).toBeLessThan(validation.expectedText.length);
      expect(drill.drill.initialSelection.start).not.toBe(validation.expectedIndex - 1);
    }
  });

  it("keeps drill metadata complete for learning summaries", () => {
    const drills = generateDrillChallenges(filterDrillDefinitions().length, "standard-v1");

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
