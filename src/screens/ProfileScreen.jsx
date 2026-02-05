// src/screens/ProfileScreen.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SmallButton } from "../components/routesUi";
import Page from "../components/Page";
import { useAvatarUpload } from "../hooks/useAvatarUpload";
import { useProfile } from "../hooks/useProfile";
import {
  acceptPartnerRequest,
  createPartnerRequest,
  fetchPartnerLinks,
} from "../lib/partnersApi";

/**
 * Signed avatar URL cache (localStorage) — avoid flicker.
 */
const AVATAR_URL_LS_KEY = "scenebuilder.avatarSignedUrlCache.v1";

let avatarSignedUrlCache = {}; // [path]: { url, expiresAtMs }

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

if (typeof window !== "undefined") readAvatarCacheFromStorage();

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
      {(title || subtitle || right) ? (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ display: "grid", gap: 2 }}>
            {title ? <div style={{ fontWeight: 900 }}>{title}</div> : null}
            {subtitle ? <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.3 }}>{subtitle}</div> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
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

function normalizeUsername(v) {
  // allow mixed case, 0-9, underscore. No spaces.
  return String(v || "").replace(/\s+/g, "");
}

function validateUsername(v) {
  const s = normalizeUsername(v);
  if (!s) return { ok: true, msg: "" }; // allow empty (not set yet)
  if (s.length < 3) return { ok: false, msg: "Min 3 characters." };
  if (s.length > 24) return { ok: false, msg: "Max 24 characters." };
  if (!/^[A-Za-z0-9_]+$/.test(s)) return { ok: false, msg: "Only A–Z a–z 0–9 and underscore." };
  return { ok: true, msg: "" };
}

