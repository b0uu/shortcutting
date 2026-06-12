import Link from "next/link";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import type { Platform } from "@/domain/types";

type HeaderProps = {
  platform: Platform;
  onHome: () => void;
  onHistory: () => void;
  accountHref: string;
  historyDisabled: boolean;
  leaderboardDisabled: boolean;
  accountDisabled: boolean;
  settingsDisabled: boolean;
  accountLabel: string;
};

export function Header({
  platform,
  onHome,
  onHistory,
  accountHref,
  historyDisabled,
  leaderboardDisabled,
  accountDisabled,
  settingsDisabled,
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
            <ShortcutHint keys={[modifier, "L"]} />
          </button>
        ) : (
          <Link href="/leaderboards">
            <span>leaderboards</span>
            <ShortcutHint keys={[modifier, "L"]} />
          </Link>
        )}
        {settingsDisabled ? (
          <button type="button" disabled aria-disabled="true">
            <span>settings</span>
            <ShortcutHint keys={["esc"]} />
          </button>
        ) : (
          <Link href="/settings">
            <span>settings</span>
            <ShortcutHint keys={["esc"]} />
          </Link>
        )}
        {accountDisabled ? (
          <button type="button" className="account-nav-item" disabled aria-disabled="true">
            <span>{accountLabel}</span>
            <ShortcutHint keys={[modifier, "A"]} />
          </button>
        ) : (
          <Link href={accountHref} className="account-nav-item">
            <span>{accountLabel}</span>
            <ShortcutHint keys={[modifier, "A"]} />
          </Link>
        )}
      </nav>
    </header>
  );
}
