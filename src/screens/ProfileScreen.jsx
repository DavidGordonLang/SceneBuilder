// src/screens/ProfileScreen.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SmallButton } from "../components/routesUi";
import Page from "../components/Page";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";

/**
 * Cache signed avatar URLs by storage path.
 * Avoids re-fetch + flicker every time Profile tab mounts.
 *
 * Enhancement:
 * - persist the signed URL cache in localStorage so first open after reload
 *   can be instant (as long as the signed URL hasn't expired).
 */

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

    // sanitize
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
    // cap size to avoid unbounded growth
    const entries = Object.entries(avatarSignedUrlCache || {});
    // sort by newest expiry first
    entries.sort((a, b) => Number(b[1]?.expiresAtMs || 0) - Number(a[1]?.expiresAtMs || 0));
    const capped = entries.slice(0, 25);

    const obj = {};
    for (const [k, v] of capped) obj[k] = v;
    localStorage.setItem(AVATAR_URL_LS_KEY, JSON.stringify(obj));
  } catch {
    // ignore (private mode etc)
  }
}

// load once at module init
if (typeof window !== "undefined") {
  readAvatarCacheFromStorage();
}

function getCachedAvatarUrl(path) {
  const key = String(path || "").trim();
  if (!key) return "";
  const hit = avatarSignedUrlCache[key];
  if (!hit?.url || !hit?.expiresAtMs) return "";
  if (Date.now() >= hit.expiresAtMs) return "";
  return hit.url;
}

function setCachedAvatarUrl(path, url, ttlSeconds) {
  const key = String(path || "").trim();
  if (!key) return;
  const safeTtl = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 3600;
  // shave a little off so we don't ride the exact expiry edge
  const expiresAtMs = Date.now() + (safeTtl - 30) * 1000;
  avatarSignedUrlCache[key] = { url: String(url || ""), expiresAtMs };
  writeAvatarCacheToStorage();
}

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.3 }}>{hint}</div> : null}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
      }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
        resize: "vertical",
        minHeight: 80,
      }}
    />
  );
}

function SkeletonText({ width = "70%", height = 12 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 999,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  );
}

