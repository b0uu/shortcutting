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

  it("honors global mode shortcuts while the editor is focused without starting the run", () => {
    render(<GameApp />);
    const editor = screen.getByTestId("editable-surface");
    editor.focus();

    const eventAccepted = fireEvent.keyDown(editor, { key: "™", code: "Digit2", altKey: true });
    expect(eventAccepted).toBe(false);
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");

    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole("button", { name: "drill" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
  });

  it("locks completed text, updates the active target in place, and shows no transition screen", async () => {
    render(<GameApp />);
    const firstTarget = activeTargetText();

    completeActiveText(firstTarget);
    await flushRunUpdate();

    expect(screen.getByTestId("locked-segment").textContent).toBe(firstTarget);
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
    expect(screen.getByTestId("locked-segment").textContent).toBe(firstTarget);
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

    expect(screen.queryByLabelText("next practice suggestion")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /practice this again/i }));
    expect(document.querySelector("main")).toHaveClass("screen-crossfade");
    act(() => vi.advanceTimersByTime(220));
    await flushRunUpdate();

    expect(screen.getByTestId("editable-surface")).toBeInTheDocument();
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
    expect(screen.getByRole("button", { name: "target match" })).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector("main")).not.toHaveClass("screen-crossfade");
  });

  it("crossfades smoothly from results when playing again", async () => {
    render(<GameApp />);
    await completeRun();

    fireEvent.click(screen.getByRole("button", { name: /play again/i }));
    expect(screen.getByTestId("editable-surface")).toBeInTheDocument();
    expect(document.querySelector("main")).toHaveClass("screen-crossfade");

    act(() => vi.advanceTimersByTime(180));
    expect(document.querySelector("main")).toHaveClass("screen-crossfade");

    act(() => vi.advanceTimersByTime(40));
    await flushRunUpdate();
    expect(document.querySelector("main")).not.toHaveClass("screen-crossfade");
    expect(screen.getByTestId("timer")).toHaveTextContent("00:00.0");
  });

  it("marks the active part after five idle seconds and keeps the editor editable", async () => {
    render(<GameApp />);
    beginRun();

    const firstTarget = activeTargetText();
    completeActiveText(firstTarget);
    await flushRunUpdate();

    act(() => vi.advanceTimersByTime(5000));

    expect(screen.getByTestId("active-segment")).toHaveClass("hinting");
    expect(screen.getByTestId("hint")).toBeInTheDocument();
    expect(document.querySelector(".diff-overlay")).not.toBeInTheDocument();
    expect(screen.getByTestId("locked-segment").textContent).toBe(firstTarget);

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
    const settingsLink = screen.getByRole("link", { name: "settings" });
    expect(settingsLink).toHaveAttribute("href", "/settings");
    beginRun();
    const settingsButton = screen.getByRole("button", { name: "settings" });
    expect(settingsButton).toBeDisabled();
    expect(screen.getByTestId("editable-surface")).toHaveAttribute("contenteditable", "true");

    fireEvent.keyDown(window, { key: "Escape" });
    act(() => vi.advanceTimersByTime(260));
    expect(settingsButton).toBeDisabled();
  });

  it("hydrates saved settings for 4-part runs and theme", () => {
    window.localStorage.setItem("shortcutting:settings", JSON.stringify({ challengeCount: 4, theme: "light" }));
    render(<GameApp />);

    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "light");
    expect(screen.queryByRole("button", { name: /start challenge/i })).not.toBeInTheDocument();
    expect(document.querySelector(".pips")).toHaveAttribute("aria-label", "1 of 4 parts");
  });

  it("toggles light and dark themes from the footer", () => {
    render(<GameApp />);

    fireEvent.click(screen.getByRole("button", { name: /switch to light mode/i }));
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "light");

    fireEvent.click(screen.getByRole("button", { name: /switch to dark mode/i }));
    expect(document.querySelector(".app-shell")).toHaveAttribute("data-theme", "dark");
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

  it("uses 5 parts by default for drill mode and offers longer drill runs", () => {
    render(<GameApp />);

    fireEvent.click(screen.getByRole("button", { name: "drill" }));
    expect(screen.getByLabelText(/1 of 5 parts/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show run options/i }));
    expect(screen.getByRole("button", { name: "5 parts" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "10 parts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15 parts" })).toBeInTheDocument();
  });

  it("renders subtle target attention ranges from challenge metadata", () => {
    render(<GameApp />);

    const highlighted = document.querySelectorAll(".target-attention");
    expect(Array.from(highlighted).every((node) => (node.textContent ?? "").length <= 1)).toBe(true);
    expect(Array.from(highlighted).every((node) => {
      const text = node.textContent ?? "";
      return text === "" || activeTargetText().includes(text);
    })).toBe(true);
  });

  it("marks extra active edit text and clears the hint when corrected", async () => {
    render(<GameApp />);
    const target = activeTargetText();

    completeActiveText(`${target} extra`);
    await flushRunUpdate();

    expect(screen.getByTestId("deletion-hint-overlay")).toBeInTheDocument();
    expect(document.querySelectorAll(".target-attention")).toHaveLength(0);
    const extraText = Array.from(document.querySelectorAll(".delete-extra"))
      .map((node) => node.textContent ?? "")
      .join("");
    expect(extraText).toContain("extra");

    completeActiveText(target);
    await flushRunUpdate();

    expect(screen.queryByTestId("deletion-hint-overlay")).not.toBeInTheDocument();
  });

  it("applies and persists custom theme colors from settings", () => {
    window.localStorage.setItem("shortcutting:settings", JSON.stringify({
      theme: "custom",
      customTheme: { accent: "#336699" },
    }));
    render(<GameApp />);

    const shell = document.querySelector<HTMLElement>(".app-shell");
    expect(shell).toHaveAttribute("data-theme", "custom");
    expect(shell?.style.getPropertyValue("--accent")).toBe("#336699");
  });

  it("does not expose the removed settings popup from the game shell", () => {
    window.localStorage.setItem("shortcutting:results", JSON.stringify([{ id: "old" }]));
    window.localStorage.setItem("shortcutting:personal-bests", JSON.stringify({ best: { id: "old" } }));
    const confirmSpy = vi.spyOn(window, "confirm").mockImplementation(() => false);

    render(<GameApp />);

    expect(screen.getByRole("link", { name: "settings" })).toHaveAttribute("href", "/settings");
    expect(screen.queryByRole("dialog", { name: /settings/i })).not.toBeInTheDocument();
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
    window.localStorage.setItem("shortcutting:settings", JSON.stringify({ challengeCount: 4 }));
    render(<GameApp />);

    await completeRun(4);

    expect(screen.getByText(/total time/i)).toBeInTheDocument();
    expect(screen.getByText(/total time: 4-part challenge/i)).toBeInTheDocument();
  });

  it("uses selected multi-line difficulty and validates exact newlines", async () => {
    render(<GameApp />);

    expect(activeTargetText()).toContain("\n");
    completeActiveText(activeTargetText().replace("\n", " "));
    await flushRunUpdate();
    expect(screen.getByLabelText(/1 of 3 parts/i)).toBeInTheDocument();

    completeActiveText(activeTargetText());
    await flushRunUpdate();
    expect(screen.getByTestId("locked-segment").textContent).toContain("\n");
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();
  });

  it("blocks mouse and pointer caret placement in keyboard-only mode", () => {
    render(<GameApp />);
    expect(fireEvent.mouseDown(screen.getByTestId("editable-surface"))).toBe(false);
    expect(fireEvent.pointerDown(screen.getByTestId("editable-surface"))).toBe(false);
    beginRun();
    expect(fireEvent.mouseDown(screen.getByTestId("editable-surface"))).toBe(false);
    expect(fireEvent.pointerDown(screen.getByTestId("editable-surface"))).toBe(false);
  });

  it("records mouse actions in mouse-allowed mode", async () => {
    window.localStorage.setItem("shortcutting:settings", JSON.stringify({ mousePolicy: "mouse-allowed" }));
    render(<GameApp />);

    beginRun();
    expect(fireEvent.mouseDown(screen.getByTestId("editable-surface"))).toBe(true);
    await completeRun();

    expect(screen.getByText(/1 mouse actions/)).toBeInTheDocument();
  });

  it("completes text and cursor drills through the segmented UI", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "drill" }));

    await completeCurrentDrill();
    await flushRunUpdate();
    expect(screen.getByTestId("locked-segment").textContent).toBeTruthy();
    expect(screen.getByLabelText(/2 of 5 parts/i)).toBeInTheDocument();

    await completeCurrentDrill();
    await flushRunUpdate();
    expect(screen.getAllByTestId("locked-segment")).toHaveLength(2);
    expect(screen.getByLabelText(/3 of 5 parts/i)).toBeInTheDocument();

    for (let index = 0; index < 3; index += 1) {
      await completeCurrentDrill();
      await flushRunUpdate(index === 2 ? 1300 : 320);
    }
    expect(screen.getByText(/total time/i)).toBeInTheDocument();
  });

  it("starts drill timing when the user moves the caret", async () => {
    render(<GameApp />);
    fireEvent.click(screen.getByRole("button", { name: "drill" }));
    const editor = screen.getByTestId("editable-surface");

    setSelectionRange(editor, 0);
    await dispatchSelectionChange();
    act(() => vi.advanceTimersByTime(1000));

    expect(screen.getByTestId("timer")).toHaveTextContent("00:01.0");
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
    expect(editor.textContent).toBe("  value = 1\n      ");

    editor.textContent = "if ready:";
    setSelectionRange(editor, editor.textContent.length);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "Enter", code: "Enter" });
    expect(editor.textContent).toBe("if ready:\n    ");

    editor.textContent = "first\nsecond";
    setSelectionRange(editor, 0, editor.textContent.length);
    fireEvent.input(editor);
    fireEvent.keyDown(editor, { key: "Tab", code: "Tab" });
    expect(editor.textContent).toBe("    first\n    second");

    completeActiveText(activeTargetText());
    await flushRunUpdate();
    expect(screen.getByLabelText(/2 of 3 parts/i)).toBeInTheDocument();
  });

  it("signals required Python indentation in the target and active editor", async () => {
    window.history.replaceState(null, "", "/?seed=sample-multiline");
    render(<GameApp />);

    fireEvent.click(screen.getByRole("button", { name: /show run options/i }));
    fireEvent.click(screen.getByRole("button", { name: "multi-line" }));
    fireEvent.click(screen.getByRole("button", { name: "coding" }));

    const target = activeTargetText();
    expect(target).toContain("\n    ");
    expect(document.querySelectorAll(".target-indent-guide").length).toBeGreaterThan(0);

    const underIndented = target
      .split("\n")
      .map((line) => line.startsWith("    ") ? line.slice(4) : line)
      .join("\n");
    completeActiveText(underIndented);
    await flushRunUpdate();

    expect(screen.getByTestId("indent-hint-overlay")).toBeInTheDocument();
    expect(document.querySelectorAll(".indent-hint-line.needs-indent").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/1 of 3 parts/i)).toBeInTheDocument();
  });
});

