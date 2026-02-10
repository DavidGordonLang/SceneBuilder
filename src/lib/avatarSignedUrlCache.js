// src/lib/avatarSignedUrlCache.js

const AVATAR_URL_LS_KEY = "scenebuilder.avatarSignedUrlCache.v1";

let avatarSignedUrlCache = {
  // [path]: { url, expiresAtMs }
};

function readAvatarCacheFromStorage() {
  try {
    const raw = localStorage.getItem(AVATAR_URL_LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    const next = {};
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      const path = String(k || "").trim();
      if (!path) continue;
      const url = String(v?.url || "");
      const expiresAtMs = Number(v?.expiresAtMs || 0);
      if (!url || !expiresAtMs) continue;
      if (expiresAtMs <= now) continue;
      next[path] = { url, expiresAtMs };
    }
    avatarSignedUrlCache = next;
  } catch {
    // ignore
  }
}

function writeAvatarCacheToStorage() {
  try {
    const entries = Object.entries(avatarSignedUrlCache || {});
    entries.sort((a, b) => Number(b[1]?.expiresAtMs || 0) - Number(a[1]?.expiresAtMs || 0));
    const capped = entries.slice(0, 25);

    const obj = {};
    for (const [k, v] of capped) obj[k] = v;
    localStorage.setItem(AVATAR_URL_LS_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

if (typeof window !== "undefined") {
  readAvatarCacheFromStorage();
}

export function getCachedAvatarUrl(path) {
  const key = String(path || "").trim();
  if (!key) return "";
  const hit = avatarSignedUrlCache[key];
  if (!hit?.url || !hit?.expiresAtMs) return "";
  if (Date.now() >= hit.expiresAtMs) return "";
  return hit.url;
}

export function setCachedAvatarUrl(path, url, ttlSeconds) {
  const key = String(path || "").trim();
  if (!key) return;
  const safeTtl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 3600;
  const expiresAtMs = Date.now() + (safeTtl - 30) * 1000;
  avatarSignedUrlCache[key] = { url: String(url || ""), expiresAtMs };
  writeAvatarCacheToStorage();
}