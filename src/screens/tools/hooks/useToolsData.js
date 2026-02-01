// src/screens/tools/hooks/useToolsData.js

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

/* ---------------- module cache to reduce loading flash ----------------
   - Keeps vault + userTools across unmount/remount (tab switches)
   - Allows "silent refresh" without briefly showing empty-state UI
*/
let toolsCache = {
  vault: null, // array
  userTools: null, // array
  ts: 0,
};

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
  const hasCache =
    Array.isArray(toolsCache.vault) && Array.isArray(toolsCache.userTools);

  const [tab, setTab] = useState("drawer"); // drawer | vault

  // Key change: null means "unknown/not loaded yet"
  const [vault, setVault] = useState(() => (hasCache ? toolsCache.vault : null));
  const [userTools, setUserTools] = useState(() => (hasCache ? toolsCache.userTools : null));

  // loading should represent "first load pending" (unless we have cache)
  const [loading, setLoading] = useState(() => !hasCache);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Per-instance UI state
  const [draftLabel, setDraftLabel] = useState({}); // { [tools_user_id]: string }
  const [photoUrlById, setPhotoUrlById] = useState({}); // { [tools_user_id]: signedUrl }
  const [photoPathById, setPhotoPathById] = useState({}); // { [tools_user_id]: photo_path last loaded }

  const drawerKnown = userTools !== null;
  const vaultKnown = vault !== null;

  function persistCache(nextVault, nextUserTools) {
    toolsCache = {
      vault: Array.isArray(nextVault) ? nextVault : toolsCache.vault,
      userTools: Array.isArray(nextUserTools) ? nextUserTools : toolsCache.userTools,
      ts: Date.now(),
    };
  }

  async function reload(opts = {}) {
    const silent = !!opts.silent;

    // If we already have known data, don't flip the whole screen into loading on a silent refresh.
    const hasKnownData = drawerKnown && vaultKnown;

    if (!silent || !hasKnownData) setLoading(true);

    setErr("");
    try {
      const [v, ut] = await Promise.all([fetchToolVault(), fetchUserTools()]);
      const nextV = Array.isArray(v) ? v : [];
      const nextUT = Array.isArray(ut) ? ut : [];

      setVault(nextV);
      setUserTools(nextUT);
      persistCache(nextV, nextUT);
    } catch (e) {
      setErr(e?.message || "Failed to load tools.");

      // On first load failure, mark as known-empty so we don't remain in "unknown" forever.
      // On silent refresh failure, keep existing data (no regressions / no flash).
      if (!hasKnownData) {
        setVault([]);
        setUserTools([]);
        persistCache([], []);
      }
    } finally {
      if (!silent || !hasKnownData) setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;

      // If we have cache, don't show Loading/empty-state flash.
      // Still do a silent refresh to keep data accurate.
      await reload({ silent: hasCache });

      if (!alive) return;

      // If we had cache, ensure loading is false immediately (we're showing cached data)
      if (hasCache) setLoading(false);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owned = useMemo(() => {
    const arr = Array.isArray(userTools) ? userTools : [];
    return arr.filter((t) => t.status === "owned");
  }, [userTools]);

  const craving = useMemo(() => {
    const arr = Array.isArray(userTools) ? userTools : [];
    return arr.filter((t) => t.status === "craving");
  }, [userTools]);

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
      const { photo_path, signedUrl } = await uploadToolPhoto(toolUserId, file);
      await updateUserToolInstanceDetails(toolUserId, { photo_path });
      setPhotoPathById((prev) => ({ ...prev, [toolUserId]: photo_path }));
      setPhotoUrlById((prev) => ({ ...prev, [toolUserId]: signedUrl || null }));
      await reload({ silent: true });
    } catch (e) {
      setErr(e?.message || "Could not upload photo.");
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

    // known/unknown flags (useful for UI gating)
    drawerKnown,
    vaultKnown,

    // data
    vault: Array.isArray(vault) ? vault : [],
    userTools: Array.isArray(userTools) ? userTools : [],
    owned,
    craving,
    ownedGroups,
    cravingGroups,
    ownedGlobalIds,
    cravingGlobalIds,

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
