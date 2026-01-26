import React, { useEffect, useState } from "react";
import { Card, Chip, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  fetchSceneById,
  fetchScenes,
  updateScenePlanningStage,
} from "../../lib/scenesApi";
import {
  formatDate,
  pickParticipantLabel,
  pickToolIcon,
  pickToolLabel,
} from "../../lib/sceneHelpers";
import { useNavigate } from "react-router-dom";

/* ---------------- planning stage config ---------------- */

const PLANNING_STAGES = [
  "intent",
  "negotiation",
  "planning",
  "connection",
  "exchange",
  "play",
  "aftercare",
  "integration",
];

const STAGE_LABELS = {
  intent: "Intent",
  negotiation: "Negotiate",
  planning: "Plan",
  connection: "Connect",
  exchange: "Exchange",
  play: "Play",
  aftercare: "Aftercare",
  integration: "Integrate",
};

function nextStage(current) {
  const idx = PLANNING_STAGES.indexOf(current);
  if (idx === -1) return PLANNING_STAGES[0];
  return PLANNING_STAGES[(idx + 1) % PLANNING_STAGES.length];
}

/* ---------------- helpers ---------------- */

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

  if (!sawHeading) {
    return [{ title: "Plan", body: text }];
  }

  return sections.filter(
    (s) => (s.title && s.title.trim()) || (s.body && s.body.trim())
  );
}

/* ---------------- component ---------------- */

export default function ScenesHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

  const [openScenes, setOpenScenes] = useState(() => new Set());
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
        [sceneId]: {
          status: "error",
          error: e?.message || "Failed to load scene details.",
        },
      }));
    }
  }

  async function cyclePlanningStage(e, scene) {
    e.stopPropagation();
    const current = scene.planning_stage || "intent";
    const next = nextStage(current);

    try {
      await updateScenePlanningStage(scene.id, next);
      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id ? { ...s, planning_stage: next } : s
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteScene(sceneId, title) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      const { supabase } = await import("../../lib/supabaseClient.js").then(
        (m) => m
      );

      await supabase.from("scene_participants").delete().eq("scene_id", sceneId);
      await supabase.from("scene_tools").delete().eq("scene_id", sceneId);
      await supabase.from("scenes").delete().eq("id", sceneId);

      setOpenScenes((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });

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
        {/* header */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <SmallButton asLink to="/scenes/new">+ New scene</SmallButton>
            <SmallButton onClick={reload} disabled={loading || busy}>
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading
              ? "Loading scenes…"
              : `${scenes.length} scene${scenes.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.30)",
              background: "rgba(255,80,80,0.08)",
            }}
          >
            {err}
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {scenes.map((s) => {
            const isOpen = openScenes.has(s.id);
            const stage = s.planning_stage || "intent";

            const intent = s.emotional_state || "";
            const whenValue = s.scheduled_for || s.started_at || null;
            const when = whenValue ? formatDate(whenValue) : "";

            const det = details?.[s.id];
            const full = det?.status === "ready" ? det.data : null;

            const participants =
              full?.scene_participants
                ?.map((sp) => sp?.participants)
                .filter(Boolean) ?? [];

            const tools =
              full?.scene_tools
                ?.map((st) => st?.tools_user)
                .filter(Boolean) ?? [];

            const sections = parseHashSections(
              full?.emotional_notes ?? ""
            );

            return (
              <Card
                key={s.id}
                onClick={() => {
                  setOpenScenes((prev) => toggleInSet(prev, s.id));
                  if (!isOpen) ensureDetails(s.id);
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  {/* header row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{s.title}</div>
                      {intent && (
                        <div style={{ fontSize: 13, opacity: 0.85 }}>
                          {intent}
                        </div>
                      )}
                      {when && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {when}
                        </div>
                      )}
                    </div>

                    {/* planning stage pill */}
                    <button
                      onClick={(e) => cyclePlanningStage(e, s)}
                      data-stage={stage}
                      title="Tap to change planning stage"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.04)",
                        opacity: 0.85,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      {STAGE_LABELS[stage]}
                    </button>
                  </div>

                  {/* expanded */}
                  {isOpen && (
                    <div
                      style={{ display: "grid", gap: 12 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* participants */}
                      <div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          Participants
                        </div>
                        {participants.length ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {participants.map((p) => (
                              <Chip key={p.id}>
                                {pickParticipantLabel(p)}
                              </Chip>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, opacity: 0.6 }}>
                            None selected yet
                          </div>
                        )}
                      </div>

                      {/* sections */}
                      {sections.map((sec, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 10,
                            borderRadius: 14,
                            background: "rgba(255,255,255,0.03)",
                          }}
                        >
                          <div style={{ fontWeight: 850, fontSize: 13 }}>
                            {sec.title}
                          </div>
                          <div style={{ fontSize: 13, opacity: 0.9 }}>
                            {sec.body}
                          </div>
                        </div>
                      ))}

                      {/* tools */}
                      {tools.length > 0 && (
                        <div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>
                            Tools
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {tools.map((tu) => (
                              <Chip key={tu.id}>
                                {pickToolIcon(tu)} {pickToolLabel(tu)}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8 }}>
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
                            deleteScene(s.id, s.title);
                          }}
                        >
                          Delete
                        </SmallButton>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Page>
    </div>
  );
}
