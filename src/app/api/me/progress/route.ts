import { NextResponse } from "next/server";
import { getCloudPersonalBests } from "@/lib/supabase/cloudData";
import { requireCloudUser } from "../../cloudHelpers";

export async function GET() {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  const personalBests = await getCloudPersonalBests(context.dataClient, context.user.id);
  return NextResponse.json({ personalBests });
}
