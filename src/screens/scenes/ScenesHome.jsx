import React, { useEffect, useState } from "react";
import { Card, Chip, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import { fetchSceneById, fetchScenes } from "../../lib/scenesApi";
import {
  formatDate,
  pickParticipantLabel,
  pickToolIcon,
  pickToolLabel,
} from "../../lib/sceneHelpers";
import { useNavigate } from "react-router-dom";

// multiple-open helper (Set-based)
function toggleInSet(prevSet, id) {
  const next = new Set(prevSet);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function parseHashSections(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { title: "Plan", bodyLines: [] };
  let sawHeading = false;

  for (const line of lines) {
    const m = line.match(/^\s*#\s+(.*)\s*$/);
    if (m) {
      sawHeading = true;
      // push previous
      if (current && (current.bodyLines.length || current.title)) {
        sections.push({
          title: current.title || "Section",
          body: current.bodyLines.join("\n").trim(),
        });
      }
      current = { title: m[1].trim() || "Section", bodyLines: [] };
    } else {
      current.bodyLines.push(line);
    }
  }

  if (current) {
    sections.push({
      title: current.title || "Section",
      body: current.bodyLines.join("\n").trim(),
    });
  }

  // If the user never used headings, keep a single "Plan" section.
  if (!sawHeading) {
    return [
      {
        title: "Plan",
        body: text,
      },
    ];
  }

  // Remove empty sections (e.g., headings with nothing under them)
  return sections.filter((s) => (s.title && s.title.trim()) || (s.body && s.body.trim()));
}

export default function ScenesHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // delete / mutations
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

  // Multiple scenes can be expanded at once
  const [openScenes, setOpenScenes] = useState(() => new Set());

  // Cache full scene details once expanded (lazy-load)
  // shape: { [sceneId]: { status: 'idle'|'loading'|'ready'|'error', data?: any, error?: string } }
  const [details, setDetails] = useState({});

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchScenes();
      setScenes(data || []);
    } catch (e) {
      setErr(e?.message || "Failed to load scenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await reload();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureDetails(sceneId) {
    const existing = details?.[sceneId];
    if (existing?.status === "loading" || existing?.status === "ready") return;

    setDetails((prev) => ({
      ...prev,
      [sceneId]: { status: "loading" },
    }));

    try {
      const full = await fetchSceneById(sceneId);
      setDetails((prev) => ({
        ...prev,
        [sceneId]: { status: "ready", data: full },
      }));
    } catch (e) {
      setDetails((prev) => ({
        ...prev,
        [sceneId]: { status: "error", error: e?.message || "Failed to load scene details." },
      }));
    }
  }

  async function deleteScene(sceneId, title) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      // delete join rows first, then delete the scene
      const { supabase } = await import("../../lib/supabaseClient.js").then((m) => m);

      {
        const { error } = await supabase.from("scene_participants").delete().eq("scene_id", sceneId);
        if (error) throw error;
      }
      {
        const { error } = await supabase.from("scene_tools").delete().eq("scene_id", sceneId);
        if (error) throw error;
      }
      {
        const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
        if (error) throw error;
      }

      // Close it if it was open
      setOpenScenes((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });

      // Drop cached details for deleted scene
      setDetails((prev) => {
        const next = { ...prev };
        delete next[sceneId];
        return next;
      });

      await reload();
    } catch (e) {
      setErr(e?.message || "Could not delete scene.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 12 }}>
        {/* Contextual actions row (no page title) */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <SmallButton asLink to="/scenes/new">
              + New scene
            </SmallButton>
            <SmallButton onClick={reload} disabled={loading || busy}>
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading ? "Loading scenes…" : `${scenes.length} scene${scenes.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {err ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.30)",
              background: "rgba(255,80,80,0.08)",
              lineHeight: 1.4,
            }}
          >
            {err}
          </div>
        ) : null}

        {!loading && !err && scenes.length === 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            No scenes yet.
            <div style={{ marginTop: 10 }}>
              <SmallButton asLink to="/scenes/new">Create your first scene</SmallButton>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {loading ? <div style={{ opacity: 0.8 }}>Loading scenes…</div> : null}

            {!loading
              ? scenes.map((s) => {
                  const title = s.title || "Untitled scene";

                  // quick fields from list
                  const intent = s.emotional_state || "";
                  const isOpen = openScenes.has(s.id);

                  // We only show date if it exists; no placeholders
                  const whenValue = s.scheduled_for || s.started_at || null;
                  const when = whenValue ? formatDate(whenValue) : "";

                  const det = details?.[s.id];
                  const full = det?.status === "ready" ? det.data : null;

                  // Prefer full details if loaded
                  const fullIntent = full?.emotional_state ?? intent;
                  const fullNotes = full?.emotional_notes ?? "";

                  const participants =
                    full?.scene_participants?.map((sp) => sp?.participants).filter(Boolean) ?? [];

                  const tools =
                    full?.scene_tools
                      ?.map((st) => st?.tools_user)
                      .filter(Boolean) ?? [];

                  const sections = parseHashSections(fullNotes);

                  return (
                    <Card
                      key={s.id}
                      onClick={() => {
                        setOpenScenes((prev) => toggleInSet(prev, s.id));
                        if (!isOpen) ensureDetails(s.id);
                      }}
                    >
                      <div style={{ display: "grid", gap: 10 }}>
                        {/* Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                                letterSpacing: 0.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {title}
                            </div>

                            {fullIntent ? (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 13,
                                  opacity: 0.88,
                                  lineHeight: 1.35,
                                }}
                              >
                                {fullIntent}
                              </div>
                            ) : null}

                            {when ? (
                              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>{when}</div>
                            ) : null}
                          </div>

                          {/* Visual affordance */}
                          <div
                            aria-hidden="true"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 10,
                              display: "grid",
                              placeItems: "center",
                              background: "rgba(255,255,255,0.05)",
                              opacity: 0.85,
                              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 160ms ease",
                              userSelect: "none",
                              flex: "0 0 auto",
                              marginTop: 2,
                            }}
                          >
                            ▾
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isOpen ? (
                          <div
                            style={{ display: "grid", gap: 12 }}
                            onClick={(e) => {
                              // allow interaction inside expanded area without collapsing
                              e.stopPropagation();
                            }}
                          >
                            {/* Loading / error state for details */}
                            {det?.status === "loading" ? (
                              <div style={{ opacity: 0.75, fontSize: 13 }}>Loading details…</div>
                            ) : det?.status === "error" ? (
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
                                {det.error || "Failed to load scene details."}
                              </div>
                            ) : null}

                            {/* Participants (top, directly under intent) */}
                            {participants.length ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Participants</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {participants.map((p) => (
                                    <Chip key={p.id}>{pickParticipantLabel(p)}</Chip>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {/* Sections (from notes, using # headings) */}
                            {sections.length ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                {sections.map((sec, idx) => (
                                  <div
                                    key={`${sec.title}-${idx}`}
                                    style={{
                                      padding: 10,
                                      borderRadius: 14,
                                      border: "1px solid rgba(255,255,255,0.10)",
                                      background: "rgba(255,255,255,0.03)",
                                      display: "grid",
                                      gap: 6,
                                    }}
                                  >
                                    <div style={{ fontWeight: 850, fontSize: 13, opacity: 0.95 }}>
                                      {sec.title}
                                    </div>
                                    {sec.body ? (
                                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4, opacity: 0.9 }}>
                                        {sec.body}
                                      </div>
                                    ) : (
                                      <div style={{ opacity: 0.6, fontSize: 13 }}>—</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {/* Tools (compact, bottom) */}
                            {tools.length ? (
                              <div style={{ display: "grid", gap: 6 }}>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Tools</div>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {tools.map((tu) => {
                                    const icon = pickToolIcon(tu);
                                    const label = pickToolLabel(tu);
                                    return (
                                      <Chip key={tu.id}>
                                        <span style={{ marginRight: 6 }}>{icon}</span>
                                        {label}
                                      </Chip>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}

                            {/* Action row (Edit/Delete only) */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <SmallButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/scenes/${s.id}/edit`);
                                }}
                              >
                                Edit
                              </SmallButton>

                              <SmallButton
                                tone="danger"
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteScene(s.id, title);
                                }}
                              >
                                Delete
                              </SmallButton>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  );
                })
              : null}
          </div>
        )}
      </Page>
    </div>
  );
}
