import { NextResponse, type NextRequest } from "next/server";
import { importCloudResults } from "@/lib/supabase/cloudData";
import type { TestResult } from "@/domain/types";
import { requireCloudUser } from "../../cloudHelpers";

export async function POST(request: NextRequest) {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  try {
    const body = await request.json() as { results?: TestResult[] };
    const results = Array.isArray(body.results) ? body.results.slice(0, 50) : [];
    const summary = await importCloudResults(context.dataClient, context.user, results);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not import results." }, { status: 400 });
  }
}
