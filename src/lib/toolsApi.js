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
  const base = String(originalName || "photo")
    .trim()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_");

  const parts = base.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";
  const stem = parts.join(".") || "photo";
  const safeExt = ext ? `.${ext}` : "";
  return `${stem}${safeExt}`;
}

/**
 * Vault = global tools table (curated list)
 */
export async function fetchToolVault() {
  const { data, error } = await supabase
    .from("tools_global")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Global tools (alias)
 */
export async function fetchGlobalTools() {
  return fetchToolVault();
}

/**
 * User tools (tools_user joined with tools_global)
 */
export async function fetchUserTools() {
  const uid = await getAuthedUserId();

  const { data, error } = await supabase
    .from("tools_user")
    .select(
      `
      *,
      tools_global (*)
    `
    )
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchOwnedTools() {
  const list = await fetchUserTools();
  return list.filter((t) => t.status === "owned");
}

export async function fetchToolUserById(toolUserId) {
  const uid = await getAuthedUserId();

  const { data, error } = await supabase
    .from("tools_user")
    .select(
      `
      *,
      tools_global (*)
    `
    )
    .eq("user_id", uid)
    .eq("id", toolUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * NOTE: patched to accept an optional patch so we can set instance_label at insert-time.
 * Only use for safe fields (e.g. instance_label, photo_path) that belong on tools_user.
 */
export async function addGlobalToolToUser(toolGlobalId, status, patch = {}) {
  const safePatch = patch && typeof patch === "object" ? patch : {};

  const { error } = await supabase.from("tools_user").insert({
    tool_global_id: toolGlobalId,
    status,
    ...safePatch,
  });

  if (error) throw error;
}

export async function createToolUser(toolGlobalId, status = "owned") {
  return addGlobalToolToUser(toolGlobalId, status);
}

export async function updateUserToolStatus(toolUserId, status) {
  const { error } = await supabase.from("tools_user").update({ status }).eq("id", toolUserId);
  if (error) throw error;
}

export async function deleteUserTool(toolUserId) {
  const { error } = await supabase.from("tools_user").delete().eq("id", toolUserId);
  if (error) throw error;
}

export async function deleteToolUser(toolUserId) {
  return deleteUserTool(toolUserId);
}

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

export async function updateToolUser(toolUserId, patch) {
  return updateUserToolInstanceDetails(toolUserId, patch);
}

export async function getToolPhotoSignedUrl(photo_path, expiresInSeconds = 60 * 60) {
  const path = String(photo_path || "").trim();
  if (!path) throw new Error("Missing photo path.");

  const { data, error } = await supabase.storage
    .from(TOOL_PHOTOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl || "";
}

export async function uploadToolPhoto(toolUserId, file) {
  const uid = await getAuthedUserId();

  if (!file) throw new Error("Missing file.");

  const safeName = makeSafeFilename(file.name || "photo");
  const path = `${uid}/${toolUserId}/${Date.now()}_${safeName}`;

  const { error: uploadErr } = await supabase.storage.from(TOOL_PHOTOS_BUCKET).upload(path, file, {
    upsert: true,
  });

  if (uploadErr) throw uploadErr;

  const signedUrl = await getToolPhotoSignedUrl(path);
  return { photo_path: path, signedUrl };
}
