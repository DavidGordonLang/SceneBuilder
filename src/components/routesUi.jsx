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
    minWidth: TOPBAR_ICON_SIZE,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "inherit",
    fontSize: 16,
    lineHeight: 1,
    padding: 0,
    textDecoration: "none",
  };
}

function IconLink({ to, label, title, children }) {
  return (
    <Link to={to} aria-label={label} title={title} style={iconButtonStyle()}>
      {children}
    </Link>
  );
}

export function IconButton({ onClick, label, title, children }) {
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

/**
 * TopBar layout:
 * Row 1: Title only (clean page title)
 * Row 2: Back + rightSlot (left) | nav cluster (right)
 */
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
        paddingBottom: 14,
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          fontWeight: 950,
          fontSize: 18,
          letterSpacing: 0.2,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {showBack ? (
            <IconButton onClick={handleBack} label="Back" title="Back">
              ←
            </IconButton>
          ) : null}

          {rightSlot ? <div>{rightSlot}</div> : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconLink to="/scenes" label="Scenes" title="Scenes">
            🎬
          </IconLink>
          <IconLink to="/tools" label="Tools" title="Tools">
            🧰
          </IconLink>
          <IconLink to="/journal" label="Journal" title="Journal">
            📓
          </IconLink>
          <IconLink to="/profile" label="Profile" title="Profile">
            👤
          </IconLink>
          <IconButton onClick={onSignOut} label="Sign out" title="Sign out">
            ⎋
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        fontSize: 12,
        fontWeight: 800,
        opacity: 0.9,
      }}
    >
      {children}
    </span>
  );
}

export function SmallButton({ children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.18)",
        background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
        color: "inherit",
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children, onClick, title }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.04)",
        padding: 12,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

export function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>{children}</div>
  );
}

export function TextInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.20)",
        color: "inherit",
        outline: "none",
      }}
    />
  );
}

export function TextArea({ value, onChange, placeholder, disabled, rows = 5 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.20)",
        color: "inherit",
        outline: "none",
        resize: "vertical",
      }}
    />
  );
}
