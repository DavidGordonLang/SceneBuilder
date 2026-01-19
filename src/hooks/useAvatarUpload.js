import { useCallback, useState } from "react";

/**
 * Upload avatar to Supabase Storage (private bucket: avatars)
 * MUST use path convention verbatim:
 *   avatars/<user_id>/avatar.jpg
 */
export function useAvatarUpload({ supabase, userId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadAvatar = useCallback(
    async (file) => {
      if (!supabase || !userId) throw new Error("Not signed in.");
      if (!file) throw new Error("No file selected.");

      setUploading(true);
      setError("");

      try {
        const path = `avatars/${userId}/avatar.jpg`;

        // Overwrite existing avatar.jpg
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type || "image/jpeg",
        });

        if (upErr) throw upErr;

        return path;
      } catch (e) {
        const msg = e?.message || "Avatar upload failed.";
        setError(msg);
        throw new Error(msg);
      } finally {
        setUploading(false);
      }
    },
    [supabase, userId]
  );

  return { uploadAvatar, uploading, error };
}
