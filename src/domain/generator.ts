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

export type RecipeShape =
  | "case-punctuation"
  | "delete-word"
  | "spacing"
  | "replace"
  | "trim"
  | "reorder"
  | "line-cleanup"
  | "character-edit"
  | "wrap"
  | "cursor"
  | "selection"
  | "code-spacing"
  | "code-wrap"
  | "code-rename"
  | "code-boolean"
  | "code-indent"
  | "code-block";

export type RunProfile = {
  index: number;
  count: number;
  role: "opener" | "contrast" | "recovery" | "finale";
  targetDensity: number;
};

export type VarietyFactoryMeta = {
  id: string;
  shape: RecipeShape;
  primarySkill: SkillTag;
  shortcutFamily: string;
  density: number;
  visualShape: "short-line" | "long-line" | "two-line" | "multiline" | "cursor-only";
  weight?: number;
};

export type VarietyLedger = {
  selectedIds: Set<string>;
  previous?: VarietyFactoryMeta;
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

export function chooseVariedFactories<T extends VarietyFactoryMeta>(
  factories: readonly T[],
  count: number,
  seed: string,
): T[] {
  const rng = createRng(seed);
  const ledger: VarietyLedger = { selectedIds: new Set() };
  const selected: T[] = [];

  for (let index = 0; index < count; index += 1) {
    const profile = runProfile(index, count);
    const pool = candidatePool(factories, ledger);
    const factory = rng.weighted(pool.map((item) => ({
      value: item,
      weight: varietyWeight(item, profile, ledger),
    })));
    selected.push(factory);
    ledger.selectedIds.add(factory.id);
    ledger.previous = factory;
  }

  return selected;
}

function runProfile(index: number, count: number): RunProfile {
  if (index === 0) return { index, count, role: "opener", targetDensity: 1 };
  if (index === count - 1) return { index, count, role: "finale", targetDensity: 3 };
  if (count === 4 && index === 2) return { index, count, role: "recovery", targetDensity: 1 };
  return { index, count, role: "contrast", targetDensity: 2 };
}

function candidatePool<T extends VarietyFactoryMeta>(factories: readonly T[], ledger: VarietyLedger): T[] {
  const unused = factories.filter((factory) => !ledger.selectedIds.has(factory.id));
  let pool = unused.length > 0 ? unused : [...factories];
  const previous = ledger.previous;
  if (!previous) return pool;

  pool = preferFiltered(pool, (factory) => factory.id !== previous.id);
  pool = preferFiltered(pool, (factory) => factory.primarySkill !== previous.primarySkill);
  pool = preferFiltered(pool, (factory) => factory.shape !== previous.shape);
  pool = preferFiltered(pool, (factory) => factory.shortcutFamily !== previous.shortcutFamily);
  return pool;
}

function preferFiltered<T>(items: T[], predicate: (item: T) => boolean): T[] {
  const filtered = items.filter(predicate);
  return filtered.length > 0 ? filtered : items;
}

function varietyWeight(factory: VarietyFactoryMeta, profile: RunProfile, ledger: VarietyLedger): number {
  const base = factory.weight ?? 1;
  const densityDistance = Math.abs(factory.density - profile.targetDensity);
  let weight = base * (densityDistance === 0 ? 1.8 : densityDistance === 1 ? 1 : 0.55);

  if (profile.role === "opener" && factory.visualShape === "short-line") weight *= 1.35;
  if (profile.role === "finale" && (factory.visualShape === "multiline" || factory.density >= 3)) weight *= 1.35;
  if (profile.role === "recovery" && factory.density <= 1) weight *= 1.25;
  if (ledger.previous?.visualShape === factory.visualShape) weight *= 0.72;

  return Math.max(0.1, weight);
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
