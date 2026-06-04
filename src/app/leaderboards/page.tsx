import Link from "next/link";
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
  const params = await searchParams;
  const mode = parseOption(params?.mode, modes, "target-match");
  const difficulty = parseOption(params?.difficulty, difficulties, "standard");
  const partCounts = mode === "drill" ? drillPartCounts : standardPartCounts;
  const challengeCount = parseNumberOption(params?.parts, partCounts, mode === "drill" ? 5 : 3);
  const client = createSupabasePublicClient();
  const entries = client
    ? await getLeaderboardEntries(client, { mode, difficulty, challengeCount })
    : [];

  return (
    <main className="public-page">
      <nav className="public-nav">
        <Link href="/">shortcutting</Link>
        <span>leaderboards</span>
      </nav>
      <section className="public-hero">
        <p>keyboard-only public bests</p>
        <h1>leaderboards</h1>
      </section>
      <form className="leaderboard-filters">
        <label>
          <span>mode</span>
          <select name="mode" defaultValue={mode}>
            {modes.map((item) => <option key={item} value={item}>{labelMode(item)}</option>)}
          </select>
        </label>
        <label>
          <span>difficulty</span>
          <select name="difficulty" defaultValue={difficulty}>
            {difficulties.map((item) => <option key={item} value={item}>{item === "multiline" ? "multi-line" : item}</option>)}
          </select>
        </label>
        <label>
          <span>parts</span>
          <select name="parts" defaultValue={challengeCount}>
            {partCounts.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-ghost">filter</button>
      </form>
      <section className="leaderboard-table" aria-label="leaderboard results">
        {!client ? (
          <p className="empty-state">Supabase is not configured yet.</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">No eligible runs yet.</p>
        ) : entries.map((entry) => (
          <Link key={entry.id} className="leaderboard-row" href={`/profile/${entry.handle}`}>
            <span className="leaderboard-rank">#{entry.rank}</span>
            <span className="leaderboard-player">
              <strong>{entry.displayName}</strong>
              <em>@{entry.handle}</em>
            </span>
            <span>{formatElapsed(entry.elapsedMs)}</span>
            <span>{entry.editsPerMinute} edits/min</span>
          </Link>
        ))}
      </section>
    </main>
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
