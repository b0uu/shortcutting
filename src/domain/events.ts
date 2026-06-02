import type { EditEvent, SelectionState } from "./types";

export function createEditEvent(
  type: EditEvent["type"],
  challengeId: string,
  timestamp: number,
  input: Partial<EditEvent> = {},
): EditEvent {
  return {
    id: `${challengeId}-${type}-${timestamp}-${Math.random().toString(36).slice(2)}`,
    timestamp,
    challengeId,
    type,
    ...input,
  };
}

export function sameSelection(a: SelectionState, b: SelectionState): boolean {
  return a.start === b.start && a.end === b.end;
}
