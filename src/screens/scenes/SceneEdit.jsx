import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  fetchOwnedToolsForPicker,
  fetchParticipants,
  fetchSceneById,
  updateScene,
  updateScenePlanningStage,
} from "../../lib/scenesApi";
import SceneForm from "./SceneForm";

/* ---------------- planning stage config ---------------- */

const PLANNING_STAGES = [
  "intent",
  "negotiation",
  "planning",
  "connection",
  "exchange",
  "play",
  "aftercare",
  "integration",
  "complete",
];

const STAGE_LABELS = {
  intent: "Intent",
  negotiation: "Negotiate",
  planning: "Plan",
  connection: "Connect",
  exchange: "Exchange",
  play: "Play",
  aftercare: "Aftercare",
  integration: "Integrate",
  complete: "Complete",
};

function nextStage(current) {
  const idx = PLANNING_STAGES.indexOf(current);
  if (idx === -1) return PLANNING_STAGES[0];
  return PLANNING_STAGES[(idx + 1) % PLANNING_STAGES.length];
}

function stableStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

export default function SceneEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);
  const [initial, setInitial] = useState(null);

  const [planningStage, setPlanningStage] = useState("intent");

  // latest form payload snapshot + baseline for dirty checks
  const latestPayloadRef = useRef(null);
  const baselineRef = useRef(null); // IMPORTANT: baseline is set from the form's first canonical payload
  const [isDirty, setIsDirty] = useState(false);

  const openSceneId = useMemo(() => {
    return location?.state?.openSceneId || id;
  }, [location?.state?.openSceneId, id]);

  function goBackToScenesHome() {
    navigate("/scenes", { state: { openSceneId } });
  }

  async function loadAll() {
    setLoading(true);
    setErr("");
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

      const init = {
        title: scene?.title || scene?.name || "",
        intent: scene?.emotional_state || "",
        notes: scene?.emotional_notes || "",
        scheduled_at: scene?.scheduled_for || null,
        participantIds,
        toolUserIds,
        blocks: scene?.scene_blocks || [],
      };

      setInitial(init);
      setPlanningStage(scene?.planning_stage || "intent");

      // reset dirty tracking – baseline will be set from SceneForm's first onStateChange
      baselineRef.current = null;
      latestPayloadRef.current = null;
      setIsDirty(false);

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

  async function saveNow() {
    const payload = latestPayloadRef.current;
    if (!payload) return false;

    setBusy(true);
    setErr("");
    try {
      await updateScene(id, payload);

      // After a successful save, reset baseline to the just-saved payload
      baselineRef.current = stableStringify(payload);
      setIsDirty(false);

      return true;
    } catch (e) {
      setErr(e?.message || "Could not update scene.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleBack() {
    // If we haven't established baseline yet (rare), treat as not dirty
    if (!baselineRef.current || !isDirty) {
      goBackToScenesHome();
      return;
    }

    const ok = window.confirm("Save changes?");
    if (ok) {
      const saved = await saveNow();
      if (saved) goBackToScenesHome();
    } else {
      goBackToScenesHome();
    }
  }

  async function cycleStage() {
    const next = nextStage(planningStage);

    // optimistic UI
    setPlanningStage(next);

    try {
      await updateScenePlanningStage(id, next);
    } catch (e) {
      console.error(e);
      // if it fails, we don’t know the previous stage reliably; reload is safest
      await loadAll();
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
          <SmallButton onClick={handleBack} disabled={busy}>
            ← Back
          </SmallButton>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Edit Scene</div>
        </div>

        <button
          onClick={cycleStage}
          disabled={busy}
          title="Tap to change planning stage"
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 750,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.04)",
            opacity: busy ? 0.5 : 0.85,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {STAGE_LABELS[planningStage] || "Intent"}
        </button>
      </Page>

      <Page>
        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : (
          <SceneForm
            initial={initial}
            participants={participants}
            ownedTools={ownedTools}
            busy={busy}
            err={err}
            submitLabel="Save"
            backTo="/scenes"
            showActions={false}
            onStateChange={(payload) => {
              latestPayloadRef.current = payload;

              const current = stableStringify(payload);

              // First canonical payload becomes baseline (so no false "dirty" from shape differences)
              if (!baselineRef.current) {
                baselineRef.current = current;
                setIsDirty(false);
                return;
              }

              setIsDirty(current !== baselineRef.current);
            }}
            onSubmit={async (payload) => {
              // not used in edit mode; kept for compatibility
              latestPayloadRef.current = payload;
              return { sceneId: id };
            }}
          />
        )}
      </Page>
    </div>
  );
}
