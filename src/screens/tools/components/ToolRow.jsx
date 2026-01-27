import React from "react";

function ExpandChevron({ open }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        fontSize: 16,
        lineHeight: 1,
        opacity: 0.8,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
        userSelect: "none",
        flex: "0 0 auto",
      }}
    >
      ▸
    </span>
  );
}

export default function ToolRow({ tool, menuItems, open, onToggle, expandedContent }) {
  const icon = tool.icon || "🧰";

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
      title="Tap to expand / collapse"
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.05)",
          fontSize: 18,
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tool.name}
              </div>

              {typeof tool.count === "number" ? (
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.65,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontWeight: 800,
                  }}
                  title="Instances"
                >
                  {tool.count}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
            {menuItems?.length ? <div style={{ display: "flex", alignItems: "center" }}>{menuItems}</div> : null}
            <ExpandChevron open={open} />
          </div>
        </div>

        {open ? (
          <div
            style={{
              paddingTop: 2,
              opacity: 0.95,
              fontSize: 13,
              lineHeight: 1.4,
              userSelect: "text",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {expandedContent || <div style={{ opacity: 0.7 }}>More details coming soon.</div>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
