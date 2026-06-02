export function normalizeEditableText(value: string): string {
  return value.replace(/\u00a0/g, " ");
}

export function getEditablePlainText(element: HTMLElement): string {
  const text = normalizeEditableText(readContentEditableText(element));
  return shouldStripBrowserTrailingNewline(element, text) ? text.slice(0, -1) : text;
}

export function setSelectionRange(element: HTMLElement, start: number, end = start) {
  const doc = element.ownerDocument;
  const selection = doc.getSelection();
  if (!selection) return;

  const textNode = ensureTextNode(element);
  const safeStart = Math.max(0, Math.min(start, textNode.textContent?.length ?? 0));
  const safeEnd = Math.max(0, Math.min(end, textNode.textContent?.length ?? 0));
  const range = doc.createRange();
  range.setStart(textNode, safeStart);
  range.setEnd(textNode, safeEnd);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function getSelectionRange(element: HTMLElement): { start: number; end: number } {
  const selection = element.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { start: 0, end: 0 };
  }

  const range = selection.getRangeAt(0);
  const start = offsetWithin(element, range.startContainer, range.startOffset);
  const end = offsetWithin(element, range.endContainer, range.endOffset);
  return { start, end };
}

function ensureTextNode(element: HTMLElement): Text {
  if (element.firstChild?.nodeType === Node.TEXT_NODE) {
    return element.firstChild as Text;
  }

  const textNode = element.ownerDocument.createTextNode(element.textContent || "");
  element.replaceChildren(textNode);
  return textNode;
}

function readContentEditableText(element: HTMLElement): string {
  let text = "";

  element.childNodes.forEach((node) => {
    text += readNodeText(node);
  });

  return text;
}

function readNodeText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }

  if (node.nodeName === "BR") {
    return "\n";
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const element = node as HTMLElement;
  let text = "";
  element.childNodes.forEach((child) => {
    text += readNodeText(child);
  });

  if (isBlockElement(element) && text && !text.endsWith("\n")) {
    return `${text}\n`;
  }

  return text;
}

function isBlockElement(element: HTMLElement): boolean {
  return ["DIV", "P"].includes(element.tagName);
}

function shouldStripBrowserTrailingNewline(element: HTMLElement, value: string): boolean {
  if (!value.endsWith("\n")) return false;
  const lastChild = element.lastChild;
  if (!lastChild || lastChild.nodeType !== Node.ELEMENT_NODE) return false;
  const lastElement = lastChild as HTMLElement;
  return isBlockElement(lastElement) && !endsWithExplicitLineBreak(lastElement);
}

function endsWithExplicitLineBreak(element: HTMLElement): boolean {
  const lastChild = element.lastChild;
  if (!lastChild) return false;
  if (lastChild.nodeName === "BR") return true;
  if (lastChild.nodeType === Node.ELEMENT_NODE) {
    return endsWithExplicitLineBreak(lastChild as HTMLElement);
  }
  return false;
}

function offsetWithin(root: Node, target: Node, offset: number): number {
  const walker = root.ownerDocument?.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  if (!walker) return 0;

  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === target) {
      return total + offset;
    }
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }

  return total;
}
