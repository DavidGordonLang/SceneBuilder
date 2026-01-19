import React, { useEffect, useState } from "react";
import { TopBar } from "../../components/routesUi";
import { createScene, fetchOwnedToolsForPicker, fetchParticipants } from "../../lib/scenesApi";
import SceneForm from "./SceneForm";

export default function SceneCreate({ supabase }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [ps, ot] = await Promise.all([fetchParticipants(), fetchOwnedToolsForPicker()]);
        if (!alive) return;
        setParticipants(ps);
        setOwnedTools(ot);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load form data.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(payload) {
    setBusy(true);
    setErr("");
    try {
      const scene = await createScene(payload);
      return { sceneId: scene.id };
    } catch (e) {
      setErr(e?.message || "Could not create scene.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title="New Scene" onSignOut={signOut} />
      {loading ? (
        <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>
      ) : (
        <SceneForm
          initial={{}}
          participants={participants}
          ownedTools={ownedTools}
          onSubmit={handleSubmit}
          busy={busy}
          err={err}
          submitLabel="Save Draft"
          backTo="/scenes"
        />
      )}
    </div>
  );
}
