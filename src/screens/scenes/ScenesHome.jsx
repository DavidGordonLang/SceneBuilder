import React, { useEffect, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import { fetchScenes } from "../../lib/scenesApi";
import { formatDate } from "../../lib/sceneHelpers";

export default function ScenesHome() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

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
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SmallButton asLink to="/scenes/new">
              + New scene
            </SmallButton>
            <SmallButton onClick={reload} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading
              ? "Loading scenes…"
              : `${scenes.length} scene${scenes.length === 1 ? "" : "s"}`}
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
                  const when =
                    s.scheduled_for
                      ? formatDate(s.scheduled_for)
                      : s.started_at
                      ? formatDate(s.started_at)
                      : "";

                  return (
                    <Card key={s.id} asLink to={`/scenes/${s.id}`}>
                      <div style={{ display: "grid", gap: 6 }}>
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
                            <div style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>
                              {when ? when : "—"}
                            </div>
                          </div>
                        </div>
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
