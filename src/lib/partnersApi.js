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
 * RLS already restricts rows to only those where auth.uid() is a party, but we also
 * filter client-side by uid for efficiency.
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
 * Create an invite code for the currently authenticated user.
 * Calls RPC: public.create_partner_invite()
 *
 * Returns: { invite_id, code, expires_at }
 */
export async function createPartnerInvite({ supabase } = {}) {
  return perfTime("partners.createPartnerInvite", async () => {
    const client = getClient(supabase);

    const { data, error } = await client.rpc("create_partner_invite");
    if (error) throw error;

    // RPC returns a setof rows; we expect exactly one row
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Invite creation returned no data.");

    return {
      invite_id: row.invite_id,
      code: row.code,
      expires_at: row.expires_at,
    };
  });
}

/**
 * Redeem an invite code for the currently authenticated user.
 * Calls RPC: public.redeem_partner_invite(p_code text)
 *
 * Returns: { partner_link_id, inviter_user_id, redeemer_user_id }
 */
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
