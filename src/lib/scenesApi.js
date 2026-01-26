import { supabase } from "./supabaseClient";

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

export async function fetchScenes() {
  const uid = await getUserId();

  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("user_id", uid)
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
      scene_blocks(
        id,
        scene_id,
        sort_order,
        title,
        body,
        duration_minutes,
        created_at,
        updated_at
      ),
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

  // Ensure stable ordering for blocks even if PostgREST returns unsorted arrays
  if (data?.scene_blocks && Array.isArray(data.scene_blocks)) {
    data.scene_blocks = [...data.scene_blocks].sort(
      (a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0)
    );
  }

  return data;
}

export async function fetchParticipants() {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchOwnedToolsForPicker() {
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

/**
 * IMPORTANT: public.scenes schema (current):
 * - has: title, status, scheduled_for, emotional_state, emotional_notes, planning_stage, etc.
 *
 * We map:
 * - form.intent -> emotional_state
 * - form.notes  -> emotional_notes
 * - scheduled_at -> scheduled_for (even if UI hidden for now)
 */
export async function createScene({
  title,
  intent,
  notes,
  scheduled_at,
  participantIds,
  toolUserIds,
}) {
  const uid = await getUserId();

  const { data: scene, error: sceneErr } = await supabase
    .from("scenes")
    .insert({
      user_id: uid,
      title,
      status: "draft",
      scheduled_for: scheduled_at || null,
      emotional_state: intent ? String(intent).trim() : null,
      emotional_notes: notes ? String(notes).trim() : null,
      planning_stage: "intent",
    })
    .select("*")
    .single();

  if (sceneErr) throw sceneErr;

  const sceneId = scene.id;

  if (Array.isArray(participantIds) && participantIds.length) {
    const rows = participantIds.map((pid) => ({ scene_id: sceneId, participant_id: pid }));
    const { error } = await supabase.from("scene_participants").insert(rows);
    if (error) throw error;
  }

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
  const { error: upErr } = await supabase
    .from("scenes")
    .update({
      title,
      scheduled_for: scheduled_at || null,
      emotional_state: intent ? String(intent).trim() : null,
      emotional_notes: notes ? String(notes).trim() : null,
    })
    .eq("id", sceneId);

  if (upErr) throw upErr;

  // replace participants
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

  // replace tools
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

/**
 * Update planning_stage for a scene (prep/lifecycle progress pill).
 * Allowed values (by DB check constraint): intent, negotiation, planning, connection,
 * exchange, play, aftercare, integration
 */
export async function updateScenePlanningStage(sceneId, planningStage) {
  const next = String(planningStage || "").trim();
  if (!next) throw new Error("planning_stage is required.");

  const { error } = await supabase
    .from("scenes")
    .update({ planning_stage: next })
    .eq("id", sceneId);

  if (error) throw error;
  return true;
}
