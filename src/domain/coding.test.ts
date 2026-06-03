import { describe, expect, it } from "vitest";
import { filterPythonTemplates, generatePythonChallenges } from "./coding";

describe("generatePythonChallenges", () => {
  it("generates deterministic Python-only coding challenges", () => {
    const first = generatePythonChallenges(3, "standard-v1", "standard");
    const second = generatePythonChallenges(3, "standard-v1", "standard");

    expect(second).toEqual(first);
    expect(first.every((challenge) => challenge.mode === "coding")).toBe(true);
    expect(first.every((challenge) => challenge.prompt.includes("Python"))).toBe(true);
    expect(first.every((challenge) => challenge.intendedShortcutPath.length > 0)).toBe(true);
    expect(first.every((challenge) => challenge.attentionRanges.length > 0)).toBe(true);
    expect(first.every((challenge) => challenge.estimatedCorrections === challenge.errors.length)).toBe(true);
  });

  it("filters Python templates by difficulty and preserves indentation/newlines", () => {
    const multiline = generatePythonChallenges(1, "standard-v1", "multiline");

    expect(filterPythonTemplates("multiline").length).toBeGreaterThan(0);
    expect(multiline[0].targetText).toContain("\n");
    expect(multiline[0].difficulty).toBe("multiline");
    expect(multiline[0].attentionRanges.every((range) => range.end <= multiline[0].targetText.length)).toBe(true);
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
      }
    }
  });
});
