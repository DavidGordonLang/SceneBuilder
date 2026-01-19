import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TopBar } from "../../components/routesUi";
import { fetchOwnedToolsForPicker, fetchParticipants, fetchSceneById, updateScene } from "../../lib/scenesApi";
import SceneForm from "./SceneForm";

export default function SceneEdit({ supabase }) {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);
  const [initial, setInitial] = useState(null);

  async function signOut() {
    await supabase.auth.signOut();
  }

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
          intent: scene?.intent || "",
          notes: scene?.notes || "",
          scheduled_at: scene?.scheduled_at || null,
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
      <TopBar title="Edit Scene" onSignOut={signOut} />
      {loading ? (
        <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>
      ) : (
        <SceneForm
          initial={initial || {}}
          participants={participants}
          ownedTools={ownedTools}
          onSubmit={handleSubmit}
          busy={busy}
          err={err}
          submitLabel="Save Changes"
          backTo={`/scenes/${id}`}
        />
      )}
    </div>
  );
}
