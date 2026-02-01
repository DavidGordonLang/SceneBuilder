import { supabase } from "./supabaseClient";
import { perfTime } from "./perf";

const TOOL_PHOTOS_BUCKET = "tool-photos";

/**
 * Fetch Tool Vault (global tools).
 */
export async function fetchToolVault() {
  return perfTime("tools.fetchToolVault", async () => {
    const { data, error } = await supabase
      .from("tools_global")
      .select("id, name, icon, tags, safety_level, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return data ?? [];
  });
}

/**
 * Fetch user's tools (owned + craving + custom).
 * NOTE: now includes instance_label + photo_path (per owned instance).
 */
export async function fetchUserTools() {
  return perfTime("tools.fetchUserTools", async () => {
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
  });
}

/**
 * Add a global tool to user's drawer.
 * status: 'owned' | 'craving'
 */
export async function addGlobalToolToUser(toolGlobalId, status) {
  return perfTime("tools.addGlobalToolToUser", async () => {
    const { error } = await supabase.from("tools_user").insert({
      tool_global_id: toolGlobalId,
      status,
    });

    if (error) throw error;
  });
}

/**
 * Update tool status (e.g. craving → owned).
 */
export async function updateUserToolStatus(toolUserId, status) {
  return perfTime("tools.updateUserToolStatus", async () => {
    const { error } = await supabase.from("tools_user").update({ status }).eq("id", toolUserId);
    if (error) throw error;
  });
}

/**
 * Remove a tool from user's drawer (owned or craving).
 */
export async function deleteUserTool(toolUserId) {
  return perfTime("tools.deleteUserTool", async () => {
    const { error } = await supabase.from("tools_user").delete().eq("id", toolUserId);
    if (error) throw error;
  });
}

/**
 * Update per-instance details on tools_user (label + photo_path, etc.)
 */
export async function updateUserToolInstanceDetails(toolUserId, patch) {
  return perfTime("tools.updateUserToolInstanceDetails", async () => {
    const safePatch = {};
    if ("instance_label" in patch) safePatch.instance_label = patch.instance_label ?? null;
    if ("photo_path" in patch) {
      safePatch.photo_path = patch.photo_path ?? null;
    }
    if ("notes" in patch) safePatch.notes = patch.notes ?? null;
    if ("tags_override" in patch) safePatch.tags_override = patch.tags_override ?? null;

    const { error } = await supabase.from("tools_user").update(safePatch).eq("id", toolUserId);
    if (error) throw error;
  });
}

/**
 * Upload a tool photo to storage. Returns the stored path.
 */
export async function uploadToolPhoto(toolUserId, file) {
  return perfTime("tools.uploadToolPhoto", async () => {
    if (!file) throw new Error("No file selected.");

    const ext = (file.name || "").split(".").pop() || "jpg";
    const path = `${toolUserId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(TOOL_PHOTOS_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) throw error;
    return path;
  });
}

/**
 * Get a signed URL for a tool photo path.
 */
export async function getToolPhotoSignedUrl(path, ttlSeconds = 3600) {
  return perfTime("tools.getToolPhotoSignedUrl", async () => {
    if (!path) return "";
    const { data, error } = await supabase.storage
      .from(TOOL_PHOTOS_BUCKET)
      .createSignedUrl(path, ttlSeconds);

    if (error) throw error;
    return data?.signedUrl || "";
  });
}
