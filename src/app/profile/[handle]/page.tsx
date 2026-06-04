import Link from "next/link";
import { notFound } from "next/navigation";
import { formatElapsed } from "@/domain/timer";
import { getPublicProfileSummary } from "@/lib/supabase/cloudData";
import { createSupabasePublicClient } from "@/lib/supabase/server";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const client = createSupabasePublicClient();
  if (!client) {
    return (
      <main className="public-page">
        <nav className="public-nav">
          <Link href="/">shortcutting</Link>
          <Link href="/leaderboards">leaderboards</Link>
        </nav>
        <section className="public-hero">
          <p>public profile</p>
          <h1>@{handle}</h1>
          <span>Supabase is not configured yet.</span>
        </section>
      </main>
    );
  }

  const summary = await getPublicProfileSummary(client, handle);
  if (!summary) notFound();

  return (
    <main className="public-page">
      <nav className="public-nav">
        <Link href="/">shortcutting</Link>
        <Link href="/leaderboards">leaderboards</Link>
      </nav>
      <section className="public-profile-hero">
        <div className="account-avatar public-avatar" aria-hidden="true">
          {summary.profile.displayName.slice(0, 1).toLowerCase()}
        </div>
        <div>
          <p>public profile</p>
          <h1>{summary.profile.displayName}</h1>
          <span>@{summary.profile.handle}</span>
        </div>
      </section>
      {summary.profile.bio && <p className="public-bio">{summary.profile.bio}</p>}
      <section className="public-stat-grid" aria-label="profile summary">
        <div>
          <span>runs</span>
          <strong>{summary.totals.runs}</strong>
        </div>
        <div>
          <span>best time</span>
          <strong>{summary.totals.bestElapsedMs === null ? "none" : formatElapsed(summary.totals.bestElapsedMs)}</strong>
        </div>
        <div>
          <span>avg best pace</span>
          <strong>{summary.totals.editsPerMinute}</strong>
        </div>
      </section>
      <section className="profile-bests" aria-label="profile bests">
        <h2>public bests</h2>
        {summary.bests.length === 0 ? (
          <p className="empty-state">No synced bests yet.</p>
        ) : summary.bests.map((best) => (
          <div key={`${best.mode}-${best.difficulty}-${best.challengeCount}`} className="profile-best-row">
            <span>{labelMode(best.mode)}: {best.difficulty}: {best.challengeCount} parts</span>
            <strong>{formatElapsed(best.elapsedMs)}</strong>
          </div>
        ))}
      </section>
    </main>
  );
}

function labelMode(mode: string): string {
  if (mode === "target-match") return "target match";
  return mode;
}
