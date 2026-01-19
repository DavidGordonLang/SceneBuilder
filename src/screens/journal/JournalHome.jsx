import React from "react";
import { TopBar } from "../../components/routesUi";

export default function JournalHome({ supabase }) {
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
