import React, { useMemo } from "react";
import SegmentedControl from "./SegmentedControl";

const STATUS_OPTIONS = [
  { value: "", label: "—" },
  { value: "into", label: "Into" },
  { value: "curious", label: "Curious" },
  { value: "limit", label: "Limit" },
];

function Card({ children }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * items: array from kink_items_global
 * statusByItemId: object map { [kink_item_id]: "into"|"curious"|"limit"|"" }
 * onChangeStatus: (kink_item_id, nextStatus) => void
 */
export default function KinkChecklist({ items, statusByItemId, onChangeStatus }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items || []) {
      const cat = item.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(item);
    }
    return Array.from(map.entries()).map(([category, rows]) => ({
      category,
      rows,
    }));
  }, [items]);

  if (!items || items.length === 0) {
    return <div style={{ opacity: 0.7, fontSize: 13 }}>No items found.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {grouped.map(({ category, rows }) => (
        <Card key={category}>
          <div style={{ fontWeight: 850, marginBottom: 10 }}>{category}</div>

          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((item) => {
              const current = statusByItemId?.[item.id] ?? "";
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.label}
                    </div>
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    <SegmentedControl
                      value={current}
                      onChange={(v) => onChangeStatus(item.id, v)}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
