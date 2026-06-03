export type DiffToken = {
  id: string;
  value: string;
  status: "same" | "wrong" | "missing" | "extra";
  visible: string;
};

export function buildDiffTokens(currentText: string, targetText: string): DiffToken[] {
  const tokens: DiffToken[] = [];
  const table = editDistanceTable(currentText, targetText);
  let currentIndex = 0;
  let targetIndex = 0;

  while (currentIndex < currentText.length || targetIndex < targetText.length) {
    const current = currentText[currentIndex];
    const target = targetText[targetIndex];
    const status = nextDiffStatus(currentText, targetText, currentIndex, targetIndex, table);
    const value = status === "missing" ? target ?? "" : current ?? "";

    tokens.push(diffToken(tokens.length, value, status));

    if (status !== "missing") currentIndex += 1;
    if (status !== "extra") targetIndex += 1;
  }

  return tokens;
}

export function buildDeletionHintTokens(currentText: string, targetText: string): DiffToken[] {
  const tokens: DiffToken[] = [];
  const currentTokens = textTokens(currentText);
  const targetTokens = textTokens(targetText);
  const table = tokenLcsTable(currentTokens, targetTokens);
  let currentIndex = 0;
  let targetIndex = 0;

  while (currentIndex < currentTokens.length) {
    const current = currentTokens[currentIndex];
    const target = targetTokens[targetIndex];
    if (target && tokensMatch(current, target)) {
      pushTokenCharacters(tokens, current.value, "same");
      currentIndex += 1;
      targetIndex += 1;
      continue;
    }

    const skipCurrent = table[currentIndex + 1]?.[targetIndex] ?? 0;
    const skipTarget = targetIndex < targetTokens.length ? table[currentIndex][targetIndex + 1] : -1;
    if (targetIndex >= targetTokens.length || skipCurrent >= skipTarget) {
      pushTokenCharacters(tokens, current.value, "extra");
      currentIndex += 1;
    } else {
      targetIndex += 1;
    }
  }

  return tokens;
}

export function changedTargetCharacterIndexes(sourceText: string, targetText: string): Set<number> {
  const changed = new Set<number>();
  const table = editDistanceTable(sourceText, targetText);
  let sourceIndex = 0;
  let targetIndex = 0;

  while (sourceIndex < sourceText.length || targetIndex < targetText.length) {
    const status = nextDiffStatus(sourceText, targetText, sourceIndex, targetIndex, table);
    if (status === "wrong" || status === "missing") changed.add(targetIndex);
    if (status !== "missing") sourceIndex += 1;
    if (status !== "extra") targetIndex += 1;
  }

  return changed;
}

type TextToken = {
  value: string;
  normalized: string;
};

function textTokens(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const pattern = /[A-Za-z0-9_]+|\s|[^\sA-Za-z0-9_]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const value = match[0];
    tokens.push({
      value,
      normalized: /^[A-Za-z0-9_]+$/.test(value) ? value.toLowerCase() : value,
    });
  }

  return tokens;
}

function tokenLcsTable(a: TextToken[], b: TextToken[]): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = a.length - 1; row >= 0; row -= 1) {
    for (let col = b.length - 1; col >= 0; col -= 1) {
      table[row][col] = tokensMatch(a[row], b[col])
        ? table[row + 1][col + 1] + 1
        : Math.max(table[row + 1][col], table[row][col + 1]);
    }
  }

  return table;
}

function tokensMatch(a: TextToken, b: TextToken): boolean {
  return a.normalized === b.normalized;
}

function pushTokenCharacters(tokens: DiffToken[], value: string, status: DiffToken["status"]) {
  for (const character of value) {
    tokens.push(diffToken(tokens.length, character, status));
  }
}

function diffToken(index: number, value: string, status: DiffToken["status"]): DiffToken {
  return {
    id: `${index}-${status}-${value}`,
    value,
    status,
    visible: visibleCharacter(value, status),
  };
}

function nextDiffStatus(
  currentText: string,
  targetText: string,
  currentIndex: number,
  targetIndex: number,
  table: number[][],
): DiffToken["status"] {
  const current = currentText[currentIndex];
  const target = targetText[targetIndex];
  if (current !== undefined && target !== undefined && current === target) return "same";
  if (current === undefined) return "missing";
  if (target === undefined) return "extra";

  const extraCost = table[currentIndex + 1]?.[targetIndex] ?? Number.POSITIVE_INFINITY;
  const missingCost = table[currentIndex]?.[targetIndex + 1] ?? Number.POSITIVE_INFINITY;
  const wrongCost = table[currentIndex + 1]?.[targetIndex + 1] ?? Number.POSITIVE_INFINITY;
  const bestCost = Math.min(extraCost, missingCost, wrongCost);

  if (bestCost === extraCost && current === " ") return "extra";
  if (bestCost === missingCost && target === " ") return "missing";
  if (bestCost === wrongCost) return "wrong";
  if (bestCost === extraCost) return "extra";
  return "missing";
}

function visibleCharacter(value: string, status: DiffToken["status"]): string {
  if (status === "missing") return "\u2227";
  if (value === " ") return status === "same" ? " " : "\u00b7";
  if (value === "\n") return "\u21b5";
  return value;
}

export function editDistance(a: string, b: string): number {
  return editDistanceTable(a, b)[0][0];
}

function editDistanceTable(a: string, b: string): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) table[row][b.length] = a.length - row;
  for (let col = 0; col < cols; col += 1) table[a.length][col] = b.length - col;

  for (let row = a.length - 1; row >= 0; row -= 1) {
    for (let col = b.length - 1; col >= 0; col -= 1) {
      const cost = a[row] === b[col] ? 0 : 1;
      table[row][col] = Math.min(
        table[row + 1][col] + 1,
        table[row][col + 1] + 1,
        table[row + 1][col + 1] + cost,
      );
    }
  }

  return table;
}
