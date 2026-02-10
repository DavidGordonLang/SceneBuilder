import React from "react";

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

export default function TopKinksCard({ SmallButton, topKinks, hasAnyKinks, onOpenKinks }) {
  const list = Array.isArray(topKinks) ? topKinks.filter(Boolean).slice(0, 5) : [];

  if (list.length) {
    return (
      <Card
        title="Top kinks"
        subtitle="Shown to connected partners"
        right={
          <SmallButton asLink to="/profile/kinks" title="Edit kink preferences">
            Edit
          </SmallButton>
        }
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {list.map((k) => (
            <MiniPill key={k}>{k}</MiniPill>
          ))}
        </div>
      </Card>
    );
  }

  // Keep your existing placeholder copy/behaviour
  return (
    <Card
      title="Top kinks"
      subtitle="Optional. Hidden if empty."
      right={
        <SmallButton asLink to="/profile/kinks" title="Open kink preferences">
          Open
        </SmallButton>
      }
    >
      <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.35 }}>
        Next: pick 0–5 “Top kinks” from your kink list. For now this section is just a placeholder.
      </div>
    </Card>
  );
}