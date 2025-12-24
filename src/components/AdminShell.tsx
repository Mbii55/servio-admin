// src/components/AdminShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const NavItem = ({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: string;
}) => {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        background: active ? "#EEF2FF" : "transparent",
        border: active ? "1px solid #E0E7FF" : "1px solid transparent",
        color: active ? "#111827" : "#334155",
        fontWeight: active ? 800 : 600,
        textDecoration: "none",
      }}
    >
      {/* left accent */}
      {active ? (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 4,
            borderRadius: 999,
            background: "#2F6BFF",
          }}
        />
      ) : null}

      <span style={{ width: 18, textAlign: "center", opacity: active ? 1 : 0.7 }}>
        {icon ?? "•"}
      </span>
      <span>{label}</span>
    </Link>
  );
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F7FB",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
      }}
    >
      <aside
        style={{
          padding: 16,
        }}
      >
        <div
          style={{
            height: "100%",
            background: "#FFFFFF",
            border: "1px solid #E9ECF2",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 10px 30px rgba(16, 24, 40, 0.05)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "#2F6BFF",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              S
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>
                Servio Admin
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                {user ? `${user.first_name} ${user.last_name}` : "Not signed in"}
              </div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ marginTop: 8, padding: 10, display: "grid", gap: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "#94A3B8",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Menu
            </div>

            <NavItem href="/admin" label="Dashboard" icon="📊" />
            <NavItem href="/categories" label="Categories" icon="🧩" />
            <NavItem href="/admin/users" label="Users" icon="👤" />
            <NavItem href="/admin/bookings" label="Bookings" icon="📅" />
            <NavItem href="/admin/providers" label="Providers" icon="🏪" />
            <NavItem href="/admin/earnings" label="Earnings" icon="💰" />
          </div>

          {/* Footer / Logout */}
          <div style={{ marginTop: "auto", padding: 10 }}>
            <button
              onClick={logout}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #FEE2E2",
                background: "#FFF1F2",
                cursor: "pointer",
                fontWeight: 900,
                color: "#991B1B",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: 16 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E9ECF2",
            borderRadius: 16,
            minHeight: "calc(100vh - 32px)",
            padding: 18,
            boxShadow: "0 10px 30px rgba(16, 24, 40, 0.04)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
