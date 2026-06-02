import { describe, expect, it } from "vitest";
import { generateTargetChallenges } from "./challenges";

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
  });
});
