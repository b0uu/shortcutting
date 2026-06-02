import type { Difficulty, Mode, TestResult } from "@/domain/types";

export type ResultHistoryFilter = {
  mode?: Mode | "all";
  difficulty?: Difficulty | "all";
};

export type ResultLogger = {
  saveResult: (result: TestResult) => Promise<TestResult>;
  getResults: () => Promise<TestResult[]>;
  getHistory: (filter?: ResultHistoryFilter) => Promise<TestResult[]>;
  getPersonalBests: () => Promise<Record<string, TestResult>>;
  clearLocalResults: () => Promise<void>;
};
