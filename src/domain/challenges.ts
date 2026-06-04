import type { Challenge, ChallengeError, Difficulty, SkillPack } from "./types";
import {
  attentionRanges,
  capitalize,
  chooseVariedFactories,
  createRng,
  generateWithRetry,
  qualityIssues,
  sentence,
  uniqueWords,
  wordPools,
  type GeneratedRecipe,
  type GeneratorRng,
  type VarietyFactoryMeta,
} from "./generator";

export const seedPack = "standard-v1";

export type TargetChallengeOptions = {
  difficulty?: Difficulty;
  skillPack?: SkillPack;
};

type TargetRecipeFactory = VarietyFactoryMeta & {
  difficulties: Difficulty[];
  skillPacks: SkillPack[];
  build: (rng: GeneratorRng, difficulty: Difficulty) => GeneratedRecipe;
};

const targetFactories: TargetRecipeFactory[] = [
  {
    id: "case-comma-period",
    shape: "case-punctuation",
    primarySkill: "punctuation-insertion",
    shortcutFamily: "punctuation",
    density: 2,
    visualShape: "long-line",
    weight: 0.9,
    difficulties: ["standard", "advanced"],
    skillPacks: ["punctuation-casing", "word-movement"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 7 : 5);
      const commaIndex = difficulty === "advanced" ? 3 : 2;
      const targetWords = [...words];
      const shouldCapitalize = rng.chance(0.45);
      if (shouldCapitalize) targetWords[0] = capitalize(targetWords[0]);
      targetWords[commaIndex] = `${targetWords[commaIndex]},`;
      const targetText = `${targetWords.join(" ")}.`;
      const attention: GeneratedRecipe["attention"] = [
        { text: targetWords[commaIndex], reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
        { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
      ];
      const errors: GeneratedRecipe["errors"] = [
        { type: "missing-comma", skillTags: ["punctuation-insertion"] },
        { type: "missing-period", skillTags: ["punctuation-insertion"] },
      ];
      if (shouldCapitalize) {
        attention.unshift({ text: targetWords[0], reason: "capitalization target", skillTags: ["capitalization"] });
        errors.unshift({ type: "missing-capitalization", skillTags: ["capitalization"] });
      }
      return {
        targetText,
        editableText: words.join(" "),
        difficulty,
        skillPacks: ["punctuation-casing", "word-movement"],
        intendedShortcutPath: shouldCapitalize
          ? ["jump to start", "capitalize first word", "jump to comma point", "insert comma", "jump to end", "add period"]
          : ["jump to comma point", "insert comma", "jump to end", "add period"],
        attention,
        errors,
      };
    },
  },
  {
    id: "delete-duplicate",
    shape: "delete-word",
    primarySkill: "word-deletion",
    shortcutFamily: "delete-word",
    density: 1,
    visualShape: "short-line",
    weight: 2,
    difficulties: ["standard", "advanced"],
    skillPacks: ["deletion-cleanup", "word-movement"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 7 : 5, [wordPools.short, wordPools.repeatedSafe]);
      const duplicateIndex = rng.range(1, words.length - 2);
      const editableWords = [...words];
      editableWords.splice(duplicateIndex, 0, words[duplicateIndex]);
      const targetText = sentence(words, { period: false });
      return {
        targetText,
        editableText: editableWords.join(" "),
        difficulty,
        skillPacks: ["deletion-cleanup", "word-movement"],
        intendedShortcutPath: ["jump by words to duplicate", "delete one repeated word"],
        attention: [
          { text: `${words[duplicateIndex]} ${words[duplicateIndex + 1]}`, reason: "duplicate cleanup area", skillTags: ["word-deletion"] },
        ],
        errors: [
          { type: "extra-word", skillTags: ["word-deletion"] },
        ],
      };
    },
  },
  {
    id: "double-space",
    shape: "spacing",
    primarySkill: "whitespace-correction",
    shortcutFamily: "spacing",
    density: 1,
    visualShape: "short-line",
    weight: 2,
    difficulties: ["standard", "advanced"],
    skillPacks: ["deletion-cleanup", "punctuation-casing"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 8 : 5);
      const gapIndex = rng.range(1, words.length - 2);
      const targetText = sentence(words, { period: false });
      const editableText = `${words.slice(0, gapIndex + 1).join(" ")}  ${words.slice(gapIndex + 1).join(" ")}`;
      return {
        targetText,
        editableText,
        difficulty,
        skillPacks: ["deletion-cleanup", "punctuation-casing"],
        intendedShortcutPath: ["jump to double space", "delete one space"],
        attention: [
          { text: `${words[gapIndex]} ${words[gapIndex + 1]}`, reason: "spacing cleanup area", skillTags: ["whitespace-correction"] },
        ],
        errors: [
          { type: "double-space", skillTags: ["whitespace-correction"] },
        ],
      };
    },
  },
  {
    id: "replace-word",
    shape: "replace",
    primarySkill: "replacement",
    shortcutFamily: "select-replace",
    density: 2,
    visualShape: "short-line",
    weight: 2,
    difficulties: ["standard", "advanced"],
    skillPacks: ["selection-practice", "deletion-cleanup"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 7 : 5);
      const replacementIndex = rng.range(1, words.length - 2);
      const wrong = rng.pick(wordPools.short.filter((word) => !words.includes(word)));
      const editableWords = [...words];
      editableWords[replacementIndex] = wrong;
      return {
        targetText: sentence(words, { period: false }),
        editableText: editableWords.join(" "),
        difficulty,
        skillPacks: ["selection-practice", "deletion-cleanup"],
        intendedShortcutPath: ["select wrong word", "type replacement"],
        attention: [
          { text: words[replacementIndex], reason: "replacement target", skillTags: ["selection", "replacement"] },
        ],
        errors: [
          { type: "wrong-word", skillTags: ["selection", "replacement"] },
        ],
      };
    },
  },
  {
    id: "trim-extra-phrase",
    shape: "trim",
    primarySkill: "word-deletion",
    shortcutFamily: "select-delete",
    density: 3,
    visualShape: "long-line",
    weight: 2,
    difficulties: ["advanced"],
    skillPacks: ["selection-practice", "deletion-cleanup"],
    build: (rng) => {
      const words = uniqueWords(rng, 8);
      const extra = uniqueWords(rng, 2, [wordPools.short]);
      const insertIndex = rng.range(2, 4);
      const editableWords = [...words];
      editableWords.splice(insertIndex, 0, ...extra);
      return {
        targetText: sentence(words, { period: false }),
        editableText: editableWords.join(" "),
        difficulty: "advanced",
        skillPacks: ["selection-practice", "deletion-cleanup"],
        intendedShortcutPath: ["select extra phrase", "delete selection"],
        attention: [
          { text: `${words[insertIndex - 1]} ${words[insertIndex]}`, reason: "phrase after trim", skillTags: ["selection", "word-deletion"] },
        ],
        errors: [
          { type: "extra-word", skillTags: ["selection", "word-deletion"] },
          { type: "extra-word", skillTags: ["selection", "word-deletion"] },
        ],
      };
    },
  },
  {
    id: "simple-reorder",
    shape: "reorder",
    primarySkill: "cut-paste-reorder",
    shortcutFamily: "reorder",
    density: 3,
    visualShape: "long-line",
    weight: 2,
    difficulties: ["advanced"],
    skillPacks: ["line-reshaping", "selection-practice"],
    build: (rng) => {
      const words = uniqueWords(rng, 7);
      const editableWords = [...words];
      [editableWords[2], editableWords[3]] = [editableWords[3], editableWords[2]];
      return {
        targetText: sentence(words, { period: false }),
        editableText: editableWords.join(" "),
        difficulty: "advanced",
        skillPacks: ["line-reshaping", "selection-practice"],
        intendedShortcutPath: ["select swapped word", "cut or move it one word", "restore order"],
        attention: [
          { text: `${words[2]} ${words[3]}`, reason: "word order target", skillTags: ["cut-paste-reorder"] },
        ],
        errors: [
          { type: "wrong-word-order", skillTags: ["cut-paste-reorder"] },
        ],
      };
    },
  },
  {
    id: "apostrophe-word",
    shape: "character-edit",
    primarySkill: "apostrophe-insertion",
    shortcutFamily: "character-insert",
    density: 1,
    visualShape: "short-line",
    weight: 1.4,
    difficulties: ["standard", "advanced"],
    skillPacks: ["punctuation-casing", "selection-practice"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 6 : 4);
      const possessive = rng.pick(["day", "map", "box", "sun"]);
      const targetWords = [...words];
      targetWords.splice(1, 0, `${possessive}'s`);
      const editableWords = [...targetWords];
      editableWords[1] = `${possessive}s`;
      return {
        targetText: sentence(targetWords, { period: false }),
        editableText: editableWords.join(" "),
        difficulty,
        skillPacks: ["punctuation-casing", "selection-practice"],
        intendedShortcutPath: ["jump inside possessive word", "insert apostrophe"],
        attention: [
          { text: `${possessive}'s`, reason: "apostrophe insertion target", skillTags: ["apostrophe-insertion"] },
        ],
        errors: [
          { type: "missing-apostrophe", skillTags: ["apostrophe-insertion"] },
        ],
      };
    },
  },
  {
    id: "missing-character",
    shape: "character-edit",
    primarySkill: "character-navigation",
    shortcutFamily: "character-insert",
    density: 1,
    visualShape: "short-line",
    weight: 1.4,
    difficulties: ["standard"],
    skillPacks: ["punctuation-casing", "selection-practice"],
    build: (rng) => {
      const words = uniqueWords(rng, 5);
      const targetWord = rng.pick(["clear", "plain", "sharp", "light"]);
      const fixedWords = [...words];
      fixedWords[2] = targetWord;
      const editableWords = [...fixedWords];
      editableWords[2] = targetWord.slice(0, -1);
      return {
        targetText: sentence(fixedWords, { period: false }),
        editableText: editableWords.join(" "),
        difficulty: "standard",
        skillPacks: ["selection-practice", "punctuation-casing"],
        intendedShortcutPath: ["jump to short word", "insert missing character"],
        attention: [
          { text: targetWord, reason: "missing character target", skillTags: ["character-navigation", "replacement"] },
        ],
        errors: [
          { type: "missing-character", skillTags: ["character-navigation", "replacement"] },
        ],
      };
    },
  },
  {
    id: "split-two-sentences",
    shape: "line-cleanup",
    primarySkill: "punctuation-insertion",
    shortcutFamily: "sentence-split",
    density: 2,
    visualShape: "two-line",
    weight: 1.5,
    difficulties: ["advanced"],
    skillPacks: ["line-reshaping", "punctuation-casing"],
    build: (rng, difficulty) => {
      const first = uniqueWords(rng, 3);
      const second = uniqueWords(rng, 3);
      const firstCap = rng.chance(0.5);
      const secondCap = rng.chance(0.5);
      const targetText = `${sentence(first, { capitalizeFirst: firstCap })}\n${sentence(second, { capitalizeFirst: secondCap })}`;
      const editableText = `${first.join(" ")} ${second.join(" ")}`;
      const errors: GeneratedRecipe["errors"] = [
        { type: "missing-period", skillTags: ["punctuation-insertion"] },
        { type: "missing-newline", skillTags: ["newline-correction"] },
        { type: "missing-period", skillTags: ["punctuation-insertion"] },
      ];
      if (firstCap) errors.unshift({ type: "missing-capitalization", skillTags: ["capitalization"] });
      if (secondCap) errors.splice(errors.length - 1, 0, { type: "missing-capitalization", skillTags: ["capitalization"] });
      return {
        targetText,
        editableText,
        difficulty,
        skillPacks: ["line-reshaping", "punctuation-casing"],
        intendedShortcutPath: [
          ...(firstCap ? ["capitalize first sentence"] : []),
          "insert period",
          "insert newline",
          ...(secondCap ? ["capitalize second sentence"] : []),
          "finish punctuation",
        ],
        attention: [
          { text: targetText.split("\n")[0], reason: "first sentence boundary", skillTags: ["capitalization", "punctuation-insertion", "newline-correction"] },
          { text: targetText.split("\n")[1], reason: "second sentence boundary", skillTags: ["capitalization", "punctuation-insertion", "newline-correction"] },
        ],
        errors,
      };
    },
  },
  {
    id: "multiline-cleanup",
    shape: "line-cleanup",
    primarySkill: "newline-correction",
    shortcutFamily: "line-cleanup",
    density: 3,
    visualShape: "multiline",
    weight: 2,
    difficulties: ["multiline"],
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    build: (rng) => {
      const lineOne = uniqueWords(rng, 4);
      const lineTwo = uniqueWords(rng, 4);
      const lineThree = uniqueWords(rng, 3);
      const extra = rng.pick(wordPools.short);
      const firstCap = rng.chance(0.35);
      const finalPeriod = rng.chance(0.45);
      const targetLines = [
        sentence(lineOne, { period: false, capitalizeFirst: firstCap }),
        sentence(lineTwo, { period: false }),
        sentence(lineThree, { period: finalPeriod }),
      ];
      const editableLines = [
        lineOne.join(" "),
        `${lineTwo.slice(0, 2).join(" ")} ${extra} ${lineTwo.slice(2).join(" ")}`,
        lineThree.join(" "),
      ];
      const errors: GeneratedRecipe["errors"] = [
        { type: "extra-word", skillTags: ["word-deletion"] },
      ];
      if (firstCap) errors.unshift({ type: "missing-capitalization", skillTags: ["capitalization"] });
      if (finalPeriod) errors.push({ type: "missing-period", skillTags: ["punctuation-insertion"] });
      return {
        targetText: targetLines.join("\n"),
        editableText: editableLines.join("\n"),
        difficulty: "multiline",
        skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
        intendedShortcutPath: ["clean first line", "move to second line", "delete extra word", "check final punctuation"],
        attention: [
          { text: targetLines[0], reason: "first line cleanup", skillTags: ["line-navigation"] },
          { text: `${lineTwo[1]} ${lineTwo[2]}`, reason: "line trim area", skillTags: ["word-deletion"] },
          { text: targetLines[2], reason: "final line target", skillTags: ["line-navigation"] },
        ],
        errors,
      };
    },
  },
  {
    id: "multiline-extra-newline",
    shape: "line-cleanup",
    primarySkill: "newline-correction",
    shortcutFamily: "line-join",
    density: 2,
    visualShape: "multiline",
    weight: 1.5,
    difficulties: ["multiline"],
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    build: (rng) => {
      const words = uniqueWords(rng, 8);
      const firstCap = rng.chance(0.35);
      const secondCap = rng.chance(0.35);
      const secondPeriod = rng.chance(0.45);
      const targetLines = [
        sentence(words.slice(0, 4), { period: false, capitalizeFirst: firstCap }),
        sentence(words.slice(4), { period: secondPeriod, capitalizeFirst: secondCap }),
      ];
      const editableLines = [
        words.slice(0, 2).join(" "),
        words.slice(2, 4).join(" "),
        words.slice(4).join(" "),
      ];
      const errors: GeneratedRecipe["errors"] = [
        { type: "extra-newline", skillTags: ["newline-correction"] },
      ];
      if (firstCap) errors.push({ type: "missing-capitalization", skillTags: ["capitalization"] });
      if (secondCap) errors.push({ type: "missing-capitalization", skillTags: ["capitalization"] });
      if (secondPeriod) errors.push({ type: "missing-period", skillTags: ["punctuation-insertion"] });
      return {
        targetText: targetLines.join("\n"),
        editableText: editableLines.join("\n"),
        difficulty: "multiline",
        skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
        intendedShortcutPath: ["join split first line", "move through line boundary", "check line casing", "check line endings"],
        attention: [
          { text: targetLines[0], reason: "joined first line", skillTags: ["newline-correction"] },
          { text: targetLines[1], reason: "second line target", skillTags: ["line-navigation"] },
        ],
        errors,
      };
    },
  },
];

