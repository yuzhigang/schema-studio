import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

function getSupabaseSSRConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Set SUPABASE_URL and SUPABASE_ANON_KEY, " +
        "or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  return { key, url };
}

export function createSupabaseSSR(request: Request) {
  const { key, url } = getSupabaseSSRConfig();
  const headers = new Headers();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("cookie") ?? "").filter(
          (c): c is { name: string; value: string } => c.value !== undefined,
        );
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          headers.append("set-cookie", serializeCookieHeader(name, value, options));
        });
      },
    },
  });

  return { supabase, headers };
}
