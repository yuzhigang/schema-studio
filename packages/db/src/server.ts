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
export const supabaseServer = createSupabaseServer(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);
