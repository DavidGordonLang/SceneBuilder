// src/lib/partnersApi.js
import { supabase as defaultSupabase } from "./supabaseClient";
import { perfTime } from "./perf";

function getClient(supabase) {
  return supabase || defaultSupabase;
}

async function requireAuth(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data?.user?.id) throw new Error("Not signed in.");
  return data.user.id;
}

function normalizeUuid(v) {
  return String(v || "").trim().toLowerCase();
}

const LINK_SELECT =
  "id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at";

async function findExistingLink(client, uid, partnerUserId) {
  const a = normalizeUuid(uid);
  const b = normalizeUuid(partnerUserId);
  if (!a || !b) return null;

  // Try direct orientation first (common case), then reversed.
  const { data: d1, error: e1 } = await client
    .from("partner_links")
    .select(LINK_SELECT)
    .eq("user_id", uid)
    .eq("partner_user_id", partnerUserId)
    .maybeSingle();

  if (e1) throw e1;
  if (d1?.id) return d1;

  const { data: d2, error: e2 } = await client
    .from("partner_links")
    .select(LINK_SELECT)
    .eq("user_id", partnerUserId)
    .eq("partner_user_id", uid)
    .maybeSingle();

  if (e2) throw e2;
  return d2?.id ? d2 : null;
}

/**
 * Request a partner link (no codes).
 *
 * SECURITY INTENT:
 * - "Accepted" can only be done by the NON-initiator (enforced by RLS).
 * - "Cancel pending" can only be done by the initiator (enforced by RLS).
 * - Revoked links should not be "revived" by UPDATE because that can preserve old initiator
 *   and/or hit stricter RLS paths. Instead: create a fresh pending row.
 *
 * IMPORTANT:
 * - Outgoing/incoming should be determined in UI using initiated_by_id, not row orientation.
 */
export async function createPartnerRequest(partnerUserId, { supabase } = {}) {
  return perfTime("partners.createPartnerRequest", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    if (!partnerUserId) throw new Error("Missing partner user id.");
    if (normalizeUuid(partnerUserId) === normalizeUuid(uid)) throw new Error("You can’t connect to yourself.");

    const now = new Date().toISOString();

    const existing = await findExistingLink(client, uid, partnerUserId);

    // If there is an active link (pending/accepted) that is NOT revoked, do not create a new one.
    if (existing?.id && !existing?.revoked_at) {
      const status = String(existing.status || "").toLowerCase();

      if (status === "accepted") {
        throw new Error("You are already connected.");
      }

      if (status === "pending") {
        // If I'm the initiator, it's already outgoing; if not, it's incoming.
        if (normalizeUuid(existing.initiated_by_id) === normalizeUuid(uid)) {
          throw new Error("Request already sent.");
        }
        throw new Error("You already have an incoming request from this user.");
      }

      // Unknown status but not revoked — safest: refuse rather than mutate.
      throw new Error("A connection already exists.");
    }

    // If the previous relationship is revoked (or no row exists), create a NEW pending row.
    // The partial unique index only applies when revoked_at IS NULL and status in (pending, accepted),
    // so creating a new row is safe and keeps initiated_by_id correct for this attempt.
    const { data, error } = await client
      .from("partner_links")
      .insert([
        {
          user_id: uid,
          partner_user_id: partnerUserId,
          initiated_by_id: uid,
          status: "pending",
          initiated_at: now,
          accepted_at: null,
          revoked_at: null,
        },
      ])
      .select(LINK_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) throw new Error("Failed to create request.");
    return data;
  });
}

export async function acceptPartnerRequest(linkId, { supabase } = {}) {
  return perfTime("partners.acceptPartnerRequest", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const now = new Date().toISOString();

    // Under strict RLS, this UPDATE may affect 0 rows (e.g., initiator trying to accept).
    // Using .single() will throw "Cannot coerce..." when 0 rows are returned.
    const { data, error } = await client
      .from("partner_links")
      .update({
        status: "accepted",
        accepted_at: now,
        revoked_at: null,
      })
      .eq("id", linkId)
      .select(LINK_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
      throw new Error("Not allowed to accept this request (or it no longer exists).");
    }
    return data;
  });
}

export async function fetchPartnerLinks({ supabase } = {}) {
  return perfTime("partners.fetchPartnerLinks", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client.from("partner_links").select(LINK_SELECT).order("updated_at", {
      ascending: false,
    });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });
}

export async function revokePartnerLink(linkId, { supabase } = {}) {
  return perfTime("partners.revokePartnerLink", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    // Under strict RLS, this UPDATE may affect 0 rows (e.g., non-initiator trying to cancel pending).
    // Use maybeSingle + explicit message so we don't crash with "Cannot coerce..."
    const { data, error } = await client
      .from("partner_links")
      .update({
        revoked_at: new Date().toISOString(),
        status: "revoked",
        accepted_at: null,
      })
      .eq("id", linkId)
      .select(LINK_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
      throw new Error("Not allowed to cancel/revoke this connection (or it no longer exists).");
    }
    return data;
  });
}