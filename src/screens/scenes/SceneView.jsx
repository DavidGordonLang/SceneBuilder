import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Chip, Card, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import { useToast } from "../../ui/ToastContext.jsx";
import { fetchSceneById } from "../../lib/scenesApi";
import { formatDate, pickParticipantLabel, pickToolIcon, pickToolLabel } from "../../lib/sceneHelpers";

function ToolRow({ tool }) {
  const icon = tool.icon || "🧰";
  const tags = Array.isArray(tool.tags) ? tool.tags : [];
  const safety = tool.safety_level ? String(tool.safety_level).toUpperCase() : null;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.05)",
          fontSize: 18,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tool.name}
              </div>
              {safety ? <span style={{ opacity: 0.6, fontSize: 12 }}>{safety}</span> : null}
            </div>
          </div>
        </div>

        {tags.length ? (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.slice(0, 6).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>No tags</div>
        )}
      </div>
    </div>
  );
}

function KebabMenu({ open, onToggle, onEdit, onDelete, busy }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e) {
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      onToggle(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, onToggle]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {/* No box around the dots */}
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-label="Menu"
        title="Menu"
        style={{
          border: "none",
          background: "transparent",
          color: "#f3f3f7",
          cursor: "pointer",
          fontSize: 22,
          lineHeight: 1,
          padding: 6,
          opacity: 0.9,
        }}
      >
        ⋮
      </button>

      {open ? (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 6,
            minWidth: 160,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(12,12,14,0.98)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggle(false);
              onEdit();
            }}
            disabled={busy}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              border: "none",
              background: "transparent",
              color: "#f3f3f7",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 750,
              opacity: busy ? 0.55 : 0.95,
            }}
          >
            Edit
          </button>

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggle(false);
              onDelete();
            }}
            disabled={busy}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "10px 12px",
              border: "none",
              background: "transparent",
              color: "#ffb3b3",
              cursor: busy ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 800,
              opacity: busy ? 0.55 : 1,
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function SceneView({ supabase }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [scene, setScene] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchSceneById(id);
      setScene(data);
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
      await reload();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!supabase || !id) return;

    const ok = window.confirm("Delete this scene? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    setErr("");

    try {
      // Delete join rows first (safe even if FK cascade exists).
      const { error: tErr } = await supabase.from("scene_tools").delete().eq("scene_id", id);
      if (tErr) throw tErr;

      const { error: pErr } = await supabase.from("scene_participants").delete().eq("scene_id", id);
      if (pErr) throw pErr;

      const { error: sErr } = await supabase.from("scenes").delete().eq("id", id);
      if (sErr) throw sErr;

      showToast?.("Deleted");
      navigate("/scenes");
    } catch (e) {
      setErr(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  const title = scene?.title || scene?.name || "Untitled scene";

  const participants = scene?.scene_participants?.map((sp) => sp.participants).filter(Boolean) ?? [];
  const tools = scene?.scene_tools?.map((st) => st.tools_user).filter(Boolean) ?? [];

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Sub-route contextual row: Back + kebab */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <SmallButton onClick={() => navigate("/scenes")} title="Back to Scenes">
            ← Back
          </SmallButton>

          <KebabMenu
            open={menuOpen}
            onToggle={setMenuOpen}
            busy={busy || loading || !scene}
            onEdit={() => navigate(`/scenes/${id}/edit`)}
            onDelete={handleDelete}
          />
        </div>

        {loading ? <div style={{ opacity: 0.8 }}>Loading…</div> : null}

        {err ? (
          <Card>
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,80,80,0.35)",
                background: "rgba(255,80,80,0.10)",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {err}
            </div>
          </Card>
        ) : null}

        {!loading && scene ? (
          <>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 950, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {title}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                    {formatDate(scene.scheduled_at || scene.created_at) || "—"}
                  </div>
                </div>
              </div>

              {scene.intent ? (
                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Intent</div>
                  <div style={{ marginTop: 4, lineHeight: 1.35 }}>{scene.intent}</div>
                </div>
              ) : null}

              {scene.notes ? (
                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div>
                  <div style={{ marginTop: 4, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{scene.notes}</div>
                </div>
              ) : null}
            </Card>

            <Card>
              <div style={{ fontWeight: 900 }}>Participants</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {participants.length ? (
                  participants.map((p) => <Chip key={p.id}>{pickParticipantLabel(p)}</Chip>)
                ) : (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>None selected</div>
                )}
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 900 }}>Tools</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {tools.length ? (
                  tools.map((tu) => {
                    const name = pickToolLabel(tu);
                    const icon = pickToolIcon(tu);
                    const g = tu.tools_global;
                    const tags = g?.tags || tu.tags_override || [];
                    const safety = g?.safety_level || null;

                    return <ToolRow key={tu.id} tool={{ name, icon, tags, safety_level: safety }} />;
                  })
                ) : (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>None selected</div>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </Page>
    </div>
  );
}
