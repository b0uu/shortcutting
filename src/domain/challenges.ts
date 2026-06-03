import type { Challenge, ChallengeError, Difficulty, SkillPack } from "./types";
import {
  attentionRanges,
  capitalize,
  createRng,
  generateWithRetry,
  qualityIssues,
  sentence,
  uniqueWords,
  wordPools,
  type GeneratedRecipe,
  type GeneratorRng,
} from "./generator";

export const seedPack = "standard-v1";

export type TargetChallengeOptions = {
  difficulty?: Difficulty;
  skillPack?: SkillPack;
};

type TargetRecipeFactory = {
  id: string;
  difficulties: Difficulty[];
  skillPacks: SkillPack[];
  build: (rng: GeneratorRng, difficulty: Difficulty) => GeneratedRecipe;
};

const targetFactories: TargetRecipeFactory[] = [
  {
    id: "case-comma-period",
    difficulties: ["standard", "advanced"],
    skillPacks: ["punctuation-casing", "word-movement"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 7 : 5);
      const commaIndex = difficulty === "advanced" ? 3 : 2;
      const targetWords = [...words];
      targetWords[0] = capitalize(targetWords[0]);
      targetWords[commaIndex] = `${targetWords[commaIndex]},`;
      const targetText = `${targetWords.join(" ")}.`;
      return {
        targetText,
        editableText: words.join(" "),
        difficulty,
        skillPacks: ["punctuation-casing", "word-movement"],
        intendedShortcutPath: ["jump to start", "capitalize first word", "jump to comma point", "insert comma", "jump to end", "add period"],
        attention: [
          { text: targetWords[0], reason: "capitalization target", skillTags: ["capitalization"] },
          { text: targetWords[commaIndex], reason: "comma insertion point", skillTags: ["punctuation-insertion"] },
          { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "missing-capitalization", skillTags: ["capitalization"] },
          { type: "missing-comma", skillTags: ["punctuation-insertion"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
  {
    id: "delete-duplicate",
    difficulties: ["standard", "advanced"],
    skillPacks: ["deletion-cleanup", "word-movement"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 7 : 5, [wordPools.short, wordPools.repeatedSafe]);
      const duplicateIndex = rng.range(1, words.length - 2);
      const editableWords = [...words];
      editableWords.splice(duplicateIndex, 0, words[duplicateIndex]);
      const targetText = sentence(words);
      return {
        targetText,
        editableText: editableWords.join(" "),
        difficulty,
        skillPacks: ["deletion-cleanup", "word-movement"],
        intendedShortcutPath: ["jump by words to duplicate", "delete one repeated word", "jump to end", "add period"],
        attention: [
          { text: `${words[duplicateIndex]} ${words[duplicateIndex + 1]}`, reason: "duplicate cleanup area", skillTags: ["word-deletion"] },
          { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "extra-word", skillTags: ["word-deletion"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
  {
    id: "double-space",
    difficulties: ["standard", "advanced"],
    skillPacks: ["deletion-cleanup", "punctuation-casing"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 8 : 5);
      const gapIndex = rng.range(1, words.length - 2);
      const targetText = sentence(words);
      const editableText = `${words.slice(0, gapIndex + 1).join(" ")}  ${words.slice(gapIndex + 1).join(" ")}`;
      return {
        targetText,
        editableText,
        difficulty,
        skillPacks: ["deletion-cleanup", "punctuation-casing"],
        intendedShortcutPath: ["jump to double space", "delete one space", "jump to end", "add period"],
        attention: [
          { text: `${words[gapIndex]} ${words[gapIndex + 1]}`, reason: "spacing cleanup area", skillTags: ["whitespace-correction"] },
          { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "double-space", skillTags: ["whitespace-correction"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
  {
    id: "replace-word",
    difficulties: ["standard", "advanced"],
    skillPacks: ["selection-practice", "deletion-cleanup"],
    build: (rng, difficulty) => {
      const words = uniqueWords(rng, difficulty === "advanced" ? 7 : 5);
      const replacementIndex = rng.range(1, words.length - 2);
      const wrong = rng.pick(wordPools.short.filter((word) => !words.includes(word)));
      const editableWords = [...words];
      editableWords[replacementIndex] = wrong;
      return {
        targetText: sentence(words),
        editableText: editableWords.join(" "),
        difficulty,
        skillPacks: ["selection-practice", "deletion-cleanup"],
        intendedShortcutPath: ["select wrong word", "type replacement", "jump to end", "add period"],
        attention: [
          { text: words[replacementIndex], reason: "replacement target", skillTags: ["selection", "replacement"] },
          { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "wrong-word", skillTags: ["selection", "replacement"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
  {
    id: "trim-extra-phrase",
    difficulties: ["advanced"],
    skillPacks: ["selection-practice", "deletion-cleanup"],
    build: (rng) => {
      const words = uniqueWords(rng, 8);
      const extra = uniqueWords(rng, 2, [wordPools.short]);
      const insertIndex = rng.range(2, 4);
      const editableWords = [...words];
      editableWords.splice(insertIndex, 0, ...extra);
      return {
        targetText: sentence(words, { capitalizeFirst: rng.chance(0.5) }),
        editableText: editableWords.join(" "),
        difficulty: "advanced",
        skillPacks: ["selection-practice", "deletion-cleanup"],
        intendedShortcutPath: ["select extra phrase", "delete selection", "jump to end", "add period"],
        attention: [
          { text: `${words[insertIndex - 1]} ${words[insertIndex]}`, reason: "phrase after trim", skillTags: ["selection", "word-deletion"] },
          { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "extra-word", skillTags: ["selection", "word-deletion"] },
          { type: "extra-word", skillTags: ["selection", "word-deletion"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
  {
    id: "simple-reorder",
    difficulties: ["advanced"],
    skillPacks: ["line-reshaping", "selection-practice"],
    build: (rng) => {
      const words = uniqueWords(rng, 7);
      const editableWords = [...words];
      [editableWords[2], editableWords[3]] = [editableWords[3], editableWords[2]];
      return {
        targetText: sentence(words),
        editableText: editableWords.join(" "),
        difficulty: "advanced",
        skillPacks: ["line-reshaping", "selection-practice"],
        intendedShortcutPath: ["select swapped word", "cut or move it one word", "restore order", "jump to end", "add period"],
        attention: [
          { text: `${words[2]} ${words[3]}`, reason: "word order target", skillTags: ["cut-paste-reorder"] },
          { text: `${words.at(-1)}.`, reason: "finish punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "wrong-word-order", skillTags: ["cut-paste-reorder"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
  {
    id: "multiline-cleanup",
    difficulties: ["multiline"],
    skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
    build: (rng) => {
      const lineOne = uniqueWords(rng, 4);
      const lineTwo = uniqueWords(rng, 4);
      const lineThree = uniqueWords(rng, 3);
      const extra = rng.pick(wordPools.short);
      const targetLines = [
        sentence(lineOne, { capitalizeFirst: true }),
        sentence(lineTwo),
        sentence(lineThree),
      ];
      const editableLines = [
        lineOne.join(" "),
        `${lineTwo.slice(0, 2).join(" ")} ${extra} ${lineTwo.slice(2).join(" ")}`,
        lineThree.join(" "),
      ];
      return {
        targetText: targetLines.join("\n"),
        editableText: editableLines.join("\n"),
        difficulty: "multiline",
        skillPacks: ["line-reshaping", "deletion-cleanup", "punctuation-casing"],
        intendedShortcutPath: ["capitalize first line", "add periods line by line", "move to second line", "delete extra word", "finish final punctuation"],
        attention: [
          { text: targetLines[0], reason: "first line cleanup", skillTags: ["capitalization", "punctuation-insertion"] },
          { text: `${lineTwo[1]} ${lineTwo[2]}`, reason: "line trim area", skillTags: ["word-deletion"] },
          { text: `${lineThree.at(-1)}.`, reason: "final line punctuation", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "missing-capitalization", skillTags: ["capitalization"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
          { type: "extra-word", skillTags: ["word-deletion"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
          { type: "missing-period", skillTags: ["punctuation-insertion"] },
        ],
      };
    },
  },
];

export function generateTargetChallenges(count: number, seed: string, options: TargetChallengeOptions = {}): Challenge[] {
  const difficulty = options.difficulty ?? "standard";
  return Array.from({ length: count }, (_, index) => {
    const recipeSeed = `${seed}:target:${difficulty}:${options.skillPack ?? "all"}:${index + 1}`;
    const recipe = generateWithRetry(
      recipeSeed,
      (rng) => buildTargetRecipe(rng, difficulty, options.skillPack),
      () => fallbackTargetRecipe(difficulty),
    );
    return recipeToChallenge(recipe, seed, index);
  });
}

export function filterTargetTemplates(options: TargetChallengeOptions = {}): TargetRecipeFactory[] {
  return filterFactories(options.difficulty ?? "standard", options.skillPack);
}

function buildTargetRecipe(rng: GeneratorRng, difficulty: Difficulty, skillPack?: SkillPack): GeneratedRecipe {
  const factories = filterFactories(difficulty, skillPack);
  return rng.pick(factories).build(rng.fork("target-recipe"), difficulty);
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
