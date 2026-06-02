import { describe, expect, it } from "vitest";
import { getEditablePlainText, getSelectionRange, normalizeEditableText, setSelectionRange } from "./text";

describe("normalizeEditableText", () => {
  it("normalizes contenteditable artifacts without trimming meaningful whitespace", () => {
    expect(normalizeEditableText("alpha\u00a0beta\n")).toBe("alpha beta\n");
    expect(normalizeEditableText(" alpha  beta ")).toBe(" alpha  beta ");
    expect(normalizeEditableText("alpha\nbeta")).toBe("alpha\nbeta");
  });

  it("extracts text from contenteditable DOM without decoration text loss", () => {
    const element = document.createElement("div");
    element.innerHTML = "alpha&nbsp;<span class=\"diff-wrong\">beta</span><br>gamma";
    expect(getEditablePlainText(element)).toBe("alpha beta\ngamma");
  });

  it("strips one trailing newline produced by block contenteditable markup", () => {
    const element = document.createElement("div");
    element.innerHTML = "<div>alpha</div>";
    expect(getEditablePlainText(element)).toBe("alpha");
  });

  it("preserves meaningful trailing newlines from text nodes or explicit breaks", () => {
    const textNodeElement = document.createElement("div");
    textNodeElement.textContent = "alpha\n";
    expect(getEditablePlainText(textNodeElement)).toBe("alpha\n");

    const explicitBreakElement = document.createElement("div");
    explicitBreakElement.innerHTML = "<div>alpha<br></div>";
    expect(getEditablePlainText(explicitBreakElement)).toBe("alpha\n");
  });

  it("sets and reads a simple contenteditable selection", () => {
    const element = document.createElement("div");
    element.textContent = "abcdef";
    document.body.append(element);
    setSelectionRange(element, 2, 4);
    expect(getSelectionRange(element)).toEqual({ start: 2, end: 4 });
    element.remove();
  });
});
