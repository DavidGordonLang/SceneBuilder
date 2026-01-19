import { useCallback, useEffect, useState } from "react";

/**
 * Fetch + update the logged-in user's profile row in public.profiles.
 * Assumes profiles.id = auth user id (standard Supabase pattern).
 */
export function useProfile({ supabase, userId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: qErr } = await supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, onboarding_complete")
        .eq("id", userId)
        .single();

      if (qErr) throw qErr;
      setProfile(data ?? null);
    } catch (e) {
      setError(e?.message || "Failed to load profile.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  const updateProfile = useCallback(
    async (updates) => {
      if (!supabase || !userId) throw new Error("Not signed in.");

      setError("");
      const payload = {
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error: uErr } = await supabase.from("profiles").upsert(payload).select().single();

      if (uErr) throw uErr;

      // Keep local state fresh.
      setProfile(data ?? payload);
      return data ?? payload;
    },
    [supabase, userId]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { profile, loading, error, reload, updateProfile };
}
