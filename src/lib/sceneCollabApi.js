import { supabase as defaultSupabase } from "./supabaseClient";
import { perfTime } from "./perf";

function getClient(supabase) {
  return supabase || defaultSupabase;
}

async function requireAuth(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error("Not signed in.");
  return data.user.id;
}

/* =========================================================
   Negotiation
   ========================================================= */

/**
 * Ensure there is a scene_negotiation row for a given scene.
 * Owner-only insert (RLS). For participants, this will just fetch.
 */
export async function fetchNegotiation(sceneId, { supabase } = {}) {
  return perfTime("collab.fetchNegotiation", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_negotiation")
      .select(
        "scene_id,status,version,draft_text,locked_text,locked_at,locked_by_user_id,unlocked_at,unlocked_by_user_id,unlock_reason,created_at,updated_at"
      )
      .eq("scene_id", sceneId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  });
}

export async function ensureNegotiation(sceneId, { supabase } = {}) {
  return perfTime("collab.ensureNegotiation", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    // Try fetch first (works for owner + participants)
    const existing = await fetchNegotiation(sceneId, { supabase: client });
    if (existing) return existing;

    // Only owner can insert; if participant calls this, insert will fail by RLS.
    const { data, error } = await client
      .from("scene_negotiation")
      .insert([{ scene_id: sceneId }])
      .select(
        "scene_id,status,version,draft_text,locked_text,locked_at,locked_by_user_id,unlocked_at,unlocked_by_user_id,unlock_reason,created_at,updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  });
}

export async function updateNegotiationDraft(sceneId, draftText, { supabase } = {}) {
  return perfTime("collab.updateNegotiationDraft", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_negotiation")
      .update({
        draft_text: String(draftText ?? ""),
        // When editing, we clear locked_text only if not locked — UI will enforce.
      })
      .eq("scene_id", sceneId)
      .select(
        "scene_id,status,version,draft_text,locked_text,locked_at,locked_by_user_id,unlocked_at,unlocked_by_user_id,unlock_reason,updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  });
}

export async function fetchNegotiationAgreements(sceneId, version, { supabase } = {}) {
  return perfTime("collab.fetchNegotiationAgreements", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_negotiation_agreements")
      .select("id,scene_id,user_id,version,agreed_at,created_at")
      .eq("scene_id", sceneId)
      .eq("version", version)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });
}

export async function agreeToNegotiation(sceneId, version, { supabase } = {}) {
  return perfTime("collab.agreeToNegotiation", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    const { data, error } = await client
      .from("scene_negotiation_agreements")
      .insert([{ scene_id: sceneId, user_id: uid, version }])
      .select("id,scene_id,user_id,version,agreed_at,created_at")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function unagreeToNegotiation(sceneId, version, { supabase } = {}) {
  return perfTime("collab.unagreeToNegotiation", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    const { error } = await client
      .from("scene_negotiation_agreements")
      .delete()
      .eq("scene_id", sceneId)
      .eq("version", version)
      .eq("user_id", uid);

    if (error) throw error;
    return true;
  });
}

/**
 * Owner-only: lock negotiation.
 * App rule:
 * - Requires all contributors to have agreed for current version
 * - Copies draft_text -> locked_text, sets status=locked, locked_at/by
 */
export async function lockNegotiation(sceneId, { lockedText, lockedByUserId }, { supabase } = {}) {
  return perfTime("collab.lockNegotiation", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_negotiation")
      .update({
        status: "locked",
        locked_text: String(lockedText ?? ""),
        locked_at: new Date().toISOString(),
        locked_by_user_id: lockedByUserId || null,
      })
      .eq("scene_id", sceneId)
      .select(
        "scene_id,status,version,draft_text,locked_text,locked_at,locked_by_user_id,updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Owner-only: unlock negotiation (reset agreements by bumping version).
 * App rule:
 * - status -> draft
 * - version = version + 1
 * - unlocked_at/by/reason set
 * - (Agreements reset is accomplished by version bump; old agreements remain for audit)
 */
export async function unlockNegotiation(sceneId, { unlockReason, unlockedByUserId }, { supabase } = {}) {
  return perfTime("collab.unlockNegotiation", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    // We need the current version to increment safely.
    const current = await fetchNegotiation(sceneId, { supabase: client });
    if (!current) throw new Error("Negotiation row missing.");

    const nextVersion = (current.version || 1) + 1;

    const { data, error } = await client
      .from("scene_negotiation")
      .update({
        status: "draft",
        version: nextVersion,
        unlocked_at: new Date().toISOString(),
        unlocked_by_user_id: unlockedByUserId || null,
        unlock_reason: String(unlockReason ?? ""),
        locked_at: null,
        locked_by_user_id: null,
        // keep locked_text as historical snapshot; UI can show it if wanted
      })
      .eq("scene_id", sceneId)
      .select(
        "scene_id,status,version,draft_text,locked_text,locked_at,locked_by_user_id,unlocked_at,unlocked_by_user_id,unlock_reason,updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  });
}

/* =========================================================
   Suggestions: blocks
   ========================================================= */

export async function createBlockSuggestion(sceneId, blockKey, suggestedText, { supabase } = {}) {
  return perfTime("collab.createBlockSuggestion", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    const { data, error } = await client
      .from("scene_block_suggestions")
      .insert([
        {
          scene_id: sceneId,
          block_key: String(blockKey ?? ""),
          suggested_text: String(suggestedText ?? ""),
          suggested_by_user_id: uid,
        },
      ])
      .select("id,scene_id,block_key,suggested_text,suggested_by_user_id,status,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function fetchBlockSuggestions(sceneId, { supabase } = {}) {
  return perfTime("collab.fetchBlockSuggestions", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_block_suggestions")
      .select("id,scene_id,block_key,suggested_text,suggested_by_user_id,status,created_at,updated_at")
      .eq("scene_id", sceneId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });
}

export async function setBlockSuggestionStatus(suggestionId, status, { supabase } = {}) {
  return perfTime("collab.setBlockSuggestionStatus", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_block_suggestions")
      .update({ status })
      .eq("id", suggestionId)
      .select("id,scene_id,block_key,suggested_text,suggested_by_user_id,status,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}

/* =========================================================
   Suggestions: tools
   ========================================================= */

export async function createToolSuggestionByUserTool(sceneId, toolsUserId, note = "", { supabase } = {}) {
  return perfTime("collab.createToolSuggestionByUserTool", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    const { data, error } = await client
      .from("scene_tool_suggestions")
      .insert([
        {
          scene_id: sceneId,
          suggested_by_user_id: uid,
          tools_user_id: toolsUserId,
          tools_global_id: null,
          note: String(note ?? ""),
        },
      ])
      .select("id,scene_id,suggested_by_user_id,tools_user_id,tools_global_id,note,status,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function createToolSuggestionByVault(sceneId, toolsGlobalId, note = "", { supabase } = {}) {
  return perfTime("collab.createToolSuggestionByVault", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    const { data, error } = await client
      .from("scene_tool_suggestions")
      .insert([
        {
          scene_id: sceneId,
          suggested_by_user_id: uid,
          tools_user_id: null,
          tools_global_id: toolsGlobalId,
          note: String(note ?? ""),
        },
      ])
      .select("id,scene_id,suggested_by_user_id,tools_user_id,tools_global_id,note,status,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}

export async function fetchToolSuggestions(sceneId, { supabase } = {}) {
  return perfTime("collab.fetchToolSuggestions", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_tool_suggestions")
      .select("id,scene_id,suggested_by_user_id,tools_user_id,tools_global_id,note,status,created_at,updated_at")
      .eq("scene_id", sceneId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });
}

export async function setToolSuggestionStatus(suggestionId, status, { supabase } = {}) {
  return perfTime("collab.setToolSuggestionStatus", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("scene_tool_suggestions")
      .update({ status })
      .eq("id", suggestionId)
      .select("id,scene_id,suggested_by_user_id,tools_user_id,tools_global_id,note,status,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}
