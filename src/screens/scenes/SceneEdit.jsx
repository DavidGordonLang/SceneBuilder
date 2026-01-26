import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  convertNotesToSceneBlocks,
  fetchOwnedToolsForPicker,
  fetchParticipants,
  fetchSceneById,
  updateScene,
} from "../../lib/scenesApi";
import SceneForm from "./SceneForm";

export default function SceneEdit({ supabase }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);
  const [initial, setInitial] = useState(null);

  async function loadAll() {
    setLoading(true);
    setErr("");
    setNotice("");
    try {
      const [scene, ps, ot] = await Promise.all([
        fetchSceneById(id),
        fetchParticipants(),
        fetchOwnedToolsForPicker(),
      ]);

      const participantIds =
        scene?.scene_participants?.map((sp) => sp.participant_id).filter(Boolean) ?? [];
      const toolUserIds =
        scene?.scene_tools?.map((st) => st.tool_user_id).filter(Boolean) ?? [];

      setInitial({
        title: scene?.title || scene?.name || "",
        intent: scene?.emotional_state || "",
        notes: scene?.emotional_notes || "",
        scheduled_at: scene?.scheduled_for || null,
        participantIds,
        toolUserIds,
      });

      setParticipants(ps);
      setOwnedTools(ot);
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
      await loadAll();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSubmit(payload) {
    setBusy(true);
    setErr("");
    setNotice("");
    try {
      await updateScene(id, payload);
      return { sceneId: id };
    } catch (e) {
      setErr(e?.message || "Could not update scene.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleConvertNotesToStages() {
    if (!initial) return;

    const notesText = String(initial.notes || "").trim();
    if (!notesText) {
      setErr("No notes to convert yet.");
      setNotice("");
      return;
    }

    const ok = window.confirm(
      "Convert the current saved notes into staged blocks?\n\nThis will create (or replace) scene blocks, but it will NOT delete your notes."
    );
    if (!ok) return;

    setBusy(true);
    setErr("");
    setNotice("");
    try {
      const n = await convertNotesToSceneBlocks(id, notesText);
      setNotice(`Converted notes into ${n} stage${n === 1 ? "" : "s"}.`);
      // Reload so the app has the latest (blocks now exist, used elsewhere next)
      await loadAll();
    } catch (e) {
      setErr(e?.message || "Could not convert notes to stages.");
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SmallButton onClick={() => navigate(-1)}>← Back</SmallButton>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Edit Scene</div>
        </div>

        {/* Convert notes -> stages (safe bridge step) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <SmallButton onClick={handleConvertNotesToStages} disabled={loading || busy || !initial}>
            Convert notes → stages
          </SmallButton>
        </div>
      </Page>

      <Page>
        {notice ? (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              marginBottom: 12,
              fontSize: 13,
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : (
          <SceneForm
            initial={initial}
            participants={participants}
            ownedTools={ownedTools}
            onSubmit={handleSubmit}
            busy={busy}
            err={err}
            submitLabel="Save"
            backTo={`/scenes/${id}`}
          />
        )}
      </Page>
    </div>
  );
}
