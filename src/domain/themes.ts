import type { Theme, ThemeColors } from "./types";

export const darkThemeColors: ThemeColors = {
  background: "#1c1a17",
  panel: "#242118",
  card: "#2a271f",
  text: "#e8e4da",
  mutedText: "#9f9688",
  accent: "#d4693a",
  success: "#7db884",
  error: "#e07575",
  focus: "#d4693a",
};

export const lightThemeColors: ThemeColors = {
  background: "#f7f1e8",
  panel: "#efe6dc",
  card: "#e8dacd",
  text: "#332f2a",
  mutedText: "#766b60",
  accent: "#b85b35",
  success: "#3f7a4b",
  error: "#b4463f",
  focus: "#b85b35",
};

export function colorsForTheme(theme: Theme, customTheme: ThemeColors): ThemeColors {
  if (theme === "light") return lightThemeColors;
  if (theme === "custom") return customTheme;
  return darkThemeColors;
}

export function sanitizeThemeColors(input: unknown, fallback: ThemeColors = darkThemeColors): ThemeColors {
  const source = typeof input === "object" && input !== null ? input as Partial<ThemeColors> : {};
  return {
    background: safeColor(source.background, fallback.background),
    panel: safeColor(source.panel, fallback.panel),
    card: safeColor(source.card, fallback.card),
    text: safeColor(source.text, fallback.text),
    mutedText: safeColor(source.mutedText, fallback.mutedText),
    accent: safeColor(source.accent, fallback.accent),
    success: safeColor(source.success, fallback.success),
    error: safeColor(source.error, fallback.error),
    focus: safeColor(source.focus, fallback.focus),
  };
}

export function themeCssVariables(colors: ThemeColors): Record<string, string> {
  return {
    "--bg": colors.background,
    "--bg-sub": colors.panel,
    "--bg-card": colors.card,
    "--text": colors.text,
    "--sub": colors.mutedText,
    "--accent": colors.accent,
    "--success": colors.success,
    "--error": colors.error,
    "--focus-ring": hexToRgba(colors.focus, 0.86),
    "--focus-ring-soft": hexToRgba(colors.focus, 0.28),
    "--accent-bg": hexToRgba(colors.accent, 0.12),
  };
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = safeColor(hex, "#d4693a").slice(1);
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
