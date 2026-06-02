export type DiffToken = {
  id: string;
  value: string;
  status: "same" | "wrong" | "missing" | "extra";
  visible: string;
};

export function buildDiffTokens(currentText: string, targetText: string): DiffToken[] {
  const max = Math.max(currentText.length, targetText.length);
  const tokens: DiffToken[] = [];

  for (let index = 0; index < max; index += 1) {
    const current = currentText[index];
    const target = targetText[index];
    const value = current ?? target ?? "";
    const status = current === target
      ? "same"
      : current === undefined
        ? "missing"
        : target === undefined
          ? "extra"
          : "wrong";

    tokens.push({
      id: `${index}-${status}-${value}`,
      value,
      status,
      visible: visibleCharacter(value, status),
    });
  }

  return tokens;
}

function visibleCharacter(value: string, status: DiffToken["status"]): string {
  if (status === "missing") return "\u2227";
  if (value === " ") return status === "same" ? " " : "\u00b7";
  if (value === "\n") return "\u21b5";
  return value;
}

export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) table[row][0] = row;
  for (let col = 0; col < cols; col += 1) table[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      table[row][col] = Math.min(
        table[row - 1][col] + 1,
        table[row][col - 1] + 1,
        table[row - 1][col - 1] + cost,
      );
    }
  }

  return table[a.length][b.length];
}
