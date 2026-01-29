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
  // Prefer per-instance naming (what the user set in Tools & Toys).
  // In our current data model, instance_label is the primary "given name" for that specific item.
  const instance = String(tu?.instance_label || "").trim();
  if (instance) return instance;

  // Support older rows that used custom_name.
  const custom = String(tu?.custom_name || "").trim();
  if (custom) return custom;

  const g = tu?.tools_global;
  const globalName = String(g?.name || "").trim();
  if (globalName) return globalName;

  return "Untitled tool";
}

export function pickToolIcon(tu) {
  // Prefer per-instance icon selection if present.
  if (tu?.custom_icon && String(tu.custom_icon).trim()) {
    return String(tu.custom_icon).trim();
  }

  const g = tu?.tools_global;
  return g?.icon || "🧰";
}