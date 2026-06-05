"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountProfile } from "@/domain/cloud/accounts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { importLocalHistoryOnce } from "@/storage/cloudImport";
import { LocalResultLogger } from "@/storage/localResultLogger";

type OnboardingPhase = "checking" | "email" | "sent" | "profile" | "saving" | "importing" | "redirecting" | "unconfigured" | "error";

type ProfileResponse = {
  profile?: AccountProfile;
  error?: string;
};

type AccountStatusResponse = {
  authConfigured?: boolean;
  cloudConfigured?: boolean;
  schemaReady?: boolean;
  setupIssue?: string | null;
};

type OnboardingError = {
  message: string;
  action: "retry-email" | "return-home";
};

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const localLogger = useMemo(() => new LocalResultLogger(), []);
  const redirectTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<OnboardingPhase>("checking");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(true);
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("Checking account...");
  const [onboardingError, setOnboardingError] = useState<OnboardingError | null>(null);

  useEffect(() => () => {
    if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
  }, []);

  const loadProfileDraft = useCallback((nextProfile: AccountProfile) => {
    setProfile(nextProfile);
    setHandle(nextProfile.handle);
    setDisplayName(nextProfile.displayName);
    setBio(nextProfile.bio);
    setPublicProfile(nextProfile.publicProfile);
    setLeaderboardOptOut(nextProfile.leaderboardOptOut);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      const authError = readAuthRedirectError();
      if (authError) {
        setPhase("error");
        setOnboardingError(authError);
        setMessage(authError.message);
        window.history.replaceState(null, "", window.location.pathname);
        return;
      }

      let status: AccountStatusResponse;
      try {
        const statusResponse = await fetch("/api/account/status");
        status = await readJsonResponse<AccountStatusResponse>(statusResponse, "Could not verify Supabase setup.");
      } catch (error) {
        setPhase("unconfigured");
        setMessage(error instanceof Error ? error.message : "Could not verify Supabase setup.");
        return;
      }

      if (!status.authConfigured || !status.cloudConfigured) {
        setPhase("unconfigured");
        setMessage(status.authConfigured
          ? "Server cloud sync is not configured."
          : "Supabase is not configured.");
        return;
      }

      if (!status.schemaReady) {
        setPhase("unconfigured");
        setMessage(status.setupIssue ?? "Database setup is incomplete.");
        return;
      }

      if (!supabase) {
        setPhase("unconfigured");
        setMessage("Supabase is not configured.");
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        setPhase("error");
        setOnboardingError({ message: normalizeAuthMessage(error.message), action: "retry-email" });
        setMessage(normalizeAuthMessage(error.message));
        return;
      }

      if (!data.session?.user) {
        setPhase("email");
        setMessage("Enter your email to continue.");
        return;
      }

      setMessage("Preparing your profile...");
      try {
        const response = await fetch("/api/me/profile");
        const payload = await readJsonResponse<ProfileResponse>(response, "Could not load profile.");
        if (!response.ok || !payload.profile) {
          throw new Error(payload.error ?? "Could not load profile.");
        }
        if (cancelled) return;
        loadProfileDraft(payload.profile);
        const setupRequested = new URLSearchParams(window.location.search).get("setup") === "1";
        if (!setupRequested) {
          setPhase("redirecting");
          setMessage("Opening your profile...");
          router.replace(`/profile/${payload.profile.handle}`);
          return;
        }
        setPhase("profile");
        setMessage("Confirm your public profile before we open it.");
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "Could not finish onboarding.");
      }
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [loadProfileDraft, router, supabase]);

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !supabase) return;

    setPending(true);
    setMessage("Sending magic link...");
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", "/onboarding?setup=1");
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: true,
      },
    });
    setPending(false);

    if (error) {
      setPhase("error");
      setOnboardingError({ message: normalizeAuthMessage(error.message), action: "retry-email" });
      setMessage(normalizeAuthMessage(error.message));
      return;
    }

    setPhase("sent");
    setMessage("Check your email for the sign-in link.");
  }

  async function finishProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setPending(true);
    setPhase("saving");
    setMessage("Saving profile...");
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          displayName,
          bio,
          publicProfile,
          leaderboardOptOut,
        }),
      });
      const payload = await readJsonResponse<ProfileResponse>(response, "Could not save profile.");
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "Could not save profile.");
      }
      const savedProfile = payload.profile;
      loadProfileDraft(savedProfile);

      setPhase("importing");
      setMessage("Importing local history...");
      const localResults = await localLogger.getResults();
      const summary = await importLocalHistoryOnce(savedProfile.userId, localResults);
      const importNote = summary.status === "imported"
        ? `Imported ${summary.imported} local runs${summary.skipped > 0 ? ` and skipped ${summary.skipped}` : ""}.`
        : summary.status === "partial"
          ? `Imported ${summary.imported} local runs. ${summary.rejected} could not be imported and will retry later.`
          : summary.status === "empty"
            ? "No local runs to import yet."
            : "Local history was already imported.";

      setPhase("redirecting");
      setMessage(`${importNote} Opening your profile...`);
      redirectTimer.current = window.setTimeout(() => {
        router.replace(`/profile/${savedProfile.handle}`);
      }, 520);
    } catch (error) {
      setPhase("profile");
      setOnboardingError(null);
      setMessage(error instanceof Error ? error.message : "Could not finish onboarding.");
    } finally {
      setPending(false);
    }
  }

  const busy = phase === "checking" || phase === "saving" || phase === "importing" || phase === "redirecting";
  const heading = headingForPhase(phase);

  return (
    <main className="public-page onboarding-page">
      <nav className="public-nav auth-nav">
        <Link href="/" className="logo">
          <span className="logo-mark">⌥</span>
          <span>shortcutting</span>
        </Link>
        <div>
          <Link href="/">home</Link>
        </div>
      </nav>

      <section className="onboarding-shell" aria-busy={busy}>
        <div className="onboarding-card">
          <div className="auth-header">
            <h2>{heading}</h2>
            <p aria-live="polite">{message}</p>
          </div>

          {phase === "unconfigured" ? (
            <div className="auth-actions">
              <Link className="btn-primary auth-link-button" href="/">return home</Link>
            </div>
          ) : phase === "sent" || busy ? (
            <div className="auth-progress" aria-live="polite">
              <span className="auth-progress-dot" />
              <span>{phase === "sent" ? "waiting for email confirmation" : "syncing account"}</span>
            </div>
          ) : phase === "profile" ? (
            <form className="onboarding-profile-form" onSubmit={finishProfile}>
              <label className="account-field">
                <span>handle</span>
                <input value={handle} autoComplete="username" onChange={(event) => setHandle(event.currentTarget.value)} />
              </label>
              <label className="account-field">
                <span>display name</span>
                <input value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} />
              </label>
              <label className="account-field full">
                <span>bio</span>
                <textarea value={bio} maxLength={160} onChange={(event) => setBio(event.currentTarget.value)} />
              </label>
              <div className="account-toggles full">
                <button
                  type="button"
                  className={`opt-btn ${publicProfile ? "active" : ""}`}
                  onClick={() => setPublicProfile((value) => !value)}
                >
                  public profile {publicProfile ? "on" : "off"}
                </button>
                <button
                  type="button"
                  className={`opt-btn ${!leaderboardOptOut ? "active" : ""}`}
                  onClick={() => setLeaderboardOptOut((value) => !value)}
                >
                  leaderboard {!leaderboardOptOut ? "on" : "off"}
                </button>
              </div>
              <button type="submit" className="btn-primary full" disabled={pending || !handle.trim() || !displayName.trim()}>
                {pending ? "saving" : "continue to profile"}
              </button>
            </form>
          ) : phase === "error" ? (
            <div className="auth-actions">
              {onboardingError?.action === "return-home" ? (
                <Link className="btn-primary auth-link-button" href="/">return home</Link>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setPhase("email");
                    setOnboardingError(null);
                    setMessage("Enter your email to continue.");
                  }}
                >
                  request a new link
                </button>
              )}
            </div>
          ) : (
            <form className="account-signin" onSubmit={submitEmail}>
              <label className="account-field full">
                <span>email</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={pending || !email.trim()}>
                {pending ? "sending" : "send magic link"}
              </button>
            </form>
          )}

          <p className="auth-footnote">
            Email auth only. Profile and leaderboard settings can be changed later.
          </p>
        </div>
      </section>
    </main>
  );
}

