import React, { useEffect, useMemo, useState } from "react";
import { TopBar, Card, TextInput, TextArea, SmallButton, Chip } from "../../components/routesUi";
import { useActionPrimitivesCatalogue } from "../../hooks/useActionPrimitivesCatalogue";
import { useActionVocabulary } from "../../hooks/useActionVocabulary";
import { useToast } from "../../ui/ToastContext";

export default function ActionVocabularyScreen({ session, supabase }) {
  const { showToast } = useToast();
  const userId = session?.user?.id;

  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({}); // per-row local text
  const [savingId, setSavingId] = useState(null);

  const { primitives } = useActionPrimitivesCatalogue();
  const { rows, byPrimitiveId, reload, saveBulk } = useActionVocabulary({ userId });

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
      const draft = drafts[p.id] || "";
      return [p.label, p.description, saved, draft].some((v) => normalise(v).includes(q));
    });
  }, [search, primitives, drafts, byPrimitiveId]);

  async function saveOne(primitiveId) {
    const text = (drafts[primitiveId] || "").trim();
    if (!text) return;

    setSavingId(primitiveId);
    try {
      await saveBulk({
        displayTextByPrimitiveId: { [primitiveId]: text },
      });
      await reload();
      showToast("Saved");
    } finally {
      setSavingId(null);
    }
  }

  function skipOne(primitiveId) {
    const saved = byPrimitiveId.get(primitiveId)?.display_text || "";
    setDrafts((d) => ({ ...d, [primitiveId]: saved }));
    showToast("Skipped");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div>
      <TopBar title="Action Vocabulary" onSignOut={signOut} showBack backTo="/settings" />

      <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <div style={{ opacity: 0.85, lineHeight: 1.4 }}>
          Tell SceneBuilder how you want each type of action to be worded when it appears in your plans.
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Write it like you’d say it in real life. Be specific.
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Card>
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder="Search action titles, descriptions, or your wording…"
            />
          </Card>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {(filtered || []).map((p) => {
            const val = drafts[p.id] || "";
            const savedRow = byPrimitiveId.get(p.id);
            const savedText = savedRow?.display_text || "";
            const isSaved = Boolean(savedRow);
            const dirty = normalise(val) !== normalise(savedText);
            const showSaved = isSaved && !dirty;

            return (
              <Card key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 750 }}>{p.label}</div>
                  {showSaved ? <Chip>Saved</Chip> : null}
                </div>

                {p.description ? (
                  <div style={{ opacity: 0.75, marginTop: 6, fontSize: 13 }}>{p.description}</div>
                ) : null}

                <div style={{ marginTop: 10 }}>
                  <TextArea
                    rows={2}
                    placeholder="Your wording for this action…"
                    value={val}
                    onChange={(next) => setDrafts((d) => ({ ...d, [p.id]: next }))}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
                  <SmallButton
                    onClick={() => saveOne(p.id)}
                    disabled={savingId === p.id || !val.trim() || showSaved}
                    title={showSaved ? "Already saved" : "Save this wording"}
                  >
                    {savingId === p.id ? "Saving…" : "Save"}
                  </SmallButton>

                  <SmallButton onClick={() => skipOne(p.id)} disabled={savingId === p.id} title="Revert to saved">
                    Skip
                  </SmallButton>

                  {dirty ? (
                    <div style={{ fontSize: 12, opacity: 0.65, marginLeft: "auto" }}>Unsaved changes</div>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.55, marginLeft: "auto" }}> </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}
