// app/admin/users/page.tsx
"use client";

import React, { useMemo } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "../../../src/context/AuthContext";
import { fetcher } from "../../../src/lib/swr-fetcher";
import DashboardSkeleton from '../../../src/components/ui/DashboardSkeleton';
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
  phone?: string | null;
  profile_image?: string | null;
  business_logo?: string | null;
  business_name?: string | null;
  created_at: string;
  updated_at: string;
}

type UsersResponse = {
  users?: User[];
  data?: User[];
  error?: string;
};

export default function AdminUsersPage() {
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filters, setFilters] = React.useState({
    role: "all" as "all" | UserRole,
    status: "all" as "all" | UserStatus,
  });

  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [brokenImages, setBrokenImages] = React.useState<Record<string, boolean>>({});

  // Build SWR key exactly like your original params
  const swrKey = useMemo(() => {
    if (!isAdmin) return null;

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append("search", searchTerm.trim());
    if (filters.role !== "all") params.append("role", filters.role);
    if (filters.status !== "all") params.append("status", filters.status);

    const qs = params.toString();
    return `/users${qs ? `?${qs}` : ""}`;
  }, [isAdmin, searchTerm, filters.role, filters.status]);

  const {
    data: rawData,
    error,
    isLoading,
    mutate: mutateUsers,
  } = useSWR<UsersResponse>(swrKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30000,
    refreshInterval: 60000,
    errorRetryCount: 3,
  });

  const users: User[] = useMemo(() => {
    const list = rawData?.users ?? rawData?.data ?? [];
    return Array.isArray(list) ? list : [];
  }, [rawData]);

  const stats = useMemo(() => ({
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    providers: users.filter(u => u.role === 'provider').length,
    active: users.filter(u => u.status === 'active').length,
  }), [users]);

  const displayName = (u: User) =>
    `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;

  const initials = (u: User) => {
    const a = (u.first_name || "").trim().charAt(0);
    const b = (u.last_name || "").trim().charAt(0);
    const fallback = (u.email || "").trim().charAt(0);
    return ((a || fallback) + (b || "")).toUpperCase();
  };

  const getUserImage = (u: User) => {
    if (brokenImages[u.id]) return null;
    if (u.role === "provider") return u.business_logo || u.profile_image || null;
    return u.profile_image || null;
  };

  const loadUsers = () => mutateUsers();

const toggleStatus = async (user: User) => {
  if (!confirm(`Are you sure you want to ${user.status === "active" ? "suspend" : "activate"} this user?`)) return;

  const nextStatus: UserStatus = user.status === "active" ? "suspended" : "active";
  setActionLoading(user.id);

  try {
    // Use api client instead of fetch
    await api.patch(`/users/${user.id}/status`, { status: nextStatus });

    await loadUsers();

    if (selectedUser?.id === user.id) {
      setSelectedUser({ ...user, status: nextStatus });
    }
  } catch (err: any) {
    alert(err?.response?.data?.error || err?.message || "Failed to update user status");
  } finally {
    setActionLoading(null);
  }
};

const changeUserRole = async (userId: string, newRole: UserRole) => {
  if (!confirm(`Change this user's role to ${newRole}?`)) return;

  setActionLoading(userId);

  try {
    // Use api client instead of fetch
    await api.patch(`/users/${userId}/role`, { role: newRole });

    await loadUsers();

    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser!, role: newRole });
    }
  } catch (err: any) {
    alert(err?.response?.data?.error || err?.message || "Failed to update user role");
  } finally {
    setActionLoading(null);
  }
};

  const viewUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  if (!isAdmin) return null;

  // Loading state with DashboardSkeleton
  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={styles.statCardSkeleton}>
              <div style={styles.skeletonIcon} />
              <div style={styles.skeletonValue} />
              <div style={styles.skeletonTitle} />
            </div>
          ))}
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>Warning</div>
          <h2 style={styles.errorTitle}>Failed to Load Users</h2>
          <p style={styles.errorMessage}>
            {error.message || "Unable to fetch users. Please try again."}
          </p>
          <button onClick={loadUsers} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={stats.total.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
                fill="white"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
        />
        <StatCard
          title="Customers"
          value={stats.customers.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                fill="white"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
        />
        <StatCard
          title="Providers"
          value={stats.providers.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l1.5-4.5A2 2 0 016.4 3h11.2a2 2 0 011.9 1.5L21 9M3 9h18M3 9v9a2 2 0 002 2h4v-5h6v5h4a2 2 0 002-2V9"
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
          title="Active Users"
          value={stats.active.toLocaleString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"
                fill="white"
              />
            </svg>
          }
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
      </div>

      {/* Filters and Search */}
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
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={styles.clearButton}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM3 14a5 5 0 0110 0H3z" fill="#6B7280" />
              </svg>
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value as "all" | UserRole })}
              style={styles.select}
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="provider">Providers</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={styles.filterItem}>
            <label style={styles.filterLabel}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: 6 }}>
                <circle cx="8" cy="8" r="6" stroke="#6B7280" strokeWidth="2" />
                <circle cx="8" cy="8" r="2" fill="#6B7280" />
              </svg>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as "all" | UserStatus })}
              style={styles.select}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Refresh Button - Kept exactly as original */}
          <button
            onClick={loadUsers}
            disabled={isLoading}
            style={{
              ...styles.refreshButton,
              opacity: isLoading ? 0.5 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: isLoading ? 'rotate(180deg)' : 'rotate(0deg)',
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
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && !isLoading && (
        <div style={styles.errorAlert}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#FEE2E2" />
            <path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{error.message || "Failed to load users"}</span>
        </div>
      )}

      {/* Users Table */}
      <div style={styles.tableContainer}>
        {isLoading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4 4 12.954 4 24s8.954 20 20 20z" stroke="#D1D5DB" strokeWidth="2" />
                <path d="M16 20a4 4 0 108 0 4 4 0 00-8 0zM32 20a4 4 0 108 0 4 4 0 00-8 0zM24 36c-4 0-7-2-8-5h16c-1 3-4 5-8 5z" fill="#D1D5DB" />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>No users found</h3>
            <p style={styles.emptyText}>
              {searchTerm ? "Try adjusting your search or filters" : "No users have been created yet"}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>User</th>
                  <th style={styles.tableHeader}>Contact</th>
                  <th style={styles.tableHeader}>Role</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Joined</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const img = getUserImage(user);
                  return (
                    <tr key={user.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <div style={styles.userInfo}>
                          <Avatar
                            url={img}
                            alt={displayName(user)}
                            initials={initials(user)}
                            shape={user.role === "provider" ? "rounded" : "circle"}
                            onError={() => setBrokenImages(p => ({ ...p, [user.id]: true }))}
                          />
                          <div>
                            <div style={styles.userName}>{displayName(user)}</div>
                            {user.role === "provider" && user.business_name && (
                              <div style={styles.businessName}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 3a1 1 0 011-1h6a1 1 0 011 1v1H2V3zM10 5H2v4a1 1 0 001 1h6a1 1 0 001-1V5z" fill="#6B7280" />
                                </svg>
                                {user.business_name}
                              </div>
                            )}
                            <div style={styles.userId}>ID: {user.id.substring(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div>
                          <div style={styles.email}>{user.email}</div>
                          {user.phone && <div style={styles.phone}>{user.phone}</div>}
                        </div>
                      </td>
                      <td style={styles.tableCell}><RoleBadge role={user.role} /></td>
                      <td style={styles.tableCell}><StatusBadge status={user.status} /></td>
                      <td style={styles.tableCell}>
                        <div style={styles.date}>{new Date(user.created_at).toLocaleDateString()}</div>
                        <div style={styles.time}>{new Date(user.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actions}>
                          <button onClick={() => viewUserDetails(user)} style={styles.viewButton}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                            View
                          </button>
                          {user.role !== "admin" && (
                            <>
                              <button
                                onClick={() => toggleStatus(user)}
                                disabled={actionLoading === user.id}
                                style={{
                                  ...styles.statusButton,
                                  ...(user.status === "active" ? styles.suspendButton : styles.activateButton),
                                  opacity: actionLoading === user.id ? 0.5 : 1,
                                }}
                              >
                                {actionLoading === user.id ? "..." : user.status === "active" ? "Suspend" : "Activate"}
                              </button>
                              <select
                                value={user.role}
                                onChange={(e) => changeUserRole(user.id, e.target.value as UserRole)}
                                disabled={actionLoading === user.id}
                                style={{
                                  ...styles.roleSelect,
                                  opacity: actionLoading === user.id ? 0.5 : 1,
                                  display: 'none',
                                }}
                              >
                                <option value="customer">Customer</option>
                                <option value="provider">Provider</option>
                                <option value="admin">Admin</option>
                              </select>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div style={styles.modalOverlay} onClick={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <div style={styles.modalHeaderContent}>
                <Avatar
                  url={getUserImage(selectedUser)}
                  alt={displayName(selectedUser)}
                  initials={initials(selectedUser)}
                  size={64}
                  shape={selectedUser.role === "provider" ? "rounded" : "circle"}
                  onError={() => setBrokenImages((p) => ({ ...p, [selectedUser.id]: true }))}
                />

                <div>
                  <h2 style={styles.modalTitle}>{displayName(selectedUser)}</h2>
                  <div style={styles.modalBadges}>
                    <StatusBadge status={selectedUser.status} />
                    <RoleBadge role={selectedUser.role} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
                style={styles.closeButton}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={styles.modalBody}>
              {/* Left Column */}
              <div>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 8a3 3 0 100-6 3 3 0 000 6zM3 14a5 5 0 0110 0H3z"
                      fill="#6B7280"
                    />
                  </svg>
                  Basic Information
                </h3>
                <div style={styles.modalSection}>
                  <div style={styles.detailsGrid}>
                    <DetailItem label="First Name" value={selectedUser.first_name} />
                    <DetailItem label="Last Name" value={selectedUser.last_name} />
                    <DetailItem label="Email" value={selectedUser.email} />
                    <DetailItem label="Phone" value={selectedUser.phone || "Not provided"} />
                    <DetailItem label="User ID" value={selectedUser.id.substring(0, 12) + "..."} />
                    {selectedUser.role === "provider" && (
                      <DetailItem label="Business Name" value={selectedUser.business_name || "N/A"} />
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h3 style={styles.modalSectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 5v3l2 1"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Account Information
                </h3>
                <div style={styles.modalSection}>
                  <div style={styles.detailsGrid}>
                    <DetailItem label="Created" value={new Date(selectedUser.created_at).toLocaleString()} />
                    <DetailItem label="Last Updated" value={new Date(selectedUser.updated_at).toLocaleString()} />
                    <DetailItem label="Role" value={selectedUser.role} />
                    <DetailItem label="Status" value={selectedUser.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            {selectedUser.role !== "admin" && (
              <div style={styles.modalFooter}>
                <button
                  onClick={() => toggleStatus(selectedUser)}
                  disabled={actionLoading === selectedUser.id}
                  style={{
                    ...styles.modalButton,
                    ...(selectedUser.status === "active"
                      ? styles.modalSuspendButton
                      : styles.modalActivateButton),
                    opacity: actionLoading === selectedUser.id ? 0.5 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {selectedUser.status === "active" ? (
                      <path
                        d="M8 14A6 6 0 108 2a6 6 0 000 12z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <path
                        d="M8 1v6m0 0L5 4m3 3l3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  {selectedUser.status === "active" ? "Suspend User" : "Activate User"}
                </button>

                <select
                  value={selectedUser.role}
                  onChange={(e) => changeUserRole(selectedUser.id, e.target.value as UserRole)}
                  disabled={actionLoading === selectedUser.id}
                  style={{
                    ...styles.modalSelect,
                    opacity: actionLoading === selectedUser.id ? 0.5 : 1,
                    display: 'none',
                  }}
                >
                  <option value="customer">Customer</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
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

function Avatar({
  url,
  alt,
  initials,
  onError,
  size = 48,
  shape = "circle",
}: {
  url: string | null;
  alt: string;
  initials: string;
  onError: () => void;
  size?: number;
  shape?: "circle" | "rounded";
}) {
  const radius = shape === "circle" ? "50%" : 12;

  if (!url) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#3B82F6",
          fontWeight: 800,
          fontSize: Math.max(14, Math.floor(size / 3)),
          flexShrink: 0,
        }}
        title={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        border: "2px solid #F3F4F6",
        background: "#fff",
        flexShrink: 0,
      }}
      title={alt}
    >
      <img
        src={url}
        alt={alt}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={onError}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  const colors: Record<UserStatus, { background: string; color: string; icon: React.ReactNode }> = {
    active: {
      background: "#ECFDF5",
      color: "#059669",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" fill="#10B981" />
          <path d="M4 6l1.5 1.5L8.5 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    inactive: {
      background: "#F3F4F6",
      color: "#6B7280",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" fill="#9CA3AF" />
        </svg>
      ),
    },
    suspended: {
      background: "#FEE2E2",
      color: "#DC2626",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" fill="#EF4444" />
          <path d="M4 4l4 4M8 4l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  };

  return (
    <span style={{ ...styles.badge, background: colors[status].background, color: colors[status].color }}>
      {colors[status].icon}
      <span style={{ textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const colors: Record<UserRole, { background: string; color: string; icon: React.ReactNode }> = {
    customer: {
      background: "#EFF6FF",
      color: "#2563EB",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 6a2 2 0 100-4 2 2 0 000 4zM2 10a4 4 0 018 0H2z"
            fill="#3B82F6"
          />
        </svg>
      ),
    },
    provider: {
      background: "#ECFDF5",
      color: "#059669",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 3a1 1 0 011-1h6a1 1 0 011 1v1H2V3zM10 5H2v4a1 1 0 001 1h6a1 1 0 001-1V5z"
            fill="#10B981"
          />
        </svg>
      ),
    },
    admin: {
      background: "#FEF3C7",
      color: "#D97706",
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 2L2 4v2.5C2 9.09 3.79 10.34 6 11c2.21-.66 4-1.91 4-4.5V4l-4-2z"
            fill="#F59E0B"
          />
        </svg>
      ),
    },
  };

  return (
    <span style={{ ...styles.badge, background: colors[role].background, color: colors[role].color }}>
      {colors[role].icon}
      <span style={{ textTransform: "capitalize" }}>{role}</span>
    </span>
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
    gridTemplateColumns: "2fr 1fr 1fr auto",
    gap: 16,
    alignItems: "end",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIconWrapper: {
    position: "absolute",
    left: 14,
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    height: 48,
    paddingLeft: 44,
    paddingRight: 40,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    outline: "none",
    transition: "all 0.2s ease",
  },
  clearButton: {
    position: "absolute",
    right: 12,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
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
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    cursor: "pointer",
    outline: "none",
    background: "#FFFFFF",
    transition: "all 0.2s ease",
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
    transition: "all 0.2s ease",
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
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1000,
  },
  tableHeader: {
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
  tableRow: {
    borderTop: "1px solid #F3F4F6",
    transition: "background 0.2s ease",
  },
  tableCell: {
    padding: "20px",
    fontSize: 14,
    verticalAlign: "top",
  },

  // User Info
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  userName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  businessName: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  userId: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "monospace",
  },

  // Contact
  email: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  phone: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Date
  date: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
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
    whiteSpace: "nowrap",
  },

  // Actions
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  viewButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 14px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
  },
  statusButton: {
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "none",
  },
  suspendButton: {
    background: "#FEE2E2",
    color: "#DC2626",
  },
  activateButton: {
    background: "#ECFDF5",
    color: "#059669",
  },
  roleSelect: {
    padding: "8px 10px",
    border: "2px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
    cursor: "pointer",
    color: "#374151",
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: "#6B7280",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 900,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 24,
    borderBottom: "1px solid #F3F4F6",
  },
  modalHeaderContent: {
    display: "flex",
    gap: 16,
    alignItems: "center",
  },
  modalTitle: {
    margin: "0 0 8px 0",
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalBadges: {
    display: "flex",
    gap: 8,
  },
  closeButton: {
    background: "#F3F4F6",
    border: "none",
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#6B7280",
    transition: "all 0.2s ease",
  },
  modalBody: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    padding: 24,
    overflowY: "auto",
  },
  modalSectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 12px 0",
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
  },
  modalSection: {
    background: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  modalFooter: {
    padding: 24,
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "none",
  },
  modalSuspendButton: {
    background: "#FEE2E2",
    color: "#DC2626",
  },
  modalActivateButton: {
    background: "#ECFDF5",
    color: "#059669",
  },
  modalSelect: {
    padding: "12px 16px",
    border: "2px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    cursor: "pointer",
    color: "#374151",
  },
};

// Add spinner animation
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