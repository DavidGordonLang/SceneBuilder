// src/screens/ProfileScreen.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import Page from "../components/Page";
import { SmallButton } from "../components/routesUi";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";
import { useToast } from "../ui/ToastContext.jsx";
import {
  acceptPartnerRequest,
  createPartnerRequest,
  fetchPartnerLinks,
  fetchPartnerRequests,
} from "../lib/partnersApi";
import { supabase as defaultSupabase } from "../lib/supabaseClient";

const AVATAR_URL_LS_KEY = "scenebuilder.avatarSignedUrlCache.v1";

let avatarSignedUrlCache = {};

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

function Card({ children, title, subtitle, right }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      {title || subtitle || right ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "grid", gap: 2 }}>
            {title ? <div style={{ fontWeight: 900 }}>{title}</div> : null}
            {subtitle ? (
              <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.3 }}>{subtitle}</div>
            ) : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function MiniPill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 750,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.20)",
        color: "#f3f3f7",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function shortId(id) {
  if (!id) return "—";
  return String(id).slice(0, 8) + "…";
}

function getOtherUserId(link, myId) {
  if (!link || !myId) return "";
  if (link.user_id === myId) return link.partner_user_id || "";
  if (link.partner_user_id === myId) return link.user_id || "";
  return link.partner_user_id || link.user_id || "";
}

function getClient(supabase) {
  return supabase || defaultSupabase;
}

