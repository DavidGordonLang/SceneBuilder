// src/screens/scenes/SceneForm.jsx

import React, { useEffect, useMemo, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import { DEFAULT_SCENE_BLOCKS } from "../../lib/scenesApi";
import { pickParticipantLabel, pickToolIcon } from "../../lib/sceneHelpers";
import { useNavigate } from "react-router-dom";

/* ---------------- small UI helpers ---------------- */

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        height: 44,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        padding: "0 12px",
        outline: "none",
        opacity: disabled ? 0.7 : 1,
        fontSize: 14,
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, disabled }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        minHeight: 120,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        padding: "10px 12px",
        outline: "none",
        opacity: disabled ? 0.7 : 1,
        fontSize: 14,
        lineHeight: 1.5,
        resize: "vertical",
      }}
    />
  );
}

function Row({ left, right, onClick, title }) {
  return (
    <Card onClick={onClick} title={title}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>{left}</div>
        <div style={{ flex: "0 0 auto" }}>{right}</div>
      </div>
    </Card>
  );
}

/* ---------------- blocks helpers ---------------- */

function normalizeBlocksForForm(initialBlocks) {
  const arr = Array.isArray(initialBlocks) ? initialBlocks : [];
  if (arr.length) {
    return arr
      .slice()
      .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
      .map((b, idx) => ({
        id: b?.id || null,
        sort_order: typeof b?.sort_order === "number" ? b.sort_order : (idx + 1) * 10,
        title: String(b?.title || "").trim() || `Stage ${idx + 1}`,
        body: String(b?.body || ""),
        duration_minutes:
          b?.duration_minutes === null || b?.duration_minutes === undefined
            ? null
            : Number(b.duration_minutes),
      }));
  }

  // If no blocks were provided, seed defaults for the editor UI
  return DEFAULT_SCENE_BLOCKS.map((d, idx) => ({
    id: null,
    sort_order: (idx + 1) * 10,
    title: d.title,
    body: "",
    duration_minutes: null,
  }));
}

/* ---------------- tools grouping helpers ---------------- */

