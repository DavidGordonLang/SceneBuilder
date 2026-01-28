import React, { useEffect } from "react";
import { Card, Chip, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  formatDate,
  pickParticipantLabel,
  pickToolIcon,
  pickToolLabel,
} from "../../lib/sceneHelpers";
import { useLocation, useNavigate } from "react-router-dom";
import useScenesHome from "../../hooks/useScenesHome";

/* ---------------- planning stage labels ---------------- */

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

/* ---------------- blocks helpers ---------------- */

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

/* ---------------- component ---------------- */

export default function ScenesHome() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    loading,
    busy,
    err,
    scenes,
    details,
    openScenes,
    countLabel,
    reload,
    ensureDetails,
    toggleSceneOpen,
    openScene,
    cyclePlanningStage,
    deleteScene,
  } = useScenesHome();

  // When returning from Edit, open the requested card and load details
  useEffect(() => {
    const openSceneId = location?.state?.openSceneId;
    if (!openSceneId) return;

    openScene(openSceneId);
    ensureDetails(openSceneId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state?.openSceneId]);

  return (
    <div>
      <Page style={{ display: "grid", gap: 12 }}>
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
            <SmallButton asLink to="/scenes/new">
              + New scene
            </SmallButton>
            <SmallButton onClick={() => reload()} disabled={loading || busy}>
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>{countLabel}</div>
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
              full?.scene_participants?.map((sp) => sp?.participants).filter(Boolean) ?? [];

            const tools = full?.scene_tools?.map((st) => st?.tools_user).filter(Boolean) ?? [];

            const sections = sectionsFromBlocks(full?.scene_blocks);

            return (
              <Card
                key={s.id}
                onClick={() => {
                  toggleSceneOpen(s.id);
                  if (!isOpen) ensureDetails(s.id);
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{s.title}</div>
                      {intent && <div style={{ fontSize: 13, opacity: 0.85 }}>{intent}</div>}
                      {when && <div style={{ fontSize: 12, opacity: 0.7 }}>{when}</div>}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cyclePlanningStage(s);
                      }}
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
                      {STAGE_LABELS[stage] || "Intent"}
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{ display: "grid", gap: 12 }} onClick={(e) => e.stopPropagation()}>
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

                      <div>
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
                                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4, opacity: 0.9 }}>
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
                        <div>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>Tools</div>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/scenes/${s.id}/edit`, {
                              state: { fromScenesHome: true, openSceneId: s.id },
                            });
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
