import React from "react";

export default function ProfileAlerts({ error, localErr, localOk }) {
  return (
    <>
      {error || localErr ? (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(255,80,80,0.35)",
            background: "rgba(255,80,80,0.10)",
            fontSize: 13,
          }}
        >
          {localErr || error}
        </div>
      ) : null}

      {localOk ? (
        <div
          style={{
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
    </>
  );
}