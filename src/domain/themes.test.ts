import { describe, expect, it } from "vitest";
import {
  colorsForTheme,
  darkThemeColors,
  lightThemeColors,
  sanitizeThemeColors,
  themeCssVariables,
} from "./themes";

describe("themes", () => {
  it("resolves dark, light, and custom theme colors", () => {
    const custom = { ...darkThemeColors, background: "#123456" };

    expect(colorsForTheme("dark", custom)).toBe(darkThemeColors);
    expect(colorsForTheme("light", custom)).toBe(lightThemeColors);
    expect(colorsForTheme("custom", custom)).toEqual(custom);
  });

  it("sanitizes custom color input", () => {
    expect(sanitizeThemeColors({ background: "#abcdef", accent: "tomato" })).toMatchObject({
      background: "#abcdef",
      accent: darkThemeColors.accent,
    });
  });

  it("maps theme colors to app css variables", () => {
    const variables = themeCssVariables({ ...darkThemeColors, accent: "#112233", focus: "#445566" });

    expect(variables["--accent"]).toBe("#112233");
    expect(variables["--focus-ring"]).toBe("rgba(68, 85, 102, 0.86)");
    expect(variables["--accent-bg"]).toBe("rgba(17, 34, 51, 0.12)");
  });
});
