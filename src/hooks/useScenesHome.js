// src/hooks/useScenesHome.js
import { useEffect, useMemo, useState } from "react";
import { fetchSceneById, fetchScenes, updateScenePlanningStage } from "../lib/scenesApi";

/* ---------------- module cache to reduce jank ----------------
   - Keeps list + per-scene details across unmount/remount (tab switches)
   - Enables silent refresh without flipping the whole screen into Loading…
*/
let scenesHomeCache = {
  scenes: null, // array
  details: null, // map { [sceneId]: { status, data, error } }
  ts: 0,
};

/* ---------------- planning stage helpers ---------------- */

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

export function nextPlanningStage(current) {
  const idx = PLANNING_STAGES.indexOf(current);
  if (idx === -1) return PLANNING_STAGES[0];
  return PLANNING_STAGES[(idx + 1) % PLANNING_STAGES.length];
}

/* ---------------- hook ---------------- */

export default function useScenesHome() {
  const hasCache = Array.isArray(scenesHomeCache.scenes);

  const [loading, setLoading] = useState(() => !hasCache);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState(() => scenesHomeCache.scenes || []);
  const [openScenes, setOpenScenes] = useState(() => new Set());
  const [details, setDetails] = useState(() => scenesHomeCache.details || {});

  const countLabel = useMemo(() => {
    if (loading) return "Loading scenes…";
    const n = scenes.length;
    return `${n} scene${n === 1 ? "" : "s"}`;
  }, [loading, scenes]);

  function persistCache(nextScenes, nextDetails) {
    scenesHomeCache = {
      scenes: Array.isArray(nextScenes) ? nextScenes : scenesHomeCache.scenes,
      details: nextDetails ? nextDetails : scenesHomeCache.details,
      ts: Date.now(),
    };
  }

  async function reload(opts = {}) {
    const silent = !!opts.silent;

    // If we already have something to show, don't flip the screen into a "Loading…" state.
    const hasExisting = Array.isArray(scenes) && scenes.length > 0;

    if (!silent || !hasExisting) setLoading(true);

    setErr("");
    try {
      const data = await fetchScenes();
      const nextScenes = data || [];
      setScenes(nextScenes);
      persistCache(nextScenes, details);
    } catch (e) {
      setErr(e?.message || "Failed to load scenes.");
    } finally {
      if (!silent || !hasExisting) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await reload({ silent: hasCache });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureDetails(sceneId, opts = {}) {
    const force = !!opts.force;

    // Check local first…
    const existingLocal = details?.[sceneId];
    if (!force && (existingLocal?.status === "loading" || existingLocal?.status === "ready")) return;

    // …then check module cache in case we remounted.
    const existingCached = scenesHomeCache.details?.[sceneId];
    if (!force && existingCached?.status === "ready") {
      setDetails((prev) => {
        const next = { ...prev, [sceneId]: existingCached };
        persistCache(scenes, next);
        return next;
      });
      return;
    }
    if (!force && existingCached?.status === "loading") return;

    setDetails((prev) => {
      const next = { ...prev, [sceneId]: { status: "loading" } };
      persistCache(scenes, next);
      return next;
    });

    try {
      const full = await fetchSceneById(sceneId);
      setDetails((prev) => {
        const next = { ...prev, [sceneId]: { status: "ready", data: full } };
        persistCache(scenes, next);
        return next;
      });
    } catch (e) {
      setDetails((prev) => {
        const next = {
          ...prev,
          [sceneId]: {
            status: "error",
            error: e?.message || "Failed to load scene details.",
          },
        };
        persistCache(scenes, next);
        return next;
      });
    }
  }

  function toggleSceneOpen(sceneId) {
    setOpenScenes((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) next.delete(sceneId);
      else next.add(sceneId);
      return next;
    });
  }

  function openScene(sceneId) {
    setOpenScenes((prev) => {
      const next = new Set(prev);
      next.add(sceneId);
      return next;
    });
  }

  function closeScene(sceneId) {
    setOpenScenes((prev) => {
      const next = new Set(prev);
      next.delete(sceneId);
      return next;
    });
  }

  async function cyclePlanningStage(scene) {
    const current = scene?.planning_stage || "intent";
    const next = nextPlanningStage(current);

    try {
      await updateScenePlanningStage(scene.id, next);
      setScenes((prev) => {
        const nextScenes = prev.map((s) => (s.id === scene.id ? { ...s, planning_stage: next } : s));
        persistCache(nextScenes, details);
        return nextScenes;
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteScene(sceneId, title) {
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    setErr("");
    try {
      const { supabase } = await import("../lib/supabaseClient.js").then((m) => m);

      await supabase.from("scene_participants").delete().eq("scene_id", sceneId);
      await supabase.from("scene_tools").delete().eq("scene_id", sceneId);
      await supabase.from("scene_blocks").delete().eq("scene_id", sceneId);
      await supabase.from("scenes").delete().eq("id", sceneId);

      closeScene(sceneId);

      setDetails((prev) => {
        const next = { ...prev };
        delete next[sceneId];
        persistCache(scenes, next);
        return next;
      });

      await reload({ silent: true });
    } catch (e) {
      setErr(e?.message || "Could not delete scene.");
    } finally {
      setBusy(false);
    }
  }

  return {
    loading,
    busy,
    err,
    scenes,
    details,
    openScenes,
    countLabel,

    // actions
    reload,
    ensureDetails,
    toggleSceneOpen,
    openScene,
    closeScene,
    cyclePlanningStage,
    deleteScene,
  };
}
