import { createSupabaseBrowser } from "@repo/db/browser";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseBrowser = createSupabaseBrowser(url, key);
