"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/context/AuthContext";

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
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>S</div>
          <div>
            <h1 style={styles.title}>Servio Admin</h1>
            <p style={styles.subtitle}>Sign in with your admin account</p>
          </div>
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              placeholder="admin@servio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <div style={styles.passwordRow}>
              <input
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...styles.input, margin: 0, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={styles.showBtn}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" disabled={!canSubmit} style={styles.primaryBtn}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={styles.footer}>Admin access only</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "#F6F7FB",
  },

  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #E9ECF2",
    boxShadow: "0 10px 30px rgba(16, 24, 40, 0.06)",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    color: "#fff",
    background: "#2F6BFF",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: "#0F172A",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#64748B",
  },

  form: { display: "grid", gap: 12 },

  label: {
    display: "grid",
    gap: 8,
    fontSize: 12.5,
    fontWeight: 800,
    color: "#0F172A",
  },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid #E2E8F0",
    outline: "none",
    fontSize: 14,
    color: "#0F172A",
    background: "#FFFFFF",
  },

  passwordRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  showBtn: {
    border: "1px solid #E2E8F0",
    background: "#F8FAFC",
    color: "#0F172A",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12.5,
    whiteSpace: "nowrap",
  },

  errorBox: {
    padding: 10,
    borderRadius: 12,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#991B1B",
    fontSize: 13,
    fontWeight: 700,
  },

  primaryBtn: {
    marginTop: 4,
    width: "100%",
    border: "none",
    borderRadius: 12,
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
    color: "#fff",
    background: "#2F6BFF",
    opacity: 1,
  },

  footer: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: 700,
  },
};
