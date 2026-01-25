import React, { useEffect, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import { fetchScenes } from "../../lib/scenesApi";
import { formatDate } from "../../lib/sceneHelpers";
import { useNavigate } from "react-router-dom";

// multiple-open helper (Set-based)
function toggleInSet(prevSet, id) {
  const next = new Set(prevSet);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export default function ScenesHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // delete / mutations
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

  // Multiple scenes can be expanded at once (consistent with Tools browsing)
  const [openScenes, setOpenScenes] = useState(() => new Set());

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

  async function deleteScene(sceneId, title) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      // Match the working deletion approach used in SceneView:
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
              <SmallButton asLink to="/scenes/new">
                Create your first scene
              </SmallButton>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {loading ? <div style={{ opacity: 0.8 }}>Loading scenes…</div> : null}

            {!loading
              ? scenes.map((s) => {
                  const title = s.title || "Untitled scene";

                  // DB fields we confirmed earlier:
                  const intent = s.emotional_state || "";
                  const notes = s.emotional_notes || "";

                  const when =
                    s.scheduled_for
                      ? formatDate(s.scheduled_for)
                      : s.started_at
                      ? formatDate(s.started_at)
                      : "";

                  const isOpen = openScenes.has(s.id);

                  return (
                    <Card
                      key={s.id}
                      onClick={() => setOpenScenes((prev) => toggleInSet(prev, s.id))}
                    >
                      <div style={{ display: "grid", gap: 8 }}>
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

                            {/* Intent under title (collapsed + expanded) */}
                            {intent ? (
                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 13,
                                  opacity: 0.88,
                                  lineHeight: 1.35,
                                }}
                              >
                                {intent}
                              </div>
                            ) : (
                              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.55 }}>—</div>
                            )}

                            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                              {when ? when : "—"}
                            </div>
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
                            style={{
                              marginTop: 2,
                              display: "grid",
                              gap: 10,
                            }}
                            onClick={(e) => {
                              // allow interaction inside expanded area without collapsing
                              e.stopPropagation();
                            }}
                          >
                            {/* Notes (temporary) — will become structured sections/blocks later */}
                            {notes ? (
                              <div style={{ opacity: 0.9 }}>
                                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                                  Notes
                                </div>
                                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{notes}</div>
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
