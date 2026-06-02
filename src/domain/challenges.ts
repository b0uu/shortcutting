import type { Challenge, ChallengeError, ChallengeErrorType, Difficulty, SkillPack, SkillTag } from "./types";

type TargetTemplate = {
  targetText: string;
  editableText: string;
  difficulty: Difficulty;
  skillPacks: SkillPack[];
  errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
};

const targetTemplates: TargetTemplate[] = [
  {
    targetText: "Keep the interface simple, but make the feedback immediate.",
    editableText: "keep the interface very simple but make the feedback immediate",
    difficulty: "standard",
    skillPacks: ["deletion-cleanup", "punctuation-casing"],
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
    difficulty: "standard",
    skillPacks: ["punctuation-casing", "code-cleanup"],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "This function works, but the edge case is unclear.",
    editableText: "this function works but the edge  case is unclear",
    difficulty: "standard",
    skillPacks: ["punctuation-casing", "deletion-cleanup"],
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
    difficulty: "advanced",
    skillPacks: ["deletion-cleanup", "punctuation-casing"],
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
    difficulty: "standard",
    skillPacks: ["punctuation-casing", "deletion-cleanup"],
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
    difficulty: "advanced",
    skillPacks: ["line-reshaping", "punctuation-casing"],
    errors: [
      { type: "wrong-word-order", skillTags: ["cut-paste-reorder"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Read the first sentence.\nThen trim the second line.",
    editableText: "read the first sentence\nThen trim the extra second line",
    difficulty: "multiline",
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Select the noisy phrase, then replace it with one clear word.",
    editableText: "Select the noisy complicated phrase then replace it with one clear word",
    difficulty: "advanced",
    skillPacks: ["selection-practice", "deletion-cleanup", "punctuation-casing"],
    errors: [
      { type: "extra-word", skillTags: ["selection", "word-deletion"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Move quickly.\nKeep the line breaks tidy.\nFinish clean.",
    editableText: "move quickly\nKeep the line breaks very tidy\nFinish clean",
    difficulty: "multiline",
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
];

export const seedPack = "standard-v1";

export type TargetChallengeOptions = {
  difficulty?: Difficulty;
  skillPack?: SkillPack;
};

export function generateTargetChallenges(count: number, seed: string, options: TargetChallengeOptions = {}): Challenge[] {
  const templates = filterTemplates(options);
  const start = seededIndex(seed, templates.length);

  return Array.from({ length: count }, (_, index) => {
    const template = templates[(start + index) % templates.length];
    return {
      id: `target-${seed}-${index + 1}`,
      seed: `${seed}:${index + 1}`,
      mode: "target-match",
      prompt: "Match the target text.",
      targetText: template.targetText,
      editableText: template.editableText,
      errors: buildErrors(template.errors, index),
      skillPacks: template.skillPacks,
      difficulty: template.difficulty,
      estimatedCorrections: template.errors.length,
    };
  });
}

export function filterTargetTemplates(options: TargetChallengeOptions = {}): TargetTemplate[] {
  return filterTemplates(options);
}

function filterTemplates(options: TargetChallengeOptions): TargetTemplate[] {
  const filtered = targetTemplates.filter((template) => {
    const difficultyMatches = !options.difficulty || template.difficulty === options.difficulty;
    const skillMatches = !options.skillPack || template.skillPacks.includes(options.skillPack);
    return difficultyMatches && skillMatches;
  });
  return filtered.length > 0 ? filtered : targetTemplates.filter((template) => template.difficulty === "standard");
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
