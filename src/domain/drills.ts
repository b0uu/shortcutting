import type { Challenge, ChallengeErrorType, DrillDefinition, Platform, SkillPack, SkillTag } from "./types";
import {
  attentionRanges,
  createRng,
  generateWithRetry,
  qualityIssues,
  sentence,
  uniqueWords,
  wordPools,
  type GeneratedRecipe,
  type GeneratorRng,
} from "./generator";

type DrillFactory = {
  id: DrillDefinition["id"];
  instruction: string;
  skillPacks: SkillPack[];
  skillTags: SkillTag[];
  intendedShortcutPath: string[];
  attention: string[];
  hintByPlatform: Record<Platform, string>;
  build: (rng: GeneratorRng) => GeneratedDrillRecipe;
};

type GeneratedDrillRecipe = GeneratedRecipe & {
  drill: DrillDefinition;
  estimatedCorrections: number;
};

const drillFactories: DrillFactory[] = [
  {
    id: "delete-previous-word",
    instruction: "Delete the previous word.",
    skillPacks: ["deletion-cleanup", "word-movement"],
    skillTags: ["word-deletion", "word-navigation"],
    intendedShortcutPath: ["place caret after word", "delete previous word"],
    attention: ["previous word"],
    hintByPlatform: {
      mac: "On Mac, try Option + Backspace.",
      "windows-linux": "On Windows/Linux, try Ctrl + Backspace.",
    },
    build: (rng) => {
      const words = uniqueWords(rng, 4);
      const removeIndex = 2;
      const editableText = words.join(" ");
      const targetText = `${words.slice(0, removeIndex).join(" ")} ${words.slice(removeIndex + 1).join(" ")}`;
      const caret = words.slice(0, removeIndex + 1).join(" ").length;
      return drillRecipe("delete-previous-word", `Delete the previous word: "${words[removeIndex]}".`, editableText, targetText, {
        validation: { type: "text", expectedText: targetText },
        initialSelection: { start: caret, end: caret },
        skillPacks: ["deletion-cleanup", "word-movement"],
        skillTags: ["word-deletion", "word-navigation"],
        intendedShortcutPath: ["place caret after word", "delete previous word"],
        attention: [{ text: words[removeIndex + 1], reason: "text after previous-word deletion", skillTags: ["word-deletion"] }],
        errors: [{ type: "extra-word", skillTags: ["word-deletion"] }],
      });
    },
  },
  {
    id: "delete-next-word",
    instruction: "Delete the next word.",
    skillPacks: ["deletion-cleanup", "word-movement"],
    skillTags: ["word-deletion", "word-navigation"],
    intendedShortcutPath: ["place caret before word", "delete next word"],
    attention: ["next word"],
    hintByPlatform: {
      mac: "On Mac, try Option + Delete.",
      "windows-linux": "On Windows/Linux, try Ctrl + Delete.",
    },
    build: (rng) => {
      const words = uniqueWords(rng, 4);
      const removeIndex = 1;
      const editableText = words.join(" ");
      const targetText = `${words[0]} ${words.slice(2).join(" ")}`;
      const caret = words[0].length + 1;
      return drillRecipe("delete-next-word", `Delete the next word: "${words[removeIndex]}".`, editableText, targetText, {
        validation: { type: "text", expectedText: targetText },
        initialSelection: { start: caret, end: caret },
        skillPacks: ["deletion-cleanup", "word-movement"],
        skillTags: ["word-deletion", "word-navigation"],
        intendedShortcutPath: ["place caret before word", "delete next word"],
        attention: [{ text: words[removeIndex + 1], reason: "text after next-word deletion", skillTags: ["word-deletion"] }],
        errors: [{ type: "extra-word", skillTags: ["word-deletion"] }],
      });
    },
  },
  {
    id: "move-previous-word",
    instruction: "Move to the previous word.",
    skillPacks: ["word-movement"],
    skillTags: ["word-navigation"],
    intendedShortcutPath: ["use previous-word movement"],
    attention: ["previous word"],
    hintByPlatform: {
      mac: "On Mac, try Option + Left Arrow.",
      "windows-linux": "On Windows/Linux, try Ctrl + Left Arrow.",
    },
    build: (rng) => {
      const words = uniqueWords(rng, 3);
      const text = words.join(" ");
      const expectedIndex = words[0].length + 1;
      return drillRecipe("move-previous-word", `Move the caret to the start of "${words[1]}".`, text, text, {
        validation: { type: "cursor", expectedIndex },
        initialSelection: { start: text.length, end: text.length },
        skillPacks: ["word-movement"],
        skillTags: ["word-navigation"],
        intendedShortcutPath: ["use previous-word movement"],
        attention: [{ text: words[1], reason: "previous word landing point", skillTags: ["word-navigation"] }],
        errors: [{ type: "wrong-character-order", skillTags: ["word-navigation"] }],
      });
    },
  },
  {
    id: "move-next-word",
    instruction: "Move to the next word.",
    skillPacks: ["word-movement"],
    skillTags: ["word-navigation"],
    intendedShortcutPath: ["use next-word movement"],
    attention: ["next word"],
    hintByPlatform: {
      mac: "On Mac, try Option + Right Arrow.",
      "windows-linux": "On Windows/Linux, try Ctrl + Right Arrow.",
    },
    build: (rng) => {
      const words = uniqueWords(rng, 3);
      const text = words.join(" ");
      const expectedIndex = words[0].length;
      return drillRecipe("move-next-word", `Move the caret to the end of "${words[0]}".`, text, text, {
        validation: { type: "cursor", expectedIndex },
        initialSelection: { start: 0, end: 0 },
        skillPacks: ["word-movement"],
        skillTags: ["word-navigation"],
        intendedShortcutPath: ["use next-word movement"],
        attention: [{ text: words[0], reason: "next word boundary", skillTags: ["word-navigation"] }],
        errors: [{ type: "wrong-character-order", skillTags: ["word-navigation"] }],
      });
    },
  },
  {
    id: "select-previous-word",
    instruction: "Select the previous word.",
    skillPacks: ["selection-practice", "word-movement"],
    skillTags: ["selection", "word-navigation"],
    intendedShortcutPath: ["hold selection modifier", "move to previous word"],
    attention: ["previous word"],
    hintByPlatform: {
      mac: "On Mac, try Option + Shift + Left Arrow.",
      "windows-linux": "On Windows/Linux, try Ctrl + Shift + Left Arrow.",
    },
    build: (rng) => {
      const words = uniqueWords(rng, 3);
      const text = words.join(" ");
      const selected = words[2];
      const expectedStart = text.length - selected.length;
      return drillRecipe("select-previous-word", `Select the final word: "${selected}".`, text, text, {
        validation: { type: "selection", expectedStart, expectedEnd: text.length },
        initialSelection: { start: text.length, end: text.length },
        skillPacks: ["selection-practice", "word-movement"],
        skillTags: ["selection", "word-navigation"],
        intendedShortcutPath: ["hold selection modifier", "move to previous word"],
        attention: [{ text: selected, reason: "word to select", skillTags: ["selection"] }],
        errors: [{ type: "wrong-character-order", skillTags: ["selection", "word-navigation"] }],
      });
    },
  },
  {
    id: "replace-current-word",
    instruction: "Replace the marked word.",
    skillPacks: ["selection-practice", "deletion-cleanup"],
    skillTags: ["selection", "replacement"],
    intendedShortcutPath: ["move to marked word", "select word", "type replacement"],
    attention: ["current word"],
    hintByPlatform: {
      mac: "Move to the word, select it, then type the replacement.",
      "windows-linux": "Move to the word, select it, then type the replacement.",
    },
    build: (rng) => {
      const words = uniqueWords(rng, 3);
      const replacement = rng.pick(wordPools.repeatedSafe.filter((word) => !words.includes(word)));
      const editableText = sentence(words);
      const targetWords = [...words];
      targetWords[1] = replacement;
      const targetText = sentence(targetWords);
      const start = words[0].length + 1;
      return drillRecipe("replace-current-word", `Replace "${words[1]}" with "${replacement}".`, editableText, targetText, {
        validation: { type: "text", expectedText: targetText },
        initialSelection: { start, end: start },
        skillPacks: ["selection-practice", "deletion-cleanup"],
        skillTags: ["selection", "replacement"],
        intendedShortcutPath: ["move to marked word", "select word", "type replacement"],
        attention: [{ text: replacement, reason: "replacement target", skillTags: ["selection", "replacement"] }],
        errors: [{ type: "wrong-word", skillTags: ["selection", "replacement"] }],
      });
    },
  },
  {
    id: "insert-punctuation",
    instruction: "Insert punctuation at the target position.",
    skillPacks: ["punctuation-casing"],
    skillTags: ["punctuation-insertion", "character-navigation"],
    intendedShortcutPath: ["move to punctuation position", "insert comma"],
    attention: ["punctuation"],
    hintByPlatform: {
      mac: "Use punctuation without leaving the home row.",
      "windows-linux": "Use punctuation without leaving the home row.",
    },
    build: (rng) => {
      const first = uniqueWords(rng, 2);
      const second = uniqueWords(rng, 2);
      const targetText = `${first.join(" ")}, ${second.join(" ")}.`;
      const editableText = `${first.join(" ")} ${second.join(" ")}.`;
      const commaIndex = first.join(" ").length;
      return drillRecipe("insert-punctuation", `Insert a comma after "${first[1]}".`, editableText, targetText, {
        validation: { type: "text", expectedText: targetText },
        initialSelection: { start: commaIndex, end: commaIndex },
        skillPacks: ["punctuation-casing"],
        skillTags: ["punctuation-insertion", "character-navigation"],
        intendedShortcutPath: ["move to punctuation position", "insert comma"],
        attention: [{ text: `${first[1]},`, reason: "comma insertion point", skillTags: ["punctuation-insertion"] }],
        errors: [{ type: "missing-comma", skillTags: ["punctuation-insertion"] }],
      });
    },
  },
];

