export type Mode = "target-match" | "drill" | "coding";
export type Difficulty = "standard" | "advanced" | "multiline";
export type Platform = "mac" | "windows-linux";
export type PlatformPreference = "auto" | Platform;
export type MousePolicy = "keyboard-only" | "mouse-allowed";
export type Theme = "dark" | "light" | "custom";

export type ThemeColors = {
  background: string;
  panel: string;
  card: string;
  text: string;
  mutedText: string;
  accent: string;
  success: string;
  error: string;
  focus: string;
};

export type SkillTag =
  | "word-navigation"
  | "character-navigation"
  | "line-navigation"
  | "word-deletion"
  | "character-deletion"
  | "selection"
  | "replacement"
  | "punctuation-insertion"
  | "apostrophe-insertion"
  | "capitalization"
  | "whitespace-correction"
  | "newline-correction"
  | "cut-paste-reorder"
  | "mouse-free-editing";

export type SkillPack =
  | "word-movement"
  | "deletion-cleanup"
  | "punctuation-casing"
  | "line-reshaping"
  | "code-cleanup"
  | "code-refactor-micro-edits"
  | "indentation"
  | "rename"
  | "boolean-cleanup"
  | "argument-cleanup"
  | "string-cleanup"
  | "simple-refactor"
  | "selection-practice";

export type ChallengeErrorType =
  | "extra-word"
  | "missing-word"
  | "wrong-word"
  | "missing-comma"
  | "missing-period"
  | "missing-apostrophe"
  | "missing-capitalization"
  | "double-space"
  | "missing-space"
  | "extra-character"
  | "missing-character"
  | "extra-newline"
  | "missing-newline"
  | "wrong-word-order"
  | "wrong-character-order";

export type SelectionState = {
  start: number;
  end: number;
};

export type ChallengeError = {
  id: string;
  type: ChallengeErrorType;
  skillTags: SkillTag[];
};

export type AttentionRange = {
  start: number;
  end: number;
  reason: string;
  skillTags: SkillTag[];
};

export type DrillValidation =
  | { type: "text"; expectedText: string }
  | { type: "cursor"; expectedIndex: number }
  | { type: "selection"; expectedStart: number; expectedEnd: number }
  | { type: "text+cursor"; expectedText: string; expectedIndex: number };

export type DrillDefinition = {
  id: string;
  instruction: string;
  hintByPlatform: Record<Platform, string>;
  validation: DrillValidation;
  initialSelection?: SelectionState;
};

export type Challenge = {
  id: string;
  seed: string;
  mode: Mode;
  prompt: string;
  targetText: string;
  editableText: string;
  errors: ChallengeError[];
  skillPacks: SkillPack[];
  intendedShortcutPath: string[];
  attentionRanges: AttentionRange[];
  difficulty: Difficulty;
  estimatedCorrections: number;
  drill?: DrillDefinition;
};

export type TestConfig = {
  mode: Mode;
  challengeCount: 3 | 4;
  platformPreference: PlatformPreference;
  platform: Platform;
  mousePolicy: MousePolicy;
  difficulty: Difficulty;
  soundEnabled: boolean;
  theme: Theme;
  customTheme: ThemeColors;
  codingLanguage: "python";
  smartPairs: boolean;
  reducedMotion: boolean;
  seedPack: string;
  practiceSkillPack?: SkillPack | null;
};

export type EditEventType =
  | "keydown"
  | "input"
  | "selectionchange"
  | "mouse"
  | "clipboard"
  | "hint";

export type EditEvent = {
  id: string;
  timestamp: number;
  challengeId: string;
  type: EditEventType;
  key?: string;
  code?: string;
  modifiers?: {
    meta: boolean;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  };
  textBefore?: string;
  textAfter?: string;
  selectionBefore?: SelectionState;
  selectionAfter?: SelectionState;
};

export type ChallengeResult = {
  challengeId: string;
  mode: Mode;
  beforeText: string;
  targetText: string;
  finalText: string;
  elapsedMs: number;
  skillTags: SkillTag[];
  skillPacks: SkillPack[];
  estimatedCorrections: number;
  hintsUsed: number;
  mouseActions: number;
  keystrokes: number;
  clipboardActions: number;
  undoCount: number;
  redoCount: number;
};

export type SkillCategorySummary = {
  tag: SkillTag;
  count: number;
  averageElapsedMs: number;
};

export type PracticeSuggestion = {
  mode: Mode;
  difficulty: Difficulty;
  seedPack: string;
  skillPack: SkillPack | null;
  skillTag: SkillTag | null;
  label: string;
  rationale: string;
};

export type TestResult = {
  id: string;
  config: TestConfig;
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  challengeResults: ChallengeResult[];
  totalKeystrokes: number;
  hintsUsed: number;
  mouseActions: number;
  clipboardActions: number;
  undoCount: number;
  redoCount: number;
  editsPerMinute: number;
  estimatedCorrectionCount: number;
  skillTagSummary: Partial<Record<SkillTag, number>>;
  skillPackSummary: Partial<Record<SkillPack, number>>;
  hintSkillSummary: Partial<Record<SkillTag, number>>;
  bestSkillCategory: SkillCategorySummary | null;
  slowestSkillCategory: SkillCategorySummary | null;
  nextPracticeSuggestion: PracticeSuggestion;
  isPersonalBest: boolean;
  shareChallengeId: string;
};

export type PersonalBestKey = {
  mode: Mode;
  challengeCount: 3 | 4;
  platform: Platform;
  mousePolicy: MousePolicy;
  difficulty: Difficulty;
  seedPack: string;
};
