// app/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      router.replace("/admin");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Background Gradient */}
      <div style={styles.gradientBg} />

      {/* Login Card */}
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#gradient)" />
              <path
                d="M24 14L16 18V26C16 30.42 19.58 34.34 24 35C28.42 34.34 32 30.42 32 26V18L24 14Z"
                fill="white"
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48">
                  <stop stopColor="#3B82F6" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={styles.title}>Admin Portal</h1>
          <p style={styles.subtitle}>Sign in to manage your platform</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} style={styles.form}>
          {/* Email Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={styles.inputIcon}>
                <path
                  d="M3 4h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 5l-8 5-8-5"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="email"
                placeholder="admin@calltoclean.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={styles.input}
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={styles.inputIcon}>
                <rect
                  x="3"
                  y="9"
                  width="14"
                  height="9"
                  rx="2"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                />
                <path
                  d="M6 9V6a4 4 0 118 0v3"
                  stroke="#9CA3AF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={styles.toggleBtn}
                tabIndex={-1}
              >
                {showPw ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M3 3l14 14M10 6a4 4 0 014 4m-8 0a4 4 0 004 4"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 6c4 0 7 4 7 4s-3 4-7 4-7-4-7-4 3-4 7-4z"
                      stroke="#6B7280"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="10" cy="10" r="2" stroke="#6B7280" strokeWidth="1.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.5" />
                <path d="M8 4v5M8 11v1" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...styles.submitBtn,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {loading ? (
              <>
                <div style={styles.spinner} />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10h12m-4-4l4 4-4 4"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 14A6 6 0 108 2a6 6 0 000 12z"
              stroke="#9CA3AF"
              strokeWidth="1.5"
            />
            <path d="M8 6v4M8 11v1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Admin access only • Call To Clean Platform</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "#F9FAFB",
    position: "relative",
    overflow: "hidden",
  },

  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, #EFF6FF 0%, #F3E8FF 100%)",
    opacity: 0.6,
  },

  card: {
    position: "relative",
    width: "100%",
    maxWidth: "440px",
    background: "#FFFFFF",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(0, 0, 0, 0.05)",
  },

  // Header
  header: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  logoContainer: {
    display: "inline-flex",
    marginBottom: "20px",
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "28px",
    fontWeight: "800",
    color: "#111827",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    fontSize: "15px",
    color: "#6B7280",
    fontWeight: "500",
  },

  // Form
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },

  inputGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },

  label: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#374151",
  },

  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  inputIcon: {
    position: "absolute",
    left: "16px",
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    height: "52px",
    paddingLeft: "48px",
    paddingRight: "48px",
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
    outline: "none",
    fontSize: "15px",
    color: "#111827",
    background: "#F9FAFB",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },

  toggleBtn: {
    position: "absolute",
    right: "12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    transition: "background 0.2s ease",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 16px",
    borderRadius: "12px",
    background: "#FEF2F2",
    border: "1px solid #FEE2E2",
    color: "#DC2626",
    fontSize: "14px",
    fontWeight: "600",
  },

  submitBtn: {
    marginTop: "8px",
    width: "100%",
    height: "52px",
    border: "none",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
    color: "#FFFFFF",
    fontSize: "16px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    fontFamily: "inherit",
  },

  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#FFFFFF",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  footer: {
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid #F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#9CA3AF",
    fontWeight: "500",
  },
};

// Add this to your global CSS or create a style tag
const globalStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  input:focus {
    border-color: #3B82F6 !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4) !important;
  }

  button:active:not(:disabled) {
    transform: translateY(0);
  }

  .toggleBtn:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;