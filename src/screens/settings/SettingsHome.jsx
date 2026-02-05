import React from "react";
import { Card } from "../../components/routesUi";
import Page from "../../components/Page";

export default function SettingsHome() {
  return (
    <div>
      <Page style={{ display: "grid", gap: 14 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Settings</div>

        <div style={{ display: "grid", gap: 12 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Settings</div>
                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                  App preferences will live here. Connections and identity now live in Profile.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Page>
    </div>
  );
}