export function generateDrillChallenges(count: number, seed: string, skillPack?: SkillPack): Challenge[] {
  const factories = filterDrillDefinitions(skillPack);
  const hasFocusedPack = skillPack ? drillFactories.some((drill) => drill.skillPacks.includes(skillPack)) : false;
  const seedSkillPack = hasFocusedPack ? skillPack : undefined;
  const start = seed === "standard-v1" ? 0 : createRng(`${seed}:drill-order:${seedSkillPack ?? "all"}`).int(factories.length);
  return Array.from({ length: count }, (_, index) => {
    const factory = factories[(start + index) % factories.length];
    const recipeSeed = `${seed}:drill:${seedSkillPack ?? "all"}:${index + 1}:${factory.id}`;
    const recipe = generateWithRetry(
      recipeSeed,
      (rng) => factory.build(rng.fork("drill")),
      () => factory.build(createFallbackRng(factory.id)),
    ) as GeneratedDrillRecipe;
    return recipeToChallenge(recipe, seed, index);
  });
}

export function filterDrillDefinitions(skillPack?: SkillPack): DrillFactory[] {
  if (!skillPack) return drillFactories;
  const focused = drillFactories.filter((drill) => drill.skillPacks.includes(skillPack));
  return focused.length > 0 ? focused : drillFactories;
}

