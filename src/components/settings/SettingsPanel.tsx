import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Mode, MousePolicy, PlatformPreference, TestConfig, Theme } from "@/domain/types";
import { ShortcutHint } from "@/components/ui/ShortcutHint";

type SettingsPanelProps = {
  open: boolean;
  config: TestConfig;
  onClose: () => void;
  onChange: (patch: Partial<TestConfig>) => void;
};

export function SettingsPanel({ open, config, onClose, onChange }: SettingsPanelProps) {
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

  if (!open) return null;

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
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onKeyDown={handleKeyDown}
      >
        <h2>settings</h2>
        <SettingGroup label="mode">
          <Option active={config.mode === "target-match"} onClick={() => onChange({ mode: "target-match" as Mode })}>target match</Option>
          <Option active={config.mode === "drill"} onClick={() => onChange({ mode: "drill" as Mode })}>drill</Option>
        </SettingGroup>
        <SettingGroup label="parts">
          {[3, 4].map((count) => (
            <Option key={count} active={config.challengeCount === count} onClick={() => onChange({ challengeCount: count as 3 | 4 })}>
              {count}
            </Option>
          ))}
        </SettingGroup>
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
        </SettingGroup>
        <SettingGroup label="sound">
          <Option active={config.soundEnabled} onClick={() => onChange({ soundEnabled: true })}>on</Option>
          <Option active={!config.soundEnabled} onClick={() => onChange({ soundEnabled: false })}>off</Option>
        </SettingGroup>
        <button type="button" className="btn-ghost close-cue" onClick={onClose}>
          <span>close</span>
          <ShortcutHint keys={["esc"]} />
        </button>
      </motion.div>
    </motion.div>
  );
}

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
