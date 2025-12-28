// src/components/AdminShell.tsx
"use client";

import { ReactNode } from "react";
import { AdminLayout } from "./admin/AdminLayout";

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AdminShell({ 
  children, 
  title = "Dashboard",
  description 
}: AdminShellProps) {
  // DON'T call useAuth here - it's already checked in AdminGuard
  return (
    <AdminLayout title={title} description={description}>
      {children}
    </AdminLayout>
  );
}