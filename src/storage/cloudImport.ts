import type { TestResult } from "@/domain/types";

const CLOUD_IMPORT_BATCH_SIZE = 50;
const cloudImportKeyPrefix = "shortcutting:cloud-imported:";

export type CloudImportSummary = {
  status: "already-imported" | "empty" | "imported" | "partial";
  imported: number;
  skipped: number;
  rejected: number;
  attempted: number;
};

export async function importLocalHistoryOnce(userId: string, results: TestResult[]): Promise<CloudImportSummary> {
  const key = `${cloudImportKeyPrefix}${userId}`;
  if (window.localStorage.getItem(key)) {
    return { status: "already-imported", imported: 0, skipped: 0, rejected: 0, attempted: 0 };
  }

  if (results.length === 0) {
    window.localStorage.setItem(key, "true");
    return { status: "empty", imported: 0, skipped: 0, rejected: 0, attempted: 0 };
  }

  let imported = 0;
  let skipped = 0;
  let rejected = 0;
  for (let index = 0; index < results.length; index += CLOUD_IMPORT_BATCH_SIZE) {
    const batch = results.slice(index, index + CLOUD_IMPORT_BATCH_SIZE);
    const response = await fetch("/api/results/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: batch }),
    });
    if (!response.ok) throw new Error("Import failed.");
    const summary = await response.json() as { imported?: number; skipped?: number; rejected?: number };
    imported += Number(summary.imported ?? 0);
    skipped += Number(summary.skipped ?? 0);
    rejected += Number(summary.rejected ?? 0);
  }

  if (rejected > 0) {
    return { status: "partial", imported, skipped, rejected, attempted: results.length };
  }

  window.localStorage.setItem(key, "true");
  return { status: "imported", imported, skipped, rejected, attempted: results.length };
}
