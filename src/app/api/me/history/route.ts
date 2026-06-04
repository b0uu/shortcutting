import { NextResponse, type NextRequest } from "next/server";
import { clearCloudData, getCloudHistory } from "@/lib/supabase/cloudData";
import type { Difficulty, Mode } from "@/domain/types";
import { requireCloudUser } from "../../cloudHelpers";

export async function GET(request: NextRequest) {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  const searchParams = request.nextUrl.searchParams;
  const mode = (searchParams.get("mode") ?? "all") as Mode | "all";
  const difficulty = (searchParams.get("difficulty") ?? "all") as Difficulty | "all";
  const results = await getCloudHistory(context.dataClient, context.user.id, { mode, difficulty });
  return NextResponse.json({ results });
}

export async function DELETE() {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  await clearCloudData(context.dataClient, context.user.id);
  return NextResponse.json({ ok: true });
}
