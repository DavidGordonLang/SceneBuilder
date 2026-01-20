import React, { useEffect, useMemo, useState } from "react";
import { TopBar, Chip, SmallButton } from "../../components/routesUi";
import Page from "../../components/Page";
import {
  addGlobalToolToUser,
  deleteUserTool,
  fetchToolVault,
  fetchUserTools,
  updateUserToolStatus,
} from "../../lib/toolsApi";

function ToolRow({ tool, actions }) {
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
              {safety ? <span style={{ opacity: 0.6, fontSize: 12 }}>{safety}</span> : null}
            </div>
          </div>

          {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div> : null}
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

export default function ToolsHome({ supabase }) {
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

      <Page style={{ display: "grid", gap: 14 }}>
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
              ) : null}
            </Section>

            <Section
              title="Craving drawer"
              subtitle={craving.length ? null : "Nothing in craving yet. Add items from the Vault."}
            >
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
          </div>
        )}
      </Page>
    </div>
  );
}
