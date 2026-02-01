// src/lib/appDataCache.js
// In-memory + persisted caches for first-load stability.
// We keep caches user-scoped to avoid cross-account leakage.

import { readCache, writeCache } from "./persistedCache";

// Reasonable TTLs (seconds)
const TTL_SCENES = 60 * 10; // 10 min
const TTL_TOOLS = 60 * 10; // 10 min
const TTL_JOURNAL = 60 * 10; // 10 min
const TTL_PROFILE = 60 * 30; // 30 min

// In-memory mirrors (fastest)
let mem = {
  scenesByUserId: {}, // { [uid]: scenes[] }
  toolsByUserId: {}, // { [uid]: { vault: [], userTools: [] } }
  journalByUserId: {}, // { [uid]: entries[] }
  profileByUserId: {}, // { [uid]: profileRow }
};

function scenesKey(uid) {
  return `scenes:${uid}`;
}
function toolsKey(uid) {
  return `tools:${uid}`;
}
function journalKey(uid) {
  return `journal:${uid}`;
}
function profileKey(uid) {
  return `profile:${uid}`;
}

/* ---------------- Scenes ---------------- */

export function getCachedScenes(uid) {
  if (!uid) return null;
  if (Array.isArray(mem.scenesByUserId[uid])) return mem.scenesByUserId[uid];

  const persisted = readCache(scenesKey(uid));
  if (Array.isArray(persisted)) {
    mem.scenesByUserId[uid] = persisted;
    return persisted;
  }
  return null;
}

export function setCachedScenes(uid, scenes) {
  if (!uid) return;
  const safe = Array.isArray(scenes) ? scenes : [];
  mem.scenesByUserId[uid] = safe;
  writeCache(scenesKey(uid), safe, { ttlSeconds: TTL_SCENES });
}

/* ---------------- Tools ---------------- */

export function getCachedTools(uid) {
  if (!uid) return null;
  const hit = mem.toolsByUserId[uid];
  if (hit && Array.isArray(hit.vault) && Array.isArray(hit.userTools)) return hit;

  const persisted = readCache(toolsKey(uid));
  if (
    persisted &&
    Array.isArray(persisted.vault) &&
    Array.isArray(persisted.userTools)
  ) {
    mem.toolsByUserId[uid] = persisted;
    return persisted;
  }
  return null;
}

export function setCachedTools(uid, vault, userTools) {
  if (!uid) return;
  const safe = {
    vault: Array.isArray(vault) ? vault : [],
    userTools: Array.isArray(userTools) ? userTools : [],
  };
  mem.toolsByUserId[uid] = safe;
  writeCache(toolsKey(uid), safe, { ttlSeconds: TTL_TOOLS });
}

/* ---------------- Journal ---------------- */

export function getCachedJournal(uid) {
  if (!uid) return null;
  if (Array.isArray(mem.journalByUserId[uid])) return mem.journalByUserId[uid];

  const persisted = readCache(journalKey(uid));
  if (Array.isArray(persisted)) {
    mem.journalByUserId[uid] = persisted;
    return persisted;
  }
  return null;
}

export function setCachedJournal(uid, entries) {
  if (!uid) return;
  const safe = Array.isArray(entries) ? entries : [];
  mem.journalByUserId[uid] = safe;
  writeCache(journalKey(uid), safe, { ttlSeconds: TTL_JOURNAL });
}

/* ---------------- Profile ---------------- */

export function getCachedProfile(uid) {
  if (!uid) return null;
  if (mem.profileByUserId[uid]) return mem.profileByUserId[uid];

  const persisted = readCache(profileKey(uid));
  if (persisted && typeof persisted === "object") {
    mem.profileByUserId[uid] = persisted;
    return persisted;
  }
  return null;
}

export function setCachedProfile(uid, profileRow) {
  if (!uid) return;
  const safe = profileRow ?? null;
  mem.profileByUserId[uid] = safe;
  writeCache(profileKey(uid), safe, { ttlSeconds: TTL_PROFILE });
}
