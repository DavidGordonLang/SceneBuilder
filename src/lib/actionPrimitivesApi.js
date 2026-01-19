import { supabase as defaultSupabase } from "./supabaseClient";

/**
 * Action Primitives (global) + user-owned vocabulary mappings.
 * Safe defaults:
 * - Global tables are SELECT-only for authenticated users (writes are admin-only).
 * - User table is RLS-locked to auth.uid().
 *
 * All functions accept an optional supabase client for consistency with
 * the rest of the app, but will fall back to the default client.
 */

function getClient(supabase) {
  return supabase || defaultSupabase;
}

/** -----------------------------
 * Global: Action primitives
 * ----------------------------*/

export async function fetchActiveActionPrimitives({ supabase } = {}) {
  const client = getClient(supabase);

  const { data, error } = await client
    .from("action_primitives_global")
    .select(
      "id, label, description, intensity_min, intensity_max, safety_notes, is_active, meta, created_at, updated_at"
    )
    .eq("is_active", true)
    .order("label", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchActionPrimitiveKinks({ supabase } = {}) {
  const client = getClient(supabase);

  const { data, error } = await client
    .from("action_primitive_kinks")
    .select("action_primitive_id, kink_item_id");

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchActionPrimitiveRoles({ supabase } = {}) {
  const client = getClient(supabase);

  const { data, error } = await client
    .from("action_primitive_roles")
    .select("action_primitive_id, role");

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/** -----------------------------
 * User: Vocabulary mappings
 * ----------------------------*/

export async function fetchUserActionVocabulary({ supabase, userId } = {}) {
  const client = getClient(supabase);

  // RLS already restricts to auth.uid(), but filtering keeps queries explicit.
  let q = client
    .from("action_vocabulary_user")
    .select("id, user_id, action_primitive_id, display_text, tone_tags, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q;

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function upsertUserActionVocabulary({ supabase, rows } = {}) {
  const client = getClient(supabase);

  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return;

  const { error } = await client.from("action_vocabulary_user").upsert(safeRows, {
    onConflict: "user_id,action_primitive_id",
  });

  if (error) throw error;
}

export async function deleteUserActionVocabularyByPrimitiveIds({
  supabase,
  userId,
  primitiveIds,
} = {}) {
  const client = getClient(supabase);

  const ids = Array.isArray(primitiveIds) ? primitiveIds.filter(Boolean) : [];
  if (!userId || !ids.length) return;

  const { error } = await client
    .from("action_vocabulary_user")
    .delete()
    .eq("user_id", userId)
    .in("action_primitive_id", ids);

  if (error) throw error;
}
