import { personalBestKey } from "@/domain/results";
import type { TestResult } from "@/domain/types";
import type { ResultHistoryFilter, ResultLogger } from "./resultLogger";

const resultsKey = "shortcutting:results";
const bestsKey = "shortcutting:personal-bests";

export class LocalResultLogger implements ResultLogger {
  async saveResult(result: TestResult): Promise<TestResult> {
    const results = await this.getResults();
    const bests = await this.getPersonalBests();
    const key = personalBestKey(result.config);
    const currentBest = bests[key];
    const isBetter = !currentBest || result.elapsedMs < currentBest.elapsedMs;
    const resultToStore = { ...result, isPersonalBest: isBetter };

    window.localStorage.setItem(resultsKey, JSON.stringify([resultToStore, ...results].slice(0, 50)));
    if (isBetter) {
      window.localStorage.setItem(bestsKey, JSON.stringify({ ...bests, [key]: resultToStore }));
    }
    return resultToStore;
  }

  async getResults(): Promise<TestResult[]> {
    return readJson<TestResult[]>(resultsKey, []);
  }

  async getHistory(filter: ResultHistoryFilter = {}): Promise<TestResult[]> {
    const results = await this.getResults();
    return results.filter((result) => {
      const modeMatches = !filter.mode || filter.mode === "all" || result.config.mode === filter.mode;
      const difficultyMatches = !filter.difficulty || filter.difficulty === "all" || result.config.difficulty === filter.difficulty;
      return modeMatches && difficultyMatches;
    });
  }

  async getPersonalBests(): Promise<Record<string, TestResult>> {
    return readJson<Record<string, TestResult>>(bestsKey, {});
  }

  async clearLocalResults(): Promise<void> {
    window.localStorage.removeItem(resultsKey);
    window.localStorage.removeItem(bestsKey);
  }
}

function readJson<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
