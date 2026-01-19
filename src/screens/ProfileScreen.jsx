import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";

function TopBarLite({ title, rightSlot }) {
  return (
    <div
      style={{
        padding: 16,
        paddingTop: 18,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{rightSlot}</div>
    </div>
  );
}

function SmallButton({ children, onClick, disabled, asLink, to }) {
  const base = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
    color: "#f3f3f7",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 700,
    opacity: disabled ? 0.55 : 1,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  if (asLink) {
    return (
      <Link to={to} style={base}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} style={base}>
      {children}
    </button>
  );
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

export default function ProfileScreen({ session, supabase }) {
  const navigate = useNavigate();
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

  const initials = useMemo(() => {
    const base = (profile?.display_name || session?.user?.email || "U").trim();
    return base.slice(0, 1).toUpperCase();
  }, [profile?.display_name, session?.user?.email]);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
  }, [profile?.display_name, profile?.bio]);

  // Create signed URL for private avatar bucket
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setSignedAvatarUrl("");

      const path = profile?.avatar_url;
      if (!path) return;

      try {
        const { data, error: sErr } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60); // 1 hour

        if (sErr) throw sErr;
        if (!cancelled) setSignedAvatarUrl(data?.signedUrl || "");
      } catch (_e) {
        if (!cancelled) setSignedAvatarUrl("");
      }
    }

    if (supabase && profile?.avatar_url) run();
    return () => {
      cancelled = true;
    };
  }, [supabase, profile?.avatar_url]);

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
    } catch (e) {
      setLocalErr(e?.message || "Save failed.");
    } finally {
      setBusySave(false);
    }
  }

  async function handlePickAvatar() {
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

      // Refresh signed URL immediately
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
      setSignedAvatarUrl(data?.signedUrl || "");

      setLocalOk("Avatar updated.");
    } catch (err) {
      setLocalErr(err?.message || "Avatar update failed.");
    } finally {
      // allow re-selecting same file
      e.target.value = "";
    }
  }

  const busy = loading || uploading || busySave;

  return (
    <div style={{ minHeight: "100vh" }}>
      <TopBarLite
        title="Profile"
        rightSlot={
          <div style={{ display: "flex", gap: 8 }}>
            <SmallButton asLink to="/scenes">
              Back
            </SmallButton>
            <SmallButton onClick={handleSave} disabled={busy}>
              {busySave ? "Saving..." : "Save"}
            </SmallButton>
          </div>
        }
      />

      <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
        {error || localErr ? (
          <div
            style={{
              marginBottom: 12,
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
              marginBottom: 12,
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
            marginBottom: 14,
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
              <img
                src={signedAvatarUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, opacity: 0.75 }}>
              Signed in as <b>{session?.user?.email}</b>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SmallButton onClick={handlePickAvatar} disabled={busy}>
                {uploading ? "Uploading..." : "Change avatar"}
              </SmallButton>

              <SmallButton
                asLink
                to="/profile/kinks"
              >
                Edit kink preferences
              </SmallButton>
            </div>

            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Onboarding:{" "}
              <b>{profile?.onboarding_complete ? "Complete" : "Not complete"}</b>
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFile}
            style={{ display: "none" }}
          />
        </div>

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

        {!profile?.onboarding_complete ? (
          <div
            style={{
              marginTop: 14,
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
              <SmallButton asLink to="/onboarding">
                Start onboarding
              </SmallButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
