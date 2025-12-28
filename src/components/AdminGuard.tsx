// src/components/AdminGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { AdminShell } from "./AdminShell";

export function AdminGuard({ 
  children, 
  title = "Dashboard",
  description 
}: { 
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // Ensure this only runs on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Use a try-catch for useAuth to handle any initialization issues
  let auth;
  try {
    auth = useAuth();
  } catch (error) {
    console.error("AuthContext error:", error);
    
    // Show error state
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F6F7FB",
      }}>
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ color: "#991B1B", fontWeight: 700, marginBottom: 12 }}>
            Authentication Error
          </div>
          <div style={{ color: "#6B7280" }}>
            Please refresh the page or contact support.
          </div>
        </div>
      </div>
    );
  }

  const { loading, isAdmin } = auth;

  useEffect(() => {
    if (isClient && !loading && !isAdmin) {
      router.replace("/");
    }
  }, [isClient, loading, isAdmin, router]);

  // Don't render anything until client-side
  if (!isClient) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F6F7FB",
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F6F7FB",
      }}>
        <div>Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    // Show loading while redirecting
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F6F7FB",
      }}>
        <div>Redirecting to login...</div>
      </div>
    );
  }

  return (
    <AdminShell title={title} description={description}>
      {children}
    </AdminShell>
  );
}