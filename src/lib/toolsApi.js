import { supabase } from "./supabaseClient";

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
 */
export async function fetchUserTools() {
  const { data, error } = await supabase
    .from("tools_user")
    .select(
      "id, status, notes, tool_global_id, custom_name, custom_icon, tags_override, tools_global(id, name, icon, tags, safety_level)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
