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
import { getCachedJournal, setCachedJournal } from "../../lib/appDataCache";

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
    top: 42,
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

  const cached = userId ? getCachedJournal(userId) : null;
  const hasCache = Array.isArray(cached);

  const [entries, setEntries] = useState(() => (hasCache ? cached : null)); // null = unknown
  const [loading, setLoading] = useState(() => Boolean(userId) && !hasCache);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const handledEditStateRef = useRef(false);

  const [openEntryId, setOpenEntryId] = useState(null);
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const menuBoxRef = useRef(null);

  const entriesArr = Array.isArray(entries) ? entries : [];
  const showInitialSkeleton = loading && entries === null;

  async function load(opts = {}) {
    if (!userId) return;

    const silentRequested = !!opts.silent;
    const hasExisting = entriesArr.length > 0;
    const silent = silentRequested && hasExisting;

    if (!silent) setLoading(true);

    setErr("");
    try {
      const data = await fetchJournalEntries({ supabase, userId, limit: 80 });
      const next = Array.isArray(data) ? data : [];
      setEntries(next);
      setCachedJournal(userId, next);
    } catch (e) {
      setErr(e?.message || "Failed to load journal entries.");
      if (entries === null) {
        setEntries([]);
        setCachedJournal(userId, []);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;

    const persisted = getCachedJournal(userId);
    if (Array.isArray(persisted)) {
      setEntries(persisted);
      setLoading(false);
      load({ silent: true });
    } else {
      setEntries(null);
      load({ silent: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const editId = location?.state?.editId;
    if (!editId || handledEditStateRef.current) return;

    handledEditStateRef.current = true;

    (async () => {
      let list = entriesArr;
      if (!list || list.length === 0) {
        await load({ silent: false });
        list = entriesArr;
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
    if (!q) return entriesArr;

    return (entriesArr || []).filter((e) => {
      const hay = `${e.title || ""}\n${e.body || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entriesArr, search]);

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
        const next = (entriesArr || []).map((e) => (e.id === editing.id ? updated : e));
        setEntries(next);
        setCachedJournal(userId, next);
        showToast("Updated.");
      } else {
        const created = await createJournalEntry({
          supabase,
          userId,
          ...payload,
        });
        const next = [created, ...(entriesArr || [])];
        setEntries(next);
        setCachedJournal(userId, next);
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
      const next = (entriesArr || []).filter((e) => e.id !== id);
      setEntries(next);
      setCachedJournal(userId, next);

      setMenuOpenForId(null);
      if (openEntryId === id) setOpenEntryId(null);

      showToast("Deleted.");
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  const isKnownEmpty = entries !== null && !loading && filtered.length === 0;

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
            {loading ? "Loading…" : `${entriesArr.length} entries`}
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

          {isKnownEmpty ? (
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
              <div style={{ padding: "4px 2px", fontSize: 12, fontWeight: 900, letterSpacing: 0.2, opacity: 0.75 }}>
                {group.label}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {group.items.map((e) => {
                  const typeLabel =
                    ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label || e.entry_type || "Entry";
                  const title = e.title?.trim() ? e.title : "Untitled";

                  const preview =
                    e.body && e.body.trim()
                      ? e.body.length > 160
                        ? `${e.body.slice(0, 160)}…`
                        : e.body
                      : "";

                  const isOpen = openEntryId === e.id;
                  const menuOpen = menuOpenForId === e.id;

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
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                            <div style={{ display: "grid", gap: 6 }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <Chip>{typeLabel}</Chip>
                                <div style={{ fontWeight: 900 }}>{title}</div>
                              </div>
                              {!isOpen && preview ? <div style={{ opacity: 0.8, lineHeight: 1.35 }}>{preview}</div> : null}
                            </div>

                            <button
                              type="button"
                              aria-label="More"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setMenuOpenForId((prev) => (prev === e.id ? null : e.id));
                              }}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                border: "1px solid rgba(255,255,255,0.12)",
                                background: "rgba(255,255,255,0.04)",
                                color: "#f3f3f7",
                                cursor: "pointer",
                                fontSize: 18,
                                lineHeight: "34px",
                                textAlign: "center",
                                padding: 0,
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

                          {isOpen ? (
                            <div
                              style={{
                                paddingTop: 10,
                                borderTop: "1px solid rgba(255,255,255,0.08)",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.45,
                                opacity: 0.92,
                              }}
                            >
                              {e.body || ""}
                            </div>
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
      </Page>
    </div>
  );
}
