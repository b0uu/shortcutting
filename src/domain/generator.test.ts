import { describe, expect, it } from "vitest";
import { generateWithRetry, qualityIssues, type GeneratedRecipe } from "./generator";

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
});
