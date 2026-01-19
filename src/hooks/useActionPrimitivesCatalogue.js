import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchActiveActionPrimitives,
  fetchActionPrimitiveKinks,
  fetchActionPrimitiveRoles,
} from "../lib/actionPrimitivesApi";

/**
 * Loads:
 * - active action primitives
 * - kink tags (join table)
 * - role tags (join table)
 *
 * Returns both the raw lists and convenient maps:
 * - kinksByPrimitiveId: Map<primitiveId, Set<kinkItemId>>
 * - rolesByPrimitiveId: Map<primitiveId, Set<role>>
 */
export function useActionPrimitivesCatalogue({ supabase } = {}) {
  const [primitives, setPrimitives] = useState([]);
  const [kinkLinks, setKinkLinks] = useState([]);
  const [roleLinks, setRoleLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [p, k, r] = await Promise.all([
        fetchActiveActionPrimitives({ supabase }),
        fetchActionPrimitiveKinks({ supabase }),
        fetchActionPrimitiveRoles({ supabase }),
      ]);

      setPrimitives(Array.isArray(p) ? p : []);
      setKinkLinks(Array.isArray(k) ? k : []);
      setRoleLinks(Array.isArray(r) ? r : []);
    } catch (e) {
      setError(e?.message || "Failed to load action primitives.");
      setPrimitives([]);
      setKinkLinks([]);
      setRoleLinks([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  const kinksByPrimitiveId = useMemo(() => {
    const map = new Map();
    for (const row of kinkLinks) {
      const pid = row?.action_primitive_id;
      const kid = row?.kink_item_id;
      if (!pid || !kid) continue;

      if (!map.has(pid)) map.set(pid, new Set());
      map.get(pid).add(kid);
    }
    return map;
  }, [kinkLinks]);

  const rolesByPrimitiveId = useMemo(() => {
    const map = new Map();
    for (const row of roleLinks) {
      const pid = row?.action_primitive_id;
      const role = row?.role;
      if (!pid || !role) continue;

      if (!map.has(pid)) map.set(pid, new Set());
      map.get(pid).add(role);
    }
    return map;
  }, [roleLinks]);

  return {
    primitives,
    kinkLinks,
    roleLinks,
    kinksByPrimitiveId,
    rolesByPrimitiveId,
    loading,
    error,
    reload,
  };
}
