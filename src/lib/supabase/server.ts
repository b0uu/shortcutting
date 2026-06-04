import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseRuntimeConfig } from "./config";

export async function createSupabaseServerClient() {
  const config = getSupabaseRuntimeConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components cannot always write cookies. Middleware and routes can.
        }
      },
    },
  });
}

export function createSupabaseServiceClient() {
  const config = getSupabaseRuntimeConfig();
  if (!config?.secretKey) return null;
  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabasePublicClient() {
  const config = getSupabaseRuntimeConfig();
  if (!config) return null;
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
