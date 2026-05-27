import { createSupabaseBrowser } from "@repo/db/browser";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// eslint-disable-next-line no-console
console.log("[lib/supabase.ts] creating client with:", { url, key: key ? "***" : undefined });

export const supabaseBrowser = createSupabaseBrowser(url, key);
