import React, { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, { duration = 1800 } = {}) => {
    setToast({ message });
    setTimeout(() => setToast(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,20,28,0.92)",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
            opacity: 0.95,
            backdropFilter: "blur(8px)",
            transition: "opacity 0.25s ease",
            zIndex: 1000,
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
