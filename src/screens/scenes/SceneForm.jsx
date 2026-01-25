import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, FieldLabel, SmallButton, TextArea, TextInput } from "../../components/routesUi";
import { parseDateTimeForInput, pickParticipantLabel, pickToolIcon, pickToolLabel } from "../../lib/sceneHelpers";

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

  // Scheduling is intentionally hidden for now (UI removed),
  // but we keep the plumbing so we can bring it back later.
  const [scheduledAt] = useState(parseDateTimeForInput(initial?.scheduled_at ?? ""));

  const [selectedParticipants, setSelectedParticipants] = useState(
    new Set(initial?.participantIds ?? [])
  );
  const [selectedTools, setSelectedTools] = useState(new Set(initial?.toolUserIds ?? []));

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

  async function handleSubmit() {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      intent: intent.trim(),
      notes: notes.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      participantIds: Array.from(selectedParticipants),
      toolUserIds: Array.from(selectedTools),
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

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <FieldLabel>Title *</FieldLabel>
          <TextInput value={title} onChange={setTitle} placeholder="e.g. Rope + sensory focus" />
        </div>

        <div>
          <FieldLabel>Intent</FieldLabel>
          <TextInput value={intent} onChange={setIntent} placeholder="What are you aiming to create?" />
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <TextArea value={notes} onChange={setNotes} placeholder="Key constraints, boundaries, flow…" />
        </div>
      </div>

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
