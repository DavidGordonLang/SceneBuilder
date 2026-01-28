import React, { useEffect, useMemo, useState } from "react";
import Page from "../../components/Page";
import { Card, SmallButton } from "../../components/routesUi";
import { supabase } from "../../lib/supabaseClient";
import { pickToolIcon, pickToolLabel } from "../../lib/sceneHelpers";
import { useNavigate } from "react-router-dom";

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

function buildInstanceLabel(typeLabel, instance, idx, count) {
  const custom = String(instance?.custom_name || "").trim();
  if (custom) return custom;
  if (count > 1) return `${typeLabel} #${idx + 1}`;
  return typeLabel;
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

export default function ToolsHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ownedTools, setOwnedTools] = useState([]);

  // expand group then expand type
  const [openToolGroup, setOpenToolGroup] = useState(null);
  const [openToolType, setOpenToolType] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await supabase
        .from("tools_user")
        .select(
          `
          id,
          status,
          tool_global_id,
          custom_name,
          custom_icon,
          tags_override,
          instance_label,
          photo_path,
          tools_global(id, name, icon, tags, safety_level)
        `
        )
        .eq("status", "owned")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOwnedTools(data ?? []);
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
      await load();
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toolsGrouped = useMemo(() => {
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

  function toggleToolGroup(groupKey) {
    setOpenToolGroup((cur) => {
      const next = cur === groupKey ? null : groupKey;
      setOpenToolType(null);
      return next;
    });
  }

  function toggleToolType(typeKey) {
    setOpenToolType((cur) => (cur === typeKey ? null : typeKey));
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SmallButton asLink to="/tools/new">
              + Add tool
            </SmallButton>
            <SmallButton onClick={() => load()} disabled={busy || loading}>
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {loading ? "Loading…" : `${ownedTools.length} owned`}
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

        <div style={{ fontWeight: 900 }}>Owned Tools & Toys</div>

        {loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : toolsGrouped.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {toolsGrouped.map((group) => {
              const isGroupOpen = openToolGroup === group.groupKey;

              return (
                <div key={group.groupKey} style={{ display: "grid", gap: 10 }}>
                  <Row
                    title="Expand tool category"
                    onClick={() => toggleToolGroup(group.groupKey)}
                    left={
                      <div style={{ display: "grid", gap: 2 }}>
                        <div style={{ fontWeight: 900 }}>{group.groupLabel}</div>
                        <div style={{ fontSize: 12, opacity: 0.65 }}>{group.totalCount} total</div>
                      </div>
                    }
                    right={<div style={{ opacity: 0.75, fontWeight: 900 }}>{isGroupOpen ? "▾" : "▸"}</div>}
                  />

                  {isGroupOpen ? (
                    <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                      {group.types.map((type) => {
                        const isTypeOpen = openToolType === type.typeKey;

                        return (
                          <div key={type.typeKey} style={{ display: "grid", gap: 10 }}>
                            <Row
                              title="Expand tool type"
                              onClick={() => toggleToolType(type.typeKey)}
                              left={
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
                              }
                              right={<div style={{ opacity: 0.75, fontWeight: 900 }}>{isTypeOpen ? "▾" : "▸"}</div>}
                            />

                            {isTypeOpen ? (
                              <div style={{ display: "grid", gap: 10, paddingLeft: 10 }}>
                                {type.instances.map((inst, idx) => {
                                  const instLabel = buildInstanceLabel(
                                    type.typeLabel,
                                    inst,
                                    idx,
                                    type.instances.length
                                  );
                                  const icon = pickToolIcon(inst);
                                  const label = pickToolLabel(inst);

                                  return (
                                    <Card
                                      key={inst.id}
                                      onClick={() => navigate(`/tools/${inst.id}/edit`)}
                                      title="Edit this tool"
                                    >
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
                                            {icon}
                                          </div>
                                          <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {instLabel}
                                            </div>
                                            {label && label !== instLabel ? (
                                              <div style={{ fontSize: 12, opacity: 0.65, overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {label}
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>

                                        <div style={{ opacity: 0.75, fontWeight: 900 }}>›</div>
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
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ opacity: 0.7, fontSize: 13 }}>
            You don’t have any owned tools yet. Add some with “+ Add tool”.
          </div>
        )}
      </Page>
    </div>
  );
}