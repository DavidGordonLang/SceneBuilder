import React, { useMemo, useState } from "react";
import { Card, SmallButton } from "../../../components/routesUi";
import { pickToolIcon } from "../../../lib/sceneHelpers";

export default function ToolInstance({
  toolUser,
  busy,
  onEdit,
  onDelete,
  showActions = true,
}) {
  const [confirming, setConfirming] = useState(false);

  const icon = useMemo(() => pickToolIcon(toolUser), [toolUser]);

  // Primary label should be the per-instance name the user actually cares about.
  // instance_label is the current “given name” field.
  const displayName =
    String(toolUser?.instance_label || "").trim() ||
    String(toolUser?.custom_name || "").trim() ||
    String(toolUser?.tools_global?.name || "").trim() ||
    "Tool";

  const safety = toolUser?.tools_global?.safety_level || "";
  const safetyBadge =
    safety && String(safety).trim()
      ? String(safety).trim().toLowerCase()
      : "";

  return (
    <Card>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.05)",
            fontSize: 20,
            flex: "0 0 auto",
          }}
        >
          {icon}
        </div>

        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 15,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
              title={displayName}
            >
              {displayName}
            </div>

            {safetyBadge ? (
              <div
                style={{
                  flex: "0 0 auto",
                  fontSize: 11,
                  fontWeight: 900,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  opacity: 0.85,
                  textTransform: "capitalize",
                }}
                title="Safety level"
              >
                {safetyBadge}
              </div>
            ) : null}
          </div>

          {toolUser?.tools_global?.name ? (
            <div style={{ opacity: 0.65, fontSize: 12 }}>
              {toolUser.tools_global.name}
            </div>
          ) : null}
        </div>

        {showActions ? (
          <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
            <SmallButton
              disabled={busy}
              onClick={() => onEdit?.(toolUser)}
              title="Edit this tool instance"
            >
              Edit
            </SmallButton>

            {!confirming ? (
              <SmallButton
                disabled={busy}
                onClick={() => setConfirming(true)}
                title="Delete this tool instance"
              >
                Delete
              </SmallButton>
            ) : (
              <SmallButton
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  onDelete?.(toolUser);
                }}
                title="Confirm delete"
              >
                Confirm
              </SmallButton>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}