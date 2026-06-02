import { describe, expect, it } from "vitest";
import { filterTargetTemplates, generateTargetChallenges } from "./challenges";

describe("generateTargetChallenges", () => {
  it("is deterministic for the same seed", () => {
    const first = generateTargetChallenges(5, "standard-v1");
    const second = generateTargetChallenges(5, "standard-v1");
    expect(second).toEqual(first);
  });

  it("includes hidden error metadata and skill tags", () => {
    const [challenge] = generateTargetChallenges(1, "standard-v1");
    expect(challenge.errors.length).toBeGreaterThan(0);
    expect(challenge.errors[0].skillTags.length).toBeGreaterThan(0);
    expect(challenge.skillPacks.length).toBeGreaterThan(0);
    expect(challenge.intendedShortcutPath.length).toBeGreaterThan(0);
    expect(challenge.attentionRanges.length).toBeGreaterThan(0);
    expect(challenge.difficulty).toBe("standard");
  });

  it("generates target attention ranges that point inside the displayed target", () => {
    const generated = generateTargetChallenges(5, "standard-v1");

    for (const challenge of generated) {
      expect(challenge.intendedShortcutPath.length).toBeGreaterThan(0);
      expect(challenge.attentionRanges.length).toBeGreaterThan(0);
      for (const range of challenge.attentionRanges) {
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.end).toBeGreaterThan(range.start);
        expect(range.end).toBeLessThanOrEqual(challenge.targetText.length);
        expect(challenge.targetText.slice(range.start, range.end).trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("filters deterministic pools by difficulty and skill pack", () => {
    const advanced = generateTargetChallenges(2, "standard-v1", { difficulty: "advanced" });
    expect(advanced.every((challenge) => challenge.difficulty === "advanced")).toBe(true);

    const punctuationTemplates = filterTargetTemplates({ skillPack: "punctuation-casing" });
    expect(punctuationTemplates.length).toBeGreaterThan(0);
    expect(punctuationTemplates.every((template) => template.skillPacks.includes("punctuation-casing"))).toBe(true);
  });

  it("generates multi-line challenges with meaningful newlines", () => {
    const [challenge] = generateTargetChallenges(1, "standard-v1", { difficulty: "multiline" });
    expect(challenge.targetText).toContain("\n");
    expect(challenge.editableText).toContain("\n");
    expect(challenge.difficulty).toBe("multiline");
  });
});
