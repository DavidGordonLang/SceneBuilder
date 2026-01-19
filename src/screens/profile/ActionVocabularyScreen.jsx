import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useActionPrimitivesCatalogue } from "../../hooks/useActionPrimitivesCatalogue";
import { useActionVocabulary } from "../../hooks/useActionVocabulary";

/**
 * Vocabulary Confirmation (Phase D scaffolding)
 * - Lists global Action Primitives (neutral)
 * - Lets user define their own display text per primitive (explicit text owned by user)
 * - Saves to action_vocabulary_user under strict RLS
 *
 * No partner filtering yet.
 * No AI.
 */
export default function ActionVocabularyScreen() {
  const [userId, setUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [search, setSearch] = useState("");
  const [localText, setLocalText] = useState({}); // { [primitiveId]: string }

  const {
    primitives,
    loading: loadingPrimitives,
    error: primitivesError,
    reload: reloadPrimitives,
  } = useActionPrimitivesCatalogue();

  const {
    rows: vocabRows,
    byPrimitiveId,
    loading: loadingVocab,
    error: vocabError,
    reload: reloadVocab,
    saveBulk,
  } = useActionVocabulary({ userId });

  // Get current user id (no assumptions about app-wide auth context)
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error) {
        setUserId(null);
        return;
      }
      setUserId(data?.user?.id || null);
    }

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Seed localText from saved vocab
  useEffect(() => {
    const next = {};
    for (const r of vocabRows || []) {
      if (r?.action_primitive_id && typeof r?.display_text === "string") {
        next[r.action_primitive_id] = r.display_text;
      }
    }
    setLocalText(next);
  }, [vocabRows]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return primitives;

    return (primitives || []).filter((p) => {
      const label = (p?.label || "").toLowerCase();
      const desc = (p?.description || "").toLowerCase();
      return label.includes(q) || desc.includes(q);
    });
  }, [primitives, search]);

  const mappedCount = useMemo(() => {
    let n = 0;
    for (const p of primitives || []) {
      const t = (localText[p.id] || "").trim();
      if (t) n += 1;
    }
    return n;
  }, [primitives, localText]);

  async function handleSave() {
    if (!userId) {
      setSaveMsg("You must be signed in to save vocabulary.");
      return;
    }

    setSaving(true);
    setSaveMsg("");

    try {
      await saveBulk({ displayTextByPrimitiveId: localText });
      setSaveMsg("Saved.");
      // keep it honest: reload primitives too in case catalogue updated
      await reloadPrimitives();
    } catch (e) {
      setSaveMsg(e?.message || "Save failed.");
    } finally {
      setSaving(false);
      // Clear message after a short time (non-blocking)
      setTimeout(() => setSaveMsg(""), 2500);
    }
  }

  function setDefault(primitiveId, fallbackLabel) {
    setLocalText((prev) => ({
      ...prev,
      [primitiveId]: (prev?.[primitiveId] || fallbackLabel || "").toString(),
    }));
  }

  function clearText(primitiveId) {
    setLocalText((prev) => {
      const next = { ...prev };
      next[primitiveId] = "";
      return next;
    });
  }

  const isLoading = loadingPrimitives || (userId ? loadingVocab : false);
  const error = primitivesError || vocabError;

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Action Vocabulary</h1>
        <p style={{ marginTop: 6, opacity: 0.8 }}>
          Define your own wording for each action. The system stores your text; later plans can render using your voice.
        </p>
      </div>

      {!userId && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            You’re not signed in. Sign in to create and save vocabulary mappings.
          </p>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions..."
            style={{ flex: "1 1 220px" }}
          />

          <div style={{ opacity: 0.8 }}>
            Mapped: <strong>{mappedCount}</strong> / {primitives?.length || 0}
          </div>

          <button onClick={handleSave} disabled={saving || isLoading || !userId}>
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={() => {
              reloadPrimitives();
              if (userId) reloadVocab();
            }}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>

        {saveMsg && <div style={{ marginTop: 10, opacity: 0.9 }}>{saveMsg}</div>}
        {error && <div style={{ marginTop: 10, color: "crimson" }}>{error}</div>}
        {isLoading && <div style={{ marginTop: 10, opacity: 0.7 }}>Loading…</div>}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {(filtered || []).map((p) => {
          const existing = byPrimitiveId.get(p.id);
          const val = localText[p.id] ?? "";
          const hasSaved = Boolean(existing?.display_text);

          return (
            <div className="card" key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.label}</div>
                  {p.description ? (
                    <div style={{ marginTop: 6, opacity: 0.8 }}>{p.description}</div>
                  ) : null}
                  <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                    Intensity: {p.intensity_min}–{p.intensity_max}
                    {p.safety_notes ? ` • Safety: ${p.safety_notes}` : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right", opacity: 0.8, fontSize: 12 }}>
                  {hasSaved ? "Saved" : "Not saved"}
                </div>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <textarea
                  value={val}
                  onChange={(e) =>
                    setLocalText((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  placeholder="Your wording for this action…"
                  rows={2}
                />

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setDefault(p.id, p.label)}>
                    Use label as default
                  </button>

                  <button type="button" onClick={() => clearText(p.id)}>
                    Clear
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
