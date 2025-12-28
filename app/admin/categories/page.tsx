// app/admin/categories/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "../../../src/lib/api";
import { useAuth } from "../../../src/context/AuthContext";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  sort_order: 0,
  is_active: true,
};

export default function CategoriesPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    if (!isAdmin) return;

    try {
      setErr(null);
      const res = await api.get("/categories");
      const list = (res.data?.categories ?? res.data ?? []) as Category[];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Failed to load categories");
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      icon: c.icon ?? "",
      sort_order: c.sort_order ?? 0,
      is_active: c.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(false);
  };

  const save = async () => {
    if (!isAdmin) return;

    if (!form.name.trim() || !form.slug.trim()) {
      setErr("Name and slug are required");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        sort_order: Number(form.sort_order) || 0,
        is_active: !!form.is_active,
      };

      if (editing) {
        await api.patch(`/categories/${editing.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      closeModal();
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Are you sure you want to delete this category?")) return;

    setBusy(true);
    setErr(null);
    try {
      await api.delete(`/categories/${id}`);
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) return null;

  const stats = {
    total: items.length,
    active: items.filter(c => c.is_active).length,
    inactive: items.filter(c => !c.is_active).length,
  };

  return (
    <>
      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Categories"
          value={stats.total.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M7 3h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
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
          title="Active"
          value={stats.active.toString()}
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
          title="Inactive"
          value={stats.inactive.toString()}
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="white" strokeWidth="1.5" />
              <path d="M6 6l8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
        />
      </div>

      {/* Header Actions */}
      <div style={styles.headerActions}>
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
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
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

        <div style={styles.actionButtons}>
          <button onClick={load} disabled={busy} style={styles.refreshButton}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              style={{
                transform: busy ? 'rotate(180deg)' : 'rotate(0deg)',
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

          <button onClick={openNew} disabled={busy} style={styles.createButton}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 5v10M5 10h10"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Category
          </button>
        </div>
      </div>

      {/* Error Message */}
      {err && (
        <div style={styles.errorAlert}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#FEE2E2" />
            <path d="M10 6v4M10 14h.01" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>{err}</span>
        </div>
      )}

      {/* Categories Grid */}
      <div style={styles.gridContainer}>
        {filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIconContainer}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <path
                  d="M20 16h.01M20 16h16c1.024 0 2.048.39 2.828 1.172l14 14a4 4 0 010 5.656l-14 14a4 4 0 01-5.656 0l-14-14A3.988 3.988 0 0116 32V20a8 8 0 018-8z"
                  stroke="#D1D5DB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 style={styles.emptyTitle}>
              {searchTerm ? "No categories found" : "No categories yet"}
            </h3>
            <p style={styles.emptyText}>
              {searchTerm
                ? "Try adjusting your search"
                : "Get started by creating your first category"}
            </p>
            {!searchTerm && (
              <button onClick={openNew} style={styles.emptyButton}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 5v10M5 10h10"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Create First Category
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onEdit={() => openEdit(category)}
              onDelete={() => remove(category.id)}
              busy={busy}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editing ? "Edit Category" : "Create New Category"}
              </h2>
              <button onClick={closeModal} style={styles.closeButton}>
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
              <div style={styles.formGrid}>
                {/* Icon Preview */}
                <div style={styles.iconPreview}>
                  <div style={styles.iconPreviewBox}>
                    {form.icon ? (
                      <span style={{ fontSize: 48 }}>{form.icon}</span>
                    ) : (
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path
                          d="M14 12h.01M14 12h12c.512 0 1.024.195 1.414.586l14 14a2 2 0 010 2.828l-14 14a2 2 0 01-2.828 0l-14-14A1.994 1.994 0 0112 24V14a4 4 0 014-4z"
                          stroke="#D1D5DB"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <p style={styles.iconHint}>Icon Preview</p>
                </div>

                {/* Form Fields */}
                <div style={styles.formFields}>
                  <FormField label="Category Name" required>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      style={styles.input}
                      placeholder="e.g., Home Services"
                    />
                  </FormField>

                  <FormField label="URL Slug" required>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                      style={styles.input}
                      placeholder="e.g., home-services"
                    />
                  </FormField>

                  <FormField label="Icon (Emoji or URL)">
                    <input
                      value={form.icon}
                      onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                      style={styles.input}
                      placeholder="🏠 or https://..."
                    />
                  </FormField>

                  <FormField label="Sort Order">
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                      style={styles.input}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField label="Description">
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      style={styles.textarea}
                      placeholder="Brief description of this category..."
                      rows={3}
                    />
                  </FormField>

                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                      style={styles.checkbox}
                    />
                    <span>Active (visible to users)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={styles.modalFooter}>
              <button onClick={closeModal} style={styles.cancelButton} disabled={busy}>
                Cancel
              </button>
              <button onClick={save} style={styles.saveButton} disabled={busy}>
                {busy ? (
                  <>
                    <div style={styles.spinner} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M7 10l2 2 4-4m5.618.618a9 9 0 11-12.853 0"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{editing ? "Update Category" : "Create Category"}</span>
                  </>
                )}
              </button>
            </div>
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

function CategoryCard({
  category,
  onEdit,
  onDelete,
  busy,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const isImage = category.icon && (category.icon.startsWith('http://') || category.icon.startsWith('https://'));

  return (
    <div style={styles.categoryCard}>
      {/* Icon */}
      <div style={styles.categoryIcon}>
        {category.icon ? (
          isImage ? (
            <img
              src={category.icon}
              alt={category.name}
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            <span style={{ fontSize: 40 }}>{category.icon}</span>
          )
        ) : (
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M12 10h.01M12 10h10c.512 0 1.024.195 1.414.586l10 10a2 2 0 010 2.828l-10 10a2 2 0 01-2.828 0l-10-10A1.994 1.994 0 0110 20V12a4 4 0 014-4z"
              stroke="#D1D5DB"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={styles.categoryContent}>
        <div style={styles.categoryHeader}>
          <h3 style={styles.categoryName}>{category.name}</h3>
          <span style={{
            ...styles.statusBadge,
            ...(category.is_active ? styles.activeBadge : styles.inactiveBadge),
          }}>
            {category.is_active ? "Active" : "Inactive"}
          </span>
        </div>

        <div style={styles.categoryMeta}>
          <span style={styles.categorySlug}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M6 2L2 6l4 4M8 2l4 4-4 4"
                stroke="#9CA3AF"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {category.slug}
          </span>
          <span style={styles.categorySortOrder}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10M2 3h10M2 11h10"
                stroke="#9CA3AF"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Order: {category.sort_order}
          </span>
        </div>

        {category.description && (
          <p style={styles.categoryDescription}>{category.description}</p>
        )}
      </div>

      {/* Actions */}
      <div style={styles.categoryActions}>
        <button onClick={onEdit} disabled={busy} style={styles.editButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M11.333 2A1.886 1.886 0 0114 4.667l-9 9-3.667.333.334-3.667 9-9z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Edit
        </button>
        <button onClick={onDelete} disabled={busy} style={styles.deleteButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.formField}>
      <label style={styles.formLabel}>
        {label}
        {required && <span style={{ color: "#DC2626", marginLeft: 4 }}>*</span>}
      </label>
      {children}
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

  // Header Actions
  headerActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  searchContainer: {
    position: "relative",
    flex: 1,
    minWidth: 300,
    maxWidth: 500,
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
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500",
    outline: "none",
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
  actionButtons: {
    display: "flex",
    gap: 12,
  },
  refreshButton: {
    height: 48,
    padding: "0 20px",
    border: "2px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  createButton: {
    height: 48,
    padding: "0 24px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
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

  // Grid
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 20,
  },

  // Category Card
  categoryCard: {
    background: "#FFFFFF",
    border: "1px solid #F3F4F6",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  categoryName: {
    margin: 0,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  activeBadge: {
    background: "#ECFDF5",
    color: "#059669",
  },
  inactiveBadge: {
    background: "#FEE2E2",
    color: "#DC2626",
  },
  categoryMeta: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
  },
  categorySlug: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "monospace",
  },
  categorySortOrder: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#6B7280",
  },
  categoryDescription: {
    margin: 0,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 1.6,
  },
  categoryActions: {
    display: "flex",
    gap: 8,
    paddingTop: 16,
    borderTop: "1px solid #F3F4F6",
  },
  editButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 16px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  deleteButton: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 16px",
    border: "none",
    background: "#FEE2E2",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
    cursor: "pointer",
  },

  // Empty State
  emptyState: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    background: "#FFFFFF",
    borderRadius: 16,
    border: "2px dashed #E5E7EB",
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
    margin: "0 0 24px 0",
    fontSize: 14,
    color: "#6B7280",
  },
  emptyButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
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
    maxWidth: 600,
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottom: "1px solid #F3F4F6",
  },
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
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
  },
  modalBody: {
    padding: 24,
    overflowY: "auto",
    flex: 1,
  },
  formGrid: {
    display: "grid",
    gap: 24,
  },
  iconPreview: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  iconPreviewBox: {
    width: 100,
    height: 100,
    borderRadius: 16,
    background: "linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed #D1D5DB",
  },
  iconHint: {
    margin: 0,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  formFields: {
    display: "grid",
    gap: 16,
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  input: {
    width: "100%",
    height: 48,
    padding: "0 14px",
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500",
    outline: "none",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: 14,
    border: "2px solid #E5E7EB",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: "500",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    cursor: "pointer",
  },
  checkbox: {
    width: 20,
    height: 20,
    cursor: "pointer",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    padding: 24,
    borderTop: "1px solid #F3F4F6",
  },
  cancelButton: {
    padding: "12px 24px",
    border: "2px solid #E5E7EB",
    background: "#FFFFFF",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    cursor: "pointer",
  },
  saveButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px",
    border: "none",
    background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#FFFFFF",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

// Add animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  input:focus, textarea:focus, select:focus {
    border-color: #3B82F6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  
  button:active:not(:disabled) {
    transform: translateY(0);
  }
  
  .category-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(styleSheet);