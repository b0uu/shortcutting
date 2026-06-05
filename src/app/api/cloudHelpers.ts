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
  let profile;
  try {
    profile = await ensureProfile(dataClient, data.user);
  } catch (error) {
    return {
      error: NextResponse.json(
        { error: cloudSetupErrorMessage(error) },
        { status: 503 },
      ),
    };
  }

  return {
    authClient,
    dataClient,
    user: data.user,
    profile,
  };
}

function cloudSetupErrorMessage(error: unknown): string {
  const issue = error as { code?: string; message?: string } | null;
  const message = issue?.message ?? "";
  if (issue?.code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist")) {
    return "Database setup is incomplete. Run the Supabase migration.";
  }
  return message || "Could not load profile.";
}
