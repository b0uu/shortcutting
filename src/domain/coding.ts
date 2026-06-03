import type { Challenge, Difficulty, SkillPack } from "./types";
import {
  attentionRanges,
  createRng,
  generateWithRetry,
  qualityIssues,
  wordPools,
  type GeneratedRecipe,
  type GeneratorRng,
} from "./generator";

type PythonRecipeFactory = {
  id: string;
  difficulties: Difficulty[];
  skillPacks: SkillPack[];
  build: (rng: GeneratorRng, difficulty: Difficulty) => GeneratedRecipe;
};

const pythonFactories: PythonRecipeFactory[] = [
  {
    id: "assignment-spacing",
    difficulties: ["standard", "multiline"],
    skillPacks: ["code-cleanup"],
    build: (rng, difficulty) => {
      const name = identifier(rng);
      const value = rng.pick(wordPools.values);
      const line = `${name} = ${value}`;
      const recipe = pythonRecipe(line, `${name}=${value}`, difficulty, ["code-cleanup"], {
        path: ["jump to assignment operator", "add spaces around equals"],
        attention: [{ text: " = ", reason: "operator spacing", skillTags: ["whitespace-correction"] }],
        errors: [{ type: "missing-space", skillTags: ["whitespace-correction"] }],
      });
      if (difficulty !== "multiline") return recipe;
      return {
        ...recipe,
        targetText: `${line}\nreturn ${name}`,
        editableText: `${name}=${value}\nreturn ${name}`,
        skillPacks: ["code-cleanup", "indentation"],
        intendedShortcutPath: ["jump to assignment operator", "add spaces around equals", "move to return line"],
        attention: [
          { text: line, reason: "assignment spacing", skillTags: ["whitespace-correction"] },
          { text: `return ${name}`, reason: "return line", skillTags: ["line-navigation"] },
        ],
      };
    },
  },
  {
    id: "string-quotes",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup", "string-cleanup", "selection-practice"],
    build: (rng) => {
      const name = identifier(rng);
      const value = rng.pick(["ready", "saved", "done", "open"]);
      return pythonRecipe(`${name} = "${value}"`, `${name} = ${value}`, "standard", ["code-cleanup", "string-cleanup", "selection-practice"], {
        path: ["select bare value", "wrap selected value with quotes"],
        attention: [{ text: `"${value}"`, reason: "string quote target", skillTags: ["punctuation-insertion", "selection"] }],
        errors: [{ type: "missing-character", skillTags: ["punctuation-insertion", "selection"] }],
      });
    },
  },
  {
    id: "call-parentheses",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup", "argument-cleanup"],
    build: (rng) => {
      const receiver = identifier(rng);
      const method = rng.pick(wordPools.methods);
      const arg = identifier(rng);
      return pythonRecipe(`${receiver}.${method}(${arg})`, `${receiver}.${method} ${arg}`, "standard", ["code-cleanup", "argument-cleanup"], {
        path: ["jump to argument", "wrap argument in parentheses"],
        attention: [{ text: `${method}(${arg})`, reason: "method call argument", skillTags: ["punctuation-insertion", "selection"] }],
        errors: [{ type: "missing-character", skillTags: ["punctuation-insertion", "selection"] }],
      });
    },
  },
  {
    id: "rename",
    difficulties: ["advanced"],
    skillPacks: ["code-refactor-micro-edits", "rename", "simple-refactor"],
    build: (rng) => {
      const from = identifier(rng);
      const to = `is_${from}`;
      const other = identifier(rng);
      return pythonRecipe(`if ${to} and ${other}:\n    return ${other}`, `if ${from} and ${other}:\n    return ${other}`, "advanced", ["code-refactor-micro-edits", "rename", "simple-refactor"], {
        path: ["select short name", "replace with predicate name", "verify indented return"],
        attention: [
          { text: to, reason: "rename target", skillTags: ["replacement"] },
          { text: `return ${other}`, reason: "preserve return line", skillTags: ["line-navigation"] },
        ],
        errors: [{ type: "wrong-word", skillTags: ["replacement"] }],
      });
    },
  },
  {
    id: "boolean-not",
    difficulties: ["advanced"],
    skillPacks: ["code-refactor-micro-edits", "boolean-cleanup", "simple-refactor"],
    build: (rng) => {
      const left = identifier(rng);
      const right = identifier(rng);
      return pythonRecipe(`${left} = active and not ${right}`, `${left} = active and ${right}`, "advanced", ["code-refactor-micro-edits", "boolean-cleanup", "simple-refactor"], {
        path: ["jump to second boolean term", "insert not before term"],
        attention: [{ text: `and not ${right}`, reason: "boolean cleanup target", skillTags: ["replacement"] }],
        errors: [{ type: "missing-word", skillTags: ["replacement"] }],
      });
    },
  },
  {
    id: "colon-indent",
    difficulties: ["multiline"],
    skillPacks: ["indentation", "code-cleanup", "argument-cleanup"],
    build: (rng) => {
      const item = identifier(rng);
      const items = `${item}s`;
      return pythonRecipe(`for ${item} in ${items}:\n    print(${item})`, `for ${item} in ${items}\nprint ${item}`, "multiline", ["indentation", "code-cleanup", "argument-cleanup"], {
        path: ["jump to loop header end", "insert colon", "indent second line", "wrap print argument in parentheses"],
        attention: [
          { text: `${items}:`, reason: "loop header colon", skillTags: ["punctuation-insertion"] },
          { text: `    print(${item})`, reason: "indentation and argument parentheses", skillTags: ["whitespace-correction", "punctuation-insertion", "selection"] },
        ],
        errors: [
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
          { type: "missing-space", skillTags: ["whitespace-correction"] },
          { type: "missing-character", skillTags: ["punctuation-insertion", "selection"] },
        ],
      });
    },
  },
];

