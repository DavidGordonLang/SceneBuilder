import React, { useEffect, useMemo, useState } from "react";
import { TopBar } from "../../components/routesUi";
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

function EntryEditor({ initial, onCancel, onSave, saving }) {
  const [entryType, setEntryType] = useState(initial?.entry_type || "reflection");
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [sceneId, setSceneId] = useState(initial?.scene_id || "");

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={entryType} onChange={(e) => setEntryType(e.target.value)}>
          {ENTRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: "1 1 220px" }}
        />
      </div>

      <textarea
        rows={6}
        placeholder="Write your entry…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ marginTop: 10 }}
      />

      <input
        type="text"
        placeholder="Scene ID (optional for now)"
        value={sceneId}
        onChange={(e) => setSceneId(e.target.value)}
        style={{ marginTop: 10 }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button
          disabled={saving || !body.trim()}
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
        </button>

        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        Entries are private and tied to your account. Scene linking will become a proper picker later.
      </div>
    </div>
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
      <TopBar title="Journal" onSignOut={signOut} />

      <div style={{ padding: 16 }}>
        <div className="card">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search entries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 220px" }}
            />
            <button onClick={() => setEditing({ mode: "new" })}>New entry</button>
            <button onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {err ? <div style={{ marginTop: 10, color: "crimson" }}>{err}</div> : null}
        </div>

        {editing ? (
          <EntryEditor
            initial={editing?.id ? editing : { entry_type: "reflection", title: "", body: "", scene_id: "" }}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        ) : null}

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {(filtered || []).map((e) => (
            <div className="card" key={e.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 650 }}>
                  {e.title?.trim() ? e.title : "(Untitled)"}{" "}
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    • {ENTRY_TYPES.find((t) => t.value === e.entry_type)?.label || e.entry_type}
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{formatDate(e.created_at)}</div>
              </div>

              {e.body ? (
                <div style={{ marginTop: 8, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                  {e.body.length > 240 ? `${e.body.slice(0, 240)}…` : e.body}
                </div>
              ) : null}

              {e.scene_id ? (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.65 }}>
                  Linked scene: {e.scene_id}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button onClick={() => setEditing(e)}>Edit</button>
                <button onClick={() => handleDelete(e.id)}>Delete</button>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 ? (
            <div className="card" style={{ opacity: 0.8 }}>
              No entries yet. Create your first one.
            </div>
          ) : null}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
