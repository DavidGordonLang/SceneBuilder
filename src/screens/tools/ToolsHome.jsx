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
        // Prevent expandable-row keyboard shortcuts from firing while typing inside inputs.
        const tag = e?.target?.tagName;
        const isFormField =
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          tag === "BUTTON" ||
          e?.target?.isContentEditable;

        if (isFormField) return;

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
              fontWeight: 800,
              opacity: active ? 1 : 0.75,
            }}
            type="button"
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function inputStyle(disabled) {
  return {
    width: "100%",
    maxWidth: 260,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    color: "#f3f3f7",
    padding: "10px 12px",
    fontSize: 13,
    outline: "none",
    opacity: disabled ? 0.6 : 1,
  };
}

export default function ToolsHome() {
  const [tab, setTab] = useState("drawer"); // drawer | vault
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Drawer (owned + craving instances)
  const [owned, setOwned] = useState([]);
  const [craving, setCraving] = useState([]);

  // Vault (global tools list)
  const [vault, setVault] = useState([]);

  // Which global tool rows are expanded (drawer/vault separate)
  const [openDrawerIds, setOpenDrawerIds] = useState(() => new Set());
  const [openVaultIds, setOpenVaultIds] = useState(() => new Set());

  // Per-instance UI state
  const [draftLabel, setDraftLabel] = useState({});
  const [photoUrlById, setPhotoUrlById] = useState({});
  const [photoPathById, setPhotoPathById] = useState({});

  // Simple cache-bust for reload
  const reloadNonce = useRef(0);

  function toggleInSet(setter, id) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const drawerByGlobal = useMemo(() => {
    const m = new Map();
    function add(tu) {
      const globalId = tu.tools_global_id || tu?.tools_global?.id || tu.custom_tool_id || "custom";
      const key = String(globalId);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(tu);
    }
    owned.forEach(add);
    craving.forEach(add);

    // Stable ordering inside each group (by created_at then id)
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => {
        const at = String(a.created_at || "");
        const bt = String(b.created_at || "");
        if (at < bt) return -1;
        if (at > bt) return 1;
        return String(a.id).localeCompare(String(b.id));
      });
      m.set(k, list);
    }

    return m;
  }, [owned, craving]);

  const drawerGlobalRows = useMemo(() => {
    // Build rows: one per global tool (or custom grouping key)
    const rows = [];

    // Create a set of all global ids in drawer
    for (const [key, list] of drawerByGlobal.entries()) {
      const first = list[0];
      const isCustom = !first?.tools_global_id && !!first?.custom_tool_id;

      const tool = isCustom
        ? {
            id: key,
            name: first?.custom_name || "Custom tool",
            icon: first?.custom_icon || "🛠️",
            custom: true,
            count: list.length,
          }
        : {
            id: key,
            name: first?.tools_global?.name || "Tool",
            icon: first?.tools_global?.icon || "🧰",
            custom: false,
            count: list.length,
          };

      rows.push({ key, tool, instances: list });
    }

    // Sort by tool name
    rows.sort((a, b) => String(a.tool.name).localeCompare(String(b.tool.name)));
    return rows;
  }, [drawerByGlobal]);

  async function reload() {
    setErr("");
    setLoading(true);
    try {
      const [drawer, v] = await Promise.all([fetchUserTools(), fetchToolVault()]);
      const nextOwned = drawer?.owned || [];
      const nextCraving = drawer?.craving || [];
      setOwned(nextOwned);
      setCraving(nextCraving);
      setVault(v || []);

      // Seed draft labels if missing
      setDraftLabel((prev) => {
        const next = { ...prev };
        for (const tu of [...nextOwned, ...nextCraving]) {
          if (next[tu.id] === undefined) next[tu.id] = tu.instance_label || "";
        }
        return next;
      });

      // Kick off signed URL loads for any instances that have photos
      for (const tu of [...nextOwned, ...nextCraving]) {
        if (tu.photo_path) ensureSignedPhotoUrl(tu.id, tu.photo_path);
      }
    } catch (e) {
      setErr(e?.message || "Could not load tools.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function moveToDrawer(globalToolId, status) {
    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(globalToolId, status);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not add tool.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFromDrawer(toolUserId, displayName) {
    const ok = window.confirm(`Remove “${displayName}” from your tools?`);
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

  async function moveCravingToOwned(toolUserId) {
    setErr("");
    setBusy(true);
    try {
      await updateUserToolStatus(toolUserId, "owned");
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not move to owned.");
    } finally {
      setBusy(false);
    }
  }

  async function addAnotherInstance(globalToolId, status) {
    setErr("");
    setBusy(true);
    try {
      await addGlobalToolToUser(globalToolId, status);
      await reload();
    } catch (e) {
      setErr(e?.message || "Could not add another instance.");
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
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Instance</div>
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
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
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
              border: "1px solid rgba(255,80,80,0.20)",
              background: "rgba(255,80,80,0.08)",
              color: "#ffd0d0",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {err}
          </div>
        ) : null}

        {/* Drawer */}
        {tab === "drawer" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {drawerGlobalRows.length === 0 ? (
              <div style={{ opacity: 0.7, fontSize: 13 }}>No tools in your drawer yet.</div>
            ) : null}

            {drawerGlobalRows.map(({ key, tool, instances }) => {
              const isOpen = openDrawerIds.has(key);

              const ownedInstances = instances.filter((tu) => tu.status === "owned");
              const cravingInstances = instances.filter((tu) => tu.status === "craving");

              const menuItems = tool.custom
                ? []
                : [
                    {
                      key: "addOwned",
                      label: "Add owned instance",
                      onClick: () => addAnotherInstance(tool.id, "owned"),
                      title: "Create another owned instance of this tool",
                    },
                    {
                      key: "addCraving",
                      label: "Add craving instance",
                      onClick: () => addAnotherInstance(tool.id, "craving"),
                      title: "Create another craving instance of this tool",
                    },
                  ];

              return (
                <ToolRow
                  key={key}
                  tool={tool}
                  menuItems={menuItems}
                  open={isOpen}
                  onToggle={() => toggleInSet(setOpenDrawerIds, key)}
                  expandedContent={
                    <div style={{ display: "grid", gap: 10 }}>
                      {ownedInstances.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>Owned</div>
                          {ownedInstances.map((tu) => (
                            <InstanceRow key={tu.id} tu={tu} status="owned" />
                          ))}
                        </div>
                      ) : (
                        <div style={{ opacity: 0.7, fontSize: 13 }}>No owned instances yet.</div>
                      )}

                      {cravingInstances.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.7 }}>Craving</div>
                          {cravingInstances.map((tu) => (
                            <InstanceRow key={tu.id} tu={tu} status="craving" />
                          ))}
                        </div>
                      ) : (
                        <div style={{ opacity: 0.7, fontSize: 13 }}>No craving instances.</div>
                      )}

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <SmallButton
                          disabled={busy || tool.custom}
                          onClick={() => addAnotherInstance(tool.id, "owned")}
                          title={
                            tool.custom
                              ? "Custom tools can't add instances yet"
                              : "Add another owned instance"
                          }
                        >
                          Add owned
                        </SmallButton>
                        <SmallButton
                          disabled={busy || tool.custom}
                          onClick={() => addAnotherInstance(tool.id, "craving")}
                          title={
                            tool.custom
                              ? "Custom tools can't add instances yet"
                              : "Add another craving instance"
                          }
                        >
                          Add craving
                        </SmallButton>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : null}

        {/* Vault */}
        {tab === "vault" ? (
          <div style={{ display: "grid", gap: 10 }}>
            {vault.length === 0 ? <div style={{ opacity: 0.7, fontSize: 13 }}>No vault items.</div> : null}

            {vault.map((t) => {
              const key = String(t.id);
              const isOpen = openVaultIds.has(key);

              const inOwned = owned.some((u) => u.tools_global_id === t.id);
              const inCraving = craving.some((u) => u.tools_global_id === t.id);

              const menuItems = [
                {
                  key: "addOwned",
                  label: inOwned ? "Add another owned instance" : "Add to Owned",
                  onClick: () => moveToDrawer(t.id, "owned"),
                },
                {
                  key: "addCraving",
                  label: inCraving ? "Add another craving instance" : "Add to Craving",
                  onClick: () => moveToDrawer(t.id, "craving"),
                },
              ];

              return (
                <ToolRow
                  key={t.id}
                  tool={{ ...t, count: undefined }}
                  menuItems={menuItems}
                  open={isOpen}
                  onToggle={() => toggleInSet(setOpenVaultIds, key)}
                  expandedContent={
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ opacity: 0.8 }}>
                        Vault items will later show richer details and let you create your own owned instances (with photos).
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <SmallButton disabled={busy} onClick={() => moveToDrawer(t.id, "owned")}>
                          Add to Owned
                        </SmallButton>
                        <SmallButton disabled={busy} onClick={() => moveToDrawer(t.id, "craving")}>
                          Add to Craving
                        </SmallButton>
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : null}

        {/* Tiny hidden reload nonce for debugging / forcing rerenders if needed */}
        <div style={{ display: "none" }}>{reloadNonce.current}</div>
      </Page>
    </div>
  );
}
