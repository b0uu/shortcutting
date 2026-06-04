import { beforeEach, describe, expect, it } from "vitest";
import { darkThemeColors } from "@/domain/themes";
import type { TestConfig } from "@/domain/types";
import { loadSettings, saveSettings, sanitizeConfig, settingsKey } from "./settingsStore";

const defaultConfig: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "mac",
  mousePolicy: "keyboard-only",
  difficulty: "standard",
  soundEnabled: true,
  theme: "dark",
  customTheme: darkThemeColors,
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack: "standard-v1",
};

describe("settingsStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists and hydrates supported MVP settings", () => {
    const stored: TestConfig = {
      ...defaultConfig,
      mode: "drill",
      challengeCount: 4,
      platformPreference: "windows-linux",
      platform: "windows-linux",
      mousePolicy: "mouse-allowed",
      difficulty: "advanced",
      soundEnabled: false,
      theme: "custom",
      customTheme: { ...darkThemeColors, background: "#112233", accent: "#445566" },
      smartPairs: false,
      reducedMotion: true,
    };

    saveSettings(stored);
    expect(loadSettings(defaultConfig, "mac")).toMatchObject({
      mode: "drill",
      challengeCount: 4,
      platformPreference: "windows-linux",
      platform: "windows-linux",
      mousePolicy: "mouse-allowed",
      difficulty: "advanced",
      soundEnabled: false,
      theme: "custom",
      customTheme: { ...darkThemeColors, background: "#112233", accent: "#445566" },
      smartPairs: false,
      reducedMotion: true,
    });
  });

  it("sanitizes invalid stored settings back to MVP defaults", () => {
    window.localStorage.setItem(settingsKey, JSON.stringify({
      mode: "vim",
      challengeCount: 20,
      platformPreference: "plan9",
      mousePolicy: "trackpad-only",
      difficulty: "expert",
      soundEnabled: "yes",
      theme: "sepia",
      seedPack: "",
    }));

    expect(loadSettings(defaultConfig, "windows-linux")).toEqual({
      ...defaultConfig,
      platform: "windows-linux",
    });
    expect(sanitizeConfig({ platformPreference: "auto" }, defaultConfig, "windows-linux").platform).toBe("windows-linux");
  });
});
