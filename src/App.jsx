import React, { useEffect, useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { ScenesHome, ToolsHome, JournalHome } from "./routes.jsx";

const TAB_BAR_HEIGHT = 56;

const navStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(11,11,15,0.92)",
  backdropFilter: "blur(10px)",
  paddingBottom: "env(safe-area-inset-bottom)",
};

const linkBase = {
  padding: "12px 10px",
  textAlign: "center",
  fontSize: 12,
  letterSpacing: 0.3,
  userSelect: "none",
};

function TabLink({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...linkBase,
        opacity: isActive ? 1 : 0.65,
        fontWeight: isActive ? 650 : 500,
      })}
    >
      {label}
    </NavLink>
  );
}

function AuthScreen() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function signInWithGoogle() {
    setErr("");
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/scenes`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setErr(error.message);
    } catch (e) {
      setErr(e?.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: "min(420px, 92vw)",
          padding: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>SceneBuilder</h1>
        <p style={{ marginTop: 8, opacity: 0.8, lineHeight: 1.4 }}>
          Sign in to plan scenes, manage tools, and journal reflections.
        </p>

        {err ? (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        ) : null}

        <button
          onClick={signInWithGoogle}
          disabled={busy}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "12px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.18)",
            background: busy ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.10)",
            color: "#f3f3f7",
            cursor: busy ? "not-allowed" : "pointer",
            fontWeight: 650,
          }}
        >
          {busy ? "Signing in..." : "Sign in with Google"}
        </button>

        <p style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
          Apple and email sign-in will be added later.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setBooting(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (booting) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", opacity: 0.8 }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div
      style={{
        paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/scenes" replace />} />
        <Route path="/scenes" element={<ScenesHome session={session} supabase={supabase} />} />
        <Route path="/tools" element={<ToolsHome session={session} supabase={supabase} />} />
        <Route path="/journal" element={<JournalHome session={session} supabase={supabase} />} />
        <Route path="*" element={<Navigate to="/scenes" replace />} />
      </Routes>

      <nav style={navStyle} aria-label="Primary">
        <TabLink to="/scenes" label="Scenes" />
        <TabLink to="/tools" label="Tools" />
        <TabLink to="/journal" label="Journal" />
      </nav>
    </div>
  );
}
