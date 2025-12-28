// src/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
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
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "servio_admin_token";
const COOKIE_KEY = "servio_admin_token";

// Helper function to set/clear auth cookies
function updateAuthCookie(token: string | null) {
  if (token) {
    // Set cookie for middleware (7 days expiration)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Expires=${expires}; SameSite=Lax${secure}`;
  } else {
    // Clear cookie
    document.cookie = `${COOKIE_KEY}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const isAdmin = user?.role === "admin";

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    updateAuthCookie(null);
    setUser(null);
    
    // Clear any pending API requests
    delete api.defaults.headers.common["Authorization"];
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return false;

      // Try to refresh the token silently
      const response = await api.post("/auth/refresh", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newToken = response.data?.token;
      if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        updateAuthCookie(newToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post("/auth/login", { email, password });

    const token = response.data?.token as string | undefined;
    const userData = response.data?.user as AuthUser | undefined;

    if (!token || !userData) {
      throw new Error("Invalid login response");
    }

    if (userData.role !== "admin") {
      throw new Error("This account is not an admin");
    }

    // Store token
    localStorage.setItem(TOKEN_KEY, token);
    updateAuthCookie(token);
    
    // Update user state
    setUser(userData);
  };

  const validateToken = async (): Promise<boolean> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    try {
      // Use the API interceptor will add the token
      const response = await api.get("/auth/me");
      const userData = response.data?.user as AuthUser | undefined;

      if (!userData || userData.role !== "admin") {
        logout();
        return false;
      }

      setUser(userData);
      return true;
    } catch (error: any) {
      // If 401 Unauthorized, try to refresh the token
      if (error.response?.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry with new token
          return await validateToken();
        }
      }
      logout();
      return false;
    }
  };

  const initializeAuth = async () => {
    // Prevent multiple simultaneous initializations
    if (loadingRef.current) return;
    loadingRef.current = true;

    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!token) {
      setLoading(false);
      loadingRef.current = false;
      return;
    }

    try {
      await validateToken();
    } catch (error) {
      console.error("Auth initialization failed:", error);
      logout();
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    initializeAuth();

    // Set up auto-refresh every 45 minutes
    const refreshInterval = setInterval(async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await refreshToken();
      }
    }, 45 * 60 * 1000); // 45 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  // Add global error handler for 401 responses
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh token
            const refreshed = await refreshToken();
            if (refreshed) {
              // Retry the original request
              return api(originalRequest);
            }
          } catch {
            // Refresh failed, logout user
            logout();
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, login, logout, refreshToken }),
    [user, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}