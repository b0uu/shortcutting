import { describe, expect, it } from "vitest";
import { generateDrillChallenges } from "./drills";
import type { Challenge } from "./types";
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

    drills.forEach((drill) => {
      const state = validDrillState(drill);
      expect(validateChallenge(drill, state.text, state.selection)).toBe(true);
    });
  });
});

function validDrillState(challenge: Challenge) {
  const validation = challenge.drill?.validation;
  if (!validation) throw new Error("Missing drill validation.");

  if (validation.type === "text") {
    return {
      text: validation.expectedText,
      selection: challenge.drill?.initialSelection ?? { start: 0, end: 0 },
    };
  }

  if (validation.type === "cursor") {
    return {
      text: challenge.editableText,
      selection: { start: validation.expectedIndex, end: validation.expectedIndex },
    };
  }

  if (validation.type === "selection") {
    return {
      text: challenge.editableText,
      selection: { start: validation.expectedStart, end: validation.expectedEnd },
    };
  }

  return {
    text: validation.expectedText,
    selection: { start: validation.expectedIndex, end: validation.expectedIndex },
  };
}
