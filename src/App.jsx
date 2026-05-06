import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { ToastProvider } from "./ui/ToastContext.jsx";

import ScenesHome from "./screens/scenes/ScenesHome";
import SceneCreate from "./screens/scenes/SceneCreate";
import SceneEdit from "./screens/scenes/SceneEdit";

import ToolsHome from "./screens/tools/ToolsHome";

import JournalHome from "./screens/journal/JournalHome";
import JournalEntryView from "./screens/journal/JournalEntryView";

import SettingsHome from "./screens/settings/SettingsHome";
import ActionVocabularyScreen from "./screens/profile/ActionVocabularyScreen";
import KinkPreferencesScreen from "./screens/KinkPreferencesScreen";

import ProfileScreen from "./screens/ProfileScreen";

import { fetchScenes } from "./lib/scenesApi";
import { fetchToolVault, fetchUserTools } from "./lib/toolsApi";
import { fetchJournalEntries } from "./lib/journalApi";
import { setCachedJournal, setCachedProfile, setCachedScenes, setCachedTools } from "./lib/appDataCache";

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

let authCallbackExchangePromise = null;

function MinimalAuthScreen() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function signInWithGoogle() {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
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

function AuthCallback() {
  const navigate = useNavigate();
  const hasRunRef = useRef(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("Finishing sign-in...");

  useEffect(() => {
    let alive = true;
    const timeoutId = window.setTimeout(() => {
      if (!alive) return;
      setErr("Sign-in is taking too long. Please try again from the sign-in screen.");
    }, 15000);

    async function exchangeCode() {
      if (hasRunRef.current) return;
      hasRunRef.current = true;

      const params = new URLSearchParams(window.location.search || "");
      const code = params.get("code");

      try {
        if (code) {
          setStatus("Exchanging sign-in code...");
          if (!authCallbackExchangePromise) {
            authCallbackExchangePromise = supabase.auth.exchangeCodeForSession(code);
          }

          const { error } = await authCallbackExchangePromise;
          if (error) throw error;
          if (!alive) return;
          navigate("/scenes", { replace: true });
          return;
        }

        setStatus("Checking existing session...");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!alive) return;

        if (session) {
          navigate("/scenes", { replace: true });
          return;
        }

        setErr("Missing auth callback code.");
      } catch (e) {
        authCallbackExchangePromise = null;
        if (!alive) return;
        const message = e?.message || "Sign-in callback failed.";
        const errorStatus = e?.status || e?.cause?.status || null;
        setErr(errorStatus ? `${message} (status ${errorStatus})` : message);
      }
    }

    exchangeCode();

    return () => {
      alive = false;
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div style={{ minHeight: "100vh", padding: 16, display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 16,
          border: err ? "1px solid rgba(255,80,80,0.30)" : "1px solid rgba(255,255,255,0.10)",
          background: err ? "rgba(255,80,80,0.08)" : "rgba(255,255,255,0.03)",
          padding: 16,
          color: "#f3f3f7",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>SceneBuilder</div>
        <div style={{ opacity: 0.8, lineHeight: 1.4 }}>
          {err || status}
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return <Navigate to="/scenes" replace />;
}

function BootOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#f3f3f7" }}>SceneBuilder</div>
        <div style={{ marginTop: 10, opacity: 0.7, color: "#f3f3f7", fontSize: 13 }}>
          Loading…
        </div>
      </div>
    </div>
  );
}

async function bootstrapPrefetch({ supabase, session }) {
  const uid = session?.user?.id;
  if (!uid) return;

  // Fetch in parallel. We only persist "home list" level data.
  const [scenesRes, toolsVaultRes, userToolsRes, journalRes, profileRes] = await Promise.allSettled([
    fetchScenes(), // uses auth; ok
    fetchToolVault(),
    fetchUserTools(),
    fetchJournalEntries({ supabase, userId: uid, limit: 80 }),
    supabase
      .from("profiles")
      .select("id, display_name, bio, avatar_url, onboarding_complete")
      .eq("id", uid)
      .single(),
  ]);

  if (scenesRes.status === "fulfilled") setCachedScenes(uid, scenesRes.value ?? []);
  if (toolsVaultRes.status === "fulfilled" && userToolsRes.status === "fulfilled") {
    setCachedTools(uid, toolsVaultRes.value ?? [], userToolsRes.value ?? []);
  }
  if (journalRes.status === "fulfilled") setCachedJournal(uid, journalRes.value ?? []);
  if (profileRes.status === "fulfilled") {
    const row = profileRes.value?.data ?? null;
    if (row) setCachedProfile(uid, row);
  }
}

function AuthedShell({ session }) {
  const location = useLocation();

  const showShell = useMemo(() => {
    const p = location.pathname || "";
    if (p.startsWith("/auth")) return false;
    return true;
  }, [location.pathname]);

  // Boot overlay now ties to real data prefetch (with min + max).
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    const startMs = Date.now();
    const MIN_MS = 220;
    const MAX_MS = 4500; // safety: never hang forever

    const maxTimer = window.setTimeout(() => {
      if (!alive) return;
      setBooting(false);
    }, MAX_MS);

    (async () => {
      try {
        await bootstrapPrefetch({ supabase, session });
      } catch {
        // ignore; prefetch shouldn't block the app forever
      } finally {
        const elapsed = Date.now() - startMs;
        const remaining = Math.max(0, MIN_MS - elapsed);

        window.setTimeout(() => {
          if (!alive) return;
          setBooting(false);
          window.clearTimeout(maxTimer);
        }, remaining);
      }
    })();

    return () => {
      alive = false;
      window.clearTimeout(maxTimer);
    };
  }, [session]);

  return (
    <div style={{ minHeight: "100vh" }}>
      {booting ? <BootOverlay /> : null}

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
            <Route path="/scenes" element={<ScenesHome supabase={supabase} session={session} />} />
            <Route path="/scenes/new" element={<SceneCreate supabase={supabase} session={session} />} />
            <Route path="/scenes/:id" element={<Navigate to="/scenes" replace />} />
            <Route path="/scenes/:id/edit" element={<SceneEdit supabase={supabase} session={session} />} />

            {/* Tools */}
            <Route path="/tools" element={<ToolsHome supabase={supabase} session={session} />} />

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
        <Route path="/auth/callback" element={<AuthCallback />} />
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
