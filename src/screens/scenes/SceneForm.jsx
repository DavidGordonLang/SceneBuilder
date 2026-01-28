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
  return String(
    toolUserRow?.tool_global_id ||
      toolUserRow?.tools_global?.id ||
      ""
  );
}

function getToolTypeLabel(toolUserRow) {
  const g = toolUserRow?.tools_global;
  return String(g?.name || "").trim() || "Tool";
}

/** ✅ FIXED: instance label resolution */
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

  const [openToolGroup, setOpenToolGroup] = useState(null);
  const [openToolType, setOpenToolType] = useState(null);

  // … rest of file unchanged …
}
