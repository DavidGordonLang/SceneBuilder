import React, { useEffect, useMemo, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import {
  createToolUser,
  deleteToolUser,
  fetchGlobalTools,
  fetchOwnedTools,
  fetchToolUserById,
  updateToolUser,
} from "../../lib/toolsApi";
import { pickToolIcon } from "../../lib/sceneHelpers";

/* ---------------- small UI helpers ---------------- */

function titleCase(s) {
  const x = String(s || "").trim();
  if (!x) return "";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

function TextInput({ value, onChange, placeholder, disabled }) {
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

/* ---------------- grouping helpers ---------------- */

function getToolGroupKey(toolUserRow) {
  const tags = toolUserRow?.tools_global?.tags;
  const primary = Array.isArray(tags) && tags.length ? String(tags[0] || "").trim() : "";
  return primary || "other";
}

function getToolTypeKey(toolUserRow) {
  return String(
    toolUserRow?.tool_global_id ||
      toolUserRow?.tools_global?.id ||
      toolUserRow?.tools_global_id ||
      ""
  );
}

function getToolTypeLabel(toolUserRow) {
  const g = toolUserRow?.tools_global;
  const globalName = String(g?.name || g?.label || "").trim();
  return globalName || "Tool";
}

/* ---------------- rows ---------------- */

function ToolRow({ tool, open, onClick }) {
  return (
    <Card onClick={onClick} title="Expand">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 900 }}>{tool.name}</div>
          {tool.meta ? <div style={{ fontSize: 12, opacity: 0.65 }}>{tool.meta}</div> : null}
        </div>
        <div style={{ opacity: 0.75, fontWeight: 900 }}>{open ? "▾" : "▸"}</div>
      </div>
    </Card>
  );
}

function InstanceRow({
  tu,
  busy,
  editingId,
  setEditingId,
  onRefresh,
}) {
  const [editBusy, setEditBusy] = useState(false);
  const [err, setErr] = useState("");
  const [label, setLabel] = useState(tu?.instance_label || "");
  const [notes, setNotes] = useState(tu?.notes || "");

  useEffect(() => {
    setLabel(tu?.instance_label || "");
    setNotes(tu?.notes || "");
  }, [tu?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const typeName = String(tu?.tools_global?.name || tu?.custom_name || "Tool").trim();
  const instanceName = String(tu?.instance_label || tu?.custom_name || "").trim();
  const displayName = instanceName || typeName;
  const secondaryLabel = instanceName ? typeName : "";
  const displayIcon = tu?.custom_icon || tu?.tools_global?.icon || "🧰";
  const labelValue = tu?.instance_label || "";

  const isEditing = editingId === tu.id;

  async function save() {
    setEditBusy(true);
    setErr("");
    try {
      await updateToolUser(tu.id, {
        instance_label: label ? String(label).trim() : null,
        notes: notes ? String(notes).trim() : null,
      });
      setEditingId(null);
      await onRefresh();
    } catch (e) {
      setErr(e?.message || "Could not save tool.");
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    const ok = window.confirm(`Delete ${displayName}?`);
    if (!ok) return;

    setEditBusy(true);
    setErr("");
    try {
      await deleteToolUser(tu.id);
      setEditingId(null);
      await onRefresh();
    } catch (e) {
      setErr(e?.message || "Could not delete tool.");
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
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
              {displayIcon}
            </div>

            <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              {secondaryLabel ? (
                <div style={{ fontSize: 12, opacity: 0.65, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {secondaryLabel}
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <SmallButton
              disabled={busy || editBusy}
              onClick={() => setEditingId(isEditing ? null : tu.id)}
              title="Edit"
            >
              {isEditing ? "Close" : "Edit"}
            </SmallButton>
          </div>
        </div>

        {isEditing ? (
          <div style={{ display: "grid", gap: 10 }}>
            {err ? (
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(255,80,80,0.30)",
                  background: "rgba(255,80,80,0.08)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {err}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Name</div>
              <TextInput
                value={label}
                onChange={setLabel}
                placeholder={labelValue ? "Rename this instance" : "Give this tool instance a name"}
                disabled={busy || editBusy}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Notes</div>
              <TextArea
                value={notes}
                onChange={setNotes}
                placeholder="Optional notes…"
                disabled={busy || editBusy}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <SmallButton disabled={busy || editBusy} onClick={save} title="Save">
                {editBusy ? "Saving…" : "Save"}
              </SmallButton>
              <SmallButton disabled={busy || editBusy} onClick={confirmDelete} title="Delete">
                Delete
              </SmallButton>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------------- page ---------------- */

export default function ToolsHome() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [globalTools, setGlobalTools] = useState([]);
  const [ownedTools, setOwnedTools] = useState([]);
  const [cravingTools, setCravingTools] = useState([]);

  const [openOwnedGroup, setOpenOwnedGroup] = useState(null);
  const [openOwnedType, setOpenOwnedType] = useState(null);

  const [openCravingGroup, setOpenCravingGroup] = useState(null);
  const [openCravingType, setOpenCravingType] = useState(null);

  const [editingToolUserId, setEditingToolUserId] = useState(null);

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const [gt, ot, ct] = await Promise.all([
        fetchGlobalTools(),
        fetchOwnedTools(),
        fetchOwnedTools({ status: "craving" }),
      ]);
      setGlobalTools(gt || []);
      setOwnedTools(ot || []);
      setCravingTools(ct || []);
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
      await loadAll();
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    await loadAll();
  }

  async function addTool(toolGlobalId, status) {
    setBusy(true);
    setErr("");
    try {
      await createToolUser({ tool_global_id: toolGlobalId, status });
      await refresh();
    } catch (e) {
      setErr(e?.message || "Could not add tool.");
    } finally {
      setBusy(false);
    }
  }

  function toggleOwnedGroup(groupKey) {
    setOpenOwnedGroup((cur) => {
      const next = cur === groupKey ? null : groupKey;
      setOpenOwnedType(null);
      return next;
    });
  }

  function toggleOwnedType(typeKey) {
    setOpenOwnedType((cur) => (cur === typeKey ? null : typeKey));
  }

  function toggleCravingGroup(groupKey) {
    setOpenCravingGroup((cur) => {
      const next = cur === groupKey ? null : groupKey;
      setOpenCravingType(null);
      return next;
    });
  }

  function toggleCravingType(typeKey) {
    setOpenCravingType((cur) => (cur === typeKey ? null : typeKey));
  }

  const ownedGrouped = useMemo(() => {
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
            return {
              typeKey,
              typeLabel,
              icon,
              items: instances,
              totalCount: instances.length,
            };
          })
          .sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));

        return {
          groupKey,
          groupLabel: titleCase(groupKey),
          types,
          totalCount: items.length,
        };
      })
      .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [ownedTools]);

  const cravingGrouped = useMemo(() => {
    const list = Array.isArray(cravingTools) ? cravingTools : [];
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
            return {
              typeKey,
              typeLabel,
              icon,
              items: instances,
              totalCount: instances.length,
            };
          })
          .sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));

        return {
          groupKey,
          groupLabel: titleCase(groupKey),
          types,
          totalCount: items.length,
        };
      })
      .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [cravingTools]);

  const ownedCount = ownedTools.length;
  const cravingCount = cravingTools.length;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <SmallButton disabled={busy} onClick={() => {}} title="Add tool">
            + Add
          </SmallButton>
          <SmallButton disabled={busy} onClick={refresh} title="Refresh">
            Refresh
          </SmallButton>
        </div>

        <div style={{ opacity: 0.7, fontWeight: 800 }}>
          {ownedCount} owned{cravingCount ? ` • ${cravingCount} craving` : ""}
        </div>
      </div>

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

      {loading ? <div style={{ opacity: 0.7 }}>Loading…</div> : null}

      {!loading ? (
        <>
          {/* Owned */}
          <div style={{ fontWeight: 950, fontSize: 18, marginTop: 2 }}>Owned Tools & Toys</div>

          {ownedGrouped.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {ownedGrouped.map((g) => {
                const gOpen = openOwnedGroup === g.groupKey;
                return (
                  <div key={g.groupKey} style={{ display: "grid", gap: 10 }}>
                    <ToolRow
                      tool={{ name: g.groupLabel, meta: `${g.totalCount} total` }}
                      open={gOpen}
                      onClick={() => toggleOwnedGroup(g.groupKey)}
                    />

                    {gOpen ? (
                      <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                        {g.types.map((t) => {
                          const tOpen = openOwnedType === t.typeKey;
                          return (
                            <div key={t.typeKey} style={{ display: "grid", gap: 10 }}>
                              <ToolRow
                                tool={{
                                  name: t.typeLabel,
                                  meta: `${t.totalCount} owned`,
                                  icon: t.icon,
                                }}
                                open={tOpen}
                                onClick={() => toggleOwnedType(t.typeKey)}
                              />

                              {tOpen ? (
                                <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                                  {t.items.map((tu) => (
                                    <InstanceRow
                                      key={tu.id}
                                      tu={tu}
                                      busy={busy}
                                      editingId={editingToolUserId}
                                      setEditingId={setEditingToolUserId}
                                      onRefresh={refresh}
                                    />
                                  ))}
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
          ) : (
            <div style={{ opacity: 0.7, fontSize: 13 }}>
              No owned tools yet. Add some below.
            </div>
          )}

          {/* Craving */}
          <div style={{ fontWeight: 950, fontSize: 18, marginTop: 10 }}>Craving</div>

          {cravingGrouped.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {cravingGrouped.map((g) => {
                const gOpen = openCravingGroup === g.groupKey;
                return (
                  <div key={g.groupKey} style={{ display: "grid", gap: 10 }}>
                    <ToolRow
                      tool={{ name: g.groupLabel, meta: `${g.totalCount} total` }}
                      open={gOpen}
                      onClick={() => toggleCravingGroup(g.groupKey)}
                    />

                    {gOpen ? (
                      <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                        {g.types.map((t) => {
                          const tOpen = openCravingType === t.typeKey;
                          return (
                            <div key={t.typeKey} style={{ display: "grid", gap: 10 }}>
                              <ToolRow
                                tool={{
                                  name: t.typeLabel,
                                  meta: `${t.totalCount} craving`,
                                  icon: t.icon,
                                }}
                                open={tOpen}
                                onClick={() => toggleCravingType(t.typeKey)}
                              />

                              {tOpen ? (
                                <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                                  {t.items.map((tu) => (
                                    <InstanceRow
                                      key={tu.id}
                                      tu={tu}
                                      busy={busy}
                                      editingId={editingToolUserId}
                                      setEditingId={setEditingToolUserId}
                                      onRefresh={refresh}
                                    />
                                  ))}
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
          ) : (
            <div style={{ opacity: 0.7, fontSize: 13 }}>Nothing in craving yet.</div>
          )}

          {/* Global add list */}
          <div style={{ fontWeight: 950, fontSize: 18, marginTop: 10 }}>All tools</div>

          {globalTools.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {globalTools.map((t) => (
                <Card key={t.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
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
                        {t.icon || "🧰"}
                      </div>
                      <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name}
                        </div>
                        {Array.isArray(t.tags) && t.tags.length ? (
                          <div style={{ fontSize: 12, opacity: 0.65 }}>{t.tags.join(" • ")}</div>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <SmallButton disabled={busy} onClick={() => addTool(t.id, "owned")} title="Add to owned">
                        + Add
                      </SmallButton>
                      <SmallButton disabled={busy} onClick={() => addTool(t.id, "craving")} title="Add to craving">
                        Craving
                      </SmallButton>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div style={{ opacity: 0.7, fontSize: 13 }}>No tools found.</div>
          )}
        </>
      ) : null}
    </div>
  );
}