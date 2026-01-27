import React, { useEffect, useMemo, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import { DEFAULT_SCENE_BLOCKS } from "../../lib/scenesApi";
import {
  pickParticipantLabel,
  pickToolIcon,
  pickToolLabel,
} from "../../lib/sceneHelpers";
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

/* ---------------- tools grouping ---------------- */

function getToolGroupKey(toolUserRow) {
  // Current DB shape: tools_user.tools_global(tags: text[])
  const tags = toolUserRow?.tools_global?.tags;
  const first = Array.isArray(tags) ? String(tags[0] || "").trim() : "";
  // Critical: NEVER return empty => otherwise tools “disappear”
  return first || "Other";
}

function sortGroupKeys(keys) {
  const arr = Array.isArray(keys) ? keys.slice() : [];
  arr.sort((a, b) => {
    if (a === "Other" && b !== "Other") return 1;
    if (b === "Other" && a !== "Other") return -1;
    return String(a).localeCompare(String(b));
  });
  return arr;
}

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

  // group expansion state
  const [openToolGroups, setOpenToolGroups] = useState(() => new Set());

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

    // reset open groups (safe + predictable)
    setOpenToolGroups(new Set());
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

  function toggleTool(id) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  const toolsGrouped = useMemo(() => {
    const list = Array.isArray(ownedTools) ? ownedTools : [];
    const map = new Map(); // key -> toolUser[]
    for (const tu of list) {
      const key = getToolGroupKey(tu);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tu);
    }

    const keys = sortGroupKeys(Array.from(map.keys()));
    return keys.map((k) => ({
      key: k,
      items: (map.get(k) || []).slice().sort((a, b) => {
        const la = pickToolLabel(a);
        const lb = pickToolLabel(b);
        return String(la).localeCompare(String(lb));
      }),
    }));
  }, [ownedTools]);

  function toggleGroup(key) {
    setOpenToolGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
                    <div style={{ opacity: 0.8, fontWeight: 800 }}>
                      {checked ? "✓" : ""}
                    </div>
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

        {Array.isArray(ownedTools) && ownedTools.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {toolsGrouped.map((group) => {
              const isOpen = openToolGroups.has(group.key);
              const total = group.items.length;
              const selectedCount = group.items.reduce(
                (acc, tu) => acc + (selectedTools.has(tu.id) ? 1 : 0),
                0
              );

              return (
                <div key={group.key} style={{ display: "grid", gap: 10 }}>
                  {/* Group row (expand only) */}
                  <Card onClick={() => toggleGroup(group.key)}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>
                          {group.key}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {selectedCount}/{total} selected
                        </div>
                      </div>

                      <div
                        style={{
                          opacity: 0.8,
                          fontWeight: 900,
                          fontSize: 14,
                          flex: "0 0 auto",
                        }}
                      >
                        {isOpen ? "▾" : "▸"}
                      </div>
                    </div>
                  </Card>

                  {/* Tools inside group (select here) */}
                  {isOpen ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {group.items.map((tu) => {
                        const name = pickToolLabel(tu);
                        const icon = pickToolIcon(tu);
                        const checked = selectedTools.has(tu.id);

                        return (
                          <Card key={tu.id} onClick={() => toggleTool(tu.id)}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  minWidth: 0,
                                }}
                              >
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
                                  {icon}
                                </div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {name}
                                </div>
                              </div>

                              <div style={{ opacity: 0.85, fontWeight: 900, flex: "0 0 auto" }}>
                                {checked ? "✓" : ""}
                              </div>
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
        ) : (
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            You don’t have any owned tools yet. Add some in Tools → Vault.
          </div>
        )}
      </div>

      {/* Actions (optional; Edit screen will hide these) */}
      {showActions ? (
        <div style={{ display: "flex", gap: 10 }}>
          <SmallButton disabled={busy} onClick={() => navigate(backTo || "/scenes")} title="Cancel">
            Cancel
          </SmallButton>
          <SmallButton
            disabled={!canSubmit}
            onClick={handleSubmit}
            title={title.trim() ? submitLabel : "Title is required"}
          >
            {busy ? "Saving…" : submitLabel}
          </SmallButton>
        </div>
      ) : null}
    </div>
  );
}
