// src/components/profile/ProfileUi.jsx

import React from "react";

export function Field({ label, children, hint }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.3 }}>{hint}</div> : null}
    </div>
  );
}

export function Input(props) {
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

export function TextArea(props) {
  return (
    <textarea
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
        resize: "vertical",
        minHeight: 80,
      }}
    />
  );
}

export function SkeletonText({ width = "70%", height = 12 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 999,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  );
}

export function Card({ children, title, subtitle, right }) {
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

export function MiniPill({ children }) {
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