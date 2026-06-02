import type { TestResult } from "@/domain/types";

export type ResultLogger = {
  saveResult: (result: TestResult) => Promise<TestResult>;
  getResults: () => Promise<TestResult[]>;
  getPersonalBests: () => Promise<Record<string, TestResult>>;
};
