import React from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { ScenesHome, ToolsHome, JournalHome } from "./routes.jsx";

const navStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(11,11,15,0.92)",
  backdropFilter: "blur(10px)",
};

const linkBase = {
  padding: "12px 10px",
  textAlign: "center",
  fontSize: 12,
  letterSpacing: 0.3,
};

function TabLink({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...linkBase,
        opacity: isActive ? 1 : 0.65,
        fontWeight: isActive ? 650 : 500,
      })}
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div style={{ paddingBottom: 56 }}>
      <Routes>
        <Route path="/" element={<Navigate to="/scenes" replace />} />
        <Route path="/scenes" element={<ScenesHome />} />
        <Route path="/tools" element={<ToolsHome />} />
        <Route path="/journal" element={<JournalHome />} />
        <Route path="*" element={<Navigate to="/scenes" replace />} />
      </Routes>

      <nav style={navStyle} aria-label="Primary">
        <TabLink to="/scenes" label="Scenes" />
        <TabLink to="/tools" label="Tools" />
        <TabLink to="/journal" label="Journal" />
      </nav>
    </div>
  );
}
