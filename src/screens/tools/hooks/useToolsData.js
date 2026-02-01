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
import { getCachedTools, setCachedTools } from "../../../lib/appDataCache";

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

export function useToolsData({ session } = {}) {
  const userId = session?.user?.id;

  const cached = userId ? getCachedTools(userId) : null;
  const hasCache = !!(cached && Array.isArray(cached.vault) && Array.isArray(cached.userTools));

  const [tab, setTab] = useState("drawer"); // drawer | vault
  const [loading, setLoading] = useState(() => Boolean(userId) && !hasCache);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [vault, setVault] = useState(() => (hasCache ? cached.vault : null));
  const [userTools, setUserTools] = useState(() => (hasCache ? cached.userTools : null));

  const vaultArr = Array.isArray(vault) ? vault : [];
  const userToolsArr = Array.isArray(userTools) ? userTools : [];

  // Per-instance UI state
  const [draftLabel, setDraftLabel] = useState({}); // { [tools_user_id]: string }
  const [photoUrlById, setPhotoUrlById] = useState({}); // { [tools_user_id]: signedUrl }
  const [photoPathById, setPhotoPathById] = useState({}); // { [tools_user_id]: photo_path last loaded }

  async function reload(opts = {}) {
    const silentRequested = !!opts.silent;
    const hasExisting = vaultArr.length > 0 || userToolsArr.length > 0;
    const silent = silentRequested && hasExisting;

    if (!silent) setLoading(true);

    setErr("");
    try {
      const [v, ut] = await Promise.all([fetchToolVault(), fetchUserTools()]);
      setVault(v);
      setUserTools(ut);
      if (userId) setCachedTools(userId, v, ut);
    } catch (e) {
      setErr(e?.message || "Failed to load tools.");
      if (vault === null) setVault([]);
      if (userTools === null) setUserTools([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;

    // Rehydrate immediately from persisted cache (hard refresh safe)
    const persisted = getCachedTools(userId);
    if (persisted && Array.isArray(persisted.vault) && Array.isArray(persisted.userTools)) {
      setVault(persisted.vault);
      setUserTools(persisted.userTools);
      setLoading(false);
      reload({ silent: true });
    } else {
      setVault(null);
      setUserTools(null);
      reload({ silent: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const owned = useMemo(() => userToolsArr.filter((t) => t.status === "owned"), [userToolsArr]);
  const craving = useMemo(() => userToolsArr.filter((t) => t.status === "craving"), [userToolsArr]);

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
      await reload({ silent: true });
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
      await reload({ silent: true });
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
      await reload({ silent: true });
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
      await reload({ silent: true });
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
      console.warn("Failed to load signed tool photo URL:", e);
    }
  }

  async function saveLabel(toolUserId) {
    const nextLabel = String(draftLabel?.[toolUserId] ?? "").trim();
    setErr("");
    setBusy(true);
    try {
      await updateUserToolInstanceDetails(toolUserId, { instance_label: nextLabel || null });
      await reload({ silent: true });
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
      const path = await uploadToolPhoto(toolUserId, file);
      await updateUserToolInstanceDetails(toolUserId, { photo_path: path });

      // We'll refresh, but also prime local state so image can show immediately
      setPhotoPathById((prev) => ({ ...prev, [toolUserId]: path }));

      try {
        const signedUrl = await getToolPhotoSignedUrl(path);
        setPhotoUrlById((prev) => ({ ...prev, [toolUserId]: signedUrl || null }));
      } catch {
        // non-fatal
      }

      await reload({ silent: true });
    } catch (e) {
      setErr(e?.message || "Could not upload photo.");
    } finally {
      setBusy(false);
    }
  }

  return {
    tab,
    setTab,
    loading,
    busy,
    err,

    vault: vaultArr,
    userTools: userToolsArr,
    owned,
    craving,
    ownedGroups,
    cravingGroups,
    ownedGlobalIds,
    cravingGlobalIds,

    draftLabel,
    setDraftLabel,
    photoUrlById,
    photoPathById,

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
