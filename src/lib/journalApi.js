import { supabase as defaultSupabase } from "./supabaseClient";

function getClient(supabase) {
  return supabase || defaultSupabase;
}

export async function fetchJournalEntries({ supabase, userId, limit = 50 } = {}) {
  const client = getClient(supabase);

  let q = client
    .from("journal_entries")
    .select("id, user_id, entry_type, title, body, scene_id, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) q = q.eq("user_id", userId);

  const { data, error } = await q;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createJournalEntry({ supabase, userId, entry } = {}) {
  const client = getClient(supabase);

  const payload = {
    user_id: userId,
    entry_type: entry.entry_type || "reflection",
    title: entry.title || "",
    body: entry.body || "",
    scene_id: entry.scene_id || null,
  };

  const { data, error } = await client
    .from("journal_entries")
    .insert(payload)
    .select("id, user_id, entry_type, title, body, scene_id, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function updateJournalEntry({ supabase, id, patch } = {}) {
  const client = getClient(supabase);

  const payload = {
    entry_type: patch.entry_type,
    title: patch.title,
    body: patch.body,
    scene_id: patch.scene_id ?? null,
  };

  const { data, error } = await client
    .from("journal_entries")
    .update(payload)
    .eq("id", id)
    .select("id, user_id, entry_type, title, body, scene_id, created_at, updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJournalEntry({ supabase, id } = {}) {
  const client = getClient(supabase);

  const { error } = await client.from("journal_entries").delete().eq("id", id);
  if (error) throw error;
}
