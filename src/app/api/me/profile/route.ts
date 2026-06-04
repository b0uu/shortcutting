import { NextResponse, type NextRequest } from "next/server";
import { updateProfile } from "@/lib/supabase/cloudData";
import { requireCloudUser } from "../../cloudHelpers";

export async function GET() {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email ?? null,
    },
    profile: context.profile,
  });
}

export async function PATCH(request: NextRequest) {
  const context = await requireCloudUser();
  if ("error" in context) return context.error;

  try {
    const patch = await request.json();
    const profile = await updateProfile(context.dataClient, context.user.id, patch);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update profile." }, { status: 400 });
  }
}
