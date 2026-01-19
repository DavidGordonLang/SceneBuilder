import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteUserActionVocabularyByPrimitiveIds,
  fetchUserActionVocabulary,
  upsertUserActionVocabulary,
} from "../lib/actionPrimitivesApi";

/**
 * User-owned vocabulary mappings:
 * - One mapping per user per primitive (unique constraint)
 *
 * Pattern mirrors useKinkPreferences:
 * - reload for certainty after writes (stable + honest UI)
 */
export function useActionVocabulary({ supabase, userId } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const byPrimitiveId = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      map.set(r.action_primitive_id, r);
    }
    return map;
  }, [rows]);

  const reload = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const data = await fetchUserActionVocabulary({ supabase, userId });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load your vocabulary mappings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  /**
   * Bulk save:
   * - Upsert any primitives with non-empty display_text
   * - Delete mappings where user cleared the text (only if previously existed)
   */
  const saveBulk = useCallback(
    async ({ displayTextByPrimitiveId, toneTagsByPrimitiveId } = {}) => {
      if (!userId) throw new Error("Not signed in.");

      setError("");

      const toUpsert = [];
      const toDelete = [];

      const entries = Object.entries(displayTextByPrimitiveId || {});
      for (const [primitiveId, rawText] of entries) {
        const trimmed = typeof rawText === "string" ? rawText.trim() : "";
        const exists = byPrimitiveId.has(primitiveId);

        if (!trimmed) {
          if (exists) toDelete.push(primitiveId);
          continue;
        }

        toUpsert.push({
          user_id: userId,
          action_primitive_id: primitiveId,
          display_text: trimmed.slice(0, 220),
          tone_tags: Array.isArray(toneTagsByPrimitiveId?.[primitiveId])
            ? toneTagsByPrimitiveId[primitiveId].slice(0, 10)
            : [],
          updated_at: new Date().toISOString(),
        });
      }

      if (toUpsert.length) {
        await upsertUserActionVocabulary({ supabase, rows: toUpsert });
      }

      if (toDelete.length) {
        await deleteUserActionVocabularyByPrimitiveIds({
          supabase,
          userId,
          primitiveIds: toDelete,
        });
      }

      await reload();
    },
    [supabase, userId, byPrimitiveId, reload]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, byPrimitiveId, loading, error, reload, saveBulk };
}
