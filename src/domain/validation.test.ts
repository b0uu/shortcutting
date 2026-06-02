import { describe, expect, it } from "vitest";
import { generateDrillChallenges } from "./drills";
import { isExactMatch, validateChallenge } from "./validation";

describe("validation", () => {
  it("uses strict equality and keeps whitespace significant", () => {
    expect(isExactMatch("a  b", "a b")).toBe(false);
    expect(isExactMatch("a b ", "a b")).toBe(false);
    expect(isExactMatch("a b\n", "a b")).toBe(false);
    expect(isExactMatch("a\nb", "a b")).toBe(false);
    expect(isExactMatch("a b", "a b")).toBe(true);
  });

  it("validates drill text, cursor, and selection conditions", () => {
    const drills = generateDrillChallenges(7, "standard-v1");

    expect(validateChallenge(drills[0], "Keep the final ", { start: 15, end: 15 })).toBe(true);
    expect(validateChallenge(drills[2], drills[2].editableText, { start: 10, end: 10 })).toBe(true);
    expect(validateChallenge(drills[4], drills[4].editableText, { start: 12, end: 16 })).toBe(true);
  });
});
