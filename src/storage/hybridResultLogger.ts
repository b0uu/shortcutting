import type { TestResult } from "@/domain/types";
import type { ResultHistoryFilter, ResultLogger } from "./resultLogger";

export class HybridResultLogger implements ResultLogger {
  constructor(
    private readonly localLogger: ResultLogger,
    private readonly cloudLogger: ResultLogger | null,
  ) {}

  async saveResult(result: TestResult): Promise<TestResult> {
    const localResult = await this.localLogger.saveResult(result);
    if (!this.cloudLogger) return localResult;

    try {
      return await this.cloudLogger.saveResult(localResult);
    } catch {
      return localResult;
    }
  }

  async getResults(): Promise<TestResult[]> {
    if (!this.cloudLogger) return this.localLogger.getResults();
    try {
      return await this.cloudLogger.getResults();
    } catch {
      return this.localLogger.getResults();
    }
  }

  async getHistory(filter: ResultHistoryFilter = {}): Promise<TestResult[]> {
    if (!this.cloudLogger) return this.localLogger.getHistory(filter);
    try {
      return await this.cloudLogger.getHistory(filter);
    } catch {
      return this.localLogger.getHistory(filter);
    }
  }

  async getPersonalBests(): Promise<Record<string, TestResult>> {
    if (!this.cloudLogger) return this.localLogger.getPersonalBests();
    try {
      return await this.cloudLogger.getPersonalBests();
    } catch {
      return this.localLogger.getPersonalBests();
    }
  }

  async clearLocalResults(): Promise<void> {
    await this.localLogger.clearLocalResults();
    if (!this.cloudLogger) return;
    await this.cloudLogger.clearLocalResults();
  }
}
