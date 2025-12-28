// app/admin/bookings/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../../src/lib/api";
import { useAuth } from "../../../src/context/AuthContext";

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
  updated_at: string;
  
  // These will now come from backend
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  provider_name?: string;
  provider_email?: string;
  provider_phone?: string;
  service_title?: string;
  service_description?: string;
  category_name?: string;
  payment_status?: string;
  payment_method?: string;
  transaction_id?: string;  
  service_images?: any;
}

type TimePeriod = "today" | "week" | "month" | "quarter" | "year" | "custom";

export default function AdminBookingsPage() {
  const { isAdmin } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | BookingStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const toISODate = (d: Date) => d.toISOString().split("T")[0];
  const parseISODateLocal = (iso: string) => {
    const [y, m, d] = iso.split("-").map((x) => Number(x));
    if (!y || !m || !d) return new Date(NaN);
    return new Date(y, m - 1, d);
  };

  const getDefaultDates = useCallback((period: TimePeriod) => {
    const today = dateOnly(new Date());
    const start = new Date(today);

    switch (period) {
      case "today":
        return { from: toISODate(start), to: toISODate(today) };
      case "week":
        start.setDate(today.getDate() - 7);
        return { from: toISODate(start), to: toISODate(today) };
      case "month":
        start.setMonth(today.getMonth() - 1);
        return { from: toISODate(start), to: toISODate(today) };
      case "quarter":
        start.setMonth(today.getMonth() - 3);
        return { from: toISODate(start), to: toISODate(today) };
      case "year":
        start.setFullYear(today.getFullYear() - 1);
        return { from: toISODate(start), to: toISODate(today) };
      default:
        return { from: "", to: "" };
    }
  }, []);

  const loadBookings = useCallback(
    async (opts?: { silent?: boolean; overrideFrom?: string; overrideTo?: string }) => {
      if (!isAdmin) return;

      try {
        if (opts?.silent) setRefreshing(true);
        else setLoading(true);

        setError(null);

        const from = opts?.overrideFrom ?? fromDate;
        const to = opts?.overrideTo ?? toDate;

        // Load ALL bookings (without status filter) so stats show correct counts
        const params = new URLSearchParams();
        if (from) params.append("from", from);
        if (to) params.append("to", to);
        // DON'T include status filter here - we'll filter locally
        if (searchQuery.trim()) params.append("q", searchQuery.trim());

        const qs = params.toString();
        const res = await api.get(`/bookings/admin/all${qs ? `?${qs}` : ""}`);

        const list: Booking[] = res.data?.bookings ?? res.data ?? [];
        setBookings(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || "Failed to load bookings");
        setBookings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin, fromDate, toDate, searchQuery] // Removed statusFilter from dependencies
  );

  useEffect(() => {
    if (!isAdmin) return;

    if (timePeriod !== "custom") {
      const defaults = getDefaultDates(timePeriod);
      setFromDate(defaults.from);
      setToDate(defaults.to);
      loadBookings({ overrideFrom: defaults.from, overrideTo: defaults.to });
    } else {
      if (fromDate && toDate) loadBookings();
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    if (timePeriod !== "custom") {
      const defaults = getDefaultDates(timePeriod);
      setFromDate(defaults.from);
      setToDate(defaults.to);
      loadBookings({ overrideFrom: defaults.from, overrideTo: defaults.to });
    }
  }, [timePeriod, isAdmin, getDefaultDates, loadBookings]);

  useEffect(() => {
    if (!isAdmin) return;
    if (timePeriod !== "custom") return;
    if (!fromDate || !toDate) return;

    loadBookings();
  }, [isAdmin, timePeriod, fromDate, toDate, loadBookings]);

  // Filter bookings locally for the table display
  const filteredBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const fromD = fromDate ? parseISODateLocal(fromDate) : null;
    const toD = toDate ? parseISODateLocal(toDate) : null;

    return bookings.filter((booking) => {
      // Apply status filter locally
      if (statusFilter !== "all" && booking.status !== statusFilter) return false;

      const sd = parseISODateLocal(booking.scheduled_date);
      if (fromD && !Number.isNaN(fromD.getTime()) && sd < fromD) return false;
      if (toD && !Number.isNaN(toD.getTime()) && sd > toD) return false;

      if (!query) return true;

      const searchableFields = [
        booking.booking_number,
        booking.service_title,
        booking.customer_name,
        booking.provider_name,
        booking.customer_email,
        booking.provider_email,
        booking.scheduled_date,
        booking.scheduled_time,
        booking.status,
        booking.category_name,
        booking.payment_status,
        booking.payment_method,
        booking.transaction_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableFields.includes(query);
    });
  }, [bookings, statusFilter, searchQuery, fromDate, toDate]);

  // Calculate status counts from ALL bookings (not filtered ones)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: bookings.length,
      pending: 0,
      accepted: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    bookings.forEach((b) => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });

    return counts as {
      all: number;
      pending: number;
      accepted: number;
      in_progress: number;
      completed: number;
      cancelled: number;
      rejected: number;
    };
  }, [bookings]); // Use ALL bookings for stats

  const updateBookingStatus = async (id: string, nextStatus: BookingStatus) => {
    if (!confirm(`Change booking status to ${nextStatus.replace("_", " ")}?`)) return;

    setActionLoading(id);
    try {
      await api.patch(`/bookings/${id}/status`, { status: nextStatus });

      await loadBookings({ silent: true });

      if (selectedBooking?.id === id) {
        setSelectedBooking({ ...selectedBooking, status: nextStatus });
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || "Failed to update booking status");
    } finally {
      setActionLoading(null);
    }
  };

  const viewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const formatCurrency = (amount: number) =>
    `QAR ${amount}`;

  if (!isAdmin) return null;

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Bookings"
          value={bookings.length.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
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
          title="Pending"
          value={statusCounts.pending.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 18a8 8 0 100-16 8 8 0 000 16z"
                stroke="white"
                strokeWidth="1.5"
              />
              <path
                d="M10 6v6l4 2"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
        <StatCard
          title="Completed"
          value={statusCounts.completed.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 18a8 8 0 100-16 8 8 0 000 16z"
                fill="white"
                opacity="0.3"
              />
              <path
                d="M7 10l2 2 4-4"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
        />
        <StatCard
          title="In Progress"
          value={statusCounts.in_progress.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2v8l4 4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
            </svg>
          }
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
        />
      </div>

      {/* Status Filter Chips */}
      <div style={styles.statusChips}>
        <StatusChip label="All" value={statusCounts.all} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        <StatusChip label="Pending" value={statusCounts.pending} active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
        <StatusChip label="Accepted" value={statusCounts.accepted} active={statusFilter === "accepted"} onClick={() => setStatusFilter("accepted")} />
        <StatusChip label="In Progress" value={statusCounts.in_progress} active={statusFilter === "in_progress"} onClick={() => setStatusFilter("in_progress")} />
        <StatusChip label="Completed" value={statusCounts.completed} active={statusFilter === "completed"} onClick={() => setStatusFilter("completed")} />
        <StatusChip label="Cancelled" value={statusCounts.cancelled} active={statusFilter === "cancelled"} onClick={() => setStatusFilter("cancelled")} />
        <StatusChip label="Rejected" value={statusCounts.rejected} active={statusFilter === "rejected"} onClick={() => setStatusFilter("rejected")} />
      </div>

      {/* Filters */}
      <div style={styles.filterPanel}>
        <div style={styles.filterGrid}>
          {/* Search */}
          <div style={styles.searchContainer}>
            <div style={styles.searchIconWrapper}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  fill="#9CA3AF"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search bookings, customers, providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4l8 8"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Time Period */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                <path d="M5 2v2M11 2v2M3 7h10M4 4h8a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="#6B7280" strokeWidth="1.5" />
              </svg>
              Period
            </label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              style={styles.select}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
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

          {/* Refresh Button */}
          <button
            onClick={() => loadBookings({ silent: true })}
            disabled={loading || refreshing}
            style={{
              ...styles.refreshButton,
              opacity: loading || refreshing ? 0.5 : 1,
              cursor: loading || refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: refreshing ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
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
            {refreshing ? "Refreshing..." : "Refresh"}
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

      {/* Bookings Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path
                  d="M27 15H21a6 6 0 00-6 6v30a6 6 0 006 6h30a6 6 0 006-6V21a6 6 0 00-6-6h-6M27 15a6 6 0 006 6h6a6 6 0 006-6M27 15a6 6 0 016-6h6a6 6 0 016 6"
                  stroke="#D1D5DB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>
              {searchQuery ? "No bookings found" : "No bookings yet"}
            </h3>
            <p style={styles.emptyText}>
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Bookings will appear here as customers make reservations"}
            </p>
          </div>
        ) : (
          <>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>
                Bookings ({filteredBookings.length})
              </h3>
              <p style={styles.tableSubtitle}>
                Showing {filteredBookings.length} of {bookings.length} total
              </p>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Booking</th>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Provider</th>
                    <th style={styles.th}>Schedule</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} style={styles.tr}>
                      {/* Booking */}
                      <td style={styles.td}>
                        <div
                          style={styles.bookingNumber}
                          onClick={() => viewBookingDetails(booking)}
                        >
                          #{booking.booking_number}
                        </div>
                        <div style={styles.bookingDate}>
                          {new Date(booking.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Service */}
                      <td style={styles.td}>
                        <div style={styles.serviceName}>{booking.service_title || "-"}</div>
                        <div style={styles.servicePrice}>{formatCurrency(booking.service_price)}</div>
                      </td>

                      {/* Customer */}
                      <td style={styles.td}>
                        {booking.customer_name ? (
                          <>
                            <div style={styles.personName}>{booking.customer_name}</div>
                            {booking.customer_email && (
                              <div style={styles.personEmail}>{booking.customer_email}</div>
                            )}
                          </>
                        ) : (
                          <span style={styles.na}>N/A</span>
                        )}
                      </td>

                      {/* Provider */}
                      <td style={styles.td}>
                        {booking.provider_name ? (
                          <>
                            <div style={styles.personName}>{booking.provider_name}</div>
                            {booking.provider_email && (
                              <div style={styles.personEmail}>{booking.provider_email}</div>
                            )}
                          </>
                        ) : (
                          <span style={styles.na}>N/A</span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td style={styles.td}>
                        <div style={styles.scheduleDate}>{booking.scheduled_date}</div>
                        <div style={styles.scheduleTime}>{booking.scheduled_time}</div>
                      </td>

                      {/* Status */}
                      <td style={styles.td}>
                        <StatusBadge status={booking.status} />
                      </td>

                      {/* Actions */}
                      <td style={styles.td}>
                        <button onClick={() => viewBookingDetails(booking)} style={styles.viewButton}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal - Keep the existing modal exactly as is */}
      {showBookingModal && selectedBooking && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <BookingModal
              booking={selectedBooking}
              onClose={() => {
                setShowBookingModal(false);
                setSelectedBooking(null);
              }}
              onStatusChange={updateBookingStatus}
              loadingId={actionLoading}
              formatCurrency={formatCurrency}
            />
          </div>
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
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: gradient }}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
    </div>
  );
}

function StatusChip({
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
  const baseStyle = {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: 8,
    padding: "8px 14px",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "solid" as const,
    background: "#FFFFFF",
    cursor: "pointer" as const,
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    transition: "all 0.2s ease",
    outline: "none" as const,
  };

  const activeStyle = active ? {
    borderColor: "#3B82F6",
    background: "#EFF6FF",
    color: "#2563EB",
  } : {
    borderColor: "#E5E7EB",
  };

  const badgeStyle = {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    background: active ? "#3B82F6" : "#F3F4F6",
    color: active ? "#FFFFFF" : "#374151",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontSize: 11,
    fontWeight: 700,
    padding: "0 6px",
  };

  return (
    <button
      onClick={onClick}
      style={{ ...baseStyle, ...activeStyle }}
    >
      <span>{label}</span>
      <span style={badgeStyle}>
        {value}
      </span>
    </button>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const theme: Record<BookingStatus, { background: string; color: string }> = {
    pending: { background: "#FEF3C7", color: "#92400E" },
    accepted: { background: "#DBEAFE", color: "#1E40AF" },
    in_progress: { background: "#E0E7FF", color: "#3730A3" },
    completed: { background: "#D1FAE5", color: "#065F46" },
    cancelled: { background: "#F3F4F6", color: "#374151" },
    rejected: { background: "#FEE2E2", color: "#991B1B" },
  };

  const t = theme[status];
  return (
    <span style={{ ...styles.badge, background: t.background, color: t.color }}>
      {status.replace("_", " ")}
    </span>
  );
}

function BookingModal({
  booking,
  onClose,
  onStatusChange,
  loadingId,
  formatCurrency,
}: {
  booking: Booking;
  onClose: () => void;
  onStatusChange: (id: string, status: BookingStatus) => void;
  loadingId: string | null;
  formatCurrency: (n: number) => string;
}) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>
            Booking #{booking.booking_number}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <StatusBadge status={booking.status} />
            <span style={{ fontSize: 14, color: "#6B7280" }}>
              Created: {new Date(booking.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 24,
            color: "#9CA3AF",
            cursor: "pointer",
            padding: 0,
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          maxHeight: "70vh",
          overflowY: "auto",
          paddingRight: 8,
        }}
      >
        {/* Left Column */}
        <div>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: "#374151" }}>
            Booking Information
          </h3>
          <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              <DetailItem label="Booking Number" value={`#${booking.booking_number}`} />
              <DetailItem label="Status" value={booking.status.replace("_", " ")} />
              <DetailItem label="Service Price" value={formatCurrency(booking.service_price)} />
              <DetailItem label="Category" value={booking.category_name || "N/A"} />
              <DetailItem label="Scheduled Date" value={booking.scheduled_date} />
              <DetailItem label="Scheduled Time" value={booking.scheduled_time} />
              <DetailItem label="Created" value={new Date(booking.created_at).toLocaleString()} />
              <DetailItem label="Last Updated" value={new Date(booking.updated_at).toLocaleString()} />
            </div>

            {booking.customer_notes && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Customer Notes</div>
                <div style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.6, background: "white", padding: 12, borderRadius: 6, border: "1px solid #E5E7EB" }}>
                  {booking.customer_notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: "#374151" }}>
              Customer Information
            </h3>
            <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 16 }}>
              <DetailItem label="Name" value={booking.customer_name || "N/A"} />
              <DetailItem label="Email" value={booking.customer_email || "N/A"} />
              <DetailItem label="Phone" value={booking.customer_phone || "N/A"} />
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: "#374151" }}>
              Provider Information
            </h3>
            <div style={{ background: "#F9FAFB", borderRadius:"8", padding: 16 }}>
              <DetailItem label="Name" value={booking.provider_name || "N/A"} />
              <DetailItem label="Email" value={booking.provider_email || "N/A"} />
              <DetailItem label="Phone" value={booking.provider_phone || "N/A"} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: "#374151" }}>Service Details</h3>
        <div style={{ background: "#F9FAFB", borderRadius: 8, padding: 16 }}>
          <DetailItem label="Service Title" value={booking.service_title || "N/A"} />
          {booking.service_description && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Description</div>
              <div style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.6, background: "white", padding: 12, borderRadius: 6, border: "1px solid #E5E7EB" }}>
                {booking.service_description}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#4B5563" }}>{value}</div>
    </div>
  );
}

