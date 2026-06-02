import { describe, expect, it } from "vitest";
import type { Challenge } from "./types";
import {
  activeSegmentIndex,
  completeActiveSegment,
  createSegments,
  updateActiveSegmentText,
} from "./segments";

const challenge = (id: string): Challenge => ({
  id,
  seed: id,
  mode: "target-match",
  prompt: "Match the target text.",
  targetText: `${id} target`,
  editableText: `${id} edit`,
  errors: [],
  difficulty: "standard",
  estimatedCorrections: 1,
});

describe("segments", () => {
  it("creates one active segment and keeps the rest pending", () => {
    const segments = createSegments([challenge("a"), challenge("b"), challenge("c")]);

    expect(segments.map((segment) => segment.status)).toEqual(["active", "pending", "pending"]);
    expect(activeSegmentIndex(segments)).toBe(0);
  });

  it("updates only the active segment text", () => {
    const segments = updateActiveSegmentText(createSegments([challenge("a"), challenge("b")]), "done");

    expect(segments[0].text).toBe("done");
    expect(segments[1].text).toBe("b edit");
  });

  it("locks the completed segment and reveals the next active segment", () => {
    const transition = completeActiveSegment(createSegments([
      challenge("a"),
      challenge("b"),
      challenge("c"),
    ]), "a target");

    expect(transition.complete).toBe(false);
    expect(transition.activeIndex).toBe(1);
    expect(transition.segments.map((segment) => segment.status)).toEqual(["complete", "active", "pending"]);
    expect(transition.segments[0].text).toBe("a target");
  });

  it("marks the run complete after the final active segment", () => {
    const first = completeActiveSegment(createSegments([challenge("a"), challenge("b")]), "a target");
    const second = completeActiveSegment(first.segments, "b target");

    expect(second.complete).toBe(true);
    expect(second.activeIndex).toBe(-1);
    expect(second.segments.map((segment) => segment.status)).toEqual(["complete", "complete"]);
  });
});
