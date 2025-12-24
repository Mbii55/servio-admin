// app/categories/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../src/lib/api";
import { AdminShell } from "../../src/components/AdminShell";
import { useAuth } from "../../src/context/AuthContext";
import { useRouter } from "next/navigation";

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
  const { loading, isAdmin } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/login");
  }, [loading, isAdmin, router]);

  const load = async () => {
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
  }, [isAdmin]);

  const title = useMemo(() => (editing ? "Edit Category" : "New Category"), [editing]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
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
  };

  const save = async () => {
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

      openNew();
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Deactivate this category?")) return;

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

  return (
    <AdminShell>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Categories</h1>
          <p style={{ marginTop: 6, color: "#6B7280" }}>Create and manage service categories.</p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={busy} style={btnOutline}>
            Refresh
          </button>
          <button onClick={openNew} disabled={busy} style={btnOutline}>
            + New
          </button>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 10, color: "#991B1B" }}>
          {err}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginTop: 14 }}>
        {/* List (simple table) */}
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #E5E7EB", fontWeight: 700, color: "#111827" }}>
            All Categories ({items.length})
          </div>

          <table width="100%" cellPadding={10} style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: "#F9FAFB" }}>
              <tr>
                <th align="left">Name</th>
                <th align="left">Slug</th>
                <th align="left">Sort</th>
                <th align="left">Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid #E5E7EB" }}>
                  <td style={{ fontWeight: 700 }}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </td>
                  <td style={{ color: "#6B7280", fontSize: 13 }}>{c.slug}</td>
                  <td style={{ color: "#6B7280", fontSize: 13 }}>{c.sort_order}</td>
                  <td style={{ color: c.is_active ? "#16A34A" : "#B91C1C", fontWeight: 700, fontSize: 13 }}>
                    {c.is_active ? "Yes" : "No"}
                  </td>
                  <td align="right">
                    <button onClick={() => openEdit(c)} disabled={busy} style={miniBtn}>
                      Edit
                    </button>
                    <button onClick={() => remove(c.id)} disabled={busy} style={{ ...miniBtn, borderColor: "#FECACA", color: "#B91C1C" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div style={{ padding: 12, color: "#6B7280" }}>No categories yet.</div>
          )}
        </div>

        {/* Form (simple) */}
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 12, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>{title}</div>
            {editing && (
              <button onClick={openNew} disabled={busy} style={miniBtn}>
                Clear
              </button>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Name">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} style={inputStyle} />
            </Field>

            <Field label="Slug">
              <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} style={inputStyle} />
            </Field>

            <Field label="Icon (emoji ok)">
              <input value={form.icon} onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))} style={inputStyle} />
            </Field>

            <Field label="Sort order">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                style={inputStyle}
              />
            </Field>

            <Field label="Description">
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, minHeight: 80 }} />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
              Active
            </label>

            <button disabled={busy} onClick={save} style={btnOutline}>
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  outline: "none",
  fontSize: 14,
  background: "#fff",
};

const btnOutline: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const miniBtn: React.CSSProperties = {
  marginLeft: 6,
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  color: "#111827",
};
