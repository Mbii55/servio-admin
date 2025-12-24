// app/admin/providers/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "../../../src/lib/api";

type ProviderRow = {
  id: string;
  business_name: string;
  is_active: boolean;
  city: string | null;
  country: string | null;
  created_at: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export default function AdminProvidersPage() {
  const [items, setItems] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await api.get("/businessProfiles/admin");
      setItems(res.data.providers);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (bpId: string, next: boolean) => {
    await api.patch(`/businessProfiles/admin/${bpId}/active`, { is_active: next });
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Providers</h1>
      <p style={{ color: "#6B7280", marginTop: 6 }}>
        Review provider business profiles.
      </p>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "#B91C1C", marginTop: 12 }}>{err}</div>}

      {!loading && !err && (
        <div style={{ marginTop: 16, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
          <table width="100%" cellPadding={12}>
            <thead style={{ background: "#F9FAFB" }}>
              <tr>
                <th align="left">Business</th>
                <th align="left">Owner</th>
                <th align="left">Email</th>
                <th align="left">Location</th>
                <th align="left">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                  <td>{p.business_name}</td>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.email}</td>
                  <td>{[p.city, p.country].filter(Boolean).join(", ") || "-"}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        color: "white",
                        background: p.is_active ? "#16A34A" : "#6B7280",
                      }}
                    >
                      {p.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td align="right">
                    <button
                      onClick={() => toggleActive(p.id, !p.is_active)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #E5E7EB",
                        background: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div style={{ padding: 12, color: "#6B7280" }}>No providers found.</div>
          )}
        </div>
      )}
    </div>
  );
}
