// app/admin/bookings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../src/lib/api";

type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

interface Booking {
  id: string;
  booking_number: string;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time: string;
  service_price: number;
  customer_notes?: string | null;
  created_at: string;

  customer_name?: string;
  provider_name?: string;
  service_title?: string;
}

export default function AdminBookingsPage() {
  const [all, setAll] = useState<Booking[]>([]);
  const [status, setStatus] = useState<"all" | BookingStatus>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (opts?: { silent?: boolean }) => {
    try {
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // Keep your endpoint as-is
      const res = await api.get("/bookings/me");
      const list: Booking[] = res.data.bookings ?? res.data ?? [];
      setAll(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to load bookings");
      setAll([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!q) return true;

      const hay = [
        b.booking_number,
        b.service_title,
        b.customer_name,
        b.provider_name,
        b.scheduled_date,
        b.scheduled_time,
        b.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [all, status, query]);

  const counts = useMemo(() => {
    const base = {
      all: all.length,
      pending: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };
    for (const b of all) base[b.status] += 1;
    return base;
  }, [all]);

  const updateStatus = async (id: string, next: BookingStatus) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status: next });
      await load({ silent: true });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to update status");
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Bookings</h1>
          <p style={styles.sub}>View and manage all bookings.</p>
        </div>

        <button
          onClick={() => load({ silent: true })}
          disabled={loading || refreshing}
          style={{
            ...styles.refreshBtn,
            opacity: loading || refreshing ? 0.65 : 1,
            cursor: loading || refreshing ? "not-allowed" : "pointer",
          }}
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Summary chips */}
      <div style={styles.chipsRow}>
        <SummaryChip label="All" value={counts.all} active={status === "all"} onClick={() => setStatus("all")} />
        <SummaryChip label="Pending" value={counts.pending} active={status === "pending"} onClick={() => setStatus("pending")} />
        <SummaryChip label="Accepted" value={counts.accepted} active={status === "accepted"} onClick={() => setStatus("accepted")} />
        <SummaryChip label="In progress" value={counts.in_progress} active={status === "in_progress"} onClick={() => setStatus("in_progress")} />
        <SummaryChip label="Completed" value={counts.completed} active={status === "completed"} onClick={() => setStatus("completed")} />
        <SummaryChip label="Cancelled" value={counts.cancelled} active={status === "cancelled"} onClick={() => setStatus("cancelled")} />
        <SummaryChip label="Rejected" value={counts.rejected} active={status === "rejected"} onClick={() => setStatus("rejected")} />
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <span style={{ opacity: 0.7 }}>🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search booking #, service, customer…"
            style={styles.searchInput}
          />
          {!!query && (
            <button onClick={() => setQuery("")} style={styles.clearBtn} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          style={styles.select}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading && <div style={styles.loading}>Loading bookings…</div>}

      {error && (
        <div style={styles.errorBox}>
          <div style={{ fontWeight: 900 }}>Something went wrong</div>
          <div style={{ marginTop: 6 }}>{error}</div>
        </div>
      )}

      {!loading && !error && (
        <div style={styles.card}>
          <div style={styles.tableTop}>
            <div style={styles.tableTitle}>
              Results <span style={styles.tableHint}>{filtered.length}</span>
            </div>
            <div style={styles.tableHint}>
              Tip: Use search to find booking numbers quickly
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table width="100%" cellPadding={0} cellSpacing={0} style={styles.table}>
              <thead>
                <tr>
                  <Th>Booking</Th>
                  <Th>Service</Th>
                  <Th>Customer</Th>
                  <Th>Provider</Th>
                  <Th>Date & Time</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} style={styles.tr}>
                    <Td>
                      <div style={{ fontWeight: 900, color: "#0F172A" }}>{b.booking_number}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                        Created: {new Date(b.created_at).toLocaleString()}
                      </div>
                    </Td>

                    <Td>
                      <div style={{ fontWeight: 800, color: "#0F172A" }}>{b.service_title ?? "-"}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                        Price: QAR {Number(b.service_price ?? 0).toFixed(2)}
                      </div>
                    </Td>

                    <Td>{b.customer_name ?? "-"}</Td>
                    <Td>{b.provider_name ?? "-"}</Td>

                    <Td>
                      <div style={{ fontWeight: 800, color: "#0F172A" }}>{b.scheduled_date}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{b.scheduled_time}</div>
                    </Td>

                    <Td>
                      <StatusBadge status={b.status} />
                    </Td>

                    <Td align="right">
                      <Actions booking={b} onAction={updateStatus} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div style={styles.empty}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>
                  No bookings found
                </div>
                <div style={{ marginTop: 6, color: "#64748B" }}>
                  Try clearing filters or searching with a different keyword.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Components ---------- */

function Actions({
  booking,
  onAction,
}: {
  booking: Booking;
  onAction: (id: string, s: BookingStatus) => void;
}) {
  if (booking.status === "pending") {
    return (
      <div style={styles.actionsRow}>
        <ActionBtn label="Accept" variant="primary" onClick={() => onAction(booking.id, "accepted")} />
        <ActionBtn label="Reject" variant="danger" onClick={() => onAction(booking.id, "rejected")} />
      </div>
    );
  }

  if (booking.status === "accepted") {
    return (
      <div style={styles.actionsRow}>
        <ActionBtn label="Start" variant="primary" onClick={() => onAction(booking.id, "in_progress")} />
      </div>
    );
  }

  if (booking.status === "in_progress") {
    return (
      <div style={styles.actionsRow}>
        <ActionBtn label="Complete" variant="primary" onClick={() => onAction(booking.id, "completed")} />
      </div>
    );
  }

  return <span style={{ color: "#94A3B8", fontWeight: 800 }}>—</span>;
}

function ActionBtn({
  label,
  onClick,
  variant,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "neutral";
}) {
  const v = variant ?? "neutral";

  const map = {
    primary: { bg: "#2F6BFF", border: "#2F6BFF", fg: "#FFFFFF" },
    danger: { bg: "#FEF2F2", border: "#FECACA", fg: "#B91C1C" },
    neutral: { bg: "#FFFFFF", border: "#E5E7EB", fg: "#0F172A" },
  }[v];

  return (
    <button onClick={onClick} style={{ ...styles.actionBtn, ...map }}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const theme: Record<BookingStatus, { bg: string; fg: string; bd: string }> = {
    pending: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
    accepted: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" },
    in_progress: { bg: "#F5F3FF", fg: "#6D28D9", bd: "#DDD6FE" },
    completed: { bg: "#ECFDF5", fg: "#047857", bd: "#A7F3D0" },
    cancelled: { bg: "#F1F5F9", fg: "#475569", bd: "#E2E8F0" },
    rejected: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
  };

  const t = theme[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: t.fg,
          opacity: 0.9,
        }}
      />
      {status.replace("_", " ")}
    </span>
  );
}

function SummaryChip({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.chip,
        background: active ? "#EEF2FF" : "#FFFFFF",
        borderColor: active ? "#E0E7FF" : "#E9ECF2",
        color: active ? "#0F172A" : "#334155",
      }}
    >
      <span style={{ fontWeight: 900 }}>{label}</span>
      <span style={styles.chipCount}>{value}</span>
    </button>
  );
}

/* ---------- Tiny helpers ---------- */

function Th({ children, align }: { children: any; align?: "left" | "right" | "center" }) {
  return (
    <th
      align={align ?? "left"}
      style={{
        padding: "12px 14px",
        fontSize: 12,
        fontWeight: 900,
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        background: "#F8FAFC",
        borderBottom: "1px solid #E9ECF2",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align }: { children: any; align?: "left" | "right" | "center" }) {
  return (
    <td
      align={align ?? "left"}
      style={{
        padding: "14px 14px",
        borderBottom: "1px solid #F1F5F9",
        verticalAlign: "top",
        color: "#0F172A",
        fontSize: 13,
      }}
    >
      {children}
    </td>
  );
}

/* ---------- Styles ---------- */

const styles: Record<string, React.CSSProperties> = {
  page: { display: "grid", gap: 14 },

  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  h1: { margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" },
  sub: { margin: "6px 0 0", fontSize: 13, color: "#64748B" },

  refreshBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #E9ECF2",
    background: "#FFFFFF",
    fontWeight: 900,
    color: "#0F172A",
  },

  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #E9ECF2",
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
  },
  chipCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    background: "#F1F5F9",
    border: "1px solid #E2E8F0",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 900,
    color: "#0F172A",
    padding: "0 8px",
  },

  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 2,
  },

  searchWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#FFFFFF",
    border: "1px solid #E9ECF2",
    borderRadius: 14,
    padding: "10px 12px",
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 13,
    color: "#0F172A",
    fontWeight: 700,
    background: "transparent",
  },
  clearBtn: {
    border: "none",
    background: "#F1F5F9",
    borderRadius: 10,
    padding: "6px 8px",
    cursor: "pointer",
    fontWeight: 900,
    color: "#334155",
  },

  select: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #E9ECF2",
    background: "#FFFFFF",
    fontWeight: 800,
    color: "#0F172A",
    minWidth: 180,
  },

  loading: {
    padding: 12,
    color: "#64748B",
    fontWeight: 800,
  },

  errorBox: {
    padding: 12,
    borderRadius: 14,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
  },

  card: {
    border: "1px solid #E9ECF2",
    borderRadius: 16,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(16,24,40,0.06)",
    overflow: "hidden",
  },

  tableTop: {
    padding: "12px 14px",
    borderBottom: "1px solid #E9ECF2",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tableTitle: { fontSize: 14, fontWeight: 900, color: "#0F172A" },
  tableHint: { fontSize: 12, color: "#64748B", fontWeight: 800 },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tr: {
    background: "#FFFFFF",
  },

  actionsRow: { display: "inline-flex", gap: 8 },

  actionBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    border: "1px solid #E5E7EB",
  },

  empty: {
    padding: 18,
    textAlign: "center",
  },
};
