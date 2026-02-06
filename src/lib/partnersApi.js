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

async function findExistingLink(client, uid, partnerUserId) {
  const a = normalizeUuid(uid);
  const b = normalizeUuid(partnerUserId);
  if (!a || !b) return null;

  // Try direct orientation first (common case), then reversed.
  const { data: d1, error: e1 } = await client
    .from("partner_links")
    .select("id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at")
    .eq("user_id", uid)
    .eq("partner_user_id", partnerUserId)
    .maybeSingle();

  if (e1) throw e1;
  if (d1?.id) return d1;

  const { data: d2, error: e2 } = await client
    .from("partner_links")
    .select("id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at")
    .eq("user_id", partnerUserId)
    .eq("partner_user_id", uid)
    .maybeSingle();

  if (e2) throw e2;
  return d2?.id ? d2 : null;
}

/**
 * Request a partner link (no codes).
 * If a link already exists (even revoked), we revive it instead of inserting a duplicate.
 */
export async function createPartnerRequest(partnerUserId, { supabase } = {}) {
  return perfTime("partners.createPartnerRequest", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    if (!partnerUserId) throw new Error("Missing partner user id.");
    if (normalizeUuid(partnerUserId) === normalizeUuid(uid)) throw new Error("You can’t connect to yourself.");

    const now = new Date().toISOString();

    // 1) If link exists in either direction, update it back to pending
    const existing = await findExistingLink(client, uid, partnerUserId);

    if (existing?.id) {
      const { data, error } = await client
        .from("partner_links")
        .update({
          status: "pending",
          initiated_by_id: uid,
          initiated_at: now,
          accepted_at: null,
          revoked_at: null,
          // updated_at should be auto, but we don’t rely on it.
        })
        .eq("id", existing.id)
        .select(
          "id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at"
        )
        .single();

      if (error) throw error;
      return data;
    }

    // 2) Otherwise, create new
    const { data, error } = await client
      .from("partner_links")
      .insert([
        {
          user_id: uid,
          partner_user_id: partnerUserId,
          initiated_by_id: uid,
          status: "pending",
          initiated_at: now,
        },
      ])
      .select("id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Accept a partner request.
 * Either party can accept as long as RLS allows.
 */
export async function acceptPartnerRequest(linkId, { supabase } = {}) {
  return perfTime("partners.acceptPartnerRequest", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const now = new Date().toISOString();

    const { data, error } = await client
      .from("partner_links")
      .update({
        status: "accepted",
        accepted_at: now,
        revoked_at: null, // defensive: accept should mean "active"
      })
      .eq("id", linkId)
      .select("id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Fetch partner links visible to current user (RLS).
 */
export async function fetchPartnerLinks({ supabase } = {}) {
  return perfTime("partners.fetchPartnerLinks", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("partner_links")
      .select("id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });
}

/**
 * Revoke (remove) a connection.
 * Either party can revoke; we set revoked_at.
 */
export async function revokePartnerLink(linkId, { supabase } = {}) {
  return perfTime("partners.revokePartnerLink", async () => {
    const client = getClient(supabase);
    await requireAuth(client);

    const { data, error } = await client
      .from("partner_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", linkId)
      .select("id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at")
      .single();

    if (error) throw error;
    return data;
  });
}
