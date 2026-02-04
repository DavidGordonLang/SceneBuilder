import React, { useMemo, useState } from "react";
import { createPartnerInvite, fetchPartnerLinks, redeemPartnerInvite } from "../../lib/partnersApi";
import {
  agreeToNegotiation,
  createBlockSuggestion,
  createToolSuggestionByUserTool,
  createToolSuggestionByVault,
  ensureNegotiation,
  fetchBlockSuggestions,
  fetchNegotiation,
  fetchNegotiationAgreements,
  fetchToolSuggestions,
  lockNegotiation,
  setBlockSuggestionStatus,
  setToolSuggestionStatus,
  unagreeToNegotiation,
  unlockNegotiation,
  updateNegotiationDraft,

  // NEW: unlock requests
  requestNegotiationUnlock,
  fetchNegotiationUnlockRequests,
  resolveNegotiationUnlockRequest,
} from "../../lib/sceneCollabApi";
import { useToast } from "../../ui/ToastContext.jsx";

function Card({ children }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}

function Button({ children, onClick, disabled, tone = "default" }) {
  const styles =
    tone === "danger"
      ? {
          border: "1px solid rgba(255,80,80,0.30)",
          background: "rgba(255,80,80,0.10)",
        }
      : {
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.06)",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 42,
        padding: "0 12px",
        borderRadius: 12,
        color: "#f3f3f7",
        fontWeight: 850,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...styles,
      }}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, mono = false }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        height: 42,
        minWidth: 220,
        flex: "1 1 260px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#f3f3f7",
        padding: "0 12px",
        outline: "none",
        fontWeight: 700,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined,
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={5}
      style={{
        width: "100%",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(0,0,0,0.25)",
        color: "#f3f3f7",
        padding: 12,
        outline: "none",
        fontWeight: 650,
        lineHeight: 1.35,
        resize: "vertical",
      }}
    />
  );
}

function shortId(id) {
  if (!id) return "—";
  return id.slice(0, 8) + "…";
}

