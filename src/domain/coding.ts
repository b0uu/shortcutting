import type { Challenge, Difficulty, SkillPack } from "./types";
import {
  attentionRanges,
  createRng,
  type GeneratedRecipe,
  type GeneratorRng,
} from "./generator";

type PythonRecipeFactory = {
  id: string;
  difficulties: Difficulty[];
  skillPacks: SkillPack[];
  weight: number;
  build: (rng: GeneratorRng, difficulty: Difficulty) => GeneratedRecipe;
};

type PythonQualityIssue =
  | "same-text"
  | "missing-metadata"
  | "missing-attention-anchor"
  | "bad-target-whitespace"
  | "bad-editable-whitespace"
  | "too-long"
  | "duplicate-punctuation"
  | "unbalanced-delimiters"
  | "invalid-block-shape"
  | "invalid-indentation"
  | "dangling-operator"
  | "non-python-surface"
  | "awkward-standard"
  | "too-many-corrections"
  | "no-shortcut-advantage";

const pythonPools = {
  identifiers: ["count", "item", "limit", "name", "score", "status", "total", "user", "value"],
  flags: ["active", "ready", "saved", "valid", "visible"],
  values: ["0", "1", "10", "True", "False", "\"ok\"", "\"ready\"", "\"skip\""],
  bareStrings: ["ok", "ready", "saved", "skip", "open"],
  functions: ["clean", "format", "load", "save", "score", "trim"],
  collections: ["items", "names", "scores", "users", "values"],
  methods: ["append", "lower", "strip", "upper"],
  args: ["item", "name", "score", "text", "value"],
} as const;

