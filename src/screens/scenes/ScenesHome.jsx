import React, { useEffect, useState } from "react";
import { TopBar, Chip, Card, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import { fetchScenes } from "../../lib/scenesApi";
import { formatDate } from "../../lib/sceneHelpers";

export default function ScenesHome({ supabase }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

  async function signOut() {
    await supabase.auth.signOut();
  }

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
      <TopBar
        title="Scenes"
        onSignOut={signOut}
        rightSlot={<SmallButton asLink to="/scenes/new">+ New</SmallButton>}
      />

      <Page style={{ display: "grid", gap: 12 }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading scenes…</div>
        ) : err ? (
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
        ) : scenes.length === 0 ? (
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
            {scenes.map((s) => {
              const title = s.title || "Untitled scene";
              const status = (s.status || "DRAFT").toUpperCase();
              const when =
                s.scheduled_for ? formatDate(s.scheduled_for) : s.started_at ? formatDate(s.started_at) : "";

              return (
                <Card key={s.id} asLink to={`/scenes/${s.id}`}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
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
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <Chip>{status}</Chip>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Page>
    </div>
  );
}
