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

/**
 * Request a partner link (no codes).
 * Creates/updates a pending row.
 */
export async function createPartnerRequest(partnerUserId, { supabase } = {}) {
  return perfTime("partners.createPartnerRequest", async () => {
    const client = getClient(supabase);
    const uid = await requireAuth(client);

    const { data, error } = await client
      .from("partner_links")
      .insert([
        {
          user_id: uid,
          partner_user_id: partnerUserId,
          initiated_by_id: uid,
          status: "pending",
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
 * Either party can revoke; we set revoked_at. We do NOT change `status` to avoid enum/check surprises.
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
