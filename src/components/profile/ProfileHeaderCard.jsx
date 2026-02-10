import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCachedAvatarUrl, setCachedAvatarUrl } from "../../lib/avatarSignedUrlCache";

export default function ProfileHeaderCard({
  supabase,
  session,
  profile,
  busy,
  uploading,
  uploadAvatar,
  updateProfile,
  SmallButton,
  setLocalErr,
  setLocalOk,
}) {
  const fileRef = useRef(null);
  const [signedAvatarUrl, setSignedAvatarUrl] = useState("");

  const initials = useMemo(() => {
    const base = (profile?.display_name || profile?.username || session?.user?.email || "U").trim();
    return base.slice(0, 1).toUpperCase();
  }, [profile?.display_name, profile?.username, session?.user?.email]);

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
      } catch {
        if (!cancelled) {
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

  function handlePickAvatar() {
    setLocalErr?.("");
    setLocalOk?.("");
    fileRef.current?.click?.();
  }

  async function handleAvatarFile(e) {
    setLocalErr?.("");
    setLocalOk?.("");

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

      setLocalOk?.("Avatar updated.");
    } catch (err) {
      setLocalErr?.(err?.message || "Avatar update failed.");
    } finally {
      e.target.value = "";
    }
  }

  const onboardingLabel = profile ? (profile.onboarding_complete ? "Complete" : "Not complete") : "";

  return (
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
            Kink preferences
          </SmallButton>
        </div>

        {profile ? (
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Onboarding: <b>{onboardingLabel}</b>
          </div>
        ) : null}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
    </div>
  );
}