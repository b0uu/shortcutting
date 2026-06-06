"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [pending, setPending] = useState(false);

  async function signOut() {
    if (!supabase || pending) return;
    setPending(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" className="profile-signout" onClick={signOut} disabled={pending}>
      {pending ? "signing out" : "sign out"}
    </button>
  );
}
