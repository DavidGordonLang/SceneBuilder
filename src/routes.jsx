import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addGlobalToolToUser,
  deleteUserTool,
  fetchToolVault,
  fetchUserTools,
  updateUserToolStatus,
} from "./lib/toolsApi";
import {
  createScene,
  fetchOwnedToolsForPicker,
  fetchParticipants,
  fetchSceneById,
  fetchScenes,
  updateScene,
} from "./lib/scenesApi";

function TopBar({ title, onSignOut, rightSlot }) {
  return (
    <div
      style={{
        padding: 16,
        paddingTop: 18,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Profile icon (top-right) */}
        <Link
          to="/profile"
          aria-label="Profile"
          title="Profile"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            textDecoration: "none",
            fontSize: 16,
          }}
        >
          👤
        </Link>

        {rightSlot}

        <button
          onClick={onSignOut}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 650,
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "4px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        opacity: 0.9,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function SmallButton({ children, onClick, disabled, title, tone = "neutral" }) {
  const toneStyle =
    tone === "danger"
      ? {
          border: "1px solid rgba(255,80,80,0.25)",
          background: disabled ? "rgba(255,80,80,0.06)" : "rgba(255,80,80,0.10)",
        }
      : {
          border: "1px solid rgba(255,255,255,0.14)",
          background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
        };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        color: "#f3f3f7",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: 700,
        opacity: disabled ? 0.55 : 1,
        ...toneStyle,
      }}
    >
      {children}
    </button>
  );
}

function ToolRow({ tool, actions }) {
  const icon = tool.icon || "🧰";
  const tags = Array.isArray(tool.tags) ? tool.tags : [];
  const safety = tool.safety_level ? tool.safety_level.toUpperCase() : null;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.05)",
          fontSize: 18,
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
                {tool.name}
              </div>
              {safety ? <span style={{ opacity: 0.6, fontSize: 12 }}>{safety}</span> : null}
            </div>
          </div>

          {actions ? <div style={{ display: "flex", gap: 8 }}>{actions}</div> : null}
        </div>

        {tags.length ? (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.slice(0, 6).map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>No tags</div>
        )}
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "8px 10px",
              border: "none",
              background: active ? "rgba(255,255,255,0.10)" : "transparent",
              color: "#f3f3f7",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: active ? 800 : 650,
              opacity: active ? 1 : 0.75,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* =========================
   Scenes (MVP)
   ========================= */

