// src/hooks/usePartnerConnections.js

import { useCallback, useMemo, useState } from "react";
import {
  acceptPartnerRequest,
  createPartnerRequest,
  fetchPartnerLinks,
  revokePartnerLink,
} from "../lib/partnersApi";
import { getCachedAvatarUrl, setCachedAvatarUrl } from "../lib/avatarSignedUrlCache";

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

function isAccepted(link) {
  const s = String(link?.status || "").toLowerCase();
  if (link?.revoked_at) return false;
  if (s === "accepted") return true;
  return Boolean(link?.accepted_at) && s !== "pending";
}

function isPending(link) {
  const s = String(link?.status || "").toLowerCase();
  if (link?.revoked_at) return false;
  return s === "pending";
}

function getNiceNameFromProfile(p, fallbackId) {
  const u = String(p?.username || "").trim();
  const dn = String(p?.display_name || "").trim();
  if (u) return u;
  if (dn) return dn;
  return shortId(fallbackId);
}

function isParticipant(link, myId) {
  if (!link || !myId) return false;
  return link.user_id === myId || link.partner_user_id === myId;
}

// classify incoming/outgoing by who initiated, not row orientation.
function isIncomingPending(link, myId) {
  if (!isPending(link) || !isParticipant(link, myId)) return false;
  return String(link.initiated_by_id || "") !== String(myId || "");
}

function isOutgoingPending(link, myId) {
  if (!isPending(link) || !isParticipant(link, myId)) return false;
  return String(link.initiated_by_id || "") === String(myId || "");
}

