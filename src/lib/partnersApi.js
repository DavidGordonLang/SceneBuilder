import { supabase as defaultSupabase } from "./supabaseClient";
import { perfTime } from "./perf";

function getClient(supabase) {
  return supabase || defaultSupabase;
}

async function getUserId(client) {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("Not signed in.");
  return uid;
}

/**
 * Fetch partner links for the current user.
 * RLS restricts rows to parties, but we also filter client-side by uid.
 */
export async function fetchPartnerLinks({ supabase } = {}) {
  return perfTime("partners.fetchPartnerLinks", async () => {
    const client = getClient(supabase);
    const uid = await getUserId(client);

    const { data, error } = await client
      .from("partner_links")
      .select(
        "id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at"
      )
      .or(`user_id.eq.${uid},partner_user_id.eq.${uid}`)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return Array.isArray(data) ? data : [];
  });
}

/**
 * Create a partner request (no invite codes).
 * Inserts partner_links row with status='pending'.
 *
 * IMPORTANT: your existing RLS insert policy requires:
 * - auth.uid() = user_id
 * - auth.uid() = initiated_by_id
 * - user_id <> partner_user_id
 */
export async function createPartnerRequest(partnerUserId, { supabase } = {}) {
  return perfTime("partners.createPartnerRequest", async () => {
    const client = getClient(supabase);
    const uid = await getUserId(client);

    const pid = String(partnerUserId || "").trim();
    if (!pid) throw new Error("Missing partner user id.");
    if (pid === uid) throw new Error("You can’t connect to yourself.");

    const { data, error } = await client
      .from("partner_links")
      .insert([
        {
          user_id: uid,
          partner_user_id: pid,
          initiated_by_id: uid,
          status: "pending",
        },
      ])
      .select(
        "id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Accept a partner request.
 * Either party can update (per your RLS).
 * We set accepted_at and status='accepted'.
 */
export async function acceptPartnerRequest(linkId, { supabase } = {}) {
  return perfTime("partners.acceptPartnerRequest", async () => {
    const client = getClient(supabase);
    await getUserId(client);

    const id = String(linkId || "").trim();
    if (!id) throw new Error("Missing link id.");

    const { data, error } = await client
      .from("partner_links")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id,user_id,partner_user_id,initiated_by_id,status,initiated_at,accepted_at,revoked_at,created_at,updated_at"
      )
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Decline / revoke: delete the link.
 * Your RLS delete policy allows only inviter (initiated_by_id) to delete.
 * If you want the recipient to decline too, we can add a second delete policy later.
 */
export async function deletePartnerLink(linkId, { supabase } = {}) {
  return perfTime("partners.deletePartnerLink", async () => {
    const client = getClient(supabase);
    await getUserId(client);

    const id = String(linkId || "").trim();
    if (!id) throw new Error("Missing link id.");

    const { error } = await client.from("partner_links").delete().eq("id", id);
    if (error) throw error;
    return true;
  });
}

/**
 * Existing invite code flow (keep for now; can be removed later)
 */
export async function createPartnerInvite({ supabase } = {}) {
  return perfTime("partners.createPartnerInvite", async () => {
    const client = getClient(supabase);

    const { data, error } = await client.rpc("create_partner_invite");
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Invite creation returned no data.");

    return {
      invite_id: row.invite_id,
      code: row.code,
      expires_at: row.expires_at,
    };
  });
}

export async function redeemPartnerInvite(code, { supabase } = {}) {
  return perfTime("partners.redeemPartnerInvite", async () => {
    const client = getClient(supabase);

    const cleaned = String(code ?? "").trim().toUpperCase();
    if (cleaned.length < 6) throw new Error("Please enter a valid invite code.");

    const { data, error } = await client.rpc("redeem_partner_invite", {
      p_code: cleaned,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Redeem returned no data.");

    return {
      partner_link_id: row.partner_link_id,
      inviter_user_id: row.inviter_user_id,
      redeemer_user_id: row.redeemer_user_id,
    };
  });
}
