import { supabase } from "./supabaseClient";

const TOOL_PHOTOS_BUCKET = "tool-photos";

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
  return `${stamp}-${rand}-${base}`.slice(0, 120);
}

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
 * Back-compat: ToolsHome.jsx expects fetchGlobalTools().
 */
export async function fetchGlobalTools() {
  return fetchToolVault();
}

/**
 * Fetch user's tools (all statuses).
 */
export async function fetchUserTools() {
  const { data, error } = await supabase
    .from("tools_user")
    .select(
      [
        "id",
        "user_id",
        "status",
        "notes",
        "tool_global_id",
        "custom_name",
        "custom_icon",
        "tags_override",
        "instance_label",
        "photo_path",
        "created_at",
        "updated_at",
        "tools_global(id, name, icon, tags, safety_level)",
      ].join(", ")
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Back-compat: some screens expect fetchOwnedTools().
 */
export async function fetchOwnedTools() {
  const { data, error } = await supabase
    .from("tools_user")
    .select(
      [
        "id",
        "user_id",
        "status",
        "notes",
        "tool_global_id",
        "custom_name",
        "custom_icon",
        "tags_override",
        "instance_label",
        "photo_path",
        "created_at",
        "updated_at",
        "tools_global(id, name, icon, tags, safety_level)",
      ].join(", ")
    )
    .eq("status", "owned")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch one tools_user row.
 */
export async function fetchToolUserById(toolUserId) {
  const { data, error } = await supabase
    .from("tools_user")
    .select(
      [
        "id",
        "user_id",
        "status",
        "notes",
        "tool_global_id",
        "custom_name",
        "custom_icon",
        "tags_override",
        "instance_label",
        "photo_path",
        "created_at",
        "updated_at",
        "tools_global(id, name, icon, tags, safety_level)",
      ].join(", ")
    )
    .eq("id", toolUserId)
    .single();

  if (error) throw error;
  return data;
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
 * Back-compat: ToolsHome.jsx expects createToolUser(tool_global_id, status).
 */
export async function createToolUser(toolGlobalId, status = "owned") {
  return addGlobalToolToUser(toolGlobalId, status);
}

/**
 * Update tool status (e.g. craving → owned).
 */
export async function updateUserToolStatus(toolUserId, status) {
  const { error } = await supabase
    .from("tools_user")
    .update({ status })
    .eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Remove a tool from user's drawer.
 */
export async function deleteUserTool(toolUserId) {
  const { error } = await supabase.from("tools_user").delete().eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Back-compat: ToolsHome.jsx expects deleteToolUser().
 */
export async function deleteToolUser(toolUserId) {
  return deleteUserTool(toolUserId);
}

/**
 * Update per-instance details on tools_user (instance_label + photo_path etc.)
 */
export async function updateUserToolInstanceDetails(toolUserId, patch) {
  const safePatch = {};

  if (Object.prototype.hasOwnProperty.call(patch, "instance_label"))
    safePatch.instance_label = patch.instance_label;

  if (Object.prototype.hasOwnProperty.call(patch, "photo_path"))
    safePatch.photo_path = patch.photo_path;

  if (Object.prototype.hasOwnProperty.call(patch, "notes"))
    safePatch.notes = patch.notes;

  if (Object.prototype.hasOwnProperty.call(patch, "custom_name"))
    safePatch.custom_name = patch.custom_name;

  if (Object.prototype.hasOwnProperty.call(patch, "custom_icon"))
    safePatch.custom_icon = patch.custom_icon;

  if (Object.prototype.hasOwnProperty.call(patch, "tags_override"))
    safePatch.tags_override = patch.tags_override;

  if (Object.prototype.hasOwnProperty.call(patch, "status"))
    safePatch.status = patch.status;

  const { error } = await supabase.from("tools_user").update(safePatch).eq("id", toolUserId);
  if (error) throw error;
}

/**
 * Back-compat: ToolsHome.jsx expects updateToolUser().
 */
export async function updateToolUser(toolUserId, patch) {
  return updateUserToolInstanceDetails(toolUserId, patch);
}

/**
 * Get a signed URL for a private tool photo.
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

/**
 * Upload a tool photo for a specific tools_user row.
 * Storage path format: <user_id>/<tools_user_id>/<filename>
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