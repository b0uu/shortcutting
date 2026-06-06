import { expect, test, type Page } from "@playwright/test";

async function completeVisiblePart(page: Page, index: number, total: number) {
  const editor = page.getByTestId("editable-surface");
  const target = await rawTargetText(page);
  const before = await editor.evaluate((node) => node.textContent ?? "");
  const after = target ?? "";

  await editor.evaluate((node, value) => {
    node.textContent = value;
    node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }, after);

  if (index < total - 1) {
    await expect(page.locator(".pips")).toHaveAttribute("aria-label", `${index + 2} of ${total} parts`);
  } else {
    await expect(page.getByText(/total time/i)).toBeVisible();
  }

  return { before, after };
}

async function rawTargetText(page: Page): Promise<string> {
  return await page.locator(".target-block").evaluate((node) => {
    if (node instanceof HTMLElement) return node.dataset.targetText ?? node.textContent ?? "";
    return node.textContent ?? "";
  });
}

async function completeVisibleDrill(page: Page) {
  const prompt = (await page.locator(".target-block").textContent() ?? "").toLowerCase();
  await page.getByTestId("editable-surface").evaluate((node, currentPrompt) => {
    const text = node.textContent ?? "";
    const lowerText = text.toLowerCase();

    function setSelection(start: number, end = start) {
      const textNode = node.firstChild;
      if (!textNode) return;
      const range = document.createRange();
      range.setStart(textNode, Math.max(0, start));
      range.setEnd(textNode, Math.max(0, end));
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    }

    function setText(value: string, caret = value.length) {
      node.textContent = value;
      setSelection(caret);
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }

    const quoted = currentPrompt.match(/"([^"]+)"/)?.[1] ?? "";
    if (currentPrompt.includes("delete the previous word")
      || currentPrompt.includes("delete the next word")
      || currentPrompt.includes("delete the selected fragment")) {
      setText(text.replace(`${quoted} `, "").replace(` ${quoted}`, "").replace(quoted, ""));
      return;
    }
    if (currentPrompt.startsWith("replace ")) {
      const replacement = currentPrompt.match(/with "([^"]+)"/)?.[1] ?? "";
      setText(text.replace(quoted, replacement));
      return;
    }
    if (currentPrompt.includes("insert a comma") || currentPrompt.includes("insert a period")) {
      const mark = currentPrompt.includes("comma") ? "," : ".";
      const index = lowerText.indexOf(quoted) + quoted.length;
      setText(`${text.slice(0, index)}${mark}${text.slice(index)}`, index + 1);
      return;
    }
    if (currentPrompt.startsWith("select ")) {
      const start = lowerText.indexOf(quoted);
      setSelection(start, start + quoted.length);
      return;
    }
    if (currentPrompt.includes("move the caret to the start") || currentPrompt.includes("move the caret before")) {
      setSelection(lowerText.indexOf(quoted));
      return;
    }
    if (currentPrompt.includes("move the caret to the end") || currentPrompt.includes("move the caret after")) {
      const start = lowerText.indexOf(quoted);
      setSelection(start + quoted.length);
    }
  }, prompt);
}

