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

function SkeletonEntryCard() {
  return (
    <Card>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ height: 12, width: "40%", borderRadius: 999, background: "rgba(255,255,255,0.07)" }} />
        <div style={{ height: 13, width: "70%", borderRadius: 999, background: "rgba(255,255,255,0.09)" }} />
        <div style={{ height: 10, width: "88%", borderRadius: 999, background: "rgba(255,255,255,0.05)" }} />
        <div style={{ height: 10, width: "76%", borderRadius: 999, background: "rgba(255,255,255,0.05)" }} />
      </div>
    </Card>
  );
}

function EntryEditor({ initial, saving, onCancel, onSave }) {
  const [type, setType] = useState(initial?.entry_type || "reflection");
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");

  useEffect(() => {
    setType(initial?.entry_type || "reflection");
    setTitle(initial?.title || "");
    setBody(initial?.body || "");
  }, [initial?.entry_type, initial?.title, initial?.body]);

  return (
    <Card>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Type</div>
            <Select value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
              {ENTRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
          />
        </div>

        <TextArea
          placeholder="Write here…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={saving}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <SmallButton onClick={onCancel} disabled={saving}>
            Cancel
          </SmallButton>
          <SmallButton
            onClick={() => onSave({ entry_type: type, title, body })}
            disabled={saving || !String(body || "").trim()}
          >
            {saving ? "Saving…" : "Save"}
          </SmallButton>
        </div>
      </div>
    </Card>
  );
}

function KebabMenu({ open, onEdit, onDelete }) {
  const boxStyle = {
    position: "absolute",
    right: 10,
    top: 36,
    minWidth: 170,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(24,24,28,0.98)",
    backdropFilter: "blur(10px)",
    overflow: "hidden",
    zIndex: 50,
  };

  if (!open) return null;

  return (
    <div style={boxStyle} role="menu">
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
          fontWeight: 850,
        }}
      >
        Edit
      </button>
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

export default function JournalHome({ supabase, session }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session?.user?.id;

  const cachedForUser = userId ? journalHomeCache.entriesByUserId?.[userId] : null;
  const hasCache = !!(userId && Array.isArray(cachedForUser));

  const [loading, setLoading] = useState(() => !hasCache);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [entries, setEntries] = useState(() => (Array.isArray(cachedForUser) ? cachedForUser : []));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const handledEditStateRef = useRef(false);

  const [openEntryId, setOpenEntryId] = useState(null);
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const menuBoxRef = useRef(null);

  const showInitialSkeleton = loading && !hasCache && entries.length === 0;

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

      const found = (list || []).find((e) => e.id === editId);
      if (!found) return;

      setEditing(found);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state?.editId]);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpenForId) return;
      if (menuBoxRef.current && menuBoxRef.current.contains(e.target)) return;
      setMenuOpenForId(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpenForId]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return entries;

    return (entries || []).filter((e) => {
      const hay = `${e.title || ""}\n${e.body || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entries, search]);

  const grouped = useMemo(() => {
    const byDay = new Map();
    for (const e of filtered || []) {
      const ts = e.updated_at || e.created_at || new Date().toISOString();
      const k = dayKeyFromTs(ts);
      const arr = byDay.get(k) || [];
      arr.push(e);
      byDay.set(k, arr);
    }

    return Array.from(byDay.entries())
      .map(([dayKey, items]) => {
        const ts = Number(dayKey);
        const label = dayHeadingLabel(ts);
        const sorted = (items || [])
          .slice()
          .sort(
            (a, b) =>
              new Date(b.updated_at || b.created_at).getTime() -
              new Date(a.updated_at || a.created_at).getTime()
          );

        return { dayKey, label, items: sorted };
      })
      .sort((a, b) => Number(b.dayKey) - Number(a.dayKey));
  }, [filtered]);

  function handleCardToggle(entryId) {
    setOpenEntryId((prev) => (prev === entryId ? null : entryId));
    setMenuOpenForId(null);
  }

  async function handleSave(payload) {
    if (!userId) return;
    setSaving(true);
    setErr("");

    try {
      if (editing?.id) {
        const updated = await updateJournalEntry({
          supabase,
          userId,
          id: editing.id,
          ...payload,
        });
        const next = (entries || []).map((e) => (e.id === editing.id ? updated : e));
        setEntries(next);
        persistCache(next);
        showToast("Updated.");
      } else {
        const created = await createJournalEntry({
          supabase,
          userId,
          ...payload,
        });
        const next = [created, ...(entries || [])];
        setEntries(next);
        persistCache(next);
        showToast("Saved.");
      }

      setEditing(null);
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!userId) return;
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    setSaving(true);
    setErr("");

    try {
      await deleteJournalEntry({ supabase, userId, id });
      const next = (entries || []).filter((e) => e.id !== id);
      setEntries(next);
      persistCache(next);

      setMenuOpenForId(null);
      if (openEntryId === id) setOpenEntryId(null);

      showToast("Deleted.");
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <SmallButton onClick={() => setEditing({ mode: "new" })} disabled={saving}>
              New entry
            </SmallButton>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading ? "Loading…" : `${entries.length} entries`}
          </div>
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

        <div style={{ display: "grid", gap: 14 }}>
          {showInitialSkeleton ? (
            <>
              <SkeletonEntryCard />
              <SkeletonEntryCard />
              <SkeletonEntryCard />
            </>
          ) : null}

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

                  const body = String(e.body || "");
                  const hasBody = !!body.trim();

                  const preview =
                    hasBody && body.length > 180 ? `${body.slice(0, 180)}…` : hasBody ? body : "";

                  const isOpen = openEntryId === e.id;
                  const menuOpen = menuOpenForId === e.id;

                  // Key change: ONE text block only (no divider added), so opening doesn't "shift"
                  const textToShow = isOpen ? body : preview;

                  return (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleCardToggle(e.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") handleCardToggle(e.id);
                      }}
                      style={{ position: "relative" }}
                    >
                      <Card>
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ display: "grid", gap: 6, paddingRight: 26 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <Chip>{typeLabel}</Chip>
                              <div style={{ fontWeight: 900 }}>{title}</div>
                            </div>

                            {textToShow ? (
                              <div
                                style={{
                                  opacity: 0.9,
                                  lineHeight: 1.45,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {textToShow}
                              </div>
                            ) : null}
                          </div>

                          {/* Kebab: always top-right, no circle, no layout effect */}
                          <button
                            type="button"
                            aria-label="More"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setMenuOpenForId((prev) => (prev === e.id ? null : e.id));
                            }}
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              border: "none",
                              background: "transparent",
                              color: "rgba(243,243,247,0.85)",
                              cursor: "pointer",
                              fontSize: 18,
                              lineHeight: "18px",
                              padding: 6,
                            }}
                          >
                            ⋯
                          </button>

                          <div ref={menuBoxRef}>
                            <KebabMenu
                              open={menuOpen}
                              onEdit={() => {
                                setMenuOpenForId(null);
                                setEditing(e);
                                setOpenEntryId(null);
                              }}
                              onDelete={() => handleDelete(e.id)}
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Page>
    </div>
  );
}
