import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  createScene,
  fetchOwnedToolsForPicker,
  fetchParticipants,
} from "../../lib/scenesApi";
import SceneForm from "./SceneForm";

export default function SceneCreate() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);

  const latestPayloadRef = useRef(null);

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

  async function saveNow() {
    const payload = latestPayloadRef.current;
    if (!payload?.title?.trim()) {
      setErr("Title is required.");
      return null;
    }

    setBusy(true);
    setErr("");
    try {
      const scene = await createScene(payload);
      return scene?.id || null;
    } catch (e) {
      setErr(e?.message || "Could not create scene.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleBack() {
    if (busy) return;
    // No confirm on create — just leave
    navigate("/scenes");
  }

  async function handleSave() {
    if (busy) return;
    const newId = await saveNow();
    if (newId) {
      navigate("/scenes", { state: { openSceneId: newId } });
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
          <SmallButton onClick={handleBack} title="Back to scenes" disabled={busy}>
            ← Back
          </SmallButton>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>New scene</div>
            <SmallButton onClick={handleSave} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </SmallButton>
          </div>
        </div>

        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : (
          <SceneForm
            initial={{}}
            participants={participants}
            ownedTools={ownedTools}
            onSubmit={async () => null} // create handled by this screen
            busy={busy}
            err={err}
            submitLabel="Save"
            backTo="/scenes"
            showActions={false}
            onStateChange={(payload) => {
              latestPayloadRef.current = payload;
            }}
          />
        )}
      </Page>
    </div>
  );
}
