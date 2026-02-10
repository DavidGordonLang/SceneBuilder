// src/hooks/useSignedAvatarUrl.js

import { useEffect, useState } from "react";
import { getCachedAvatarUrl, setCachedAvatarUrl } from "../lib/avatarSignedUrlCache";

export function useSignedAvatarUrl({ supabase, path }) {
  const [signedAvatarUrl, setSignedAvatarUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run(p) {
      if (!supabase) return;

      const cached = getCachedAvatarUrl(p);
      if (cached) {
        setSignedAvatarUrl(cached);
        return;
      }

      try {
        const ttl = 60 * 60;
        const { data, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(p, ttl);
        if (sErr) throw sErr;

        const nextUrl = data?.signedUrl || "";
        if (!cancelled) {
          if (nextUrl) {
            setSignedAvatarUrl(nextUrl);
            setCachedAvatarUrl(p, nextUrl, ttl);
          } else {
            setSignedAvatarUrl("");
          }
        }
      } catch {
        if (!cancelled) {
          const fallback = getCachedAvatarUrl(p);
          if (fallback) setSignedAvatarUrl(fallback);
          else setSignedAvatarUrl("");
        }
      }
    }

    const p = String(path || "").trim();
    if (!p) {
      setSignedAvatarUrl("");
      return () => {
        cancelled = true;
      };
    }

    run(p);

    return () => {
      cancelled = true;
    };
  }, [supabase, path]);

  return { signedAvatarUrl, setSignedAvatarUrl };
}