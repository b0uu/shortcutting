import { describe, expect, it } from "vitest";
import { buildDiffTokens, editDistance } from "./diff";

describe("diff helpers", () => {
  it("marks same, wrong, missing, and extra characters", () => {
    expect(buildDiffTokens("abc", "abc").map((token) => token.status)).toEqual(["same", "same", "same"]);
    expect(buildDiffTokens("abc", "axc")[1].status).toBe("wrong");
    expect(buildDiffTokens("ab", "abc")[2].status).toBe("missing");
    expect(buildDiffTokens("abc", "ab")[2].status).toBe("extra");
  });

  it("uses visible markers for invisible differences", () => {
    expect(buildDiffTokens("a ", "ab")[1].visible).toBe("\u00b7");
    expect(buildDiffTokens("a\n", "ab")[1].visible).toBe("\u21b5");
    expect(buildDiffTokens("a", "ab")[1].visible).toBe("\u2227");
  });

  it("computes edit distance", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});
