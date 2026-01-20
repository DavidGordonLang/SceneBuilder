import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    // Critical for mobile reliability
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,

    // Force modern SPA auth flow going forward.
    // Even if Supabase returns hash tokens, we’ll still handle them via getSessionFromUrl.
    flowType: "pkce",

    // Keep storage key stable across builds
    storageKey: "scenebuilder-auth",
  },
});
