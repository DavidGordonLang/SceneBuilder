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

/* ---------------- vault category model (consolidated chips) ----------------
   IMPORTANT:
   - These are *UI chips* (browse buckets), not the raw tag universe.
   - Each chip matches ANY of the tags in matchAnyTags.
*/

const VAULT_CATEGORIES = [
  { key: "all", label: "All", matchAnyTags: null },

  { key: "impact", label: "Impact", matchAnyTags: ["impact"] },

  // merged: restraint + control/protocol
  { key: "restraints_control", label: "Restraints & Control", matchAnyTags: ["restraint", "control", "protocol"] },

  // merged: sensation + sensory + temperature
  { key: "sensation_temp", label: "Sensation & Temperature", matchAnyTags: ["sensation", "sensory", "temperature"] },

  // merged: penetration + vibrator + anal
  { key: "toys", label: "Penetration & Toys", matchAnyTags: ["penetration", "vibrator", "anal"] },

  // merged: medical + edgeplay + electro + cbt
  { key: "medical_edge", label: "Medical & Edgeplay", matchAnyTags: ["medical", "edgeplay", "electro", "cbt"] },

  // merged: safety + aftercare
  { key: "safety_aftercare", label: "Safety & Aftercare", matchAnyTags: ["safety", "aftercare"] },

  // merged: ritual + ambience
  { key: "ritual_atmosphere", label: "Ritual & Atmosphere", matchAnyTags: ["ritual", "ambience"] },

  // merged: setup + documentation
  { key: "setup_practical", label: "Setup & Practical", matchAnyTags: ["setup", "documentation"] },
];

/*
  CATEGORY_PRIORITY is for the small "meta" label displayed on each vault row.
  This is NOT the chip list; it’s the precedence order for selecting a single label.

  We keep it tag-based (not chip-based) because tools have tag arrays like ["vibrator","penetration"] etc.
*/
const CATEGORY_PRIORITY = [
  "impact",
  "restraint",
  "control",
  "protocol",
  "sensation",
  "sensory",
  "temperature",
  "penetration",
  "vibrator",
  "anal",
  "medical",
  "electro",
  "cbt",
  "edgeplay",
  "safety",
  "aftercare",
  "ritual",
  "ambience",
  "setup",
  "documentation",
];

// This is the mapping from a *tag* (priority list) to a user-facing label.
// If a tag isn't in this map, it won't show as the meta label.
const TAG_LABEL = {
  impact: "Impact",
  restraint: "Restraints",
  control: "Control",
  protocol: "Protocol",
  sensation: "Sensation",
  sensory: "Sensation",
  temperature: "Temperature",
  penetration: "Penetration",
  vibrator: "Vibrators",
  anal: "Anal",
  medical: "Medical",
  electro: "Electro",
  cbt: "CBT",
  edgeplay: "Edgeplay",
  safety: "Safety",
  aftercare: "Aftercare",
  ritual: "Ritual",
  ambience: "Atmosphere",
  setup: "Setup",
  documentation: "Docs",
};

