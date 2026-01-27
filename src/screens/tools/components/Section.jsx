import React from "react";

export default function Section({ title, subtitle, children }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
        {subtitle ? <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.35 }}>{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}