export default function PartnerDebugScreen({ supabase, session }) {
  const toast = useToast();
  const notify = (message, opts) => {
    try {
      toast?.showToast?.(message, opts);
    } catch {
      // fail silent in debug only
    }
  };

  const me = useMemo(() => {
    const u = session?.user || null;
    const name =
      u?.user_metadata?.full_name ||
      u?.user_metadata?.name ||
      u?.user_metadata?.display_name ||
      u?.email ||
      "";
    return {
      id: u?.id || "",
      email: u?.email || "",
      name,
    };
  }, [session]);

  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [links, setLinks] = useState([]);
  const [log, setLog] = useState("");

  // Collab state
  const [sceneId, setSceneId] = useState("");
  const [neg, setNeg] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [unlockReason, setUnlockReason] = useState("Change requested / renegotiate");
  const [agreements, setAgreements] = useState([]);
  const [nameMap, setNameMap] = useState({}); // user_id -> display_name
  const [requiredAgree, setRequiredAgree] = useState([]); // list of user_ids required for lock

  // NEW: unlock request state
  const [unlockRequestReason, setUnlockRequestReason] = useState("Please unlock so I can propose a change.");
  const [unlockRequests, setUnlockRequests] = useState([]);
  const [resolveUnlockReason, setResolveUnlockReason] = useState("Unlock requested by participant");

  const [blockKey, setBlockKey] = useState("planning");
  const [blockSuggestionText, setBlockSuggestionText] = useState("");
  const [toolUserId, setToolUserId] = useState("");
  const [toolGlobalId, setToolGlobalId] = useState("");
  const [toolNote, setToolNote] = useState("");
  const [blockSuggestions, setBlockSuggestions] = useState([]);
  const [toolSuggestions, setToolSuggestions] = useState([]);

  function appendLog(obj) {
    const line = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    setLog((prev) => (prev ? `${prev}\n\n${line}` : line));
  }

  function displayNameFor(uid) {
    if (!uid) return "—";
    return nameMap?.[uid] || shortId(uid);
  }

  async function hydrateNames(userIds) {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!ids.length) return;

    const missing = ids.filter((id) => !nameMap[id]);
    if (!missing.length) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", missing);

    if (error) throw error;

    const next = { ...(nameMap || {}) };
    for (const row of data || []) {
      next[row.id] = row.display_name || shortId(row.id);
    }
    for (const id of missing) {
      if (!next[id]) next[id] = shortId(id);
    }

    setNameMap(next);
  }

  async function fetchRequiredAgreeSet(scene_id) {
    const { data: sceneRow, error: sceneErr } = await supabase
      .from("scenes")
      .select("id, user_id")
      .eq("id", scene_id)
      .single();
    if (sceneErr) throw sceneErr;

    const ownerId = sceneRow?.user_id;

    const { data: shares, error: shErr } = await supabase
      .from("scene_shares")
      .select("shared_with_user_id, role")
      .eq("scene_id", scene_id);
    if (shErr) throw shErr;

    const contributorIds = (shares || [])
      .filter((s) => (s.role || "") === "contributor")
      .map((s) => s.shared_with_user_id);

    const req = Array.from(new Set([ownerId, ...contributorIds].filter(Boolean)));
    setRequiredAgree(req);
    await hydrateNames(req);

    return req;
  }

  // ----------------------------
  // Partners (existing)
  // ----------------------------
  async function doCreateInvite() {
    setBusy(true);
    try {
      const res = await createPartnerInvite({ supabase });
      setInvite(res);
      appendLog({ createPartnerInvite: res });
      notify("Invite code created.");
      try {
        await navigator.clipboard.writeText(res.code);
        notify("Code copied to clipboard.");
      } catch {
        // ignore
      }
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function doRedeem() {
    const code = String(redeemCode || "").trim();
    if (!code) {
      notify("Paste an invite code first.");
      return;
    }
    setBusy(true);
    try {
      const res = await redeemPartnerInvite(code, { supabase });
      appendLog({ redeemPartnerInvite: res });
      notify("Invite redeemed.");
      setRedeemCode("");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to redeem invite.");
    } finally {
      setBusy(false);
    }
  }

  async function doFetchLinks() {
    setBusy(true);
    try {
      const res = await fetchPartnerLinks({ supabase });
      setLinks(res);
      appendLog({ fetchPartnerLinks: res });
      notify("Fetched partner links.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to fetch links.");
    } finally {
      setBusy(false);
    }
  }

  // ----------------------------
  // Collab (new)
  // ----------------------------
  function requireSceneId() {
    const id = String(sceneId || "").trim();
    if (!id) throw new Error("Paste a scene_id first.");
    return id;
  }

  async function doEnsureNegotiation() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const res = await ensureNegotiation(id, { supabase });
      setNeg(res);
      setDraftText(res?.draft_text ?? "");
      appendLog({ ensureNegotiation: res });
      notify("Negotiation ensured.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to ensure negotiation.");
    } finally {
      setBusy(false);
    }
  }

  async function doFetchNegotiation() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const res = await fetchNegotiation(id, { supabase });
      setNeg(res);
      setDraftText(res?.draft_text ?? "");
      appendLog({ fetchNegotiation: res });
      notify("Negotiation fetched.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to fetch negotiation.");
    } finally {
      setBusy(false);
    }
  }

  async function doUpdateDraft() {
    setBusy(true);
    try {
      const id = requireSceneId();
      if (neg?.status === "locked") throw new Error("Negotiation is locked. Owner must unlock first.");
      const res = await updateNegotiationDraft(id, draftText, { supabase });
      setNeg(res);
      appendLog({ updateNegotiationDraft: res });
      notify("Draft updated.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to update draft.");
    } finally {
      setBusy(false);
    }
  }

  async function doFetchAgreements() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const n = neg || (await fetchNegotiation(id, { supabase }));
      if (!n) throw new Error("No negotiation row found.");

      const res = await fetchNegotiationAgreements(id, n.version, { supabase });
      setAgreements(res);

      const ids = (res || []).map((r) => r.user_id);
      await hydrateNames(ids);

      appendLog({ fetchNegotiationAgreements: { scene_id: id, version: n.version, rows: res } });
      notify("Agreements fetched.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to fetch agreements.");
    } finally {
      setBusy(false);
    }
  }

  async function doAgree() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const n = neg || (await fetchNegotiation(id, { supabase }));
      if (!n) throw new Error("No negotiation row found.");
      if (n.status === "locked") throw new Error("Negotiation is locked. No need to agree.");

      const res = await agreeToNegotiation(id, n.version, { supabase });
      appendLog({ agreeToNegotiation: res });
      notify("Agreed.");
      await doFetchAgreements();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to agree.");
    } finally {
      setBusy(false);
    }
  }

  async function doUnagree() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const n = neg || (await fetchNegotiation(id, { supabase }));
      if (!n) throw new Error("No negotiation row found.");
      if (n.status === "locked") throw new Error("Negotiation is locked. Owner must unlock first.");

      await unagreeToNegotiation(id, n.version, { supabase });
      appendLog({ unagreeToNegotiation: { scene_id: id, version: n.version, user_id: me.id } });
      notify("Un-agreed.");
      await doFetchAgreements();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to un-agree.");
    } finally {
      setBusy(false);
    }
  }

  async function doLock() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const n = neg || (await fetchNegotiation(id, { supabase }));
      if (!n) throw new Error("No negotiation row found.");
      if (n.status === "locked") throw new Error("Already locked.");

      const required = await fetchRequiredAgreeSet(id);
      const rows = await fetchNegotiationAgreements(id, n.version, { supabase });
      const agreedSet = new Set((rows || []).map((r) => r.user_id));

      await hydrateNames(required);

      const missing = required.filter((uid) => !agreedSet.has(uid));
      if (missing.length) {
        const who = missing.map((uid) => displayNameFor(uid)).join(", ");
        throw new Error(`Cannot lock: missing agreement(s) from: ${who}`);
      }

      const lockedText = String(n.draft_text ?? "");
      const res = await lockNegotiation(id, { lockedText, lockedByUserId: me.id }, { supabase });
      setNeg(res);
      appendLog({ lockNegotiation: res });
      notify("Locked.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to lock.");
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const res = await unlockNegotiation(id, { unlockReason, unlockedByUserId: me.id }, { supabase });
      setNeg(res);
      setDraftText(res?.draft_text ?? "");
      appendLog({ unlockNegotiation: res });
      notify("Unlocked (version bumped; agreements reset).");
      setAgreements([]);
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to unlock.");
    } finally {
      setBusy(false);
    }
  }

  // ----------------------------
  // Unlock requests (new)
  // ----------------------------
  async function doRequestUnlock() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const reason = String(unlockRequestReason || "").trim();
      if (!reason) throw new Error("Add a reason first.");
      const res = await requestNegotiationUnlock(id, reason, { supabase });
      appendLog({ requestNegotiationUnlock: res });
      notify("Unlock request sent.");
      await doFetchUnlockRequests();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to request unlock.");
    } finally {
      setBusy(false);
    }
  }

  async function doFetchUnlockRequests() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const rows = await fetchNegotiationUnlockRequests(id, { supabase });
      setUnlockRequests(rows);

      const ids = (rows || []).map((r) => r.requested_by_user_id).filter(Boolean);
      await hydrateNames(ids);

      appendLog({ fetchNegotiationUnlockRequests: { scene_id: id, rows } });
      notify("Unlock requests fetched.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to fetch unlock requests.");
    } finally {
      setBusy(false);
    }
  }

  async function doOwnerUnlockFromRequest(reqId) {
    setBusy(true);
    try {
      const id = requireSceneId();
      if (!reqId) throw new Error("Missing request id.");
      const res = await resolveNegotiationUnlockRequest(
        reqId,
        { action: "unlock", unlockReason: resolveUnlockReason },
        { supabase }
      );

      appendLog({ resolveNegotiationUnlockRequest_unlock: res });
      notify("Unlocked from request (version bumped).");

      // Refresh negotiation + agreements + requests
      const n = await fetchNegotiation(id, { supabase });
      setNeg(n);
      setDraftText(n?.draft_text ?? "");
      setAgreements([]);
      await doFetchUnlockRequests();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to unlock from request.");
    } finally {
      setBusy(false);
    }
  }

  async function doOwnerDismissRequest(reqId) {
    setBusy(true);
    try {
      requireSceneId();
      if (!reqId) throw new Error("Missing request id.");

      const res = await resolveNegotiationUnlockRequest(reqId, { action: "dismiss" }, { supabase });
      appendLog({ resolveNegotiationUnlockRequest_dismiss: res });
      notify("Request dismissed.");
      await doFetchUnlockRequests();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to dismiss request.");
    } finally {
      setBusy(false);
    }
  }

  // ----------------------------
  // Suggestions
  // ----------------------------
  async function doCreateBlockSuggestion() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const txt = String(blockSuggestionText || "").trim();
      if (!txt) throw new Error("Write a suggested text first.");
      const res = await createBlockSuggestion(id, blockKey, txt, { supabase });
      appendLog({ createBlockSuggestion: res });
      notify("Block suggestion created.");
      setBlockSuggestionText("");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to create block suggestion.");
    } finally {
      setBusy(false);
    }
  }

  async function doCreateToolSuggestionUserTool() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const tuid = String(toolUserId || "").trim();
      if (!tuid) throw new Error("Paste tools_user_id first.");
      const res = await createToolSuggestionByUserTool(id, tuid, toolNote, { supabase });
      appendLog({ createToolSuggestionByUserTool: res });
      notify("Tool suggestion created (tools_user).");
      setToolUserId("");
      setToolNote("");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to create tool suggestion.");
    } finally {
      setBusy(false);
    }
  }

  async function doCreateToolSuggestionVault() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const gid = String(toolGlobalId || "").trim();
      if (!gid) throw new Error("Paste tools_global_id first.");
      const res = await createToolSuggestionByVault(id, gid, toolNote, { supabase });
      appendLog({ createToolSuggestionByVault: res });
      notify("Tool suggestion created (vault).");
      setToolGlobalId("");
      setToolNote("");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to create tool suggestion.");
    } finally {
      setBusy(false);
    }
  }

  async function doFetchSuggestions() {
    setBusy(true);
    try {
      const id = requireSceneId();
      const [bs, ts] = await Promise.all([
        fetchBlockSuggestions(id, { supabase }),
        fetchToolSuggestions(id, { supabase }),
      ]);
      setBlockSuggestions(bs);
      setToolSuggestions(ts);

      const ids = [
        ...(bs || []).map((r) => r.suggested_by_user_id),
        ...(ts || []).map((r) => r.suggested_by_user_id),
      ];
      await hydrateNames(ids);

      appendLog({ fetchSuggestions: { block: bs, tool: ts } });
      notify("Suggestions fetched.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to fetch suggestions.");
    } finally {
      setBusy(false);
    }
  }

  async function doAcceptBlockSuggestion(sugId) {
    setBusy(true);
    try {
      const res = await setBlockSuggestionStatus(sugId, "accepted", { supabase });
      appendLog({ setBlockSuggestionStatus: res });
      notify("Block suggestion accepted.");
      await doFetchSuggestions();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to accept.");
    } finally {
      setBusy(false);
    }
  }

  async function doRejectBlockSuggestion(sugId) {
    setBusy(true);
    try {
      const res = await setBlockSuggestionStatus(sugId, "rejected", { supabase });
      appendLog({ setBlockSuggestionStatus: res });
      notify("Block suggestion rejected.");
      await doFetchSuggestions();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to reject.");
    } finally {
      setBusy(false);
    }
  }

  async function doAcceptToolSuggestion(sugId) {
    setBusy(true);
    try {
      const res = await setToolSuggestionStatus(sugId, "accepted", { supabase });
      appendLog({ setToolSuggestionStatus: res });
      notify("Tool suggestion accepted.");
      await doFetchSuggestions();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to accept.");
    } finally {
      setBusy(false);
    }
  }

  async function doRejectToolSuggestion(sugId) {
    setBusy(true);
    try {
      const res = await setToolSuggestionStatus(sugId, "rejected", { supabase });
      appendLog({ setToolSuggestionStatus: res });
      notify("Tool suggestion rejected.");
      await doFetchSuggestions();
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      notify(e?.message || "Failed to reject.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Debug</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Hidden testing screen for partner linking + scene collaboration plumbing.
            </div>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12, textAlign: "right" }}>
            <div>{me.email || "—"}</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              {me.id ? me.id.slice(0, 8) + "…" : "—"}
            </div>
          </div>
        </div>

        {/* Partner Linking */}
        <Card>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Partner Linking</div>

          <div style={{ fontWeight: 850, marginBottom: 8, opacity: 0.9 }}>1) Create invite</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Button onClick={doCreateInvite} disabled={busy}>
              {busy ? "Working…" : "Create invite code"}
            </Button>

            {invite?.code ? (
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>Code</div>
                <div
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 16,
                    letterSpacing: 1,
                    fontWeight: 900,
                  }}
                >
                  {invite.code}
                </div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  Expires: {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : "—"}
                </div>
              </div>
            ) : (
              <div style={{ opacity: 0.7, fontSize: 13 }}>No invite created yet.</div>
            )}
          </div>

          <div style={{ height: 10 }} />

          <div style={{ fontWeight: 850, marginBottom: 8, opacity: 0.9 }}>
            2) Redeem invite (as partner account)
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <TextInput value={redeemCode} onChange={setRedeemCode} placeholder="Paste code here" mono />
            <Button onClick={doRedeem} disabled={busy || !redeemCode.trim()}>
              Redeem code
            </Button>
          </div>

          <div style={{ height: 10 }} />

          <div style={{ fontWeight: 850, marginBottom: 8, opacity: 0.9 }}>3) Fetch links</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Button onClick={doFetchLinks} disabled={busy}>
              Fetch partner links
            </Button>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {links.length ? `${links.length} link(s)` : "No links loaded yet."}
            </div>
          </div>

          {links.length ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {links.map((l) => (
                <div
                  key={l.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.20)",
                    fontSize: 12,
                    lineHeight: 1.35,
                  }}
                >
                  <div style={{ fontWeight: 900 }}>
                    {l.status} • {shortId(l.id)}
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    user_id:{" "}
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {l.user_id}
                    </span>
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    partner_user_id:{" "}
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {l.partner_user_id}
                    </span>
                  </div>
                  <div style={{ opacity: 0.75 }}>
                    accepted_at: {l.accepted_at ? new Date(l.accepted_at).toLocaleString() : "—"} • revoked_at:{" "}
                    {l.revoked_at ? new Date(l.revoked_at).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        {/* Collab Debug */}
        <Card>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Collab Debug</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <TextInput value={sceneId} onChange={setSceneId} placeholder="Paste scene_id here" mono />
            <Button onClick={doEnsureNegotiation} disabled={busy || !sceneId.trim()}>
              Ensure negotiation
            </Button>
            <Button onClick={doFetchNegotiation} disabled={busy || !sceneId.trim()}>
              Fetch negotiation
            </Button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.20)",
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              <div style={{ fontWeight: 900 }}>Negotiation status</div>
              <div style={{ opacity: 0.85 }}>
                status: <b>{neg?.status || "—"}</b> • version: <b>{neg?.version ?? "—"}</b>
              </div>
              <div style={{ opacity: 0.75 }}>
                locked_at: {neg?.locked_at ? new Date(neg.locked_at).toLocaleString() : "—"} • unlocked_at:{" "}
                {neg?.unlocked_at ? new Date(neg.unlocked_at).toLocaleString() : "—"}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 850, marginBottom: 6, opacity: 0.9 }}>Draft (editable in draft state)</div>
              <TextArea value={draftText} onChange={setDraftText} placeholder="Negotiation draft…" />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <Button onClick={doUpdateDraft} disabled={busy || !sceneId.trim()}>
                  Save draft
                </Button>
                <Button onClick={doAgree} disabled={busy || !sceneId.trim()}>
                  Agree (me)
                </Button>
                <Button onClick={doUnagree} disabled={busy || !sceneId.trim()}>
                  Un-agree (me)
                </Button>
                <Button onClick={doFetchAgreements} disabled={busy || !sceneId.trim()}>
                  Fetch agreements
                </Button>
              </div>

              {agreements.length ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                    Agreements (current version)
                  </div>
                  {agreements.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.20)",
                        fontSize: 12,
                        lineHeight: 1.35,
                      }}
                    >
                      <div style={{ fontWeight: 850 }}>
                        {displayNameFor(a.user_id)} • v{a.version}
                      </div>
                      <div style={{ opacity: 0.75 }}>
                        agreed_at: {a.agreed_at ? new Date(a.agreed_at).toLocaleString() : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* NEW: Unlock requests */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 850, opacity: 0.9 }}>Unlock requests</div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.20)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
                  Participants can request an unlock when negotiation is <b>locked</b>. Owner can dismiss or unlock from
                  a request (which bumps version).
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <TextInput
                    value={unlockRequestReason}
                    onChange={setUnlockRequestReason}
                    placeholder="Reason for unlock request…"
                  />
                  <Button onClick={doRequestUnlock} disabled={busy || !sceneId.trim()}>
                    Request unlock (participant)
                  </Button>
                  <Button onClick={doFetchUnlockRequests} disabled={busy || !sceneId.trim()}>
                    Fetch unlock requests
                  </Button>
                </div>

                {unlockRequests.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {unlockRequests.map((r) => {
                      const who = displayNameFor(r.requested_by_user_id);
                      const created = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
                      const resolved = r.resolved_at ? new Date(r.resolved_at).toLocaleString() : "—";

                      return (
                        <div
                          key={r.id}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.18)",
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>
                            {r.status} • {shortId(r.id)} • v{r.negotiation_version ?? "—"}
                          </div>
                          <div style={{ opacity: 0.8, marginTop: 4 }}>
                            by: <b>{who}</b> • created: {created}
                          </div>
                          <div style={{ opacity: 0.75 }}>resolved: {resolved}</div>
                          {r.reason ? (
                            <div style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>{r.reason}</div>
                          ) : null}

                          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                              <TextInput
                                value={resolveUnlockReason}
                                onChange={setResolveUnlockReason}
                                placeholder="Owner unlock reason (stored on negotiation)…"
                              />
                              <Button onClick={() => doOwnerUnlockFromRequest(r.id)} disabled={busy} tone="danger">
                                Unlock from request (owner)
                              </Button>
                              <Button onClick={() => doOwnerDismissRequest(r.id)} disabled={busy}>
                                Dismiss request (owner)
                              </Button>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.65 }}>
                              Note: only owner will succeed; participants will see an RLS error in the log.
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No unlock requests loaded.</div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 850, opacity: 0.9 }}>Owner actions</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button onClick={doLock} disabled={busy || !sceneId.trim()}>
                  Lock (owner)
                </Button>
                <TextInput value={unlockReason} onChange={setUnlockReason} placeholder="Unlock reason…" />
                <Button onClick={doUnlock} disabled={busy || !sceneId.trim()} tone="danger">
                  Unlock (owner)
                </Button>
              </div>

              {requiredAgree?.length ? (
                <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.35 }}>
                  Required to lock: {requiredAgree.map((uid) => displayNameFor(uid)).join(", ")}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.35 }}>
                  Lock enforces: owner + all contributor participants must agree for current version.
                </div>
              )}
            </div>

            {/* Suggestions (unchanged) */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 850, opacity: 0.9 }}>Suggestions</div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.20)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 850, opacity: 0.9 }}>Block suggestion</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <TextInput value={blockKey} onChange={setBlockKey} placeholder="block_key (e.g. aftercare)" />
                  <Button onClick={doCreateBlockSuggestion} disabled={busy || !sceneId.trim()}>
                    Create
                  </Button>
                </div>
                <TextArea value={blockSuggestionText} onChange={setBlockSuggestionText} placeholder="Suggested text…" />
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.20)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 850, opacity: 0.9 }}>Tool suggestion</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <TextInput value={toolUserId} onChange={setToolUserId} placeholder="tools_user_id (instance)" mono />
                  <Button onClick={doCreateToolSuggestionUserTool} disabled={busy || !sceneId.trim()}>
                    Suggest instance
                  </Button>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <TextInput value={toolGlobalId} onChange={setToolGlobalId} placeholder="tools_global_id (vault)" mono />
                  <Button onClick={doCreateToolSuggestionVault} disabled={busy || !sceneId.trim()}>
                    Suggest vault item
                  </Button>
                </div>
                <TextInput value={toolNote} onChange={setToolNote} placeholder="Note / reason (optional)" />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Button onClick={doFetchSuggestions} disabled={busy || !sceneId.trim()}>
                  Fetch suggestions
                </Button>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  block: {blockSuggestions.length} • tool: {toolSuggestions.length}
                </div>
              </div>

              {(blockSuggestions.length || toolSuggestions.length) ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {blockSuggestions.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Block suggestions</div>
                      {blockSuggestions.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.20)",
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>
                            {s.status} • {s.block_key} • {shortId(s.id)}
                          </div>
                          <div style={{ opacity: 0.75 }}>
                            by: {displayNameFor(s.suggested_by_user_id)} • {new Date(s.created_at).toLocaleString()}
                          </div>
                          <div style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>{s.suggested_text}</div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                            <Button onClick={() => doAcceptBlockSuggestion(s.id)} disabled={busy}>
                              Accept (owner)
                            </Button>
                            <Button onClick={() => doRejectBlockSuggestion(s.id)} disabled={busy} tone="danger">
                              Reject (owner)
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {toolSuggestions.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Tool suggestions</div>
                      {toolSuggestions.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(0,0,0,0.20)",
                            fontSize: 12,
                            lineHeight: 1.35,
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>
                            {s.status} • {shortId(s.id)}
                          </div>
                          <div style={{ opacity: 0.75 }}>
                            by: {displayNameFor(s.suggested_by_user_id)} • {new Date(s.created_at).toLocaleString()}
                          </div>
                          <div style={{ opacity: 0.85, marginTop: 6 }}>
                            tools_user_id:{" "}
                            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                              {s.tools_user_id || "—"}
                            </span>
                          </div>
                          <div style={{ opacity: 0.85 }}>
                            tools_global_id:{" "}
                            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                              {s.tools_global_id || "—"}
                            </span>
                          </div>
                          {s.note ? <div style={{ opacity: 0.85, marginTop: 6 }}>note: {s.note}</div> : null}

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                            <Button onClick={() => doAcceptToolSuggestion(s.id)} disabled={busy}>
                              Accept (owner)
                            </Button>
                            <Button onClick={() => doRejectToolSuggestion(s.id)} disabled={busy} tone="danger">
                              Reject (owner)
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Debug log</div>
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 12,
              opacity: 0.9,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            {log || "—"}
          </pre>
        </Card>

        <div style={{ opacity: 0.65, fontSize: 12, lineHeight: 1.35 }}>
          Note: this route is intentionally not linked in UI. Remove it once partner linking + collab plumbing is proven.
        </div>
      </div>
    </div>
  );
}
