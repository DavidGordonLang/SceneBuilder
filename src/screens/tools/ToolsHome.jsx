import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chip, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  addGlobalToolToUser,
  deleteUserTool,
  fetchToolVault,
  fetchUserTools,
  updateUserToolStatus,
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
                background: it.tone === "danger" ? "rgba(255,80,80,0.12)" : "rgba(255,255,255,0.06)",
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

function ToolRow({ tool, menuItems }) {
  const icon = tool.icon || "🧰";
  const tags = Array.isArray(tool.tags) ? tool.tags : [];
  const safety = tool.safety_level ? String(tool.safety_level).toUpperCase() : null;

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
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tool.name}
              </div>
              {safety ? <span style={{ opacity: 0.6, fontSize: 12 }}>{safety}</span> : null}
            </div>
          </div>

          {menuItems?.length ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <KebabMenu items={menuItems} />
            </div>
          ) : null}
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
        {subtitle ? <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.35 }}>{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function ToolsHome() {
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
        {/* Contextual actions row (no page title, no sign out) */}
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
              onChange={setTab}
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
            <Section title="Owned tools" subtitle={owned.length ? null : "No owned tools yet. Add some from the Vault."}>
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
                        menuItems={[
                          {
                            key: "remove",
                            label: "Remove",
                            tone: "danger",
                            onClick: () => removeFromDrawer(t.id, name),
                          },
                        ]}
                      />
                    );
                  })}
                </div>
              ) : null}
            </Section>

            <Section title="Craving drawer" subtitle={craving.length ? null : "Nothing in craving yet. Add items from the Vault."}>
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
                        menuItems={[
                          {
                            key: "move",
                            label: "Move to Owned",
                            onClick: () => moveCravingToOwned(t.id),
                          },
                          {
                            key: "remove",
                            label: "Remove",
                            tone: "danger",
                            onClick: () => removeFromDrawer(t.id, name),
                          },
                        ]}
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

                return (
                  <div
                    key={t.id}
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
                      {t.icon || "🧰"}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.name}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <SmallButton
                            disabled={busy || inCraving || inOwned}
                            onClick={() => addTo("craving", t.id)}
                            title={inOwned ? "Already in Owned" : inCraving ? "Already in Craving" : "Add to Craving Drawer"}
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
                        </div>
                      </div>

                      {Array.isArray(t.tags) && t.tags.length ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {t.tags.slice(0, 6).map((tag) => (
                            <Chip key={tag}>{tag}</Chip>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>No tags</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Page>
    </div>
  );
}
