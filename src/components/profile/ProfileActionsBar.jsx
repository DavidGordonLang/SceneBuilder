import React from "react";

export default function ProfileActionsBar({
  SmallButton,
  editing,
  busy,
  busySave,
  onStartEdit,
  onCancelEdit,
  onSave,
  onSignOut,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {!editing ? (
          <SmallButton onClick={onStartEdit} disabled={busy} title="Edit profile">
            Edit
          </SmallButton>
        ) : (
          <>
            <SmallButton onClick={onCancelEdit} disabled={busy} title="Cancel editing">
              Cancel
            </SmallButton>
            <SmallButton onClick={onSave} disabled={busy} title="Save changes">
              {busySave ? "Saving..." : "Save"}
            </SmallButton>
          </>
        )}
      </div>

      <SmallButton tone="danger" onClick={onSignOut} title="Sign out">
        Sign out
      </SmallButton>
    </div>
  );
}