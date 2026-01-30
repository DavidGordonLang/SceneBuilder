import React, { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { ToastProvider } from "./ui/ToastContext.jsx";

import ScenesHome from "./screens/scenes/ScenesHome";
import SceneCreate from "./screens/scenes/SceneCreate";
import SceneView from "./screens/scenes/SceneView";
import SceneEdit from "./screens/scenes/SceneEdit";

import ToolsHome from "./screens/tools/ToolsHome";

import JournalHome from "./screens/journal/JournalHome";
import JournalEntryView from "./screens/journal/JournalEntryView";

import SettingsHome from "./screens/settings/SettingsHome";
import ActionVocabularyScreen from "./screens/profile/ActionVocabularyScreen";
import KinkPreferencesScreen from "./screens/KinkPreferencesScreen";

import ProfileScreen from "./screens/ProfileScreen";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err) {
    return { hasError: true, message: err?.message || String(err) };
  }

  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error("UI crashed:", err, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", padding: 16, display: "grid", placeItems: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            borderRadius: 16,
            border: "1px solid rgba(255,80,80,0.30)",
            background: "rgba(255,80,80,0.08)",
            padding: 16,
            color: "#f3f3f7",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Something broke</div>
          <div style={{ opacity: 0.9, lineHeight: 1.4, marginBottom: 14 }}>
            The UI hit an error and stopped rendering.
          </div>

          <div
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              opacity: 0.95,
              whiteSpace: "pre-wrap",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.30)",
              marginBottom: 14,
            }}
          >
            {this.state.message}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="/home"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "#f3f3f7",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Go Home
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "#f3f3f7",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function PillLink({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        textDecoration: "none",
        color: "#f3f3f7",
        opacity: isActive ? 1 : 0.75,
        fontWeight: isActive ? 900 : 750,
        fontSize: 12,
        padding: "10px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
      })}
    >
      {label}
    </NavLink>
  );
}

function MinimalAuthScreen() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function signInWithGoogle() {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e) {
      setErr(e?.message || "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          padding: 16,
          color: "#f3f3f7",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>SceneBuilder</div>
        <div style={{ opacity: 0.75, lineHeight: 1.4, marginBottom: 14 }}>Sign in to continue.</div>

        {err ? (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,80,80,0.30)",
              background: "rgba(255,80,80,0.08)",
              marginBottom: 12,
              lineHeight: 1.4,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        ) : null}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.06)",
            color: "#f3f3f7",
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return <Navigate to="/scenes" replace />;
}

function AuthedShell({ session }) {
  const location = useLocation();

  const showShell = useMemo(() => {
    const p = location.pathname || "";
    if (p.startsWith("/auth")) return false;
    return true;
  }, [location.pathname]);

  return (
    <div style={{ minHeight: "100vh" }}>
      {showShell ? (
        <>
          {/* TOP: primary tabs (always) */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              padding: "10px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.60)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                maxWidth: 720,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              <PillLink to="/scenes" label="Scenes" end />
              <PillLink to="/tools" label="Tools & Toys" end />
              <PillLink to="/journal" label="Journal" end />
            </div>
          </div>
        </>
      ) : null}

      {/* Content */}
      <div style={{ paddingBottom: showShell ? 74 : 0 }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/home" element={<HomeRedirect />} />

            {/* Scenes */}
            <Route path="/scenes" element={<ScenesHome supabase={supabase} />} />
            <Route path="/scenes/new" element={<SceneCreate supabase={supabase} session={session} />} />
            <Route path="/scenes/:id" element={<SceneView supabase={supabase} session={session} />} />
            <Route path="/scenes/:id/edit" element={<SceneEdit supabase={supabase} session={session} />} />

            {/* Tools */}
            <Route path="/tools" element={<ToolsHome supabase={supabase} />} />

            {/* Journal */}
            <Route path="/journal" element={<JournalHome supabase={supabase} session={session} />} />
            <Route path="/journal/:id" element={<JournalEntryView supabase={supabase} session={session} />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsHome supabase={supabase} />} />
            <Route
              path="/settings/action-vocabulary"
              element={<ActionVocabularyScreen supabase={supabase} session={session} />}
            />
            <Route
              path="/settings/kink-preferences"
              element={<KinkPreferencesScreen supabase={supabase} session={session} mode="settings" />}
            />
            <Route
              path="/settings/partners"
              element={<div style={{ padding: 16, opacity: 0.75 }}>Coming soon.</div>}
            />

            {/* Profile */}
            <Route path="/profile" element={<ProfileScreen supabase={supabase} session={session} />} />
            <Route
              path="/profile/kinks"
              element={<KinkPreferencesScreen supabase={supabase} session={session} mode="profile" />}
            />

            {/* Onboarding */}
            <Route
              path="/onboarding"
              element={<KinkPreferencesScreen supabase={supabase} session={session} mode="onboarding" />}
            />

            {/* Default */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </ErrorBoundary>
      </div>

      {showShell ? (
        <>
          {/* BOTTOM: utility nav */}
          <nav
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 60,
              padding: "10px 12px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                maxWidth: 720,
                margin: "0 auto",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
              }}
            >
              <PillLink to="/settings" label="Settings" end />
              <PillLink to="/home" label="Home" end />
              <PillLink to="/profile" label="Profile" end />
            </div>
          </nav>
        </>
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

  if (loading) return <div style={{ padding: 16, opacity: 0.8 }}>Loading…</div>;

  return (
    <ToastProvider>
      <Routes>
        {!session ? (
          <>
            <Route path="/auth" element={<MinimalAuthScreen />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </>
        ) : (
          <>
            <Route path="/*" element={<AuthedShell session={session} />} />
          </>
        )}
      </Routes>
    </ToastProvider>
  );
}
