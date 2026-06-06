import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));
  const canonicalOrigin = canonicalSiteOrigin();

  if (canonicalOrigin && requestUrl.origin !== canonicalOrigin) {
    return NextResponse.redirect(new URL(`${requestUrl.pathname}${requestUrl.search}`, canonicalOrigin));
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL(withAuthError(next, "Supabase is not configured."), requestUrl.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(withAuthError(next, error.message), requestUrl.origin));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      return NextResponse.redirect(new URL(withAuthError(next, error.message), requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/onboarding";
  return value;
}

function withAuthError(path: string, message: string): string {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("auth_error", message);
  return `${pathname}?${params.toString()}`;
}

function canonicalSiteOrigin(): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;

  try {
    return new URL(siteUrl).origin;
  } catch {
    return null;
  }
}
