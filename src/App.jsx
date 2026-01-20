import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import ScenesHome from "./screens/scenes/ScenesHome";
import SceneNew from "./screens/scenes/SceneNew";
import SceneView from "./screens/scenes/SceneView";
import SceneEdit from "./screens/scenes/SceneEdit";

import ToolsHome from "./screens/tools/ToolsHome";

import JournalHome from "./screens/journal/JournalHome";
import JournalEntryView from "./screens/journal/JournalEntryView";

import SettingsHome from "./screens/settings/SettingsHome";
import ActionVocabularyScreen from "./screens/settings/ActionVocabularyScreen";
import KinkPreferencesScreen from "./screens/settings/KinkPreferencesScreen";
import PartnersScreen from "./screens/settings/PartnersScreen";

import ProfileScreen from "./screens/ProfileScreen";
import AuthScreen from "./screens/AuthScreen";

function TabLink({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: "none",
        color: "#f3f3f7",
        opacity: isActive ? 1 : 0.7,
        fontWeight: isActive ? 800 : 650,
        fontSize: 12,
        padding: "10px 12px",
        borderRadius: 12,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      })}
    >
      {label}
    </NavLink>
  );
}

function AuthedApp({ session }) {
  const location = useLocation();

  const showTabs = useMemo(() => {
    const p = location.pathname || "";
    // Hide tabs on login or onboarding flows if needed
    if (p.startsWith("/auth")) return false;
    if (p.startsWith("/onboarding")) return false;
    return true;
  }, [location.pathname]);

  return (
    <div style={{ minHeight: "100vh", paddingBottom: showTabs ? 74 : 0 }}>
      <Routes>
        {/* Home is stable and can be repointed later */}
        <Route path="/home" element={<Navigate to="/scenes" replace />} />

        {/* Scenes */}
        <Route path="/scenes" element={<ScenesHome supabase={supabase} />} />
        <Route path="/scenes/new" element={<SceneNew supabase={supabase} session={session} />} />
        <Route path="/scenes/:id" element={<SceneView supabase={supabase} session={session} />} />
        <Route path="/scenes/:id/edit" element={<SceneEdit supabase={supabase} session={session} />} />

        {/* Tools */}
        <Route path="/tools" element={<ToolsHome supabase={supabase} />} />

        {/* Journal */}
        <Route path="/journal" element={<JournalHome supabase={supabase} session={session} />} />
        <Route path="/journal/:id" element={<JournalEntryView supabase={supabase} session={session} />} />

        {/* Settings */}
        <Route path="/settings" element={<SettingsHome supabase={supabase} />} />
        <Route path="/settings/action-vocabulary" element={<ActionVocabularyScreen supabase={supabase} session={session} />} />
        <Route
          path="/settings/kink-preferences"
          element={<KinkPreferencesScreen supabase={supabase} session={session} mode="settings" />}
        />
        <Route path="/settings/partners" element={<PartnersScreen supabase={supabase} session={session} />} />

        {/* Profile */}
        <Route path="/profile" element={<ProfileScreen supabase={supabase} session={session} />} />
        <Route path="/profile/kinks" element={<KinkPreferencesScreen supabase={supabase} session={session} mode="profile" />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<KinkPreferencesScreen supabase={supabase} session={session} mode="onboarding" />} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/scenes" replace />} />
        <Route path="*" element={<Navigate to="/scenes" replace />} />
      </Routes>

      {showTabs ? (
        <nav
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "10px 12px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              maxWidth: 720,
              margin: "0 auto",
            }}
          >
            <TabLink to="/scenes" label="Scenes" />
            <TabLink to="/tools" label="Tools" />
            <TabLink to="/journal" label="Journal" />
          </div>
        </nav>
      ) : null}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s || null);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s || null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 16, opacity: 0.8 }}>
        Loading…
      </div>
    );
  }

  return (
    <Routes>
      {!session ? (
        <>
          <Route path="/auth" element={<AuthScreen supabase={supabase} />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      ) : (
        <>
          <Route path="/*" element={<AuthedApp session={session} />} />
        </>
      )}
    </Routes>
  );
}
