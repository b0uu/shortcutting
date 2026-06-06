import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicSiteHeader, PublicSiteHeaderFallback } from "@/components/layout/PublicSiteHeader";
import { formatElapsed } from "@/domain/timer";
import { getPublicProfileSummary } from "@/lib/supabase/cloudData";
import { createSupabasePublicClient } from "@/lib/supabase/server";

type ProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  return (
    <main className="public-page">
      <Suspense fallback={<PublicSiteHeaderFallback active="profile" />}>
        <PublicSiteHeader active="profile" />
      </Suspense>
      <Suspense fallback={<ProfileSkeleton handle={handle} />}>
        <ProfileContent handle={handle} />
      </Suspense>
    </main>
  );
}

async function ProfileContent({ handle }: { handle: string }) {
  const client = createSupabasePublicClient();
  if (!client) {
    return (
        <section className="public-hero public-content-ready">
          <p>public profile</p>
          <h1>@{handle}</h1>
          <span>Supabase is not configured yet.</span>
        </section>
    );
  }

  const summary = await getPublicProfileSummary(client, handle);
  if (!summary) notFound();

  return (
      <section className="profile-main public-content-ready">
        <div className="profile-identity">
          <div className="avatar" aria-hidden="true">
            {initialsFor(summary.profile.displayName, summary.profile.handle)}
          </div>
          <div className="identity-text">
            <div className="identity-name">
              {summary.profile.displayName}
              {summary.totals.bestElapsedMs !== null && <span className="identity-badge">user</span>}
            </div>
            <div className="identity-meta">
              member since {formatMemberSince(summary.profile.createdAt)}
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
            <div className="pb-sub">edits/min</div>
          </div>
          <div className="pb-item">
            <div className="pb-label">runs</div>
            <div className="pb-val">{summary.totals.runs}</div>
            <div className="pb-sub">total</div>
          </div>
          <div className="pb-item">
            <div className="pb-label">public bests</div>
            <div className="pb-val">{summary.bests.length}</div>
            <div className="pb-sub">modes</div>
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
  );
}

function ProfileSkeleton({ handle }: { handle: string }) {
  return (
    <section className="profile-main public-skeleton" aria-label="Loading profile">
      <div className="profile-identity">
        <div className="avatar skeleton-avatar" aria-hidden="true">
          {handle.slice(0, 2).toLowerCase()}
        </div>
        <div className="identity-text">
          <div className="identity-name">
            <span className="skeleton-line name" />
          </div>
          <div className="identity-meta">
            <span className="skeleton-line wide" />
          </div>
        </div>
      </div>

      <div className="pb-strip skeleton-block" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => (
          <div className="pb-item" key={item}>
            <div className="skeleton-line small" />
            <div className="skeleton-line metric" />
            <div className="skeleton-line medium" />
          </div>
        ))}
      </div>

      <div>
        <div className="section-head">
          <div className="section-title">public bests</div>
          <div className="section-link">@{handle}</div>
        </div>
        <table className="runs-table skeleton-table" aria-hidden="true">
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
            {[0, 1, 2].map((row) => (
              <tr key={row}>
                <td><span className="skeleton-line wide" /></td>
                <td><span className="skeleton-line medium" /></td>
                <td><span className="skeleton-line tiny" /></td>
                <td><span className="skeleton-line small" /></td>
                <td><span className="skeleton-line small" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