export function generatePythonChallenges(
  count: number,
  seed: string,
  difficulty: Difficulty = "standard",
  skillPack?: SkillPack,
): Challenge[] {
  const hasFocusedPack = skillPack ? pythonFactories.some((factory) => factory.difficulties.includes(difficulty) && factory.skillPacks.includes(skillPack)) : false;
  const seedSkillPack = hasFocusedPack ? skillPack : undefined;
  return Array.from({ length: count }, (_, index) => {
    const recipeSeed = `${seed}:python:${difficulty}:${seedSkillPack ?? "all"}:${index + 1}`;
    const recipe = generateWithRetry(
      recipeSeed,
      (rng) => buildPythonRecipe(rng, difficulty, seedSkillPack),
      () => fallbackPythonRecipe(difficulty),
    );
    return recipeToChallenge(recipe, seed, index);
  });
}

export function filterPythonTemplates(difficulty: Difficulty, skillPack?: SkillPack): PythonRecipeFactory[] {
  return filterPythonFactories(difficulty, skillPack);
}

function buildPythonRecipe(rng: GeneratorRng, difficulty: Difficulty, skillPack?: SkillPack): GeneratedRecipe {
  const factories = filterPythonFactories(difficulty, skillPack);
  return rng.pick(factories).build(rng.fork("python-recipe"), difficulty);
}

function filterPythonFactories(difficulty: Difficulty, skillPack?: SkillPack): PythonRecipeFactory[] {
  const matches = pythonFactories.filter((factory) => {
    const difficultyMatches = factory.difficulties.includes(difficulty);
    const skillMatches = !skillPack || factory.skillPacks.includes(skillPack);
    return difficultyMatches && skillMatches;
  });
  if (matches.length > 0) return matches;
  return pythonFactories.filter((factory) => factory.difficulties.includes(difficulty));
}

function pythonRecipe(
  targetText: string,
  editableText: string,
  difficulty: Difficulty,
  skillPacks: SkillPack[],
  options: Pick<GeneratedRecipe, "attention" | "errors"> & { path: string[] },
): GeneratedRecipe {
  return {
    targetText,
    editableText,
    difficulty,
    skillPacks,
    intendedShortcutPath: options.path,
    attention: options.attention,
    errors: options.errors,
  };
}

function fallbackPythonRecipe(difficulty: Difficulty): GeneratedRecipe {
  if (difficulty === "multiline") {
    return pythonFactories.find((factory) => factory.id === "colon-indent")!.build(createRng("fallback-python"), "multiline");
  }
  return pythonRecipe("count = 1", "count=1", difficulty, ["code-cleanup"], {
    path: ["jump to assignment operator", "add spaces around equals"],
    attention: [{ text: " = ", reason: "operator spacing", skillTags: ["whitespace-correction"] }],
    errors: [{ type: "missing-space", skillTags: ["whitespace-correction"] }],
  });
}

function recipeToChallenge(recipe: GeneratedRecipe, seed: string, index: number): Challenge {
  return {
    id: `python-${seed}-${index + 1}`,
    seed: `${seed}:python:${index + 1}`,
    mode: "coding",
    prompt: "Edit the Python snippet.",
    targetText: recipe.targetText,
    editableText: recipe.editableText,
    errors: recipe.errors.map((error, errorIndex) => ({
      id: `py-err-${index + 1}-${errorIndex + 1}`,
      ...error,
    })),
    skillPacks: recipe.skillPacks,
    intendedShortcutPath: recipe.intendedShortcutPath,
    attentionRanges: attentionRanges(recipe.targetText, recipe.attention),
    difficulty: recipe.difficulty,
    estimatedCorrections: recipe.errors.length,
  };
}

function identifier(rng: GeneratorRng): string {
  return rng.pick(wordPools.identifierSafe);
}

export function pythonRecipeQualityIssues(recipe: GeneratedRecipe) {
  return qualityIssues(recipe);
}
