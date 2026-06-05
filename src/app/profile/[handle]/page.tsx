import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
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
        <PublicSiteHeader active="profile" />
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
      <PublicSiteHeader active="profile" />
      <section className="profile-main">
        <div className="profile-identity">
          <div className="avatar" aria-hidden="true">
            {initialsFor(summary.profile.displayName, summary.profile.handle)}
          </div>
          <div className="identity-text">
            <div className="identity-name">
              {summary.profile.displayName}
              {summary.totals.bestElapsedMs !== null && <span className="identity-badge">personal best</span>}
            </div>
            <div className="identity-meta">
              member since {formatMemberSince(summary.profile.createdAt)} - {summary.totals.runs} runs completed
            </div>
            {summary.profile.bio && <div className="identity-meta">{summary.profile.bio}</div>}
          </div>
        </div>

        <div className="pb-strip" aria-label="profile summary">
          <div className="pb-item">
            <div className="pb-label">best time</div>
            <div className="pb-val">{formatMetricSeconds(summary.totals.bestElapsedMs)}</div>
            <div className="pb-sub">{bestBucketLabel(summary.bests[0])}</div>
          </div>
          <div className="pb-item">
            <div className="pb-label">best edits/min</div>
            <div className="pb-val">{summary.totals.editsPerMinute}</div>
            <div className="pb-sub">keyboard only</div>
          </div>
          <div className="pb-item">
            <div className="pb-label">runs</div>
            <div className="pb-val">{summary.totals.runs}</div>
            <div className="pb-sub">synced public total</div>
          </div>
          <div className="pb-item">
            <div className="pb-label">public bests</div>
            <div className="pb-val">{summary.bests.length}</div>
            <div className="pb-sub">visible buckets</div>
          </div>
        </div>

        <div>
          <div className="section-head">
            <div className="section-title">public bests</div>
            <div className="section-link">@{summary.profile.handle}</div>
          </div>
          {summary.bests.length === 0 ? (
            <p className="empty-state">No synced bests yet.</p>
          ) : (
            <table className="runs-table">
              <thead>
                <tr>
                  <th>mode</th>
                  <th>time</th>
                  <th>parts</th>
                  <th>edits/min</th>
                  <th>date</th>
                </tr>
              </thead>
              <tbody>
                {summary.bests.map((best, index) => (
                  <tr key={`${best.mode}-${best.difficulty}-${best.challengeCount}`}>
                    <td>
                      <div className="run-mode">
                        {labelMode(best.mode)}
                        {index === 0 && <span className="run-pb">PB</span>}
                      </div>
                      <div className="run-meta">{best.difficulty} - keyboard only</div>
                    </td>
                    <td><span className="run-time">{formatElapsed(best.elapsedMs)}</span></td>
                    <td>{best.challengeCount}</td>
                    <td>{best.editsPerMinute}</td>
                    <td>{formatShortDate(best.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function formatMetricSeconds(value: number | null): string {
  if (value === null) return "none";
  if (value >= 60_000) return formatElapsed(value);
  return `${(value / 1000).toFixed(1).padStart(4, "0")}s`;
}

function bestBucketLabel(best: { mode: string; difficulty: string; challengeCount: number } | undefined): string {
  if (!best) return "no public best yet";
  return `${labelMode(best.mode)} - ${best.challengeCount} parts`;
}

function initialsFor(displayName: string, handle: string): string {
  const source = displayName.trim() || handle;
  const words = source.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toLowerCase();
  return source.slice(0, 2).toLowerCase();
}

function formatMemberSince(value: string | undefined): string {
  if (!value) return "recently";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value)).toLowerCase();
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)).toLowerCase();
}

function labelMode(mode: string): string {
  if (mode === "target-match") return "target match";
  return mode;
}
