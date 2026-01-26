import React, { useEffect, useMemo, useState } from "react";
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

/* ---------------- legacy notes -> blocks seeding ----------------
   If older scenes have stage text stored in Notes with "# Heading" sections,
   prefill the default blocks so the per-stage editor becomes the source of truth.
*/

function parseHashSections(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { title: "", bodyLines: [] };
  let sawHeading = false;

  for (const line of lines) {
    const m = line.match(/^\s*#\s+(.*)\s*$/);
    if (m) {
      sawHeading = true;

      // flush previous
      if (current && (current.title || current.bodyLines.length)) {
        sections.push({
          title: String(current.title || "").trim(),
          body: current.bodyLines.join("\n").trim(),
        });
      }

      current = { title: String(m[1] || "").trim(), bodyLines: [] };
    } else {
      current.bodyLines.push(line);
    }
  }

  if (current && (current.title || current.bodyLines.length)) {
    sections.push({
      title: String(current.title || "").trim(),
      body: current.bodyLines.join("\n").trim(),
    });
  }

  // If there were no headings, don't treat it as structured stages.
  if (!sawHeading) return [];

  return sections
    .map((s) => ({ title: s.title || "Section", body: s.body || "" }))
    .filter((s) => (s.title || "").trim() || (s.body || "").trim());
}

function mapHeadingToDefaultTitle(heading) {
  const h = normalizeTitle(heading);

  // intent
  if (h.includes("intent") || h.includes("desire")) return "Intent / Desire";

  // negotiation
  if (h.includes("negot")) return "Negotiation";

  // planning / design
  if (h.includes("plan") || h.includes("design")) return "Planning / Scene Design";

  // connection / warmup
  if (h.includes("connect") || h.includes("warm") || h.includes("pre-scene") || h.includes("pre scene"))
    return "Pre-Scene Connection";

  // exchange / induction / power
  if (h.includes("exchange") || h.includes("induction") || h.includes("power"))
    return "Induction / Power Exchange";

  // scene proper / play
  if (h.includes("scene") || h.includes("play")) return "The Scene Proper";

  // peak / climax
  if (h.includes("peak") || h.includes("climax")) return "Peak / Climax";

  // de-escalation / landing
  if (h.includes("de-escal") || h.includes("de escal") || h.includes("land") || h.includes("come down"))
    return "De-Escalation";

  // aftercare
  if (h.includes("aftercare")) return "Aftercare";

  // drop
  if (h.includes("drop")) return "After-Aftercare / Drop Window";

  // integration / debrief
  if (h.includes("integrat") || h.includes("debrief")) return "Integration / Debrief";

  return null;
}

function seedDefaultBlocksFromNotes(notes) {
  const sections = parseHashSections(notes);
  if (!sections.length) return null;

  const bodyByDefaultTitle = new Map();

  for (const s of sections) {
    const mappedTitle = mapHeadingToDefaultTitle(s.title);
    if (!mappedTitle) continue;

    const prev = bodyByDefaultTitle.get(mappedTitle);
    const nextBody = String(s.body || "").trim();
    if (!nextBody) continue;

    // If multiple headings map to same stage, append with spacing.
    bodyByDefaultTitle.set(mappedTitle, prev ? `${prev}\n\n${nextBody}` : nextBody);
  }

  // Only seed if we mapped at least one section meaningfully.
  if (bodyByDefaultTitle.size === 0) return null;

  return DEFAULT_BLOCKS.map((d, idx) => ({
    id: null,
    sort_order: (idx + 1) * 10,
    title: d.title,
    body: bodyByDefaultTitle.get(d.title) || "",
    duration_minutes: null,
  }));
}

function buildBlocksAlwaysDefaults(initial) {
  const existing = Array.isArray(initial?.blocks) ? initial.blocks : [];

  // If we have any meaningful existing block data, keep current behaviour.
  const hasMeaningfulExisting = existing.some((b) => {
    const body = String(b?.body || "").trim();
    return !!b?.id || body.length > 0;
  });

  // If blocks are empty/blank but notes are structured, seed defaults from notes headings.
  let seededFromNotes = null;
  if (!hasMeaningfulExisting) {
    seededFromNotes = seedDefaultBlocksFromNotes(initial?.notes);
  }

  const source = seededFromNotes || existing;

  const byTitle = new Map();
  for (const b of source) {
    const k = normalizeTitle(b?.title);
    if (!k) continue;
    if (!byTitle.has(k)) byTitle.set(k, b);
  }

  return DEFAULT_BLOCKS.map((d, idx) => {
    const match = byTitle.get(normalizeTitle(d.title));
    return {
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
  showActions = true,
  onStateChange, // optional: (payload, { canSubmit }) => void
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

  // Report state upwards (Edit screen controls save/back)
  useEffect(() => {
    if (typeof onStateChange !== "function") return;

    const payload = {
      title: title.trim(),
      intent: intent.trim(),
      notes: notes.trim(),
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

    onStateChange(payload, { canSubmit });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, intent, notes, scheduledAt, selectedParticipants, selectedTools, blocks, canSubmit]);

  async function handleSubmit() {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      intent: intent.trim(),
      notes: notes.trim(),
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

      {/* Stages */}
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

      {/* Notes */}
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
