export function parseDateTimeForInput(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

export function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
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
  return (
    p?.name ||
    p?.display_name ||
    p?.nickname ||
    p?.full_name ||
    p?.label ||
    `Participant ${String(p?.id ?? "").slice(0, 6)}`
  );
}

export function pickToolLabel(tu) {
  // Prefer the per-instance name the user gave this tool/toy.
  // In your DB this is currently stored in `instance_label` (custom_name may be null).
  const inst = String(tu?.instance_label || "").trim();
  if (inst) return inst;

  const custom = String(tu?.custom_name || "").trim();
  if (custom) return custom;

  const g = tu?.tools_global;
  const globalName = String(g?.name || "").trim();
  if (globalName) return globalName;

  return "Untitled tool";
}

export function pickToolIcon(tu) {
  // Prefer per-instance icon selection if present.
  const custom = String(tu?.custom_icon || "").trim();
  if (custom) return custom;

  const g = tu?.tools_global;
  return g?.icon || "🧰";
}