import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Page from "../../components/Page";
import { Card, Chip, SmallButton } from "../../components/routesUi";
import { fetchSceneById, updateScenePlanningStage } from "../../lib/scenesApi";
import {
  formatDate,
  pickParticipantLabel,
  pickToolIcon,
  pickToolLabel,
} from "../../lib/sceneHelpers";

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
  "complete",
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
  complete: "Complete",
};

function nextStage(current) {
  const idx = PLANNING_STAGES.indexOf(current);
  if (idx === -1) return PLANNING_STAGES[0];
  return PLANNING_STAGES[(idx + 1) % PLANNING_STAGES.length];
}

function sectionsFromBlocks(blocks) {
  const arr = Array.isArray(blocks) ? blocks : [];
  if (!arr.length) return [];
  return arr
    .slice()
    .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
    .map((b) => ({
      title: String(b?.title || "").trim() || "Stage",
      body: String(b?.body || ""),
      duration_minutes:
        b?.duration_minutes === null || b?.duration_minutes === undefined
          ? null
          : Number(b.duration_minutes),
    }))
    .filter((s) => s.title && (s.body || "").trim().length > 0);
}

export default function SceneView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [scene, setScene] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const full = await fetchSceneById(id);
      setScene(full);
    } catch (e) {
      setErr(e?.message || "Failed to load scene.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const title = scene?.title || "Scene";
  const intent = scene?.emotional_state || "";
  const whenValue = scene?.scheduled_for || scene?.started_at || null;
  const when = whenValue ? formatDate(whenValue) : "";

  const participants = useMemo(() => {
    return (
      scene?.scene_participants
        ?.map((sp) => sp?.participants)
        .filter(Boolean) ?? []
    );
  }, [scene]);

  const tools = useMemo(() => {
    return scene?.scene_tools?.map((st) => st?.tools_user).filter(Boolean) ?? [];
  }, [scene]);

  const sections = useMemo(() => sectionsFromBlocks(scene?.scene_blocks), [scene]);

  const stage = scene?.planning_stage || "intent";

  async function cycleStage() {
    if (!scene) return;
    const next = nextStage(stage);

    setBusy(true);
    try {
      await updateScenePlanningStage(scene.id, next);
      setScene((prev) => ({ ...prev, planning_stage: next }));
    } catch (e) {
      console.error(e);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <SmallButton asLink to="/scenes">
            ← Back
          </SmallButton>

          <button
            onClick={cycleStage}
            disabled={busy}
            title="Tap to change planning stage"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 750,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.04)",
              opacity: busy ? 0.5 : 0.85,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {STAGE_LABELS[stage] || "Intent"}
          </button>
        </div>

        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : err ? (
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
        ) : (
          <Card>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
                {intent && <div style={{ opacity: 0.85 }}>{intent}</div>}
                {when && <div style={{ fontSize: 12, opacity: 0.7 }}>{when}</div>}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Participants</div>
                {participants.length ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {participants.map((p) => (
                      <Chip key={p.id}>{pickParticipantLabel(p)}</Chip>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, opacity: 0.6 }}>None selected yet</div>
                )}
              </div>

              {sections.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {sections.map((sec, idx) => (
                    <div
                      key={`${sec.title}-${idx}`}
                      style={{
                        padding: 10,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div style={{ fontWeight: 850, fontSize: 13 }}>{sec.title}</div>
                      {sec.body ? (
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.4,
                            opacity: 0.9,
                          }}
                        >
                          {sec.body}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.6 }}>No stages filled yet.</div>
              )}

              {tools.length > 0 && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Tools & Toys</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tools.map((tu) => (
                      <Chip key={tu.id}>
                        <span style={{ marginRight: 6 }}>{pickToolIcon(tu)}</span>
                        {pickToolLabel(tu)}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <SmallButton
                  onClick={() => navigate(`/scenes/${scene.id}/edit`, { state: { openSceneId: scene.id } })}
                >
                  Edit
                </SmallButton>
              </div>
            </div>
          </Card>
        )}
      </Page>
    </div>
  );
}