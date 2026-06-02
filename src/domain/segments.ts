import type { Challenge } from "./types";

export type SegmentStatus = "pending" | "active" | "complete";

export type ChallengeSegment = {
  challenge: Challenge;
  text: string;
  status: SegmentStatus;
};

export function createSegments(challenges: Challenge[]): ChallengeSegment[] {
  return challenges.map((challenge, index) => ({
    challenge,
    text: challenge.editableText,
    status: index === 0 ? "active" : "pending",
  }));
}

export function activeSegmentIndex(segments: ChallengeSegment[]): number {
  return segments.findIndex((segment) => segment.status === "active");
}

export function updateActiveSegmentText(
  segments: ChallengeSegment[],
  text: string,
): ChallengeSegment[] {
  const activeIndex = activeSegmentIndex(segments);
  if (activeIndex === -1) return segments;

  return segments.map((segment, index) => (
    index === activeIndex ? { ...segment, text } : segment
  ));
}

export function completeActiveSegment(
  segments: ChallengeSegment[],
  finalText: string,
): { segments: ChallengeSegment[]; activeIndex: number; complete: boolean } {
  const completedIndex = activeSegmentIndex(segments);
  if (completedIndex === -1) {
    return { segments, activeIndex: -1, complete: true };
  }

  const nextActiveIndex = segments.findIndex((segment, index) => (
    index > completedIndex && segment.status === "pending"
  ));
  const nextSegments = segments.map((segment, index) => {
    if (index === completedIndex) {
      return { ...segment, text: finalText, status: "complete" as const };
    }
    if (index === nextActiveIndex) {
      return { ...segment, status: "active" as const };
    }
    return segment;
  });

  return {
    segments: nextSegments,
    activeIndex: nextActiveIndex,
    complete: nextActiveIndex === -1,
  };
}
