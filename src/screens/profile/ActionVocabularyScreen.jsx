import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useActionPrimitivesCatalogue } from "../../hooks/useActionPrimitivesCatalogue";
import { useActionVocabulary } from "../../hooks/useActionVocabulary";
import { useToast } from "../../ui/ToastContext";

export default function ActionVocabularyScreen() {
  const { showToast } = useToast();
  const [userId, setUserId] = useState(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({}); // per-row local text
  const [savingId, setSavingId] = useState(null);

  const { primitives } = useActionPrimitivesCatalogue();
  const { rows, byPrimitiveId, reload, saveBulk } = useActionVocabulary({ userId });

  // auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || null);
    });
  }, []);

  // seed drafts from saved values
  useEffect(() => {
    const next = {};
    for (const r of rows || []) {
      next[r.action_primitive_id] = r.display_text;
    }
    setDrafts(next);
  }, [rows]);

  function normalise(str) {
    return (str || "")
      .toLowerCase()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const filtered = useMemo(() => {
    const q = normalise(search);
    if (!q) return primitives;

    return (primitives || []).filter((p) => {
      const saved = byPrimitiveId.get(p.id)?.display_text || "";
      return [
        p.label,
        p.description,
        saved,
        drafts[p.id],
      ].some((v) => normalise(v).includes(q));
    });
  }, [search, primitives, drafts, byPrimitiveId]);

  async function saveOne(primitiveId) {
    const text = (drafts[primitiveId] || "").trim();
    if (!text) return;

    setSavingId(primitiveId);
    await saveBulk({
      displayTextByPrimitiveId: { [primitiveId]: text },
    });
    await reload();
    setSavingId(null);
    showToast("Saved");
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <h1>Action Vocabulary</h1>
        <p style={{ opacity: 0.8 }}>
          For each type of action, write the exact wording you want SceneBuilder to use in your plans.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Search actions or your wording…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {(filtered || []).map((p) => {
          const val = drafts[p.id] || "";
          const isSaved = Boolean(byPrimitiveId.get(p.id));

          return (
            <div className="card" key={p.id}>
              <div style={{ fontWeight: 650 }}>{p.label}</div>
              {p.description && (
                <div style={{ opacity: 0.75, marginTop: 4 }}>{p.description}</div>
              )}

              <textarea
                rows={2}
                placeholder="Your wording for this action…"
                value={val}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                }
                style={{ marginTop: 8 }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  onClick={() => saveOne(p.id)}
                  disabled={savingId === p.id || !val.trim()}
                >
                  {savingId === p.id ? "Saving…" : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDrafts((d) => ({ ...d, [p.id]: byPrimitiveId.get(p.id)?.display_text || "" }))
                  }
                >
                  Skip
                </button>

                {isSaved && (
                  <div style={{ fontSize: 12, opacity: 0.6, marginLeft: "auto" }}>
                    Saved
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