test("loads the shortcutting ready editor", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await expect(page.getByRole("button", { name: "shortcutting home" })).toBeVisible();
  await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /target match/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "target match" })).toBeVisible();
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
  await expect(page.getByTestId("results-tab-coach")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "settings" }).locator(".shortcut-hint")).toBeVisible();
  await expect(page.getByRole("button", { name: "target match" }).locator(".shortcut-hint")).toBeVisible();
  await page.getByRole("button", { name: /switch to light mode/i }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /switch to dark mode/i }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "shortcut map" }).click();
  await expect(page.getByRole("dialog", { name: "Keyboard shortcut map" })).toBeVisible();
  await expect(page.getByLabel("mock keyboard").locator(".keyboard-row")).toHaveCount(5);
  await page.getByRole("button", { name: "close" }).click();
  await page.getByTestId("editable-surface").focus();
  await page.keyboard.press("Alt+2");
  await expect(page.getByRole("button", { name: "drill" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
  await page.getByTestId("editable-surface").focus();
  await page.keyboard.press("Alt+1");
  await expect(page.getByRole("button", { name: "target match" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
});

test("morphs run options without layout shift and avoids browser dialogs", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.dismiss();
  });

  await page.goto("/?seed=standard-v1");
  const modebar = page.locator(".modebar");
  const before = await modebar.boundingBox();
  expect(before).not.toBeNull();
  const attentionCount = await page.locator(".target-attention").count();
  if (attentionCount > 0) await expect(page.locator(".target-attention").first()).toHaveText(/^.$/);

  await page.getByRole("button", { name: /show run options/i }).click();
  await page.waitForTimeout(350);
  const expanded = await modebar.boundingBox();
  expect(expanded).not.toBeNull();
  expect(Math.abs((expanded?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(1);
  await expect(page.getByRole("button", { name: /collapse run options/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "4 parts" })).toBeVisible();
  await expect(page.getByRole("button", { name: "keyboard only" })).toBeVisible();

  await page.getByRole("button", { name: /collapse run options/i }).click();
  await page.waitForTimeout(350);
  const collapsed = await modebar.boundingBox();
  expect(Math.abs((collapsed?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(1);

  await page.getByTestId("editable-surface").press("a");
  await page.getByRole("button", { name: /show run options/i }).click();
  await page.getByRole("button", { name: "4 parts" }).click();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "1 of 4 parts");
  await page.getByTestId("editable-surface").press("a");
  await page.getByRole("button", { name: "coding" }).click();
  await expect(page.getByText(/python target/i)).toBeVisible();
  expect(dialogs).toEqual([]);
});

test("completes a 3-part run, persists PB, exports share card, and supports light theme", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
  for (let index = 0; index < 3; index += 1) {
    await completeVisiblePart(page, index, 3);
  }
  await expect(page.getByText(/personal best/i)).toBeVisible();
  await expect(page.locator(".results-grid .stat-card")).toHaveCount(4);
  await expect(page.getByLabel("keystroke replay")).toBeVisible();
  await expect(page.locator(".results-keystroke-panel")).toBeVisible();
  await expect(page.getByLabel("simulated keyboard")).toBeVisible();
  await expect(page.locator(".keystroke-ticker")).toBeVisible();
  await expect.poll(async () => page.locator(".keystroke-ticker span").evaluate((node) => getComputedStyle(node).animationName)).toContain("keystrokeTicker");
  await expect.poll(async () => page.locator(".results-playback-keyboard .lit").first().evaluate((node) => getComputedStyle(node).animationName)).toContain("playbackKeyPulse");
  await expect(page.getByText(/clean keyboard run|completed run/i)).toBeVisible();
  await expect(page.locator(".share-pair")).toHaveCount(0);
  await expect(page.locator(".share-stat")).toHaveCount(3);
  await expect(page.locator(".share-card")).toContainText("shortcutting");
  await expect.poll(async () => page.evaluate(() => {
    const results = document.querySelector(".results-view");
    return results ? getComputedStyle(results).outlineStyle : "missing";
  })).toBe("none");
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  await expect(page.getByTestId("results-tab-coach")).toContainText("press");
  await expect(page.getByTestId("results-tab-coach")).toContainText("tab");
  await page.getByRole("button", { name: "home", exact: true }).focus();
  await expect(page.getByRole("button", { name: "home", exact: true })).toBeFocused();
  await expect.poll(async () => page.evaluate(() => {
    const home = document.activeElement;
    return home instanceof HTMLElement ? getComputedStyle(home).boxShadow : "none";
  })).not.toBe("none");
  await page.getByRole("button", { name: "home", exact: true }).click();
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");

  for (let index = 0; index < 3; index += 1) {
    await completeVisiblePart(page, index, 3);
  }
  await page.locator(".results-view").focus();
  const downloadBeforeTab = await page.getByRole("button", { name: /share card/i }).boundingBox();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("results-tab-coach")).toHaveCount(0);
  const downloadAfterTab = await page.getByRole("button", { name: /share card/i }).boundingBox();
  expect(downloadBeforeTab?.x ?? 0).toBeGreaterThan(downloadAfterTab?.x ?? 0);
  await expect(page.getByRole("button", { name: /share card/i })).toBeFocused();
  await expect.poll(async () => page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement ? getComputedStyle(active).boxShadow : "none";
  })).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /play again/i })).toBeFocused();
  await expect.poll(async () => page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return { shadow: "none", padding: "0px" };
    const style = getComputedStyle(active);
    return { shadow: style.boxShadow, padding: style.paddingLeft };
  })).toEqual(expect.objectContaining({ shadow: expect.not.stringMatching(/^none$/), padding: expect.not.stringMatching(/^0px$/) }));
  await expect.poll(async () => page.evaluate(() => {
    const stored = localStorage.getItem("shortcutting:personal-bests");
    return stored ? Object.keys(JSON.parse(stored)).length : 0;
  })).toBeGreaterThan(0);

  await expect(page.getByRole("button", { name: /share card/i }).locator(".shortcut-hint")).toBeVisible();
  await expect(page.getByRole("button", { name: /play again/i }).locator(".shortcut-hint")).toBeVisible();
  await page.getByRole("button", { name: /share card/i }).click();
  await expect(page.getByLabel("share card preview")).toBeVisible();
  await expect(page.getByAltText("Generated share card screenshot")).toBeVisible();
  await expect(page.getByRole("button", { name: /copy image/i })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^download$/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("shortcutting-result.png");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /play again/i }).click();
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await page.getByRole("button", { name: "light" }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("runs result action shortcuts", async ({ page }) => {
  await page.goto("/?seed=standard-v1");

  for (let index = 0; index < 3; index += 1) {
    await completeVisiblePart(page, index, 3);
  }

  await page.keyboard.press("Alt+P");
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
});

test("completes a run and starts focused practice from results", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  for (let index = 0; index < 3; index += 1) {
    await completeVisiblePart(page, index, 3);
  }

  await expect(page.getByLabel("next practice suggestion")).toHaveCount(0);
  await expect(page.getByText(/hint focus/i)).toBeVisible();
  await page.getByRole("button", { name: /practice this again/i }).click();
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
  await expect(page.getByRole("button", { name: "target match" })).toHaveAttribute("aria-pressed", "true");
});

