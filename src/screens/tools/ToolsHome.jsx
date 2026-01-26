import React, { useEffect, useMemo, useRef, useState } from "react";
import { SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  addGlobalToolToUser,
  deleteUserTool,
  fetchToolVault,
  fetchUserTools,
  getToolPhotoSignedUrl,
  updateUserToolInstanceDetails,
  updateUserToolStatus,
  uploadToolPhoto,
} from "../../lib/toolsApi";

function KebabMenu({ items, disabled }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      const t = e.target;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((v) => !v);
        }}
        aria-label="More actions"
        title="More"
        style={{
          border: "none",
          background: "transparent",
          color: "#f3f3f7",
          cursor: disabled ? "not-allowed" : "pointer",
          padding: 6,
          lineHeight: 1,
          fontSize: 18,
          opacity: disabled ? 0.45 : 0.85,
        }}
      >
        ⋯
      </button>

      {open ? (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 170,
            padding: 6,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(20,20,24,0.92)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
            zIndex: 50,
            display: "grid",
            gap: 4,
          }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick?.();
              }}
              style={{
                textAlign: "left",
                width: "100%",
                border: "none",
                borderRadius: 10,
                padding: "10px 10px",
                background:
                  it.tone === "danger" ? "rgba(255,80,80,0.12)" : "rgba(255,255,255,0.06)",
                color: "#f3f3f7",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 750,
                opacity: 0.95,
              }}
              title={it.title || it.label}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExpandChevron({ open }) {
  // Right when closed, Down when open, no background box
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        fontSize: 16,
        lineHeight: 1,
        opacity: 0.8,
        transform: open ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
        userSelect: "none",
        flex: "0 0 auto",
      }}
    >
      ▸
    </span>
  );
}

