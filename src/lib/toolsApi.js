import { supabase } from "./supabaseClient";

const TOOL_PHOTOS_BUCKET = "tool-photos";

/**
 * Fetch Tool Vault (global tools).
 */
export async function fetchToolVault() {
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
  const { error } = await supabase.from("tools_user").update({ status }).eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Remove a tool from user's drawer (owned or craving).
 */
export async function deleteUserTool(toolUserId) {
  const { error } = await supabase.from("tools_user").delete().eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Update per-instance details on tools_user (label + photo_path, etc.)
 */
export async function updateUserToolInstanceDetails(toolUserId, patch) {
  const safePatch = {};
  if (Object.prototype.hasOwnProperty.call(patch, "instance_label")) safePatch.instance_label = patch.instance_label;
  if (Object.prototype.hasOwnProperty.call(patch, "photo_path")) safePatch.photo_path = patch.photo_path;
  if (Object.prototype.hasOwnProperty.call(patch, "notes")) safePatch.notes = patch.notes;

  const { error } = await supabase.from("tools_user").update(safePatch).eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Get a signed URL for a private tool photo.
 * Returns null if photo_path is falsy.
 */
export async function getToolPhotoSignedUrl(photo_path, expiresInSeconds = 60 * 60) {
  const path = String(photo_path || "").trim();
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(TOOL_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl || null;
}

async function getAuthedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

function makeSafeFilename(originalName = "photo") {
  const base = String(originalName || "photo").replace(/[^\w.\-]+/g, "_");
  const stamp = Date.now();
  const rand = Math.random().toString(16).slice(2, 10);
  // keep extension if present
  return `${stamp}-${rand}-${base}`.slice(0, 120);
}

/**
 * Upload a tool photo for a specific tools_user row.
 * Storage path format: <user_id>/<tools_user_id>/<filename>
 *
 * Returns: { photo_path, signedUrl }
 * (Does NOT update the tools_user row automatically — call updateUserToolInstanceDetails afterwards.)
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

  const signedUrl = await getToolPhotoSignedUrl(photo_path);
  return { photo_path, signedUrl };
}
