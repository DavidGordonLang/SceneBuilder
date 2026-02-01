// src/screens/tools/ToolsHome.jsx

import React, { useMemo, useState } from "react";
import Page from "../../components/Page";

import { useToolsData } from "./hooks/useToolsData";
import ToolRow from "./components/ToolRow";
import Segmented from "./components/Segmented";
import Section from "./components/Section";
import ToolInstance from "./components/ToolInstance";

function has(set, id) {
  return set.has(id);
}
function toggleInSet(prevSet, id) {
  const next = new Set(prevSet);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function SkeletonRow({ lines = 2 }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ height: 12, width: "55%", borderRadius: 999, background: "rgba(255,255,255,0.08)" }} />
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 10,
            width: i === 0 ? "80%" : "68%",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
          }}
        />
      ))}
    </div>
  );
}

export default function ToolsHome() {
  const {
    tab,
    setTab,
    loading,
    busy,
    err,
    vault,
    owned,
    craving,
    ownedGroups,
    cravingGroups,
    ownedGlobalIds,
    cravingGlobalIds,
    draftLabel,
    setDraftLabel,
    photoUrlById,
    addTo,
    addAnotherInstance,
    moveCravingToOwned,
    removeFromDrawer,
    ensureSignedPhotoUrl,
    saveLabel,
    handleUpload,
  } = useToolsData();

  // Group open state (multiple open per section)
  const [openOwned, setOpenOwned] = useState(() => new Set());
  const [openCraving, setOpenCraving] = useState(() => new Set());
  const [openVault, setOpenVault] = useState(() => new Set());

  // Per-instance expand/collapse
  const [openInstances, setOpenInstances] = useState(() => new Set());

  const infoText = useMemo(() => {
    if (tab === "drawer") {
      return loading ? "Loading drawer…" : `${owned.length} owned • ${craving.length} craving`;
    }
    return loading ? "Loading vault…" : `${vault.length} in vault`;
  }, [tab, loading, owned.length, craving.length, vault.length]);

  function getDraftLabelValue(tu) {
    return draftLabel?.[tu.id] !== undefined ? draftLabel[tu.id] : tu.instance_label || "";
  }

  function onDraftLabelChange(toolUserId, value) {
    setDraftLabel((prev) => ({ ...prev, [toolUserId]: value }));
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Actions row */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Segmented
              value={tab}
              onChange={(next) => setTab(next)}
              options={[
                { value: "drawer", label: "Drawer" },
                { value: "vault", label: "Vault" },
              ]}
            />
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>{infoText}</div>
        </div>

        {err ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {err}
          </div>
        ) : null}

        {tab === "drawer" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Section
              title="Owned tools"
              subtitle={
                loading
                  ? "Loading owned tools…"
                  : owned.length
                  ? null
                  : "No owned tools yet. Add some from the Vault."
              }
            >
              {owned.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {ownedGroups.map((g) => {
                    const open = has(openOwned, g.key);

                    return (
                      <ToolRow
                        key={g.key}
                        tool={{ name: g.name, icon: g.icon, count: g.items.length }}
                        open={open}
                        onToggle={() => {
                          setOpenOwned((prev) => toggleInSet(prev, g.key));
                          if (!open) {
                            for (const tu of g.items) ensureSignedPhotoUrl(tu.id, tu.photo_path);
                          }
                        }}
                        expandedContent={
                          <div style={{ display: "grid", gap: 12 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                type="button"
                                disabled={busy || !g.tool_global_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addAnotherInstance("owned", g.tool_global_id);
                                  setOpenOwned((prev) => {
                                    const next = new Set(prev);
                                    next.add(g.key);
                                    return next;
                                  });
                                }}
                                title={
                                  g.tool_global_id
                                    ? "Add another owned instance"
                                    : "Custom tools can't add instances yet"
                                }
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "rgba(255,255,255,0.06)",
                                  color: "#f3f3f7",
                                  fontWeight: 800,
                                  cursor: busy ? "not-allowed" : "pointer",
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                + Add another
                              </button>

                              {g.isCustom ? (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>
                                  (Custom tool grouping is temporary)
                                </div>
                              ) : null}
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              {g.items.map((tu) => (
                                <ToolInstance
                                  key={tu.id}
                                  tu={tu}
                                  status="owned"
                                  busy={busy}
                                  isOpen={openInstances.has(tu.id)}
                                  onToggleOpen={() => setOpenInstances((prev) => toggleInSet(prev, tu.id))}
                                  draftLabelValue={getDraftLabelValue(tu)}
                                  onDraftLabelChange={onDraftLabelChange}
                                  onSaveLabel={saveLabel}
                                  onEnsurePhoto={ensureSignedPhotoUrl}
                                  photoUrl={photoUrlById?.[tu.id] || null}
                                  onUploadFile={handleUpload}
                                  onRemoveFromDrawer={removeFromDrawer}
                                  onMoveCravingToOwned={moveCravingToOwned}
                                />
                              ))}
                            </div>
                          </div>
                        }
                        menuItems={null}
                      />
                    );
                  })}
                </div>
              ) : loading ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : null}
            </Section>

            <Section
              title="Craving drawer"
              subtitle={
                loading
                  ? "Loading craving drawer…"
                  : craving.length
                  ? null
                  : "Nothing in craving yet. Add items from the Vault."
              }
            >
              {craving.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {cravingGroups.map((g) => {
                    const open = has(openCraving, g.key);

                    return (
                      <ToolRow
                        key={g.key}
                        tool={{ name: g.name, icon: g.icon, count: g.items.length }}
                        open={open}
                        onToggle={() => {
                          setOpenCraving((prev) => toggleInSet(prev, g.key));
                          if (!open) {
                            for (const tu of g.items) ensureSignedPhotoUrl(tu.id, tu.photo_path);
                          }
                        }}
                        expandedContent={
                          <div style={{ display: "grid", gap: 12 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                type="button"
                                disabled={busy || !g.tool_global_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addAnotherInstance("craving", g.tool_global_id);
                                  setOpenCraving((prev) => {
                                    const next = new Set(prev);
                                    next.add(g.key);
                                    return next;
                                  });
                                }}
                                title={
                                  g.tool_global_id
                                    ? "Add another craving instance"
                                    : "Custom tools can't add instances yet"
                                }
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 12,
                                  border: "1px solid rgba(255,255,255,0.18)",
                                  background: "rgba(255,255,255,0.06)",
                                  color: "#f3f3f7",
                                  fontWeight: 800,
                                  cursor: busy ? "not-allowed" : "pointer",
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                + Add another
                              </button>

                              {g.isCustom ? (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>
                                  (Custom tool grouping is temporary)
                                </div>
                              ) : null}
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              {g.items.map((tu) => (
                                <ToolInstance
                                  key={tu.id}
                                  tu={tu}
                                  status="craving"
                                  busy={busy}
                                  isOpen={openInstances.has(tu.id)}
                                  onToggleOpen={() => setOpenInstances((prev) => toggleInSet(prev, tu.id))}
                                  draftLabelValue={getDraftLabelValue(tu)}
                                  onDraftLabelChange={onDraftLabelChange}
                                  onSaveLabel={saveLabel}
                                  onEnsurePhoto={ensureSignedPhotoUrl}
                                  photoUrl={photoUrlById?.[tu.id] || null}
                                  onUploadFile={handleUpload}
                                  onRemoveFromDrawer={removeFromDrawer}
                                  onMoveCravingToOwned={moveCravingToOwned}
                                />
                              ))}
                            </div>
                          </div>
                        }
                        menuItems={null}
                      />
                    );
                  })}
                </div>
              ) : loading ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : null}
            </Section>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                opacity: 0.75,
                fontSize: 13,
                lineHeight: 1.4,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              Tool Vault. Add items to Owned or Craving.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {loading && vault.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : null}

              {vault.map((t) => {
                const inOwned = ownedGlobalIds.has(t.id);
                const inCraving = cravingGlobalIds.has(t.id);
                const open = has(openVault, t.id);

                return (
                  <ToolRow
                    key={t.id}
                    tool={{ name: t.name, icon: t.icon || "🧰" }}
                    open={open}
                    onToggle={() => setOpenVault((prev) => toggleInSet(prev, t.id))}
                    expandedContent={
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={busy || inCraving || inOwned}
                            onClick={(e) => {
                              e.stopPropagation();
                              addTo("craving", t.id);
                            }}
                            title={
                              inOwned
                                ? "Already in Owned"
                                : inCraving
                                ? "Already in Craving"
                                : "Add to Craving Drawer"
                            }
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "rgba(255,255,255,0.06)",
                              color: "#f3f3f7",
                              fontWeight: 800,
                              cursor: busy ? "not-allowed" : "pointer",
                              opacity: busy ? 0.6 : 1,
                            }}
                          >
                            + Craving
                          </button>

                          <button
                            type="button"
                            disabled={busy || inOwned}
                            onClick={(e) => {
                              e.stopPropagation();
                              addTo("owned", t.id);
                            }}
                            title={inOwned ? "Already in Owned" : "Add to Owned Tools"}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.18)",
                              background: "rgba(255,255,255,0.06)",
                              color: "#f3f3f7",
                              fontWeight: 800,
                              cursor: busy ? "not-allowed" : "pointer",
                              opacity: busy ? 0.6 : 1,
                            }}
                          >
                            + Owned
                          </button>
                        </div>

                        <div style={{ opacity: 0.75 }}>
                          Vault items will later show richer details and let you create your own owned instances (with photos).
                        </div>
                      </div>
                    }
                    menuItems={null}
                  />
                );
              })}
            </div>
          </div>
        )}
      </Page>
    </div>
  );
}
