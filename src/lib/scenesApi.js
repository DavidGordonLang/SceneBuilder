import { supabase } from "./supabaseClient";

async function getUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

/* ---------------- Scene block defaults ---------------- */

export const DEFAULT_SCENE_BLOCKS = [
  { key: "intent_desire", title: "Intent / Desire" },
  { key: "negotiation", title: "Negotiation" },
  { key: "planning_design", title: "Planning / Scene Design" },
  { key: "pre_scene_connection", title: "Pre-Scene Connection" },
  { key: "induction_exchange", title: "Induction / Power Exchange" },
  { key: "scene_proper", title: "The Scene Proper" },
  { key: "peak_climax", title: "Peak / Climax" },
  { key: "de_escalation", title: "De-Escalation" },
  { key: "aftercare", title: "Aftercare" },
  { key: "drop_window", title: "After-Aftercare / Drop Window" },
  { key: "integration_debrief", title: "Integration / Debrief" },
];

function normalizeBlocks(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .map((b, idx) => ({
      id: b?.id || null,
      sort_order: typeof b?.sort_order === "number" ? b.sort_order : (idx + 1) * 10,
      title: String(b?.title || "").trim() || `Stage ${idx + 1}`,
      body: String(b?.body || ""),
      duration_minutes:
        b?.duration_minutes === null || b?.duration_minutes === undefined
          ? null
          : Number(b.duration_minutes),
    }))
    .filter((b) => b.title || b.body);
}

export async function ensureDefaultSceneBlocks(sceneId, { seedText = "" } = {}) {
  const uid = await getUserId();

  const { data: existing, error: existingErr } = await supabase
    .from("scene_blocks")
    .select("id")
    .eq("scene_id", sceneId)
    .limit(1);

  if (existingErr) throw existingErr;
  if (existing && existing.length) return true;

  const seed = String(seedText || "").trim();

  const rows = DEFAULT_SCENE_BLOCKS.map((b, idx) => ({
    user_id: uid,
    scene_id: sceneId,
    sort_order: (idx + 1) * 10,
    title: b.title,
    body:
      idx === 0 && seed
        ? seed
        : "",
    duration_minutes: null,
  }));

  const { error } = await supabase.from("scene_blocks").insert(rows);
  if (error) throw error;
  return true;
}

export async function replaceSceneBlocks(sceneId, blocks) {
  const uid = await getUserId();
  const normalized = normalizeBlocks(blocks);

  const { error: delErr } = await supabase
    .from("scene_blocks")
    .delete()
    .eq("scene_id", sceneId);

  if (delErr) throw delErr;

  if (!normalized.length) return true;

  const rows = normalized.map((b) => ({
    user_id: uid,
    scene_id: sceneId,
    sort_order: b.sort_order,
    title: b.title,
    body: b.body,
    duration_minutes: b.duration_minutes,
  }));

  const { error: insErr } = await supabase.from("scene_blocks").insert(rows);
  if (insErr) throw insErr;
  return true;
}

export async function fetchScenes() {
  const uid = await getUserId();

  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchSceneById(sceneId) {
  const uid = await getUserId();

  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchParticipants() {
  const uid = await getUserId();

  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchOwnedToolsForPicker() {
  const uid = await getUserId();

  const { data, error } = await supabase
    .from("tools_user")
    .select(
      `
      *,
      tools_global (*)
    `
    )
    .eq("user_id", uid)
    .eq("status", "owned")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createScene({
  title,
  intent,
  notes,
  scheduled_at,
  participantIds,
  toolUserIds,
  blocks,
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
    const rows = participantIds.map((pid) => ({
      scene_id: sceneId,
      participant_id: pid,
    }));
    const { error } = await supabase.from("scene_participants").insert(rows);
    if (error) throw error;
  }

  if (Array.isArray(toolUserIds) && toolUserIds.length) {
    const rows = toolUserIds.map((tid) => ({
      scene_id: sceneId,
      tool_user_id: tid,
    }));
    const { error } = await supabase.from("scene_tools").insert(rows);
    if (error) throw error;
  }

  // Primary planning data:
  // If UI passes blocks, save them; otherwise seed defaults (optionally seeded from notes).
  if (Array.isArray(blocks) && blocks.length) {
    await replaceSceneBlocks(sceneId, blocks);
  } else {
    await ensureDefaultSceneBlocks(sceneId, { seedText: notes || "" });
  }

  return scene;
}

export async function updateScene(
  sceneId,
  { title, intent, notes, scheduled_at, participantIds, toolUserIds, blocks }
) {
  const uid = await getUserId();

  const { data: scene, error: sceneErr } = await supabase
    .from("scenes")
    .update({
      title,
      scheduled_for: scheduled_at || null,
      emotional_state: intent ? String(intent).trim() : null,
      emotional_notes: notes ? String(notes).trim() : null,
    })
    .eq("id", sceneId)
    .eq("user_id", uid)
    .select("*")
    .single();

  if (sceneErr) throw sceneErr;

  const { error: delP } = await supabase
    .from("scene_participants")
    .delete()
    .eq("scene_id", sceneId);
  if (delP) throw delP;

  if (Array.isArray(participantIds) && participantIds.length) {
    const rows = participantIds.map((pid) => ({
      scene_id: sceneId,
      participant_id: pid,
    }));
    const { error } = await supabase.from("scene_participants").insert(rows);
    if (error) throw error;
  }

  const { error: delT } = await supabase.from("scene_tools").delete().eq("scene_id", sceneId);
  if (delT) throw delT;

  if (Array.isArray(toolUserIds) && toolUserIds.length) {
    const rows = toolUserIds.map((tid) => ({
      scene_id: sceneId,
      tool_user_id: tid,
    }));
    const { error } = await supabase.from("scene_tools").insert(rows);
    if (error) throw error;
  }

  if (Array.isArray(blocks)) {
    await replaceSceneBlocks(sceneId, blocks);
  }

  return scene;
}

export async function updateScenePlanningStage(sceneId, next) {
  const uid = await getUserId();
  const { error } = await supabase
    .from("scenes")
    .update({ planning_stage: next })
    .eq("id", sceneId)
    .eq("user_id", uid);

  if (error) throw error;
  return true;
}

/**
 * Added to match ScenesHome import.
 * Deletes child rows defensively (in case FK isn't ON DELETE CASCADE), then deletes the scene.
 */
export async function deleteScene(sceneId) {
  const uid = await getUserId();
  const id = String(sceneId || "").trim();
  if (!id) throw new Error("Missing scene id.");

  const childTables = ["scene_tools", "scene_participants", "scene_blocks"];
  for (const t of childTables) {
    const { error } = await supabase.from(t).delete().eq("scene_id", id);
    if (error) throw error;
  }

  const { error: sceneErr } = await supabase
    .from("scenes")
    .delete()
    .eq("id", id)
    .eq("user_id", uid);

  if (sceneErr) throw sceneErr;
}