function titleCase(s) {
  const x = String(s || "").trim();
  if (!x) return "";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function getToolGroupKey(toolUserRow) {
  const tags = toolUserRow?.tools_global?.tags;
  const primary = Array.isArray(tags) && tags.length ? String(tags[0] || "").trim() : "";
  return primary || "other";
}

function getToolTypeKey(toolUserRow) {
  // tools_user rows have tool_global_id, and also tools_global.id when joined.
  return String(
    toolUserRow?.tool_global_id ||
      toolUserRow?.tools_global?.id ||
      toolUserRow?.tools_global_id ||
      ""
  );
}

function getToolTypeLabel(toolUserRow) {
  // For the type label, prefer the global name (not per-instance custom name).
  const g = toolUserRow?.tools_global;
  const globalName = String(g?.name || g?.label || "").trim();
  return globalName || "Tool";
}

/**
 * ✅ FIX: use instance_label first (real per-instance name),
 * then custom_name (legacy), then fallback numbering.
 */
function buildInstanceLabel(typeLabel, instance, idx, count) {
  const instanceLabel = String(instance?.instance_label || "").trim();
  if (instanceLabel) return instanceLabel;

  const legacy = String(instance?.custom_name || "").trim();
  if (legacy) return legacy;

  if (count > 1) return `${typeLabel} #${idx + 1}`;
  return typeLabel;
}

/* ---------------- component ---------------- */

export default function SceneForm({
  initial,
  participants,
  ownedTools,
  busy,
  err,
  submitLabel = "Save",
  backTo = "/scenes",
  showActions = true,
  onStateChange,
  onSubmit,
}) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(initial?.title || "");
  const [intent, setIntent] = useState(initial?.intent || "");
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduled_at || null);

  const [selectedParticipants, setSelectedParticipants] = useState(() => {
    const ids = Array.isArray(initial?.participantIds) ? initial.participantIds : [];
    return new Set(ids.filter(Boolean));
  });

  const [selectedTools, setSelectedTools] = useState(() => {
    const ids = Array.isArray(initial?.toolUserIds) ? initial.toolUserIds : [];
    return new Set(ids.filter(Boolean));
  });

  const [blocks, setBlocks] = useState(() => normalizeBlocksForForm(initial?.blocks));

  // Tools UI state (expand parent group then expand type, then pick instances)
  const [openToolGroup, setOpenToolGroup] = useState(null);
  const [openToolType, setOpenToolType] = useState(null);

  useEffect(() => {
    // If initial changes (edit loads), rehydrate form state.
    setTitle(initial?.title || "");
    setIntent(initial?.intent || "");
    setScheduledAt(initial?.scheduled_at || null);

    setSelectedParticipants(() => {
      const ids = Array.isArray(initial?.participantIds) ? initial.participantIds : [];
      return new Set(ids.filter(Boolean));
    });

    setSelectedTools(() => {
      const ids = Array.isArray(initial?.toolUserIds) ? initial.toolUserIds : [];
      return new Set(ids.filter(Boolean));
    });

    setBlocks(normalizeBlocksForForm(initial?.blocks));

    // Reset tool UI expansions on scene switch
    setOpenToolGroup(null);
    setOpenToolType(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initial?.title,
    initial?.intent,
    initial?.scheduled_at,
    initial?.participantIds,
    initial?.toolUserIds,
    initial?.blocks,
  ]);

  function toggleParticipant(id) {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleToolInstance(toolUserId) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolUserId)) next.delete(toolUserId);
      else next.add(toolUserId);
      return next;
    });
  }

  function setBlockBody(sort_order, nextBody) {
    setBlocks((prev) =>
      prev.map((b) => (b.sort_order === sort_order ? { ...b, body: nextBody } : b))
    );
  }

  const participantIds = useMemo(() => Array.from(selectedParticipants), [selectedParticipants]);
  const toolUserIds = useMemo(() => Array.from(selectedTools), [selectedTools]);

  const payload = useMemo(() => {
    return {
      title: title.trim(),
      intent,
      scheduled_at: scheduledAt || null,
      participantIds,
      toolUserIds,
      blocks,
    };
  }, [title, intent, scheduledAt, participantIds, toolUserIds, blocks]);

  useEffect(() => {
    onStateChange?.(payload);
  }, [payload, onStateChange]);

  const canSubmit = !!title.trim() && !busy;

  async function handleSubmit() {
    if (!canSubmit) return;
    await onSubmit?.(payload);
  }

  // -------- Tools: group -> type -> instance --------

  const toolsGrouped = useMemo(() => {
    const list = Array.isArray(ownedTools) ? ownedTools : [];
    const byGroup = new Map();

    for (const tu of list) {
      const gKey = getToolGroupKey(tu);
      if (!byGroup.has(gKey)) byGroup.set(gKey, []);
      byGroup.get(gKey).push(tu);
    }

    return Array.from(byGroup.entries())
      .map(([groupKey, items]) => {
        const byType = new Map();
        for (const tu of items) {
          const tKey = getToolTypeKey(tu) || "unknown";
          if (!byType.has(tKey)) byType.set(tKey, []);
          byType.get(tKey).push(tu);
        }

        const types = Array.from(byType.entries())
          .map(([typeKey, instances]) => {
            const typeLabel = getToolTypeLabel(instances[0]);
            const icon = pickToolIcon(instances[0]);
            const selectedCount = instances.filter((i) => selectedTools.has(i.id)).length;
            return {
              typeKey,
              typeLabel,
              icon,
              instances,
              totalCount: instances.length,
              selectedCount,
            };
          })
          .sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));

        const groupSelectedCount = items.filter((i) => selectedTools.has(i.id)).length;

        return {
          groupKey,
          groupLabel: titleCase(groupKey),
          types,
          totalCount: items.length,
          selectedCount: groupSelectedCount,
        };
      })
      .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [ownedTools, selectedTools]);

  function toggleToolGroup(groupKey) {
    setOpenToolGroup((cur) => {
      const next = cur === groupKey ? null : groupKey;
      setOpenToolType(null);
      return next;
    });
  }

  function toggleToolType(typeKey) {
    setOpenToolType((cur) => (cur === typeKey ? null : typeKey));
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err ? (
        <Card>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.30)",
              background: "rgba(255,80,80,0.08)",
              lineHeight: 1.4,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        </Card>
      ) : null}

      {/* Title + intent */}
      <Card>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <FieldLabel>Title *</FieldLabel>
            <Input value={title} onChange={setTitle} placeholder="Give this scene a name" disabled={busy} />
          </div>

          <div>
            <FieldLabel>Intent</FieldLabel>
            <Input
              value={intent}
              onChange={setIntent}
              placeholder="e.g. Release, Connection, Experiment…"
              disabled={busy}
            />
          </div>
        </div>
      </Card>

      {/* Stages */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Stages</div>

        <div style={{ display: "grid", gap: 10 }}>
          {blocks
            .slice()
            .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
            .map((b) => (
              <Card key={b.sort_order}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 850, opacity: 0.9 }}>{b.title}</div>
                  <TextArea
                    value={b.body || ""}
                    onChange={(v) => setBlockBody(b.sort_order, v)}
                    placeholder="Write the plan for this stage…"
                    disabled={busy}
                  />
                </div>
              </Card>
            ))}
        </div>
      </div>

      {/* Participants */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Participants</div>
        {participants.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {participants.map((p) => {
              const label = pickParticipantLabel(p);
              const checked = selectedParticipants.has(p.id);
              return (
                <Card key={p.id} onClick={() => toggleParticipant(p.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{label}</div>
                    <div style={{ opacity: 0.8, fontWeight: 800 }}>{checked ? "✓" : ""}</div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div style={{ opacity: 0.7, fontSize: 13 }}>No participants found yet.</div>
        )}
      </div>

      {/* Tools */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Tools (Owned)</div>

        {!toolsGrouped.length ? (
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            You don’t have any owned tools yet. Add some in Tools → Vault.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {toolsGrouped.map((group) => {
              const isGroupOpen = openToolGroup === group.groupKey;

              return (
                <div key={group.groupKey} style={{ display: "grid", gap: 10 }}>
                  <Row
                    title="Expand tool category"
                    onClick={() => toggleToolGroup(group.groupKey)}
                    left={
                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 900 }}>{group.groupLabel}</div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>
                          {group.selectedCount}/{group.totalCount} selected
                        </div>
                      </div>
                    }
                    right={<div style={{ opacity: 0.75, fontWeight: 900 }}>{isGroupOpen ? "▾" : "▸"}</div>}
                  />

                  {isGroupOpen ? (
                    <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                      {group.types.map((type) => {
                        const isTypeOpen = openToolType === type.typeKey;

                        return (
                          <div key={type.typeKey} style={{ display: "grid", gap: 10 }}>
                            <Row
                              title="Expand tool type"
                              onClick={() => toggleToolType(type.typeKey)}
                              left={
                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                  <div
                                    style={{
                                      width: 34,
                                      height: 34,
                                      borderRadius: 12,
                                      display: "grid",
                                      placeItems: "center",
                                      background: "rgba(255,255,255,0.05)",
                                      fontSize: 18,
                                      flex: "0 0 auto",
                                    }}
                                  >
                                    {type.icon}
                                  </div>
                                  <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: 850,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {type.typeLabel}
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.65 }}>
                                      {type.selectedCount}/{type.totalCount} selected
                                    </div>
                                  </div>
                                </div>
                              }
                              right={<div style={{ opacity: 0.75, fontWeight: 900 }}>{isTypeOpen ? "▾" : "▸"}</div>}
                            />

                            {isTypeOpen ? (
                              <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                                {type.instances.map((inst, idx) => {
                                  const checked = selectedTools.has(inst.id);
                                  const instLabel = buildInstanceLabel(
                                    type.typeLabel,
                                    inst,
                                    idx,
                                    type.instances.length
                                  );

                                  return (
                                    <Card key={inst.id} onClick={() => toggleToolInstance(inst.id)} title="Select this tool instance">
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                        <div style={{ fontWeight: 800 }}>{instLabel}</div>
                                        <div style={{ opacity: 0.8, fontWeight: 800 }}>{checked ? "✓" : ""}</div>
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions (optional; Edit screen will hide these) */}
      {showActions ? (
        <div style={{ display: "flex", gap: 10 }}>
          <SmallButton disabled={busy} onClick={() => navigate(backTo || "/scenes")} title="Cancel">
            Cancel
          </SmallButton>
          <SmallButton disabled={!canSubmit} onClick={handleSubmit} title={title.trim() ? submitLabel : "Title is required"}>
            {busy ? "Saving…" : submitLabel}
          </SmallButton>
        </div>
      ) : null}
    </div>
  );
}
