import { expect, test } from "@playwright/test";

test("loads the shortcutting ready editor", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await expect(page.getByText("shortcutting")).toBeVisible();
  await expect(page.getByRole("button", { name: /start/i })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: /target match/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "target match" })).toBeVisible();
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
  await expect(page.getByTestId("results-tab-coach")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "settings" }).locator(".shortcut-hint")).toBeVisible();
  await expect(page.getByRole("button", { name: "target match" }).locator(".shortcut-hint")).toBeVisible();
  await page.getByRole("button", { name: "shortcut map" }).click();
  await expect(page.getByRole("dialog", { name: "Keyboard shortcut map" })).toBeVisible();
  await expect(page.getByLabel("mock keyboard").locator(".keyboard-row")).toHaveCount(5);
  await page.getByRole("button", { name: "close" }).click();
  await page.keyboard.press("Alt+2");
  await expect(page.getByRole("button", { name: "drill" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Alt+1");
  await expect(page.getByRole("button", { name: "target match" })).toHaveAttribute("aria-pressed", "true");
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
  expect(attentionCount).toBeGreaterThan(0);
  await expect(page.locator(".target-attention").first()).toHaveText(/^.$/);

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
  const expectedBefore: string[] = [];
  const expectedAfter: string[] = [];

  for (let index = 0; index < 3; index += 1) {
    const editor = page.getByTestId("editable-surface");
    const target = await page.locator(".target-block").textContent();
    expectedBefore.push(await editor.evaluate((node) => node.textContent ?? ""));
    expectedAfter.push(target ?? "");
    await editor.evaluate((node, value) => {
      node.textContent = value;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, target ?? "");
    if (index < 2) {
      await expect(page.locator(".pips")).toHaveAttribute("aria-label", `${index + 2} of 3 parts`);
    }
  }

  await expect(page.getByText(/total time/i)).toBeVisible();
  await expect(page.getByText(/personal best/i)).toBeVisible();
  await expect(page.getByText(/final text matched/i)).toBeVisible();
  await expect(page.locator(".share-pair .before")).toContainText(/.+/);
  await expect(page.locator(".share-pair .after")).toContainText(/.+/);
  expect(expectedBefore).toContain(await page.locator(".share-pair .before").textContent() ?? "");
  expect(expectedAfter).toContain(await page.locator(".share-pair .after").textContent() ?? "");
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
    const target = await page.locator(".target-block").textContent();
    await page.getByTestId("editable-surface").evaluate((node, value) => {
      node.textContent = value;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, target ?? "");
  }
  await expect(page.getByText(/total time/i)).toBeVisible();
  await page.locator(".results-view").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("results-tab-coach")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /download card/i })).toBeFocused();
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

  const downloadPromise = page.waitForEvent("download");
  await expect(page.getByRole("button", { name: /download card/i }).locator(".shortcut-hint")).toBeVisible();
  await expect(page.getByRole("button", { name: /play again/i }).locator(".shortcut-hint")).toBeVisible();
  await page.getByRole("button", { name: /download card/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("shortcutting-result.png");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "light" }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("runs result action shortcuts", async ({ page }) => {
  await page.goto("/?seed=standard-v1");

  for (let index = 0; index < 3; index += 1) {
    const target = await page.locator(".target-block").textContent();
    await page.getByTestId("editable-surface").evaluate((node, value) => {
      node.textContent = value;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, target ?? "");
  }

  await expect(page.getByText(/total time/i)).toBeVisible();
  await page.keyboard.press("Alt+P");
  await expect(page.getByTestId("editable-surface")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveText("00:00.0");
});

test("completes a run and starts focused practice from results", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  for (let index = 0; index < 3; index += 1) {
    const target = await page.locator(".target-block").textContent();
    await page.getByTestId("editable-surface").evaluate((node, value) => {
      node.textContent = value;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, target ?? "");
  }

  await expect(page.getByLabel("next practice suggestion")).toContainText(/practice/i);
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
    const target = await page.locator(".target-block").textContent();
    await page.getByTestId("editable-surface").evaluate((node, value) => {
      node.textContent = value;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    }, target ?? "");
  }

  await expect(page.getByText(/total time/i)).toBeVisible();
  await expect(page.getByText(/Python Coding/i)).toBeVisible();
});

test("keeps the target panel and active editor stable when the target changes", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  const targetBefore = await page.locator(".target-panel").boundingBox();
  const editorBefore = await page.getByTestId("active-segment").boundingBox();
  const labelBefore = await page.locator(".edit-label").boundingBox();
  const firstTarget = await page.locator(".target-block").textContent();
  await expect.poll(async () => page.evaluate(() => {
    const activeSegment = document.querySelector(".active-segment");
    return activeSegment ? Number.parseFloat(getComputedStyle(activeSegment, "::before").height) : 0;
  })).toBeLessThanOrEqual(36);

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
    const history = document.querySelector<HTMLElement>(".locked-stack-inner");
    if (!activeSegment || !history) return Number.POSITIVE_INFINITY;
    const railHeight = Number.parseFloat(getComputedStyle(activeSegment, "::after").height);
    const expectedHeight = Math.max(28, Math.round(Math.min(64, history.getBoundingClientRect().height)) + 28);
    return Math.abs(railHeight - expectedHeight);
  })).toBeLessThan(1);
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
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type("abcd");

  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + 8, box!.y + box!.height / 2);
  await page.keyboard.type("Z");

  await expect(editor).toHaveText("abcdZ");
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
  await expect(page.getByTestId("hint")).toHaveCount(0);
  await expect(page.locator(".diff-overlay")).toHaveCount(0);

  const target = await page.locator(".target-block").textContent();
  const editor = page.getByTestId("editable-surface");
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(target ?? "");

  await expect(page.getByTestId("locked-segment")).toHaveText(target ?? "");
  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 3 parts");
});

test("completes a target part through real keyboard input", async ({ page }) => {
  await page.goto("/?seed=standard-v1");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const target = await page.locator(".target-block").textContent();
  const editor = page.getByTestId("editable-surface");
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.type(target ?? "");

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

  await page.getByTestId("editable-surface").evaluate((node) => {
    const words = (node.textContent ?? "").split(" ");
    node.textContent = [...words.slice(0, 2), ...words.slice(3)].join(" ");
    node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  });

  await expect(page.locator(".pips")).toHaveAttribute("aria-label", "2 of 3 parts");
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
