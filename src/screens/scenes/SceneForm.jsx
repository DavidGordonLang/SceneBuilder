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

function buildInitialBlocks(initial) {
  const existing = Array.isArray(initial?.blocks) ? initial.blocks : [];
  if (existing.length) {
    // Normalize/sort for stable UI
    return existing
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

  // No blocks yet: seed defaults
  const seedText = String(initial?.notes || "").trim();
  const rows = DEFAULT_BLOCKS.map((d, idx) => ({
    id: null,
    sort_order: (idx + 1) * 10,
    title: d.title,
    body: "",
    duration_minutes: null,
  }));

  // If the scene has old notes, place them into Planning/Design as a starting point.
  if (seedText) {
    const targetIdx = DEFAULT_BLOCKS.findIndex((x) => x.key === "planning_design");
    const i = targetIdx >= 0 ? targetIdx : 2;
    rows[i].body = seedText;
  }

  return rows;
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

  // Extra notes: kept as optional tail notes (not the main planning structure)
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Scheduling is intentionally hidden for now (UI removed),
  // but we keep the plumbing so we can bring it back later.
  const [scheduledAt] = useState(parseDateTimeForInput(initial?.scheduled_at ?? ""));

  const [selectedParticipants, setSelectedParticipants] = useState(
    new Set(initial?.participantIds ?? [])
  );
  const [selectedTools, setSelectedTools] = useState(new Set(initial?.toolUserIds ?? []));

  const initialBlocks = useMemo(() => buildInitialBlocks(initial), [initial]);
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
      // Extra notes (optional tail notes)
      notes: notes.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      participantIds: Array.from(selectedParticipants),
      toolUserIds: Array.from(selectedTools),
      // Primary planning structure
      blocks: blocks.map((b) => ({
        id: b.id || null,
        sort_order: b.sort_order,
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

      {/* Core scene fields */}
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <FieldLabel>Title *</FieldLabel>
          <TextInput
            value={title}
            onChange={setTitle}
            placeholder="e.g. Rope + sensory focus"
          />
        </div>

        <div>
          <FieldLabel>Intent</FieldLabel>
          <TextInput
            value={intent}
            onChange={setIntent}
            placeholder="What are you aiming to create?"
          />
        </div>
      </div>

      {/* Stage planning blocks */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Stages</div>

        <div style={{ display: "grid", gap: 10 }}>
          {blocks.map((b, idx) => (
            <div
              key={`${b.sort_order}-${b.title}-${idx}`}
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

      {/* Extra notes (kept, but not primary planning) */}
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <FieldLabel>Extra notes</FieldLabel>
          <TextArea
            value={notes}
            onChange={setNotes}
            placeholder="Anything else that doesn’t fit a stage…"
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
