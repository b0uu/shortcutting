import { describe, expect, it } from "vitest";
import { chooseVariedFactories, generateWithRetry, qualityIssues, type GeneratedRecipe, type VarietyFactoryMeta } from "./generator";

const validRecipe: GeneratedRecipe = {
  targetText: "clear soft green.",
  editableText: "clear soft green",
  difficulty: "standard",
  skillPacks: ["punctuation-casing"],
  intendedShortcutPath: ["jump to end", "add period"],
  attention: [{ text: "green.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] }],
  errors: [{ type: "missing-period", skillTags: ["punctuation-insertion"] }],
};

describe("generator quality gates", () => {
  it("rejects invalid generated recipes", () => {
    expect(qualityIssues({
      ...validRecipe,
      targetText: "same",
      editableText: "same",
      attention: [],
      errors: [],
    })).toEqual(expect.arrayContaining(["same-text", "missing-metadata", "missing-attention-anchor"]));
  });

  it("retries deterministically and falls back when no valid recipe appears", () => {
    const attempts: number[] = [];
    const result = generateWithRetry(
      "retry-seed",
      (_rng, attempt) => {
        attempts.push(attempt);
        return attempt === 2 ? validRecipe : { ...validRecipe, targetText: "same", editableText: "same" };
      },
      () => ({ ...validRecipe, targetText: "fallback.", editableText: "fallback" }),
    );

    expect(attempts).toEqual([0, 1, 2]);
    expect(result).toEqual(validRecipe);

    const fallback = generateWithRetry(
      "fallback-seed",
      () => ({ ...validRecipe, targetText: "same", editableText: "same" }),
      () => ({ ...validRecipe, targetText: "fallback.", editableText: "fallback" }),
      2,
    );
    expect(fallback.targetText).toBe("fallback.");
  });

  it("chooses deterministic varied factories for a run rhythm", () => {
    const factories: VarietyFactoryMeta[] = [
      factory("case", "case-punctuation", "punctuation-insertion", "punctuation", 1),
      factory("delete", "delete-word", "word-deletion", "delete-word", 1),
      factory("space", "spacing", "whitespace-correction", "spacing", 2),
      factory("replace", "replace", "replacement", "replace", 2),
      factory("reorder", "reorder", "cut-paste-reorder", "reorder", 3),
    ];

    const first = chooseVariedFactories(factories, 4, "variety-a");
    const second = chooseVariedFactories(factories, 4, "variety-a");
    const different = chooseVariedFactories(factories, 4, "variety-b");

    expect(second.map((item) => item.id)).toEqual(first.map((item) => item.id));
    expect(different.map((item) => item.id)).not.toEqual(first.map((item) => item.id));
    for (let index = 1; index < first.length; index += 1) {
      expect(first[index].id).not.toBe(first[index - 1].id);
      expect(first[index].primarySkill).not.toBe(first[index - 1].primarySkill);
      expect(first[index].shortcutFamily).not.toBe(first[index - 1].shortcutFamily);
    }
  });
});

function factory(
  id: string,
  shape: VarietyFactoryMeta["shape"],
  primarySkill: VarietyFactoryMeta["primarySkill"],
  shortcutFamily: string,
  density: number,
): VarietyFactoryMeta {
  return {
    id,
    shape,
    primarySkill,
    shortcutFamily,
    density,
    visualShape: density >= 3 ? "multiline" : "short-line",
    weight: 1,
  };
}
