import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSelectionRange } from "@/domain/text";
import { GameApp } from "./GameApp";

describe("GameApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/?seed=standard-v1");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to a 3-part Target Match run and waits for editor input", () => {
    render(<GameApp />);

    expect(screen.queryByRole("button", { name: /start challenge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /target match/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/1 of 3 parts/i)).toBeInTheDocument();
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
    expect(screen.getByTestId("editable-surface")).toHaveAttribute("contenteditable", "true");

    fireEvent.keyDown(screen.getByTestId("editable-surface"), { key: "ArrowLeft" });
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");

    beginRun();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("timer")).toHaveTextContent("00:01.0");
  });

  it("locks completed text, updates the active target in place, and shows no transition screen", async () => {
    render(<GameApp />);
    const firstTarget = activeTargetText();

    completeActiveText(firstTarget);
    await flushRunUpdate();

    expect(screen.getByTestId("locked-segment")).toHaveTextContent(firstTarget);
    expect(screen.queryByText(/target updated/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /target match/i })).not.toBeInTheDocument();
    expect(screen.getByText(/part 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByTestId("active-segment")).toBeInTheDocument();
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();
    expect(document.querySelector(".target-panel")).toHaveClass("updated");
    expect(activeTargetText()).not.toBe(firstTarget);
    expect(screen.getByTestId("editable-surface").textContent).not.toBe(firstTarget);
  });

  it("keeps validation strict and advances only the active segment", async () => {
    render(<GameApp />);
    const firstTarget = activeTargetText();

    completeActiveText(`${firstTarget} `);
    await flushRunUpdate();
    expect(screen.queryByTestId("locked-segment")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/1 of 3 parts/i)).toBeInTheDocument();

    completeActiveText(`${firstTarget}\n`);
    await flushRunUpdate();
    expect(screen.queryByTestId("locked-segment")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/1 of 3 parts/i)).toBeInTheDocument();

    completeActiveText(firstTarget);
    await flushRunUpdate();
    expect(screen.getByTestId("locked-segment")).toHaveTextContent(firstTarget);
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();
  });

  it("keeps the run timer cumulative across revealed parts", async () => {
    render(<GameApp />);
    beginRun();
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByTestId("timer")).toHaveTextContent("00:01.2");

    const firstTarget = activeTargetText();
    completeActiveText(firstTarget);
    await flushRunUpdate();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("timer")).toHaveTextContent("00:02.2");
  });

  it("stops the timer when final results render after 3 parts", async () => {
    render(<GameApp />);
    beginRun();
    act(() => vi.advanceTimersByTime(1000));

    await completeRun();

    expect(screen.getByText(/total time/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "00:01.0" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("heading", { name: "00:01.0" })).toBeInTheDocument();
  });

  it("offers focused practice from results and returns to a fresh run", async () => {
    render(<GameApp />);
    await completeRun();

    expect(screen.getByLabelText("next practice suggestion")).toHaveTextContent(/practice/i);
    fireEvent.click(screen.getByRole("button", { name: /practice this again/i }));
    act(() => vi.advanceTimersByTime(180));
    await flushRunUpdate();

    expect(screen.getByTestId("editable-surface")).toBeInTheDocument();
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
    expect(screen.getByRole("button", { name: "target match" })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks the active part after five idle seconds and keeps the editor editable", async () => {
    render(<GameApp />);
    beginRun();

    const firstTarget = activeTargetText();
    completeActiveText(firstTarget);
    await flushRunUpdate();

    act(() => vi.advanceTimersByTime(5000));

    expect(screen.getByTestId("active-segment")).toHaveClass("hinting");
    expect(screen.queryByTestId("hint")).not.toBeInTheDocument();
    expect(document.querySelector(".diff-overlay")).not.toBeInTheDocument();
    expect(screen.getByTestId("locked-segment")).toHaveTextContent(firstTarget);

    completeActiveText(activeTargetText());
    await flushRunUpdate();
    expect(screen.getAllByTestId("locked-segment")).toHaveLength(2);
  });

  it("hides and resets the hint marker on active-segment input", () => {
    render(<GameApp />);
    beginRun();

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByTestId("active-segment")).toHaveClass("hinting");

    fireEvent.keyDown(screen.getByTestId("editable-surface"), { key: "b" });
    expect(screen.getByTestId("active-segment")).not.toHaveClass("hinting");
    act(() => vi.advanceTimersByTime(4900));
    expect(screen.getByTestId("active-segment")).not.toHaveClass("hinting");
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByTestId("active-segment")).toHaveClass("hinting");
  });

  it("blocks settings during an active run but opens before a run", () => {
    render(<GameApp />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });

    const settingsButton = screen.getByRole("button", { name: "settings" });
    expect(settingsButton).not.toBeDisabled();
    beginRun();
    expect(settingsButton).toBeDisabled();
    expect(screen.getByTestId("editable-surface")).toHaveAttribute("contenteditable", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("opens settings, supports 4-part runs, updates theme, and returns focus on close", () => {
    render(<GameApp />);
    const settingsButton = screen.getByRole("button", { name: "settings" });
    fireEvent.click(settingsButton);
    expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: "light" }));
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "light");
    fireEvent.keyDown(screen.getByRole("dialog", { name: /settings/i }), { key: "Escape" });
    act(() => vi.advanceTimersByTime(0));
    expect(screen.queryByRole("button", { name: /start challenge/i })).not.toBeInTheDocument();
    expect(document.querySelector(".pips")).toHaveAttribute("aria-label", "1 of 4 parts");
    expect(settingsButton).toHaveFocus();
  });

  it("keeps run options collapsed until opened from the mode bar", () => {
    render(<GameApp />);

    const toggle = screen.getByRole("button", { name: /show run options/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("difficulty")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("difficulty")).toBeInTheDocument();
    expect(screen.getByText("parts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "multi-line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /collapse run options/i })).toBeInTheDocument();
  });

  it("renders subtle target attention ranges from challenge metadata", () => {
    render(<GameApp />);

    const highlighted = document.querySelectorAll(".target-attention");
    expect(highlighted.length).toBeGreaterThan(0);
    expect(Array.from(highlighted).every((node) => (node.textContent ?? "").length === 1)).toBe(true);
    expect(Array.from(highlighted).every((node) => activeTargetText().includes(node.textContent ?? ""))).toBe(true);
  });

  it("underlines extra active edit text and clears the hint when corrected", async () => {
    render(<GameApp />);
    const target = activeTargetText();

    completeActiveText(`${target} extra`);
    await flushRunUpdate();

    expect(screen.getByTestId("deletion-hint-overlay")).toBeInTheDocument();
    expect(document.querySelectorAll(".target-attention")).toHaveLength(0);
    const extraText = Array.from(document.querySelectorAll(".delete-extra"))
      .map((node) => node.textContent ?? "")
      .join("");
    expect(extraText).toContain(" extra");

    completeActiveText(target);
    await flushRunUpdate();

    expect(screen.queryByTestId("deletion-hint-overlay")).not.toBeInTheDocument();
  });

  it("applies and persists custom theme colors from settings", () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByRole("button", { name: "custom" }));
    fireEvent.change(screen.getByLabelText("accent"), { target: { value: "#336699" } });

    const shell = document.querySelector<HTMLElement>(".app-shell");
    expect(shell).toHaveAttribute("data-theme", "custom");
    expect(shell?.style.getPropertyValue("--accent")).toBe("#336699");

    const stored = JSON.parse(window.localStorage.getItem("shortcutting:settings") ?? "{}");
    expect(stored.theme).toBe("custom");
    expect(stored.customTheme.accent).toBe("#336699");
  });

  it("persists detailed settings and resets local history without a browser popup", () => {
    window.localStorage.setItem("shortcutting:results", JSON.stringify([{ id: "old" }]));
    window.localStorage.setItem("shortcutting:personal-bests", JSON.stringify({ best: { id: "old" } }));
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);

    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByRole("button", { name: "reduced" }));
    fireEvent.click(screen.getByRole("button", { name: "smart pairs off" }));
    fireEvent.click(screen.getByRole("button", { name: "reset history" }));

    const stored = JSON.parse(window.localStorage.getItem("shortcutting:settings") ?? "{}");
    expect(stored.reducedMotion).toBe(true);
    expect(stored.smartPairs).toBe(false);
    expect(window.localStorage.getItem("shortcutting:results")).toBeNull();
    expect(window.localStorage.getItem("shortcutting:personal-bests")).toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("does not use browser popups for mid-run mode or option changes", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);
    render(<GameApp />);
    beginRun();

    fireEvent.click(screen.getByRole("button", { name: /show run options/i }));
    fireEvent.click(screen.getByRole("button", { name: "4 parts" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
    expect(screen.getByLabelText(/1 of 4 parts/i)).toBeInTheDocument();

    beginRun();
    fireEvent.click(screen.getByRole("button", { name: "drill" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "drill" })).toHaveAttribute("aria-pressed", "true");
    expect(activeTargetText()).toMatch(/\w/);
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
    confirmSpy.mockRestore();
  });

  it("completes a configured 4-part run", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: /settings/i }), { key: "Escape" });
    act(() => vi.advanceTimersByTime(0));

    await completeRun(4);

    expect(screen.getByText(/total time/i)).toBeInTheDocument();
    expect(screen.getByText(/total time: 4-part challenge/i)).toBeInTheDocument();
  });

  it("uses selected multi-line difficulty and validates exact newlines", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByRole("button", { name: "multi-line" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: /settings/i }), { key: "Escape" });
    act(() => vi.advanceTimersByTime(0));

    expect(activeTargetText()).toContain("\n");
    completeActiveText(activeTargetText().replace("\n", " "));
    await flushRunUpdate();
    expect(screen.getByLabelText(/1 of 3 parts/i)).toBeInTheDocument();

    completeActiveText(activeTargetText());
    await flushRunUpdate();
    expect(screen.getByTestId("locked-segment").textContent).toContain("\n");
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();
  });

  it("blocks active-run mouse placement in keyboard-only mode", () => {
    render(<GameApp />);
    expect(fireEvent.mouseDown(screen.getByTestId("editable-surface"))).toBe(true);
    beginRun();
    expect(fireEvent.mouseDown(screen.getByTestId("editable-surface"))).toBe(false);
  });

  it("records mouse actions in mouse-allowed mode", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "settings" }));
    fireEvent.click(screen.getByRole("button", { name: "mouse allowed" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: /settings/i }), { key: "Escape" });
    act(() => vi.advanceTimersByTime(0));

    beginRun();
    expect(fireEvent.mouseDown(screen.getByTestId("editable-surface"))).toBe(true);
    await completeRun();

    expect(screen.getByText("mouse actions").previousElementSibling).toHaveTextContent("1");
  });

  it("completes text and cursor drills through the segmented UI", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "drill" }));

    await completeCurrentDrill();
    await flushRunUpdate();
    expect(screen.getByTestId("locked-segment").textContent).toBeTruthy();
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();

    await completeCurrentDrill();
    await flushRunUpdate();
    expect(screen.getAllByTestId("locked-segment")).toHaveLength(2);
    expect(screen.getByLabelText(/3 of 3 parts/i)).toBeInTheDocument();

    await completeCurrentDrill();
    await flushRunUpdate();
    expect(screen.getByText(/total time/i)).toBeInTheDocument();
  });

  it("lets users reset the active drill after a destructive edit", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "drill" }));
    const initialText = screen.getByTestId("editable-surface").textContent;

    completeActiveText("");
    await flushRunUpdate();

    expect(screen.getByTestId("drill-safety")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reset drill/i }));
    await flushRunUpdate();

    expect(screen.getByTestId("editable-surface")).toHaveTextContent(initialText ?? "");
    expect(screen.getByTestId("drill-safety")).toBeInTheDocument();
  });

  it("supports Python Coding Mode smart pairs, indentation, and exact completion", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: /coding/i }));
    expect(screen.getByText(/python target/i)).toBeInTheDocument();

    const editor = screen.getByTestId("editable-surface");
    editor.textContent = "";
    setSelectionRange(editor, 0);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "(", code: "Digit9" });
    expect(editor.textContent).toBe("()");

    fireEvent.keyDown(editor, { key: "Backspace", code: "Backspace" });
    expect(editor.textContent).toBe("");

    editor.textContent = "name";
    setSelectionRange(editor, 0, 4);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "(", code: "Digit9" });
    expect(editor.textContent).toBe("(name)");

    setSelectionRange(editor, 1, 5);
    fireEvent.keyDown(editor, { key: "\"", code: "Quote" });
    expect(editor.textContent).toBe("(\"name\")");

    setSelectionRange(editor, 6);
    fireEvent.keyDown(editor, { key: "\"", code: "Quote" });
    const quoteSkipSelection = window.getSelection();
    expect(quoteSkipSelection?.anchorOffset).toBe(7);

    editor.textContent = "  value = 1";
    setSelectionRange(editor, "  value = 1".length);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter" });
    expect(editor.textContent).toBe("  value = 1\n  ");

    fireEvent.keyDown(editor, { key: "Tab", code: "Tab" });
    expect(editor.textContent).toBe("  value = 1\n    ");

    editor.textContent = "first\nsecond";
    setSelectionRange(editor, 0, editor.textContent.length);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "Tab", code: "Tab" });
    expect(editor.textContent).toBe("  first\n  second");

    completeActiveText(activeTargetText());
    await flushRunUpdate();
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();
  });
});