export function hintForDrill(challenge: Challenge, platform: Platform): string | null {
  return challenge.drill?.hintByPlatform[platform] ?? null;
}

function drillRecipe(
  id: DrillDefinition["id"],
  instruction: string,
  editableText: string,
  targetText: string,
  options: {
    validation: DrillDefinition["validation"];
    initialSelection: NonNullable<DrillDefinition["initialSelection"]>;
    skillPacks: SkillPack[];
    skillTags: SkillTag[];
    intendedShortcutPath: string[];
    attention: GeneratedRecipe["attention"];
    errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
  },
): GeneratedDrillRecipe {
  return {
    targetText,
    editableText,
    difficulty: "standard",
    skillPacks: options.skillPacks,
    intendedShortcutPath: options.intendedShortcutPath,
    attention: options.attention,
    errors: options.errors,
    estimatedCorrections: Math.max(1, options.errors.length),
    drill: {
      id,
      instruction,
      hintByPlatform: drillFactories.find((factory) => factory.id === id)?.hintByPlatform ?? {
        mac: "Use the matching shortcut.",
        "windows-linux": "Use the matching shortcut.",
      },
      validation: options.validation,
      initialSelection: options.initialSelection,
    },
  };
}

function recipeToChallenge(recipe: GeneratedDrillRecipe, seed: string, index: number): Challenge {
  return {
    id: `drill-${seed}-${index + 1}`,
    seed: `${seed}:drill:${index + 1}`,
    mode: "drill",
    prompt: recipe.drill.instruction,
    targetText: recipe.targetText,
    editableText: recipe.editableText,
    errors: recipe.errors.map((error, errorIndex) => ({
      id: `drill-err-${index + 1}-${errorIndex + 1}`,
      ...error,
    })),
    skillPacks: recipe.skillPacks,
    intendedShortcutPath: recipe.intendedShortcutPath,
    attentionRanges: attentionRanges(recipe.targetText, recipe.attention),
    difficulty: "standard",
    estimatedCorrections: recipe.estimatedCorrections,
    drill: recipe.drill,
  };
}

function createFallbackRng(label: string): GeneratorRng {
  return createRng(`fallback:${label}`);
}

export function drillRecipeQualityIssues(recipe: GeneratedRecipe) {
  return qualityIssues(recipe);
}
