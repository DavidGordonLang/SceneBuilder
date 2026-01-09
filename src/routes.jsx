import React, { useEffect, useMemo, useState } from "react";
import { fetchToolVault, fetchUserTools } from "./lib/toolsApi";

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

function ToolRow({ tool }) {
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
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{tool.name}</div>
          {safety ? <span style={{ opacity: 0.6, fontSize: 12 }}>{safety}</span> : null}
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
              fontWeight: active ? 700 : 600,
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

export function ScenesHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <TopBar title="Scenes" onSignOut={signOut} />
      <div style={{ padding: 16 }}>
        <p style={{ opacity: 0.8 }}>
          Next: New Scene flow, Scene detail, Run mode (timer + optional step cards).
        </p>
      </div>
    </div>
  );
}

export function ToolsHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  const [tab, setTab] = useState("drawer"); // drawer | vault
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [vault, setVault] = useState([]);
  const [userTools, setUserTools] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const [v, ut] = await Promise.all([fetchToolVault(), fetchUserTools()]);
        if (!alive) return;
        setVault(v);
        setUserTools(ut);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load tools.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const owned = useMemo(
    () => userTools.filter((t) => t.status === "owned"),
    [userTools]
  );
  const craving = useMemo(
    () => userTools.filter((t) => t.status === "craving"),
    [userTools]
  );

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
            }}
          >
            {err}
          </div>
        ) : tab === "drawer" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Owned Tools</div>
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
                        tool={{
                          name,
                          icon,
                          tags,
                          safety_level: safety,
                        }}
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
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Craving Drawer</div>
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
                        tool={{
                          name,
                          icon,
                          tags,
                          safety_level: safety,
                        }}
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
              Tool Vault (global catalogue). Next: add to Owned/Craving.
            </div>
            {vault.map((t) => (
              <ToolRow key={t.id} tool={t} />
            ))}
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
