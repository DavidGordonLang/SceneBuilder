import React from "react";
import { Link, useNavigate } from "react-router-dom";

const TOPBAR_ICON_SIZE = 40;

function iconButtonStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: TOPBAR_ICON_SIZE,
    height: TOPBAR_ICON_SIZE,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#f3f3f7",
    textDecoration: "none",
    fontSize: 16,
  };
}

function IconLink({ to, label, title, children }) {
  return (
    <Link to={to} aria-label={label} title={title} style={iconButtonStyle()}>
      {children}
    </Link>
  );
}

function IconButton({ onClick, label, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      style={{ ...iconButtonStyle(), cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

export function TopBar({ title, onSignOut, rightSlot, showBack = false, backTo }) {
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) navigate(backTo);
    else navigate(-1);
  }

  return (
    <div
      style={{
        padding: 16,
        paddingTop: 18,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        alignItems: "center",
        gap: 12,
        gridTemplateColumns: `${TOPBAR_ICON_SIZE}px 1fr auto`,
      }}
    >
      {/* Left: reserve fixed space so the title doesn't shift when back is absent */}
      <div style={{ width: TOPBAR_ICON_SIZE, display: "flex", alignItems: "center" }}>
        {showBack ? (
          <IconButton onClick={handleBack} label="Back" title="Back">
            ←
          </IconButton>
        ) : null}
      </div>

      {/* Center: title */}
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: actions + stable nav cluster */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          minWidth: 0,
        }}
      >
        {rightSlot ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{rightSlot}</div>
        ) : null}

        {/* Home (routes to /home, which currently redirects to /scenes) */}
        <IconLink to="/home" label="Home" title="Home">
          ⌂
        </IconLink>

        {/* Settings */}
        <IconLink to="/settings" label="Settings" title="Settings">
          ⚙️
        </IconLink>

        {/* Profile */}
        <IconLink to="/profile" label="Profile" title="Profile">
          👤
        </IconLink>

        <button
          onClick={onSignOut}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 650,
            lineHeight: 1,
            whiteSpace: "nowrap",
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

export function SmallButton({
  children,
  onClick,
  disabled,
  title,
  tone = "neutral",
  asLink = false,
  to,
}) {
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

  const baseStyle = {
    padding: "8px 10px",
    borderRadius: 10,
    color: "#f3f3f7",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 700,
    opacity: disabled ? 0.55 : 1,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    ...toneStyle,
  };

  if (asLink) {
    return (
      <Link
        to={to}
        title={title}
        style={baseStyle}
        aria-disabled={disabled ? "true" : "false"}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} title={title} style={baseStyle}>
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
