"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ShortcutMapPanel } from "@/components/shortcuts/ShortcutMapPanel";
import { SettingsControls } from "@/components/settings/SettingsPanel";
import { defaultConfig } from "@/domain/defaultConfig";
import { detectPlatform, resolvePlatform } from "@/domain/platform";
import { colorsForTheme, themeCssVariables } from "@/domain/themes";
import type { TestConfig } from "@/domain/types";
import { loadSettings, saveSettings } from "@/storage/settingsStore";
import { LocalResultLogger } from "@/storage/localResultLogger";

export function SettingsPageBody() {
  const [config, setConfig] = useState<TestConfig>(() => {
    if (typeof window === "undefined") return defaultConfig;
    const detected = detectPlatform(navigator.userAgent, navigator.platform);
    return loadSettings(defaultConfig, detected);
  });
  const [shortcutMapOpen, setShortcutMapOpen] = useState(false);
  const localLogger = useMemo(() => new LocalResultLogger(), []);
  const activeThemeColors = useMemo(() => colorsForTheme(config.theme, config.customTheme), [config.customTheme, config.theme]);
  const activeThemeStyle = useMemo(() => themeCssVariables(activeThemeColors) as CSSProperties, [activeThemeColors]);

  useEffect(() => {
    document.documentElement.dataset.theme = config.theme;
    const variables = themeCssVariables(activeThemeColors);
    for (const [key, value] of Object.entries(variables)) {
      document.documentElement.style.setProperty(key, value);
    }
    return () => {
      delete document.documentElement.dataset.theme;
      for (const key of Object.keys(variables)) {
        document.documentElement.style.removeProperty(key);
      }
    };
  }, [activeThemeColors, config.theme]);

  function updateConfig(patch: Partial<TestConfig>) {
    const detected = detectPlatform(navigator.userAgent, navigator.platform);
    const nextPreference = patch.platformPreference ?? config.platformPreference;
    const nextMode = patch.mode ?? config.mode;
    const nextConfig = normalizeSettingsPageConfig({
      ...config,
      ...patch,
      mode: nextMode,
      platform: resolvePlatform(nextPreference, detected),
      difficulty: patch.difficulty ?? (patch.mode === "target-match" ? "multiline" : patch.mode === "drill" ? "standard" : config.difficulty),
    });
    saveSettings(nextConfig);
    setConfig(nextConfig);
  }

  async function resetLocalData() {
    await localLogger.clearLocalResults();
  }

  return (
    <section className="settings-page-main public-content-ready" style={activeThemeStyle}>
      <div className="settings-page-head">
        <div>
          <h1>settings</h1>
          <p>local defaults for practice, input, theme, and code editing.</p>
        </div>
        <Link className="section-link" href="/">return to game</Link>
      </div>
      <div className="settings-page-grid">
        <SettingsControls
          config={config}
          onChange={updateConfig}
          onShortcutMap={() => setShortcutMapOpen(true)}
          onResetLocalData={resetLocalData}
        />
      </div>
      <p className="settings-page-note">
        Changes save locally and apply the next time a run starts.
      </p>
      <ShortcutMapPanel
        open={shortcutMapOpen}
        platform={config.platform}
        onClose={() => setShortcutMapOpen(false)}
      />
    </section>
  );
}

function normalizeSettingsPageConfig(config: TestConfig): TestConfig {
  if (config.mode === "drill") {
    return {
      ...config,
      challengeCount: [5, 10, 15].includes(config.challengeCount) ? config.challengeCount : 5,
      difficulty: "standard",
    };
  }
  if (config.mode === "coding" && config.difficulty === "advanced") {
    return {
      ...config,
      challengeCount: [3, 4].includes(config.challengeCount) ? config.challengeCount : 3,
      difficulty: "standard",
    };
  }
  return {
    ...config,
    challengeCount: [3, 4].includes(config.challengeCount) ? config.challengeCount : 3,
  };
}
