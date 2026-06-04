import type { Platform, PlatformPreference, TestConfig } from "@/domain/types";
import { resolvePlatform } from "@/domain/platform";
import { sanitizeThemeColors } from "@/domain/themes";

export const settingsKey = "shortcutting:settings";

export function loadSettings(defaultConfig: TestConfig, detectedPlatform: Platform): TestConfig {
  const raw = window.localStorage.getItem(settingsKey);
  if (!raw) return { ...defaultConfig, platform: resolvePlatform(defaultConfig.platformPreference, detectedPlatform) };

  try {
    const parsed = JSON.parse(raw) as Partial<TestConfig>;
    return sanitizeConfig(parsed, defaultConfig, detectedPlatform);
  } catch {
    return { ...defaultConfig, platform: resolvePlatform(defaultConfig.platformPreference, detectedPlatform) };
  }
}

export function saveSettings(config: TestConfig): void {
  window.localStorage.setItem(settingsKey, JSON.stringify(config));
}

export function sanitizeConfig(
  input: Partial<TestConfig>,
  fallback: TestConfig,
  detectedPlatform: Platform,
): TestConfig {
  const platformPreference = oneOf<PlatformPreference>(
    input.platformPreference,
    ["auto", "mac", "windows-linux"],
    fallback.platformPreference,
  );

  return {
    mode: oneOf(input.mode, ["target-match", "drill", "coding"], fallback.mode),
    challengeCount: oneOf(input.challengeCount, [3, 4, 5, 10, 15], fallback.challengeCount),
    platformPreference,
    platform: resolvePlatform(platformPreference, detectedPlatform),
    mousePolicy: oneOf(input.mousePolicy, ["keyboard-only", "mouse-allowed"], fallback.mousePolicy),
    difficulty: oneOf(input.difficulty, ["standard", "advanced", "multiline"], fallback.difficulty),
    soundEnabled: typeof input.soundEnabled === "boolean" ? input.soundEnabled : fallback.soundEnabled,
    theme: oneOf(input.theme, ["dark", "light", "custom"], fallback.theme),
    customTheme: sanitizeThemeColors(input.customTheme, fallback.customTheme),
    codingLanguage: "python",
    smartPairs: typeof input.smartPairs === "boolean" ? input.smartPairs : fallback.smartPairs,
    reducedMotion: typeof input.reducedMotion === "boolean" ? input.reducedMotion : fallback.reducedMotion,
    seedPack: typeof input.seedPack === "string" && input.seedPack ? input.seedPack : fallback.seedPack,
  };
}

function oneOf<T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? value as T : fallback;
}
