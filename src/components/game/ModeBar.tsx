import { useState, type ReactNode } from "react";
import type { Difficulty, Mode, TestConfig } from "@/domain/types";
import { ShortcutHint } from "@/components/ui/ShortcutHint";

type ModeBarProps = {
  config: TestConfig;
  hidden: boolean;
  onModeChange: (mode: Mode) => void;
  onConfigChange: (patch: Partial<TestConfig>) => void;
};

const difficultyOptions: Difficulty[] = ["standard", "advanced", "multiline"];

export function ModeBar({ config, hidden, onModeChange, onConfigChange }: ModeBarProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const modifier = config.platform === "mac" ? "⌥" : "alt";
  const difficultyLocked = config.mode === "drill";

  return (
    <div className={`modebar ${hidden ? "modebar-placeholder" : ""}`} aria-hidden={hidden ? true : undefined}>
      <div className="mode-group">
        <ModeButton active={config.mode === "target-match"} hidden={hidden} modifier={modifier} onClick={() => onModeChange("target-match")} shortcut="1">
          target match
        </ModeButton>
        <ModeButton active={config.mode === "drill"} hidden={hidden} modifier={modifier} onClick={() => onModeChange("drill")} shortcut="2">
          drill
        </ModeButton>
        <ModeButton active={config.mode === "coding"} hidden={hidden} modifier={modifier} onClick={() => onModeChange("coding")} shortcut="3">
          coding
        </ModeButton>
      </div>
      <div className={`mode-controls ${optionsOpen ? "open" : ""} ${difficultyLocked ? "compact" : ""}`} aria-label="Run options">
        <div className={`mode-options-shell ${optionsOpen ? "open" : ""} ${difficultyLocked ? "compact" : ""}`}>
          <button
            type="button"
            className="mode-options-toggle"
            aria-label="Show run options"
            aria-expanded={optionsOpen}
            aria-controls="run-options-panel"
            disabled={hidden}
            onClick={() => setOptionsOpen((open) => !open)}
          >
            <span className="mode-options-label">options</span>
            <span className="chevron-mark down" aria-hidden="true" />
          </button>
          <div className="mode-options-panel" id="run-options-panel" aria-hidden={optionsOpen ? undefined : true}>
            <div className="mini-segment" aria-label={optionsOpen ? "part count" : undefined}>
              <span className="segment-label">parts</span>
              {[3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-label={`${count} parts`}
                  className={config.challengeCount === count ? "active" : ""}
                  disabled={hidden || !optionsOpen}
                  tabIndex={optionsOpen ? 0 : -1}
                  onClick={() => onConfigChange({ challengeCount: count as 3 | 4 })}
                >
                  {count}
                </button>
              ))}
            </div>
            <div
              className={`mini-segment difficulty-segment ${difficultyLocked ? "hidden" : ""}`}
              aria-label={optionsOpen && !difficultyLocked ? "difficulty" : undefined}
              aria-hidden={optionsOpen && !difficultyLocked ? undefined : true}
            >
              {difficultyOptions.map((difficulty) => (
                <button
                  key={difficulty}
                  type="button"
                  className={config.difficulty === difficulty ? "active" : ""}
                  disabled={hidden || !optionsOpen || difficultyLocked}
                  tabIndex={optionsOpen && !difficultyLocked ? 0 : -1}
                  onClick={() => onConfigChange({ difficulty })}
                >
                  {difficulty === "multiline" ? "multi-line" : difficulty}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`mode-meta-btn ${config.mousePolicy === "keyboard-only" ? "active" : ""}`}
              aria-label={config.mousePolicy === "keyboard-only" ? "keyboard only" : "mouse allowed"}
              disabled={hidden || !optionsOpen}
              tabIndex={optionsOpen ? 0 : -1}
              onClick={() => onConfigChange({
                mousePolicy: config.mousePolicy === "keyboard-only" ? "mouse-allowed" : "keyboard-only",
              })}
            >
              {config.mousePolicy === "keyboard-only" ? "keys only" : "mouse ok"}
            </button>
            <button
              type="button"
              className="mode-options-close"
              aria-label="Collapse run options"
              disabled={hidden || !optionsOpen}
              tabIndex={optionsOpen ? 0 : -1}
              onClick={() => setOptionsOpen(false)}
            >
              <span>done</span>
              <span className="chevron-mark up" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  hidden,
  modifier,
  onClick,
  shortcut,
  children,
}: {
  active: boolean;
  hidden: boolean;
  modifier: string;
  onClick: () => void;
  shortcut: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`mode-btn ${active ? "active" : ""}`}
      aria-pressed={active}
      disabled={hidden}
      tabIndex={hidden ? -1 : 0}
      onClick={onClick}
    >
      <span>{children}</span>
      <ShortcutHint keys={[modifier, shortcut]} />
    </button>
  );
}