export function generateTargetChallenges(count: number, seed: string, options: TargetChallengeOptions = {}): Challenge[] {
  const difficulty = options.difficulty ?? "standard";
  const factories = chooseVariedFactories(
    filterFactories(difficulty, options.skillPack),
    count,
    `${seed}:target-variety:${difficulty}:${options.skillPack ?? "all"}`,
  );
  return Array.from({ length: count }, (_, index) => {
    const factory = factories[index];
    const recipeSeed = `${seed}:target:${difficulty}:${options.skillPack ?? "all"}:${index + 1}`;
    const recipe = generateWithRetry(
      recipeSeed,
      (rng) => factory.build(rng.fork(factory.id), difficulty),
      () => fallbackTargetRecipe(difficulty),
    );
    return recipeToChallenge(recipe, seed, index);
  });
}

export function filterTargetTemplates(options: TargetChallengeOptions = {}): TargetRecipeFactory[] {
  return filterFactories(options.difficulty ?? "standard", options.skillPack);
}

function filterFactories(difficulty: Difficulty, skillPack?: SkillPack): TargetRecipeFactory[] {
  const matches = targetFactories.filter((factory) => {
    const difficultyMatches = factory.difficulties.includes(difficulty);
    const skillMatches = !skillPack || factory.skillPacks.includes(skillPack);
    return difficultyMatches && skillMatches;
  });
  if (matches.length > 0) return matches;
  return targetFactories.filter((factory) => factory.difficulties.includes(difficulty));
}

