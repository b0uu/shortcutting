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
  const difficultyLabel = config.difficulty === "multiline" ? "multi-line" : config.difficulty;
  const summaryParts = [
    `${config.challengeCount} parts`,
    ...(difficultyLocked ? [] : [difficultyLabel]),
    config.mousePolicy === "keyboard-only" ? "keys only" : "mouse ok",
  ];

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
      <div className={`mode-controls ${optionsOpen ? "open" : ""}`} aria-label="Run options">
        <div className={`mode-options-shell ${optionsOpen ? "open" : ""} ${difficultyLocked ? "compact" : ""}`}>
          <button
            type="button"
            className="mode-options-toggle"
            aria-label={`Run options: ${summaryParts.join(", ")}`}
            aria-expanded={optionsOpen}
            aria-controls="run-options-panel"
            disabled={hidden}
            onClick={() => setOptionsOpen((open) => !open)}
          >
            <span className="gear-mark" aria-hidden="true">⚙</span>
            {summaryParts.map((part) => <span className="summary-part" key={part}>{part}</span>)}
          </button>
          <div className="mode-options-panel" id="run-options-panel" aria-hidden={optionsOpen ? undefined : true}>
            <button
              type="button"
              className="mode-options-close"
              aria-label="Collapse run options"
              disabled={hidden}
              tabIndex={optionsOpen ? 0 : -1}
              onClick={() => setOptionsOpen(false)}
            >
              <span className="gear-mark" aria-hidden="true">⚙</span>
            </button>
            {optionsOpen && (
              <>
                <div className="mini-segment" aria-label="part count">
                  {[3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={config.challengeCount === count ? "active" : ""}
                      disabled={hidden}
                      onClick={() => onConfigChange({ challengeCount: count as 3 | 4 })}
                    >
                      {count} parts
                    </button>
                  ))}
                </div>
                {!difficultyLocked && (
                  <div className="mini-segment" aria-label="difficulty">
                    {difficultyOptions.map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        className={config.difficulty === difficulty ? "active" : ""}
                        disabled={hidden}
                        onClick={() => onConfigChange({ difficulty })}
                      >
                        {difficulty === "multiline" ? "multi-line" : difficulty}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  className={`mode-meta-btn ${config.mousePolicy === "keyboard-only" ? "active" : ""}`}
                  disabled={hidden}
                  onClick={() => onConfigChange({
                    mousePolicy: config.mousePolicy === "keyboard-only" ? "mouse-allowed" : "keyboard-only",
                  })}
                >
                  {config.mousePolicy === "keyboard-only" ? "keyboard only" : "mouse allowed"}
                </button>
              </>
            )}
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
