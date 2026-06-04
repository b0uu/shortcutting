import { NextResponse, type NextRequest } from "next/server";
import { saveCloudResult } from "@/lib/supabase/cloudData";
import type { TestResult } from "@/domain/types";
import { requireCloudUser } from "../cloudHelpers";

export async function POST(request: NextRequest) {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  try {
    const result = await request.json() as TestResult;
    const saved = await saveCloudResult(context.dataClient, context.user, result);
    const status = saved.validation.valid ? 200 : 422;
    return NextResponse.json(saved, { status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save result." }, { status: 400 });
  }
}