function ToolRow({ tool, menuItems, open, onToggle, expandedContent }) {
  const icon = tool.icon || "🧰";

  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gridTemplateColumns: "36px 1fr",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
      title="Tap to expand / collapse"
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
          flex: "0 0 auto",
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {tool.name}
              </div>

              {typeof tool.count === "number" ? (
                <span
                  style={{
                    fontSize: 12,
                    opacity: 0.65,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.04)",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontWeight: 800,
                  }}
                  title="Instances"
                >
                  {tool.count}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
            {menuItems?.length ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <KebabMenu items={menuItems} />
              </div>
            ) : null}
            <ExpandChevron open={open} />
          </div>
        </div>

        {open ? (
          <div
            style={{
              paddingTop: 2,
              opacity: 0.95,
              fontSize: 13,
              lineHeight: 1.4,
              userSelect: "text",
            }}
            onClick={(e) => {
              // Allow interaction inside expanded area without collapsing on every click.
              e.stopPropagation();
            }}
          >
            {expandedContent || <div style={{ opacity: 0.7 }}>More details coming soon.</div>}
          </div>
        ) : null}
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
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{title}</div>
        {subtitle ? (
          <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.35 }}>{subtitle}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// ---- multiple-open helpers ----
function has(set, id) {
  return set.has(id);
}
function toggleInSet(prevSet, id) {
  const next = new Set(prevSet);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function inputStyle(disabled) {
  return {
    flex: "1 1 220px",
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#f3f3f7",
    padding: "0 12px",
    outline: "none",
    opacity: disabled ? 0.7 : 1,
  };
}

export default function ToolsHome() {
  const [tab, setTab] = useState("drawer"); // drawer | vault
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [vault, setVault] = useState([]);
  const [userTools, setUserTools] = useState([]);

  // Expand/collapse state — MULTIPLE open per section (GROUP KEYS)
  const [openOwned, setOpenOwned] = useState(() => new Set());
  const [openCraving, setOpenCraving] = useState(() => new Set());
  const [openVault, setOpenVault] = useState(() => new Set());

  // Per-instance UI state
  const [draftLabel, setDraftLabel] = useState({}); // { [tools_user_id]: string }
  const [photoUrlById, setPhotoUrlById] = useState({}); // { [tools_user_id]: signedUrl }
  const [photoPathById, setPhotoPathById] = useState({}); // { [tools_user_id]: photo_path we last loaded }

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

  function groupKeyForToolUser(tu) {
    if (tu?.tool_global_id) return `g:${tu.tool_global_id}`;
    // Custom / no global tool: group by visible name if present, otherwise isolate by id.
    const base = String(tu?.custom_name || "").trim();
    return base ? `c:${base.toLowerCase()}` : `u:${tu.id}`;
  }

  function groupLabelForToolUser(tu) {
    const g = tu?.tools_global;
    return g?.name || tu?.custom_name || "Untitled";
  }

  function groupIconForToolUser(tu) {
    const g = tu?.tools_global;
    return g?.icon || tu?.custom_icon || "🧰";
  }

  const ownedGroups = useMemo(() => {
    const map = new Map();
    for (const t of owned) {
      const key = groupKeyForToolUser(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const arr = Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      name: groupLabelForToolUser(items[0]),
      icon: groupIconForToolUser(items[0]),
      tool_global_id: items[0]?.tool_global_id || null,
      isCustom: !items[0]?.tool_global_id,
    }));
    // Stable ordering by display name
    arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return arr;
  }, [owned]);

  const cravingGroups = useMemo(() => {
    const map = new Map();
    for (const t of craving) {
      const key = groupKeyForToolUser(t);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const arr = Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
      name: groupLabelForToolUser(items[0]),
      icon: groupIconForToolUser(items[0]),
      tool_global_id: items[0]?.tool_global_id || null,
      isCustom: !items[0]?.tool_global_id,
    }));
    arr.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return arr;
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

  async function addAnotherInstance(status, toolGlobalId, groupKeyToOpen) {
    if (!toolGlobalId) return;
    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(toolGlobalId, status);
      await reload();
      // Keep that group open after add
      if (status === "owned") {
        setOpenOwned((prev) => {
          const next = new Set(prev);
          next.add(groupKeyToOpen);
          return next;
        });
      } else {
        setOpenCraving((prev) => {
          const next = new Set(prev);
          next.add(groupKeyToOpen);
          return next;
        });
      }
    } catch (e) {
      setErr(e?.message || "Could not add another instance.");
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

  async function ensureSignedPhotoUrl(toolUserId, photo_path) {
    const path = String(photo_path || "").trim();
    if (!path) return;

    // If we already have a signed url for this exact path, skip
    if (photoPathById?.[toolUserId] === path && photoUrlById?.[toolUserId]) return;

    try {
      const signedUrl = await getToolPhotoSignedUrl(path);
      setPhotoPathById((prev) => ({ ...prev, [toolUserId]: path }));
      setPhotoUrlById((prev) => ({ ...prev, [toolUserId]: signedUrl }));
    } catch (e) {
      // Non-fatal
      // eslint-disable-next-line no-console
      console.warn("Failed to load signed tool photo URL:", e);
    }
  }

  async function saveLabel(toolUserId) {
    const nextLabel = String(draftLabel?.[toolUserId] ?? "").trim();
    setErr("");
    setBusy(true);
    try {
      await updateUserToolInstanceDetails(toolUserId, { instance_label: nextLabel || null });
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not save label.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(toolUserId, file) {
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const { photo_path, signedUrl } = await uploadToolPhoto(toolUserId, file);
      await updateUserToolInstanceDetails(toolUserId, { photo_path });
      setPhotoPathById((prev) => ({ ...prev, [toolUserId]: photo_path }));
      setPhotoUrlById((prev) => ({ ...prev, [toolUserId]: signedUrl || null }));
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not upload photo.");
    } finally {
      setBusy(false);
    }
  }

  function InstanceRow({ tu, status }) {
    const labelValue = draftLabel?.[tu.id] !== undefined ? draftLabel[tu.id] : tu.instance_label || "";
    const photoUrl = photoUrlById?.[tu.id] || null;

    const displayName = tu?.tools_global?.name || tu?.custom_name || "Tool";

    const menuItems =
      status === "owned"
        ? [
            {
              key: "remove",
              label: "Remove",
              tone: "danger",
              onClick: () => removeFromDrawer(tu.id, displayName),
            },
          ]
        : [
            {
              key: "move",
              label: "Move to Owned",
              onClick: () => moveCravingToOwned(tu.id),
            },
            {
              key: "remove",
              label: "Remove",
              tone: "danger",
              onClick: () => removeFromDrawer(tu.id, displayName),
            },
          ];

    return (
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.02)",
          display: "grid",
          gap: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
              Instance
            </div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              {tu.instance_label ? `“${tu.instance_label}”` : "No label"}
            </div>
          </div>

          <KebabMenu items={menuItems} disabled={busy} />
        </div>

        {/* Photo */}
        {photoUrl ? (
          <div
            style={{
              width: "100%",
              maxWidth: 320,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <img src={photoUrl} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
          </div>
        ) : (
          <div style={{ opacity: 0.7, fontSize: 13 }}>No photo yet.</div>
        )}

        {/* Upload + refresh */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.06)",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 800,
              fontSize: 12,
              opacity: busy ? 0.6 : 1,
            }}
            title="Upload a photo for this tool instance"
            onClick={(e) => e.stopPropagation()}
          >
            📷 Upload photo
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              style={{ display: "none" }}
              onChange={(e) => {
                e.stopPropagation();
                const file = e.target.files?.[0];
                e.target.value = "";
                handleUpload(tu.id, file);
              }}
            />
          </label>

          {tu.photo_path ? (
            <SmallButton
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                ensureSignedPhotoUrl(tu.id, tu.photo_path);
              }}
              title="Refresh photo preview"
            >
              Refresh photo
            </SmallButton>
          ) : null}
        </div>

        {/* Label edit */}
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Label</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={labelValue}
              placeholder='e.g. "Black cuffs", "Travel kit"'
              disabled={busy}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraftLabel((prev) => ({ ...prev, [tu.id]: e.target.value }))}
              style={inputStyle(busy)}
            />
            <SmallButton
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                saveLabel(tu.id);
              }}
              title="Save label"
            >
              Save
            </SmallButton>
          </div>
        </div>
      </div>
    );
  }

  const infoText =
    tab === "drawer"
      ? loading
        ? "Loading drawer…"
        : `${owned.length} owned • ${craving.length} craving`
      : loading
      ? "Loading vault…"
      : `${vault.length} in vault`;

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Contextual actions row */}
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
            <SmallButton onClick={reload} disabled={loading || busy} title="Refresh tools">
              {loading ? "Loading…" : "Refresh"}
            </SmallButton>
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
              subtitle={owned.length ? null : "No owned tools yet. Add some from the Vault."}
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
                            // Load signed urls for any instances that have photos
                            for (const tu of g.items) ensureSignedPhotoUrl(tu.id, tu.photo_path);
                          }
                        }}
                        expandedContent={
                          <div style={{ display: "grid", gap: 12 }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <SmallButton
                                disabled={busy || !g.tool_global_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addAnotherInstance("owned", g.tool_global_id, g.key);
                                }}
                                title={
                                  g.tool_global_id
                                    ? "Add another owned instance"
                                    : "Custom tools can't add instances yet"
                                }
                              >
                                + Add another
                              </SmallButton>
                              {g.isCustom ? (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>
                                  (Custom tool grouping is temporary)
                                </div>
                              ) : null}
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              {g.items.map((tu) => (
                                <InstanceRow key={tu.id} tu={tu} status="owned" />
                              ))}
                            </div>
                          </div>
                        }
                        menuItems={null}
                      />
                    );
                  })}
                </div>
              ) : null}
            </Section>

            <Section
              title="Craving drawer"
              subtitle={craving.length ? null : "Nothing in craving yet. Add items from the Vault."}
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
                              <SmallButton
                                disabled={busy || !g.tool_global_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addAnotherInstance("craving", g.tool_global_id, g.key);
                                }}
                                title={
                                  g.tool_global_id
                                    ? "Add another craving instance"
                                    : "Custom tools can't add instances yet"
                                }
                              >
                                + Add another
                              </SmallButton>
                              {g.isCustom ? (
                                <div style={{ fontSize: 12, opacity: 0.65 }}>
                                  (Custom tool grouping is temporary)
                                </div>
                              ) : null}
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              {g.items.map((tu) => (
                                <InstanceRow key={tu.id} tu={tu} status="craving" />
                              ))}
                            </div>
                          </div>
                        }
                        menuItems={null}
                      />
                    );
                  })}
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
                          <SmallButton
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
                          >
                            + Craving
                          </SmallButton>
                          <SmallButton
                            disabled={busy || inOwned}
                            onClick={(e) => {
                              e.stopPropagation();
                              addTo("owned", t.id);
                            }}
                            title={inOwned ? "Already in Owned" : "Add to Owned Tools"}
                          >
                            + Owned
                          </SmallButton>
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
