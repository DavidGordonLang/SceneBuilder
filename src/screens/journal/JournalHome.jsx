import React, { useEffect, useMemo, useState } from "react";
import { TopBar, SmallButton, Chip, Card } from "../../components/routesUi";
import Page from "../../components/Page";
import { useToast } from "../../ui/ToastContext.jsx";
import {
  createJournalEntry,
  deleteJournalEntry,
  fetchJournalEntries,
  updateJournalEntry,
} from "../../lib/journalApi";

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
            <Chip>
              {ENTRY_TYPES.find((t) => t.value === entryType)?.label || entryType}
            </Chip>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <SmallButton disabled={saving} onClick={onCancel} title="Close editor">
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
              title="Save entry"
            >
              {saving ? "Saving…" : "Save"}
            </SmallButton>
          </div>
        </div>

        <Divider />

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Entry type</div>
            <Select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
              {ENTRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>

            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Title</div>
            <Input
              type="text"
              placeholder="Optional title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Linked scene</div>
            <Input
              type="text"
              placeholder="Scene ID (optional for now)"
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Write</div>
            <TextArea
              placeholder="Write your entry…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.35 }}>
              Entries are private and tied to your account. Scene linking will become a proper picker later.
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function JournalHome({ supabase, session }) {
  const { showToast } = useToast();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | entry object | { mode: 'new' }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function load() {
    if (!userId) return;

    setLoading(true);
    setErr("");
    try {
      const data = await fetchJournalEntries({ supabase, userId, limit: 80 });
      setEntries(data);
    } catch (e) {
      setErr(e?.message || "Failed to load journal entries.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return entries;

    return (entries || []).filter((e) => {
      const t = (e.title || "").toLowerCase();
      const b = (e.body || "").toLowerCase();
      const ty = (e.entry_type || "").toLowerCase();
      return t.includes(q) || b.includes(q) || ty.includes(q);
    });
  }, [entries, search]);

  async function handleSave(payload) {
    if (!userId) return;

    setSaving(true);
    setErr("");

    try {
      if (editing?.id) {
        await updateJournalEntry({ supabase, id: editing.id, patch: payload });
        showToast("Saved");
      } else {
        await createJournalEntry({ supabase, userId, entry: payload });
        showToast("Created");
      }

      setEditing(null);
      await load();
    } catch (e) {
      setErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    setErr("");
    try {
      await deleteJournalEntry({ supabase, id });
      showToast("Deleted");
      await load();
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    }
  }

  return (
    <div>
      <TopBar
        title="Journal"
        onSignOut={signOut}
        rightSlot={
          <>
            <SmallButton onClick={() => setEditing({ mode: "new" })} disabled={saving} title="New entry">
              New entry
            </SmallButton>
            <SmallButton onClick={load} disabled={loading || saving} title="Refresh">
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </>
        }
      />

      <Page style={{ display: "grid", gap: 14 }}>
        <Card>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Search</div>
            <Input
              type="text"
              placeholder="Search entries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {err ? (
              <div
                style={{
                  marginTop: 2,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,80,80,0.30)",
                  background: "rgba(255,80,80,0.08)",
                  lineHeight: 1.4,
                  fontSize: 13,
                }}
              >
                {err}
              </div>
            ) : null}
          </div>
        </Card>

        {editing ? (
          <EntryEditor
            initial={editing?.id ? editing : { entry_type: "reflection", title: "", body: "", scene_id: "" }}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        ) : null}

        <div style={{ display: "grid", gap: 12 }}>
          {(filtered || []).map((e) => {
            const typeLabel = ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label || e.entry_type;
            const title = e.title?.trim() ? e.title : "Untitled";
            const preview = e.body ? (e.body.length > 240 ? `${e.body.slice(0, 240)}…` : e.body) : "";

            return (
              <Card key={e.id}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
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
                      <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Chip>{typeLabel}</Chip>
                        <span style={{ fontSize: 12, opacity: 0.65 }}>{formatDate(e.created_at)}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <SmallButton onClick={() => setEditing(e)} disabled={saving} title="Edit entry">
                        Edit
                      </SmallButton>
                      <SmallButton
                        tone="danger"
                        onClick={() => handleDelete(e.id)}
                        disabled={saving}
                        title="Delete entry"
                      >
                        Delete
                      </SmallButton>
                    </div>
                  </div>

                  {preview ? (
                    <div style={{ opacity: 0.88, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{preview}</div>
                  ) : null}

                  {e.scene_id ? (
                    <div style={{ fontSize: 12, opacity: 0.65 }}>Linked scene: {e.scene_id}</div>
                  ) : null}
                </div>
              </Card>
            );
          })}

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
        </div>

        <div style={{ height: 24 }} />
      </Page>
    </div>
  );
}
