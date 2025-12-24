// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "../../../src/lib/api";

type UserRole = "customer" | "provider" | "admin";
type UserStatus = "active" | "inactive" | "suspended";

interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  first_name: string;
  last_name: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get("/users", {
        params: roleFilter === "all" ? {} : { role: roleFilter },
      });

      setUsers(res.data.users);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const toggleStatus = async (user: User) => {
    const nextStatus: UserStatus =
      user.status === "active" ? "suspended" : "active";

    await api.patch(`/users/${user.id}/status`, {
      status: nextStatus,
    });

    loadUsers();
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Users</h1>
      <p style={{ color: "#6B7280", marginTop: 6 }}>
        Manage customers, providers, and admins.
      </p>

      {/* Filters */}
      <div style={{ margin: "16px 0" }}>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          style={{
            padding: 8,
            borderRadius: 8,
            border: "1px solid #E5E7EB",
          }}
        >
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="provider">Providers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading && <div>Loading users...</div>}

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table width="100%" cellPadding={12}>
            <thead style={{ background: "#F9FAFB" }}>
              <tr>
                <th align="left">Name</th>
                <th align="left">Email</th>
                <th align="left">Role</th>
                <th align="left">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                  <td>
                    {u.first_name} {u.last_name}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <StatusBadge status={u.status} />
                  </td>
                  <td align="right">
                    {u.role !== "admin" && (
                      <button
                        onClick={() => toggleStatus(u)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #E5E7EB",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {u.status === "active" ? "Suspend" : "Activate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div style={{ padding: 12, color: "#6B7280" }}>
              No users found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const colors: Record<UserStatus, string> = {
    active: "#16A34A",
    inactive: "#6B7280",
    suspended: "#DC2626",
  };

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: "white",
        background: colors[status],
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}
