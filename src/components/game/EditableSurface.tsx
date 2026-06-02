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
  onInputText: (text: string, selection: SelectionState) => void;
  onSelection: (selection: SelectionState) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
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
  onInputText,
  onSelection,
  onKeyDown,
  onMouseDown,
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

  return (
    <div className={`edit-stack ${showDiff ? "diff-active" : ""}`}>
      <div
        ref={ref}
        className={`edit-block ${nativeCaretFallback ? "native-caret" : ""} ${showDiff ? "diff-active" : ""}`}
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
        onKeyDown={onKeyDown}
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
