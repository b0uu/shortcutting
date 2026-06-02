import type { Challenge, SelectionState } from "./types";
import { normalizeEditableText } from "./text";

export function isExactMatch(currentText: string, targetText: string): boolean {
  return currentText === targetText;
}

export function validateChallenge(
  challenge: Challenge,
  currentText: string,
  selection: SelectionState,
): boolean {
  const normalizedText = normalizeEditableText(currentText);

  if (challenge.mode === "target-match" || !challenge.drill) {
    return isExactMatch(normalizedText, challenge.targetText);
  }

  const validation = challenge.drill.validation;
  if (validation.type === "text") {
    return normalizedText === validation.expectedText;
  }
  if (validation.type === "cursor") {
    return selection.start === validation.expectedIndex && selection.end === validation.expectedIndex;
  }
  if (validation.type === "selection") {
    return selection.start === validation.expectedStart && selection.end === validation.expectedEnd;
  }
  return normalizedText === validation.expectedText
    && selection.start === validation.expectedIndex
    && selection.end === validation.expectedIndex;
}
