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
    function onDoc(e) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;
      onToggle(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onToggle]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <SmallButton onClick={() => onToggle(!open)} disabled={busy} aria-label="Scene actions">
        ⋯
      </SmallButton>
      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 38,
            minWidth: 160,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(20,20,24,0.98)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              onToggle(false);
              onEdit();
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Edit
          </button>
          <button
            onClick={() => {
              onToggle(false);
              onDelete();
            }}
            style={{
              width: "100%",
              padding: "10px 12px",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "rgba(255,90,90,0.95)",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function SceneView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scene, setScene] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const s = await fetchSceneById(id);
        if (!alive) return;
        setScene(s);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load scene.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!scene?.id) return;
    const ok = window.confirm("Delete this scene? This cannot be undone.");
    if (!ok) return;

    setBusy(true);
    try {
      // Defensive: delete join rows first then scene.
      // (Matches your earlier approach in chat; keeping it local here.)
      const { supabase } = await import("../../lib/supabaseClient.js").then((m) => m);
      {
        const { error } = await supabase.from("scene_participants").delete().eq("scene_id", scene.id);
        if (error) throw error;
      }
      {
        const { error } = await supabase.from("scene_tools").delete().eq("scene_id", scene.id);
        if (error) throw error;
      }
      {
        const { error } = await supabase.from("scenes").delete().eq("id", scene.id);
        if (error) throw error;
      }

      toast.show("Scene deleted.");
      navigate("/scenes");
    } catch (e) {
      toast.show(e?.message || "Could not delete scene.");
    } finally {
      setBusy(false);
    }
  }

  const participants =
    scene?.scene_participants?.map((sp) => sp?.participants).filter(Boolean) ?? [];
  const tools =
    scene?.scene_tools
      ?.map((st) => {
        const tu = st?.tools_user;
        const tg = tu?.tools_global;
        const name = pickToolLabel(tu, tg);
        const icon = pickToolIcon(tu, tg);
        return {
          id: tu?.id || st?.tool_user_id,
          name,
          icon,
          tags: tg?.tags || [],
          safety_level: tg?.safety_level || null,
          raw: { tu, tg },
        };
      })
      .filter((t) => t?.id) ?? [];

  return (
    <div>
      <Page
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <SmallButton onClick={() => navigate(-1)}>← Back</SmallButton>
          <div style={{ fontWeight: 900, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scene?.title || "Scene"}
          </div>
        </div>

        <KebabMenu
          open={menuOpen}
          onToggle={setMenuOpen}
          onEdit={() => navigate(`/scenes/${id}/edit`)}
          onDelete={handleDelete}
          busy={busy}
        />
      </Page>

      <Page>
        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : err ? (
          <div style={{ opacity: 0.9 }}>{err}</div>
        ) : !scene ? (
          <div style={{ opacity: 0.7 }}>Not found.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <Card>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{scene.title}</div>
                  <div style={{ opacity: 0.65, fontSize: 12 }}>
                    {formatDate(scene.scheduled_for || scene.created_at) || "—"}
                  </div>
                </div>

                {scene.emotional_state ? (
                  <div style={{ marginTop: 10, opacity: 0.9 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Intent</div>
                    <div style={{ marginTop: 4, lineHeight: 1.35 }}>{scene.emotional_state}</div>
                  </div>
                ) : null}

                {scene.emotional_notes ? (
                  <div style={{ marginTop: 10, opacity: 0.9 }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div>
                    <div style={{ marginTop: 4, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>{scene.emotional_notes}</div>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Participants</div>
              {participants.length ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {participants.map((p) => (
                    <Chip key={p.id}>{pickParticipantLabel(p)}</Chip>
                  ))}
                </div>
              ) : (
                <div style={{ opacity: 0.65, fontSize: 12 }}>No participants selected.</div>
              )}
            </Card>

            <Card>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Tools</div>
              {tools.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {tools.map((t) => (
                    <ToolRow key={t.id} tool={t} />
                  ))}
                </div>
              ) : (
                <div style={{ opacity: 0.65, fontSize: 12 }}>No tools selected.</div>
              )}
            </Card>
          </div>
        )}
      </Page>
    </div>
  );
}
