import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../../components/Page";
import { Card, SmallButton, IconButton } from "../../components/routesUi";
import { formatDate } from "../../lib/sceneHelpers";
import {
  createJournalEntry,
  deleteJournalEntry,
  fetchJournalEntries,
  updateJournalEntry,
} from "../../lib/journalApi";

/* ---------------- helpers ---------------- */

function groupByDay(entries) {
  const map = new Map();
  for (const e of entries) {
    const d = e?.created_at ? new Date(e.created_at) : null;
    const key = d && !Number.isNaN(d.getTime()) ? d.toDateString() : "Unknown date";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return Array.from(map.entries()).map(([dayKey, list]) => ({
    dayKey,
    list: list.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  }));
}

function safePreview(text, max = 160) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max).trim()}…`;
}

/* ---------------- editor ---------------- */

function EntryEditor({ mode, initial, busy, onCancel, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [kind, setKind] = useState(initial?.kind || "reflection");
  const [body, setBody] = useState(initial?.body || "");

  useEffect(() => {
    setTitle(initial?.title || "");
    setKind(initial?.kind || "reflection");
    setBody(initial?.body || "");
  }, [initial?.title, initial?.kind, initial?.body]);

  const canSave = !!title.trim() && !!body.trim() && !busy;

  return (
    <Card>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{mode === "edit" ? "Edit entry" : "New entry"}</div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          disabled={busy}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#f3f3f7",
            padding: "0 12px",
            outline: "none",
            opacity: busy ? 0.7 : 1,
            fontSize: 14,
          }}
        />

        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          disabled={busy}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#f3f3f7",
            padding: "0 12px",
            outline: "none",
            opacity: busy ? 0.7 : 1,
            fontSize: 14,
          }}
        >
          <option value="reflection">Reflection</option>
          <option value="planning">Planning</option>
          <option value="note">Note</option>
        </select>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your entry…"
          disabled={busy}
          style={{
            width: "100%",
            minHeight: 160,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "#f3f3f7",
            padding: "10px 12px",
            outline: "none",
            opacity: busy ? 0.7 : 1,
            fontSize: 14,
            lineHeight: 1.5,
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <SmallButton disabled={busy} onClick={onCancel}>
            Cancel
          </SmallButton>
          <SmallButton
            disabled={!canSave}
            onClick={() => onSave({ title: title.trim(), kind, body: body.trim() })}
            title={!title.trim() ? "Title is required" : !body.trim() ? "Body is required" : "Save"}
          >
            {busy ? "Saving…" : "Save"}
          </SmallButton>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- main ---------------- */

export default function JournalHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState(null); // { mode: "new"|"edit", entry? }
  const [menuOpenForId, setMenuOpenForId] = useState(null);
  const [openEntryId, setOpenEntryId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const list = await fetchJournalEntries();
      setEntries(list || []);
    } catch (e) {
      setErr(e?.message || "Failed to load journal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleEntry(id) {
    setOpenEntryId((cur) => (cur === id ? null : id));
  }

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return entries;
    return (entries || []).filter((e) => {
      const t = `${e?.title || ""} ${e?.body || ""} ${e?.kind || ""}`.toLowerCase();
      return t.includes(q);
    });
  }, [entries, search]);

  const grouped = useMemo(() => groupByDay(filtered || []), [filtered]);

  async function handleSave(payload) {
    setBusy(true);
    setErr("");
    try {
      if (editing?.mode === "edit" && editing?.entry?.id) {
        await updateJournalEntry(editing.entry.id, payload);
      } else {
        await createJournalEntry(payload);
      }
      setEditing(null);
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(entryId) {
    const ok = window.confirm("Delete this entry?");
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await deleteJournalEntry(entryId);
      setMenuOpenForId(null);
      if (openEntryId === entryId) setOpenEntryId(null);
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Page
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SmallButton disabled={busy} onClick={() => setEditing({ mode: "new" })}>
            New entry
          </SmallButton>
          <SmallButton disabled={busy} onClick={load}>
            Refresh
          </SmallButton>
        </div>

        <div style={{ opacity: 0.7, fontWeight: 800 }}>{filtered.length} entries</div>
      </Page>

      <Page>
        <div style={{ display: "grid", gap: 12 }}>
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries…"
              style={{
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "#f3f3f7",
                padding: "0 12px",
                outline: "none",
                fontSize: 14,
              }}
            />
          </Card>

          {editing ? (
            <EntryEditor
              mode={editing.mode}
              initial={editing.mode === "edit" ? editing.entry : null}
              busy={busy}
              onCancel={() => setEditing(null)}
              onSave={handleSave}
            />
          ) : null}

          {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}

          {!loading && !grouped.length ? (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No entries yet.</div>
          ) : null}

          {!loading && grouped.length ? (
            <div style={{ display: "grid", gap: 18 }}>
              {grouped.map((g) => (
                <div key={g.dayKey} style={{ display: "grid", gap: 10 }}>
                  <div style={{ fontWeight: 900, opacity: 0.75 }}>
                    {(() => {
                      try {
                        return new Date(g.dayKey).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        });
                      } catch {
                        return g.dayKey;
                      }
                    })()}
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    {g.list.map((e) => {
                      const created = formatDate(e.created_at);
                      const preview = safePreview(e.body, 180);
                      const isOpen = openEntryId === e.id;

                      const kindLabel = String(e?.kind || "Reflection");
                      const kindPretty = kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1);

                      return (
                        <Card key={e.id} onClick={() => toggleEntry(e.id)} title="Tap to expand/collapse">
                          <div style={{ display: "grid", gap: 10 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                alignItems: "flex-start",
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
                                  {e.title}
                                </div>

                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 900,
                                      padding: "4px 10px",
                                      borderRadius: 999,
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      background: "rgba(255,255,255,0.04)",
                                      opacity: 0.9,
                                    }}
                                  >
                                    {kindPretty}
                                  </div>

                                  {created ? (
                                    <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 800 }}>
                                      {created}
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div style={{ position: "relative", flex: "0 0 auto" }}>
                                <IconButton
                                  title="More"
                                  onClick={(ev) => {
                                    ev?.stopPropagation?.();
                                    setMenuOpenForId((cur) => (cur === e.id ? null : e.id));
                                  }}
                                >
                                  ⋯
                                </IconButton>

                                {menuOpenForId === e.id ? (
                                  <div
                                    onClick={(ev) => ev?.stopPropagation?.()}
                                    style={{
                                      position: "absolute",
                                      right: 0,
                                      top: 34,
                                      zIndex: 20,
                                      width: 180,
                                      borderRadius: 14,
                                      border: "1px solid rgba(255,255,255,0.12)",
                                      background: "rgba(20,20,26,0.98)",
                                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <button
                                      disabled={busy}
                                      onClick={() => {
                                        setMenuOpenForId(null);
                                        setEditing({ mode: "edit", entry: e });
                                      }}
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "10px 12px",
                                        background: "transparent",
                                        border: "none",
                                        color: "#f3f3f7",
                                        cursor: busy ? "default" : "pointer",
                                        fontWeight: 800,
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      disabled={busy}
                                      onClick={() => handleDelete(e.id)}
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                        padding: "10px 12px",
                                        background: "transparent",
                                        border: "none",
                                        color: "#ffb5b5",
                                        cursor: busy ? "default" : "pointer",
                                        fontWeight: 900,
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {(isOpen ? e.body : preview) ? (
                              <div style={{ opacity: 0.88, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                                {isOpen ? e.body : preview}
                              </div>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Page>
    </div>
  );
}