import React from "react";

export default function KinksPreviewModal({ SmallButton, modal, onClose }) {
  if (!modal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,20,28,0.96)",
          padding: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950 }}>{modal.name}</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>Preferences (visibility rules apply)</div>
          </div>
          <SmallButton onClick={onClose}>Close</SmallButton>
        </div>

        <div style={{ height: 12 }} />

        <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
          This will show their Top kinks + kink list sections once we ship:
          <ul style={{ margin: "8px 0 0 18px", opacity: 0.85 }}>
            <li>Visibility toggles (both sides)</li>
            <li>Shared display of kink lists</li>
            <li>Top 5 kinks surfaced as pills</li>
          </ul>
        </div>
      </div>
    </div>
  );
}