async function readJsonResponse<T>(response: Response, fallback: string): Promise<T> {
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error(response.ok ? fallback : `${fallback} (${response.status})`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(response.ok ? fallback : `${fallback} (${response.status})`);
  }
}

function readAuthRedirectError(): OnboardingError | null {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("auth_error_code")
    ?? query.get("error_code")
    ?? hash.get("error_code")
    ?? hash.get("error");
  const description = query.get("auth_error")
    ?? query.get("error_description")
    ?? hash.get("error_description")
    ?? hash.get("error");

  if (!code && !description) return null;
  return {
    message: normalizeAuthMessage(description ?? code ?? "Authentication failed.", code ?? undefined),
    action: "retry-email",
  };
}

function normalizeAuthMessage(message: string, code?: string): string {
  const normalized = `${code ?? ""} ${message}`.toLowerCase();
  if (normalized.includes("otp_expired") || normalized.includes("expired") || normalized.includes("invalid")) {
    return "This email link is invalid or expired. Request a new link.";
  }
  if (normalized.includes("rate limit")) {
    return "Too many email attempts. Wait a bit, then request a new link.";
  }
  if (normalized.includes("authentication required") || normalized.includes("not authenticated")) {
    return "Your session was not created. Request a new link.";
  }
  if (normalized.includes("server supabase secret key") || normalized.includes("cloud sync")) {
    return "Server cloud sync is not configured.";
  }
  if (normalized.includes("supabase is not configured")) {
    return "Supabase is not configured.";
  }
  return message || "Authentication failed. Request a new link.";
}

function headingForPhase(phase: OnboardingPhase): string {
  if (phase === "sent") return "check your email";
  if (phase === "profile") return "finish your profile";
  if (phase === "error") return "sign-in failed";
  if (phase === "unconfigured") return "setup required";
  if (phase === "checking" || phase === "saving" || phase === "importing" || phase === "redirecting") return "almost there";
  return "account";
}
