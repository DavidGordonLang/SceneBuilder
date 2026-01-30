import React, { useMemo, useState } from "react";
import { Card, SmallButton } from "../../../components/routesUi";

/**
 * ToolUserEditor
 * - NEW: user picks a tool type (tools_global) and gives an instance label
 * - EDIT: user can change instance label and status
 *
 * Kept deliberately small to avoid regressions while we stabilise builds.
 */
export default function ToolUserEditor({
  toolUser, // existing tools_user row or null for NEW
  vault = [],
  busy = false,
  onCancel,
  onSave,
}) {
  const isNew = !toolUser;

  const [toolGlobalId, setToolGlobalId] = useState(() =>
    isNew ? "" : String(toolUser?.tool_global_id || toolUser?.tools_global?.id || "")
  );
  const [instanceLabel, setInstanceLabel] = useState(() =>
    String(toolUser?.instance_label || "").trim()
  );
  const [status, setStatus] = useState(() => String(toolUser?.status || "owned"));

  const vaultOptions = useMemo(() => {
    const list = Array.isArray(vault) ? vault : [];
    // stable sort by name
    return [...list].sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [vault]);

  const selectedToolName = useMemo(() => {
    if (!toolGlobalId) return "";
    const hit = vaultOptions.find((t) => String(t?.id) === String(toolGlobalId));
    return String(hit?.name || "").trim();
  }, [toolGlobalId, vaultOptions]);

  async function handleSave() {
    const payload = {
      ...(isNew ? { tool_global_id: toolGlobalId } : null),
      instance_label: instanceLabel ? String(instanceLabel).trim() : null,
      status: status || "owned",
    };

    await onSave?.(payload);
  }

  return (
    <Card>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 950, fontSize: 14 }}>
          {isNew ? "Add Tool / Toy" : "Edit Tool / Toy"}
        </div>

        {isNew ? (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Type</div>
            <select
              value={toolGlobalId}
              onChange={(e) => setToolGlobalId(e.target.value)}
              disabled={busy}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.20)",
                color: "inherit",
                outline: "none",
              }}
            >
              <option value="">Select a type…</option>
              {vaultOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {selectedToolName ? (
              <div style={{ fontSize: 12, opacity: 0.65 }}>Selected: {selectedToolName}</div>
            ) : null}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Type:{" "}
            <span style={{ fontWeight: 900 }}>
              {toolUser?.tools_global?.name ||
                toolUser?.custom_name ||
                toolUser?.tool_global_id ||
                "Tool"}
            </span>
          </div>
        )}

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Instance name</div>
          <input
            value={instanceLabel}
            onChange={(e) => setInstanceLabel(e.target.value)}
            placeholder='e.g., "Kitten toes"'
            disabled={busy}
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
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            This is what shows inside scene tool pickers (preferred over “#1/#2”).
          </div>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Status</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={busy}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
              color: "inherit",
              outline: "none",
            }}
          >
            <option value="owned">Owned</option>
            <option value="craving">Craving</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <SmallButton disabled={busy} onClick={() => onCancel?.()}>
            Cancel
          </SmallButton>
          <SmallButton
            disabled={busy || (isNew && !toolGlobalId)}
            onClick={handleSave}
            title={isNew && !toolGlobalId ? "Pick a type first" : "Save"}
          >
            Save
          </SmallButton>
        </div>
      </div>
    </Card>
  );
}
