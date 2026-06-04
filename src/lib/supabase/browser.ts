"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseRuntimeConfig } from "./config";

export function createSupabaseBrowserClient() {
  const config = getSupabaseRuntimeConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.publishableKey);
}
