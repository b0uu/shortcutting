import Link from "next/link";
import { Suspense } from "react";
import { PublicSiteHeader, PublicSiteHeaderFallback } from "@/components/layout/PublicSiteHeader";
import { formatElapsed } from "@/domain/timer";
import type { ChallengeCount, Difficulty, Mode } from "@/domain/types";
import { getLeaderboardEntries } from "@/lib/supabase/cloudData";
import { createSupabasePublicClient } from "@/lib/supabase/server";

const modes: Mode[] = ["target-match", "drill", "coding"];
const difficulties: Difficulty[] = ["standard", "advanced", "multiline"];
const standardPartCounts: ChallengeCount[] = [3, 4];
const drillPartCounts: ChallengeCount[] = [5, 10, 15];

type LeaderboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeaderboardsPage({ searchParams }: LeaderboardPageProps) {
  return (
    <main className="public-page">
      <Suspense fallback={<PublicSiteHeaderFallback active="leaderboards" />}>
        <PublicSiteHeader active="leaderboards" />
      </Suspense>
      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LeaderboardContent({ searchParams }: LeaderboardPageProps) {
  const params = await searchParams;
  const mode = parseOption(params?.mode, modes, "target-match");
  const difficulty = parseOption(params?.difficulty, difficulties, "standard");
  const partCounts = mode === "drill" ? drillPartCounts : standardPartCounts;
  const challengeCount = parseNumberOption(params?.parts, partCounts, mode === "drill" ? 5 : 3);
  const client = createSupabasePublicClient();
  const entries = client
    ? await getLeaderboardEntries(client, { mode, difficulty, challengeCount })
    : [];
  const leader = entries[0] ?? null;

  return (
      <section className="lb-main public-content-ready">
        <div className="lb-header">
          <div>
            <h1 className="lb-title">leaderboard</h1>
            <p className="lb-sub">best times - keyboard only</p>
          </div>
        </div>

        <div className="filter-row" aria-label="leaderboard filters">
          <div className="filter-group">
            {difficulties.map((item) => (
              <Link
                key={item}
                className={`filter-btn ${difficulty === item ? "active" : ""}`}
                href={leaderboardHref({ mode, difficulty: item, challengeCount })}
              >
                {item === "multiline" ? "multi-line" : item}
              </Link>
            ))}
          </div>
          <div className="filter-sep" />
          <div className="filter-group">
            {partCounts.map((item) => (
              <Link
                key={item}
                className={`filter-btn ${challengeCount === item ? "active" : ""}`}
                href={leaderboardHref({ mode, difficulty, challengeCount: item })}
              >
                {item} parts
              </Link>
            ))}
          </div>
          <div className="filter-sep" />
          <div className="filter-group">
            {modes.map((item) => (
              <Link
                key={item}
                className={`filter-btn ${mode === item ? "active" : ""}`}
                href={leaderboardHref({ mode: item, difficulty, challengeCount })}
              >
                {labelMode(item)}
              </Link>
            ))}
          </div>
          <div className="filter-right">updated just now</div>
        </div>

        <div className="my-rank-bar" aria-label="leaderboard summary">
          <div className="my-rank-left">
            <div className="my-rank-label">current leader</div>
            <div className="my-rank-val">{leader ? "#1" : "none"}</div>
            <div className="my-rank-sub">{leader ? `@${leader.handle}` : "no eligible runs yet"}</div>
          </div>
          <div className="my-rank-right">
            <div className="my-rank-label">best time</div>
            <div className="my-rank-time">{leader ? formatElapsed(leader.elapsedMs) : "--:--.-"}</div>
            <div className="my-rank-sub">{labelMode(mode)} - {challengeCount} parts</div>
          </div>
        </div>

        <section aria-label="leaderboard results">
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>player</th>
                <th>best time</th>
                <th>edits/min</th>
                <th>date</th>
              </tr>
            </thead>
            <tbody>
              {!client ? (
                <tr>
                  <td colSpan={5}>Supabase is not configured yet.</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5}>No eligible runs yet.</td>
                </tr>
              ) : entries.map((entry) => (
                <tr key={entry.id}>
                  <td><span className={`rank ${rankTone(entry.rank)}`}>{entry.rank}</span></td>
                  <td>
                    <Link className="lb-user" href={`/profile/${entry.handle}`}>
                      <span className="lb-avatar" aria-hidden="true">{initialsFor(entry.displayName, entry.handle)}</span>
                      <span className="lb-name">{entry.displayName}</span>
                    </Link>
                  </td>
                  <td><span className="lb-time">{formatElapsed(entry.elapsedMs)}</span></td>
                  <td>{entry.editsPerMinute}</td>
                  <td>{formatShortDate(entry.completedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
  );
}

function LeaderboardSkeleton() {
  return (
    <section className="lb-main public-skeleton" aria-label="Loading leaderboard">
      <div className="lb-header">
        <div>
          <h1 className="lb-title">leaderboard</h1>
          <p className="lb-sub">best times - keyboard only</p>
        </div>
      </div>
      <div className="filter-row" aria-hidden="true">
        <div className="filter-group">
          <span className="filter-btn active">standard</span>
          <span className="filter-btn">advanced</span>
          <span className="filter-btn">multi-line</span>
        </div>
        <div className="filter-sep" />
        <div className="filter-group">
          <span className="filter-btn active">3 parts</span>
          <span className="filter-btn">4 parts</span>
        </div>
        <div className="filter-sep" />
        <div className="filter-group">
          <span className="filter-btn active">target match</span>
          <span className="filter-btn">drill</span>
          <span className="filter-btn">coding</span>
        </div>
        <div className="filter-right">loading</div>
      </div>
      <div className="my-rank-bar skeleton-block" aria-hidden="true">
        <div className="my-rank-left">
          <div className="skeleton-line small" />
          <div className="skeleton-line metric" />
          <div className="skeleton-line medium" />
        </div>
        <div className="my-rank-right">
          <div className="skeleton-line small" />
          <div className="skeleton-line metric" />
          <div className="skeleton-line medium" />
        </div>
      </div>
      <table className="lb-table skeleton-table" aria-hidden="true">
        <thead>
          <tr>
            <th>#</th>
            <th>player</th>
            <th>best time</th>
            <th>edits/min</th>
            <th>date</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((row) => (
            <tr key={row}>
              <td><span className="skeleton-line tiny" /></td>
              <td><span className="skeleton-line wide" /></td>
              <td><span className="skeleton-line medium" /></td>
              <td><span className="skeleton-line small" /></td>
              <td><span className="skeleton-line small" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function parseOption<T extends string>(value: string | string[] | undefined, options: T[], fallback: T): T {
  const candidate = Array.isArray(value) ? value[0] : value;
  return options.includes(candidate as T) ? candidate as T : fallback;
}

function parseNumberOption(value: string | string[] | undefined, options: number[], fallback: number): ChallengeCount {
  const candidate = Number(Array.isArray(value) ? value[0] : value);
  return options.includes(candidate) ? candidate as ChallengeCount : fallback as ChallengeCount;
}

function labelMode(mode: Mode): string {
  if (mode === "target-match") return "target match";
  return mode;
}

function leaderboardHref(filter: { mode: Mode; difficulty: Difficulty; challengeCount: number }): string {
  const params = new URLSearchParams({
    mode: filter.mode,
    difficulty: filter.difficulty,
    parts: String(filter.challengeCount),
  });
  return `/leaderboards?${params.toString()}`;
}

function rankTone(rank: number): string {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "";
}

function initialsFor(displayName: string, handle: string): string {
  const source = displayName.trim() || handle;
  const words = source.split(/[\s_-]+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toLowerCase();
  return source.slice(0, 2).toLowerCase();
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value)).toLowerCase();
}
