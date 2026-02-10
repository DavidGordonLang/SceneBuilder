import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SmallButton } from "../components/routesUi";
import Page from "../components/Page";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";
import ConnectionsCard from "../components/profile/ConnectionsCard";
import { usePartnerConnections } from "../hooks/usePartnerConnections";
import KinksPreviewModal from "../components/profile/KinksPreviewModal";
import TopKinksCard from "../components/profile/TopKinksCard";
import ProfileHeaderCard from "../components/profile/ProfileHeaderCard";

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

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const [busySave, setBusySave] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [localOk, setLocalOk] = useState("");

  const searchParams = new URLSearchParams(location.search || "");
  const shouldStartEditing = searchParams.get("edit") === "1";
  const [editing, setEditing] = useState(shouldStartEditing);

  const [kinksModal, setKinksModal] = useState(null);

  const pc = usePartnerConnections({ supabase, userId });

  useEffect(() => {
    setEditing(shouldStartEditing);
  }, [shouldStartEditing]);

  // ✅ FIX: Do NOT overwrite draft edits while editing.
  useEffect(() => {
    if (editing) return;

    setUsername(profile?.username || "");
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
  }, [editing, profile?.username, profile?.display_name, profile?.bio]);

  useEffect(() => {
    pc.loadConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function handleSave() {
    setLocalErr("");
    setLocalOk("");
    setBusySave(true);

    try {
      await updateProfile({
        username: (username || "").slice(0, 24),
        display_name: (displayName || "").slice(0, 120),
        bio: (bio || "").slice(0, 140),
      });

      setLocalOk("Saved.");
      setEditing(false);

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
    setUsername(profile?.username || "");
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setEditing(false);

    if (location.search) {
      navigate("/profile", { replace: true });
    }
  }

  const busy = loading || uploading || busySave;
  const showSkeleton = loading && !profile;

  const topKinks = useMemo(() => {
    const v = profile?.top_kinks;
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).slice(0, 5);
    return [];
  }, [profile?.top_kinks]);

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
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

        <ProfileHeaderCard
          supabase={supabase}
          session={session}
          profile={profile}
          busy={busy}
          uploading={uploading}
          uploadAvatar={uploadAvatar}
          updateProfile={updateProfile}
          SmallButton={SmallButton}
          setLocalErr={setLocalErr}
          setLocalOk={setLocalOk}
        />

        {editing ? (
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Username" hint="Letters A–Z, a–z, 0–9, underscore. Unique. Used for search.">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. David_01"
                maxLength={24}
              />
            </Field>

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
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Username</div>
              {showSkeleton ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <SkeletonText width="45%" />
                </div>
              ) : (
                <div style={{ marginTop: 4 }}>{profile?.username || "—"}</div>
              )}
            </div>

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

        <TopKinksCard
          SmallButton={SmallButton}
          topKinks={topKinks}
          hasAnyKinks={Boolean(profile?.top_kinks)}
          onOpenKinks={() => navigate("/profile/kinks")}
        />

        <ConnectionsCard
          SmallButton={SmallButton}
          userId={userId}
          connLoading={pc.connLoading}
          connErr={pc.connErr}
          connOk={pc.connOk}
          connections={pc.connections}
          partnerProfilesById={pc.partnerProfilesById}
          incomingRequests={pc.incomingRequests}
          outgoingRequests={pc.outgoingRequests}
          partnerQuery={pc.partnerQuery}
          partnerSearchBusy={pc.partnerSearchBusy}
          partnerResults={pc.partnerResults}
          partnerSearchRawCount={pc.partnerSearchRawCount}
          setPartnerQuery={pc.setPartnerQuery}
          loadConnections={pc.loadConnections}
          doSearchPartners={pc.doSearchPartners}
          sendRequest={pc.sendRequest}
          acceptRequest={pc.acceptRequest}
          revokeLink={pc.revokeLink}
          helpers={pc.helpers}
          onOpenKinksPreview={(name) => setKinksModal({ name })}
        />
      </Page>

      <KinksPreviewModal SmallButton={SmallButton} modal={kinksModal} onClose={() => setKinksModal(null)} />
    </div>
  );
}