// src/screens/tools/components/ToolInstance.jsx

import React from "react";
import { SmallButton } from "../../../components/routesUi";
import KebabMenu from "./KebabMenu";

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

function inputStyle(disabled) {
  return {
    flex: "1 1 220px",
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#f3f3f7",
    padding: "0 12px",
    outline: "none",
    opacity: disabled ? 0.7 : 1,
  };
}

export default function ToolInstance({
  tu,
  status,
  busy,
  isOpen,
  onToggleOpen,
  draftLabelValue,
  onDraftLabelChange,
  onSaveLabel,
  onEnsurePhoto,
  photoUrl,
  onUploadFile,
  onRemoveFromDrawer,
  onMoveCravingToOwned,
}) {
  const displayName = tu?.tools_global?.name || tu?.custom_name || "Tool";

  const menuItems =
    status === "owned"
      ? [
          {
            key: "remove",
            label: "Remove",
            tone: "danger",
            onClick: () => onRemoveFromDrawer(tu.id, displayName),
          },
        ]
      : [
          {
            key: "move",
            label: "Move to Owned",
            onClick: () => onMoveCravingToOwned(tu.id),
          },
          {
            key: "remove",
            label: "Remove",
            tone: "danger",
            onClick: () => onRemoveFromDrawer(tu.id, displayName),
          },
        ];

  const instanceTitle = tu?.instance_label ? String(tu.instance_label).trim() : "";
  const headerTitle = instanceTitle || "No label";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
        display: "grid",
        gap: 10,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Instance header */}
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onToggleOpen();
          if (!isOpen) onEnsurePhoto?.(tu.id, tu.photo_path);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onToggleOpen();
            if (!isOpen) onEnsurePhoto?.(tu.id, tu.photo_path);
          }
        }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "flex-start",
          cursor: "pointer",
          userSelect: "none",
        }}
        title="Tap to expand / collapse instance"
      >
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              opacity: instanceTitle ? 0.9 : 0.65,
              fontWeight: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {headerTitle}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <KebabMenu items={menuItems} disabled={busy} />
          <ExpandChevron open={isOpen} />
        </div>
      </div>

      {isOpen ? (
        <div style={{ display: "grid", gap: 10 }} onClick={(e) => e.stopPropagation()}>
          {/* Photo */}
          {photoUrl ? (
            <div
              style={{
                width: "100%",
                maxWidth: 320,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                overflow: "hidden",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <img
                src={photoUrl}
                alt=""
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            </div>
          ) : (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No photo yet.</div>
          )}

          {/* Single photo action (Upload OR Change) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 800,
                fontSize: 12,
                opacity: busy ? 0.6 : 1,
              }}
              title={photoUrl ? "Change the photo for this tool instance" : "Upload a photo for this tool instance"}
              onClick={(e) => e.stopPropagation()}
            >
              📷 {photoUrl ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                style={{ display: "none" }}
                onChange={(e) => {
                  e.stopPropagation();
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  onUploadFile?.(tu.id, file);
                }}
              />
            </label>
          </div>

          {/* Label edit */}
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Label</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={draftLabelValue}
                placeholder='e.g. "Black cuffs", "Travel kit"'
                disabled={busy}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => onDraftLabelChange?.(tu.id, e.target.value)}
                style={inputStyle(busy)}
              />
              <SmallButton
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveLabel?.(tu.id);
                }}
                title="Save label"
              >
                Save
              </SmallButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}