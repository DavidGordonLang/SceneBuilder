// src/lib/persistedCache.js
// Small, versioned localStorage cache with TTL.
// Purpose: remove "first load" emptiness on hard refresh by rehydrating last-known data.

const NS = "scenebuilder";
const VERSION = 1;

function keyFor(k) {
  return `${NS}:v${VERSION}:${k}`;
}

export function readCache(key) {
  try {
    const raw = window.localStorage.getItem(keyFor(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    const now = Date.now();
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.expiresAtMs && now >= parsed.expiresAtMs) return null;

    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function writeCache(key, value, { ttlSeconds = 3600 } = {}) {
  try {
    const ttl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 3600;
    const expiresAtMs = Date.now() + ttl * 1000;

    const payload = {
      value,
      expiresAtMs,
      savedAtMs: Date.now(),
    };

    window.localStorage.setItem(keyFor(key), JSON.stringify(payload));
  } catch {
    // ignore (quota, privacy mode, etc.)
  }
}

export function clearCache(key) {
  try {
    window.localStorage.removeItem(keyFor(key));
  } catch {
    // ignore
  }
}
