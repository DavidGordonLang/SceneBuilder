import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar, Chip, Card } from "../../components/routesUi";
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
      setScenes(data);
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
        rightSlot={
          <Link
            to="/scenes/new"
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#f3f3f7",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            + New
          </Link>
        }
      />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading scenes…</div>
        ) : err ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        ) : null}

        {!loading && !err && scenes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            No scenes yet. Create your first draft.
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {scenes.map((s) => {
            const title = s.title || s.name || "Untitled scene";
            const status = (s.status || "draft").toUpperCase();
            const when = formatDate(s.scheduled_at || s.created_at);

            return (
              <Card key={s.id} asLink to={`/scenes/${s.id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {title}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                      {when ? when : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <Chip>{status}</Chip>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
