import { seedPack } from "@/domain/challenges";
import { darkThemeColors } from "@/domain/themes";
import type { TestConfig } from "@/domain/types";

export const defaultConfig: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "windows-linux",
  mousePolicy: "keyboard-only",
  difficulty: "multiline",
  soundEnabled: true,
  theme: "dark",
  customTheme: darkThemeColors,
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack,
  practiceSkillPack: null,
};