/* ----------------------------- Styles ----------------------------- */

const styles: Record<string, React.CSSProperties> = {
  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 24,
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

  // Status Chips (updated to avoid mixing shorthand/longhand)
  statusChips: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
    transition: "all 0.2s ease",
    outline: "none",
  },
  statusChipActive: {
    borderColor: "#3B82F6",
    background: "#EFF6FF",
    color: "#2563EB",
  },
  statusChipBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    background: "#F3F4F6",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    padding: "0 6px",
  },
  statusChipBadgeActive: {
    background: "#3B82F6",
    color: "#FFFFFF",
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
    gridTemplateColumns: "2fr repeat(2, 1fr) auto",
    gap: 16,
    alignItems: "end",
  },
  searchContainer: {
    position: "relative",
  },
  searchIconWrapper: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    height: 48,
    paddingLeft: 44,
    paddingRight: 40,
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500",
    outline: "none",
    backgroundColor: "#FFFFFF",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
  },
  filterItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  filterLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  select: {
    height: 48,
    padding: "0 14px",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    outline: "none",
    background: "#FFFFFF",
  },
  dateInput: {
    height: 48,
    padding: "0 14px",
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: "#E5E7EB",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    background: "#FFFFFF",
  },
  refreshButton: {
    height: 48,
    padding: "0 20px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
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
    minWidth: 1000,
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
  tr: {
    borderTop: "1px solid #F3F4F6",
    transition: "background 0.2s ease",
  },
  td: {
    padding: "20px",
    fontSize: 14,
    verticalAlign: "top",
  },

  // Table Content
  bookingNumber: {
    fontWeight: "700",
    color: "#2563EB",
    cursor: "pointer",
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  serviceName: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  personName: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  personEmail: {
    fontSize: 12,
    color: "#6B7280",
  },
  na: {
    color: "#9CA3AF",
  },
  scheduleDate: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Badge
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
    border: "none",
  },

  // Buttons
  viewButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
    outline: "none",
  },

  // Loading State
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
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
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
  padding: 20,
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  width: "100%",
  maxWidth: 1000,
  maxHeight: "90vh",
  padding: 24,
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
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
    background: #F9FAFB;
  }
`;
document.head.appendChild(styleSheet);