import React from "react";
import { Input } from "../inputs/Input"; // adjust path if yours differs
import { MiniPill } from "../ui/MiniPill"; // adjust path if needed

export default function ConnectionsCard({
  SmallButton,
  userId,

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

  setPartnerQuery,
  loadConnections,
  doSearchPartners,
  sendRequest,
  acceptRequest,
  revokeLink,

  helpers,
}) {
  const { getOtherUserId, getNiceNameFromProfile } = helpers || {};

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Connections</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Search by username, send requests, accept requests
          </div>
        </div>
        <SmallButton onClick={loadConnections} disabled={connLoading}>
          {connLoading ? "Loading…" : "Refresh"}
        </SmallButton>
      </div>

      {/* Errors / OK */}
      {connErr && (
        <div style={{ padding: 10, marginBottom: 8, background: "rgba(255,80,80,0.15)" }}>
          {connErr}
        </div>
      )}

      {connOk && (
        <div style={{ padding: 10, marginBottom: 8, background: "rgba(120,255,170,0.15)" }}>
          {connOk}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <Input
          value={partnerQuery}
          onChange={(e) => setPartnerQuery(e.target.value)}
          placeholder="Search usernames"
        />
        <div style={{ marginTop: 6 }}>
          <SmallButton
            onClick={doSearchPartners}
            disabled={partnerSearchBusy || !partnerQuery.trim()}
          >
            {partnerSearchBusy ? "Searching…" : "Search"}
          </SmallButton>
        </div>

        {partnerResults.length > 0 && (
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {partnerResults.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{r.username}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {r.display_name || "—"}
                  </div>
                </div>
                <SmallButton onClick={() => sendRequest(r.id)}>Connect</SmallButton>
              </div>
            ))}
          </div>
        )}

        {partnerQuery && partnerResults.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
            {partnerSearchRawCount === 0
              ? "No matches found."
              : "No new people to connect."}
          </div>
        )}
      </div>

      {/* Incoming */}
      {incomingRequests.length > 0 && (
        <>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Incoming requests</div>
          {incomingRequests.map((l) => {
            const otherId = getOtherUserId(l, userId);
            const p = partnerProfilesById?.[otherId];
            const name = getNiceNameFromProfile(p, otherId);

            return (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 10,
                  marginBottom: 6,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div>Request from {name}</div>
                <SmallButton onClick={() => acceptRequest(l.id)}>Accept</SmallButton>
              </div>
            );
          })}
        </>
      )}

      {/* Outgoing */}
      {outgoingRequests.length > 0 && (
        <>
          <div style={{ fontWeight: 800, margin: "12px 0 6px" }}>Outgoing requests</div>
          {outgoingRequests.map((l) => {
            const otherId = getOtherUserId(l, userId);
            const p = partnerProfilesById?.[otherId];
            const name = getNiceNameFromProfile(p, otherId);

            return (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 10,
                  marginBottom: 6,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div>Pending to {name}</div>
                <SmallButton tone="danger" onClick={() => revokeLink(l.id)}>
                  Cancel
                </SmallButton>
              </div>
            );
          })}
        </>
      )}

      {/* Connected */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Connected</div>

        {connLoading ? (
          <div>Loading…</div>
        ) : connections.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No connections yet.</div>
        ) : (
          connections.map((c) => {
            const name =
              c.profile?.username ||
              c.profile?.display_name ||
              c.otherId?.slice(0, 6);

            return (
              <div
                key={c.otherId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 10,
                  marginBottom: 6,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div>{name}</div>
                <SmallButton tone="danger" onClick={() => revokeLink(c.link.id)}>
                  Remove
                </SmallButton>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}