import { describe, expect, it } from "vitest";
import { shortcutDefinitions } from "./shortcuts";

describe("shortcutDefinitions", () => {
  it("returns platform-specific shortcuts", () => {
    const mac = shortcutDefinitions("mac").find((item) => item.id === "delete-previous-word");
    const windows = shortcutDefinitions("windows-linux").find((item) => item.id === "delete-previous-word");

    expect(mac?.keys).toEqual(["option", "backspace"]);
    expect(windows?.keys).toEqual(["ctrl", "backspace"]);
  });

  it("includes coding indentation", () => {
    expect(shortcutDefinitions("mac").find((item) => item.id === "indent")?.keys).toEqual(["tab"]);
  });
});
