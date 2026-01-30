import React, { useMemo, useState } from "react";
import { Card, SmallButton } from "../../components/routesUi";
import { pickToolIcon } from "../../lib/sceneHelpers";
import ToolInstance from "./components/ToolInstance";
import ToolUserEditor from "./components/ToolUserEditor";
import { useToolsData } from "./hooks/useToolsData";

/* ---------------- grouping helpers ---------------- */

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
      toolUserRow?.tools_global_id ||
      ""
  );
}

function getToolTypeLabel(toolUserRow) {
  const g = toolUserRow?.tools_global;
  const globalName = String(g?.name || g?.label || "").trim();
  return globalName || "Tool";
}

export default function ToolsHome() {
  const {
    loading,
    busy,
    err,
    ownedTools,
    vault,
    refresh,
    createNew,
    updateExisting,
    deleteExisting,
  } = useToolsData();

  const [editing, setEditing] = useState(null); // tools_user row or special "NEW"
  const [openGroup, setOpenGroup] = useState(null);
  const [openType, setOpenType] = useState(null);

  const ownedCount = Array.isArray(ownedTools) ? ownedTools.length : 0;

  const grouped = useMemo(() => {
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
              instances,
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

  function toggleGroup(groupKey) {
    setOpenGroup((cur) => {
      const next = cur === groupKey ? null : groupKey;
      setOpenType(null);
      return next;
    });
  }

  function toggleType(typeKey) {
    setOpenType((cur) => (cur === typeKey ? null : typeKey));
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <SmallButton
            disabled={busy}
            onClick={() => setEditing({ __mode: "NEW" })}
            title="Add a tool instance"
          >
            Add
          </SmallButton>
          <SmallButton disabled={busy} onClick={refresh} title="Reload tools">
            Refresh
          </SmallButton>
        </div>

        <div style={{ opacity: 0.7, fontWeight: 800 }}>{ownedCount} owned</div>
      </div>

      <div style={{ fontWeight: 900, fontSize: 16 }}>Owned Tools & Toys</div>

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

      {editing ? (
        <ToolUserEditor
          toolUser={editing?.__mode === "NEW" ? null : editing}
          vault={vault}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (payload) => {
            if (editing?.__mode === "NEW") {
              await createNew(payload);
            } else {
              await updateExisting(editing.id, payload);
            }
            setEditing(null);
          }}
        />
      ) : null}

      {!loading && !grouped.length ? (
        <div style={{ opacity: 0.7, fontSize: 13 }}>No owned tools yet. Tap “Add” to create one.</div>
      ) : null}

      {!loading && grouped.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {grouped.map((group) => {
            const isOpen = openGroup === group.groupKey;

            return (
              <div key={group.groupKey} style={{ display: "grid", gap: 10 }}>
                <Card onClick={() => toggleGroup(group.groupKey)} title="Expand tool category">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ display: "grid", gap: 2 }}>
                      <div style={{ fontWeight: 900 }}>{group.groupLabel}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>{group.totalCount} total</div>
                    </div>
                    <div style={{ opacity: 0.75, fontWeight: 900 }}>{isOpen ? "▾" : "▸"}</div>
                  </div>
                </Card>

                {isOpen ? (
                  <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                    {group.types.map((type) => {
                      const isTypeOpen = openType === type.typeKey;

                      return (
                        <div key={type.typeKey} style={{ display: "grid", gap: 10 }}>
                          <Card onClick={() => toggleType(type.typeKey)} title="Expand tool type">
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
                                  {type.icon}
                                </div>
                                <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontWeight: 850,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {type.typeLabel}
                                  </div>
                                  <div style={{ fontSize: 12, opacity: 0.65 }}>{type.totalCount} owned</div>
                                </div>
                              </div>
                              <div style={{ opacity: 0.75, fontWeight: 900 }}>{isTypeOpen ? "▾" : "▸"}</div>
                            </div>
                          </Card>

                          {isTypeOpen ? (
                            <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                              {type.instances.map((inst) => (
                                <ToolInstance
                                  key={inst.id}
                                  toolUser={inst}
                                  busy={busy}
                                  onEdit={(tu) => setEditing(tu)}
                                  onDelete={async (tu) => {
                                    await deleteExisting(tu.id);
                                  }}
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
      ) : null}
    </div>
  );
}
