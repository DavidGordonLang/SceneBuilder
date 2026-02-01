import { supabase } from "./supabaseClient";

const TOOL_PHOTOS_BUCKET = "tool-photos";

/* ---------------- auth gate ----------------
   On cold boot, Supabase can take a moment to hydrate the session.
   During that window, RLS-backed queries can return [] (not an error).
   We wait briefly to avoid caching "empty" as if it were real data.
*/

async function getAuthedUserId({ waitMs = 1200, stepMs = 60 } = {}) {
  const max = Math.max(0, Number(waitMs) || 0);
  const step = Math.max(20, Number(stepMs) || 60);

  const t0 = Date.now();
  while (true) {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;

    const uid = data?.user?.id;
    if (uid) return uid;

    if (Date.now() - t0 >= max) break;
    await new Promise((r) => setTimeout(r, step));
  }

  throw new Error("Not signed in.");
}

/**
 * Fetch Tool Vault (global tools).
 */
export async function fetchToolVault() {
  await getAuthedUserId();

  const { data, error } = await supabase
    .from("tools_global")
    .select("id, name, icon, tags, safety_level, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch user's tools (owned + craving + custom).
 * NOTE: now includes instance_label + photo_path (per owned instance).
 */
export async function fetchUserTools() {
  await getAuthedUserId();

  const { data, error } = await supabase
    .from("tools_user")
    .select(
      [
        "id",
        "status",
        "notes",
        "tool_global_id",
        "custom_name",
        "custom_icon",
        "tags_override",
        "instance_label",
        "photo_path",
        "tools_global(id, name, icon, tags, safety_level)",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Add a global tool to user's drawer.
 * status: 'owned' | 'craving'
 */
export async function addGlobalToolToUser(toolGlobalId, status) {
  await getAuthedUserId();

  const { error } = await supabase.from("tools_user").insert({
    tool_global_id: toolGlobalId,
    status,
  });

  if (error) throw error;
}

/**
 * Update tool status (e.g. craving → owned).
 */
export async function updateUserToolStatus(toolUserId, status) {
  await getAuthedUserId();

  const { error } = await supabase.from("tools_user").update({ status }).eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Remove a tool from user's drawer (owned or craving).
 */
export async function deleteUserTool(toolUserId) {
  await getAuthedUserId();

  const { error } = await supabase.from("tools_user").delete().eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Update per-instance details on tools_user (label + photo_path, etc.)
 */
export async function updateUserToolInstanceDetails(toolUserId, patch) {
  await getAuthedUserId();

  const safePatch = {};
  if (Object.prototype.hasOwnProperty.call(patch, "instance_label"))
    safePatch.instance_label = patch.instance_label ?? null;
  if (Object.prototype.hasOwnProperty.call(patch, "photo_path"))
    safePatch.photo_path = patch.photo_path ?? null;
  if (Object.prototype.hasOwnProperty.call(patch, "notes"))
    safePatch.notes = patch.notes ?? null;
  if (Object.prototype.hasOwnProperty.call(patch, "tags_override"))
    safePatch.tags_override = patch.tags_override ?? null;

  const { error } = await supabase.from("tools_user").update(safePatch).eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Get a signed URL for a tool photo path.
 */
export async function getToolPhotoSignedUrl(photo_path, expiresInSeconds = 60 * 60) {
  await getAuthedUserId();

  const path = String(photo_path || "").trim();
  if (!path) return "";

  const { data, error } = await supabase.storage
    .from(TOOL_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl || "";
}

function makeSafeFilename(originalName = "photo") {
  const base = String(originalName || "photo").replace(/[^\w.\-]+/g, "_");
  const stamp = Date.now();
  const rand = Math.random().toString(16).slice(2, 10);
  return `${stamp}-${rand}-${base}`.slice(0, 120);
}

/**
 * Upload a tool photo to storage.
 * IMPORTANT: returns the stored `photo_path` STRING (hook expects a string).
 */
export async function uploadToolPhoto(toolUserId, file) {
  if (!toolUserId) throw new Error("Missing toolUserId.");
  if (!file) throw new Error("Missing file.");

  const uid = await getAuthedUserId();
  const filename = makeSafeFilename(file?.name || "photo");
  const photo_path = `${uid}/${toolUserId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(TOOL_PHOTOS_BUCKET)
    .upload(photo_path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file?.type || undefined,
    });

  if (uploadError) throw uploadError;

  return photo_path;
}
