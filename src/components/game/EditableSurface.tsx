"use client";

import { useEffect, useRef } from "react";
import { buildDiffTokens } from "@/domain/diff";
import { getEditablePlainText, getSelectionRange, setSelectionRange } from "@/domain/text";
import type { Challenge, SelectionState } from "@/domain/types";

type EditableSurfaceProps = {
  challenge: Challenge;
  active: boolean;
  focusLocked: boolean;
  currentText: string;
  targetText: string;
  showDiff: boolean;
  nativeCaretFallback: boolean;
  initialSelection: SelectionState;
  resetKey: number;
  smartPairs: boolean;
  onInputText: (text: string, selection: SelectionState) => void;
  onSelection: (selection: SelectionState) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClipboard: (type: "copy" | "cut" | "paste") => void;
};

export function EditableSurface({
  challenge,
  active,
  focusLocked,
  currentText,
  targetText,
  showDiff,
  nativeCaretFallback,
  initialSelection,
  resetKey,
  smartPairs,
  onInputText,
  onSelection,
  onKeyDown,
  onMouseDown,
  onPointerDown,
  onClipboard,
}: EditableSurfaceProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastChallengeId = useRef(challenge.id);
  const lastSelection = useRef<SelectionState>(initialSelection);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (lastChallengeId.current !== challenge.id || element.textContent !== currentText) {
      element.textContent = currentText;
      lastChallengeId.current = challenge.id;
    }
  }, [challenge.id, currentText]);

  useEffect(() => {
    if (!active || !ref.current) return;
    ref.current.focus();
    setSelectionRange(ref.current, initialSelection.start, initialSelection.end);
    lastSelection.current = initialSelection;
    onSelection(initialSelection);
  }, [active, challenge.id, initialSelection, onSelection]);

  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return;
    element.textContent = currentText;
    element.focus();
    setSelectionRange(element, initialSelection.start, initialSelection.end);
    lastSelection.current = initialSelection;
    onSelection(initialSelection);
    // resetKey is the explicit request to restore the active drill; normal typing
    // sync is handled by the textContent effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    function handleSelectionChange() {
      if (!element) return;
      const selection = element.ownerDocument.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return;
      const nextSelection = getSelectionRange(element);
      lastSelection.current = nextSelection;
      onSelection(nextSelection);
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [onSelection]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !active || !focusLocked) return;

    function restoreFocus() {
      if (!element || !active || !focusLocked) return;
      if (document.querySelector("[aria-modal='true']")) return;
      if (document.activeElement === element) return;
      element.focus();
      setSelectionRange(element, lastSelection.current.start, lastSelection.current.end);
    }

    function scheduleRestore() {
      window.setTimeout(restoreFocus, 0);
    }

    element.addEventListener("blur", scheduleRestore);
    document.addEventListener("pointerdown", scheduleRestore);
    return () => {
      element.removeEventListener("blur", scheduleRestore);
      document.removeEventListener("pointerdown", scheduleRestore);
    };
  }, [active, focusLocked]);

  const diffTokens = showDiff ? buildDiffTokens(currentText, targetText) : [];
  const describedBy = showDiff ? "target-text hint-text" : "target-text";
  const syntaxTokens = challenge.mode === "coding" ? buildPythonSyntaxTokens(currentText) : [];
  const showSyntax = syntaxTokens.length > 0 && !showDiff;
  const lineNumbers = showSyntax ? Array.from({ length: currentText.split("\n").length }, (_, index) => index + 1) : [];

  return (
    <div className={`edit-stack ${showDiff ? "diff-active" : ""} ${showSyntax ? "syntax-active" : ""}`}>
      {showSyntax && (
        <div className="line-numbers" aria-hidden="true">
          {lineNumbers.map((line) => <span key={line}>{line}</span>)}
        </div>
      )}
      {showSyntax && (
        <div className="syntax-overlay" aria-hidden="true">
          {syntaxTokens.map((token) => (
            <span key={token.id} className={`syntax-${token.type}`}>{token.text}</span>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className={`edit-block ${nativeCaretFallback ? "native-caret" : ""} ${showDiff ? "diff-active" : ""} ${showSyntax ? "syntax-source" : ""}`}
        contentEditable={active}
        role="textbox"
        aria-label="Your edit"
        aria-describedby={describedBy}
        aria-multiline="true"
        aria-disabled={!active}
        aria-readonly={!active}
        tabIndex={active ? 0 : -1}
        suppressContentEditableWarning
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="none"
        data-testid="editable-surface"
        onKeyDown={(event) => {
          onKeyDown(event);
          if (smartPairs) handleSmartKeyDown(event, ref.current, onInputText);
        }}
        onPointerDown={onPointerDown}
        onMouseDown={onMouseDown}
        onInput={(event) => {
          const element = event.currentTarget;
          const nextSelection = getSelectionRange(element);
          lastSelection.current = nextSelection;
          onInputText(getEditablePlainText(element), nextSelection);
        }}
        onCopy={() => onClipboard("copy")}
        onCut={() => onClipboard("cut")}
        onPaste={() => onClipboard("paste")}
      />
      {showDiff && (
        <div className="diff-overlay" id="diff-text" aria-hidden="true">
          {diffTokens.map((token) => (
            <span key={token.id} className={token.status === "same" ? "" : "diff-wrong"}>
              {token.visible}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type SyntaxToken = {
  id: string;
  type: "keyword" | "string" | "number" | "punctuation" | "name" | "plain";
  text: string;
};

const pythonKeywords = new Set([
  "and",
  "def",
  "elif",
  "else",
  "for",
  "if",
  "in",
  "not",
  "or",
  "return",
  "True",
  "False",
  "None",
]);

function buildPythonSyntaxTokens(text: string): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const pattern = /(\s+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[()[\]{}:.,=+\-*/<>!]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      tokens.push(token(tokens.length, "plain", text.slice(cursor, match.index)));
    }
    const value = match[0];
    tokens.push(token(tokens.length, classifyPythonToken(value), value));
    cursor = match.index + value.length;
  }

  if (cursor < text.length) {
    tokens.push(token(tokens.length, "plain", text.slice(cursor)));
  }

  return tokens;
}

function classifyPythonToken(value: string): SyntaxToken["type"] {
  if (/^\s+$/.test(value)) return "plain";
  if (/^["']/.test(value)) return "string";
  if (/^\d/.test(value)) return "number";
  if (pythonKeywords.has(value)) return "keyword";
  if (/^[()[\]{}:.,=+\-*/<>!]+$/.test(value)) return "punctuation";
  if (/^[A-Za-z_]/.test(value)) return "name";
  return "plain";
}

function token(index: number, type: SyntaxToken["type"], text: string): SyntaxToken {
  return { id: `${index}-${type}-${text}`, type, text };
}

function handleSmartKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  element: HTMLDivElement | null,
  onInputText: (text: string, selection: SelectionState) => void,
) {
  if (!element || event.defaultPrevented) return;
  const selection = getSelectionRange(element);
  const text = getEditablePlainText(element);

  const pair = pairForKey(event.key);
  if (pair && selection.start === selection.end) {
    event.preventDefault();
    const nextText = spliceText(text, selection, pair.open + pair.close);
    const nextSelection = { start: selection.start + 1, end: selection.start + 1 };
    syncSmartText(element, nextText, nextSelection, onInputText);
    return;
  }

  if (event.key === "Backspace" && selection.start === selection.end) {
    const before = text[selection.start - 1];
    const after = text[selection.start];
    if (isEmptyPair(before, after)) {
      event.preventDefault();
      const nextSelection = { start: selection.start - 1, end: selection.start - 1 };
      const nextText = `${text.slice(0, selection.start - 1)}${text.slice(selection.start + 1)}`;
      syncSmartText(element, nextText, nextSelection, onInputText);
    }
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const indentation = currentLineIndentation(text, selection.start);
    const insertion = `\n${indentation}`;
    const nextText = spliceText(text, selection, insertion);
    const nextSelection = { start: selection.start + insertion.length, end: selection.start + insertion.length };
    syncSmartText(element, nextText, nextSelection, onInputText);
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    const insertion = "  ";
    const nextText = spliceText(text, selection, insertion);
    const nextSelection = { start: selection.start + insertion.length, end: selection.start + insertion.length };
    syncSmartText(element, nextText, nextSelection, onInputText);
  }
}

function pairForKey(key: string): { open: string; close: string } | null {
  if (key === "(") return { open: "(", close: ")" };
  if (key === "[") return { open: "[", close: "]" };
  if (key === "{") return { open: "{", close: "}" };
  if (key === "\"") return { open: "\"", close: "\"" };
  if (key === "'") return { open: "'", close: "'" };
  return null;
}

function isEmptyPair(before: string | undefined, after: string | undefined): boolean {
  return (before === "(" && after === ")")
    || (before === "[" && after === "]")
    || (before === "{" && after === "}")
    || (before === "\"" && after === "\"")
    || (before === "'" && after === "'");
}

function spliceText(text: string, selection: SelectionState, insertion: string): string {
  return `${text.slice(0, selection.start)}${insertion}${text.slice(selection.end)}`;
}

function currentLineIndentation(text: string, position: number): string {
  const lineStart = text.lastIndexOf("\n", position - 1) + 1;
  const line = text.slice(lineStart, position);
  return line.match(/^\s*/)?.[0] ?? "";
}

function syncSmartText(
  element: HTMLDivElement,
  text: string,
  selection: SelectionState,
  onInputText: (text: string, selection: SelectionState) => void,
) {
  element.textContent = text;
  setSelectionRange(element, selection.start, selection.end);
  onInputText(text, selection);
}
