import { Suspense } from "react";
import { PublicSiteHeader, PublicSiteHeaderFallback } from "@/components/layout/PublicSiteHeader";
import { SettingsPageBody } from "./settings-page-body";

export default function SettingsPage() {
  return (
    <main className="public-page settings-route-page">
      <Suspense fallback={<PublicSiteHeaderFallback active="settings" />}>
        <PublicSiteHeader active="settings" />
      </Suspense>
      <SettingsPageBody />
    </main>
  );
}
