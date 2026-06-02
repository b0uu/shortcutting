import type { RefObject } from "react";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import type { Platform } from "@/domain/types";

type HeaderProps = {
  platform: Platform;
  onHome: () => void;
  onHistory: () => void;
  onSettings: () => void;
  historyDisabled: boolean;
  settingsDisabled: boolean;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
};

export function Header({
  platform,
  onHome,
  onHistory,
  onSettings,
  historyDisabled,
  settingsDisabled,
  settingsButtonRef,
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
          tabIndex={-1}
        >
          <span>history</span>
          <ShortcutHint keys={[modifier, "Y"]} />
        </button>
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
      </nav>
    </header>
  );
}
