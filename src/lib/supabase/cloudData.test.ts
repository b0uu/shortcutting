import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { generateTargetChallenges } from "@/domain/challenges";
import { summarizeResult } from "@/domain/results";
import type { ChallengeResult, TestConfig } from "@/domain/types";
import { saveCloudResult } from "./cloudData";

const config: TestConfig = {
  mode: "target-match",
  challengeCount: 3,
  platformPreference: "auto",
  platform: "windows-linux",
  mousePolicy: "keyboard-only",
  difficulty: "standard",
  soundEnabled: true,
  theme: "dark",
  customTheme: {
    background: "#1c1a17",
    panel: "#242118",
    card: "#2a271f",
    text: "#e8e4da",
    mutedText: "#9f9688",
    accent: "#d4693a",
    success: "#7db884",
    error: "#e07575",
    focus: "#d4693a",
  },
  codingLanguage: "python",
  smartPairs: true,
  reducedMotion: false,
  seedPack: "cloud-data-invalid",
  practiceSkillPack: null,
};

describe("cloudData", () => {
  it("does not write invalid results", async () => {
    const result = buildResult();
    result.challengeResults[0] = {
      ...result.challengeResults[0],
      finalText: "wrong",
    };
    const client = fakeClient();
    const saved = await saveCloudResult(client.client, { id: "user-1", email: "u@example.com" } as User, result);

    expect(saved.validation.valid).toBe(false);
    expect(client.insert).not.toHaveBeenCalled();
    expect(client.upsert).not.toHaveBeenCalled();
  });
});

function buildResult() {
  const challenges = generateTargetChallenges(config.challengeCount, config.seedPack, { difficulty: config.difficulty });
  const parts: ChallengeResult[] = challenges.map((challenge) => ({
    challengeId: challenge.id,
    mode: challenge.mode,
    beforeText: challenge.editableText,
    targetText: challenge.targetText,
    finalText: challenge.targetText,
    elapsedMs: 1200,
    skillTags: challenge.errors.flatMap((error) => error.skillTags),
    skillPacks: challenge.skillPacks,
    estimatedCorrections: challenge.estimatedCorrections,
    hintsUsed: 0,
    mouseActions: 0,
    keystrokes: 12,
    clipboardActions: 0,
    undoCount: 0,
    redoCount: 0,
  }));
  return summarizeResult("result-cloud-invalid", config, new Date(0).toISOString(), new Date(4000).toISOString(), 4000, parts, true);
}

function fakeClient() {
  const calls = {
    insert: vi.fn(),
    upsert: vi.fn(),
  };
  const client = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  user_id: "user-1",
                  handle: "user-1",
                  display_name: "user",
                  avatar_url: null,
                  bio: "",
                  public_profile: true,
                  leaderboard_opt_out: false,
                },
                error: null,
              }),
            }),
          }),
          insert: calls.insert,
        };
      }
      return {
        insert: calls.insert,
        upsert: calls.upsert,
      };
    },
  } as unknown as SupabaseClient;
  return { ...calls, client };
}
