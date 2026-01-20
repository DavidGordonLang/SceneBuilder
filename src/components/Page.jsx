import React from "react";

/**
 * Page
 * Simple, reusable content wrapper to standardise padding + max width across screens.
 * Keeps the app calmer to navigate without changing any behaviour.
 */
export default function Page({ children, style, maxWidth = 980 }) {
  return (
    <div
      style={{
        padding: 16,
        maxWidth,
        margin: "0 auto",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