function fallbackTargetRecipe(difficulty: Difficulty): GeneratedRecipe {
  if (difficulty === "multiline") {
    return targetFactories.find((factory) => factory.id === "multiline-cleanup")!.build(createRng("fallback-target"), "multiline");
  }
  return {
    targetText: "clear soft green, light red.",
    editableText: "clear soft green light red",
    difficulty,
    skillPacks: ["punctuation-casing", "word-movement"],
    intendedShortcutPath: ["jump to comma point", "insert comma", "jump to end", "add period"],
    attention: [
      { text: "green,", reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
      { text: "red.", reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
    ],
    errors: [
      { type: "missing-comma", skillTags: ["punctuation-insertion"] },
      { type: "missing-period", skillTags: ["punctuation-insertion"] },
    ],
  };
}

function recipeToChallenge(recipe: GeneratedRecipe, seed: string, index: number): Challenge {
  return {
    id: `target-${seed}-${index + 1}`,
    seed: `${seed}:target:${index + 1}`,
    mode: "target-match",
    prompt: "Match the target text.",
    targetText: recipe.targetText,
    editableText: recipe.editableText,
    errors: buildErrors(recipe.errors, index),
    skillPacks: recipe.skillPacks,
    intendedShortcutPath: recipe.intendedShortcutPath,
    attentionRanges: attentionRanges(recipe.targetText, recipe.attention),
    difficulty: recipe.difficulty,
    estimatedCorrections: recipe.errors.length,
  };
}

function buildErrors(errors: GeneratedRecipe["errors"], challengeIndex: number): ChallengeError[] {
  return errors.map((error, errorIndex) => ({
    id: `err-${challengeIndex + 1}-${errorIndex + 1}`,
    ...error,
  }));
}

export function targetRecipeQualityIssues(recipe: GeneratedRecipe) {
  return qualityIssues(recipe);
}
