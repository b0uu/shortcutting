import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSelectionRange } from "@/domain/text";
import { GameApp } from "./GameApp";

describe("GameApp", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    expect(activeTargetText()).toMatch(/delete the previous word/i);
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

    completeActiveText("Keep the final ");
    await flushRunUpdate();
    expect(screen.getByTestId("locked-segment").textContent).toBe("Keep the final ");
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();

    completeActiveText("Remove copy now");
    await flushRunUpdate();
    expect(screen.getAllByTestId("locked-segment")).toHaveLength(2);
    expect(screen.getByLabelText(/3 of 3 parts/i)).toBeInTheDocument();

    const editor = screen.getByTestId("editable-surface");
    setSelectionRange(editor, 10);
    await act(async () => {
      document.dispatchEvent(new Event("selectionchange"));
      await Promise.resolve();
    });
    await flushRunUpdate();
    expect(screen.getByText(/total time/i)).toBeInTheDocument();
  });

  it("lets users reset the active drill after a destructive edit", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "drill" }));

    completeActiveText("");
    await flushRunUpdate();

    expect(screen.getByTestId("drill-safety")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reset drill/i }));
    await flushRunUpdate();

    expect(screen.getByTestId("editable-surface")).toHaveTextContent("Keep the final draft");
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

    editor.textContent = "  value = 1";
    setSelectionRange(editor, "  value = 1".length);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter" });
    expect(editor.textContent).toBe("  value = 1\n  ");

    fireEvent.keyDown(editor, { key: "Tab", code: "Tab" });
    expect(editor.textContent).toBe("  value = 1\n    ");

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

async function flushRunUpdate() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}