test("completes a Python Coding Mode run", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "coding" }).click();
  await expect(page.getByText(/python target/i)).toBeVisible();

  for (let index = 0; index < 3; index += 1) {
    await completeVisiblePart(page, index, 3);
  }
  await expect(page.getByText(/Python Coding/i)).toBeVisible();
});

test("completes Coding Mode runs across advanced and multiline generators", async ({ page }) => {
  for (const difficulty of ["advanced", "multi-line"]) {
    await page.goto(`/?seed=coding-${difficulty}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole("button", { name: "coding" }).click();
    await page.getByRole("button", { name: /show run options/i }).click();
    await page.getByRole("button", { name: difficulty }).click();
    await expect(page.getByText(/python target/i)).toBeVisible();
    if (difficulty === "multi-line") {
      await expect(page.locator(".target-block")).toContainText(/\n/);
      await expect.poll(async () => page.locator(".target-indent-guide").count()).toBeGreaterThan(0);
    }

    for (let index = 0; index < 3; index += 1) {
      await completeVisiblePart(page, index, 3);
    }
    await expect(page.getByText(/Python Coding/i)).toBeVisible();
  }
});

test("completes a multiline Coding part through real keyboard input", async ({ page }) => {
  await page.goto("/?seed=sample-multiline");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: /show run options/i }).click();
  await page.getByRole("button", { name: "multi-line" }).click();
  await page.getByRole("button", { name: "coding" }).click();
  await expect(page.getByText(/python target/i)).toBeVisible();

  const target = await rawTargetText(page);
  expect(target).toMatch(/^for .+:\n    print\(.+\)$/);
  const [header, body] = (target ?? "").split("\n");
  const editor = page.getByTestId("editable-surface");
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(header, { delay: 1 });
  await page.keyboard.press("Enter");
  await page.keyboard.type(body.trim(), { delay: 1 });

  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 3 parts");
  await expect(editor).not.toHaveText(target ?? "");
});

test("keeps the target panel and active editor stable when the target changes", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  const targetBefore = await page.locator(".target-panel").boundingBox();
  const editorBefore = await page.getByTestId("active-segment").boundingBox();
  const labelBefore = await page.locator(".edit-label").boundingBox();
  const firstTarget = await rawTargetText(page);
  await expect.poll(async () => page.evaluate(() => {
    const activeSegment = document.querySelector(".active-segment");
    return activeSegment ? Number.parseFloat(getComputedStyle(activeSegment, "::before").height) : 0;
  })).toBeLessThanOrEqual(112);

  await page.locator("[data-testid=\"editable-surface\"]").evaluate((node, value) => {
    node.textContent = value;
    node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }, firstTarget ?? "");

  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 3 parts");
  await expect.poll(async () => page.evaluate(() => {
    const activeSegment = document.querySelector(".active-segment");
    return activeSegment ? getComputedStyle(activeSegment, "::after").animationName : "missing";
  })).toBe("completionRailExtend");
  await expect.poll(async () => page.evaluate(() => {
    const activeSegment = document.querySelector<HTMLElement>(".active-segment");
    if (!activeSegment) return Number.POSITIVE_INFINITY;
    return Number.parseFloat(getComputedStyle(activeSegment, "::after").height);
  })).toBeLessThanOrEqual(112);
  await page.waitForTimeout(450);
  const targetAfter = await page.locator(".target-panel").boundingBox();
  const editorAfter = await page.getByTestId("active-segment").boundingBox();
  const labelAfter = await page.locator(".edit-label").boundingBox();
  expect(targetBefore).not.toBeNull();
  expect(targetAfter).not.toBeNull();
  expect(editorBefore).not.toBeNull();
  expect(editorAfter).not.toBeNull();
  expect(labelBefore).not.toBeNull();
  expect(labelAfter).not.toBeNull();
  expect(Math.abs((targetAfter?.y ?? 0) - (targetBefore?.y ?? 0))).toBeLessThan(1);
  expect(Math.abs((targetAfter?.height ?? 0) - (targetBefore?.height ?? 0))).toBeLessThan(1);
  expect(Math.abs((editorAfter?.y ?? 0) - (editorBefore?.y ?? 0))).toBeLessThan(1);
  expect(Math.abs((editorAfter?.height ?? 0) - (editorBefore?.height ?? 0))).toBeLessThan(1);
  expect((labelAfter?.y ?? 0)).toBeLessThan((labelBefore?.y ?? 0) - 20);
  await expect(page.locator(".target-block")).toHaveClass(/target-switched/);
});

test("keeps the editor focused after outside clicks", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  const editor = page.getByTestId("editable-surface");
  await expect(editor).toBeVisible();
  await expect.poll(async () => editor.textContent()).not.toBe("");
  const initialText = await editor.evaluate((node) => node.textContent ?? "");

  await page.locator(".target-panel").click();
  await expect.poll(async () => page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("editable-surface");
  await page.keyboard.type("x");
  await expect(editor).toHaveText(`${initialText ?? ""}x`);

  await page.locator(".target-panel").click();
  await expect.poll(async () => page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("editable-surface");
  await page.keyboard.type("y");
  await expect(editor).toHaveText(`${initialText ?? ""}xy`);
});

test("keyboard-only mode blocks active mouse cursor placement", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  const editor = page.getByTestId("editable-surface");
  await expect.poll(async () => editor.textContent()).not.toBe("");

  const initialSelection = await editor.evaluate((node) => {
    const selection = document.getSelection();
    return {
      text: node.textContent ?? "",
      anchorOffset: selection?.anchorOffset ?? -1,
      focusOffset: selection?.focusOffset ?? -1,
    };
  });
  const initialBox = await editor.boundingBox();
  expect(initialBox).not.toBeNull();
  await page.mouse.click(initialBox!.x + 8, initialBox!.y + initialBox!.height / 2);
  await expect.poll(async () => editor.evaluate((node) => {
    const selection = document.getSelection();
    return {
      text: node.textContent ?? "",
      anchorOffset: selection?.anchorOffset ?? -1,
      focusOffset: selection?.focusOffset ?? -1,
    };
  })).toEqual(initialSelection);

  await editor.evaluate((node) => (node as HTMLElement).focus());
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("abcd");

  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + 8, box!.y + box!.height / 2);
  await page.keyboard.type("Z");

  await expect(editor).toHaveText("abcdZ");
});

test("starts drill timing from caret movement", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.getByRole("button", { name: "drill" }).click();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");

  await page.getByTestId("editable-surface").evaluate((node) => {
    const text = node.firstChild;
    if (!text) return;
    const range = document.createRange();
    range.setStart(text, 0);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });

  await expect(page.getByTestId("timer")).not.toHaveText("00:00.0");
});

test("clears drill word selection before the next challenge starts", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.getByRole("button", { name: "drill" }).click();
  await expect(page.locator(".target-block")).toContainText(/^Select /);
  await completeVisibleDrill(page);

  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 5 parts");
  await expect.poll(async () => page.getByTestId("editable-surface").evaluate((node) => {
    const selection = document.getSelection();
    return {
      selectedText: selection?.toString() ?? "",
      collapsed: selection?.isCollapsed ?? false,
      insideEditor: selection?.rangeCount ? node.contains(selection.getRangeAt(0).commonAncestorContainer) : false,
    };
  })).toEqual({
    selectedText: "",
    collapsed: true,
    insideEditor: true,
  });
});

test("supports mid-text editing and paste in the contenteditable editor", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:3000" });
  await page.goto("/?seed=standard-v1");
  const editor = page.getByTestId("editable-surface");
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("abcd");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.type("X");
  await expect(editor).toHaveText("abcXd");
  await page.evaluate(() => navigator.clipboard.writeText("YZ"));
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await expect(editor).toHaveText("abcXYZd");
});

test("keeps editing available after the hint marker appears", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.getByTestId("editable-surface").press("a");
  await page.waitForTimeout(5100);

  await expect(page.getByTestId("active-segment")).toHaveClass(/hinting/);
  await expect(page.getByTestId("hint")).toBeVisible();
  await expect(page.locator(".diff-overlay")).toHaveCount(0);

  const target = await rawTargetText(page);
  const editor = page.getByTestId("editable-surface");
  await editor.evaluate((node, value) => {
    node.textContent = value;
    node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  }, target ?? "");

  await expect(page.getByTestId("locked-segment")).toHaveText(target ?? "");
  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 3 parts");
});

test("completes a target part through real keyboard input", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /show run options/i }).click();
  await page.getByRole("button", { name: "standard" }).click();

  const target = await rawTargetText(page);
  const editor = page.getByTestId("editable-surface");
  await editor.click();
  await editor.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page.keyboard.insertText(target ?? "");

  await expect(page.getByTestId("locked-segment")).toHaveText(target ?? "");
  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 3 parts");
});

test("keeps drill reset below the active editing line", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.getByRole("button", { name: "drill" }).click();
  const editor = page.getByTestId("editable-surface");

  await expect.poll(async () => page.evaluate(() => {
    const active = document.querySelector<HTMLElement>(".active-segment");
    if (!active) return Number.POSITIVE_INFINITY;
    const style = getComputedStyle(active, "::before");
    return Number.parseFloat(style.height);
  })).toBeLessThanOrEqual(42);
  await expect(page.getByTestId("drill-safety")).toHaveCount(0);

  await editor.press("Backspace");
  await expect(page.getByTestId("drill-safety")).toBeVisible();
  await expect(page.getByRole("button", { name: /reset drill/i }).locator(".shortcut-hint")).toBeVisible();

  const activeBox = await page.getByTestId("active-segment").boundingBox();
  const resetBox = await page.getByTestId("drill-safety").boundingBox();
  expect(activeBox).not.toBeNull();
  expect(resetBox).not.toBeNull();
  expect(resetBox!.y).toBeGreaterThan(activeBox!.y + activeBox!.height - 1);
});

test("keeps drill completion rail anchored to the active line", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.getByRole("button", { name: "drill" }).click();

  await completeVisibleDrill(page);

  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 5 parts");
  await expect(page.getByTestId("drill-safety")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => {
    const active = document.querySelector<HTMLElement>(".active-segment");
    const reset = document.querySelector<HTMLElement>(".drill-safety");
    if (!active || !reset) return Number.POSITIVE_INFINITY;
    const activeRect = active.getBoundingClientRect();
    const resetRect = reset.getBoundingClientRect();
    const style = getComputedStyle(active, "::after");
    const railBottom = activeRect.bottom - Number.parseFloat(style.bottom);
    return railBottom - resetRect.top;
  })).toBeLessThanOrEqual(0);
  await expect.poll(async () => page.evaluate(() => {
    const active = document.querySelector<HTMLElement>(".active-segment");
    if (!active) return Number.POSITIVE_INFINITY;
    return Number.parseFloat(getComputedStyle(active, "::after").height);
  })).toBeLessThanOrEqual(42);
});
