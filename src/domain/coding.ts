import type { Challenge, ChallengeErrorType, Difficulty, SkillPack, SkillTag } from "./types";

type PythonTemplate = {
  targetText: string;
  editableText: string;
  difficulty: Difficulty;
  skillPacks: SkillPack[];
  intendedShortcutPath: string[];
  attention: Array<{ text: string; reason: string; skillTags: SkillTag[] }>;
  errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
};

const pythonTemplates: PythonTemplate[] = [
  {
    targetText: "name = user.strip()",
    editableText: "name=user.strip",
    difficulty: "standard",
    skillPacks: ["code-cleanup", "argument-cleanup"],
    intendedShortcutPath: [
      "jump to assignment operator",
      "add spacing around equals",
      "jump to method call end",
      "use smart pair to add parentheses",
    ],
    attention: [
      { text: " = ", reason: "operator spacing", skillTags: ["whitespace-correction"] },
      { text: "strip()", reason: "method call parentheses", skillTags: ["punctuation-insertion"] },
    ],
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
    intendedShortcutPath: [
      "select ready",
      "replace with is_ready",
      "jump by words to return",
    ],
    attention: [
      { text: "is_ready", reason: "rename target", skillTags: ["replacement"] },
      { text: "return items[0]", reason: "preserve indented return", skillTags: ["line-navigation"] },
    ],
    errors: [
      { type: "wrong-word", skillTags: ["replacement"] },
    ],
  },
  {
    targetText: "def greet(name):\n    return f\"hello, {name}\"",
    editableText: "def greet(name)\n    return f\"hello, {name}\"",
    difficulty: "multiline",
    skillPacks: ["code-cleanup", "punctuation-casing", "indentation"],
    intendedShortcutPath: [
      "jump to function header end",
      "insert colon",
      "use line navigation to verify indentation",
    ],
    attention: [
      { text: "def greet(name):", reason: "function header punctuation", skillTags: ["punctuation-insertion"] },
      { text: "    return", reason: "preserve indentation", skillTags: ["line-navigation", "whitespace-correction"] },
    ],
    errors: [
      { type: "missing-character", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "total = sum(items)\nreturn total",
    editableText: "total=sum(items)\nreturn total",
    difficulty: "multiline",
    skillPacks: ["code-cleanup", "indentation", "argument-cleanup"],
    intendedShortcutPath: [
      "jump to assignment operator",
      "add spaces around equals",
      "move to next line",
      "verify return line",
    ],
    attention: [
      { text: "total = sum(items)", reason: "operator spacing", skillTags: ["whitespace-correction"] },
      { text: "return total", reason: "final return line", skillTags: ["line-navigation"] },
    ],
    errors: [
      { type: "missing-space", skillTags: ["whitespace-correction"] },
    ],
  },
  {
    targetText: "enabled = user.is_active and not user.is_banned",
    editableText: "enabled = user.is_active and user.is_banned",
    difficulty: "advanced",
    skillPacks: ["code-refactor-micro-edits", "boolean-cleanup", "simple-refactor"],
    intendedShortcutPath: [
      "jump to second boolean term",
      "insert not before user.is_banned",
      "verify full expression",
    ],
    attention: [
      { text: "and not", reason: "boolean cleanup target", skillTags: ["replacement"] },
      { text: "user.is_banned", reason: "term to negate", skillTags: ["word-navigation"] },
    ],
    errors: [
      { type: "missing-word", skillTags: ["replacement"] },
    ],
  },
  {
    targetText: "message = \"saved\"",
    editableText: "message = saved",
    difficulty: "standard",
    skillPacks: ["code-cleanup", "string-cleanup"],
    intendedShortcutPath: [
      "select saved",
      "wrap with paired quotes",
    ],
    attention: [
      { text: "\"saved\"", reason: "string quote target", skillTags: ["punctuation-insertion", "selection"] },
    ],
    errors: [
      { type: "missing-character", skillTags: ["punctuation-insertion"] },
    ],
  },
  {
    targetText: "items.append(name)",
    editableText: "items.append name",
    difficulty: "standard",
    skillPacks: ["code-cleanup", "argument-cleanup"],
    intendedShortcutPath: [
      "jump to argument",
      "use smart pair to wrap name in parentheses",
    ],
    attention: [
      { text: "append(name)", reason: "method call argument", skillTags: ["punctuation-insertion", "selection"] },
    ],
    errors: [
      { type: "missing-character", skillTags: ["punctuation-insertion", "selection"] },
    ],
  },
  {
    targetText: "if total > 0:\n    return total",
    editableText: "if total > 0\nreturn total",
    difficulty: "multiline",
    skillPacks: ["indentation", "code-cleanup"],
    intendedShortcutPath: [
      "jump to condition end",
      "insert colon",
      "move to return line",
      "indent with Tab",
    ],
    attention: [
      { text: "if total > 0:", reason: "condition punctuation", skillTags: ["punctuation-insertion"] },
      { text: "    return total", reason: "indentation target", skillTags: ["whitespace-correction", "line-navigation"] },
    ],
    errors: [
      { type: "missing-character", skillTags: ["punctuation-insertion"] },
      { type: "missing-space", skillTags: ["whitespace-correction", "line-navigation"] },
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
      intendedShortcutPath: template.intendedShortcutPath,
      attentionRanges: buildAttentionRanges(template.targetText, template.attention),
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

function buildAttentionRanges(
  text: string,
  attention: PythonTemplate["attention"],
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
