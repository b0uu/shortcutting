"use client";

import { useEffect } from "react";

type PublicNavShortcutsProps = {
  profileHref: string;
};

export function PublicNavShortcuts({ profileHref }: PublicNavShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const key = shortcutKey(event);
      if (!key) return;

      event.preventDefault();
      if (key === "h") {
        window.location.assign("/");
      } else if (key === "y") {
        window.sessionStorage.setItem("shortcutting:open-panel", "history");
        window.location.assign("/#panel=history");
      } else if (key === "l") {
        window.location.assign("/leaderboards");
      } else if (key === "a") {
        window.location.assign(profileHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [profileHref]);

  return null;
}

function shortcutKey(event: KeyboardEvent): "h" | "y" | "l" | "a" | null {
  if (event.code === "KeyH") return "h";
  if (event.code === "KeyY") return "y";
  if (event.code === "KeyL") return "l";
  if (event.code === "KeyA") return "a";

  const key = event.key.toLowerCase();
  if (key === "h" || key === "y" || key === "l" || key === "a") return key;
  return null;
}
