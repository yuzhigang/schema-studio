import { createClient } from "@supabase/supabase-js";

export function createSupabaseServer(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Default instance for local development (Node.js)
// Cloudflare Workers with nodejs_compat flag also supports process.env
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!url || !key) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, " +
      "or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabaseServer = createSupabaseServer(url, key);
