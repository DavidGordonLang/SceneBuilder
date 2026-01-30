import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../../components/Page";
import { Card, SmallButton, IconButton } from "../../components/routesUi";
import { fetchScenes, deleteScene } from "../../lib/scenesApi";
import { formatDate } from "../../lib/sceneHelpers";

function safePreview(text, max = 180) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max).trim()}…`;
}

export default function ScenesHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

  const [menuOpenForId, setMenuOpenForId] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const list = await fetchScenes();
      setScenes(list || []);
    } catch (e) {
      setErr(e?.message || "Failed to load scenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = scenes.length;

  async function handleDelete(sceneId) {
    const ok = window.confirm("Delete this scene?");
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      await deleteScene(sceneId);
      setMenuOpenForId(null);
      await load();
    } catch (e) {
      setErr(e?.message || "Failed to delete scene.");
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
          <SmallButton disabled={busy} onClick={() => navigate("/scenes/new")}>
            New scene
          </SmallButton>
          <SmallButton disabled={busy} onClick={load}>
            Refresh
          </SmallButton>
        </div>

        <div style={{ opacity: 0.7, fontWeight: 800 }}>{count} scenes</div>
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

          {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}

          {!loading && !scenes.length ? (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No scenes yet.</div>
          ) : null}

          {!loading && scenes.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {scenes.map((s) => {
                const created = formatDate(s.created_at);
                const preview = safePreview(s.emotional_state, 180);

                return (
                  <Card key={s.id} onClick={() => navigate(`/scenes/${s.id}`)} title="Open scene">
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
                            {s.title || "Untitled scene"}
                          </div>

                          {created ? (
                            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 800 }}>
                              {created}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ position: "relative", flex: "0 0 auto" }}>
                          <IconButton
                            title="More"
                            onClick={(ev) => {
                              ev?.stopPropagation?.();
                              setMenuOpenForId((cur) => (cur === s.id ? null : s.id));
                            }}
                          >
                            ⋯
                          </IconButton>

                          {menuOpenForId === s.id ? (
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
                                  navigate(`/scenes/${s.id}/edit`);
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
                                onClick={() => handleDelete(s.id)}
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

                      {preview ? (
                        <div style={{ opacity: 0.88, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>
                          {preview}
                        </div>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : null}
        </div>
      </Page>
    </div>
  );
}