function beginRun() {
  fireEvent.keyDown(screen.getByTestId("editable-surface"), { key: "a", code: "KeyA" });
}

function completeActiveText(text: string) {
  const editor = screen.getByTestId("editable-surface");
  act(() => {
    editor.textContent = text;
    fireEvent.input(editor);
  });
}

function activeTargetText() {
  const target = document.querySelector(".target-block")?.textContent;
  if (!target) throw new Error("Missing target text.");
  return target;
}

async function completeRun(count = 3) {
  for (let index = 0; index < count; index += 1) {
    completeActiveText(activeTargetText());
    await flushRunUpdate(index === count - 1 ? 1300 : 320);
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
  } else if (prompt.includes("move to the previous word") || prompt.includes("move the caret to the start") || prompt.includes("move to the start")) {
    beginRun();
    setSelectionRange(editor, words[0].length + 1);
    await dispatchSelectionChange();
  } else if (prompt.includes("move to the next word") || prompt.includes("move the caret to the end") || prompt.includes("move to the end")) {
    beginRun();
    setSelectionRange(editor, words[0].length);
    await dispatchSelectionChange();
  } else if (prompt.includes("move the caret before")) {
    beginRun();
    const char = prompt.match(/"([^"]+)"/)?.[1] ?? "";
    const index = (editor.textContent ?? "").toLowerCase().indexOf(char);
    setSelectionRange(editor, index);
    await dispatchSelectionChange();
  } else if (prompt.includes("move the caret after")) {
    beginRun();
    const char = prompt.match(/"([^"]+)"/)?.[1] ?? "";
    const index = (editor.textContent ?? "").toLowerCase().indexOf(char);
    setSelectionRange(editor, index + char.length);
    await dispatchSelectionChange();
  } else if (prompt.includes("select the previous word") || prompt.includes("select the final word")) {
    beginRun();
    const selected = words.at(-1) ?? "";
    const start = (editor.textContent ?? "").length - selected.length;
    setSelectionRange(editor, start, start + selected.length);
    await dispatchSelectionChange();
  } else if (prompt.startsWith("select the line")) {
    beginRun();
    const selected = prompt.match(/"([^"]+)"/)?.[1] ?? "";
    const text = editor.textContent ?? "";
    const start = text.toLowerCase().indexOf(selected);
    setSelectionRange(editor, start, start + selected.length);
    await dispatchSelectionChange();
  } else if (prompt.startsWith("select \"")) {
    beginRun();
    const selected = prompt.match(/"([^"]+)"/)?.[1] ?? "";
    const text = editor.textContent ?? "";
    const start = text.toLowerCase().indexOf(selected);
    setSelectionRange(editor, start, start + selected.length);
    await dispatchSelectionChange();
  } else if (prompt.includes("replace the current word") || prompt.includes("replace the selected word") || prompt.startsWith("replace \"")) {
    const replacement = prompt.match(/with "([^"]+)"/)?.[1];
    const selected = prompt.match(/replace "([^"]+)"/)?.[1] ?? prompt.match(/selected word "([^"]+)"/)?.[1] ?? words[1];
    if (!replacement) throw new Error(`Missing replacement in drill prompt: ${prompt}`);
    completeActiveText((editor.textContent ?? "").replace(selected, replacement));
  } else if (prompt.includes("delete the selected fragment")) {
    const selected = prompt.match(/"([^"]+)"/)?.[1];
    if (!selected) throw new Error(`Missing selected fragment in drill prompt: ${prompt}`);
    completeActiveText((editor.textContent ?? "").replace(`${selected} `, "").replace(selected, ""));
  } else if (prompt.includes("insert punctuation") || prompt.includes("insert a comma")) {
    const anchor = prompt.match(/after "([^"]+)"/)?.[1] ?? words[1];
    const text = editor.textContent ?? "";
    const index = text.indexOf(anchor) + anchor.length;
    completeActiveText(`${text.slice(0, index)},${text.slice(index)}`);
  } else if (prompt.includes("insert a period")) {
    const text = editor.textContent ?? "";
    const anchor = prompt.match(/after "([^"]+)"/)?.[1] ?? words[1];
    const index = text.indexOf(anchor) + anchor.length;
    completeActiveText(`${text.slice(0, index)}.${text.slice(index)}`);
    setSelectionRange(editor, index + 1);
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

async function flushRunUpdate(durationMs = 320) {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    vi.advanceTimersByTime(durationMs);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}