const pythonFactories: PythonRecipeFactory[] = [
  {
    id: "standard-assignment-spacing",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup"],
    weight: 3,
    build: (rng) => {
      const name = identifier(rng);
      const value = valueLiteral(rng);
      return pythonRecipe(`${name} = ${value}`, `${name}=${value}`, "standard", ["code-cleanup"], {
        path: ["jump to assignment operator", "add spaces around equals"],
        attention: [{ text: " = ", reason: "operator spacing", skillTags: ["whitespace-correction"] }],
        errors: [{ type: "missing-space", skillTags: ["whitespace-correction"] }],
      });
    },
  },
  {
    id: "standard-string-quotes",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup", "string-cleanup", "selection-practice"],
    weight: 3,
    build: (rng) => {
      const name = identifier(rng);
      const value = bareString(rng);
      return pythonRecipe(`${name} = "${value}"`, `${name} = ${value}`, "standard", ["code-cleanup", "string-cleanup", "selection-practice"], {
        path: ["select bare value", "wrap selection with quotes"],
        attention: [{ text: `"${value}"`, reason: "string quote target", skillTags: ["punctuation-insertion", "selection"] }],
        errors: [{ type: "missing-character", skillTags: ["punctuation-insertion", "selection"] }],
      });
    },
  },
  {
    id: "standard-call-parentheses",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup", "argument-cleanup", "selection-practice"],
    weight: 3,
    build: (rng) => {
      const fn = functionName(rng);
      const arg = distinct(rng, pythonPools.args, [fn]);
      return pythonRecipe(`${fn}(${arg})`, `${fn} ${arg}`, "standard", ["code-cleanup", "argument-cleanup", "selection-practice"], {
        path: ["jump to argument", "wrap argument in parentheses"],
        attention: [{ text: `(${arg})`, reason: "argument wrap target", skillTags: ["punctuation-insertion", "selection"] }],
        errors: [{ type: "missing-character", skillTags: ["punctuation-insertion", "selection"] }],
      });
    },
  },
  {
    id: "standard-call-comma",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup", "argument-cleanup"],
    weight: 2,
    build: (rng) => {
      const fn = functionName(rng);
      const first = shortArg(rng);
      const second = distinct(rng, pythonPools.args, [first]);
      return pythonRecipe(`${fn}(${first}, ${second})`, `${fn}(${first} ${second})`, "standard", ["code-cleanup", "argument-cleanup"], {
        path: ["jump between arguments", "insert comma and space"],
        attention: [{ text: `${first}, ${second}`, reason: "argument separator", skillTags: ["punctuation-insertion", "whitespace-correction"] }],
        errors: [{ type: "missing-comma", skillTags: ["punctuation-insertion", "whitespace-correction"] }],
      });
    },
  },
  {
    id: "standard-boolean-not",
    difficulties: ["standard"],
    skillPacks: ["code-refactor-micro-edits", "boolean-cleanup", "simple-refactor"],
    weight: 2,
    build: (rng) => {
      const name = identifier(rng);
      const flag = flagName(rng);
      return pythonRecipe(`${name} = not ${flag}`, `${name} = ${flag}`, "standard", ["code-refactor-micro-edits", "boolean-cleanup", "simple-refactor"], {
        path: ["jump before flag", "insert not"],
        attention: [{ text: `not ${flag}`, reason: "boolean negation target", skillTags: ["replacement"] }],
        errors: [{ type: "missing-word", skillTags: ["replacement"] }],
      });
    },
  },
  {
    id: "standard-if-colon",
    difficulties: ["standard"],
    skillPacks: ["code-cleanup", "punctuation-casing"],
    weight: 2,
    build: (rng) => {
      const flag = flagName(rng);
      const value = identifier(rng);
      return pythonRecipe(`if ${flag}: return ${value}`, `if ${flag} return ${value}`, "standard", ["code-cleanup", "punctuation-casing"], {
        path: ["jump to condition end", "insert colon before return"],
        attention: [{ text: `${flag}:`, reason: "inline condition colon", skillTags: ["punctuation-insertion"] }],
        errors: [{ type: "missing-character", skillTags: ["punctuation-insertion"] }],
      });
    },
  },
  {
    id: "advanced-rename-not",
    difficulties: ["advanced"],
    skillPacks: ["code-refactor-micro-edits", "rename", "boolean-cleanup", "simple-refactor"],
    weight: 3,
    build: (rng) => {
      const flag = flagName(rng);
      const other = distinct(rng, pythonPools.flags, [flag]);
      const renamed = `is_${flag}`;
      return pythonRecipe(`if ${renamed} and not ${other}:\n    print(${other})`, `if ${flag} and ${other}:\n    print(${other})`, "advanced", ["code-refactor-micro-edits", "rename", "boolean-cleanup", "simple-refactor"], {
        path: ["select flag name", "replace with predicate name", "jump before second flag", "insert not"],
        attention: [
          { text: renamed, reason: "predicate rename target", skillTags: ["replacement"] },
          { text: `not ${other}`, reason: "boolean negation target", skillTags: ["replacement"] },
        ],
        errors: [
          { type: "wrong-word", skillTags: ["replacement"] },
          { type: "missing-word", skillTags: ["replacement"] },
        ],
      });
    },
  },
  {
    id: "advanced-call-and-assignment",
    difficulties: ["advanced"],
    skillPacks: ["code-cleanup", "argument-cleanup"],
    weight: 3,
    build: (rng) => {
      const items = collectionName(rng);
      const arg = shortArg(rng);
      const total = distinct(rng, pythonPools.identifiers, [arg]);
      return pythonRecipe(`${items}.append(${arg})\n${total} = len(${items})`, `${items}.append ${arg}\n${total}=len(${items})`, "advanced", ["code-cleanup", "argument-cleanup"], {
        path: ["wrap append argument", "move to assignment", "space equals"],
        attention: [
          { text: `append(${arg})`, reason: "method argument wrap", skillTags: ["punctuation-insertion", "selection"] },
          { text: `${total} = `, reason: "assignment spacing", skillTags: ["whitespace-correction"] },
        ],
        errors: [
          { type: "missing-character", skillTags: ["punctuation-insertion", "selection"] },
          { type: "missing-space", skillTags: ["whitespace-correction"] },
        ],
      });
    },
  },
  {
    id: "advanced-string-method",
    difficulties: ["advanced"],
    skillPacks: ["code-cleanup", "string-cleanup", "argument-cleanup", "selection-practice"],
    weight: 2,
    build: (rng) => {
      const name = identifier(rng);
      const value = bareString(rng);
      const method = rng.pick(["strip", "lower", "upper"]);
      return pythonRecipe(`${name} = "${value}".${method}()`, `${name}=${value}.${method}`, "advanced", ["code-cleanup", "string-cleanup", "argument-cleanup", "selection-practice"], {
        path: ["space equals", "select bare string", "wrap with quotes", "add call parentheses"],
        attention: [
          { text: `"${value}"`, reason: "string quote target", skillTags: ["punctuation-insertion", "selection"] },
          { text: `${method}()`, reason: "method call parentheses", skillTags: ["punctuation-insertion"] },
        ],
        errors: [
          { type: "missing-space", skillTags: ["whitespace-correction"] },
          { type: "missing-character", skillTags: ["punctuation-insertion", "selection"] },
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
        ],
      });
    },
  },
  {
    id: "advanced-condition-cleanup",
    difficulties: ["advanced"],
    skillPacks: ["code-cleanup", "indentation", "simple-refactor"],
    weight: 2,
    build: (rng) => {
      const count = distinct(rng, pythonPools.identifiers, []);
      const limit = distinct(rng, pythonPools.identifiers, [count]);
      return pythonRecipe(`if ${count} > ${limit}:\n    print(${count})`, `if ${count}>${limit}\nprint(${count})`, "advanced", ["code-cleanup", "indentation", "simple-refactor"], {
        path: ["space comparison", "insert colon", "indent print line"],
        attention: [
          { text: `${count} > ${limit}:`, reason: "condition spacing and colon", skillTags: ["whitespace-correction", "punctuation-insertion"] },
          { text: `    print(${count})`, reason: "print indentation", skillTags: ["whitespace-correction", "line-navigation"] },
        ],
        errors: [
          { type: "missing-space", skillTags: ["whitespace-correction"] },
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
          { type: "missing-space", skillTags: ["whitespace-correction", "line-navigation"] },
        ],
      });
    },
  },
  {
    id: "multiline-function-return",
    difficulties: ["multiline"],
    skillPacks: ["indentation", "code-cleanup", "argument-cleanup"],
    weight: 3,
    build: (rng) => {
      const fn = functionName(rng);
      const arg = shortArg(rng);
      return pythonRecipe(`def ${fn}(${arg}):\n    return ${arg}`, `def ${fn} ${arg}\nreturn ${arg}`, "multiline", ["indentation", "code-cleanup", "argument-cleanup"], {
        path: ["wrap parameter", "insert colon", "indent return line"],
        attention: [
          { text: `${fn}(${arg}):`, reason: "function parameter and colon", skillTags: ["punctuation-insertion", "selection"] },
          { text: `    return ${arg}`, reason: "return indentation", skillTags: ["whitespace-correction", "line-navigation"] },
        ],
        errors: [
          { type: "missing-character", skillTags: ["punctuation-insertion", "selection"] },
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
          { type: "missing-space", skillTags: ["whitespace-correction", "line-navigation"] },
        ],
      });
    },
  },
  {
    id: "multiline-if-return",
    difficulties: ["multiline"],
    skillPacks: ["indentation", "boolean-cleanup", "simple-refactor"],
    weight: 3,
    build: (rng) => {
      const fn = functionName(rng);
      const flag = flagName(rng);
      const value = identifier(rng);
      return pythonRecipe(`def ${fn}(${value}):\n    if not ${flag}:\n        return "skip"\n    return ${value}`, `def ${fn}(${value}):\n    if ${flag}\n    return "skip"\nreturn ${value}`, "multiline", ["indentation", "boolean-cleanup", "simple-refactor"], {
        path: ["insert not", "add colon", "indent guard return", "restore final return indent"],
        attention: [
          { text: `not ${flag}:`, reason: "guard condition target", skillTags: ["replacement", "punctuation-insertion"] },
          { text: "        return \"skip\"", reason: "guard return indentation", skillTags: ["whitespace-correction", "line-navigation"] },
          { text: `    return ${value}`, reason: "final return indentation", skillTags: ["whitespace-correction", "line-navigation"] },
        ],
        errors: [
          { type: "missing-word", skillTags: ["replacement"] },
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
          { type: "missing-space", skillTags: ["whitespace-correction", "line-navigation"] },
          { type: "extra-character", skillTags: ["whitespace-correction", "line-navigation"] },
        ],
      });
    },
  },
  {
    id: "multiline-loop-print",
    difficulties: ["multiline"],
    skillPacks: ["indentation", "code-cleanup", "argument-cleanup"],
    weight: 3,
    build: (rng) => {
      const item = shortArg(rng);
      const items = collectionName(rng);
      return pythonRecipe(`for ${item} in ${items}:\n    print(${item})`, `for ${item} in ${items}\nprint ${item}`, "multiline", ["indentation", "code-cleanup", "argument-cleanup"], {
        path: ["jump to loop header end", "insert colon", "indent print line", "wrap print argument"],
        attention: [
          { text: `${items}:`, reason: "loop header colon", skillTags: ["punctuation-insertion"] },
          { text: `    print(${item})`, reason: "print indentation and argument wrap", skillTags: ["whitespace-correction", "punctuation-insertion", "selection"] },
        ],
        errors: [
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
          { type: "missing-space", skillTags: ["whitespace-correction", "line-navigation"] },
          { type: "missing-character", skillTags: ["punctuation-insertion", "selection"] },
        ],
      });
    },
  },
  {
    id: "multiline-accumulator",
    difficulties: ["multiline"],
    skillPacks: ["indentation", "code-cleanup", "simple-refactor"],
    weight: 2,
    build: (rng) => {
      const item = shortArg(rng);
      const items = collectionName(rng);
      return pythonRecipe(`total = 0\nfor ${item} in ${items}:\n    total += ${item}\nprint(total)`, `total=0\nfor ${item} in ${items}\ntotal += ${item}\nprint total`, "multiline", ["indentation", "code-cleanup", "simple-refactor", "argument-cleanup"], {
        path: ["space initial assignment", "insert loop colon", "indent accumulator line", "wrap print argument"],
        attention: [
          { text: "total = 0", reason: "initial assignment spacing", skillTags: ["whitespace-correction"] },
          { text: `${items}:`, reason: "loop header colon", skillTags: ["punctuation-insertion"] },
          { text: `    total += ${item}`, reason: "accumulator indentation", skillTags: ["whitespace-correction", "line-navigation"] },
          { text: "print(total)", reason: "print argument wrap", skillTags: ["punctuation-insertion", "selection"] },
        ],
        errors: [
          { type: "missing-space", skillTags: ["whitespace-correction"] },
          { type: "missing-character", skillTags: ["punctuation-insertion"] },
          { type: "missing-space", skillTags: ["whitespace-correction", "line-navigation"] },
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
  const usedRecipeIds = new Set<string>();

  return Array.from({ length: count }, (_, index) => {
    const recipeSeed = `${seed}:python:${difficulty}:${seedSkillPack ?? "all"}:${index + 1}`;
    const recipe = generatePythonRecipeWithRetry(
      recipeSeed,
      (rng) => buildPythonRecipe(rng, difficulty, seedSkillPack, usedRecipeIds),
      () => fallbackPythonRecipe(difficulty),
    );
    if (recipe.id) usedRecipeIds.add(recipe.id);
    return recipeToChallenge(recipe, seed, index);
  });
}

export function filterPythonTemplates(difficulty: Difficulty, skillPack?: SkillPack): PythonRecipeFactory[] {
  return filterPythonFactories(difficulty, skillPack);
}

function buildPythonRecipe(rng: GeneratorRng, difficulty: Difficulty, skillPack: SkillPack | undefined, usedRecipeIds: Set<string>): GeneratedRecipe & { id?: string } {
  const factories = filterPythonFactories(difficulty, skillPack);
  const available = factories.filter((factory) => !usedRecipeIds.has(factory.id));
  const pool = available.length > 0 ? available : factories;
  const factory = rng.weighted(pool.map((item) => ({ value: item, weight: item.weight })));
  return {
    ...factory.build(rng.fork(factory.id), difficulty),
    id: factory.id,
  };
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

function generatePythonRecipeWithRetry(
  seed: string,
  build: (rng: GeneratorRng, attempt: number) => GeneratedRecipe & { id?: string },
  fallback: () => GeneratedRecipe & { id?: string },
  maxAttempts = 20,
): GeneratedRecipe & { id?: string } {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const recipe = build(createRng(`${seed}:attempt:${attempt}`), attempt);
    if (pythonRecipeQualityIssues(recipe).length === 0) return recipe;
  }
  return fallback();
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

function fallbackPythonRecipe(difficulty: Difficulty): GeneratedRecipe & { id: string } {
  if (difficulty === "multiline") {
    return {
      ...pythonFactories.find((factory) => factory.id === "multiline-loop-print")!.build(createRng("fallback-python"), "multiline"),
      id: "fallback-multiline-loop-print",
    };
  }
  if (difficulty === "advanced") {
    return {
      ...pythonFactories.find((factory) => factory.id === "advanced-call-and-assignment")!.build(createRng("fallback-python"), "advanced"),
      id: "fallback-advanced-call-and-assignment",
    };
  }
  return {
    ...pythonRecipe("count = 1", "count=1", difficulty, ["code-cleanup"], {
      path: ["jump to assignment operator", "add spaces around equals"],
      attention: [{ text: " = ", reason: "operator spacing", skillTags: ["whitespace-correction"] }],
      errors: [{ type: "missing-space", skillTags: ["whitespace-correction"] }],
    }),
    id: "fallback-standard-assignment-spacing",
  };
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
  return rng.pick(pythonPools.identifiers);
}

function functionName(rng: GeneratorRng): string {
  return rng.pick(pythonPools.functions);
}

function collectionName(rng: GeneratorRng): string {
  return rng.pick(pythonPools.collections);
}

function flagName(rng: GeneratorRng): string {
  return rng.pick(pythonPools.flags);
}

function shortArg(rng: GeneratorRng): string {
  return rng.pick(pythonPools.args);
}

function valueLiteral(rng: GeneratorRng): string {
  return rng.pick(pythonPools.values);
}

function bareString(rng: GeneratorRng): string {
  return rng.pick(pythonPools.bareStrings);
}

function distinct<T extends string>(rng: GeneratorRng, values: readonly T[], blocked: readonly string[]): T {
  const available = values.filter((value) => !blocked.includes(value));
  return rng.pick(available.length > 0 ? available : values);
}

export function pythonRecipeQualityIssues(recipe: GeneratedRecipe): PythonQualityIssue[] {
  const issues: PythonQualityIssue[] = [];
  if (recipe.targetText === recipe.editableText) issues.push("same-text");
  if (
    recipe.skillPacks.length === 0
    || recipe.intendedShortcutPath.length === 0
    || recipe.errors.length === 0
    || recipe.errors.some((error) => error.skillTags.length === 0)
  ) {
    issues.push("missing-metadata");
  }
  if (recipe.attention.length === 0 || recipe.attention.some((item) => !recipe.targetText.includes(item.text))) {
    issues.push("missing-attention-anchor");
  }
  if (hasBadCodeWhitespace(recipe.targetText, true)) issues.push("bad-target-whitespace");
  if (hasBadCodeWhitespace(recipe.editableText, false)) issues.push("bad-editable-whitespace");
  if (hasTooLongCodeLines(recipe)) issues.push("too-long");
  if (/[,.]{2,}/.test(recipe.targetText) || /[,.]{2,}/.test(recipe.editableText)) issues.push("duplicate-punctuation");
  if (!hasBalancedDelimiters(recipe.targetText)) issues.push("unbalanced-delimiters");
  if (!hasValidBlockShape(recipe.targetText)) issues.push("invalid-block-shape");
  if (!hasValidIndentation(recipe.targetText)) issues.push("invalid-indentation");
  if (hasDanglingOperator(recipe.targetText)) issues.push("dangling-operator");
  if (!isPythonSurface(recipe.targetText)) issues.push("non-python-surface");
  if (recipe.difficulty === "standard" && (recipe.targetText.includes("\n") || recipe.targetText.length < 12 || recipe.targetText.length > 42)) issues.push("awkward-standard");
  if (recipe.difficulty === "standard" && recipe.errors.length > 3) issues.push("too-many-corrections");
  if (recipe.intendedShortcutPath.every((step) => !/(jump|select|wrap|replace|indent|insert|space)/i.test(step))) issues.push("no-shortcut-advantage");
  return Array.from(new Set(issues));
}

export function pythonTargetSurfaceIssues(text: string, difficulty: Difficulty): PythonQualityIssue[] {
  const recipe = pythonRecipe(text, `${text}x`, difficulty, ["code-cleanup"], {
    path: ["jump to edit target", "insert correction"],
    attention: [{ text: text.split(/\s+/)[0] ?? text, reason: "surface check", skillTags: ["punctuation-insertion"] }],
    errors: [{ type: "missing-character", skillTags: ["punctuation-insertion"] }],
  });
  return pythonRecipeQualityIssues(recipe).filter((issue) => (
    issue !== "same-text"
    && issue !== "bad-editable-whitespace"
    && issue !== "missing-attention-anchor"
    && issue !== "awkward-standard"
    && issue !== "no-shortcut-advantage"
  ));
}

function hasBadCodeWhitespace(text: string, isTarget: boolean): boolean {
  if (/^\s|\s$/.test(text)) return true;
  if (isTarget && text.split("\n").some((line) => / {2,}/.test(line.trimStart()))) return true;
  if (!isTarget && / {5,}/.test(text)) return true;
  return / [,.]/.test(text);
}

function hasTooLongCodeLines(recipe: GeneratedRecipe): boolean {
  const limit = recipe.difficulty === "standard" ? 42 : 64;
  return [...recipe.targetText.split("\n"), ...recipe.editableText.split("\n")].some((line) => line.length > limit);
}

function hasBalancedDelimiters(text: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  let quote: "\"" | "'" | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if ((char === "\"" || char === "'") && text[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }
    if (quote) continue;
    if (char === "(" || char === "[" || char === "{") stack.push(char);
    if (char === ")" || char === "]" || char === "}") {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  return stack.length === 0 && quote === null;
}

function hasValidBlockShape(text: string): boolean {
  return text.split("\n").every((line) => {
    const trimmed = line.trim();
    if (/^(if|for|def|elif|else)\b/.test(trimmed)) return trimmed.includes(":");
    return true;
  });
}

function hasValidIndentation(text: string): boolean {
  const lines = text.split("\n");
  if (lines.some((line) => {
    const spaces = line.match(/^ */)?.[0].length ?? 0;
    return spaces % 4 !== 0 || spaces > 8;
  })) {
    return false;
  }
  for (let index = 0; index < lines.length - 1; index += 1) {
    const line = lines[index];
    const next = lines[index + 1];
    if (line.trim().endsWith(":")) {
      const spaces = line.match(/^ */)?.[0].length ?? 0;
      const nextSpaces = next.match(/^ */)?.[0].length ?? 0;
      if (nextSpaces <= spaces) return false;
    }
  }
  return true;
}

function hasDanglingOperator(text: string): boolean {
  return text.split("\n").some((line) => /(?:[=+\-*/<>]|\band\b|\bor\b|\bnot\b)$/.test(line.trim()));
}

function isPythonSurface(text: string): boolean {
  if (!/^[A-Za-z0-9_ .,:;+\-*/<>=!()[\]{}"'\n]+$/.test(text)) return false;
  if (text.split("\n").some((line) => line.startsWith("return "))) return false;
  return !/\b(function|const|let|var|=>|===|!==|null|undefined|true|false)\b/.test(text);
}
