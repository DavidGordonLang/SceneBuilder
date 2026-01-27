import React, { useEffect, useRef, useState } from "react";

export default function KebabMenu({ items, disabled }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      const t = e.target;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((v) => !v);
        }}
        aria-label="More actions"
        title="More"
        style={{
          border: "none",
          background: "transparent",
          color: "#f3f3f7",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: 6,
          lineHeight: 1,
          fontSize: 18,
          opacity: disabled ? 0.45 : 0.85,
        }}
      >
        ⋯
      </button>

      {open ? (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 170,
            padding: 6,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(20,20,24,0.92)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
            zIndex: 50,
            display: "grid",
            gap: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick?.();
              }}
              style={{
                textAlign: "left",
                width: "100%",
                border: "none",
                borderRadius: 10,
                padding: "10px 10px",
                background:
                  it.tone === "danger" ? "rgba(255,80,80,0.12)" : "rgba(255,255,255,0.06)",
                color: "#f3f3f7",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 750,
                opacity: 0.95,
              }}
              title={it.title || it.label}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
