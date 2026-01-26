import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  FieldLabel,
  SmallButton,
  TextArea,
  TextInput,
} from "../../components/routesUi";
import {
  parseDateTimeForInput,
  pickParticipantLabel,
  pickToolIcon,
  pickToolLabel,
} from "../../lib/sceneHelpers";

const DEFAULT_BLOCKS = [
  { key: "intent_desire", title: "Intent / Desire" },
  { key: "negotiation", title: "Negotiation" },
  { key: "planning_design", title: "Planning / Scene Design" },
  { key: "pre_scene_connection", title: "Pre-Scene Connection" },
  { key: "induction_exchange", title: "Induction / Power Exchange" },
  { key: "scene_proper", title: "The Scene Proper" },
  { key: "peak_climax", title: "Peak / Climax" },
  { key: "de_escalation", title: "De-Escalation" },
  { key: "aftercare", title: "Aftercare" },
  { key: "drop_window", title: "After-Aftercare / Drop Window" },
  { key: "integration_debrief", title: "Integration / Debrief" },
];

function normalizeTitle(t) {
  return String(t || "").trim().toLowerCase();
}

function buildBlocksAlwaysDefaults(initial) {
  const existing = Array.isArray(initial?.blocks) ? initial.blocks : [];

  // Build a lookup from existing blocks by title (best-effort merge)
  const byTitle = new Map();
  for (const b of existing) {
    const k = normalizeTitle(b?.title);
    if (!k) continue;
    if (!byTitle.has(k)) byTitle.set(k, b);
  }

  // Always render the full framework (11 blocks)
  return DEFAULT_BLOCKS.map((d, idx) => {
    const match = byTitle.get(normalizeTitle(d.title));
    return {
      // keep id if it matches an existing block with same title
      id: match?.id || null,
      sort_order:
        typeof match?.sort_order === "number" ? match.sort_order : (idx + 1) * 10,
      title: d.title,
      body: String(match?.body || ""),
      duration_minutes:
        match?.duration_minutes === null || match?.duration_minutes === undefined
          ? null
          : Number(match.duration_minutes),
    };
  });
}

export default function SceneForm({
  initial,
  participants,
  ownedTools,
  onSubmit,
  busy,
  err,
  submitLabel = "Save Draft",
  backTo,
}) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [intent, setIntent] = useState(initial?.intent ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Scheduling hidden for now (keep plumbing for later)
  const [scheduledAt] = useState(parseDateTimeForInput(initial?.scheduled_at ?? ""));

  const [selectedParticipants, setSelectedParticipants] = useState(
    new Set(initial?.participantIds ?? [])
  );
  const [selectedTools, setSelectedTools] = useState(new Set(initial?.toolUserIds ?? []));

  const initialBlocks = useMemo(() => buildBlocksAlwaysDefaults(initial), [initial]);
  const [blocks, setBlocks] = useState(initialBlocks);

  const canSubmit = title.trim().length > 0 && !busy;

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

  function setBlockBody(index, nextBody) {
    setBlocks((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], body: String(nextBody ?? "") };
      return next;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      intent: intent.trim(),
      notes: notes.trim(), // Notes stay Notes (separate from stages)
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      participantIds: Array.from(selectedParticipants),
      toolUserIds: Array.from(selectedTools),
      blocks: blocks.map((b, idx) => ({
        id: b.id || null,
        sort_order:
          typeof b.sort_order === "number" ? b.sort_order : (idx + 1) * 10,
        title: b.title,
        body: b.body,
        duration_minutes: b.duration_minutes ?? null,
      })),
    };

    const result = await onSubmit(payload);
    if (result?.sceneId) {
      navigate(`/scenes/${result.sceneId}`);
    } else {
      navigate(backTo || "/scenes");
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 14 }}>
      {err ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.10)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}

      {/* Core */}
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <FieldLabel>Title *</FieldLabel>
          <TextInput value={title} onChange={setTitle} placeholder="e.g. Rope + sensory focus" />
        </div>

        <div>
          <FieldLabel>Intent</FieldLabel>
          <TextInput value={intent} onChange={setIntent} placeholder="What are you aiming to create?" />
        </div>
      </div>

      {/* Stages (always show full framework) */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Stages</div>

        <div style={{ display: "grid", gap: 10 }}>
          {blocks.map((b, idx) => (
            <div
              key={`${b.title}-${idx}`}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.95 }}>
                {b.title}
              </div>
              <TextArea
                value={b.body}
                onChange={(v) => setBlockBody(idx, v)}
                placeholder="Write the plan for this stage…"
              />
            </div>
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
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            No participants found yet.
          </div>
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

      {/* Notes (kept separate from stages) */}
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <FieldLabel>Notes</FieldLabel>
          <TextArea
            value={notes}
            onChange={setNotes}
            placeholder="Anything else that doesn’t fit the stage structure…"
          />
        </div>
      </div>

      {/* Actions */}
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
    </div>
  );
}
