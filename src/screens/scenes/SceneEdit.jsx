import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
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

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);
  const [initial, setInitial] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [scene, ps, ot] = await Promise.all([
          fetchSceneById(id),
          fetchParticipants(),
          fetchOwnedToolsForPicker(),
        ]);

        if (!alive) return;

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

  async function handleSubmit(payload) {
    setBusy(true);
    setErr("");
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SmallButton onClick={() => navigate(-1)}>← Back</SmallButton>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Edit Scene</div>
        </div>
      </Page>

      <Page>
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
