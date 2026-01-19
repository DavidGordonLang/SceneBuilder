import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useKinkCatalogue } from "../hooks/useKinkCatalogue";
import { useKinkPreferences } from "../hooks/useKinkPreferences";
import { useProfile } from "../hooks/useProfile";
import KinkChecklist from "../components/KinkChecklist";

function TopBarLite({ title, rightSlot }) {
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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{rightSlot}</div>
    </div>
  );
}

function SmallButton({ children, onClick, disabled, asLink, to, tone = "neutral" }) {
  const toneStyle =
    tone === "danger"
      ? {
          border: "1px solid rgba(255,80,80,0.25)",
          background: disabled ? "rgba(255,80,80,0.06)" : "rgba(255,80,80,0.10)",
        }
      : {
          border: "1px solid rgba(255,255,255,0.14)",
          background: disabled ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
        };

  const base = {
    padding: "8px 10px",
    borderRadius: 10,
    color: "#f3f3f7",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 700,
    opacity: disabled ? 0.55 : 1,
    ...toneStyle,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  if (asLink) {
    return (
      <Link to={to} style={base}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} style={base}>
      {children}
    </button>
  );
}

/**
 * mode:
 * - "onboarding": shows skip + marks onboarding_complete
 * - "edit": normal editor
 */
export default function KinkPreferencesScreen({ session, supabase, mode = "edit" }) {
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const { items, loading: loadingCat, error: catErr } = useKinkCatalogue({ supabase });
  const {
    prefsByItemId,
    loading: loadingPrefs,
    error: prefsErr,
    saveBulk,
  } = useKinkPreferences({ supabase, userId });

  const { profile, updateProfile } = useProfile({ supabase, userId });

  const [statusByItemId, setStatusByItemId] = useState({});
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [localOk, setLocalOk] = useState("");

  // Seed UI state from DB once we have prefs and catalogue
  useEffect(() => {
    if (!items?.length) return;
    const next = {};
    for (const item of items) {
      const pref = prefsByItemId.get(item.id);
      next[item.id] = pref?.status || "";
    }
    setStatusByItemId(next);
  }, [items, prefsByItemId]);

  const busy = loadingCat || loadingPrefs || saving;

  const selectedCount = useMemo(() => {
    let c = 0;
    for (const v of Object.values(statusByItemId || {})) {
      if (v === "into" || v === "curious" || v === "limit") c += 1;
    }
    return c;
  }, [statusByItemId]);

  async function handleSave() {
    setLocalErr("");
    setLocalOk("");
    setSaving(true);

    try {
      await saveBulk({ nextStatusByItemId: statusByItemId, notesByItemId: {} });

      // If we're onboarding, mark complete.
      if (mode === "onboarding") {
        await updateProfile({ onboarding_complete: true });
      }

      setLocalOk("Saved.");

      // Navigate out (onboarding -> scenes, edit -> profile)
      if (mode === "onboarding") navigate("/scenes", { replace: true });
      else navigate("/profile", { replace: true });
    } catch (e) {
      setLocalErr(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setLocalErr("");
    setLocalOk("");
    setSaving(true);

    try {
      await updateProfile({ onboarding_complete: true });
      navigate("/scenes", { replace: true });
    } catch (e) {
      setLocalErr(e?.message || "Could not skip.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <TopBarLite
        title={mode === "onboarding" ? "Quick preferences" : "Kink preferences"}
        rightSlot={
          <div style={{ display: "flex", gap: 8 }}>
            {mode !== "onboarding" ? (
              <SmallButton asLink to="/profile">
                Back
              </SmallButton>
            ) : (
              <SmallButton onClick={handleSkip} disabled={busy} tone="neutral">
                Skip for now
              </SmallButton>
            )}
            <SmallButton onClick={handleSave} disabled={busy} tone="neutral">
              {saving ? "Saving..." : "Save"}
            </SmallButton>
          </div>
        }
      />

      <div style={{ padding: 16, maxWidth: 920, margin: "0 auto" }}>
        {mode === "onboarding" ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
              fontSize: 13,
              opacity: 0.9,
              lineHeight: 1.4,
            }}
          >
            Mark each item as <b>Into</b>, <b>Curious</b>, or <b>Limit</b>. You can skip and complete this
            later from your Profile.
          </div>
        ) : null}

        {localErr || catErr || prefsErr ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              fontSize: 13,
            }}
          >
            {localErr || catErr || prefsErr}
          </div>
        ) : null}

        {localOk ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(120,255,170,0.25)",
              background: "rgba(120,255,170,0.08)",
              fontSize: 13,
            }}
          >
            {localOk}
          </div>
        ) : null}

        <div style={{ marginBottom: 10, opacity: 0.8, fontSize: 13 }}>
          Selected: <b>{selectedCount}</b>
          {mode === "edit" && profile?.onboarding_complete === false ? (
            <span style={{ marginLeft: 10, opacity: 0.8 }}>
              (Your onboarding is not marked complete yet.)
            </span>
          ) : null}
        </div>

        {busy && !items?.length ? (
          <div style={{ opacity: 0.8 }}>Loading...</div>
        ) : (
          <KinkChecklist
            items={items}
            statusByItemId={statusByItemId}
            onChangeStatus={(id, next) =>
              setStatusByItemId((prev) => ({
                ...(prev || {}),
                [id]: next,
              }))
            }
          />
        )}
      </div>
    </div>
  );
}
