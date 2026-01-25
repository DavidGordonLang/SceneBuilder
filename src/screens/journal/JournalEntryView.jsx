import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SmallButton, Chip, Card } from "../../components/routesUi";
import Page from "../../components/Page";
import { useToast } from "../../ui/ToastContext.jsx";
import { deleteJournalEntry, fetchJournalEntries } from "../../lib/journalApi";

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

export default function JournalEntryView({ supabase, session }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { id } = useParams();

  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [entry, setEntry] = useState(null);
  const [busy, setBusy] = useState(false);

  const typeLabel = useMemo(() => {
    const v = entry?.entry_type;
    return ENTRY_TYPES.find((t) => t.value === v)?.label || v || "Entry";
  }, [entry?.entry_type]);

  async function load() {
    if (!userId || !id) return;

    setLoading(true);
    setErr("");

    try {
      // journalApi currently supports fetching a list; to keep schema stable,
      // we fetch a small set and locate the entry by id.
      // Later we can add a dedicated fetch-by-id helper if you want.
      const data = await fetchJournalEntries({ supabase, userId, limit: 200 });
      const found = (data || []).find((e) => e.id === id);
      if (!found) {
        setEntry(null);
        setErr("Entry not found.");
      } else {
        setEntry(found);
      }
    } catch (e) {
      setErr(e?.message || "Failed to load entry.");
      setEntry(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, id]);

  async function handleDelete() {
    if (!entry?.id) return;
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setErr("");

    try {
      await deleteJournalEntry({ supabase, id: entry.id });
      showToast?.("Deleted");
      navigate("/journal");
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Contextual actions row (sub-route: back + actions; no sign out; no title row) */}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <SmallButton onClick={() => navigate("/journal")} disabled={busy}>
              ← Back
            </SmallButton>

            {entry ? (
              <>
                <SmallButton
                  onClick={() => navigate("/journal", { state: { editId: entry.id } })}
                  disabled={busy}
                  title="Edit entry"
                >
                  Edit
                </SmallButton>
                <SmallButton tone="danger" onClick={handleDelete} disabled={busy} title="Delete entry">
                  Delete
                </SmallButton>
              </>
            ) : null}
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading ? "Loading…" : entry ? typeLabel : "Journal"}
          </div>
        </div>

        {loading ? <div style={{ opacity: 0.8 }}>Loading…</div> : null}

        {err ? (
          <Card>
            <div
              style={{
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
          </Card>
        ) : null}

        {!loading && entry ? (
          <Card>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      letterSpacing: 0.2,
                      fontSize: 18,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {entry.title?.trim() ? entry.title : "Untitled"}
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Chip>{typeLabel}</Chip>
                    <span style={{ fontSize: 12, opacity: 0.65 }}>{formatDate(entry.created_at)}</span>
                  </div>
                </div>
              </div>

              {entry.scene_id ? (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Linked scene: <span style={{ opacity: 0.9 }}>{entry.scene_id}</span>
                </div>
              ) : null}

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, opacity: 0.92 }}>
                {entry.body || ""}
              </div>
            </div>
          </Card>
        ) : null}

        <div style={{ height: 24 }} />
      </Page>
    </div>
  );
}
