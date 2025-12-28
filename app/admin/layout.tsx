// app/admin/layout.tsx
"use client";

import { AdminGuard } from "@/src/components/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      {children}
    </AdminGuard>
  );
}
