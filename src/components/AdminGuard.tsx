"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/login");
    }
  }, [loading, isAdmin, router]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!isAdmin) return null;

  return <>{children}</>;
}
