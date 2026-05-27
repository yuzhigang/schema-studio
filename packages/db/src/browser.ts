import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createSupabaseBrowser(url: string, anonKey: string) {
  if (!client) {
    client = createBrowserClient(url, anonKey);
  }
  return client;
}

export function getSupabaseBrowser() {
  if (!client) {
    throw new Error(
      "Supabase browser client not initialized. " + "Call createSupabaseBrowser(url, key) first.",
    );
  }
  return client;
}
