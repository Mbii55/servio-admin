// app/admin/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../src/lib/api";
import { useAuth } from "../../src/context/AuthContext";

type DashboardStats = {
  total_users: number;
  active_services: number;
  total_bookings: number;
  revenue: number;
};

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    active_services: 0,
    total_bookings: 0,
    revenue: 0,
  });

  useEffect(() => {
    if (!isAdmin) return;

    let mounted = true;

    const loadStats = async () => {
      try {
        const res = await api.get("/admin/dashboard/stats");
        if (!mounted) return;

        setStats({
          total_users: Number(res.data?.total_users ?? 0),
          active_services: Number(res.data?.active_services ?? 0),
          total_bookings: Number(res.data?.total_bookings ?? 0),
          revenue: Number(res.data?.revenue ?? 0),
        });
      } catch {
        // keep existing values; optionally log
      }
    };

    loadStats();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  return (
    <div style={styles.page}>
      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={stats.total_users.toLocaleString()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
          trend="+12%"
        />
        <StatCard
          title="Active Services"
          value={stats.active_services.toLocaleString()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          trend="+8%"
        />
        <StatCard
          title="Total Bookings"
          value={stats.total_bookings.toLocaleString()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          trend="+24%"
        />
        <StatCard
          title="Revenue"
          value={`QAR ${stats.revenue.toLocaleString()}`}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          trend="+15%"
        />
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 40 }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <p style={styles.sectionSubtitle}>Navigate to key management areas</p>
        </div>

        <div style={styles.actionsGrid}>
          <ActionCard
            title="Users"
            description="Manage customers and service providers"
            href="/admin/users"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            iconBg="#EFF6FF"
            iconColor="#3B82F6"
          />

          <ActionCard
            title="Categories"
            description="Organize and manage service categories"
            href="/admin/categories"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            iconBg="#F3E8FF"
            iconColor="#8B5CF6"
          />

          <ActionCard
            title="Services"
            description="View and manage all platform services"
            href="/admin/services"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            iconBg="#ECFDF5"
            iconColor="#10B981"
          />

          <ActionCard
            title="Bookings"
            description="Track and manage customer bookings"
            href="/admin/bookings"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            iconBg="#FEF3C7"
            iconColor="#F59E0B"
          />

          <ActionCard
            title="Earnings"
            description="Monitor platform revenue and earnings"
            href="/admin/earnings"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
            iconBg="#FEE2E2"
            iconColor="#EF4444"
          />
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatCard({
  title,
  value,
  icon,
  gradient,
  trend,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: string;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statCardHeader}>
        <div style={{ ...styles.statIcon, background: gradient }}>{icon}</div>
        {trend && (
          <div style={styles.trendBadge}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 9l4-4 4 4"
                stroke="#10B981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
    </div>
  );
}

// Action Card Component
function ActionCard({
  title,
  description,
  href,
  icon,
  iconBg,
  iconColor,
  disabled,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  disabled?: boolean;
  badge?: string;
}) {
  const [hover, setHover] = useState(false);

  const card = (
    <div
      style={{
        ...styles.actionCard,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transform: !disabled && hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow:
          !disabled && hover
            ? "0 12px 32px rgba(0, 0, 0, 0.12)"
            : "0 4px 16px rgba(0, 0, 0, 0.06)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.actionCardHeader}>
        <div style={{ ...styles.actionIcon, background: iconBg, color: iconColor }}>
          {icon}
        </div>
        {badge && <span style={styles.actionBadge}>{badge}</span>}
      </div>

      <h3 style={styles.actionTitle}>{title}</h3>
      <p style={styles.actionDescription}>{description}</p>

      <div style={styles.actionFooter}>
        <span style={styles.actionLink}>{disabled ? "Coming Soon" : "Manage"}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{
            opacity: disabled ? 0.3 : hover ? 1 : 0.5,
            transition: "all 0.2s ease",
          }}
        >
          <path
            d="M4 10h12m-4-4l4 4-4 4"
            stroke={disabled ? "#9CA3AF" : iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );

  if (disabled) return card;

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {card}
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 0,
  },

  // Stats Grid
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
    marginBottom: 40,
  },

  statCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    border: "1px solid #F3F4F6",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
    transition: "all 0.2s ease",
  },

  statCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },

  trendBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 12px",
    background: "#ECFDF5",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },

  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: "-0.02em",
  },

  statTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },

  // Section
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubtitle: {
    margin: 0,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Actions Grid
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
  },

  actionCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    border: "1px solid #F3F4F6",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
  },

  actionCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  actionBadge: {
    padding: "6px 12px",
    background: "#FEF3C7",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  },

  actionTitle: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  actionDescription: {
    margin: "0 0 20px 0",
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.6,
    flex: 1,
    fontWeight: "500",
  },

  actionFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTop: "1px solid #F3F4F6",
  },

  actionLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
};