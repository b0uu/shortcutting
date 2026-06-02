import type { Challenge, ChallengeErrorType, Difficulty, SkillPack, SkillTag } from "./types";

type PythonTemplate = {
  targetText: string;
  editableText: string;
  difficulty: Difficulty;
  skillPacks: SkillPack[];
  errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
};

const pythonTemplates: PythonTemplate[] = [
  {
    targetText: "name = user.strip()",
    editableText: "name=user.strip",
    difficulty: "standard",
    skillPacks: ["code-cleanup", "argument-cleanup"],
    errors: [
      { type: "missing-space", skillTags: ["whitespace-correction"] },
      { type: "missing-character", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "if is_ready and has_items:\n    return items[0]",
    editableText: "if ready and has_items:\n    return items[0]",
    difficulty: "advanced",
    skillPacks: ["code-refactor-micro-edits", "rename", "simple-refactor"],
    errors: [
      { type: "wrong-word", skillTags: ["replacement"] },
    ],
  },
  {
    targetText: "def greet(name):\n    return f\"hello, {name}\"",
    editableText: "def greet(name)\n    return f\"hello, {name}\"",
    difficulty: "multiline",
    skillPacks: ["code-cleanup", "punctuation-casing", "indentation"],
    errors: [
      { type: "missing-character", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "total = sum(items)\nreturn total",
    editableText: "total=sum(items)\nreturn total",
    difficulty: "multiline",
    skillPacks: ["code-cleanup", "indentation", "argument-cleanup"],
    errors: [
      { type: "missing-space", skillTags: ["whitespace-correction"] },
    ],
  },
  {
    targetText: "enabled = user.is_active and not user.is_banned",
    editableText: "enabled = user.is_active and user.is_banned",
    difficulty: "advanced",
    skillPacks: ["code-refactor-micro-edits", "boolean-cleanup", "simple-refactor"],
    errors: [
      { type: "missing-word", skillTags: ["replacement"] },
    ],
  },
  {
    targetText: "message = \"saved\"",
    editableText: "message = saved",
    difficulty: "standard",
    skillPacks: ["code-cleanup", "string-cleanup"],
    errors: [
      { type: "missing-character", skillTags: ["punctuation-insertion"] },
    ],
  },
];

export function generatePythonChallenges(count: number, seed: string, difficulty: Difficulty = "standard"): Challenge[] {
  const templates = filterPythonTemplates(difficulty);
  const start = seededIndex(seed, templates.length);
  return Array.from({ length: count }, (_, index) => {
    const template = templates[(start + index) % templates.length];
    return {
      id: `python-${seed}-${index + 1}`,
      seed: `${seed}:python:${index + 1}`,
      mode: "coding",
      prompt: "Edit the Python snippet.",
      targetText: template.targetText,
      editableText: template.editableText,
      errors: template.errors.map((error, errorIndex) => ({
        id: `py-err-${index + 1}-${errorIndex + 1}`,
        ...error,
      })),
      skillPacks: template.skillPacks,
      difficulty: template.difficulty,
      estimatedCorrections: template.errors.length,
    };
  });
}

export function filterPythonTemplates(difficulty: Difficulty): PythonTemplate[] {
  const filtered = pythonTemplates.filter((template) => template.difficulty === difficulty);
  return filtered.length > 0 ? filtered : pythonTemplates.filter((template) => template.difficulty === "standard");
}

function seededIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}
