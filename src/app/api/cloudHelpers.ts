import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/supabase/cloudData";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export async function requireCloudUser() {
  const authClient = await createSupabaseServerClient();
  if (!authClient) {
    return {
      error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }),
    };
  }

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const dataClient = createSupabaseServiceClient();
  if (!dataClient) {
    return {
      error: NextResponse.json({ error: "Server Supabase secret key is not configured." }, { status: 503 }),
    };
  }
  const profile = await ensureProfile(dataClient, data.user);
  return {
    authClient,
    dataClient,
    user: data.user,
    profile,
  };
}
