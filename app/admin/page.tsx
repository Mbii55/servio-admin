// app/admin/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function AdminDashboardPage() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Dashboard</h1>
          <p style={styles.sub}>
            Manage users, services, categories, and bookings.
          </p>
        </div>

        <div style={styles.quickHint}>
          <span style={styles.dot} />
          <span style={styles.quickHintText}>Admin panel</span>
        </div>
      </div>

      <div style={styles.grid}>
        <DashboardCard
          title="Users"
          description="Manage customers & providers"
          href="/admin/users"
          icon="👤"
        />

        <DashboardCard
          title="Categories"
          description="Manage service categories"
          href="/admin/categories"
          icon="🧩"
        />

        <DashboardCard
          title="Bookings"
          description="View and manage bookings"
          href="/admin/bookings"
          icon="📅"
          disabled
          badge="Coming soon"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  disabled,
  icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  disabled?: boolean;
  icon?: string;
  badge?: string;
}) {
  const [hover, setHover] = useState(false);

  const card = (
    <div
      style={{
        ...styles.card,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transform: !disabled && hover ? "translateY(-2px)" : "translateY(0px)",
        boxShadow: !disabled && hover ? "0 12px 30px rgba(16,24,40,0.08)" : styles.card.boxShadow,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={styles.cardTop}>
        <div style={styles.iconCircle} aria-hidden>
          {icon ?? "•"}
        </div>

        {badge ? <span style={styles.badge}>{badge}</span> : null}
      </div>

      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardDesc}>{description}</div>

      <div style={styles.cardFooter}>
        <span style={styles.linkText}>{disabled ? "Unavailable" : "Open"}</span>
        <span style={{ opacity: disabled ? 0.45 : 0.9 }}>→</span>
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
    display: "grid",
    gap: 16,
  },

  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  h1: {
    margin: 0,
    fontSize: 22,
    fontWeight: 900,
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  sub: {
    margin: "6px 0 0",
    fontSize: 13,
    color: "#64748B",
    lineHeight: "18px",
  },

  quickHint: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #E9ECF2",
    background: "#F8FAFC",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#2F6BFF",
  },
  quickHintText: {
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
    marginTop: 6,
  },

  card: {
    border: "1px solid #E9ECF2",
    borderRadius: 16,
    padding: 16,
    background: "#FFFFFF",
    boxShadow: "0 10px 24px rgba(16,24,40,0.06)",
    transition: "transform 160ms ease, box-shadow 160ms ease",
    minHeight: 130,
    display: "grid",
    alignContent: "start",
    gap: 8,
  },

  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#EEF2FF",
    border: "1px solid #E0E7FF",
    fontSize: 16,
  },

  badge: {
    fontSize: 11,
    fontWeight: 900,
    color: "#0F172A",
    background: "#F1F5F9",
    border: "1px solid #E2E8F0",
    padding: "6px 10px",
    borderRadius: 999,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: "#0F172A",
  },

  cardDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: "18px",
  },

  cardFooter: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTop: "1px solid #F1F5F9",
  },

  linkText: {
    fontSize: 12,
    fontWeight: 900,
    color: "#2F6BFF",
  },
};
