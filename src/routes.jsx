import React from "react";

export function ScenesHome() {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Scenes</h1>
      <p style={{ opacity: 0.8 }}>
        This is the scene-first home. Next: New Scene flow, Scene detail, Run
        mode.
      </p>
    </div>
  );
}

export function ToolsHome() {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Tools</h1>
      <p style={{ opacity: 0.8 }}>
        ToolDrawer (Owned/Craving) and Tool Vault will live here.
      </p>
    </div>
  );
}

export function JournalHome() {
  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Journal</h1>
      <p style={{ opacity: 0.8 }}>
        Journal timeline with Planning vs Reflection entries.
      </p>
    </div>
  );
}
