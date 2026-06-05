import type { RefObject } from "react";
import Link from "next/link";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import type { Platform } from "@/domain/types";

type HeaderProps = {
  platform: Platform;
  onHome: () => void;
  onHistory: () => void;
  accountHref: string;
  onSettings: () => void;
  historyDisabled: boolean;
  leaderboardDisabled: boolean;
  accountDisabled: boolean;
  settingsDisabled: boolean;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
  accountLabel: string;
};

export function Header({
  platform,
  onHome,
  onHistory,
  accountHref,
  onSettings,
  historyDisabled,
  leaderboardDisabled,
  accountDisabled,
  settingsDisabled,
  settingsButtonRef,
  accountLabel,
}: HeaderProps) {
  const modifier = platform === "mac" ? "⌥" : "alt";

  return (
    <header className="app-header">
      <button type="button" className="logo" aria-label="shortcutting home" onClick={onHome}>
        <span className="logo-mark">⌥</span>
        <span>shortcutting</span>
      </button>
      <nav aria-label="Primary">
        <button type="button" onClick={onHome}>
          <span>home</span>
          <ShortcutHint keys={[modifier, "H"]} />
        </button>
        <button
          type="button"
          onClick={onHistory}
          disabled={historyDisabled}
          aria-disabled={historyDisabled}
        >
          <span>history</span>
          <ShortcutHint keys={[modifier, "Y"]} />
        </button>
        {leaderboardDisabled ? (
          <button type="button" disabled aria-disabled="true">
            <span>leaderboards</span>
          </button>
        ) : (
          <Link href="/leaderboards">
            <span>leaderboards</span>
          </Link>
        )}
        <button
          ref={settingsButtonRef}
          type="button"
          onClick={onSettings}
          disabled={settingsDisabled}
          aria-disabled={settingsDisabled}
        >
          <span>settings</span>
          <ShortcutHint keys={["esc"]} />
        </button>
        {accountDisabled ? (
          <button type="button" disabled aria-disabled="true">
            <span>{accountLabel}</span>
          </button>
        ) : (
          <Link href={accountHref}>
            <span>{accountLabel}</span>
          </Link>
        )}
      </nav>
    </header>
  );
}
