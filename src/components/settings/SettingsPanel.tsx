import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ChallengeCount, Difficulty, Mode, MousePolicy, PlatformPreference, TestConfig, Theme, ThemeColors } from "@/domain/types";
import { ShortcutHint } from "@/components/ui/ShortcutHint";

type SettingsPanelProps = {
  open: boolean;
  config: TestConfig;
  onClose: () => void;
  onChange: (patch: Partial<TestConfig>) => void;
  onShortcutMap: () => void;
  onResetLocalData: () => void;
};

const defaultPartOptions: ChallengeCount[] = [3, 4];
const drillPartOptions: ChallengeCount[] = [5, 10, 15];
const targetDifficultyOptions: Difficulty[] = ["standard", "multiline"];
const codingDifficultyOptions: Difficulty[] = ["standard", "multiline"];

type SettingsControlsProps = {
  config: TestConfig;
  onChange: (patch: Partial<TestConfig>) => void;
  onShortcutMap?: () => void;
  onResetLocalData?: () => void;
};

export function SettingsPanel({ open, config, onClose, onChange, onShortcutMap, onResetLocalData }: SettingsPanelProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstActive = dialogRef.current?.querySelector<HTMLButtonElement>(".opt-btn.active");
    firstActive?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [onClose, open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
    <motion.div
      className="settings-panel"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={dialogRef}
        className="settings-card"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        tabIndex={-1}
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        exit={{ y: 8, scale: 0.985 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onKeyDown={handleKeyDown}
      >
        <h2>settings</h2>
        <SettingsControls
          config={config}
          onChange={onChange}
          onShortcutMap={onShortcutMap}
          onResetLocalData={onResetLocalData}
        />
        <button type="button" className="btn-ghost close-cue" onClick={onClose}>
          <span>close</span>
          <ShortcutHint keys={["esc"]} />
        </button>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SettingsControls({ config, onChange, onShortcutMap, onResetLocalData }: SettingsControlsProps) {
  const partOptions = config.mode === "drill" ? drillPartOptions : defaultPartOptions;
  const difficultyOptions = config.mode === "coding" ? codingDifficultyOptions : targetDifficultyOptions;

  return (
    <>
      <SettingGroup label="mode">
        <Option active={config.mode === "target-match"} onClick={() => onChange({ mode: "target-match" as Mode })}>target match</Option>
        <Option active={config.mode === "drill"} onClick={() => onChange({ mode: "drill" as Mode })}>drill</Option>
        <Option active={config.mode === "coding"} onClick={() => onChange({ mode: "coding" as Mode })}>coding</Option>
      </SettingGroup>
      <SettingGroup label="parts">
        {partOptions.map((count) => (
          <Option key={count} active={config.challengeCount === count} onClick={() => onChange({ challengeCount: count })}>
            {count}
          </Option>
        ))}
      </SettingGroup>
      {config.mode !== "drill" && (
        <SettingGroup label="difficulty">
          {difficultyOptions.map((difficulty) => (
            <Option key={difficulty} active={config.difficulty === difficulty} onClick={() => onChange({ difficulty })}>
              {difficulty === "multiline" ? "multi-line" : difficulty}
            </Option>
          ))}
        </SettingGroup>
      )}
      <SettingGroup label="input mode">
        <Option active={config.mousePolicy === "keyboard-only"} onClick={() => onChange({ mousePolicy: "keyboard-only" as MousePolicy })}>keyboard only</Option>
        <Option active={config.mousePolicy === "mouse-allowed"} onClick={() => onChange({ mousePolicy: "mouse-allowed" as MousePolicy })}>mouse allowed</Option>
      </SettingGroup>
      <SettingGroup label="platform">
        <Option active={config.platformPreference === "auto"} onClick={() => onChange({ platformPreference: "auto" as PlatformPreference })}>auto</Option>
        <Option active={config.platformPreference === "mac"} onClick={() => onChange({ platformPreference: "mac" as PlatformPreference })}>mac</Option>
        <Option active={config.platformPreference === "windows-linux"} onClick={() => onChange({ platformPreference: "windows-linux" as PlatformPreference })}>windows/linux</Option>
      </SettingGroup>
      <SettingGroup label="theme">
        <Option active={config.theme === "dark"} onClick={() => onChange({ theme: "dark" as Theme })}>dark</Option>
        <Option active={config.theme === "light"} onClick={() => onChange({ theme: "light" as Theme })}>light</Option>
        <Option active={config.theme === "custom"} onClick={() => onChange({ theme: "custom" as Theme })}>custom</Option>
      </SettingGroup>
      {config.theme === "custom" && (
        <SettingGroup label="custom colors">
          <div className="color-grid" aria-label="custom theme colors">
            {themeColorFields.map((field) => (
              <label key={field.key} className="color-field">
                <span>{field.label}</span>
                <input
                  type="color"
                  value={config.customTheme[field.key]}
                  aria-label={field.label}
                  onChange={(event) => onChange({
                    customTheme: {
                      ...config.customTheme,
                      [field.key]: event.currentTarget.value,
                    },
                  })}
                />
              </label>
            ))}
          </div>
        </SettingGroup>
      )}
      <SettingGroup label="sound">
        <Option active={config.soundEnabled} onClick={() => onChange({ soundEnabled: true })}>on</Option>
        <Option active={!config.soundEnabled} onClick={() => onChange({ soundEnabled: false })}>off</Option>
      </SettingGroup>
      <SettingGroup label="motion">
        <Option active={!config.reducedMotion} onClick={() => onChange({ reducedMotion: false })}>standard</Option>
        <Option active={config.reducedMotion} onClick={() => onChange({ reducedMotion: true })}>reduced</Option>
      </SettingGroup>
      <SettingGroup label="coding">
        <Option active onClick={() => onChange({ codingLanguage: "python" })}>python</Option>
        <Option active={config.smartPairs} onClick={() => onChange({ smartPairs: true })}>smart pairs on</Option>
        <Option active={!config.smartPairs} onClick={() => onChange({ smartPairs: false })}>smart pairs off</Option>
      </SettingGroup>
      {onShortcutMap && (
        <SettingGroup label="shortcuts">
          <Option active={false} onClick={onShortcutMap}>open shortcut map</Option>
        </SettingGroup>
      )}
      {onResetLocalData && (
        <SettingGroup label="local data">
          <Option active={false} onClick={onResetLocalData}>reset history</Option>
        </SettingGroup>
      )}
    </>
  );
}

const themeColorFields: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: "background", label: "background" },
  { key: "panel", label: "panel" },
  { key: "card", label: "card" },
  { key: "text", label: "text" },
  { key: "mutedText", label: "muted text" },
  { key: "accent", label: "accent" },
  { key: "success", label: "success" },
  { key: "error", label: "error" },
  { key: "focus", label: "focus" },
];

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="setting-group">
      <legend>{label}</legend>
      <div role="group" aria-label={label}>{children}</div>
    </fieldset>
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`opt-btn ${active ? "active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
