import type { Platform } from "./types";

export type ShortcutCommandId =
  | "move-previous-word"
  | "move-next-word"
  | "delete-previous-word"
  | "delete-next-word"
  | "select-previous-word"
  | "select-next-word"
  | "line-start"
  | "line-end"
  | "undo"
  | "redo"
  | "copy"
  | "cut"
  | "paste"
  | "select-all"
  | "indent";

export type ShortcutDefinition = {
  id: ShortcutCommandId;
  label: string;
  keys: string[];
};

const commonLabels: Array<Pick<ShortcutDefinition, "id" | "label">> = [
  { id: "move-previous-word", label: "move previous word" },
  { id: "move-next-word", label: "move next word" },
  { id: "delete-previous-word", label: "delete previous word" },
  { id: "delete-next-word", label: "delete next word" },
  { id: "select-previous-word", label: "select previous word" },
  { id: "select-next-word", label: "select next word" },
  { id: "line-start", label: "line start" },
  { id: "line-end", label: "line end" },
  { id: "undo", label: "undo" },
  { id: "redo", label: "redo" },
  { id: "copy", label: "copy" },
  { id: "cut", label: "cut" },
  { id: "paste", label: "paste" },
  { id: "select-all", label: "select all" },
  { id: "indent", label: "coding indent" },
];

const keysByPlatform: Record<Platform, Record<ShortcutCommandId, string[]>> = {
  mac: {
    "move-previous-word": ["option", "left"],
    "move-next-word": ["option", "right"],
    "delete-previous-word": ["option", "backspace"],
    "delete-next-word": ["option", "delete"],
    "select-previous-word": ["option", "shift", "left"],
    "select-next-word": ["option", "shift", "right"],
    "line-start": ["cmd", "left"],
    "line-end": ["cmd", "right"],
    undo: ["cmd", "z"],
    redo: ["cmd", "shift", "z"],
    copy: ["cmd", "c"],
    cut: ["cmd", "x"],
    paste: ["cmd", "v"],
    "select-all": ["cmd", "a"],
    indent: ["tab"],
  },
  "windows-linux": {
    "move-previous-word": ["ctrl", "left"],
    "move-next-word": ["ctrl", "right"],
    "delete-previous-word": ["ctrl", "backspace"],
    "delete-next-word": ["ctrl", "delete"],
    "select-previous-word": ["ctrl", "shift", "left"],
    "select-next-word": ["ctrl", "shift", "right"],
    "line-start": ["home"],
    "line-end": ["end"],
    undo: ["ctrl", "z"],
    redo: ["ctrl", "y"],
    copy: ["ctrl", "c"],
    cut: ["ctrl", "x"],
    paste: ["ctrl", "v"],
    "select-all": ["ctrl", "a"],
    indent: ["tab"],
  },
};

export function shortcutDefinitions(platform: Platform): ShortcutDefinition[] {
  return commonLabels.map((command) => ({
    ...command,
    keys: keysByPlatform[platform][command.id],
  }));
}
