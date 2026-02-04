import React, { useMemo, useState } from "react";
import { createPartnerInvite, fetchPartnerLinks, redeemPartnerInvite } from "../../lib/partnersApi";
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

export default function PartnerDebugScreen({ supabase, session }) {
  const toast = useToast();

  const me = useMemo(() => {
    const u = session?.user || null;
    return {
      id: u?.id || "",
      email: u?.email || "",
    };
  }, [session]);

  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [links, setLinks] = useState([]);
  const [log, setLog] = useState("");

  function appendLog(obj) {
    const line =
      typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    setLog((prev) => (prev ? `${prev}\n\n${line}` : line));
  }

  async function doCreateInvite() {
    setBusy(true);
    try {
      const res = await createPartnerInvite({ supabase });
      setInvite(res);
      appendLog({ createPartnerInvite: res });
      toast?.push?.("Invite code created.");
      try {
        await navigator.clipboard.writeText(res.code);
        toast?.push?.("Code copied to clipboard.");
      } catch {
        // clipboard can fail in some contexts; ignore
      }
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      toast?.push?.(e?.message || "Failed to create invite.");
    } finally {
      setBusy(false);
    }
  }

  async function doRedeem() {
    const code = String(redeemCode || "").trim();
    if (!code) {
      toast?.push?.("Paste an invite code first.");
      return;
    }
    setBusy(true);
    try {
      const res = await redeemPartnerInvite(code, { supabase });
      appendLog({ redeemPartnerInvite: res });
      toast?.push?.("Invite redeemed.");
      setRedeemCode("");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      toast?.push?.(e?.message || "Failed to redeem invite.");
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
      toast?.push?.("Fetched partner links.");
    } catch (e) {
      appendLog({ error: e?.message || String(e) });
      toast?.push?.(e?.message || "Failed to fetch links.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Partner Debug</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Hidden testing screen for partner invite/linking RPCs.
            </div>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12, textAlign: "right" }}>
            <div>{me.email || "—"}</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
              {me.id ? me.id.slice(0, 8) + "…" : "—"}
            </div>
          </div>
        </div>

        <Card>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>1) Create invite</div>
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
        </Card>

        <Card>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>2) Redeem invite (as partner account)</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              placeholder="Paste code here"
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
              }}
            />
            <Button onClick={doRedeem} disabled={busy || !redeemCode.trim()}>
              Redeem code
            </Button>
          </div>
          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
            Redeem should create/accept a <code style={{ opacity: 0.9 }}>partner_links</code> row server-side.
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>3) Fetch links</div>
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
                    {l.status} • {l.id?.slice(0, 8)}…
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    user_id: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{l.user_id}</span>
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
          Note: this route is intentionally not linked in UI. Remove it once partner linking is proven.
        </div>
      </div>
    </div>
  );
}
