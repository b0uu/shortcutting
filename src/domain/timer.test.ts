import { describe, expect, it } from "vitest";
import { elapsedSince, formatElapsed } from "./timer";

describe("timer helpers", () => {
  it("formats elapsed time as MM:SS.d", () => {
    expect(formatElapsed(0)).toBe("00:00.0");
    expect(formatElapsed(8420)).toBe("00:08.4");
    expect(formatElapsed(78_420)).toBe("01:18.4");
  });

  it("does not produce negative elapsed values", () => {
    expect(elapsedSince(10, 5)).toBe(0);
    expect(elapsedSince(null, 5)).toBe(0);
  });
});
