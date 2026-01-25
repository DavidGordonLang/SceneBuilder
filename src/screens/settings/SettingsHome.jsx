import React from "react";
import { SmallButton, Card, Chip } from "../../components/routesUi";
import Page from "../../components/Page";

export default function SettingsHome({ supabase }) {
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        {/* Contextual actions row (Settings keeps sign out) */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>Settings</div>

          <SmallButton tone="danger" onClick={signOut} title="Sign out">
            Sign out
          </SmallButton>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Card asLink to="/settings/action-vocabulary">
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

          <Card asLink to="/profile?edit=1&from=settings">
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
      </Page>
    </div>
  );
}
