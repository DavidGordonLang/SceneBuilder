import { useCallback, useEffect, useMemo, useState } from "react";

const VALID = new Set(["into", "curious", "limit"]);

export function useKinkPreferences({ supabase, userId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const prefsByItemId = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      map.set(r.kink_item_id, r);
    }
    return map;
  }, [rows]);

  const reload = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: qErr } = await supabase
        .from("profile_kink_preferences")
        .select("id, user_id, kink_item_id, status, notes, created_at, updated_at")
        .eq("user_id", userId);

      if (qErr) throw qErr;
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load kink preferences.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  /**
   * Bulk save.
   * - upsert rows for status != null
   * - delete rows that were cleared (status null) but previously existed
   */
  const saveBulk = useCallback(
    async ({ nextStatusByItemId, notesByItemId }) => {
      if (!supabase || !userId) throw new Error("Not signed in.");

      setError("");

      const toUpsert = [];
      const toDeleteItemIds = [];

      for (const [kinkItemId, status] of Object.entries(nextStatusByItemId || {})) {
        const trimmed = typeof status === "string" ? status.trim() : null;
        const exists = prefsByItemId.has(kinkItemId);

        if (!trimmed) {
          if (exists) toDeleteItemIds.push(kinkItemId);
          continue;
        }

        if (!VALID.has(trimmed)) continue;

        toUpsert.push({
          user_id: userId,
          kink_item_id: kinkItemId,
          status: trimmed,
          notes: (notesByItemId?.[kinkItemId] || "").slice(0, 200),
          updated_at: new Date().toISOString(),
        });
      }

      // Upsert selections
      if (toUpsert.length) {
        const { error: upErr } = await supabase
          .from("profile_kink_preferences")
          .upsert(toUpsert, { onConflict: "user_id,kink_item_id" });

        if (upErr) throw upErr;
      }

      // Delete cleared selections
      if (toDeleteItemIds.length) {
        const { error: delErr } = await supabase
          .from("profile_kink_preferences")
          .delete()
          .eq("user_id", userId)
          .in("kink_item_id", toDeleteItemIds);

        if (delErr) throw delErr;
      }

      // Reload for certainty (keeps UI honest)
      await reload();
    },
    [supabase, userId, prefsByItemId, reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, prefsByItemId, loading, error, reload, saveBulk };
}
