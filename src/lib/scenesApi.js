import { supabase } from "./supabaseClient";

/**
 * NOTE (schema assumptions):
 * - scenes: id, title, intent, notes, scheduled_at, status, created_at
 * - participants: id + some name field (name/display_name/etc.)
 * - scene_participants: scene_id, participant_id
 * - scene_tools: scene_id, tool_user_id
 *
 * FOUNDATION.md confirms: scene_tools references tools_user (not tools_global).
 */

export async function fetchScenes() {
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchSceneById(sceneId) {
  const { data, error } = await supabase
    .from("scenes")
    .select(
      `
      *,
      scene_participants(
        participant_id,
        participants(*)
      ),
      scene_tools(
        tool_user_id,
        tools_user(
          id,
          status,
          tool_global_id,
          custom_name,
          custom_icon,
          tools_global(id, name, icon, tags, safety_level)
        )
      )
    `
    )
    .eq("id", sceneId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchParticipants() {
  const { data, error } = await supabase.from("participants").select("*").order("created_at", {
    ascending: false,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnedToolsForPicker() {
  // Pull owned tools from tools_user, including joined tools_global for label/icon.
  const { data, error } = await supabase
    .from("tools_user")
    .select(
      `
      id,
      status,
      tool_global_id,
      custom_name,
      custom_icon,
      tags_override,
      tools_global(id, name, icon, tags, safety_level)
    `
    )
    .eq("status", "owned")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createScene({
  title,
  intent,
  notes,
  scheduled_at,
  participantIds,
  toolUserIds,
}) {
  // 1) create scene
  const { data: scene, error: sceneErr } = await supabase
    .from("scenes")
    .insert({
      title,
      intent: intent || null,
      notes: notes || null,
      scheduled_at: scheduled_at || null,
      status: "draft",
    })
    .select("*")
    .single();

  if (sceneErr) throw sceneErr;

  const sceneId = scene.id;

  // 2) link participants
  if (Array.isArray(participantIds) && participantIds.length) {
    const rows = participantIds.map((pid) => ({ scene_id: sceneId, participant_id: pid }));
    const { error } = await supabase.from("scene_participants").insert(rows);
    if (error) throw error;
  }

  // 3) link tools (tool_user ids)
  if (Array.isArray(toolUserIds) && toolUserIds.length) {
    const rows = toolUserIds.map((tid) => ({ scene_id: sceneId, tool_user_id: tid }));
    const { error } = await supabase.from("scene_tools").insert(rows);
    if (error) throw error;
  }

  return scene;
}

export async function updateScene(
  sceneId,
  { title, intent, notes, scheduled_at, participantIds, toolUserIds }
) {
  // 1) update scene fields
  const { error: upErr } = await supabase
    .from("scenes")
    .update({
      title,
      intent: intent || null,
      notes: notes || null,
      scheduled_at: scheduled_at || null,
    })
    .eq("id", sceneId);

  if (upErr) throw upErr;

  // 2) replace participants
  {
    const { error: delErr } = await supabase
      .from("scene_participants")
      .delete()
      .eq("scene_id", sceneId);
    if (delErr) throw delErr;

    if (Array.isArray(participantIds) && participantIds.length) {
      const rows = participantIds.map((pid) => ({ scene_id: sceneId, participant_id: pid }));
      const { error } = await supabase.from("scene_participants").insert(rows);
      if (error) throw error;
    }
  }

  // 3) replace tools
  {
    const { error: delErr } = await supabase.from("scene_tools").delete().eq("scene_id", sceneId);
    if (delErr) throw delErr;

    if (Array.isArray(toolUserIds) && toolUserIds.length) {
      const rows = toolUserIds.map((tid) => ({ scene_id: sceneId, tool_user_id: tid }));
      const { error } = await supabase.from("scene_tools").insert(rows);
      if (error) throw error;
    }
  }

  return true;
}
