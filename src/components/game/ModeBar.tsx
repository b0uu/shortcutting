import type { Mode, TestConfig } from "@/domain/types";
import { ShortcutHint } from "@/components/ui/ShortcutHint";

type ModeBarProps = {
  config: TestConfig;
  hidden: boolean;
  onModeChange: (mode: Mode) => void;
};

export function ModeBar({ config, hidden, onModeChange }: ModeBarProps) {
  return (
    <div className={`modebar ${hidden ? "modebar-placeholder" : ""}`} aria-hidden={hidden ? true : undefined}>
      <div className="mode-group">
        <button
          type="button"
          className={`mode-btn ${config.mode === "target-match" ? "active" : ""}`}
          aria-pressed={config.mode === "target-match"}
          disabled={hidden}
          tabIndex={hidden ? -1 : 0}
          onClick={() => onModeChange("target-match")}
        >
          <span>target match</span>
          <ShortcutHint keys={["⌥", "1"]} />
        </button>
        <button
          type="button"
          className={`mode-btn ${config.mode === "drill" ? "active" : ""}`}
          aria-pressed={config.mode === "drill"}
          disabled={hidden}
          tabIndex={hidden ? -1 : 0}
          onClick={() => onModeChange("drill")}
        >
          <span>drill</span>
          <ShortcutHint keys={["⌥", "2"]} />
        </button>
      </div>
      <div className="mode-meta">
        {config.challengeCount} parts: {config.mousePolicy === "keyboard-only" ? "keyboard only" : "mouse allowed"}: {config.platform}
      </div>
    </div>
  );
}
