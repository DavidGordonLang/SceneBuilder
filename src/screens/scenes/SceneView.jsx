import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Page from "../../components/Page";
import { Card, SmallButton } from "../../components/routesUi";
import { fetchSceneById } from "../../lib/scenesApi";
import { formatDate, pickParticipantLabel, pickToolLabel, pickToolIcon } from "../../lib/sceneHelpers";

export default function SceneView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scene, setScene] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const s = await fetchSceneById(id);
      setScene(s || null);
    } catch (e) {
      setErr(e?.message || "Failed to load scene.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const participants = useMemo(() => {
    const rows = scene?.scene_participants || [];
    return rows.map((r) => r?.participants).filter(Boolean);
  }, [scene]);

  const tools = useMemo(() => {
    const rows = scene?.scene_tools || [];
    return rows.map((r) => r?.tools_user).filter(Boolean);
  }, [scene]);

  const blocks = useMemo(() => {
    const arr = Array.isArray(scene?.scene_blocks) ? scene.scene_blocks : [];
    return arr.slice().sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0));
  }, [scene]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SmallButton onClick={() => navigate("/scenes")}>← Back</SmallButton>
          <div style={{ fontWeight: 950, fontSize: 18 }}>{scene?.title || "Scene"}</div>
        </div>

        <SmallButton onClick={() => navigate(`/scenes/${id}/edit`)} disabled={loading}>
          Edit
        </SmallButton>
      </Page>

      <Page>
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

        {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}

        {!loading && scene ? (
          <div style={{ display: "grid", gap: 12 }}>
            <Card>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>Details</div>
                {scene?.planning_stage ? (
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    Stage: <span style={{ fontWeight: 900 }}>{scene.planning_stage}</span>
                  </div>
                ) : null}
                {scene?.created_at ? (
                  <div style={{ opacity: 0.65, fontSize: 13 }}>Created: {formatDate(scene.created_at)}</div>
                ) : null}
              </div>
            </Card>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Stages</div>
              {blocks.map((b) => (
                <Card key={b.id || b.sort_order}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ fontWeight: 850, opacity: 0.9 }}>{b.title}</div>
                    {b.body ? (
                      <div style={{ opacity: 0.88, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                        {b.body}
                      </div>
                    ) : (
                      <div style={{ opacity: 0.6, fontSize: 13 }}>No content yet.</div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Participants</div>
              {participants.length ? (
                participants.map((p) => (
                  <Card key={p.id}>
                    <div style={{ fontWeight: 800 }}>{pickParticipantLabel(p)}</div>
                  </Card>
                ))
              ) : (
                <div style={{ opacity: 0.7, fontSize: 13 }}>No participants selected.</div>
              )}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Tools & Toys</div>
              {tools.length ? (
                tools.map((tu) => (
                  <Card key={tu.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: "rgba(255,255,255,0.05)",
                          fontSize: 18,
                          flex: "0 0 auto",
                        }}
                      >
                        {pickToolIcon(tu)}
                      </div>
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 850 }}>{pickToolLabel(tu)}</div>
                        {tu?.tools_global?.name ? (
                          <div style={{ opacity: 0.65, fontSize: 12 }}>{tu.tools_global.name}</div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div style={{ opacity: 0.7, fontSize: 13 }}>No tools selected.</div>
              )}
            </div>
          </div>
        ) : null}
      </Page>
    </div>
  );
}