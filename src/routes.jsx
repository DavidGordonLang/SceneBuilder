import React from "react";

function TopBar({ title, onSignOut }) {
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
          This is the scene-first home. Next: New Scene flow, Scene detail, Run mode.
        </p>
      </div>
    </div>
  );
}

export function ToolsHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <TopBar title="Tools" onSignOut={signOut} />
      <div style={{ padding: 16 }}>
        <p style={{ opacity: 0.8 }}>
          ToolDrawer (Owned/Craving) and Tool Vault will live here.
        </p>
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
          Journal timeline with Planning vs Reflection entries.
        </p>
      </div>
    </div>
  );
}
