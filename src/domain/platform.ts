import type { Platform, PlatformPreference } from "./types";

export function detectPlatform(userAgent: string, platformText = ""): Platform {
  const source = `${userAgent} ${platformText}`.toLowerCase();
  return source.includes("mac") ? "mac" : "windows-linux";
}

export function resolvePlatform(
  preference: PlatformPreference,
  detected: Platform,
): Platform {
  return preference === "auto" ? detected : preference;
}