export default function ProfileScreen({ session, supabase }) {
  const toast = useToast();
  const notify = (message, opts) => {
    try {
      toast?.showToast?.(message, opts);
    } catch {
      // ignore
    }
  };

  const client = getClient(supabase);

  const userId = session?.user?.id;
  const { profile, loading, error, updateProfile } = useProfile({ supabase: client, userId });
  const { uploadAvatar, uploading } = useAvatarUpload({ supabase: client, userId });

  const fileRef = useRef(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [signedAvatarUrl, setSignedAvatarUrl] = useState("");
  const [busySave, setBusySave] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [localOk, setLocalOk] = useState("");

  const [editing, setEditing] = useState(false);

  // Connections state
  const [connLoading, setConnLoading] = useState(false);
  const [connErr, setConnErr] = useState("");
  const [acceptedConnections, setAcceptedConnections] = useState([]); // { link, profile, signedAvatarUrl, otherId }
  const [kinksModal, setKinksModal] = useState(null);

  // Partner search state
  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerSearchBusy, setPartnerSearchBusy] = useState(false);
  const [partnerResults, setPartnerResults] = useState([]);
  const [partnerSearchNote, setPartnerSearchNote] = useState("");

  const initials = useMemo(() => {
    const base = (profile?.display_name || session?.user?.email || "U").trim();
    return base.slice(0, 1).toUpperCase();
  }, [profile?.display_name, session?.user?.email]);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
  }, [profile?.display_name, profile?.bio]);

  useEffect(() => {
    let cancelled = false;

    async function run(path) {
      if (!client) return;

      const cached = getCachedAvatarUrl(path);
      if (cached) {
        setSignedAvatarUrl(cached);
        return;
      }

      try {
        const ttl = 60 * 60;
        const { data, error: sErr } = await client.storage.from("avatars").createSignedUrl(path, ttl);
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
  }, [client, profile?.avatar_url]);

  async function signOut() {
    await client.auth.signOut();
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
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setEditing(false);
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
      const { data } = await client.storage.from("avatars").createSignedUrl(path, ttl);
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

  async function signAvatarForPath(path) {
    const p = String(path || "").trim();
    if (!p || !client) return "";

    const cached = getCachedAvatarUrl(p);
    if (cached) return cached;

    try {
      const ttl = 60 * 60;
      const { data, error: sErr } = await client.storage.from("avatars").createSignedUrl(p, ttl);
      if (sErr) throw sErr;
      const url = data?.signedUrl || "";
      if (url) setCachedAvatarUrl(p, url, ttl);
      return url;
    } catch {
      return "";
    }
  }

  async function loadConnections() {
    if (!client || !userId) return;
    setConnLoading(true);
    setConnErr("");

    try {
      const links = await fetchPartnerLinks({ supabase: client });

      const accepted = (links || []).filter((l) => {
        const status = String(l.status || "").toLowerCase();
        if (status && status !== "accepted") return false;
        if (l.revoked_at) return false;
        if (!l.accepted_at && status !== "accepted") return false;
        return true;
      });

      const partnerIds = Array.from(
        new Set(accepted.map((l) => getOtherUserId(l, userId)).filter(Boolean))
      );

      let profilesById = {};
      if (partnerIds.length) {
        const { data, error: pErr } = await client
          .from("profiles")
          .select("id, display_name, bio, avatar_url")
          .in("id", partnerIds);

        if (pErr) throw pErr;

        profilesById = {};
        for (const row of data || []) profilesById[row.id] = row;
      }

      const rows = [];
      for (const link of accepted) {
        const otherId = getOtherUserId(link, userId);
        const p = profilesById[otherId] || null;
        const signed = p?.avatar_url ? await signAvatarForPath(p.avatar_url) : "";
        rows.push({
          link,
          profile: p,
          signedAvatarUrl: signed,
          otherId,
        });
      }

      rows.sort((a, b) => {
        const an = String(a.profile?.display_name || "").toLowerCase();
        const bn = String(b.profile?.display_name || "").toLowerCase();
        if (an && bn && an !== bn) return an.localeCompare(bn);
        return String(a.otherId || "").localeCompare(String(b.otherId || ""));
      });

      setAcceptedConnections(rows);
    } catch (e) {
      setConnErr(e?.message || "Failed to load connections.");
      setAcceptedConnections([]);
    } finally {
      setConnLoading(false);
    }
  }

  useEffect(() => {
    loadConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function doSearchPartners() {
    const q = String(partnerQuery || "").trim();
    if (!q || !client || !userId) return;

    setPartnerSearchBusy(true);
    setPartnerSearchNote("");
    try {
      const { data, error: sErr } = await client.rpc("search_profiles_by_username", {
        p_query: q,
        p_limit: 10,
      });

      if (sErr) throw sErr;

      const existing = new Set((acceptedConnections || []).map((c) => c.otherId));
      const cleaned = (data || []).filter((r) => r.id !== userId).filter((r) => !existing.has(r.id));

      setPartnerResults(cleaned);

      if (!cleaned.length) {
        if (Array.isArray(data) && data.length) {
          setPartnerSearchNote("No new people to connect — you’re already connected to the matches found.");
        } else {
          setPartnerSearchNote("No matches found.");
        }
      }
    } catch (e) {
      setPartnerResults([]);
      setPartnerSearchNote(e?.message || "Partner search failed.");
    } finally {
      setPartnerSearchBusy(false);
    }
  }

  const topKinks = useMemo(() => {
    const v = profile?.top_kinks;
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).slice(0, 5);
    return [];
  }, [profile?.top_kinks]);

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

        {/* Identity */}
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
          </div>

          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
        </div>

        {/* Display fields */}
        {editing ? (
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Display name">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. David" maxLength={120} />
            </Field>

            <Field label="Short bio" hint={`${(bio || "").length}/140`}>
              <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Optional. Max 140 characters." maxLength={140} />
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

        {/* Top kinks */}
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
          <Card title="Top kinks" subtitle="Optional. Hidden if empty." right={<SmallButton asLink to="/profile/kinks">Open</SmallButton>}>
            <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.35 }}>
              Next: pick 0–5 “Top kinks” from your kink list. For now this section is just a placeholder.
            </div>
          </Card>
        )}

        {/* Connections */}
        <Card
          title="Connections"
          subtitle="Search by username, send requests, accept requests"
          right={
            <SmallButton onClick={loadConnections} disabled={connLoading} title="Refresh connections">
              {connLoading ? "Loading..." : "Refresh"}
            </SmallButton>
          }
        >
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 750 }}>Find by username</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Input
                value={partnerQuery}
                onChange={(e) => (setPartnerQuery(e.target.value), setPartnerSearchNote(""), setPartnerResults([]))}
                placeholder="Search usernames (e.g. David)"
              />
              <SmallButton onClick={doSearchPartners} disabled={partnerSearchBusy || !partnerQuery.trim()}>
                {partnerSearchBusy ? "Searching..." : "Search"}
              </SmallButton>
            </div>

            {partnerResults.length ? (
              <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                {partnerResults.map((r) => (
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
                      <div style={{ fontWeight: 850 }}>{r.username || r.display_name || shortId(r.id)}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>{r.bio || "—"}</div>
                    </div>
                    <SmallButton disabled title="Connection requests are next">
                      Connect
                    </SmallButton>
                  </div>
                ))}
              </div>
            ) : null}

            {partnerSearchNote ? (
              <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.35 }}>{partnerSearchNote}</div>
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.35 }}>
              Note: this uses a safe RPC (search by username) so we don’t weaken profiles RLS.
            </div>
          </div>

          <div style={{ height: 12 }} />

          {connErr ? (
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,80,80,0.30)",
                background: "rgba(255,80,80,0.10)",
                fontSize: 13,
              }}
            >
              {connErr}
            </div>
          ) : null}

          {connLoading ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>Loading connections…</div>
          ) : acceptedConnections.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {acceptedConnections.map((c) => {
                const name = c.profile?.display_name || shortId(c.otherId);
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
                          <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          initials2
                        )}
                      </div>

                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 900 }}>{name}</div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>Connected</div>
                      </div>
                    </div>

                    <SmallButton
                      onClick={() => {
                        setKinksModal({ name, topKinks: [], placeholderOnly: true });
                        notify("Kinks view is placeholder for now.");
                      }}
                      title="View kink visibility"
                    >
                      View kinks
                    </SmallButton>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ opacity: 0.75, fontSize: 13 }}>No connections yet.</div>
          )}
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
              Placeholder: this will show their kink list once we ship it.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
