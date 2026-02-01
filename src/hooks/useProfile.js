import { useCallback, useEffect, useState } from "react";

/**
 * Small module cache to reduce UI flashes between tab navigations.
 * Keyed by userId.
 */
let profileCacheByUserId = {
  // [userId]: { profile, ts }
};

/**
 * Fetch + update the logged-in user's profile row in public.profiles.
 * Assumes profiles.id = auth user id (standard Supabase pattern).
 */
export function useProfile({ supabase, userId }) {
  const cached = userId ? profileCacheByUserId[userId]?.profile : null;
  const hasCachedAtInit = Boolean(cached);

  const [profile, setProfile] = useState(() => cached ?? null);
  const [loading, setLoading] = useState(() => Boolean(userId) && !hasCachedAtInit);
  const [error, setError] = useState("");

  const writeCache = useCallback((uid, nextProfile) => {
    if (!uid) return;
    profileCacheByUserId[uid] = { profile: nextProfile ?? null, ts: Date.now() };
  }, []);

  const reload = useCallback(
    async (opts = {}) => {
      if (!supabase || !userId) return;

      const silentRequested = !!opts.silent;
      const hasCachedNow = !!profileCacheByUserId?.[userId]?.profile;

      // Silent refresh only makes sense if we already have cached data.
      const silent = silentRequested && hasCachedNow;

      // If we're doing a silent refresh, don't flip the whole UI into "loading".
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
        writeCache(userId, next);
      } catch (e) {
        setError(e?.message || "Failed to load profile.");
        // Important: don't nuke profile on silent reload failure,
        // or we reintroduce the flash.
        if (!silent) {
          setProfile(null);
          writeCache(userId, null);
        }
      } finally {
        if (!silent) setLoading(false);
        // If silent, we deliberately keep loading as-is (it should already be false in cached flows).
      }
    },
    [supabase, userId, writeCache]
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

      const { data, error: uErr } = await supabase
        .from("profiles")
        .upsert(payload)
        .select()
        .single();
      if (uErr) throw uErr;

      const next = data ?? payload;
      setProfile(next);
      writeCache(userId, next);
      return next;
    },
    [supabase, userId, writeCache]
  );

  useEffect(() => {
    if (!supabase || !userId) return;

    // If we had cached data, do a silent refresh so UI doesn't flash.
    const hasCached = !!profileCacheByUserId?.[userId]?.profile;
    reload({ silent: hasCached });
  }, [reload, supabase, userId]);

  return { profile, loading, error, reload, updateProfile };
}
