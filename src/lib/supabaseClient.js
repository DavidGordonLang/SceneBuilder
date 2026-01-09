import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This will show clearly in Vercel logs if env vars are missing.
  console.warn(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
