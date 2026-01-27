import React, { useEffect, useMemo, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import { DEFAULT_SCENE_BLOCKS } from "../../lib/scenesApi";
import { pickParticipantLabel, pickToolIcon, pickToolLabel } from "../../lib/sceneHelpers";
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

/* ---------------- blocks helpers ---------------- */

function normalizeBlocksForForm(initialBlocks) {
  const arr = Array.isArray(initialBlocks) ? initialBlocks : [];
  if (arr.length) {
    return arr
      .slice()
      .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
      .map((b, idx) => ({
        id: b?.id || null,
        sort_order:
          typeof b?.sort_order === "number" ? b.sort_order : (idx + 1) * 10,
        title: String(b?.title || "").trim() || `Stage ${idx + 1}`,
        body: String(b?.body || ""),
        duration_minutes:
          b?.duration_minutes === null || b?.duration_minutes === undefined
            ? null
            : Number(b.duration_minutes),
      }));
  }

  return DEFAULT_SCENE_BLOCKS.map((d, idx) => ({
    id: null,
    sort_order: (idx + 1) * 10,
    title: d.title,
    body: "",
    duration_minutes: null,
  }));
}

/* ---------------- main component ---------------- */

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

  const [blocks, setBlocks] = useState(() =>
    normalizeBlocksForForm(initial?.blocks)
  );

  const [openToolGroups, setOpenToolGroups] = useState(() => new Set());

  /* ---------------- rehydrate on initial change ---------------- */

  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initial?.title,
    initial?.intent,
    initial?.scheduled_at,
    initial?.participantIds,
    initial?.toolUserIds,
    initial?.blocks,
  ]);

  /* ---------------- grouping logic ---------------- */

  const groupedTools = useMemo(() => {
    const map = new Map();

    for (const tu of ownedTools || []) {
      const tool = tu?.tools;
      if (!tool) continue;

      if (!map.has(tool.id)) {
        map.set(tool.id, {
          toolId: tool.id,
          label: tool.name,
          icon: pickToolIcon(tu),
          instances: [],
        });
      }

      map.get(tool.id).instances.push(tu);
    }

    return Array.from(map.values());
  }, [ownedTools]);

  /* ---------------- handlers ---------------- */

  function toggleParticipant(id) {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleToolInstance(id) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleToolGroup(toolId) {
    setOpenToolGroups((prev) => {
      const next = new Set(prev);
      next.has(toolId) ? next.delete(toolId) : next.add(toolId);
      return next;
    });
  }

  function setBlockBody(sort_order, nextBody) {
    setBlocks((prev) =>
      prev.map((b) => (b.sort_order === sort_order ? { ...b, body: nextBody } : b))
    );
  }

  const participantIds = useMemo(
    () => Array.from(selectedParticipants),
    [selectedParticipants]
  );
  const toolUserIds = useMemo(
    () => Array.from(selectedTools),
    [selectedTools]
  );

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

  /* ---------------- render ---------------- */

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
            <Input
              value={title}
              onChange={setTitle}
              placeholder="Give this scene a name"
              disabled={busy}
            />
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

        {blocks
          .slice()
          .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
          .map((b) => (
            <Card key={b.sort_order}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 850 }}>{b.title}</div>
                <TextArea
                  value={b.body || ""}
                  onChange={(e) => setBlockBody(b.sort_order, e.target.value)}
                  placeholder="Write the plan for this stage…"
                  disabled={busy}
                />
              </div>
            </Card>
          ))}
      </div>

      {/* Participants */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Participants</div>
        {participants.map((p) => {
          const checked = selectedParticipants.has(p.id);
          return (
            <Card key={p.id} onClick={() => toggleParticipant(p.id)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800 }}>{pickParticipantLabel(p)}</div>
                <div style={{ fontWeight: 800 }}>{checked ? "✓" : ""}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tools (Grouped) */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Tools (Owned)</div>

        {groupedTools.map((group) => {
          const open = openToolGroups.has(group.toolId);

          return (
            <Card key={group.toolId}>
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  onClick={() => toggleToolGroup(group.toolId)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    fontWeight: 850,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{group.icon}</span>
                    <span>{group.label}</span>
                  </div>
                  <span style={{ opacity: 0.7 }}>
                    {open ? "▾" : "▸"} {group.instances.length}
                  </span>
                </div>

                {open && (
                  <div style={{ display: "grid", gap: 8, paddingLeft: 18 }}>
                    {group.instances.map((tu) => {
                      const checked = selectedTools.has(tu.id);
                      return (
                        <div
                          key={tu.id}
                          onClick={() => toggleToolInstance(tu.id)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            cursor: "pointer",
                          }}
                        >
                          <div>{pickToolLabel(tu)}</div>
                          <div style={{ fontWeight: 800 }}>
                            {checked ? "✓" : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      {showActions ? (
        <div style={{ display: "flex", gap: 10 }}>
          <SmallButton onClick={() => navigate(backTo)}>Cancel</SmallButton>
          <SmallButton disabled={!canSubmit} onClick={handleSubmit}>
            {busy ? "Saving…" : submitLabel}
          </SmallButton>
        </div>
      ) : null}
    </div>
  );
}
