import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  createScene,
  fetchOwnedToolsForPicker,
  fetchParticipants,
} from "../../lib/scenesApi";
import SceneForm from "./SceneForm";

export default function SceneCreate({ supabase }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [ps, ot] = await Promise.all([
          fetchParticipants(),
          fetchOwnedToolsForPicker(),
        ]);
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
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Sub-route contextual row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <SmallButton onClick={() => navigate("/scenes")} title="Back to scenes">
            ← Back
          </SmallButton>
          <div style={{ fontSize: 12, opacity: 0.7 }}>New scene</div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
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
      </Page>
    </div>
  );
}
