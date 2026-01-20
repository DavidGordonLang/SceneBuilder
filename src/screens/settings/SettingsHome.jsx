import React from "react";
import { TopBar, Card, Chip } from "../../components/routesUi";

export default function SettingsHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <TopBar title="Settings" onSignOut={signOut} />
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <Card asLink to="/vocabulary">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Action Vocabulary</div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                Set the exact wording you want used when actions appear in plans.
              </div>
            </div>
            <div style={{ opacity: 0.75 }}>›</div>
          </div>
        </Card>

        <Card asLink to="/profile">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Profile</div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                Avatar and identity basics.
              </div>
            </div>
            <div style={{ opacity: 0.75 }}>›</div>
          </div>
        </Card>

        <Card asLink to="/profile/kinks">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Kink Preferences</div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                Yes / Curious / No and limits.
              </div>
            </div>
            <div style={{ opacity: 0.75 }}>›</div>
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}>
                Partners <Chip>Coming soon</Chip>
              </div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                Link accounts to compare preferences and build shared planning space.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
