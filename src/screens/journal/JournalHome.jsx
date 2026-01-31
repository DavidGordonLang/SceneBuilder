import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SmallButton, Chip, Card } from "../../components/routesUi";
import Page from "../../components/Page";
import { useToast } from "../../ui/ToastContext.jsx";
import {
  createJournalEntry,
  deleteJournalEntry,
  fetchJournalEntries,
  updateJournalEntry,
} from "../../lib/journalApi";

/* ---------------- module cache to reduce jank ----------------
   Keeps the last loaded entries across unmount/remount (tab switches).
   Enables silent refresh without flipping the screen into Loading…
*/
let journalHomeCache = {
  entriesByUserId: {}, // { [userId]: entries[] }
  tsByUserId: {}, // { [userId]: number }
};

const ENTRY_TYPES = [
  { value: "reflection", label: "Reflection" },
  { value: "planning", label: "Planning" },
  { value: "aftercare", label: "Aftercare" },
  { value: "note", label: "Note" },
];

function formatDate(ts) {
  try {
    const d = new Date(ts);
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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayKeyFromTs(ts) {
  const d = new Date(ts);
  const sod = startOfDay(d);
  return String(sod.getTime());
}

function dayHeadingLabel(ts) {
  try {
    const d = new Date(ts);
    const sod = startOfDay(d);
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (sod.getTime() === today.getTime()) return "Today";
    if (sod.getTime() === yesterday.getTime()) return "Yesterday";

    return sod.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
      }}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
        appearance: "none",
      }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
        lineHeight: 1.5,
        resize: "vertical",
        minHeight: 170,
      }}
    />
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "10px 0" }} />;
}

function EntryEditor({ initial, onCancel, onSave, saving }) {
  const [entryType, setEntryType] = useState(initial?.entry_type || "reflection");
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [sceneId, setSceneId] = useState(initial?.scene_id || "");

  const canSave = !!body.trim();

  return (
    <Card>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
              {initial?.id ? "Edit entry" : "New entry"}
            </div>
            <Chip>{ENTRY_TYPES.find((t) => t.value === entryType)?.label || entryType}</Chip>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <SmallButton disabled={saving} onClick={onCancel}>
              Close
            </SmallButton>
            <SmallButton
              disabled={saving || !canSave}
              onClick={() =>
                onSave({
                  entry_type: entryType,
                  title,
                  body,
                  scene_id: sceneId.trim() ? sceneId.trim() : null,
                })
              }
            >
              {saving ? "Saving…" : "Save"}
            </SmallButton>
          </div>
        </div>

        <Divider />

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Entry type</div>
            <Select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
              {ENTRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>

            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Title</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title" />

            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Linked scene</div>
            <Input
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              placeholder="Scene ID (optional for now)"
            />
          </div>

          <TextArea placeholder="Write your entry…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </div>
    </Card>
  );
}

function KebabButton({ onClick, title = "More actions" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        border: "none",
        background: "transparent",
        color: "rgba(243,243,247,0.85)",
        cursor: "pointer",
        padding: 6,
        margin: -6,
        lineHeight: 1,
        fontSize: 20,
        fontWeight: 900,
      }}
    >
      ⋯
    </button>
  );
}

function KebabMenu({ onEdit, onDelete }) {
  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: 40,
        right: 10,
        zIndex: 50,
        minWidth: 160,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(10,10,12,0.96)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onEdit}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          border: "none",
          background: "transparent",
          color: "#f3f3f7",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 750,
        }}
      >
        Edit
      </button>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          border: "none",
          background: "transparent",
          color: "#ffb4b4",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 850,
        }}
      >
        Delete
      </button>
    </div>
  );
}

