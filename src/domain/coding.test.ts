import { describe, expect, it } from "vitest";
import { filterPythonTemplates, generatePythonChallenges, pythonRecipeQualityIssues, pythonTargetSurfaceIssues } from "./coding";
import type { GeneratedRecipe } from "./generator";

describe("generatePythonChallenges", () => {
  it("generates deterministic Python-only coding challenges", () => {
    const first = generatePythonChallenges(3, "standard-v1", "standard");
    const second = generatePythonChallenges(3, "standard-v1", "standard");
    const different = generatePythonChallenges(3, "standard-v2", "standard");

    expect(second).toEqual(first);
    expect(different.map((challenge) => challenge.targetText)).not.toEqual(first.map((challenge) => challenge.targetText));
    expect(first.every((challenge) => challenge.mode === "coding")).toBe(true);
    expect(first.every((challenge) => challenge.prompt.includes("Python"))).toBe(true);
    expect(first.every((challenge) => challenge.intendedShortcutPath.length > 0)).toBe(true);
    expect(first.every((challenge) => challenge.attentionRanges.length > 0)).toBe(true);
    expect(first.every((challenge) => challenge.estimatedCorrections === challenge.errors.length)).toBe(true);
  });

  it("filters Python templates by difficulty and preserves indentation/newlines", () => {
    const standard = generatePythonChallenges(4, "shape-standard", "standard");
    const advanced = generatePythonChallenges(4, "shape-advanced", "advanced");
    const multiline = generatePythonChallenges(4, "shape-multiline", "multiline");

    expect(filterPythonTemplates("multiline").length).toBeGreaterThan(0);
    expect(standard.every((challenge) => !challenge.targetText.includes("\n") && challenge.errors.length <= 3)).toBe(true);
    expect(advanced.some((challenge) => challenge.targetText.includes("\n") || challenge.errors.length > 1)).toBe(true);
    expect(multiline.every((challenge) => challenge.targetText.includes("\n"))).toBe(true);
    expect(multiline.every((challenge) => challenge.targetText.split("\n").length >= 2 && challenge.targetText.split("\n").length <= 4)).toBe(true);
    expect(multiline.every((challenge) => challenge.attentionRanges.every((range) => range.end <= challenge.targetText.length))).toBe(true);
  });

  it("filters Python practice by skill pack with deterministic fallback", () => {
    const focused = generatePythonChallenges(3, "focus-string", "standard", "string-cleanup");
    const fallback = generatePythonChallenges(3, "focus-string", "standard", "indentation");
    const defaultStandard = generatePythonChallenges(3, "focus-string", "standard");

    expect(focused).toEqual(generatePythonChallenges(3, "focus-string", "standard", "string-cleanup"));
    expect(focused.every((challenge) => challenge.skillPacks.includes("string-cleanup"))).toBe(true);
    expect(fallback.map((challenge) => challenge.skillPacks)).toEqual(defaultStandard.map((challenge) => challenge.skillPacks));
  });

  it("labels Python templates with coding-specific skill packs", () => {
    const skillPacks = new Set(
      ["standard", "advanced", "multiline"]
        .flatMap((difficulty) => filterPythonTemplates(difficulty as "standard" | "advanced" | "multiline"))
        .flatMap((template) => template.skillPacks),
    );

    expect(Array.from(skillPacks)).toEqual(expect.arrayContaining([
      "indentation",
      "rename",
      "boolean-cleanup",
      "argument-cleanup",
      "string-cleanup",
      "simple-refactor",
    ]));
  });

  it("keeps generated Python metadata complete across difficulties", () => {
    for (const difficulty of ["standard", "advanced", "multiline"] as const) {
      const generated = generatePythonChallenges(4, `metadata-${difficulty}`, difficulty);

      for (const challenge of generated) {
        expect(challenge.mode).toBe("coding");
        expect(challenge.skillPacks.length).toBeGreaterThan(0);
        expect(challenge.intendedShortcutPath.length).toBeGreaterThan(0);
        expect(challenge.estimatedCorrections).toBe(challenge.errors.length);
        expect(challenge.errors.every((error) => error.skillTags.length > 0)).toBe(true);
        expect(challenge.targetText).not.toBe(challenge.editableText);
        expect(pythonTargetSurfaceIssues(challenge.targetText, difficulty)).toEqual([]);
      }
    }
  });

  it("rejects awkward Python recipes before they reach gameplay", () => {
    const awkwardStandard = recipe({
      targetText: "x = 1",
      editableText: "x=1",
      difficulty: "standard",
      errors: [
        { type: "missing-space", skillTags: ["whitespace-correction"] },
        { type: "missing-character", skillTags: ["punctuation-insertion"] },
        { type: "wrong-word", skillTags: ["replacement"] },
        { type: "missing-word", skillTags: ["replacement"] },
      ],
    });
    const brokenBlock = recipe({
      targetText: "if ready\n    return value",
      editableText: "if ready return value",
      difficulty: "multiline",
    });
    const noShortcutPath = recipe({
      targetText: "count = 1",
      editableText: "count=1",
      difficulty: "standard",
      intendedShortcutPath: ["look at code"],
    });

    expect(pythonRecipeQualityIssues(awkwardStandard)).toEqual(expect.arrayContaining(["awkward-standard", "too-many-corrections"]));
    expect(pythonRecipeQualityIssues(brokenBlock)).toContain("invalid-block-shape");
    expect(pythonRecipeQualityIssues(noShortcutPath)).toContain("no-shortcut-advantage");
  });
});

function recipe(patch: Partial<GeneratedRecipe>): GeneratedRecipe {
  return {
    targetText: "count = 1",
    editableText: "count=1",
    difficulty: "standard",
    skillPacks: ["code-cleanup"],
    intendedShortcutPath: ["jump to assignment operator", "add spaces around equals"],
    attention: [{ text: " = ", reason: "operator spacing", skillTags: ["whitespace-correction"] }],
    errors: [{ type: "missing-space", skillTags: ["whitespace-correction"] }],
    ...patch,
  };
}
