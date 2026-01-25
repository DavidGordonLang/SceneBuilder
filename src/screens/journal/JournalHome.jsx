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

          <TextArea
            placeholder="Write your entry…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
}

export default function JournalHome({ supabase, session }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const handledEditStateRef = useRef(false);

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
  }, [userId]);

  useEffect(() => {
    const editId = location?.state?.editId;
    if (!editId || handledEditStateRef.current) return;
    handledEditStateRef.current = true;

    (async () => {
      if (!entries.length) await load();
      const found = entries.find((e) => e.id === editId);
      setEditing(found || { mode: "new" });
      navigate("/journal", { replace: true, state: {} });
    })();
  }, [location?.state]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.body?.toLowerCase().includes(q) ||
        e.entry_type?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  async function handleSave(payload) {
    if (!userId) return;
    setSaving(true);
    try {
      if (editing?.id) {
        await updateJournalEntry({ supabase, id: editing.id, patch: payload });
        showToast?.("Saved");
      } else {
        await createJournalEntry({ supabase, userId, entry: payload });
        showToast?.("Created");
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
    if (!window.confirm("Delete this entry?")) return;
    await deleteJournalEntry({ supabase, id });
    showToast?.("Deleted");
    await load();
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Contextual actions row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <SmallButton onClick={() => setEditing({ mode: "new" })}>New entry</SmallButton>
            <SmallButton onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading ? "Loading…" : `${entries.length} entries`}
          </div>
        </div>

        <Card>
          <Input
            placeholder="Search entries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Card>

        {editing && (
          <EntryEditor
            initial={editing?.id ? editing : { entry_type: "reflection", title: "", body: "" }}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((e) => (
            <Card key={e.id} onClick={() => navigate(`/journal/${e.id}`)} style={{ cursor: "pointer" }}>
              <div style={{ fontWeight: 900 }}>{e.title || "Untitled"}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label} • {formatDate(e.created_at)}
              </div>
            </Card>
          ))}
        </div>
      </Page>
    </div>
  );
}
