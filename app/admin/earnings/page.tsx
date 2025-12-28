// app/admin/earnings/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { api } from "../../../src/lib/api";
import { useAuth } from "../../../src/context/AuthContext";

type Summary = {
  total_commission: number;
  total_provider_payout: number;
  total_revenue: number;
  total_bookings: number;
  average_commission_rate: number;
};

type ByProvider = {
  provider_id: string;
  provider_name: string;
  provider_email?: string;
  total_amount: number;
  total_commission: number;
  total_net: number;
  booking_count: number;
  commission_rate: number;
};

type TimePeriod = "today" | "week" | "month" | "quarter" | "year" | "custom";

export default function AdminEarningsPage() {
  const { isAdmin } = useAuth();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ByProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Month is default selected already
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ✅ Remove summary toggle: always details
  const [viewType] = useState<"details">("details");

  const [sortBy, setSortBy] = useState<keyof ByProvider>("total_amount");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const getDefaultDates = useCallback((period: TimePeriod) => {
    const today = new Date();
    const start = new Date();

    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        return {
          from: start.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        };
      case "week":
        start.setDate(today.getDate() - 7);
        return {
          from: start.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        };
      case "month":
        start.setMonth(today.getMonth() - 1);
        return {
          from: start.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        };
      case "quarter":
        start.setMonth(today.getMonth() - 3);
        return {
          from: start.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        };
      case "year":
        start.setFullYear(today.getFullYear() - 1);
        return {
          from: start.toISOString().split("T")[0],
          to: today.toISOString().split("T")[0],
        };
      default:
        return { from: "", to: "" };
    }
  }, []);

  const loadEarnings = useCallback(
    async (opts?: { overrideFrom?: string; overrideTo?: string }) => {
      if (!isAdmin) return;

      try {
        setLoading(true);
        setError(null);

        const from = opts?.overrideFrom ?? fromDate;
        const to = opts?.overrideTo ?? toDate;

        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);

        const res = await api.get(`/earnings/admin/overview?${params.toString()}`);

        setSummary({
          total_commission: res.data.summary?.total_commission || 0,
          total_provider_payout: res.data.summary?.total_provider_payout || 0,
          total_revenue: res.data.summary?.total_revenue || 0,
          total_bookings: res.data.summary?.total_bookings || 0,
          average_commission_rate: res.data.summary?.average_commission_rate || 0,
        });

        setRows(res.data.byProvider || []);
      } catch (err: any) {
        console.error("Failed to load earnings:", err);
        setError(err?.response?.data?.error || err?.message || "Failed to load earnings");
        setSummary(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, fromDate, toDate]
  );

  // Initial load
  useEffect(() => {
    if (!isAdmin) return;

    const defaults = getDefaultDates("month");
    setFromDate(defaults.from);
    setToDate(defaults.to);
    loadEarnings({ overrideFrom: defaults.from, overrideTo: defaults.to });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Period changes
  useEffect(() => {
    if (!isAdmin) return;

    if (timePeriod !== "custom") {
      const defaults = getDefaultDates(timePeriod);
      setFromDate(defaults.from);
      setToDate(defaults.to);
      loadEarnings({ overrideFrom: defaults.from, overrideTo: defaults.to });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriod, isAdmin, getDefaultDates]);

  // Custom date changes
  useEffect(() => {
    if (!isAdmin) return;
    if (timePeriod !== "custom") return;
    if (!fromDate || !toDate) return;

    loadEarnings();
  }, [isAdmin, timePeriod, fromDate, toDate, loadEarnings]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[sortBy] as any;
      const bValue = b[sortBy] as any;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      }
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "desc" ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
      }
      return 0;
    });
  }, [rows, sortBy, sortOrder]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        total_amount: acc.total_amount + (row.total_amount || 0),
        total_commission: acc.total_commission + (row.total_commission || 0),
        total_net: acc.total_net + (row.total_net || 0),
        booking_count: acc.booking_count + (row.booking_count || 0),
      }),
      { total_amount: 0, total_commission: 0, total_net: 0, booking_count: 0 }
    );
  }, [rows]);

  const completedBookingsCount = totals.booking_count;

  const handleSort = (column: keyof ByProvider) => {
    if (sortBy === column) setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const formatCurrency = (amount: number) => `QAR ${amount.toFixed(2)}`;
  const formatNumber = (num: number) => new Intl.NumberFormat("en-US").format(num || 0);

  if (!isAdmin) return null;

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Gross Booking Value"
          value={formatCurrency(summary?.total_revenue || 0)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(summary?.total_commission || 0)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          subtitle={`${(summary?.average_commission_rate ?? 0).toFixed(1)}% avg rate`}
        />
        <StatCard
          title="Provider Payouts"
          value={formatCurrency(summary?.total_provider_payout || 0)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          subtitle="Total paid"
        />
        <StatCard
          title="Completed Bookings"
          value={formatNumber(completedBookingsCount)}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          subtitle="Transactions"
        />
      </div>

      {/* Filters */}
      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          {/* Time Period Buttons */}
          <div style={styles.periodButtons}>
            {(["today", "week", "month", "quarter", "year", "custom"] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={timePeriod === period ? styles.periodButtonActive : styles.periodButton}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {timePeriod === "custom" && (
            <>
              <div style={styles.filterItem}>
                <label style={styles.filterLabel}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.filterItem}>
                <label style={styles.filterLabel}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </>
          )}

          {/* ✅ Removed Summary toggle — only Details remains */}
          <div style={styles.viewToggle}>
            <button
              type="button"
              style={{
                ...styles.viewButton,
                ...styles.viewButtonActive,
              }}
              aria-pressed="true"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 2h12v12H2V2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M2 6h12M6 2v12" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Details
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadEarnings()}
            disabled={loading}
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.5 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: loading ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.3s ease",
              }}
            >
              <path
                d="M4 2v6h6M16 18v-6h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16.91 8A8 8 0 103.04 12.91"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorAlert}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#FEE2E2" />
            <path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <p>Loading earnings data...</p>
        </div>
      )}

      {/* Provider Details Table */}
      {!loading && !error && viewType === "details" && (
        <div style={styles.tableContainer}>
          <div style={styles.tableHeader}>
            <div>
              <h3 style={styles.tableTitle}>Provider Earnings Breakdown</h3>
              <p style={styles.tableSubtitle}>
                {rows.length} providers • {formatCurrency(totals.total_amount)} total gross
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIconContainer}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <path
                    d="M32 56a24 24 0 100-48 24 24 0 000 48z"
                    stroke="#D1D5DB"
                    strokeWidth="3"
                  />
                  <path
                    d="M32 20v16l8 4"
                    stroke="#D1D5DB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 style={styles.emptyTitle}>No earnings data</h3>
              <p style={styles.emptyText}>No earnings found for the selected period</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      <button onClick={() => handleSort("provider_name")} style={styles.sortBtn}>
                        Provider
                        <SortIcon sorted={sortBy === "provider_name"} order={sortOrder} />
                      </button>
                    </th>
                    <th style={styles.thRight}>
                      <button
                        onClick={() => handleSort("total_amount")}
                        style={{ ...styles.sortBtn, marginLeft: "auto" }}
                      >
                        Gross Revenue
                        <SortIcon sorted={sortBy === "total_amount"} order={sortOrder} />
                      </button>
                    </th>
                    <th style={styles.thRight}>
                      <button
                        onClick={() => handleSort("total_commission")}
                        style={{ ...styles.sortBtn, marginLeft: "auto" }}
                      >
                        Platform Revenue
                        <SortIcon sorted={sortBy === "total_commission"} order={sortOrder} />
                      </button>
                    </th>
                    <th style={styles.thRight}>
                      <button
                        onClick={() => handleSort("commission_rate")}
                        style={{ ...styles.sortBtn, marginLeft: "auto" }}
                      >
                        Rate
                        <SortIcon sorted={sortBy === "commission_rate"} order={sortOrder} />
                      </button>
                    </th>
                    <th style={styles.thRight}>
                      <button
                        onClick={() => handleSort("total_net")}
                        style={{ ...styles.sortBtn, marginLeft: "auto" }}
                      >
                        Provider Net
                        <SortIcon sorted={sortBy === "total_net"} order={sortOrder} />
                      </button>
                    </th>
                    <th style={styles.thRight}>
                      <button
                        onClick={() => handleSort("booking_count")}
                        style={{ ...styles.sortBtn, marginLeft: "auto" }}
                      >
                        Bookings
                        <SortIcon sorted={sortBy === "booking_count"} order={sortOrder} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => {
                    const commissionPct =
                      row.total_amount > 0 ? (row.total_commission / row.total_amount) * 100 : 0;
                    const safeRate = Number.isFinite(row.commission_rate) ? row.commission_rate : 0;

                    return (
                      <tr key={row.provider_id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.providerName}>{row.provider_name}</div>
                          {row.provider_email && <div style={styles.providerEmail}>{row.provider_email}</div>}
                        </td>
                        <td style={styles.tdRight}>
                          <div style={styles.grossAmount}>{formatCurrency(row.total_amount)}</div>
                        </td>
                        <td style={styles.tdRight}>
                          <div style={styles.commissionAmount}>{formatCurrency(row.total_commission)}</div>
                          <div style={styles.commissionPct}>{commissionPct.toFixed(1)}%</div>
                        </td>
                        <td style={styles.tdRight}>
                          <span style={styles.rateBadge}>{safeRate.toFixed(1)}%</span>
                        </td>
                        <td style={styles.tdRight}>
                          <div style={styles.netAmount}>{formatCurrency(row.total_net)}</div>
                        </td>
                        <td style={styles.tdRight}>
                          <div style={styles.bookingCount}>{row.booking_count}</div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr style={styles.totalsRow}>
                    <td style={styles.totalsLabel}>Totals</td>
                    <td style={styles.totalsValue}>{formatCurrency(totals.total_amount)}</td>
                    <td style={styles.totalsValue}>{formatCurrency(totals.total_commission)}</td>
                    <td style={styles.tdRight}>
                      <span style={styles.totalRateBadge}>
                        {(summary?.average_commission_rate ?? 0).toFixed(1)}%
                      </span>
                    </td>
                    <td style={styles.totalsValue}>{formatCurrency(totals.total_net)}</td>
                    <td style={styles.totalsValue}>{completedBookingsCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ----------------------------- Components ----------------------------- */

function StatCard({
  title,
  value,
  icon,
  gradient,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: gradient }}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
      {subtitle && <div style={styles.statSubtitle}>{subtitle}</div>}
    </div>
  );
}

function SortIcon({ sorted, order }: { sorted: boolean; order: "asc" | "desc" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: sorted ? 1 : 0.3 }}>
      <path
        d="M7 3v8M4 8l3 3 3-3"
        stroke={sorted ? "#3B82F6" : "#9CA3AF"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: sorted && order === "asc" ? "rotate(180deg)" : "none",
          transformOrigin: "center",
        }}
      />
    </svg>
  );
}


