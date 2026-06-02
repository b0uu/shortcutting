export function formatElapsed(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalTenths = Math.floor(safeMs / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export function elapsedSince(startTime: number | null, now: number): number {
  return startTime === null ? 0 : Math.max(0, now - startTime);
}
