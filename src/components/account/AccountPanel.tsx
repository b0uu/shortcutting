import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { AccountProfile, AccountUser } from "@/domain/cloud/accounts";
import { ShortcutHint } from "@/components/ui/ShortcutHint";

type AccountPanelProps = {
  open: boolean;
  configured: boolean;
  user: AccountUser | null;
  profile: AccountProfile | null;
  status: string | null;
  onClose: () => void;
  onEmailSignIn: (email: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateProfile: (patch: Partial<AccountProfile>) => Promise<void>;
  onClearCloudData: () => Promise<void>;
};

export function AccountPanel({
  open,
  configured,
  user,
  profile,
  status,
  onClose,
  onEmailSignIn,
  onSignOut,
  onUpdateProfile,
  onClearCloudData,
}: AccountPanelProps) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setPending(true);
    try {
      await onEmailSignIn(email.trim());
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="settings-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="settings-card account-card"
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            tabIndex={-1}
            initial={{ y: 6 }}
            animate={{ y: 0 }}
            exit={{ y: 8, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="panel-heading account-heading">
              <div>
                <h2>account</h2>
                <p className="history-meta">
                  {user ? "cloud stats and public profile" : "save stats and join leaderboards"}
                </p>
              </div>
              <button type="button" className="btn-ghost" onClick={onClose}>
                <span>close</span>
                <ShortcutHint keys={["esc"]} />
              </button>
            </div>

            {!configured ? (
              <p className="account-note">Supabase is not configured yet. Local play and history still work.</p>
            ) : user && profile ? (
              <ProfileEditor
                key={profile.userId}
                user={user}
                profile={profile}
                onUpdateProfile={onUpdateProfile}
                onClearCloudData={onClearCloudData}
                onSignOut={onSignOut}
              />
            ) : (
              <form className="account-signin" onSubmit={submitEmail}>
                <p>
                  Email sign-in is enabled for v1. Google and GitHub OAuth are documented as a future TODO.
                </p>
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
                <button type="submit" className="btn-ghost account-submit" disabled={pending || !email.trim()}>
                  {pending ? "sending" : "send magic link"}
                </button>
              </form>
            )}

            {status && <p className="account-status">{status}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProfileEditor({
  user,
  profile,
  onUpdateProfile,
  onClearCloudData,
  onSignOut,
}: {
  user: AccountUser;
  profile: AccountProfile;
  onUpdateProfile: (patch: Partial<AccountProfile>) => Promise<void>;
  onClearCloudData: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [pending, setPending] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);

  async function saveProfile() {
    setPending(true);
    try {
      await onUpdateProfile({ handle, displayName, bio });
    } finally {
      setPending(false);
    }
  }

  async function clearCloudData() {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    setPending(true);
    try {
      await onClearCloudData();
      setClearArmed(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="account-grid">
      <div className="account-identity">
        <div className="account-avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toLowerCase()}</div>
        <div>
          <strong>{profile.displayName}</strong>
          <span>{user.email}</span>
        </div>
      </div>
      <label className="account-field">
        <span>handle</span>
        <input value={handle} onChange={(event) => setHandle(event.currentTarget.value)} />
      </label>
      <label className="account-field">
        <span>display name</span>
        <input value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} />
      </label>
      <label className="account-field full">
        <span>bio</span>
        <textarea value={bio} maxLength={160} onChange={(event) => setBio(event.currentTarget.value)} />
      </label>
      <div className="account-toggles">
        <p className="account-note">
          Public profiles show your handle, bio, run count, and best times at /profile/{profile.handle}.
          Leaderboards only include clean keyboard-only runs.
        </p>
        <button
          type="button"
          className={`opt-btn ${profile.publicProfile ? "active" : ""}`}
          onClick={() => onUpdateProfile({ publicProfile: !profile.publicProfile })}
        >
          public profile {profile.publicProfile ? "on" : "off"}
        </button>
        <button
          type="button"
          className={`opt-btn ${!profile.leaderboardOptOut ? "active" : ""}`}
          onClick={() => onUpdateProfile({ leaderboardOptOut: !profile.leaderboardOptOut })}
        >
          leaderboard {!profile.leaderboardOptOut ? "on" : "off"}
        </button>
      </div>
      <div className="account-actions">
        <button type="button" className="btn-ghost" disabled={pending} onClick={saveProfile}>save profile</button>
        <button type="button" className="btn-ghost danger-action" disabled={pending} onClick={clearCloudData}>
          {clearArmed ? "confirm delete cloud data" : "delete cloud data"}
        </button>
        <button type="button" className="btn-ghost" disabled={pending} onClick={onSignOut}>sign out</button>
      </div>
    </div>
  );
}
