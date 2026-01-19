import { useCallback, useEffect, useState } from "react";

export function useKinkCatalogue({ supabase }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");

    try {
      const { data, error: qErr } = await supabase
        .from("kink_items_global")
        .select("id, category, label, sort_order, is_active")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });

      if (qErr) throw qErr;
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load kink catalogue.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, error, reload };
}