function beginRun() {
  fireEvent.keyDown(screen.getByTestId("editable-surface"), { key: "a", code: "KeyA" });
}

function completeActiveText(text: string) {
  const editor = screen.getByTestId("editable-surface");
  editor.textContent = text;
  fireEvent.input(editor);
}

function activeTargetText() {
  const target = document.querySelector(".target-block")?.textContent;
  if (!target) throw new Error("Missing target text.");
  return target;
}

async function completeRun(count = 3) {
  for (let index = 0; index < count; index += 1) {
    completeActiveText(activeTargetText());
    await flushRunUpdate();
  }
}

async function completeCurrentDrill() {
  const prompt = activeTargetText().toLowerCase();
  const editor = screen.getByTestId("editable-surface");
  const words = (editor.textContent ?? "").replace(/\.$/, "").split(" ");
  if (prompt.includes("delete the previous word")) {
    completeActiveText([...words.slice(0, 2), ...words.slice(3)].join(" "));
  } else if (prompt.includes("delete the next word")) {
    completeActiveText([words[0], ...words.slice(2)].join(" "));
  } else if (prompt.includes("move to the previous word")) {
    beginRun();
    setSelectionRange(editor, words[0].length + 1);
    await dispatchSelectionChange();
  } else if (prompt.includes("move to the next word")) {
    beginRun();
    setSelectionRange(editor, words[0].length);
    await dispatchSelectionChange();
  } else if (prompt.includes("select the previous word")) {
    beginRun();
    const selected = words.at(-1) ?? "";
    const start = (editor.textContent ?? "").length - selected.length;
    setSelectionRange(editor, start, start + selected.length);
    await dispatchSelectionChange();
  } else if (prompt.includes("replace the current word")) {
    completeActiveText("Use a clear label.");
    setSelectionRange(editor, 6, 11);
    await dispatchSelectionChange();
  } else if (prompt.includes("insert punctuation")) {
    completeActiveText("Pause here, then continue.");
    setSelectionRange(editor, 10);
    await dispatchSelectionChange();
  } else {
    throw new Error(`Unhandled drill prompt: ${prompt}`);
  }
}

async function dispatchSelectionChange() {
  await act(async () => {
    document.dispatchEvent(new Event("selectionchange"));
    await Promise.resolve();
  });
}

async function flushRunUpdate() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
