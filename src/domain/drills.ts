import type { Challenge, DrillDefinition, Platform } from "./types";

const drillDefinitions: Array<{
  instruction: string;
  editableText: string;
  targetText: string;
  definition: DrillDefinition;
}> = [
  {
    instruction: "Delete the previous word.",
    editableText: "Keep the final draft",
    targetText: "Keep the final ",
    definition: {
      id: "delete-previous-word",
      instruction: "Delete the previous word.",
      hintByPlatform: {
        mac: "On Mac, try Option + Backspace.",
        "windows-linux": "On Windows/Linux, try Ctrl + Backspace.",
      },
      validation: { type: "text", expectedText: "Keep the final " },
      initialSelection: { start: 20, end: 20 },
    },
  },
  {
    instruction: "Delete the next word.",
    editableText: "Remove noisy copy now",
    targetText: "Remove copy now",
    definition: {
      id: "delete-next-word",
      instruction: "Delete the next word.",
      hintByPlatform: {
        mac: "On Mac, try Option + Delete.",
        "windows-linux": "On Windows/Linux, try Ctrl + Delete.",
      },
      validation: { type: "text", expectedText: "Remove copy now" },
      initialSelection: { start: 7, end: 7 },
    },
  },
  {
    instruction: "Move to the previous word.",
    editableText: "Jump back quickly",
    targetText: "Jump back quickly",
    definition: {
      id: "move-previous-word",
      instruction: "Move to the previous word.",
      hintByPlatform: {
        mac: "On Mac, try Option + Left Arrow.",
        "windows-linux": "On Windows/Linux, try Ctrl + Left Arrow.",
      },
      validation: { type: "cursor", expectedIndex: 10 },
      initialSelection: { start: 17, end: 17 },
    },
  },
  {
    instruction: "Move to the next word.",
    editableText: "Jump ahead quickly",
    targetText: "Jump ahead quickly",
    definition: {
      id: "move-next-word",
      instruction: "Move to the next word.",
      hintByPlatform: {
        mac: "On Mac, try Option + Right Arrow.",
        "windows-linux": "On Windows/Linux, try Ctrl + Right Arrow.",
      },
      validation: { type: "cursor", expectedIndex: 5 },
      initialSelection: { start: 0, end: 0 },
    },
  },
  {
    instruction: "Select the previous word.",
    editableText: "Select this word",
    targetText: "Select this word",
    definition: {
      id: "select-previous-word",
      instruction: "Select the previous word.",
      hintByPlatform: {
        mac: "On Mac, try Option + Shift + Left Arrow.",
        "windows-linux": "On Windows/Linux, try Ctrl + Shift + Left Arrow.",
      },
      validation: { type: "selection", expectedStart: 12, expectedEnd: 16 },
      initialSelection: { start: 16, end: 16 },
    },
  },
  {
    instruction: "Replace the current word.",
    editableText: "Use a rough label.",
    targetText: "Use a clear label.",
    definition: {
      id: "replace-current-word",
      instruction: "Replace the current word.",
      hintByPlatform: {
        mac: "Select the word, then type the replacement.",
        "windows-linux": "Select the word, then type the replacement.",
      },
      validation: { type: "text", expectedText: "Use a clear label." },
      initialSelection: { start: 6, end: 11 },
    },
  },
  {
    instruction: "Insert punctuation at the target position.",
    editableText: "Pause here then continue.",
    targetText: "Pause here, then continue.",
    definition: {
      id: "insert-punctuation",
      instruction: "Insert punctuation at the target position.",
      hintByPlatform: {
        mac: "Use punctuation without leaving the home row.",
        "windows-linux": "Use punctuation without leaving the home row.",
      },
      validation: { type: "text", expectedText: "Pause here, then continue." },
      initialSelection: { start: 10, end: 10 },
    },
  },
];

export function generateDrillChallenges(count: number, seed: string): Challenge[] {
  const start = seed === "standard-v1" ? 0 : seededIndex(seed, drillDefinitions.length);
  return Array.from({ length: count }, (_, index) => {
    const drill = drillDefinitions[(start + index) % drillDefinitions.length];
    return {
      id: `drill-${seed}-${index + 1}`,
      seed: `${seed}:drill:${index + 1}`,
      mode: "drill",
      prompt: drill.instruction,
      targetText: drill.targetText,
      editableText: drill.editableText,
      errors: [],
      skillPacks: ["deletion-cleanup"],
      difficulty: "standard",
      estimatedCorrections: 1,
      drill: drill.definition,
    };
  });
}

export function hintForDrill(challenge: Challenge, platform: Platform): string | null {
  return challenge.drill?.hintByPlatform[platform] ?? null;
}

function seededIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}