export default function ProfileScreen({ session, supabase }) {
  const navigate = useNavigate();
  const location = useLocation();

  const userId = session?.user?.id;
  const { profile, loading, error, updateProfile } = useProfile({ supabase, userId });
  const { uploadAvatar, uploading } = useAvatarUpload({ supabase, userId });

  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [signedAvatarUrl, setSignedAvatarUrl] = useState("");
  const [busySave, setBusySave] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [localOk, setLocalOk] = useState("");

  // View vs Edit mode
  const searchParams = new URLSearchParams(location.search || "");
  const shouldStartEditing = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(shouldStartEditing);

  useEffect(() => {
    setEditing(shouldStartEditing);
  }, [shouldStartEditing]);

  const initials = useMemo(() => {
    const base = (profile?.display_name || session?.user?.email || "U").trim();
    return base.slice(0, 1).toUpperCase();
  }, [profile?.display_name, session?.user?.email]);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
  }, [profile?.display_name, profile?.bio]);

  // Signed avatar URL: use cache immediately, refresh only if needed.
  useEffect(() => {
    let cancelled = false;

    async function run(path) {
      if (!supabase) return;

      const cached = getCachedAvatarUrl(path);
      if (cached) {
        setSignedAvatarUrl(cached);
        return;
      }

      try {
        const ttl = 60 * 60;
        const { data, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(path, ttl);
        if (sErr) throw sErr;

        const nextUrl = data?.signedUrl || "";
        if (!cancelled) {
          if (nextUrl) {
            setSignedAvatarUrl(nextUrl);
            setCachedAvatarUrl(path, nextUrl, ttl);
          } else {
            setSignedAvatarUrl("");
          }
        }
      } catch (_e) {
        if (!cancelled) {
          // Keep whatever we had if possible (prevents flicker on transient failures)
          const fallback = getCachedAvatarUrl(path);
          if (fallback) setSignedAvatarUrl(fallback);
          else setSignedAvatarUrl("");
        }
      }
    }

    const path = String(profile?.avatar_url || "").trim();
    if (!path) {
      setSignedAvatarUrl("");
      return () => {
        cancelled = true;
      };
    }

    run(path);

    return () => {
      cancelled = true;
    };
  }, [supabase, profile?.avatar_url]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function handleSave() {
    setLocalErr("");
    setLocalOk("");
    setBusySave(true);

    try {
      await updateProfile({
        display_name: (displayName || "").slice(0, 120),
        bio: (bio || "").slice(0, 140),
      });

      setLocalOk("Saved.");
      setEditing(false);

      // Strip edit params after save so refresh stays clean
      if (location.search) {
        navigate("/profile", { replace: true });
      }
    } catch (e) {
      setLocalErr(e?.message || "Save failed.");
    } finally {
      setBusySave(false);
    }
  }

  function handleStartEdit() {
    setLocalErr("");
    setLocalOk("");
    setEditing(true);
  }

  function handleCancelEdit() {
    setLocalErr("");
    setLocalOk("");
    // revert drafts to stored profile values
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setEditing(false);

    if (location.search) {
      navigate("/profile", { replace: true });
    }
  }

  function handlePickAvatar() {
    setLocalErr("");
    setLocalOk("");
    fileRef.current?.click?.();
  }

  async function handleAvatarFile(e) {
    setLocalErr("");
    setLocalOk("");

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = await uploadAvatar(file);
      await updateProfile({ avatar_url: path });

      const ttl = 60 * 60;
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, ttl);
      const nextUrl = data?.signedUrl || "";
      setSignedAvatarUrl(nextUrl);
      if (nextUrl) setCachedAvatarUrl(path, nextUrl, ttl);

      setLocalOk("Avatar updated.");
    } catch (err) {
      setLocalErr(err?.message || "Avatar update failed.");
    } finally {
      e.target.value = "";
    }
  }

  const busy = loading || uploading || busySave;
  const showSkeleton = loading && !profile;

  // Onboarding label: avoid "Not complete" flash by not showing until profile is loaded.
  const onboardingLabel = profile ? (profile.onboarding_complete ? "Complete" : "Not complete") : "";

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Contextual actions row (Profile keeps sign out; no TopBar; no back) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {!editing ? (
              <SmallButton onClick={handleStartEdit} disabled={busy} title="Edit profile">
                Edit
              </SmallButton>
            ) : (
              <>
                <SmallButton onClick={handleCancelEdit} disabled={busy} title="Cancel editing">
                  Cancel
                </SmallButton>
                <SmallButton onClick={handleSave} disabled={busy} title="Save changes">
                  {busySave ? "Saving..." : "Save"}
                </SmallButton>
              </>
            )}
          </div>

          <SmallButton tone="danger" onClick={signOut} title="Sign out">
            Sign out
          </SmallButton>
        </div>

        {error || localErr ? (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              fontSize: 13,
            }}
          >
            {localErr || error}
          </div>
        ) : null}

        {localOk ? (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(120,255,170,0.25)",
              background: "rgba(120,255,170,0.08)",
              fontSize: 13,
            }}
          >
            {localOk}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "96px 1fr",
            gap: 14,
            alignItems: "center",
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            {signedAvatarUrl ? (
              <img src={signedAvatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              initials
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Signed in as <b>{session?.user?.email}</b>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SmallButton onClick={handlePickAvatar} disabled={busy} title="Change avatar">
                {uploading ? "Uploading..." : "Change avatar"}
              </SmallButton>

              <SmallButton asLink to="/profile/kinks" title="Edit kink preferences">
                Edit kink preferences
              </SmallButton>
            </div>

            {/* Only show onboarding status once we actually have a profile row */}
            {profile ? (
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                Onboarding: <b>{onboardingLabel}</b>
              </div>
            ) : null}
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
        </div>

        {/* Edit fields */}
        {editing ? (
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Display name">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. David"
                maxLength={120}
              />
            </Field>

            <Field label="Short bio" hint={`${(bio || "").length}/140`}>
              <TextArea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Optional. Max 140 characters."
                maxLength={140}
              />
            </Field>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, opacity: 0.9 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Display name</div>
              {showSkeleton ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <SkeletonText width="55%" />
                </div>
              ) : (
                <div style={{ marginTop: 4 }}>{profile?.display_name || "—"}</div>
              )}
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Bio</div>
              {showSkeleton ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <SkeletonText width="88%" height={10} />
                  <SkeletonText width="76%" height={10} />
                </div>
              ) : (
                <div style={{ marginTop: 4, opacity: 0.9 }}>{profile?.bio || "—"}</div>
              )}
            </div>
          </div>
        )}

        {/* Avoid showing the onboarding CTA until profile is loaded, otherwise it flashes */}
        {profile && !profile.onboarding_complete ? (
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              fontSize: 13,
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            Your onboarding isn’t marked complete yet. You can do it now, or later.
            <div style={{ marginTop: 10 }}>
              <SmallButton asLink to="/onboarding" title="Start onboarding">
                Start onboarding
              </SmallButton>
            </div>
          </div>
        ) : null}
      </Page>
    </div>
  );
}
