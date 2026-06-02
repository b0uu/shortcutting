import type { Challenge, ChallengeError, ChallengeErrorType, Difficulty, SkillPack, SkillTag } from "./types";

type TargetTemplate = {
  targetText: string;
  editableText: string;
  difficulty: Difficulty;
  skillPacks: SkillPack[];
  intendedShortcutPath: string[];
  attention: Array<{ text: string; reason: string; skillTags: SkillTag[] }>;
  errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
};

const targetTemplates: TargetTemplate[] = [
  {
    targetText: "Keep the interface simple, but make the feedback immediate.",
    editableText: "keep the interface very simple but make the feedback immediate",
    difficulty: "standard",
    skillPacks: ["deletion-cleanup", "punctuation-casing"],
    intendedShortcutPath: [
      "jump to sentence start",
      "capitalize first letter",
      "delete previous word near simple",
      "jump to clause break",
      "insert comma and period",
    ],
    attention: [
      { text: "Keep", reason: "capitalization target", skillTags: ["capitalization"] },
      { text: "simple, but", reason: "delete extra word and add comma", skillTags: ["word-deletion", "punctuation-insertion"] },
      { text: "immediate.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
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
    intendedShortcutPath: [
      "jump to sentence start",
      "capitalize first letter",
      "jump to then",
      "insert comma",
      "jump to end and add period",
    ],
    attention: [
      { text: "Rename", reason: "capitalization target", skillTags: ["capitalization"] },
      { text: "variable, then", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "check.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
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
    intendedShortcutPath: [
      "jump to start and capitalize",
      "jump to works",
      "insert comma",
      "jump to double space",
      "delete one space",
      "jump to end and add period",
    ],
    attention: [
      { text: "This", reason: "capitalization target", skillTags: ["capitalization"] },
      { text: "works, but", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "edge case", reason: "spacing cleanup area", skillTags: ["whitespace-correction"] },
    ],
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
    intendedShortcutPath: [
      "jump to start and capitalize",
      "jump by words to very",
      "delete previous or next word",
      "select good and replace with strong",
      "jump punctuation points",
      "insert comma and apostrophe",
    ],
    attention: [
      { text: "However,", reason: "capitalization and comma", skillTags: ["capitalization", "punctuation-insertion"] },
      { text: "strong", reason: "replacement target", skillTags: ["replacement"] },
      { text: "don't", reason: "apostrophe target", skillTags: ["apostrophe-insertion"] },
    ],
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
    intendedShortcutPath: [
      "jump to start and capitalize",
      "jump to first",
      "insert comma after first",
      "jump to double space",
      "delete one space",
      "jump to end and add period",
    ],
    attention: [
      { text: "Ship", reason: "capitalization target", skillTags: ["capitalization"] },
      { text: "first, then", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "users repeat.", reason: "spacing and final punctuation", skillTags: ["whitespace-correction", "punctuation-insertion"] },
    ],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "double-space", skillTags: ["whitespace-correction"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Trim the extra word, then stop.",
    editableText: "trim the extra noisy word then stop",
    difficulty: "standard",
    skillPacks: ["deletion-cleanup", "punctuation-casing", "word-movement"],
    intendedShortcutPath: [
      "jump to sentence start",
      "capitalize first letter",
      "jump by words to noisy",
      "delete one word",
      "jump to then and add comma",
      "jump to end and add period",
    ],
    attention: [
      { text: "Trim", reason: "capitalization target", skillTags: ["capitalization"] },
      { text: "extra word, then", reason: "delete noisy and add comma", skillTags: ["word-deletion", "punctuation-insertion"] },
      { text: "stop.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Use clear labels.",
    editableText: "Use messy labels",
    difficulty: "standard",
    skillPacks: ["selection-practice", "deletion-cleanup"],
    intendedShortcutPath: [
      "select current word messy",
      "replace selection with clear",
      "jump to end and add period",
    ],
    attention: [
      { text: "clear", reason: "replacement target", skillTags: ["selection", "replacement"] },
      { text: "labels.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "wrong-word", skillTags: ["selection", "replacement"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Move fast, then finish clean.",
    editableText: "move fast then finish clean",
    difficulty: "standard",
    skillPacks: ["word-movement", "punctuation-casing"],
    intendedShortcutPath: [
      "jump to start and capitalize",
      "jump to then",
      "insert comma",
      "jump to end and add period",
    ],
    attention: [
      { text: "Move", reason: "capitalization target", skillTags: ["capitalization"] },
      { text: "fast, then", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "clean.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Move the clause before the comma, and keep the sentence clear.",
    editableText: "Move the comma before the clause and keep the sentence clear",
    difficulty: "advanced",
    skillPacks: ["line-reshaping", "punctuation-casing"],
    intendedShortcutPath: [
      "select phrase around comma",
      "cut and reorder phrase",
      "jump to new clause break",
      "insert comma and period",
    ],
    attention: [
      { text: "clause before the comma", reason: "phrase order target", skillTags: ["cut-paste-reorder"] },
      { text: "comma, and", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "clear.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "wrong-word-order", skillTags: ["cut-paste-reorder"] },
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Replace the vague phrase with one sharp verb.",
    editableText: "Replace the vague confusing phrase with one sharp verb",
    difficulty: "advanced",
    skillPacks: ["selection-practice", "deletion-cleanup"],
    intendedShortcutPath: [
      "select confusing with word selection",
      "delete selected word",
      "jump to end and add period",
    ],
    attention: [
      { text: "vague phrase", reason: "phrase after cleanup", skillTags: ["selection", "word-deletion"] },
      { text: "verb.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "extra-word", skillTags: ["selection", "word-deletion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Read the first sentence.\nThen trim the second line.",
    editableText: "read the first sentence\nThen trim the extra second line",
    difficulty: "multiline",
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    intendedShortcutPath: [
      "jump to first line start",
      "capitalize and add period",
      "jump to second line",
      "delete extra word",
      "jump to end and add period",
    ],
    attention: [
      { text: "Read the first sentence.", reason: "first-line exact target", skillTags: ["capitalization", "punctuation-insertion"] },
      { text: "trim the second line.", reason: "delete extra word and finish line", skillTags: ["word-deletion", "punctuation-insertion"] },
    ],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Keep this line.\nDelete the noisy line.\nFinish here.",
    editableText: "keep this line\nDelete the noisy extra line\nFinish here",
    difficulty: "multiline",
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    intendedShortcutPath: [
      "capitalize first line",
      "add punctuation line by line",
      "jump to second line",
      "delete extra word",
      "finish final line",
    ],
    attention: [
      { text: "Keep this line.", reason: "first-line exact target", skillTags: ["capitalization", "punctuation-insertion"] },
      { text: "noisy line.", reason: "delete extra word", skillTags: ["word-deletion", "punctuation-insertion"] },
      { text: "Finish here.", reason: "final line target", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "missing-capitalization", skillTags: ["capitalization"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
      { type: "extra-word", skillTags: ["word-deletion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "Select the noisy phrase, then replace it with one clear word.",
    editableText: "Select the noisy complicated phrase then replace it with one clear word",
    difficulty: "advanced",
    skillPacks: ["selection-practice", "deletion-cleanup", "punctuation-casing"],
    intendedShortcutPath: [
      "select noisy word with word selection",
      "delete selected word",
      "jump to then",
      "insert comma",
      "jump to end and add period",
    ],
    attention: [
      { text: "noisy phrase", reason: "selection area", skillTags: ["selection", "word-deletion"] },
      { text: "phrase, then", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "word.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
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
    intendedShortcutPath: [
      "jump to first line start",
      "capitalize and add period",
      "move line by line",
      "delete extra word on second line",
      "finish punctuation on each line",
    ],
    attention: [
      { text: "Move quickly.", reason: "first-line capitalization and period", skillTags: ["capitalization", "punctuation-insertion"] },
      { text: "line breaks tidy.", reason: "delete extra word and finish line", skillTags: ["word-deletion", "punctuation-insertion"] },
      { text: "Finish clean.", reason: "final-line punctuation", skillTags: ["punctuation-insertion"] },
    ],
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
      intendedShortcutPath: template.intendedShortcutPath,
      attentionRanges: buildAttentionRanges(template.targetText, template.attention),
      difficulty: template.difficulty,
      estimatedCorrections: template.errors.length,
    };
  });
}

export function filterTargetTemplates(options: TargetChallengeOptions = {}): TargetTemplate[] {
  return filterTemplates(options);
}

function filterTemplates(options: TargetChallengeOptions): TargetTemplate[] {
  const targetDifficulty = options.difficulty ?? "standard";
  const filtered = targetTemplates.filter((template) => {
    const difficultyMatches = template.difficulty === targetDifficulty;
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

function buildAttentionRanges(
  text: string,
  attention: TargetTemplate["attention"],
) {
  return attention.flatMap((item) => {
    const start = text.indexOf(item.text);
    if (start < 0) return [];
    return [{
      start,
      end: start + item.text.length,
      reason: item.reason,
      skillTags: item.skillTags,
    }];
  });
}

function seededIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}