export default function ProfileScreen({ session, supabase }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session?.user?.id;

  const { profile, loading, error, updateProfile } = useProfile({ supabase, userId });
  const { uploadAvatar, uploading } = useAvatarUpload({ supabase, userId });

  const fileRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [localOk, setLocalOk] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");

  const [signedAvatarUrl, setSignedAvatarUrl] = useState("");

  // Connections
  const [connLoading, setConnLoading] = useState(false);
  const [connErr, setConnErr] = useState("");
  const [acceptedConnections, setAcceptedConnections] = useState([]); // enriched
  const [incomingRequests, setIncomingRequests] = useState([]); // partner_links rows

  // Partner search (username)
  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerSearchBusy, setPartnerSearchBusy] = useState(false);
  const [partnerResults, setPartnerResults] = useState([]);

  // Username availability
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(""); // "Available" / "Taken" / error

  const initials = useMemo(() => {
    const base = (profile?.display_name || session?.user?.email || "U").trim();
    return base.slice(0, 1).toUpperCase();
  }, [profile?.display_name, session?.user?.email]);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setUsername(profile?.username || "");
  }, [profile?.display_name, profile?.bio, profile?.username]);

  // Start edit if /profile?edit=1
  useEffect(() => {
    const sp = new URLSearchParams(location.search || "");
    const shouldStartEditing = sp.get("edit") === "1";
    setEditing(shouldStartEditing);
  }, [location.search]);

  // Signed avatar URL: use cache immediately, refresh if needed.
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
          setSignedAvatarUrl(fallback || "");
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
    setUsername(profile?.username || "");
    setEditing(false);

    if (location.search) navigate("/profile", { replace: true });
  }

  async function handleSave() {
    setLocalErr("");
    setLocalOk("");
    setBusySave(true);

    try {
      const uname = normalizeUsername(username);
      const v = validateUsername(uname);
      if (!v.ok) throw new Error(v.msg);

      // If username is set, check availability via RPC.
      // Requires SQL in this message to be installed.
      if (uname && uname !== (profile?.username || "")) {
        setUsernameBusy(true);
        setUsernameStatus("");
        const { data, error: uErr } = await supabase.rpc("is_username_available", {
          p_username: uname,
        });
        if (uErr) throw uErr;
        if (!data) throw new Error("Username is already taken.");
      }

      await updateProfile({
        display_name: (displayName || "").slice(0, 120),
        bio: (bio || "").slice(0, 140),
        username: uname || null,
      });

      setLocalOk("Saved.");
      setEditing(false);
      setUsernameStatus("");

      if (location.search) navigate("/profile", { replace: true });
    } catch (e) {
      setLocalErr(e?.message || "Save failed.");
    } finally {
      setBusySave(false);
      setUsernameBusy(false);
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

  async function signAvatarForPath(path) {
    const p = String(path || "").trim();
    if (!p || !supabase) return "";

    const cached = getCachedAvatarUrl(p);
    if (cached) return cached;

    try {
      const ttl = 60 * 60;
      const { data, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(p, ttl);
      if (sErr) throw sErr;
      const url = data?.signedUrl || "";
      if (url) setCachedAvatarUrl(p, url, ttl);
      return url;
    } catch {
      return "";
    }
  }

  async function loadConnections() {
    if (!supabase || !userId) return;
    setConnLoading(true);
    setConnErr("");

    try {
      const links = await fetchPartnerLinks({ supabase });

      const accepted = (links || []).filter((l) => String(l.status || "").toLowerCase() === "accepted" && !l.revoked_at);
      const pending = (links || []).filter((l) => String(l.status || "").toLowerCase() === "pending" && !l.revoked_at);

      // incoming = pending where I am NOT the initiator
      const incoming = pending.filter((l) => l.initiated_by_id !== userId);
      setIncomingRequests(incoming);

      const partnerIds = Array.from(
        new Set(
          accepted
            .map((l) => getOtherUserId(l, userId))
            .filter(Boolean)
        )
      );

      // profiles are RLS-locked; we fetch via the RPC search only when searching.
      // For connections list, we can still show “Unknown” until we add a safe lookup RPC by ids later.
      // BUT: because you already want to show kink stuff later, we WILL add that safe lookup next.
      //
      // For now, keep a best-effort attempt: try selecting by ids; if RLS blocks, fall back.
      let profilesById = {};
      if (partnerIds.length) {
        const { data, error: pErr } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .in("id", partnerIds);

        if (!pErr) {
          profilesById = {};
          for (const row of data || []) profilesById[row.id] = row;
        }
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
        const an = String(a.profile?.username || a.profile?.display_name || "").toLowerCase();
        const bn = String(b.profile?.username || b.profile?.display_name || "").toLowerCase();
        if (an && bn && an !== bn) return an.localeCompare(bn);
        return String(a.otherId || "").localeCompare(String(b.otherId || ""));
      });

      setAcceptedConnections(rows);
    } catch (e) {
      setConnErr(e?.message || "Failed to load connections.");
      setAcceptedConnections([]);
      setIncomingRequests([]);
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
    if (!q || !supabase || !userId) return;

    setPartnerSearchBusy(true);
    setConnErr("");
    try {
      // Requires SQL RPC installed
      const { data, error: sErr } = await supabase.rpc("search_profiles_by_username", {
        p_query: q,
        p_limit: 10,
      });

      if (sErr) throw sErr;

      const existing = new Set((acceptedConnections || []).map((c) => c.otherId));
      const cleaned = (data || [])
        .filter((r) => r.id !== userId)
        .filter((r) => !existing.has(r.id));

      setPartnerResults(cleaned);
    } catch (e) {
      setPartnerResults([]);
      setConnErr(e?.message || "Partner search failed.");
    } finally {
      setPartnerSearchBusy(false);
    }
  }

  async function doRequestConnect(targetUserId) {
    if (!targetUserId) return;
    setConnErr("");
    setLocalOk("");
    setLocalErr("");

    try {
      await createPartnerRequest(targetUserId, { supabase });
      setLocalOk("Request sent.");
      setPartnerResults([]);
      setPartnerQuery("");
      await loadConnections();
    } catch (e) {
      setConnErr(e?.message || "Failed to send request.");
    }
  }

  async function doAcceptRequest(linkId) {
    if (!linkId) return;
    setConnErr("");
    setLocalOk("");
    setLocalErr("");

    try {
      await acceptPartnerRequest(linkId, { supabase });
      setLocalOk("Connected.");
      await loadConnections();
    } catch (e) {
      setConnErr(e?.message || "Failed to accept request.");
    }
  }

  async function checkUsernameNow() {
    const uname = normalizeUsername(username);
    const v = validateUsername(uname);
    if (!v.ok) {
      setUsernameStatus(v.msg);
      return;
    }
    if (!uname) {
      setUsernameStatus("");
      return;
    }

    setUsernameBusy(true);
    setUsernameStatus("");
    try {
      const { data, error: uErr } = await supabase.rpc("is_username_available", {
        p_username: uname,
      });
      if (uErr) throw uErr;

      // If unchanged from current, treat as ok
      if (uname === (profile?.username || "")) {
        setUsernameStatus("✓ Looks good (unchanged).");
      } else if (data) {
        setUsernameStatus("✓ Available.");
      } else {
        setUsernameStatus("Taken.");
      }
    } catch (e) {
      setUsernameStatus(e?.message || "Could not check availability.");
    } finally {
      setUsernameBusy(false);
    }
  }

  const busy = loading || uploading || busySave;

  const topKinks = useMemo(() => {
    const v = profile?.top_kinks;
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).slice(0, 5);
    return [];
  }, [profile?.top_kinks]);

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Actions row */}
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

        {/* Identity */}
        <Card
          title="Profile"
          subtitle="Your identity + connections live here"
          right={
            <SmallButton asLink to="/profile/kinks" title="Edit kink preferences">
              Kink preferences
            </SmallButton>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 14, alignItems: "center" }}>
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
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: "none" }} />
          </div>

          <div style={{ height: 12 }} />

          {/* Fields */}
          {editing ? (
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Username" hint="A–Z a–z 0–9 underscore. 3–24 chars. Used for search + connections.">
                <div style={{ display: "grid", gap: 8 }}>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. DavidGordon_1"
                    maxLength={24}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <SmallButton onClick={checkUsernameNow} disabled={usernameBusy}>
                      {usernameBusy ? "Checking..." : "Check availability"}
                    </SmallButton>
                    {usernameStatus ? <div style={{ fontSize: 12, opacity: 0.75 }}>{usernameStatus}</div> : null}
                  </div>
                </div>
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
            <div style={{ display: "grid", gap: 10, opacity: 0.92 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Username</div>
                <div style={{ marginTop: 4 }}>{profile?.username || "—"}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Display name</div>
                <div style={{ marginTop: 4 }}>{profile?.display_name || "—"}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Bio</div>
                <div style={{ marginTop: 4, opacity: 0.9 }}>{profile?.bio || "—"}</div>
              </div>
            </div>
          )}
        </Card>

        {/* Top kinks (placeholder until list ships) */}
        {topKinks.length ? (
          <Card title="Top kinks" subtitle="Shown to connected partners">
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
            right={
              <SmallButton asLink to="/profile/kinks" title="Open kink preferences">
                Open
              </SmallButton>
            }
          >
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
          {connErr ? (
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
              {connErr}
            </div>
          ) : null}

          {/* Incoming requests */}
          {incomingRequests.length ? (
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 850 }}>Incoming requests</div>
              {incomingRequests.map((r) => {
                const otherId = getOtherUserId(r, userId);
                return (
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
                      <div style={{ fontWeight: 850 }}>Request</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        From user: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{shortId(otherId)}</span>
                      </div>
                    </div>
                    <SmallButton onClick={() => doAcceptRequest(r.id)}>Accept</SmallButton>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Search */}
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 750 }}>Find by username</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Input
                value={partnerQuery}
                onChange={(e) => setPartnerQuery(e.target.value)}
                placeholder="Search usernames (e.g. David)"
                autoCapitalize="none"
                autoCorrect="off"
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
                      <div style={{ fontWeight: 850 }}>
                        {r.username ? `@${r.username}` : shortId(r.id)}{" "}
                        <span style={{ opacity: 0.7, fontWeight: 700 }}>
                          {r.display_name ? `• ${r.display_name}` : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>{r.bio || "—"}</div>
                    </div>
                    <SmallButton onClick={() => doRequestConnect(r.id)}>Connect</SmallButton>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.35, marginTop: 6 }}>
              Note: this uses a safe RPC (search by username) so we don’t weaken profiles RLS.
            </div>
          </div>

          <div style={{ height: 14 }} />

          {/* Accepted list */}
          {connLoading ? (
            <div style={{ opacity: 0.75, fontSize: 13 }}>Loading connections…</div>
          ) : acceptedConnections.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 850 }}>Connected</div>
              {acceptedConnections.map((c) => {
                const name = c.profile?.username
                  ? `@${c.profile.username}`
                  : c.profile?.display_name || shortId(c.otherId);

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

                    <SmallButton asLink to="/profile/kinks" title="Kinks are visible to partners once list ships">
                      View kinks
                    </SmallButton>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ opacity: 0.75, fontSize: 13 }}>
              No connections yet. Search by username and send a request.
            </div>
          )}
        </Card>
      </Page>
    </div>
  );
}
