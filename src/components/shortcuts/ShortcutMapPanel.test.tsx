import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShortcutMapPanel } from "./ShortcutMapPanel";

describe("ShortcutMapPanel", () => {
  it("updates the selected command and mock keyboard highlights", () => {
    render(<ShortcutMapPanel open platform="windows-linux" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /delete previous word/i }));

    expect(screen.getByText("delete previous word: ctrl + backspace")).toBeInTheDocument();
    const keyboard = screen.getByLabelText("mock keyboard");
    expect(within(keyboard).getByText("ctrl")).toHaveClass("lit");
    expect(within(keyboard).getByText("backspace")).toHaveClass("lit");
  });

  it("uses Mac glyphs for Mac shortcuts", () => {
    render(<ShortcutMapPanel open platform="mac" onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /delete previous word/i }));

    expect(screen.getByText("delete previous word: ⌥ + backspace")).toBeInTheDocument();
    expect(within(screen.getByLabelText("mock keyboard")).getAllByText("⌥").some((key) => key.classList.contains("lit"))).toBe(true);
  });
});
