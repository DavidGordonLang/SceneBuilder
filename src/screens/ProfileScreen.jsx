// src/screens/ProfileScreen.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SmallButton } from "../components/routesUi";
import Page from "../components/Page";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";
import { useSignedAvatarUrl } from "../hooks/useSignedAvatarUrl";
import { usePartnerConnections } from "../hooks/usePartnerConnections";
import { setCachedAvatarUrl } from "../lib/avatarSignedUrlCache";
import { Card, Field, Input, MiniPill, SkeletonText, TextArea } from "../components/profile/ProfileUi";

export default function ProfileScreen({ session, supabase }) {
  const navigate = useNavigate();
  const location = useLocation();

  const userId = session?.user?.id;
  const { profile, loading, error, updateProfile } = useProfile({ supabase, userId });
  const { uploadAvatar, uploading } = useAvatarUpload({ supabase, userId });

  const fileRef = useRef(null);

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

  const { signedAvatarUrl, setSignedAvatarUrl } = useSignedAvatarUrl({
    supabase,
    path: profile?.avatar_url,
  });

  const partners = usePartnerConnections({ supabase, userId });

  useEffect(() => {
    setEditing(shouldStartEditing);
  }, [shouldStartEditing]);

  const initials = useMemo(() => {
    const base = (profile?.display_name || profile?.username || session?.user?.email || "U").trim();
    return base.slice(0, 1).toUpperCase();
  }, [profile?.display_name, profile?.username, session?.user?.email]);

  // ✅ FIX: Do NOT overwrite draft edits while editing.
  useEffect(() => {
    if (editing) return;

    setUsername(profile?.username || "");
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
  }, [editing, profile?.username, profile?.display_name, profile?.bio]);

  useEffect(() => {
    partners.loadConnections();
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

  const onboardingLabel = profile ? (profile.onboarding_complete ? "Complete" : "Not complete") : "";

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

        {topKinks.length ? (
          <Card
            title="Top kinks"
            subtitle="Shown to connected partners"
            right={
              <SmallButton asLink to="/profile/kinks" title="Edit kink preferences">
                Edit
              </SmallButton>
            }
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {topKinks.map((k) => (
                <MiniPill key={k}>{k}</MiniPill>
              ))}
            </div>
          </Card>
        ) : (
          <Card
            title="Top kinks"
            subtitle="Optional. Hidden if empty."
            right={<SmallButton asLink to="/profile/kinks">Open</SmallButton>}
          >
            <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.35 }}>
              Next: pick 0–5 “Top kinks” from your kink list. For now this section is just a placeholder.
            </div>
          </Card>
        )}

        <Card
          title="Connections"
          subtitle="Search by username, send requests, accept requests"
          right={
            <SmallButton onClick={partners.loadConnections} disabled={partners.connLoading} title="Refresh connections">
              {partners.connLoading ? "Loading..." : "Refresh"}
            </SmallButton>
          }
        >
          {partners.connErr ? (
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,80,80,0.30)",
                background: "rgba(255,80,80,0.10)",
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {partners.connErr}
            </div>
          ) : null}

          {partners.connOk ? (
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(120,255,170,0.25)",
                background: "rgba(120,255,170,0.08)",
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {partners.connOk}
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 750 }}>Find by username</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Input
                value={partners.partnerQuery}
                onChange={(e) => partners.setPartnerQuery(e.target.value)}
                placeholder="Search usernames (e.g. David)"
              />
              <SmallButton
                onClick={partners.doSearchPartners}
                disabled={partners.partnerSearchBusy || !partners.partnerQuery.trim()}
              >
                {partners.partnerSearchBusy ? "Searching..." : "Search"}
              </SmallButton>
            </div>

            {partners.partnerResults.length ? (
              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                {partners.partnerResults.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 850 }}>{r.username || partners.helpers.shortId(r.id)}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>{r.display_name || "—"}</div>
                    </div>
                    <SmallButton onClick={() => partners.sendRequest(r.id)} title="Send connection request">
                      Connect
                    </SmallButton>
                  </div>
                ))}
              </div>
            ) : partners.partnerQuery.trim() ? (
              <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.35 }}>
                {partners.partnerSearchRawCount === 0
                  ? "No matches found."
                  : "No new people to connect — already connected or a request is pending."}
              </div>
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.35 }}>
              Note: this uses a safe RPC (search by username) so we don’t weaken profiles RLS.
            </div>
          </div>

          <div style={{ height: 12 }} />

          {partners.incomingRequests.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Incoming requests</div>
              {partners.incomingRequests.map((l) => {
                const otherId = partners.helpers.getOtherUserId(l, userId);
                const p = partners.partnerProfilesById?.[otherId] || null;
                const nice = partners.helpers.getNiceNameFromProfile(p, otherId);

                const canAccept = String(l.initiated_by_id || "") !== String(userId || "");

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 850 }}>Request from {nice}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>
                        {p?.display_name ? p.display_name : p?.username ? "—" : partners.helpers.shortId(otherId)}
                      </div>
                    </div>
                    {canAccept ? (
                      <SmallButton onClick={() => partners.acceptRequest(l.id)} title="Accept connection request">
                        Accept
                      </SmallButton>
                    ) : (
                      <MiniPill>Waiting</MiniPill>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {partners.incomingRequests.length ? <div style={{ height: 12 }} /> : null}

          {partners.outgoingRequests.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Outgoing requests</div>
              {partners.outgoingRequests.map((l) => {
                const otherId = partners.helpers.getOtherUserId(l, userId);
                const p = partners.partnerProfilesById?.[otherId] || null;
                const nice = partners.helpers.getNiceNameFromProfile(p, otherId);

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.20)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 850 }}>Pending to {nice}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>Waiting for acceptance</div>
                    </div>
                    <SmallButton
                      tone="danger"
                      onClick={() => partners.revokeLink(l.id, "Request cancelled.")}
                      title="Cancel request"
                    >
                      Cancel
                    </SmallButton>
                  </div>
                );
              })}
            </div>
          ) : null}

          {partners.outgoingRequests.length ? <div style={{ height: 12 }} /> : null}

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Connected</div>

            {partners.connLoading ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>Loading connections…</div>
            ) : partners.connections.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {partners.connections.map((c) => {
                  const name = c.profile?.username || c.profile?.display_name || partners.helpers.shortId(c.otherId);
                  const avatar = c.signedAvatarUrl || "";
                  const initials2 = String(name || "U").slice(0, 1).toUpperCase();

                  return (
                    <div
                      key={c.otherId}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.20)",
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.04)",
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 900,
                          }}
                        >
                          {avatar ? (
                            <img
                              src={avatar}
                              alt="Avatar"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            initials2
                          )}
                        </div>

                        <div style={{ display: "grid", gap: 2 }}>
                          <div style={{ fontWeight: 900 }}>{name}</div>
                          <div style={{ fontSize: 12, opacity: 0.65 }}>Connected</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <SmallButton
                          onClick={() => {
                            setKinksModal({ name });
                          }}
                          title="View kink visibility"
                        >
                          View kinks
                        </SmallButton>
                        <SmallButton
                          tone="danger"
                          onClick={() => partners.revokeLink(c.link?.id, "Connection removed.")}
                          title="Remove connection"
                        >
                          Remove
                        </SmallButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ opacity: 0.75, fontSize: 13 }}>No connections yet.</div>
            )}
          </div>
        </Card>
      </Page>

      {kinksModal ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.72)",
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
          onClick={() => setKinksModal(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(20,20,28,0.96)",
              padding: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 950 }}>{kinksModal.name}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>Preferences (visibility rules apply)</div>
              </div>
              <SmallButton onClick={() => setKinksModal(null)}>Close</SmallButton>
            </div>

            <div style={{ height: 12 }} />

            <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
              This will show their Top kinks + kink list sections once we ship:
              <ul style={{ margin: "8px 0 0 18px", opacity: 0.85 }}>
                <li>Visibility toggles (both sides)</li>
                <li>Shared display of kink lists</li>
                <li>Top 5 kinks surfaced as pills</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}