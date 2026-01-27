import React, { useEffect, useMemo, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import {
  DEFAULT_SCENE_BLOCKS,
} from "../../lib/scenesApi";
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

  // If no blocks were provided, seed defaults for the editor UI
  return DEFAULT_SCENE_BLOCKS.map((d, idx) => ({
    id: null,
    sort_order: (idx + 1) * 10,
    title: d.title,
    body: "",
    duration_minutes: null,
  }));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.title, initial?.intent, initial?.scheduled_at, initial?.participantIds, initial?.toolUserIds, initial?.blocks]);

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

  const participantIds = useMemo(() => Array.from(selectedParticipants), [selectedParticipants]);
  const toolUserIds = useMemo(() => Array.from(selectedTools), [selectedTools]);

  const payload = useMemo(() => {
    return {
      title: title.trim(),
      intent,
      // NOTES REMOVED — per-stage blocks are the only planning content now.
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
        {ownedTools.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {ownedTools.map((tu) => {
              const name = pickToolLabel(tu);
              const icon = pickToolIcon(tu);
              const checked = selectedTools.has(tu.id);

              return (
                <Card key={tu.id} onClick={() => toggleTool(tu.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
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
                        {icon}
                      </div>
                      <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
                      </div>
                    </div>

                    <div style={{ opacity: 0.8, fontWeight: 800, flex: "0 0 auto" }}>
                      {checked ? "✓" : ""}
                    </div>
                  </div>
                </Card>
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
          <SmallButton
            disabled={busy}
            onClick={() => navigate(backTo || "/scenes")}
            title="Cancel"
          >
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
