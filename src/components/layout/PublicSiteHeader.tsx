import Link from "next/link";
import { headers } from "next/headers";
import { PanelRouteLink } from "@/components/layout/PanelRouteLink";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import { detectPlatform } from "@/domain/platform";
import { getProfileByUserId } from "@/lib/supabase/cloudData";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

type PublicSiteHeaderProps = {
  active?: "leaderboards" | "profile";
  profileHref?: string;
  profileLabel?: string;
};

export function PublicSiteHeaderFallback({
  active,
}: Pick<PublicSiteHeaderProps, "active">) {
  return (
    <header className="app-header public-app-header public-app-header-fallback">
      <Link href="/" className="logo" aria-label="Back to shortcutting home">
        <span className="logo-mark" aria-hidden="true">&#8997;</span>
        <span>shortcutting</span>
      </Link>
      <nav aria-label="Primary">
        <Link href="/">
          <span>home</span>
          <ShortcutHint keys={["alt", "H"]} />
        </Link>
        <PanelRouteLink panel="history">
          <span>history</span>
          <ShortcutHint keys={["alt", "Y"]} />
        </PanelRouteLink>
        <Link href="/leaderboards" aria-current={active === "leaderboards" ? "page" : undefined}>
          <span>leaderboards</span>
        </Link>
        <PanelRouteLink panel="settings">
          <span>settings</span>
          <ShortcutHint keys={["esc"]} />
        </PanelRouteLink>
        <Link href="/onboarding" aria-current={active === "profile" ? "page" : undefined}>
          <span>profile</span>
        </Link>
      </nav>
    </header>
  );
}

export async function PublicSiteHeader({
  active,
  profileHref,
  profileLabel,
}: PublicSiteHeaderProps) {
  const platform = await detectRequestPlatform();
  const modifier = platform === "mac" ? "⌥" : "alt";
  const profileLink = profileHref === undefined ? await getSignedInProfileLink() : null;
  const resolvedProfileHref = profileHref ?? profileLink?.href ?? "/onboarding";
  const resolvedProfileLabel = profileLabel ?? profileLink?.label ?? "profile";

  return (
    <header className="app-header public-app-header">
      <Link href="/" className="logo" aria-label="Back to shortcutting home">
        <span className="logo-mark" aria-hidden="true">&#8997;</span>
        <span>shortcutting</span>
      </Link>
      <nav aria-label="Primary">
        <Link href="/">
          <span>home</span>
          <ShortcutHint keys={[modifier, "H"]} />
        </Link>
        <PanelRouteLink panel="history">
          <span>history</span>
          <ShortcutHint keys={[modifier, "Y"]} />
        </PanelRouteLink>
        <Link href="/leaderboards" aria-current={active === "leaderboards" ? "page" : undefined}>
          <span>leaderboards</span>
        </Link>
        <PanelRouteLink panel="settings">
          <span>settings</span>
          <ShortcutHint keys={["esc"]} />
        </PanelRouteLink>
        <Link href={resolvedProfileHref} aria-current={active === "profile" ? "page" : undefined}>
          <span>{resolvedProfileLabel}</span>
        </Link>
      </nav>
    </header>
  );
}

async function detectRequestPlatform() {
  const requestHeaders = await headers();
  return detectPlatform(requestHeaders.get("user-agent") ?? "");
}

async function getSignedInProfileLink(): Promise<{ href: string; label: string } | null> {
  const authClient = await createSupabaseServerClient();
  const dataClient = createSupabaseServiceClient();
  if (!authClient || !dataClient) return null;

  const { data } = await authClient.auth.getUser();
  if (!data.user) return null;

  try {
    const profile = await getProfileByUserId(dataClient, data.user.id);
    return profile ? { href: `/profile/${profile.handle}`, label: profile.handle } : null;
  } catch {
    return null;
  }
}
