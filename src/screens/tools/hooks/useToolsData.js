import { useEffect, useMemo, useState } from "react";
import {
  addGlobalToolToUser,
  deleteUserTool,
  fetchToolVault,
  fetchUserTools,
  getToolPhotoSignedUrl,
  updateUserToolInstanceDetails,
  updateUserToolStatus,
  uploadToolPhoto,
} from "../../../lib/toolsApi";

function groupKeyForToolUser(tu) {
  if (tu?.tool_global_id) return `g:${tu.tool_global_id}`;
  const base = String(tu?.custom_name || "").trim();
  return base ? `c:${base.toLowerCase()}` : `u:${tu.id}`;
}

function groupLabelForToolUser(tu) {
  const g = tu?.tools_global;
  return g?.name || tu?.custom_name || "Untitled";
}

function groupIconForToolUser(tu) {
  const g = tu?.tools_global;
  return g?.icon || tu?.custom_icon || "🧰";
}

export function useToolsData() {
  const [tab, setTab] = useState("drawer"); // drawer | vault
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [vault, setVault] = useState([]);
  const [userTools, setUserTools] = useState([]);

  // Per-instance UI state
  const [draftLabel, setDraftLabel] = useState({}); // { [tools_user_id]: string }
  const [photoUrlById, setPhotoUrlById] = useState({}); // { [tools_user_id]: signedUrl }
  const [photoPathById, setPhotoPathById] = useState({}); // { [tools_user_id]: photo_path last loaded }

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const [v, ut] = await Promise.all([fetchToolVault(), fetchUserTools()]);
      setVault(v);
      setUserTools(ut);
    } catch (e) {
      setErr(e?.message || "Failed to load tools.");
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
  }, []);

  const owned = useMemo(() => userTools.filter((t) => t.status === "owned"), [userTools]);
  const craving = useMemo(() => userTools.filter((t) => t.status === "craving"), [userTools]);

  const ownedGlobalIds = useMemo(() => {
    const s = new Set();
    for (const t of owned) if (t.tool_global_id) s.add(t.tool_global_id);
    return s;
  }, [owned]);

  const cravingGlobalIds = useMemo(() => {
    const s = new Set();
    for (const t of craving) if (t.tool_global_id) s.add(t.tool_global_id);
    return s;
  }, [craving]);

  const ownedGroups = useMemo(() => {
    const map = new Map();
    for (const t of owned) {
      const key = groupKeyForToolUser(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const arr = Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      name: groupLabelForToolUser(items[0]),
      icon: groupIconForToolUser(items[0]),
      tool_global_id: items[0]?.tool_global_id || null,
      isCustom: !items[0]?.tool_global_id,
    }));
    arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return arr;
  }, [owned]);

  const cravingGroups = useMemo(() => {
    const map = new Map();
    for (const t of craving) {
      const key = groupKeyForToolUser(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const arr = Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      name: groupLabelForToolUser(items[0]),
      icon: groupIconForToolUser(items[0]),
      tool_global_id: items[0]?.tool_global_id || null,
      isCustom: !items[0]?.tool_global_id,
    }));
    arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return arr;
  }, [craving]);

  async function addTo(status, toolGlobalId) {
    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(toolGlobalId, status);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not add tool.");
    } finally {
      setBusy(false);
    }
  }

  async function addAnotherInstance(status, toolGlobalId) {
    if (!toolGlobalId) return;
    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(toolGlobalId, status);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not add another instance.");
    } finally {
      setBusy(false);
    }
  }

  async function moveCravingToOwned(toolUserId) {
    setErr("");
    setBusy(true);
    try {
      await updateUserToolStatus(toolUserId, "owned");
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not move tool.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFromDrawer(toolUserId, label) {
    const ok = window.confirm(`Remove "${label}" from your drawer?`);
    if (!ok) return;

    setErr("");
    setBusy(true);
    try {
      await deleteUserTool(toolUserId);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not remove tool.");
    } finally {
      setBusy(false);
    }
  }

  async function ensureSignedPhotoUrl(toolUserId, photo_path) {
    const path = String(photo_path || "").trim();
    if (!path) return;

    if (photoPathById?.[toolUserId] === path && photoUrlById?.[toolUserId]) return;

    try {
      const signedUrl = await getToolPhotoSignedUrl(path);
      setPhotoPathById((prev) => ({ ...prev, [toolUserId]: path }));
      setPhotoUrlById((prev) => ({ ...prev, [toolUserId]: signedUrl }));
    } catch (e) {
      // non-fatal
      console.warn("Failed to load signed tool photo URL:", e);
    }
  }

  async function saveLabel(toolUserId) {
    const nextLabel = String(draftLabel?.[toolUserId] ?? "").trim();
    setErr("");
    setBusy(true);
    try {
      await updateUserToolInstanceDetails(toolUserId, { instance_label: nextLabel || null });
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not save label.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(toolUserId, file) {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const { photo_path, signedUrl } = await uploadToolPhoto(toolUserId, file);
      await updateUserToolInstanceDetails(toolUserId, { photo_path });
      setPhotoPathById((prev) => ({ ...prev, [toolUserId]: photo_path }));
      setPhotoUrlById((prev) => ({ ...prev, [toolUserId]: signedUrl || null }));
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not upload photo.");
    } finally {
      setBusy(false);
    }
  }

  // --- ToolsHome compatibility wrappers (minimal surface) ---
  // ToolsHome was refactored to expect a slightly different API. We provide stable aliases here
  // so screens can evolve without breaking builds.
  async function refresh() {
    return reload();
  }

  async function createNew(payload) {
    const tool_global_id = payload?.tool_global_id;
    const status = payload?.status || "owned";
    const instance_label = payload?.instance_label;

    if (!tool_global_id) throw new Error("Missing tool type.");

    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(tool_global_id, status, {
        instance_label: instance_label ? String(instance_label).trim() : null,
      });
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not create tool.");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function updateExisting(toolUserId, payload) {
    if (!toolUserId) return;
    setErr("");
    setBusy(true);
    try {
      await updateUserToolInstanceDetails(toolUserId, payload || {});
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not update tool.");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function deleteExisting(toolUserId) {
    if (!toolUserId) return;
    setErr("");
    setBusy(true);
    try {
      await deleteUserTool(toolUserId);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not delete tool.");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  return {
    // view state
    tab,
    setTab,
    loading,
    busy,
    err,

    // data
    vault,
    userTools,
    owned,
    craving,
    ownedGroups,
    cravingGroups,
    ownedGlobalIds,
    cravingGlobalIds,

    // ToolsHome compatibility aliases
    ownedTools: owned,
    refresh,
    createNew,
    updateExisting,
    deleteExisting,

    // instance ui state
    draftLabel,
    setDraftLabel,
    photoUrlById,
    photoPathById,

    // actions
    reload,
    addTo,
    addAnotherInstance,
    moveCravingToOwned,
    removeFromDrawer,
    ensureSignedPhotoUrl,
    saveLabel,
    handleUpload,
  };
}
