import React from "react";

function Field({ label, children, hint }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 12, opacity: 0.55, lineHeight: 1.3 }}>{hint}</div> : null}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
      }}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#f3f3f7",
        outline: "none",
        fontSize: 14,
        resize: "vertical",
        minHeight: 80,
      }}
    />
  );
}

function SkeletonText({ width = "70%", height = 12 }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 999,
        background: "rgba(255,255,255,0.07)",
      }}
    />
  );
}

export default function ProfileDetailsCard({
  editing,
  profile,
  showSkeleton,

  username,
  setUsername,

  displayName,
  setDisplayName,

  bio,
  setBio,
}) {
  if (editing) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Username" hint="Letters A–Z, a–z, 0–9, underscore. Unique. Used for search.">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. David_01"
            maxLength={24}
          />
        </Field>

        <Field label="Display name">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. David"
            maxLength={120}
          />
        </Field>

        <Field label="Short bio" hint={`${(bio || "").length}/140`}>
          <TextArea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Optional. Max 140 characters."
            maxLength={140}
          />
        </Field>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10, opacity: 0.9 }}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Username</div>
        {showSkeleton ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <SkeletonText width="45%" />
          </div>
        ) : (
          <div style={{ marginTop: 4 }}>{profile?.username || "—"}</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Display name</div>
        {showSkeleton ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <SkeletonText width="55%" />
          </div>
        ) : (
          <div style={{ marginTop: 4 }}>{profile?.display_name || "—"}</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>Bio</div>
        {showSkeleton ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <SkeletonText width="88%" height={10} />
            <SkeletonText width="76%" height={10} />
          </div>
        ) : (
          <div style={{ marginTop: 4, opacity: 0.9 }}>{profile?.bio || "—"}</div>
        )}
      </div>
    </div>
  );
}