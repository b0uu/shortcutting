import { describe, expect, it } from "vitest";
import { buildDeletionHintTokens, buildDiffTokens, changedTargetCharacterIndexes, editDistance } from "./diff";

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

  it("does not cascade wrong characters after an extra editable space", () => {
    const tokens = buildDiffTokens("the edge  case", "the edge case");

    expect(tokens.map((token) => token.status)).toEqual([
      "same",
      "same",
      "same",
      "same",
      "same",
      "same",
      "same",
      "same",
      "same",
      "extra",
      "same",
      "same",
      "same",
      "same",
    ]);
    expect(tokens[9].visible).toBe("\u00b7");
  });

  it("marks inserted words as deletion hints without underlining the following matched word", () => {
    const tokens = buildDeletionHintTokens(
      "garden cold back light\ncold clear sharp plain able\nmarket middle light",
      "Garden cold back light.\ncold clear plain able.\nmarket middle light.",
    );
    const extraText = tokens
      .filter((token) => token.status === "extra")
      .map((token) => token.value)
      .join("");

    expect(extraText).toContain("sharp ");
    expect(extraText).not.toContain("plain");
  });

  it("tracks only target-side changes for attention shading", () => {
    const source = "this function works but the edge  case is unclear.";
    const target = "This function works, but the edge case is unclear.";

    expect(Array.from(changedTargetCharacterIndexes(source, target))).toEqual([0, 19]);
    expect(Array.from(changedTargetCharacterIndexes("jointhese", "join these"))).toEqual([4]);
  });

  it("computes edit distance", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});
