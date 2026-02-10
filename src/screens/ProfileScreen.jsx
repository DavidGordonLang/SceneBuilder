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
import ProfileDetailsCard from "../components/profile/ProfileDetailsCard";
import ProfileActionsBar from "../components/profile/ProfileActionsBar";
import ProfileAlerts from "../components/profile/ProfileAlerts";

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
        <ProfileActionsBar
          SmallButton={SmallButton}
          editing={editing}
          busy={busy}
          busySave={busySave}
          onStartEdit={handleStartEdit}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          onSignOut={signOut}
        />

        <ProfileAlerts error={error} localErr={localErr} localOk={localOk} />

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

        <ProfileDetailsCard
          editing={editing}
          profile={profile}
          showSkeleton={showSkeleton}
          username={username}
          setUsername={setUsername}
          displayName={displayName}
          setDisplayName={setDisplayName}
          bio={bio}
          setBio={setBio}
        />

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