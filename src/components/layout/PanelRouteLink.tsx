"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type PanelRouteLinkProps = {
  panel: "history";
  children: ReactNode;
};

export function PanelRouteLink({ panel, children }: PanelRouteLinkProps) {
  return (
    <Link
      href={`/#panel=${panel}`}
      onClick={() => {
        window.sessionStorage.setItem("shortcutting:open-panel", panel);
      }}
    >
      {children}
    </Link>
  );
}
