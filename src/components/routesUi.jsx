import React from "react";
import { Link } from "react-router-dom";

export function TopBar({ title, onSignOut, rightSlot }) {
  return (
    <div
      style={{
        padding: 16,
        paddingTop: 18,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Settings icon */}
        <Link
          to="/settings"
          aria-label="Settings"
          title="Settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            textDecoration: "none",
            fontSize: 16,
          }}
        >
          ⚙️
        </Link>

        {/* Profile icon */}
        <Link
          to="/profile"
          aria-label="Profile"
          title="Profile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            textDecoration: "none",
            fontSize: 16,
          }}
        >
          👤
        </Link>

        {rightSlot}

        <button
          onClick={onSignOut}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 650,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        opacity: 0.9,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function SmallButton({ children, onClick, disabled, title, tone = "neutral" }) {
  const toneStyle =
    tone === "danger"
      ? {
          border: "1px solid rgba(255,80,80,0.25)",
          background: disabled ? "rgba(255,80,80,0.06)" : "rgba(255,80,80,0.10)",
        }
      : {
          border: "1px solid rgba(255,255,255,0.14)",
          background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
        };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        color: "#f3f3f7",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 700,
        opacity: disabled ? 0.55 : 1,
        ...toneStyle,
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children, onClick, asLink, to }) {
  const base = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  };

  if (asLink) {
    return (
      <Link
        to={to}
        style={{
          ...base,
          display: "block",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        ...base,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

export function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{children}</div>;
}

export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
      }}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        resize: "vertical",
      }}
    />
  );
}
