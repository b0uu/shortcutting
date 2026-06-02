import Link from "next/link";
import type { RefObject } from "react";
import { ShortcutHint } from "@/components/ui/ShortcutHint";

type HeaderProps = {
  onSettings: () => void;
  settingsDisabled: boolean;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
};

export function Header({ onSettings, settingsDisabled, settingsButtonRef }: HeaderProps) {
  return (
    <header className="app-header">
      <Link className="logo" href="/" aria-label="shortcutting home">
        <span className="logo-mark">⌥</span>
        <span>shortcutting</span>
      </Link>
      <nav aria-label="Primary">
        <Link href="/">
          <span>home</span>
          <ShortcutHint keys={["⌥", "H"]} />
        </Link>
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
