"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AccountProfile } from "@/domain/cloud/accounts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { importLocalHistoryOnce } from "@/storage/cloudImport";
import { LocalResultLogger } from "@/storage/localResultLogger";

type OnboardingPhase = "checking" | "email" | "sent" | "profile" | "reset" | "saving" | "importing" | "redirecting" | "unconfigured" | "error";
type AuthMode = "signup" | "signin";

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
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setMessage("Enter your email and password to continue.");
        return;
      }

      const resetRequested = new URLSearchParams(window.location.search).get("reset") === "1";
      if (resetRequested) {
        setPhase("reset");
        setMessage("Choose a new password.");
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
    if (!trimmedEmail || !password || !supabase) return;

    setPending(true);
    setMessage(authMode === "signup" ? "Creating account..." : "Signing in...");
    const callbackUrl = new URL("/auth/callback", authRedirectOrigin());
    callbackUrl.searchParams.set("next", "/onboarding?setup=1");
    const authResponse = authMode === "signup"
      ? await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      })
      : await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
    setPending(false);

    if (authResponse.error) {
      setPhase("error");
      setOnboardingError({ message: normalizeAuthMessage(authResponse.error.message), action: "retry-email" });
      setMessage(normalizeAuthMessage(authResponse.error.message));
      return;
    }

    if (!authResponse.data.session?.user) {
      setPhase("sent");
      setMessage("Check your email, then return here to sign in.");
      return;
    }

    await prepareProfileAfterAuth();
  }

  async function requestPasswordReset() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !supabase) return;

    setPending(true);
    setMessage("Sending reset link...");
    const callbackUrl = new URL("/auth/callback", authRedirectOrigin());
    callbackUrl.searchParams.set("next", "/onboarding?reset=1");
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: callbackUrl.toString(),
    });
    setPending(false);

    if (error) {
      setPhase("error");
      setOnboardingError({ message: normalizeAuthMessage(error.message), action: "retry-email" });
      setMessage(normalizeAuthMessage(error.message));
      return;
    }

    setPhase("sent");
    setMessage("Check your email for the reset link.");
  }

  async function requestOneTimeLink() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !supabase) return;

    setPending(true);
    setMessage("Sending one-time link...");
    const callbackUrl = new URL("/auth/callback", authRedirectOrigin());
    callbackUrl.searchParams.set("next", "/onboarding?setup=1");
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: callbackUrl.toString(),
        shouldCreateUser: false,
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
    setMessage("Check your email for the one-time link.");
  }

  async function submitPasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || !supabase) return;

    setPending(true);
    setMessage("Updating password...");
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setPhase("reset");
      setMessage(normalizeAuthMessage(error.message));
      return;
    }

    await prepareProfileAfterAuth();
  }

  async function prepareProfileAfterAuth() {
    setPhase("checking");
    setMessage("Preparing your profile...");
    try {
      const response = await fetch("/api/me/profile");
      const payload = await readJsonResponse<ProfileResponse>(response, "Could not load profile.");
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? "Could not load profile.");
      }
      loadProfileDraft(payload.profile);
      setPhase("profile");
      setMessage("Confirm your public profile before we open it.");
    } catch (error) {
      setPhase("error");
      setOnboardingError({ message: error instanceof Error ? error.message : "Could not finish onboarding.", action: "retry-email" });
      setMessage(error instanceof Error ? error.message : "Could not finish onboarding.");
    }
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
              <span>{phase === "sent" ? "check your inbox" : "syncing account"}</span>
            </div>
          ) : phase === "reset" ? (
            <form className="account-signin" onSubmit={submitPasswordReset}>
              <label className="account-field full">
                <span>new password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  placeholder="8 characters or more"
                  onChange={(event) => setPassword(event.currentTarget.value)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={pending || password.length < 6}>
                {pending ? "saving" : "save password"}
              </button>
            </form>
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
                    setMessage("Enter your email and password to continue.");
                  }}
                >
                  try again
                </button>
              )}
            </div>
          ) : (
            <form className="account-signin" onSubmit={submitEmail}>
              <div className="auth-mode-toggle" role="tablist" aria-label="account mode">
                <button type="button" role="tab" aria-selected={authMode === "signup"} className={`opt-btn ${authMode === "signup" ? "active" : ""}`} onClick={() => setAuthMode("signup")}>
                  sign up
                </button>
                <button type="button" role="tab" aria-selected={authMode === "signin"} className={`opt-btn ${authMode === "signin" ? "active" : ""}`} onClick={() => setAuthMode("signin")}>
                  sign in
                </button>
              </div>
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
              <label className="account-field full">
                <span>password</span>
                <input
                  type="password"
                  autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  placeholder="8 characters or more"
                  onChange={(event) => setPassword(event.currentTarget.value)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={pending || !email.trim() || password.length < 6}>
                {pending ? "working" : authMode === "signup" ? "create account" : "sign in"}
              </button>
              {authMode === "signin" && (
                <div className="auth-signin-secondary">
                  <button type="button" className="btn-ghost auth-secondary-action" disabled={pending || !email.trim()} onClick={requestOneTimeLink}>
                    send one-time link
                  </button>
                  <button type="button" className="btn-ghost auth-subtle-action" disabled={pending || !email.trim()} onClick={requestPasswordReset}>
                    reset password
                  </button>
                </div>
              )}
            </form>
          )}

          <p className="auth-footnote">
            Email auth only. Verification may be requested later.
          </p>
        </div>
      </section>
    </main>
  );
}

function authRedirectOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return window.location.origin;

  try {
    return new URL(siteUrl).origin;
  } catch {
    return window.location.origin;
  }
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
    return "Too many attempts. Wait a bit, then try again.";
  }
  if (normalized.includes("weak") || normalized.includes("password")) {
    return "Use a stronger password, then try again.";
  }
  if (normalized.includes("already") || normalized.includes("registered")) {
    return "That email already has an account. Try signing in.";
  }
  if (normalized.includes("invalid login") || normalized.includes("credentials")) {
    return "Email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed") || normalized.includes("not confirmed")) {
    return "Check your email to verify this account, then sign in.";
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
  return message || "Authentication failed. Try again.";
}

function headingForPhase(phase: OnboardingPhase): string {
  if (phase === "sent") return "check your email";
  if (phase === "profile") return "finish your profile";
  if (phase === "reset") return "reset password";
  if (phase === "error") return "sign-in failed";
  if (phase === "unconfigured") return "setup required";
  if (phase === "checking" || phase === "saving" || phase === "importing" || phase === "redirecting") return "almost there";
  return "account";
}
