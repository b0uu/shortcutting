import { NextResponse } from "next/server";
import { getSupabaseRuntimeConfig } from "@/lib/supabase/config";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const config = getSupabaseRuntimeConfig();
  const cloudConfigured = Boolean(config?.secretKey);
  let schemaReady = false;
  let setupIssue: string | null = null;

  if (cloudConfigured) {
    const client = createSupabaseServiceClient();
    if (client) {
      const { error } = await client.from("profiles").select("user_id").limit(1);
      schemaReady = !error;
      if (error) setupIssue = schemaIssueMessage(error);
    }
  }

  return NextResponse.json({
    authConfigured: config !== null,
    cloudConfigured,
    schemaReady,
    setupIssue,
  });
}

function schemaIssueMessage(error: { code?: string; message?: string }): string {
  const message = error.message ?? "";
  if (error.code === "PGRST205" || message.includes("schema cache") || message.includes("does not exist")) {
    return "Database setup is incomplete. Run the Supabase migration.";
  }
  return "Could not verify database setup.";
}
