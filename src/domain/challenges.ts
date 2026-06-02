import type { Challenge, ChallengeError, ChallengeErrorType, SkillTag } from "./types";

type TargetTemplate = {
  targetText: string;
  editableText: string;
  errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
};

const targetTemplates: TargetTemplate[] = [
  {
    targetText: "Keep the interface simple, but make the feedback immediate.",
    editableText: "keep the interface very simple but make the feedback immediate",
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Rename the variable, then remove the unused check.",
    editableText: "rename the variable then remove the unused check",
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "This function works, but the edge case is unclear.",
    editableText: "this function works but the edge  case is unclear",
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "double-space", skillTags: ["whitespace-correction"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "However, this is a strong idea, but don't overcomplicate it.",
    editableText: "however this is a very good idea but dont overcomplicate it",
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "wrong-word", skillTags: ["replacement"] },
      { type: "missing-apostrophe", skillTags: ["apostrophe-insertion"] },
    ],
  },
  {
    targetText: "Ship the small version first, then measure what users repeat.",
    editableText: "ship the small version first then measure what users  repeat",
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "double-space", skillTags: ["whitespace-correction"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Move the clause before the comma, and keep the sentence clear.",
    editableText: "Move the comma before the clause and keep the sentence clear",
    errors: [
      { type: "wrong-word-order", skillTags: ["cut-paste-reorder"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
];

export const seedPack = "standard-v1";

export function generateTargetChallenges(count: number, seed: string): Challenge[] {
  const start = seededIndex(seed, targetTemplates.length);

  return Array.from({ length: count }, (_, index) => {
    const template = targetTemplates[(start + index) % targetTemplates.length];
    return {
      id: `target-${seed}-${index + 1}`,
      seed: `${seed}:${index + 1}`,
      mode: "target-match",
      prompt: "Match the target text.",
      targetText: template.targetText,
      editableText: template.editableText,
      errors: buildErrors(template.errors, index),
      difficulty: "standard",
      estimatedCorrections: template.errors.length,
    };
  });
}

function buildErrors(
  errors: TargetTemplate["errors"],
  challengeIndex: number,
): ChallengeError[] {
  return errors.map((error, errorIndex) => ({
    id: `err-${challengeIndex + 1}-${errorIndex + 1}`,
    ...error,
  }));
}

function seededIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}