function Card({ children, onClick, asLink, to }) {
  const base = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
  };

  if (asLink) {
    return (
      <Link
        to={to}
        style={{
          ...base,
          display: "block",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        ...base,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{children}</div>;
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      style={{
        width: "100%",
        padding: "11px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        resize: "vertical",
      }}
    />
  );
}

function parseDateTimeForInput(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

function formatDate(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function pickParticipantLabel(p) {
  return (
    p?.name ||
    p?.display_name ||
    p?.nickname ||
    p?.full_name ||
    p?.label ||
    `Participant ${String(p?.id ?? "").slice(0, 6)}`
  );
}

function pickToolLabel(tu) {
  const g = tu?.tools_global;
  return g?.name || tu?.custom_name || "Untitled tool";
}

function pickToolIcon(tu) {
  const g = tu?.tools_global;
  return g?.icon || tu?.custom_icon || "🧰";
}

function SceneForm({
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
  const [scheduledAt, setScheduledAt] = useState(parseDateTimeForInput(initial?.scheduled_at ?? ""));

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
          <TextInput
            value={intent}
            onChange={setIntent}
            placeholder="What are you aiming to create?"
          />
        </div>

        <div>
          <FieldLabel>Scheduled (optional)</FieldLabel>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.04)",
              color: "#f3f3f7",
              outline: "none",
            }}
          />
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
            No participants found yet. (Participants UI is next after Scenes.)
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

export function ScenesHome({ supabase }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scenes, setScenes] = useState([]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchScenes();
      setScenes(data);
    } catch (e) {
      setErr(e?.message || "Failed to load scenes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await reload();
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <TopBar
        title="Scenes"
        onSignOut={signOut}
        rightSlot={
          <Link
            to="/scenes/new"
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#f3f3f7",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            + New
          </Link>
        }
      />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading scenes…</div>
        ) : err ? (
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

        {!loading && !err && scenes.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            No scenes yet. Create your first draft.
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          {scenes.map((s) => {
            const title = s.title || s.name || "Untitled scene";
            const status = (s.status || "draft").toUpperCase();
            const when = formatDate(s.scheduled_at || s.created_at);

            return (
              <Card key={s.id} asLink to={`/scenes/${s.id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {title}
                    </div>
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                      {when ? when : "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <Chip>{status}</Chip>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SceneCreate({ supabase }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [ps, ot] = await Promise.all([fetchParticipants(), fetchOwnedToolsForPicker()]);
        if (!alive) return;
        setParticipants(ps);
        setOwnedTools(ot);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load form data.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(payload) {
    setBusy(true);
    setErr("");
    try {
      const scene = await createScene(payload);
      return { sceneId: scene.id };
    } catch (e) {
      setErr(e?.message || "Could not create scene.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title="New Scene" onSignOut={signOut} />
      {loading ? (
        <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>
      ) : (
        <SceneForm
          initial={{}}
          participants={participants}
          ownedTools={ownedTools}
          onSubmit={handleSubmit}
          busy={busy}
          err={err}
          submitLabel="Save Draft"
          backTo="/scenes"
        />
      )}
    </div>
  );
}

export function SceneView({ supabase }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scene, setScene] = useState(null);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchSceneById(id);
      setScene(data);
    } catch (e) {
      setErr(e?.message || "Failed to load scene.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await reload();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const title = scene?.title || scene?.name || "Untitled scene";
  const status = (scene?.status || "draft").toUpperCase();

  const participants =
    scene?.scene_participants?.map((sp) => sp.participants).filter(Boolean) ?? [];
  const tools =
    scene?.scene_tools?.map((st) => st.tools_user).filter(Boolean) ?? [];

  return (
    <div>
      <TopBar
        title="Scene"
        onSignOut={signOut}
        rightSlot={
          <SmallButton disabled={!scene} onClick={() => navigate(`/scenes/${id}/edit`)}>
            Edit
          </SmallButton>
        }
      />

      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading…</div>
        ) : err ? (
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

        {!loading && scene ? (
          <>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 950, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {title}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
                    {formatDate(scene.scheduled_at || scene.created_at) || "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <Chip>{status}</Chip>
                </div>
              </div>

              {scene.intent ? (
                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Intent</div>
                  <div style={{ marginTop: 4, lineHeight: 1.35 }}>{scene.intent}</div>
                </div>
              ) : null}

              {scene.notes ? (
                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div>
                  <div style={{ marginTop: 4, lineHeight: 1.35, whiteSpace: "pre-wrap" }}>
                    {scene.notes}
                  </div>
                </div>
              ) : null}
            </Card>

            <Card>
              <div style={{ fontWeight: 900 }}>Participants</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {participants.length ? (
                  participants.map((p) => <Chip key={p.id}>{pickParticipantLabel(p)}</Chip>)
                ) : (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>None selected</div>
                )}
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 900 }}>Tools</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {tools.length ? (
                  tools.map((tu) => {
                    const name = pickToolLabel(tu);
                    const icon = pickToolIcon(tu);
                    const g = tu.tools_global;
                    const tags = g?.tags || tu.tags_override || [];
                    const safety = g?.safety_level || null;

                    return (
                      <ToolRow
                        key={tu.id}
                        tool={{ name, icon, tags, safety_level: safety }}
                      />
                    );
                  })
                ) : (
                  <div style={{ opacity: 0.7, fontSize: 13 }}>None selected</div>
                )}
              </div>
            </Card>

            <SmallButton onClick={() => navigate("/scenes")}>Back to Scenes</SmallButton>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function SceneEdit({ supabase }) {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [participants, setParticipants] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);
  const [initial, setInitial] = useState(null);

  async function signOut() {
    await supabase.auth.signOut();
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [scene, ps, ot] = await Promise.all([
          fetchSceneById(id),
          fetchParticipants(),
          fetchOwnedToolsForPicker(),
        ]);

        if (!alive) return;

        const participantIds =
          scene?.scene_participants?.map((sp) => sp.participant_id).filter(Boolean) ?? [];
        const toolUserIds =
          scene?.scene_tools?.map((st) => st.tool_user_id).filter(Boolean) ?? [];

        setInitial({
          title: scene?.title || scene?.name || "",
          intent: scene?.intent || "",
          notes: scene?.notes || "",
          scheduled_at: scene?.scheduled_at || null,
          participantIds,
          toolUserIds,
        });

        setParticipants(ps);
        setOwnedTools(ot);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load scene.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(payload) {
    setBusy(true);
    setErr("");
    try {
      await updateScene(id, payload);
      return { sceneId: id };
    } catch (e) {
      setErr(e?.message || "Could not update scene.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title="Edit Scene" onSignOut={signOut} />
      {loading ? (
        <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>
      ) : (
        <SceneForm
          initial={initial || {}}
          participants={participants}
          ownedTools={ownedTools}
          onSubmit={handleSubmit}
          busy={busy}
          err={err}
          submitLabel="Save Changes"
          backTo={`/scenes/${id}`}
        />
      )}
    </div>
  );
}

/* =========================
   Tools (MVP complete) — unchanged
   ========================= */

export function ToolsHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  const [tab, setTab] = useState("drawer"); // drawer | vault
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [vault, setVault] = useState([]);
  const [userTools, setUserTools] = useState([]);

  async function reload() {
    setLoading(true);
    setErr("");
    try {
      const [v, ut] = await Promise.all([fetchToolVault(), fetchUserTools()]);
      setVault(v);
      setUserTools(ut);
    } catch (e) {
      setErr(e?.message || "Failed to load tools.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await reload();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const owned = useMemo(() => userTools.filter((t) => t.status === "owned"), [userTools]);
  const craving = useMemo(() => userTools.filter((t) => t.status === "craving"), [userTools]);

  const ownedGlobalIds = useMemo(() => {
    const s = new Set();
    for (const t of owned) if (t.tool_global_id) s.add(t.tool_global_id);
    return s;
  }, [owned]);

  const cravingGlobalIds = useMemo(() => {
    const s = new Set();
    for (const t of craving) if (t.tool_global_id) s.add(t.tool_global_id);
    return s;
  }, [craving]);

  async function addTo(status, toolGlobalId) {
    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(toolGlobalId, status);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not add tool.");
    } finally {
      setBusy(false);
    }
  }

  async function moveCravingToOwned(toolUserId) {
    setErr("");
    setBusy(true);
    try {
      await updateUserToolStatus(toolUserId, "owned");
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not move tool.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFromDrawer(toolUserId, label) {
    const ok = window.confirm(`Remove "${label}" from your drawer?`);
    if (!ok) return;

    setErr("");
    setBusy(true);
    try {
      await deleteUserTool(toolUserId);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not remove tool.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar
        title="Tools"
        onSignOut={signOut}
        rightSlot={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "drawer", label: "Drawer" },
              { value: "vault", label: "Vault" },
            ]}
          />
        }
      />

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Loading tools…</div>
        ) : err ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {err}
          </div>
        ) : null}

        {tab === "drawer" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Owned Tools</div>
              {owned.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {owned.map((t) => {
                    const g = t.tools_global;
                    const name = g?.name || t.custom_name || "Untitled";
                    const icon = g?.icon || t.custom_icon || "🧰";
                    const tags = g?.tags || t.tags_override || [];
                    const safety = g?.safety_level || null;

                    return (
                      <ToolRow
                        key={t.id}
                        tool={{ name, icon, tags, safety_level: safety }}
                        actions={
                          <SmallButton
                            tone="danger"
                            disabled={busy}
                            onClick={() => removeFromDrawer(t.id, name)}
                            title="Remove from Owned"
                          >
                            Remove
                          </SmallButton>
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  No owned tools yet. Add some from the Vault.
                </div>
              )}
            </div>

            <div>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>Craving Drawer</div>
              {craving.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {craving.map((t) => {
                    const g = t.tools_global;
                    const name = g?.name || t.custom_name || "Untitled";
                    const icon = g?.icon || t.custom_icon || "🧰";
                    const tags = g?.tags || t.tags_override || [];
                    const safety = g?.safety_level || null;

                    return (
                      <ToolRow
                        key={t.id}
                        tool={{ name, icon, tags, safety_level: safety }}
                        actions={
                          <>
                            <SmallButton
                              disabled={busy}
                              onClick={() => moveCravingToOwned(t.id)}
                              title="Move this tool into Owned"
                            >
                              Move to Owned
                            </SmallButton>
                            <SmallButton
                              tone="danger"
                              disabled={busy}
                              onClick={() => removeFromDrawer(t.id, name)}
                              title="Remove from Craving"
                            >
                              Remove
                            </SmallButton>
                          </>
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  Nothing in craving yet. Add items from the Vault.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 13, marginBottom: 6 }}>
              Tool Vault. Add items to Owned or Craving.
            </div>

            {vault.map((t) => {
              const inOwned = ownedGlobalIds.has(t.id);
              const inCraving = cravingGlobalIds.has(t.id);

              return (
                <ToolRow
                  key={t.id}
                  tool={t}
                  actions={
                    <>
                      <SmallButton
                        disabled={busy || inCraving || inOwned}
                        onClick={() => addTo("craving", t.id)}
                        title={
                          inOwned
                            ? "Already in Owned"
                            : inCraving
                            ? "Already in Craving"
                            : "Add to Craving Drawer"
                        }
                      >
                        + Craving
                      </SmallButton>
                      <SmallButton
                        disabled={busy || inOwned}
                        onClick={() => addTo("owned", t.id)}
                        title={inOwned ? "Already in Owned" : "Add to Owned Tools"}
                      >
                        + Owned
                      </SmallButton>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function JournalHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <TopBar title="Journal" onSignOut={signOut} />
      <div style={{ padding: 16 }}>
        <p style={{ opacity: 0.8 }}>
          Next: journal timeline. Entries are Planning vs Reflection tied to a scene.
        </p>
      </div>
    </div>
  );
}
