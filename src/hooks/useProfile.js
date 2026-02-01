import { useCallback, useEffect, useState } from "react";
import { getCachedProfile, setCachedProfile } from "../lib/appDataCache";

/**
 * Fetch + update the logged-in user's profile row in public.profiles.
 * Assumes profiles.id = auth user id (standard Supabase pattern).
 */
export function useProfile({ supabase, userId }) {
  const cached = userId ? getCachedProfile(userId) : null;
  const hasCacheAtInit = Boolean(cached);

  const [profile, setProfile] = useState(() => cached ?? null);
  const [loading, setLoading] = useState(() => Boolean(userId) && !hasCacheAtInit);
  const [error, setError] = useState("");

  const reload = useCallback(
    async (opts = {}) => {
      if (!supabase || !userId) return;

      const silentRequested = !!opts.silent;
      const hasCachedNow = !!getCachedProfile(userId);
      const silent = silentRequested && hasCachedNow;

      if (!silent) setLoading(true);
      setError("");

      try {
        const { data, error: qErr } = await supabase
          .from("profiles")
          .select("id, display_name, bio, avatar_url, onboarding_complete")
          .eq("id", userId)
          .single();

        if (qErr) throw qErr;

        const next = data ?? null;
        setProfile(next);
        setCachedProfile(userId, next);
      } catch (e) {
        setError(e?.message || "Failed to load profile.");
        if (!silent) {
          setProfile(null);
          setCachedProfile(userId, null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [supabase, userId]
  );

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

      const next = data ?? payload;
      setProfile(next);
      setCachedProfile(userId, next);
      return next;
    },
    [supabase, userId]
  );

  useEffect(() => {
    if (!supabase || !userId) return;

    const persisted = getCachedProfile(userId);
    if (persisted) {
      setProfile(persisted);
      setLoading(false);
      reload({ silent: true });
    } else {
      setProfile(null);
      reload({ silent: false });
    }
  }, [reload, supabase, userId]);

  return { profile, loading, error, reload, updateProfile };
}
