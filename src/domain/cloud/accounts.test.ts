import { describe, expect, it } from "vitest";
import { defaultHandleForUser, isLeaderboardEligible, normalizeHandle, validateHandle } from "./accounts";
import type { TestResult } from "@/domain/types";

const result = {
  config: {
    mode: "target-match",
    difficulty: "standard",
    challengeCount: 3,
    mousePolicy: "keyboard-only",
  },
  mouseActions: 0,
  hintsUsed: 0,
  clipboardActions: 0,
} as TestResult;

describe("cloud account helpers", () => {
  it("normalizes and validates handles", () => {
    expect(normalizeHandle(" Cool User! ")).toBe("cool-user");
    expect(validateHandle("ok_user")).toBeNull();
    expect(validateHandle("u")).toContain("at least");
    expect(validateHandle("admin")).toContain("reserved");
  });

  it("creates stable public-default fallback handles", () => {
    expect(defaultHandleForUser("ABCDEF1234567890", "Name@Test.com")).toBe("name");
    expect(defaultHandleForUser("ABCDEF1234567890", "admin@example.com")).toBe("user-abcdef12");
  });

  it("only allows clean keyboard-only results onto leaderboards", () => {
    expect(isLeaderboardEligible(result, { leaderboardOptOut: false })).toBe(true);
    expect(isLeaderboardEligible({ ...result, hintsUsed: 1 }, { leaderboardOptOut: false })).toBe(false);
    expect(isLeaderboardEligible({ ...result, mouseActions: 1 }, { leaderboardOptOut: false })).toBe(false);
    expect(isLeaderboardEligible({ ...result, clipboardActions: 1 }, { leaderboardOptOut: false })).toBe(false);
    expect(isLeaderboardEligible({ ...result, config: { ...result.config, mousePolicy: "mouse-allowed" } }, { leaderboardOptOut: false })).toBe(false);
    expect(isLeaderboardEligible(result, { leaderboardOptOut: true })).toBe(false);
  });
});
