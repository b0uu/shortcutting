import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { shortcutDefinitions } from "@/domain/shortcuts";
import type { Platform } from "@/domain/types";

type ShortcutMapPanelProps = {
  open: boolean;
  platform: Platform;
  onClose: () => void;
};

const keyboardRows = [
  ["esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "backspace"],
  ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["caps", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "enter"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift"],
  ["ctrl", "option", "cmd", "space", "cmd", "option", "left", "right", "home", "end", "delete"],
];

export function ShortcutMapPanel({ open, platform, onClose }: ShortcutMapPanelProps) {
  const definitions = useMemo(() => shortcutDefinitions(platform), [platform]);
  const [selectedId, setSelectedId] = useState(definitions[0].id);
  const selected = definitions.find((definition) => definition.id === selectedId) ?? definitions[0];

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
        className="settings-card shortcut-map-card"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcut map"
        tabIndex={-1}
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        exit={{ y: 8, scale: 0.985 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="panel-heading">
          <h2>shortcut map</h2>
          <button type="button" className="btn-ghost" onClick={onClose}>close</button>
        </div>
        <div className="shortcut-map-layout">
          <div className="shortcut-command-list" aria-label="shortcut commands">
            {definitions.map((definition) => (
              <button
                key={definition.id}
                type="button"
                className={`history-row ${definition.id === selected.id ? "active" : ""}`}
                onClick={() => setSelectedId(definition.id)}
              >
                <strong>{definition.label}</strong>
              </button>
            ))}
          </div>
          <div className="mock-keyboard-wrap">
            <p className="selected-shortcut" aria-live="polite">
              {selected.label}: {selected.keys.map((key) => displayKey(key, platform)).join(" + ")}
            </p>
            <div className="mock-keyboard" aria-label="mock keyboard">
              {keyboardRows.map((row, rowIndex) => (
                <div className="keyboard-row" key={`row-${rowIndex}`}>
                  {row.map((key, keyIndex) => (
                    <span
                      key={`${key}-${keyIndex}`}
                      className={`${selected.keys.includes(key) ? "lit" : ""} key-${key}`}
                    >
                      {displayKey(key, platform)}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}

function displayKey(key: string, platform: Platform): string {
  if (platform === "mac") {
    if (key === "cmd") return "⌘";
    if (key === "option") return "⌥";
    if (key === "ctrl") return "⌃";
    if (key === "shift") return "⇧";
    if (key === "left") return "←";
    if (key === "right") return "→";
    if (key === "delete") return "del";
  }
  return key;
}
