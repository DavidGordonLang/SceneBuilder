import React from "react";

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
            {subtitle ? (
              <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.3 }}>{subtitle}</div>
            ) : null}
          </div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

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
  const getOtherUserId = helpers?.getOtherUserId || (() => "");
  const getNiceNameFromProfile = helpers?.getNiceNameFromProfile || ((p, id) => p?.username || id);

  return (
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

      {connOk ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(120,255,170,0.25)",
            background: "rgba(120,255,170,0.08)",
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          {connOk}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 750 }}>Find by username</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            value={partnerQuery}
            onChange={(e) => setPartnerQuery(e.target.value)}
            placeholder="Search usernames (e.g. David)"
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
                  <div style={{ fontWeight: 850 }}>{r.username || r.id?.slice(0, 8) + "…"}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>{r.display_name || "—"}</div>
                </div>
                <SmallButton onClick={() => sendRequest(r.id)} title="Send connection request">
                  Connect
                </SmallButton>
              </div>
            ))}
          </div>
        ) : partnerQuery.trim() ? (
          <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.35 }}>
            {partnerSearchRawCount === 0
              ? "No matches found."
              : "No new people to connect — already connected or a request is pending."}
          </div>
        ) : null}

        <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.35 }}>
          Note: this uses a safe RPC (search by username) so we don’t weaken profiles RLS.
        </div>
      </div>

      <div style={{ height: 12 }} />

      {incomingRequests.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Incoming requests</div>
          {incomingRequests.map((l) => {
            const otherId = getOtherUserId(l, userId);
            const p = partnerProfilesById?.[otherId] || null;
            const nice = getNiceNameFromProfile(p, otherId);

            return (
              <div
                key={l.id}
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
                  <div style={{ fontWeight: 850 }}>Request from {nice}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>
                    {p?.display_name ? p.display_name : p?.username ? "—" : otherId?.slice(0, 8) + "…"}
                  </div>
                </div>
                <SmallButton onClick={() => acceptRequest(l.id)} title="Accept connection request">
                  Accept
                </SmallButton>
              </div>
            );
          })}
        </div>
      ) : null}

      {incomingRequests.length ? <div style={{ height: 12 }} /> : null}

      {outgoingRequests.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Outgoing requests</div>
          {outgoingRequests.map((l) => {
            const otherId = getOtherUserId(l, userId);
            const p = partnerProfilesById?.[otherId] || null;
            const nice = getNiceNameFromProfile(p, otherId);

            return (
              <div
                key={l.id}
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
                  <div style={{ fontWeight: 850 }}>Pending to {nice}</div>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Waiting for acceptance</div>
                </div>
                <SmallButton tone="danger" onClick={() => revokeLink(l.id, "Request cancelled.")} title="Cancel request">
                  Cancel
                </SmallButton>
              </div>
            );
          })}
        </div>
      ) : null}

      {outgoingRequests.length ? <div style={{ height: 12 }} /> : null}

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>Connected</div>

        {connLoading ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>Loading connections…</div>
        ) : connections.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {connections.map((c) => {
              const name = c.profile?.username || c.profile?.display_name || c.otherId?.slice(0, 8) + "…";
              const avatar = c.signedAvatarUrl || "";
              const initials = String(name || "U").slice(0, 1).toUpperCase();

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
                        initials
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900 }}>{name}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>Connected</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <MiniPill>Connected</MiniPill>
                    <SmallButton
                      tone="danger"
                      onClick={() => revokeLink(c.link?.id, "Connection removed.")}
                      title="Remove connection"
                    >
                      Remove
                    </SmallButton>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 13 }}>No connections yet.</div>
        )}
      </div>
    </Card>
  );
}