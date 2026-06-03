import type {
  ChallengeErrorType,
  Difficulty,
  SkillPack,
  SkillTag,
} from "./types";

export type GeneratorRng = {
  seed: string;
  next(): number;
  int(max: number): number;
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  weighted<T>(items: ReadonlyArray<{ value: T; weight: number }>): T;
  fork(label: string): GeneratorRng;
};

export type GeneratedRecipe = {
  targetText: string;
  editableText: string;
  difficulty: Difficulty;
  skillPacks: SkillPack[];
  intendedShortcutPath: string[];
  attention: Array<{ text: string; reason: string; skillTags: SkillTag[] }>;
  errors: Array<{ type: ChallengeErrorType; skillTags: SkillTag[] }>;
};

export type QualityIssue =
  | "same-text"
  | "missing-metadata"
  | "missing-attention-anchor"
  | "bad-target-whitespace"
  | "bad-editable-whitespace"
  | "too-long"
  | "duplicate-punctuation";

export const wordPools = {
  tiny: ["air", "all", "arc", "ash", "bit", "box", "day", "dot", "end", "fit", "fog", "map", "now", "old", "red", "run", "sun", "top"],
  short: ["able", "back", "calm", "clear", "cold", "deep", "fast", "fine", "flat", "good", "kind", "late", "light", "plain", "quick", "safe", "sharp", "small", "soft", "wide"],
  medium: ["anchor", "branch", "bright", "circle", "garden", "little", "market", "middle", "orange", "pocket", "silver", "steady", "summer", "window"],
  repeatedSafe: ["blue", "clear", "fast", "green", "light", "plain", "quick", "red", "safe", "soft"],
  punctuationSafe: ["after", "before", "between", "early", "later", "near", "next", "often", "soon", "then"],
  identifierSafe: ["count", "item", "items", "limit", "name", "score", "status", "total", "user", "value"],
  values: ["0", "1", "10", "True", "False", "\"ok\"", "\"ready\"", "\"saved\""],
  methods: ["append", "extend", "lower", "strip", "upper"],
} as const;

export function createRng(seed: string): GeneratorRng {
  let state = hashSeed(seed) || 0x9e3779b9;
  const rng: GeneratorRng = {
    seed,
    next() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    },
    int(max: number) {
      if (max <= 0) return 0;
      return Math.floor(rng.next() * max);
    },
    range(min: number, max: number) {
      return min + rng.int(max - min + 1);
    },
    chance(probability: number) {
      return rng.next() < probability;
    },
    pick<T>(items: readonly T[]) {
      return items[rng.int(items.length)];
    },
    shuffle<T>(items: readonly T[]) {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = rng.int(index + 1);
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
      }
      return result;
    },
    weighted<T>(items: ReadonlyArray<{ value: T; weight: number }>) {
      const total = items.reduce((sum, item) => sum + item.weight, 0);
      let cursor = rng.next() * total;
      for (const item of items) {
        cursor -= item.weight;
        if (cursor <= 0) return item.value;
      }
      return items[items.length - 1].value;
    },
    fork(label: string) {
      return createRng(`${seed}:${label}:${Math.floor(rng.next() * 1_000_000_000)}`);
    },
  };
  return rng;
}

export function uniqueWords(rng: GeneratorRng, count: number, pools: readonly (readonly string[])[] = [wordPools.short, wordPools.medium]): string[] {
  const source = rng.shuffle(pools.flat());
  return source.slice(0, count);
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function sentence(words: string[], options: { capitalizeFirst?: boolean; period?: boolean } = {}): string {
  const text = words.join(" ");
  const cased = options.capitalizeFirst ? capitalize(text) : text;
  return options.period === false ? cased : `${cased}.`;
}

export function attentionRanges(
  text: string,
  attention: GeneratedRecipe["attention"],
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

export function qualityIssues(recipe: GeneratedRecipe): QualityIssue[] {
  const issues: QualityIssue[] = [];
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
  if (/\s{2,}/.test(recipe.targetText) || / [,.]/.test(recipe.targetText) || /^\s|\s$/.test(recipe.targetText)) {
    issues.push("bad-target-whitespace");
  }
  if (/\s{3,}/.test(recipe.editableText) || /^\s|\s$/.test(recipe.editableText)) {
    issues.push("bad-editable-whitespace");
  }
  if (recipe.targetText.split("\n").some((line) => line.length > 78) || recipe.editableText.split("\n").some((line) => line.length > 78)) {
    issues.push("too-long");
  }
  if (/[,.]{2,}/.test(recipe.targetText) || /[,.]{2,}/.test(recipe.editableText)) {
    issues.push("duplicate-punctuation");
  }
  return issues;
}

export function generateWithRetry(
  seed: string,
  build: (rng: GeneratorRng, attempt: number) => GeneratedRecipe,
  fallback: () => GeneratedRecipe,
  maxAttempts = 16,
): GeneratedRecipe {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const recipe = build(createRng(`${seed}:attempt:${attempt}`), attempt);
    if (qualityIssues(recipe).length === 0) return recipe;
  }
  return fallback();
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
