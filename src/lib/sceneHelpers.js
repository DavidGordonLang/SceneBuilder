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
  const g = tu?.tools_global;
  return g?.name || tu?.custom_name || "Untitled tool";
}

export function pickToolIcon(tu) {
  const g = tu?.tools_global;
  return g?.icon || tu?.custom_icon || "🧰";
}
