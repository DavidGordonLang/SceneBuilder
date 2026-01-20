import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar, Card, SmallButton } from "../components/routesUi";
import { useKinkCatalogue } from "../hooks/useKinkCatalogue";
import { useKinkPreferences } from "../hooks/useKinkPreferences";
import { useProfile } from "../hooks/useProfile";
import KinkChecklist from "../components/KinkChecklist";

/**
 * mode:
 * - "onboarding": shows skip + marks onboarding_complete
 * - "edit": normal editor
 */
export default function KinkPreferencesScreen({ session, supabase, mode = "edit" }) {
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const { items, loading: loadingCat, error: catErr } = useKinkCatalogue({ supabase });
  const { prefsByItemId, loading: loadingPrefs, error: prefsErr, saveBulk } = useKinkPreferences({
    supabase,
    userId,
  });

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

      if (mode === "onboarding") {
        await updateProfile({ onboarding_complete: true });
      }

      setLocalOk("Saved.");

      if (mode === "onboarding") navigate("/scenes", { replace: true });
      else navigate("/settings", { replace: true });
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

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <TopBar
        title={mode === "onboarding" ? "Quick preferences" : "Kink preferences"}
        onSignOut={signOut}
        showBack={mode !== "onboarding"}
        backTo={mode !== "onboarding" ? "/settings" : undefined}
        rightSlot={
          <div style={{ display: "flex", gap: 8 }}>
            {mode === "onboarding" ? (
              <SmallButton onClick={handleSkip} disabled={busy} title="Skip for now">
                Skip
              </SmallButton>
            ) : null}

            <SmallButton onClick={handleSave} disabled={busy} title="Save preferences">
              {saving ? "Saving..." : "Save"}
            </SmallButton>
          </div>
        }
      />

      <div style={{ padding: 16, maxWidth: 920, margin: "0 auto" }}>
        {mode === "onboarding" ? (
          <Card>
            <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.4 }}>
              Mark each item as <b>Into</b>, <b>Curious</b>, or <b>Limit</b>. You can skip and complete
              this later from Settings.
            </div>
          </Card>
        ) : null}

        {localErr || catErr || prefsErr ? (
          <div
            style={{
              marginTop: 12,
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