async function signAvatarForPath({ supabase, path }) {
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

export function usePartnerConnections({ supabase, userId }) {
  const [connLoading, setConnLoading] = useState(false);
  const [connErr, setConnErr] = useState("");
  const [connOk, setConnOk] = useState("");

  const [connections, setConnections] = useState([]);
  const [partnerProfilesById, setPartnerProfilesById] = useState({});

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerSearchBusy, setPartnerSearchBusy] = useState(false);
  const [partnerResults, setPartnerResults] = useState([]);
  const [partnerSearchRawCount, setPartnerSearchRawCount] = useState(null);

  const canUse = Boolean(supabase && userId);

  const fetchPartnerProfilesByIds = useCallback(
    async (ids) => {
      const list = Array.from(new Set((ids || []).filter(Boolean)));
      if (!supabase || !userId || !list.length) return {};

      const { data, error: rErr } = await supabase.rpc("fetch_partner_profiles_by_ids", { p_ids: list });
      if (rErr) throw rErr;

      const map = {};
      for (const row of data || []) {
        map[row.id] = row;
      }
      return map;
    },
    [supabase, userId]
  );

  const loadConnections = useCallback(async () => {
    if (!canUse) return;

    setConnLoading(true);
    setConnErr("");
    setConnOk("");

    try {
      const links = await fetchPartnerLinks({ supabase });

      const acceptedConnections = (links || []).filter((l) => isAccepted(l));

      const incoming = (links || []).filter((l) => isIncomingPending(l, userId));
      const outgoing = (links || []).filter((l) => isOutgoingPending(l, userId));

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);

      const partnerIds = Array.from(
        new Set(
          acceptedConnections
            .map((l) => getOtherUserId(l, userId))
            .filter(Boolean)
        )
      );

      const reqIds = Array.from(
        new Set(
          [...incoming, ...outgoing]
            .map((l) => getOtherUserId(l, userId))
            .filter(Boolean)
        )
      );

      const allProfileIds = Array.from(new Set([...partnerIds, ...reqIds].filter(Boolean)));

      let profilesById = {};
      if (allProfileIds.length) profilesById = await fetchPartnerProfilesByIds(allProfileIds);
      setPartnerProfilesById(profilesById);

      const rows = [];
      for (const link of acceptedConnections) {
        const otherId = getOtherUserId(link, userId);
        const p = profilesById[otherId] || null;
        const signed = p?.avatar_url ? await signAvatarForPath({ supabase, path: p.avatar_url }) : "";
        rows.push({ link, profile: p, signedAvatarUrl: signed, otherId });
      }

      rows.sort((a, b) => {
        const an = String(a.profile?.username || a.profile?.display_name || "").toLowerCase();
        const bn = String(b.profile?.username || b.profile?.display_name || "").toLowerCase();
        if (an && bn && an !== bn) return an.localeCompare(bn);
        return String(a.otherId || "").localeCompare(String(b.otherId || ""));
      });

      setConnections(rows);
    } catch (e) {
      setConnErr(e?.message || "Failed to load connections.");
      setConnections([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setPartnerProfilesById({});
    } finally {
      setConnLoading(false);
    }
  }, [canUse, supabase, userId, fetchPartnerProfilesByIds]);

  const doSearchPartners = useCallback(async () => {
    const q = String(partnerQuery || "").trim();
    if (!q || !canUse) return;

    setPartnerSearchBusy(true);
    setConnErr("");
    setConnOk("");
    setPartnerSearchRawCount(null);

    try {
      const { data, error: sErr } = await supabase.rpc("search_profiles_by_username", {
        p_query: q,
        p_limit: 10,
      });

      if (sErr) throw sErr;

      const raw = Array.isArray(data) ? data : [];
      setPartnerSearchRawCount(raw.length);

      const existing = new Set((connections || []).map((c) => c.otherId));
      const existingPending = new Set(
        [...incomingRequests, ...outgoingRequests].map((l) => getOtherUserId(l, userId)).filter(Boolean)
      );

      const cleaned = raw
        .filter((r) => r.id !== userId)
        .filter((r) => !existing.has(r.id))
        .filter((r) => !existingPending.has(r.id));

      setPartnerResults(cleaned);
    } catch (e) {
      setPartnerResults([]);
      setPartnerSearchRawCount(null);
      setConnErr(e?.message || "Partner search failed.");
    } finally {
      setPartnerSearchBusy(false);
    }
  }, [partnerQuery, canUse, supabase, userId, connections, incomingRequests, outgoingRequests]);

  const sendRequest = useCallback(
    async (partnerUserId) => {
      if (!canUse || !partnerUserId) return;

      setConnErr("");
      setConnOk("");

      try {
        await createPartnerRequest(partnerUserId, { supabase });
        setConnOk("Request sent.");
        setPartnerResults([]);
        setPartnerQuery("");
        setPartnerSearchRawCount(null);
        await loadConnections();
      } catch (e) {
        setConnErr(e?.message || "Failed to send request.");
      }
    },
    [canUse, supabase, loadConnections]
  );

  const acceptRequest = useCallback(
    async (linkId) => {
      if (!canUse || !linkId) return;

      setConnErr("");
      setConnOk("");

      try {
        await acceptPartnerRequest(linkId, { supabase });
        setConnOk("Connected.");
        await loadConnections();
      } catch (e) {
        setConnErr(e?.message || "Failed to accept request.");
      }
    },
    [canUse, supabase, loadConnections]
  );

  const revokeLink = useCallback(
    async (linkId, okMessage = "Connection removed.") => {
      if (!canUse || !linkId) return;

      setConnErr("");
      setConnOk("");

      try {
        await revokePartnerLink(String(linkId), { supabase });
        setConnOk(okMessage);
        await loadConnections();
      } catch (e) {
        setConnErr(e?.message || "Failed to remove connection.");
      }
    },
    [canUse, supabase, loadConnections]
  );

  const helpers = useMemo(
    () => ({
      shortId,
      getOtherUserId,
      getNiceNameFromProfile,
    }),
    []
  );

  return {
    // state
    connLoading,
    connErr,
    connOk,

    connections,
    partnerProfilesById,
    incomingRequests,
    outgoingRequests,

    partnerQuery,
    partnerSearchBusy,
    partnerResults,
    partnerSearchRawCount,

    // setters/actions
    setPartnerQuery,
    loadConnections,
    doSearchPartners,
    sendRequest,
    acceptRequest,
    revokeLink,

    // helpers for UI formatting
    helpers,
  };
}