function toolTagsArray(t) {
  if (!t) return [];
  const raw = t.tags;
  if (Array.isArray(raw)) return raw.map((x) => String(x || "").trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function matchesCategory(tool, cat) {
  if (!cat || cat.key === "all") return true;
  const tags = toolTagsArray(tool);
  const set = new Set(tags);
  const any = cat.matchAnyTags || [];
  for (const t of any) if (set.has(t)) return true;
  return false;
}

// returns a *tag* (not chip) for meta label selection
function displayCategoryTag(tool) {
  const tags = toolTagsArray(tool);
  const set = new Set(tags);
  for (const key of CATEGORY_PRIORITY) {
    if (set.has(key)) return key;
  }
  return null;
}

function ChipButton({ active, children, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: active ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.12)",
        background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        fontWeight: 850,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- Vault offers UI (starter / mid / premium) ---------------- */

function regionsMapHasOffers(regionsMap) {
  if (!regionsMap) return false;
  const regions = Array.from(regionsMap.entries());
  for (const [, items] of regions) {
    if (Array.isArray(items) && items.length > 0) return true;
  }
  return false;
}

function tiersHaveAnyOffers(tiers) {
  if (!tiers) return false;
  return regionsMapHasOffers(tiers.starter) || regionsMapHasOffers(tiers.mid) || regionsMapHasOffers(tiers.premium);
}

// Only renders if there are offers inside this tier.
function TierBlock({ title, regionsMap }) {
  if (!regionsMapHasOffers(regionsMap)) return null;

  const regions = Array.from(regionsMap.entries()).filter(([, items]) => Array.isArray(items) && items.length > 0);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.2, opacity: 0.78 }}>{title}</div>

      <div style={{ display: "grid", gap: 10 }}>
        {regions.map(([region, items]) => (
          <div key={region} style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 800 }}>{region}</div>

            <div style={{ display: "grid", gap: 8 }}>
              {(items || []).map((o) => (
                <div
                  key={o.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {o.title}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {o.retailer}
                        {o.price_hint ? ` • ${o.price_hint}` : ""}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (o.url) window.open(o.url, "_blank", "noopener,noreferrer");
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#f3f3f7",
                        fontWeight: 800,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ToolsHome({ session }) {
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
    offersByToolId,
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
  } = useToolsData({ session });

  // Group open state (multiple open per section)
  const [openOwned, setOpenOwned] = useState(() => new Set());
  const [openCraving, setOpenCraving] = useState(() => new Set());
  const [openVault, setOpenVault] = useState(() => new Set());

  // Per-instance expand/collapse
  const [openInstances, setOpenInstances] = useState(() => new Set());

  // Vault UI controls
  const [vaultCategory, setVaultCategory] = useState("all");
  const [vaultSearch, setVaultSearch] = useState("");

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

  const vaultCategoryCounts = useMemo(() => {
    const counts = {};
    for (const c of VAULT_CATEGORIES) counts[c.key] = 0;

    for (const t of vault || []) {
      for (const c of VAULT_CATEGORIES) {
        if (c.key === "all") continue;
        if (matchesCategory(t, c)) counts[c.key] = (counts[c.key] || 0) + 1;
      }
    }
    counts.all = (vault || []).length;
    return counts;
  }, [vault]);

  const visibleVaultCategories = useMemo(() => {
    return VAULT_CATEGORIES.filter((c) => c.key === "all" || (vaultCategoryCounts?.[c.key] || 0) > 0);
  }, [vaultCategoryCounts]);

  const filteredVault = useMemo(() => {
    const cat = VAULT_CATEGORIES.find((c) => c.key === vaultCategory) || VAULT_CATEGORIES[0];
    const q = String(vaultSearch || "").trim().toLowerCase();

    return (vault || []).filter((t) => {
      if (!matchesCategory(t, cat)) return false;
      if (!q) return true;

      const name = String(t?.name || "").toLowerCase();
      if (name.includes(q)) return true;

      const tags = toolTagsArray(t).join(" ").toLowerCase();
      return tags.includes(q);
    });
  }, [vault, vaultCategory, vaultSearch]);

  function VaultSearchInput() {
    return (
      <input
        value={vaultSearch}
        onChange={(e) => setVaultSearch(e.target.value)}
        placeholder="Search vault…"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "#f3f3f7",
          outline: "none",
          fontSize: 14,
        }}
      />
    );
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
              subtitle={loading ? "Loading owned tools…" : owned.length ? null : "No owned tools yet. Add some from the Vault."}
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
                                title={g.tool_global_id ? "Add another owned instance" : "Custom tools can't add instances yet"}
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
                                <div style={{ fontSize: 12, opacity: 0.65 }}>(Custom tool grouping is temporary)</div>
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
              subtitle={loading ? "Loading craving drawer…" : craving.length ? null : "Nothing in craving yet. Add items from the Vault."}
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
                                title={g.tool_global_id ? "Add another craving instance" : "Custom tools can't add instances yet"}
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
                                <div style={{ fontSize: 12, opacity: 0.65 }}>(Custom tool grouping is temporary)</div>
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

            {/* Category chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
              {visibleVaultCategories.map((c) => {
                const active = vaultCategory === c.key;
                const count = vaultCategoryCounts?.[c.key] ?? 0;

                return (
                  <ChipButton
                    key={c.key}
                    active={active}
                    onClick={() => setVaultCategory(c.key)}
                    title={c.key === "all" ? "Show all tools" : `${c.label} (${count})`}
                  >
                    {c.label}
                    <span style={{ opacity: 0.7, marginLeft: 6, fontWeight: 900 }}>{count}</span>
                  </ChipButton>
                );
              })}
            </div>

            {/* Search */}
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <VaultSearchInput />
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {loading && vault.length === 0 ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : null}

              {!loading && filteredVault.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "rgba(255,255,255,0.03)",
                    opacity: 0.85,
                    lineHeight: 1.4,
                  }}
                >
                  No tools found.
                </div>
              ) : null}

              {filteredVault.map((t) => {
                const inOwned = ownedGlobalIds.has(t.id);
                const inCraving = cravingGlobalIds.has(t.id);
                const open = has(openVault, t.id);

                const tiers = offersByToolId?.get(t.id) || null;
                const showOffers = tiersHaveAnyOffers(tiers);

                const catKey = displayCategoryKey(t);
                const catLabel =
                  catKey && VAULT_CATEGORIES.find((c) => c.key === catKey)?.label
                    ? VAULT_CATEGORIES.find((c) => c.key === catKey).label
                    : null;

                return (
                  <ToolRow
                    key={t.id}
                    tool={{
                      name: t.name,
                      icon: t.icon || "🧰",
                      meta: catLabel ? catLabel : undefined,
                    }}
                    open={open}
                    onToggle={() => setOpenVault((prev) => toggleInSet(prev, t.id))}
                    expandedContent={
                      <div style={{ display: "grid", gap: 12 }}>
                        {/* Quick actions */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={busy || inCraving || inOwned}
                            onClick={(e) => {
                              e.stopPropagation();
                              addTo("craving", t.id);
                            }}
                            title={inOwned ? "Already in Owned" : inCraving ? "Already in Craving" : "Add to Craving Drawer"}
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

                        {/* Tiers (only render if there are offers) */}
                        {showOffers ? (
                          <div style={{ display: "grid", gap: 12 }}>
                            <TierBlock title="Starter" regionsMap={tiers?.starter || null} />
                            <TierBlock title="Standard" regionsMap={tiers?.mid || null} />
                            <TierBlock title="Premium" regionsMap={tiers?.premium || null} />
                          </div>
                        ) : null}

                        <div style={{ opacity: 0.75, lineHeight: 1.35, fontSize: 13 }}>
                          Add to <b>Owned</b> to track your specific item(s), labels and photos.
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
