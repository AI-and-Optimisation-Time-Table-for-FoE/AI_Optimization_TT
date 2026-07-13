"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "./lib/api";
import "./optimizer.css"; // Reuse existing base css or customized classes

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        redirectUser(user.role);
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  const redirectUser = (role) => {
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "student") {
      router.push("/student");
    } else if (role === "lecturer") {
      router.push("/lecturer");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await login(username, password);
      localStorage.setItem("user", JSON.stringify(data));
      redirectUser(data.role);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 50%, var(--primary-900) 0%, var(--neutral-900) 100%)",
      fontFamily: "var(--font-family)",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "450px",
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        padding: "40px",
        boxShadow: "var(--shadow-xl)",
        color: "#fff"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "12px",
            display: "inline-block",
            animation: "pulse 2s infinite"
          }}>📋</div>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "800",
            letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #fff 0%, var(--primary-200) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>TimeTable Scheduler</h1>
          <p style={{
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.6)",
            marginTop: "6px"
          }}>Please sign in to access your dashboard</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--error)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            fontSize: "14px",
            color: "#fca5a5",
            marginBottom: "24px"
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "8px"
            }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(0, 0, 0, 0.2)",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                transition: "all var(--transition-base)"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--primary-400)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.15)"}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "8px"
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                background: "rgba(0, 0, 0, 0.2)",
                color: "#fff",
                fontSize: "15px",
                outline: "none",
                transition: "all var(--transition-base)"
              }}
              onFocus={(e) => e.target.style.borderColor = "var(--primary-400)"}
              onBlur={(e) => e.target.style.borderColor = "rgba(255, 255, 255, 0.15)"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 150, 136, 0.3)",
              transition: "all var(--transition-base)",
              marginTop: "10px"
            }}
            onMouseOver={(e) => e.target.style.transform = "translateY(-1px)"}
            onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "14px",
          color: "rgba(255, 255, 255, 0.6)"
        }}>
          Don't have an account?{" "}
          <Link href="/register" style={{
            color: "var(--primary-300)",
            textDecoration: "none",
            fontWeight: "600"
          }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
