// src/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";

type UserRole = "customer" | "provider" | "admin";

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string | null;
  status?: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "servio_admin_token"; // localStorage key
const COOKIE_KEY = "servio_admin_token"; // cookie name for middleware

function setAuthCookie(token: string) {
  // Cookie readable by Next middleware (no httpOnly from client-side)
  // Same-site helps a bit; secure only on https (prod)
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`;
}

function clearAuthCookie() {
  document.cookie = `${COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    clearAuthCookie();
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });

    const token = res.data?.token as string | undefined;
    const u = res.data?.user as AuthUser | undefined;

    if (!token || !u) throw new Error("Invalid login response");
    if (u.role !== "admin") throw new Error("This account is not an admin");

    localStorage.setItem(TOKEN_KEY, token);
    setAuthCookie(token);
    setUser(u);
  };

  const loadMe = async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    // No token => not signed in
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Ensure cookie exists too (for middleware) even if user cleared cookies
      setAuthCookie(token);

      const res = await api.get("/auth/me");
      const u = res.data?.user as AuthUser | undefined;

      if (!u || u.role !== "admin") logout();
      else setUser(u);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, login, logout }),
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
