// app/admin/earnings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "../../../src/lib/api";

type Summary = {
  total_commission: number;
  total_provider_payout: number;
};

type ByProvider = {
  provider_id: string;
  provider_name: string;
  total_amount: number;
  total_commission: number;
  total_net: number;
};

export default function AdminEarningsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ByProvider[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setErr(null);

      const res = await api.get("/earnings/admin/overview", {
        params: { from: from || undefined, to: to || undefined },
      });

      setSummary(res.data.summary);
      setRows(res.data.byProvider);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Earnings</h1>
      <p style={{ color: "#6B7280", marginTop: 6 }}>
        Platform commission & provider payouts.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button onClick={load}>Apply</button>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: "#B91C1C" }}>{err}</div>}

      {!loading && !err && summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginTop: 12 }}>
            <Stat title="Total Commission" value={summary.total_commission} />
            <Stat title="Provider Payouts" value={summary.total_provider_payout} />
          </div>

          <div style={{ marginTop: 16, border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden" }}>
            <table width="100%" cellPadding={12}>
              <thead style={{ background: "#F9FAFB" }}>
                <tr>
                  <th align="left">Provider</th>
                  <th align="right">Gross</th>
                  <th align="right">Commission</th>
                  <th align="right">Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.provider_id} style={{ borderTop: "1px solid #E5E7EB" }}>
                    <td>{r.provider_name}</td>
                    <td align="right">{r.total_amount.toFixed(2)}</td>
                    <td align="right">{r.total_commission.toFixed(2)}</td>
                    <td align="right">{r.total_net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 14 }}>
      <div style={{ color: "#6B7280", fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 900 }}>{value.toFixed(2)}</div>
    </div>
  );
}
