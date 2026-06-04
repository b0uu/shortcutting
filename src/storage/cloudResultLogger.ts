import type { TestResult } from "@/domain/types";
import type { ResultHistoryFilter, ResultLogger } from "./resultLogger";

export class CloudResultLogger implements ResultLogger {
  async saveResult(result: TestResult): Promise<TestResult> {
    const response = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not save cloud result.");
    return payload.result as TestResult;
  }

  async getResults(): Promise<TestResult[]> {
    return this.getHistory();
  }

  async getHistory(filter: ResultHistoryFilter = {}): Promise<TestResult[]> {
    const params = new URLSearchParams();
    if (filter.mode) params.set("mode", filter.mode);
    if (filter.difficulty) params.set("difficulty", filter.difficulty);
    const query = params.size > 0 ? `?${params.toString()}` : "";
    const response = await fetch(`/api/me/history${query}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not load cloud history.");
    return payload.results as TestResult[];
  }

  async getPersonalBests(): Promise<Record<string, TestResult>> {
    const response = await fetch("/api/me/progress");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Could not load cloud progress.");
    return payload.personalBests as Record<string, TestResult>;
  }

  async clearLocalResults(): Promise<void> {
    const response = await fetch("/api/me/history", { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error ?? "Could not clear cloud history.");
    }
  }
}
