import { createClient } from "@supabase/supabase-js";

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient(supabaseUrl!, supabaseAnonKey!);
