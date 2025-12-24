// app/admin/layout.tsx
import { AdminGuard } from "../../src/components/AdminGuard";
import { AdminShell } from "../../src/components/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