function toggleInSet(prevSet, id) {
  const next = new Set(prevSet);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function JournalHome({ supabase, session }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session?.user?.id;

  const cachedForUser = userId ? journalHomeCache.entriesByUserId?.[userId] : null;

  const [loading, setLoading] = useState(() => !(userId && Array.isArray(cachedForUser)));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [entries, setEntries] = useState(() => (Array.isArray(cachedForUser) ? cachedForUser : []));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const handledEditStateRef = useRef(false);

  // Expanded cards (Scenes-style)
  const [openEntryIds, setOpenEntryIds] = useState(() => new Set());

  // Kebab state
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const menuRootRef = useRef(null);

  function persistCache(nextEntries) {
    if (!userId) return;
    journalHomeCache.entriesByUserId[userId] = Array.isArray(nextEntries) ? nextEntries : [];
    journalHomeCache.tsByUserId[userId] = Date.now();
  }

  async function load(opts = {}) {
    if (!userId) return;
    const silent = !!opts.silent;

    const hasExisting = Array.isArray(entries) && entries.length > 0;
    if (!silent || !hasExisting) setLoading(true);

    setErr("");
    try {
      const data = await fetchJournalEntries({ supabase, userId, limit: 80 });
      const next = Array.isArray(data) ? data : [];
      setEntries(next);
      persistCache(next);
    } catch (e) {
      setErr(e?.message || "Failed to load journal entries.");
      setEntries([]);
      persistCache([]);
    } finally {
      if (!silent || !hasExisting) setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;

    // Seed from cache on user change, then refresh silently.
    const cached = journalHomeCache.entriesByUserId?.[userId];
    if (Array.isArray(cached)) {
      setEntries(cached);
      setLoading(false);
      load({ silent: true });
    } else {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Handle "return from entry view -> open editor" flow (kept for backward compatibility).
  useEffect(() => {
    const editId = location?.state?.editId;
    if (!editId || handledEditStateRef.current) return;

    handledEditStateRef.current = true;

    (async () => {
      let list = entries;
      if (!list || list.length === 0) {
        await load();
        list = entries;
      }

      let found = (list || []).find((e) => e.id === editId);

      if (!found) {
        try {
          const fresh = await fetchJournalEntries({ supabase, userId, limit: 200 });
          found = (fresh || []).find((e) => e.id === editId) || null;
          if (Array.isArray(fresh) && fresh.length) {
            setEntries(fresh);
            persistCache(fresh);
          }
        } catch {
          // ignore
        }
      }

      setEditing(found || { mode: "new" });
      navigate("/journal", { replace: true, state: {} });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state]);

  // Close kebab on outside click / escape
  useEffect(() => {
    if (!menuOpenForId) return;

    function onDocDown(e) {
      if (menuRootRef.current && menuRootRef.current.contains(e.target)) return;
      setMenuOpenForId(null);
    }

    function onKey(e) {
      if (e.key === "Escape") setMenuOpenForId(null);
    }

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenForId]);

  const sorted = useMemo(() => {
    const list = Array.isArray(entries) ? entries : [];
    return [...list].sort((a, b) => {
      const ta = new Date(a?.created_at || 0).getTime();
      const tb = new Date(b?.created_at || 0).getTime();
      return tb - ta;
    });
  }, [entries]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter((e) => {
      const t = (e.title || "").toLowerCase();
      const b = (e.body || "").toLowerCase();
      const ty = (e.entry_type || "").toLowerCase();
      return t.includes(q) || b.includes(q) || ty.includes(q);
    });
  }, [sorted, search]);

  const grouped = useMemo(() => {
    const buckets = new Map(); // dayKey -> { label, items }
    for (const e of filtered) {
      const ts = e?.created_at;
      if (!ts) continue;
      const key = dayKeyFromTs(ts);
      if (!buckets.has(key)) {
        buckets.set(key, { label: dayHeadingLabel(ts), items: [] });
      }
      buckets.get(key).items.push(e);
    }

    const keys = Array.from(buckets.keys()).sort((a, b) => Number(b) - Number(a));
    return keys.map((k) => ({ dayKey: k, label: buckets.get(k).label, items: buckets.get(k).items }));
  }, [filtered]);

  async function handleSave(payload) {
    if (!userId) return;
    setSaving(true);
    setErr("");
    try {
      if (editing?.id) {
        await updateJournalEntry({ supabase, id: editing.id, patch: payload });
        showToast?.("Saved");
      } else {
        await createJournalEntry({ supabase, userId, entry: payload });
        showToast?.("Created");
      }
      setEditing(null);
      await load({ silent: true });
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;

    setErr("");
    try {
      await deleteJournalEntry({ supabase, id });
      showToast?.("Deleted");

      // Close if it was open
      setOpenEntryIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      await load({ silent: true });
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    }
  }

  function toggleMenu(id) {
    setMenuOpenForId((cur) => (cur === id ? null : id));
  }

  function handleMenuEdit(entry) {
    setMenuOpenForId(null);
    setEditing(entry);
  }

  async function handleMenuDelete(entry) {
    setMenuOpenForId(null);
    await handleDelete(entry.id);
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Contextual actions row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <SmallButton
              onClick={() => {
                setEditing({ mode: "new" });
              }}
              disabled={saving}
            >
              New entry
            </SmallButton>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{loading ? "Loading…" : `${entries.length} entries`}</div>
        </div>

        {err ? (
          <Card>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,80,80,0.30)",
                background: "rgba(255,80,80,0.08)",
                lineHeight: 1.4,
                fontSize: 13,
              }}
            >
              {err}
            </div>
          </Card>
        ) : null}

        <Card>
          <Input placeholder="Search entries…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Card>

        {editing ? (
          <EntryEditor
            initial={editing?.id ? editing : { entry_type: "reflection", title: "", body: "" }}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        ) : null}

        {/* Timeline */}
        <div style={{ display: "grid", gap: 14 }}>
          {!loading && filtered.length === 0 ? (
            <Card>
              <div style={{ opacity: 0.85, lineHeight: 1.4 }}>
                No entries yet.
                <div style={{ marginTop: 10 }}>
                  <SmallButton onClick={() => setEditing({ mode: "new" })}>Create your first entry</SmallButton>
                </div>
              </div>
            </Card>
          ) : null}

          {grouped.map((group) => (
            <div key={group.dayKey} style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  padding: "4px 2px",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.2,
                  opacity: 0.75,
                }}
              >
                {group.label}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {group.items.map((e) => {
                  const typeLabel =
                    ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label || e.entry_type || "Entry";
                  const title = e.title?.trim() ? e.title : "Untitled";

                  const preview =
                    e.body && e.body.trim() ? (e.body.length > 180 ? `${e.body.slice(0, 180)}…` : e.body) : "";

                  const isOpen = openEntryIds.has(e.id);
                  const menuOpen = menuOpenForId === e.id;

                  return (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setOpenEntryIds((prev) => toggleInSet(prev, e.id));
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          setOpenEntryIds((prev) => toggleInSet(prev, e.id));
                        }
                      }}
                      style={{ cursor: "pointer", position: "relative" }}
                      title={isOpen ? "Collapse entry" : "Expand entry"}
                      ref={menuOpen ? menuRootRef : null}
                    >
                      <Card>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 900,
                                  letterSpacing: 0.2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {title}
                              </div>

                              <div
                                style={{
                                  marginTop: 4,
                                  display: "flex",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                }}
                              >
                                <Chip>{typeLabel}</Chip>
                                <span style={{ fontSize: 12, opacity: 0.65 }}>{formatDate(e.created_at)}</span>
                                <span style={{ fontSize: 12, opacity: 0.65 }}>{isOpen ? "▾" : "▸"}</span>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div onClick={(ev) => ev.stopPropagation()}>
                                <KebabButton onClick={() => toggleMenu(e.id)} title="Entry actions" />
                              </div>
                            </div>
                          </div>

                          {menuOpen ? (
                            <KebabMenu onEdit={() => handleMenuEdit(e)} onDelete={() => handleMenuDelete(e)} />
                          ) : null}

                          {isOpen ? (
                            <div style={{ display: "grid", gap: 10 }} onClick={(ev) => ev.stopPropagation()}>
                              {e.body ? (
                                <div style={{ opacity: 0.92, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                                  {e.body}
                                </div>
                              ) : (
                                <div style={{ opacity: 0.7, fontSize: 13 }}>No text.</div>
                              )}

                              {e.scene_id ? (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>Linked scene: {e.scene_id}</div>
                              ) : null}

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <SmallButton
                                  disabled={saving}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setEditing(e);
                                  }}
                                  title="Edit entry"
                                >
                                  Edit
                                </SmallButton>

                                <SmallButton
                                  tone="danger"
                                  disabled={saving}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDelete(e.id);
                                  }}
                                  title="Delete entry"
                                >
                                  Delete
                                </SmallButton>
                              </div>
                            </div>
                          ) : preview ? (
                            <div style={{ opacity: 0.88, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{preview}</div>
                          ) : null}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 24 }} />
      </Page>
    </div>
  );
}