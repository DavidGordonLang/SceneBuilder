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
      sort_order:
        typeof b?.sort_order === "number" ? b.sort_order : (idx + 1) * 10,
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
  // If blocks already exist, do nothing.
  const { data: existing, error: exErr } = await supabase
    .from("scene_blocks")
    .select("id")
    .eq("scene_id", sceneId)
    .limit(1);

  // If table doesn’t exist or RLS blocks, surface the error (this is core now)
  if (exErr) throw exErr;
  if (existing && existing.length) return 0;

  const rows = DEFAULT_SCENE_BLOCKS.map((d, idx) => ({
    scene_id: sceneId,
    sort_order: (idx + 1) * 10,
    title: d.title,
    body: "",
    duration_minutes: null,
  }));

  // If we have seedText (old notes), put it into Planning/Design by default
  if (seedText && typeof seedText === "string") {
    const seed = seedText.trim();
    if (seed) {
      const targetIdx = DEFAULT_SCENE_BLOCKS.findIndex(
        (x) => x.key === "planning_design"
      );
      const i = targetIdx >= 0 ? targetIdx : 2;
      rows[i].body = seed;
    }
  }

  const { error: insErr } = await supabase.from("scene_blocks").insert(rows);
  if (insErr) throw insErr;

  return rows.length;
}

export async function replaceSceneBlocks(sceneId, blocks) {
  const normalized = normalizeBlocks(blocks);

  // Replace strategy = simple + predictable (no drift).
  // Delete then insert. (We can optimize later.)
  const { error: delErr } = await supabase
    .from("scene_blocks")
    .delete()
    .eq("scene_id", sceneId);
  if (delErr) throw delErr;

  if (!normalized.length) return 0;

  const rows = normalized.map((b) => ({
    scene_id: sceneId,
    sort_order: b.sort_order,
    title: b.title,
    body: b.body,
    duration_minutes: b.duration_minutes,
  }));

  const { error: insErr } = await supabase.from("scene_blocks").insert(rows);
  if (insErr) throw insErr;

  return rows.length;
}

/* ---------------- Core scene queries ---------------- */

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
  // 1) Fetch the scene with relationships that are known-good
  const { data: scene, error } = await supabase
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
          instance_label,
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

  // 2) Fetch blocks separately (avoid schema-cache relationship issues)
  const { data: blocks, error: blocksErr } = await supabase
    .from("scene_blocks")
    .select(
      "id,scene_id,sort_order,title,body,duration_minutes,created_at,updated_at"
    )
    .eq("scene_id", sceneId)
    .order("sort_order", { ascending: true });

  if (blocksErr) throw blocksErr;
  scene.scene_blocks = blocks ?? [];

  return scene;
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
      instance_label,
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
 * scenes mapping:
 * - form.intent -> emotional_state
 * - form.notes  -> emotional_notes (kept as "extra notes" for now)
 * - scheduled_at -> scheduled_for (UI hidden for now)
 * - blocks -> scene_blocks (primary planning data)
 */
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
      const rows = participantIds.map((pid) => ({
        scene_id: sceneId,
        participant_id: pid,
      }));
      const { error } = await supabase.from("scene_participants").insert(rows);
      if (error) throw error;
    }
  }

  // replace tools
  {
    const { error: delErr } = await supabase
      .from("scene_tools")
      .delete()
      .eq("scene_id", sceneId);
    if (delErr) throw delErr;

    if (Array.isArray(toolUserIds) && toolUserIds.length) {
      const rows = toolUserIds.map((tid) => ({
        scene_id: sceneId,
        tool_user_id: tid,
      }));
      const { error } = await supabase.from("scene_tools").insert(rows);
      if (error) throw error;
    }
  }

  // replace blocks if provided (UI will provide them once we swap the editor)
  if (Array.isArray(blocks)) {
    // If the UI sends an empty array, that’s intentional (though we probably won’t allow it).
    await replaceSceneBlocks(sceneId, blocks);
  }

  return true;
}

/**
 * Update planning_stage for a scene (prep/lifecycle progress pill).
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
