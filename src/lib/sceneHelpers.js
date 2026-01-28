// src/lib/sceneHelpers.js

export function formatDate(isoLike) {
  try {
    if (!isoLike) return "";
    const d = new Date(isoLike);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function pickParticipantLabel(p) {
  if (!p) return "Participant";
  const name = String(p.name || p.display_name || p.email || "").trim();
  return name || "Participant";
}

export function pickToolLabel(toolUserOrTool) {
  const t = toolUserOrTool || {};
  // Prefer user overrides first, otherwise fall back to the global tool name.
  const custom = String(t.custom_name || "").trim();
  if (custom) return custom;

  const g = t.tools_global;
  const globalName = String(g?.name || g?.label || "").trim();
  if (globalName) return globalName;

  return "Untitled tool";
}

export function pickToolIcon(toolUserOrTool) {
  const t = toolUserOrTool || {};
  // Prefer user overrides first, otherwise fall back to the global icon.
  const custom = String(t.custom_icon || "").trim();
  if (custom) return custom;

  const g = t.tools_global;
  const globalIcon = String(g?.icon || "").trim();
  if (globalIcon) return globalIcon;

  return "🧰";
}