/* ----------------------------- Styles ----------------------------- */

const styles: Record<string, React.CSSProperties> = {
  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginBottom: 32,
  },
  statCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    border: "1px solid #F3F4F6",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: "-0.02em",
  },
  statTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  statSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Filters
  filterPanel: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto auto",
    gap: 16,
    alignItems: "end",
  },
  periodButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
periodButton: {
  padding: "10px 16px",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "#E5E7EB",
  background: "#FFFFFF",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: "700",
  color: "#374151",
  cursor: "pointer",
  transition: "all 0.2s ease",
},
periodButtonActive: {
  padding: "10px 16px",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "#3B82F6",
  background: "#EFF6FF",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: "700",
  color: "#2563EB",
  cursor: "pointer",
  transition: "all 0.2s ease",
},
  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  dateInput: {
    height: 48,
    padding: "0 14px",
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "600",
    outline: "none",
    background: "#FFFFFF",
  },
  viewToggle: {
    display: "flex",
    gap: 0,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  viewButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    border: "none",
    background: "#FFFFFF",
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  viewButtonActive: {
    background: "#3B82F6",
    color: "#FFFFFF",
  },
  refreshButton: {
    height: 48,
    padding: "0 20px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },

  // Error Alert
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 16,
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    borderRadius: 12,
    color: "#991B1B",
    marginBottom: 24,
    fontSize: 14,
    fontWeight: "600",
  },

  // Loading State
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    background: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #F3F4F6",
    gap: 16,
    color: "#6B7280",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #E5E7EB",
    borderTopColor: "#3B82F6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  // Empty State
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: "#6B7280",
  },

  // Table
  tableContainer: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
  },
  tableHeader: {
    padding: 20,
    borderBottom: "1px solid #F3F4F6",
  },
  tableTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  tableSubtitle: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#6B7280",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 900,
  },
  th: {
    padding: "16px 20px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: "#F9FAFB",
    borderBottom: "2px solid #E5E7EB",
  },
  thRight: {
    padding: "16px 20px",
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: "#F9FAFB",
    borderBottom: "2px solid #E5E7EB",
  },
  sortBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: 0,
    font: "inherit",
    color: "inherit",
    fontWeight: "inherit",
  },
  tr: {
    borderTop: "1px solid #F3F4F6",
    transition: "background 0.2s ease",
  },
  td: {
    padding: 20,
    fontSize: 14,
    verticalAlign: "top",
  },
  tdRight: {
    padding: 20,
    fontSize: 14,
    verticalAlign: "top",
    textAlign: "right",
  },

  // Table Content
  providerName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  providerEmail: {
    fontSize: 12,
    color: "#6B7280",
  },
  grossAmount: {
    fontWeight: "700",
    color: "#111827",
  },
  commissionAmount: {
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 4,
  },
  commissionPct: {
    fontSize: 12,
    color: "#6B7280",
  },
  rateBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 8,
    background: "#ECFDF5",
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  netAmount: {
    fontWeight: "700",
    color: "#8B5CF6",
  },
  bookingCount: {
    fontWeight: "600",
    color: "#111827",
  },

  // Totals Row
  totalsRow: {
    borderTop: "2px solid #E5E7EB",
    background: "#F9FAFB",
  },
  totalsLabel: {
    padding: 20,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  totalsValue: {
    padding: 20,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    textAlign: "right",
  },
  totalRateBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 8,
    background: "#D1FAE5",
    color: "#065F46",
    fontSize: 12,
    fontWeight: "700",
  },
};

// Add animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  input:focus, select:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  tr:hover {
    background: #F9FAFB !important;
  }
`;
document.head.appendChild(styleSheet);